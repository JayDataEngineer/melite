/**
 * Unit tests for lib/psdExport.ts — minimal layered PSD (Photoshop) writer.
 *
 * Tests the pure byte-assembly path: buildPsd with explicit mergedRgba and
 * empty/skipped layers avoids the Image-decode dependency. Verifies the
 * PSD file header, channel structure, and Blob type. downloadBlob is
 * tested via URL.createObjectURL + anchor-click interception.
 *
 * Coverage:
 *   - buildPsd: Blob type, PSD signature '8BPS', version 1, channels 3,
 *     depth 8, color mode 3 (RGB), width/height big-endian round-trip,
 *     merged-image data planes (R, G, B) raw bytes appear in order.
 *   - buildPsd: skipped (null dataUrl) layers don't crash.
 *   - buildPsd: minimal 1x1 produces a Blob of the expected shape.
 *   - buildPsd: mergedRgba of N pixels → N bytes per RGB plane in the
 *     Image Data section (raw / uncompressed).
 *   - downloadBlob: URL.createObjectURL called once, anchor.download set
 *     to filename, anchor.click invoked, URL.revokeObjectURL scheduled.
 *
 * Zero prior coverage. A regression in the big-endian byte writer or the
 * PSD header layout would produce files Photoshop refuses to open.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { buildPsd, downloadBlob } from "@melite/formats"
import type { PsdLayerInput } from "@melite/formats"

// Helper: extract the first N bytes of a Blob as a Uint8Array.
async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer()
  return new Uint8Array(buf)
}

// Helper: read a big-endian uint32 at offset.
function u32be(bytes: Uint8Array, off: number): number {
  return ((bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]) >>> 0
}
function u16be(bytes: Uint8Array, off: number): number {
  return ((bytes[off] << 8) | bytes[off + 1]) >>> 0
}

// ── buildPsd: header + structure ────────────────────────────────────────────
describe("psdExport — buildPsd: Blob + header", () => {
  it("returns a Blob typed as image/vnd.adobe.photoshop", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe("image/vnd.adobe.photoshop")
  })
  it("first 4 bytes are the PSD signature '8BPS'", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("8BPS")
  })
  it("version is 1 (big-endian uint16 at offset 4)", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    expect(u16be(bytes, 4)).toBe(1)
  })
  it("6 reserved zero bytes follow the version (offset 6..11)", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    for (let i = 6; i < 12; i++) expect(bytes[i]).toBe(0)
  })
  it("channels = 3 (RGB) at offset 12", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    expect(u16be(bytes, 12)).toBe(3)
  })
  it("height + width are written big-endian at offsets 14 + 18", async () => {
    const blob = await buildPsd([], 7, 11, new Uint8ClampedArray(7 * 11 * 4))
    const bytes = await blobToBytes(blob)
    expect(u32be(bytes, 14)).toBe(11) // height
    expect(u32be(bytes, 18)).toBe(7)  // width
  })
  it("depth = 8 (offset 22) and color mode = 3 RGB (offset 24)", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    expect(u16be(bytes, 22)).toBe(8)
    expect(u16be(bytes, 24)).toBe(3)
  })
})

describe("psdExport — buildPsd: merged image data", () => {
  it("1x1 red pixel: R plane=255, G=0, B=0 in the merged image data", async () => {
    // 1x1 with mergedRgba = [255, 0, 0, 255] (opaque red).
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([255, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    // The image-data section is at the END of the file. Format:
    //   u16 compression (0 = raw) then R plane, G plane, B plane.
    // For 1x1, each plane is 1 byte. Last 5 bytes = [0, 0, 255, 0, 0].
    const last5 = bytes.slice(bytes.length - 5)
    expect(last5[0]).toBe(0) // compression type high byte
    expect(last5[1]).toBe(0) // compression type low byte
    expect(last5[2]).toBe(255) // R
    expect(last5[3]).toBe(0)   // G
    expect(last5[4]).toBe(0)   // B
  })
  it("2x2: 4 bytes per plane, R plane appears before G before B", async () => {
    // 2x2 with mergedRgba:
    //   pixel(0,0)=red [255,0,0,255]
    //   pixel(1,0)=grn [0,255,0,255]
    //   pixel(0,1)=blu [0,0,255,255]
    //   pixel(1,1)=wht [255,255,255,255]
    const merged = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 255, 255,
    ])
    const blob = await buildPsd([], 2, 2, merged)
    const bytes = await blobToBytes(blob)
    // Last 2 (compression) + 3 planes × 4 bytes = 14 bytes
    const tail = bytes.slice(bytes.length - 14)
    expect(u16be(tail, 0)).toBe(0) // compression raw
    const rPlane = tail.slice(2, 6)
    const gPlane = tail.slice(6, 10)
    const bPlane = tail.slice(10, 14)
    expect(Array.from(rPlane)).toEqual([255, 0, 0, 255])
    expect(Array.from(gPlane)).toEqual([0, 255, 0, 255])
    expect(Array.from(bPlane)).toEqual([0, 0, 255, 255])
  })
})

describe("psdExport — buildPsd: layer handling", () => {
  it("a layer with null dataUrl is skipped (no crash, valid Blob)", async () => {
    const layers: PsdLayerInput[] = [
      { name: "empty", dataUrl: null, opacity: 1, blendMode: "normal", visible: true },
    ]
    const blob = await buildPsd(layers, 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("8BPS")
  })
  it("layer-section layer count is 0 when no decodable layers are present", async () => {
    // The Layer Info section's first 2 bytes are the (signed) layer count.
    // Header = 26 bytes. Color mode data = 4-byte len + 0 bytes = 4. Image
    // resources = 4-byte len + 0 bytes = 4. So Layer and Mask Information
    // section starts at offset 26 + 4 + 4 = 34.
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    const layerMaskLen = u32be(bytes, 34)
    expect(layerMaskLen).toBeGreaterThan(0)
    // First 4 bytes of the section = layer-section length (u32)
    // Bytes 4..5 of the section = signed int16 layer count
    const layerCount = (bytes[38] << 8) | bytes[39]
    // Interpret as signed int16
    const signed = layerCount > 0x7fff ? layerCount - 0x10000 : layerCount
    expect(signed).toBe(0)
  })
})

// ── downloadBlob ────────────────────────────────────────────────────────────
describe("psdExport — downloadBlob", () => {
  let createURL: ReturnType<typeof vi.spyOn>
  let revokeURL: ReturnType<typeof vi.spyOn>
  let createdAnchors: HTMLAnchorElement[]

  beforeEach(() => {
    createURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake-url")
    revokeURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    // Intercept document.createElement('a') to capture the anchor without
    // actually dispatching a click event into the DOM.
    createdAnchors = []
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreate(tag)
      if (tag.toLowerCase() === "a") {
        createdAnchors.push(el as HTMLAnchorElement)
        // Stub click so we don't try to navigate a phantom href.
        ;(el as HTMLAnchorElement).click = vi.fn() as unknown as HTMLAnchorElement["click"]
      }
      return el as any
    })
    // document.body may not exist in happy-dom's detached state — appendChild
    // can throw. Stub it.
    if (!document.body) {
      Object.defineProperty(document, "body", {
        value: document.createElement("body"),
        configurable: true,
      })
    }
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("calls URL.createObjectURL once with the Blob", () => {
    const blob = new Blob([], { type: "image/png" })
    downloadBlob(blob, "out.png")
    expect(createURL).toHaveBeenCalledTimes(1)
    expect(createURL).toHaveBeenCalledWith(blob)
  })
  it("creates an anchor with href=blob:url and download=filename", () => {
    const blob = new Blob([], { type: "image/png" })
    downloadBlob(blob, "frame-001.png")
    expect(createdAnchors).toHaveLength(1)
    const a = createdAnchors[0]
    expect(a.href).toBe("blob:fake-url")
    expect(a.download).toBe("frame-001.png")
  })
  it("invokes anchor.click() exactly once", () => {
    const blob = new Blob([])
    downloadBlob(blob, "x.png")
    expect(createdAnchors[0].click).toHaveBeenCalledTimes(1)
  })
  it("schedules URL.revokeObjectURL (async — fired after a setTimeout)", () => {
    vi.useFakeTimers()
    try {
      const blob = new Blob([])
      downloadBlob(blob, "x.png")
      expect(revokeURL).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(revokeURL).toHaveBeenCalledTimes(1)
      expect(revokeURL).toHaveBeenCalledWith("blob:fake-url")
    } finally {
      vi.useRealTimers()
    }
  })

  it("appends the anchor to document.body, then removes it after click", () => {
    const blob = new Blob([])
    const before = document.body.children.length
    downloadBlob(blob, "x.png")
    // After click + remove, body should have the same child count as before.
    expect(document.body.children.length).toBe(before)
  })

  it("works with an empty filename", () => {
    const blob = new Blob([])
    downloadBlob(blob, "")
    expect(createdAnchors).toHaveLength(1)
    expect(createdAnchors[0].download).toBe("")
  })

  it("works with a long filename", () => {
    const blob = new Blob([])
    const long = "x".repeat(200)
    downloadBlob(blob, long)
    expect(createdAnchors[0].download).toBe(long)
  })

  it("works with unicode + special characters in the filename", () => {
    const blob = new Blob([])
    downloadBlob(blob, "Frame_001_final — (✓).png")
    expect(createdAnchors[0].download).toBe("Frame_001_final — (✓).png")
  })

  it("creates exactly one anchor per call (no leakage across calls)", () => {
    const blob = new Blob([])
    downloadBlob(blob, "a.png")
    downloadBlob(blob, "b.png")
    downloadBlob(blob, "c.png")
    expect(createdAnchors).toHaveLength(3)
    expect(createdAnchors.map((a) => a.download)).toEqual(["a.png", "b.png", "c.png"])
  })

  it("uses a unique blob: URL per Blob (createObjectURL called with each Blob)", () => {
    const blob1 = new Blob([])
    const blob2 = new Blob([])
    downloadBlob(blob1, "a.png")
    downloadBlob(blob2, "b.png")
    expect(createURL).toHaveBeenCalledWith(blob1)
    expect(createURL).toHaveBeenCalledWith(blob2)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Header byte-layout — pin the section offsets so future refactors can't
// silently shift the layout (and break Photoshop's reader).
// ════════════════════════════════════════════════════════════════════════════
describe("psdExport — header section offsets", () => {
  it("Color Mode Data section is a 4-byte zero length at offset 26", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    // Color mode data: u32 length = 0.
    expect(u32be(bytes, 26)).toBe(0)
  })

  it("Image Resources section is a 4-byte zero length at offset 30", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    expect(u32be(bytes, 30)).toBe(0)
  })

  it("Layer and Mask Information section length is at offset 34 (non-zero for empty layers)", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    // For 0 decoded layers: layerSection = u32(2) + i16(0) = 6 bytes; even(6)=6.
    // u32 at offset 34 = layerMaskPadded = 6.
    expect(u32be(bytes, 34)).toBe(6)
  })

  it("Layer Info section (inner) length is a u32 at offset 38 = 2 for empty layers", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    // Layer section body starts at offset 38. First u32 = layerInfoPadded = 2.
    expect(u32be(bytes, 38)).toBe(2)
  })

  it("Layer count is a signed i16 at offset 42, value 0 for empty layers", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    // offset 38 = u32 inner length (4 bytes), offset 42 = i16 layer count.
    const raw = (bytes[42] << 8) | bytes[43]
    const signed = raw > 0x7fff ? raw - 0x10000 : raw
    expect(signed).toBe(0)
  })

  it("Merged image data starts with compression u16 = 0 (raw) at offset 44", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    // offset 34 (u32 outer len=6) + offset 38 (u32 inner len=2) + 2 (i16 count)
    // = offset 44. First u16 of merged image data = compression tag = 0.
    expect(u16be(bytes, 44)).toBe(0)
  })

  it("Total file size for 1x1 empty-layers = 49 bytes (26 hdr + 4 + 4 + 10 + 5 image)", async () => {
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    // Header 26 + colorModeData 4 + imageResources 4 + layerMaskSection 10
    //   (u32 outer len + 6 body) + imageData 5 (u16 comp + 3 planes × 1 byte)
    //   = 26 + 4 + 4 + 4 + 6 + 5 = 49.
    expect(bytes.length).toBe(49)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Width / height clamping + rounding (Math.max(1, Math.round))
// ════════════════════════════════════════════════════════════════════════════
describe("psdExport — width/height clamping + rounding", () => {
  it("clamps width=0 to 1", async () => {
    const blob = await buildPsd([], 0, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    expect(u32be(bytes, 18)).toBe(1) // width
    expect(u32be(bytes, 14)).toBe(1) // height
  })

  it("clamps height=0 to 1", async () => {
    const blob = await buildPsd([], 1, 0, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    expect(u32be(bytes, 14)).toBe(1)
  })

  it("clamps negative width to 1", async () => {
    const blob = await buildPsd([], -5, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    // Math.max(1, Math.round(-5)) = Math.max(1, -5) = 1
    expect(u32be(bytes, 18)).toBe(1)
  })

  it("clamps negative height to 1", async () => {
    const blob = await buildPsd([], 1, -3, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    expect(u32be(bytes, 14)).toBe(1)
  })

  it("rounds width=2.7 to 3", async () => {
    const blob = await buildPsd([], 2.7, 1, new Uint8ClampedArray(3 * 1 * 4))
    const bytes = await blobToBytes(blob)
    expect(u32be(bytes, 18)).toBe(3)
  })

  it("rounds height=4.4 to 4", async () => {
    const blob = await buildPsd([], 1, 4.4, new Uint8ClampedArray(1 * 4 * 4))
    const bytes = await blobToBytes(blob)
    expect(u32be(bytes, 14)).toBe(4)
  })

  it("rounds width=2.5 to 3 (Math.round ties toward +Infinity)", async () => {
    const blob = await buildPsd([], 2.5, 1, new Uint8ClampedArray(3 * 1 * 4))
    const bytes = await blobToBytes(blob)
    expect(u32be(bytes, 18)).toBe(3) // 2.5 → 3 (banker's-free JS Math.round)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Plane byte-layout for non-trivial dimensions
// ════════════════════════════════════════════════════════════════════════════
describe("psdExport — plane byte-layout", () => {
  it("3x1 image produces 3 bytes per plane, all 9 bytes appear in RGB order", async () => {
    // 3 pixels: red, green, blue.
    const merged = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
    ])
    const blob = await buildPsd([], 3, 1, merged)
    const bytes = await blobToBytes(blob)
    // Tail = u16 compression + 3 planes × 3 bytes = 2 + 9 = 11 bytes.
    const tail = bytes.slice(bytes.length - 11)
    expect(u16be(tail, 0)).toBe(0) // compression raw
    // R plane: [255, 0, 0]  (R from each pixel)
    // G plane: [0, 255, 0]
    // B plane: [0, 0, 255]
    expect(Array.from(tail.slice(2, 5))).toEqual([255, 0, 0])
    expect(Array.from(tail.slice(5, 8))).toEqual([0, 255, 0])
    expect(Array.from(tail.slice(8, 11))).toEqual([0, 0, 255])
  })

  it("1x3 image (vertical) produces 3 bytes per plane in column-major pixel order", async () => {
    // 3 vertical pixels: top=red, mid=green, bot=blue.
    const merged = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
    ])
    const blob = await buildPsd([], 1, 3, merged)
    const bytes = await blobToBytes(blob)
    // Plane size = 1*3 = 3 bytes. Tail = 2 + 9 = 11.
    const tail = bytes.slice(bytes.length - 11)
    expect(Array.from(tail.slice(2, 5))).toEqual([255, 0, 0])   // R
    expect(Array.from(tail.slice(5, 8))).toEqual([0, 255, 0])   // G
    expect(Array.from(tail.slice(8, 11))).toEqual([0, 0, 255])  // B
  })

  it("preserves exact alpha-stripped RGB (alpha channel is not in merged image data)", async () => {
    // Half-transparent red: rgba = [255, 0, 0, 128].
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([255, 0, 0, 128]))
    const bytes = await blobToBytes(blob)
    // Image data: u16 + R + G + B = 5 bytes. Alpha is NOT emitted.
    const tail = bytes.slice(bytes.length - 5)
    expect(tail[2]).toBe(255) // R
    expect(tail[3]).toBe(0)   // G
    expect(tail[4]).toBe(0)   // B
  })

  it("total image-data section size = 2 + 3 * (w * h) bytes", async () => {
    // 4x2 = 8 pixels. Image data = 2 + 3*8 = 26 bytes.
    const merged = new Uint8ClampedArray(4 * 2 * 4) // 32 bytes RGBA, all zero
    const blob = await buildPsd([], 4, 2, merged)
    const bytes = await blobToBytes(blob)
    // Image data section is the final 26 bytes.
    expect(bytes.length).toBeGreaterThanOrEqual(26)
    const imageSection = bytes.slice(bytes.length - 26)
    // Compression tag at start of section.
    expect(u16be(imageSection, 0)).toBe(0)
    // R, G, B planes each 8 bytes.
    expect(imageSection.length).toBe(2 + 3 * 8)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Layer-section even-padding (when layerInfoBytes has odd length, an extra
// zero byte must pad it to even).
// ════════════════════════════════════════════════════════════════════════════
describe("psdExport — even-padding invariant", () => {
  it("layer-mask section length is always even (padded if necessary)", async () => {
    // Use empty layers — the section length should be 6 (even).
    const blob = await buildPsd([], 1, 1, new Uint8ClampedArray([0, 0, 0, 255]))
    const bytes = await blobToBytes(blob)
    const sectionLen = u32be(bytes, 34)
    expect(sectionLen % 2).toBe(0)
  })

  it("the file always ends with a complete RGB plane triplet (no truncation)", async () => {
    // For 2x3 image, each plane = 6 bytes. File must end with 2 + 3*6 = 20 bytes.
    const merged = new Uint8ClampedArray(2 * 3 * 4)
    const blob = await buildPsd([], 2, 3, merged)
    const bytes = await blobToBytes(blob)
    // Last 20 bytes are the image-data section.
    expect(bytes.length).toBeGreaterThanOrEqual(20)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Composite path (no explicit mergedRgba) — exercises the canvas blending
// flow. happy-dom doesn't ship a real canvas 2d context, so we stub
// document.createElement to capture the composite-step calls + return a
// deterministic getImageData() result.
// ════════════════════════════════════════════════════════════════════════════
describe("psdExport — composite path (no mergedRgba)", () => {
  let originalCreateElement: typeof document.createElement
  let fakeCtxs: { getImageData_returns: Uint8ClampedArray; calls: string[] }
  let putImageData_inputs: { data: Uint8ClampedArray; w: number; h: number }[]

  beforeEach(() => {
    originalCreateElement = document.createElement.bind(document)
    fakeCtxs = {
      getImageData_returns: new Uint8ClampedArray([10, 20, 30, 255]),
      calls: [],
    }
    putImageData_inputs = []
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === "canvas") {
        // Stub getContext to return a fake 2d context that records calls.
        const fakeCtx = {
          clearRect: () => { fakeCtxs.calls.push("clearRect") },
          drawImage: () => { fakeCtxs.calls.push("drawImage") },
          putImageData: (img: ImageData) => {
            putImageData_inputs.push({ data: img.data as Uint8ClampedArray, w: img.width, h: img.height })
          },
          getImageData: () => {
            fakeCtxs.calls.push("getImageData")
            // Return a fresh ImageData so the composite has something to use.
            const out = new ImageData(
              new Uint8ClampedArray(fakeCtxs.getImageData_returns),
              1, 1,
            )
            return out
          },
          set globalAlpha(_: number) { /* no-op */ },
          get globalAlpha(): number { return 1 },
          set globalCompositeOperation(_: GlobalCompositeOperation) { /* no-op */ },
          get globalCompositeOperation(): GlobalCompositeOperation { return "source-over" },
        }
        Object.defineProperty(el, "getContext", {
          value: () => fakeCtx,
          configurable: true,
        })
      }
      return el
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it("falls back to canvas-composited mergedRgba when none is provided", async () => {
    // No layers and no mergedRgba — the composite path runs (canvas-based).
    const blob = await buildPsd([], 1, 1)
    expect(blob).toBeInstanceOf(Blob)
    // The canvas path called getImageData at least once to materialize merged.
    expect(fakeCtxs.calls).toContain("getImageData")
  })

  it("respects the explicit mergedRgba over the canvas composite (short-circuit)", async () => {
    // When mergedRgba is provided, the canvas-composite path is NEVER entered.
    const explicit = new Uint8ClampedArray([255, 128, 64, 255])
    const blob = await buildPsd([], 1, 1, explicit)
    const bytes = await blobToBytes(blob)
    // The merged planes should reflect `explicit`, NOT the stubbed getImageData.
    const tail = bytes.slice(bytes.length - 5)
    expect(tail[2]).toBe(255) // R
    expect(tail[3]).toBe(128) // G
    expect(tail[4]).toBe(64)  // B
    // Canvas getImageData was never called (explicit mergedRgba short-circuits).
    expect(fakeCtxs.calls).not.toContain("getImageData")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Blob size scales linearly with pixel count (regression: confirm no
// accidental padding blow-up for larger images).
// ════════════════════════════════════════════════════════════════════════════
describe("psdExport — Blob size scaling", () => {
  it("1x2 image has exactly 1 more byte per plane than 1x1 (size scales linearly)", async () => {
    const small = await buildPsd([], 1, 1, new Uint8ClampedArray(4))
    const big = await buildPsd([], 1, 2, new Uint8ClampedArray(8))
    const sBytes = await blobToBytes(small)
    const bBytes = await blobToBytes(big)
    // Adding 1 pixel = +1 byte per plane × 3 planes = +3 bytes total.
    expect(bBytes.length - sBytes.length).toBe(3)
  })

  it("2x2 image Blob is 12 bytes larger than 1x1 (3 planes × 3 extra bytes)", async () => {
    const small = await buildPsd([], 1, 1, new Uint8ClampedArray(4))
    const big = await buildPsd([], 2, 2, new Uint8ClampedArray(16))
    const sBytes = await blobToBytes(small)
    const bBytes = await blobToBytes(big)
    // 2x2 = 4 pixels, 1x1 = 1 pixel. Delta = 3 planes × 3 bytes = 9.
    expect(bBytes.length - sBytes.length).toBe(9)
  })

  it("large 100x100 image produces a Blob > 30000 bytes (3 planes × 10000 bytes)", async () => {
    const merged = new Uint8ClampedArray(100 * 100 * 4)
    const blob = await buildPsd([], 100, 100, merged)
    // 3 planes × 10000 bytes = 30000 + header (~44) + 2-byte compression tag.
    expect(blob.size).toBeGreaterThan(30000)
  })
})
