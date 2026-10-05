import * as THREE from "three";
/** Centimeters → meters. SOMA-X/ANNY joints arrive in cm; the Three.js scene
 *  is authored in meters. Applied at every display boundary. The drag handler
 *  converts gizmo.position back to cm so IK/FK math stays in the native cm
 *  space (matching jointsFlat and the backend deformSomaJoints API). */
export declare const CM_TO_M = 0.01;
/** child index → parent index. Root (0) has no parent (maps to -1). */
export declare const SOMA77_PARENT: number[];
/** Return the joint chain from `jointIdx` up to (and including) `chainRoot`,
 *  ordered root-first. Used by multi-joint selection and IK. */
export declare function getJointChain(jointIdx: number, chainRoot?: number): number[];
/** Return ALL descendant joint indices of `jointIdx`. Used by FK propagation. */
export declare function getDescendants(jointIdx: number): number[];
export declare function solveCCD(jointsFlat: Float32Array, chain: number[], target: THREE.Vector3, iterations?: number, tolerance?: number): Float32Array;
