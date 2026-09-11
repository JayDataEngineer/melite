// extractVideoFrame.spec.ts — the motion card's client-side frame grabber.
// Node-runnable with a scripted media double: document.createElement
// (video + canvas), the video element's metadata/seek/error state machine,
// and the 2d context are faked; timers are real except the 5s-timeout arm
// (fake timers). Covers guards, the duration/clamp math, every settle path
// (success, seek-throw, null ctx, draw-throw, empty data URL, error event,
// timeout, double-settle, load-throw), and the batch worker pool.
import { describe, it, vi, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  extractFramesBatch,
  extractVideoFrame,
} from "../src/extractVideoFrame.ts";

type Globals = Record<string, unknown>;
const G = globalThis as unknown as Globals;
const realDocument = G.document;
const realConsoleError = console.error;

// ── Fakes ──────────────────────────────────────────────────────────────────

class FakeVideo {
  src = "";
  crossOrigin: string | null = null;
  muted = false;
  preload = "";
  playsInline = false;
  duration = 0;
  videoWidth = 0;
  videoHeight = 0;
  onloadedmetadata: (() => void) | null = null;
  onseeked: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  removedAttrs: string[] = [];
  loadCalls = 0;
  throwOnLoad = false;
  throwOnSeek = false;
  seeks: number[] = [];
  private _ct = 0;
  get currentTime(): number {
    return this._ct;
  }
  set currentTime(v: number) {
    if (this.throwOnSeek) throw new Error("seek boom");
    this.seeks.push(v);
    this._ct = v;
  }
  removeAttribute(name: string): void {
    this.removedAttrs.push(name);
  }
  load(): void {
    this.loadCalls++;
    if (this.throwOnLoad) throw new Error("load boom");
  }
}

class FakeCtx {
  draws: unknown[][] = [];
  throwOnDraw = false;
  drawImage(...args: unknown[]): void {
    if (this.throwOnDraw) throw new Error("draw boom");
    this.draws.push(args);
  }
}

class FakeGrabCanvas {
  width = 0;
  height = 0;
  ctx: FakeCtx | null = new FakeCtx();
  dataUrl = `data:image/jpeg;base64,${Buffer.from("frame").toString("base64")}`;
  getContext(): FakeCtx | null {
    return this.ctx;
  }
  toDataURL(): string {
    return this.dataUrl;
  }
}

const videos: FakeVideo[] = [];
const canvases: FakeGrabCanvas[] = [];
let onCanvas: ((c: FakeGrabCanvas) => void) | null = null;

function installDocument(): void {
  G.document = {
    createElement: (tag: string) => {
      if (tag === "video") {
        const v = new FakeVideo();
        videos.push(v);
        return v;
      }
      const c = new FakeGrabCanvas();
      canvases.push(c);
      onCanvas?.(c);
      return c;
    },
  };
}

afterEach(() => {
  G.document = realDocument;
  console.error = realConsoleError;
  vi.useRealTimers();
  videos.length = 0;
  canvases.length = 0;
  onCanvas = null;
});

function scriptVideo(v: FakeVideo, opts: { duration?: number; vw?: number; vh?: number } = {}): void {
  v.duration = opts.duration ?? 10;
  v.videoWidth = opts.vw ?? 1280;
  v.videoHeight = opts.vh ?? 720;
}

function lastVideo(): FakeVideo {
  return videos[videos.length - 1];
}

// ── extractVideoFrame ──────────────────────────────────────────────────────

