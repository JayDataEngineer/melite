// filmMix.ts — the film's audio mix, ONE math owner (roadmap §20).
//
// History: the original in-graph film tail died of its own backlog —
// every window's tensors stayed resident until the final CreateVideo
// (the OOM signature that killed attempt 002's film 3×, a 43h
// engine). The mix moved disk-side (estate filmMux, ffmpeg) for one
// day; that died too (2026-09-22, the operator's provenance law —
// every artifact traces to a composition of cards, never a harness
// side-effect). The tail returned IN-GRAPH in FILE form: windows
// save their own clips, an unload boundary orders + flushes, and the
// file tail decodes the saves back in — no tensor ever spans the
// boundary. This module stays the ONE placement-math owner both
// halves drive (the card's conditioning stamps and the film-time
// overlay read the same manifest), and now owns the CLOCK too
// (stanzaSecs — the compose-time windowSecs law).
//
// The two wrongs in the card's history (the +22f carry original,
// the start/24 first correction) stay dead in one place.
export type FilmMixClipClass = 'dialogue' | 'sfx' | 'music'

/** One clip row — the card's audio_clips shape, post-parse. */
export interface FilmMixClip {
  readonly src: string
  /** doc-anchored start (frames @24fps — the stamp, studio lanes, and tool face all speak doc). */
  readonly start: number
  /** duration (frames; 0 = overlay-only, unsized). */
  readonly dur: number
  readonly text: string
  readonly cls: FilmMixClipClass
}

/** Parse raw audio_clips rows — the card's one law for what a clip
 *  IS: a src without a numeric start_frame refuses loud (never a
 *  silent misplacement); a row without src is junk and skips; the
 *  class auto law (text → dialogue, textless → music) rides here. */
export function parseFilmMixClips(rows: readonly unknown[]): FilmMixClip[] {
  const clips: FilmMixClip[] = []
  for (const c of rows) {
    if (c === null || typeof c !== 'object') continue
    const row = c as Record<string, unknown>
    const src = typeof row.src === 'string' ? row.src.trim() : ''
    if (src === '') continue
    if (typeof row.start_frame !== 'number' || !Number.isFinite(row.start_frame)) {
      throw new Error(
        `audio_clips: a clip with src but no numeric start_frame — the audio lanes own placement (re-add the clip)`,
      )
    }
    const dur = typeof row.dur_frames === 'number' && Number.isFinite(row.dur_frames) && row.dur_frames > 0
      ? row.dur_frames
      : 0
    const text = typeof row.text === 'string' ? row.text.trim() : ''
    const clsRaw = typeof row.class === 'string' ? row.class.trim().toLowerCase() : ''
    if (clsRaw !== '' && clsRaw !== 'dialogue' && clsRaw !== 'sfx' && clsRaw !== 'music') {
      throw new Error(
        `audio_clips: unknown class "${clsRaw}" — dialogue | sfx | music (omit for auto: text → dialogue, else music)`,
      )
    }
    const cls = (clsRaw !== '' ? clsRaw : text !== '' ? 'dialogue' : 'music') as FilmMixClipClass
    clips.push({ src, start: row.start_frame, dur, text, cls })
  }
  return clips
}

/** One window's doc span + seam for the owner map. */
export interface FilmMixSpan {
  /** doc-anchored span start (frames). */
  readonly start: number
  /** doc-anchored span end (frames). */
  readonly end: number
  /** 'cut' = the director's overlap-0 arm; anything else extends at 22f. */
  readonly transition?: string
}

/** One positioned clip — the overlay's currency. */
export interface FilmMixPlacement {
  /** index into the clips array. */
  readonly clip: number
  readonly cls: FilmMixClipClass
  /** film seat (seconds, ms-rounded). */
  readonly filmSec: number
  /** overlay duration (seconds, ms-rounded; 0 = full-length, unfitted). */
  readonly durSec: number
}

/** One duck span (seconds, ms-rounded). */
export interface FilmMixSpanSec {
  readonly start: number
  readonly end: number
}

/** The mix manifest — everything the disk-side mix needs. */
export interface FilmMixManifest {
  readonly placements: FilmMixPlacement[]
  /** the film track ducks during every CONDITIONED span (the doubling
   *  case — the model reproduces what it hears pinned). */
  readonly duckSpans: FilmMixSpanSec[]
  /** the music sub-bus ducks under dialogue/sfx spans only (the
   *  score yields to speech and impacts; never to itself). */
  readonly musicDuckSpans: FilmMixSpanSec[]
  /** the in-graph MeliteAudioDuck string form ("a:b;c:d") — the
   *  retired tail's voice, kept for the walls. */
  readonly duckSpanString: string
  readonly musicDuckSpanString: string
  readonly duckDb: number
  /** the total film duration (seconds, ms-rounded). */
  readonly filmSec: number
}

export interface FilmMixInput {
  readonly spans: FilmMixSpan[]
  readonly clips: FilmMixClip[]
  /** per-window rendered durations (seconds) — stanza length/24 at
   *  compose time, probed durations disk-side. THE ground truth the
   *  owner map accumulates (never re-derived from spans). */
  readonly windowSecs: number[]
  readonly duckDb?: number
}

const round3 = (v: number): number => Math.round(v * 1000) / 1000

/** The duck span string — "start:end" at ms precision, ';'-joined. */
export function formatDuckSpan(start: number, end: number): string {
  return `${round3(start)}:${round3(end)}`
}

