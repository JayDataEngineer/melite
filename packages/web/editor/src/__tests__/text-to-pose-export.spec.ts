/**
 * Unit tests for lib/text-to-pose.ts — the export/download/deform surface
 * that text-to-pose-{lib,crud,render}.test.ts do NOT reach.
 *
 * Covered here:
 *   - decodeB64ToBuffer (data: URL fetch → ArrayBuffer)
 *   - generatePose (submit + waitForJob convenience wrapper)
 *   - downloadBVH / downloadAMASSNpz / downloadG1Csv / downloadFBX
 *     (missing-data guard, POST body, blob/b64 download path)
 *   - renderServerVideo (defaults, custom opts, mime fallback, error path)
 *   - downloadServerVideo (render + download chain)
 *   - fetchBindJoints (GET no-spec path, POST with-spec path, URL encoding,
 *     error messages)
 *   - preloadForgeService (no-op — always returns ok)
 *   - deformSomaJoints (Float32Array → nested-array body, identity spec,
 *     rotmat packing, error handling)
 *   - SOMA77_BONE_CONNECTIONS (structural sanity)
 *
 * Only apiFetch is mocked. Document.createElement / URL.createObjectURL are
 * left real (happy-dom provides them).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@melite/catalog/api", () => ({ apiFetch: vi.fn(), externalUrl: (u: string) => u }))

import { apiFetch } from "@melite/catalog"
import { generatePose, downloadBVH, downloadAMASSNpz, downloadG1Csv, downloadFBX, renderServerVideo, downloadServerVideo, fetchBindJoints, preloadForgeService, deformSomaJoints } from "@melite/catalog"
import { decodeB64ToBuffer, SOMA77_BONE_CONNECTIONS } from "@melite/formats"
import type { PoseMotion } from "@melite/catalog"

const mockFetch = apiFetch as unknown as ReturnType<typeof vi.fn>

function mkRes(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "application/json" } })
}

function makeMotion(overrides: Partial<PoseMotion> = {}): PoseMotion {
  return {
    fps: 30,
    frame_count: 10,
    duration_sec: 0.33,
    skeleton: "soma",
    model: "kimodo-diff",
    camera_view: "front",
    width: 512,
    height: 512,
    peak_frame_idx: 5,
    frames_flat: [],
    frames_coco18_3d: [],
    frames_soma77_3d: [[[0, 0, 0]]],
    frames_soma77_rotmat: [[[[1, 0, 0], [0, 1, 0], [0, 0, 1]]]],
    ...overrides,
  }
}

beforeEach(() => mockFetch.mockReset())

// ── decodeB64ToBuffer ────────────────────────────────────────────────────────
describe("text-to-pose — decodeB64ToBuffer", () => {
  it("fetches the data: URL and returns the ArrayBuffer", async () => {
    const buf = new ArrayBuffer(8)
    mockFetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => buf })
    const out = await decodeB64ToBuffer("AAAA")
    expect(out).toBe(buf)
    expect(mockFetch.mock.calls[0][0]).toBe("data:application/octet-stream;base64,AAAA")
  })
  it("returns the ArrayBuffer for a non-base64-safe URL", async () => {
    const buf = new ArrayBuffer(4)
    mockFetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => buf })
    const out = await decodeB64ToBuffer("SGVsbG8=")
    expect(out.byteLength).toBe(4)
  })
})

// ── generatePose ─────────────────────────────────────────────────────────────
describe("text-to-pose — generatePose (submit + wait)", () => {
  it("submits then waits, threading onUpdate through to waitForJob", async () => {
    // submitTextToPose returns { job_id, status }
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ job_id: "job-42", status: "pending" })))
    // pollJob returns completed with a full TextToPoseResult (motion nested)
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({
      job_id: "job-42", status: "completed",
      result: {
        status: "success", cache_hit: false, inference_time_sec: 1.5,
        motion: { fps: 30, frame_count: 1, frames_flat: [], frames_coco18_3d: [] } as PoseMotion,
      },
    })))
    const onUpdate = vi.fn()
    const result = await generatePose(
      { prompt: "hello", seed: 42, model: "kimodo-diff", camera_view: "front" } as never,
      { onUpdate, intervalMs: 10, timeoutMs: 1000 },
    )
    expect(result.status).toBe("success")
    expect(result.motion.fps).toBe(30)
    expect(onUpdate).toHaveBeenCalledTimes(1)
    // Two calls: submit + one poll.
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

// ── downloadBVH ──────────────────────────────────────────────────────────────
describe("text-to-pose — downloadBVH", () => {
  it("throws when motion is missing SOMA-77 data", async () => {
    const motion = makeMotion({ frames_soma77_3d: undefined, frames_soma77_rotmat: undefined })
    await expect(downloadBVH(motion)).rejects.toThrow(/missing SOMA-77/)
  })
  it("POSTs frames + fps and triggers a .bvh download", async () => {
    const motion = makeMotion()
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ bvh: "HIERARCHY\n" })))
    await downloadBVH(motion)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("/poser/text-to-pose/export/bvh")
    expect(init?.method).toBe("POST")
    const body = JSON.parse(init?.body as string)
    expect(body.fps).toBe(30)
    expect(body.standard_tpose).toBe(false)
    expect(body.frames_soma77_3d).toEqual(motion.frames_soma77_3d)
  })
  it("passes standard_tpose=true through when requested", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ bvh: "x" })))
    await downloadBVH(makeMotion(), true)
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).standard_tpose).toBe(true)
  })
  it("throws body.error on a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ error: "bad rotmats" }), 400))
    await expect(downloadBVH(makeMotion())).rejects.toThrow("bad rotmats")
  })
  it("falls back to HTTP status when body.error is absent", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({}), 500))
    await expect(downloadBVH(makeMotion())).rejects.toThrow(/BVH export failed: HTTP 500/)
  })
})

// ── downloadAMASSNpz ─────────────────────────────────────────────────────────
describe("text-to-pose — downloadAMASSNpz", () => {
  it("throws when motion is missing SOMA-77 data", async () => {
    const motion = makeMotion({ frames_soma77_3d: undefined })
    await expect(downloadAMASSNpz(motion)).rejects.toThrow(/missing SOMA-77/)
  })
  it("POSTs to /export/amass and downloads the b64 payload", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ data_b64: "AAAA" })))
    await downloadAMASSNpz(makeMotion())
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("/poser/text-to-pose/export/amass")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(init?.body as string).fps).toBe(30)
  })
  it("throws body.error on a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ error: "amass failed" }), 422))
    await expect(downloadAMASSNpz(makeMotion())).rejects.toThrow("amass failed")
  })
})

// ── downloadG1Csv ────────────────────────────────────────────────────────────
describe("text-to-pose — downloadG1Csv", () => {
  it("throws when motion is missing SOMA-77 data", async () => {
    await expect(downloadG1Csv(makeMotion({ frames_soma77_rotmat: undefined }))).rejects.toThrow(/missing SOMA-77/)
  })
  it("POSTs to /export/csv with fps", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ data_b64: "AAAA" })))
    await downloadG1Csv(makeMotion({ fps: 24 }))
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("/poser/text-to-pose/export/csv")
    expect(JSON.parse(init?.body as string).fps).toBe(24)
  })
  it("throws body.error on a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ error: "csv boom" }), 500))
    await expect(downloadG1Csv(makeMotion())).rejects.toThrow("csv boom")
  })
})

// ── downloadFBX ──────────────────────────────────────────────────────────────
describe("text-to-pose — downloadFBX", () => {
  it("throws when motion is missing SOMA-77 data", async () => {
    await expect(downloadFBX(makeMotion({ frames_soma77_3d: undefined }))).rejects.toThrow(/missing SOMA-77/)
  })
  it("POSTs to /export/fbx with mixamo flag", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ fbx: "FBX_HEADER\n" })))
    await downloadFBX(makeMotion(), true)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.mixamo).toBe(true)
    expect(body.fps).toBe(30)
  })
  it("defaults mixamo to true when omitted", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ fbx: "x" })))
    await downloadFBX(makeMotion())
    expect(JSON.parse(mockFetch.mock.calls[0][1].body as string).mixamo).toBe(true)
  })
  it("throws body.error on a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ error: "fbx failed" }), 500))
    await expect(downloadFBX(makeMotion())).rejects.toThrow("fbx failed")
  })
})

// ── renderServerVideo ────────────────────────────────────────────────────────
describe("text-to-pose — renderServerVideo", () => {
  it("POSTs frames_flat + fps with default 512x512 + #0d2847 bg", async () => {
    const motion = makeMotion({ frames_flat: [[1, 2, 3]] })
    const videoB64 = btoa("fake-video")
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ video_b64: videoB64, mime: "video/mp4" })))
    const blob = await renderServerVideo(motion)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("/poser/text-to-pose/export/video")
    const body = JSON.parse(init?.body as string)
    expect(body.frames_flat).toEqual([[1, 2, 3]])
    expect(body.fps).toBe(30)
    expect(body.width).toBe(512)
    expect(body.height).toBe(512)
    expect(body.background).toBe("#0d2847")
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe("video/mp4")
    expect(blob.size).toBeGreaterThan(0)
  })
  it("honours custom width, height, and background", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ video_b64: btoa("x"), mime: "video/webm" })))
    await renderServerVideo(makeMotion(), { width: 720, height: 480, background: "#ffffff" })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.width).toBe(720)
    expect(body.height).toBe(480)
    expect(body.background).toBe("#ffffff")
  })
  it("defaults mime to video/mp4 when the backend omits it", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ video_b64: btoa("x") })))
    const blob = await renderServerVideo(makeMotion())
    expect(blob.type).toBe("video/mp4")
  })
  it("throws body.error on a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ error: "render failed" }), 500))
    await expect(renderServerVideo(makeMotion())).rejects.toThrow("render failed")
  })
  it("falls back to HTTP status when body.error is absent", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({}), 503))
    await expect(renderServerVideo(makeMotion())).rejects.toThrow(/Video render failed: HTTP 503/)
  })
})

// ── downloadServerVideo ──────────────────────────────────────────────────────
describe("text-to-pose — downloadServerVideo", () => {
  it("renders then downloads the blob as a .mp4", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ video_b64: btoa("video-data"), mime: "video/mp4" })))
    await downloadServerVideo(makeMotion())
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
  it("passes opts through to renderServerVideo", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ video_b64: btoa("x"), mime: "video/mp4" })))
    await downloadServerVideo(makeMotion(), { width: 256, height: 256, background: "#000" })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.width).toBe(256)
    expect(body.background).toBe("#000")
  })
})

// ── fetchBindJoints ──────────────────────────────────────────────────────────
describe("text-to-pose — fetchBindJoints", () => {
  it("GETs bind_joints with identity_model query when no spec is supplied", async () => {
    const joints = { joints: [[0, 0, 0]], identity_model: "anny" }
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify(joints)))
    const out = await fetchBindJoints("anny")
    expect(out).toEqual(joints)
    expect(mockFetch.mock.calls[0][0]).toBe("/poser/skin/bind_joints?identity_model=anny")
    expect(mockFetch.mock.calls[0][1]).toBeUndefined()
  })
  it("switches to POST when identityCoeffs is supplied", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ joints: [], identity_model: "anny" })))
    await fetchBindJoints("anny", [0.5, 0.3])
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("/poser/skin/bind_joints")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(init?.body as string).identity_coeffs).toEqual([0.5, 0.3])
  })
  it("switches to POST when localChanges is supplied", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ joints: [], identity_model: "anny" })))
    await fetchBindJoints("anny", null, { height: 0.5 })
    expect(mockFetch.mock.calls[0][1].method).toBe("POST")
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).local_changes).toEqual({ height: 0.5 })
  })
  it("switches to POST when customTargets is supplied", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ joints: [], identity_model: "anny" })))
    await fetchBindJoints("anny", null, null, { target_x: 0.1 })
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).custom_targets).toEqual({ target_x: 0.1 })
  })
  it("does NOT switch to POST when all specs are empty (stays on GET path)", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ joints: [] })))
    await fetchBindJoints("anny", [], {}, {})
    // Empty array + empty objects → hasSpec is false → GET path (no init arg).
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain("/poser/skin/bind_joints?identity_model=anny")
    expect(init).toBeUndefined() // no POST init
  })
  it("URL-encodes the identity_model in the GET path", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ joints: [] })))
    await fetchBindJoints("my model")
    expect(mockFetch.mock.calls[0][0]).toContain("my%20model")
  })
  it("GET error includes the response text", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "server boom" } as unknown as Response)
    await expect(fetchBindJoints("anny")).rejects.toThrow(/Failed to load bind joints: 500 server boom/)
  })
  it("POST error includes the response text", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => "bad coeffs" } as unknown as Response)
    await expect(fetchBindJoints("anny", [1])).rejects.toThrow(/400 bad coeffs/)
  })
  it("defaults identityModel to 'anny'", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ joints: [] })))
    await fetchBindJoints()
    expect(mockFetch.mock.calls[0][0]).toContain("identity_model=anny")
  })
})

// ── preloadForgeService ──────────────────────────────────────────────────────
describe("text-to-pose — preloadForgeService (no-op)", () => {
  it("returns { status: 'ok', service } immediately without fetching", async () => {
    const out = await preloadForgeService("comfyui", "kimodo-diff")
    expect(out).toEqual({ status: "ok", service: "comfyui" })
    expect(mockFetch).not.toHaveBeenCalled()
  })
  it("works without a model arg", async () => {
    const out = await preloadForgeService("comfyui")
    expect(out.status).toBe("ok")
    expect(out.service).toBe("comfyui")
  })
})

// ── deformSomaJoints ─────────────────────────────────────────────────────────
describe("text-to-pose — deformSomaJoints", () => {
  function makeJoints(): Float32Array {
    // 77 joints × 3 components = 231 floats.
    const arr = new Float32Array(77 * 3)
    for (let i = 0; i < arr.length; i++) arr[i] = i * 0.01
    return arr
  }
  it("POSTs the joints as a nested array with identity_model + binary:true", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ vertices_b64: "AAAA" })))
    const joints = makeJoints()
    await deformSomaJoints(joints, "anny")
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("/poser/skin/deform_soma")
    expect(init?.method).toBe("POST")
    const body = JSON.parse(init?.body as string)
    expect(body.identity_model).toBe("anny")
    expect(body.binary).toBe(true)
    expect(body.frames_soma77_3d).toHaveLength(1) // one frame
    expect(body.frames_soma77_3d[0]).toHaveLength(77) // 77 joints
    expect(body.frames_soma77_3d[0][0]).toHaveLength(3) // xyz
  })
  it("returns the vertices_b64 string", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ vertices_b64: "base64data" })))
    const out = await deformSomaJoints(makeJoints(), "soma")
    expect(out).toBe("base64data")
  })
  it("defaults identityModel to 'anny'", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ vertices_b64: "x" })))
    await deformSomaJoints(makeJoints())
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).identity_model).toBe("anny")
  })
  it("includes identity_coeffs when supplied", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ vertices_b64: "x" })))
    await deformSomaJoints(makeJoints(), "anny", null, [0.1, 0.2])
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).identity_coeffs).toEqual([0.1, 0.2])
  })
  it("includes localChanges when supplied", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ vertices_b64: "x" })))
    await deformSomaJoints(makeJoints(), "anny", null, null, { height: 0.5 })
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).local_changes).toEqual({ height: 0.5 })
  })
  it("includes customTargets when supplied", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ vertices_b64: "x" })))
    await deformSomaJoints(makeJoints(), "anny", null, null, null, { target: 1 })
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).custom_targets).toEqual({ target: 1 })
  })
  it("packs jointsRot into frames_soma77_rotmat (77 × 3×3 nested)", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ vertices_b64: "x" })))
    const rot = new Float32Array(77 * 9)
    for (let i = 0; i < rot.length; i++) rot[i] = i
    await deformSomaJoints(makeJoints(), "anny", rot)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.frames_soma77_rotmat).toHaveLength(1) // one frame
    expect(body.frames_soma77_rotmat[0]).toHaveLength(77) // 77 joints
    expect(body.frames_soma77_rotmat[0][0]).toHaveLength(3) // 3 rows
    expect(body.frames_soma77_rotmat[0][0][0]).toHaveLength(3) // 3 cols
    // Verify a value: joint 0, row 0 = [0, 1, 2]
    expect(body.frames_soma77_rotmat[0][0][0]).toEqual([0, 1, 2])
  })
  it("packs baseRotmats into frames_soma77_base_rotmat", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ vertices_b64: "x" })))
    const baseRot = new Float32Array(77 * 9)
    await deformSomaJoints(makeJoints(), "anny", null, null, null, null, baseRot)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.frames_soma77_base_rotmat).toBeDefined()
    expect(body.frames_soma77_base_rotmat[0]).toHaveLength(77)
  })
  it("does NOT include rotmats when the Float32Array is the wrong length", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ vertices_b64: "x" })))
    const badRot = new Float32Array(10) // wrong length
    await deformSomaJoints(makeJoints(), "anny", badRot)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body).not.toHaveProperty("frames_soma77_rotmat")
  })
  it("throws on a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => "deform failed" } as unknown as Response)
    await expect(deformSomaJoints(makeJoints(), "anny")).rejects.toThrow(/Re-skin failed: 500 deform failed/)
  })
  it("throws data.error on an OK response with an error field", async () => {
    mockFetch.mockResolvedValueOnce(mkRes(JSON.stringify({ error: "bad joints" })))
    await expect(deformSomaJoints(makeJoints(), "anny")).rejects.toThrow("bad joints")
  })
})

// ── SOMA77_BONE_CONNECTIONS ──────────────────────────────────────────────────
describe("text-to-pose — SOMA77_BONE_CONNECTIONS structural sanity", () => {
  it("is a non-empty array of [from, to] joint index pairs", () => {
    expect(SOMA77_BONE_CONNECTIONS.length).toBeGreaterThan(0)
    for (const [a, b] of SOMA77_BONE_CONNECTIONS) {
      expect(typeof a).toBe("number")
      expect(typeof b).toBe("number")
      expect(a).toBeGreaterThanOrEqual(0)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(77)
      expect(b).toBeLessThan(77)
    }
  })
  it("every connection has distinct endpoints (no bone from a joint to itself)", () => {
    for (const [a, b] of SOMA77_BONE_CONNECTIONS) {
      expect(a, `bone [${a}, ${b}] has identical endpoints`).not.toBe(b)
    }
  })
  it("covers a reasonable fraction of the 77 joints (at least 50%)", () => {
    const referenced = new Set<number>()
    for (const [a, b] of SOMA77_BONE_CONNECTIONS) {
      referenced.add(a)
      referenced.add(b)
    }
    expect(referenced.size).toBeGreaterThanOrEqual(38)
  })
})
