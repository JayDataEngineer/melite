// Proves the motion timeline's constraint core: every keyframe carries a
// REAL pose snapshot (not a null shell), the bytes round-trip into numpy's
// '<f4', serialization groups/sorts/drops orphans, and hydration survives a
// reload. These are the invariants that make the bar FUNCTIONAL — if any
// breaks, the keyframes either lose their pose data (reverting to the shell
// the user rejected) or fail to reach melite-kimodo-nodes' constraint_lst.
import { describe, it, expect } from "vitest"
import {
  snapshotConstraint, serializeConstraints, hydrateConstraints,
  stampEditedPose, encodeF32,
  serializeMotionPrompts, carveNewPromptCard, untanglePrompts,
  SOMA_ROOT_IDX, SOMA_JOINT, MOTION_CONSTRAINTS_PARAM, MOTION_PROMPTS_PARAM,
  type ConstraintSnapshotSource, type MotionConstraint,
} from "@melite/formats/motionConstraints"

// Sync base64 → Float32Array (test-only; the app encodes, the backend
// decodes via numpy — this proves the bytes are valid '<f4').
function decodeF32(b64: string): Float32Array {
  const bin = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("binary")
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
}

// Build a synthetic T-frame motion where joint j at frame f has position
// (f, j, j*0.5) and rotation f9(f, j). Distinct per-frame/per-joint values
// so a wrong slice is immediately visible.
function makeSrc(T: number): ConstraintSnapshotSource {
  const posedJoints = new Float32Array(T * 77 * 3)
  const globalRotMats = new Float32Array(T * 77 * 9)
  for (let f = 0; f < T; f++) {
    for (let j = 0; j < 77; j++) {
      const pi = (f * 77 + j) * 3
      posedJoints[pi] = f
      posedJoints[pi + 1] = j
      posedJoints[pi + 2] = j * 0.5
      const ri = (f * 77 + j) * 9
      for (let k = 0; k < 9; k++) globalRotMats[ri + k] = f * 100 + j * 10 + k
    }
  }
  return { posedJoints, globalRotMats, T }
}

