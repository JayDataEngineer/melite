// snapping.spec.ts — magnetic snapping: closest-target wins, priority
// breaks ties, threshold gates, edge/grid target builders.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  findSnap,
  gridTargets,
  segmentEdgeTargets,
  snapTime,
} from "../src/snapping.ts";
import type { SnapTarget } from "../src/snapping.ts";

describe("findSnap", () => {
  it("returns the candidate unmatched when targets are empty", () => {
    assert.deepEqual(findSnap(3.5, [], 0.5), { time: 3.5, matched: null });
  });
  it("returns the candidate unmatched when the threshold is zero", () => {
    const targets: SnapTarget[] = [{ time: 3.5, label: "edge" }];
    assert.deepEqual(findSnap(3.5, targets, 0), { time: 3.5, matched: null });
  });
  it("returns the candidate unmatched when the threshold is negative", () => {
    const targets: SnapTarget[] = [{ time: 3.5, label: "edge" }];
    assert.deepEqual(findSnap(3.5, targets, -1), { time: 3.5, matched: null });
  });
  it("returns the candidate unmatched when nothing is within threshold", () => {
    const targets: SnapTarget[] = [{ time: 10, label: "far" }];
    assert.deepEqual(findSnap(1, targets, 0.5), { time: 1, matched: null });
  });
  it("snaps to an exact target", () => {
    const target: SnapTarget = { time: 2, label: "edge" };
    assert.deepEqual(findSnap(2, [target], 0.5), { time: 2, matched: target });
  });
  it("snaps to the closest target within threshold", () => {
    const near: SnapTarget = { time: 1.1, label: "near" };
    const far: SnapTarget = { time: 1.4, label: "far" };
    assert.deepEqual(findSnap(1, [far, near], 0.5), { time: 1.1, matched: near });
  });
  it("a strictly closer target wins regardless of priority", () => {
    const close: SnapTarget = { time: 1.05, label: "close", priority: 0 };
    const loud: SnapTarget = { time: 1.4, label: "loud", priority: 99 };
    assert.deepEqual(findSnap(1, [loud, close], 0.5), { time: 1.05, matched: close });
  });
  it("higher priority wins an exact distance tie", () => {
    const low: SnapTarget = { time: 0.8, label: "low", priority: 1 };
    const high: SnapTarget = { time: 1.2, label: "high", priority: 5 };
    assert.deepEqual(findSnap(1, [low, high], 0.5), { time: 1.2, matched: high });
  });
  it("the first target wins a full tie (same distance, default priority)", () => {
    const first: SnapTarget = { time: 0.8, label: "first" };
    const second: SnapTarget = { time: 1.2, label: "second" };
    assert.deepEqual(findSnap(1, [first, second], 0.5), { time: 0.8, matched: first });
  });
  it("an explicit priority beats an omitted (default 0) priority on a tie", () => {
    const plain: SnapTarget = { time: 0.8, label: "plain" };
    const prio: SnapTarget = { time: 1.2, label: "prio", priority: 2 };
    assert.deepEqual(findSnap(1, [plain, prio], 0.5), { time: 1.2, matched: prio });
  });
  it("a target exactly at the threshold boundary still snaps", () => {
    const target: SnapTarget = { time: 1.5, label: "edge" };
    assert.deepEqual(findSnap(1, [target], 0.5), { time: 1.5, matched: target });
  });
});

describe("snapTime", () => {
  it("snaps against a flat source list", () => {
    const targets: SnapTarget[] = [{ time: 4.1, label: "playhead" }];
    const got = snapTime(4, targets, 0.5);
    assert.equal(got.time, 4.1);
    assert.equal(got.matched?.label, "playhead");
  });
  it("merges nested source lists and picks the single closest", () => {
    const sources: SnapTarget[][] = [
      [{ time: 4.4, label: "grid" }],
      [{ time: 4.1, label: "edge" }],
    ];
    const got = snapTime(4, sources, 0.5);
    assert.equal(got.time, 4.1);
    assert.equal(got.matched?.label, "edge");
  });
  it("returns unmatched for an empty source list", () => {
    assert.deepEqual(snapTime(4, [], 0.5), { time: 4, matched: null });
  });
});

describe("segmentEdgeTargets", () => {
  it("emits start + end targets per segment with priority 1", () => {
    const got = segmentEdgeTargets([{ id: "a", start: 2, duration: 3 }]);
    assert.deepEqual(got, [
      { time: 2, label: "segment start", priority: 1 },
      { time: 5, label: "segment end", priority: 1 },
    ]);
  });
  it("skips the excluded segment", () => {
    const got = segmentEdgeTargets(
      [
        { id: "a", start: 0, duration: 1 },
        { id: "b", start: 5, duration: 1 },
      ],
      "a",
    );
    assert.deepEqual(got, [
      { time: 5, label: "segment start", priority: 1 },
      { time: 6, label: "segment end", priority: 1 },
    ]);
  });
  it("returns no targets for no segments", () => {
    assert.deepEqual(segmentEdgeTargets([]), []);
  });
});

describe("gridTargets", () => {
  it("returns no targets for a zero grid", () => {
    assert.deepEqual(gridTargets(0, 10), []);
  });
  it("returns no targets for a negative grid", () => {
    assert.deepEqual(gridTargets(-1, 10), []);
  });
  it("builds grid marks up to maxTime", () => {
    assert.deepEqual(gridTargets(2, 4), [
      { time: 0, label: "grid", priority: 0 },
      { time: 2, label: "grid", priority: 0 },
      { time: 4, label: "grid", priority: 0 },
    ]);
  });
  it("emits a single mark when maxTime is zero", () => {
    assert.deepEqual(gridTargets(1, 0), [{ time: 0, label: "grid", priority: 0 }]);
  });
});
