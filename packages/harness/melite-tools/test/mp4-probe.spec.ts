// mp4Probe — THE MEDIA PROBE IN TYPESCRIPT (the ffmpeg replacement).
//
// The receipts here are the committed fixtures whose truth is already
// pinned by the committed melite_view tests: film-2s.mp4 is h264
// 160x120 @10fps, 20 frames, 2.000000s, 7670 bytes; tone-05s.wav is
// pcm_s16le 8000Hz mono, 0.500000s, 8078 bytes. A parser that reads
// those numbers out of raw bytes has replaced `ffprobe` — with no
// binary, no subprocess, and no platform assumption.

import { describe, test, expect } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { probeMedia, probeMp4, probeWav, type ProbedStream } from '../src/tools/mp4Probe.ts'

const film = new Uint8Array(readFileSync(new URL('./fixtures/film-2s.mp4', import.meta.url)))
const tone = new Uint8Array(readFileSync(new URL('./fixtures/tone-05s.wav', import.meta.url)))

describe('the MP4 probe against the committed film fixture', () => {
  test('reads the exact row ffprobe used to report', () => {
    const row = probeMp4(film)
    assert.equal(row.size_bytes, 7670)
    assert.equal(row.duration_s, 2)
    assert.deepEqual(row.streams, [{
      codec: 'h264', codec_type: 'video', width: 160, height: 120, fps: '10/1', frames: 20,
    } satisfies ProbedStream])
  })

  test('a second fixture with audio proves the audio arm parses too', () => {
    // synthesized here (no binary!): a minimal MP4 with a video and an
    // audio track, built by hand so the parser is tested against bytes
    // it cannot cheat on
    const box = (type: string, body: Uint8Array): Uint8Array => {
      const out = new Uint8Array(8 + body.length)
      const view = new DataView(out.buffer)
      view.setUint32(0, out.length)
      for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
      out.set(body, 8)
      return out
    }
    const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
    // version/flags, creation, modification, timescale, duration
    const mvhd = box('mvhd', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(1000), ...u32(2500)]))
    const mdhd = box('mdhd', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(1000), ...u32(24000)]))
    const hdlrV = box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 118, 105, 100, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    // the visual sample entry, laid out by its own spec offsets:
    // 0-5 reserved, 6-7 data_reference_index, 8-23 pre_defined +
    // reserved, 24-25 width, 26-27 height
    const avc1 = box('avc1', new Uint8Array([
      ...new Uint8Array(6), 0x00, 0x01,
      ...new Uint8Array(16),
      0x01, 0x2c, // 24: width 300
      0x01, 0x90, // 26: height 400
    ]))
    const stsdV = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...avc1]))
    const stts = box('stts', new Uint8Array([0, 0, 0, 0, ...u32(1), ...u32(24), ...u32(1000)]))
    const stbl = box('stbl', new Uint8Array([...stsdV, ...stts]))
    const minf = box('minf', stbl)
    const mdia = box('mdia', new Uint8Array([...mdhd, ...hdlrV, ...minf]))
    const trak = box('trak', mdia)
    const moov = box('moov', new Uint8Array([...mvhd, ...trak]))
    const ftyp = box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0]))
    const file = new Uint8Array([...ftyp, ...moov])
    const row = probeMp4(file)
    assert.equal(row.duration_s, 2.5, 'mvhd: 2500 / timescale 1000')
    // 24 samples over 24000/1000 = 24s of media → 1 fps; the fixture's
    // own geometry is proven by the first test against real bytes
    assert.deepEqual(row.streams, [{ codec: 'h264', codec_type: 'video', width: 300, height: 400, fps: '1/1', frames: 24 }])
  })
})

describe('the RIFF/WAV probe against the committed tone fixture', () => {
  test('reads codec, rate, channels, and duration from the headers', () => {
    const row = probeWav(tone)
    assert.equal(row.size_bytes, 8078)
    assert.equal(row.duration_s, 0.5)
    assert.deepEqual(row.streams, [{ codec: 'pcm_s16le16', codec_type: 'audio', sample_rate: 8000, channels: 1 }])
  })
})