describe("snapshotConstraint — real pose bytes", () => {
  it("fullbody: jp/jr decode to the exact frame slice (SOMA-77, meters, '<f4')", () => {
    const src = makeSrc(20)
    const c = snapshotConstraint("fullbody", 7, src)! as Extract<MotionConstraint, { kind: "fullbody" }>
    expect(c.kind).toBe("fullbody")
    expect(c.frame).toBe(7)
    const jp = decodeF32(c.jp)
    const jr = decodeF32(c.jr)
    expect(jp.length).toBe(77 * 3)
    expect(jr.length).toBe(77 * 9)
    // joint 3 at frame 7: pos = (7, 3, 1.5)
    expect(jp[3 * 3]).toBeCloseTo(7)
    expect(jp[3 * 3 + 1]).toBeCloseTo(3)
    expect(jp[3 * 3 + 2]).toBeCloseTo(1.5)
    // joint 3 rotation[0] at frame 7 = 7*100 + 3*10 + 0 = 730
    expect(jr[3 * 9]).toBeCloseTo(730)
  })

  it("stamps the REQUESTED frame; pose bytes come from the nearest available frame", () => {
    const src = makeSrc(10)
    const c = snapshotConstraint("fullbody", 999, src)! as Extract<MotionConstraint, { kind: "fullbody" }>
    // 2026-08-14 contract: the dot lands where the mouse was — the frame
    // is stamped AS REQUESTED (the bar clamps clicks to its envelope);
    // the POSE still comes from a real frame (last available here).
    expect(c.frame).toBe(999)
    const jp = decodeF32(c.jp)
    expect(jp[0]).toBeCloseTo(9) // frame-9 pose, not a null shell
  })

  it("pre-run rest pose (T=1): a dot placed at frame 40 carries frame 40 + the bind pose", () => {
    // THE USER BUG (2026-08-14): double-clicking a lane pre-run always put
    // the dot at frame 0 ("very left") because the frame was clamped to
    // src.T-1 = 0. The rest pose is identical at every frame, so stamping
    // the clicked frame with the frame-0 pose is exactly right.
    const src = makeSrc(1)
    const c = snapshotConstraint("left-hand", 40, src)! as Extract<MotionConstraint, { kind: "ee" }>
    expect(c.frame).toBe(40)
    expect(c.joint).toBe("LeftHand")
    const jp = decodeF32(c.jp)
    expect(jp.length).toBe(77 * 3)
    expect(jp[0]).toBeCloseTo(0) // frame-0 (bind) pose bytes
  })

  it("clamps negative frames to 0", () => {
    const src = makeSrc(10)
    const c = snapshotConstraint("fullbody", -5, src)!
    expect(c.frame).toBe(0)
  })

  it("root2d: x/z are joint 0 (Hips) components 0 and 2 at that frame", () => {
    const src = makeSrc(20)
    const c = snapshotConstraint("root2d", 4, src)! as Extract<MotionConstraint, { kind: "root2d" }>
    expect(c.kind).toBe("root2d")
    expect(c.frame).toBe(4)
    // joint 0 at frame 4: pos = (4, 0, 0) → x=4, z=0
    expect(c.x).toBeCloseTo(4)
    expect(c.z).toBeCloseTo(0)
    // confirm it's joint 0, not some other root: joint 5 at frame 4 would be (4,5,2.5)
    expect(c.x).not.toBeCloseTo(SOMA_ROOT_IDX + 5)
  })

  it.each([
    ["left-hand", "LeftHand", SOMA_JOINT.LeftHand],
    ["right-hand", "RightHand", SOMA_JOINT.RightHand],
    ["left-foot", "LeftFoot", SOMA_JOINT.LeftFoot],
    ["right-foot", "RightFoot", SOMA_JOINT.RightFoot],
  ] as const)("EE lane %s → joint %s (index %i), full 77-joint pose carried", (track, jointName, jidx) => {
    const src = makeSrc(15)
    const c = snapshotConstraint(track, 6, src)! as Extract<MotionConstraint, { kind: "ee" }>
    expect(c.kind).toBe("ee")
    expect(c.joint).toBe(jointName)
    expect(c.frame).toBe(6)
    const jp = decodeF32(c.jp)
    // The EE class indexes the FULL skeleton — verify the snapshotted joint's
    // position is present at its SOMA index (the slice is full-pose, not 1-joint).
    expect(jp.length).toBe(77 * 3)
    expect(jp[jidx * 3]).toBeCloseTo(6) // frame
    expect(jp[jidx * 3 + 1]).toBeCloseTo(jidx) // joint
  })

  it("returns null for an unrecognized track id", () => {
    const src = makeSrc(5)
    expect(snapshotConstraint("nope", 2, src)).toBeNull()
  })

  it("T=1 motion (rest pose): the stamped frame is the clicked frame (was: clamped to 0 — the very-left-dot bug)", () => {
    const src = makeSrc(1)
    const c = snapshotConstraint("fullbody", 50, src)! as Extract<MotionConstraint, { kind: "fullbody" }>
    // 2026-08-14: the dot lands where the mouse was; the pose is still the
    // (only) frame-0 rest-pose slice — see frameSlice's internal clamp.
    expect(c.frame).toBe(50)
    const jp = decodeF32(c.jp)
    expect(jp[0]).toBeCloseTo(0)
  })
})

describe("encodeF32 — numpy '<f4' byte contract", () => {
  it("round-trips a known Float32Array", () => {
    const orig = Float32Array.of(1.5, -2.25, 3.0, 0, 77.77)
    const b64 = encodeF32(orig)
    const back = decodeF32(b64)
    expect(back.length).toBe(5)
    // Float32 can't exactly represent 77.77 — compare with tolerance, not toEqual.
    expect(back[0]).toBeCloseTo(1.5, 6)
    expect(back[1]).toBeCloseTo(-2.25, 6)
    expect(back[2]).toBeCloseTo(3.0, 6)
    expect(back[3]).toBeCloseTo(0, 6)
    expect(back[4]).toBeCloseTo(77.77, 3)
  })
})

