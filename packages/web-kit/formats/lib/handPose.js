/**
 * handPose — finger joint indices and helpers for SOMA-77 hand pose presets
 * (Kimodo-TO method #3: pose libraries for fingers).
 *
 * The SOMA-77 skeleton stores JOINT POSITIONS (not rotations), so a finger
 * preset is a snapshot of finger-joint positions. To make presets portable
 * across wrist positions, we store them as OFFSETS relative to the wrist
 * joint (LeftHand=14, RightHand=42). On apply, the offset is re-based to
 * the current wrist position.
 *
 * NOTE: This translation-only rebasing ignores wrist rotation. If the wrist
 * has rotated since the preset was captured, the fingers will point in the
 * original direction. For MVP this is acceptable — the user can either
 * recapture the preset at the new orientation, or fine-tune manually after
 * applying. A full rotation-aware version would derive the wrist frame from
 * the wrist→knuckle direction and re-orient offsets accordingly.
 *
 * Joint layout (vendor/kimodo/kimodo/skeleton/definitions.py SOMASkeleton77):
 *   LeftHand(14) [thumb 15-18, index 19-23, middle 24-28, ring 29-33, pinky 34-38]
 *   RightHand(42) [thumb 43-46, index 47-51, middle 52-56, ring 57-61, pinky 62-66]
 */
/** Wrist joint index per hand side. */
export const WRIST_INDEX = {
    left: 14,
    right: 42,
};
/** Finger joint indices per hand side (wrist NOT included — wrist is the
 *  anchor that offsets are relative to). */
export const FINGER_JOINTS = {
    left: [
        15, 16, 17, 18, // thumb (4 joints)
        19, 20, 21, 22, 23, // index (5)
        24, 25, 26, 27, 28, // middle (5)
        29, 30, 31, 32, 33, // ring (5)
        34, 35, 36, 37, 38, // pinky (5)
    ],
    right: [
        43, 44, 45, 46,
        47, 48, 49, 50, 51,
        52, 53, 54, 55, 56,
        57, 58, 59, 60, 61,
        62, 63, 64, 65, 66,
    ],
};
/**
 * Extract a hand pose from a flat 77×3 joint array as wrist-relative offsets.
 * The result is a sparse {jointIdx: [dx, dy, dz]} map (only finger joints).
 * The wrist position is subtracted so the preset is portable.
 */
export function captureHandPose(side, joints) {
    const wrist = WRIST_INDEX[side];
    const wx = joints[wrist * 3];
    const wy = joints[wrist * 3 + 1];
    const wz = joints[wrist * 3 + 2];
    const out = {};
    for (const idx of FINGER_JOINTS[side]) {
        out[idx] = [
            joints[idx * 3] - wx,
            joints[idx * 3 + 1] - wy,
            joints[idx * 3 + 2] - wz,
        ];
    }
    return out;
}
/**
 * Apply a captured hand pose to a flat 77×3 joint array. Each finger joint
 * is set to the current wrist position + the stored offset. Only finger
 * joints are touched — the rest of the pose (including the wrist) is left
 * intact. Returns a new Float32Array (does not mutate the input).
 */
export function applyHandPose(side, joints, offsets) {
    const out = joints instanceof Float32Array
        ? new Float32Array(joints)
        : new Float32Array(joints);
    const wrist = WRIST_INDEX[side];
    const wx = out[wrist * 3];
    const wy = out[wrist * 3 + 1];
    const wz = out[wrist * 3 + 2];
    for (const idx of FINGER_JOINTS[side]) {
        const off = offsets[idx];
        if (!off)
            continue;
        out[idx * 3] = wx + off[0];
        out[idx * 3 + 1] = wy + off[1];
        out[idx * 3 + 2] = wz + off[2];
    }
    return out;
}
/** Encode a hand-pose offset map as a plain number[] for the pose library.
 *  Stores the wrist-relative offsets inline at their joint indices in a 77×3
 *  array (zero elsewhere). Round-trips with decodeHandPose. */
export function encodeHandPose(side, offsets) {
    const arr = new Array(77 * 3).fill(0);
    for (const idx of FINGER_JOINTS[side]) {
        const off = offsets[idx];
        if (!off)
            continue;
        arr[idx * 3] = off[0];
        arr[idx * 3 + 1] = off[1];
        arr[idx * 3 + 2] = off[2];
    }
    return arr;
}
/** Decode a stored hand-pose number[] back into an offset map. */
export function decodeHandPose(arr) {
    const out = {};
    // The encoding stores offsets only at finger-joint indices; we don't need
    // to know the side to decode (the indices tell us). Scan all 77 joints.
    for (let idx = 0; idx < 77; idx++) {
        const x = arr[idx * 3];
        const y = arr[idx * 3 + 1];
        const z = arr[idx * 3 + 2];
        // Skip zeros (uninitialized slots). Note: this conflates genuinely-zero
        // offsets with empty slots, but a real finger offset is never exactly at
        // the wrist (would mean a zero-length bone), so this is safe in practice.
        if (x === 0 && y === 0 && z === 0)
            continue;
        out[idx] = [x, y, z];
    }
    return out;
}
//# sourceMappingURL=handPose.js.map