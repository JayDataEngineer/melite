import * as THREE from "three";
import { SOMA77_BONE_CONNECTIONS } from "@melite/formats";
/** Centimeters → meters. SOMA-X/ANNY joints arrive in cm; the Three.js scene
 *  is authored in meters. Applied at every display boundary. The drag handler
 *  converts gizmo.position back to cm so IK/FK math stays in the native cm
 *  space (matching jointsFlat and the backend deformSomaJoints API). */
export const CM_TO_M = 0.01;
// ── Skeleton topology helpers (from the old PoseEditMode, verbatim) ────────
/** child index → parent index. Root (0) has no parent (maps to -1). */
export const SOMA77_PARENT = (() => {
    const parent = new Array(77).fill(-1);
    for (const [p, c] of SOMA77_BONE_CONNECTIONS)
        parent[c] = p;
    return parent;
})();
/** Return the joint chain from `jointIdx` up to (and including) `chainRoot`,
 *  ordered root-first. Used by multi-joint selection and IK. */
export function getJointChain(jointIdx, chainRoot = 0) {
    const chain = [];
    let cur = jointIdx;
    let guard = 0;
    while (cur >= 0 && cur < 77 && guard++ < 77) {
        chain.unshift(cur);
        if (cur === chainRoot)
            break;
        cur = SOMA77_PARENT[cur];
    }
    return chain;
}
const SOMA77_CHILDREN = (() => {
    const children = Array.from({ length: 77 }, () => []);
    for (let i = 0; i < 77; i++) {
        const p = SOMA77_PARENT[i];
        if (p >= 0)
            children[p].push(i);
    }
    return children;
})();
/** Return ALL descendant joint indices of `jointIdx`. Used by FK propagation. */
export function getDescendants(jointIdx) {
    const result = [];
    const stack = [...SOMA77_CHILDREN[jointIdx]];
    while (stack.length > 0) {
        const cur = stack.pop();
        result.push(cur);
        stack.push(...SOMA77_CHILDREN[cur]);
    }
    return result;
}
// ── CCD IK solver (verbatim from the old PoseEditMode) ────────────────────
export function solveCCD(jointsFlat, chain, target, iterations = 8, tolerance = 0.005) {
    if (chain.length < 2)
        return jointsFlat;
    const out = new Float32Array(jointsFlat);
    const ee = chain[chain.length - 1];
    const eePos = new THREE.Vector3(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2]);
    if (eePos.distanceTo(target) < tolerance)
        return out;
    const chainDescendants = chain.map(j => getDescendants(j));
    const tmpJoint = new THREE.Vector3();
    const tmpEE = new THREE.Vector3();
    const curDir = new THREE.Vector3();
    const tgtDir = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const axis = new THREE.Vector3();
    const cp = new THREE.Vector3();
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = chain.length - 2; i >= 0; i--) {
            const j = chain[i];
            tmpJoint.set(out[j * 3], out[j * 3 + 1], out[j * 3 + 2]);
            tmpEE.set(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2]);
            curDir.subVectors(tmpEE, tmpJoint).normalize();
            tgtDir.subVectors(target, tmpJoint).normalize();
            const dot = THREE.MathUtils.clamp(curDir.dot(tgtDir), -1, 1);
            const angle = Math.acos(dot);
            axis.crossVectors(curDir, tgtDir);
            if (axis.lengthSq() < 1e-8 || angle < 1e-5)
                continue;
            axis.normalize();
            quat.setFromAxisAngle(axis, angle);
            for (const c of chainDescendants[i]) {
                cp.set(out[c * 3], out[c * 3 + 1], out[c * 3 + 2]);
                cp.sub(tmpJoint).applyQuaternion(quat).add(tmpJoint);
                out[c * 3] = cp.x;
                out[c * 3 + 1] = cp.y;
                out[c * 3 + 2] = cp.z;
            }
        }
        eePos.set(out[ee * 3], out[ee * 3 + 1], out[ee * 3 + 2]);
        if (eePos.distanceTo(target) < tolerance)
            break;
    }
    return out;
}
//# sourceMappingURL=poseStageSkeleton.js.map