describe("stampEditedPose — the WRITE path (author a pose into a constraint)", () => {
  it("produces a fullbody payload carrying the AUTHORED joint positions (not a snapshot)", () => {
    // User drags joint 14 (LeftHand) to a specific authored location.
    const authored = new Float32Array(77 * 3)
    for (let j = 0; j < 77; j++) authored[j * 3] = j // distinct per joint
    authored[14 * 3] = 1.23      // authored LeftHand x
    authored[14 * 3 + 1] = 4.56  // authored LeftHand y
    authored[14 * 3 + 2] = 7.89  // authored LeftHand z
    // patchFrame-reconstructed rotations for the frame (77 joints × 9).
    const patchedRots = new Float32Array(77 * 9)
    for (let i = 0; i < 77 * 9; i++) patchedRots[i] = i * 0.01
    const payload = stampEditedPose(authored, patchedRots, 5, 20) as Extract<MotionConstraint, { kind: "fullbody" }>
    expect(payload.kind).toBe("fullbody")
    expect(payload.frame).toBe(5)
    const jp = decodeF32(payload.jp)
    expect(jp.length).toBe(77 * 3)
    // The authored LeftHand position IS the constraint — not a snapshot read.
    expect(jp[14 * 3]).toBeCloseTo(1.23, 5)
    expect(jp[14 * 3 + 1]).toBeCloseTo(4.56, 5)
    expect(jp[14 * 3 + 2]).toBeCloseTo(7.89, 5)
    // Other joints carried too (the full pose, not just the dragged joint).
    expect(jp[0]).toBeCloseTo(0, 5)
    expect(jp[20 * 3]).toBeCloseTo(20, 5)
    // The reconstructed rotations ride along.
    const jr = decodeF32(payload.jr)
    expect(jr.length).toBe(77 * 9)
    expect(jr[0]).toBeCloseTo(0, 5)
    expect(jr[5]).toBeCloseTo(0.05, 5)
  })

  it("accepts a full T·77·9 rotation array (frameIdx selects the slice)", () => {
    const authored = new Float32Array(77 * 3)
    const fullRots = new Float32Array(10 * 77 * 9)
    // Mark frame 3's rotations distinctly so we prove the right slice is picked.
    for (let i = 0; i < 77 * 9; i++) fullRots[3 * 77 * 9 + i] = 9.9
    const payload = stampEditedPose(authored, fullRots, 3, 10) as Extract<MotionConstraint, { kind: "fullbody" }>
    const jr = decodeF32(payload.jr)
    expect(jr[0]).toBeCloseTo(9.9, 4)
    expect(jr[77 * 9 - 1]).toBeCloseTo(9.9, 4)
  })

  it("clamps frameIdx into [0, T-1] (stamps never go off-screen)", () => {
    const authored = new Float32Array(77 * 3)
    const rots = new Float32Array(77 * 9)
    expect(stampEditedPose(authored, rots, 999, 10).frame).toBe(9)
    expect(stampEditedPose(authored, rots, -5, 10).frame).toBe(0)
  })

  it("differs from snapshotConstraint — WRITE carries the authored pose, not the NPZ frame", () => {
    // Same frame, same source — but snapshot reads the NPZ, stamp writes authored.
    const src = makeSrc(20)
    const snap = snapshotConstraint("fullbody", 7, src)! as Extract<MotionConstraint, { kind: "fullbody" }>
    // Authored pose deliberately disagrees with frame 7 of the NPZ.
    const authored = new Float32Array(77 * 3).fill(99.9)
    const rots = new Float32Array(77 * 9)
    const stamped = stampEditedPose(authored, rots, 7, 20) as Extract<MotionConstraint, { kind: "fullbody" }>
    const snapJp = decodeF32(snap.jp)
    const stampJp = decodeF32(stamped.jp)
    // Snapshot frame 7 joint 0 = 7 (from makeSrc); authored = 99.9.
    expect(snapJp[0]).toBeCloseTo(7, 5)
    expect(stampJp[0]).toBeCloseTo(99.9, 4)
    expect(stampJp[0]).not.toBeCloseTo(snapJp[0], 2)
  })
})

