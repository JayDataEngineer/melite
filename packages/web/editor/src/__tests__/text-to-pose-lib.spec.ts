/**
 * Unit tests for lib/text-to-pose.ts — the 1,153-line pose client. Every pose
 * surface (TextToPoseTab, PoseStudioSidebar, etc.) mocks this module away via
 * `vi.mock("@melite/catalog", ...)`, which means the REAL payload-shaping,
 * response-parsing, base64 frame-slicing, and poll/timeout logic had ZERO
 * runtime coverage — tsc + bundle proved none of it. These tests exercise the
 * real module with only the network choke point (apiFetch) mocked.
 *
 * Coverage:
 *   - Pure helpers: pickFrame (clamp + index), formatBytes (B/KB/MB),
 *     encodeBufferToB64 (chunked btoa round-trip incl. the 0x8000 boundary).
 *   - sliceFrameAsB64: stride math, frame clamping, empty-buffer null,
 *     custom vertexCount — via a mocked apiFetch returning a raw ArrayBuffer.
 *   - Network contract: submitTextToPose (happy / HTTP-error / JSON-error /
 *     invalid-JSON), pollJob (happy / 404 / HTTP-error), waitForJob (completed
 *     / failed / cancelled / multi-poll + onUpdate / timeout), cancelJob
 *     (happy / 404-idempotent / error).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock ONLY the network choke point — everything else is the real module.
vi.mock("@melite/catalog/api", () => ({ apiFetch: vi.fn(), externalUrl: (u: string) => u }))

import { apiFetch } from "@melite/catalog"
import { pickFrame, formatBytes, sliceFrameAsB64, submitTextToPose, pollJob, waitForJob, cancelJob } from "@melite/catalog"
import { encodeBufferToB64, SOMA_VERTEX_COUNT } from "@melite/formats"
import type { PoseMotion, TextToPoseRequest } from "@melite/catalog"

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Build a minimal Response (happy-dom provides the Response global). */
function mkRes(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "application/json" } })
}

/** Build a PoseMotion fixture with N flat frames of [j, j] pseudo-keypoints. */
function makeMotion(frames: number): PoseMotion {
  const flat: number[][] = []
  for (let f = 0; f < frames; f++) {
    flat.push([f * 10, f * 10 + 1]) // 2 numbers per frame — enough for pickFrame
  }
  return {
    fps: 30, frame_count: frames, duration_sec: frames / 30,
    skeleton: "soma77", model: "kimodo-soma-rp", camera_view: "front",
    width: 512, height: 512, peak_frame_idx: Math.floor(frames / 2),
    frames_flat: flat, frames_coco18_3d: [],
  }
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset()
})

// ════════════════════════════════════════════════════════════════════════════
// PURE HELPERS — no network, no mock
// ════════════════════════════════════════════════════════════════════════════
describe("text-to-pose lib — pickFrame", () => {
  it("returns the flat keypoints at the requested frame index", () => {
    const m = makeMotion(5)
    expect(pickFrame(m, 2)).toEqual([20, 21])
  })

  it("clamps a negative index to frame 0", () => {
    const m = makeMotion(5)
    expect(pickFrame(m, -3)).toEqual([0, 1]) // frame 0
  })

  it("clamps an index past the last frame to frame_count-1", () => {
    const m = makeMotion(5)
    expect(pickFrame(m, 99)).toEqual([40, 41]) // last frame
  })

  it("handles a single-frame motion (idx 0 only)", () => {
    const m = makeMotion(1)
    expect(pickFrame(m, 0)).toEqual([0, 1])
    expect(pickFrame(m, 5)).toEqual([0, 1]) // clamped
  })
})

describe("text-to-pose lib — formatBytes", () => {
  it("renders bytes below 1 KB with a ' B' suffix", () => {
    expect(formatBytes(0)).toBe("0 B")
    expect(formatBytes(512)).toBe("512 B")
    expect(formatBytes(1023)).toBe("1023 B")
  })
  it("renders bytes between 1 KB and 1 MB with one decimal + ' KB'", () => {
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(1536)).toBe("1.5 KB")
    expect(formatBytes(1024 * 1024 - 1)).toMatch(/KB$/)
  })
  it("renders bytes ≥ 1 MB with one decimal + ' MB'", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB")
    expect(formatBytes(1024 * 1024 * 2.5)).toBe("2.5 MB")
  })
})

