/**
 * MeshPoster — a STATIC image preview of a 3D mesh asset (GLB/GLTF).
 *
 * THE BUG THIS FIXES (2026-08-12): the Media sidebar tile used the run's
 * `thumbnail` as the poster for mesh assets. For a Trellis (image→mesh)
 * run, that thumbnail is the INPUT image — so the tile showed the source
 * picture instead of the generated 3D object. "Completely wrong." The
 * prior code path also fell back to a bare Box glyph when no thumbnail
 * existed — a glyph is not the asset.
 *
 * MeshPoster loads the ACTUAL GLB, renders ONE frame at a 3/4 hero angle
 * via a disposable offscreen WebGLRenderer, snapshots it to a JPEG, and
 * caches the data URL in a zustand store persisted to localStorage. The
 * result is a plain <img> — no persistent WebGL context, no animation
 * loop — so a grid of these (the sidebar) stays smooth. This is the mesh
 * sibling of MotionPoster, and the tile companion to AnimatedGLBViewer
 * (the full interactive viewer used in the asset dialog).
 *
 * 2026-09-05, the fossil tier deleted: a "server poster" first tier
 * pointed at /v1/flows/mesh_poster/… — an endpoint that NEVER existed
 * in any revision of any gateway (py or the retired C twin; verified
 * against full git history). Every mesh tile fired one doomed GET
 * before falling through to this renderer, and the comments described
 * a "256px Blender render cached on disk" — fiction, and a Blender
 * claim the 2026-09-04 never-embedded-Blender order bans. The client
 * render below is, and always was, the only poster path.
 *
 * DRACO support: Trellis / SOMAX / SkinToken meshes are frequently
 * DRACO-compressed; the shared loader kernel (@melite/formats
 * glbLoad) carries the estate's ONE decoder setup — local decoder
 * files, no CDN dependency.
 *
 * Errors are EXPLICIT — never a blank, never a glyph masquerading as
 * content. A failed render shows "Preview unavailable" so the user knows
 * the preview failed (not that the asset is empty).
 *
 * The tile lifecycle (cache → render-once → error/skeleton/img) rides the
 * shared poster shell (@melite/ui posterShell — the same shell
 * MotionPoster uses); this module keeps ONLY the mesh scene builder.
 */
import * as THREE from "three"
import { loadGLB } from "@melite/formats/glbLoad"
import { useMeshPosterStore } from "./meshPosterStore"
import { autoFitToHeight } from "@melite/formats/glbLoad"
import { snapshotSceneToJpeg } from "@melite/formats/renderSnapshot"
import { PosterShell, usePosterDataUrl } from "@melite/ui/posterShell"

interface MeshPosterProps {
  url: string
  className?: string
}

// MeshPoster — builds the tile scene, then rides the shared one-frame
// snapshotter (@melite/formats renderSnapshot — the same mechanics the
// motion poster uses; size/quality/DPR defaults live THERE once).
function MeshPoster({ url, className }: MeshPosterProps) {
  const { src, error } = usePosterDataUrl(
    url,
    useMeshPosterStore,
    async (isCancelled) => {
      const sceneRoot = new THREE.Group()
      const gltf = await loadGLB(url)
      if (isCancelled()) return null

      // ── Normalize: center, scale to ~2 units tall, feet at y=0 ────────
      // The shared auto-fit every viewer applies, so the framed mesh
      // matches what the full dialog viewer opens to. The
      // metallicFactor=0 pass fixes flow exports (metallic=1.0 → the
      // "liquid metal" look; organic characters must be non-metallic).
      sceneRoot.add(gltf.scene)
      autoFitToHeight(sceneRoot, 2.0)
      gltf.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m) => {
            if (m instanceof THREE.MeshStandardMaterial) {
              m.metalness = 0.0
              m.roughness = Math.max(m.roughness, 0.55)
            }
          })
        }
      })

      // ── Scene + camera (3/4 hero angle, square aspect for the tile) ───
      const scene = new THREE.Scene()
      scene.background = new THREE.Color("#0a0a0f")
      scene.add(sceneRoot)

      const cam = new THREE.PerspectiveCamera(35, 1, 0.05, 50)
      cam.position.set(2.85, 1.2, 2.85)
      cam.lookAt(0, 1, 0)

      scene.add(new THREE.AmbientLight(0xffffff, 0.55))
      const key = new THREE.DirectionalLight(0xffffff, 1.2)
      key.position.set(5, 8, 5)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xffffff, 0.4)
      fill.position.set(-4, 3, -2)
      scene.add(fill)
      scene.add(new THREE.HemisphereLight("#cdd6f4", "#1a1a2e", 0.4))

      // ── Render once → JPEG snapshot → full GPU teardown ───────────────
      // (the shared snapshotter owns renderer lifecycle + disposal)
      const dataUrl = snapshotSceneToJpeg(scene, cam, { disposeRoot: sceneRoot })
      if (isCancelled()) return null
      return dataUrl
    },
  )
  return (
    <PosterShell
      src={src}
      error={error}
      className={className}
      loadingLabel="Loading 3D preview"
      alt="3D mesh preview"
    />
  )
}

export { MeshPoster }
