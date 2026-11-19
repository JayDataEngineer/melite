// motionConstraints.spec.ts — constraint snapshot/serialize/hydrate plus the
// prompt-card helpers (carve/serialize/hydrate/untangle).
import { describe, it, vi, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  carveNewPromptCard,
  decodeF32,
  encodeF32,
  hydrateConstraints,
  hydrateMotionPrompts,
  serializeConstraints,
  serializeMotionPrompts,
  snapshotConstraint,
  stampEditedPose,
  untanglePrompts,
} from "../src/motionConstraints.ts";
import type { ConstraintSnapshotSource, MotionConstraint } from "../src/motionConstraints.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** T-frame source: frame f joint j component c holds f*1000 + j*10 + c. */
const src = (T: number): ConstraintSnapshotSource => {
  const posedJoints = new Float32Array(T * 77 * 3);
  for (let f = 0; f < T; f++) {
    for (let j = 0; j < 77; j++) {
      posedJoints[(f * 77 + j) * 3] = f * 1000 + j * 10;
      posedJoints[(f * 77 + j) * 3 + 1] = f * 1000 + j * 10 + 1;
      posedJoints[(f * 77 + j) * 3 + 2] = f * 1000 + j * 10 + 2;
    }
  }
  const globalRotMats = new Float32Array(T * 77 * 9).fill(0.5);
  return { posedJoints, globalRotMats, T };
};

const fbPayload = (frame: number): MotionConstraint => ({
  kind: "fullbody",
  frame,
  jp: encodeF32(new Float32Array(77 * 3).fill(frame)),
  jr: encodeF32(new Float32Array(77 * 9).fill(frame)),
});

describe("encodeF32 / decodeF32", () => {
  it("round-trips float32 bytes", () => {
    const arr = new Float32Array([1.5, -2.25, 0, 1e10]);
    const back = decodeF32(encodeF32(arr));
    assert.deepEqual(Array.from(back), Array.from(arr));
  });

  it("decodes via the Buffer fallback when atob is unavailable", () => {
    const arr = new Float32Array([3.25, -0.5]);
    const b64 = encodeF32(arr);
    vi.stubGlobal("atob", undefined);
    const back = decodeF32(b64);
    assert.deepEqual(Array.from(back), Array.from(arr));
  });
});

describe("stampEditedPose", () => {
  it("stamps a single-frame rotation slice", () => {
    const edited = new Float32Array(77 * 3).fill(1);
    const single = new Float32Array(77 * 9).fill(2);
    const out = stampEditedPose(edited, single, 0, 10);
    assert.equal(out.kind, "fullbody");
    assert.equal(out.frame, 0);
    if (out.kind !== "fullbody") throw new Error("narrow");
    assert.deepEqual(Array.from(decodeF32(out.jp)), Array.from(edited));
    assert.deepEqual(Array.from(decodeF32(out.jr)), Array.from(single));
  });

  it("selects the frame slice out of a full T-frame rotation array", () => {
    const edited = new Float32Array(77 * 3).fill(1);
    const full = new Float32Array(3 * 77 * 9);
    full.fill(7, 1 * 77 * 9, 2 * 77 * 9);
    const out = stampEditedPose(edited, full, 1, 3);
    assert.equal(out.frame, 1);
    if (out.kind !== "fullbody") throw new Error("narrow");
    assert.ok(Array.from(decodeF32(out.jr)).every((v) => v === 7));
  });

  it("clamps the frame into the envelope", () => {
    const edited = new Float32Array(77 * 3);
    const single = new Float32Array(77 * 9);
    assert.equal(stampEditedPose(edited, single, -5, 10).frame, 0);
    assert.equal(stampEditedPose(edited, single, 100, 10).frame, 9);
  });
});

