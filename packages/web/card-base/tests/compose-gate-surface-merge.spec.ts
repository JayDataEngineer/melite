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
import { axisPickPatch, composeValidate, dropStaleReopenCarry, modelSwitchPatch, recipeDeparturePatch, type FormSpecDoc, type SpecValues } from '../src/spec.ts'
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

describe('THE REOPEN CARRY DROP (the saved-doc heal, the stale-carry reopen cure, 2026-10-21)', () => {
  // THE BURN: dropStaleAxisCarry seats the prev ∩ ¬next drop at the
  // PICK only — a SAVED doc that arrives already resolved to a lane
  // its stated keys do not serve (written by an older door, patched
  // by the agent, or restored from an older save) rides ghosts the
  // press gate refuses forever: the studio opens it, Run refuses
  // "fires nothing on this lane", and the user never typed the key
  // on THIS lane to unstamp. The reopen derives the same drop at
  // doc open: every STATED key the resolved lane cannot state (not
  // on its surface, not a mod bag's param_key, not transport) is
  // dead carry by construction — the UI renders no widget for it,
  // the estate door refuses off-lane writes, so a saved doc's
  // off-surface stated keys are stale carry, never fresh authoring.
  // PURE — the caller owns the write.
  test('THE RED — a saved doc resolved to a lane its stated keys do not serve drops them (the qwen shape: persona + instruct riding the small variant)', () => {
    const spec = lanesSpec()
    const drop = dropStaleReopenCarry(spec, { model: 'synth', variant: 'small', persona: 'gritty host', instruct: 'excited' })
    expect(drop).toEqual({ persona: null, instruct: null })
  })

  test('THE STATEABLE TRUTH — keys the resolved lane serves never drop (base keys at every coordinate, the variant/cell additions on their own lane)', () => {
    const spec = lanesSpec()
    expect(dropStaleReopenCarry(spec, { model: 'synth', variant: 'small', prompt: 'a cube', steps: 20 })).toEqual({})
    expect(dropStaleReopenCarry(spec, { model: 'synth', variant: 'big', persona: 'host' })).toEqual({})
    expect(dropStaleReopenCarry(spec, { model: 'synth', variant: 'big', quant: 'large', instruct: 'soft' })).toEqual({})
  })

  test('THE TRANSPORT + BLANK LAW — model and axis keys never drop, blank carried keys have nothing to drop, unstated quant inherits the variant surface', () => {
    const spec = lanesSpec()
    expect(dropStaleReopenCarry(spec, { model: 'synth', variant: 'big', quant: 'small', prompt: '' })).toEqual({})
  })

  test('THE MOD-BAG LAW — a mod system bag key (param_key) never drops however the lanes spell their surfaces', () => {
    // the modifier row rides the FULL ModifierKind contract (kind +
    // cardinality are required fields; this literal was the
    // typecheck-gate's standing red, fixed with it)
    const spec: FormSpecDoc = {
      ...lanesSpec(),
      features: { modifiers: [{ kind: 'lora', label: 'qvoice', param_key: 'qvoice', schema_key: 'qvoice', entry: 'bag', cardinality: 'list' }] },
    }
    expect(dropStaleReopenCarry(spec, { model: 'synth', variant: 'small', qvoice: { item: { voice_strength: 1 } } })).toEqual({})
  })

  test('THE NEVER-A-GUESS LAW — a carrier with NO lanes block drops nothing (the legacy truth has no surface to judge against)', () => {
    const spec: FormSpecDoc = { model: 'legacy', label: null, form: 'form_legacy', params: ['prompt'], variants: [] }
    expect(dropStaleReopenCarry(spec, { model: 'legacy', ghost: 1 })).toEqual({})
  })
})

