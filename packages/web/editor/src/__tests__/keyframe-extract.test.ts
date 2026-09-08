/**
 * Unit tests for lib/keyframeExtract.ts — SOMA-77 keyframe extraction.
 * Pure-math module with zero runtime coverage (Pose Studio mocks it away).
 *
 * Coverage:
 *   - extractKeyframeFrames: empty input, segment-boundary path, velocity-
 *     minima path, endpoint inclusion/exclusion, minSpacing dedup, last-frame
 *     always-kept behaviour, default minSpacing calculation, sort + range
 *     filter.
 *   - frameVelocities: frame-0 mirrors frame-1, squared displacement sum,
 *     array length match, single-frame edge.
 */
import { describe, it, expect } from "vitest"
import {
  extractKeyframeFrames,
  frameVelocities,
} from "@melite/formats"
import type { PromptSegmentOutput } from "@melite/catalog"

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Build a synthetic motion: `count` frames of `joints` joints each, with
 *  constant per-frame displacement (integer steps to avoid float noise). */
function makeMotion(count: number, joints = 77): number[][][] {
  const frames: number[][][] = []
  for (let f = 0; f < count; f++) {
    const frame: number[][] = []
    for (let j = 0; j < joints; j++) {
      // Each joint moves by a fixed integer per frame so velocity is exactly
      // constant across all frame transitions (no floating-point noise).
      frame.push([f + j, f * 2, f * 3])
    }
    frames.push(frame)
  }
  return frames
}

/** Build a motion where all frames are identical → zero velocity throughout. */
function makeStaticMotion(count: number, joints = 77): number[][][] {
  const frame: number[][] = []
  for (let j = 0; j < joints; j++) frame.push([j, j * 2, j * 3])
  return Array(count).fill(frame)
}

/** Build a motion with a clear single-frame velocity dip at `dipFrame`.
 *  The transition INTO dipFrame has displacement 0.01/joint (very low);
 *  all other transitions have displacement (1, 2, 3)/joint (high). */
function makeMotionWithDip(count: number, dipFrame: number, joints = 77): number[][][] {
  const frames: number[][][] = []
  for (let f = 0; f < count; f++) {
    const frame: number[][] = []
    for (let j = 0; j < joints; j++) {
      if (f === dipFrame) {
        // Tiny step from the previous frame → very low velocity at v[dipFrame].
        frame.push([(f - 1) + j + 0.01, (f - 1) * 2 + 0.02, (f - 1) * 3 + 0.03])
      } else {
        frame.push([f + j, f * 2, f * 3])
      }
    }
    frames.push(frame)
  }
  return frames
}

function makeSeg(start: number, end: number): PromptSegmentOutput {
  return { start_frame: start, end_frame: end } as PromptSegmentOutput
}

// ─── extractKeyframeFrames — edge cases ──────────────────────────────────

describe("keyframeExtract — extractKeyframeFrames edge cases", () => {
  it("returns [] for an empty framesJoints array", () => {
    expect(extractKeyframeFrames([])).toEqual([])
  })

  it("returns [] for null/undefined input", () => {
    expect(extractKeyframeFrames(null as unknown as number[][][])).toEqual([])
    expect(extractKeyframeFrames(undefined as unknown as number[][][])).toEqual([])
  })
})

// ─── extractKeyframeFrames — segment-boundary path ───────────────────────

describe("keyframeExtract — multi-prompt segment boundaries", () => {
  it("uses segment start/end frames directly when >1 segment is provided", () => {
    const motion = makeMotion(100)
    const segs = [makeSeg(0, 30), makeSeg(30, 70), makeSeg(70, 99)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 1 })
    // Should contain the segment boundaries: 0, 30, 70, 99.
    expect(keys).toContain(0)
    expect(keys).toContain(30)
    expect(keys).toContain(70)
    expect(keys).toContain(99)
  })

  it("does NOT use segment path when only 1 segment is given (falls through to velocity)", () => {
    // Static motion → zero velocity → no minima → empty result.
    const motion = makeStaticMotion(50)
    const keys = extractKeyframeFrames(motion, [makeSeg(0, 49)], { includeEndpoints: false, minSpacing: 1 })
    expect(keys).toEqual([])
  })

  it("dedupes overlapping segment boundaries (0 and 30 appear once)", () => {
    const motion = makeMotion(100)
    const segs = [makeSeg(0, 30), makeSeg(0, 30)] // duplicates
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 1 })
    const zeros = keys.filter((f) => f === 0)
    expect(zeros).toHaveLength(1)
  })
})

