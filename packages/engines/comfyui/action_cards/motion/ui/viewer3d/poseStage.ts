/**
 * poseStage — the raw-three pose scene (the substrate law).
 *
 * THE PORT (2026-09-13): PoseViewer3D/PoseEditMode rode @react-three/fiber
 * + drei — the last r3f island in the card plane (the react-reconciler
 * version-skew boot crash is why the substrate exists). This module is the
 * 1:1 imperative port of that scene graph onto card-base's shared stage3d
 * core: every r3f child component became a subsystem with an update()
 * coarse-diff, useFrame became an ordered stage tick (anim clock BEFORE
 * skin upload — the declaration order of the old JSX tree), drei's
 * OrbitControls/Grid/ContactShadows/Text/Billboard/TransformControls became
 * three's own OrbitControls/GridHelper/ShadowMaterial plane/canvas-texture
 * sprites/addons TransformControls.
 *
 * Coordinate law (unchanged from the r3f original): ALL mesh/joint content
 * lives inside ONE lift group translated by meshLiftY (bind-mesh min-Y lift
 * + the in-place XZ anchor). Raw cm data → *CM_TO_M at ingestion; the group
 * carries the visual offset so drag handlers still receive RAW (cm-space)
 * coordinates. TransformControls gizmos attach to pivots INSIDE the group
 * but the gizmo itself is scene-rooted — world handles, local drag math,
 * which is the clean version of the old LiftAwareTransformControls fix
 * (its negative-offset hack existed only because drei nested the gizmo
 * inside the lifted group).
 */
import * as THREE from "three"
import { TransformControls } from "three/addons/controls/TransformControls.js"
import { SOMA77_BONE_CONNECTIONS, azimuthCameraPos } from "@melite/formats"
import { apiFetch } from "@melite/catalog"
import { makeLabelSprite, mountStage3D, type Stage3D } from "@melite/card-base"

/** Centimeters → meters. SOMA-X/ANNY joints arrive in cm; the Three.js scene
 *  is authored in meters. Applied at every display boundary. The drag handler
 *  converts gizmo.position back to cm so IK/FK math stays in the native cm
 *  space (matching jointsFlat and the backend deformSomaJoints API). */
export const CM_TO_M = 0.01
const FLOOR_LIFT_Y = 0.02

// ── Types ─────────────────────────────────────────────────────────────────
export interface SkinMeshData {
  vertices: number[][]
  faces: number[][]
}

export interface LightingOrb {
  id: string
  position: [number, number, number]
  color: string
  intensity: number
  distance: number
  castShadow: boolean
}

export interface JointMoveEvent {
  /** Single-joint move (FK or IK root). */
  idx: number
  position: THREE.Vector3
  /** When set, contains all joint positions after the operation (IK / chain). */
  fullJoints?: Float32Array
}

export interface ReferenceMeshSpec {
  deformedVerticesB64: string
  frameCount?: number
  fps?: number
  identityModel?: string
  identityCoeffs?: number[] | null
  localChanges?: Record<string, number> | null
  customTargets?: Record<string, number> | null
  offset: [number, number]
  opacity?: number
  color?: string
  joints?: number[] | null
  editedJoints?: Float32Array | null
  editedDeformedVerticesB64?: string | null
  jointFrames?: number[] | null
}

export type CameraFraming = "full" | "upper"

/** The shell-resolved reference bundle (the ReferenceMesh data effects,
 *  decoded async React-side): spec + its OWN bind mesh (fetched via the
 *  same cache) + decoded vert streams. */
export interface ReferenceBundle {
  spec: ReferenceMeshSpec
  meshData: SkinMeshData | null
  flat: Float32Array | null
  editedFlat: Float32Array | null
}

export interface AltSampleDecoded {
  idx: number
  verts: Float32Array
}

export interface PoseStageProps {
  meshData: SkinMeshData
  deformedFlat: Float32Array | null
  numVerts: number
  frameCount: number
  frameIdx: number
  setFrameIdx: (f: number) => void
  animate: boolean
  showBindPose: boolean
  opacity: number
  wireframe: boolean
  color: string
  fps: number
  soma77JointsFlat: Float32Array | null
  showSkeleton: boolean
  editMode: boolean
  editableJoints: Float32Array | null
  selectedJoint: number | null
  onSelectJoint: (idx: number | null, additive?: boolean) => void
  onSelectChain?: (chain: number[] | null) => void
  onJointMove: (e: JointMoveEvent) => void
  selectedChain?: number[] | null
  kinematicMode?: "fk" | "ik"
  gizmoMode: "rotate" | "translate"
  lightingOrbs: LightingOrb[]
  onLightingOrbsChange?: (orbs: LightingOrb[]) => void
  selectedOrb: string | null
  onSelectOrb?: (id: string | null) => void
  ghostJoints: Float32Array | null
  playbackSpeed: number
  footContacts: number[][] | null
  showFootContacts: boolean
  showStartingDirection: boolean
  altSamples: AltSampleDecoded[]
  onCommitSample: (idx: number) => void
  root2dPoints: { frame: number; x: number; z: number }[]
  endEffectorPoints: { id: string; frame: number; joint_name: string; position: [number, number, number] }[]
  showConstraintLabels: boolean
  selectedEEId?: string | null
  onSelectEE?: (id: string | null) => void
  onChangeEEPoint?: (id: string, position: [number, number, number]) => void
  placingEE: boolean
  eePlaceJointIdx: number
  onPlaceEE: (position: [number, number, number]) => void
  cameraView: string
  framing: CameraFraming
  reference: ReferenceBundle | null
  refPlaybackFrameIdx?: number
  editRefMode: boolean
  refEditableJoints?: Float32Array | null
  onRefJointMove?: (e: JointMoveEvent) => void
  inPlace: boolean
}

// ── Skeleton topology helpers (from the old PoseEditMode, verbatim) ────────
/** child index → parent index. Root (0) has no parent (maps to -1). */
export const SOMA77_PARENT: number[] = (() => {
  const parent: number[] = new Array(77).fill(-1)
  for (const [p, c] of SOMA77_BONE_CONNECTIONS) parent[c] = p
  return parent
})()

/** Return the joint chain from `jointIdx` up to (and including) `chainRoot`,
 *  ordered root-first. Used by multi-joint selection and IK. */
export function getJointChain(jointIdx: number, chainRoot = 0): number[] {
  const chain: number[] = []
  let cur = jointIdx
  let guard = 0
  while (cur >= 0 && cur < 77 && guard++ < 77) {
    chain.unshift(cur)
    if (cur === chainRoot) break
    cur = SOMA77_PARENT[cur]
  }
  return chain
}

const SOMA77_CHILDREN: number[][] = (() => {
  const children: number[][] = Array.from({ length: 77 }, (): number[] => [])
  for (let i = 0; i < 77; i++) {
    const p = SOMA77_PARENT[i]
    if (p >= 0) children[p].push(i)
  }
  return children
})()

/** Return ALL descendant joint indices of `jointIdx`. Used by FK propagation. */
export function getDescendants(jointIdx: number): number[] {
  const result: number[] = []
  const stack = [...SOMA77_CHILDREN[jointIdx]]
  while (stack.length > 0) {
    const cur = stack.pop()!
    result.push(cur)
    stack.push(...SOMA77_CHILDREN[cur])
  }
  return result
}

// ── CCD IK solver (verbatim from the old PoseEditMode) ────────────────────
export function solveCCD(
  jointsFlat: Float32Array,
  chain: number[],
  target: THREE.Vector3,
  iterations = 8,
  tolerance = 0.005,
): Float32Array {
  if (chain.length < 2) return jointsFlat
  const out = new Float32Array(jointsFlat)
  const ee = chain[chain.length - 1]
  const eePos = new THREE.Vector3(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2])
  if (eePos.distanceTo(target) < tolerance) return out
  const chainDescendants = chain.map(j => getDescendants(j))
  const tmpJoint = new THREE.Vector3()
  const tmpEE = new THREE.Vector3()
  const curDir = new THREE.Vector3()
  const tgtDir = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const axis = new THREE.Vector3()
  const cp = new THREE.Vector3()
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = chain.length - 2; i >= 0; i--) {
      const j = chain[i]
      tmpJoint.set(out[j * 3], out[j * 3 + 1], out[j * 3 + 2])
      tmpEE.set(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2])
      curDir.subVectors(tmpEE, tmpJoint).normalize()
      tgtDir.subVectors(target, tmpJoint).normalize()
      const dot = THREE.MathUtils.clamp(curDir.dot(tgtDir), -1, 1)
      const angle = Math.acos(dot)
      axis.crossVectors(curDir, tgtDir)
      if (axis.lengthSq() < 1e-8 || angle < 1e-5) continue
      axis.normalize()
      quat.setFromAxisAngle(axis, angle)
      for (const c of chainDescendants[i]) {
        cp.set(out[c * 3], out[c * 3 + 1], out[c * 3 + 2])
        cp.sub(tmpJoint).applyQuaternion(quat).add(tmpJoint)
        out[c * 3] = cp.x; out[c * 3 + 1] = cp.y; out[c * 3 + 2] = cp.z
      }
    }
    eePos.set(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2])
    if (eePos.distanceTo(target) < tolerance) break
  }
  return out
}