describe("snapshotConstraint", () => {
  it("snapshots a fullbody pose", () => {
    const out = snapshotConstraint("fullbody", 1, src(2));
    assert.ok(out && out.kind === "fullbody" && out.frame === 1);
    if (out?.kind !== "fullbody") throw new Error("narrow");
    const jp = decodeF32(out.jp);
    assert.equal(jp[0], 1000);
    assert.equal(decodeF32(out.jr).length, 77 * 9);
  });

  it("snapshots root XZ", () => {
    const out = snapshotConstraint("root2d", 0, src(1));
    assert.deepEqual(out, { kind: "root2d", frame: 0, x: 0, z: 2 });
  });

  it("snapshots an end-effector lane", () => {
    const out = snapshotConstraint("left-hand", 1, src(2));
    assert.ok(out?.kind === "ee");
    if (out?.kind !== "ee") throw new Error("narrow");
    assert.equal(out.joint, "LeftHand");
    assert.equal(out.frame, 1);
  });

  it("returns null for an unknown track", () => {
    assert.equal(snapshotConstraint("nope", 0, src(1)), null);
  });

  it("floors negative frames and clamps pose bytes past the source", () => {
    const neg = snapshotConstraint("fullbody", -3, src(2));
    assert.equal(neg?.frame, 0);
    // Pre-run T=1 source: payload keeps the requested frame, pose is frame 0.
    const past = snapshotConstraint("fullbody", 5, src(1));
    assert.equal(past?.frame, 5);
    if (past?.kind !== "fullbody") throw new Error("narrow");
    assert.equal(decodeF32(past.jp)[0], 0);
  });
});

describe("serializeConstraints", () => {
  it("drops orphan dots and sorts each track by frame", () => {
    const keyframes = [
      { uuid: "b", track_id: "fullbody", frame: 9 },
      { uuid: "ghost", track_id: "fullbody", frame: 4 },
      { uuid: "a", track_id: "fullbody", frame: 2 },
    ];
    const out = serializeConstraints(keyframes, { b: fbPayload(9), a: fbPayload(2) });
    assert.deepEqual(out.keyframes.map((k) => k.uuid), ["b", "a"]);
    assert.deepEqual(out.fullbody!.map((e) => e.frame), [2, 9]);
    assert.ok(!("end_effectors" in out));
    assert.ok(!("root2d" in out));
  });

  it("carries ee and root2d payloads and omits empty tracks", () => {
    const ee: MotionConstraint = { kind: "ee", frame: 3, joint: "RightFoot", jp: "a", jr: "b" };
    const r2: MotionConstraint = { kind: "root2d", frame: 1, x: 1, z: 2 };
    const out = serializeConstraints(
      [
        { uuid: "e", track_id: "right-foot", frame: 3 },
        { uuid: "r", track_id: "root2d", frame: 1 },
      ],
      { e: ee, r: r2 },
    );
    assert.ok(!("fullbody" in out));
    assert.deepEqual(out.end_effectors, [{ frame: 3, joint: "RightFoot", jp: "a", jr: "b" }]);
    assert.deepEqual(out.root2d, [{ frame: 1, x: 1, z: 2 }]);
  });

  it("serializes to keyframes-only when every dot is orphaned", () => {
    const out = serializeConstraints([{ uuid: "ghost", track_id: "fullbody", frame: 4 }], {});
    assert.deepEqual(out, { keyframes: [] });
  });
});

describe("hydrateConstraints", () => {
  it("rejects null, non-objects, and keyframe-less bodies", () => {
    assert.equal(hydrateConstraints(null), null);
    assert.equal(hydrateConstraints("str"), null);
    assert.equal(hydrateConstraints(42), null);
    assert.equal(hydrateConstraints({}), null);
    assert.equal(hydrateConstraints({ keyframes: {} }), null);
  });

  it("round-trips a serialized payload", () => {
    const json = serializeConstraints(
      [
        { uuid: "a", track_id: "fullbody", frame: 2 },
        { uuid: "e", track_id: "left-hand", frame: 3 },
        { uuid: "r", track_id: "root2d", frame: 1 },
      ],
      {
        a: fbPayload(2),
        e: { kind: "ee", frame: 3, joint: "LeftHand", jp: "x", jr: "y" },
        r: { kind: "root2d", frame: 1, x: 4, z: 5 },
      },
    );
    const back = hydrateConstraints(json)!;
    assert.equal(back.keyframes.length, 3);
    for (const d of back.keyframes) {
      assert.equal(d.value, null);
      assert.equal(d.opacity, 1);
      assert.equal(d.locked, false);
    }
    assert.equal(back.payloads["a"]?.kind, "fullbody");
    assert.equal(back.payloads["e"]?.kind, "ee");
    assert.deepEqual(back.payloads["r"], { kind: "root2d", frame: 1, x: 4, z: 5 });
  });

  it("drops track entries with no matching dot and dots with no payload", () => {
    const back = hydrateConstraints({
      keyframes: [
        { uuid: "a", track_id: "fullbody", frame: 0 },
        { uuid: "stale", track_id: "fullbody", frame: 0 },
      ],
      fullbody: [{ frame: 5, jp: "x", jr: "y" }],
      end_effectors: [{ frame: 3, joint: "LeftHand", jp: "x", jr: "y" }],
      root2d: [{ frame: 9, x: 1, z: 2 }],
    })!;
    assert.deepEqual(back, { keyframes: [], payloads: {} });
  });

  it("ignores ee entries whose track does not serve that joint", () => {
    const back = hydrateConstraints({
      keyframes: [
        { uuid: "e", track_id: "right-hand", frame: 3 },
        { uuid: "blank", track_id: "", frame: 3 },
      ],
      end_effectors: [{ frame: 3, joint: "LeftHand", jp: "x", jr: "y" }],
    })!;
    assert.deepEqual(back.payloads, {});
    assert.deepEqual(back.keyframes, []);
  });

  it("tolerates a bare keyframes array", () => {
    assert.deepEqual(hydrateConstraints({ keyframes: [] }), {
      keyframes: [],
      payloads: {},
    });
  });
});