// ─── extractKeyframeFrames — velocity-minima path ────────────────────────

describe("keyframeExtract — velocity-minima detection", () => {
  it("detects the local minimum at a velocity dip (single low-velocity frame)", () => {
    // 20-frame motion with a clear velocity dip at frame 10.
    const motion = makeMotionWithDip(20, 10)
    const keys = extractKeyframeFrames(motion, undefined, { includeEndpoints: false, minSpacing: 1 })
    // The dip at frame 10 should be detected as a local minimum.
    expect(keys).toContain(10)
  })

  it("static motion (zero velocity) has no minima (no frame is strictly lower)", () => {
    const motion = makeStaticMotion(30)
    const keys = extractKeyframeFrames(motion, undefined, { includeEndpoints: false, minSpacing: 1 })
    // All velocities are 0 → v[f] < v[f-1] is always false → no minima.
    expect(keys).toEqual([])
  })
})

// ─── extractKeyframeFrames — endpoints ───────────────────────────────────

describe("keyframeExtract — endpoint handling", () => {
  it("includes frame 0 and the last frame by default (includeEndpoints: true)", () => {
    const motion = makeMotion(50)
    const keys = extractKeyframeFrames(motion)
    expect(keys[0]).toBe(0)
    expect(keys[keys.length - 1]).toBe(49)
  })

  it("excludes endpoints when includeEndpoints is false", () => {
    const motion = makeMotion(50)
    const keys = extractKeyframeFrames(motion, undefined, { includeEndpoints: false, minSpacing: 1 })
    expect(keys).not.toContain(0)
    expect(keys).not.toContain(49)
  })

  it("always keeps the last frame even when close to the previous keyframe", () => {
    // Force a keyframe near the end via segments, small minSpacing.
    const motion = makeMotion(10)
    const segs = [makeSeg(0, 8), makeSeg(8, 9)]
    // includeEndpoints adds frame 9 (already there from seg) + frame 0.
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: true, minSpacing: 5 })
    // The last frame (9) must be present.
    expect(keys).toContain(9)
  })

  it("replaces the previous keyframe when the last frame is within minSpacing", () => {
    const motion = makeMotion(10)
    // Segments put boundaries at 0, 8, 9. With minSpacing=5:
    // sorted unique: [0, 8, 9]. Greedy: keep 0, skip 8 (8-0=8≥5 keep), skip 9
    // (9-8=1<5, but 9 is last → replace 8 with 9).
    const segs = [makeSeg(0, 8), makeSeg(8, 9)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 5 })
    // 0 is kept (8≥5), 8 is kept, 9 replaces 8? Let's verify 9 is present
    // and 8 is NOT (replaced).
    expect(keys).toContain(9)
    expect(keys).not.toContain(8)
  })
})

// ─── extractKeyframeFrames — minSpacing ──────────────────────────────────

describe("keyframeExtract — minSpacing enforcement", () => {
  it("uses the default minSpacing of max(2, floor(total/12)) when omitted", () => {
    // 50 frames → floor(50/12) = 4 → minSpacing=4.
    const motion = makeMotion(50)
    const segs = [makeSeg(0, 2), makeSeg(2, 4), makeSeg(4, 6)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false })
    // Without explicit minSpacing, the default applies. Keys should be ≥4 apart.
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] - keys[i - 1]).toBeGreaterThanOrEqual(4)
    }
  })

  it("respects a custom minSpacing value", () => {
    const motion = makeMotion(100)
    const segs = [makeSeg(0, 10), makeSeg(10, 20), makeSeg(20, 30), makeSeg(30, 40)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 15 })
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] - keys[i - 1]).toBeGreaterThanOrEqual(15)
    }
  })

  it("minSpacing=1 allows consecutive frames", () => {
    const motion = makeMotion(10)
    const segs = [makeSeg(0, 1), makeSeg(1, 2), makeSeg(2, 3)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 1 })
    // All boundaries kept since they're ≥1 apart.
    expect(keys.length).toBeGreaterThanOrEqual(3)
  })
})

// ─── extractKeyframeFrames — output invariants ───────────────────────────