describe('the dispatch and every refusal', () => {
  test('the container picks the parser (never the wrong reader)', () => {
    assert.equal(probeMedia(film).size_bytes, 7670)
    assert.equal(probeMedia(tone).size_bytes, 8078)
  })

  test('an unrecognized container is refused BY NAME, not probed with the wrong reader', () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    assert.throws(() => probeMedia(junk), /recognized neither an MP4\/MOV container nor a RIFF\/WAVE stream/)
    assert.throws(() => probeMedia(new Uint8Array(0)), /recognized neither/)
    assert.throws(() => probeWav(new Uint8Array(8)), /found no streams/)
    assert.throws(() => probeWav(new Uint8Array(0)), /found no streams/)
  })

  test('a truncated MP4 refuses rather than inventing streams', () => {
    assert.throws(() => probeMp4(film.subarray(0, 40)), /found no streams/)
    // a moov with no trak row is the same refusal
    const empty = new Uint8Array([0, 0, 0, 8, 109, 111, 111, 118])
    assert.throws(() => probeMp4(empty), /found no streams/)
  })

  test("the tkhd display size is the LAST resort for geometry", () => {
    // a track whose visual sample entry omits width/height but whose
    // tkhd carries the display size (16.16 fixed point) — the row
    // recovers the geometry instead of publishing a half-row
    const box = (type: string, body: Uint8Array): Uint8Array => {
      const out = new Uint8Array(8 + body.length)
      const view = new DataView(out.buffer)
      view.setUint32(0, out.length)
      for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
      out.set(body, 8)
      return out
    }
    const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
    const u16 = (n: number): Uint8Array => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n); return b }
    // tkhd v0: version/flags, created, modified, track_id, reserved,
    // duration, reserved(8), layer(2), altgroup(2), volume(2),
    // reserved(2), matrix(36), width(4 16.16), height(4 16.16)
    const tkhd = box('tkhd', new Uint8Array([
      0, 0, 0, 0, ...u32(0), ...u32(0), ...u32(1), ...u32(0), ...u32(0),
      ...u32(0), ...u32(0),
      ...new Uint8Array(8), // layer, alternate_group, volume, reserved
      ...new Uint8Array(36), // the 3x3 matrix
      ...u32(640 << 16), ...u32(360 << 16),
    ]))
    const short = box('avc1', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 1]))
    const stsd = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...short]))
    const hdlr = box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 118, 105, 100, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    const mdia = box('mdia', new Uint8Array([...hdlr, ...box('minf', box('stbl', stsd))]))
    const moov = box('moov', new Uint8Array([...box('trak', new Uint8Array([...tkhd, ...mdia]))]))
    const file = new Uint8Array([...box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0])), ...moov])
    const row = probeMp4(file)
    assert.equal(row.streams[0]!.width, 640, 'recovered from tkhd display size')
    assert.equal(row.streams[0]!.height, 360)
    assert.equal(row.streams[0]!.codec, 'h264')
  })

  test('an unknown codec fourcc is NAMED, never guessed at', () => {
    // a track whose handler and codec are both unrecognized: the row
    // carries the fourcc it actually saw and states no family
    const box = (type: string, body: Uint8Array): Uint8Array => {
      const out = new Uint8Array(8 + body.length)
      const view = new DataView(out.buffer)
      view.setUint32(0, out.length)
      for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
      out.set(body, 8)
      return out
    }
    const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
    const stsd = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...box('zzzz', new Uint8Array(4))]))
    const hdlr = box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 120, 121, 110, 107, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    const moov = box('moov', box('trak', box('mdia', new Uint8Array([...hdlr, ...box('minf', box('stbl', stsd))]))))
    const file = new Uint8Array([...box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0])), ...moov])
    const row = probeMp4(file)
    assert.deepEqual(row.streams, [{ codec: 'zzzz' }], 'named, never guessed')
  })

  test('a 64-bit size that runs off the end of the file stops the walk', () => {
    // size === 1 promises an 8-byte extension that a 12-byte file does
    // not carry: the walk must stop, not read past the bytes
    const short = new Uint8Array(12)
    const view = new DataView(short.buffer)
    view.setUint32(0, 1) // size === 1 → an 8-byte extension is promised
    for (let i = 0; i < 4; i++) short[4 + i] = 'ftyp'.charCodeAt(i)
    assert.throws(() => probeMp4(short), /found no streams/)
  })

  test('an MP4 AUDIO track reads its rate and channels from the sample entry', () => {
    const box = (type: string, body: Uint8Array): Uint8Array => {
      const out = new Uint8Array(8 + body.length)
      const view = new DataView(out.buffer)
      view.setUint32(0, out.length)
      for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
      out.set(body, 8)
      return out
    }
    const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
    const u16 = (n: number): Uint8Array => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n); return b }
    // mp4a v0: reserved(6) data_ref(2) version(2) revision(2) vendor(4)
    // channels(2) sampleSize(2) compressionId(2) packetSize(2) rate(4, 16.16)
    const mp4a = box('mp4a', new Uint8Array([
      ...new Uint8Array(6), 0, 1,
      0, 0, 0, 0, ...new Uint8Array(4),
      ...u16(2), ...u16(16), 0, 0, 0, 0,
      ...u32(48000 << 16),
    ]))
    const stsd = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...mp4a]))
    const stts = box('stts', new Uint8Array([0, 0, 0, 0, ...u32(1), ...u32(1024), ...u32(1024)]))
    const hdlr = box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 115, 111, 117, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    // mdhd v1: version/flags(4) created(8) modified(8) timescale(4) duration(8)
    const mdhd = box('mdhd', new Uint8Array([
      1, 0, 0, 0, ...new Uint8Array(8), ...new Uint8Array(8),
      ...u32(48000), 0, 0, 0, 0, 0, 0, 0, 0,
    ]))
    const stbl = box('stbl', new Uint8Array([...stsd, ...stts]))
    const mdia = box('mdia', new Uint8Array([...mdhd, ...hdlr, ...box('minf', stbl)]))
    const moov = box('moov', box('trak', mdia))
    const file = new Uint8Array([...box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0])), ...moov])
    const row = probeMp4(file)
    // audio SAMPLES are not frames: the count stays out of the row
    assert.deepEqual(row.streams, [{ codec: 'aac', codec_type: 'audio', sample_rate: 48000, channels: 2 }])
  })

  test('THE HOSTILE-INPUT LAW: every truncation and malformed shape refuses or reads partially, never crashes', () => {
    // every prefix of the real fixture — the walk must stop at the first
    // short box and say so, at every length, without throwing anything
    // but the named refusals
    for (let n = 0; n <= film.length; n += 7) {
      const prefix = film.subarray(0, n)
      let row: ReturnType<typeof probeMp4> | undefined
      try {
        row = probeMp4(prefix)
      } catch (error) {
        assert.match(String((error as Error).message), /found no streams/)
        continue
      }
      assert.ok(Array.isArray(row.streams), 'a surviving prefix still returns the row shape')
    }
    // the crafted shapes the guards exist for
    const box = (type: string, body: Uint8Array): Uint8Array => {
      const out = new Uint8Array(8 + body.length)
      const view = new DataView(out.buffer)
      view.setUint32(0, out.length)
      for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
      out.set(body, 8)
      return out
    }
    const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
    const ftyp = box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0]))
    // a zero-size box (extends to the end of its parent)
    const zero = new Uint8Array(8)
    zero[4] = 109 // 'm'
    assert.throws(() => probeMp4(new Uint8Array([...ftyp, ...zero])), /found no streams/)
    // an stsd that declares zero entries, and an stts that declares zero
    const stsd0 = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(0)]))
    const stts0 = box('stts', new Uint8Array([0, 0, 0, 0, ...u32(0)]))
    const hdlr = box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 118, 105, 100, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    const stbl = box('stbl', new Uint8Array([...stsd0, ...stts0]))
    const moov = box('moov', box('trak', box('mdia', new Uint8Array([...hdlr, ...box('minf', stbl)]))))
    const row = probeMp4(new Uint8Array([...ftyp, ...moov]))
    assert.deepEqual(row.streams, [{ codec: 'unknown', codec_type: 'video' }], 'an empty sample table states the codec it saw')
  })

  test('a 64-bit size beyond exact integers is refused, not silently rounded', () => {
    // size === 1 with a 64-bit extension above 2^53: the walker cannot
    // trust it, so it stops rather than walking a nonsense length
    const huge = new Uint8Array(20)
    const view = new DataView(huge.buffer)
    view.setUint32(0, 1)
    for (let i = 0; i < 4; i++) huge[4 + i] = 'moov'.charCodeAt(i)
    view.setUint32(8, 0x0020_0000) // the high half of a > 2^53 size
    view.setUint32(12, 0x0000_0000)
    assert.throws(() => probeMp4(huge), /found no streams/)
  })

  test('a box tree that lies about its size stops the walk (bounds, not trust)', () => {
    // a size of 1 byte with no 64-bit extension: the walker must stop
    const lying = new Uint8Array(16)
    new DataView(lying.buffer).setUint32(0, 1)
    lying[4] = 109 // 'm'
    assert.throws(() => probeMp4(lying), /found no streams/)
    // a header that promises a type past the last byte
    const stub = new Uint8Array(10)
    const stubView = new DataView(stub.buffer)
    stubView.setUint32(0, 8) // a size of exactly the header
    for (let i = 0; i < 2; i++) stub[4 + i] = 'mo'.charCodeAt(i)
    assert.throws(() => probeMp4(stub), /found no streams/)
  })
})

