// timelineStorePersist.spec.ts — the storyboard document (part 2):
// debounced persistence, blob strip/restore round-trips, storage-failure
// survival, catalog-seeded loads, and fresh-module environment arms.
// Runs on a FRESH module instance (per-file isolation), so the first test
// owns the empty-history bounds.
import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import {
  _persistRunCount,
  flushPersist,
  useTimelineStore,
} from "../store/timelineStore.ts";
import { primeCatalog } from "@melite/catalog";
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts";
import type { TimelineSegment } from "@melite/contracts";

// ── Fakes (same shape as the core spec; fresh tables per file) ─────────────
const lsData = new Map<string, string>();
let lsThrow: "get" | "set" | null = null;
let lsSets = 0;
(globalThis as Record<string, unknown>).localStorage = {
  getItem(k: string): string | null {
    if (lsThrow === "get") throw new Error("ls get boom");
    return lsData.has(k) ? (lsData.get(k) as string) : null;
  },
  setItem(k: string, v: string): void {
    if (lsThrow === "set") throw new Error("ls set boom");
    lsSets++;
    lsData.set(k, v);
  },
  removeItem(k: string): void {
    lsData.delete(k);
  },
  clear(): void {
    lsData.clear();
  },
};

type Req = {
  result: unknown;
  error: unknown;
  onsuccess: null | ((ev: unknown) => void);
  onerror: null | ((ev: unknown) => void);
};
type Tx = {
  objectStore: (name: string) => {
    put: (v: unknown, k: unknown) => void;
    get: (k: unknown) => Req;
    delete: (k: unknown) => void;
    clear: () => void;
  };
  oncomplete: null | (() => void);
  onerror: null | (() => void);
  error: unknown;
};
const idbTables = new Map<string, Map<unknown, unknown>>();
let idbMode: "ok" | "open-error" | "tx-error" | "get-error" = "ok";
function table(): Map<unknown, unknown> {
  let t = idbTables.get("blobs");
  if (!t) {
    t = new Map();
    idbTables.set("blobs", t);
  }
  return t;
}
function fireTx(tx: Tx): void {
  queueMicrotask(() => {
    if (idbMode === "tx-error") {
      tx.error = new Error("tx boom");
      tx.onerror?.();
    } else {
      tx.oncomplete?.();
    }
  });
}
function makeTx(): Tx {
  const tx: Tx = {
    objectStore: () => ({
      put: (v: unknown, k: unknown) => {
        if (idbMode !== "tx-error") table().set(k, v);
        fireTx(tx);
      },
      get: (k: unknown) => {
        const req: Req = { result: undefined, error: undefined, onsuccess: null, onerror: null };
        queueMicrotask(() => {
          if (idbMode === "get-error" || idbMode === "tx-error") {
            req.error = new Error("get boom");
            req.onerror?.({});
          } else {
            req.result = table().get(k);
            req.onsuccess?.({});
          }
        });
        return req;
      },
      delete: (k: unknown) => {
        table().delete(k);
        fireTx(tx);
      },
      clear: () => {
        table().clear();
        fireTx(tx);
      },
    }),
    oncomplete: null,
    onerror: null,
    error: undefined,
  };
  return tx;
}
(globalThis as Record<string, unknown>).indexedDB = {
  open: () => {
    const req: Req & { onupgradeneeded: null | ((ev: unknown) => void) } = {
      result: undefined,
      error: undefined,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    queueMicrotask(() => {
      if (idbMode === "open-error") {
        req.error = new Error("open boom");
        req.onerror?.({});
        return;
      }
      const db = {
        objectStoreNames: { contains: (n: string) => idbTables.has(n) },
        createObjectStore: (n: string) => {
          idbTables.set(n, new Map());
        },
        transaction: () => makeTx(),
      };
      req.result = db;
      req.onupgradeneeded?.({ target: req });
      req.result = db;
      req.onsuccess?.({});
    });
    return req;
  },
};

const S = () => useTimelineStore.getState();
const LS_KEY = "tech_noir_timeline";
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const runs = (): number => _persistRunCount;
async function cleanReset(): Promise<void> {
  S().reset();
  await sleep(0);
  lsData.clear();
  idbTables.clear();
}

afterEach(async () => {
  lsThrow = null;
  idbMode = "ok";
  await flushPersist();
});

// ── Fresh-module bounds (FIRST: history is empty, idx is -1) ───────────────
describe("empty history bounds", () => {
  it("undo/redo no-op on a fresh module and defaults hold", () => {
    S().undo();
    S().redo();
    assert.deepEqual(S().segments, []);
    assert.deepEqual(S().audioCues, []);
    assert.deepEqual(S().audioTracks, []);
    assert.deepEqual(S().viewport, { scrollX: 0, pixelsPerSecond: 60, canvasWidth: 1200, canvasHeight: 400 });
    assert.equal(S().timeFormat, "seconds");
    assert.deepEqual(S().playback, { isPlaying: false, currentTime: 0, totalDuration: 5, loopRegion: false });
    assert.equal(S().initialized, false);
  });
});

// ── debounce + flush ────────────────────────────────────────────────────────
describe("debounced persistence", () => {
  it("idle flush resolves without writing", async () => {
    await cleanReset();
    const sets = lsSets;
    await flushPersist();
    assert.equal(lsSets, sets);
  });
  it("coalesces rapid mutations into one write, then flushes", async () => {
    await cleanReset();
    const before = runs();
    S().addSegment({ prompt: "a" });
    S().addSegment({ prompt: "b" });
    S().updateSegment(S().segments[0]?.id as string, { prompt: "a2" });
    const sets = lsSets;
    await flushPersist();
    assert.equal(runs(), before + 1);
    assert.equal(lsSets, sets + 1);
    const meta = JSON.parse(lsData.get(LS_KEY) as string) as { segments: unknown[] };
    assert.equal(meta.segments.length, 2);
  });
  it("fires on the debounce timer without a flush", async () => {
    await cleanReset();
    const before = runs();
    S().addSegment({ prompt: "timer" });
    await sleep(380);
    assert.equal(runs(), before + 1);
    assert.ok((lsData.get(LS_KEY) as string).includes("timer"));
  });
  it("survives storage write failures (run still counts, flush resolves)", async () => {
    await cleanReset();
    S().addSegment({ prompt: "doomed" });
    const before = runs();
    lsThrow = "set";
    await flushPersist();
    lsThrow = null;
    assert.equal(runs(), before + 1);
    assert.equal(lsData.has(LS_KEY), false);
  });
  it("survives blob-store transaction failures (refs persist, blobs drop loudly)", async () => {
    await cleanReset();
    S().addSegment({ videoUrl: "data:video/mp4;base64,AAA" });
    // Sleep before restoring the mode so the floating blob-save chain
    // settles while transactions still fail.
    idbMode = "tx-error";
    await flushPersist();
    await sleep(10);
    idbMode = "ok";
    const meta = JSON.parse(lsData.get(LS_KEY) as string) as { segments: Array<{ videoUrl: string }> };
    assert.ok(meta.segments[0]?.videoUrl.startsWith("TLB:"));
  });
  it("a failed blob read aborts the load loudly (no partial state)", async () => {
    await cleanReset();
    lsData.set(
      LS_KEY,
      JSON.stringify({
        segments: [
          {
            id: "g1", order: 0, start: 0, duration: 5, prompt: "p", negativePrompt: "",
            thumbnailUrl: null, videoUrl: "TLB:g1_videoUrl", firstFrameB64: null, lastFrameB64: null,
            params: { ...DEFAULT_SEGMENT_PARAMS },
            trimStart: 0, sourceStepId: null, status: "empty", error: null,
            controlVideoUrl: null, lipSyncedVideoUrl: null, lipSyncPreferOriginal: false,
            promptBeats: [], keyframes: [],
          },
        ],
        audioCues: [],
        audioTracks: [],
        relayVideoUrl: null,
        relaySegmentIds: [],
        relayAssetId: null,
        globalConsistencyAnchor: null,
      }),
    );
    idbMode = "get-error";
    await S().initialize();
    await sleep(10);
    idbMode = "ok";
    // tlLoad's request-level rejection propagates to the load boundary
    // (its inner catch only covers setup failures like a dead open), so
    // the load refuses partial state and boots empty — loudly.
    assert.deepEqual(S().segments, []);
    assert.equal(S().initialized, true);
  });
  it("deletes blobs directly (ok + failing transactions)", async () => {
    await cleanReset();
    table().set("TLB:del-me", "data:video/mp4;base64,D");
    const { _tlDelete } = await import("../store/timelineStore.ts");
    await _tlDelete("TLB:del-me");
    assert.equal(table().has("TLB:del-me"), false);
    table().set("TLB:del-me2", "data:video/mp4;base64,D2");
    idbMode = "tx-error";
    await assert.rejects(_tlDelete("TLB:del-me2"));
    await sleep(10);
    idbMode = "ok";
  });
});

// ── blob round-trip ─────────────────────────────────────────────────────────
describe("blob strip/restore round-trip", () => {
  it("persists every blob field as a ref and restores every byte", async () => {
    await cleanReset();
    const seg = S().addSegment({
      videoUrl: "data:video/mp4;base64,VID",
      firstFrameB64: "data:image/png;base64,FIRST",
      lastFrameB64: "data:image/png;base64,LAST",
      thumbnailUrl: "data:image/png;base64,THUMB",
      controlVideoUrl: "data:video/mp4;base64,CTRL",
    });
    S().addVariant(seg.id, {
      id: "bv", seed: 1, videoUrl: "data:video/mp4;base64,VAR", thumbnailUrl: "data:image/png;base64,VARTH",
    });
    const track = S().addAudioTrack("M");
    S().addAudioCue({
      track: track.id, start: 0, duration: 2, label: "c",
      audioUrl: "data:audio/wav;base64,AUD", audioB64: "data:audio/wav;base64,AUD64",
      volume: 1, waveformPeaks: null, sourceStepId: null,
    });
    S().setRelayVideo("data:video/mp4;base64,RELAY", [seg.id], "ra");
    S().setGlobalConsistencyAnchor({ assetId: "g", b64: "data:image/png;base64,ANCH" });
    await flushPersist();
    // Every blob field left storage as a TLB: ref…
    const meta = JSON.parse(lsData.get(LS_KEY) as string) as {
      segments: Array<Record<string, unknown>>;
      audioCues: Array<Record<string, unknown>>;
      relayVideoUrl: string;
      globalConsistencyAnchor: { b64: string };
    };
    for (const f of ["videoUrl", "firstFrameB64", "lastFrameB64", "thumbnailUrl", "controlVideoUrl"]) {
      assert.ok(String(meta.segments[0]?.[f]).startsWith("TLB:"), f);
    }
    assert.ok(String(meta.relayVideoUrl).startsWith("TLB:"));
    assert.ok(meta.globalConsistencyAnchor.b64.startsWith("TLB:"));
    // …and a load restores every byte (snapshot fakes across the reset).
    const lsSnap = new Map(lsData);
    const idbSnap = new Map(table());
    await cleanReset();
    for (const [k, v] of lsSnap) lsData.set(k, v);
    for (const [k, v] of idbSnap) table().set(k, v);
    await S().initialize();
    const got = S().segments.find((s) => s.id === seg.id) as TimelineSegment;
    assert.equal(got.videoUrl, "data:video/mp4;base64,VID");
    assert.equal(got.firstFrameB64, "data:image/png;base64,FIRST");
    assert.equal(got.lastFrameB64, "data:image/png;base64,LAST");
    assert.equal(got.thumbnailUrl, "data:image/png;base64,THUMB");
    assert.equal(got.controlVideoUrl, "data:video/mp4;base64,CTRL");
    assert.equal(got.variants?.[0]?.videoUrl, "data:video/mp4;base64,VAR");
    assert.equal(got.variants?.[0]?.thumbnailUrl, "data:image/png;base64,VARTH");
    assert.equal(S().audioCues[0]?.audioUrl, "data:audio/wav;base64,AUD");
    assert.equal(S().audioCues[0]?.audioB64, "data:audio/wav;base64,AUD64");
    assert.equal(S().relayVideoUrl, "data:video/mp4;base64,RELAY");
    assert.deepEqual(S().globalConsistencyAnchor, { assetId: "g", b64: "data:image/png;base64,ANCH" });
  });
});

// ── catalog-seeded loads ────────────────────────────────────────────────────
describe("catalog-seeded model validation", () => {
  it("keeps a catalog-listed model, resets unknown + non-string ones", async () => {
    primeCatalog({
      families: {},
      models: { "wan-vace": { name: "wan" } },
      capabilities: null,
      engine_order: null,
      quant_order: null,
      input_vocabulary: null,
    } as never);
    await cleanReset();
    const mk = (id: string, model: unknown): string =>
      JSON.stringify({
        segments: [
          {
            id, order: 0, start: 0, duration: 5, prompt: "p", negativePrompt: "",
            thumbnailUrl: null, videoUrl: null, firstFrameB64: null, lastFrameB64: null,
            params: { ...DEFAULT_SEGMENT_PARAMS, model },
            trimStart: 0, sourceStepId: null, status: "empty", error: null,
            controlVideoUrl: null, lipSyncedVideoUrl: null, lipSyncPreferOriginal: false,
            promptBeats: [], keyframes: [],
          },
        ],
      });
    lsData.set(LS_KEY, mk("kept", "wan-vace"));
    await S().initialize();
    assert.equal((S().segments[0] as TimelineSegment).params.model, "wan-vace");
    await cleanReset();
    lsData.set(LS_KEY, mk("dropped", "stale-route"));
    await S().initialize();
    assert.equal((S().segments[0] as TimelineSegment).params.model, DEFAULT_SEGMENT_PARAMS.model);
    await cleanReset();
    lsData.set(LS_KEY, mk("nonstring", 42));
    await S().initialize();
    assert.equal((S().segments[0] as TimelineSegment).params.model, DEFAULT_SEGMENT_PARAMS.model);
  });
  it("resets models when the catalog has no model table", async () => {
    primeCatalog({ families: {} } as never);
    await cleanReset();
    lsData.set(
      LS_KEY,
      JSON.stringify({
        segments: [
          {
            id: "m", order: 0, start: 0, duration: 5, prompt: "p", negativePrompt: "",
            thumbnailUrl: null, videoUrl: null, firstFrameB64: null, lastFrameB64: null,
            params: { ...DEFAULT_SEGMENT_PARAMS, model: "wan-vace" },
            trimStart: 0, sourceStepId: null, status: "empty", error: null,
            controlVideoUrl: null, lipSyncedVideoUrl: null, lipSyncPreferOriginal: false,
            promptBeats: [], keyframes: [],
          },
        ],
      }),
    );
    await S().initialize();
    assert.equal((S().segments[0] as TimelineSegment).params.model, DEFAULT_SEGMENT_PARAMS.model);
  });
});

// ── fresh-module environment arms (LAST: they re-evaluate modules) ─────────
describe("fresh-module environment arms", () => {
  it("cold open failure rejects the shared handle (loud load + persist + reset)", async () => {
    // The shared IDB handle caches per module, so open-error is only real
    // on a cold module. Everything downstream must survive it loudly.
    idbMode = "open-error";
    vi.resetModules();
    const fresh = await import("../store/timelineStore.ts");
    lsData.set(
      LS_KEY,
      JSON.stringify({
        segments: [
          {
            id: "cold", order: 0, start: 0, duration: 5, prompt: "p", negativePrompt: "",
            thumbnailUrl: null, videoUrl: "TLB:cold_videoUrl", firstFrameB64: null, lastFrameB64: null,
            params: { ...DEFAULT_SEGMENT_PARAMS },
            trimStart: 0, sourceStepId: null, status: "empty", error: null,
            controlVideoUrl: null, lipSyncedVideoUrl: null, lipSyncPreferOriginal: false,
            promptBeats: [], keyframes: [],
          },
        ],
        audioCues: [],
        audioTracks: [],
        relayVideoUrl: null,
        relaySegmentIds: [],
        relayAssetId: null,
        globalConsistencyAnchor: null,
      }),
    );
    await fresh.useTimelineStore.getState().initialize();
    assert.equal(
      (fresh.useTimelineStore.getState().segments[0] as TimelineSegment).videoUrl,
      null,
    );
    fresh.useTimelineStore.getState().addSegment({ videoUrl: "data:video/mp4;base64,Z" });
    await fresh.flushPersist();
    fresh.useTimelineStore.getState().reset();
    await sleep(10);
    idbMode = "ok";
  });
  it("registers the beforeunload flush when window exists", async () => {
    const seen: Array<{ name: string; handler: () => void }> = [];
    vi.stubGlobal("window", {
      addEventListener: (name: string, handler: () => void) => {
        seen.push({ name, handler });
      },
    });
    vi.resetModules();
    await import("../store/timelineStore.ts");
    vi.unstubAllGlobals();
    const unload = seen.find((s) => s.name === "beforeunload");
    assert.ok(unload);
    // The handler flushes (nothing pending → resolves, no throw).
    unload?.handler();
    await sleep(0);
  });
  it("skips store creation on upgrade when the blob store exists", async () => {
    table().set("TLB:preexisting", "data:video/mp4;base64,PRE");
    vi.resetModules();
    const fresh = await import("../store/timelineStore.ts");
    // The pre-seeded table survived (createObjectStore skipped).
    assert.equal(table().get("TLB:preexisting"), "data:video/mp4;base64,PRE");
    const added = fresh.useTimelineStore.getState().addSegment({ videoUrl: "data:video/mp4;base64,NEW" });
    await fresh.flushPersist();
    const stored = JSON.parse(lsData.get(LS_KEY) as string) as { segments: Array<{ videoUrl: string }> };
    const row = stored.segments.find((s) => s.videoUrl.includes("var_") || s.videoUrl.startsWith("TLB:"));
    assert.ok(row?.videoUrl.startsWith("TLB:"));
    assert.equal(table().get(row?.videoUrl), "data:video/mp4;base64,NEW");
    assert.ok(added.id.length > 0);
  });
});
