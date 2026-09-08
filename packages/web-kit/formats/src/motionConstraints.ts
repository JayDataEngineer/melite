// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// Motion constraint snapshot + serialization — the FUNCTIONAL CORE of the
// timeline bar. Each keyframe on the 6 lanes (Full-Body / 2D Root / L/R
// Hand / L/R Foot) carries a REAL pose constraint snapshotted from the
// current motion NPZ, in the exact format kimodo's constraint classes
// consume (SOMA-77 order, meters). serializeConstraints() produces the
// JSON payload that:
//   1. PERSISTS in stage.params.motion_constraints (survives reloads — the
//      flow UX "persist always" hard rule), AND
//   2. TRANSPORTS to melite-kimodo-nodes via the motion_constraints flow
//      param, where the node deserializes it into FullBodyConstraintSet /
//      EndEffectorConstraintSet / Root2DConstraintSet and feeds raw()'s
//      constraint_lst.
//
// This is what makes the bar DRIVE generation — parity with the Kimodo
// demo's session.constraints → compute_model_constraints_lst (demo/ui.py:994
// → generation.py:24-111). The demo builds constraint objects in-process;
// we serialize → transport → deserialize because the editor is remote from
// the kimodo library. The byte contract is identical: jp/jr are base64
// little-endian float32, SOMA-77 joint order, meters — the same arrays
// vendor/kimodo passes to FullBodyConstraintSet(model_skel, frame_idx,
// pos, rot, root2d).

import { encodeBufferToB64 } from "./poseCodec"
// SOMA-77 joint indices (somaskel77_standard_tpose.bvh declaration order).
// Verified against lib/motionNpz.ts SOMA_TO_COCO (LeftHand=14, RightHand=42,
// LeftFoot=69, RightFoot=74) + PoseEditMode.END_EFFECTOR_JOINTS +
// PoseViewer3D.tsx:502 (LeftFoot=69, RightFoot=74). Hips (root) is index 0.
export const SOMA_ROOT_IDX = 0
export const SOMA_JOINT = {
  LeftHand: 14,
  RightHand: 42,
  LeftFoot: 69,
  RightFoot: 74,
} as const

// Timeline lane UUID → kimodo end-effector joint name.
// Keys match MOTION_TIMELINE_TRACKS uuids (motionTimelineState.ts).
export const TRACK_TO_EE_JOINT: Record<string, EEJointName> = {
  "left-hand": "LeftHand",
  "right-hand": "RightHand",
  "left-foot": "LeftFoot",
  "right-foot": "RightFoot",
}

export type EEJointName = "LeftHand" | "RightHand" | "LeftFoot" | "RightFoot"

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
export type MotionConstraint =
  | { kind: "fullbody"; frame: number; jp: string; jr: string }
  | { kind: "ee"; frame: number; joint: EEJointName; jp: string; jr: string }
  | { kind: "root2d"; frame: number; x: number; z: number }

/** The transport + persistence shape (JSON in stage.params.motion_constraints).
 *
 *  - keyframes: the viser timeline dot metadata (uuid/track/frame) so the bar
 *    reconstructs on reload. Backend ignores this field.
 *  - fullbody / end_effectors / root2d: per-track constraint arrays, sorted
 *    ascending by frame. These are what melite-kimodo-nodes deserializes into
 *    FullBodyConstraintSet / EndEffectorConstraintSet / Root2DConstraintSet. */
export interface MotionConstraintsJSON {
  keyframes: { uuid: string; track_id: string; frame: number }[]
  fullbody?: { frame: number; jp: string; jr: string }[]
  end_effectors?: { frame: number; joint: EEJointName; jp: string; jr: string }[]
  root2d?: { frame: number; x: number; z: number }[]
}

export const MOTION_CONSTRAINTS_PARAM = "motion_constraints"
export const MOTION_PROMPTS_PARAM = "motion_prompts"

/** The runtime motion a snapshot reads from. Float32Array views into the NPZ
 *  (posedJoints: T*77*3 m, globalRotMats: T*77*9 row-major). */
export interface ConstraintSnapshotSource {
  posedJoints: Float32Array
  globalRotMats: Float32Array
  T: number
}

/** Encode a Float32Array to base64 (little-endian bytes). Round-trips with
 *  numpy: np.frombuffer(base64.b64decode(s), dtype='<f4'). */