/** The seam overlap of a span (frames): 'cut' = 0, else the proven 22. */
export function spanOverlap(span: FilmMixSpan): number {
  return span.transition === 'cut' ? 0 : 22
}

/** The render grid's stanza length for one span (§26): 22+17k
 *  frames, clamped [22,362] — the snap the card's window loop and
 *  this clock share, owned HERE so they can never drift (the
 *  two-clocks law: the render and the accounting must state the
 *  same window). */
export function spanStanzaFrames(span: FilmMixSpan): number {
  const kk = Math.round((span.end - span.start - 22) / 17)
  return Math.min(362, Math.max(22, 22 + 17 * kk))
}

/** Per-window stanza seconds — THE compose-time windowSecs
 *  (computeFilmMix's ground truth): the render grid's own promise,
 *  the deliverer's contract — SaveVideo hands back exactly stanza
 *  frames at 24fps. No probe, no disk: the clock is pure at
 *  compose. RAW fractions (frames/24, unrounded): the manifest sums
 *  these into film starts, and rounding a SUM of rounded parts
 *  compounds drift (the 3-window seat 7.416 ≠ 7.417 proof) — only
 *  the final seats/spans round (ms, computeFilmMix's own law). */
export function stanzaSecs(spans: readonly FilmMixSpan[]): number[] {
  return spans.map((s) => spanStanzaFrames(s) / 24)
}

export function computeFilmMix(input: FilmMixInput): FilmMixManifest {
  const { spans, clips, windowSecs } = input
  if (windowSecs.length !== spans.length) {
    throw new Error(
      `film mix: ${windowSecs.length} window duration(s) for ${spans.length} span(s) — the owner map needs one duration per window (never a guess)`,
    )
  }
  const overlaps = spans.map(spanOverlap)
  // THE OWNER MAP (the fixed point — see module header): the film
  // seat of doc frame f owned by window w is
  // w.filmStartSec + (f − w.docStart)/24, NO carry term (the trim
  // already lives inside filmStartSec — each extend join trims the
  // overlap off the film). Owning window: the LAST whose docStart ≤ f.
  const filmStarts: number[] = []
  let elapsed = 0
  for (let i = 0; i < spans.length; i++) {
    filmStarts.push(elapsed)
    elapsed += windowSecs[i]! - (i > 0 ? overlaps[i]! : 0) / 24
  }
  const filmSec = round3(elapsed)
  // CONDITIONED clips (the stamp law's overlay half): every window
  // whose generation span a clip rides HEARD that clip — one lane
  // per CLASS, the FIRST clip in row order winning its class's lane
  // when several of one class overlap one window. A clip with no
  // dur (or a sub-0.1s overlap) cannot size a slice and stays
  // overlay-only. The generation render starts at doc frame
  // sf − carry (the carry head included).
  const conditioned = new Set<number>()
  spans.forEach((span, i) => {
    if (!Number.isFinite(span.start) || !Number.isFinite(span.end) || span.end <= span.start) return
    const carry = i > 0 ? overlaps[i]! : 0
    const genStart = span.start - carry
    const won: Partial<Record<FilmMixClipClass, true>> = {}
    for (let ci = 0; ci < clips.length; ci++) {
      const clip = clips[ci]!
      if (clip.dur <= 0) continue
      if (won[clip.cls] !== undefined) continue
      const lo = Math.max(clip.start, genStart)
      const hi = Math.min(clip.start + clip.dur, span.end)
      if (hi - lo < 2.4) continue
      won[clip.cls] = true
      conditioned.add(ci)
    }
  })
  // PLACEMENTS: doc frame → film seat through the owner map.
  const placements: FilmMixPlacement[] = clips.map((clip, ci) => {
    let owner = 0
    for (let w = 0; w < spans.length; w++) {
      if (clip.start >= spans[w]!.start) owner = w
    }
    const filmSeat = Math.max(0, filmStarts[owner]! + (clip.start - spans[owner]!.start) / 24)
    return {
      clip: ci,
      cls: clip.cls,
      filmSec: round3(filmSeat),
      durSec: clip.dur > 0 ? round3(clip.dur / 24) : 0,
    }
  })
  // THE DUCK MATRIX (D-M-E): the film's generated audio yields
  // during every conditioned span; the MUSIC bus ducks under the
  // dialogue and sfx spans; dialogue and sfx ride at unity.
  const spanOf = (ci: number): FilmMixSpanSec | null => {
    const pl = placements[ci]!
    if (!conditioned.has(ci) || pl.durSec <= 0) return null
    return { start: pl.filmSec, end: round3(pl.filmSec + pl.durSec) }
  }
  const duckSpans: FilmMixSpanSec[] = []
  const musicDuckSpans: FilmMixSpanSec[] = []
  for (let ci = 0; ci < clips.length; ci++) {
    const s = spanOf(ci)
    if (s === null) continue
    duckSpans.push(s)
    if (clips[ci]!.cls !== 'music') musicDuckSpans.push(s)
  }
  const duckDb = typeof input.duckDb === 'number' && Number.isFinite(input.duckDb) ? input.duckDb : -14
  return {
    placements,
    duckSpans,
    musicDuckSpans,
    duckSpanString: duckSpans.map((s) => formatDuckSpan(s.start, s.end)).join(';'),
    musicDuckSpanString: musicDuckSpans.map((s) => formatDuckSpan(s.start, s.end)).join(';'),
    duckDb,
    filmSec,
  }
}
