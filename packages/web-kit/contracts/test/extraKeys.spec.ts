// extraKeys.spec.ts — the read-side wtype gate (strictness fix 5,
// 2026-10-01). The write-side bag guard refuses foreign spellings at
// the declaration; extraOf is the boundary serialized rows cross —
// this pins its refusal, the '' no-hint tolerance, and the missing/
// malformed-extra backstop.
import { assert, describe, expect, test } from 'vitest'
import { extraOf, WTYPE_SET } from '../src/extraKeys.ts'

describe('extraOf: the wtype read gate', () => {
  test('a foreign wtype REFUSES, naming the spelling and the set', () => {
    // 'slidr' = the typo'd slider: without the gate it renders the
    // silent plain-text fallback FOREVER (the gap this closes)
    expect(() => extraOf({ meta: { extra: { wtype: 'slidr' } } })).toThrow(
      /wtype 'slidr' — not in WTYPE_SET/,
    )
    // non-string spellings refuse too (a number is not a hint)
    expect(() => extraOf({ meta: { extra: { wtype: 7 } } })).toThrow(/not in WTYPE_SET/)
  })

  test("'' is the explicit no-hint spelling — tolerated as absent", () => {
    expect(extraOf({ meta: { extra: { wtype: '' } } })).toEqual({ wtype: '' })
  })

  test('every WTYPE_SET member rides (the membership check is the set, not a list)', () => {
    for (const w of WTYPE_SET) {
      expect(extraOf({ meta: { extra: { wtype: w } } })).toEqual({ wtype: w })
    }
    assert.ok(WTYPE_SET.length > 0)
  })

  test('a missing or malformed extra reads as the empty bag (never a throw)', () => {
    expect(extraOf(undefined)).toEqual({})
    expect(extraOf(null)).toEqual({})
    expect(extraOf({})).toEqual({})
    expect(extraOf({ meta: {} })).toEqual({})
    expect(extraOf({ meta: { extra: 'nope' } })).toEqual({})
    expect(extraOf({ meta: { extra: ['no'] } })).toEqual({})
  })

  test('the rest of the bag rides verbatim beside the gate', () => {
    expect(extraOf({ meta: { extra: { wtype: 'slider', group: 'gen', columns: 2 } } })).toEqual({
      wtype: 'slider',
      group: 'gen',
      columns: 2,
    })
  })
})
