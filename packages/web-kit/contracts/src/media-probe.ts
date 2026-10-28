/**
 * mp4Probe.ts — THE MEDIA PROBE, IN TYPESCRIPT (2026-09-25).
 *
 * WHY THIS EXISTS: `melite_view` shelled out to `ffprobe` to read a
 * file's stream facts. That put a host binary (and a Linux-shaped
 * deployment) inside a TypeScript extension, and the unit suite could
 * not run anywhere the binary was absent. A container is a box tree —
 * every field the probe reported is readable from bytes, so it is
 * parsed here, in-repo, with NO dependency and NO subprocess.
 *
 * WHAT IT READS (exactly the row the tool published):
 *   MP4/MOV/QuickTime — `moov/mvhd` (duration + timescale),
 *     `trak/tkhd` (display size), `trak/mdia/hdlr` (video | soun),
 *     `trak/mdia/minf/stbl/stsd` (codec fourcc, sample rate,
 *     channels), `stts` (sample count → a frame count), `mdhd`
 *     (media timescale, for the audio duration).
 *   WAV/RIFF — `fmt ` (codec tag, channels, sample rate, bits) and
 *     `data` (byte length → duration).
 *
 * WHAT IT DELIBERATELY DOES NOT DO: decode. Frame pixels are the
 * engine's business — the harness commits an image the run produced
 * and never re-frames a video itself. (Decoding H.264/AAC in
 * TypeScript is not a thing you can do without shipping a codec as a
 * dependency, and the architecture says the engine owns media.)
 *
 * Pure and total: given bytes in, facts out. No fs, no child process,
 * no platform assumptions.
 */

/** One probed stream, the row `melite_view` publishes. */
export interface ProbedStream {
  codec: string
  codec_type?: 'video' | 'audio'
  width?: number
  height?: number
  fps?: string
  frames?: number
  sample_rate?: number
  channels?: number
}

export interface ProbeResult {
  duration_s?: number
  /** ALWAYS present: the probe read the bytes, so their count is a
   *  fact, not a reading. */
  size_bytes: number
  streams: ProbedStream[]
}

const text = (bytes: Uint8Array): string => String.fromCharCode(...bytes)

/** A cursor over the whole file. Every read is bounds-checked and
 *  returns a "not there" rather than throwing: a truncated or hostile
 *  file must produce a partial row, never a crash. */
class Reader {
  private at = 0
  // STRIP-ONLY LAW (2026-09-25, the studio lane's catch): this file
  // is src-exported and loads inside the dsh host's Node strip-only
  // TypeScript mode, which rejects parameter properties — fields are
  // declared and assigned explicitly, never in the constructor head.
  private readonly b: Uint8Array
  constructor(bytes: Uint8Array) { this.b = bytes }

  get pos(): number { return this.at }
  seek(to: number): void { this.at = to }
  skip(n: number): void { this.at += n }
  get left(): number { return this.b.length - this.at }

  u16(): number | undefined { return this.num(2) }
  u8(): number | undefined { return this.num(1) }
  u32(): number | undefined { return this.num(4) }
  /** RIFF/WAV header fields are LITTLE-endian (ISO-BMFF boxes are
   *  big-endian, which is why both spellings live here). */
  le16(): number | undefined {
    if (this.at + 2 > this.b.length) return undefined
    const v = this.b[this.at]! + this.b[this.at + 1]! * 0x100
    this.at += 2
    return v
  }
  le32(): number | undefined {
    if (this.at + 4 > this.b.length) return undefined
    const v = this.b[this.at]! + this.b[this.at + 1]! * 0x100 + this.b[this.at + 2]! * 0x1_0000 + this.b[this.at + 3]! * 0x100_0000
    this.at += 4
    return v
  }
  u64(): number | undefined {
    const hi = this.num(4)
    const lo = this.num(4)
    if (hi === undefined || lo === undefined) return undefined
    const v = hi * 0x1_0000_0000 + lo
    return Number.isSafeInteger(v) ? v : undefined
  }
  private num(size: number): number | undefined {
    if (this.at + size > this.b.length) return undefined
    let v = 0
    for (let i = 0; i < size; i++) v = v * 0x100 + this.b[this.at + i]!
    this.at += size
    return v
  }
  bytes(n: number): Uint8Array | undefined {
    if (this.at + n > this.b.length) return undefined
    const out = this.b.subarray(this.at, this.at + n)
    this.at += n
    return out
  }
  fourcc(): string | undefined {
    const b = this.bytes(4)
    return b === undefined ? undefined : text(b)
  }
  /** 16.16 / 2.30 fixed point (tkhd width/height). */
  fixed(): number | undefined {
    const v = this.num(4)
    return v === undefined ? undefined : Math.round(v / 65_536)
  }
}

