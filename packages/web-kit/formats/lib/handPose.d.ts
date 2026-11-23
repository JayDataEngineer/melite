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
export declare const WRIST_INDEX: Record<"left" | "right", number>;
/** Finger joint indices per hand side (wrist NOT included — wrist is the
 *  anchor that offsets are relative to). */
export declare const FINGER_JOINTS: Record<"left" | "right", number[]>;
/**
 * Extract a hand pose from a flat 77×3 joint array as wrist-relative offsets.
 * The result is a sparse {jointIdx: [dx, dy, dz]} map (only finger joints).
 * The wrist position is subtracted so the preset is portable.
 */
export declare function captureHandPose(side: "left" | "right", joints: Float32Array | number[]): Record<number, [number, number, number]>;
/**
 * Apply a captured hand pose to a flat 77×3 joint array. Each finger joint
 * is set to the current wrist position + the stored offset. Only finger
 * joints are touched — the rest of the pose (including the wrist) is left
 * intact. Returns a new Float32Array (does not mutate the input).
 */
export declare function applyHandPose(side: "left" | "right", joints: Float32Array | number[], offsets: Record<number, [number, number, number]>): Float32Array;
/** Encode a hand-pose offset map as a plain number[] for the pose library.
 *  Stores the wrist-relative offsets inline at their joint indices in a 77×3
 *  array (zero elsewhere). Round-trips with decodeHandPose. */
export declare function encodeHandPose(side: "left" | "right", offsets: Record<number, [number, number, number]>): number[];
/** Decode a stored hand-pose number[] back into an offset map. */
export declare function decodeHandPose(arr: number[]): Record<number, [number, number, number]>;
//# sourceMappingURL=handPose.d.ts.map