// SOMA-77 joint display sizes (verbatim).
const JOINT_RADIUS: Record<number, number> = {}
for (let i = 0; i < 77; i++) JOINT_RADIUS[i] = 0.020
for (const j of [0, 3, 6, 11, 12, 13, 14, 39, 40, 41, 42, 67, 68, 69, 72, 73, 74]) JOINT_RADIUS[j] = 0.028
for (const j of [18, 23, 28, 33, 38, 46, 51, 56, 61, 66, 71, 76]) JOINT_RADIUS[j] = 0.012

// ── Camera math (verbatim; re-exported by PoseViewer3D for the studio) ────
export function cameraPosFor(view: string): [number, number, number] {
  switch (view) {
    case "side": return [3.2, 1.2, 0.01]
    case "three-quarter": return [2.4, 1.4, 2.4]
    case "front": return [0, 1.2, 3.4]
    default:
      if (view.startsWith("az-")) return azimuthCameraPos(view as Parameters<typeof azimuthCameraPos>[0])
      return [2.74, 1.88, 5.68] // "demo"
  }
}

const FRAMING: Record<CameraFraming, { dist: number; camY: number; targetY: number }> = {
  full: { dist: 2.6, camY: 1.15, targetY: 0.92 },
  upper: { dist: 1.25, camY: 1.5, targetY: 1.3 },
}
const LEGACY_TARGET_Y: Record<CameraFraming, number> = { full: 0.9, upper: 1.32 }
const LEGACY_DIST_SCALE: Record<CameraFraming, number> = { full: 1, upper: 0.5 }

export function framedCameraPos(
  view: string, framing: CameraFraming,
): [[number, number, number], number] {
  const base = cameraPosFor(view)
  if (view.startsWith("az-")) {
    const angle = Math.atan2(base[0], base[2])
    const f = FRAMING[framing]
    return [[Math.sin(angle) * f.dist, f.camY, Math.cos(angle) * f.dist], f.targetY]
  }
  const ty = LEGACY_TARGET_Y[framing]
  const s = LEGACY_DIST_SCALE[framing]
  const dir: [number, number, number] = [base[0], base[1] - 0.9, base[2]]
  return [[dir[0] * s, ty + dir[1] * s, dir[2] * s], ty]
}

/** Compute the Y-offset that places the mesh's lowest point at FLOOR_LIFT_Y. */
export function computeMeshLiftY(meshData: SkinMeshData): number {
  let minY = Infinity
  const verts = meshData.vertices
  for (let i = 0; i < verts.length; i++) {
    if (verts[i][1] < minY) minY = verts[i][1]
  }
  return isFinite(minY) ? FLOOR_LIFT_Y - minY * CM_TO_M : FLOOR_LIFT_Y
}

export function buildGeometry(meshData: SkinMeshData): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  const verts = meshData.vertices
  const arr = new Float32Array(verts.length * 3)
  for (let i = 0; i < verts.length; i++) {
    // Bind pose is raw cm — scaled to meters in the shared buffer so the
    // lift group + deformed frames share one space.
    arr[i * 3] = verts[i][0] * CM_TO_M
    arr[i * 3 + 1] = verts[i][1] * CM_TO_M
    arr[i * 3 + 2] = verts[i][2] * CM_TO_M
  }
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3))
  const idx = meshData.faces.flat(2)
  geo.setIndex(idx)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

// ── API: the per-identity bind-mesh fetch + cache (verbatim) ──────────────
// All meshes share SOMA's 18056-vertex layout but have DIFFERENT face
// triangulations, so we cache per model and refetch when the user switches
// mesh (soma / mhr / anny). Shaped variants (coeffs / detail morphs /
// custom .target blends) get their own cache entries.
const _meshCache: Map<string, SkinMeshData> = new Map()

export async function fetchBindMesh(
  identityModel: string = "anny",
  identityCoeffs?: number[] | null,
  localChanges?: Record<string, number> | null,
  customTargets?: Record<string, number> | null,
): Promise<SkinMeshData> {
  const key = identityModel || "anny"
  const coeffsSig = identityCoeffs && identityCoeffs.length > 0
    ? identityCoeffs.map(v => v.toFixed(1)).join(",")
    : null
  const lcEntries = localChanges && Object.keys(localChanges).length > 0
    ? Object.entries(localChanges)
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",")
    : null
  const ctEntries = customTargets && Object.keys(customTargets).length > 0
    ? Object.entries(customTargets)
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([k, v]) => `${k}=${v.toFixed(2)}`).join(",")
    : null
  const cacheKey = [key, coeffsSig, lcEntries, ctEntries].filter(Boolean).join("|")
  const cached = _meshCache.get(cacheKey)
  if (cached) return cached

  let data: SkinMeshData
  if (coeffsSig || lcEntries || ctEntries) {
    const res = await apiFetch("/v1/poser/mesh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity_model: key,
        ...(coeffsSig ? { identity_coeffs: identityCoeffs } : {}),
        ...(lcEntries ? { local_changes: localChanges } : {}),
        ...(ctEntries ? { custom_targets: customTargets } : {}),
      }),
    })
    if (!res.ok) throw new Error(`Failed to fetch shaped mesh (${key}): ${res.status}`)
    data = (await res.json()) as SkinMeshData
  } else {
    const res = await apiFetch(`/v1/poser/mesh?identity_model=${encodeURIComponent(key)}`)
    if (!res.ok) throw new Error(`Failed to fetch mesh (${key}): ${res.status}`)
    data = (await res.json()) as SkinMeshData
  }
  _meshCache.set(cacheKey, data)
  return data
}

// ══ THE STAGE ═════════════════════════════════════════════════════════════

export interface PoseStageHandle {
  /** { gl, scene, camera } — the MotionExportDialog projection ctx. */
  threeCtx: { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera }
  update(p: PoseStageProps): void
  applyCamera(view: string, framing: CameraFraming): void
  setDarkMode(dark: boolean): void
  dispose(): void
}