describe("keyframeExtract — output invariants", () => {
  it("output is always sorted ascending", () => {
    const motion = makeMotion(100)
    const segs = [makeSeg(50, 99), makeSeg(0, 50)] // out-of-order segments
    const keys = extractKeyframeFrames(motion, segs, { minSpacing: 1 })
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i]).toBeGreaterThan(keys[i - 1])
    }
  })

  it("all output indices are within [0, total)", () => {
    const motion = makeMotion(40)
    const segs = [makeSeg(0, 10), makeSeg(10, 39)]
    const keys = extractKeyframeFrames(motion, segs, { minSpacing: 1 })
    for (const f of keys) {
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThan(40)
    }
  })

  it("filters out segment boundaries that fall outside the frame range", () => {
    const motion = makeMotion(20) // only 20 frames
    const segs = [makeSeg(0, 10), makeSeg(10, 50)] // end_frame=50 > total
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 1 })
    // Frame 50 filtered out; only valid indices remain.
    for (const f of keys) expect(f).toBeLessThan(20)
    expect(keys).not.toContain(50)
  })
})

// ─── frameVelocities ─────────────────────────────────────────────────────

describe("keyframeExtract — frameVelocities", () => {
  it("returns an array with the same length as the input", () => {
    const motion = makeMotion(15)
    const v = frameVelocities(motion)
    expect(v).toHaveLength(15)
  })

  it("frame 0 mirrors frame 1's velocity (no previous frame to compare)", () => {
    const motion = makeMotion(5)
    const v = frameVelocities(motion)
    expect(v[0]).toBe(v[1])
  })

  it("single-frame motion returns [0] (no displacement to measure)", () => {
    const v = frameVelocities([[[1, 2, 3]]])
    expect(v).toEqual([0])
  })

  it("computes total squared displacement across all 77 joints", () => {
    // 2 frames, 1 joint, displacement (1,0,0) → velocity = 1.
    const motion = [[[0, 0, 0]], [[1, 0, 0]]]
    const v = frameVelocities(motion)
    expect(v[1]).toBeCloseTo(1, 5)
  })

  it("velocity is always non-negative (sum of squares)", () => {
    const motion = makeMotion(20)
    const v = frameVelocities(motion)
    for (const vel of v) expect(vel).toBeGreaterThanOrEqual(0)
  })

  it("stationary frames produce zero velocity", () => {
    // Two identical frames → zero displacement.
    const frame = [[1, 2, 3], [4, 5, 6]]
    const v = frameVelocities([frame, frame])
    expect(v[1]).toBe(0)
  })

  it("handles joints arrays of different lengths (uses min)", () => {
    // Frame 0 has 2 joints, frame 1 has 1 joint → min=1.
    const motion = [[[0, 0, 0], [0, 0, 0]], [[1, 0, 0]]]
    expect(() => frameVelocities(motion)).not.toThrow()
    const v = frameVelocities(motion)
    expect(v[1]).toBe(1) // Only 1 joint compared → displacement (1,0,0) = 1.
  })
})

