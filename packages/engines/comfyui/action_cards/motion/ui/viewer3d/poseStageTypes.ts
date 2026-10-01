import * as THREE from "three"
import type { StageLayers } from '@melite/card-base/client'

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
  /** THE BASE'S LAYER VOCABULARY (primitive ② close-out): the pose
   *  stage votes the SAME StageLayers every mesh stage votes —
   *  Pick'd to the lanes this stage seats (wireframe + skeleton;
   *  no weights lane here — the pose mesh is LBS-deformed from a
   *  vertex stream, not a GLTF skin, and an absent flag is off by
   *  the base's own law). */
  layers: Pick<StageLayers, "wireframe" | "skeleton">
  color: string
  fps: number
  soma77JointsFlat: Float32Array | null
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