export function mountPoseStage(
  canvas: HTMLCanvasElement,
  opts: {
    fov: number
    camera: [number, number, number]
    darkMode: boolean
    onFail?: (msg: string) => void
    onCanvasReady?: (canvas: HTMLCanvasElement) => void
  },
): PoseStageHandle | null {
  const stage: Stage3D | null = mountStage3D(canvas, {
    fov: opts.fov,
    near: 0.05,
    far: 100,
    camera: opts.camera,
    target: [0, 0.9, 0],
    minDistance: 0.8,
    maxDistance: 12,
    maxPolarAngle: Math.PI / 1.85,
    alpha: false,
    // the old r3f Canvas's gl prop verbatim — the export dialog reads
    // the canvas back (toDataURL); without this the buffer clears
    // after present and every screenshot comes back blank
    preserveDrawingBuffer: true,
    onContextFailure: opts.onFail,
    // EMPTY-SPACE DESELECT: the old tree carried a radius-0.001
    // invisible sphere inside the joint manipulator (effectively dead
    // — no raycast could ever hit it) whose INTENT was click-nothing →
    // deselect. The raw stage makes the intent real: an empty click
    // while a manipulator is live clears the joint + chain selection.
    onEmptyClick: (): void => {
      if (refManip.root !== null) {
        refManip.onSelectJoint(null)
        refManip.onSelectChain?.(null)
      } else if (manip.active) {
        manip.onSelectJoint(null)
        manip.onSelectChain?.(null)
      }
    },
  })
  if (stage === null) return null
  opts.onCanvasReady?.(canvas)

  const scene = stage.scene
  const dark = opts.darkMode
  stage.renderer.setClearColor(new THREE.Color(dark ? "#0e0e1a" : "#e4e4f0"))

  // ── Light rig (the orbs-vs-default switch is applied in update) ──────
  const ambient = new THREE.AmbientLight(0xffffff, 0.45)
  scene.add(ambient)
  const key = new THREE.DirectionalLight(0xffffff, 1.0)
  key.position.set(5, 8, 5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -3
  key.shadow.camera.right = 3
  key.shadow.camera.top = 3
  key.shadow.camera.bottom = -3
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 20
  key.shadow.bias = -0.0005
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xffffff, 0.25)
  fill.position.set(-4, 3, -2)
  scene.add(fill)
  const hemi = new THREE.HemisphereLight(0xcdd6f4, 0x1a1a2e, 0.35)
  scene.add(hemi)

  // Contact-shadow analogue: the floor catches the key light's shadow
  // through a ShadowMaterial plane (single grounded figure — same read as
  // the old ContactShadows pass; opacity is switched off under orb light).
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.55 })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0.001
  ground.receiveShadow = true
  scene.add(ground)

  // Kimodo grid floor (cell 0.25 m / section 1 m — the drei Grid args).
  const grid = new THREE.GridHelper(12, 48, 0x5a5a8a, 0x3a3a5a)
  const gridMat = grid.material as THREE.Material
  gridMat.transparent = true
  gridMat.opacity = 0.9
  scene.add(grid)

  // ── THE LIFT GROUP — all raw-space content lives here ────────────────
  const liftGroup = new THREE.Group()
  scene.add(liftGroup)

  // ══ SkinCarrier (the SkinnedHumanoid port) ══════════════════════════
  // Bind geometry per meshData; per-frame uploads from deformedFlat with
  // the cm→m scale; normals/bounds skipped while animating (the freeze
  // fix) and recomputed on pause/structural change.
  const skin = {
    mesh: null as THREE.Mesh | null,
    geo: null as THREE.BufferGeometry | null,
    mat: null as THREE.MeshStandardMaterial | null,
    scratch: new Float32Array(0),
    lastUploadedIdx: -2,
    meshData: null as SkinMeshData | null,
    deformedFlat: null as Float32Array | null,
    numVerts: 0,
    lastAnimate: false,
    setMesh(p: PoseStageProps): void {
      this.numVerts = p.numVerts
      if (this.meshData !== p.meshData) {
        this.meshData = p.meshData
        this.geo?.dispose()
        this.geo = buildGeometry(p.meshData)
        this.scratch = new Float32Array(p.numVerts * 3)
        if (this.mesh === null) {
          this.mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(p.color),
            roughness: 0.55,
            metalness: 0.05,
            flatShading: false,
            side: THREE.DoubleSide,
          })
          this.mesh = new THREE.Mesh(this.geo, this.mat)
          this.mesh.castShadow = true
          this.mesh.receiveShadow = true
          liftGroup.add(this.mesh)
        } else {
          this.mesh.geometry = this.geo
        }
        this.lastUploadedIdx = -2 // force structural re-upload
      }
      const opacity = p.editMode ? Math.min(p.opacity, 0.85) : p.opacity
      if (this.mat !== null) {
        this.mat.color.set(p.color)
        this.mat.opacity = opacity
        this.mat.transparent = opacity < 1.0
        this.mat.wireframe = p.wireframe
      }
    },
    setData(deformedFlat: Float32Array | null): void {
      if (this.deformedFlat !== deformedFlat) {
        this.deformedFlat = deformedFlat
        this.lastUploadedIdx = -2
      }
    },
    uploadFrame(idx: number, showBindPose: boolean, animate: boolean): void {
      const geo = this.geo
      if (geo === null || this.meshData === null) return
      const pos = geo.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      const meshVertCount = this.meshData.vertices.length
      const canDeform = !showBindPose && !!this.deformedFlat && meshVertCount === this.numVerts
      if (!canDeform) {
        // Reset to bind pose. SOMA meshes are cm → m; GLB meshes are already m.
        const isSoma = meshVertCount === 18056
        const scale = isSoma ? CM_TO_M : 1.0
        const verts = this.meshData.vertices
        for (let i = 0; i < verts.length; i++) {
          arr[i * 3] = verts[i][0] * scale
          arr[i * 3 + 1] = verts[i][1] * scale
          arr[i * 3 + 2] = verts[i][2] * scale
        }
        this.lastUploadedIdx = -1 // bind pose — no frame idx
        pos.needsUpdate = true
        geo.computeVertexNormals()
        geo.computeBoundingSphere()
        return
      }
      const stride = this.numVerts * 3
      const frameCount = this.deformedFlat!.length / stride
      const clamped = Math.max(0, Math.min(idx, frameCount - 1))
      const base = clamped * stride
      // Deformed verts arrive in cm — converted to meters into the scratch
      // buffer (no per-vertex allocs at 60fps).
      const src = this.deformedFlat!.subarray(base, base + stride)
      for (let i = 0; i < stride; i++) this.scratch[i] = src[i] * CM_TO_M
      arr.set(this.scratch, 0)
      pos.needsUpdate = true
      // Normals/bounds skipped during playback (the freeze fix — adjacent
      // frames are visually identical); recomputed on pause (the structural
      // update path fires when animate goes false).
      if (!animate) {
        geo.computeVertexNormals()
        geo.computeBoundingSphere()
      }
      this.lastUploadedIdx = clamped
    },
  }

  // Playback-decoupling ref: mirror of frameIdx, advanced by the anim tick
  // at 60fps, synced from props on every update (scrub / external set).
  const frameIdxRef = { current: 0 }

  // ══ AnimClock (the AnimController port) ═════════════════════════════
  const anim = {
    time: 0,
    uiAccum: 0,
    lastSyncedIdx: -1,
    animate: false,
    enabled: false,
    frameCount: 1,
    fps: 30,
    speed: 1,
    setFrameIdx: (_f: number) => {},
    reset(): void { this.time = 0; this.uiAccum = 0 },
    tick(delta: number): void {
      if (!this.animate || !this.enabled || this.frameCount < 2) return
      this.time += delta * this.speed
      const frameDelta = Math.floor(this.time * this.fps)
      if (frameDelta > 0) {
        this.time -= frameDelta / this.fps
        const newIdx = (frameIdxRef.current + frameDelta) % this.frameCount
        if (newIdx !== frameIdxRef.current) frameIdxRef.current = newIdx
      }
      this.uiAccum += delta
      if (this.uiAccum >= 0.1) {
        this.uiAccum = 0
        const cur = frameIdxRef.current
        if (cur !== this.lastSyncedIdx) {
          this.lastSyncedIdx = cur
          this.setFrameIdx(cur)
        }
      }
    },
  }
  // Tick order = the old JSX declaration order: clock advances, then the
  // mesh uploads whatever idx it landed on (60fps, zero React renders).
  stage.addTick((delta) => anim.tick(delta))
  stage.addTick(() => {
    if (skin.geo === null || skin.mesh === null) return
    const target = frameIdxRef.current
    if (target !== skin.lastUploadedIdx) skin.uploadFrame(target, showBindPose0, anim0)
  })
  let showBindPose0 = true
  let anim0 = false

  // ══ SkeletonOverlay carrier ═════════════════════════════════════════
  const skeleton = {
    spheres: null as THREE.InstancedMesh | null,
    lines: null as THREE.LineSegments | null,
    boneGeo: null as THREE.BufferGeometry | null,
    dummy: new THREE.Object3D(),
    ensure(): void {
      if (this.spheres !== null) return
      const sphereGeo = new THREE.SphereGeometry(0.018, 8, 8)
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 })
      this.spheres = new THREE.InstancedMesh(sphereGeo, sphereMat, 77)
      const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
      this.boneGeo = new THREE.BufferGeometry()
      this.boneGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      const boneMat = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.7 })
      this.lines = new THREE.LineSegments(this.boneGeo, boneMat)
      liftGroup.add(this.spheres)
      liftGroup.add(this.lines)
    },
    update(jointsFlat: Float32Array | null, frameIdx: number): void {
      if (jointsFlat === null) {
        if (this.spheres !== null) this.spheres.visible = false
        if (this.lines !== null) this.lines.visible = false
        return
      }
      this.ensure()
      this.spheres!.visible = true
      this.lines!.visible = true
      const stride = 77 * 3
      const frameCount = jointsFlat.length / stride
      const idx = Math.max(0, Math.min(frameIdx, frameCount - 1))
      const base = idx * stride
      for (let j = 0; j < 77; j++) {
        this.dummy.position.set(
          jointsFlat[base + j * 3] * CM_TO_M,
          jointsFlat[base + j * 3 + 1] * CM_TO_M,
          jointsFlat[base + j * 3 + 2] * CM_TO_M,
        )
        this.dummy.scale.setScalar(1)
        this.dummy.updateMatrix()
        this.spheres!.setMatrixAt(j, this.dummy.matrix)
      }
      this.spheres!.instanceMatrix.needsUpdate = true
      const pos = this.boneGeo!.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
        const [pp, cc] = SOMA77_BONE_CONNECTIONS[b]
        arr[b * 6 + 0] = jointsFlat[base + pp * 3] * CM_TO_M
        arr[b * 6 + 1] = jointsFlat[base + pp * 3 + 1] * CM_TO_M
        arr[b * 6 + 2] = jointsFlat[base + pp * 3 + 2] * CM_TO_M
        arr[b * 6 + 3] = jointsFlat[base + cc * 3] * CM_TO_M
        arr[b * 6 + 4] = jointsFlat[base + cc * 3 + 1] * CM_TO_M
        arr[b * 6 + 5] = jointsFlat[base + cc * 3 + 2] * CM_TO_M
      }
      pos.needsUpdate = true
      this.boneGeo!.computeBoundingSphere()
    },
  }

  // ══ JointManipulator (the PoseEditMode port) ════════════════════════
  // 77 clickable joint spheres + bones + a scene-rooted TransformControls
  // whose pivot lives in the lift group (raw m local). FK rotate/translate
  // + IK CCD — the drag handlers verbatim.
  const manip = {
    root: null as THREE.Group | null,
    jointMeshes: [] as THREE.Mesh[],
    jointMats: [] as THREE.MeshBasicMaterial[],
    boneGeo: null as THREE.BufferGeometry | null,
    pivot: new THREE.Group(),
    tc: null as TransformControls | null,
    hovered: -1,
    dragging: false,
    prevRot: new THREE.Euler(0, 0, 0),
    active: false,
    jointsFlat: null as Float32Array | null,
    selectedJoint: null as number | null,
    selectedChain: null as number[] | null,
    onSelectJoint: (_i: number | null, _a?: boolean) => {},
    onSelectChain: undefined as ((c: number[] | null) => void) | undefined,
    onJointMove: (_e: JointMoveEvent) => {},
    gizmoMode: "rotate" as "rotate" | "translate",
    kinematicMode: "fk" as "fk" | "ik",
    get isIKActive(): boolean {
      return this.kinematicMode === "ik" && this.selectedJoint !== null && this.selectedJoint !== 0
    },
    get effectiveMode(): "rotate" | "translate" {
      return this.isIKActive ? "translate" : this.gizmoMode
    },
    ensure(root: THREE.Group): void {
      if (this.root !== null) return
      this.root = new THREE.Group()
      root.add(this.root)
      const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
      this.boneGeo = new THREE.BufferGeometry()
      this.boneGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      const boneMat = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.5 })
      this.root.add(new THREE.LineSegments(this.boneGeo, boneMat))
      for (let j = 0; j < 77; j++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffcc66 })
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(JOINT_RADIUS[j] || 0.02, 12, 12), mat)
        mesh.userData.pick = {
          click: (_point: THREE.Vector3, ev: MouseEvent | PointerEvent): void => {
            this.handleJointClick(j, ev)
          },
          over: (): void => { this.hovered = j; document.body.style.cursor = "pointer"; this.paint() },
          out: (): void => { if (this.hovered === j) this.hovered = -1; document.body.style.cursor = "auto"; this.paint() },
        }
        this.jointMeshes[j] = mesh
        this.jointMats[j] = mat
        this.root.add(mesh)
      }
      root.add(this.pivot)
    },
    handleJointClick(j: number, ev: MouseEvent | PointerEvent): void {
      const additive = ev.shiftKey
      this.onSelectJoint(j, additive)
      if (this.onSelectChain !== undefined) {
        this.onSelectChain(additive ? getJointChain(j, 0) : null)
      }
    },
    paint(): void {
      for (let j = 0; j < 77; j++) {
        const inChain = this.selectedChain?.includes(j) ?? false
        this.jointMats[j].color.set(
          this.selectedJoint === j ? "#00ff88"
          : inChain ? "#ff66ff"
          : this.hovered === j ? "#ffdd00"
          : "#ffcc66",
        )
      }
    },
    updateJoints(): void {
      const jf = this.jointsFlat
      if (jf === null) return
      for (let j = 0; j < 77; j++) {
        this.jointMeshes[j].position.set(
          jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M,
        )
      }
      const pos = this.boneGeo!.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
        const [pp, cc] = SOMA77_BONE_CONNECTIONS[b]
        arr[b * 6 + 0] = jf[pp * 3] * CM_TO_M
        arr[b * 6 + 1] = jf[pp * 3 + 1] * CM_TO_M
        arr[b * 6 + 2] = jf[pp * 3 + 2] * CM_TO_M
        arr[b * 6 + 3] = jf[cc * 3] * CM_TO_M
        arr[b * 6 + 4] = jf[cc * 3 + 1] * CM_TO_M
        arr[b * 6 + 5] = jf[cc * 3 + 2] * CM_TO_M
      }
      pos.needsUpdate = true
      this.boneGeo!.computeBoundingSphere()
      this.paint()
    },
    positionGizmo(): void {
      if (this.dragging) return
      const jf = this.jointsFlat
      if (this.selectedJoint === null || jf === null) return
      const j = this.selectedJoint
      this.pivot.position.set(
        jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M,
      )
      this.pivot.rotation.set(0, 0, 0)
      this.prevRot.set(0, 0, 0)
    },
    handleGizmoDrag(): void {
      const jf = this.jointsFlat
      if (this.selectedJoint === null || jf === null) return
      const selectedJoint = this.selectedJoint
      if (this.isIKActive) {
        // IK: 2-joint chain [parent, selected] — clean isolation (the
        // full-limb CCD diverged; see the old comment, preserved).
        const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M)
        const chainParent = SOMA77_PARENT[selectedJoint]
        if (chainParent < 0) return
        const newJoints = solveCCD(jf, [chainParent, selectedJoint], target)
        this.onJointMove({ idx: selectedJoint, position: target, fullJoints: newJoints })
      } else if (this.effectiveMode === "rotate") {
        // FK rotate: delta-Euler → rotate all descendants around the pivot.
        const curRot = this.pivot.rotation
        const prev = this.prevRot
        const dx = curRot.x - prev.x
        const dy = curRot.y - prev.y
        const dz = curRot.z - prev.z
        if (Math.abs(dx) < 1e-7 && Math.abs(dy) < 1e-7 && Math.abs(dz) < 1e-7) return
        const px = jf[selectedJoint * 3]
        const py = jf[selectedJoint * 3 + 1]
        const pz = jf[selectedJoint * 3 + 2]
        const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(dx, dy, dz, "XYZ"))
        const newJoints = new Float32Array(jf)
        const descendants = getDescendants(selectedJoint)
        const tmp = new THREE.Vector3()
        for (const j of descendants) {
          tmp.set(newJoints[j * 3] - px, newJoints[j * 3 + 1] - py, newJoints[j * 3 + 2] - pz)
          tmp.applyQuaternion(quat)
          newJoints[j * 3] = tmp.x + px
          newJoints[j * 3 + 1] = tmp.y + py
          newJoints[j * 3 + 2] = tmp.z + pz
        }
        this.prevRot.copy(curRot)
        this.onJointMove({ idx: selectedJoint, position: new THREE.Vector3(px, py, pz), fullJoints: newJoints })
      } else {
        // FK translate: move just this joint to the gizmo position (cm).
        const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M)
        this.onJointMove({ idx: selectedJoint, position: target })
      }
    },
    syncGizmo(): void {
      const want = this.active && this.selectedJoint !== null && this.jointsFlat !== null
      if (want && this.tc === null) {
        this.tc = new TransformControls(stage.camera, stage.canvas)
        this.tc.setSize(0.8)
        this.tc.addEventListener("dragging-changed", (ev: THREE.Event) => {
          const on = (ev as unknown as { value: boolean }).value
          stage.controls.enabled = !on
          this.dragging = on
        })
        this.tc.addEventListener("mouseDown", () => { this.dragging = true; this.prevRot.set(0, 0, 0) })
        this.tc.addEventListener("objectChange", () => this.handleGizmoDrag())
        this.tc.addEventListener("mouseUp", () => { this.dragging = false; this.handleGizmoDrag() })
        scene.add(this.tc as unknown as THREE.Object3D)
      }
      if (this.tc === null) return
      if (want) {
        this.tc.attach(this.pivot)
        this.tc.setMode(this.effectiveMode)
        this.tc.enabled = true
      } else {
        this.tc.detach()
        this.tc.enabled = false
      }
    },
  }

  // ══ ReferenceManipulator (editRefMode's manipulator inside the
  //    reference's offset group — origin-aligned local frame) ══════════
  // Shares the pivot/TC pattern but its own joints + handlers.
  const refManip = {
    root: null as THREE.Group | null,
    jointMeshes: [] as THREE.Mesh[],
    jointMats: [] as THREE.MeshBasicMaterial[],
    boneGeo: null as THREE.BufferGeometry | null,
    pivot: new THREE.Group(),
    tc: null as TransformControls | null,
    hovered: -1,
    dragging: false,
    prevRot: new THREE.Euler(0, 0, 0),
    jointsFlat: null as Float32Array | null,
    selectedJoint: null as number | null,
    selectedChain: null as number[] | null,
    onSelectJoint: (_i: number | null, _a?: boolean) => {},
    onSelectChain: undefined as ((c: number[] | null) => void) | undefined,
    onJointMove: (_e: JointMoveEvent) => {},
    gizmoMode: "rotate" as "rotate" | "translate",
    kinematicMode: "fk" as "fk" | "ik",
    ensure(root: THREE.Group): void {
      if (this.root !== null) { if (this.root.parent !== root) root.add(this.root); return }
      this.root = new THREE.Group()
      root.add(this.root)
      const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
      this.boneGeo = new THREE.BufferGeometry()
      this.boneGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      const boneMat = new THREE.LineBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.5 })
      this.root.add(new THREE.LineSegments(this.boneGeo, boneMat))
      for (let j = 0; j < 77; j++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffcc66 })
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(JOINT_RADIUS[j] || 0.02, 12, 12), mat)
        mesh.userData.pick = {
          click: (_point: THREE.Vector3, ev: MouseEvent | PointerEvent): void => {
            const additive = ev.shiftKey
            this.onSelectJoint(j, additive)
            if (this.onSelectChain !== undefined) {
              this.onSelectChain(additive ? getJointChain(j, 0) : null)
            }
          },
          over: (): void => { this.hovered = j; document.body.style.cursor = "pointer"; this.paint() },
          out: (): void => { if (this.hovered === j) this.hovered = -1; document.body.style.cursor = "auto"; this.paint() },
        }
        this.jointMeshes[j] = mesh
        this.jointMats[j] = mat
        this.root.add(mesh)
      }
      root.add(this.pivot)
    },
    paint(): void {
      for (let j = 0; j < 77; j++) {
        const inChain = this.selectedChain?.includes(j) ?? false
        this.jointMats[j].color.set(
          this.selectedJoint === j ? "#00ff88"
          : inChain ? "#ff66ff"
          : this.hovered === j ? "#ffdd00"
          : "#ffcc66",
        )
      }
    },
    updateJoints(): void {
      const jf = this.jointsFlat
      if (jf === null || this.root === null) return
      for (let j = 0; j < 77; j++) {
        this.jointMeshes[j].position.set(
          jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M,
        )
      }
      const pos = this.boneGeo!.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
        const [pp, cc] = SOMA77_BONE_CONNECTIONS[b]
        arr[b * 6 + 0] = jf[pp * 3] * CM_TO_M
        arr[b * 6 + 1] = jf[pp * 3 + 1] * CM_TO_M
        arr[b * 6 + 2] = jf[pp * 3 + 2] * CM_TO_M
        arr[b * 6 + 3] = jf[cc * 3] * CM_TO_M
        arr[b * 6 + 4] = jf[cc * 3 + 1] * CM_TO_M
        arr[b * 6 + 5] = jf[cc * 3 + 2] * CM_TO_M
      }
      pos.needsUpdate = true
      this.boneGeo!.computeBoundingSphere()
      this.paint()
    },
    get isIKActive(): boolean {
      return this.kinematicMode === "ik" && this.selectedJoint !== null && this.selectedJoint !== 0
    },
    get effectiveMode(): "rotate" | "translate" {
      return this.isIKActive ? "translate" : this.gizmoMode
    },
    positionGizmo(): void {
      if (this.dragging) return
      const jf = this.jointsFlat
      if (this.selectedJoint === null || jf === null) return
      const j = this.selectedJoint
      this.pivot.position.set(
        jf[j * 3] * CM_TO_M, jf[j * 3 + 1] * CM_TO_M, jf[j * 3 + 2] * CM_TO_M,
      )
      this.pivot.rotation.set(0, 0, 0)
      this.prevRot.set(0, 0, 0)
    },
    handleGizmoDrag(): void {
      const jf = this.jointsFlat
      if (this.selectedJoint === null || jf === null) return
      const selectedJoint = this.selectedJoint
      if (this.isIKActive) {
        const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M)
        const chainParent = SOMA77_PARENT[selectedJoint]
        if (chainParent < 0) return
        const newJoints = solveCCD(jf, [chainParent, selectedJoint], target)
        this.onJointMove({ idx: selectedJoint, position: target, fullJoints: newJoints })
      } else if (this.effectiveMode === "rotate") {
        const curRot = this.pivot.rotation
        const prev = this.prevRot
        const dx = curRot.x - prev.x
        const dy = curRot.y - prev.y
        const dz = curRot.z - prev.z
        if (Math.abs(dx) < 1e-7 && Math.abs(dy) < 1e-7 && Math.abs(dz) < 1e-7) return
        const px = jf[selectedJoint * 3]
        const py = jf[selectedJoint * 3 + 1]
        const pz = jf[selectedJoint * 3 + 2]
        const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(dx, dy, dz, "XYZ"))
        const newJoints = new Float32Array(jf)
        const descendants = getDescendants(selectedJoint)
        const tmp = new THREE.Vector3()
        for (const j of descendants) {
          tmp.set(newJoints[j * 3] - px, newJoints[j * 3 + 1] - py, newJoints[j * 3 + 2] - pz)
          tmp.applyQuaternion(quat)
          newJoints[j * 3] = tmp.x + px
          newJoints[j * 3 + 1] = tmp.y + py
          newJoints[j * 3 + 2] = tmp.z + pz
        }
        this.prevRot.copy(curRot)
        this.onJointMove({ idx: selectedJoint, position: new THREE.Vector3(px, py, pz), fullJoints: newJoints })
      } else {
        const target = this.pivot.position.clone().multiplyScalar(1 / CM_TO_M)
        this.onJointMove({ idx: selectedJoint, position: target })
      }
    },
    syncGizmo(): void {
      const want = this.root !== null && this.selectedJoint !== null && this.jointsFlat !== null
      if (want && this.tc === null) {
        this.tc = new TransformControls(stage.camera, stage.canvas)
        this.tc.setSize(0.8)
        this.tc.addEventListener("dragging-changed", (ev: THREE.Event) => {
          const on = (ev as unknown as { value: boolean }).value
          stage.controls.enabled = !on
          this.dragging = on
        })
        this.tc.addEventListener("mouseDown", () => { this.dragging = true; this.prevRot.set(0, 0, 0) })
        this.tc.addEventListener("objectChange", () => this.handleGizmoDrag())
        this.tc.addEventListener("mouseUp", () => { this.dragging = false; this.handleGizmoDrag() })
        scene.add(this.tc as unknown as THREE.Object3D)
      }
      if (this.tc === null) return
      if (want) {
        this.tc.attach(this.pivot)
        this.tc.setMode(this.effectiveMode)
        this.tc.enabled = true
      } else {
        this.tc.detach()
        this.tc.enabled = false
      }
    },
    show(root: THREE.Group | null): void {
      if (root === null) {
        if (this.root !== null) this.root.visible = false
        this.pivot.visible = false
      } else {
        this.ensure(root)
        this.root!.visible = true
        this.pivot.visible = true
      }
    },
  }

  // ══ LightingOrbs ════════════════════════════════════════════════════
  const orbs = {
    root: new THREE.Group(),
    entries: [] as {
      id: string
      group: THREE.Group
      sphereMat: THREE.MeshBasicMaterial
      light: THREE.PointLight
      tc: TransformControls | null
    }[],
    onChange: undefined as ((o: LightingOrb[]) => void) | undefined,
    onSelectOrb: undefined as ((id: string | null) => void) | undefined,
    orbs: [] as LightingOrb[],
    selectedOrb: null as string | null,
    constructorDone: false,
    update(list: LightingOrb[], selectedOrb: string | null): void {
      this.orbs = list
      this.selectedOrb = selectedOrb
      // Coarse rebuild: orb lists are tiny (≤ a handful).
      for (const e of this.entries) {
        e.group.removeFromParent()
        e.sphereMat.dispose()
        e.light.dispose()
        if (e.tc !== null) { e.tc.dispose(); (e.tc as unknown as THREE.Object3D).removeFromParent() }
      }
      this.entries = []
      for (const orb of list) {
        const group = new THREE.Group()
        group.position.set(orb.position[0], orb.position[1], orb.position[2])
        const sphereMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(orb.color), transparent: true,
          opacity: selectedOrb === orb.id ? 1.0 : 0.8,
        })
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), sphereMat)
        sphere.userData.pick = {
          click: (): void => { this.onSelectOrb?.(orb.id) },
          over: (): void => { document.body.style.cursor = "pointer" },
          out: (): void => { document.body.style.cursor = "auto" },
        }
        group.add(sphere)
        const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(orb.color), transparent: true, opacity: 0.15 })
        group.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), haloMat))
        const light = new THREE.PointLight(new THREE.Color(orb.color), orb.intensity, orb.distance)
        light.castShadow = orb.castShadow
        group.add(light)
        this.root.add(group)
        this.entries.push({ id: orb.id, group, sphereMat, light, tc: null })
      }
      // Selected orb gets a translate gizmo (scene-rooted → world drags).
      const selIdx = list.findIndex(o => o.id === selectedOrb)
      if (selIdx >= 0) {
        const e = this.entries[selIdx]
        e.tc = new TransformControls(stage.camera, stage.canvas)
        e.tc.setSize(0.6)
        e.tc.setMode("translate")
        e.tc.addEventListener("dragging-changed", (ev: THREE.Event) => {
          stage.controls.enabled = !(ev as unknown as { value: boolean }).value
        })
        const push = (): void => { this.handleOrbDrag(e.id) }
        e.tc.addEventListener("objectChange", push)
        e.tc.addEventListener("mouseUp", push)
        e.tc.attach(e.group)
        scene.add(e.tc as unknown as THREE.Object3D)
      }
    },
    handleOrbDrag(id: string): void {
      const i = this.orbs.findIndex(o => o.id === id)
      const e = this.entries.find(en => en.id === id)
      if (i < 0 || e === undefined || this.onChange === undefined) return
      const updated = [...this.orbs]
      updated[i] = {
        ...updated[i],
        position: [e.group.position.x, e.group.position.y, e.group.position.z],
      }
      this.onChange(updated)
    },
  }
  scene.add(orbs.root)

  // ══ KeyframeGhost ═══════════════════════════════════════════════════
  const ghost = {
    lines: null as THREE.LineSegments | null,
    geo: null as THREE.BufferGeometry | null,
    update(joints: Float32Array | null): void {
      if (joints === null) {
        if (this.lines !== null) this.lines.visible = false
        return
      }
      if (this.lines === null) {
        const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
        this.geo = new THREE.BufferGeometry()
        this.geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
        const mat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 })
        this.lines = new THREE.LineSegments(this.geo, mat)
        liftGroup.add(this.lines)
      }
      this.lines.visible = true
      const pos = this.geo!.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let b = 0; b < SOMA77_BONE_CONNECTIONS.length; b++) {
        const [pp, cc] = SOMA77_BONE_CONNECTIONS[b]
        arr[b * 6 + 0] = joints[pp * 3] * CM_TO_M
        arr[b * 6 + 1] = joints[pp * 3 + 1] * CM_TO_M
        arr[b * 6 + 2] = joints[pp * 3 + 2] * CM_TO_M
        arr[b * 6 + 3] = joints[cc * 3] * CM_TO_M
        arr[b * 6 + 4] = joints[cc * 3 + 1] * CM_TO_M
        arr[b * 6 + 5] = joints[cc * 3 + 2] * CM_TO_M
      }
      pos.needsUpdate = true
      this.geo!.computeBoundingSphere()
    },
  }

  // ══ FootContactsOverlay ═════════════════════════════════════════════
  const contacts = {
    meshes: [] as THREE.Mesh[],
    mats: [] as THREE.MeshBasicMaterial[],
    ensure(): void {
      if (this.meshes.length > 0) return
      for (let i = 0; i < 4; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(new THREE.RingGeometry(0.028, 0.04, 16), mat)
        mesh.rotation.x = -Math.PI / 2
        liftGroup.add(mesh)
        this.meshes.push(mesh)
        this.mats.push(mat)
      }
    },
    update(footContacts: number[][] | null, frameIdx: number, jointsFlat: Float32Array | null): void {
      const show = !!footContacts && footContacts.length > 0 && !!jointsFlat
      this.ensure()
      const colors = [0x3b82f6, 0xec4899, 0xa855f7, 0xef4444]
      for (const m of this.meshes) m.visible = show
      if (!show) return
      const fi = Math.max(0, Math.min(frameIdx, footContacts!.length - 1))
      const fc = footContacts![fi]
      if (!fc || fc.length < 4) { for (const m of this.meshes) m.visible = false; return }
      const stride = 77 * 3
      const frameCount = jointsFlat!.length / stride
      const idx = Math.max(0, Math.min(fi, frameCount - 1))
      const base = idx * stride
      const feet = [69, 74]
      const footPos = feet.map(j => [
        jointsFlat![base + j * 3] * CM_TO_M,
        jointsFlat![base + j * 3 + 1] * CM_TO_M,
        jointsFlat![base + j * 3 + 2] * CM_TO_M,
      ] as [number, number, number])
      // [L_heel, R_heel, L_toe, R_toe]
      const src = [footPos[0], footPos[1], footPos[0], footPos[1]]
      for (let i = 0; i < 4; i++) {
        const contact = fc[i]
        const dz = i < 2 ? -0.04 : 0.04
        const radius = 0.04 + contact * 0.04
        this.meshes[i].position.set(src[i][0], 0.005, src[i][2] + dz)
        this.meshes[i].scale.setScalar(radius / 0.04)
        this.mats[i].color.setHex(colors[i])
        this.mats[i].opacity = 0.2 + contact * 0.8
      }
    },
  }

  // ══ StartingDirectionArrow ══════════════════════════════════════════
  const arrow = {
    group: null as THREE.Group | null,
    update(jointsFlat: Float32Array | null): void {
      const rebuild = (): void => {
        if (this.group !== null) { this.group.removeFromParent(); this.group = null }
        if (jointsFlat === null || jointsFlat.length < 6) return
        // Direction: root joint (0) movement between the first two frames.
        const stride = 77 * 3
        const frames = Math.floor(jointsFlat.length / stride)
        if (frames < 2) return
        const r0 = [jointsFlat[0] * CM_TO_M, jointsFlat[2] * CM_TO_M]
        const r1 = [jointsFlat[stride] * CM_TO_M, jointsFlat[stride + 2] * CM_TO_M]
        const dx = r1[0] - r0[0]
        const dz = r1[1] - r0[1]
        const len = Math.hypot(dx, dz)
        if (len < 0.01) return
        const angle = Math.atan2(dx, dz)
        const arrowLen = Math.min(0.8, len * 2 + 0.2)
        const g = new THREE.Group()
        g.position.set(r0[0], 0.01, r0[1])
        g.rotation.y = angle
        const shaftMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, arrowLen, 8), shaftMat)
        shaft.position.set(0, 0, arrowLen / 2)
        shaft.rotation.x = Math.PI / 2
        g.add(shaft)
        const headMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95 })
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 12), headMat)
        head.position.set(0, 0, arrowLen)
        head.rotation.x = Math.PI / 2
        g.add(head)
        liftGroup.add(g)
        this.group = g
      }
      rebuild()
    },
    setVisible(v: boolean): void { if (this.group !== null) this.group.visible = v },
  }
  let arrowJointsRef: Float32Array | null = null

  // ══ AltSampleMeshes (meshes only — the shell decodes async) ═════════
  const alts = {
    root: new THREE.Group(),
    samples: [] as AltSampleDecoded[],
    faces: [] as number[][],
    onCommit: (_i: number) => {},
    update(samples: AltSampleDecoded[], meshData: SkinMeshData | null, onCommit: (i: number) => void): void {
      this.onCommit = onCommit
      this.root.clear()
      this.samples = samples
      if (meshData === null || samples.length === 0) return
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i]
        const g = new THREE.BufferGeometry()
        const arr = new Float32Array(s.verts)
        g.setAttribute("position", new THREE.BufferAttribute(arr, 3))
        g.setIndex(meshData.faces.flat(2))
        g.computeVertexNormals()
        const mat = new THREE.MeshStandardMaterial({ color: 0xa8a8a8, transparent: true, opacity: 0.45, roughness: 0.7 })
        const mesh = new THREE.Mesh(g, mat)
        mesh.userData.pick = {
          click: (): void => { this.onCommit(s.idx) },
          over: (): void => { document.body.style.cursor = "pointer" },
          out: (): void => { document.body.style.cursor = "auto" },
        }
        const holder = new THREE.Group()
        holder.position.set(1.2 + i * 0.6, 0, -0.3)
        holder.add(mesh)
        const hintMat = new THREE.MeshBasicMaterial({ color: 0x98bdf7, transparent: true, opacity: 0.6 })
        const hint = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), hintMat)
        hint.position.set(0, 1.6, 0)
        holder.add(hint)
        this.root.add(holder)
      }
    },
  }
  liftGroup.add(alts.root)

  // ══ ConstraintOverlays ══════════════════════════════════════════════
  const constraints = {
    root: new THREE.Group(),
    eeTC: null as TransformControls | null,
    eeGroups: [] as THREE.Group[],
    eeMats: [] as THREE.MeshBasicMaterial[],
    eeIds: [] as string[],
    points: [] as { id: string; frame: number; joint_name: string; position: [number, number, number] }[],
    editMode: false,
    selectedEEId: null as string | null,
    showLabels: true,
    onSelectEE: undefined as ((id: string | null) => void) | undefined,
    onChangeEEPoint: undefined as ((id: string, p: [number, number, number]) => void) | undefined,
    eeColor: { LeftHand: "#f59e0b", RightHand: "#ef4444", LeftFoot: "#10b981", RightFoot: "#3b82f6" } as Record<string, string>,
    update(
      root2dPoints: { frame: number; x: number; z: number }[],
      endEffectorPoints: { id: string; frame: number; joint_name: string; position: [number, number, number] }[],
      showLabels: boolean, editMode: boolean, selectedEEId: string | null,
    ): void {
      this.points = endEffectorPoints
      this.showLabels = showLabels
      this.editMode = editMode
      this.selectedEEId = selectedEEId
      this.root.clear()
      this.eeGroups = []
      this.eeMats = []
      this.eeIds = []
      for (const p of root2dPoints) {
        const g = new THREE.Group()
        g.position.set(p.x, 0.005, p.z)
        const mat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.025, 0.04, 24), mat)
        ring.rotation.x = -Math.PI / 2
        g.add(ring)
        if (showLabels) {
          const label = makeLabelSprite(`F${p.frame}`, "#fcd34d", 0.035)
          label.position.set(0, 0.08, 0)
          g.add(label)
        }
        this.root.add(g)
      }
      for (const p of endEffectorPoints) {
        const color = this.eeColor[p.joint_name] ?? "#ffffff"
        const isSelected = editMode && selectedEEId === p.id
        const g = new THREE.Group()
        g.position.set(p.position[0], p.position[1], p.position[2])
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(isSelected ? "#ffffff" : color),
          transparent: true, opacity: isSelected ? 1.0 : 0.9,
        })
        const radius = isSelected ? 0.034 : 0.028
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), mat)
        sphere.userData.pick = {
          click: (): void => { if (editMode) this.onSelectEE?.(p.id) },
          over: (): void => { if (editMode) document.body.style.cursor = "move" },
          out: (): void => { document.body.style.cursor = "auto" },
        }
        g.add(sphere)
        if (isSelected) {
          const haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.18 })
          g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), haloMat))
        }
        if (showLabels) {
          const label = makeLabelSprite(`${p.joint_name[0] ?? "E"}·F${p.frame}`, isSelected ? "#ffffff" : color, 0.03)
          label.position.set(0, 0.08, 0)
          g.add(label)
        }
        this.root.add(g)
        this.eeGroups.push(g)
        this.eeMats.push(mat)
        this.eeIds.push(p.id)
        // Translate gizmo on the selected EE (edit mode only). Listeners
        // are registered ONCE at creation and read the CURRENT selection —
        // rebuilds never accumulate stale per-point handlers.
        if (isSelected && this.onChangeEEPoint !== undefined) {
          if (this.eeTC === null) {
            this.eeTC = new TransformControls(stage.camera, stage.canvas)
            this.eeTC.setSize(0.7)
            this.eeTC.setMode("translate")
            this.eeTC.addEventListener("dragging-changed", (ev: THREE.Event) => {
              stage.controls.enabled = !(ev as unknown as { value: boolean }).value
            })
            this.eeTC.addEventListener("objectChange", () => {
              if (this.selectedEEId !== null) this.handleEEDrag(this.selectedEEId)
            })
            this.eeTC.addEventListener("mouseUp", () => {
              if (this.selectedEEId !== null) this.handleEEDrag(this.selectedEEId)
            })
            scene.add(this.eeTC as unknown as THREE.Object3D)
          }
          this.eeTC.attach(g)
          this.eeTC.enabled = true
        }
      }
      if (this.eeTC !== null && !(editMode && selectedEEId !== null && endEffectorPoints.some(pt => pt.id === selectedEEId))) {
        this.eeTC.detach()
        this.eeTC.enabled = false
      }
    },
    handleEEDrag(id: string): void {
      if (this.onChangeEEPoint === undefined) return
      const i = this.eeIds.indexOf(id)
      if (i < 0) return
      const g = this.eeGroups[i]
      this.onChangeEEPoint(id, [g.position.x, g.position.y, g.position.z])
    },
  }
  liftGroup.add(constraints.root)

  // ══ EE placement plane (placingEE) ══════════════════════════════════
  const eePlane = {
    mesh: null as THREE.Mesh | null,
    setVisible(v: boolean): void { if (this.mesh !== null) this.mesh.visible = v },
    update(
      placingEE: boolean, eePlaceJointIdx: number,
      editableJoints: Float32Array | null, jointsFlat: Float32Array | null, frameIdx: number,
      onPlaceEE: (p: [number, number, number]) => void,
    ): void {
      if (placingEE && this.mesh === null) {
        const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), mat)
        this.mesh.rotation.x = -Math.PI / 2
        liftGroup.add(this.mesh)
      }
      if (this.mesh === null) return
      this.mesh.visible = placingEE
      if (!placingEE) return
      const ji = eePlaceJointIdx ?? 0
      const y = editableJoints ? editableJoints[ji * 3 + 1] * CM_TO_M
        : jointsFlat ? jointsFlat[(frameIdx * 77 + ji) * 3 + 1] * CM_TO_M
        : 1.0
      this.mesh.position.set(0, y, 0)
      this.mesh.userData.pick = {
        click: (point: THREE.Vector3): void => { onPlaceEE([point.x, y, point.z]) },
      }
    },
  }

  // ══ ReferenceMesh carrier ═══════════════════════════════════════════
  const reference = {
    root: null as THREE.Group | null,
    mesh: null as THREE.Mesh | null,
    geo: null as THREE.BufferGeometry | null,
    mat: null as THREE.MeshStandardMaterial | null,
    skeleton: null as { spheres: THREE.InstancedMesh; lines: THREE.LineSegments; boneGeo: THREE.BufferGeometry; dummy: THREE.Object3D } | null,
    scratch: new Float32Array(0),
    lastUploaded: -2,
    bundle: null as ReferenceBundle | null,
    lastSig: "",
    update(p: PoseStageProps): void {
      const b = p.reference
      const sig = b === null ? ""
        : [b.spec.deformedVerticesB64.length, b.spec.editedDeformedVerticesB64?.length ?? 0,
           b.spec.offset.join(","), b.meshData?.vertices.length ?? 0, b.flat?.length ?? 0,
           b.editedFlat?.length ?? 0, b.spec.jointFrames?.length ?? 0].join("|")
      if (sig !== this.lastSig) {
        this.lastSig = sig
        this.disposeMesh()
        if (b === null) { this.root?.removeFromParent(); this.root = null; this.skeleton?.spheres.removeFromParent(); this.skeleton?.lines.removeFromParent(); this.skeleton = null; return }
        this.bundle = b
        this.root = new THREE.Group()
        const jointFramesFlat = b.spec.jointFrames && b.spec.jointFrames.length >= 3
          ? new Float32Array(b.spec.jointFrames) : null
        const hasEdited = !!b.spec.editedDeformedVerticesB64 && !!b.editedFlat && b.editedFlat.length >= 3
        const activeFlat = hasEdited ? b.editedFlat : b.flat
        const isSkeletonOnly = !!jointFramesFlat && (!activeFlat || activeFlat.length < 3)
        if (isSkeletonOnly) {
          // Skeleton-only library clip: animated bones, amber palette.
          const refLiftDelta = 0
          this.root.position.set(b.spec.offset[0], refLiftDelta, b.spec.offset[1])
          const sphereGeo = new THREE.SphereGeometry(0.018, 8, 8)
          const sphereMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
          const spheres = new THREE.InstancedMesh(sphereGeo, sphereMat, 77)
          const positions = new Float32Array(SOMA77_BONE_CONNECTIONS.length * 6)
          const boneGeo = new THREE.BufferGeometry()
          boneGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
          const boneMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.7 })
          const lines = new THREE.LineSegments(boneGeo, boneMat)
          this.root.add(spheres); this.root.add(lines)
          this.skeleton = { spheres, lines, boneGeo, dummy: new THREE.Object3D() }
          ;(this.root as THREE.Group & { __skelFlat?: Float32Array }).__skelFlat = jointFramesFlat
        } else {
          if (b.meshData === null || activeFlat === null || activeFlat.length < 3) {
            // Not yet loaded — mount the offset group; content lands when
            // the shell's async fetches resolve (next update).
            liftGroup.add(this.root)
            return
          }
          const refLiftDelta = computeMeshLiftY(b.meshData) - computeMeshLiftY(p.meshData)
          this.root.position.set(b.spec.offset[0], refLiftDelta, b.spec.offset[1])
          this.geo = buildGeometry(b.meshData)
          const refFrameCount = hasEdited ? 1 : (b.spec.frameCount ?? 1)
          const numVerts = Math.floor(activeFlat.length / 3 / Math.max(1, refFrameCount))
          this.scratch = new Float32Array(numVerts * 3)
          this.mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(b.spec.color ?? "#9ca3af"),
            roughness: 0.55, metalness: 0.05, flatShading: false, side: THREE.DoubleSide,
            transparent: (b.spec.opacity ?? 0.42) < 1.0, opacity: b.spec.opacity ?? 0.42,
          })
          this.mesh = new THREE.Mesh(this.geo, this.mat)
          this.mesh.castShadow = true
          this.mesh.receiveShadow = true
          this.root.add(this.mesh)
          ;(this.root as THREE.Group & { __refFlat?: Float32Array }).__refFlat = activeFlat
          ;(this.root as THREE.Group & { __refFrames?: number }).__refFrames = refFrameCount
        }
        liftGroup.add(this.root)
        this.lastUploaded = -2
      } else if (b !== null && this.root !== null && this.mesh === null && this.skeleton === null) {
        // mounted but unloaded earlier — retry now that shell resolved
        this.lastSig = ""
        this.update(p)
        return
      }
      // per-update: frame upload (animated → follow playback idx)
      if (this.root === null) return
      if (this.skeleton !== null) {
        const flat = (this.root as THREE.Group & { __skelFlat?: Float32Array }).__skelFlat
        const fc = Math.max(1, Math.floor(flat!.length / (77 * 3)))
        const idx = fc > 1 ? Math.max(0, Math.min(p.refPlaybackFrameIdx ?? p.frameIdx, fc - 1)) : 0
        const base = idx * 77 * 3
        const d = this.skeleton.dummy
        for (let j = 0; j < 77; j++) {
          d.position.set(flat![base + j * 3] * CM_TO_M, flat![base + j * 3 + 1] * CM_TO_M, flat![base + j * 3 + 2] * CM_TO_M)
          d.scale.setScalar(1)
          d.updateMatrix()
          this.skeleton.spheres.setMatrixAt(j, d.matrix)
        }
        this.skeleton.spheres.instanceMatrix.needsUpdate = true
        const pos = this.skeleton.boneGeo.attributes.position as THREE.BufferAttribute
        const arr = pos.array as Float32Array
        for (let bb = 0; bb < SOMA77_BONE_CONNECTIONS.length; bb++) {
          const [pp, cc] = SOMA77_BONE_CONNECTIONS[bb]
          arr[bb * 6 + 0] = flat![base + pp * 3] * CM_TO_M
          arr[bb * 6 + 1] = flat![base + pp * 3 + 1] * CM_TO_M
          arr[bb * 6 + 2] = flat![base + pp * 3 + 2] * CM_TO_M
          arr[bb * 6 + 3] = flat![base + cc * 3] * CM_TO_M
          arr[bb * 6 + 4] = flat![base + cc * 3 + 1] * CM_TO_M
          arr[bb * 6 + 5] = flat![base + cc * 3 + 2] * CM_TO_M
        }
        pos.needsUpdate = true
        this.skeleton.boneGeo.computeBoundingSphere()
      } else if (this.mesh !== null && this.geo !== null) {
        const flat = (this.root as THREE.Group & { __refFlat?: Float32Array }).__refFlat
        const refFrames = (this.root as THREE.Group & { __refFrames?: number }).__refFrames ?? 1
        if (flat !== undefined) {
          const numVerts = this.scratch.length / 3
          const stride = numVerts * 3
          const refIdx = refFrames > 1 ? Math.max(0, Math.min(p.refPlaybackFrameIdx ?? p.frameIdx, refFrames - 1)) : 0
          if (refIdx !== this.lastUploaded) {
            const pos = this.geo.attributes.position as THREE.BufferAttribute
            const arr = pos.array as Float32Array
            const src = flat.subarray(refIdx * stride, refIdx * stride + stride)
            for (let i = 0; i < stride; i++) this.scratch[i] = src[i] * CM_TO_M
            arr.set(this.scratch, 0)
            pos.needsUpdate = true
            if (!(refFrames > 1 && p.animate)) {
              this.geo.computeVertexNormals()
              this.geo.computeBoundingSphere()
            }
            this.lastUploaded = refIdx
          }
        }
      }
      // Phase 3: parallel posing manipulator INSIDE the offset group.
      if (b !== null && p.editRefMode && p.refEditableJoints) {
        refManip.show(this.root)
        refManip.jointsFlat = p.refEditableJoints
        refManip.selectedJoint = p.selectedJoint ?? null
        refManip.selectedChain = p.selectedChain ?? null
        refManip.onSelectJoint = p.onSelectJoint
        refManip.onSelectChain = p.onSelectChain
        refManip.onJointMove = p.onRefJointMove ?? (() => {})
        refManip.gizmoMode = p.gizmoMode
        refManip.kinematicMode = p.kinematicMode ?? "fk"
        refManip.updateJoints()
        refManip.positionGizmo()
      } else {
        refManip.show(null)
      }
      refManip.syncGizmo()
    },
    disposeMesh(): void {
      this.mesh?.removeFromParent()
      this.geo?.dispose()
      this.mat?.dispose()
      this.mesh = null
      this.geo = null
      this.mat = null
    },
  }

  // ══ The update() — coarse diffs per subsystem ═══════════════════════
  let lastCameraView = ""
  let lastFraming = "" as string
  let lastLiftY = NaN
  let lastOrbSel: string | null = null
  let orbsSig = ""
  let lastEEsSig = ""
  let lastR2dSig = ""
  let lastAltSig = ""
  let darkCur = opts.darkMode

  function update(p: PoseStageProps): void {
    // playback mirrors
    frameIdxRef.current = p.frameIdx
    anim.animate = p.animate
    anim.enabled = !p.showBindPose && !p.editMode
    anim.frameCount = p.frameCount
    anim.fps = p.fps
    anim.speed = p.playbackSpeed
    anim.setFrameIdx = p.setFrameIdx
    // Reset the clock on play-start OR a new generation arriving while
    // playing (the old effect keyed [animate, frameCount]).
    if (p.animate && (!skinLastAnimate || anim.frameCount !== animLastFrameCount)) anim.reset()
    animLastFrameCount = p.frameCount
    showBindPose0 = p.showBindPose
    anim0 = p.animate

    // skin carrier
    skin.setMesh(p)
    skin.setData(p.deformedFlat)
    // structural upload: bind-pose toggle / data swap / animate pause —
    // the animate-false transition recomputes normals on the held frame.
    const structural =
      skin.lastUploadedIdx === -2 ||
      p.showBindPose !== showBindPosePrev ||
      p.animate === false && skinLastAnimate === true
    if (structural) {
      skin.uploadFrame(frameIdxRef.current, p.showBindPose, p.animate)
    }
    skinLastAnimate = p.animate
    showBindPosePrev = p.showBindPose

    // lift group (mesh lift + in-place anchor)
    const liftY = computeMeshLiftY(p.meshData)
    let inPlaceX = 0, inPlaceZ = 0
    if (p.inPlace && !p.showBindPose && p.soma77JointsFlat) {
      const stride = 77 * 3
      const frameCount = Math.floor(p.soma77JointsFlat.length / stride)
      if (frameCount >= 1) {
        const r0x = p.soma77JointsFlat[0]
        const r0z = p.soma77JointsFlat[2]
        const fi = Math.max(0, Math.min(p.frameIdx, frameCount - 1))
        const base = fi * stride
        inPlaceX = (r0x - p.soma77JointsFlat[base]) * CM_TO_M
        inPlaceZ = (r0z - p.soma77JointsFlat[base + 2]) * CM_TO_M
      }
    }
    if (liftY !== lastLiftY || liftGroup.position.x !== inPlaceX || liftGroup.position.z !== inPlaceZ) {
      liftGroup.position.set(inPlaceX, liftY, inPlaceZ)
      lastLiftY = liftY
    }

    // lights: orbs wash out the default rig
    const hasOrbs = p.lightingOrbs.length > 0
    ambient.intensity = hasOrbs ? 0.06 : (p.editMode ? 0.25 : 0.45)
    key.intensity = hasOrbs ? 0.0 : 1.0
    key.castShadow = !hasOrbs
    fill.intensity = hasOrbs ? 0.0 : 0.25
    hemi.intensity = hasOrbs ? 0.08 : 0.35
    groundMat.opacity = hasOrbs ? 0.0 : 0.55
    const orbsSigNew = p.lightingOrbs.map(o => `${o.id}:${o.position.join(",")}:${o.color}:${o.intensity}:${o.distance}:${o.castShadow}`).join(";")
    if (orbsSigNew !== orbsSig || p.selectedOrb !== lastOrbSel) {
      orbsSig = orbsSigNew
      lastOrbSel = p.selectedOrb
      orbs.onChange = p.onLightingOrbsChange
      orbs.onSelectOrb = p.onSelectOrb
      orbs.update(p.lightingOrbs, p.selectedOrb)
    }

    // skeleton (display-only; kept-pose aware)
    skeleton.update(
      p.showSkeleton && !p.editMode ? (p.editableJoints ?? p.soma77JointsFlat) : null,
      p.frameIdx,
    )

    // manipulator (primary edit mode; suppressed while editing the reference)
    const manipOn = p.editMode && !p.editRefMode && !!p.editableJoints
    if (manipOn) {
      manip.ensure(liftGroup)
      manip.active = true
      manip.jointsFlat = p.editableJoints
      manip.selectedJoint = p.selectedJoint
      manip.selectedChain = p.selectedChain ?? null
      manip.onSelectJoint = p.onSelectJoint
      manip.onSelectChain = p.onSelectChain
      manip.onJointMove = p.onJointMove
      manip.gizmoMode = p.gizmoMode
      manip.kinematicMode = p.kinematicMode ?? "fk"
      manip.root!.visible = true
      manip.updateJoints()
      manip.positionGizmo()
    } else {
      manip.active = false
      if (manip.root !== null) manip.root.visible = false
    }
    manip.syncGizmo()

    // overlays
    ghost.update(p.ghostJoints)
    contacts.update(p.footContacts, p.frameIdx, p.soma77JointsFlat)
    if (p.soma77JointsFlat !== arrowJointsRef) {
      arrowJointsRef = p.soma77JointsFlat
      arrow.update(p.soma77JointsFlat)
    }
    arrow.setVisible(p.showStartingDirection && !p.editMode)
    const altSig = p.altSamples.map(s => s.idx).join(",") + "#" + p.meshData.vertices.length
    if (altSig !== lastAltSig) {
      lastAltSig = altSig
      alts.update(p.altSamples, p.meshData, p.onCommitSample)
    } else if (p.altSamples.length > 0) {
      alts.onCommit = p.onCommitSample
    }

    // constraints
    const eesSig = p.endEffectorPoints.map(e => `${e.id}:${e.position.join(",")}:${e.frame}`).join(";")
    const r2dSig = p.root2dPoints.map(r => `${r.frame}:${r.x},${r.z}`).join(";")
    if (eesSig !== lastEEsSig || r2dSig !== lastR2dSig || constraints.editMode !== p.editMode
        || constraints.selectedEEId !== (p.selectedEEId ?? null)
        || constraints.showLabels !== p.showConstraintLabels) {
      lastEEsSig = eesSig
      lastR2dSig = r2dSig
      constraints.onSelectEE = p.onSelectEE
      constraints.onChangeEEPoint = p.onChangeEEPoint
      constraints.update(p.root2dPoints, p.endEffectorPoints, p.showConstraintLabels, p.editMode, p.selectedEEId ?? null)
    }

    // EE placement plane
    eePlane.update(p.placingEE, p.eePlaceJointIdx, p.editableJoints, p.soma77JointsFlat, p.frameIdx, p.onPlaceEE)

    // reference
    reference.update(p)

    // camera
    if (p.cameraView !== lastCameraView || p.framing !== lastFraming) {
      lastCameraView = p.cameraView
      lastFraming = p.framing
      applyCamera(p.cameraView, p.framing)
    }
  }
  let skinLastAnimate = false
  let showBindPosePrev = true
  let animLastFrameCount = 1

  const framedCameraPosFor = (view: string, framing: CameraFraming): [[number, number, number], number] =>
    framedCameraPos(view, framing)
  const applyCamera = (view: string, framing: CameraFraming): void => {
    // azimuth views ride framedCameraPos (az-* handled inside cameraPosFor)
    const [pos, ty] = framedCameraPosFor(view, framing)
    stage.camera.position.set(pos[0], pos[1], pos[2])
    stage.controls.target.set(0, ty, 0)
    stage.controls.update()
    stage.camera.lookAt(0, ty, 0)
  }

  return {
    threeCtx: { gl: stage.renderer, scene, camera: stage.camera },
    update,
    applyCamera,
    setDarkMode(dark: boolean): void {
      if (dark !== darkCur) {
        darkCur = dark
        stage.renderer.setClearColor(new THREE.Color(dark ? "#0e0e1a" : "#e4e4f0"))
      }
    },
    dispose(): void {
      manip.tc?.dispose()
      refManip.tc?.dispose()
      constraints.eeTC?.dispose()
      for (const e of orbs.entries) e.tc?.dispose()
      skin.geo?.dispose()
      skin.mat?.dispose()
      reference.disposeMesh()
      if (reference.skeleton !== null) {
        reference.skeleton.spheres.geometry.dispose()
        ;(reference.skeleton.spheres.material as THREE.Material).dispose()
        reference.skeleton.boneGeo.dispose()
        ;(reference.skeleton.lines.material as THREE.Material).dispose()
      }
      stage.dispose()
    },
  }
}
