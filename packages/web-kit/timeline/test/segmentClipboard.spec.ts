// segmentClipboard.spec.ts — the transient params clipboard: snapshot,
// fresh-patch paste, empty guards, clear.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  clearSegmentClipboard,
  copySegmentParams,
  getSegmentClipboard,
  hasSegmentClipboard,
  pasteParamsInto,
} from "../src/store/segmentClipboard.ts";
import type { TimelineSegment } from "@melite/contracts";

function seg(over: Partial<TimelineSegment> = {}): TimelineSegment {
  return {
    id: "seg_1_x",
    order: 0,
    start: 0,
    duration: 5,
    prompt: "a neon street",
    negativePrompt: "blurry",
    thumbnailUrl: null,
    videoUrl: null,
    firstFrameB64: null,
    lastFrameB64: null,
    params: { seed: 7 } as TimelineSegment["params"],
    trimStart: 0,
    sourceStepId: null,
    status: "empty",
    error: null,
    controlVideoUrl: null,
    lipSyncedVideoUrl: null,
    lipSyncPreferOriginal: false,
    ...over,
  } as TimelineSegment;
}

describe("empty clipboard", () => {
  it("starts empty (fresh module)", () => {
    assert.equal(getSegmentClipboard(), null);
    assert.equal(hasSegmentClipboard(), false);
    assert.equal(pasteParamsInto(seg()), null);
  });
});

describe("copySegmentParams", () => {
  it("snapshots params + prompts + source id", () => {
    const s = seg();
    const snap = copySegmentParams(s);
    assert.equal(snap.prompt, "a neon street");
    assert.equal(snap.negativePrompt, "blurry");
    assert.equal(snap.sourceId, "seg_1_x");
    assert.equal(typeof snap.copiedAt, "number");
    assert.deepEqual(snap.params, { seed: 7 });
    assert.equal(hasSegmentClipboard(), true);
    assert.equal(getSegmentClipboard(), snap);
  });
  it("defensively copies params (later source edits do not leak)", () => {
    const s = seg();
    const snap = copySegmentParams(s);
    (s.params as { seed: number }).seed = 999;
    assert.equal(snap.params.seed, 7);
  });
});

describe("pasteParamsInto", () => {
  it("returns a fresh patch each call (safe to mutate)", () => {
    copySegmentParams(seg());
    const target = seg({ id: "seg_2_y" });
    const a = pasteParamsInto(target);
    const b = pasteParamsInto(target);
    assert.ok(a && b);
    assert.notEqual(a, b);
    assert.notEqual(a.params, b.params);
    assert.deepEqual(a, {
      params: { seed: 7 },
      prompt: "a neon street",
      negativePrompt: "blurry",
    });
    a.prompt = "mutated";
    (a.params as { seed: number }).seed = -1;
    assert.equal(b.prompt, "a neon street");
    assert.equal((b.params as { seed: number }).seed, 7);
  });
});

describe("clearSegmentClipboard", () => {
  it("empties the clipboard", () => {
    copySegmentParams(seg());
    assert.equal(hasSegmentClipboard(), true);
    clearSegmentClipboard();
    assert.equal(hasSegmentClipboard(), false);
    assert.equal(getSegmentClipboard(), null);
    assert.equal(pasteParamsInto(seg()), null);
  });
});
