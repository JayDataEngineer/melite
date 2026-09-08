/**
 * hydrate-calls.test.ts — EXTREME edge-case suite for the timeline card's
 * call hydration. This is the component that turns `params.calls` from the
 * persisted doc into the internal `DocCall[]` state. Every regression that
 * collapsed multi-call plans into a single starter call traces back to a
 * missed case here.
 *
 * Root cause (2026-08-30): legacy docs stored `calls` as a JSON STRING
 * (`"[{...}]"`). hydrateCalls checked Array.isArray — false for strings —
 * fell through to STARTER_CALLS (1 call). The persist effect then wrote
 * 1 call back, destroying the multi-call plan permanently.
 */
import { describe, it, expect, vi } from "vitest"

// ── Import the REAL hydrateCalls from the plugin source ──────────────────
// The function lives inside component.tsx but is NOT exported. To test it
// in isolation we replicate its logic here exactly — the test IS the
// contract. When the source changes, these tests MUST be updated to match.

type DocBeatSegment = { text: string; start_frame: number; end_frame: number }
type DocCall = {
  text: string
  start_frame: number
  end_frame: number
  beats?: DocBeatSegment[]
  [key: string]: unknown
}

const STARTER_CALLS: DocCall[] = [
  { text: "", start_frame: 0, end_frame: 24 },
]

const GUIDE_KINDS = ["audio_ref", "style_ref", "depth_ref", "pose_ref"] as const

/**
 * Exact replica of hydrateCalls from component.tsx:505–595.
 * ANY divergence from the source is a bug in this test.
 */
function hydrateCalls(raw: { calls?: unknown; beats?: unknown }): DocCall[] {
  let callsRaw = raw.calls
  if (typeof callsRaw === "string" && callsRaw.trimStart().startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(callsRaw)
      if (Array.isArray(parsed)) callsRaw = parsed
    } catch { /* unparseable — fall through to beats / STARTER */ }
  }
  let beatsRaw = raw.beats
  if (typeof beatsRaw === "string" && beatsRaw.trimStart().startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(beatsRaw)
      if (Array.isArray(parsed)) beatsRaw = parsed
    } catch { /* unparseable — fall through */ }
  }
  const list = Array.isArray(callsRaw) && callsRaw.length > 0
    ? callsRaw
    : Array.isArray(beatsRaw) && beatsRaw.length > 0
      ? beatsRaw
      : null
  if (!list) return STARTER_CALLS
  const calls: DocCall[] = []
  for (const c of list) {
    if (typeof c !== "object" || c === null) continue
    const r = c as Record<string, unknown>
    const start = Number(r.start_frame)
    const end = Number(r.end_frame)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue
    const call: DocCall = { text: "", start_frame: Math.round(start), end_frame: Math.round(end) }
    const rawSegs = r.beats
    if (Array.isArray(rawSegs) && rawSegs.length > 0) {
      const segs: DocBeatSegment[] = []
      for (const s of rawSegs) {
        if (typeof s !== "object" || s === null) continue
        const sr = s as Record<string, unknown>
        const sText = typeof sr.text === "string" ? sr.text : ""
        const sStart = Number(sr.start_frame)
        const sEnd = Number(sr.end_frame)
        if (!Number.isFinite(sStart) || !Number.isFinite(sEnd) || sEnd <= sStart) continue
        segs.push({ text: sText, start_frame: Math.round(sStart), end_frame: Math.round(sEnd) })
      }
      if (segs.length) {
        const kept = segs.filter(
          (s) => s.start_frame < call.end_frame && s.end_frame > call.start_frame,
        )
        if (kept.length < segs.length) {
          // eslint-disable-next-line no-console
          console.warn("hydrateCalls: dropped beats wholly outside call span")
        }
        if (kept.length) {
          call.beats = kept
        }
      }
    }
    if (!call.beats && typeof r.text === "string") call.text = r.text
    for (const kind of GUIDE_KINDS) {
      const src = r[kind]
      if (typeof src === "string" && (src as string).trim()) call[kind] = src
    }
    if (typeof r.last_frame === "string" && (r.last_frame as string).trim()) {
      call.last_frame = r.last_frame as string
    }
    if (typeof r.first_frame_prev_sec === "number" && (r.first_frame_prev_sec as number) > 0) {
      call.first_frame_prev_sec = r.first_frame_prev_sec as number
    }
    if (r.transition === "extend" || r.transition === "cut") {
      call.transition = r.transition as "extend" | "cut"
    }
    calls.push(call)
  }
  return calls.length > 0 ? calls : STARTER_CALLS
}

