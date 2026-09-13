// PoseEditMode — the pose-editing vocabulary: types, skeleton topology,
// and the CCD IK solver.
//
// THE PORT (2026-09-13): the r3f component trio (JointManipulator,
// LightingOrbs, KeyframeGhost + LiftAwareTransformControls) became the
// imperative subsystems of poseStage.ts — same drag math, same colors,
// same gizmo semantics, zero @react-three. This module keeps everything
// PURE: the studio imports the types; the stage imports the solvers.
// The old LiftAwareTransformControls negative-offset hack is obsolete in
// the raw substrate — the TransformControls gizmo is scene-rooted, so the
// lift group's translation can never double-apply to the handles.

export { SOMA77_BONE_CONNECTIONS } from "@melite/formats"
export type { LightingOrb, JointMoveEvent } from "./poseStage"
export { SOMA77_PARENT, getJointChain, getDescendants, solveCCD, CM_TO_M } from "./poseStage"

export interface Keyframe {
  id: string
  frame: number
  joints: Float32Array // 77 × 3
  label: string
}
