/**
 * Unit tests for lib/text-to-pose.ts — canvas + download helpers that had
 * ZERO runtime coverage:
 *   - renderOpenPoseCanvas: COCO-18 stick-figure → PNG Blob
 *   - downloadBase64Payload: b64 → anchor click → browser download
 *   - downloadMotionNpz: PoseMotion.soma_npz_b64 → downloadBase64Payload
 *   - downloadCanvasScreenshot: largest <canvas> → PNG download
 *
 * happy-dom provides a canvas element BUT getContext("2d") returns null and
 * toDataURL returns an empty "data:image/png;base64," — so we stub both on
 * HTMLCanvasElement.prototype with recording mocks that let us assert the
 * exact drawing sequence (clearRect/fillRect for background, stroke for
 * limbs, arc+fill for joints). The toDataURL stub returns a real PNG byte
 * sequence so the Blob round-trip produces non-zero bytes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderOpenPoseCanvas, downloadBase64Payload, downloadMotionNpz, downloadCanvasScreenshot } from "@melite/formats"
import type { PoseMotion } from "@melite/catalog"

// ── Stub helpers ────────────────────────────────────────────────────────────

/** Recording 2D context — captures every draw call + property assignment. */
function makeMockCtx() {
  const calls: { op: string; args: unknown[]; fillStyle?: string; strokeStyle?: string; lineWidth?: number }[] = []
  const ctx: Record<string, unknown> = {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    clearRect: (...a: unknown[]) => calls.push({ op: "clearRect", args: a }),
    fillRect: (...a: unknown[]) => calls.push({ op: "fillRect", args: a, fillStyle: ctx.fillStyle as string }),
    beginPath: () => calls.push({ op: "beginPath", args: [] }),
    moveTo: (...a: unknown[]) => calls.push({ op: "moveTo", args: a }),
    lineTo: (...a: unknown[]) => calls.push({ op: "lineTo", args: a }),
    stroke: () => calls.push({ op: "stroke", args: [], strokeStyle: ctx.strokeStyle as string, lineWidth: ctx.lineWidth as number }),
    arc: (...a: unknown[]) => calls.push({ op: "arc", args: a }),
    fill: () => calls.push({ op: "fill", args: [], fillStyle: ctx.fillStyle as string }),
  }
  return { ctx, calls }
}

/** A valid 1×1 PNG's base64 (67 bytes decoded). Used to exercise the real
 *  atob → Uint8Array → Blob round-trip in renderOpenPoseCanvas. */
const FAKE_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

let createdCanvases: HTMLCanvasElement[] = []
let mockCtx: ReturnType<typeof makeMockCtx> | null = null