/** The box walker: yield every (type, payload) box under a parent. */
function* boxes(b: Uint8Array, start: number, end: number): Generator<{ type: string, body: Uint8Array }> {
  const r = new Reader(b)
  r.seek(start)
  // Attempt the header whenever ANY bytes remain: the readers refuse a
  // short read, so a truncated tail is handled by the same guards rather
  // than by a pre-check that silently stops one box early.
  while (r.left > 0) {
    const boxStart = r.pos
    let size = r.u32()
    const type = r.fourcc()
    if (type === undefined) return
    if (size === 1) {
      const big = r.u64()
      if (big === undefined) return
      size = big
    } else if (size === 0) {
      size = end - boxStart
    }
    if (size === undefined || size < 8 || boxStart + size > end) return
    yield { type, body: b.subarray(boxStart + 8, boxStart + size) }
    r.seek(boxStart + size)
  }
}

const find = <T extends { type: string }>(it: Iterable<T>, type: string): T | undefined => {
  for (const x of it) if (x.type === type) return x
  return undefined
}

/** The sample-entry fourcc → the codec NAME a caller routes on. This
 *  is the row `ffprobe` published, so removing the binary changes no
 *  published value: avc1 is the entry, h264 is the profile. */
const CODEC_NAMES: Record<string, string> = {
  avc1: 'h264', avc3: 'h264',
  hvc1: 'hevc', hev1: 'hevc',
  vp09: 'vp9', av01: 'av1',
  mp4a: 'aac', 'ac-3': 'ac3', 'ec-3': 'eac3',
  Opus: 'opus', alac: 'alac',
  mjpeg: 'mjpeg', png: 'png', mjpa: 'mjpeg',
}

export function codecNameOf(fourcc: string): string {
  return CODEC_NAMES[fourcc] ?? fourcc
}

/** avc1 → avc, mp4a → aac, pcm_s16le stays. The family is what a
 *  caller routes on; the exact tag rides along in `codec`. */
function family(codec: string): ProbedStream['codec_type'] | undefined {
  if (['avc1', 'avc3', 'hvc1', 'hev1', 'vp09', 'av01', 'mjpeg', 'png '].includes(codec)) return 'video'
  if (['mp4a', 'ac-3', 'ec-3', 'Opus', 'alac', 'sowt', 'lpcm', 'ulaw', 'alaw'].includes(codec)) return 'audio'
  return undefined
}

function probeStsd(stsd: Uint8Array): { codec?: string, width?: number, height?: number, sample_rate?: number, channels?: number } {
  const r = new Reader(stsd)
  r.skip(4) // version + flags
  const count = r.u32()
  const out: { codec?: string, width?: number, height?: number, sample_rate?: number, channels?: number } = {}
  if (count === undefined || count < 1) return out
  const entries = [...boxes(stsd, r.pos, stsd.length)]
  const first = entries[0]
  if (first === undefined) return out
  out.codec = first.type
  const e = new Reader(first.body)
  e.skip(6) // reserved
  e.u16() // data_reference_index
  if (family(first.type) === 'video') {
    e.skip(16) // pre_defined + reserved
    out.width = e.u16()
    out.height = e.u16()
  } else {
    e.skip(8) // version/revision/vendor
    out.channels = e.u16()
    e.skip(2) // sample size
    e.skip(4) // compression id + packet size
    out.sample_rate = e.u32()
    if (out.sample_rate !== undefined) out.sample_rate = Math.round(out.sample_rate / 65_536)
  }
  return out
}