export function encodeF32(arr: Float32Array): string {
  return encodeBufferToB64(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength))
}

/** Decode a base64 string into a Float32Array (little-endian). The inverse of
 *  encodeF32 — used to reconstruct an authored pose from a stamped keyframe's
 *  payload when re-entering edit mode at its frame. */
export function decodeF32(b64: string): Float32Array {
  const bin = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("binary")
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
}

function frameSlice(
  src: ConstraintSnapshotSource,
  frame: number,
): { jp: Float32Array; jr: Float32Array } {
  const T = Math.max(1, src.T)
  const f = Math.max(0, Math.min(T - 1, Math.floor(frame)))
  return {
    jp: src.posedJoints.subarray(f * 77 * 3, (f + 1) * 77 * 3),
    jr: src.globalRotMats.subarray(f * 77 * 9, (f + 1) * 77 * 9),
  }
}

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
export function stampEditedPose(
  editedJointsM: Float32Array,
  patchedGlobalRotMats: Float32Array,
  frameIdx: number,
  totalFrames: number,
): MotionConstraint {
  const f = Math.max(0, Math.min(Math.max(0, totalFrames - 1), Math.floor(frameIdx)))
  // Accept either a full T·77·9 array (patchFrame's raw output) or a single
  // 77·9 slice. The single-frame shape lets callers subarray before passing.
  const jrSlice = patchedGlobalRotMats.length >= 77 * 9 * 2
    ? patchedGlobalRotMats.subarray(f * 77 * 9, (f + 1) * 77 * 9)
    : patchedGlobalRotMats
  return { kind: "fullbody", frame: f, jp: encodeF32(editedJointsM), jr: encodeF32(jrSlice) }
}

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
export function snapshotConstraint(
  trackId: string,
  frame: number,
  src: ConstraintSnapshotSource,
): MotionConstraint | null {
  const f = Math.max(0, Math.floor(frame))
  if (trackId === "fullbody") {
    const { jp, jr } = frameSlice(src, f)
    return { kind: "fullbody", frame: f, jp: encodeF32(jp), jr: encodeF32(jr) }
  }
  if (trackId === "root2d") {
    const { jp } = frameSlice(src, f)
    const rx = SOMA_ROOT_IDX * 3
    // Root XZ — joint 0 (Hips), components x and z. Matches the demo's
    // smooth_root_pos_2d = root_pos[:, [0, 2]] (generation.py:61).
    return { kind: "root2d", frame: f, x: jp[rx], z: jp[rx + 2] }
  }
  const joint = TRACK_TO_EE_JOINT[trackId]
  if (joint) {
    const { jp, jr } = frameSlice(src, f)
    return { kind: "ee", frame: f, joint, jp: encodeF32(jp), jr: encodeF32(jr) }
  }
  return null
}

function sortByFrame<T extends { frame: number }>(xs: T[]): T[] {
  return xs.slice().sort((a, b) => a.frame - b.frame)
}

/** Gather the viser keyframe metadata + payloads into the transport JSON.
 *
 *  Keyframes whose uuid has no payload (orphan viser dots from the old
 *  null-shell era) are dropped from the backend arrays but kept in
 *  `keyframes` only if they carry a payload — so stale dots don't leak
 *  broken constraints to the node. Sorted ascending by frame per track. */
export function serializeConstraints(
  keyframes: { uuid: string; track_id: string; frame: number }[],
  payloads: Record<string, MotionConstraint>,
): MotionConstraintsJSON {
  // Only keyframes with a real payload survive into the transport.
  const live = keyframes.filter((k) => payloads[k.uuid])
  const out: MotionConstraintsJSON = { keyframes: live.map(({ uuid, track_id, frame }) => ({ uuid, track_id, frame })) }

  const all = live.map((k) => payloads[k.uuid])
  const fb = sortByFrame(
    all
      .filter((p): p is Extract<MotionConstraint, { kind: "fullbody" }> => p.kind === "fullbody")
      .map(({ frame, jp, jr }) => ({ frame, jp, jr })),
  )
  if (fb.length) out.fullbody = fb

  const ee = sortByFrame(
    all
      .filter((p): p is Extract<MotionConstraint, { kind: "ee" }> => p.kind === "ee")
      .map(({ frame, joint, jp, jr }) => ({ frame, joint, jp, jr })),
  )
  if (ee.length) out.end_effectors = ee

  const r2 = sortByFrame(
    all
      .filter((p): p is Extract<MotionConstraint, { kind: "root2d" }> => p.kind === "root2d")
      .map(({ frame, x, z }) => ({ frame, x, z })),
  )
  if (r2.length) out.root2d = r2

  return out
}