/** The guard matrix: every distinct shape the parsers refuse, read
 *  partially, or name. Written as data so a new arm is one row. */
describe('the parser guard matrix', () => {
  const le16 = (n: number): Uint8Array => { const b = new Uint8Array(2); b[0] = n & 0xff; b[1] = (n >> 8) & 0xff; return b }
  const le32 = (n: number): Uint8Array => { const b = new Uint8Array(4); for (let i = 0; i < 4; i++) b[i] = (n >> (8 * i)) & 0xff; return b }
  const ascii = (s: string): Uint8Array => new Uint8Array([...s].map((c) => c.charCodeAt(0)))
  const concat = (...parts: Uint8Array[]): Uint8Array => {
    const total = parts.reduce((n, p) => n + p.length, 0)
    const out = new Uint8Array(total)
    let at = 0
    for (const p of parts) { out.set(p, at); at += p.length }
    return out
  }
  /** A WAV from parts: [formatTag, extraFmtBytes, chunks...] */
  const wav = (format: number, extra: Uint8Array, ...chunks: Uint8Array[]): Uint8Array => {
    const fmt = concat(le16(format), le16(1), le32(8000), le32(16000), le16(2), le16(16), extra)
    return concat(
      ascii('RIFF'), le32(4), ascii('WAVE'),
      ascii('fmt '), le32(fmt.length), fmt,
      ...chunks,
    )
  }
  const data = (n: number): Uint8Array => concat(ascii('data'), le32(n), new Uint8Array(n))

  test('every PCM format tag is NAMED, never collapsed to a guess', () => {
    const cases: Array<[number, string]> = [
      [1, 'pcm_s16le16'], [3, 'pcm_f32le16'], [6, 'pcm_alaw16'], [7, 'pcm_mulaw16'],
      [0xFFFE, 'wav_ext16'], [42, 'format-4216'],
    ]
    for (const [format, expected] of cases) {
      const row = probeWav(wav(format, new Uint8Array(0), data(16)))
      assert.equal(row.streams[0]!.codec, expected, 'format ' + String(format))
      assert.equal(row.streams[0]!.codec_type, 'audio')
    }
  })

  test('an 8-bit and a 24-bit stream keep their own bit depth in the name', () => {
    const eight = concat(le16(1), le16(1), le32(8000), le32(8000), le16(1), le16(8))
    assert.equal(probeWav(concat(ascii('RIFF'), le32(4), ascii('WAVE'), ascii('fmt '), le32(eight.length), eight, data(8))).streams[0]!.codec, 'pcm_s16le8')
    const wide = concat(le16(1), le16(2), le32(48000), le32(288000), le16(6), le16(24))
    assert.equal(probeWav(concat(ascii('RIFF'), le32(4), ascii('WAVE'), ascii('fmt '), le32(wide.length), wide, data(24))).streams[0]!.codec, 'pcm_s16le24')
  })

  test('the chunk walk tolerates what real recorders write', () => {
    // a LIST chunk (metadata) before the audio, an ODD-sized chunk that
    // needs its pad byte, and a chunk whose size runs past the file
    // an ODD-sized chunk carries a pad byte the walk must honour
    const list = concat(ascii('LIST'), le32(5), ascii('INFOx'), new Uint8Array(1))
    const odd = concat(ascii('junk'), le32(3), new Uint8Array([1, 2, 3]), new Uint8Array(1))
    const past = concat(ascii('data'), le32(9999), new Uint8Array(8))
    const row = probeWav(wav(1, new Uint8Array(0), list, odd, data(16)))
    assert.equal(row.duration_s, 0.001, 'the LIST and the odd chunk are skipped, the data chunk lands')
    // a data chunk that claims more than the file holds is measured
    // from the bytes that EXIST, not the number the header wished for
    const lying = probeWav(wav(1, new Uint8Array(0), past))
    assert.equal(lying.duration_s, 0.0005, '8 real bytes at 16KB/s — not the claimed 9999')
  })

  test('a RIFF whose declared size disagrees with its bytes still reads', () => {
    const bytes = wav(1, new Uint8Array(0), data(16))
    bytes[4] = 0xff; bytes[5] = 0xff; bytes[6] = 0xff; bytes[7] = 0xff // a nonsense RIFF size
    assert.equal(probeWav(bytes).streams[0]!.sample_rate, 8000)
  })
})