/** stts: the sample table — count/delta pairs. The count is the
 *  track's sample (frame) count. The rate is samples-per-SECOND, so
 *  the track's mdhd TIMESCALE is required: `count / delta` alone is
 *  samples per timescale unit, which is not a frame rate. */
function probeStts(stts: Uint8Array, timescale: number | undefined): { frames?: number, fps?: string } {
  const r = new Reader(stts)
  r.skip(4)
  const n = r.u32()
  if (n === undefined || n < 1) return {}
  let total = 0
  let ticks = 0
  const deltas = new Set<number>()
  for (let i = 0; i < n; i++) {
    const count = r.u32()
    const delta = r.u32()
    if (count === undefined || delta === undefined) break
    total += count
    ticks += count * delta
    deltas.add(delta)
  }
  const out: { frames?: number, fps?: string } = {}
  if (total > 0) out.frames = total
  // A VARIABLE-rate track has no single rate: publishing an average
  // would be a fabricated frame rate. The frame COUNT is still exact.
  const constant = deltas.size === 1
  // no media timescale (or a zero-length track) → NO fps rather than a
  // fabricated one
  if (constant && timescale !== undefined && timescale > 0 && ticks > 0) {
    // fps = samples / seconds = samples*timescale / ticks, reduced —
    // the same rational ffprobe published, so the row is unchanged
    const num = total * timescale
    const den = ticks
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
    const g = gcd(num, den)
    out.fps = String(Math.round(num / g)) + '/' + String(Math.round(den / g))
  }
  return out
}

/** mdhd: the track's media timescale (the unit every delta counts in). */
function probeMdhd(mdhd: Uint8Array): number | undefined {
  const r = new Reader(mdhd)
  const version = r.u8() // ONE byte + 3 flags (a u32 read here made
  r.skip(3)             // every 64-bit media header read version 0)
  if (version === 1) r.skip(16)
  else r.skip(8)
  return r.u32()
}

function probeTrak(trak: Uint8Array): ProbedStream | undefined {
  const parts = [...boxes(trak, 0, trak.length)]
  const tkhd = find(parts, 'tkhd')
  const mdia = find(parts, 'mdia')
  if (mdia === undefined) return undefined
  const mparts = [...boxes(mdia.body, 0, mdia.body.length)]
  const hdlr = find(mparts, 'hdlr')
  const mdhd = find(mparts, 'mdhd')
  const minf = find(mparts, 'minf')
  let kind: ProbedStream['codec_type']
  if (hdlr !== undefined) {
    const hr = new Reader(hdlr.body)
    hr.skip(8) // version/flags + predefined
    const handler = hr.fourcc()
    if (handler === 'vide') kind = 'video'
    else if (handler === 'soun') kind = 'audio'
  }
  let stsd: { codec?: string, width?: number, height?: number, sample_rate?: number, channels?: number } = {}
  let stts: { frames?: number, fps?: string } = {}
  if (minf !== undefined) {
    const stbl = find([...boxes(minf.body, 0, minf.body.length)], 'stbl')
    if (stbl !== undefined) {
      const sstsd = find([...boxes(stbl.body, 0, stbl.body.length)], 'stsd')
      if (sstsd !== undefined) stsd = probeStsd(sstsd.body)
      const sstts = find([...boxes(stbl.body, 0, stbl.body.length)], 'stts')
      if (sstts !== undefined) stts = probeStts(sstts.body, mdhd === undefined ? undefined : probeMdhd(mdhd.body))
    }
  }
  if (kind === undefined && stsd.codec !== undefined) kind = family(stsd.codec)
  if (kind === undefined && stsd.codec === undefined) return undefined
  const stream: ProbedStream = { codec: stsd.codec === undefined ? 'unknown' : codecNameOf(stsd.codec) }
  if (kind !== undefined) stream.codec_type = kind
  if (kind === 'video') {
    if (stsd.width !== undefined) stream.width = stsd.width
    if (stsd.height !== undefined) stream.height = stsd.height
    if (stts.fps !== undefined) stream.fps = stts.fps
    if (stts.frames !== undefined) stream.frames = stts.frames
    // tkhd's display size is the last resort (a track can omit the
    // visual sample entry's dimensions)
    if (stream.width === undefined || stream.height === undefined) {
      if (tkhd !== undefined) {
        // tkhd: version/flags(4); v1 created(8)+modified(8), v0
        // created(4)+modified(4); then track_id, reserved, duration,
        // reserved(8), layer/alt/volume/reserved(8), the 3x3 matrix(36),
        // and LAST the display size as two 16.16 fixed points.
        const tr = new Reader(tkhd.body)
        const version = tr.u32()
        tr.skip(version === 1 ? 16 : 8)
        tr.skip(4 + 4 + 4) // track_id, reserved, duration
        tr.skip(8) // reserved
        tr.skip(2 + 2 + 2 + 2) // layer, alternate_group, volume, reserved
        tr.skip(36) // the matrix
        const w = tr.fixed()
        const h = tr.fixed()
        if (stream.width === undefined && w !== undefined && w > 0) stream.width = w
        if (stream.height === undefined && h !== undefined && h > 0) stream.height = h
      }
    }
  } else {
    if (stsd.sample_rate !== undefined) stream.sample_rate = stsd.sample_rate
    if (stsd.channels !== undefined) stream.channels = stsd.channels
  }
  return stream
}

