/** THE CLIENT'S COMPOSE GATE — the mirror wall (2026-09-29, the
 *  operator's law: "IF THE CARD IS A CONTRACT/SCHEMA, HOW DOES A BAD
 *  CONTRACT EVEN GET CONSTRUCTED? IT CAN ALL BE VALIDATED BEFOREHAND,
 *  IN THE CODE"). composeValidate is the door's own law (estate-queue
 *  cardsVariant.ts: selectVariant + envelopeRefusal) run at
 *  COMPOSITION time over the SERVED doc. This wall pins the MIRROR
 *  DISCIPLINE: exactly the door's clauses — no stricter (a client
 *  that refuses what the door admits is a new lie), no looser (the
 *  door as first line is the old lie). When the door's law changes,
 *  this wall changes WITH it. */
import { describe, expect, test } from 'vitest'
import { composeCandidateDoc, composeValidate, type FormSpecDoc } from '../src/spec.ts'

const spec: FormSpecDoc = {
  form: 'image-gen', model: 'krea-2',
  variants: [
    { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: { model: 'krea-2', steps: 4, cfg: 1 }, route: 'krea-2',
      sampler_envelope: { steps: [4, 8], cfg: [1, 2] } },
    { id: 'raw', label: 'Raw', group: 'Variant', defaults: { model: 'krea-2-raw', steps: 52, cfg: 3.5 }, route: 'krea-2-raw',
      sampler_envelope: { steps: [30, 60], cfg: [2, 6] } },
    { id: 'q-fp8', label: 'FP8', group: 'Quant', defaults: {}, route: 'krea-2', quant: 'q-fp8', owner: 'turbo' },
  ],
}

/** THE SERVED SHAPE VERBATIM (the second live break, 2026-09-29):
 *  the discovery expander de-dupes shared quants by MUTILATING the
 *  row address — two variants both declaring int8 serve TWO Quant
 *  rows, ids 'int8' and 'raw__int8', SAME quant coordinate 'int8',
 *  owners turbo/raw. The id is an address; the quant is the value.
 *  Any writer that stamps the address where the door reads the
 *  value constructs an impossible contract — and the gate (not the
 *  door) must be the one that says so. */
const servedSpec: FormSpecDoc = {
  form: 'image-gen', model: 'krea-2',
  variants: [
    { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: { model: 'krea-2', steps: 4, cfg: 1 }, route: 'krea-2',
      sampler_envelope: { steps: [4, 8], cfg: [1, 2] } },
    { id: 'raw', label: 'Raw', group: 'Variant', defaults: { model: 'krea-2-raw', steps: 52, cfg: 3.5 }, route: 'krea-2-raw',
      sampler_envelope: { steps: [30, 60], cfg: [2, 6] } },
    { id: 'int8', label: 'INT8', group: 'Quant', defaults: {}, route: 'krea-2', quant: 'int8', owner: 'turbo' },
    { id: 'raw__int8', label: 'INT8', group: 'Quant', defaults: {}, route: 'krea-2-raw', quant: 'int8', owner: 'raw' },
  ],
}

describe('THE MIRROR LAW: clause 3 — the envelope (the operator\'s live break)', () => {
  test('the exact incident: cfg 3.5 stated against turbo [1,2] refuses with the door\'s own voice', () => {
    const v = composeValidate(spec, { variant: 'turbo', cfg: 3.5 })
    expect(v).toHaveLength(1)
    expect(v[0]!.message).toBe(
      'card_compose: stated cfg 3.5 is OUTSIDE the route envelope for variant "turbo" (route krea-2)'
      + ' — the declared envelope is [1, 2]'
      + '. The variant rail owns its sampler marriage: state values inside the envelope, or pick a different route.',
    )
  })

  test('the SAME value against the NEW variant is clean — the marriage judged whole', () => {
    // the half-switch's whole failure: cfg 3.5 judged against the
    // STATED variant raw, never the still-held turbo
    expect(composeValidate(spec, { variant: 'raw', cfg: 3.5, steps: 52 })).toEqual([])
  })

  test('steps outside refuses; inside is clean; bounds are inclusive', () => {
    expect(composeValidate(spec, { variant: 'turbo', steps: 9 })).toHaveLength(1)
    expect(composeValidate(spec, { variant: 'turbo', steps: 8, cfg: 1 })).toEqual([])
    expect(composeValidate(spec, { variant: 'turbo', steps: 4, cfg: 2 })).toEqual([])
  })

  test('the door\'s own skips mirror verbatim: non-numeric stated knobs never refuse', () => {
    expect(composeValidate(spec, { variant: 'turbo', cfg: 'huge' })).toEqual([])
  })

  test('THE SECOND LIVE BREAK: an UNSTATED variant resolves to the door\'s pool[0] — the doc is judged, never skipped', () => {
    // the door (selectVariant): rawVariant null → variant = pool[0]
    // (turbo) → envelopeRefusal judges stated cfg against [1,2].
    // The gate once SKIPPED every clause when variant was unstated —
    // that skip is what let the poisoned quant sail to the door.
    const v = composeValidate(spec, { cfg: 3.5 })
    expect(v).toHaveLength(1)
    expect(v[0]!.message).toContain('stated cfg 3.5 is OUTSIDE the route envelope for variant "turbo"')
    // and the clean half: a doc the door's default ADMITS (turbo's
    // own marriage) passes with no variant stated
    expect(composeValidate(spec, { cfg: 1.5, steps: 6 })).toEqual([])
  })

  test('a variant with no envelope declares nothing (opt-in per route)', () => {
    const openSpec: FormSpecDoc = { ...spec, variants: [
      { id: 'free', label: 'Free', group: 'Variant', defaults: {}, route: 'krea-2', sampler_envelope: null },
    ] }
    expect(composeValidate(openSpec, { variant: 'free', cfg: 99, steps: 1000 })).toEqual([])
  })
})