describe("carveNewPromptCard", () => {
  it("seeds one empty card when there are no prompts", () => {
    const out = carveNewPromptCard([], 10, () => "n1");
    assert.deepEqual(out, [{ uuid: "n1", text: "", start_frame: 0, end_frame: 9, color: null }]);
  });

  it("splits the last prompt at its midpoint", () => {
    const prompts = [
      { uuid: "p", text: "hello", start_frame: 0, end_frame: 9, color: [1, 2, 3] as [number, number, number] },
    ];
    const out = carveNewPromptCard(prompts, 10, () => "n1");
    assert.deepEqual(out, [
      { uuid: "p", text: "hello", start_frame: 0, end_frame: 4, color: [1, 2, 3] },
      { uuid: "n1", text: "", start_frame: 4, end_frame: 9, color: null },
    ]);
    // Pure: the input is untouched.
    assert.equal(prompts[0]!.end_frame, 9);
  });

  it("appends a 1-frame card when the last prompt is too narrow to split", () => {
    const out = carveNewPromptCard(
      [{ uuid: "p", text: "hi", start_frame: 5, end_frame: 5, color: null }],
      10,
      () => "n1",
    );
    assert.deepEqual(out, [
      { uuid: "p", text: "hi", start_frame: 5, end_frame: 5, color: null },
      { uuid: "n1", text: "", start_frame: 6, end_frame: 6, color: null },
    ]);
  });

  it("splits only the last prompt, keeping earlier cards by identity", () => {
    const first = { uuid: "a", text: "one", start_frame: 0, end_frame: 4, color: null };
    const last = { uuid: "b", text: "two", start_frame: 5, end_frame: 12, color: null };
    const out = carveNewPromptCard([last, first], 20, () => "n1");
    assert.equal(out[2], first);
    assert.deepEqual(out.slice(0, 2), [
      { uuid: "b", text: "two", start_frame: 5, end_frame: 8, color: null },
      { uuid: "n1", text: "", start_frame: 8, end_frame: 12, color: null },
    ]);
  });

  it("defaults to a crypto UUID", () => {
    const out = carveNewPromptCard([], 5);
    assert.match(out[0]!.uuid, /^[0-9a-f-]{36}$/);
  });

  it("falls back to a tl- id when crypto.randomUUID is missing", () => {
    vi.stubGlobal("crypto", {});
    const out = carveNewPromptCard([], 5);
    assert.ok(out[0]!.uuid.startsWith("tl-"));
  });

  it("falls back to a tl- id when crypto itself is missing", () => {
    vi.stubGlobal("crypto", undefined);
    const out = carveNewPromptCard([], 5);
    assert.ok(out[0]!.uuid.startsWith("tl-"));
  });
});

describe("serializeMotionPrompts", () => {
  it("returns '' below the 2-segment threshold", () => {
    assert.equal(serializeMotionPrompts([], 30), "");
    assert.equal(
      serializeMotionPrompts([{ text: "solo", start_frame: 0, end_frame: 9 }], 30),
      "",
    );
  });

  it("filters bad entries, sorts, and sizes last-segment inclusive", () => {
    const raw = JSON.parse(
      serializeMotionPrompts(
        [
          { text: "b", start_frame: 30, end_frame: 44 },
          null as unknown as { text: string; start_frame: number; end_frame: number },
          { text: 5 as unknown as string, start_frame: 0, end_frame: 1 },
          { text: "   ", start_frame: 0, end_frame: 1 },
          { text: "ok", start_frame: Number.NaN, end_frame: 1 },
          { text: "a", start_frame: 0, end_frame: 29 },
        ],
        30,
      ),
    );
    assert.deepEqual(raw, [
      { text: "a", duration_sec: 29 / 30 },
      { text: "b", duration_sec: 15 / 30 },
    ]);
  });

  it("defaults to 30fps for non-positive fps", () => {
    const raw = JSON.parse(
      serializeMotionPrompts(
        [
          { text: "a", start_frame: 0, end_frame: 30 },
          { text: "b", start_frame: 31, end_frame: 60 },
        ],
        0,
      ),
    );
    assert.deepEqual(raw, [
      { text: "a", duration_sec: 1 },
      { text: "b", duration_sec: 1 },
    ]);
  });
});

