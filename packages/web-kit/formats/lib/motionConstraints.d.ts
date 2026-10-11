export declare const SOMA_ROOT_IDX = 0;
export declare const SOMA_JOINT: {
    readonly LeftHand: 14;
    readonly RightHand: 42;
    readonly LeftFoot: 69;
    readonly RightFoot: 74;
};
export declare const TRACK_TO_EE_JOINT: Record<string, EEJointName>;
export type EEJointName = "LeftHand" | "RightHand" | "LeftFoot" | "RightFoot";
/** A single keyframe's constraint payload.
 *
 *  jp/jr are base64-encoded little-endian float32 of the FULL 77-joint pose
 *  (jp: 77*3=231 floats=924 bytes; jr: 77*9=693 floats=2772 bytes). The full
 *  pose is stored even for end-effector lanes because kimodo's
 *  EndEffectorConstraintSet indexes into the FULL skeleton
 *  (constraints.py:351 — skeleton.bone_index[jname]) — passing a single
 *  joint's position would crash the index lookup. This mirrors the demo,
 *  which stores joints_pos/joints_rot (full pose) per keyframe
 *  (ui.py:2752-2755). */
export type MotionConstraint = {
    kind: "fullbody";
    frame: number;
    jp: string;
    jr: string;
} | {
    kind: "ee";
    frame: number;
    joint: EEJointName;
    jp: string;
    jr: string;
} | {
    kind: "root2d";
    frame: number;
    x: number;
    z: number;
};
/** The transport + persistence shape (JSON in stage.params.motion_constraints).
 *
 *  - keyframes: the viser timeline dot metadata (uuid/track/frame) so the bar
 *    reconstructs on reload. Backend ignores this field.
 *  - fullbody / end_effectors / root2d: per-track constraint arrays, sorted
 *    ascending by frame. These are what melite-kimodo-nodes deserializes into
 *    FullBodyConstraintSet / EndEffectorConstraintSet / Root2DConstraintSet. */
export interface MotionConstraintsJSON {
    keyframes: {
        uuid: string;
        track_id: string;
        frame: number;
    }[];
    fullbody?: {
        frame: number;
        jp: string;
        jr: string;
    }[];
    end_effectors?: {
        frame: number;
        joint: EEJointName;
        jp: string;
        jr: string;
    }[];
    root2d?: {
        frame: number;
        x: number;
        z: number;
    }[];
}
export declare const MOTION_CONSTRAINTS_PARAM = "motion_constraints";
export declare const MOTION_PROMPTS_PARAM = "motion_prompts";
/** The runtime motion a snapshot reads from. Float32Array views into the NPZ
 *  (posedJoints: T*77*3 m, globalRotMats: T*77*9 row-major). */
export interface ConstraintSnapshotSource {
    posedJoints: Float32Array;
    globalRotMats: Float32Array;
    T: number;
}
/** Encode a Float32Array to base64 (little-endian bytes). Round-trips with
 *  numpy: np.frombuffer(base64.b64decode(s), dtype='<f4'). */
export declare function encodeF32(arr: Float32Array): string;
/** Decode a base64 string into a Float32Array (little-endian). The inverse of
 *  encodeF32 — used to reconstruct an authored pose from a stamped keyframe's
 *  payload when re-entering edit mode at its frame. */
export declare function decodeF32(b64: string): Float32Array;
/** AUTHOR a fullbody constraint from a user-edited pose (the WRITE path).
 *
 *  This is the counterpart to snapshotConstraint: snapshotConstraint READS a
 *  pose from the motion NPZ; stampEditedPose WRITES a user-authored pose
 *  into a constraint payload. ``editedJointsM`` is the full 77-joint pose in
 *  meters (the output of the edit-mode gizmos — what the user dragged into
 *  being). ``patchedGlobalRotMats`` is the rotation field reconstructed by
 *  ``patchFrame`` (motionNpz.ts) so children follow the edit — pass either
 *  the full T·77·9 array (frameIdx selects the slice) or a single-frame
 *  77·9 slice (frameIdx 0 is used).
 *
 *  The returned payload is what a fullbody keyframe carries: when it reaches
 *  melite-kimodo-nodes, ``_build_user_constraints`` decodes jp/jr into a
 *  ``FullBodyConstraintSet`` that holds the AUTHORED pose at that frame,
 *  bending generation to match. This is the bar being WRITABLE — you drag a
 *  joint, the keyframe at that frame absorbs the new pose, Run feeds it as a
 *  constraint. Parity with the demo's edit-then-snap authoring flow
 *  (ui.py: ``update_pose_at_frame`` → constraint keyframes update). */