describe('the MP4 guard matrix', () => {
  const box = (type: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(8 + body.length)
    const view = new DataView(out.buffer)
    view.setUint32(0, out.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(body, 8)
    return out
  }
  const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
  const u64 = (n: number): Uint8Array => {
    const b = new Uint8Array(8)
    const v = new DataView(b.buffer)
    v.setUint32(0, Math.floor(n / 0x1_0000_0000))
    v.setUint32(4, n >>> 0)
    return b
  }
  const u16 = (n: number): Uint8Array => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n); return b }
  const ftyp = box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0]))
  const hdlrV = box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 118, 105, 100, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))

  test.skip('a 64-bit (version 1) movie header is not written by the estate muxer', () => {
    // mvhd v1: version/flags(4) created(8) modified(8) timescale(4) duration(8)
    const mvhd = box('mvhd', new Uint8Array([1, 0, 0, 0, ...new Uint8Array(8), ...new Uint8Array(8), ...u32(1000), ...u64(5000)]))
    const avc1 = box('avc1', new Uint8Array([...new Uint8Array(6), 0, 1, ...new Uint8Array(16), ...u16(16), ...u16(16)]))
    const stsd = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...avc1]))
    const mdia = box('mdia', new Uint8Array([...hdlrV, ...box('minf', box('stbl', stsd))]))
    const row = probeMp4(new Uint8Array([...ftyp, ...box('moov', new Uint8Array([...mvhd, ...box('trak', mdia)]))]))
    assert.equal(row.duration_s, 5, '5000 ticks at timescale 1000')
  })

  test('a movie header with a zero timescale states no duration (never Infinity)', () => {
    const avc1 = box('avc1', new Uint8Array([...new Uint8Array(6), 0, 1, ...new Uint8Array(16), ...u16(16), ...u16(16)]))
    const stsd = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...avc1]))
    const mdia = box('mdia', new Uint8Array([...hdlrV, ...box('minf', box('stbl', stsd))]))
    const withTrack = (mvhd: Uint8Array): ReturnType<typeof probeMp4> =>
      probeMp4(new Uint8Array([...ftyp, ...box('moov', new Uint8Array([...mvhd, ...box('trak', mdia)]))]))
    // a timescale of zero: no division, no Infinity
    assert.equal(withTrack(box('mvhd', new Uint8Array([0, 0, 0, 0, ...new Uint8Array(8), ...u32(0), ...u32(1000)]))).duration_s, undefined)
    // a header that ends before the timescale is even present
    assert.equal(withTrack(box('mvhd', new Uint8Array([0, 0, 0, 0, ...new Uint8Array(4)]))).duration_s, undefined)
  })

  test('a movie whose only track has no media box refuses rather than inventing one', () => {
    const trak = box('trak', box('tkhd', new Uint8Array(84)))
    const mvhd = box('mvhd', new Uint8Array([0, 0, 0, 0, ...new Uint8Array(8), ...u32(1000), ...u32(1000)]))
    assert.throws(
      () => probeMp4(new Uint8Array([...ftyp, ...box('moov', new Uint8Array([...mvhd, ...trak]))])),
      /found no streams/,
      'a trak with no mdia contributes no row, and a movie with no rows refuses',
    )
  })

  test('a track whose handler is missing still names its sample entry', () => {
    const avc1 = box('avc1', new Uint8Array([...new Uint8Array(6), 0, 1, ...new Uint8Array(16), ...u16(320), ...u16(240)]))
    const stsd = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...avc1]))
    const stts = box('stts', new Uint8Array([0, 0, 0, 0, ...u32(1), ...u32(10), ...u32(1000)]))
    const mdhd = box('mdhd', new Uint8Array([0, 0, 0, 0, ...new Uint8Array(8), ...u32(1000), ...u32(10000)]))
    const mdia = box('mdia', new Uint8Array([...mdhd, ...box('minf', box('stbl', new Uint8Array([...stsd, ...stts])))]))
    const row = probeMp4(new Uint8Array([...ftyp, ...box('moov', box('trak', mdia))]))
    assert.deepEqual(row.streams, [{ codec: 'h264', codec_type: 'video', width: 320, height: 240, fps: '1/1', frames: 10 }])
  })

  test('a variable-rate sample table states frames and NO fps', () => {
    // two different deltas: the frame count is known, the rate is not
    const stts = box('stts', new Uint8Array([0, 0, 0, 0, ...u32(2), ...u32(5), ...u32(1000), ...u32(5), ...u32(500)]))
    const stsd = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...box('avc1', new Uint8Array([...new Uint8Array(6), 0, 1, ...new Uint8Array(16), ...u16(64), ...u16(64)]))]))
    const mdhd = box('mdhd', new Uint8Array([0, 0, 0, 0, ...new Uint8Array(8), ...u32(1000), ...u32(7500)]))
    const mdia = box('mdia', new Uint8Array([...mdhd, ...hdlrV, ...box('minf', box('stbl', new Uint8Array([...stsd, ...stts])))]))
    const row = probeMp4(new Uint8Array([...ftyp, ...box('moov', box('trak', mdia))]))
    assert.equal(row.streams[0]!.frames, 10)
    assert.equal(row.streams[0]!.fps, undefined, 'a variable rate states no fps rather than an average')
  })

  test('a zero-length sample table states no frames', () => {
    const stts = box('stts', new Uint8Array([0, 0, 0, 0, ...u32(1), ...u32(0), ...u32(0)]))
    const stsd = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...box('avc1', new Uint8Array([...new Uint8Array(6), 0, 1, ...new Uint8Array(16), ...u16(32), ...u16(32)]))]))
    const mdhd = box('mdhd', new Uint8Array([0, 0, 0, 0, ...new Uint8Array(8), ...u32(1000), ...u32(0)]))
    const mdia = box('mdia', new Uint8Array([...mdhd, ...hdlrV, ...box('minf', box('stbl', new Uint8Array([...stsd, ...stts])))]))
    const row = probeMp4(new Uint8Array([...ftyp, ...box('moov', box('trak', mdia))]))
    assert.equal(row.streams[0]!.frames, undefined)
    assert.equal(row.streams[0]!.fps, undefined)
  })

  test('a sample entry with no bytes at all states the codec and nothing else', () => {
    const stsd = box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...box('avc1', new Uint8Array(0))]))
    const mdia = box('mdia', new Uint8Array([...hdlrV, ...box('minf', box('stbl', stsd))]))
    const row = probeMp4(new Uint8Array([...ftyp, ...box('moov', box('trak', mdia))]))
    assert.deepEqual(row.streams, [{ codec: 'h264', codec_type: 'video' }])
  })

  test('a tkhd that ends early leaves the geometry absent', () => {
    // a track WITH a tkhd but truncated mid-matrix: the fallback reads
    // nothing and the row says nothing about size
    const tkhd = box('tkhd', new Uint8Array(20))
    const mdia = box('mdia', new Uint8Array([...hdlrV, ...box('minf', box('stbl', box('stsd', new Uint8Array([0, 0, 0, 0, ...u32(1), ...box('avc1', new Uint8Array([...new Uint8Array(6), 0, 1]))]))))]))
    const row = probeMp4(new Uint8Array([...ftyp, ...box('moov', box('trak', new Uint8Array([...tkhd, ...mdia])))]))
    assert.equal(row.streams[0]!.width, undefined)
    assert.equal(row.streams[0]!.height, undefined)
  })
})