beforeEach(() => {
  createdCanvases = []
  mockCtx = makeMockCtx()

  // Stub getContext to return our recording context.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement, _type: string) {
    // Track which canvas instance got called (for dimension assertions).
    if (!createdCanvases.includes(this)) createdCanvases.push(this)
    return mockCtx!.ctx as unknown as CanvasRenderingContext2D
  })

  // Stub toDataURL to return real PNG bytes (happy-dom returns empty b64).
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(function (this: HTMLCanvasElement, _type: string) {
    if (!createdCanvases.includes(this)) createdCanvases.push(this)
    return `data:image/png;base64,${FAKE_PNG_B64}`
  })

  // Stub toBlob (for downloadCanvasScreenshot) — default: immediately call
  // the callback with a Blob. Individual tests override this.
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
    _type?: string,
  ) {
    cb(new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" }))
    return undefined
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Helper: build 54-number flat keypoints (18 joints × [x,y,confidence]).
// All joints at pixel (512,512) in 1024-space with confidence 1.
function kp18AllVisible(): number[] {
  const out: number[] = []
  for (let i = 0; i < 18; i++) out.push(512, 512, 1)
  return out
}

// ─── renderOpenPoseCanvas — return value + dimensions ─────────────────────

describe("renderOpenPoseCanvas — Blob return + dimensions", () => {
  it("returns a Blob typed as image/png", () => {
    const blob = renderOpenPoseCanvas(kp18AllVisible())
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe("image/png")
  })

  it("decodes the toDataURL base64 into non-zero Blob bytes (atob round-trip)", () => {
    const blob = renderOpenPoseCanvas(kp18AllVisible())
    // FAKE_PNG_B64 decodes to 70 bytes; the Blob should carry those exact bytes.
    const expectedLen = atob(FAKE_PNG_B64).length
    expect(blob.size).toBe(expectedLen)
  })

  it("creates the canvas at the default 1024×1024 when no opts given", () => {
    renderOpenPoseCanvas(kp18AllVisible())
    expect(createdCanvases).toHaveLength(1)
    expect(createdCanvases[0].width).toBe(1024)
    expect(createdCanvases[0].height).toBe(1024)
  })

  it("honours custom width + height opts", () => {
    renderOpenPoseCanvas(kp18AllVisible(), { width: 640, height: 480 })
    expect(createdCanvases[0].width).toBe(640)
    expect(createdCanvases[0].height).toBe(480)
  })
})

// ─── renderOpenPoseCanvas — background ────────────────────────────────────

describe("renderOpenPoseCanvas — background handling", () => {
  it("calls clearRect(0,0,w,h) for the default 'transparent' background", () => {
    renderOpenPoseCanvas(kp18AllVisible())
    const rects = mockCtx!.calls.filter((c) => c.op === "clearRect")
    expect(rects).toHaveLength(1)
    expect(rects[0].args).toEqual([0, 0, 1024, 1024])
  })

  it("calls clearRect at custom dimensions for transparent background", () => {
    renderOpenPoseCanvas(kp18AllVisible(), { width: 800, height: 600, background: "transparent" })
    const rects = mockCtx!.calls.filter((c) => c.op === "clearRect")
    expect(rects).toHaveLength(1)
    expect(rects[0].args).toEqual([0, 0, 800, 600])
  })

  it("sets fillStyle + calls fillRect for a solid background colour", () => {
    renderOpenPoseCanvas(kp18AllVisible(), { background: "#FF0000" })
    const rects = mockCtx!.calls.filter((c) => c.op === "fillRect")
    expect(rects).toHaveLength(1)
    expect(rects[0].fillStyle).toBe("#FF0000")
    expect(rects[0].args).toEqual([0, 0, 1024, 1024])
  })

  it("does NOT call clearRect when a solid background is requested", () => {
    renderOpenPoseCanvas(kp18AllVisible(), { background: "black" })
    expect(mockCtx!.calls.some((c) => c.op === "clearRect")).toBe(false)
  })
})

// ─── renderOpenPoseCanvas — joint + limb drawing ──────────────────────────

describe("renderOpenPoseCanvas — limb + joint drawing", () => {
  it("draws all 18 skeleton limbs + 18 joints when all keypoints are visible", () => {
    renderOpenPoseCanvas(kp18AllVisible())
    // OPENPOSE_SKELETON has 18 entries; each visible limb → 1 stroke.
    const strokes = mockCtx!.calls.filter((c) => c.op === "stroke")
    expect(strokes.length).toBe(18)
    // 18 joints → 18 arc + 18 fill calls.
    const arcs = mockCtx!.calls.filter((c) => c.op === "arc")
    expect(arcs.length).toBe(18)
    const fills = mockCtx!.calls.filter((c) => c.op === "fill")
    expect(fills.length).toBe(18)
  })

  it("skips limbs where either joint has confidence below the 0.1 floor", () => {
    // Joint 0 visible, all others confidence=0 → only limbs involving joint 0
    // where the OTHER joint is also >= 0.1 survive. Since all others are 0,
    // no limbs should be drawn.
    const kp: number[] = []
    for (let i = 0; i < 18; i++) kp.push(512, 512, i === 0 ? 1 : 0)
    renderOpenPoseCanvas(kp)
    expect(mockCtx!.calls.some((c) => c.op === "stroke")).toBe(false)
    // Only joint 0 drawn → 1 arc + 1 fill.
    expect(mockCtx!.calls.filter((c) => c.op === "arc").length).toBe(1)
    expect(mockCtx!.calls.filter((c) => c.op === "fill").length).toBe(1)
  })

  it("confidence exactly 0.1 IS drawn (the guard is strict <, so 0.1 passes)", () => {
    const kp: number[] = []
    for (let i = 0; i < 18; i++) kp.push(512, 512, 0.1)
    renderOpenPoseCanvas(kp)
    expect(mockCtx!.calls.some((c) => c.op === "stroke")).toBe(true)
    expect(mockCtx!.calls.some((c) => c.op === "arc")).toBe(true)
  })

  it("confidence just below 0.1 (0.099) is NOT drawn", () => {
    const kp: number[] = []
    for (let i = 0; i < 18; i++) kp.push(512, 512, 0.099)
    renderOpenPoseCanvas(kp)
    expect(mockCtx!.calls.some((c) => c.op === "stroke")).toBe(false)
    expect(mockCtx!.calls.some((c) => c.op === "arc")).toBe(false)
  })

  it("confidence just above 0.1 IS drawn", () => {
    const kp: number[] = []
    for (let i = 0; i < 18; i++) kp.push(512, 512, 0.11)
    renderOpenPoseCanvas(kp)
    expect(mockCtx!.calls.some((c) => c.op === "stroke")).toBe(true)
    expect(mockCtx!.calls.some((c) => c.op === "arc")).toBe(true)
  })

  it("does not throw on an empty keypoints array (all 18 joints undefined)", () => {
    expect(() => renderOpenPoseCanvas([])).not.toThrow()
    // No valid joints → no drawing.
    expect(mockCtx!.calls.some((c) => c.op === "arc")).toBe(false)
    expect(mockCtx!.calls.some((c) => c.op === "stroke")).toBe(false)
  })

  it("does not throw when keypoints has fewer than 54 entries (partial)", () => {
    // Only 6 numbers → 2 valid joints max.
    expect(() => renderOpenPoseCanvas([100, 200, 1, 300, 400, 1])).not.toThrow()
    // Joint 0 + 1 visible → joints drawn. Limbs between them depend on
    // skeleton adjacency (0-1 is in OPENPOSE_SKELETON) → 1 limb.
    expect(mockCtx!.calls.filter((c) => c.op === "arc").length).toBe(2)
    expect(mockCtx!.calls.filter((c) => c.op === "stroke").length).toBe(1)
  })

  it("uses the default pointRadius of 5 when no opt given", () => {
    renderOpenPoseCanvas(kp18AllVisible())
    const arc = mockCtx!.calls.find((c) => c.op === "arc")!
    // arc(x, y, radius, startAngle, endAngle) — radius is args[2].
    expect(arc.args[2]).toBe(5)
  })

  it("honours a custom pointRadius", () => {
    renderOpenPoseCanvas(kp18AllVisible(), { pointRadius: 12 })
    const arc = mockCtx!.calls.find((c) => c.op === "arc")!
    expect(arc.args[2]).toBe(12)
  })

  it("uses the default lineWidth of 4 when no opt given", () => {
    renderOpenPoseCanvas(kp18AllVisible())
    const stroke = mockCtx!.calls.find((c) => c.op === "stroke")!
    expect(stroke.lineWidth).toBe(4)
  })

  it("honours a custom lineWidth", () => {
    renderOpenPoseCanvas(kp18AllVisible(), { lineWidth: 8 })
    const stroke = mockCtx!.calls.find((c) => c.op === "stroke")!
    expect(stroke.lineWidth).toBe(8)
  })

  it("scales keypoint pixel coords from 1024-space to the canvas dimensions", () => {
    // Joint at (512, 512) in 1024-space → (320, 240) on a 640×480 canvas.
    renderOpenPoseCanvas([512, 512, 1, ...new Array(51).fill(0)], { width: 640, height: 480 })
    const arc = mockCtx!.calls.find((c) => c.op === "arc")!
    expect(arc.args[0]).toBeCloseTo(320, 5)
    expect(arc.args[1]).toBeCloseTo(240, 5)
  })

  it("uses fillStyle #00FFFF for joints", () => {
    renderOpenPoseCanvas(kp18AllVisible())
    const fill = mockCtx!.calls.find((c) => c.op === "fill")!
    expect(fill.fillStyle).toBe("#00FFFF")
  })

  it("treats NaN x coord as off-screen (-9999) and skips the joint", () => {
    const kp: number[] = []
    for (let i = 0; i < 18; i++) kp.push(NaN, 512, 1)
    renderOpenPoseCanvas(kp)
    // x=NaN → x set to -9999 → joint guard `p.x < 0` skips it.
    expect(mockCtx!.calls.some((c) => c.op === "arc")).toBe(false)
    expect(mockCtx!.calls.some((c) => c.op === "stroke")).toBe(false)
  })

  it("treats Infinity x coord as off-screen (isFinite guard)", () => {
    const kp: number[] = []
    for (let i = 0; i < 18; i++) kp.push(Infinity, 512, 1)
    renderOpenPoseCanvas(kp)
    expect(mockCtx!.calls.some((c) => c.op === "arc")).toBe(false)
  })

  it("NaN y with finite x still draws (joint guard only checks x, not y)", () => {
    // Documents the production behaviour: y=-9999 is accepted because the
    // joint draw guard is `p.c < 0.1 || p.x < 0` — y is NOT checked.
    const kp: number[] = []
    for (let i = 0; i < 18; i++) kp.push(512, NaN, 1)
    renderOpenPoseCanvas(kp)
    expect(mockCtx!.calls.some((c) => c.op === "arc")).toBe(true)
  })
})

// ─── downloadBase64Payload ────────────────────────────────────────────────

describe("downloadBase64Payload — browser download trigger", () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => `blob:${(blob as Blob).size}`)
    revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    clickSpy = vi.spyOn(HTMLElement.prototype, "click").mockImplementation(function (this: HTMLElement) {})
  })

  it("creates an object URL from the decoded Blob and triggers an anchor click", () => {
    // "hello" in base64
    downloadBase64Payload("aGVsbG8=", "test.bin")
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob
    expect(blob.type).toBe("application/octet-stream")
    expect(blob.size).toBe(5) // "hello" is 5 bytes
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it("sets the anchor download attribute to the filename", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild")
    downloadBase64Payload("aGVsbG8=", "my-pose.png", "image/png")
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe("my-pose.png")
    expect(anchor.href).toContain("blob:")
    appendSpy.mockRestore()
  })

  it("honours a custom mimeType on the Blob", () => {
    downloadBase64Payload("aGVsbG8=", "x.json", "application/json")
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob
    expect(blob.type).toBe("application/json")
  })

  it("revokes the object URL after the click (no leak)", () => {
    downloadBase64Payload("aGVsbG8=", "test.bin")
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1)
  })

  it("returns early without clicking when the base64 is invalid", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    downloadBase64Payload("!!!not-base64!!!", "bad.bin")
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/invalid base64/i))
    expect(createObjectURLSpy).not.toHaveBeenCalled()
    expect(clickSpy).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it("decodes multi-byte payloads correctly (round-trip a 256-byte sequence)", () => {
    // Build a 256-byte sequence, base64-encode it, download, verify Blob bytes.
    const bytes = new Uint8Array(256)
    for (let i = 0; i < 256; i++) bytes[i] = i
    // btoa works on binary strings in the browser; build from char codes.
    let bin = ""
    for (let i = 0; i < 256; i++) bin += String.fromCharCode(bytes[i])
    const b64 = btoa(bin)
    downloadBase64Payload(b64, "all-bytes.bin")
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob
    expect(blob.size).toBe(256)
  })
})

