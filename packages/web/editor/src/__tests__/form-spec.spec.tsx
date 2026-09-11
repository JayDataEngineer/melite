/**
 * Unit tests for lib/formSpec.ts — unified form descriptor + visible_when
 * expression evaluator.
 *
 * evalVisibleWhen is a mini expression language with its own grammar
 * (OR/AND precedence, comparison atoms, quoted strings, parens grouping,
 * null/undefined equivalence). A regression in any branch would silently
 * hide or show the wrong form fields.
 *
 * The former loadFormSpec fetcher + useFormSpec hook tests are GONE with
 * Door B (2026-08-11): those functions were deleted so every form-spec
 * passes through useSpecContractStore + validateSpecContract. Their
 * replacement coverage lives in spec-contract-store.spec.ts.
 */
import { describe, it, expect } from "vitest"
import { evalVisibleWhen } from "@melite/contracts"

// ════════════════════════════════════════════════════════════════════════════
// evalVisibleWhen — null / empty / whitespace
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen null/empty", () => {
  it("returns true for null expression", () => {
    expect(evalVisibleWhen(null, {})).toBe(true)
  })
  it("returns true for undefined expression", () => {
    expect(evalVisibleWhen(undefined, {})).toBe(true)
  })
  it("returns true for empty string expression", () => {
    expect(evalVisibleWhen("", {})).toBe(true)
  })
  it("returns true for whitespace-only expression", () => {
    expect(evalVisibleWhen("   ", {})).toBe(true)
  })
  it("returns true for tab-only expression", () => {
    expect(evalVisibleWhen("\t\t", {})).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Truthy atom (just a field name)
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen truthy atom", () => {
  it("returns true when the field is a truthy string", () => {
    expect(evalVisibleWhen("audio_mode", { audio_mode: "native" })).toBe(true)
  })
  it("returns false when the field is the empty string", () => {
    expect(evalVisibleWhen("audio_mode", { audio_mode: "" })).toBe(false)
  })
  it("returns false when the field is undefined", () => {
    expect(evalVisibleWhen("audio_mode", {})).toBe(false)
  })
  it("returns false when the field is null", () => {
    expect(evalVisibleWhen("audio_mode", { audio_mode: null })).toBe(false)
  })
  it("returns false when the field is 0", () => {
    expect(evalVisibleWhen("count", { count: 0 })).toBe(false)
  })
  it("returns true when the field is a positive number", () => {
    expect(evalVisibleWhen("count", { count: 5 })).toBe(true)
  })
  it("returns true when the field is literally `true`", () => {
    expect(evalVisibleWhen("enabled", { enabled: true })).toBe(true)
  })
  it("returns false when the field is literally `false`", () => {
    expect(evalVisibleWhen("enabled", { enabled: false })).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Equality (==) atom
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen ==", () => {
  it("matches a single-quoted string value", () => {
    expect(evalVisibleWhen("mode == 'native'", { mode: "native" })).toBe(true)
  })
  it("matches a double-quoted string value", () => {
    expect(evalVisibleWhen('mode == "native"', { mode: "native" })).toBe(true)
  })
  it("does NOT match when the string value differs", () => {
    expect(evalVisibleWhen("mode == 'native'", { mode: "lipSync" })).toBe(false)
  })
  it("uses STRICT equality (number 1 !== string '1')", () => {
    expect(evalVisibleWhen("count == 1", { count: 1 })).toBe(true)
    expect(evalVisibleWhen("count == 1", { count: "1" })).toBe(false)
  })
  it("matches boolean true literal", () => {
    expect(evalVisibleWhen("enabled == true", { enabled: true })).toBe(true)
    expect(evalVisibleWhen("enabled == true", { enabled: false })).toBe(false)
  })
  it("matches boolean false literal", () => {
    expect(evalVisibleWhen("enabled == false", { enabled: false })).toBe(true)
    expect(evalVisibleWhen("enabled == false", { enabled: true })).toBe(false)
  })
  it("matches numeric literals (integer)", () => {
    expect(evalVisibleWhen("count == 42", { count: 42 })).toBe(true)
  })
  it("matches numeric literals (decimal)", () => {
    expect(evalVisibleWhen("ratio == 0.5", { ratio: 0.5 })).toBe(true)
  })
  it("matches negative numeric literals", () => {
    expect(evalVisibleWhen("offset == -3", { offset: -3 })).toBe(true)
  })
  it("handles whitespace around the operator", () => {
    expect(evalVisibleWhen("mode   ==   'native'", { mode: "native" })).toBe(true)
  })
  it("handles no whitespace around the operator", () => {
    expect(evalVisibleWhen("mode=='native'", { mode: "native" })).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// null equivalence — the cross-family fix
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen null/undefined equivalence", () => {
  it("field == null returns true when the field is null", () => {
    expect(evalVisibleWhen("audio_mode == null", { audio_mode: null })).toBe(true)
  })
  it("field == null returns true when the field is undefined (absent)", () => {
    // This is the cross-family visible_when fix — without it, expressions
    // like `audio_mode == 'lipSync' || audio_mode == null` fail on families
    // where audio_mode is filtered out.
    expect(evalVisibleWhen("audio_mode == null", {})).toBe(true)
  })
  it("field == null returns false when the field has a value", () => {
    expect(evalVisibleWhen("audio_mode == null", { audio_mode: "native" })).toBe(false)
  })
  it("field != null returns false when the field is null", () => {
    expect(evalVisibleWhen("audio_mode != null", { audio_mode: null })).toBe(false)
  })
  it("field != null returns false when the field is undefined", () => {
    expect(evalVisibleWhen("audio_mode != null", {})).toBe(false)
  })
  it("field != null returns true when the field has a value", () => {
    expect(evalVisibleWhen("audio_mode != null", { audio_mode: "native" })).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Inequality (!=) atom
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen !=", () => {
  it("returns true when values differ", () => {
    expect(evalVisibleWhen("mode != 'native'", { mode: "lipSync" })).toBe(true)
  })
  it("returns false when values match", () => {
    expect(evalVisibleWhen("mode != 'native'", { mode: "native" })).toBe(false)
  })
  it("returns true when field is absent and compared to a non-null literal", () => {
    expect(evalVisibleWhen("mode != 'native'", {})).toBe(true)
  })
  it("uses strict inequality (string '1' !== number 1 → unequal → true)", () => {
    expect(evalVisibleWhen("count != 1", { count: "1" })).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Numeric comparison atoms: >, <, >=, <=
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen numeric comparisons", () => {
  it("> returns true for greater", () => {
    expect(evalVisibleWhen("count > 5", { count: 10 })).toBe(true)
  })
  it("> returns false for equal", () => {
    expect(evalVisibleWhen("count > 5", { count: 5 })).toBe(false)
  })
  it("> returns false for less", () => {
    expect(evalVisibleWhen("count > 5", { count: 1 })).toBe(false)
  })
  it("< returns true for less", () => {
    expect(evalVisibleWhen("count < 5", { count: 1 })).toBe(true)
  })
  it("< returns false for equal", () => {
    expect(evalVisibleWhen("count < 5", { count: 5 })).toBe(false)
  })
  it(">= returns true for equal", () => {
    expect(evalVisibleWhen("count >= 5", { count: 5 })).toBe(true)
  })
  it(">= returns true for greater", () => {
    expect(evalVisibleWhen("count >= 5", { count: 10 })).toBe(true)
  })
  it(">= returns false for less", () => {
    expect(evalVisibleWhen("count >= 5", { count: 1 })).toBe(false)
  })
  it("<= returns true for equal", () => {
    expect(evalVisibleWhen("count <= 5", { count: 5 })).toBe(true)
  })
  it("<= returns true for less", () => {
    expect(evalVisibleWhen("count <= 5", { count: 1 })).toBe(true)
  })
  it("<= returns false for greater", () => {
    expect(evalVisibleWhen("count <= 5", { count: 10 })).toBe(false)
  })
  it("coerces string values to Number for comparison", () => {
    // Number("10") > Number("5") → 10 > 5 → true.
    expect(evalVisibleWhen("count > 5", { count: "10" as unknown })).toBe(true)
  })
  it("treats undefined as NaN in numeric comparisons (always false)", () => {
    expect(evalVisibleWhen("count > 5", {})).toBe(false)
    expect(evalVisibleWhen("count < 5", {})).toBe(false)
    expect(evalVisibleWhen("count >= 5", {})).toBe(false)
    expect(evalVisibleWhen("count <= 5", {})).toBe(false)
  })
  it("compares against a negative numeric literal", () => {
    expect(evalVisibleWhen("offset > -10", { offset: -5 })).toBe(true)
    expect(evalVisibleWhen("offset < -10", { offset: -15 })).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AND (&&) — all must be true
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen AND", () => {
  it("returns true when all atoms are true", () => {
    expect(evalVisibleWhen("a == 'x' && b == 'y'", { a: "x", b: "y" })).toBe(true)
  })
  it("returns false when any atom is false", () => {
    expect(evalVisibleWhen("a == 'x' && b == 'y'", { a: "x", b: "z" })).toBe(false)
  })
  it("returns false when the first atom is false (short-circuit)", () => {
    expect(evalVisibleWhen("a == 'x' && b == 'y'", { a: "q", b: "y" })).toBe(false)
  })
  it("supports three-way AND", () => {
    const v = { a: "x", b: "y", c: "z" }
    expect(evalVisibleWhen("a == 'x' && b == 'y' && c == 'z'", v)).toBe(true)
    expect(evalVisibleWhen("a == 'x' && b == 'WRONG' && c == 'z'", v)).toBe(false)
  })
  it("combines truthy + comparison atoms", () => {
    expect(evalVisibleWhen("enabled && count > 5", { enabled: true, count: 10 })).toBe(true)
    expect(evalVisibleWhen("enabled && count > 5", { enabled: true, count: 3 })).toBe(false)
    expect(evalVisibleWhen("enabled && count > 5", { enabled: false, count: 10 })).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// OR (||) — any true
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen OR", () => {
  it("returns true when any atom is true", () => {
    expect(evalVisibleWhen("a == 'x' || b == 'y'", { a: "x", b: "z" })).toBe(true)
  })
  it("returns true when the first atom is true (short-circuit)", () => {
    expect(evalVisibleWhen("a == 'x' || b == 'y'", { a: "x", b: "WRONG" })).toBe(true)
  })
  it("returns false when all atoms are false", () => {
    expect(evalVisibleWhen("a == 'x' || b == 'y'", { a: "q", b: "z" })).toBe(false)
  })
  it("supports three-way OR", () => {
    const v = { a: "q", b: "y", c: "z" }
    expect(evalVisibleWhen("a == 'x' || b == 'y' || c == 'z'", v)).toBe(true)
    expect(evalVisibleWhen("a == 'x' || b == 'WRONG' || c == 'WRONG'", v)).toBe(false)
  })
  it("null-equivalence OR pattern (the canonical cross-family case)", () => {
    // The pattern the null-equivalence fix was added for:
    // audio_mode == 'lipSync' || audio_mode == null
    // → true on LTX (lipSync), true on non-LTX (absent → null ≡ undefined).
    expect(evalVisibleWhen("audio_mode == 'lipSync' || audio_mode == null", { audio_mode: "lipSync" })).toBe(true)
    expect(evalVisibleWhen("audio_mode == 'lipSync' || audio_mode == null", {})).toBe(true)
    expect(evalVisibleWhen("audio_mode == 'lipSync' || audio_mode == null", { audio_mode: "native" })).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Precedence — OR binds lower than AND (like JS)
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen precedence", () => {
  it("AND binds tighter than OR: a && b || c evaluates as (a && b) || c", () => {
    // a=true, b=false, c=true → (true && false) || true → false || true → true.
    const v = { a: true, b: false, c: true }
    expect(evalVisibleWhen("a && b || c", v)).toBe(true)
  })
  it("AND-only path returns false when one conjunct fails", () => {
    expect(evalVisibleWhen("a && b", { a: true, b: false })).toBe(false)
  })
  it("OR-only path returns true when one disjunct passes", () => {
    expect(evalVisibleWhen("a || b", { a: false, b: true })).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Parentheses — grouping
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen parens grouping", () => {
  it("strips outer parens wrapping the entire expression", () => {
    expect(evalVisibleWhen("(mode == 'native')", { mode: "native" })).toBe(true)
  })
  it("strips multiple layers of outer parens", () => {
    expect(evalVisibleWhen("((mode == 'native'))", { mode: "native" })).toBe(true)
  })
  it("parens group OR inside AND: a != null && (b == 'x' || b == null)", () => {
    // The canonical use case for explicit paren grouping.
    const expr = "a != null && (b == 'x' || b == null)"
    expect(evalVisibleWhen(expr, { a: "set", b: "x" })).toBe(true)
    expect(evalVisibleWhen(expr, { a: "set", b: null })).toBe(true)
    expect(evalVisibleWhen(expr, { a: "set", b: "y" })).toBe(false) // both OR branches false
    expect(evalVisibleWhen(expr, { a: null, b: "x" })).toBe(false) // a != null fails
  })
  it("does NOT strip parens that don't wrap the entire expression", () => {
    // (a == 'x') && b == 'y' — the parens wrap only the first atom.
    // The outer-paren stripper should leave this alone.
    expect(evalVisibleWhen("(a == 'x') && b == 'y'", { a: "x", b: "y" })).toBe(true)
  })
  it("parens prevent AND/OR precedence from mis-grouping", () => {
    // Without parens: a || b && c → a || (b && c)
    // With parens: (a || b) && c
    // For a=true, b=false, c=false:
    //   a || (b && c) = true || false = true
    //   (a || b) && c = (true || false) && false = true && false = false
    const v = { a: true, b: false, c: false }
    expect(evalVisibleWhen("a || b && c", v)).toBe(true)
    expect(evalVisibleWhen("(a || b) && c", v)).toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Unknown / malformed atoms default to visible (true)
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen unknown atoms default visible", () => {
  it("returns true for an unrecognized operator (default visible)", () => {
    // No matcher matches "~" — evalAtom returns true.
    expect(evalVisibleWhen("a ~ 'x'", { a: "x" })).toBe(true)
  })
  it("returns true for an empty atom (default visible)", () => {
    // Bare operator with no field — falls through to default-visible.
    expect(evalVisibleWhen("== 5", {})).toBe(true)
  })
  it("returns true for a complex expression that doesn't match any grammar", () => {
    // Spaces and special chars that don't match any matcher.
    expect(evalVisibleWhen("@#$%", {})).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Quoted strings — escapes + nested quotes
// ════════════════════════════════════════════════════════════════════════════
describe("formSpec — evalVisibleWhen quoted strings", () => {
  it("handles double-quoted values containing single quotes", () => {
    expect(evalVisibleWhen('mode == "don\'t"', { mode: "don't" })).toBe(true)
  })
  it("handles single-quoted values containing double quotes", () => {
    expect(evalVisibleWhen('mode == \'say "hi"\'', { mode: 'say "hi"' })).toBe(true)
  })
  it("does NOT split on operators inside quoted strings", () => {
    // The && inside the quoted string should not be treated as an AND splitter.
    expect(evalVisibleWhen('text == "a && b"', { text: "a && b" })).toBe(true)
  })
  it("does NOT split on || inside quoted strings", () => {
    expect(evalVisibleWhen('text == "a || b"', { text: "a || b" })).toBe(true)
  })
})