export declare function stampEditedPose(editedJointsM: Float32Array, patchedGlobalRotMats: Float32Array, frameIdx: number, totalFrames: number): MotionConstraint;
/** Snapshot a REAL pose constraint at `frame` for the given timeline lane.
 *
 *  Reads the motion's posed joints + global rotation matrices (the same
 *  arrays the viewer renders). THE FRAME CONTRACT (2026-08-14 fix):
 *  the returned payload's `frame` is the REQUESTED frame — the dot must
 *  land where the mouse was, and serialize/hydrate cross-link payload ↔
 *  keyframe by frame equality — while the POSE BYTES are sourced from the
 *  nearest available source frame (frameSlice clamps internally).
 *
 *  Why that split: pre-run the only source is the T=1 rest pose, but the
 *  bar already spans the authoring envelope (targetT frames). Clamping
 *  the stamped frame to src.T-1 forced EVERY dot to frame 0 ("always
 *  places the dots to the very left") even though the rest pose is the
 *  same at every frame — the bind pose pinned at the clicked frame is
 *  exactly the right constraint. Post-run src.T covers the clicked frame
 *  and the slice is exact.
 *
 *  The caller (the timeline bar) clamps clicks to its own envelope; a
 *  negative frame still floors to 0. The pose is ALWAYS sourced from a
 *  real frame — never a null shell (the prior ``value: null`` keyframes
 *  were the shell the user rejected).
 *  Returns null only for unrecognized track ids. */
export declare function snapshotConstraint(trackId: string, frame: number, src: ConstraintSnapshotSource): MotionConstraint | null;
/** Gather the viser keyframe metadata + payloads into the transport JSON.
 *
 *  Keyframes whose uuid has no payload (orphan viser dots from the old
 *  null-shell era) are dropped from the backend arrays but kept in
 *  `keyframes` only if they carry a payload — so stale dots don't leak
 *  broken constraints to the node. Sorted ascending by frame per track. */
export declare function serializeConstraints(keyframes: {
    uuid: string;
    track_id: string;
    frame: number;
}[], payloads: Record<string, MotionConstraint>): MotionConstraintsJSON;
/** Reconstruct viser keyframes + payloads from a persisted/transported JSON.
 *
 *  Tolerant of missing/malformed fields (a corrupt or partially-migrated
 *  stage.params.motion_constraints degrades to null → the card starts fresh
 *  with empty constraints, never crashes on hydrate). Returns null if the
 *  shape is unrecognized. */
export declare function hydrateConstraints(raw: unknown): {
    keyframes: {
        uuid: string;
        track_id: string;
        frame: number;
        value: null;
        opacity: number;
        locked: boolean;
    }[];
    payloads: Record<string, MotionConstraint>;
} | null;
/** Carve a NEW empty prompt card out of the timeline's prompt lane so the
 *  user can type a distinct motion description for that segment — the
 *  demo's PRIMARY authoring surface (multi-prompt composition, one clip
 *  stitched from a sequence of text "cards").
 *
 *  WHY THIS EXISTS: viser's built-in click-to-append path (Timeline.tsx)
 *  only fires when the click lands at or past the last prompt's end_frame.
 *  After MotionCardEditor seeds one prompt spanning ``[0, T-1]`` (the whole
 *  bar, edge-to-edge — the demo behavior), there is NO frame ≥ last.end_frame
 *  reachable inside the bar, so appending is impossible and the user "can
 *  only put in dots" (keyframe dots, on the constraint lanes). This helper
 *  is the explicit, always-reachable "add a card" affordance.
 *
 *  Strategy — split the LAST prompt (highest end_frame) at its midpoint into
 *  two contiguous segments; the RIGHT half becomes a new EMPTY card
 *  (``text: ""``) the user types into, the LEFT half keeps the original
 *  text. The lane stays edge-to-edge (no gaps) and the new card is
 *  immediately editable. When there are no prompts, seeds one empty card
 *  spanning ``[0, T-1]``. When the last prompt is too narrow to split
 *  (≤1 frame wide), appends a 1-frame card after it.
 *
 *  Pure: returns a NEW array, never mutates the input. ``newId`` is
 *  injectable for deterministic tests; defaults to a crypto-random UUID
 *  (same shape viser's makeTimelineId produces). */