// ── THE PICK'S CARRY DROP + THE OWN-ROW LAW (batch 16): the same
// prev ∩ ¬next drop seated at the PICK (axisPickPatch + held), the
// guards that keep it a judge and never a guess, the switch frame's
// shared-word pass-along, and the family clause's own-row chain. ──
describe('the pick carry drop rides the real pick door (axisPickPatch + held)', () => {
  /** lanesSpec with the AXIS VOCABULARY served — the axes exist so the
   *  pick re-keys the lane and the carry judge runs at all. */
  function carrySpec(): FormSpecDoc {
    return {
      model: 'synth',
      label: null,
      form: 'form_synth',
      params: ['prompt', 'steps', 'departed_knob'],
      schema: {
        uid: 0,
        refs: {
          0: { type: 'object', dict: { input_images: 1, loras: 2 } },
          1: { type: 'array', meta: { extra: { wtype: 'image_list' } } },
          2: { type: 'array' },
        },
      },
      features: { variant_groups: { Variant: { label: 'Variant' }, Quant: { label: 'Quant' } } },
      variants: [
        { id: 'big', label: 'Big', group: 'Variant', defaults: {}, route: 'synth-big' },
        { id: 'small', label: 'Small', group: 'Variant', defaults: {}, route: 'synth-small' },
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

  test('THE VARIANT SWITCH DROPS THE DEPARTING LANE OWN CARRY — a big-lane persona never rides the small pick', () => {
    const spec = carrySpec()
    const small = spec.variants![1]
    const patch = axisPickPatch(spec, small, { model: 'synth', variant: 'big', persona: 'vivian' })
    expect(patch).toEqual({ variant: 'small', quant: '', persona: null })
  })

  test('THE BLANK CARRY IS AUTHORED — an empty carried value is the user clear, never the carry judge business', () => {
    const spec = carrySpec()
    const small = spec.variants![1]
    const patch = axisPickPatch(spec, small, { model: 'synth', variant: 'big', persona: '', prompt: 'say it' })
    expect(patch).toEqual({ variant: 'small', quant: '' })
  })

  test('THE NEVER-A-GUESS GUARD AT THE PICK — a departing coordinate that names no row judges nothing (the ghost prev returns)', () => {
    const spec = carrySpec()
    const small = spec.variants![1]
    const patch = axisPickPatch(spec, small, { model: 'synth', variant: 'ghost-row', persona: 'vivian' })
    expect(patch).toEqual({ variant: 'small', quant: '' })
  })

  test('THE NEVER-A-GUESS SURFACE GUARD — a lanes block with an ABSENT base serves no surface to judge against (the carry stands)', () => {
    const spec: FormSpecDoc = {
      ...carrySpec(),
      lanes: {
        variants: {
          big: { params: ['persona'], cells: { large: { params: ['instruct'] } } },
          small: { params: [] },
        },
      } as LaneContractRow,
    }
    const small = spec.variants![1]
    const patch = axisPickPatch(spec, small, { model: 'synth', variant: 'big', persona: 'vivian' })
    expect(patch).toEqual({ variant: 'small', quant: '' })
  })

  test('THE SHARED WORD RIDES THE SWITCH — a word both families declare never nulls, the image subject survives, the departed words die', () => {
    const spec = carrySpec()
    const patch = modelSwitchPatch(spec, 'arrival', {}, { params: ['prompt'] } as never as FormSpecDoc)
    expect(patch).toEqual({
      model: 'arrival',
      variant: null,
      quant: null,
      loras: null,
      steps: null,
      departed_knob: null,
    })
    expect(patch).not.toHaveProperty('prompt')
    expect(patch).not.toHaveProperty('input_images')
  })

  test('THE SPEC OWN ROW ID IS THE SPEC LAW — a held model matching a row ID (not its route) stays on this spec, and the mirror still judges it', () => {
    const spec = carrySpec()
    const doc: SpecValues = { model: 'big', variant: 'big', ghost: 1, prompt: 'say it', steps: 4 }
    const violations = composeValidate(spec, doc)
    // 'big' is a row ID (its route is 'synth-big') — the own-row chain
    // seats the doc HERE, and the mirror refusal keeps its teeth
    expect(hits(violations, 'ghost').length).toBeGreaterThan(0)
  })

  test('THE BLANK RECIPE WRITE UNSTATES THE STAMP THE PICK WROTE — never the transport model, never the off-lane key the pick could not stamp', () => {
    const spec: FormSpecDoc = {
      model: 'synth',
      label: null,
      form: 'form_synth',
      params: ['prompt', 'steps'],
      features: { variant_groups: { Variant: { label: 'Variant' } } },
      variants: [
        { id: 'big', label: 'Big', group: 'Variant', defaults: {}, route: 'big' },
        { id: 'author-base', label: 'A', group: 'Recipe', defaults: { model: 'other-model', steps: 50, checkpoint: 'ckpt-a' }, route: 'author' },
      ],
      lanes: { base: ['prompt', 'steps'], variants: { big: { params: ['persona'] } } } as LaneContractRow,
    }
    const row = spec.variants![1]
    expect(recipeDeparturePatch(spec, row, { model: 'synth', steps: 50, checkpoint: 'hand-typed' })).toEqual({ steps: null })
  })

  test('A DOC OF ANOTHER FAMILY RIDES OUT UNJUDGED WHEN THIS SPEC BOARDS NO ROWS — the empty own-chain hands the doc to its own spec', () => {
    const spec = { model: 'synth', params: ['prompt'] } as never as FormSpecDoc
    // no variants plane: the own-row chain has nothing to seat the
    // held model with — another family's doc, the door reads ITS spec
    expect(composeValidate(spec, { model: 'other-family', ghost: 1 })).toEqual([])
  })
})