/** THE MP4/MOV PROBE. */
export function probeMp4(bytes: Uint8Array): ProbeResult {
  const out: ProbeResult = { size_bytes: bytes.byteLength, streams: [] }
  const moov = find([...boxes(bytes, 0, bytes.length)], 'moov')
  if (moov === undefined) {
    throw new Error('the media probe found no streams — the file may be truncated or corrupt')
  }
  const parts = [...boxes(moov.body, 0, moov.body.length)]
  // The movie header: version 0 (created/modified 4+4). Version 1 uses
  // 64-bit timestamps and is not written by the estate's muxer, so an
  // unknown version states NO duration rather than a guess.
  // mvhd version 1 carries 64-bit times; ffprobe reported those
  // durations, so this probe does too (the 2026-09-25 estate muxer
  // only ever wrote v0, but "the estate never writes it" is not a
  // reason to publish less than the door used to).
  const mvhd = find(parts, 'mvhd')
  if (mvhd !== undefined) {
    const r = new Reader(mvhd.body)
    // version is ONE byte + 3 flag bytes — reading it as a u32 turns
    // version 1 into 16777216 and every 64-bit movie header into a
    // silent no-duration (2026-09-25)
    const version = r.u8()
    r.skip(3) // flags
    const wide = version === 1
    if (version === 0 || wide) {
      r.skip(wide ? 16 : 8) // created + modified
      const timescale = r.u32()
      const duration = wide ? r.u64() : r.u32()
      if (timescale !== undefined && timescale > 0 && duration !== undefined) {
        out.duration_s = Math.round((duration / timescale) * 1e6) / 1e6
      }
    }
  }
  for (const trak of parts) {
    if (trak.type !== 'trak') continue
    const stream = probeTrak(trak.body)
    if (stream !== undefined) out.streams.push(stream)
  }
  // a file with a movie header and no track row is not a media file
  if (out.streams.length === 0) throw new Error('the media probe found no streams — the file may be truncated or corrupt')
  return out
}

/** WAV's codec NAME, as ffprobe published it.
 *
 *  The PCM names are derived from the BIT DEPTH, not the format tag:
 *  a 16-bit integer and a 32-bit float both ride `wFormatTag` 1 vs 3,
 *  and ffprobe reported `pcm_s16le` / `pcm_f32le` — never a name with
 *  the depth glued on the end (`pcm_s16le16`, which is not a codec
 *  anything else on earth can decode). 2026-09-25. */