describe("extractVideoFrame", () => {
  it("rejects empty URLs and negative times without touching the DOM", async () => {
    installDocument();
    assert.equal(await extractVideoFrame("", 1), null);
    assert.equal(await extractVideoFrame("http://x/v.mp4", -1), null);
    assert.equal(videos.length, 0);
  });

  it("seeks, grabs, scales to maxDim, and cleans up", async () => {
    installDocument();
    const p = extractVideoFrame("http://x/v.mp4", 2);
    const v = lastVideo();
    assert.equal(v.crossOrigin, "anonymous");
    assert.equal(v.muted, true);
    assert.equal(v.preload, "auto");
    scriptVideo(v);
    v.onloadedmetadata!();
    assert.deepEqual(v.seeks, [2]);
    v.onseeked!();
    const out = await p;
    assert.ok(out?.startsWith("data:image/jpeg;base64,"));
    const c = canvases[canvases.length - 1];
    assert.equal(c.width, 512);
    assert.equal(c.height, 288);
    assert.equal(c.ctx?.draws.length, 1);
    // Cleanup: src dropped and the loader kicked so no frame is retained.
    assert.deepEqual(v.removedAttrs, ["src"]);
    assert.equal(v.loadCalls, 1);
  });

  it("clamps to duration-0.05 and survives unknown duration", async () => {
    installDocument();
    const p = extractVideoFrame("u", 9.99);
    const v = lastVideo();
    scriptVideo(v);
    v.onloadedmetadata!();
    // duration 10 → t = min(9.99, 9.95) = 9.95.
    assert.ok(Math.abs(v.seeks[0] - 9.95) < 1e-9);
    v.onseeked!();
    assert.ok((await p)?.startsWith("data:image/jpeg;base64,"));

    const q = extractVideoFrame("u", 2);
    const w = lastVideo();
    scriptVideo(w, { duration: 0 });
    w.onloadedmetadata!();
    // Unknown duration → falls back to timeSeconds-0.05.
    assert.ok(Math.abs(w.seeks[0] - 1.95) < 1e-9);
    w.onseeked!();
    assert.ok((await q)?.startsWith("data:image/jpeg;base64,"));
  });

  it("defaults zero-dimension videos to 640x480 and keeps small ones", async () => {
    installDocument();
    const p = extractVideoFrame("u", 1);
    const v = lastVideo();
    scriptVideo(v, { vw: 0, vh: 0 });
    v.onloadedmetadata!();
    v.onseeked!();
    assert.ok(await p);
    // 640x480 defaults, still scaled to the 512 long edge.
    assert.equal(canvases[canvases.length - 1].width, 512);
    assert.equal(canvases[canvases.length - 1].height, 384);

    const q = extractVideoFrame("u", 1, 512);
    const w = lastVideo();
    scriptVideo(w, { vw: 320, vh: 240 });
    w.onloadedmetadata!();
    w.onseeked!();
    assert.ok(await q);
    assert.equal(canvases[canvases.length - 1].width, 320);
    assert.equal(canvases[canvases.length - 1].height, 240);
  });

  it("resolves null when the seek throws", async () => {
    installDocument();
    const p = extractVideoFrame("u", 1);
    const v = lastVideo();
    v.throwOnSeek = true;
    scriptVideo(v);
    v.onloadedmetadata!();
    assert.equal(await p, null);
  });

  it("resolves null without a 2d context", async () => {
    installDocument();
    onCanvas = (c) => {
      c.ctx = null;
    };
    const p = extractVideoFrame("u", 1);
    const v = lastVideo();
    scriptVideo(v);
    v.onloadedmetadata!();
    v.onseeked!();
    assert.equal(await p, null);
  });

  it("logs and resolves null when the draw throws", async () => {
    installDocument();
    onCanvas = (c) => {
      c.ctx!.throwOnDraw = true;
    };
    const errors: unknown[][] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    const p = extractVideoFrame("u", 1);
    const v = lastVideo();
    scriptVideo(v);
    v.onloadedmetadata!();
    v.onseeked!();
    assert.equal(await p, null);
    assert.equal(errors.length, 1);
  });

  it("resolves null for an empty data URL", async () => {
    installDocument();
    onCanvas = (c) => {
      c.dataUrl = "";
    };
    const p = extractVideoFrame("u", 1);
    const v = lastVideo();
    scriptVideo(v);
    v.onloadedmetadata!();
    v.onseeked!();
    assert.equal(await p, null);
  });

  it("resolves null on video error", async () => {
    installDocument();
    const p = extractVideoFrame("u", 1);
    lastVideo().onerror!(new Error("404"));
    assert.equal(await p, null);
  });

  it("times out after 5s and cleans up", async () => {
    installDocument();
    vi.useFakeTimers();
    const p = extractVideoFrame("u", 1);
    await vi.advanceTimersByTimeAsync(5000);
    assert.equal(await p, null);
    assert.deepEqual(lastVideo().removedAttrs, ["src"]);
  });

  it("ignores late events after settling", async () => {
    installDocument();
    const p = extractVideoFrame("u", 1);
    const v = lastVideo();
    scriptVideo(v);
    v.onloadedmetadata!();
    v.onseeked!();
    const first = await p;
    assert.ok(first?.startsWith("data:image/jpeg;base64,"));
    v.onerror!(new Error("late"));
    assert.equal(await p, first);
  });

  it("swallows loader errors during cleanup", async () => {
    installDocument();
    const p = extractVideoFrame("u", 1);
    const v = lastVideo();
    v.throwOnLoad = true;
    scriptVideo(v);
    v.onloadedmetadata!();
    v.onseeked!();
    assert.ok((await p)?.startsWith("data:image/jpeg;base64,"));
  });
});

// ── extractFramesBatch ─────────────────────────────────────────────────────

describe("extractFramesBatch", () => {
  it("fans out with bounded concurrency and aligns failures", async () => {
    installDocument();
    const p = extractFramesBatch("u", [0, 1, 2], 2);
    assert.equal(videos.length, 2);
    // First two workers started; fail the second, complete the first.
    videos[0].onloadedmetadata!();
    videos[0].onseeked!();
    videos[1].onerror!(new Error("bad frame"));
    // Third starts after a worker frees up.
    await vi.waitFor(() => assert.equal(videos.length, 3));
    videos[2].onloadedmetadata!();
    videos[2].onseeked!();
    const out = await p;
    assert.equal(out.length, 3);
    assert.ok(out[0]?.startsWith("data:image/jpeg;base64,"));
    assert.equal(out[1], null);
    assert.ok(out[2]?.startsWith("data:image/jpeg;base64,"));
  });

  it("uses default concurrency and handles empty batches", async () => {
    installDocument();
    const p = extractFramesBatch("u", [0, 1]);
    assert.equal(videos.length, 2);
    for (const v of videos) {
      v.onloadedmetadata!();
      v.onseeked!();
    }
    const out = await p;
    assert.equal(out.length, 2);
    assert.ok(out.every((u) => u?.startsWith("data:image/jpeg;base64,")));
    assert.deepEqual(await extractFramesBatch("u", []), []);
  });
});
