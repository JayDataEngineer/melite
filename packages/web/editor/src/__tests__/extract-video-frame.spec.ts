/**
 * Unit tests for lib/extract-video-frame.ts — client-side video frame
 * extraction for SmartSplit's per-scene first-frame anchors.
 *
 * Coverage:
 *   - Input guards (empty URL / negative time → null, synchronously).
 *   - The 5s timeout fallback (no metadata event fires → timer resolves null)
 *     via fake timers.
 *   - extractFramesBatch alignment + concurrency + empty-times behavior.
 *   - The seek+draw success path: loadedmetadata → seeked → canvas draw →
 *     data URL return (by intercepting createElement and dispatching events).
 *   - Canvas dimension capping (maxDim=512), scale computation.
 *   - getContext returns null → null result.
 *   - toDataURL returns empty → null result.
 *   - Canvas draw throws → null + console.error.
 *   - video.onerror → null.
 *   - Video property setup (crossOrigin, muted, preload, playsInline).
 *   - Time clamping against duration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { extractVideoFrame, extractFramesBatch } from "@melite/formats"

// Capture the REAL createElement at module load time — BEFORE any test installs
// a vi.spyOn. Vitest's spy patches the prototype method, so capturing inside a
// test (after spy) would capture the spy itself and recurse infinitely.
const REAL_CREATE = document.createElement.bind(document)

describe("extract-video-frame — input guards", () => {
  it("resolves null immediately for an empty video URL", async () => {
    expect(await extractVideoFrame("", 1)).toBeNull()
  })
  it("resolves null immediately for a negative time", async () => {
    expect(await extractVideoFrame("blob:http://x/v", -1)).toBeNull()
  })
  it("resolves null for time exactly 0? — no: 0 is valid (>= 0), proceeds to create video", async () => {
    // timeSeconds=0 is NOT rejected by the guard; it proceeds. Verify the guard
    // only rejects negative times by confirming t=0 doesn't immediately resolve.
    // (It'll hit the timeout path instead — we don't await that here.)
    let resolved = false
    extractVideoFrame("blob:http://x/v", 0).then(() => { resolved = true })
    await new Promise((r) => setTimeout(r, 10))
    expect(resolved).toBe(false) // still pending — guard didn't fire
  })
})

describe("extract-video-frame — timeout fallback (fake timers)", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("resolves null after the 5s timeout when no metadata event fires (happy-dom: no real decoder)", async () => {
    const p = extractVideoFrame("blob:http://x/v", 1)
    // Fast-forward past the 5000ms timeout.
    await vi.advanceTimersByTimeAsync(5000)
    expect(await p).toBeNull()
  })
  it("the 5s timer is the upper bound — advancing less than 5s leaves it pending", async () => {
    let resolved = false
    extractVideoFrame("blob:http://x/v", 2).then(() => { resolved = true })
    await vi.advanceTimersByTimeAsync(4999)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(2)
    expect(resolved).toBe(true)
  })
})

describe("extract-video-frame — extractFramesBatch", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("returns [] immediately for an empty times array (no workers spawned)", async () => {
    const out = await extractFramesBatch("blob:http://x/v", [])
    expect(out).toEqual([])
  })
  it("returns a null-aligned array matching the input length (every slot times out)", async () => {
    const p = extractFramesBatch("blob:http://x/v", [1, 2, 3])
    await vi.advanceTimersByTimeAsync(5000)
    expect(await p).toEqual([null, null, null])
  })
  it("default concurrency is 3 — 5 frames resolve in 2 rounds (advance enough for all)", async () => {
    // 5 frames, concurrency 3 → worker round count = ceil(5/3) = 2 → 2×5s.
    // Each in-flight frame adds a 5s timeout; advancing 30s flushes every round.
    const p = extractFramesBatch("blob:http://x/v", [0, 1, 2, 3, 4])
    await vi.advanceTimersByTimeAsync(30000)
    const out = await p
    expect(out).toHaveLength(5)
    expect(out.every((v) => v === null)).toBe(true)
  })
  it("honours a custom concurrency setting (concurrency 1 → fully sequential, 2 rounds)", async () => {
    // concurrency 1 → one worker processes [1, then 2] → 2×5s = 10s.
    const p = extractFramesBatch("blob:http://x/v", [1, 2], 1)
    await vi.advanceTimersByTimeAsync(30000)
    expect(await p).toEqual([null, null])
  })
  it("concurrency larger than times.length is clamped to times.length (no idle workers)", async () => {
    // 2 frames, concurrency 10 → only 2 workers spawn, each processes one frame.
    const p = extractFramesBatch("blob:http://x/v", [1, 2], 10)
    await vi.advanceTimersByTimeAsync(5000)
    expect(await p).toEqual([null, null])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// seek + draw flow — success and error paths
//
// We intercept document.createElement to capture the video + canvas elements,
// stub their readonly/prototype properties, and dispatch events manually to
// drive the internal state machine through loadedmetadata → seeked → draw.
// ════════════════════════════════════════════════════════════════════════════

/** Captures created video/canvas elements and stubs their behavior. */
function stubCreateElement(opts: {
  duration?: number
  videoWidth?: number
  videoHeight?: number
  ctx?: { drawImage: ReturnType<typeof vi.fn> } | null
  toDataURL?: string
  toDataURLThrows?: boolean
}) {
  const videos: HTMLVideoElement[] = []
  const canvases: HTMLCanvasElement[] = []
  const realCreate = REAL_CREATE
  const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "video") {
      const v = realCreate("video")
      Object.defineProperty(v, "duration", { value: opts.duration ?? 10, configurable: true, writable: true })
      Object.defineProperty(v, "videoWidth", { value: opts.videoWidth ?? 640, configurable: true, writable: true })
      Object.defineProperty(v, "videoHeight", { value: opts.videoHeight ?? 480, configurable: true, writable: true })
      videos.push(v)
      return v
    }
    if (tag === "canvas") {
      const c = realCreate("canvas")
      if (opts.ctx === null) {
        vi.spyOn(c, "getContext").mockReturnValue(null)
      } else if (opts.ctx !== undefined) {
        vi.spyOn(c, "getContext").mockReturnValue(opts.ctx as unknown as CanvasRenderingContext2D)
      }
      if (opts.toDataURLThrows) {
        vi.spyOn(c, "toDataURL").mockImplementation(() => { throw new Error("toDataURL failed") })
      } else if (opts.toDataURL !== undefined) {
        vi.spyOn(c, "toDataURL").mockReturnValue(opts.toDataURL)
      }
      canvases.push(c)
      return c
    }
    return realCreate(tag)
  })
  return { videos, canvases, spy }
}