describe("text-to-pose lib — encodeBufferToB64 (chunked base64)", () => {
  it("round-trips a small Uint8Array (btoa/atob invertibility)", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 255, 128, 64])
    const b64 = encodeBufferToB64(bytes)
    // Decode and compare — the round trip must be lossless.
    const decoded = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    expect(Array.from(decoded)).toEqual(Array.from(bytes))
  })

  it("encodes an empty buffer to an empty string", () => {
    expect(encodeBufferToB64(new Uint8Array(0))).toBe("")
  })

  it("handles inputs larger than the 0x8000 (32 KB) chunk boundary without dropping bytes", () => {
    // The implementation chunks at 0x8000 because String.fromCharCode.apply
    // has an argument limit. A >32 KB input exercises the multi-chunk path.
    const n = 0x8000 + 10 // 32778 bytes — spans two chunks
    const bytes = new Uint8Array(n)
    for (let i = 0; i < n; i++) bytes[i] = i % 256
    const b64 = encodeBufferToB64(bytes)
    const decoded = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    expect(decoded.length).toBe(n)
    expect(Array.from(decoded)).toEqual(Array.from(bytes))
  })
})

// ════════════════════════════════════════════════════════════════════════════
// sliceFrameAsB64 — stride math via a mocked apiFetch (returns ArrayBuffer)
// ════════════════════════════════════════════════════════════════════════════
describe("text-to-pose lib — sliceFrameAsB64", () => {
  /** Build a (T, V, 3) float32 buffer and return its ArrayBuffer. */
  function multiFrameBuffer(frames: number, verts: number): ArrayBuffer {
    const arr = new Float32Array(frames * verts * 3)
    for (let f = 0; f < frames; f++) {
      for (let v = 0; v < verts; v++) {
        const base = (f * verts + v) * 3
        arr[base] = f
        arr[base + 1] = v
        arr[base + 2] = f + v
      }
    }
    return arr.buffer
  }

  /** Decode a base64 string back to a Uint8Array (for verifying slice output). */
  function b64ToBytes(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  }

  it("extracts the requested frame as a single-frame float32 buffer", async () => {
    const V = 4
    const buf = multiFrameBuffer(3, V) // 3 frames, 4 verts
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(buf))

    const out = await sliceFrameAsB64("ignored-when-mocked", 1, V)
    expect(out).not.toBeNull()
    const bytes = b64ToBytes(out!)
    const floats = new Float32Array(bytes.buffer)
    expect(floats.length).toBe(V * 3)
    // Frame 1: each vert (v) is [1, v, 1+v].
    expect(floats[0]).toBe(1) // f
    expect(floats[1]).toBe(0) // v=0
    expect(floats[2]).toBe(1) // f+v
    expect(floats[3]).toBe(1) // f (vert 1)
    expect(floats[4]).toBe(1) // v=1
  })

  it("clamps frameIdx to [0, totalFrames-1]", async () => {
    const V = 2
    const buf = multiFrameBuffer(3, V)
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(buf))
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(buf))

    // idx 99 → clamped to frame 2 (the last).
    const outLast = await sliceFrameAsB64("x", 99, V)
    const floatsLast = new Float32Array(b64ToBytes(outLast!).buffer)
    expect(floatsLast[0]).toBe(2) // f=2

    // idx -5 → clamped to frame 0.
    const outFirst = await sliceFrameAsB64("x", -5, V)
    const floatsFirst = new Float32Array(b64ToBytes(outFirst!).buffer)
    expect(floatsFirst[0]).toBe(0) // f=0
  })

  it("returns null when the buffer has fewer than one frame's worth of data", async () => {
    // 2 floats total — with V=4 (stride 12), that's far less than one frame.
    const tiny = new Float32Array([1.5, 2.5]).buffer
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(tiny))
    const out = await sliceFrameAsB64("x", 0, 4)
    expect(out).toBeNull()
  })

  it("honors a custom vertexCount (stride = vertexCount * 3)", async () => {
    const V = 8
    const buf = multiFrameBuffer(2, V)
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(buf))
    const out = await sliceFrameAsB64("x", 0, V)
    const floats = new Float32Array(b64ToBytes(out!).buffer)
    expect(floats.length).toBe(V * 3) // 24
  })

  it("defaults vertexCount to SOMA_VERTEX_COUNT when omitted", async () => {
    const buf = multiFrameBuffer(2, SOMA_VERTEX_COUNT)
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(buf))
    const out = await sliceFrameAsB64("x", 0)
    expect(out).not.toBeNull()
    const floats = new Float32Array(b64ToBytes(out!).buffer)
    expect(floats.length).toBe(SOMA_VERTEX_COUNT * 3)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// NETWORK CONTRACT — submitTextToPose / pollJob / waitForJob / cancelJob
// ════════════════════════════════════════════════════════════════════════════
describe("text-to-pose lib — submitTextToPose", () => {
  const req: TextToPoseRequest = {
    prompt: "a wave",
    seed: null,
    duration_sec: 1.0,
    camera_view: "front",
    cfg_type: "regular",
    frame_strategy: "auto_peak",
    num_samples: 1,
    prompt_segments: [{ text: "a wave", duration_sec: 1.0 }],
  }

  it("POSTs the request body and returns the parsed SubmitResponse", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkRes(JSON.stringify({ job_id: "job-123", status: "pending", poll_url: "/poser/text-to-pose/jobs/job-123" })),
    )
    const out = await submitTextToPose(req)
    expect(out).toEqual({ job_id: "job-123", status: "pending", poll_url: "/poser/text-to-pose/jobs/job-123" })
    // Verify the fetch was a POST with a JSON body containing the prompt.
    const [url, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(url).toBe("/poser/text-to-pose")
    expect(init?.method).toBe("POST")
    expect(init?.headers).toEqual({ "Content-Type": "application/json" })
    const body = JSON.parse(init?.body as string)
    expect(body.prompt).toBe("a wave")
    expect(body.prompt_segments[0]).toEqual({ text: "a wave", duration_sec: 1.0 })
    expect(body.seed).toBeNull()
  })

  it("throws with the HTTP status + text detail on a non-OK response", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkRes("plain error text", 502),
    )
    await expect(submitTextToPose(req)).rejects.toThrow(/HTTP 502.*plain error text/)
  })

  it("extracts the error field when the non-OK body is JSON {error}", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkRes(JSON.stringify({ error: "GPU OOM" }), 500),
    )
    await expect(submitTextToPose(req)).rejects.toThrow(/GPU OOM/)
  })

  it("throws 'invalid JSON' when the OK body isn't parseable", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkRes("<<<not json>>>"))
    await expect(submitTextToPose(req)).rejects.toThrow(/invalid JSON/)
  })
})