describe('THE MIRROR LAW: clause 1 — the marriage (unknown variant refuses, known list speaks)', () => {
  test('a variant this spec does not offer refuses with the door\'s message', () => {
    const v = composeValidate(spec, { variant: 'int4' })
    expect(v[0]!.message).toBe(
      'card_compose: unknown variant "int4" for model "krea-2" (known: turbo, raw)',
    )
  })
})

describe('THE MIRROR LAW: clause 2 — the quant cell (owned by the stated variant)', () => {
  test('a quant the stated variant does not declare refuses', () => {
    const v = composeValidate(spec, { variant: 'turbo', quant: 'q-ghost' })
    expect(v[0]!.message).toBe(
      'card_compose: unknown quant "q-ghost" for model "krea-2" variant "turbo" (known: q-fp8)',
    )
  })
  test('a variant that declares NO cells says so — the (known:) tail never lies (the convergence)', () => {
    // the door's empty-cells arm: before the voices converged this
    // seat printed "(known: )" — an empty list the operator cannot
    // act on. The door's tail is the mirror's tail.
    const v = composeValidate(spec, { variant: 'raw', quant: 'q-ghost' })
    expect(v[0]!.message).toBe(
      'card_compose: unknown quant "q-ghost" for model "krea-2" variant "raw" (the variant declares no cells)',
    )
  })
  test('a quant owned by ANOTHER variant is a ghost here (the chain: variant filters quant)', () => {
    expect(composeValidate(spec, { variant: 'turbo', quant: 'q-fp8' })).toEqual([])
    // raw owns no cells — a stated quant against it is unknown
    expect(composeValidate(spec, { variant: 'raw', quant: 'q-fp8' })).toHaveLength(1)
  })
})

describe('THE MIRROR LAW: the scope skips (this spec judges its own family\'s docs)', () => {
  test('a doc pointed at another model is judged by THAT family\'s spec, never this one', () => {
    expect(composeValidate(spec, { model: 'anima', variant: 'turbo', cfg: 99 })).toEqual([])
  })
  test('a null spec judges nothing (the carrier that cannot serialize)', () => {
    expect(composeValidate(null, { variant: 'turbo', cfg: 3.5 })).toEqual([])
  })
})

describe('THE SECOND LIVE BREAK (2026-09-29): the poisoned quant, the served shape, the door\'s resolution', () => {
  test('THE INCIDENT VERBATIM: quant "raw__int8" with variant UNSTATED refuses at the gate, not the door', () => {
    // the exact doc the operator's tab wrote: the catalog's
    // composite ADDRESS stamped where the door reads the cell VALUE.
    // The door resolved pool[0]=turbo and refused '(known: int8)';
    // the gate must refuse FIRST, with the same voice.
    const v = composeValidate(servedSpec, { quant: 'raw__int8' })
    expect(v).toHaveLength(1)
    expect(v[0]!.message).toBe(
      'card_compose: unknown quant "raw__int8" for model "krea-2" variant "turbo" (known: int8)',
    )
  })

  test('the same poison with the variant STATED refuses against THAT variant', () => {
    const v = composeValidate(servedSpec, { variant: 'raw', quant: 'raw__int8' })
    expect(v).toHaveLength(1)
    expect(v[0]!.message).toBe(
      'card_compose: unknown quant "raw__int8" for model "krea-2" variant "raw" (known: int8)',
    )
  })

  test('the VALUE spelling passes on both rows — one coordinate, one truth', () => {
    expect(composeValidate(servedSpec, { variant: 'turbo', quant: 'int8' })).toEqual([])
    expect(composeValidate(servedSpec, { variant: 'raw', quant: 'int8' })).toEqual([])
  })

  test('a route-spelled variant is LEGAL (the door matches id OR route — selectVariant\'s own find)', () => {
    expect(composeValidate(servedSpec, { variant: 'krea-2-raw', quant: 'int8', steps: 52, cfg: 3.5 })).toEqual([])
    expect(composeValidate(servedSpec, { variant: 'krea-2', steps: 9 })).toHaveLength(1)
  })
})

describe('composeCandidateDoc — composition itself (later layers win, null deletes)', () => {
  test('held row, user overlay, in-flight frame: the doc the door would judge', () => {
    expect(composeCandidateDoc(
      { model: 'krea-2', variant: 'turbo', cfg: 1, steps: 4 },
      { cfg: 1.5 },
      { variant: 'raw', steps: 52, cfg: 3.5 },
    )).toEqual({ model: 'krea-2', variant: 'raw', steps: 52, cfg: 3.5 })
  })
  test('a null frame key DELETES (the wire\'s own unset law)', () => {
    expect(composeCandidateDoc({ cfg: 1, steps: 4 }, {}, { cfg: null })).toEqual({ steps: 4 })
  })
  test('THE INCIDENT ITSELF, end to end: the half-switch frame can no longer be composed', () => {
    // the per-key half-state was: door judges {cfg: 3.5} over a row
    // still holding variant turbo. The COMPOSER assembles the doc
    // first — and the gate refuses it BEFORE any frame exists.
    const doc = composeCandidateDoc({ variant: 'turbo', cfg: 1 }, {}, { cfg: 3.5 })
    expect(composeValidate(spec, doc)).toHaveLength(1)
  })
})
