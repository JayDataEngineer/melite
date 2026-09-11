// barrels.spec.ts — the four public seams re-export every symbol they
// promise (and the store seam self-hydrates on first import).
//
// NOTE: every import below is dynamic and runs AFTER the fakes. The hook
// (playback/useAudioPlayback.ts) pulls ../store at module scope, and the
// store seam self-hydrates at import time — static imports would fire
// that hydration before the fakes exist.
import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";

// Fakes for the store seam's self-hydration (runs at import time).
const lsData = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string): string | null => (lsData.has(k) ? (lsData.get(k) as string) : null),
  setItem: (k: string, v: string): void => {
    lsData.set(k, v);
  },
  removeItem: (k: string): void => {
    lsData.delete(k);
  },
  clear: (): void => {
    lsData.clear();
  },
};
(globalThis as Record<string, unknown>).indexedDB = {
  open: () => {
    const req: {
      result: unknown;
      error: unknown;
      onsuccess: null | ((ev: unknown) => void);
      onerror: null | ((ev: unknown) => void);
      onupgradeneeded: null | ((ev: unknown) => void);
    } = { result: undefined, error: undefined, onsuccess: null, onerror: null, onupgradeneeded: null };
    queueMicrotask(() => {
      const db = {
        objectStoreNames: { contains: () => true },
        createObjectStore: () => {},
        transaction: () => ({
          objectStore: () => ({
            put: () => {},
            get: () => {
              const g: typeof req = { result: undefined, error: undefined, onsuccess: null, onerror: null, onupgradeneeded: null };
              queueMicrotask(() => g.onsuccess?.({}));
              return g;
            },
            delete: () => {},
            clear: () => {},
          }),
          oncomplete: null,
          onerror: null,
          error: undefined,
        }),
      };
      req.result = db;
      req.onupgradeneeded?.({ target: req });
      req.result = db;
      req.onsuccess?.({});
    });
    return req;
  },
};

describe("playback seam", () => {
  it("re-exports the hook module's surface", async () => {
    const playback = await import("../playback/index.ts");
    const hook = await import("../playback/useAudioPlayback.ts");
    assert.equal(playback.useAudioPlayback, hook.useAudioPlayback);
    assert.equal(typeof playback.useAudioPlayback, "function");
    assert.equal(playback.scheduleFadeAutomation, hook.scheduleFadeAutomation);
  });
});

describe("store seam", () => {
  it("re-exports the document + clipboard and hydrates itself", async () => {
    // Fresh module so the self-hydration genuinely runs (with fakes).
    vi.resetModules();
    const store = await import("../store/index.ts");
    assert.ok(store.useTimelineStore);
    assert.equal(typeof store.useTimelineStore.getState().addSegment, "function");
    assert.equal(typeof store.copySegmentParams, "function");
    assert.equal(typeof store.clearSegmentClipboard, "function");
    assert.equal(typeof store.flushPersist, "function");
    assert.ok(store.timelineReady instanceof Promise);
    await store.timelineReady;
    assert.equal(store.useTimelineStore.getState().initialized, true);
  });
});

describe("timeline seam", () => {
  it("re-exports the bar, the viser timeline, and the palette", async () => {
    const timeline = await import("../timeline/index.ts");
    const { MotionTimelineBar: directBar } = await import("../timeline/MotionTimelineBar.tsx");
    const { Timeline: directTimeline } = await import("../timeline/viser-timeline/Timeline.tsx");
    const motionState = await import("../timeline/viser-timeline/motionTimelineState.ts");
    const { PROMPT_COLORS: directColors } = await import("../timeline/viser-timeline/styles.ts");
    assert.equal(timeline.MotionTimelineBar, directBar);
    assert.ok(timeline.MotionTimelineBar);
    assert.equal(timeline.Timeline, directTimeline);
    assert.equal(timeline.buildMotionTimelineState, motionState.buildMotionTimelineState);
    assert.equal(timeline.MOTION_TIMELINE_TRACKS, motionState.MOTION_TIMELINE_TRACKS);
    assert.equal(timeline.PROMPT_COLORS, directColors);
  });
});

describe("viser seam", () => {
  it("re-exports the component, state builders, and palette", async () => {
    const viser = await import("../timeline/viser-timeline/index.ts");
    const { Timeline: directTimeline } = await import("../timeline/viser-timeline/Timeline.tsx");
    const motionState = await import("../timeline/viser-timeline/motionTimelineState.ts");
    assert.equal(viser.Timeline, directTimeline);
    assert.equal(viser.buildMotionTimelineState, motionState.buildMotionTimelineState);
    assert.equal(viser.makeTimelineId, motionState.makeTimelineId);
    assert.equal(viser.MOTION_TIMELINE_TRACKS, motionState.MOTION_TIMELINE_TRACKS);
  });
});