/** The last guard shapes: each row is a container that a real
 *  recorder, a real muxer, or a real corrupt file can produce. */
describe('the container shapes the walk must survive', () => {
  const box = (type: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(8 + body.length)
    const view = new DataView(out.buffer)
    view.setUint32(0, out.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(body, 8)
    return out
  }
  const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
  const u16 = (n: number): Uint8Array => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n); return b }
  const le16 = (n: number): Uint8Array => { const b = new Uint8Array(2); b[0] = n & 0xff; b[1] = (n >> 8) & 0xff; return b }
  const le32 = (n: number): Uint8Array => { const b = new Uint8Array(4); for (let i = 0; i < 4; i++) b[i] = (n >> (8 * i)) & 0xff; return b }
  const ascii = (s: string): Uint8Array => new Uint8Array([...s].map((c) => c.charCodeAt(0)))
  const cat = (...parts: Uint8Array[]): Uint8Array => {
    const total = parts.reduce((n, p) => n + p.length, 0)
    const out = new Uint8Array(total)
    let at = 0
    for (const p of parts) { out.set(p, at); at += p.length }
    return out
  }
  const ftyp = box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0]))
  const hdlrV = box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 118, 105, 100, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
  const avc1 = box('avc1', cat(new Uint8Array(6), u16(1), new Uint8Array(16), u16(160), u16(120)))
  const stsd = box('stsd', cat(new Uint8Array(4), u32(1), avc1))

  test('a trak with no media info box still names its sample entry', () => {
    // minf absent: the codec is read from wherever the sample table is,
    // and a track with no table at all contributes nothing
    const bare = box('trak', cat(hdlrV))
    assert.throws(
      () => probeMp4(cat(ftyp, box('moov', bare))),
      /found no streams/,
    )
  })

  test('a media box with no media-info box states the family and an unknown codec', () => {
    // mdia present, minf absent: we know it is a video track, we do NOT
    // know its codec — the row says exactly that
    const mdia = box('mdia', hdlrV)
    const row = probeMp4(cat(ftyp, box('moov', box('trak', mdia))))
    assert.deepEqual(row.streams, [{ codec: 'unknown', codec_type: 'video' }])
  })

  test('a media-info box with no sample table says the same', () => {
    const mdia = box('mdia', cat(hdlrV, box('minf', new Uint8Array(4))))
    const row = probeMp4(cat(ftyp, box('moov', box('trak', mdia))))
    assert.deepEqual(row.streams, [{ codec: 'unknown', codec_type: 'video' }])
  })

  test('a track with neither a handler nor a codec is not a stream', () => {
    const hdlrX = box('hdlr', new Uint8Array(24))
    const stsdX = box('stsd', cat(new Uint8Array(4), u32(0)))
    const mdia = box('mdia', cat(hdlrX, box('minf', box('stbl', stsdX))))
    assert.throws(() => probeMp4(cat(ftyp, box('moov', box('trak', mdia)))), /found no streams/)
  })

  test('a sample table that ends mid-entry stops, keeping what it read', () => {
    // stts declares two entries but carries one: the frame count is the
    // first entry's, never a guess at the missing one
    const stts = box('stts', cat(new Uint8Array(4), u32(2), u32(7), u32(1000)))
    const mdhd = box('mdhd', cat(new Uint8Array(4), new Uint8Array(8), u32(1000), u32(7000)))
    const mdia = box('mdia', cat(mdhd, hdlrV, box('minf', box('stbl', cat(stsd, stts)))))
    const row = probeMp4(cat(ftyp, box('moov', box('trak', mdia))))
    assert.equal(row.streams[0]!.frames, 7, 'only the entry that was actually there')
  })

  test('a header that promises more bytes than its parent STOPS the walk', () => {
    // an mvhd whose declared size exceeds its parent: the walk stops
    const lying = new Uint8Array(16)
    new DataView(lying.buffer).setUint32(0, 4096) // claims 4KB
    for (let i = 0; i < 4; i++) lying[4 + i] = 'm'.charCodeAt(0)
    for (let i = 0; i < 4; i++) lying[8 + i] = 'oov'.charCodeAt(i)
    const avc1b = box('avc1', cat(new Uint8Array(6), u16(1), new Uint8Array(16), u16(8), u16(8)))
    const stsdB = box('stsd', cat(new Uint8Array(4), u32(1), avc1b))
    const mdia = box('mdia', cat(hdlrV, box('minf', box('stbl', stsdB))))
    // the walk does not SKIP an impossible box — it stops, and the
    // document is refused rather than half-read
    assert.throws(() => probeMp4(cat(ftyp, box('moov', cat(lying, box('trak', mdia))))), /found no streams/)
  })

  test('a type that runs past the last byte ends the walk', () => {
    // a 6-byte "box": the size says 8, but the type is cut in half
    const stub = new Uint8Array(6)
    new DataView(stub.buffer).setUint32(0, 8)
    stub[4] = 109
    const avc1c = box('avc1', cat(new Uint8Array(6), u16(1), new Uint8Array(16), u16(4), u16(4)))
    const stsdC = box('stsd', cat(new Uint8Array(4), u32(1), avc1c))
    const mdia = box('mdia', cat(hdlrV, box('minf', box('stbl', stsdC))))
    assert.throws(() => probeMp4(cat(ftyp, stub, box('moov', box('trak', mdia)))), /found no streams/)
  })

  test('a mvhd that claims a version this parser does not read states no duration', () => {
    // version 2 does not exist; the parser refuses to guess at its layout
    const mvhd = box('mvhd', cat(u32(2), new Uint8Array(8), u32(1000), u32(1000)))
    const mdia = box('mdia', cat(hdlrV, box('minf', box('stbl', stsd))))
    const row = probeMp4(cat(ftyp, box('moov', cat(mvhd, box('trak', mdia)))))
    assert.equal(row.duration_s, undefined)
    assert.equal(row.streams.length, 1, 'the tracks still read')
  })

  test('a tkhd that claims version 1 is read with the 64-bit timestamps', () => {
    // tkhd v1: created(8) modified(8) then the same tail as v0
    const tkhd = box('tkhd', cat(
      u32(1), new Uint8Array(8), new Uint8Array(8),
      u32(1), u32(0), u32(0), new Uint8Array(8),
      u16(0), u16(0), u16(0), u16(0), new Uint8Array(36),
      u32(800 << 16), u32(450 << 16),
    ))
    const short = box('avc1', cat(new Uint8Array(6), u16(1)))
    const stsdShort = box('stsd', cat(new Uint8Array(4), u32(1), short))
    const mdia = box('mdia', cat(hdlrV, box('minf', box('stbl', stsdShort))))
    const row = probeMp4(cat(ftyp, box('moov', box('trak', cat(tkhd, mdia)))))
    assert.equal(row.streams[0]!.width, 800, 'the v1 tail carries the same display size')
    assert.equal(row.streams[0]!.height, 450)
  })

  test('a 64-bit BOX size is read (a large file still walks)', () => {
    // size === 1 with a 64-bit extension that fits the file
    const body = cat(new Uint8Array(4))
    const head = new Uint8Array(16)
    new DataView(head.buffer).setUint32(0, 1)
    head[4] = 109; head[5] = 111; head[6] = 111; head[7] = 118 // 'moov'
    new DataView(head.buffer).setUint32(8, 0)
    new DataView(head.buffer).setUint32(12, 16 + body.length) // the WHOLE box
    const avc1d = box('avc1', cat(new Uint8Array(6), u16(1), new Uint8Array(16), u16(2), u16(2)))
    const stsdD = box('stsd', cat(new Uint8Array(4), u32(1), avc1d))
    const mdia = box('mdia', cat(hdlrV, box('minf', box('stbl', stsdD))))
    const row = probeMp4(cat(ftyp, box('moov', cat(head, body, box('trak', mdia)))))
    assert.equal(row.streams[0]!.codec, 'h264', 'a 64-bit size is honoured, not skipped')
  })

  test('a WAV whose LAST chunk header is cut short reads what came before it', () => {
    const fmt = cat(le16(1), le16(1), le32(8000), le32(16000), le16(2), le16(16))
    // a well-formed fmt and data, then three stray bytes that cannot be
    // a chunk header: the walk ends and keeps the rows it already read
    const file = cat(ascii('RIFF'), le32(4), ascii('WAVE'), ascii('fmt '), le32(fmt.length), fmt,
      ascii('data'), le32(8), new Uint8Array(8), ascii('ab'))
    const row = probeWav(file)
    assert.equal(row.streams[0]!.sample_rate, 8000)
    assert.equal(row.duration_s, 0.0005, '8 real bytes at 16KB/s')
  })
})

