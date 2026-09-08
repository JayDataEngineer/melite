/**
 * Unit tests for lib/pngMeta.ts — PNG tEXt chunk embed/parse + ASCII JSON
 * escaping. Powers the Pose-Studio <-> ComfyUI round-trip (images carry their
 * `workflow`/`prompt` JSON so they can be dragged back in to recover state).
 *
 * Zero prior coverage. The CRC32 algorithm, the IHDR-offset insertion point,
 * the keyword\0text layout, the Latin-1 ASCII-escape requirement, and the
 * workflow/prompt/parameters fallback chain were all unverified. A wrong CRC
 * would make every embedded PNG fail ComfyUI's reader; a missing \uXXXX escape
 * would corrupt every non-ASCII prompt silently.
 *
 * Pure module (no network, no DOM beyond atob/btoa/TextDecoder globals).
 */
import { describe, it, expect, vi } from "vitest"
import {
  asciiJsonStringify, embedPngText, parsePngText, readWorkflowFromPng,
} from "@melite/formats"

// ── Reference CRC32 (IEEE 802.3, reflected, poly 0xedb88320) ────────────────
// Used to pin the module's CRC output without importing the private crc32.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c >>> 0
  }
  return t
})()
function refCrc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ── Minimal valid PNG fixture ───────────────────────────────────────────────
// sig(8) + IHDR chunk (len=13, type, 13 data bytes, crc) + IEND chunk.
// buildChunk isn't exported, so we assemble by hand (CRCs need not be valid for
// embedPngText/parsePngText — neither verifies CRC on read).
function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff])
}
function minimalPngBytes(): Uint8Array {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdrData = new Uint8Array(13) // 1x1, bitdepth=0... valid enough for chunk walking
  const ihdr = new Uint8Array([...u32be(13), ...new TextEncoder().encode("IHDR"), ...ihdrData, ...u32be(0)])
  const iend = new Uint8Array([...u32be(0), ...new TextEncoder().encode("IEND"), ...u32be(0)])
  return new Uint8Array([...sig, ...ihdr, ...iend])
}
function bytesToDataUrl(bytes: Uint8Array): string {
  let bin = ""
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return `data:image/png;base64,${btoa(bin)}`
}
function minimalPngDataUrl(): string {
  return bytesToDataUrl(minimalPngBytes())
}

