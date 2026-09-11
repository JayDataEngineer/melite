/**
 * E3.7 — Caption text splitter.
 *
 * Converts a plain-text transcription into a sequence of CaptionCues with
 * proportional timing. When the ASR backend provides word-level timestamps
 * (via `tokens`), we use those directly. Otherwise we fall back to
 * sentence-aware splitting with proportional duration allocation (by
 * character count — longer sentences get proportionally more time).
 *
 * Caption length targets ~42 characters per cue (the industry standard
 * for readable subtitles, per the BBC/NBC style guides). Sentences longer
 * than that are split at clause boundaries (commas, semicolons, dashes)
 * or at word boundaries as a last resort.
 *
 * Timing model: cue.start/end are SECONDS RELATIVE TO THE SEGMENT START
 * (not the global timeline). The program monitor maps global time →
 * segment-relative time before looking up the active cue.
 */
import type { CaptionCue } from "@melite/contracts"

export interface SplitArgs {
  /** Full transcription text. */
  text: string
  /** Segment duration in seconds (the cues' timing window). */
  duration: number
  /** Optional word-level timestamps from the ASR backend. When provided,
   *  cues are built from the actual word timings instead of proportional
   *  splitting. Each token: { text, start, end } in seconds. */
  tokens?: Array<{ text: string; start: number; end: number }> | null
  /** Max characters per cue (default 42). */
  maxChars?: number
}

const DEFAULT_MAX_CHARS = 42

/**
 * Build CaptionCues from a transcription. Returns an empty array if the
 * text is empty/whitespace or the duration is <= 0.
 */
export function splitCaptions(args: SplitArgs): CaptionCue[] {
  const { text, duration, tokens = null, maxChars = DEFAULT_MAX_CHARS } = args
  if (duration <= 0) return []

  // ── Timestamped path takes precedence — tokens can build cues even
  //    with empty text (the text is derived from the tokens). ─────────────
  if (tokens && tokens.length > 0) {
    return buildFromTokens(tokens, maxChars, duration)
  }

  const trimmed = text.trim()
  if (!trimmed) return []

  // ── Proportional path: split text + distribute by character count ──────
  const chunks = splitIntoChunks(trimmed, maxChars)
  /* v8 ignore next -- chunks is non-empty: trimmed is non-empty so the
     sentence split yields >=1 match, every match holds a non-space char
     (kept below), and each kept sentence emits >=1 fragment (2026-09-12) */
  if (chunks.length === 0) return []

  const totalChars = chunks.reduce((s, c) => s + c.length, 0)
  let elapsed = 0
  return chunks.map((chunk, i) => {
    // Proof (2026-09-12): every chunk is a non-empty string (proven at the
    // chunks.length guard above), so totalChars is positive — no fallback.
    const proportion = chunk.length / totalChars
    const start = elapsed
    const segDur = proportion * duration
    // Last cue gets the remaining time (avoids float drift at the end).
    const end = i === chunks.length - 1 ? duration : Math.min(duration, start + segDur)
    elapsed = end
    return {
      id: `cap_${i}_${Math.random().toString(36).slice(2, 8)}`,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      text: chunk,
    }
  })
}

/**
 * Split text into caption-length chunks. Strategy (in priority order):
 *   1. Split into sentences (terminators . ! ? …).
 *   2. If a sentence exceeds maxChars, split at clause boundaries
 *      (, ; : — –) then at word boundaries as a last resort.
 *   3. Merge short consecutive fragments up to maxChars.
 */