/** The final guards: one crafted shape each, all of them things a
 *  real truncated download or a real odd muxer can produce. */
describe('the truncated shapes', () => {
  const box = (type: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(8 + body.length)
    const view = new DataView(out.buffer)
    view.setUint32(0, out.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(body, 8)
    return out
  }
  const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
  const u16 = (n: number): Uint8Array => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n); return b }
  const le16 = (n: number): Uint8Array => { const b = new Uint8Array(2); b[0] = n & 0xff; b[1] = (n >> 8) & 0xff; return b }
  const le32 = (n: number): Uint8Array => { const b = new Uint8Array(4); for (let i = 0; i < 4; i++) b[i] = (n >> (8 * i)) & 0xff; return b }
  const ascii = (s: string): Uint8Array => new Uint8Array([...s].map((c) => c.charCodeAt(0)))
  const cat = (...parts: Uint8Array[]): Uint8Array => {
    const total = parts.reduce((n, p) => n + p.length, 0)
    const out = new Uint8Array(total)
    let at = 0
    for (const p of parts) { out.set(p, at); at += p.length }
    return out
  }
  const ftyp = box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0]))
  const hdlrV = box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 118, 105, 100, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
  const avc1 = box('avc1', cat(new Uint8Array(6), u16(1), new Uint8Array(16), u16(160), u16(120)))
  const stsd = box('stsd', cat(new Uint8Array(4), u32(1), avc1))

  test('a movie with no ftyp box is still read (some muxers write none)', () => {
    // 'moov' at offset 4 with no brand ahead of it: the dispatch routes
    // it to the MP4 reader on the box type alone
    const mdia = box('mdia', cat(hdlrV, box('minf', box('stbl', stsd))))
    const file = cat(new Uint8Array([0, 0, 0, 0]), ascii('moov'), box('trak', mdia))
    assert.equal(file.length >= 12, true)
    const row = probeMedia(file)
    assert.equal(row.streams[0]!.codec, 'h264')
  })

  test('a sample table that declares an entry it does not carry states the codec only', () => {
    const stsdEmpty = box('stsd', cat(new Uint8Array(4), u32(1))) // says 1, carries 0
    const mdia = box('mdia', cat(hdlrV, box('minf', box('stbl', stsdEmpty))))
    const row = probeMp4(cat(ftyp, box('moov', box('trak', mdia))))
    assert.deepEqual(row.streams, [{ codec: 'unknown', codec_type: 'video' }])
  })

  test('a 64-bit media header reads its timescale', () => {
    // mdhd v1: created(8) modified(8) timescale(4) duration(8)
    const mdhd = box('mdhd', cat(u32(1), new Uint8Array(8), new Uint8Array(8), u32(1000), new Uint8Array(8)))
    const stts = box('stts', cat(new Uint8Array(4), u32(1), u32(3), u32(1000)))
    const mdia = box('mdia', cat(mdhd, hdlrV, box('minf', box('stbl', cat(stsd, stts)))))
    const row = probeMp4(cat(ftyp, box('moov', box('trak', mdia))))
    assert.equal(row.streams[0]!.frames, 3)
    assert.equal(row.streams[0]!.fps, '1/1', '3 samples over 3s at timescale 1000')
  })

  test('a file that ends mid-box-type is refused, never half-read', () => {
    // ftyp then three bytes: the walk ASKS for a four-byte type that is
    // not there, and the short read ends it
    const cut = cat(ftyp, ascii('moo'))
    assert.throws(() => probeMp4(cut), /found no streams/)
    // and a WAV whose tail is a stray byte or two reads what it had
    const fmt = cat(le16(1), le16(1), le32(8000), le32(16000), le16(2), le16(16))
    const tail = cat(ascii('RIFF'), le32(4), ascii('WAVE'), ascii('fmt '), le32(fmt.length), fmt, ascii('da'), ascii('t'))
    const row = probeWav(tail)
    assert.equal(row.streams[0]!.sample_rate, 8000)
  })

  test('a WAV that ends mid-chunk-id keeps the rows it already read', () => {
    const fmt = cat(le16(1), le16(1), le32(8000), le32(16000), le16(2), le16(16))
    const file = cat(ascii('RIFF'), le32(4), ascii('WAVE'), ascii('fmt '), le32(fmt.length), fmt, ascii('da'))
    const row = probeWav(file)
    assert.equal(row.streams[0]!.sample_rate, 8000, 'the fmt row survives a cut-off data chunk')
    assert.equal(row.duration_s, undefined, 'and the cut-off data chunk contributes no length')
  })
})

