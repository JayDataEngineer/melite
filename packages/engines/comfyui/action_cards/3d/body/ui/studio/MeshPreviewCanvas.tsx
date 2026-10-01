/**
 * MeshPreviewCanvas - lightweight standalone 3D body-mesh viewer for the
 * Body Studio workspace.
 *
 * Distinct from PoseViewer3D: this only renders the bind (rest) pose of an
 * identity-shaped SOMA-X mesh - no skeleton, no animation, no editing
 * gizmos. It exists so Body Studio can show a live preview while the user
 * sculpts coefficients, without paying for the full pose-viewer's per-frame
 * skinning flow.
 *
 * Reuses fetchBindMesh + buildGeometry from lib/bodyMesh so the cache is
 * shared with the main scene viewer (applying a character you were just
 * previewing is instant).
 *
 * SUBSTRATE LAW (hour 14, 2026-09-13): RAW three.js — imperative scene
 * in a useEffect, NO @react-three. r3f's bundled react-reconciler reads
 * the seeded React 19 internals by minified single-letter fields and a
 * version-skew throws at boot; this file was the LAST @react-three
 * import in any card client's graph (anny's shape face pulled it in).
 * The scene graph below is the r3f tree's verbatim translation:
 * lights/shadows/grid/orbit with identical parameters.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { mountStage3D, Skeleton } from "@melite/card-base/client"
import styles from "./MeshPreviewCanvas.module.css"
import * as THREE from "three"
import {
  fetchBindMesh, buildGeometry, type SkinMeshData, type PreviewPose,
} from "./bodyMesh"
import type { Character } from "@melite/contracts"
import { STAGE_BACKGROUND_DARK } from '@melite/card-base/client'

/** Build the bind-mesh geometry (positions + V×3 face indices, smooth
 *  normals) — the PreviewMesh body, verbatim. */
function buildMeshGeometry(meshData: SkinMeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.BufferAttribute(buildGeometry(meshData), 3))
  // SkinMeshData.faces is V x 3 triangle indices.
  const indices = new Uint32Array(meshData.faces.length * 3)
  for (let i = 0; i < meshData.faces.length; i++) {
    indices[i * 3] = meshData.faces[i][0]
    indices[i * 3 + 1] = meshData.faces[i][1]
    indices[i * 3 + 2] = meshData.faces[i][2]
  }
  g.setIndex(new THREE.BufferAttribute(indices, 1))
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

// ── Outer component ─────────────────────────────────────────────────────────

export interface MeshPreviewCanvasProps {
  /** Which character to render. Required: the store-subscription
   * default left the component with the S1 subscription cut — both
   * call sites pass the studio's `editing` explicitly, and the
   * optional marker lied to the type gate (2026-09-12). */
  character: Character
  className?: string
  /**
   * Static preview pose. "arms_down" (default) renders the mesh in a
   * natural A-pose with arms at the sides; "tpose" renders the bind
   * (T-pose with arms out). Body Studio defaults to arms_down so the
   * preview reads as a person, not a crucifix.
   */
  previewPose?: PreviewPose
  /** Called with the canvas element after first mount (for thumbnails). */
  onCanvasReady?: (el: HTMLCanvasElement | null) => void
}

