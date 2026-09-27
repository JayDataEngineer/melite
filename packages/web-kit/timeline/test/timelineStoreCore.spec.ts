// timelineStoreCore.spec.ts — the storyboard document (part 1): load
// migration, segment/variant CRUD, locks/groups, audio, edits, selection,
// markers, undo/redo, import/export. Persistence machinery + catalog-seeded
// loads live in timelineStorePersist.spec.ts (fresh module state per file).
import { DEFAULT_SEGMENT_PARAMS } from '../../contracts/src/timelineTypes.ts'
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  flushPersist,
  useTimelineStore,
} from "../store/timelineStore.ts";
import { clearSegmentClipboard } from "../store/segmentClipboard.ts";
import type {
  AudioCue,
  TimelineSegment,
} from "@melite/contracts";

// ── Fakes (module body runs after the static import above, which touches
// no DOM at import time; every store DOM touch reads these at CALL time).
const lsData = new Map<string, string>();
let lsThrow: "get" | "set" | null = null;
(globalThis as Record<string, unknown>).localStorage = {
  getItem(k: string): string | null {
    if (lsThrow === "get") throw new Error("ls get boom");
    return lsData.has(k) ? (lsData.get(k) as string) : null;
  },
  setItem(k: string, v: string): void {
    if (lsThrow === "set") throw new Error("ls set boom");
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
// The fake object-store tables, exposed so tests can pre-seed blobs.
export const idbTables = new Map<string, Map<unknown, unknown>>();
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

// reset() clears the store + localStorage synchronously but its IndexedDB
// wipe floats (tlClearAll is fire-and-forget by design). Drain a macrotask
// before seeding fakes so blob pre-seeds cannot lose a race with it.
async function cleanReset(): Promise<void> {
  S().reset();
  await sleep(0);
  lsData.clear();
  idbTables.clear();
}

function seedStorage(raw: string): void {
  lsData.set(LS_KEY, raw);
}
function mkSeg(over: Record<string, unknown> = {}): TimelineSegment {
  return {
    id: "raw-1",
    order: 0,
    start: 0,
    duration: 5,
    prompt: "p",
    negativePrompt: "n",
    thumbnailUrl: null,
    videoUrl: null,
    firstFrameB64: null,
    lastFrameB64: null,
    params: { ...DEFAULT_SEGMENT_PARAMS },
    trimStart: 0,
    sourceStepId: null,
    status: "empty",
    error: null,
    controlVideoUrl: null,
    lipSyncedVideoUrl: null,
    lipSyncPreferOriginal: false,
    promptBeats: [],
    keyframes: [],
    ...over,
  } as unknown as TimelineSegment;
}
function mkCue(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    track: "t1",
    start: 0,
    duration: 2,
    label: "c",
    audioUrl: null,
    audioB64: null,
    volume: 1,
    waveformPeaks: null,
    sourceStepId: null,
    ...over,
  };
}

afterEach(async () => {
  lsThrow = null;
  idbMode = "ok";
  await flushPersist();
});

// ── initialize / load migration (null catalog: every model resets) ─────────
describe("initialize with no persisted state", () => {
  it("boots empty on fresh storage, then early-returns while initialized", async () => {
    await cleanReset();
    await S().initialize();
    assert.equal(S().initialized, true);
    assert.deepEqual(S().segments, []);
    await S().initialize();
    assert.equal(S().initialized, true);
  });
  it("treats missing segments / garbage JSON / storage errors as no state", async () => {
    await cleanReset();
    seedStorage("{}");
    await S().initialize();
    assert.equal(S().initialized, true);
    assert.deepEqual(S().segments, []);
    await cleanReset();
    seedStorage("not-json{");
    await S().initialize();
    assert.deepEqual(S().segments, []);
    await cleanReset();
    lsThrow = "get";
    await S().initialize();
    assert.deepEqual(S().segments, []);
    lsThrow = null;
  });
});

describe("load migration", () => {
  it("restores ids, bumps the uid counter, and resets models without a catalog", async () => {
    await cleanReset();
    table().set("TLB:seg_custom-old_videoUrl", "data:video/mp4;base64,AAA");
    table().set("TLB:var_v1_videoUrl", "data:video/mp4;base64,VVV");
    table().set("TLB:cue_seg_20_b_audioUrl", "data:audio/wav;base64,CCC");
    table().set("TLB:relay_video", "data:video/mp4;base64,RRR");
    table().set("TLB:anchor_global", "data:image/png;base64,GGG");
    // The legacy segment ships WITHOUT the Phase-11/14 fields so the
    // backfills genuinely run (not just echo fixture arrays).
    const legacy = {
      ...mkSeg({ id: "custom-old", status: "error" }),
      params: {
        guidePhases: [1],
        epsilon: 0.5,
        cameraPanX: 3,
        enhancePrompt: true,
        progressiveMode: "bogus",
      },
      thumbnailUrl: "http://x/y.png",
      videoUrl: "data:video/mp4;base64,AAA",
      controlVideoUrl: "TLB:seg_custom-old_controlVideoUrl",
      lipSyncedVideoUrl: 42,
      variants: [
        { id: "v1", seed: 1, videoUrl: "TLB:var_v1_videoUrl", createdAt: 5, thumbnailUrl: "TLB:var_v1_thumb" },
        // Dangling variant ref: the loader keeps the ref, not null.
        { id: "v2", seed: 2, videoUrl: "TLB:var_v2_videoUrl", createdAt: 6, thumbnailUrl: null },
        // Plain urls skip the blob reader entirely.
        { id: "v3", seed: 3, videoUrl: "http://v3-plain", createdAt: 7, thumbnailUrl: null },
      ],
    } as Record<string, unknown>;
    delete legacy.promptBeats;
    delete legacy.keyframes;
    delete legacy.lipSyncPreferOriginal;
    seedStorage(
      JSON.stringify({
        segments: [
          {
            ...mkSeg({ id: "seg_9_a", status: "ready" }),
            params: { ...DEFAULT_SEGMENT_PARAMS, model: "whatever-persisted" },
          },
          legacy,
          mkSeg({ id: "s-lip", lipSyncedVideoUrl: "http://lip.mp4" }),
        ],
        audioCues: [{ ...mkCue({ id: "seg_20_b" }), audioUrl: "TLB:cue_seg_20_b_audioUrl", audioB64: "TLB:cue_dangling" }],
        audioTracks: [{ id: "custom-track", label: "T", color: "#fff", height: 48 }],
        relayVideoUrl: "TLB:relay_video",
        relaySegmentIds: ["seg_9_a"],
        relayAssetId: "a1",
        globalConsistencyAnchor: { assetId: "g", b64: "TLB:anchor_global" },
      }),
    );
    await S().initialize();
    assert.equal(S().segments.length, 3);
    // Custom + seg_N ids both restore; the cue's seg_20 id wins the counter.
    const added = S().addSegment();
    assert.ok(added.id.startsWith("seg_21_"), added.id);
    const modern = S().segments.find((s) => s.id === "seg_9_a") as TimelineSegment;
    assert.equal(modern.status, "ready");
    assert.equal(modern.params.model, DEFAULT_SEGMENT_PARAMS.model);
    const old = S().segments.find((s) => s.id === "custom-old") as TimelineSegment;
    // Out-of-union status normalizes; stale LTX keys are dropped.
    assert.equal(old.status, "empty");
    assert.ok(!("guidePhases" in old.params) && !("epsilon" in old.params));
    // VACE backfills land on defaults; the bogus enum resets, valid kept.
    assert.equal(old.params.profile, DEFAULT_SEGMENT_PARAMS.profile);
    assert.equal(old.params.progressiveMode, DEFAULT_SEGMENT_PARAMS.progressiveMode);
    assert.deepEqual(old.params.loras, DEFAULT_SEGMENT_PARAMS.loras);
    assert.equal(old.params.relayEpsilon, 0.01);
    assert.equal(old.params.guideStrength, 1.0);
    assert.equal(old.params.guideCrf, 0);
    // Lip-sync backfills: number → null, missing flag → false, string kept.
    assert.equal(old.lipSyncedVideoUrl, null);
    assert.equal(old.lipSyncPreferOriginal, false);
    assert.equal((S().segments.find((s) => s.id === "s-lip") as TimelineSegment).lipSyncedVideoUrl, "http://lip.mp4");
    assert.deepEqual(old.promptBeats, []);
    assert.deepEqual(old.keyframes, []);
    // Blobs: present refs restore, dangling refs null out (fields) or
    // keep the ref (variant thumbnail + audioB64 fallbacks).
    assert.equal(old.videoUrl, "data:video/mp4;base64,AAA");
    assert.equal(old.thumbnailUrl, "http://x/y.png");
    assert.equal(old.controlVideoUrl, null);
    assert.equal(old.variants?.[0]?.videoUrl, "data:video/mp4;base64,VVV");
    assert.equal(old.variants?.[0]?.thumbnailUrl, "TLB:var_v1_thumb");
    assert.equal(old.variants?.[1]?.videoUrl, "TLB:var_v2_videoUrl");
    assert.equal(old.variants?.[2]?.videoUrl, "http://v3-plain");
    const cue = S().audioCues.find((c) => c.id === "seg_20_b") as AudioCue;
    assert.equal(cue.audioUrl, "data:audio/wav;base64,CCC");
    assert.equal(cue.audioB64, null);
    assert.equal(S().relayVideoUrl, "data:video/mp4;base64,RRR");
    assert.deepEqual(S().relaySegmentIds, ["seg_9_a"]);
    assert.equal(S().relayAssetId, "a1");
    assert.deepEqual(S().globalConsistencyAnchor, { assetId: "g", b64: "data:image/png;base64,GGG" });
    assert.ok(S().playback.totalDuration > 0);
  });
  it("keeps valid persisted enums + direct anchors/relays, nulls the rest", async () => {
    await cleanReset();
    seedStorage(
      JSON.stringify({
        segments: [
          {
            ...mkSeg({ id: "e1" }),
            params: { ...DEFAULT_SEGMENT_PARAMS, progressiveMode: "dct_rewind", model: DEFAULT_SEGMENT_PARAMS.model },
          },
        ],
        // Plain (non-ref) cue urls pass through untouched.
        audioCues: [{ ...mkCue({ id: "plain-c" }), audioUrl: "http://a.mp3", audioB64: null }],
        relayVideoUrl: "http://relay.mp4",
        globalConsistencyAnchor: { assetId: "g", b64: "data:image/png;base64,ZZ" },
      }),
    );
    await S().initialize();
    const seg = S().segments[0] as TimelineSegment;
    assert.equal(seg.params.progressiveMode, "dct_rewind");
    assert.equal(S().audioCues.find((c) => c.id === "plain-c")?.audioUrl, "http://a.mp3");
    assert.equal(S().relayVideoUrl, "http://relay.mp4");
    assert.deepEqual(S().relaySegmentIds, []);
    assert.equal(S().relayAssetId, null);
    assert.deepEqual(S().globalConsistencyAnchor, { assetId: "g", b64: "data:image/png;base64,ZZ" });
    // A dangling anchor ref is kept as-is (the loader only swaps in blobs
    // it can actually read).
    await cleanReset();
    seedStorage(
      JSON.stringify({
        segments: [mkSeg({ id: "e2" })],
        globalConsistencyAnchor: { assetId: "g", b64: "TLB:dangling-anchor" },
      }),
    );
    await S().initialize();
    assert.deepEqual(S().globalConsistencyAnchor, { assetId: "g", b64: "TLB:dangling-anchor" });
    await cleanReset();
    seedStorage(JSON.stringify({ segments: [mkSeg({ id: "e3" })] }));
    await S().initialize();
    assert.equal(S().relayVideoUrl, null);
    assert.equal(S().globalConsistencyAnchor, null);
  });
  // NOTE: IDB failure arms (read-request rejection aborts the load loudly;
  // open failure degrades to field-level nulls) live in
  // timelineStorePersist.spec.ts, which owns a cold module + sleep-settled
  // failure injection. An open-error mode here would be vacuous: the
  // shared handle is cached-open, so open is never re-called.
});

// ── segments ────────────────────────────────────────────────────────────────
describe("segments", () => {
  it("adds with defaults derived from order", () => {
    S().reset();
    const a = S().addSegment();
    const b = S().addSegment({ prompt: "hi" });
    assert.equal(a.order, 0);
    assert.equal(a.start, 0);
    assert.equal(a.duration, 5);
    assert.equal(a.status, "empty");
    assert.deepEqual(a.promptBeats, []);
    assert.equal(b.order, 1);
    assert.equal(b.start, 5);
    assert.equal(b.prompt, "hi");
    assert.equal(S().playback.totalDuration, 10);
  });
  it("updates, reorders (unknown ids dropped), and removes", () => {
    S().reset();
    const a = S().addSegment();
    const b = S().addSegment();
    S().updateSegment(a.id, { prompt: "edited" });
    assert.equal(S().segments.find((s) => s.id === a.id)?.prompt, "edited");
    S().reorderSegments(["ghost", b.id, a.id]);
    assert.deepEqual(S().segments.map((s) => s.id), [b.id, a.id]);
    assert.deepEqual(S().segments.map((s) => s.start), [0, 5]);
    S().removeSegment("ghost");
    assert.equal(S().segments.length, 2);
    S().removeSegment(a.id);
    assert.deepEqual(S().segments.map((s) => s.id), [b.id]);
    assert.equal(S().segments[0]?.order, 0);
  });
  it("refuses to remove locked segments; removal clears relay + selection", () => {
    S().reset();
    const a = S().addSegment();
    const b = S().addSegment();
    S().toggleSegmentLock(a.id);
    S().removeSegment(a.id);
    assert.ok(S().segments.some((s) => s.id === a.id));
    S().setSelectedSegment(a.id);
    S().setRelayVideo("http://r", [a.id], "asset-1");
    S().toggleSegmentLock(a.id);
    S().removeSegment(a.id);
    assert.ok(!S().segments.some((s) => s.id === a.id));
    assert.equal(S().selectedSegmentId, null);
    assert.ok(!S().selectedSegmentIds.has(a.id));
    assert.equal(S().relayVideoUrl, null);
    assert.deepEqual(S().relaySegmentIds, []);
    void b;
  });
});

// ── variants ────────────────────────────────────────────────────────────────
describe("variants", () => {
  it("addVariant rejects unknown segments and mints missing fields", () => {
    S().reset();
    assert.equal(S().addVariant("ghost", { seed: 1, videoUrl: "http://v" }), null);
    const seg = S().addSegment();
    const v = S().addVariant(seg.id, { seed: 1, videoUrl: "http://v" });
    assert.ok(v && v.id.length > 0);
    assert.equal(v.kind, "seed");
    assert.equal(v.thumbnailUrl, null);
    assert.equal(typeof v.createdAt, "number");
    const explicit = S().addVariant(seg.id, {
      id: "vx", seed: 2, videoUrl: "http://v2", assetId: "a", createdAt: 123, thumbnailUrl: "http://t", kind: "retake",
    });
    assert.equal(explicit?.id, "vx");
    assert.equal(explicit?.kind, "retake");
  });
  it("evicts FIFO past the cap", () => {
    S().reset();
    const seg = S().addSegment();
    const other = S().addSegment();
    S().setVariants(seg.id, [1, 2, 3, 4, 5, 6].map((seed) => ({ seed, videoUrl: `http://v${seed}` })));
    const ids = (S().segments.find((s) => s.id === seg.id)?.variants ?? []).map((v) => v.seed);
    assert.deepEqual(ids, [3, 4, 5, 6]);
    // A fresh segment carries no variants key until a take is stored.
    assert.equal(S().segments.find((s) => s.id === other.id)?.variants, undefined);
    S().addVariant(seg.id, { seed: 7, videoUrl: "http://v7" });
    assert.deepEqual(
      (S().segments.find((s) => s.id === seg.id)?.variants ?? []).map((v) => v.seed),
      [4, 5, 6, 7],
    );
  });
  it("removeVariant no-ops on unknown segments, non-array lists, and misses", () => {
    S().reset();
    S().removeVariant("ghost", "v");
    const seg = S().addSegment();
    const other = S().addSegment();
    S().addVariant(seg.id, { id: "v1", seed: 1, videoUrl: "http://v1" });
    S().removeVariant(seg.id, "ghost");
    assert.equal(S().segments.find((s) => s.id === seg.id)?.variants?.length, 1);
    S().removeVariant(seg.id, "v1");
    assert.deepEqual(S().segments.find((s) => s.id === seg.id)?.variants, []);
    assert.ok(S().segments.some((s) => s.id === other.id));
  });
  it("removeVariant/addVariant tolerate non-array variant lists (raw imports)", () => {
    S().reset();
    assert.equal(S().importTimeline(JSON.stringify({ segments: [mkSeg({ id: "rawv", variants: "nope" })] })), true);
    // Guard: non-array list → no-op.
    S().removeVariant("rawv", "v");
    assert.equal(S().segments.find((s) => s.id === "rawv")?.variants, "nope");
    // Fallback: addVariant starts a fresh list from [].
    S().addVariant("rawv", { id: "fresh", seed: 1, videoUrl: "http://f" });
    assert.equal(S().segments.find((s) => s.id === "rawv")?.variants?.length, 1);
    // Miss: promoting an absent take from a now-valid list → no-op.
    S().promoteVariant("rawv", "v");
    assert.equal(S().segments.find((s) => s.id === "rawv")?.variants?.length, 1);
  });
  it("promoteVariant swaps primary and demotes the old take", () => {
    S().reset();
    const seg = S().addSegment({ videoUrl: "http://primary", thumbnailUrl: "http://pt", params: { ...DEFAULT_SEGMENT_PARAMS, seed: 10 } });
    // A bystander segment exercises the map's non-matching arm.
    const other = S().addSegment({ prompt: "bystander" });
    S().setVariants(seg.id, [
      { id: "k1", seed: 11, videoUrl: "http://k1" },
      { id: "k2", seed: 12, videoUrl: "http://k2", assetId: "ak2", thumbnailUrl: "http://tk2" },
      { id: "k3", seed: 13, videoUrl: "http://k3" },
      { id: "k4", seed: 14, videoUrl: "http://k4" },
    ]);
    S().promoteVariant("ghost", "k2");
    S().promoteVariant(seg.id, "ghost");
    S().promoteVariant(seg.id, "k2");
    const got = S().segments.find((s) => s.id === seg.id) as TimelineSegment;
    assert.equal(got.videoUrl, "http://k2");
    assert.equal(got.assetId, "ak2");
    assert.equal(got.thumbnailUrl, "http://tk2");
    assert.equal(got.params.seed, 12);
    assert.equal(got.status, "ready");
    // Demoted primary leads the picker; count is unchanged (4 → 4).
    assert.equal(got.variants?.length, 4);
    assert.equal(got.variants?.[0]?.videoUrl, "http://primary");
    assert.ok(!got.variants?.some((v) => v.id === "k2"));
    assert.ok(got.variants?.some((v) => v.id === "k1"));
    assert.ok(S().segments.some((s) => s.id === other.id && s.prompt === "bystander"));
  });
  it("promoteVariant evicts past the cap on oversized raw imports", () => {
    S().reset();
    // setVariants/addVariant cap at 4, so overflow only arrives via raw
    // imports (which importTimeline does not normalize).
    const raw = mkSeg({ id: "fat", videoUrl: "http://p" }) as unknown as { variants: unknown };
    raw.variants = [1, 2, 3, 4, 5].map((seed) => ({ id: `w${seed}`, seed, videoUrl: `http://w${seed}` }));
    assert.equal(S().importTimeline(JSON.stringify({ segments: [raw] })), true);
    S().promoteVariant("fat", "w3");
    const got = S().segments.find((s) => s.id === "fat") as TimelineSegment;
    // 4 remaining + demoted primary = 5 → oldest tail popped.
    assert.equal(got.videoUrl, "http://w3");
    assert.equal(got.variants?.length, 4);
    assert.equal(got.variants?.[0]?.videoUrl, "http://p");
    assert.ok(got.variants?.some((v) => v.id === "w1"));
    assert.ok(got.variants?.some((v) => v.id === "w2"));
    assert.ok(got.variants?.some((v) => v.id === "w4"));
    assert.ok(!got.variants?.some((v) => v.id === "w3"));
    assert.ok(!got.variants?.some((v) => v.id === "w5"));
  });
  it("promoteVariant without a primary just removes the take; asset fallbacks hold", () => {
    S().reset();
    const seg = S().addSegment({ assetId: "keep-me", thumbnailUrl: "http://keep" });
    S().setVariants(seg.id, [{ id: "solo", seed: 3, videoUrl: "http://solo" }]);
    S().promoteVariant(seg.id, "solo");
    const got = S().segments.find((s) => s.id === seg.id) as TimelineSegment;
    assert.equal(got.videoUrl, "http://solo");
    assert.equal(got.assetId, "keep-me");
    assert.equal(got.thumbnailUrl, "http://keep");
    assert.deepEqual(got.variants, []);
  });
  it("promoteVariant defaults a missing seed via the params chain (param-less raw import)", () => {
    S().reset();
    const raw = mkSeg({ id: "noparams", videoUrl: "http://p" });
    delete (raw as Record<string, unknown>).params;
    (raw as unknown as { variants: unknown }).variants = [{ id: "w", seed: 9, videoUrl: "http://w" }];
    assert.equal(S().importTimeline(JSON.stringify({ segments: [raw] })), true);
    S().promoteVariant("noparams", "w");
    const got = S().segments.find((s) => s.id === "noparams") as TimelineSegment;
    assert.equal(got.videoUrl, "http://w");
    // THE FAMILY DEFAULT, NOT 0 (the census's M9): a seedless
    // segment's promoted take inherits the declared segment seed; a
    // literal 0 recorded a real deterministic seed 0 — a different
    // render, misreported as provenance in the picker.
    assert.equal(got.variants?.[0]?.seed, DEFAULT_SEGMENT_PARAMS.seed);
  });
  it("setVariants no-ops on unknown segments", () => {
    S().reset();
    S().setVariants("ghost", [{ seed: 1, videoUrl: "http://v" }]);
    assert.deepEqual(S().segments, []);
  });
});

// ── locks + groups ──────────────────────────────────────────────────────────
describe("locks and groups", () => {
  it("toggles locks (unknown id reads false)", () => {
    S().reset();
    assert.equal(S().toggleSegmentLock("ghost"), false);
    const seg = S().addSegment();
    assert.equal(S().toggleSegmentLock(seg.id), true);
    assert.equal(S().toggleSegmentLock(seg.id), false);
  });
  it("groups the multi-select set (needs 2+), leaving outsiders alone", () => {
    S().reset();
    assert.equal(S().groupSelectedSegments(), null);
    const a = S().addSegment();
    S().selectAllSegments();
    assert.equal(S().groupSelectedSegments(), null);
    const b = S().addSegment();
    const outsider = S().addSegment();
    // Partial selection: only the two members group.
    S().setSelectedSegment(a.id);
    S().toggleSegmentInSelection(b.id);
    const gid = S().groupSelectedSegments();
    assert.ok(gid);
    assert.equal(S().segments.find((s) => s.id === a.id)?.groupId, gid);
    assert.equal(S().segments.find((s) => s.id === b.id)?.groupId, gid);
    // Fresh segments carry no group key until grouped.
    assert.equal(S().segments.find((s) => s.id === outsider.id)?.groupId, undefined);
    S().ungroupSegments(gid as string);
    assert.ok(S().segments.every((s) => s.groupId !== gid));
    void a;
    void b;
  });
});

// ── audio tracks + cues ─────────────────────────────────────────────────────
describe("audio tracks and cues", () => {
  it("adds tracks with default + custom labels", () => {
    S().reset();
    const t1 = S().addAudioTrack();
    const t2 = S().addAudioTrack("Music");
    assert.equal(t1.label, "Audio 1");
    assert.equal(t2.label, "Music");
    S().setTrackMuted(t1.id, true);
    S().setTrackSolo(t2.id, true);
    assert.equal(S().audioTracks.find((t) => t.id === t1.id)?.muted, true);
    assert.equal(S().audioTracks.find((t) => t.id === t2.id)?.solo, true);
  });
  it("removeAudioTrack drops its cues and clears a selected cue on it", () => {
    S().reset();
    const t1 = S().addAudioTrack();
    const t2 = S().addAudioTrack();
    const c1 = S().addAudioCue({ ...mkCue({ track: t1.id }), label: "one" });
    const c2 = S().addAudioCue({ ...mkCue({ track: t2.id }), label: "two" });
    S().setSelectedAudioCue(c1.id);
    S().removeAudioTrack(t1.id);
    assert.ok(!S().audioCues.some((c) => c.id === c1.id));
    assert.ok(S().audioCues.some((c) => c.id === c2.id));
    assert.equal(S().selectedAudioCueId, null);
    // Selected cue on another track survives; missing selection is kept.
    S().setSelectedAudioCue(c2.id);
    S().removeAudioTrack(t1.id);
    assert.equal(S().selectedAudioCueId, c2.id);
    S().setSelectedAudioCue("ghost");
    S().removeAudioTrack(t2.id);
    assert.equal(S().selectedAudioCueId, "ghost");
    S().setSelectedAudioCue(null);
    S().removeAudioTrack("ghost");
    assert.equal(S().selectedAudioCueId, null);
  });
  it("adds, updates, and removes cues (selection follows)", () => {
    S().reset();
    const cue = S().addAudioCue(mkCue({}));
    const spare = S().addAudioCue(mkCue({ label: "spare" }));
    assert.ok(cue.id.length > 0);
    S().updateAudioCue(cue.id, { volume: 0.5 });
    assert.equal(S().audioCues.find((c) => c.id === cue.id)?.volume, 0.5);
    // Removing a NON-selected cue leaves the selection alone.
    S().setSelectedAudioCue(cue.id);
    S().removeAudioCue(spare.id);
    assert.equal(S().selectedAudioCueId, cue.id);
    S().removeAudioCue(cue.id);
    assert.deepEqual(S().audioCues, []);
    assert.equal(S().selectedAudioCueId, null);
  });
});

// ── structural edits ────────────────────────────────────────────────────────
describe("splitSegmentAtPlayhead", () => {
  it("no-ops outside segments and near boundaries", () => {
    S().reset();
    const a = S().addSegment();
    S().setPlayback({ currentTime: 999 });
    S().splitSegmentAtPlayhead();
    assert.equal(S().segments.length, 1);
    S().setPlayback({ currentTime: a.start + 0.05 });
    S().splitSegmentAtPlayhead();
    S().setPlayback({ currentTime: a.start + a.duration - 0.05 });
    S().splitSegmentAtPlayhead();
    assert.equal(S().segments.length, 1);
  });
  it("splits mid-segment, partitioning beats/keyframes and clearing renders", () => {
    S().reset();
    S().addSegment({
      promptBeats: [
        { time: 1, prompt: "early" },
        { time: 4, prompt: "late" },
      ] as unknown as TimelineSegment["promptBeats"],
      keyframes: [
        { time: 0.5, image: "a" },
        { time: 3, image: "b" },
      ] as unknown as TimelineSegment["keyframes"],
      videoUrl: "http://rendered",
      thumbnailUrl: "http://thumb",
      status: "ready",
    });
    S().addSegment({ prompt: "tail" });
    S().setPlayback({ currentTime: 2.5 });
    S().splitSegmentAtPlayhead();
    assert.equal(S().segments.length, 3);
    const [first, second, tail] = S().segments as TimelineSegment[];
    assert.equal(first.promptBeats?.length, 1);
    assert.equal(second.promptBeats?.length, 1);
    assert.equal(second.promptBeats?.[0]?.time, 1.5);
    assert.equal(first.keyframes?.length, 1);
    assert.equal(second.keyframes?.length, 1);
    assert.equal(first.videoUrl, null);
    assert.equal(second.videoUrl, null);
    assert.equal(first.status, "empty");
    assert.equal(second.id === first.id, false);
    assert.equal(second.params.seed, first.params.seed + 1);
    assert.equal(tail.prompt, "tail");
    assert.equal(tail.order, 2);
  });
  it("splits segments lacking beats/keyframes arrays", () => {
    S().reset();
    const raw = mkSeg({ id: "bare" });
    delete (raw as Record<string, unknown>).promptBeats;
    delete (raw as Record<string, unknown>).keyframes;
    assert.equal(S().importTimeline(JSON.stringify({ segments: [raw] })), true);
    S().setPlayback({ currentTime: 2.5 });
    S().splitSegmentAtPlayhead();
    assert.equal(S().segments.length, 2);
  });
});

describe("rippleDelete and rollEdit", () => {
  it("rippleDelete refuses unknown + locked, shifts later clips only", () => {
    S().reset();
    const a = S().addSegment();
    const b = S().addSegment();
    const c = S().addSegment({ start: 7, duration: 2 });
    S().rippleDelete("ghost");
    assert.equal(S().segments.length, 3);
    S().toggleSegmentLock(b.id);
    S().rippleDelete(b.id);
    assert.equal(S().segments.length, 3);
    S().toggleSegmentLock(b.id);
    S().setSelectedSegment(b.id);
    S().setRelayVideo("http://r", [b.id]);
    S().rippleDelete(b.id);
    assert.equal(S().segments.length, 2);
    // c starts inside the removed span → untouched; the once-later tail
    // (none here besides c) would shift. a keeps its selection? b was
    // selected → cleared; relay invalidated.
    assert.equal(S().segments.find((s) => s.id === c.id)?.start, 7);
    assert.equal(S().selectedSegmentId, null);
    assert.equal(S().relayVideoUrl, null);
    void a;
  });
  it("rippleDelete pulls touching neighbours shut", () => {
    S().reset();
    const a = S().addSegment();
    const b = S().addSegment();
    S().rippleDelete(a.id);
    assert.equal(S().segments.find((s) => s.id === b.id)?.start, 0);
  });
  it("rollEdit guards unknowns, locks, gaps, and clamps", () => {
    S().reset();
    const a = S().addSegment();
    const b = S().addSegment();
    // A bystander exercises the edit map's fall-through arm.
    const c = S().addSegment({ start: 50, duration: 5 });
    S().rollEdit("ghost", b.id, 1);
    S().rollEdit(a.id, "ghost", 1);
    S().toggleSegmentLock(a.id);
    S().rollEdit(a.id, b.id, 1);
    S().toggleSegmentLock(a.id);
    // Gap: move b away, then the pair is no longer adjacent.
    S().updateSegment(b.id, { start: 99 });
    S().rollEdit(a.id, b.id, 1);
    assert.equal(S().segments.find((s) => s.id === a.id)?.duration, 5);
    S().updateSegment(b.id, { start: 5 });
    // Clamped to zero (right clip already at minimum).
    S().updateSegment(b.id, { duration: 0.5 });
    S().rollEdit(a.id, b.id, 5);
    assert.equal(S().segments.find((s) => s.id === a.id)?.duration, 5);
    // Real edits both ways, total length preserved.
    S().updateSegment(b.id, { duration: 5 });
    S().rollEdit(a.id, b.id, 1);
    assert.equal(S().segments.find((s) => s.id === a.id)?.duration, 6);
    assert.equal(S().segments.find((s) => s.id === b.id)?.duration, 4);
    assert.equal(S().segments.find((s) => s.id === b.id)?.start, 6);
    S().rollEdit(a.id, b.id, -2);
    assert.equal(S().segments.find((s) => s.id === a.id)?.duration, 4);
    assert.equal(S().segments.find((s) => s.id === b.id)?.duration, 6);
    assert.equal(S().segments.find((s) => s.id === c.id)?.start, 50);
  });
});

// ── export / import ─────────────────────────────────────────────────────────
describe("exportTimeline / importTimeline", () => {
  it("round-trips segments, cues, and tracks", () => {
    S().reset();
    const seg = S().addSegment({ prompt: "keep me" });
    const track = S().addAudioTrack("M");
    const cue = S().addAudioCue(mkCue({ track: track.id }));
    const json = S().exportTimeline();
    S().reset();
    assert.equal(S().importTimeline(json), true);
    assert.ok(S().segments.some((s) => s.id === seg.id && s.prompt === "keep me"));
    assert.ok(S().audioCues.some((c) => c.id === cue.id));
    assert.ok(S().audioTracks.some((t) => t.id === track.id));
    assert.equal(S().playback.currentTime, 0);
    assert.equal(S().playback.isPlaying, false);
  });
  it("refuses malformed payloads; an empty segment list is a valid clear", () => {
    S().reset();
    assert.equal(S().importTimeline("nope{"), false);
    assert.equal(S().importTimeline("null"), false);
    assert.equal(S().importTimeline("{}"), false);
    assert.equal(S().importTimeline(JSON.stringify({ segments: [] })), true);
    assert.deepEqual(S().segments, []);
  });
  it("normalizes statuses and keeps prior tracks when none ship", () => {
    S().reset();
    const keep = S().addAudioTrack("Keep");
    assert.equal(
      S().importTimeline(JSON.stringify({ segments: [{ ...mkSeg({ id: "x" }), status: "error" }] })),
      true,
    );
    assert.equal(S().segments[0]?.status, "empty");
    assert.equal(S().segments[0]?.order, 0);
    assert.deepEqual(S().audioCues, []);
    assert.deepEqual(S().audioTracks.map((t) => t.id), [keep.id]);
    assert.equal(
      S().importTimeline(
        JSON.stringify({ segments: [mkSeg({ id: "y" })], audioCues: [{ ...mkCue({ id: "c9" }) }], audioTracks: [] }),
      ),
      true,
    );
    assert.deepEqual(S().audioTracks.map((t) => t.id), [keep.id]);
    assert.equal(
      S().importTimeline(
        JSON.stringify({
          segments: [mkSeg({ id: "z" })],
          audioCues: [],
          audioTracks: [{ id: "fresh", label: "F", color: "#000", height: 48 }],
        }),
      ),
      true,
    );
    assert.deepEqual(S().audioTracks.map((t) => t.id), ["fresh"]);
    assert.deepEqual(S().selectedSegmentIds.size, 0);
  });
});

// ── relay / anchors / simple setters ────────────────────────────────────────
describe("relay, anchors, and setters", () => {
  it("sets relay video (asset optional) + global anchor", () => {
    S().reset();
    S().setRelayVideo("http://r", ["a"]);
    assert.equal(S().relayVideoUrl, "http://r");
    assert.equal(S().relayAssetId, undefined);
    S().setRelayVideo("http://r2", ["a", "b"], "asset-9");
    assert.equal(S().relayAssetId, "asset-9");
    S().setGlobalConsistencyAnchor({ assetId: "g", b64: "data:image/png;base64,X" });
    assert.equal(S().globalConsistencyAnchor?.assetId, "g");
    S().setGlobalConsistencyAnchor(null);
    assert.equal(S().globalConsistencyAnchor, null);
  });
  it("resolves the effective anchor (override > global > null)", () => {
    S().reset();
    const seg = S().addSegment();
    assert.equal(S().getEffectiveConsistencyAnchor(seg.id), null);
    assert.equal(S().getEffectiveConsistencyAnchor("ghost"), null);
    S().setGlobalConsistencyAnchor({ assetId: "g", b64: "data:X" });
    assert.deepEqual(S().getEffectiveConsistencyAnchor("ghost"), { assetId: "g", b64: "data:X" });
    assert.equal(S().getEffectiveConsistencyAnchor(seg.id)?.assetId, "g");
    S().updateSegment(seg.id, { consistencyAnchor: { assetId: "own", b64: "data:Y" } });
    assert.equal(S().getEffectiveConsistencyAnchor(seg.id)?.assetId, "own");
  });
  it("patches viewport/playback/drag/format/filter/selection", () => {
    S().reset();
    S().setViewport({ scrollX: 42 });
    assert.equal(S().viewport.scrollX, 42);
    S().setPlayback({ isPlaying: true, currentTime: 3 });
    assert.equal(S().playback.isPlaying, true);
    S().setDrag({ isDragging: true, mouseX: 9 });
    assert.equal(S().drag.isDragging, true);
    S().setTimeFormat("frames");
    assert.equal(S().timeFormat, "frames");
    S().setStoryboardStatusFilter("ready");
    assert.equal(S().storyboardStatusFilter, "ready");
    S().setStoryboardStatusFilter(null);
    assert.equal(S().storyboardStatusFilter, null);
    const seg = S().addSegment();
    S().setSelectedSegment(seg.id);
    assert.equal(S().selectedSegmentId, seg.id);
    assert.deepEqual([...S().selectedSegmentIds], [seg.id]);
    S().setSelectedSegment(null);
    assert.equal(S().selectedSegmentId, null);
    assert.equal(S().setSelectedAudioCue("c"), undefined);
    assert.equal(S().selectedAudioCueId, "c");
  });
});

// ── clipboard wrappers ──────────────────────────────────────────────────────
describe("clipboard actions", () => {
  it("copies only with a resolvable selection", () => {
    S().reset();
    assert.equal(S().copySelectedSegmentParams(), false);
    S().setSelectedSegment("ghost");
    assert.equal(S().copySelectedSegmentParams(), false);
    const seg = S().addSegment({ prompt: "src" });
    S().setSelectedSegment(seg.id);
    assert.equal(S().copySelectedSegmentParams(), true);
  });
  it("pastes into targets, guarding empties + ghosts", () => {
    S().reset();
    clearSegmentClipboard();
    const a = S().addSegment({ prompt: "src" });
    const b = S().addSegment({ prompt: "dst" });
    assert.equal(S().pasteParamsToSegment(b.id), false);
    S().setSelectedSegment(a.id);
    S().copySelectedSegmentParams();
    assert.equal(S().pasteParamsToSegment("ghost"), false);
    assert.equal(S().pasteParamsToSegment(b.id), true);
    assert.equal(S().segments.find((s) => s.id === b.id)?.prompt, "src");
    S().setSelectedSegment(null);
    assert.equal(S().pasteParamsToSelected(), false);
    S().setSelectedSegment(b.id);
    assert.equal(S().pasteParamsToSelected(), true);
    // A primary that resolves to no segment pastes nowhere.
    S().setSelectedSegment(null);
    S().toggleSegmentInSelection("ghost-target");
    assert.equal(S().selectedSegmentId, "ghost-target");
    assert.equal(S().pasteParamsToSelected(), false);
  });
});

// ── duplicate ───────────────────────────────────────────────────────────────
describe("duplicateWithOffset", () => {
  it("rejects bad counts + ghosts", () => {
    S().reset();
    const a = S().addSegment();
    assert.deepEqual(S().duplicateWithOffset(a.id, 0), []);
    assert.deepEqual(S().duplicateWithOffset(a.id, -2), []);
    assert.deepEqual(S().duplicateWithOffset("ghost", 2), []);
  });
  it("clones a contiguous seeded block, shifting the tail", () => {
    S().reset();
    const src = S().addSegment({ params: { ...DEFAULT_SEGMENT_PARAMS, seed: 100 } });
    S().addVariant(src.id, { seed: 100, videoUrl: "http://take" });
    S().toggleSegmentLock(src.id);
    S().setSelectedSegment(src.id);
    S().groupSelectedSegments();
    const tail = S().addSegment({ prompt: "tail" });
    const copies = S().duplicateWithOffset(src.id, 2);
    assert.equal(copies.length, 2);
    assert.deepEqual(copies.map((c) => c.params.seed), [101, 102]);
    assert.deepEqual(copies.map((c) => c.start), [5, 10]);
    const tailAfter = S().segments.find((s) => s.id === tail.id) as TimelineSegment;
    assert.equal(tailAfter.start, 15);
    assert.deepEqual(S().segments.map((s) => s.order), [0, 1, 2, 3]);
    for (const c of copies) {
      const stored = S().segments.find((s) => s.id === c.id) as TimelineSegment;
      assert.equal(stored.videoUrl, null);
      assert.equal(stored.status, "empty");
      assert.deepEqual(stored.variants, []);
      assert.equal(stored.locked, false);
      assert.equal(stored.groupId, null);
    }
    assert.equal(S().playback.totalDuration, 20);
  });
});

// ── G8 selection + in/out ───────────────────────────────────────────────────
describe("multi-select", () => {
  it("range-selects around a stable anchor (both directions + fallbacks)", () => {
    S().reset();
    const [a, b, c] = [S().addSegment(), S().addSegment(), S().addSegment()];
    S().selectSegmentRange(a.id);
    assert.deepEqual([...S().selectedSegmentIds], [a.id]);
    S().setSelectedSegment(a.id);
    S().selectSegmentRange(c.id);
    assert.deepEqual([...S().selectedSegmentIds], [a.id, b.id, c.id]);
    assert.equal(S().selectedSegmentId, a.id);
    S().setSelectedSegment(c.id);
    S().selectSegmentRange(a.id);
    assert.deepEqual([...S().selectedSegmentIds], [a.id, b.id, c.id]);
    assert.equal(S().selectedSegmentId, c.id);
    S().selectSegmentRange(c.id);
    assert.deepEqual([...S().selectedSegmentIds], [c.id]);
    S().selectSegmentRange("ghost");
    assert.deepEqual([...S().selectedSegmentIds], ["ghost"]);
    // Stale anchor (selected id absent from the list) falls back to single.
    S().selectSegmentRange(a.id);
    assert.deepEqual([...S().selectedSegmentIds], [a.id]);
    void b;
  });
  it("toggles, clears, and selects all", () => {
    S().reset();
    S().selectAllSegments();
    assert.equal(S().selectedSegmentId, null);
    const [a, b] = [S().addSegment(), S().addSegment()];
    S().selectAllSegments();
    assert.equal(S().selectedSegmentIds.size, 2);
    assert.equal(S().selectedSegmentId, a.id);
    // Toggling the primary OFF keeps the set's new member as primary
    // (the primary never dangles outside a non-empty set).
    S().toggleSegmentInSelection(a.id);
    assert.deepEqual([...S().selectedSegmentIds], [b.id]);
    assert.equal(S().selectedSegmentId, b.id);
    S().toggleSegmentInSelection(b.id);
    assert.equal(S().selectedSegmentIds.size, 0);
    assert.equal(S().selectedSegmentId, null);
    S().toggleSegmentInSelection(a.id);
    assert.equal(S().selectedSegmentId, a.id);
    S().setSelectedSegment(b.id);
    S().toggleSegmentInSelection(a.id);
    assert.equal(S().selectedSegmentId, b.id);
    S().clearMultiSelection();
    assert.deepEqual([...S().selectedSegmentIds], [b.id]);
    S().setSelectedSegment(null);
    S().clearMultiSelection();
    assert.equal(S().selectedSegmentIds.size, 0);
  });
});

describe("in/out points", () => {
  it("marks in (fresh, conflicting, extending) + out (default, rewind, clamp)", () => {
    S().reset();
    S().setPlayback({ currentTime: 4 });
    S().markInAtPlayhead();
    assert.deepEqual(S().inOutPoints, { start: 4, end: 5 });
    S().setPlayback({ currentTime: 2 });
    S().markInAtPlayhead();
    assert.deepEqual(S().inOutPoints, { start: 2, end: 5 });
    S().setPlayback({ currentTime: 9 });
    S().markInAtPlayhead();
    assert.deepEqual(S().inOutPoints, { start: 9, end: 10 });
    S().clearInOutPoints();
    S().setPlayback({ currentTime: 7 });
    S().markOutAtPlayhead();
    assert.deepEqual(S().inOutPoints, { start: 0, end: 7 });
    S().setPlayback({ currentTime: 3 });
    S().markInAtPlayhead();
    S().setPlayback({ currentTime: 1 });
    S().markOutAtPlayhead();
    assert.deepEqual(S().inOutPoints, { start: 0, end: 1 });
    S().setPlayback({ currentTime: 3 });
    S().markOutAtPlayhead();
    assert.deepEqual(S().inOutPoints, { start: 0, end: 3 });
    S().setInOutPoints(8, 2);
    assert.deepEqual(S().inOutPoints, { start: 2, end: 8 });
    S().clearInOutPoints();
    assert.equal(S().inOutPoints, null);
  });
  it("marks the span under the playhead (multi-hit merges, misses no-op)", () => {
    S().reset();
    S().addSegment({ start: 0, duration: 5 });
    S().addSegment({ start: 3, duration: 5 });
    S().setPlayback({ currentTime: 4 });
    S().markSelectionFromPlayhead();
    assert.deepEqual(S().inOutPoints, { start: 0, end: 8 });
    S().setPlayback({ currentTime: 99 });
    S().markSelectionFromPlayhead();
    assert.deepEqual(S().inOutPoints, { start: 0, end: 8 });
  });
});

// ── markers ─────────────────────────────────────────────────────────────────
describe("markers", () => {
  it("adds (default + explicit + clamped), updates sorted, removes, clears", () => {
    S().reset();
    S().setPlayback({ currentTime: 6 });
    const m1 = S().addMarker();
    assert.equal(m1.time, 6);
    assert.equal(m1.label, "Marker 1");
    const m2 = S().addMarker(2, "Intro");
    const m3 = S().addMarker(-4, "Neg");
    assert.equal(m3.time, 0);
    assert.deepEqual(S().markers.map((m) => m.id), [m3.id, m2.id, m1.id]);
    S().updateMarker(m1.id, { time: 1, label: "Moved" });
    assert.deepEqual(S().markers.map((m) => m.id), [m3.id, m1.id, m2.id]);
    S().updateMarker("ghost", { label: "x" });
    assert.equal(S().markers.length, 3);
    S().removeMarker(m3.id);
    assert.equal(S().markers.length, 2);
    S().clearMarkers();
    assert.deepEqual(S().markers, []);
  });
});

// ── undo / redo / reset ─────────────────────────────────────────────────────
describe("undo/redo", () => {
  // NOTE: history is module-level and intentionally survives reset(), so
  // these tests assert only steps from a known tip (the pushes this test
  // just made). The empty-history bounds live in timelineStorePersist,
  // whose first test runs on a fresh module.
  it("steps back and forward from the tip; redo no-ops at the tip", () => {
    S().reset();
    const a = S().addSegment({ prompt: "u1" });
    S().addSegment({ prompt: "u2" });
    S().undo();
    assert.deepEqual(S().segments.map((s) => s.id), [a.id]);
    S().redo();
    assert.equal(S().segments.length, 2);
    S().redo();
    assert.equal(S().segments.length, 2);
  });
  it("caps history at fifty (rapid gesture pushes stay consistent)", () => {
    S().reset();
    const base = S().segments.length;
    for (let i = 0; i < 120; i++) S().addSegment({ prompt: `h${i}` });
    assert.equal(S().segments.length, base + 120);
    S().undo();
    assert.equal(S().segments.length, base + 119);
  });
  it("reset restores defaults and clears persisted state", async () => {
    S().addSegment();
    S().setTimeFormat("frames");
    S().reset();
    assert.deepEqual(S().segments, []);
    assert.deepEqual(S().audioCues, []);
    assert.equal(S().timeFormat, "seconds");
    assert.equal(S().initialized, false);
    assert.equal(lsData.has(LS_KEY), false);
    await flushPersist();
  });
  it("reset survives IndexedDB cleanup failures", async () => {
    S().addSegment();
    // tx-error breaks the cleanup TRANSACTION (the open handle is cached,
    // so open-error would be vacuous here). Sleep before restoring the
    // mode so the floating tlClearAll chain settles under failure.
    idbMode = "tx-error";
    S().reset();
    await sleep(10);
    idbMode = "ok";
    assert.deepEqual(S().segments, []);
    await flushPersist();
  });
});
