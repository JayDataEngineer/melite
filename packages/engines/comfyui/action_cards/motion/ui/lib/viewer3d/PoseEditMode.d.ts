export { SOMA77_BONE_CONNECTIONS } from "@melite/formats";
export type { LightingOrb, JointMoveEvent } from "./poseStage.js";
export { SOMA77_PARENT, getJointChain, getDescendants, solveCCD, CM_TO_M } from "./poseStage.js";
export interface Keyframe {
    id: string;
    frame: number;
    joints: Float32Array;
    label: string;
}
