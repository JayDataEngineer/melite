// @contract cards-tts-surface-merge
// compose-gate-surface-merge.spec.ts — THE MIRROR'S SURFACE MERGE
// WALL (generic arms; the REAL-DECL arms ride tts-gate-surface-merge
// in melite-card-view). The 2026-11-09/10 burn: the client compose
// mirror judged the served `params` — the FAMILY BASE projection
// (discovery.ts:1035 `params: decl?.params`) — and refused the
// resolved VARIANT's and CELL's own params ('voice' on the 0.6B
// customvoice cell), while the estate write door judges the MERGED
// surface (cardsRegistry.ts:1376, laneSurfaceOf) and the engine node
// takes the same input on every lane. The mirror must judge the same
// resolved (variant × cell) surface the door judges: family base ∪
// variant additions ∪ cell additions (laneSurfaceFor over the served
// lanes contract), never the family base alone.
//
// THE PRE-REGISTERED REDS (first run IS the receipt):
//   ARM 2/3/4 red — the mirror refused variant/cell-declared keys on
//   the family-base projection and (worse) ADMITTED cell-declared
//   keys on the sibling cell by the same token. GREEN on the cured
//   tree; toggling the cure out re-reds them.
import { describe, expect, test } from 'vitest'
import { composeValidate, type FormSpecDoc, type SpecValues } from '../src/spec.ts'
import type { LaneContractRow } from '@melite/contracts/laneRelations'

/** A lanes-served spec shaped like the qwen3-tts burn: family base
 *  [prompt, steps], variant "big" adds [persona], its cell "large"
 *  adds [instruct], its sibling cell "small" adds NOTHING — the
 *  persona rides the VARIANT at both sizes, the instruct is
 *  CELL-exclusive (the exact DECL shape that burned). */
function lanesSpec(): FormSpecDoc {
  return {
    model: 'synth',
    label: null,
    form: 'form_synth',
    params: ['prompt', 'steps'],
    variants: [
      { id: 'big', label: 'Big', group: 'Variant', defaults: {}, route: 'big' },
      { id: 'small', label: 'Small', group: 'Variant', defaults: {}, route: 'small' },
      { id: 'big__large', label: 'Large', group: 'Quant', defaults: {}, route: 'big-large', quant: 'large', owner: 'big' },
      { id: 'big__small', label: 'Small', group: 'Quant', defaults: {}, route: 'big-small', quant: 'small', owner: 'big' },
    ],
    lanes: {
      base: ['prompt', 'steps'],
      variants: {
        big: { params: ['persona'], cells: { large: { params: ['instruct'] } } },
        small: { params: [] },
      },
    } as LaneContractRow,
  }
}

const hits = (violations: ReturnType<typeof composeValidate>, field: string): string[] =>
  violations.filter((v) => v.field === field).map((v) => v.message)

describe('the compose mirror judges the resolved (variant × cell) surface, never the family base alone', () => {
  test('THE FLOOR — the fixture carries the burn shape (variant param, cell-exclusive param, a cell with no additions)', () => {
    const spec = lanesSpec()
    expect(spec.lanes?.base).toEqual(['prompt', 'steps'])
    expect(spec.lanes?.variants?.['big']?.params).toEqual(['persona'])
    expect(spec.lanes?.variants?.['big']?.cells?.['large']?.params).toEqual(['instruct'])
    expect(spec.lanes?.variants?.['big']?.cells?.['small']).toBeUndefined()
  })

  test('ARM 2 (THE RED) — a VARIANT-declared param composes on the cell that adds nothing (voice on the 0.6B shape)', () => {
    const doc: SpecValues = { model: 'synth', variant: 'big', quant: 'small', persona: 'vivian', prompt: 'say it', steps: 4 }
    const violations = composeValidate(lanesSpec(), doc)
    expect(hits(violations, 'persona'), `the mirror judged the family base:\n  ${hits(violations, 'persona').join('\n  ')}`).toEqual([])
  })

  test('ARM 3 (THE RED) — an UNSTATED quant resolves the FIRST cell: the cell-exclusive param composes there', () => {
    const doc: SpecValues = { model: 'synth', variant: 'big', persona: 'vivian', instruct: 'loud', prompt: 'say it', steps: 4 }
    const violations = composeValidate(lanesSpec(), doc)
    expect(hits(violations, 'instruct'), 'the unstated quant rides the variant\'s first cell (the door\'s own resolution) — instruct is declared there').toEqual([])
    expect(hits(violations, 'persona')).toEqual([])
  })

  test('ARM 4 (THE TEETH) — the cell-exclusive param refuses on the SIBLING cell, field-named', () => {
    const doc: SpecValues = { model: 'synth', variant: 'big', quant: 'small', persona: 'vivian', instruct: 'loud', prompt: 'say it', steps: 4 }
    const violations = composeValidate(lanesSpec(), doc)
    expect(hits(violations, 'instruct').length, 'the small cell declares no instruct — the refusal keeps its teeth').toBeGreaterThan(0)
  })

  test('ARM 5 — a key NO lane declares still refuses (the mirror keeps its departed-surface voice)', () => {
    const doc: SpecValues = { model: 'synth', variant: 'big', quant: 'large', departed_knob: true, prompt: 'say it', steps: 4 }
    const violations = composeValidate(lanesSpec(), doc)
    expect(hits(violations, 'departed_knob').length).toBeGreaterThan(0)
  })

  test('ARM 6 (THE LEGACY FALLBACK) — a carrier with NO lanes block still judges its family-base params verbatim (never a guess)', () => {
    const spec: FormSpecDoc = { model: 'legacy', label: null, form: 'form_legacy', params: ['prompt'], variants: [] }
    const refused = composeValidate(spec, { model: 'legacy', prompt: 'x', ghost: 1 })
    expect(hits(refused, 'ghost').length).toBeGreaterThan(0)
    const clean = composeValidate(spec, { model: 'legacy', prompt: 'x' })
    expect(clean).toEqual([])
  })

  test('ARM 7 (THE NO-SURFACE TRUTH) — lanes served with an ABSENT base (the surface-less family) judges nothing off-surface (the krea-2 law)', () => {
    const spec: FormSpecDoc = {
      model: 'laws-only',
      label: null,
      form: 'form_laws',
      variants: [],
      lanes: { variants: { big: { params: ['persona'] } } } as LaneContractRow,
    }
    const violations = composeValidate(spec, { model: 'laws-only', anything: 'rides' })
    expect(violations.filter((v) => v.message.includes('does not declare it'))).toEqual([])
  })
})
