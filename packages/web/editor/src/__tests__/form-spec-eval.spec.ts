/**
 * Unit tests for lib/formSpec.ts's evalVisibleWhen — the pure boolean
 * expression evaluator that drives conditional field visibility.
 *
 * evalVisibleWhen is the only fully-pure exported helper in formSpec.ts
 * (loadFormSpec/useFormSpec are fetch-driven and covered by form-spec-cold-
 * start.test.tsx). The evaluator supports:
 *   - comparisons: >=, <=, ==, !=, >, <
 *   - null equivalence (field == null treats undefined as null)
 *   - bare field name → truthy check
 *   - string / number / boolean / null literals
 *   - && (AND) and || (OR) with correct precedence (OR lowest)
 *   - parenthesized grouping
 *
 * Zero prior coverage. A regression here would either show fields that
 * should be hidden (wrong == null semantics) or hide fields that should
 * show (broken parenthesized OR inside AND).
 */
import { describe, it, expect } from "vitest"
import { evalVisibleWhen } from "@melite/contracts"

// ── Guards: null/empty expressions ──────────────────────────────────────────
describe("evalVisibleWhen — guards (empty expressions)", () => {
  it("null expression → visible (default true)", () => {
    expect(evalVisibleWhen(null, {})).toBe(true)
  })
  it("undefined expression → visible", () => {
    expect(evalVisibleWhen(undefined, {})).toBe(true)
  })
  it("empty string → visible", () => {
    expect(evalVisibleWhen("", {})).toBe(true)
  })
  it("whitespace-only string → visible", () => {
    expect(evalVisibleWhen("   ", {})).toBe(true)
  })
})

// ── Bare field truthiness ───────────────────────────────────────────────────
describe("evalVisibleWhen — bare field name (truthy check)", () => {
  it("a present truthy value → visible", () => {
    expect(evalVisibleWhen("audio_mode", { audio_mode: "lipSync" })).toBe(true)
  })
  it("a present falsy value (empty string) → hidden", () => {
    expect(evalVisibleWhen("audio_mode", { audio_mode: "" })).toBe(false)
  })
  it("an absent field → hidden (undefined is falsy)", () => {
    expect(evalVisibleWhen("audio_mode", {})).toBe(false)
  })
  it("a zero value → hidden (0 is falsy)", () => {
    expect(evalVisibleWhen("count", { count: 0 })).toBe(false)
  })
})

// ── Equality == ─────────────────────────────────────────────────────────────
describe("evalVisibleWhen — == equality", () => {
  it("string equality (quoted literal)", () => {
    expect(evalVisibleWhen("mode == 'lipSync'", { mode: "lipSync" })).toBe(true)
    expect(evalVisibleWhen("mode == 'lipSync'", { mode: "off" })).toBe(false)
  })
  it("string equality (double-quoted literal)", () => {
    expect(evalVisibleWhen('mode == "lipSync"', { mode: "lipSync" })).toBe(true)
  })
  it("number equality", () => {
    expect(evalVisibleWhen("count == 3", { count: 3 })).toBe(true)
    expect(evalVisibleWhen("count == 3", { count: 4 })).toBe(false)
  })
  it("boolean equality", () => {
    expect(evalVisibleWhen("flag == true", { flag: true })).toBe(true)
    expect(evalVisibleWhen("flag == false", { flag: true })).toBe(false)
  })
  it("null equality treats undefined the same as null", () => {
    // The null ≡ undefined rule: family-filtered fields are semantically absent.
    expect(evalVisibleWhen("audio_mode == null", { audio_mode: null })).toBe(true)
    expect(evalVisibleWhen("audio_mode == null", {})).toBe(true)
    expect(evalVisibleWhen("audio_mode == null", { audio_mode: "music" })).toBe(false)
  })
})

// ── Inequality != ───────────────────────────────────────────────────────────
describe("evalVisibleWhen — != inequality", () => {
  it("string inequality", () => {
    expect(evalVisibleWhen("mode != 'off'", { mode: "lipSync" })).toBe(true)
    expect(evalVisibleWhen("mode != 'off'", { mode: "off" })).toBe(false)
  })
  it("null inequality treats undefined the same as null", () => {
    expect(evalVisibleWhen("audio_mode != null", { audio_mode: "music" })).toBe(true)
    expect(evalVisibleWhen("audio_mode != null", {})).toBe(false)
    expect(evalVisibleWhen("audio_mode != null", { audio_mode: null })).toBe(false)
  })
})

// ── Numeric comparisons ─────────────────────────────────────────────────────
describe("evalVisibleWhen — numeric comparisons (>=, <=, >, <)", () => {
  it(">= threshold", () => {
    expect(evalVisibleWhen("steps >= 20", { steps: 20 })).toBe(true)
    expect(evalVisibleWhen("steps >= 20", { steps: 19 })).toBe(false)
    expect(evalVisibleWhen("steps >= 20", { steps: 50 })).toBe(true)
  })
  it("<= threshold", () => {
    expect(evalVisibleWhen("cfg <= 7", { cfg: 7 })).toBe(true)
    expect(evalVisibleWhen("cfg <= 7", { cfg: 8 })).toBe(false)
  })
  it("> strict", () => {
    expect(evalVisibleWhen("count > 0", { count: 1 })).toBe(true)
    expect(evalVisibleWhen("count > 0", { count: 0 })).toBe(false)
  })
  it("< strict", () => {
    expect(evalVisibleWhen("count < 10", { count: 9 })).toBe(true)
    expect(evalVisibleWhen("count < 10", { count: 10 })).toBe(false)
  })
  it("whitespace around the operator is trimmed", () => {
    expect(evalVisibleWhen("steps   >=   20", { steps: 20 })).toBe(true)
  })
})