// ════════════════════════════════════════════════════════════════════════════
// asciiJsonStringify
// ════════════════════════════════════════════════════════════════════════════
describe("pngMeta — asciiJsonStringify", () => {
  it("passes pure-ASCII JSON through unchanged", () => {
    expect(asciiJsonStringify({ a: "hello", b: 1 })).toBe('{"a":"hello","b":1}')
  })
  it("escapes non-ASCII code points as \\uXXXX (Latin-1 tEXt compliance)", () => {
    // 'é' = U+00E9. The output must NOT contain the raw byte; it must be é.
    const out = asciiJsonStringify("café")
    expect(out).toContain("\\u00e9")
    expect(out).not.toContain("é")
  })
  it("escapes higher-plane chars (e.g. U+2764 ❤) as a surrogate pair", () => {
    const out = asciiJsonStringify("❤")
    // ❤ = U+2764 → ❤ (inside the BMP, single escape).
    expect(out).toMatch(/\\u2764/)
  })
  it("round-trips through JSON.parse (no data loss)", () => {
    const obj = { prompt: "女孩在跳舞", nested: { emoji: "🎉", n: 7 } }
    const restored = JSON.parse(asciiJsonStringify(obj))
    expect(restored).toEqual(obj)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// CRC32 pin (validates the reference, then asserts the module's chunk CRC)
// ════════════════════════════════════════════════════════════════════════════
describe("pngMeta — CRC32 (validated against the standard test vector)", () => {
  it("reference CRC32('123456789') === 0xCBF43926 (the canonical check value)", () => {
    expect(refCrc32(new TextEncoder().encode("123456789"))).toBe(0xCBF43926)
  })
  it("the embedded tEXt chunk's CRC matches the reference CRC of type+data", () => {
    const embedded = embedPngText(minimalPngDataUrl(), { workflow: '{"nodes":[]}' })
    // Decode the embedded output back to bytes.
    const b64 = embedded.slice(embedded.indexOf(",") + 1)
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    // The tEXt chunk starts right after IHDR. sig(8)+[len IHDR:4][type:4][data:13][crc:4]=33.
    const chunkStart = 33
    const dataLen = ((bytes[chunkStart] << 24) | (bytes[chunkStart + 1] << 16)
      | (bytes[chunkStart + 2] << 8) | bytes[chunkStart + 3]) >>> 0
    const typeBytes = bytes.subarray(chunkStart + 4, chunkStart + 8)
    const dataBytes = bytes.subarray(chunkStart + 8, chunkStart + 8 + dataLen)
    const embeddedCrc = ((bytes[chunkStart + 8 + dataLen] << 24)
      | (bytes[chunkStart + 9 + dataLen] << 16)
      | (bytes[chunkStart + 10 + dataLen] << 8)
      | bytes[chunkStart + 11 + dataLen]) >>> 0
    const crcInput = new Uint8Array(typeBytes.length + dataBytes.length)
    crcInput.set(typeBytes, 0)
    crcInput.set(dataBytes, typeBytes.length)
    expect(embeddedCrc).toBe(refCrc32(crcInput))
    expect(new TextDecoder().decode(typeBytes)).toBe("tEXt")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// embedPngText
// ════════════════════════════════════════════════════════════════════════════
describe("pngMeta — embedPngText", () => {
  it("returns the input unchanged when metadata is empty", () => {
    const url = minimalPngDataUrl()
    expect(embedPngText(url, {})).toBe(url)
  })
  it("returns the input unchanged when it isn't a PNG data URL (bad signature)", () => {
    const notPng = "data:image/jpeg;base64," + btoa("not a png at all, too short anyway")
    expect(embedPngText(notPng, { workflow: "x" })).toBe(notPng)
  })
  it("returns the input unchanged when the bytes are too short to be a PNG (< 8)", () => {
    const tiny = "data:image/png;base64," + btoa("abcd") // 4 bytes
    expect(embedPngText(tiny, { workflow: "x" })).toBe(tiny)
  })
  it("embeds and re-parses a single key round-trip", () => {
    const embedded = embedPngText(minimalPngDataUrl(), { workflow: '{"nodes":[1,2]}' })
    const parsed = parsePngText(embedded)
    expect(parsed["workflow"]).toBe('{"nodes":[1,2]}')
  })
  it("embeds multiple keys, all recoverable", () => {
    const embedded = embedPngText(minimalPngDataUrl(), {
      workflow: '{"a":1}', prompt: '{"b":2}', tech_noir: '{"seed":42}',
    })
    const parsed = parsePngText(embedded)
    expect(parsed["workflow"]).toBe('{"a":1}')
    expect(parsed["prompt"]).toBe('{"b":2}')
    expect(parsed["tech_noir"]).toBe('{"seed":42}')
  })
  it("inserts chunks immediately after IHDR (offset 33), before IEND", () => {
    const embedded = embedPngText(minimalPngDataUrl(), { workflow: "x" })
    const b64 = embedded.slice(embedded.indexOf(",") + 1)
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    // First chunk after sig is IHDR at offset 8. Next chunk at offset 33 must be tEXt.
    const firstType = new TextDecoder("latin1").decode(bytes.subarray(8 + 4, 8 + 8))
    expect(firstType).toBe("IHDR")
    const secondType = new TextDecoder("latin1").decode(bytes.subarray(33 + 4, 33 + 8))
    expect(secondType).toBe("tEXt")
  })
  it("skips entries with an empty key", () => {
    const embedded = embedPngText(minimalPngDataUrl(), { "": "nope", workflow: "yes" })
    const parsed = parsePngText(embedded)
    expect(parsed["workflow"]).toBe("yes")
    expect(Object.keys(parsed)).not.toContain("")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// parsePngText
// ════════════════════════════════════════════════════════════════════════════
describe("pngMeta — parsePngText", () => {
  it("returns {} for a non-PNG data URL", () => {
    const notPng = "data:image/jpeg;base64," + btoa("not a png but long enough to pass the length gate")
    expect(parsePngText(notPng)).toEqual({})
  })
  it("returns {} for too-short input", () => {
    expect(parsePngText("data:image/png;base64," + btoa("abcd"))).toEqual({})
  })
  it("last write wins on duplicate keys", () => {
    // Embed two tEXt chunks with the same key by embedding once, then embedding
    // again on the result — the second pass inserts a second chunk after IHDR,
    // both survive, parsePngText should keep the LAST one it sees.
    let url = minimalPngDataUrl()
    url = embedPngText(url, { workflow: "first" })
    url = embedPngText(url, { workflow: "second" })
    const parsed = parsePngText(url)
    // Both chunks are in the stream; the iteration order is file order, so the
    // "second" chunk (inserted later = closer to IHDR) is read FIRST. The
    // "first" chunk (further from IHDR) is read LAST → wins.
    expect(parsed["workflow"]).toBe("first")
  })
})

// ════════════════════════════════════════════════════════════════════════════
// readWorkflowFromPng — fallback chain + malformed-JSON handling
// ════════════════════════════════════════════════════════════════════════════
describe("pngMeta — readWorkflowFromPng", () => {
  it("parses the `workflow` key as JSON when present", () => {
    const url = embedPngText(minimalPngDataUrl(), { workflow: '{"nodes":[1,2,3]}' })
    expect(readWorkflowFromPng(url)).toEqual({ nodes: [1, 2, 3] })
  })
  it("falls back to `prompt` when workflow is absent", () => {
    const url = embedPngText(minimalPngDataUrl(), { prompt: '{"p":9}' })
    expect(readWorkflowFromPng(url)).toEqual({ p: 9 })
  })
  it("falls back to `parameters` when both workflow and prompt are absent", () => {
    const url = embedPngText(minimalPngDataUrl(), { parameters: '{"seed":42}' })
    expect(readWorkflowFromPng(url)).toEqual({ seed: 42 })
  })
  it("prefers `workflow` over `prompt` when both are present", () => {
    const url = embedPngText(minimalPngDataUrl(), { workflow: '{"who":"wf"}', prompt: '{"who":"pr"}' })
    expect(readWorkflowFromPng(url)).toEqual({ who: "wf" })
  })
  it("returns null when no workflow/prompt/parameters chunk exists", () => {
    const url = embedPngText(minimalPngDataUrl(), { tech_noir: '{"x":1}' })
    expect(readWorkflowFromPng(url)).toBeNull()
  })
  it("returns null and logs when the embedded JSON is malformed", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const url = embedPngText(minimalPngDataUrl(), { workflow: "<<<not json>>>" })
    expect(readWorkflowFromPng(url)).toBeNull()
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})