export declare function carveNewPromptCard(prompts: {
    uuid: string;
    text: string;
    start_frame: number;
    end_frame: number;
    color: [number, number, number] | null;
}[], totalFrames: number, newId?: () => string): {
    uuid: string;
    text: string;
    start_frame: number;
    end_frame: number;
    color: [number, number, number] | null;
}[];
/** Serialize the timeline's PROMPT segments into the multi-prompt transport
 *  JSON that melite-kimodo-nodes consumes. This is the demo's PRIMARY authoring
 *  surface — each prompt segment is a motion "card" (a text description over
 *  a frame range), and the model composes a multi-segment motion that follows
 *  the sequence (kimodo_model.py _generate iterates the list with transition
 *  blending between segments).
 *
 *  Mirrors demo/ui.py:1646-1659: segments are sorted ascending by start_frame;
 *  per-segment duration in seconds follows the demo's convention (non-last
 *  segments use ``[start, end)`` = ``end - start`` frames; the LAST segment
 *  uses ``[start, end]`` inclusive = ``end - start + 1`` frames). Returns the
 *  empty string when fewer than 2 non-empty segments survive — the single
 *  ``prompt`` param handles the 0/1-segment case, and the node's override
 *  threshold is >=2 segments (so an empty payload here is the honest "no
 *  multi-prompt authoring yet" signal, not silent data loss). */
export declare function serializeMotionPrompts(segments: {
    text: string;
    start_frame: number;
    end_frame: number;
}[], fps: number): string;
/** Reverse of serializeMotionPrompts: rebuild timeline prompt cards from the
 *  persisted `motion_prompts` JSON (an array of `{ text, duration_sec }`).
 *  Returns null if the payload is missing/corrupt/empty — the caller seeds a
 *  blank card in that case. Frame boundaries are reconstructed by accumulating
 *  durations from frame 0 — the exact boundaries may differ slightly from the
 *  original (the serialization rounds), but the TEXT and the segment COUNT are
 *  preserved, which is what matters for state sync across reopens. */
export declare function hydrateMotionPrompts(raw: unknown, fps: number, totalFrames: number): {
    text: string;
    start_frame: number;
    end_frame: number;
}[] | null;
/** NO-OVERLAP INVARIANT (2026-08-15, "the prompt cards can overlap — they
 *  get tangled; they should automatically get untangled"): heal any set of
 *  segments into a strict sequence — card N+1 starts at least one frame
 *  after card N ends. Cards keep their ORDER (sorted by start) and their
 *  DURATION (an untangled card translates, never stretches); nothing is
 *  ever truncated — the tail may land past the envelope, which is the
 *  pull-the-tail rule's business, not this one. PURE + IDEMPOTENT and
 *  returns the SAME array when nothing overlaps (so a useEffect around it
 *  cannot loop). The bar clamps gestures so crossings never happen in the
 *  first place; this heals every other writer (the envelope rescale's
 *  rounding, legacy persisted state, future code). */
export declare function untanglePrompts<T extends {
    start_frame: number;
    end_frame: number;
}>(segments: T[]): T[];
//# sourceMappingURL=motionConstraints.d.ts.map