describe("serializeConstraints — transport shape", () => {
  it("groups by track, sorts ascending by frame, keeps viser metadata", () => {
    const src = makeSrc(30)
    const a = snapshotConstraint("fullbody", 10, src)!
    const b = snapshotConstraint("fullbody", 2, src)!
    const c = snapshotConstraint("left-hand", 5, src)!
    const d = snapshotConstraint("root2d", 8, src)!
    const payloads = { ua: a, ub: b, uc: c, ud: d }
    const keyframes = [
      { uuid: "ua", track_id: "fullbody", frame: 10 },
      { uuid: "ub", track_id: "fullbody", frame: 2 },
      { uuid: "uc", track_id: "left-hand", frame: 5 },
      { uuid: "ud", track_id: "root2d", frame: 8 },
    ]
    const json = serializeConstraints(keyframes, payloads)
    expect(json.keyframes).toHaveLength(4)
    // fullbody sorted ascending: frame 2 then 10
    expect(json.fullbody!.map((e) => e.frame)).toEqual([2, 10])
    expect(json.end_effectors!.map((e) => ({ f: e.frame, j: e.joint }))).toEqual([{ f: 5, j: "LeftHand" }])
    expect(json.root2d!.map((e) => ({ f: e.frame, x: e.x, z: e.z }))).toEqual([{ f: 8, x: 8, z: 0 }])
  })

  it("DROPS orphan viser dots (uuid with no payload) from backend arrays", () => {
    const src = makeSrc(10)
    const payloads = { real: snapshotConstraint("fullbody", 3, src)! }
    const keyframes = [
      { uuid: "real", track_id: "fullbody", frame: 3 },
      { uuid: "ghost", track_id: "fullbody", frame: 7 }, // no payload
    ]
    const json = serializeConstraints(keyframes, payloads)
    expect(json.keyframes).toHaveLength(1)
    expect(json.keyframes[0].uuid).toBe("real")
    expect(json.fullbody).toHaveLength(1)
    expect(json.fullbody![0].frame).toBe(3)
  })

  it("empty keyframes → no backend arrays (not undefined crashes)", () => {
    const json = serializeConstraints([], {})
    expect(json.keyframes).toEqual([])
    expect(json.fullbody).toBeUndefined()
    expect(json.end_effectors).toBeUndefined()
    expect(json.root2d).toBeUndefined()
  })
})

describe("hydrateConstraints — reload survival", () => {
  it("round-trips serialize → hydrate → serialize (idempotent)", () => {
    const src = makeSrc(40)
    const payloads = {
      a: snapshotConstraint("fullbody", 12, src)!,
      b: snapshotConstraint("right-foot", 20, src)!,
      c: snapshotConstraint("root2d", 5, src)!,
    }
    const keyframes = [
      { uuid: "a", track_id: "fullbody", frame: 12 },
      { uuid: "b", track_id: "right-foot", frame: 20 },
      { uuid: "c", track_id: "root2d", frame: 5 },
    ]
    const json = serializeConstraints(keyframes, payloads)
    const hydrated = hydrateConstraints(json)!
    expect(hydrated.keyframes).toHaveLength(3)
    expect(hydrated.payloads.a).toEqual(payloads.a)
    expect(hydrated.payloads.b).toEqual(payloads.b)
    expect(hydrated.payloads.c).toEqual(payloads.c)
    // viser dot shape
    expect(hydrated.keyframes[0]).toMatchObject({ value: null, opacity: 1, locked: false })
  })

  it("returns null for a corrupt/missing param (no crash)", () => {
    expect(hydrateConstraints(null)).toBeNull()
    expect(hydrateConstraints(undefined)).toBeNull()
    expect(hydrateConstraints("not an object")).toBeNull()
    expect(hydrateConstraints({})).toBeNull() // no keyframes array
    expect(hydrateConstraints({ keyframes: "nope" })).toBeNull()
  })
})

