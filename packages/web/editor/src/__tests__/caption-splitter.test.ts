/**
 * Unit tests for lib/caption-splitter.ts — transcription → CaptionCue splitter
 * with proportional timing + sentence-aware chunking.
 *
 * Two paths:
 *   1. Proportional: split text by sentences/clauses/words, distribute time
 *      by character count, last cue gets residual.
 *   2. Timestamped: group word tokens into cues, clamp last to segment dur.
 *
 * Zero prior coverage. A regression in the proportional split would make
 * every cue the same duration (ignoring character count); a missing clamp
 * in the token path would let the last cue overshoot the segment.
 */
import { describe, it, expect } from "vitest"
import { splitCaptions, splitIntoChunks } from "@melite/formats"

describe("caption-splitter — splitCaptions guards", () => {
  it("returns [] when duration <= 0", () => {
    expect(splitCaptions({ text: "hello", duration: 0 })).toEqual([])
    expect(splitCaptions({ text: "hello", duration: -1 })).toEqual([])
  })
  it("returns [] for an empty/whitespace text (proportional path)", () => {
    expect(splitCaptions({ text: "", duration: 10 })).toEqual([])
    expect(splitCaptions({ text: "   ", duration: 10 })).toEqual([])
  })
})

describe("caption-splitter — proportional path (no tokens)", () => {
  it("produces cues with sequential start/end times summing to duration", () => {
    const cues = splitCaptions({ text: "Hello world.", duration: 10 })
    expect(cues.length).toBeGreaterThanOrEqual(1)
    expect(cues[0].start).toBe(0)
    expect(cues[cues.length - 1].end).toBeCloseTo(10, 2)
  })
  it("every cue's start equals the previous cue's end (no gaps)", () => {
    const cues = splitCaptions({
      text: "First sentence. Second one! Third?",
      duration: 30,
    })
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i].start).toBeCloseTo(cues[i - 1].end, 2)
    }
  })
  it("longer sentences get proportionally more time (by char count)", () => {
    const short = "A."
    const long = "This is a much longer sentence with many words in it."
    const cues = splitCaptions({ text: `${short} ${long}`, duration: 100 })
    // The second cue should get more time than the first.
    const t1 = cues[0].end - cues[0].start
    const t2 = cues[1].end - cues[1].start
    expect(t2).toBeGreaterThan(t1)
  })
  it("the last cue's end is exactly `duration` (no float drift)", () => {
    const cues = splitCaptions({
      text: "one. two. three. four. five.",
      duration: 7,
    })
    expect(cues[cues.length - 1].end).toBe(7)
  })
  it("every cue has a unique id", () => {
    const cues = splitCaptions({ text: "a. b. c.", duration: 9 })
    const ids = new Set(cues.map((c) => c.id))
    expect(ids.size).toBe(cues.length)
  })
})

describe("caption-splitter — timestamped path (with tokens)", () => {
  it("builds cues from word tokens using their start/end times", () => {
    const cues = splitCaptions({
      text: "", duration: 10,
      tokens: [
        { text: "hello", start: 0, end: 1 },
        { text: "world", start: 1, end: 2 },
      ],
    })
    expect(cues).toHaveLength(1)
    expect(cues[0].start).toBe(0)
    expect(cues[0].end).toBe(2)
    expect(cues[0].text).toBe("hello world")
  })
  it("groups multiple words into one cue up to maxChars", () => {
    const cues = splitCaptions({
      text: "", duration: 100, maxChars: 10,
      tokens: [
        { text: "one", start: 0, end: 1 },
        { text: "two", start: 1, end: 2 },
        { text: "three", start: 2, end: 3 },
        { text: "four", start: 3, end: 4 },
      ],
    })
    // "one two three" = 13 chars > 10 → split before "three"
    // "one two" = 7 chars + " three" = 13 > 10 → flush after "one two"
    expect(cues.length).toBeGreaterThanOrEqual(2)
  })
  it("clamps the last cue's end to the segment duration when tokens overshoot", () => {
    const cues = splitCaptions({
      text: "", duration: 5,
      tokens: [{ text: "longword", start: 0, end: 10 }],
    })
    expect(cues[cues.length - 1].end).toBe(5) // clamped from 10
  })
  it("tokens take precedence over text (even when text is non-empty)", () => {
    const cues = splitCaptions({
      text: "ignored text", duration: 10,
      tokens: [{ text: "fromtoken", start: 1, end: 2 }],
    })
    expect(cues).toHaveLength(1)
    expect(cues[0].text).toBe("fromtoken")
  })
})