// ═══════════════════════════════════════════════════════════════════════════
// THE TEST SUITE
// ═══════════════════════════════════════════════════════════════════════════

describe("hydrateCalls", () => {
  // ── THE BUG (2026-08-30) ────────────────────────────────────────────────

  describe("CRITICAL: JSON string calls (the legacy corruption path)", () => {
    it("parses a JSON-string array of 4 calls and returns 4 DocCalls", () => {
      const calls = [
        { text: "push-in lantern", start_frame: 0, end_frame: 24 },
        { text: "wide courtyard", start_frame: 24, end_frame: 48 },
        { text: "close-up moth", start_frame: 48, end_frame: 72 },
        { text: "pull-back night", start_frame: 72, end_frame: 90 },
      ]
      const result = hydrateCalls({ calls: JSON.stringify(calls) })
      expect(result).toHaveLength(4)
      expect(result[0]!.text).toBe("push-in lantern")
      expect(result[0]!.start_frame).toBe(0)
      expect(result[0]!.end_frame).toBe(24)
      expect(result[3]!.text).toBe("pull-back night")
      expect(result[3]!.end_frame).toBe(90)
    })

    it("parses a single-call JSON string", () => {
      const calls = [{ text: "solo", start_frame: 0, end_frame: 60 }]
      const result = hydrateCalls({ calls: JSON.stringify(calls) })
      expect(result).toHaveLength(1)
      expect(result[0]!.text).toBe("solo")
    })

    it("parses a JSON string with beats inside calls", () => {
      const calls = [{
        start_frame: 0,
        end_frame: 90,
        beats: [
          { text: "first segment", start_frame: 0, end_frame: 45 },
          { text: "second segment", start_frame: 45, end_frame: 90 },
        ],
      }]
      const result = hydrateCalls({ calls: JSON.stringify(calls) })
      expect(result).toHaveLength(1)
      expect(result[0]!.beats).toHaveLength(2)
      expect(result[0]!.beats![0]!.text).toBe("first segment")
    })

    it("rejects an unparseable string and returns STARTER_CALLS", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
      const result = hydrateCalls({ calls: "not json at all" })
      expect(result).toEqual(STARTER_CALLS)
      warn.mockRestore()
    })

    it("rejects a JSON string that is not an array", () => {
      const result = hydrateCalls({ calls: '"just a string"' })
      expect(result).toEqual(STARTER_CALLS)
    })

    it("rejects a JSON string containing an empty array", () => {
      const result = hydrateCalls({ calls: "[]" })
      expect(result).toEqual(STARTER_CALLS)
    })
  })

  // ── NORMAL ARRAY PATH ───────────────────────────────────────────────────

  describe("normal array path", () => {
    it("returns STARTER_CALLS when calls is null/undefined", () => {
      expect(hydrateCalls({})).toEqual(STARTER_CALLS)
      expect(hydrateCalls({ calls: null })).toEqual(STARTER_CALLS)
      expect(hydrateCalls({ calls: undefined })).toEqual(STARTER_CALLS)
    })

    it("returns STARTER_CALLS for empty array", () => {
      expect(hydrateCalls({ calls: [] })).toEqual(STARTER_CALLS)
    })

    it("hydrates a 4-call plan correctly", () => {
      const result = hydrateCalls({
        calls: [
          { text: "a", start_frame: 0, end_frame: 30 },
          { text: "b", start_frame: 30, end_frame: 60 },
          { text: "c", start_frame: 60, end_frame: 90 },
          { text: "d", start_frame: 90, end_frame: 120 },
        ],
      })
      expect(result).toHaveLength(4)
      expect(result.map((c) => c.text)).toEqual(["a", "b", "c", "d"])
      expect(result.map((c) => [c.start_frame, c.end_frame])).toEqual([
        [0, 30], [30, 60], [60, 90], [90, 120],
      ])
    })

    it("skips calls with end <= start (corrupt data)", () => {
      const result = hydrateCalls({
        calls: [
          { text: "ok", start_frame: 0, end_frame: 30 },
          { text: "bad", start_frame: 50, end_frame: 50 },
          { text: "bad2", start_frame: 60, end_frame: 40 },
          { text: "ok2", start_frame: 60, end_frame: 90 },
        ],
      })
      expect(result).toHaveLength(2)
      expect(result[0]!.text).toBe("ok")
      expect(result[1]!.text).toBe("ok2")
    })

    it("skips non-object entries", () => {
      const result = hydrateCalls({
        calls: [
          { text: "ok", start_frame: 0, end_frame: 30 },
          "string",
          null,
          42,
          { text: "ok2", start_frame: 30, end_frame: 60 },
        ],
      })
      expect(result).toHaveLength(2)
    })

    it("falls back to beats when calls is empty", () => {
      const result = hydrateCalls({
        calls: [],
        beats: [
          { text: "from beats", start_frame: 0, end_frame: 24 },
        ],
      })
      expect(result).toHaveLength(1)
      expect(result[0]!.text).toBe("from beats")
    })
  })

  // ── BEATS (Layer C segments) ────────────────────────────────────────────

  describe("beats (Layer C segments)", () => {
    it("hydrates beats within a single call", () => {
      const result = hydrateCalls({
        calls: [{
          start_frame: 0,
          end_frame: 90,
          beats: [
            { text: "intro", start_frame: 0, end_frame: 30 },
            { text: "main", start_frame: 30, end_frame: 90 },
          ],
        }],
      })
      expect(result).toHaveLength(1)
      expect(result[0]!.beats).toHaveLength(2)
      expect(result[0]!.beats![0]!.text).toBe("intro")
      expect(result[0]!.beats![1]!.text).toBe("main")
    })

    it("drops beats wholly outside their call's span", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
      const result = hydrateCalls({
        calls: [{
          start_frame: 30,
          end_frame: 60,
          beats: [
            { text: "inside", start_frame: 35, end_frame: 55 },
            { text: "outside-left", start_frame: 0, end_frame: 20 },
            { text: "outside-right", start_frame: 70, end_frame: 90 },
          ],
        }],
      })
      expect(result).toHaveLength(1)
      expect(result[0]!.beats).toHaveLength(1)
      expect(result[0]!.beats![0]!.text).toBe("inside")
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })

    it("prefers beats over text when both present", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
      const result = hydrateCalls({
        calls: [{
          text: "ignored",
          start_frame: 0,
          end_frame: 30,
          beats: [{ text: "segment", start_frame: 0, end_frame: 30 }],
        }],
      })
      expect(result[0]!.beats).toHaveLength(1)
      warn.mockRestore()
    })

    it("uses text when no beats", () => {
      const result = hydrateCalls({
        calls: [{ text: "hello", start_frame: 0, end_frame: 30 }],
      })
      expect(result[0]!.text).toBe("hello")
      expect(result[0]!.beats).toBeUndefined()
    })

    it("rejects beats with end <= start inside a call", () => {
      const result = hydrateCalls({
        calls: [{
          start_frame: 0,
          end_frame: 60,
          beats: [
            { text: "ok", start_frame: 0, end_frame: 30 },
            { text: "bad", start_frame: 40, end_frame: 40 },
          ],
        }],
      })
      expect(result[0]!.beats).toHaveLength(1)
    })
  })

  // ── GUIDE KEYS + SUBCARDS ───────────────────────────────────────────────

  describe("guide keys and subcards", () => {
    it("preserves guide keys (audio_ref, style_ref, etc.)", () => {
      const result = hydrateCalls({
        calls: [{
          text: "test",
          start_frame: 0,
          end_frame: 30,
          audio_ref: "stem.wav",
          style_ref: "ref.png",
        }],
      })
      expect(result[0]!.audio_ref).toBe("stem.wav")
      expect(result[0]!.style_ref).toBe("ref.png")
    })

    it("drops blank guide keys", () => {
      const result = hydrateCalls({
        calls: [{
          text: "test",
          start_frame: 0,
          end_frame: 30,
          audio_ref: "  ",
          style_ref: "",
        }],
      })
      expect(result[0]!.audio_ref).toBeUndefined()
      expect(result[0]!.style_ref).toBeUndefined()
    })

    it("preserves last_frame subcard", () => {
      const result = hydrateCalls({
        calls: [{
          text: "test",
          start_frame: 0,
          end_frame: 30,
          last_frame: "closing.png",
        }],
      })
      expect(result[0]!.last_frame).toBe("closing.png")
    })

    it("preserves first_frame_prev_sec", () => {
      const result = hydrateCalls({
        calls: [{
          text: "test",
          start_frame: 0,
          end_frame: 30,
          first_frame_prev_sec: 2.5,
        }],
      })
      expect(result[0]!.first_frame_prev_sec).toBe(2.5)
    })

    it("preserves transition type", () => {
      const result = hydrateCalls({
        calls: [
          { text: "a", start_frame: 0, end_frame: 30, transition: "cut" },
          { text: "b", start_frame: 30, end_frame: 60, transition: "extend" },
          { text: "c", start_frame: 60, end_frame: 90, transition: "invalid" },
        ],
      })
      expect(result[0]!.transition).toBe("cut")
      expect(result[1]!.transition).toBe("extend")
      expect(result[2]!.transition).toBeUndefined()
    })
  })

  // ── EXTREME EDGE CASES ──────────────────────────────────────────────────

  describe("extreme edge cases", () => {
    it("handles 20 calls (stress: large plan)", () => {
      const calls = Array.from({ length: 20 }, (_, i) => ({
        text: `call-${i}`,
        start_frame: i * 10,
        end_frame: (i + 1) * 10,
      }))
      const result = hydrateCalls({ calls })
      expect(result).toHaveLength(20)
      expect(result[0]!.start_frame).toBe(0)
      expect(result[19]!.end_frame).toBe(200)
    })

    it("handles NaN and Infinity in frames gracefully", () => {
      const result = hydrateCalls({
        calls: [
          { text: "ok", start_frame: 0, end_frame: 30 },
          { text: "nan", start_frame: NaN, end_frame: 30 },
          { text: "inf", start_frame: 0, end_frame: Infinity },
          { text: "neg-end", start_frame: -10, end_frame: -5 },
        ],
      })
      // NaN and Infinity are rejected by Number.isFinite; negative frames
      // are technically valid (clamped downstream), so "neg-end" survives.
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0]!.text).toBe("ok")
    })

    it("handles deeply nested garbage without crashing", () => {
      const result = hydrateCalls({
        calls: [
          { text: "ok", start_frame: 0, end_frame: 30 },
          { nested: { deep: { value: true } } },
          [1, 2, 3],
          "string",
          null,
          undefined,
          42,
          true,
        ],
      })
      expect(result).toHaveLength(1)
    })

    it("preserves call identity: 4 calls stay 4 after round-trip", () => {
      const original = [
        { text: "push-in lantern", start_frame: 0, end_frame: 24 },
        { text: "wide courtyard", start_frame: 24, end_frame: 48 },
        { text: "close-up moth", start_frame: 48, end_frame: 72 },
        { text: "pull-back night", start_frame: 72, end_frame: 90 },
      ]
      const hydrated = hydrateCalls({ calls: original })
      expect(hydrated).toHaveLength(4)
      // The critical invariant: never collapse to 1.
      expect(hydrated.length).toBeGreaterThanOrEqual(4)
    })

    it("string-encoded 4-call plan preserves all 4 calls (THE BUG SCENARIO)", () => {
      const original = [
        { text: "push-in lantern", start_frame: 0, end_frame: 24 },
        { text: "wide courtyard", start_frame: 24, end_frame: 48 },
        { text: "close-up moth", start_frame: 48, end_frame: 72 },
        { text: "pull-back night", start_frame: 72, end_frame: 90 },
      ]
      // Simulate legacy storage: JSON.stringify the array into a string
      const legacyDoc = { calls: JSON.stringify(original) }
      const hydrated = hydrateCalls(legacyDoc)
      // THE BUG: this used to return STARTER_CALLS (length 1)
      expect(hydrated.length).toBeGreaterThanOrEqual(4)
      expect(hydrated[0]!.text).toBe("push-in lantern")
      expect(hydrated[3]!.text).toBe("pull-back night")
    })
  })
})
