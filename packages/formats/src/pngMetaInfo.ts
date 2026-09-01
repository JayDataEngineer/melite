/**
 * Minimal PNG tEXt chunk injector / reader.
 *
 * PNG format: 8-byte signature, then a sequence of chunks.
 * Each chunk: [4-byte length][4-byte type][N-byte data][4-byte CRC].
 * tEXt chunk data: <keyword>\0<text> (both Latin-1, no compression).
 *
 * We use the key "tech_noir" to store generation params as JSON.
 */

const PNG_SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
const KEY = "tech_noir"

// ── CRC-32 table ────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff])
}

function readU32BE(buf: Uint8Array, offset: number): number {
  return ((buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3]) >>> 0
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type)
  const crcInput = new Uint8Array(4 + data.length)
  crcInput.set(typeBytes, 0)
  crcInput.set(data, 4)
  const crc = crc32(crcInput)
  const chunk = new Uint8Array(4 + 4 + data.length + 4)
  chunk.set(u32be(data.length), 0)
  chunk.set(typeBytes, 4)
  chunk.set(data, 8)
  chunk.set(u32be(crc), 8 + data.length)
  return chunk
}

/** Inject generation params into a PNG as a tEXt chunk (inserted after IHDR). */
export function injectPngMeta(b64: string, params: Record<string, unknown>): string {
  try {
    const bin = atob(b64)
    const buf = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)

    // Verify PNG signature
    for (let i = 0; i < 8; i++) if (buf[i] !== PNG_SIG[i]) return b64

    // Find end of IHDR chunk (sig=8, length=4, type=4, data=13, crc=4 → 33 bytes)
    const ihdrEnd = 8 + 4 + 4 + 13 + 4  // = 33

    // Build tEXt chunk: "tech_noir\0<json>"
    const enc = new TextEncoder()
    const keyBytes = enc.encode(KEY)
    const valBytes = enc.encode(JSON.stringify(params))
    const chunkData = new Uint8Array(keyBytes.length + 1 + valBytes.length)
    chunkData.set(keyBytes, 0)
    chunkData[keyBytes.length] = 0
    chunkData.set(valBytes, keyBytes.length + 1)
    const textChunk = makeChunk("tEXt", chunkData)

    // Splice in after IHDR
    const out = new Uint8Array(buf.length + textChunk.length)
    out.set(buf.slice(0, ihdrEnd), 0)
    out.set(textChunk, ihdrEnd)
    out.set(buf.slice(ihdrEnd), ihdrEnd + textChunk.length)

    // Re-encode to base64
    let result = ""
    for (let i = 0; i < out.length; i++) result += String.fromCharCode(out[i])
    return btoa(result)
  } catch (e) {
    // NO SILENT SWALLOW — chunk injection failed (corrupt PNG, bad base64,
    // OOM on huge buffers). Log so we know metadata is being dropped, then
    // return the original unmodified so the image itself still renders.
    console.error('[png-meta] injectPngMeta failed, returning original:', e)
    return b64
  }
}

/** Read generation params from a PNG's tEXt chunk, or null if not present. */
export function readPngMeta(b64OrDataUrl: string): Record<string, unknown> | null {
  try {
    const b64 = b64OrDataUrl.startsWith("data:") ? b64OrDataUrl.split(",")[1] : b64OrDataUrl
    const bin = atob(b64)
    const buf = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)

    // Walk chunks from offset 8
    let pos = 8
    while (pos + 12 <= buf.length) {
      const length = readU32BE(buf, pos)
      const type = String.fromCharCode(buf[pos + 4], buf[pos + 5], buf[pos + 6], buf[pos + 7])
      if (type === "IEND") break
      if (type === "tEXt" && length > KEY.length) {
        const data = buf.slice(pos + 8, pos + 8 + length)
        const nullIdx = data.indexOf(0)
        if (nullIdx !== -1) {
          const key = new TextDecoder().decode(data.slice(0, nullIdx))
          if (key === KEY) {
            const val = new TextDecoder().decode(data.slice(nullIdx + 1))
            return JSON.parse(val)
          }
        }
      }
      pos += 4 + 4 + length + 4
    }
    return null
  } catch (e) {
    // NO SILENT SWALLOW — parse failure means either the input wasn't a
    // valid PNG/data-URL, or the tEXt payload was malformed. Log so we know
    // metadata is being dropped, then return null ("no params found").
    console.error('[png-meta] readPngMeta failed:', e)
    return null
  }
}
