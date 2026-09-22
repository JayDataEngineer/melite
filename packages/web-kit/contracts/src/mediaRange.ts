// mediaRange.ts — THE BYTE-RANGE LAW (2026-10-08, the audio-seek
// stroke): native <audio>/<video> elements seek by issuing
// `Range: bytes=…` requests — a route that answers whole-file 200s
// on every GET leaves the playhead unable to move outside what has
// already buffered (the operator's catch: "I can't even click and
// drag to change position in the audio clip"). ONE pure parse,
// shared by every route that serves run artifact bytes (the
// estate media route + the gallery artifact route — the mediaVocab
// precedent: pure laws both build graphs share live in this leaf,
// never a copy per route).
//
// The grammar (RFC 9110 §14.2, single range only): a server MAY
// ignore any Range it does not want to honor — malformed spellings,
// multi-range lists, and inverted bounds serve the FULL 200; a
// satisfiable range serves 206 with exactly the asked slice (end
// clamped to EOF); a start at/past EOF, or a zero-byte suffix tail,
// is the loud 416.

/** One satisfiable byte window, inclusive on both ends. */
export interface ByteRange {
  readonly start: number
  readonly end: number
}

/** Parse one `Range` request header against a known body size.
 *
 * - `null` — serve the FULL 200: no header, or an ignorable
 *   spelling (malformed, multi-range, `bytes=-`, inverted bounds).
 *   A server MAY ignore; this route ignores rather than erroring —
 *   a stray header never breaks a plain GET.
 * - `'unsatisfiable'` — the loud 416: no byte of the file can
 *   satisfy the ask (start at/past EOF, or a zero-length suffix).
 * - `{ start, end }` — serve 206 with bytes start..end inclusive;
 *   a missing/overlong end clamps to the last byte.
 *
 * The unit word is matched case-SENSITIVELY (`bytes=`) — what every
 * browser sends; exotic spellings fall to the ignore arm, never a
 * wrong slice. */
export function parseRangeHeader(
  header: string | undefined,
  size: number,
): ByteRange | 'unsatisfiable' | null {
  if (header === undefined) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (m === null) return null
  const [, s, e] = m as RegExpExecArray & { 1: string; 2: string }
  if (s === '' && e === '') return null
  if (s === '') {
    // suffix range: the LAST n bytes
    const n = Number(e)
    if (n === 0 || size === 0) return 'unsatisfiable'
    return { start: Math.max(0, size - n), end: size - 1 }
  }
  const start = Number(s)
  if (start >= size) return 'unsatisfiable'
  const end = e === '' ? size - 1 : Math.min(Number(e), size - 1)
  if (start > end) return null
  return { start, end }
}