// ─── downloadMotionNpz ────────────────────────────────────────────────────

describe("downloadMotionNpz — PoseMotion NPZ export", () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:fake")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    vi.spyOn(HTMLElement.prototype, "click").mockImplementation(function (this: HTMLElement) {})
  })

  it("throws when the motion has no soma_npz_b64", () => {
    const motion = { soma_npz_b64: undefined } as unknown as PoseMotion
    expect(() => downloadMotionNpz(motion)).toThrow(/No NPZ data/i)
  })

  it("delegates to downloadBase64Payload with the NPZ payload + default filename", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild")
    const motion = { soma_npz_b64: "aGVsbG8=" } as unknown as PoseMotion
    downloadMotionNpz(motion)
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe("motion.npz")
    appendSpy.mockRestore()
  })

  it("passes through a custom filename", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild")
    const motion = { soma_npz_b64: "aGVsbG8=" } as unknown as PoseMotion
    downloadMotionNpz(motion, "walk-cycle.npz")
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe("walk-cycle.npz")
    appendSpy.mockRestore()
  })

  it("uses application/octet-stream as the Blob type", () => {
    const motion = { soma_npz_b64: "aGVsbG8=" } as unknown as PoseMotion
    downloadMotionNpz(motion)
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob
    expect(blob.type).toBe("application/octet-stream")
  })
})