describe("hydrateMotionPrompts", () => {
  it("returns null for every malformed payload", () => {
    assert.equal(hydrateMotionPrompts(null, 30, 60), null);
    assert.equal(hydrateMotionPrompts(42, 30, 60), null);
    assert.equal(hydrateMotionPrompts("", 30, 60), null);
    assert.equal(hydrateMotionPrompts("   ", 30, 60), null);
    assert.equal(hydrateMotionPrompts("{bad", 30, 60), null);
    assert.equal(hydrateMotionPrompts("{}", 30, 60), null);
    assert.equal(hydrateMotionPrompts("[]", 30, 60), null);
    assert.equal(hydrateMotionPrompts('[{"nont text":1}]', 30, 60), null);
  });

  it("rebuilds contiguous cards and extends the last to totalFrames", () => {
    const payload = JSON.stringify([
      { text: "a", duration_sec: 0.5 },
      { text: "b", duration_sec: 1.0 },
    ]);
    const out = hydrateMotionPrompts(payload, 10, 30)!;
    assert.deepEqual(out, [
      { text: "a", start_frame: 0, end_frame: 4 },
      { text: "b", start_frame: 5, end_frame: 29 },
    ]);
  });

  it("defaults missing durations to 1s at 30fps fallback", () => {
    const out = hydrateMotionPrompts('[{"text":"a"},{"text":"b"}]', 0, 60)!;
    assert.deepEqual(out, [
      { text: "a", start_frame: 0, end_frame: 29 },
      { text: "b", start_frame: 30, end_frame: 59 },
    ]);
  });
});

describe("untanglePrompts", () => {
  it("returns short arrays untouched", () => {
    const empty: { start_frame: number; end_frame: number }[] = [];
    assert.equal(untanglePrompts(empty), empty);
    const one = [{ start_frame: 0, end_frame: 5 }];
    assert.equal(untanglePrompts(one), one);
  });

  it("returns the same array when nothing overlaps", () => {
    const segs = [
      { start_frame: 0, end_frame: 2 },
      { start_frame: 3, end_frame: 5 },
    ];
    assert.equal(untanglePrompts(segs), segs);
  });

  it("heals overlaps by translating later cards, preserving duration", () => {
    const out = untanglePrompts([
      { start_frame: 0, end_frame: 5 },
      { start_frame: 3, end_frame: 8 },
    ]);
    assert.deepEqual(out, [
      { start_frame: 0, end_frame: 5 },
      { start_frame: 6, end_frame: 11 },
    ]);
  });

  it("stretches zero-length cards to the 1-frame minimum in place", () => {
    const out = untanglePrompts([
      { start_frame: 0, end_frame: 0 },
      { start_frame: 5, end_frame: 8 },
    ]);
    assert.deepEqual(out, [
      { start_frame: 0, end_frame: 1 },
      { start_frame: 5, end_frame: 8 },
    ]);
  });

  it("handles equal starts and zero-length cards", () => {
    const out = untanglePrompts([
      { start_frame: 0, end_frame: 5 },
      { start_frame: 0, end_frame: 3 },
      { start_frame: 9, end_frame: 9 },
    ]);
    // Sorted by (start, end): [0,3] first, then [0,5], then [9,9].
    // [0,3]: dur 3 → [0,3]. [0,5]: dur 5 → s=4, e=9. [9,9]: dur 1 → s=10, e=11.
    // Mapped back to input order: [0,5]→[4,9], [0,3]→[0,3], [9,9]→[10,11].
    assert.deepEqual(out, [
      { start_frame: 4, end_frame: 9 },
      { start_frame: 0, end_frame: 3 },
      { start_frame: 10, end_frame: 11 },
    ]);
    // Idempotent: a healed lane untangles to itself.
    const again = untanglePrompts(out);
    assert.equal(again, out);
  });
});
