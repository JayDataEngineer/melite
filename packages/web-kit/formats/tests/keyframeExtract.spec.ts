// keyframeExtract.spec.ts — anchor-frame picking from motion trajectories.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { extractKeyframeFrames, frameVelocities } from "../src/keyframeExtract.ts";
import type { PromptSegmentOutput } from "../src/textToPose.ts";

/** Constant-pose motion: T frames, every joint at the origin. */
const still = (frames: number, joints = 3): number[][][] =>
  Array.from({ length: frames }, () =>
    Array.from({ length: joints }, () => [0, 0, 0]),
  );

/** Single-joint motion along x with the given per-frame positions. */
const slide = (xs: number[]): number[][][] =>
  xs.map((x) => [[x, 0, 0]]);

const seg = (start_frame: number, end_frame: number): PromptSegmentOutput => ({
  text: `seg ${start_frame}-${end_frame}`,
  start_frame,
  end_frame,
  frame_count: end_frame - start_frame + 1,
});

describe("extractKeyframeFrames gates", () => {
  it("returns [] for empty input", () => {
    assert.deepEqual(extractKeyframeFrames([]), []);
    assert.deepEqual(extractKeyframeFrames(undefined as unknown as number[][][]), []);
  });

  it("uses segment boundaries directly for multi-segment motion", () => {
    const out = extractKeyframeFrames(still(20), [seg(0, 9), seg(10, 19)], {
      minSpacing: 2,
    });
    assert.deepEqual(out, [0, 9, 19]);
  });

  it("runs velocity detection for a single segment or none", () => {
    // A hold at frame 3 (strict local minimum with window 2).
    const xs = [0, 10, 30, 31, 40, 60, 61, 70, 90];
    const viaNone = extractKeyframeFrames(slide(xs));
    const viaOne = extractKeyframeFrames(slide(xs), [seg(0, 8)]);
    assert.deepEqual(viaNone, [0, 3, 6, 8]);
    assert.deepEqual(viaOne, [0, 3, 6, 8]);
  });
});

describe("extractKeyframeFrames endpoints + spacing", () => {
  it("omits endpoints when includeEndpoints is false", () => {
    const xs = [0, 10, 30, 31, 40, 60, 61, 70, 90];
    assert.deepEqual(
      extractKeyframeFrames(slide(xs), undefined, { includeEndpoints: false }),
      [3, 6],
    );
  });

  it("enforces minSpacing and always keeps the last frame", () => {
    const out = extractKeyframeFrames(still(9), [seg(0, 2), seg(3, 7)], {
      minSpacing: 5,
    });
    // Raw {0,2,3,7} + endpoints {0,8} → sorted [0,2,3,7,8]:
    // 2 and 3 fall inside the spacing; 8 replaces the too-close 7.
    assert.deepEqual(out, [0, 8]);
  });

  it("keeps close frames when the spacing allows", () => {
    const out = extractKeyframeFrames(still(9), [seg(0, 2), seg(3, 7)], {
      minSpacing: 2,
    });
    // Sorted [0,2,3,7,8]: 3 falls inside 2's spacing; 8 replaces 7.
    assert.deepEqual(out, [0, 2, 8]);
  });

  it("filters out-of-range segment frames", () => {
    const out = extractKeyframeFrames(still(10), [seg(-3, 4), seg(5, 100)], {
      minSpacing: 1,
    });
    assert.deepEqual(out, [0, 4, 5, 9]);
  });

  it("dedupes shared boundaries", () => {
    const out = extractKeyframeFrames(still(10), [seg(0, 5), seg(5, 9)], {
      minSpacing: 1,
    });
    assert.deepEqual(out, [0, 5, 9]);
  });
});

describe("frameVelocities", () => {
  it("reports total squared displacement with v[0] = v[1]", () => {
    const v = frameVelocities(slide([0, 3, 5]));
    assert.deepEqual(v, [9, 9, 4]);
  });

  it("handles single-frame and empty input", () => {
    assert.deepEqual(frameVelocities(slide([7])), [0]);
    assert.deepEqual(frameVelocities([]), [0]);
  });

  it("tolerates uneven per-frame joint counts", () => {
    const v = frameVelocities([[[0, 0, 0], [1, 1, 1]], [[2, 0, 0]]]);
    // Only the shared first joint counts: dx=2 → 4.
    assert.deepEqual(v, [4, 4]);
  });

  it("sums displacement over all joints", () => {
    const v = frameVelocities([
      [[0, 0, 0], [0, 0, 0]],
      [[1, 0, 0], [0, 2, 0]],
    ]);
    assert.deepEqual(v, [5, 5]);
  });
});