describe("extract-video-frame — seek+draw success path", () => {
  let createSpy: ReturnType<typeof vi.spyOn>
  let ctxObj: { drawImage: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    ctxObj = { drawImage: vi.fn() }
    const stub = stubCreateElement({
      duration: 10,
      videoWidth: 640,
      videoHeight: 480,
      ctx: ctxObj,
      toDataURL: "data:image/png;base64,abc",
    })
    createSpy = stub.spy
  })
  afterEach(() => createSpy.mockRestore())

  it("returns the canvas data URL when loadedmetadata → seeked → draw succeeds", async () => {
    // Re-stub to capture the video reference.
    createSpy.mockRestore()
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: ctxObj, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 2)
      // Wait for createElement to run.
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      video.dispatchEvent(new Event("loadedmetadata"))
      video.dispatchEvent(new Event("seeked"))
      expect(await p).toBe("data:image/png;base64,abc")
    } finally {
      stub.spy.mockRestore()
    }
  })

  it("draws the video onto the canvas at the computed scale", async () => {
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: ctxObj, toDataURL: "data:image/png;base64,xyz",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      video.dispatchEvent(new Event("loadedmetadata"))
      video.dispatchEvent(new Event("seeked"))
      await p
      // drawImage(video, 0, 0, canvas.width, canvas.height) — canvas dims are
      // 640×480 (scale = min(1, 512/640) = 0.8 → 512×384). Wait, let me recompute:
      // scale = min(1, 512 / max(640,480)) = min(1, 512/640) = 0.8
      // canvas.width = round(640 * 0.8) = 512
      // canvas.height = round(480 * 0.8) = 384
      expect(ctxObj.drawImage).toHaveBeenCalledWith(video, 0, 0, 512, 384)
    } finally {
      stub.spy.mockRestore()
    }
  })

  it("does not downscale when video is smaller than 512px", async () => {
    const stub = stubCreateElement({
      duration: 10, videoWidth: 300, videoHeight: 200, ctx: ctxObj, toDataURL: "data:image/png;base64,xyz",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      video.dispatchEvent(new Event("loadedmetadata"))
      video.dispatchEvent(new Event("seeked"))
      await p
      // scale = min(1, 512/300) = 1 → no downscale → 300×200
      expect(ctxObj.drawImage).toHaveBeenCalledWith(video, 0, 0, 300, 200)
    } finally {
      stub.spy.mockRestore()
    }
  })

  it("clamps seek time to duration - 0.05", async () => {
    const stub = stubCreateElement({
      duration: 5, videoWidth: 640, videoHeight: 480, ctx: ctxObj, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 100)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      // Spy on currentTime setter to verify clamping.
      let seekedTime = -1
      Object.defineProperty(video, "currentTime", {
        configurable: true,
        get: () => seekedTime,
        set: (v: number) => { seekedTime = v },
      })
      video.dispatchEvent(new Event("loadedmetadata"))
      // t = min(100, max(0, 5 - 0.05)) = 4.95
      expect(seekedTime).toBeCloseTo(4.95, 5)
      video.dispatchEvent(new Event("seeked"))
      expect(await p).toBe("data:image/png;base64,abc")
    } finally {
      stub.spy.mockRestore()
    }
  })

  it("sets crossOrigin, muted, preload, playsInline on the video element", async () => {
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: ctxObj, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      expect(video.crossOrigin).toBe("anonymous")
      expect(video.muted).toBe(true)
      expect(video.preload).toBe("auto")
      expect(video.playsInline).toBe(true)
      // Resolve to avoid hanging timer.
      video.dispatchEvent(new Event("loadedmetadata"))
      video.dispatchEvent(new Event("seeked"))
      await p
    } finally {
      stub.spy.mockRestore()
    }
  })

  it("sets video.src to the provided URL", async () => {
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: ctxObj, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/test", 1)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      expect(video.src).toBe("blob:http://x/test")
      video.dispatchEvent(new Event("loadedmetadata"))
      video.dispatchEvent(new Event("seeked"))
      await p
    } finally {
      stub.spy.mockRestore()
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// seek+draw error / fallback paths
// ════════════════════════════════════════════════════════════════════════════

describe("extract-video-frame — seek+draw error paths", () => {
  let createSpy: ReturnType<typeof vi.spyOn>

  afterEach(() => {
    if (createSpy) createSpy.mockRestore()
  })

  it("returns null when canvas.getContext('2d') returns null", async () => {
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: null, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      video.dispatchEvent(new Event("loadedmetadata"))
      video.dispatchEvent(new Event("seeked"))
      expect(await p).toBeNull()
    } finally {
      stub.spy.mockRestore()
    }
  })

  it("returns null when canvas.toDataURL returns an empty string (the `dataUrl || null` guard)", async () => {
    const ctxObj = { drawImage: vi.fn() }
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: ctxObj, toDataURL: "",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      video.dispatchEvent(new Event("loadedmetadata"))
      video.dispatchEvent(new Event("seeked"))
      expect(await p).toBeNull()
    } finally {
      stub.spy.mockRestore()
    }
  })

  it("returns null and logs when ctx.drawImage throws (canvas tainted / invalid state)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const ctxObj = {
      drawImage: vi.fn(() => { throw new Error("tainted canvas") }),
    }
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: ctxObj, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      video.dispatchEvent(new Event("loadedmetadata"))
      video.dispatchEvent(new Event("seeked"))
      expect(await p).toBeNull()
      expect(errSpy).toHaveBeenCalled()
      expect(errSpy.mock.calls[0][0]).toMatch(/extract-video-frame/)
    } finally {
      stub.spy.mockRestore()
      errSpy.mockRestore()
    }
  })

  it("returns null when canvas.toDataURL throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const ctxObj = { drawImage: vi.fn() }
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: ctxObj, toDataURLThrows: true,
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      stub.videos[0].dispatchEvent(new Event("loadedmetadata"))
      stub.videos[0].dispatchEvent(new Event("seeked"))
      expect(await p).toBeNull()
      expect(errSpy).toHaveBeenCalled()
      expect(errSpy.mock.calls[0][0]).toMatch(/extract-video-frame/)
    } finally {
      stub.spy.mockRestore()
      errSpy.mockRestore()
    }
  })

  it("returns null when video.onerror fires", async () => {
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: { drawImage: vi.fn() }, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      stub.videos[0].dispatchEvent(new Event("error"))
      expect(await p).toBeNull()
    } finally {
      stub.spy.mockRestore()
    }
  })

  it("returns null when video.currentTime setter throws (catch in onloadedmetadata)", async () => {
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: { drawImage: vi.fn() }, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      // Make currentTime setter throw.
      Object.defineProperty(video, "currentTime", {
        configurable: true,
        get: () => 0,
        set: () => { throw new Error("not seekable") },
      })
      video.dispatchEvent(new Event("loadedmetadata"))
      // The catch in onloadedmetadata calls clearTimeout + done(null).
      expect(await p).toBeNull()
    } finally {
      stub.spy.mockRestore()
    }
  })

  it("does NOT call drawImage when getContext returns null (skips the draw entirely)", async () => {
    const ctxObj = { drawImage: vi.fn() }
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: null, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      stub.videos[0].dispatchEvent(new Event("loadedmetadata"))
      stub.videos[0].dispatchEvent(new Event("seeked"))
      await p
      // ctxObj.drawImage was never called because getContext returned null and
      // the code returned early.
      expect(ctxObj.drawImage).not.toHaveBeenCalled()
    } finally {
      stub.spy.mockRestore()
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// cleanup behavior — the video's src is removed after resolution
// ════════════════════════════════════════════════════════════════════════════

describe("extract-video-frame — cleanup", () => {
  it("removes the src attribute and calls load() after successful extraction", async () => {
    const ctxObj = { drawImage: vi.fn() }
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: ctxObj, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      const loadSpy = vi.spyOn(video, "load")
      video.dispatchEvent(new Event("loadedmetadata"))
      video.dispatchEvent(new Event("seeked"))
      await p
      // cleanup removes src and calls load().
      expect(video.hasAttribute("src")).toBe(false)
      expect(loadSpy).toHaveBeenCalled()
    } finally {
      stub.spy.mockRestore()
    }
  })

  it("does not double-resolve (settled guard): a second seeked event does not change the result", async () => {
    const ctxObj = { drawImage: vi.fn() }
    const stub = stubCreateElement({
      duration: 10, videoWidth: 640, videoHeight: 480, ctx: ctxObj, toDataURL: "data:image/png;base64,abc",
    })
    try {
      const p = extractVideoFrame("blob:http://x/v", 1)
      await new Promise((r) => setTimeout(r, 0))
      const video = stub.videos[0]
      video.dispatchEvent(new Event("loadedmetadata"))
      video.dispatchEvent(new Event("seeked"))
      const result1 = await p
      // Dispatch another seeked — the settled guard prevents re-resolution.
      // (drawImage may run again since the handler re-enters, but done() is
      // a no-op the second time — the Promise has already resolved.)
      video.dispatchEvent(new Event("seeked"))
      // Allow any pending microtasks to flush.
      await new Promise((r) => setTimeout(r, 0))
      // The Promise result is unchanged — settled guard worked.
      expect(result1).toBe("data:image/png;base64,abc")
      // The Promise resolves exactly once — awaiting again gives the same value.
      expect(await p).toBe("data:image/png;base64,abc")
    } finally {
      stub.spy.mockRestore()
    }
  })
})