export function splitIntoChunks(text: string, maxChars = DEFAULT_MAX_CHARS): string[] {
  // Normalize whitespace.
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []

  // Step 1: split into sentences, keeping the terminator.
  // The second alternative matches any trailing non-space run, so a
  // non-empty input always yields >=1 match (the `as` is proven, not blind:
  // `clean` is non-empty per the guard above).
  const sentences = clean.match(/[^.!?…]+[.!?…]+|\S[^.!?…]*$/g) as RegExpMatchArray
  // Step 2: break long sentences at clause / word boundaries.
  const fragments: string[] = []
  for (const s of sentences) {
    const trimmed = s.trim()
    /* v8 ignore next -- every match holds >=1 non-space char (the first
       alternative ends in a terminator, the second starts with \S), so
       trimmed is never empty here (2026-09-12) */
    if (!trimmed) continue
    if (trimmed.length <= maxChars) {
      fragments.push(trimmed)
    } else {
      fragments.push(...splitLongSentence(trimmed, maxChars))
    }
  }
  // Step 3: greedily merge short fragments up to maxChars.
  return mergeFragments(fragments, maxChars)
}

/** Split a long sentence at clause boundaries, then word boundaries. */
function splitLongSentence(s: string, maxChars: number): string[] {
  // Try clause boundaries first: , ; : — –
  const clauseParts = s.split(/(?<=[,;:—–])\s+/).map((p) => p.trim()).filter(Boolean)
  if (clauseParts.length > 1) {
    return clauseParts.flatMap((p) =>
      p.length <= maxChars ? [p] : splitAtWordBoundary(p, maxChars),
    )
  }
  // No clause boundaries — split at word boundaries.
  return splitAtWordBoundary(s, maxChars)
}

/** Split at word boundaries, each chunk <= maxChars. */
function splitAtWordBoundary(s: string, maxChars: number): string[] {
  const words = s.split(/\s+/)
  const chunks: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim()
    } else {
      if (cur) chunks.push(cur)
      cur = w
    }
  }
  /* v8 ignore next -- same proof as above: cur is non-empty here (2026-09-12) */
  if (cur) chunks.push(cur)
  return chunks
}

/** Greedily merge short fragments that fit within maxChars. */
function mergeFragments(frags: string[], maxChars: number): string[] {
  const merged: string[] = []
  let cur = ''
  for (const f of frags) {
    const candidate = cur ? `${cur} ${f}` : f
    if (candidate.length <= maxChars) {
      cur = candidate
    } else {
      if (cur) merged.push(cur)
      cur = f
    }
  }
  /* v8 ignore next -- mergeFragments is called only with >=1 fragment (every
     kept sentence emits >=1, proven above), so cur is non-empty here (2026-09-12) */
  if (cur) merged.push(cur)
  return merged
}

/** Build cues from timestamped word tokens, grouping words into cues. */
function buildFromTokens(
  tokens: Array<{ text: string; start: number; end: number }>,
  maxChars: number,
  fallbackDuration: number,
): CaptionCue[] {
  const cues: CaptionCue[] = []
  let curWords: typeof tokens = []
  let curLen = 0
  for (const tok of tokens) {
    const addedLen = (curLen > 0 ? 1 : 0) + tok.text.length
    if (curLen + addedLen > maxChars && curWords.length > 0) {
      // Flush the current group.
      cues.push(makeTokenCue(curWords, cues.length))
      curWords = []
      curLen = 0
    }
    curWords.push(tok)
    curLen += (curLen > 0 ? 1 : 0) + tok.text.length
  }
  /* v8 ignore next -- tokens is non-empty here (the caller guards length),
     and every loop iteration pushes exactly one token, so a group is always
     open after the loop (2026-09-12) */
  if (curWords.length > 0) {
    cues.push(makeTokenCue(curWords, cues.length))
  }
  // Clamp the last cue's end to the segment duration if tokens overshoot.
  /* v8 ignore next -- same proof: >=1 group was just flushed, so cues is
     non-empty here (2026-09-12) */
  if (cues.length > 0) {
    const last = cues[cues.length - 1]
    if (last.end > fallbackDuration) {
      last.end = fallbackDuration
    }
  }
  return cues
}

function makeTokenCue(
  words: Array<{ text: string; start: number; end: number }>,
  idx: number,
): CaptionCue {
  return {
    id: `cap_${idx}_${Math.random().toString(36).slice(2, 8)}`,
    start: Number(words[0].start.toFixed(3)),
    end: Number(words[words.length - 1].end.toFixed(3)),
    text: words.map((w) => w.text).join(' '),
  }
}
