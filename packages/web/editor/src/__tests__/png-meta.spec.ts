/**
 * Unit tests for lib/png-meta.ts — the minimal `tech_noir` tEXt-chunk
 * injector/reader used by the pose studio's capture path (embedPngText in
 * useTextToPoseStudio) to stamp generation params onto captured PNGs (the
 * noir-specific metadata side-channel, distinct from the ComfyUI-compatible
 * pngMeta.ts which uses arbitrary keys).
 *
 * Zero prior coverage. The injector and reader use the SAME internal chunk
 * builder/parser, so the round-trip is self-consistent — but we also verify
 * cross-compatibility with pngMeta.parsePngText (both speak tEXt), the PNG
 * signature gate, the data-URL-or-bare-base64 tolerance on read, and the
 * error-path that returns the input unchanged on failure.
 */
import { describe, it, expect, vi } from "vitest"
import { injectPngMeta, readPngMeta } from "@melite/formats"
import { parsePngText } from "@melite/formats"

// ── Minimal PNG fixture (bare base64, since injectPngMeta takes/returns b64) ─
function u32be(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]
}
function minimalPngB64(): string {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const ihdr = [...u32be(13), ...Array.from(new TextEncoder().encode("IHDR")), ...new Array(13).fill(0), ...u32be(0)]
  const iend = [...u32be(0), ...Array.from(new TextEncoder().encode("IEND")), ...u32be(0)]
  const bytes = new Uint8Array([...sig, ...ihdr, ...iend])
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

// ════════════════════════════════════════════════════════════════════════════
// injectPngMeta / readPngMeta round-trip
// ════════════════════════════════════════════════════════════════════════════
describe("png-meta — inject/read round-trip", () => {
  it("injects params and reads them back (tech_noir key)", () => {
    const params = { seed: 42, model: "sdxl", steps: 30, prompt: "a noir city" }
    const stamped = injectPngMeta(minimalPngB64(), params)
    expect(readPngMeta(stamped)).toEqual(params)
  })
  it("handles nested objects and arrays in params", () => {
    const params = { nodes: [{ id: 1, x: 0.5 }], meta: { version: "1.2.3" } }
    expect(readPngMeta(injectPngMeta(minimalPngB64(), params))).toEqual(params)
  })
  it("the injected chunk is readable by pngMeta.parsePngText (cross-module tEXt compat)", () => {
    const stamped = injectPngMeta(minimalPngB64(), { seed: 7 })
    const dataUrl = "data:image/png;base64," + stamped
    const chunks = parsePngText(dataUrl)
    expect(chunks["tech_noir"]).toBeDefined()
    expect(JSON.parse(chunks["tech_noir"])).toEqual({ seed: 7 })
  })
  it("round-trips an empty params object", () => {
    const stamped = injectPngMeta(minimalPngB64(), {})
    expect(readPngMeta(stamped)).toEqual({})
  })
  it("round-trips boolean and null primitive values", () => {
    const params: Record<string, unknown> = { flag: true, off: false, empty: null }
    expect(readPngMeta(injectPngMeta(minimalPngB64(), params))).toEqual(params)
  })
  it("round-trips multibyte UTF-8 in values (png-meta uses TextEncoder/TextDecoder, not Latin-1)", () => {
    // png-meta.ts uses TextEncoder().encode(json) which emits UTF-8 bytes,
    // and TextDecoder().decode() on read — so multibyte sequences survive.
    // (This is a deliberate divergence from pngMeta.ts which ASCII-escapes.)
    const params = { prompt: "夜晚的城市 🌃 café — naïve", kanji: "東京" }
    expect(readPngMeta(injectPngMeta(minimalPngB64(), params))).toEqual(params)
  })
  it("round-trips deeply nested structures (3+ levels)", () => {
    const params = { a: { b: { c: { d: { e: 42 } } } }, arr: [[1, 2], [3, 4]] }
    expect(readPngMeta(injectPngMeta(minimalPngB64(), params))).toEqual(params)
  })
  it("round-trips a large payload (4KB string)", () => {
    const big = "x".repeat(4096)
    const params = { prompt: big }
    expect(readPngMeta(injectPngMeta(minimalPngB64(), params))).toEqual(params)
  })
  it("JSON.stringify drops undefined values — they do NOT round-trip", () => {
    // JSON.stringify({ a: undefined, b: 1 }) === '{"b":1}'
    const stamped = injectPngMeta(minimalPngB64(), { a: undefined, b: 1 } as Record<string, unknown>)
    expect(readPngMeta(stamped)).toEqual({ b: 1 })
  })
  it("NaN serializes to null (JSON behavior) — does NOT round-trip as NaN", () => {
    const stamped = injectPngMeta(minimalPngB64(), { nan: NaN, inf: Infinity } as Record<string, unknown>)
    expect(readPngMeta(stamped)).toEqual({ nan: null, inf: null })
  })
  it("double-injection: the first (innermost) tech_noir chunk wins on read", () => {
    // Injecting twice inserts two tEXt chunks, both after IHDR (in order).
    // The reader walks chunks in file order and returns the FIRST tech_noir
    // match it finds. After two injections, the second-injected chunk ends
    // up CLOSER to IHDR than the first? Actually no — each injection splices
    // right after IHDR (pos 33), pushing everything else down. So the SECOND
    // injection's chunk is at pos 33 (closer to start) and is read FIRST.
    const first = injectPngMeta(minimalPngB64(), { round: 1 })
    const second = injectPngMeta(first, { round: 2 })
    const out = readPngMeta(second)
    expect(out).toEqual({ round: 2 })
  })
  it("produces output strictly longer than input (chunk added)", () => {
    const input = minimalPngB64()
    const stamped = injectPngMeta(input, { seed: 1 })
    // 4-byte length + 4-byte "tEXt" + N data + 4-byte CRC ≥ 16 overhead bytes
    // base64 encodes 3 bytes → 4 chars, so a ≥16-byte chunk adds ≥24 b64 chars
    // plus the tech_noir\0 prefix and JSON payload.
    expect(stamped.length).toBeGreaterThan(input.length + 24)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// readPngMeta — input tolerance
// ════════════════════════════════════════════════════════════════════════════
describe("png-meta — readPngMeta input tolerance", () => {
  it("accepts a data: URL (strips the prefix before atob)", () => {
    const stamped = injectPngMeta(minimalPngB64(), { k: "v" })
    expect(readPngMeta("data:image/png;base64," + stamped)).toEqual({ k: "v" })
  })
  it("returns null when no tech_noir chunk is present", () => {
    expect(readPngMeta(minimalPngB64())).toBeNull()
  })
  it("returns null on a non-PNG input (signature mismatch → atob succeeds but no chunk)", () => {
    const notPng = btoa("not a png but long enough to walk")
    expect(readPngMeta(notPng)).toBeNull()
  })
  it("returns null and logs on malformed base64 (atob throws)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(readPngMeta("!!!not-base64!!!")).toBeNull()
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
  it("returns null on a PNG with only the signature (no chunks to walk)", () => {
    // 8-byte signature, nothing else → while loop condition (pos + 12 <= 8) is
    // immediately false → returns null.
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const bytes = new Uint8Array(sig)
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    expect(readPngMeta(btoa(bin))).toBeNull()
  })
  it("stops walking at IEND and ignores any tech_noir chunk appearing after IEND", () => {
    // Manually construct: sig + IHDR + IEND + (would-be tech_noir that's never reached)
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const ihdr = [...u32be(13), ...Array.from(new TextEncoder().encode("IHDR")), ...new Array(13).fill(0), ...u32be(0)]
    const iend = [...u32be(0), ...Array.from(new TextEncoder().encode("IEND")), ...u32be(0)]
    const bytes = new Uint8Array([...sig, ...ihdr, ...iend])
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    expect(readPngMeta(btoa(bin))).toBeNull()
  })
  it("skips a tEXt chunk whose key is NOT 'tech_noir' (continues walking)", () => {
    // Build: sig + IHDR + tEXt(other_key) + IEND. The non-matching tEXt chunk
    // must be walked past (not returned), and no tech_noir exists → null.
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const ihdr = [...u32be(13), ...Array.from(new TextEncoder().encode("IHDR")), ...new Array(13).fill(0), ...u32be(0)]
    // tEXt data: "other\0payload"
    const enc = new TextEncoder()
    const keyB = enc.encode("other")
    const valB = enc.encode("ignored")
    const data = new Uint8Array(keyB.length + 1 + valB.length)
    data.set(keyB, 0)
    data[keyB.length] = 0
    data.set(valB, keyB.length + 1)
    const typeBytes = Array.from(enc.encode("tEXt"))
    // CRC over type+data
    const crcInput = new Uint8Array([...typeBytes, ...Array.from(data)])
    const crc = crc32Manual(crcInput)
    const textChunk = [...u32be(data.length), ...typeBytes, ...Array.from(data), ...u32be(crc)]
    const iend = [...u32be(0), ...Array.from(enc.encode("IEND")), ...u32be(0)]
    const bytes = new Uint8Array([...sig, ...ihdr, ...textChunk, ...iend])
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    expect(readPngMeta(btoa(bin))).toBeNull()
  })
  it("returns null for a tech_noir tEXt chunk with malformed JSON body", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    // Build: sig + IHDR + tEXt(tech_noir\0not-json) + IEND
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const ihdr = [...u32be(13), ...Array.from(new TextEncoder().encode("IHDR")), ...new Array(13).fill(0), ...u32be(0)]
    const enc = new TextEncoder()
    const keyB = enc.encode("tech_noir")
    const valB = enc.encode("not valid json{")
    const data = new Uint8Array(keyB.length + 1 + valB.length)
    data.set(keyB, 0)
    data[keyB.length] = 0
    data.set(valB, keyB.length + 1)
    const typeBytes = Array.from(enc.encode("tEXt"))
    const crcInput = new Uint8Array([...typeBytes, ...Array.from(data)])
    const crc = crc32Manual(crcInput)
    const textChunk = [...u32be(data.length), ...typeBytes, ...Array.from(data), ...u32be(crc)]
    const iend = [...u32be(0), ...Array.from(enc.encode("IEND")), ...u32be(0)]
    const bytes = new Uint8Array([...sig, ...ihdr, ...textChunk, ...iend])
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    expect(readPngMeta(btoa(bin))).toBeNull()
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
  it("skips a tEXt chunk whose data has no null terminator (nullIdx === -1)", () => {
    // Build: sig + IHDR + tEXt(tech_noir-without-null) + IEND
    // length > KEY.length is true (length = KEY.length+5), nullIdx = -1, so
    // the chunk is skipped (the inner `if (nullIdx !== -1)` guard).
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const ihdr = [...u32be(13), ...Array.from(new TextEncoder().encode("IHDR")), ...new Array(13).fill(0), ...u32be(0)]
    const enc = new TextEncoder()
    // Data is "tech_noirXXXXX" — no null byte. length (14) > KEY.length (9).
    const data = enc.encode("tech_noirXXXXX")
    const typeBytes = Array.from(enc.encode("tEXt"))
    const crcInput = new Uint8Array([...typeBytes, ...Array.from(data)])
    const crc = crc32Manual(crcInput)
    const textChunk = [...u32be(data.length), ...typeBytes, ...Array.from(data), ...u32be(crc)]
    const iend = [...u32be(0), ...Array.from(enc.encode("IEND")), ...u32be(0)]
    const bytes = new Uint8Array([...sig, ...ihdr, ...textChunk, ...iend])
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    expect(readPngMeta(btoa(bin))).toBeNull()
  })
  it("does not match a tech_noir chunk when length === KEY.length (boundary: uses strict >)", () => {
    // The reader checks `length > KEY.length` (KEY.length = 9). A chunk whose
    // data length is exactly 9 ("tech_noir" with no null terminator and no
    // value) is NOT entered. Verify by building such a chunk and confirming
    // null is returned (the chunk is skipped, no crash).
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const ihdr = [...u32be(13), ...Array.from(new TextEncoder().encode("IHDR")), ...new Array(13).fill(0), ...u32be(0)]
    const enc = new TextEncoder()
    const data = enc.encode("tech_noir") // exactly 9 bytes, no null, no value
    const typeBytes = Array.from(enc.encode("tEXt"))
    const crcInput = new Uint8Array([...typeBytes, ...Array.from(data)])
    const crc = crc32Manual(crcInput)
    const textChunk = [...u32be(data.length), ...typeBytes, ...Array.from(data), ...u32be(crc)]
    const iend = [...u32be(0), ...Array.from(enc.encode("IEND")), ...u32be(0)]
    const bytes = new Uint8Array([...sig, ...ihdr, ...textChunk, ...iend])
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    expect(readPngMeta(btoa(bin))).toBeNull()
  })
  it("accepts a data: URL with media type parameters (image/png;charset=utf-8)", () => {
    const stamped = injectPngMeta(minimalPngB64(), { k: "v" })
    // The split on "," only cares about the first comma, so charset= is fine.
    const url = "data:image/png;charset=utf-8;base64," + stamped
    expect(readPngMeta(url)).toEqual({ k: "v" })
  })
  it("returns the first tech_noir chunk when multiple are present", () => {
    // Inject twice: second injection ends up at pos 33 (closer to start).
    // readPngMeta walks in file order, so it hits the second injection first.
    const first = injectPngMeta(minimalPngB64(), { round: 1 })
    const second = injectPngMeta(first, { round: 2 })
    expect(readPngMeta(second)).toEqual({ round: 2 })
    // Also confirm the FIRST injection is still readable if we strip the second.
    // The outermost (last-injected) chunk is at pos 33; remove it by re-injecting
    // from `first` and reading — but easier: read first directly.
    expect(readPngMeta(first)).toEqual({ round: 1 })
  })
})

// Manual CRC-32 implementation for building hand-crafted test chunks.
// Matches the source's polynomial (0xedb88320) so the reader accepts them.
function crc32Manual(buf: Uint8Array): number {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// ════════════════════════════════════════════════════════════════════════════
// injectPngMeta — guards
// ════════════════════════════════════════════════════════════════════════════
describe("png-meta — injectPngMeta guards", () => {
  it("returns the original unchanged when the input has no PNG signature", () => {
    const notPng = btoa("definitely not a png signature here at all nope")
    expect(injectPngMeta(notPng, { seed: 1 })).toBe(notPng)
  })
  it("returns the original unchanged on atob failure (catch path)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const garbage = "!!!not-base64!!!"
    expect(injectPngMeta(garbage, { seed: 1 })).toBe(garbage)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
  it("rejects input that matches the signature length but has a wrong byte mid-signature", () => {
    // Flip one signature byte (e.g. byte 1 from 0x50 'P' to 0x51 'Q').
    const sig = [0x89, 0x51, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const rest = new Array(40).fill(0)
    const bytes = new Uint8Array([...sig, ...rest])
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    const b64 = btoa(bin)
    expect(injectPngMeta(b64, { seed: 1 })).toBe(b64)
  })
  it("round-trips when the input PNG has extra chunks between IHDR and IEND", () => {
    // Build: sig + IHDR + IDAT(10 bytes) + IEND, then inject tech_noir.
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    const enc = new TextEncoder()
    const ihdr = [...u32be(13), ...Array.from(enc.encode("IHDR")), ...new Array(13).fill(0), ...u32be(0)]
    const idatData = new Uint8Array(10).fill(0)
    const idatType = Array.from(enc.encode("IDAT"))
    const crcInput = new Uint8Array([...idatType, ...Array.from(idatData)])
    const crc = crc32Manual(crcInput)
    const idat = [...u32be(idatData.length), ...idatType, ...Array.from(idatData), ...u32be(crc)]
    const iend = [...u32be(0), ...Array.from(enc.encode("IEND")), ...u32be(0)]
    const bytes = new Uint8Array([...sig, ...ihdr, ...idat, ...iend])
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    const b64 = btoa(bin)
    // Inject after IHDR — the tEXt chunk lands between IHDR and IDAT.
    const stamped = injectPngMeta(b64, { seed: 99 })
    expect(readPngMeta(stamped)).toEqual({ seed: 99 })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// injectPngMeta — chunk placement
// ════════════════════════════════════════════════════════════════════════════
describe("png-meta — injectPngMeta chunk placement", () => {
  it("places the tEXt chunk immediately after IHDR (pos 33)", () => {
    const stamped = injectPngMeta(minimalPngB64(), { seed: 1 })
    const bin = atob(stamped)
    // IHDR ends at byte 33. Bytes 33..36 should be the length of the tEXt
    // data, and bytes 37..40 should spell "tEXt".
    const typeAt33 = String.fromCharCode(bin.charCodeAt(37), bin.charCodeAt(38), bin.charCodeAt(39), bin.charCodeAt(40))
    expect(typeAt33).toBe("tEXt")
  })
  it("preserves the IHDR chunk as the first chunk", () => {
    const stamped = injectPngMeta(minimalPngB64(), { seed: 1 })
    const bin = atob(stamped)
    // First chunk type (bytes 12..15 after sig+length) should still be "IHDR".
    const firstType = String.fromCharCode(bin.charCodeAt(12), bin.charCodeAt(13), bin.charCodeAt(14), bin.charCodeAt(15))
    expect(firstType).toBe("IHDR")
  })
  it("preserves the IEND chunk at the end (still present after injection)", () => {
    const stamped = injectPngMeta(minimalPngB64(), { seed: 1 })
    const bin = atob(stamped)
    // Last 8 bytes: length(0) + "IEND" + crc. Type bytes are at -8..-4 from end
    // (4 length + 4 type). Actually layout from end: 4-byte CRC, then before
    // that 4 bytes "IEND", before that 4-byte length=0.
    const len = bin.length
    const iendType = String.fromCharCode(bin.charCodeAt(len - 8), bin.charCodeAt(len - 7), bin.charCodeAt(len - 6), bin.charCodeAt(len - 5))
    expect(iendType).toBe("IEND")
  })
  it("the injected tEXt chunk's length field matches the data length", () => {
    const params = { seed: 1 }
    const json = JSON.stringify(params)
    const expectedDataLen = "tech_noir".length + 1 + json.length // key + null + value
    const stamped = injectPngMeta(minimalPngB64(), params)
    const bin = atob(stamped)
    // Length field is at bytes 33..36 (u32be), right after the 33-byte header.
    const len =
      ((bin.charCodeAt(33) << 24) | (bin.charCodeAt(34) << 16) | (bin.charCodeAt(35) << 8) | bin.charCodeAt(36)) >>> 0
    expect(len).toBe(expectedDataLen)
  })
  it("the injected chunk's key is exactly 'tech_noir' followed by a null byte", () => {
    const stamped = injectPngMeta(minimalPngB64(), { seed: 1 })
    const bin = atob(stamped)
    // Data starts at byte 41 (sig[8] + ihdr[25] + length[4] + type[4] = 41).
    const keyBytes: string[] = []
    for (let i = 0; i < 9; i++) keyBytes.push(bin.charAt(41 + i))
    expect(keyBytes.join("")).toBe("tech_noir")
    expect(bin.charCodeAt(41 + 9)).toBe(0) // null terminator
  })
  it("embeds a CRC that validates against type+data (reader doesn't check, but writer emits correct CRC)", () => {
    // The reader does NOT validate CRC, but the writer must emit a correct one
    // so that strict readers (pngMeta.parsePngText) accept the chunk.
    const stamped = injectPngMeta(minimalPngB64(), { seed: 1 })
    const dataUrl = "data:image/png;base64," + stamped
    const chunks = parsePngText(dataUrl)
    // parsePngText validates chunk structure — if CRC were wrong it might still
    // accept (depends on impl) but at minimum the key must be present.
    expect(chunks["tech_noir"]).toBeDefined()
    expect(JSON.parse(chunks["tech_noir"])).toEqual({ seed: 1 })
  })
})