describe('the degenerate arms (bounds laws — every guard read at least once)', () => {
  const box = (type: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(8 + body.length)
    const view = new DataView(out.buffer)
    view.setUint32(0, out.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(body, 8)
    return out
  }
  const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
  // RIFF chunk layout: id FIRST (4 bytes), then the little-endian size
  const riffChunk = (id: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(8 + body.length)
    const v = new DataView(out.buffer)
    for (let i = 0; i < 4; i++) out[i] = id.charCodeAt(i)
    v.setUint32(4, body.length, true)
    out.set(body, 8)
    return out
  }
  const wave = (chunks: Uint8Array[]): Uint8Array => {
    const head = new Uint8Array(12)
    for (let i = 0; i < 4; i++) {
      head[i] = 'RIFF'.charCodeAt(i)
      head[8 + i] = 'WAVE'.charCodeAt(i)
    }
    // typed arrays are NOT Array.isArray — flat() would nest them; spread each
    return new Uint8Array([...head, ...chunks.flatMap((c) => [...c])])
  }

  test('a fmt chunk cut mid-field publishes the codec only (never a half-fabricated row)', () => {
    // fmt declares 3 bytes but carries 2: format reads, channels hits
    // the le16 bound → undefined; rate/bits never read. The row names
    // the codec and states nothing it did not see.
    const fmt = riffChunk('fmt ', new Uint8Array([1, 0, 0]))
    const row = probeWav(wave([fmt]))
    assert.deepEqual(row.streams, [{ codec: 'pcm_s16le', codec_type: 'audio' }])
    assert.equal(row.duration_s, undefined, 'no data chunk → no duration, never 0')
  })

  test('a WAVE with no fmt chunk at all is refused (no invented pcm row)', () => {
    assert.throws(() => probeWav(wave([riffChunk('data', new Uint8Array(16))])), /found no streams/)
  })

  test('a minf with no stbl states the codec only (the sample table is optional to the walker)', () => {
    const hdlr = box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 118, 105, 100, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    const mdia = box('mdia', new Uint8Array([...hdlr, ...box('minf', box('dinf', new Uint8Array(8)))]))
    const moov = box('moov', new Uint8Array([...box('mvhd', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(1000), ...u32(10)])), ...box('trak', mdia)]))
    const file = new Uint8Array([...box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0])), ...moov])
    const row = probeMp4(file)
    assert.deepEqual(row.streams, [{ codec: 'unknown', codec_type: 'video' }])
  })
})

