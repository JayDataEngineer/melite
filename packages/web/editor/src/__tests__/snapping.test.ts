/**
 * Unit tests for lib/snapping.ts — the magnetic-snap utility for the timeline.
 *
 * Pure functions: findSnap (closest target within threshold, tie-break by
 * priority then distance), snapTime (multi-source convenience wrapper),
 * segmentEdgeTargets (segment start/end → targets), gridTargets (every N
 * seconds → targets).
 *
 * Zero prior coverage. A priority-tie regression would let a low-priority
 * grid line win over a high-priority segment edge at the same time.
 */
import { describe, it, expect } from "vitest"
import {
  findSnap, snapTime, segmentEdgeTargets, gridTargets,
} from "@melite/ui"
import type { SnapTarget } from "@melite/ui"

describe("snapping — findSnap", () => {
  it("returns the candidate unchanged when no targets are in range", () => {
    const r = findSnap(5, [{ time: 100, label: "far" }], 2)
    expect(r.time).toBe(5)
    expect(r.matched).toBeNull()
  })
  it("returns the candidate unchanged when targets array is empty", () => {
    const r = findSnap(5, [], 2)
    expect(r.time).toBe(5)
    expect(r.matched).toBeNull()
  })
  it("returns the candidate unchanged when threshold <= 0", () => {
    const r = findSnap(5, [{ time: 5, label: "here" }], 0)
    expect(r.matched).toBeNull()
  })
  it("snaps to the closest target within threshold", () => {
    const r = findSnap(5.1, [{ time: 4, label: "a" }, { time: 6, label: "b" }], 2)
    expect(r.time).toBe(6) // |6-5.1|=0.9 < |4-5.1|=1.1
    expect(r.matched?.label).toBe("b")
  })
  it("picks the closest of two equidistant-ish targets by distance", () => {
    const r = findSnap(5, [{ time: 4, label: "a" }, { time: 7, label: "b" }], 2)
    expect(r.time).toBe(4) // |4-5|=1 < |7-5|=2
  })
  it("ties at the same distance are broken by HIGHER priority", () => {
    const targets: SnapTarget[] = [
      { time: 5, label: "grid", priority: 0 },
      { time: 5, label: "segment-edge", priority: 1 },
    ]
    const r = findSnap(5, targets, 1)
    expect(r.matched?.label).toBe("segment-edge")
  })
  it("boundary case: a target at exactly threshold distance is included (<=)", () => {
    const r = findSnap(3, [{ time: 5, label: "edge" }], 2)
    expect(r.matched?.label).toBe("edge")
  })
  it("a target just beyond threshold is NOT matched", () => {
    const r = findSnap(3, [{ time: 5.001, label: "edge" }], 2)
    expect(r.matched).toBeNull()
  })
})

describe("snapping — snapTime (multi-source convenience)", () => {
  it("accepts a flat SnapTarget[] source", () => {
    const r = snapTime(5, [{ time: 6, label: "a" }], 2)
    expect(r.time).toBe(6)
  })
  it("accepts a nested SnapTarget[][] source and flattens", () => {
    const r = snapTime(5, [[{ time: 6, label: "a" }], [{ time: 7, label: "b" }]], 2)
    expect(r.time).toBe(6)
  })
  it("picks the single closest across all flattened sources", () => {
    const r = snapTime(5, [[{ time: 10, label: "far" }], [{ time: 5.5, label: "near" }]], 1)
    expect(r.matched?.label).toBe("near")
  })
})

describe("snapping — segmentEdgeTargets", () => {
  it("emits start + end targets for every segment", () => {
    const out = segmentEdgeTargets([
      { id: "a", start: 0, duration: 2 },
      { id: "b", start: 5, duration: 3 },
    ])
    expect(out).toHaveLength(4)
    expect(out.map((t) => t.time)).toEqual([0, 2, 5, 8])
  })
  it("excludes the segment matching excludeId", () => {
    const out = segmentEdgeTargets(
      [{ id: "a", start: 0, duration: 2 }, { id: "b", start: 5, duration: 3 }],
      "a",
    )
    expect(out).toHaveLength(2)
    expect(out.every((t) => t.time >= 5)).toBe(true)
  })
  it("labels targets as 'segment start' / 'segment end' with priority 1", () => {
    const out = segmentEdgeTargets([{ id: "x", start: 1, duration: 2 }])
    expect(out[0].label).toBe("segment start")
    expect(out[1].label).toBe("segment end")
    expect(out[0].priority).toBe(1)
  })
  it("returns [] for an empty segments array", () => {
    expect(segmentEdgeTargets([])).toEqual([])
  })
})

