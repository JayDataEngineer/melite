/**
 * PNG tEXt chunk utilities — embed and parse metadata in PNG files.
 *
 * Compatible with the chunk layout ComfyUI uses (keys `workflow` and
 * `prompt`), so images saved from Pose Studio can be dragged back in
 * to recover the full generation state, and vice-versa.
 *
 * PNG chunk grammar:
 *   chunk = [length:u32be][type:4 bytes][data:length][crc:u32be]
 *   tEXt data = keyword (1-79 bytes, Latin-1) + 0x00 + text (Latin-1)
 *
 * We insert metadata chunks immediately after IHDR so they appear
 * before IDAT — readers that scan only the file head will find them.
 *
 * JSON values are forced to ASCII (via \\uXXXX escapes for any code
 * point above 0x7F) because the tEXt chunk is Latin-1: a raw UTF-8
 * multibyte sequence would be mis-decoded as one byte == one char.
 */

const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// ── CRC32 (IEEE 802.3 / PNG polynomial 0xedb88320) ─────────────────────────

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    }
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff])
}

function buildChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array(4)
  for (let i = 0; i < 4; i++) typeBytes[i] = type.charCodeAt(i)
  const crcInput = new Uint8Array(typeBytes.length + data.length)
  crcInput.set(typeBytes, 0)
  crcInput.set(data, typeBytes.length)
  const out = new Uint8Array(12 + data.length)
  out.set(u32be(data.length), 0)
  out.set(typeBytes, 4)
  out.set(data, 8)
  out.set(u32be(crc32(crcInput)), 8 + data.length)
  return out
}

function encodeLatin1(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < out.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}

// ── data: URL ⇄ bytes ──────────────────────────────────────────────────────

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(",")
  if (comma < 0) return null
  const b64 = dataUrl.slice(comma + 1)
  let bin: string
  try {
    bin = atob(b64)
  } catch {
    return null  // malformed base64 — caller handles null gracefully
  }
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < out.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToDataUrl(bytes: Uint8Array): string {
  let binary = ""
  // Chunked to avoid call-stack limits on large PNGs.
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + CHUNK, bytes.length)) as unknown as number[]
    )
  }
  return `data:image/png;base64,${btoa(binary)}`
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Force JSON to pure ASCII by escaping any code point above 0x7F as
 * \uXXXX. Keeps tEXt payloads spec-compliant (Latin-1) while preserving
 * the full Unicode content for recovery.
 */
export function asciiJsonStringify(value: unknown): string {
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g, (c) => {
    const hex = c.charCodeAt(0).toString(16)
    return "\\u" + "0".repeat(4 - hex.length) + hex
  })
}

/**
 * Embed key/value pairs as tEXt chunks in a PNG data: URL. Chunks are
 * inserted immediately after IHDR. Returns the original URL unchanged
 * if the input is not a valid PNG data URL or metadata is empty.
 */
export function embedPngText(dataUrl: string, metadata: Record<string, string>): string {
  if (Object.keys(metadata).length === 0) return dataUrl
  const bytes = dataUrlToBytes(dataUrl)
  if (!bytes || bytes.length < 8) return dataUrl
  for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIG[i]) return dataUrl

  // IHDR is always the first chunk and always 13 bytes of data.
  const ihdrLen = (bytes[8] << 24) | (bytes[9] << 16) | (bytes[10] << 8) | bytes[11]
  const ihdrEnd = 8 + 8 + ihdrLen + 4 // sig + len+type + data + crc

  const chunks: Uint8Array[] = []
  for (const [key, val] of Object.entries(metadata)) {
    if (!key) continue
    const payload = encodeLatin1(`${key}\0${val}`)
    chunks.push(buildChunk("tEXt", payload))
  }
  if (chunks.length === 0) return dataUrl

  const before = bytes.subarray(0, ihdrEnd)
  const after = bytes.subarray(ihdrEnd)
  const total = before.length + after.length + chunks.reduce((s, c) => s + c.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  out.set(before, off); off += before.length
  for (const c of chunks) { out.set(c, off); off += c.length }
  out.set(after, off)
  return bytesToDataUrl(out)
}

/**
 * Parse every tEXt chunk in a PNG data: URL into a {key: value} record.
 * Also surfaces iTXt (uncompressed, UTF-8) if present. Last write wins
 * on duplicate keys. Returns {} for non-PNG or unreadable input.
 */
export function parsePngText(dataUrl: string): Record<string, string> {
  const bytes = dataUrlToBytes(dataUrl)
  if (!bytes || bytes.length < 8) return {}
  for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIG[i]) return {}

  const out: Record<string, string> = {}
  const latin1 = new TextDecoder("latin1")
  const utf8 = new TextDecoder("utf-8")
  let off = 8
  while (off + 8 <= bytes.length) {
    const len = (bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]
    const type = latin1.decode(bytes.subarray(off + 4, off + 8))
    const dataStart = off + 8
    const dataEnd = dataStart + len
    if (dataEnd > bytes.length) break
    if (type === "tEXt") {
      const payload = latin1.decode(bytes.subarray(dataStart, dataEnd))
      const nul = payload.indexOf("\0")
      if (nul > 0) out[payload.slice(0, nul)] = payload.slice(nul + 1)
    } else if (type === "iTXt") {
      // iTXt: keyword\0 compressionFlag(1) compressionMethod(1) lang\0 translated\0 text(UTF-8)
      const payload = bytes.subarray(dataStart, dataEnd)
      const nul = payload.indexOf(0)
      if (nul > 0) {
        const key = latin1.decode(payload.subarray(0, nul))
        const flag = payload[nul + 1]
        // Skip compression flag + method bytes, language tag, translated keyword
        let p = nul + 3
        const nul2 = payload.indexOf(0, p)
        const nul3 = nul2 >= 0 ? payload.indexOf(0, nul2 + 1) : -1
        if (nul3 >= 0 && flag === 0) {
          out[key] = utf8.decode(payload.subarray(nul3 + 1))
        }
      }
    } else if (type === "IEND") {
      break
    }
    off = dataEnd + 4
  }
  return out
}

/**
 * Read the embedded `workflow` (or fallback `prompt`/`parameters`) JSON
 * from a PNG data: URL. Returns the parsed object or null.
 */
export function readWorkflowFromPng(dataUrl: string): unknown | null {
  const chunks = parsePngText(dataUrl)
  const raw = chunks["workflow"] ?? chunks["prompt"] ?? chunks["parameters"]
  if (!raw) return null
  try { return JSON.parse(raw) }
  catch (e) {
    // NO SILENT SWALLOW — embedded workflow JSON was malformed. Log so we
    // know PNG-saved workflows are being silently dropped on import.
    console.error('[pngMeta] readWorkflowFromPng: failed to parse embedded JSON:', e)
    return null
  }
}
