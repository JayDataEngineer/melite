// interactions.spec.ts — the viser interaction reducer: every drag seam
// opens clean (resets the rest) and stopAll returns to rest.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  initialInteractionState,
  interactionReducer,
} from "../src/timeline/viser-timeline/interactions.ts";
import type {
  InteractionAction,
  InteractionState,
} from "../src/timeline/viser-timeline/interactions.ts";

function reduce(action: InteractionAction, from: InteractionState = initialInteractionState): InteractionState {
  return interactionReducer(from, action);
}

describe("initialInteractionState", () => {
  it("is fully at rest", () => {
    assert.deepEqual(initialInteractionState, {
      isDraggingCursor: false,
      draggedKeyframe: null,
      intervalDrag: null,
      draggedInterval: null,
      resizingInterval: null,
      resizingPrompt: null,
      draggingIntersection: null,
    });
  });
});

describe("interactionReducer", () => {
  it("startCursorDrag raises the cursor flag from rest", () => {
    const next = reduce({ type: "startCursorDrag" });
    assert.equal(next.isDraggingCursor, true);
    assert.equal(next.draggedKeyframe, null);
  });
  it("startKeyframeDrag carries the payload", () => {
    const payload = { uuid: "k1", trackId: "t1", initialFrame: 12 };
    const next = reduce({ type: "startKeyframeDrag", payload });
    assert.deepEqual(next.draggedKeyframe, payload);
    assert.equal(next.isDraggingCursor, false);
  });
  it("startIntervalDrag sets the drag box", () => {
    const payload = { trackId: "t1", startFrame: 1, endFrame: 9 };
    assert.deepEqual(reduce({ type: "startIntervalDrag", payload }).intervalDrag, payload);
  });
  it("updateIntervalDrag patches in place (keeps other seams)", () => {
    const from: InteractionState = {
      ...initialInteractionState,
      isDraggingCursor: true,
      intervalDrag: { trackId: "t1", startFrame: 1, endFrame: 9 },
    };
    const payload = { trackId: "t1", startFrame: 2, endFrame: 10 };
    const next = reduce({ type: "updateIntervalDrag", payload }, from);
    assert.deepEqual(next.intervalDrag, payload);
    assert.equal(next.isDraggingCursor, true);
  });
  it("startIntervalMove carries the payload", () => {
    const payload = {
      uuid: "i1",
      trackId: "t1",
      originalStartFrame: 3,
      originalEndFrame: 8,
      clickOffsetFrames: 1,
    };
    assert.deepEqual(reduce({ type: "startIntervalMove", payload }).draggedInterval, payload);
  });
  it("startIntervalResize + updateIntervalResize", () => {
    const start = {
      uuid: "i1",
      trackId: "t1",
      edge: "right" as const,
      originalStartFrame: 3,
      originalEndFrame: 8,
    };
    const update = { ...start, edge: "left" as const };
    const s0 = reduce({ type: "startIntervalResize", payload: start });
    assert.deepEqual(s0.resizingInterval, start);
    const s1 = reduce({ type: "updateIntervalResize", payload: update }, s0);
    assert.deepEqual(s1.resizingInterval, update);
  });
  it("startPromptResize + updatePromptResize", () => {
    const start = { uuid: "p1", edge: "left" as const, originalStartFrame: 0, originalEndFrame: 30 };
    const update = { ...start, originalEndFrame: 40 };
    const s0 = reduce({ type: "startPromptResize", payload: start });
    assert.deepEqual(s0.resizingPrompt, start);
    assert.deepEqual(
      reduce({ type: "updatePromptResize", payload: update }, s0).resizingPrompt,
      update,
    );
  });
  it("startIntersectionDrag carries the chain payload", () => {
    const payload = {
      leftPromptId: "a",
      rightPromptId: "b",
      originalFrame: 30,
      leftOriginalStart: 0,
      rightChain: [{ uuid: "b", originalStart: 30, originalEnd: 60 }],
      rightChainMinStart: 30,
      rightChainMaxEnd: 60,
    };
    assert.deepEqual(
      reduce({ type: "startIntersectionDrag", payload }).draggingIntersection,
      payload,
    );
  });
  it("a new seam resets the previous one (single-gesture invariant)", () => {
    const dragging = reduce({
      type: "startKeyframeDrag",
      payload: { uuid: "k1", trackId: "t1" },
    });
    const next = reduce({ type: "startCursorDrag" }, dragging);
    assert.equal(next.isDraggingCursor, true);
    assert.equal(next.draggedKeyframe, null);
  });
  it("stopAll returns to rest", () => {
    const dragging = reduce({
      type: "startIntervalDrag",
      payload: { trackId: "t1", startFrame: 1, endFrame: 9 },
    });
    assert.deepEqual(reduce({ type: "stopAll" }, dragging), initialInteractionState);
  });
  it("unknown actions leave state untouched (exhaustive-switch guard)", () => {
    const from = reduce({ type: "startCursorDrag" });
    assert.equal(reduce({ type: "nope" } as unknown as InteractionAction, from), from);
  });
});
