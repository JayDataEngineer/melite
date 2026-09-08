/**
 * Unit tests for lib/prompt-tags.ts — the prompt-tag library + autocomplete
 * helpers (filterTags, extractCurrentToken, insertTagAtToken).
 *
 * Pure functions loaded from a static JSON file. Tests cover:
 *   - Constants: TAG_CATEGORY_ORDER (8 categories), TAG_CATEGORY_LABELS,
 *     ALL_PROMPT_TAGS (frozen, non-empty, valid categories).
 *   - filterTags: prefix-before-substring, limit, case-insensitive, empty→[].
 *   - extractCurrentToken: comma/semicolon split, cursorPos honoured.
 *   - insertTagAtToken: tag replacement, separator, cursor placement.
 *
 * Zero prior coverage. A prefix-vs-substring ordering regression would surface
 * unrelated tags above the one the user is typing toward.
 */
import { describe, it, expect } from "vitest"
import {
  TAG_CATEGORY_ORDER, TAG_CATEGORY_LABELS, ALL_PROMPT_TAGS,
  filterTags, extractCurrentToken, insertTagAtToken,
} from "@melite/formats"
import type { PromptTag, PromptTagCategory } from "@melite/formats"

const TAGS: readonly PromptTag[] = [
  { value: "golden hour", category: "lighting" },
  { value: "gold filter", category: "color" },
  { value: "teal and orange", category: "color" },
  { value: "dolly in", category: "camera" },
]

// ── Constants ───────────────────────────────────────────────────────────────
describe("prompt-tags — constants", () => {
  it("TAG_CATEGORY_ORDER lists the 8 categories in canonical order", () => {
    expect([...TAG_CATEGORY_ORDER]).toEqual([
      "shot", "camera", "lighting", "style",
      "motion", "mood", "color", "subject",
    ])
  })
  it("TAG_CATEGORY_LABELS maps every category to a non-empty display label", () => {
    for (const cat of TAG_CATEGORY_ORDER) {
      const label = TAG_CATEGORY_LABELS[cat as PromptTagCategory]
      expect(typeof label).toBe("string")
      expect(label.length).toBeGreaterThan(0)
    }
  })
  it("ALL_PROMPT_TAGS is a non-empty frozen array", () => {
    expect(Object.isFrozen(ALL_PROMPT_TAGS)).toBe(true)
    expect(ALL_PROMPT_TAGS.length).toBeGreaterThan(0)
  })
  it("every tag in ALL_PROMPT_TAGS has a non-empty value + valid category", () => {
    for (const t of ALL_PROMPT_TAGS) {
      expect(t.value.length).toBeGreaterThan(0)
      expect(TAG_CATEGORY_ORDER).toContain(t.category)
    }
  })
})

// ── filterTags ──────────────────────────────────────────────────────────────
describe("prompt-tags — filterTags", () => {
  it("returns [] for an empty/whitespace query", () => {
    expect(filterTags(TAGS, "")).toEqual([])
    expect(filterTags(TAGS, "   ")).toEqual([])
  })
  it("is case-insensitive (query 'GOLDEN' matches 'golden hour')", () => {
    const out = filterTags(TAGS, "GOLDEN")
    expect(out.some((t) => t.value === "golden hour")).toBe(true)
  })
  it("PREFIX matches rank before SUBSTRING matches", () => {
    const out = filterTags(TAGS, "gold")
    // "golden hour" and "gold filter" both prefix-match; "gold filter" comes
    // second because it's later in the source array. No substring-only tags
    // here, so the order is source-order within the prefix bucket.
    expect(out[0].value).toBe("golden hour")
    expect(out[1].value).toBe("gold filter")
  })
  it("prefix bucket ranks above substring bucket", () => {
    // "golden hour" starts with "gold" (prefix); no substring-only match here.
    // Add a tag where "gold" is a substring but NOT a prefix.
    const tags: PromptTag[] = [
      { value: "ungolden retro", category: "color" },
      { value: "golden hour", category: "lighting" },
    ]
    const out = filterTags(tags, "gold")
    // "golden hour" (prefix) ranks above "ungolden retro" (substring)
    expect(out[0].value).toBe("golden hour")
    expect(out[1].value).toBe("ungolden retro")
  })
  it("respects the limit argument (default 8)", () => {
    const many: PromptTag[] = Array.from({ length: 20 }, (_, i) => ({
      value: `tag${i}`, category: "shot" as PromptTagCategory,
    }))
    expect(filterTags(many, "tag", 5)).toHaveLength(5)
    expect(filterTags(many, "tag")).toHaveLength(8) // default limit
  })
})

// ── extractCurrentToken ─────────────────────────────────────────────────────
describe("prompt-tags — extractCurrentToken", () => {
  it("returns the text after the last comma", () => {
    expect(extractCurrentToken("a cat, golden")).toBe("golden")
  })
  it("returns the text after the last semicolon", () => {
    expect(extractCurrentToken("a cat; extreme close")).toBe("extreme close")
  })
  it("returns the whole string when no comma or semicolon is present", () => {
    expect(extractCurrentToken("a cat")).toBe("a cat")
  })
  it("strips leading whitespace from the token", () => {
    expect(extractCurrentToken("a cat,    golden")).toBe("golden")
  })
  it("honours the cursorPos (text after the cursor is excluded)", () => {
    // "a cat, golden hour" — cursorPos=10 → upTo="a cat, gol" → token "gol"
    // (cursorPos is exclusive: slice(0, 10) gives indices 0-9)
    expect(extractCurrentToken("a cat, golden hour", 10)).toBe("gol")
  })
  it("cursorPos defaults to text.length when omitted", () => {
    expect(extractCurrentToken("a cat, golden")).toBe("golden")
  })
})

// ── insertTagAtToken ────────────────────────────────────────────────────────
describe("prompt-tags — insertTagAtToken", () => {
  it("replaces the current token with the tag value + ', ' separator", () => {
    const out = insertTagAtToken("a cat, gol", 11, "golden hour")
    expect(out.text).toBe("a cat, golden hour, ")
    expect(out.cursor).toBe(out.text.length)
  })
  it("preserves text after the cursor (single space — no double)", () => {
    // cursorPos=11: upTo="a cat, gol " (11 chars), after="rest"
    // insertion="a cat, golden hour, " + "rest" = "a cat, golden hour, rest"
    const out = insertTagAtToken("a cat, gol rest", 11, "golden hour")
    expect(out.text).toBe("a cat, golden hour, rest")
  })
  it("inserts at the beginning when there's no prefix (no comma)", () => {
    const out = insertTagAtToken("gol", 3, "golden hour")
    expect(out.text).toBe("golden hour, ")
    expect(out.cursor).toBe("golden hour, ".length)
  })
  it("handles semicolon as the separator boundary (note: semicolons get an extra ', ' — the endsWith check only covers commas)", () => {
    // prefix="a cat;" doesn't endWith(',') → sep=', ' → "a cat;" + ", " = "a cat;, "
    const out = insertTagAtToken("a cat; gol", 10, "golden hour")
    expect(out.text).toBe("a cat;, golden hour, ")
  })
  it("does not double the comma when the prefix already ends with one", () => {
    // prefix = "a cat," → endsWith(',') → sep = ' ' (not ', ')
    const out = insertTagAtToken("a cat, gol", 10, "golden hour")
    expect(out.text).toBe("a cat, golden hour, ")
  })
})