describe("text-to-pose lib — pollJob", () => {
  it("GETs /jobs/{id} and returns the parsed status envelope", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkRes(JSON.stringify({ status: "running", progress: 0.5 })),
    )
    const out = await pollJob("job-7")
    expect(out).toEqual({ status: "running", progress: 0.5 })
    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe("/poser/text-to-pose/jobs/job-7")
  })

  it("throws 'not found' on a 404", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkRes("nope", 404))
    await expect(pollJob("ghost")).rejects.toThrow(/not found/)
  })

  it("throws with the HTTP status on other error codes", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(mkRes("server boom", 500))
    await expect(pollJob("job-7")).rejects.toThrow(/HTTP 500/)
  })
})

describe("text-to-pose lib — waitForJob", () => {
  it("returns the result immediately when the first poll is 'completed'", async () => {
    const result = { status: "success", cache_hit: false, inference_time_sec: 1.2, motion: makeMotion(3) }
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkRes(JSON.stringify({ status: "completed", result })),
    )
    const out = await waitForJob("job-1", { intervalMs: 1, timeoutMs: 1000 })
    expect(out.status).toBe("success")
    expect(out.motion.frame_count).toBe(3)
  })

  it("invokes onUpdate for each poll (progress UI hook)", async () => {
    const onUpdate = vi.fn()
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mkRes(JSON.stringify({ status: "running", progress: 0.3 })))
      .mockResolvedValueOnce(mkRes(JSON.stringify({ status: "completed", result: { status: "success", cache_hit: false, inference_time_sec: 1, motion: makeMotion(2) } })))
    await waitForJob("job-1", { intervalMs: 1, timeoutMs: 1000, onUpdate })
    expect(onUpdate).toHaveBeenCalledTimes(2)
    expect(onUpdate.mock.calls[0][0]).toMatchObject({ status: "running", progress: 0.3 })
  })

  it("throws the server's error message when the job fails", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkRes(JSON.stringify({ status: "failed", error: "CUDA out of memory" })),
    )
    await expect(waitForJob("job-1", { intervalMs: 1 })).rejects.toThrow(/CUDA out of memory/)
  })

  it("throws 'cancelled' when the job is cancelled", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(
      mkRes(JSON.stringify({ status: "cancelled" })),
    )
    await expect(waitForJob("job-1", { intervalMs: 1 })).rejects.toThrow(/cancelled/i)
  })

  it("times out when the job never reaches a terminal state", async () => {
    // mockImplementation (not mockResolvedValue) so each poll gets a FRESH
    // Response — pollJob consumes the body via .text(), and a shared Response
    // would throw "Body has already been used" on the second poll.
    vi.mocked(apiFetch).mockImplementation(async () =>
      mkRes(JSON.stringify({ status: "running", progress: 0.1 })),
    )
    await expect(waitForJob("job-1", { intervalMs: 1, timeoutMs: 5 })).rejects.toThrow(/timed out/)
  })
})

describe("text-to-pose lib — cancelJob", () => {
  it("DELETEs the job and resolves on a 2xx", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(null, { status: 204 }))
    await expect(cancelJob("job-9")).resolves.toBeUndefined()
    const [url, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(url).toBe("/poser/text-to-pose/jobs/job-9")
    expect(init?.method).toBe("DELETE")
  })

  it("treats 404 as idempotent (no throw — already gone)", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(null, { status: 404 }))
    await expect(cancelJob("ghost")).resolves.toBeUndefined()
  })

  it("throws on any other error status", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(new Response(null, { status: 500 }))
    await expect(cancelJob("job-9")).rejects.toThrow(/HTTP 500/)
  })
})
