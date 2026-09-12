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
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Grid, ContactShadows } from "@react-three/drei"
import { Skeleton } from "../../../../skeleton"
import styles from "./MeshPreviewCanvas.module.css"
import * as THREE from "three"
import {
 fetchBindMesh, buildGeometry, type SkinMeshData, type PreviewPose,
} from "./bodyMesh"
import type { Character } from "@melite/contracts"
// ── Mesh ────────────────────────────────────────────────────────────────────

function PreviewMesh({ meshData }: { meshData: SkinMeshData }) {
 const geo = useMemo(() => {
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
 }, [meshData])

 return (
 <mesh geometry={geo} castShadow receiveShadow>
 <meshStandardMaterial
 color="#9bd0f7"
 roughness={0.55}
 metalness={0.05}
 flatShading={false}
 side={THREE.DoubleSide}
 />
 </mesh>
 )
}

// ── Scene ───────────────────────────────────────────────────────────────────

function PreviewScene({ meshData }: { meshData: SkinMeshData }) {
 return (
 <>
 <ambientLight intensity={0.45} />
 <directionalLight
 position={[5, 8, 5]}
 intensity={1.0}
 castShadow
 shadow-mapSize-width={2048}
 shadow-mapSize-height={2048}
 shadow-camera-left={-3}
 shadow-camera-right={3}
 shadow-camera-top={3}
 shadow-camera-bottom={-3}
 shadow-camera-near={0.5}
 shadow-camera-far={20}
 shadow-bias={-0.0005}
 />
 <directionalLight position={[-4, 3, -2]} intensity={0.25} />
 <hemisphereLight args={["#cdd6f4", "#1a1a2e", 0.35]} />

 <ContactShadows
 position={[0, 0.001, 0]}
 scale={6}
 far={3}
 blur={2.5}
 opacity={0.55}
 resolution={1024}
 color="#000000"
 />

 <Grid
 position={[0, 0, 0]}
 args={[12, 12]}
 cellSize={0.25}
 cellThickness={0.5}
 cellColor="#3a3a5a"
 sectionSize={1}
 sectionThickness={1.0}
 sectionColor="#5a5a8a"
 fadeDistance={14}
 fadeStrength={1.2}
 infiniteGrid
 />

 <PreviewMesh meshData={meshData} />

 <OrbitControls
 makeDefault
 target={[0, 0.9, 0]}
 enableDamping
 dampingFactor={0.1}
 minDistance={0.8}
 maxDistance={12}
 maxPolarAngle={Math.PI / 1.85}
 />
 </>
 )
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

 // Notify parent of canvas element for thumbnail capture.
 const ref = useRef<HTMLDivElement>(null)
 useEffect(() => {
 if (!onCanvasReady) return
 const canvas = ref.current?.querySelector("canvas") ?? null
 onCanvasReady(canvas)
 }, [onCanvasReady, meshData])

 return (
 <div ref={ref} className={className ? `${styles.root} ${className}` : `${styles.root} ${styles.rootDefault}`}>
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
 <Canvas
 shadows="percentage"
 camera={{ position: [2.74, 1.88, 3.5], fov: 45, near: 0.05, far: 100 }}
 // preserveDrawingBuffer: true is REQUIRED for canvas.toDataURL()
 // to capture a non-black thumbnail. Without it, the WebGL buffer
 // is swapped to the display compositor after each frame and the
 // next readback returns an empty (all-black) image — the exact
 // "pure black screen" bug in saved-character thumbnails. Cost is
 // a small per-frame perf hit (the buffer is preserved instead of
 // discarded), well worth it for working previews + screenshots.
 gl={{ preserveDrawingBuffer: true, antialias: true, alpha: false }}
 onCreated={({ gl }) => {
 // Clear to the dark Body Studio background so even a partial
 // first frame reads correctly on toDataURL.
 gl.setClearColor(new THREE.Color("#0e0e1a"))
 onCanvasReady?.(gl.domElement)
 }}
 className={styles.canvasClear}
 >
 <PreviewScene meshData={meshData} />
 </Canvas>
 )}
 </div>
 )
}