// ════════════════════════════════════════════════════════════════════════════
// frameVelocities — 3D displacement contributions + multi-axis
// ════════════════════════════════════════════════════════════════════════════
describe("keyframeExtract — frameVelocities axis contributions", () => {
  it("displacement on X axis only → velocity = dx²", () => {
    const motion = [[[0, 0, 0]], [[3, 0, 0]]]
    expect(frameVelocities(motion)[1]).toBe(9) // 3² = 9
  })
  it("displacement on Y axis only → velocity = dy²", () => {
    const motion = [[[0, 0, 0]], [[0, 4, 0]]]
    expect(frameVelocities(motion)[1]).toBe(16) // 4² = 16
  })
  it("displacement on Z axis only → velocity = dz²", () => {
    const motion = [[[0, 0, 0]], [[0, 0, 5]]]
    expect(frameVelocities(motion)[1]).toBe(25) // 5² = 25
  })
  it("multi-axis displacement sums the squares (Pythagorean)", () => {
    // displacement (2, 3, 6) → 4 + 9 + 36 = 49
    const motion = [[[0, 0, 0]], [[2, 3, 6]]]
    expect(frameVelocities(motion)[1]).toBe(49)
  })
  it("negative displacement components produce the same velocity (squared)", () => {
    const fwd = [[[0, 0, 0]], [[1, 2, 3]]]
    const back = [[[1, 2, 3]], [[0, 0, 0]]]
    expect(frameVelocities(fwd)[1]).toBe(frameVelocities(back)[1])
  })
  it("two joints each displaced by (1,0,0) → velocity = 2 (1+1)", () => {
    const motion = [[[0, 0, 0], [0, 0, 0]], [[1, 0, 0], [1, 0, 0]]]
    expect(frameVelocities(motion)[1]).toBe(2)
  })
  it("accumulates displacement across a 3-frame motion", () => {
    // f0→f1: (1,0,0) → 1. f1→f2: (0,1,0) → 1.
    const motion = [[[0, 0, 0]], [[1, 0, 0]], [[1, 1, 0]]]
    const v = frameVelocities(motion)
    expect(v[1]).toBe(1)
    expect(v[2]).toBe(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// frameVelocities — edge counts
// ════════════════════════════════════════════════════════════════════════════
describe("keyframeExtract — frameVelocities edge counts", () => {
  it("two-frame motion: v[0] mirrors v[1]", () => {
    const motion = [[[0, 0, 0]], [[2, 0, 0]]]
    const v = frameVelocities(motion)
    expect(v).toHaveLength(2)
    expect(v[0]).toBe(4)
    expect(v[1]).toBe(4)
  })
  it("zero-frame motion returns [0] (v[0]=v[1]??0 extends the empty array)", () => {
    // new Array(0).fill(0) = [], but v[0] = v[1] ?? 0 sets index 0 → length 1.
    expect(frameVelocities([])).toEqual([0])
  })
  it("single-frame motion returns [0] (v[1] ?? 0 fallback)", () => {
    const motion = [[[5, 5, 5]]]
    const v = frameVelocities(motion)
    expect(v).toEqual([0])
  })
  it("frame with empty joint array produces NaN velocity (undefined - undefined)", () => {
    // 2 frames, each with 1 "joint" that is an empty array.
    // bj[0] - aj[0] = undefined - undefined = NaN → sum becomes NaN.
    const motion: number[][][] = [[[]], [[]]]
    const v = frameVelocities(motion)
    expect(v[1]).toBeNaN()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// velocityMinima — multiple dips + boundary range
// ════════════════════════════════════════════════════════════════════════════
describe("keyframeExtract — velocityMinima detection range", () => {
  it("detects TWO separate dips in the same motion", () => {
    // 20-frame motion with dips at frames 6 and 14.
    let motion = makeMotionWithDip(20, 6)
    // Inject a second dip at 14 (copy frame 13 with tiny offset).
    motion = motion.map((frame, f) => {
      if (f === 14) {
        return frame.map((_j, jIdx) => [
          (13) + jIdx + 0.01, (13) * 2 + 0.02, (13) * 3 + 0.03,
        ])
      }
      return frame
    })
    const keys = extractKeyframeFrames(motion, undefined, { includeEndpoints: false, minSpacing: 1 })
    expect(keys).toContain(6)
    expect(keys).toContain(14)
  })
  it("motion with fewer than 5 frames finds no minima (loop range is f=2..v.length-3)", () => {
    // 4-frame motion → v.length=4 → loop runs for f=2 only if 2 < 4-2=2, which is false.
    const motion = makeMotion(4)
    const keys = extractKeyframeFrames(motion, undefined, { includeEndpoints: false, minSpacing: 1 })
    expect(keys).toEqual([])
  })
  it("exactly 5 frames can detect a minimum at f=2 (first valid position)", () => {
    // 5-frame motion with a dip at f=2: 2 < 5-2=3 → loop runs for f=2 only.
    const motion = makeMotionWithDip(5, 2)
    const keys = extractKeyframeFrames(motion, undefined, { includeEndpoints: false, minSpacing: 1 })
    expect(keys).toContain(2)
  })
  it("plateau dip (two equal low frames) is NOT detected (v[f] < v[f+1] fails on equal)", () => {
    // Velocity signal: 10, 1, 1, 10 → neither frame qualifies because v[f]=1 is
    // not strictly less than v[f+1]=1.
    // Construct a 4-joint, 4-frame motion producing exactly that signal.
    // (We need at least 5 frames for the window, so pad with high-velocity frames.)
    // frames 0,1 → vel[1]=10, frames 1,2 → vel[2]=1, frames 2,3 → vel[3]=1,
    // frames 3,4 → vel[4]=10.
    const motion: number[][][] = [
      [[0, 0, 0]],
      [[10, 0, 0]], // vel[1] = 100
      [[11, 0, 0]], // vel[2] = 1
      [[12, 0, 0]], // vel[3] = 1
      [[22, 0, 0]], // vel[4] = 100
    ]
    const keys = extractKeyframeFrames(motion, undefined, { includeEndpoints: false, minSpacing: 1 })
    // Neither f=2 nor f=3 is a strict local minimum (they're equal).
    expect(keys).not.toContain(2)
    expect(keys).not.toContain(3)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// extractKeyframeFrames — edge counts + segments handling
// ════════════════════════════════════════════════════════════════════════════
describe("keyframeExtract — extractKeyframeFrames edge counts", () => {
  it("single-frame motion returns [0] (frame 0 is both start + end anchor)", () => {
    const keys = extractKeyframeFrames([[[0, 0, 0]]])
    expect(keys).toEqual([0])
  })
  it("two-frame motion returns [1] (last-frame replace: 1-0 < minSpacing(2))", () => {
    // total=2 → minSpacing=max(2,0)=2. Endpoints {0,1}. Greedy: keep 0,
    // then f=1: 1-0=1 < 2 and f===total-1 → replace prev (0) with 1.
    const keys = extractKeyframeFrames([[[0, 0, 0]], [[1, 0, 0]]])
    expect(keys).toEqual([1])
  })
  it("default minSpacing is max(2, floor(total/12)) — small motion gets minSpacing=2", () => {
    // 10 frames → floor(10/12)=0 → max(2, 0)=2.
    const motion = makeMotion(10)
    const segs = [makeSeg(0, 1), makeSeg(1, 2), makeSeg(2, 3)] // close boundaries
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false })
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] - keys[i - 1]).toBeGreaterThanOrEqual(2)
    }
  })
  it("default minSpacing for 24-frame motion is max(2, 2)=2", () => {
    // 24 frames → floor(24/12)=2 → max(2, 2)=2.
    const motion = makeMotion(24)
    const segs = [makeSeg(0, 1), makeSeg(1, 2), makeSeg(2, 3)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false })
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] - keys[i - 1]).toBeGreaterThanOrEqual(2)
    }
  })
  it("default minSpacing for 36-frame motion is max(2, 3)=3", () => {
    // 36 frames → floor(36/12)=3.
    const motion = makeMotion(36)
    const segs = [makeSeg(0, 1), makeSeg(1, 2), makeSeg(2, 3), makeSeg(3, 4)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false })
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] - keys[i - 1]).toBeGreaterThanOrEqual(3)
    }
  })
  it("explicit minSpacing=0 allows all frames through (0 >= 0 always true)", () => {
    const motion = makeMotion(10)
    const segs = [makeSeg(0, 1), makeSeg(1, 2), makeSeg(2, 3), makeSeg(3, 4)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 0 })
    // All boundaries 0,1,2,3,4 survive since gap ≥ 0.
    expect(keys).toContain(0)
    expect(keys).toContain(1)
    expect(keys).toContain(2)
    expect(keys).toContain(3)
    expect(keys).toContain(4)
  })
  it("empty segments array falls through to velocity-minima path (length > 1 is false)", () => {
    // Static motion → zero velocity → no minima → empty.
    const motion = makeStaticMotion(30)
    const keys = extractKeyframeFrames(motion, [], { includeEndpoints: false, minSpacing: 1 })
    expect(keys).toEqual([])
  })
  it("segments with identical start_frame are deduped (Set behavior)", () => {
    const motion = makeMotion(50)
    const segs = [makeSeg(5, 10), makeSeg(5, 15), makeSeg(5, 20)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 1 })
    const fives = keys.filter((f) => f === 5)
    expect(fives).toHaveLength(1)
  })
  it("segments with negative start_frame are filtered out by the range filter", () => {
    const motion = makeMotion(30)
    const segs = [makeSeg(-5, 10), makeSeg(10, 20)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 1 })
    expect(keys).not.toContain(-5)
    expect(keys.every((f) => f >= 0)).toBe(true)
  })
  it("segments with negative end_frame are filtered out", () => {
    const motion = makeMotion(30)
    const segs = [makeSeg(0, -3), makeSeg(5, 10)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 1 })
    expect(keys).not.toContain(-3)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// extractKeyframeFrames — last-frame preservation (the else-if branch)
// ════════════════════════════════════════════════════════════════════════════
describe("keyframeExtract — last-frame always-kept semantics", () => {
  it("last frame is included even when minSpacing would skip it (replace branch)", () => {
    // 10-frame motion. Segments put boundaries at 0, 7, 8, 9.
    // includeEndpoints adds 0 + 9.
    // sorted unique raw: {0, 7, 8, 9}.
    // minSpacing=5: 0 kept, 7 kept (7-0=7≥5), 8 skipped (8-7=1<5),
    //   9 is last → 9-7=2<5 → replace 7 with 9.
    const motion = makeMotion(10)
    const segs = [makeSeg(0, 7), makeSeg(7, 8), makeSeg(8, 9)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 5 })
    expect(keys).toContain(9)
    expect(keys).not.toContain(7)
    expect(keys).not.toContain(8)
  })
  it("last frame is included via the first-if push when far enough from prev", () => {
    // 20-frame motion. Segments at 0, 5, 10. includeEndpoints adds 0 + 19.
    // sorted unique: {0, 5, 10, 19}. minSpacing=5:
    //   0 kept, 5 kept (5-0=5>=5), 10 kept (10-5=5>=5),
    //   19 kept via first-if (19-10=9>=5 -> push, not replace).
    const motion = makeMotion(20)
    const segs = [makeSeg(0, 5), makeSeg(5, 10)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: true, minSpacing: 5 })
    expect(keys).toEqual([0, 5, 10, 19])
  })
  it("includeEndpoints=false + last frame from segments within minSpacing → still replaced", () => {
    // 10-frame motion, segments at 0, 8, 9. includeEndpoints: false.
    // sorted unique: {0, 8, 9}. minSpacing=5: 0 kept, 8 kept (8-0=8≥5),
    // 9 is last → 9-8=1<5 → replace 8 with 9.
    const motion = makeMotion(10)
    const segs = [makeSeg(0, 8), makeSeg(8, 9)]
    const keys = extractKeyframeFrames(motion, segs, { includeEndpoints: false, minSpacing: 5 })
    expect(keys).toEqual([0, 9])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Output invariants — stress + determinism
// ════════════════════════════════════════════════════════════════════════════
describe("keyframeExtract — invariants + determinism", () => {
  it("output is deterministic — same input yields same output across calls", () => {
    const motion = makeMotion(100)
    const segs = [makeSeg(0, 50), makeSeg(50, 99)]
    const a = extractKeyframeFrames(motion, segs, { minSpacing: 5 })
    const b = extractKeyframeFrames(motion, segs, { minSpacing: 5 })
    expect(a).toEqual(b)
  })
  it("output is sorted ascending even with chaotic segment order", () => {
    const motion = makeMotion(100)
    const segs = [
      makeSeg(80, 99), makeSeg(0, 20), makeSeg(60, 80),
      makeSeg(20, 40), makeSeg(40, 60),
    ]
    const keys = extractKeyframeFrames(motion, segs, { minSpacing: 1 })
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i]).toBeGreaterThan(keys[i - 1])
    }
  })
  it("output contains no duplicates regardless of segment overlap", () => {
    const motion = makeMotion(100)
    const segs = [
      makeSeg(0, 50), makeSeg(50, 99), makeSeg(0, 99), makeSeg(25, 75),
    ]
    const keys = extractKeyframeFrames(motion, segs, { minSpacing: 1 })
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })
  it("output is empty when includeEndpoints=false and no segments + static motion", () => {
    const motion = makeStaticMotion(50)
    const keys = extractKeyframeFrames(motion, undefined, { includeEndpoints: false })
    expect(keys).toEqual([])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Type shape sanity
// ════════════════════════════════════════════════════════════════════════════
describe("keyframeExtract — type shape sanity", () => {
  it("ExtractOptions has optional minSpacing + includeEndpoints", () => {
    const opts = { minSpacing: 5, includeEndpoints: true }
    expect(opts.minSpacing).toBe(5)
    expect(opts.includeEndpoints).toBe(true)
  })
  it("ExtractOptions can be empty (both fields optional)", () => {
    const opts = {}
    expect(opts).toEqual({})
  })
  it("StoryboardSegment shape: start_frame + end_frame", () => {
    const seg = { start_frame: 0, end_frame: 10 } as PromptSegmentOutput
    expect(seg.start_frame).toBe(0)
    expect(seg.end_frame).toBe(10)
  })
})