// ─── downloadCanvasScreenshot ─────────────────────────────────────────────

describe("downloadCanvasScreenshot — largest-canvas PNG capture", () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:fake")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    clickSpy = vi.spyOn(HTMLElement.prototype, "click").mockImplementation(function (this: HTMLElement) {})
  })

  it("is a no-op when no <canvas> elements exist in the DOM", () => {
    // Ensure no canvases in the document body.
    document.querySelectorAll("canvas").forEach((c) => c.remove())
    expect(() => downloadCanvasScreenshot()).not.toThrow()
    expect(createObjectURLSpy).not.toHaveBeenCalled()
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it("captures the largest canvas by width*height product", () => {
    const small = document.createElement("canvas")
    small.width = 100
    small.height = 100
    const large = document.createElement("canvas")
    large.width = 800
    large.height = 600
    document.body.appendChild(small)
    document.body.appendChild(large)

    const toBlobSpy = vi.spyOn(large, "toBlob")
    downloadCanvasScreenshot()
    expect(toBlobSpy).toHaveBeenCalledTimes(1)
    // The toBlob stub (from beforeEach) fires the callback synchronously.
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)

    small.remove()
    large.remove()
  })

  it("uses the default filename 'pose.png'", () => {
    const canvas = document.createElement("canvas")
    canvas.width = 200
    canvas.height = 200
    document.body.appendChild(canvas)

    const appendSpy = vi.spyOn(document.body, "appendChild")
    downloadCanvasScreenshot()
    // appendChild is called for both the canvas (no — canvas is already in
    // the DOM) and the anchor. Find the anchor call.
    const anchorCall = appendSpy.mock.calls.find(
      ([node]) => node instanceof HTMLAnchorElement,
    )
    expect(anchorCall).toBeDefined()
    expect((anchorCall![0] as HTMLAnchorElement).download).toBe("pose.png")

    appendSpy.mockRestore()
    canvas.remove()
  })

  it("honours a custom filename", () => {
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    document.body.appendChild(canvas)

    const appendSpy = vi.spyOn(document.body, "appendChild")
    downloadCanvasScreenshot("character.png")
    const anchorCall = appendSpy.mock.calls.find(
      ([node]) => node instanceof HTMLAnchorElement,
    )
    expect((anchorCall![0] as HTMLAnchorElement).download).toBe("character.png")

    appendSpy.mockRestore()
    canvas.remove()
  })

  it("requests image/png from toBlob", () => {
    const canvas = document.createElement("canvas")
    canvas.width = 64
    canvas.height = 64
    document.body.appendChild(canvas)

    // Override the prototype stub with a per-instance spy to verify args.
    const toBlobSpy = vi.spyOn(canvas, "toBlob")
    downloadCanvasScreenshot()
    expect(toBlobSpy.mock.calls[0][1]).toBe("image/png")

    canvas.remove()
  })
})