/** Reconstruct viser keyframes + payloads from a persisted/transported JSON.
 *
 *  Tolerant of missing/malformed fields (a corrupt or partially-migrated
 *  stage.params.motion_constraints degrades to null → the card starts fresh
 *  with empty constraints, never crashes on hydrate). Returns null if the
 *  shape is unrecognized. */
export function hydrateConstraints(raw: unknown): {
  keyframes: { uuid: string; track_id: string; frame: number; value: null; opacity: number; locked: boolean }[]
  payloads: Record<string, MotionConstraint>
} | null {
  if (!raw || typeof raw !== "object") return null
  const json = raw as MotionConstraintsJSON
  if (!Array.isArray(json.keyframes)) return null

  const payloads: Record<string, MotionConstraint> = {}
  const dots: {
    uuid: string
    track_id: string
    frame: number
    value: null
    opacity: number
    locked: boolean
  }[] = []

  // Rebuild payloads from the per-track arrays (the source of truth), then
  // cross-link viser dots by uuid. A dot whose uuid has no payload is
  // dropped (stale null-shell leftover).
  const byFrame = <T extends { frame: number }>(xs: T[] | undefined) => xs ?? []
  for (const e of byFrame(json.fullbody)) {
    const uuid = json.keyframes.find((k) => k.track_id === "fullbody" && k.frame === e.frame)?.uuid
    if (!uuid) continue
    payloads[uuid] = { kind: "fullbody", frame: e.frame, jp: e.jp, jr: e.jr }
  }
  for (const e of byFrame(json.end_effectors)) {
    const uuid = json.keyframes.find((k) => k.track_id && TRACK_TO_EE_JOINT[k.track_id] === e.joint && k.frame === e.frame)?.uuid
    if (!uuid) continue
    payloads[uuid] = { kind: "ee", frame: e.frame, joint: e.joint, jp: e.jp, jr: e.jr }
  }
  for (const e of byFrame(json.root2d)) {
    const uuid = json.keyframes.find((k) => k.track_id === "root2d" && k.frame === e.frame)?.uuid
    if (!uuid) continue
    payloads[uuid] = { kind: "root2d", frame: e.frame, x: e.x, z: e.z }
  }

  for (const k of json.keyframes) {
    if (!payloads[k.uuid]) continue
    dots.push({ uuid: k.uuid, track_id: k.track_id, frame: k.frame, value: null, opacity: 1, locked: false })
  }

  return { keyframes: dots, payloads }
}