function wavCodecName(format: number, bits: number | undefined): string {
  const b = bits ?? 0
  // a fmt chunk cut before the depth: name the FAMILY, claim no depth
  if (b === 0 && (format === 1 || format === 3)) return format === 1 ? 'pcm' : 'pcm_float'
  if (format === 1) {
    if (b === 8) return 'pcm_u8'
    if (b === 16) return 'pcm_s16le'
    if (b === 24) return 'pcm_s24le'
    if (b === 32) return 'pcm_s32le'
    if (b === 64) return 'pcm_s64le'
    return 'pcm_s' + String(b) + 'le'
  }
  if (format === 3) {
    if (b === 32) return 'pcm_f32le'
    if (b === 64) return 'pcm_f64le'
    return 'pcm_f' + String(b) + 'le'
  }
  if (format === 6) return 'pcm_alaw'
  if (format === 7) return 'pcm_mulaw'
  if (format === 0xFFFE) return 'wav_ext'
  return 'format-' + String(format)
}

/** THE RIFF/WAV PROBE. */
export function probeWav(bytes: Uint8Array): ProbeResult {
  const out: ProbeResult = { size_bytes: bytes.byteLength, streams: [] }
  if (bytes.byteLength < 12 || text(bytes.subarray(0, 4)) !== 'RIFF' || text(bytes.subarray(8, 12)) !== 'WAVE') {
    throw new Error('the media probe found no streams — the file may be truncated or corrupt')
  }
  const r = new Reader(bytes)
  r.seek(12)
  let codec: string | undefined
  let channels: number | undefined
  let sample_rate: number | undefined
  let bits: number | undefined
  let dataBytes = 0
  while (r.left > 0) {
    const id = r.fourcc()
    const size = r.le32()
    if (id === undefined || size === undefined) break
    if (id === 'fmt ') {
      const f = new Reader(bytes.subarray(r.pos, Math.min(r.pos + size, bytes.length)))
      const tag = f.le16()
      channels = f.le16()
      sample_rate = f.le32()
      f.le32() // byte rate
      f.le16() // block align
      const depth = f.le16()
      if (depth !== undefined) bits = depth
      // a fmt chunk cut before its tag names nothing: codec stays
      // undefined and the probe refuses rather than guessing a family
      if (tag !== undefined) codec = wavCodecName(tag, bits)
    } else if (id === 'data') {
      // A data chunk that CLAIMS more than the file holds is a lie: the
      // measurement must describe the bytes that exist, never the
      // number the header wished for.
      dataBytes = Math.min(size, r.left)
    }
    r.skip(size + (size % 2)) // chunks are word-aligned
  }
  // NO fmt CHUNK = not a stream we can describe. Inventing a 'pcm' row
  // from a bare RIFF header would be a fabricated measurement.
  if (codec === undefined) {
    throw new Error('the media probe found no streams — the file may be truncated or corrupt')
  }
  const stream: ProbedStream = { codec, codec_type: 'audio' }
  if (channels !== undefined) stream.channels = channels
  if (sample_rate !== undefined) stream.sample_rate = sample_rate
  out.streams.push(stream)
  // no data chunk → the LENGTH IS UNKNOWN, and stays absent. A zero
  // would be a fabricated duration, which is the stub-detector's whole
  // subject.
  if (dataBytes > 0 && sample_rate !== undefined && sample_rate > 0 && channels !== undefined && channels > 0 && bits !== undefined) {
    out.duration_s = Math.round((dataBytes / (sample_rate * channels * (bits / 8))) * 1e6) / 1e6
  }
  return out
}

/** THE DISPATCH: the container decides the parser. A file that is
 *  neither is refused by name — never probed with the wrong reader. */
export function probeMedia(bytes: Uint8Array): ProbeResult {
  if (bytes.byteLength >= 4 && text(bytes.subarray(4, 8)) === 'ftyp') return probeMp4(bytes)
  if (bytes.byteLength >= 12 && text(bytes.subarray(0, 4)) === 'RIFF') return probeWav(bytes)
  if (bytes.byteLength >= 12 && text(bytes.subarray(4, 8)) === 'moov') return probeMp4(bytes)
  throw new Error('the media probe recognized neither an MP4/MOV container nor a RIFF/WAVE stream')
}