describe("MOTION_CONSTRAINTS_PARAM", () => {
  it("is the stable stage.params key the backend will accept", () => {
    expect(MOTION_CONSTRAINTS_PARAM).toBe("motion_constraints")
  })
})

describe("serializeMotionPrompts — the multi-prompt timeline (demo parity)", () => {
  it("serializes >=2 segments to the JSON list the node consumes (text + duration_sec)", () => {
    const segs = [
      { text: "walk forward", start_frame: 0, end_frame: 60 },
      { text: "turn around", start_frame: 60, end_frame: 90 },
      { text: "wave", start_frame: 90, end_frame: 120 },
    ]
    const raw = serializeMotionPrompts(segs, 30)
    const parsed = JSON.parse(raw)
    expect(parsed).toHaveLength(3)
    expect(parsed[0].text).toBe("walk forward")
    expect(parsed[2].text).toBe("wave")
  })

  it("applies the demo duration convention: [start,end) for non-last, [start,end] for last", () => {
    // 30fps. Segment 0: frames 0-60 → 60 frames → 2.0s. Segment 1 (last):
    // frames 60-90 → 90-60+1 = 31 frames → 31/30 s.
    const segs = [
      { text: "walk", start_frame: 0, end_frame: 60 },
      { text: "wave", start_frame: 60, end_frame: 90 },
    ]
    const parsed = JSON.parse(serializeMotionPrompts(segs, 30))
    expect(parsed[0].duration_sec).toBeCloseTo(60 / 30, 5)   // 2.0
    expect(parsed[1].duration_sec).toBeCloseTo(31 / 30, 5)   // last is inclusive
  })

  it("sorts segments ascending by start_frame (authoring order, not insertion order)", () => {
    const segs = [
      { text: "third", start_frame: 200, end_frame: 240 },
      { text: "first", start_frame: 0, end_frame: 100 },
      { text: "second", start_frame: 100, end_frame: 200 },
    ]
    const parsed = JSON.parse(serializeMotionPrompts(segs, 30))
    expect(parsed.map((p: { text: string }) => p.text)).toEqual(["first", "second", "third"])
  })

  it("returns '' below the 2-segment override threshold (single prompt param covers it)", () => {
    expect(serializeMotionPrompts([], 30)).toBe("")
    expect(serializeMotionPrompts([{ text: "only", start_frame: 0, end_frame: 30 }], 30)).toBe("")
  })

  it("drops empty-text segments and clamps duration to >=1 frame", () => {
    const segs = [
      { text: "walk", start_frame: 0, end_frame: 60 },
      { text: "   ", start_frame: 60, end_frame: 90 },  // blank → dropped
      { text: "jump", start_frame: 90, end_frame: 90 }, // 0-frame non-last → clamped to 1
    ]
    const parsed = JSON.parse(serializeMotionPrompts(segs, 30))
    expect(parsed).toHaveLength(2)
    expect(parsed[1].duration_sec).toBeCloseTo(1 / 30, 5) // clamped, not 0
  })

  it("MOTION_PROMPTS_PARAM is the stable stage.params key", () => {
    expect(MOTION_PROMPTS_PARAM).toBe("motion_prompts")
  })
})

// Deterministic id generator for carveNewPromptCard tests (pure function =
// pure test — no crypto randomness in the assertions).
let _idCounter = 0
function deterministicId(): string {
  return `id-${++_idCounter}`
}