// ── AND / OR precedence ────────────────────────────────────────────────────
describe("evalVisibleWhen — AND / OR precedence", () => {
  it("AND of two true atoms → true", () => {
    expect(evalVisibleWhen("a && b", { a: "x", b: "y" })).toBe(true)
  })
  it("AND with one false atom → false (short-circuit)", () => {
    expect(evalVisibleWhen("a && b", { a: "x", b: "" })).toBe(false)
  })
  it("OR with one true atom → true (short-circuit)", () => {
    expect(evalVisibleWhen("a || b", { a: "", b: "y" })).toBe(true)
  })
  it("OR of two false atoms → false", () => {
    expect(evalVisibleWhen("a || b", { a: "", b: "" })).toBe(false)
  })
  it("OR has LOWER precedence than AND (a && b || c ≡ (a && b) || c)", () => {
    // a=false, b=true, c=false → (false && true) || false = false
    expect(evalVisibleWhen("a && b || c", { a: "", b: "y", c: "" })).toBe(false)
    // a=true, b=true, c=false → (true && true) || false = true
    expect(evalVisibleWhen("a && b || c", { a: "x", b: "y", c: "" })).toBe(true)
    // a=false, b=false, c=true → (false && false) || true = true
    expect(evalVisibleWhen("a && b || c", { a: "", b: "", c: "z" })).toBe(true)
  })
})

// ── Parenthesized grouping ─────────────────────────────────────────────────
describe("evalVisibleWhen — parenthesized grouping", () => {
  it("parens override default precedence: a && (b || c)", () => {
    // Without parens: a && b || c → (a && b) || c
    // With parens:    a && (b || c)
    // a=true, b=false, c=false:
    //   no parens: (true && false) || false = false
    //   parens:    true && (false || false) = false  (same here)
    // a=true, b=true, c=false:
    //   no parens: (true && true) || false = true
    //   parens:    true && (true || false) = true   (same here)
    // a=true, b=false, c=true:
    //   no parens: (true && false) || true = true
    //   parens:    true && (false || true) = true   (same here)
    // a=false, b=anything, c=true:
    //   no parens: (false && b) || true = TRUE
    //   parens:    false && (b || true) = FALSE  ← DIFFERS
    expect(evalVisibleWhen("a && (b || c)", { a: "", b: "", c: "z" })).toBe(false)
    expect(evalVisibleWhen("a && b || c", { a: "", b: "", c: "z" })).toBe(true)
  })
  it("parens around an OR inside an AND: family-filtered field pattern", () => {
    // The classic case from the source comment:
    //   audio_mode == 'lipSync' || audio_mode == null
    // where audio_mode is undefined (family-filtered out) → true.
    expect(evalVisibleWhen("audio_mode == 'lipSync' || audio_mode == null", {})).toBe(true)
    expect(evalVisibleWhen("audio_mode == 'lipSync' || audio_mode == null", { audio_mode: "lipSync" })).toBe(true)
    expect(evalVisibleWhen("audio_mode == 'lipSync' || audio_mode == null", { audio_mode: "music" })).toBe(false)
  })
  it("strips outer wrapping parens: '(expr)' === 'expr'", () => {
    expect(evalVisibleWhen("(a == 'x')", { a: "x" })).toBe(true)
    expect(evalVisibleWhen("(a == 'x')", { a: "y" })).toBe(false)
  })
  it("does NOT strip parens that don't wrap the whole expression", () => {
    // (a == 'x') && b — the outer chars are '(' and... no, last char is 'b'.
    // The wrap check only fires when first='(' AND last=')'. Here it's fine.
    // The test: a parens-wrapped OR as the second AND operand.
    expect(evalVisibleWhen("a && (b || c)", { a: "x", b: "", c: "" })).toBe(false)
  })
})

// ── Unknown / malformed expressions ────────────────────────────────────────
describe("evalVisibleWhen — unknown / malformed expressions", () => {
  it("an unrecognized atom expression → default visible (true)", () => {
    // evalAtom's final `return true` — anything not matching an operator
    // pattern and not a bare \w+ identifier falls through to visible.
    expect(evalVisibleWhen("some random text", {})).toBe(true)
  })
  it("a field referenced in a comparison but absent → Number(undefined) = NaN → all comparisons false", () => {
    expect(evalVisibleWhen("steps >= 20", {})).toBe(false)
    expect(evalVisibleWhen("steps > 0", {})).toBe(false)
    expect(evalVisibleWhen("steps < 10", {})).toBe(false)
  })
})
