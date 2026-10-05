/**
 * MotionPoster — a STATIC image preview of a Kimodo motion NPZ.
 *
 * Renders the MIDPOINT frame of the motion on the neutral SOMAX skin ONCE,
 * snapshots it to a JPEG (the shared one-frame snapshotter —
 * @melite/formats renderSnapshot, the same mechanics MeshPoster uses),
 * then tears the WebGL context down. The result is a plain <img> — no
 * animation loop, no persistent WebGL context — so a grid of these (the
 * Media sidebar) stays smooth. This is the tile companion to
 * MotionViewer, the full interactive player used in the asset dialog.
 *
 * Why not the live MotionViewer in tiles? Each animated tile spun a Three.js
 * Canvas + per-frame useFrame + 2k shadow maps; a 2-col grid of those froze
 * the sidebar. A single static midpoint frame is all a tile needs.
 *
 * The tile lifecycle (cache → render-once → error/skeleton/img) rides the
 * shared poster shell (the local poster-shell module — the same shell MeshPoster
 * uses); this module keeps ONLY the motion scene builder.
 */
import * as THREE from "three"
import { loadMotionNpz } from "@melite/formats"
import { loadSomaSkin, deformFrame } from "@melite/formats"
import { useMotionImageStore } from "./motionImageStore.ts"
import { snapshotSceneToJpeg } from "@melite/formats/renderSnapshot"
import { PosterShell, usePosterDataUrl } from '@melite/cards/poster-shell'

const FLOOR_LIFT_Y = 0.02
const J = 77 // SOMA-77 joints
interface MotionPosterProps {
  url: string
  className?: string
}

export function MotionPoster({ url, className }: MotionPosterProps) {
  const { src, error } = usePosterDataUrl(
    url,
    useMotionImageStore,
    async (isCancelled) => {
      const motion = await loadMotionNpz(url)
      if (isCancelled()) return null
      const skin = await loadSomaSkin()
      if (isCancelled()) return null

      // ── LBS the midpoint frame only (meters) ──────────────────────────
      const V = skin.vertexCount
      const last = Math.max(0, motion.T - 1)
      const mid = Math.min(Math.floor(motion.T / 2), last)
      const verts = new Float32Array(V * 3)
      deformFrame(
        motion.globalRotMats.subarray(mid * J * 9, (mid + 1) * J * 9),
        motion.posedJoints.subarray(mid * J * 3, (mid + 1) * J * 3),
        skin,
        verts,
      )

      const geo = new THREE.BufferGeometry()
      geo.setAttribute("position", new THREE.BufferAttribute(verts, 3))
      geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(skin.faces), 1))
      geo.computeVertexNormals()
      geo.computeBoundingSphere()

      // Floor lift + framing — mirrors MotionViewer's CameraRig so the
      // framed figure matches what the full player opens to.
      let minY = Infinity, maxY = -Infinity
      for (let i = 1; i < verts.length; i += 3) {
        const y = verts[i]
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
      const liftY = isFinite(minY) ? FLOOR_LIFT_Y - minY : FLOOR_LIFT_Y
      const framed = isFinite(minY) && isFinite(maxY)
      const centerY = framed ? (minY + maxY) / 2 + liftY : 0.9
      const height = framed ? maxY - minY : 1.8

      // ── Scene + camera (square aspect for the square tile) ────────────
      const scene = new THREE.Scene()
      scene.background = new THREE.Color("#0a0a0f")
      const dist = Math.max(1.6, height * 2.4)
      const cam = new THREE.PerspectiveCamera(40, 1, 0.05, 50)
      cam.position.set(0, centerY + height * 0.15, dist)
      cam.lookAt(0, centerY, 0)

      const mat = new THREE.MeshStandardMaterial({
        color: "#9bd0f7",
        roughness: 0.55,
        metalness: 0.05,
        flatShading: false,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = liftY
      scene.add(mesh)

      scene.add(new THREE.AmbientLight(0xffffff, 0.6))
      const key = new THREE.DirectionalLight(0xffffff, 1.1)
      key.position.set(5, 8, 5)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xffffff, 0.3)
      fill.position.set(-4, 3, -2)
      scene.add(fill)
      scene.add(new THREE.HemisphereLight("#cdd6f4", "#1a1a2e", 0.35))

      // ── Render once → JPEG snapshot → full GPU teardown ───────────────
      // The shared one-frame snapshotter (@melite/formats
      // renderSnapshot — the same mechanics the mesh poster uses)
      // owns the renderer lifecycle, the capped-DPR JPEG capture, and
      // the disposal of the scene's geometry + materials.
      const dataUrl = snapshotSceneToJpeg(scene, cam, { disposeRoot: mesh })
      if (isCancelled()) return null
      return dataUrl
    },
  )
  return (
    <PosterShell
      src={src}
      error={error}
      className={className}
      loadingLabel="Loading motion preview"
      alt="Motion preview"
    />
  )
}