describe("snapping — gridTargets", () => {
  it("emits a target every `grid` seconds from 0 up to maxTime", () => {
    const out = gridTargets(2, 8)
    expect(out.map((t) => t.time)).toEqual([0, 2, 4, 6, 8])
  })
  it("labels all targets as 'grid' with priority 0", () => {
    const out = gridTargets(5, 10)
    for (const t of out) {
      expect(t.label).toBe("grid")
      expect(t.priority).toBe(0)
    }
  })
  it("returns [] when grid <= 0", () => {
    expect(gridTargets(0, 10)).toEqual([])
    expect(gridTargets(-1, 10)).toEqual([])
  })
  it("includes maxTime when it lands exactly on a grid line (floating-point guard)", () => {
    const out = gridTargets(2.5, 10)
    expect(out.map((t) => t.time)).toEqual([0, 2.5, 5, 7.5, 10])
  })
  it("returns just [0] when maxTime is 0", () => {
    expect(gridTargets(2, 0).map((t) => t.time)).toEqual([0])
  })
  it("emits many targets for a very small grid value", () => {
    const out = gridTargets(0.1, 1)
    expect(out.length).toBe(11) // 0, 0.1, 0.2, ..., 1.0
    expect(out[0].time).toBe(0)
    expect(out[out.length - 1].time).toBeCloseTo(1, 5)
  })
  it("includes the last target when maxTime is just past a grid line (1e-6 guard)", () => {
    // grid=3, maxTime=9.0000005 → the loop's 1e-6 epsilon includes t=9.
    const out = gridTargets(3, 9 + 5e-7)
    expect(out.map((t) => t.time)).toContain(9)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// findSnap — additional edge cases
// ════════════════════════════════════════════════════════════════════════════
describe("snapping — findSnap edge cases", () => {
  it("default priority (undefined) is treated as 0 in tie-breaking", () => {
    const targets: SnapTarget[] = [
      { time: 5, label: "default" }, // priority undefined → 0
      { time: 5, label: "explicit-zero", priority: 0 },
    ]
    const r = findSnap(5, targets, 1)
    // Both have priority 0 and the same distance. The FIRST one encountered
    // wins because the `d < bestDist` strict check means ties only update
    // when priority is strictly higher.
    expect(r.matched?.label).toBe("default")
  })
  it("a closer low-priority target beats a farther high-priority target", () => {
    const targets: SnapTarget[] = [
      { time: 5.1, label: "close-low", priority: 0 },
      { time: 5.5, label: "far-high", priority: 10 },
    ]
    const r = findSnap(5, targets, 1)
    // Distance wins: |5.1-5| = 0.1 < |5.5-5| = 0.5.
    expect(r.matched?.label).toBe("close-low")
  })
  it("handles negative candidate times", () => {
    const r = findSnap(-1, [{ time: -0.5, label: "neg" }], 1)
    expect(r.time).toBe(-0.5)
    expect(r.matched?.label).toBe("neg")
  })
  it("very large threshold snaps to the closest target regardless of distance", () => {
    const r = findSnap(50, [{ time: 0, label: "origin" }, { time: 100, label: "century" }], 1000)
    expect(r.matched?.label).toBe("origin") // |0-50|=50 < |100-50|=50... tie! first wins
  })
  it("with threshold = Infinity, snaps to the closest target", () => {
    const r = findSnap(10, [{ time: 0, label: "a" }, { time: 12, label: "b" }], Infinity)
    expect(r.matched?.label).toBe("b") // |12-10|=2 < |0-10|=10
  })
  it("a target at exactly distance 0 (candidate === target.time) always matches", () => {
    const r = findSnap(5, [{ time: 5, label: "exact" }, { time: 5, label: "also-exact", priority: 5 }], 1)
    expect(r.matched?.label).toBe("also-exact") // same distance, higher priority wins
  })
  it("updates bestDist correctly when scanning in order (greedy improvement)", () => {
    // Targets are scanned in array order. A later target that is closer should
    // replace an earlier, farther one.
    const r = findSnap(5, [{ time: 6, label: "far" }, { time: 5.1, label: "close" }], 2)
    expect(r.matched?.label).toBe("close")
  })
  it("first target wins when two have identical distance AND identical priority", () => {
    const r = findSnap(5, [
      { time: 4, label: "first", priority: 1 },
      { time: 6, label: "second", priority: 1 },
    ], 2)
    // Both at distance 1, both priority 1. First scanned wins (strict < check).
    expect(r.matched?.label).toBe("first")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// snapTime — additional edge cases
// ════════════════════════════════════════════════════════════════════════════
describe("snapping — snapTime edge cases", () => {
  it("returns candidate unchanged when all sources are empty", () => {
    const r = snapTime(5, [[], []], 1)
    expect(r.time).toBe(5)
    expect(r.matched).toBeNull()
  })
  it("flattens mixed empty + non-empty sources", () => {
    const r = snapTime(5, [[], [{ time: 5.5, label: "only" }], []], 1)
    expect(r.matched?.label).toBe("only")
  })
  it("single-element nested array (one source with one target)", () => {
    const r = snapTime(5, [[{ time: 5, label: "solo" }]], 1)
    expect(r.time).toBe(5)
  })
  it("threshold = 0 returns candidate unchanged (no snap)", () => {
    const r = snapTime(5, [{ time: 5, label: "here" }], 0)
    expect(r.matched).toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// segmentEdgeTargets — additional edge cases
// ════════════════════════════════════════════════════════════════════════════
describe("snapping — segmentEdgeTargets edge cases", () => {
  it("excludeId that doesn't match any segment → all segments included", () => {
    const out = segmentEdgeTargets(
      [{ id: "a", start: 0, duration: 2 }],
      "nonexistent",
    )
    expect(out).toHaveLength(2)
  })
  it("segments with zero duration produce start === end at the same time", () => {
    const out = segmentEdgeTargets([{ id: "z", start: 5, duration: 0 }])
    expect(out).toHaveLength(2)
    expect(out[0].time).toBe(5) // start
    expect(out[1].time).toBe(5) // start + duration = 5
  })
  it("produces targets in segment order (not sorted by time)", () => {
    const out = segmentEdgeTargets([
      { id: "late", start: 10, duration: 2 },
      { id: "early", start: 0, duration: 1 },
    ])
    // Order follows the input array, not time sorting.
    expect(out.map((t) => t.time)).toEqual([10, 12, 0, 1])
  })
  it("handles a single segment", () => {
    const out = segmentEdgeTargets([{ id: "solo", start: 3, duration: 4 }])
    expect(out).toHaveLength(2)
    expect(out[0].time).toBe(3)
    expect(out[1].time).toBe(7)
  })
})