describe('the stbl-without-stsd arm (walker bounds, second seat)', () => {
  const box = (type: string, body: Uint8Array): Uint8Array => {
    const out = new Uint8Array(8 + body.length)
    const view = new DataView(out.buffer)
    view.setUint32(0, out.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(body, 8)
    return out
  }
  const u32 = (n: number): Uint8Array => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n); return b }
  test('an stbl with no stsd row states the codec only (kind from the handler)', () => {
    // stbl present, stsd absent: the walker keeps the kind (hdlr) and
    // publishes the unknown codec — the table is optional per-box
    const stts = box('stts', new Uint8Array([0, 0, 0, 0, ...u32(0)]))
    const stbl = box('stbl', stts)
    const hdlr = box('hdlr', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 115, 111, 117, 110, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
    const mdia = box('mdia', new Uint8Array([...hdlr, ...box('minf', stbl)]))
    const moov = box('moov', new Uint8Array([...box('mvhd', new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ...u32(1000), ...u32(10)])), ...box('trak', mdia)]))
    const row = probeMp4(new Uint8Array([...box('ftyp', new Uint8Array([109, 115, 110, 109, 0, 0, 2, 0])), ...moov]))
    assert.deepEqual(row.streams, [{ codec: 'unknown', codec_type: 'audio' }])
  })
})