describe("carveNewPromptCard — the ADD-CARD affordance (the bug fix)", () => {
  // THE BUG THIS LOCKS DOWN: MotionCardEditor seeds ONE prompt spanning
  // [0, T-1] (the whole bar, demo parity). viser's click-to-append path
  // (Timeline.tsx) fires only at frames >= lastPrompt.end_frame — i.e. NEVER
  // inside a full-span bar. So without an explicit affordance the user
  // "can only put in dots" (keyframe dots on constraint lanes) and CANNOT
  // add motion prompt cards. carveNewPromptCard is that affordance.

  it("seeds one empty full-span card when the lane is empty (the no-motion-yet case)", () => {
    _idCounter = 0
    const out = carveNewPromptCard([], 150, deterministicId)
    expect(out).toHaveLength(1)
    expect(out[0]!.text).toBe("")
    expect(out[0]!.start_frame).toBe(0)
    expect(out[0]!.end_frame).toBe(149) // T-1, edge-to-edge
    expect(out[0]!.uuid).toBe("id-1")
    expect(out[0]!.color).toBeNull()
  })

  it("splits the last (full-span) prompt at its midpoint → TWO contiguous cards", () => {
    _idCounter = 0
    // The exact post-seed state: one card spanning [0, 149].
    const seeded: Parameters<typeof carveNewPromptCard>[0] = [{ uuid: "seed", text: "walk forward", start_frame: 0, end_frame: 149, color: null }]
    const out = carveNewPromptCard(seeded, 150, deterministicId)
    expect(out).toHaveLength(2)
    // Left half keeps the original text + spans [0, mid).
    expect(out[0]!.uuid).toBe("seed")
    expect(out[0]!.text).toBe("walk forward")
    expect(out[0]!.start_frame).toBe(0)
    expect(out[0]!.end_frame).toBe(74) // floor((0+149)/2)
    // Right half is the NEW empty card the user types into — [mid, 149].
    expect(out[1]!.uuid).toBe("id-1")
    expect(out[1]!.text).toBe("")
    expect(out[1]!.start_frame).toBe(74)
    expect(out[1]!.end_frame).toBe(149)
    // Contiguous — no gap, no overlap.
    expect(out[0]!.end_frame).toBe(out[1]!.start_frame)
    // Edge-to-edge preserved (demo parity).
    expect(out[0]!.start_frame).toBe(0)
    expect(out[1]!.end_frame).toBe(149)
  })

  it("repeatedly adding cards grows the lane (3 cards → serialize ≥2 → multi-prompt fires)", () => {
    _idCounter = 0
    const T = 150
    let prompts = carveNewPromptCard([], T, deterministicId) // seed
    prompts = carveNewPromptCard(prompts, T, deterministicId) // +1
    prompts = carveNewPromptCard(prompts, T, deterministicId) // +1
    expect(prompts).toHaveLength(3)
    // After 2 adds the lane has 3 cards → serializeMotionPrompts returns a
    // non-empty JSON list (the node's >=2-segment override threshold fires).
    const json = serializeMotionPrompts(
      prompts.map((p) => ({ text: p.text || "card", start_frame: p.start_frame, end_frame: p.end_frame })),
      30,
    )
    expect(json).not.toBe("")
    expect(JSON.parse(json)).toHaveLength(3)
  })

  it("appends a 1-frame card when the last prompt is too narrow to split", () => {
    _idCounter = 0
    // A single-frame prompt: mid = floor((10+10)/2) = 10, which is not > start
    // and not < end → falls to the append branch.
    const narrow: Parameters<typeof carveNewPromptCard>[0] = [{ uuid: "n", text: "wave", start_frame: 10, end_frame: 10, color: null }]
    const out = carveNewPromptCard(narrow, 50, deterministicId)
    expect(out).toHaveLength(2)
    expect(out[1]!.text).toBe("")
    expect(out[1]!.start_frame).toBe(11) // last.end_frame + 1
    expect(out[1]!.end_frame).toBe(11)
  })

  it("does NOT mutate the input array (pure — safe for React state)", () => {
    _idCounter = 0
    const original: Parameters<typeof carveNewPromptCard>[0] = [{ uuid: "a", text: "x", start_frame: 0, end_frame: 100, color: null }]
    const snapshot = JSON.parse(JSON.stringify(original))
    carveNewPromptCard(original, 101, deterministicId)
    expect(original).toEqual(snapshot) // untouched
  })

  it("preserves earlier cards untouched — only the LAST prompt is split", () => {
    _idCounter = 0
    const two = [
      { uuid: "first", text: "walk", start_frame: 0, end_frame: 50, color: null as null },
      { uuid: "last", text: "run", start_frame: 50, end_frame: 100, color: null as null },
    ]
    const out = carveNewPromptCard(two, 101, deterministicId)
    expect(out).toHaveLength(3)
    // The FIRST card is unchanged.
    const first = out.find((p) => p.uuid === "first")!
    expect(first.start_frame).toBe(0)
    expect(first.end_frame).toBe(50)
    expect(first.text).toBe("walk")
    // The LAST card was split.
    expect(out.find((p) => p.uuid === "last")!.end_frame).toBe(75) // floor((50+100)/2)
  })
})