/** Carve a NEW empty prompt card out of the timeline's prompt lane so the
 *  user can type a distinct motion description for that segment — the
 *  demo's PRIMARY authoring surface (multi-prompt composition, one clip
 *  stitched from a sequence of text "cards").
 *
 *  WHY THIS EXISTS: viser's built-in click-to-append path (Timeline.tsx)
 *  only fires when the click lands at or past the last prompt's end_frame.
 *  After MotionCardEditor seeds one prompt spanning ``[0, T-1]`` (the whole
 *  bar, edge-to-edge — the demo parity), there is NO frame ≥ last.end_frame
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
export function carveNewPromptCard(
  prompts: { uuid: string; text: string; start_frame: number; end_frame: number; color: [number, number, number] | null }[],
  totalFrames: number,
  newId: () => string = defaultNewId,
): { uuid: string; text: string; start_frame: number; end_frame: number; color: [number, number, number] | null }[] {
  type P = { uuid: string; text: string; start_frame: number; end_frame: number; color: [number, number, number] | null }
  const T = Math.max(1, Math.floor(totalFrames))
  if (prompts.length === 0) {
    return [{ uuid: newId(), text: "", start_frame: 0, end_frame: T - 1, color: null }]
  }
  const sorted = [...prompts].sort((a, b) => a.start_frame - b.start_frame)
  const last = sorted[sorted.length - 1]!
  const mid = Math.floor((last.start_frame + last.end_frame) / 2)
  // Too narrow to split (≤1 frame wide) — append a minimum card instead.
  // Keeps the "add always succeeds" contract; the serializer clamps the
  // duration to ≥1 frame so a 1-frame card is valid input to the model.
  if (mid <= last.start_frame || mid >= last.end_frame) {
    const newStart = last.end_frame + 1
    const appended: P = { uuid: newId(), text: "", start_frame: newStart, end_frame: newStart, color: null }
    return [...prompts, appended]
  }
  const left: P = { ...last, end_frame: mid }
  const right: P = { uuid: newId(), text: "", start_frame: mid, end_frame: last.end_frame, color: null }
  return prompts.flatMap((p) => (p.uuid === last.uuid ? [left, right] : [p]))
}

function defaultNewId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined
  if (c && "randomUUID" in c) return c.randomUUID()
  return "tl-" + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

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
export function serializeMotionPrompts(
  segments: { text: string; start_frame: number; end_frame: number }[],
  fps: number,
): string {
  const valid = segments
    .filter((s) => s && typeof s.text === "string" && s.text.trim() && Number.isFinite(s.start_frame) && Number.isFinite(s.end_frame))
    .slice()
    .sort((a, b) => a.start_frame - b.start_frame)
  // The node overrides single-prompt mode only at >=2 segments. Serialize
  // nothing below that threshold so the payload isn't misleading.
  if (valid.length < 2) return ""
  const safeFps = fps > 0 ? fps : 30
  const n = valid.length
  const out = valid.map((s, i) => {
    const frames = s.end_frame - s.start_frame + (i === n - 1 ? 1 : 0)
    return { text: s.text.trim(), duration_sec: Math.max(1, frames) / safeFps }
  })
  return JSON.stringify(out)
}

/** Reverse of serializeMotionPrompts: rebuild timeline prompt cards from the
 *  persisted `motion_prompts` JSON (an array of `{ text, duration_sec }`).
 *  Returns null if the payload is missing/corrupt/empty — the caller seeds a
 *  blank card in that case. Frame boundaries are reconstructed by accumulating
 *  durations from frame 0 — the exact boundaries may differ slightly from the
 *  original (the serialization rounds), but the TEXT and the segment COUNT are
 *  preserved, which is what matters for state sync across reopens. */
export function hydrateMotionPrompts(
  raw: unknown,
  fps: number,
  totalFrames: number,
): { text: string; start_frame: number; end_frame: number }[] | null {
  if (!raw || typeof raw !== "string") return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  let parsed: unknown
  try { parsed = JSON.parse(trimmed) } catch { return null }
  if (!Array.isArray(parsed) || parsed.length === 0) return null
  const safeFps = fps > 0 ? fps : 30
  const segments: { text: string; start_frame: number; end_frame: number }[] = []
  let cursor = 0
  for (let i = 0; i < parsed.length; i++) {
    const seg = parsed[i] as Record<string, unknown>
    if (!seg || typeof seg.text !== "string") return null
    const dur = typeof seg.duration_sec === "number" ? seg.duration_sec : 1
    const frames = Math.max(1, Math.round(dur * safeFps))
    const start = cursor
    // Non-last segments: [start, start+frames-1]. Last segment extends to
    // totalFrames-1 so the cards fill the full timeline.
    const isLast = i === parsed.length - 1
    const end = isLast ? Math.max(start + frames - 1, totalFrames - 1) : start + frames - 1
    segments.push({ text: seg.text, start_frame: start, end_frame: end })
    cursor = end + 1
  }
  return segments.length > 0 ? segments : null
}

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
export function untanglePrompts<T extends { start_frame: number; end_frame: number }>(
  segments: T[],
): T[] {
  if (segments.length < 2) return segments
  const sorted = [...segments].sort(
    (a, b) => a.start_frame - b.start_frame || a.end_frame - b.end_frame,
  )
  let cursor = -Infinity
  let changed = false
  const healed = new Map<number, T>() // original index → healed segment
  const indexByRef = new Map<T, number>()
  segments.forEach((s, i) => indexByRef.set(s, i))
  for (const p of sorted) {
    const dur = Math.max(1, p.end_frame - p.start_frame)
    const s = Math.max(cursor + 1, p.start_frame)
    const e = s + dur
    if (s !== p.start_frame || e !== p.end_frame) {
      changed = true
      healed.set(indexByRef.get(p)!, { ...p, start_frame: s, end_frame: e })
    }
    cursor = e
  }
  return changed ? segments.map((p, i) => healed.get(i) ?? p) : segments
}
