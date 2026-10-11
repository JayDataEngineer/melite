// extraKeys.spec.ts — the read-side wtype gate (strictness fix 5,
// 2026-10-01). The write-side bag guard refuses foreign spellings at
// the declaration; extraOf is the boundary serialized rows cross —
// this pins its refusal, the '' no-hint tolerance, and the missing/
// malformed-extra backstop. The write-side VALUE SHAPES and the
// options/guard grammars are pinned below (2026-10-14: the re-audit
// found every shape refusal dead on the vine — no suite had ever
// handed bag() a wrong-typed value).
import { assert, describe, expect, test } from 'vitest'
import type { ExtraBag } from '../src/extraKeys.ts'
import { bag, extraOf, WTYPE_SET } from '../src/extraKeys.ts'

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

// THE WRITE-SIDE VALUE SHAPES — every refusal voice pinned exactly,
// one arm per shape family and per grammar rule.
describe('bag: the write-side value-shape and grammar refusals', () => {
  test('every string-typed key refuses a non-string (naming key and got-value)', () => {
    for (const key of ['group', 'visible_when', 'tooltip', 'placeholder', 'optionsFrom', 'wtype', 'zone', 'media']) {
      expect(() => bag({ [key]: 7 } as never)).toThrow(
        new RegExp(`extra bag\\.${key} must be a string — got 7`),
      )
    }
  })

  test('every number-typed key refuses a non-number', () => {
    for (const key of ['width', 'columns', 'max_stack']) {
      expect(() => bag({ [key]: 'two' } as never)).toThrow(
        new RegExp(`extra bag\\.${key} must be a number — got "two"`),
      )
    }
  })

  test('every boolean-typed key refuses a non-boolean', () => {
    for (const key of ['required', 'hidden', 'serveDefault']) {
      expect(() => bag({ [key]: 'yes' } as never)).toThrow(
        new RegExp(`extra bag\\.${key} must be a boolean — got "yes"`),
      )
    }
  })

  test('order takes a number or null and refuses anything else', () => {
    expect(bag({ order: null })).toEqual({ order: null })
    expect(bag({ order: 3 })).toEqual({ order: 3 })
    expect(() => bag({ order: 'first' } as never)).toThrow(
      /extra bag\.order must be a number or null — got "first"/,
    )
  })

  test('families must be a string[] — non-arrays and non-string members refuse', () => {
    expect(bag({ families: ['flux', 'pony'] })).toEqual({ families: ['flux', 'pony'] })
    expect(() => bag({ families: 'flux' } as never)).toThrow(
      /extra bag\.families must be a string\[\] — got "flux"/,
    )
    expect(() => bag({ families: ['flux', 7] } as never)).toThrow(
      /extra bag\.families must be a string\[\] — got \["flux",7\]/,
    )
  })

  test('zone and media are closed sets — foreign spellings name the set they missed', () => {
    expect(() => bag({ zone: 'attic' } as never)).toThrow(
      /extra bag carries zone 'attic' — not in ZONE_SET \(/,
    )
    expect(() => bag({ media: 'vhs' } as never)).toThrow(
      /extra bag carries media 'vhs' — not in MEDIA_SET \(/,
    )
  })

  test('wtype is a closed set too — a foreign STRING spelling refuses naming the renderer arm it has none of', () => {
    // 'slidr' passes the string shape guard and dies on the closed
    // set: the renderer has no arm for it, so it would render as a
    // plain text input forever.
    expect(() => bag({ wtype: 'slidr' } as never)).toThrow(
      /extra bag carries wtype 'slidr' — not in WTYPE_SET\. The renderer has no arm for it/,
    )
    // every set member rides the write
    for (const w of WTYPE_SET) {
      expect(bag({ wtype: w })).toEqual({ wtype: w })
    }
  })

  test('options grammar: empty values, empty labels, and duplicate values refuse at the write', () => {
    expect(() => bag({ options: [{ value: '', label: 'x' }] })).toThrow(
      /extra bag\.options carries an empty value/,
    )
    expect(() => bag({ options: [{ value: 'v', label: '' }] })).toThrow(
      /extra bag\.options row 'v' carries an empty label/,
    )
    expect(() => bag({ options: [{ value: 'v', label: 'a' }, 'v'] })).toThrow(
      /extra bag\.options carries duplicate value 'v' — an ambiguous pick/,
    )
    // well-formed rows pass: objects and bare strings; duplicate
    // LABELS stay legal (labels are display-only)
    expect(bag({ options: [{ value: 'v', label: 'a' }, 'w'] })).toEqual({
      options: [{ value: 'v', label: 'a' }, 'w'],
    })
  })

  test('visible_when grammar: every guard needs an operator, a key, and a value', () => {
    expect(() => bag({ visible_when: 'model' })).toThrow(
      /extra bag\.visible_when guard 'model' carries no operator \(= or !=\)/,
    )
    expect(() => bag({ visible_when: '=flux' })).toThrow(
      /extra bag\.visible_when guard '=flux' carries an empty key/,
    )
    expect(() => bag({ visible_when: 'model!=' })).toThrow(
      /extra bag\.visible_when guard 'model!=' carries an empty value/,
    )
    // both operators ride, multi-guard strings ride, '' is no-guard
    expect(bag({ visible_when: 'model=flux&media!=video' })).toEqual({
      visible_when: 'model=flux&media!=video',
    })
    expect(bag({ visible_when: '' })).toEqual({ visible_when: '' })
  })

  test('an unknown key refuses, naming the vocabulary table', () => {
    expect(() => bag({ typoo: 'x' } as never)).toThrow(
      /extra bag carries 'typoo' — not in the contract's vocabulary \(packages\/web-kit\/contracts\/src\/extraKeys\.ts\)/,
    )
  })

  test('a fully-loaded legal bag passes untouched (the guards refuse, they never rewrite)', () => {
    const loaded = {
      group: 'gen', visible_when: 'a=1', tooltip: 't', placeholder: 'p',
      optionsFrom: 'o', wtype: 'slider', zone: 'params', media: 'audio',
      required: true, hidden: false, serveDefault: true,
      width: 2, columns: 2, max_stack: 3,
      order: null, families: ['f'],
      options: [{ value: 'v', label: 'L' }],
    } satisfies ExtraBag
    expect(bag(loaded)).toEqual(loaded)
  })
})