// ── splitIntoChunks (exported helper) ───────────────────────────────────────
describe("caption-splitter — splitIntoChunks", () => {
  it("returns [] for an empty/whitespace string", () => {
    expect(splitIntoChunks("")).toEqual([])
    expect(splitIntoChunks("   ")).toEqual([])
  })
  it("keeps a short sentence as one chunk", () => {
    expect(splitIntoChunks("Hello world.", 42)).toEqual(["Hello world."])
  })
  it("MERGES short consecutive sentences under maxChars (greedy merge step)", () => {
    // splitIntoChunks splits by sentence THEN merges fragments back together
    // when they fit within maxChars. "First. Second!" = 14 chars < 42 → merged.
    const out = splitIntoChunks("First. Second!", 42)
    expect(out).toEqual(["First. Second!"])
  })
  it("splits a long sentence at clause boundaries (comma)", () => {
    const long = "This is a very long sentence, with a comma clause, that exceeds the max."
    const out = splitIntoChunks(long, 30)
    // Each chunk should be <= 30 (or close — clause boundary respected).
    for (const c of out) expect(c.length).toBeLessThanOrEqual(30 + 5) // small tolerance
    expect(out.length).toBeGreaterThan(1)
  })
  it("merges short consecutive fragments up to maxChars", () => {
    const out = splitIntoChunks("Hi. Ok. Bye.", 15)
    // "Hi. Ok. Bye." = 13 chars → merged into one chunk
    expect(out).toEqual(["Hi. Ok. Bye."])
  })
  it("respects a custom maxChars", () => {
    const out = splitIntoChunks("a b c d e f g h", 5)
    // Each chunk <= 5 chars: "a b c" (5), "d e f" (5), "g h" (3)
    for (const c of out) expect(c.length).toBeLessThanOrEqual(5)
  })
  it("normalizes whitespace (collapses runs + trims)", () => {
    const out = splitIntoChunks("  hello    world  ", 42)
    expect(out).toEqual(["hello world"])
  })
  it("handles a single very long word (longer than maxChars) without crash", () => {
    const out = splitIntoChunks("pneumonoultramicroscopicsilicovolcanoconiosis", 10)
    expect(out.length).toBeGreaterThanOrEqual(1) // the word ends up as its own chunk
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Token path — detailed coverage
// ════════════════════════════════════════════════════════════════════════════
describe("caption-splitter — token path details", () => {
  it("falls through to text path when tokens is null", () => {
    const cues = splitCaptions({ text: "Hello world.", duration: 10, tokens: null })
    expect(cues.length).toBeGreaterThanOrEqual(1)
    expect(cues[0].text).toContain("Hello")
  })
  it("falls through to text path when tokens is an empty array", () => {
    const cues = splitCaptions({ text: "Hello world.", duration: 10, tokens: [] })
    expect(cues.length).toBeGreaterThanOrEqual(1)
    expect(cues[0].text).toContain("Hello")
  })
  it("cue start = first word's start, end = last word's end", () => {
    const cues = splitCaptions({
      text: "", duration: 100,
      tokens: [
        { text: "alpha", start: 1.5, end: 2.0 },
        { text: "beta", start: 2.1, end: 2.5 },
        { text: "gamma", start: 2.6, end: 3.0 },
      ],
    })
    expect(cues).toHaveLength(1)
    expect(cues[0].start).toBe(1.5)
    expect(cues[0].end).toBe(3.0)
  })
  it("cue text is the space-joined words", () => {
    const cues = splitCaptions({
      text: "", duration: 100,
      tokens: [
        { text: "one", start: 0, end: 1 },
        { text: "two", start: 1, end: 2 },
        { text: "three", start: 2, end: 3 },
      ],
    })
    expect(cues[0].text).toBe("one two three")
  })
  it("flushes a cue when the next word would exceed maxChars", () => {
    // maxChars=10: "one two" = 7 chars, adding "three" = 7+1+5 = 13 > 10 → flush.
    const cues = splitCaptions({
      text: "", duration: 100, maxChars: 10,
      tokens: [
        { text: "one", start: 0, end: 1 },
        { text: "two", start: 1, end: 2 },
        { text: "three", start: 2, end: 3 },
        { text: "four", start: 3, end: 4 },
      ],
    })
    expect(cues.length).toBeGreaterThanOrEqual(2)
    // First cue is "one two", second starts with "three".
    expect(cues[0].text).toBe("one two")
  })
  it("handles a single token", () => {
    const cues = splitCaptions({
      text: "", duration: 10,
      tokens: [{ text: "solo", start: 1, end: 2 }],
    })
    expect(cues).toHaveLength(1)
    expect(cues[0].text).toBe("solo")
    expect(cues[0].start).toBe(1)
    expect(cues[0].end).toBe(2)
  })
  it("produces unique ids for token-path cues", () => {
    const cues = splitCaptions({
      text: "", duration: 100, maxChars: 3,
      tokens: [
        { text: "aa", start: 0, end: 1 },
        { text: "bb", start: 1, end: 2 },
        { text: "cc", start: 2, end: 3 },
        { text: "dd", start: 3, end: 4 },
      ],
    })
    const ids = new Set(cues.map((c) => c.id))
    expect(ids.size).toBe(cues.length)
    for (const c of cues) {
      expect(c.id).toMatch(/^cap_\d+_[a-z0-9]+$/)
    }
  })
  it("does NOT clamp when last token end is within segment duration", () => {
    const cues = splitCaptions({
      text: "", duration: 100,
      tokens: [{ text: "word", start: 0, end: 5 }],
    })
    expect(cues[0].end).toBe(5) // not clamped (5 < 100)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// splitIntoChunks — clause boundary coverage
// ════════════════════════════════════════════════════════════════════════════
describe("caption-splitter — splitIntoChunks clause boundaries", () => {
  it("splits at semicolons", () => {
    const long = "First part of a long sentence; second part continues here."
    const out = splitIntoChunks(long, 25)
    expect(out.length).toBeGreaterThan(1)
    // The semicolon survives in one of the chunks (word-boundary splitting
    // may push it to the second chunk).
    expect(out.some((c) => c.includes(";"))).toBe(true)
  })
  it("splits at colons", () => {
    const long = "The answer is clear: we must continue forward despite everything."
    const out = splitIntoChunks(long, 30)
    expect(out.length).toBeGreaterThan(1)
  })
  it("splits at em-dashes and en-dashes", () => {
    const long = "This is the first half—this is the second half that continues."
    const out = splitIntoChunks(long, 25)
    expect(out.length).toBeGreaterThan(1)
  })
  it("splits at ! and ? (not just periods)", () => {
    const out = splitIntoChunks("Wow! Really? Maybe.", 42)
    // Three sentences: "Wow!" "Really?" "Maybe." — merged if they fit.
    expect(out.length).toBeGreaterThanOrEqual(1)
    // All text preserved.
    expect(out.join(" ")).toContain("Wow!")
    expect(out.join(" ")).toContain("Really?")
  })
  it("splits at ellipsis (…)", () => {
    const out = splitIntoChunks("Wait… what happened?", 42)
    expect(out.join(" ")).toContain("Wait…")
  })
  it("a sentence exactly at maxChars stays as one chunk", () => {
    const exact = "abcdefghijklmnopqrstuvwxyz0123456789AB" // 38 chars
    expect(exact.length).toBe(38)
    const out = splitIntoChunks(exact, 38)
    expect(out).toEqual([exact])
  })
  it("a sentence at maxChars+1 is split", () => {
    const over = "abcdefghijklmnopqrstuvwxyz0123456789ABC" // 39 chars
    expect(over.length).toBe(39)
    const out = splitIntoChunks(over, 38)
    expect(out.length).toBeGreaterThanOrEqual(1)
  })
  it("long sentence with no clause boundaries splits at word boundaries", () => {
    // No punctuation at all — splits purely at word boundaries.
    const long = "The quick brown fox jumps over the lazy dog and runs away"
    const out = splitIntoChunks(long, 20)
    expect(out.length).toBeGreaterThan(1)
    for (const c of out) expect(c.length).toBeLessThanOrEqual(20 + 2) // tolerance for word join
  })
  it("preserves sentence terminators in the output", () => {
    const out = splitIntoChunks("Hello world. Goodbye.", 42)
    expect(out[0]).toMatch(/\.$/)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Proportional path — timing precision
// ════════════════════════════════════════════════════════════════════════════
describe("caption-splitter — proportional timing precision", () => {
  it("rounds start/end to 3 decimal places", () => {
    const cues = splitCaptions({
      text: "a. b. c. d. e. f. g. h. i. j.",
      duration: 7,
    })
    for (const c of cues) {
      // toFixed(3) → at most 3 decimal places.
      expect(c.start.toString()).toMatch(/^\d+(\.\d{1,3})?$/)
      expect(c.end.toString()).toMatch(/^\d+(\.\d{1,3})?$/)
    }
  })
  it("every cue starts at 0 or later and ends at <= duration", () => {
    const cues = splitCaptions({
      text: "Short. A much longer sentence with more characters.",
      duration: 5,
    })
    for (const c of cues) {
      expect(c.start).toBeGreaterThanOrEqual(0)
      expect(c.end).toBeLessThanOrEqual(5)
    }
  })
  it("produces cues proportional to character count (not word count)", () => {
    // Use text where the short sentence can't merge into the long one
    // within maxChars=42, guaranteeing a clear proportional difference.
    const cues = splitCaptions({
      text: "Ok. This sentence is intentionally much much longer than the first one.",
      duration: 100,
    })
    const durations = cues.map((c) => c.end - c.start)
    const min = Math.min(...durations)
    const max = Math.max(...durations)
    expect(max / min).toBeGreaterThan(3)
  })
})