describe("untanglePrompts — the NO-OVERLAP invariant (2026-08-15)", () => {
  // "The prompt cards can overlap. They get tangled, they should
  // automatically get untangled." The bar clamps gestures; THIS heals every
  // other writer (the envelope rescale's rounding, legacy persisted params).
  type Seg = { uuid: string; start_frame: number; end_frame: number }
  const seg = (uuid: string, start_frame: number, end_frame: number): Seg =>
    ({ uuid, start_frame, end_frame })

  it("returns the SAME array when nothing overlaps (an effect around it cannot loop)", () => {
    const clean = [seg("a", 0, 35), seg("b", 36, 71)]
    expect(untanglePrompts(clean)).toBe(clean)
    // Single/empty inputs are trivially clean.
    const one = [seg("a", 0, 10)]
    expect(untanglePrompts(one)).toBe(one)
    expect(untanglePrompts([])).toEqual([])
  })

  it("pushes a card that starts inside its predecessor into a strict sequence", () => {
    // a[0,35], b[20,40] — b starts INSIDE a. b keeps its order and its
    // duration (20 frames) and is pushed to start one frame after a ends.
    const tangled = [seg("a", 0, 35), seg("b", 20, 40)]
    const out = untanglePrompts(tangled)
    expect(out.map((s) => [s.start_frame, s.end_frame])).toEqual([[0, 35], [36, 56]])
    // The rest of the segment (uuid, text, …) is carried by spread.
    expect(out[1]!.uuid).toBe("b")
  })

  it("a later card translates — its DURATION is preserved, never truncated", () => {
    const tangled = [seg("a", 0, 40), seg("b", 20, 60)]
    const out = untanglePrompts(tangled)
    // b (dur 40) is pushed to start at 41 → [41, 81], past the envelope —
    // that's pull-the-tail's business, not this one's. Nothing truncated.
    expect(out[1]!.start_frame).toBe(41)
    expect(out[1]!.end_frame - out[1]!.start_frame).toBe(40)
  })

  it("sorts by start_frame — card ORDER is positional, not array order", () => {
    // Array order scrambled; the sequence heals by START frame.
    const tangled = [seg("b", 30, 50), seg("a", 0, 35)]
    const out = untanglePrompts(tangled)
    // a stays [0,35]; b (dur 20) is pushed to [36,56].
    expect(out.find((s) => s.uuid === "a")).toMatchObject({ start_frame: 0, end_frame: 35 })
    expect(out.find((s) => s.uuid === "b")).toMatchObject({ start_frame: 36, end_frame: 56 })
  })

  it("is idempotent — untangling a healed set returns it untouched", () => {
    const tangled = [seg("a", 0, 40), seg("b", 20, 60)]
    const once = untanglePrompts(tangled)
    expect(untanglePrompts(once)).toBe(once)
  })
})