export function MeshPreviewCanvas({
  character, className, previewPose = "arms_down", onCanvasReady,
}: MeshPreviewCanvasProps) {
  // The character may come from props OR from the host's editing store —
  // packages never import the app data plane, so the default subscription
  // moved to the call sites (BodyStudioTab passes its store value).
  const c = character

  const [meshData, setMeshData] = useState<SkinMeshData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // the mounted scene handle — rebuilt when the canvas mounts
  const [sceneReady, setSceneReady] = useState(false)

  // Round coefficients for the fetch signature - matches bodyMesh.fetchBindMesh
  // rounding so we share cache entries with the main viewer.
  const coeffsSig = c.coeffs && c.coeffs.length > 0
  ? c.coeffs.map((v) => v.toFixed(1)).join(",")
  : ""
  const lcSig = c.localChanges && Object.keys(c.localChanges).length > 0
  ? Object.entries(c.localChanges)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v.toFixed(2)}`)
    .join(",")
  : ""
  // Custom .target blendshape weights (e.g. anime stylization).
  const ctSig = c.customTargets && Object.keys(c.customTargets).length > 0
  ? Object.entries(c.customTargets)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v.toFixed(2)}`)
    .join(",")
  : ""
  const poseSig = previewPose && previewPose !== "tpose" ? previewPose : ""

  useEffect(() => {
    let cancelled = false
    setError(null)
    // Debounce: wait 60ms before fetching. During rapid slider drags this
    // coalesces dozens of coefficient changes into a single backend request
    // so we don't queue 500ms POSTs for every pixel of slider movement.
    const timer = setTimeout(() => {
      fetchBindMesh({
          identityModel: c.identityModel,
          identityCoeffs: c.coeffs,
          localChanges: c.localChanges,
          previewPose,
          customTargets: c.customTargets,
        })
        .then((data) => {
          if (!cancelled) setMeshData(data)
        })
        .catch((e) => {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : String(e))
            setMeshData(null)
          }
        })
    }, 60)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [c.identityModel, coeffsSig, lcSig, ctSig, poseSig]) // eslint-disable-line react-hooks/exhaustive-deps

  // THE SCENE (the r3f tree's verbatim translation — see the substrate
  // law in the header): rides the SHARED stage core (card-base
  // stage3d.ts — @melite/card-base) for renderer/camera/orbit/rAF/
  // resize/dispose, exactly like glb-stage and the pose studio: one
  // core, three consumers. This file keeps only its own light rig,
  // floor, and mesh carrier. Mounts once when meshData first lands;
  // the mesh itself swaps per meshData below.
  const meshGroupRef = useRef<THREE.Group | null>(null)
  useEffect(() => {
    if (!meshData || sceneReady) return
    const canvas = canvasRef.current
    if (canvas === null) return
    const stage = mountStage3D(canvas, {
      fov: 45,
      near: 0.05,
      far: 100,
      camera: [2.74, 1.88, 3.5],
      target: [0, 0.9, 0],
      minDistance: 0.8,
      maxDistance: 12,
      maxPolarAngle: Math.PI / 1.85,
      alpha: false,
      // preserveDrawingBuffer is REQUIRED for canvas.toDataURL() to
      // capture a non-black thumbnail (the r3f comment's law, verbatim).
      preserveDrawingBuffer: true,
      // the hour-14 raw port silently dropped the r3f Canvas's ACES
      // tone mapping (raw three defaults to none — the preview read
      // washed-out bright against the original); the core's ACES
      // default restores the r3f parity deliberately.
      // Shadow type likewise rides the core: PCFShadowMap (r184
      // deprecates PCFSoft — warns per mount, falls back anyway).
      onContextFailure: (msg) => { setError(`WebGL unavailable: ${msg}`) },
    })
    if (stage === null) return
    const renderer = stage.renderer
    const scene = stage.scene
    renderer.setClearColor(new THREE.Color(STAGE_BACKGROUND_DARK))
    scene.add(new THREE.AmbientLight(0xffffff, 0.45))
    const key = new THREE.DirectionalLight(0xffffff, 1.0)
    key.position.set(5, 8, 5)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -3; key.shadow.camera.right = 3
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 20
    key.shadow.bias = -0.0005
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.25)
    fill.position.set(-4, 3, -2)
    scene.add(fill)
    scene.add(new THREE.HemisphereLight(0xcdd6f4, 0x1a1a2e, 0.35))
    // ContactShadows' raw equivalent: a ground plane receiving the
    // key light's shadow through ShadowMaterial (the soft blurred
    // contact look; opacity 0.55 matches the drei call).
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.ShadowMaterial({ opacity: 0.55 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0.001
    ground.receiveShadow = true
    scene.add(ground)
    // the grid — drei's infinite grid at its raw floor: cell .25
    // (thickness .5), section 1 (thickness 1), the stage's own helper
    const grid = new THREE.GridHelper(12, 48, 0x5a5a8a, 0x3a3a5a)
    const gridMat = grid.material as THREE.Material
    gridMat.transparent = true
    gridMat.opacity = 0.9
    scene.add(grid)
    // the mesh carrier — geometry swaps per meshData, scene persists
    const meshGroup = new THREE.Group()
    meshGroupRef.current = meshGroup
    scene.add(meshGroup)
    setSceneReady(true)
    onCanvasReady?.(canvas)
    return () => {
      grid.geometry.dispose()
      stage.dispose()
      meshGroupRef.current = null
      setSceneReady(false)
    }
  }, [meshData !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  // the mesh body — geometry rebuilds per meshData on the persistent
  // carrier group (the debounced fetch's 60ms coalescing upstream)
  const geo = useMemo(() => (meshData === null ? null : buildMeshGeometry(meshData)), [meshData])
  useEffect(() => {
    const group = meshGroupRef.current
    if (group === null || geo === null) return
    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const m = child.material
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
        else m.dispose()
      }
    }
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0x9bd0f7,
      roughness: 0.55,
      metalness: 0.05,
      flatShading: false,
      side: THREE.DoubleSide,
    }))
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }, [geo, sceneReady])

  return (
    <div className={className ? `${styles.root} ${className}` : `${styles.root} ${styles.rootDefault}`}>
      {error && (
        <div className={styles.errorBox}>
          {error}
        </div>
      )}
      {!error && !meshData && (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading mesh"
          className={styles.loadingBox}
        >
          {/* Skeleton stands in for the mesh viewport while the GLB parses —
              a quiet block instead of a spinning dot. */}
          <Skeleton className={styles.loadingSkeleton} />
        </div>
      )}
      {meshData && (
        <canvas ref={canvasRef} className={styles.canvasClear} />
      )}
    </div>
  )
}
