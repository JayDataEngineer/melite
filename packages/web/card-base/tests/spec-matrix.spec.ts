// @vitest-environment happy-dom
// spec-matrix.spec.ts — THE LAYERED PARAMS + THE AXIS MATRIX
// (spec.ts half 2): resolveValue layers schema defaults <-
// model defaults <- served stamps <- user (PRESENCE is the
// override mark, never the value); the variant/quant axes reseed
// on every pick so no run composes an impossible coordinate.
import { expect, test } from 'vitest'
import { resolveValueLayered } from '../src/use-resolved.ts'
import { coerceFieldEdit } from '../src/spec.ts'

import {
  activeRowId,
  activeVariantId,
  axisGroups,
  axisKey,
  axisPickPatch,
  composeValidate,
  composingRows,
  fieldVisible,
  fieldRequired,
  fieldsOf,
  groupFields,
  inputEdgeOf,
  modelChoices,
  modelSwitchPatch,
  quantRowsFor,
  resolveValue,
  rowsFor,
  seedAxisValues,
  reseatEnvelopeKeys,
  seedRecipeStamp,
  seedUser,
  variantGroupsContract,
  variantRows,
  type FormSpecDoc,
  type SpecField,
  type SpecValues,
  type FormVariantRow,
} from '../src/spec.ts'

const V = (id: string, group: string, extra: Partial<FormVariantRow> = {}): FormVariantRow => ({
  id,
  label: id,
  group,
  defaults: {},
  route: 'krea-2',
  // A Quant row's coordinate is its quant — the STAMPER IS TOTAL
  // (2026-09-29): a row without it refuses at the stamp, so every
  // fixture Quant row declares its coordinate explicitly.
  ...(group === 'Quant' ? { quant: extra.quant ?? id } : {}),
  ...extra,
})

/** A served form-spec doc: flat fields, Variant + Quant axes with
 *  an owner-chained cell, a Recipe macro row, one input edge. */
function doc(): FormSpecDoc {
  return {
    form: 'txt2img',
    model: 'krea-2',
    model_defaults: { steps: 30, dead: null, bag: [1] },
    schema: {
      uid: 0,
      refs: {
        0: { type: 'object', dict: { prompt: 1, steps: 2, cfg: 3, seed: 4, loras: 5 } },
        1: { type: 'string', meta: { description: 'Prompt', default: 'a cat' } },
        2: { type: 'number', meta: { default: 20, step: 1 } },
        3: { type: 'number', meta: { default: 5, step: 0.5 } },
        4: { type: 'number', meta: { default: 0, step: 1 } },
        5: { type: 'array' },
      },
    },
    features: {
      variant_groups: { Variant: { label: 'Variant' }, Quant: { label: 'Quant' } },
    },
    variants: [
      V('r-hd', 'Variant', { label: 'HD', defaults: { model: 'krea-2-hd', steps: 40 } }),
      V('r-sd', 'Variant', { label: 'SD' }),
      V('r-empty', 'Variant', { label: 'Empty', defaults: { model: '' } }),
      V('q-fp8', 'Quant', { label: 'FP8' }),
      V('q-hd-only', 'Quant', { label: 'HD-only', defaults: { model: 'krea-2-hd' }, owner: 'r-hd' }),
      V('recipe-x', 'Recipe', { label: 'X', defaults: { steps: 50 } }),
    ],
    inputs: [{ name: 'input_image', kind: 'image' }],
  } as unknown as FormSpecDoc
}

test('THE CASCADE: schema defaults <- model defaults <- served stamps <- user (presence wins)', () => {
  expect(resolveValue(doc(), {})).toEqual({ prompt: 'a cat', steps: 30, cfg: 5, seed: 0 })
  expect(resolveValue(doc(), { steps: 99 })).toMatchObject({ steps: 99 })
  expect(resolveValue(doc(), {}, { cfg: 1, prompt: 'stamped' })).toMatchObject({ cfg: 1, prompt: 'stamped' })
  // null/array stamps never invent (the schema/model facts show through)
  expect(resolveValue(doc(), {}, { gone: null, missing: undefined, list: [1] })).toEqual({
    prompt: 'a cat', steps: 30, cfg: 5, seed: 0,
  })
})

test('THE CASCADE: null/array model defaults never invent', () => {
  expect(resolveValue(doc(), {})).not.toHaveProperty('dead')
  expect(resolveValue(doc(), {})).not.toHaveProperty('bag')
  expect(resolveValue({ form: 'x' }, {})).toEqual({})
})

// ── THE INHERIT LAW (the blank-steps correction, #35): a MATERIAL-
// IZED undefined/null key on the USER layer is the unset signal —
// it inherits the resolved default, NEVER overwrites it. The real
// h3 LayerA materializes every optNum knob as an own undefined;
// the old bare Object.assign blanked Steps/Denoise on every fresh
// document while every compose-side wall stayed green (they assert
// through the walk, which JSON's undefined-drop protects). User
// ARRAYS still ride — the mod bag is a user pick, only base/model
// layers skip arrays. ──
test('THE INHERIT LAW: materialized undefined/null on the user layer inherits, never blanks', () => {
  // the operator's repro: every unset knob an OWN undefined key
  const r = resolveValue(doc(), { steps: undefined, cfg: null, seed: 7 })
  expect(r).toMatchObject({ steps: 30, cfg: 5, seed: 7 })
  // the mod bag rides verbatim (user arrays are picks, not stamps)
  expect(resolveValue(doc(), { bag: [{ id: 'x' }] })).toMatchObject({ bag: [{ id: 'x' }] })
})

test('THE INHERIT LAW: the pre-fetch arm holds base through materialized undefined', () => {
  // spec-null render (fetch in flight): base under user, undefined
  // inherits base — the synchronous face never blanks a held value
  expect(resolveValueLayered(null, { steps: 8, cfg: 1 }, { steps: undefined, seed: 7 }))
    .toEqual({ steps: 8, cfg: 1, seed: 7 })
})

// ── THE MARRIAGE MIRROR (#36, the recipes rework): a served kind
// declaring marries hands the named knob to a counting bag —
// stated on the row first, else the catalog row's default, max
// across the bag (compose card.ts's own layering: call knobs >
// lora steps > the steps row). The face shows what the film runs:
// Steps reads 8 with a turbo bag riding, NEVER the neutral
// default. Recipes reference ids ONLY — the catalog owns every
// derived value, so nothing can drift. ──
function marriedDoc(): FormSpecDoc {
  const d = doc()
  d.features = {
    ...d.features,
    modifiers: [{
      kind: 'lora',
      label: 'Loras',
      param_key: 'loras',
      cardinality: 'many',
      marries: { steps: 'max' },
      options: [
        { value: 'turbo', label: 'Turbo', defaults: { strength: 0.6, steps: 8 } },
        { value: 'dareties', label: 'Dareties', defaults: { strength: 0.8, steps: 4 } },
      ],
    }],
  }
  return d
}

test('THE MARRIAGE MIRROR: a counting bag owns the married knob (catalog counts, max law)', () => {
  // the plaguekind repro: an id-only bag (the recipe's pure
  // selection) — steps reads the CATALOG count, never the cascade's
  expect(resolveValue(marriedDoc(), { loras: [{ id: 'turbo' }] })).toMatchObject({ steps: 8 })
  expect(resolveValue(marriedDoc(), { loras: [{ id: 'dareties' }] })).toMatchObject({ steps: 4 })
  // the stack runs at the HIGHER count (compose's max law)
  expect(resolveValue(marriedDoc(), { loras: [{ id: 'turbo' }, { id: 'dareties' }] })).toMatchObject({ steps: 8 })
  // a STATED count on the row beats the catalog (the entry's own word)
  expect(resolveValue(marriedDoc(), { loras: [{ id: 'turbo', steps: 6 }] })).toMatchObject({ steps: 6 })
  // even an explicit user steps pick LOSES to the bag — the film
  // ignores the doc row while the marriage rides; so does the face
  expect(resolveValue(marriedDoc(), { loras: [{ id: 'dareties' }], steps: 20 })).toMatchObject({ steps: 4 })
})

test('THE MARRIAGE MIRROR: no counting bag → the cascade owns the knob untouched', () => {
  // no bag at all, an empty bag, a bag with no married counts, an
  // unknown id (the mod plane refuses those loudly at its own
  // door — the resolver never invents a refusal), no marries on
  // the kind: every shape leaves the cascade's steps alone.
  expect(resolveValue(marriedDoc(), {})).toMatchObject({ steps: 30 })
  expect(resolveValue(marriedDoc(), { loras: [] })).toMatchObject({ steps: 30 })
  expect(resolveValue(marriedDoc(), { loras: [{ strength: 0.5 }] })).toMatchObject({ steps: 30 })
  expect(resolveValue(marriedDoc(), { loras: [{ id: 'no-such-row' }] })).toMatchObject({ steps: 30 })
  // a married kind without a catalog cannot count: the cascade owns
  // the knob, untouched.
  const optionless = marriedDoc()
  const [optioned] = optionless.features?.modifiers ?? []
  const { options: _options, ...rest } = optioned ?? {}
  optionless.features = { ...optionless.features, modifiers: [rest] }
  expect(resolveValue(optionless, { loras: [{ id: 'turbo' }] })).toMatchObject({ steps: 30 })
  const unkind = marriedDoc()
  unkind.features = { ...unkind.features, modifiers: [{ kind: 'lora', label: 'Loras', param_key: 'loras', cardinality: 'many', options: [] }] }
  expect(resolveValue(unkind, { loras: [{ id: 'turbo', steps: 8 }] })).toMatchObject({ steps: 30 })
})

test('fieldVisible: the wire shows unless its rule names a mismatched state', () => {
  const f = (rule?: string): SpecField => ({ name: 'q', label: 'Q', type: 'text', visible_when: rule }) as SpecField
  expect(fieldVisible(f(), {})).toBe(true)
  expect(fieldVisible(f(''), {})).toBe(true)
  expect(fieldVisible(f('steps'), {})).toBe(true)
  expect(fieldVisible(f('steps=30'), { steps: 30 })).toBe(true)
  expect(fieldVisible(f('steps=30'), { steps: 20 })).toBe(false)
  expect(fieldVisible(f('steps=30'), {})).toBe(false)
})

test('fieldRequired: the conditional star paints exactly when the guards hold (the sam3 prompt law, 2026-10-12)', () => {
  // THE CRIME this wall guards: 'sam3 entry 0 needs a prompt (or
  // Via RT-DETR boxes)' refused at card_compose phase 1 while the
  // form rendered a lawful-looking optional blank — the demand was
  // never DECLARED. required_when is the declaration: the SAME
  // grammar fieldVisible interprets, judged against the entry's
  // own sibling values.
  const base = { name: 'prompt', label: 'Prompt', type: 'text' } as SpecField
  const cond = { ...base, required_when: 'via_rtdetr!=true' } as SpecField
  // unconditional faces stay unconditional
  expect(fieldRequired({ ...base, required: true } as SpecField, {})).toBe(true)
  // absent rule + absent values = optional (today's face)
  expect(fieldRequired(base, {})).toBe(false)
  // the guards hold: via_rtdetr unset/false → the star paints
  expect(fieldRequired(cond, {})).toBe(true)
  expect(fieldRequired(cond, { via_rtdetr: false })).toBe(true)
  expect(fieldRequired(cond, { via_rtdetr: 'false' })).toBe(true)
  // the guard lifts: via_rtdetr on → optional (the box lane feeds it)
  expect(fieldRequired(cond, { via_rtdetr: true })).toBe(false)
  // an empty rule never demands (the explicit no-rule spelling)
  expect(fieldRequired({ ...base, required_when: '' } as SpecField, {})).toBe(false)
})

test('groupFields: ungrouped first (first-appearance order), the invisible never group', () => {
  const groups = groupFields(fieldsOf(doc()), { steps: 20 })
  expect(groups.length).toBe(1)
  expect(groups[0]!.group).toBeNull()
  expect(groups[0]!.fields.map((f) => f.name)).toEqual(['prompt', 'steps', 'cfg', 'seed', 'loras'])
  const fields = [
    { name: 'a', label: 'A', type: 'text', group: 'G', visible_when: 'x=1' },
    { name: 'b', label: 'B', type: 'text', group: 'G' },
    { name: 'c', label: 'C', type: 'text', group: 'H' },
    { name: 'd', label: 'D', type: 'text' },
  ] as SpecField[]
  const g = groupFields(fields, {})
  // first-appearance order (the served schema lists ungrouped fields
  // first — the walk preserves, never sorts)
  expect(g.map((x) => x.group)).toEqual(['G', 'H', null])
  expect(g[0]!.fields.map((f) => f.name)).toEqual(['b'])
  expect(g[2]!.fields.map((f) => f.name)).toEqual(['d'])
  expect(groupFields([], {})).toEqual([])
})

test('inputEdgeOf: the declared edge or undefined (never a sniff)', () => {
  expect(inputEdgeOf(doc(), 'input_image')).toEqual({ name: 'input_image', kind: 'image' })
  expect(inputEdgeOf(doc(), 'ghost')).toBeUndefined()
  expect(inputEdgeOf({ form: 'x' }, 'input_image')).toBeUndefined()
})

test('axisGroups: declared groups first, then first-seen (Recipe never an axis)', () => {
  expect(axisGroups(doc())).toEqual(['Variant', 'Quant'])
  const noDeclared = { ...doc(), features: undefined } as unknown as FormSpecDoc
  expect(axisGroups(noDeclared)).toEqual(['Variant', 'Quant'])
  expect(axisGroups({ form: 'x' })).toEqual([])
  // a declared group with no rows still rides (the drill renders its empty seat)
  expect(axisGroups({ form: 'x', features: { variant_groups: { Zed: {} } } })).toEqual(['Zed'])
  // empty group names never ride, from either side
  const empties = {
    form: 'x',
    features: { variant_groups: { '': {} } },
    variants: [V('a', ''), V('b', 'Zed')],
  } as unknown as FormSpecDoc
  expect(axisGroups(empties)).toEqual(['Zed'])
})

test('variantGroupsContract: the served key order; non-objects walk to no contract', () => {
  expect(variantGroupsContract(doc())).toEqual(['Variant', 'Quant'])
  expect(variantGroupsContract({ form: 'x' })).toEqual([])
  expect(variantGroupsContract({ form: 'x', features: { variant_groups: null } } as unknown as FormSpecDoc)).toEqual([])
  expect(variantGroupsContract({ form: 'x', features: { variant_groups: ['Variant'] } } as unknown as FormSpecDoc)).toEqual([])
  expect(variantGroupsContract({ form: 'x', features: { variant_groups: 'Variant' } } as unknown as FormSpecDoc)).toEqual([])
})

test('rowsFor/variantRows/quantRowsFor: the axis slices in served order', () => {
  const spec = doc()
  expect(rowsFor(spec, 'Variant').map((r) => r.id)).toEqual(['r-hd', 'r-sd', 'r-empty'])
  expect(rowsFor(spec, 'Nope')).toEqual([])
  expect(rowsFor({ form: 'x' }, 'Variant')).toEqual([])
  expect(variantRows(spec).map((r) => r.id)).toEqual(['r-hd', 'r-sd', 'r-empty'])
  expect(variantRows({ form: 'x' })).toEqual([])
  expect(quantRowsFor(spec, 'r-hd').map((r) => r.id)).toEqual(['q-fp8', 'q-hd-only'])
  expect(quantRowsFor(spec, 'r-sd').map((r) => r.id)).toEqual(['q-fp8'])
  expect(quantRowsFor(spec, null).map((r) => r.id)).toEqual(['q-fp8'])
  expect(quantRowsFor({ form: 'x' }, 'r-hd')).toEqual([])
})

test('composingRows: owner-empty composes everywhere; owners chain one direction', () => {
  const spec = doc()
  expect(composingRows(spec, 'Variant', {}).map((r) => r.id)).toEqual(['r-hd', 'r-sd', 'r-empty'])
  expect(composingRows(spec, 'Quant', { Variant: 'r-hd' }).map((r) => r.id)).toEqual(['q-fp8', 'q-hd-only'])
  expect(composingRows(spec, 'Quant', { Variant: 'r-sd' }).map((r) => r.id)).toEqual(['q-fp8'])
  // an owner no axis names still composes (patch-only rows are never filtered)
  const ghost: FormSpecDoc = {
    form: 'x',
    variants: [V('q1', 'Quant', { owner: 'ghost' })],
  } as unknown as FormSpecDoc
  expect(composingRows(ghost, 'Quant', {}).map((r) => r.id)).toEqual(['q1'])
})

test('modelChoices: THE FAMILY THE SPEC SERVES, full stop (routes are not models)', () => {
  expect(modelChoices(doc())).toEqual(['krea-2'])
  expect(modelChoices({ form: 'x' })).toEqual([])
  expect(modelChoices({ form: 'x', model: '' })).toEqual([])
  expect(modelChoices({ form: 'x', model: null })).toEqual([])
})

test('activeVariantId: the held model resolves through the re-point + the owner chain', () => {
  const spec = doc()
  expect(activeVariantId(spec, { model: 'krea-2' }, 'Variant')).toBe('r-sd')
  expect(activeVariantId(spec, { model: 'krea-2' }, 'Quant')).toBe('q-fp8')
  expect(activeVariantId(spec, { model: 'krea-2-hd' }, 'Variant')).toBe('r-hd')
  expect(activeVariantId(spec, { model: 'krea-2-hd' }, 'Quant')).toBe('q-hd-only')
  // nothing held, or a non-string hold: no active entry (the caller falls to first-declared)
  expect(activeVariantId(spec, {}, 'Variant')).toBeUndefined()
  expect(activeVariantId(spec, { model: 7 }, 'Variant')).toBeUndefined()
  expect(activeVariantId(spec, { model: 'ghost' }, 'Variant')).toBeUndefined()
  expect(activeVariantId({ form: 'x' }, { model: 'krea-2' }, 'Variant')).toBeUndefined()
})

test('activeRowId: the chain breaks loud (a chained row without its owner never activates)', () => {
  const spec = doc()
  // the HD-only cell with the SD variant active: the chain breaks, no row
  expect(activeRowId(spec, { model: 'krea-2-hd' }, 'Quant', { Variant: 'r-sd' })).toBeUndefined()
  // the empty re-point never matches (never an active entry)
  expect(activeRowId(spec, { model: 'krea-2' }, 'Variant', {})).toBe('r-sd')
  expect(activeRowId(spec, {}, 'Variant', {})).toBeUndefined()
  expect(activeRowId(spec, { model: 'krea-2' }, 'Nope', {})).toBeUndefined()
  expect(activeRowId({ form: 'x' }, { model: 'krea-2' }, 'Variant', {})).toBeUndefined()
})

test('axisKey: the axis name lowercases to its param key', () => {
  expect(axisKey('Variant')).toBe('variant')
  expect(axisKey('Quant')).toBe('quant')
  expect(axisKey('Recipe')).toBe('recipe')
})

test('axisPickPatch: the row overlay rides (model-skipped), its axis stamps, below reseeds', () => {
  const spec = doc()
  const sd = rowsFor(spec, 'Variant').find((r) => r.id === 'r-sd')!
  const hd = rowsFor(spec, 'Variant').find((r) => r.id === 'r-hd')!
  const fp8 = rowsFor(spec, 'Quant').find((r) => r.id === 'q-fp8')!
  const recipe = rowsFor(spec, 'Recipe')[0]!
  // the SD pick: no overlay, variant stamps, quant reseeds first-composing
  expect(axisPickPatch(spec, sd)).toEqual({ variant: 'r-sd', quant: 'q-fp8' })
  // the HD pick: the steps overlay rides, the model re-point never lands in the user layer
  expect(axisPickPatch(spec, hd)).toEqual({ steps: 40, variant: 'r-hd', quant: 'q-fp8' })
  // the lowest axis reseeds nothing below it
  expect(axisPickPatch(spec, fp8)).toEqual({ quant: 'q-fp8' })
  // Recipe rows stamp no axis key (no Recipe field exists) — the macro overlay rides alone
  expect(axisPickPatch(spec, recipe)).toEqual({ steps: 50 })
})

test('axisPickPatch: a below-axis with nothing composing rests empty (never a foreign row)', () => {
  const spec: FormSpecDoc = {
    form: 'x',
    features: { variant_groups: { Variant: {}, Quant: {} } },
    variants: [V('r-hd', 'Variant', { owner: 'ghost' })],
  } as unknown as FormSpecDoc
  const hd = rowsFor(spec, 'Variant')[0]!
  expect(axisPickPatch(spec, hd)).toEqual({ variant: 'r-hd', quant: '' })
})

test('modelSwitchPatch: the same family keeps its coordinates; a switch clears every axis AND the mod bag (mods are per model)', () => {
  const spec = doc()
  // same family: the re-point match seats (SD), the chain seats (FP8),
  // and the lora bag rides untouched — same model, its own mods stay
  expect(modelSwitchPatch(spec, 'krea-2')).toEqual({ model: 'krea-2', variant: 'r-sd', quant: 'q-fp8' })
  // a re-pointed route is still a SWITCH (routes are not models):
  // EVERY axis clears AND the mod bag dies with its model — the drill
  // refetches the HD family's own spec, the departed bag never rides
  expect(modelSwitchPatch(spec, 'krea-2-hd')).toEqual({ model: 'krea-2-hd', variant: '', quant: '', loras: null })
  // a foreign family: EVERY axis clears, the bag dies (this spec's
  // rows AND its lora field are another family's currency)
  expect(modelSwitchPatch(spec, 'other')).toEqual({ model: 'other', variant: '', quant: '', loras: null })
  // no re-point union for the empty model: first-composing rows seat
  // (crossSpec false against itself — the bag law rides the switch
  // arms only, never the reseed)
  expect(modelSwitchPatch(spec, '')).toEqual({ model: '', steps: 40, variant: 'r-hd', quant: 'q-fp8' })
})

test('THE MOD BAG LAW (operator 2026-10-16: "MODS (LIKE LORAS) ARE PER MODEL. IF I SWITCH MODEL, KEEPING THE LORA ON MAKES ZERO SENSE")', () => {
  const spec = doc()
  const bag = [{ name: 'style.safetensors', strength: 0.8 }]
  // THE SEED'S FACE: a held doc whose model is not this spec's model
  // carries a FOREIGN bag — it drops; the same model keeps its own
  // (one argument: toHaveProperty(key, value) is a value match — a
  // second arg here would be the always-true disjunction the canon's
  // ACCURACY axis names)
  const foreign = seedUser(spec, { model: 'other', loras: bag, steps: 30 })
  expect(foreign).not.toHaveProperty('loras')
  expect(foreign['steps']).toBe(30)
  const own = seedUser(spec, { model: 'krea-2', loras: bag, steps: 30 })
  expect(own['loras']).toEqual(bag)
  // THE SWITCH'S FACE: the patch nulls the departing spec's array
  // fields (nulls DELETE at the write — the bag never survives a
  // cross-model switch, even onto a family that boards the same
  // mod kind)
  const patch = modelSwitchPatch(spec, 'other')
  expect(patch['loras']).toBeNull()
})

test('THE MODEL-SWITCH JOURNEY: a departed family\'s axis ids are ghosts — the arrival seed drops them (the 2026-10-16 lock)', () => {
  // THE OPERATOR'S JOURNEY, replayed end to end: krea-2 held (turbo
  // + int8 cell) → switch to anima whose turbo declares NO quant
  // cells → the switch's own write refused at the door (rev moved,
  // half-state) → the stage reopens holding the ghost — quant int8
  // rides the seed VERBATIM (the pass-along law) → every later edit
  // refuses at the compose gate — the door's unknown-quant voice
  // naming the known cells (the projection-honest spelling since
  // the axis-unification P0#1 cure; the served matrix's cells, not
  // a DECL fact). The pass-along law protects USER
  // WORDS; a departed family's row id is not one. The ghost drop in
  // seedUser is the cure; THIS arm is the journey proof — the seeded
  // arrival state must compose clean, not merely look clean.
  const kreaDoc: FormSpecDoc = {
    ...doc(),
    variants: [
      V('turbo', 'Variant', { defaults: {} }),
      V('int8', 'Quant', { quant: 'int8', owner: 'turbo' }),
    ],
  } as unknown as FormSpecDoc
  const animaDoc: FormSpecDoc = {
    ...doc(),
    model: 'anima',
    variants: [
      V('turbo', 'Variant', { defaults: {} }),
      // anima's turbo declares NO quant cells — no Quant row composes
    ],
  } as unknown as FormSpecDoc
  // the ghost state: krea's coordinates held under anima's model
  const held: SpecValues = { model: 'anima', variant: 'turbo', quant: 'int8' }
  const seeded = seedUser(animaDoc, held)
  // THE DROP: the departed family's quant id rides no composing row
  expect(seeded).not.toHaveProperty('quant')
  // THE JOURNEY'S END: the seeded state composes clean — no gate
  // refusal, no lock (the same judge the drill's write path rides)
  expect(composeValidate(animaDoc, seeded)).toEqual([])
  // the SAME held state against krea's own spec keeps its cell —
  // the drop judges the ARRIVAL spec, never the departed one
  const sameFamily = seedUser(kreaDoc, held)
  expect(sameFamily['quant']).toBe('int8')
})

test('modelSwitchPatch: a matched row overlay rides — except its model re-point (never the user layer)', () => {
  const spec: FormSpecDoc = {
    form: 'x',
    model: 'm',
    variants: [V('r', 'Variant', { defaults: { model: 'm', steps: 9 } })],
  } as unknown as FormSpecDoc
  expect(modelSwitchPatch(spec, 'm')).toEqual({ model: 'm', steps: 9, variant: 'r' })
})

// ORDER d WALL (operator 2026-11-06, third demand): the model-switch
// reseat. An envelope-LESS departure (anima/h3 — no sampler_envelope)
// nulls no vocabulary in modelSwitchPatch, so a stated-by-hand cfg 3.5
// rode the arrival seed verbatim into krea-2's turbo lane (cfg [1,2])
// and every door refused the card. The RE-KEY arm reseats at the
// arrival seed; a fresh open NEVER does (the pass-along law).
test('reseatEnvelopeKeys: stated out-of-envelope numerics clamp into the arrival lane; absent envelope rides verbatim', () => {
  const spec: FormSpecDoc = {
    form: 'x',
    model: 'krea-2',
    variants: [
      V('turbo', 'Variant', { sampler_envelope: { cfg: [1, 2], steps: [4, 8] } }),
    ],
  } as unknown as FormSpecDoc
  // stated-by-hand stale knobs (the two-hop incident's residue)
  const seated = reseatEnvelopeKeys(spec, { model: 'krea-2', variant: 'turbo', cfg: 3.5, steps: 52 })
  // (reseat-chrome W1, 2026-11-06) nearest bound EXACTLY, not a
  // range: 3.5 → 2, 52 → 8 (a lo-clamp regression stays green on ranges)
  expect(seated.cfg, 'stated cfg 3.5 reseats to the NEAREST bound: 2').toBe(2)
  expect(seated.steps, 'stated steps 52 reseats to the NEAREST bound: 8').toBe(8)
  // absent envelope: the seed rides VERBATIM (the pass-along law —
  // nothing judges, nothing rewrites)
  const plain: FormSpecDoc = {
    form: 'y',
    model: 'anima',
    variants: [V('base', 'Variant')],
  } as unknown as FormSpecDoc
  expect(reseatEnvelopeKeys(plain, { model: 'anima', variant: 'base', cfg: 3.5 })).toEqual({ model: 'anima', variant: 'base', cfg: 3.5 })
})

// (reseat-chrome M2, 2026-11-06) THE ABSENT-KEY SEED HALF: on a
// re-key whose arrival lane declares envelope numerics the user layer
// LACKS, the offered row's declared defaults (else model_defaults)
// seed the user layer — the lane's own truth, never an invented
// ghost. No arm anywhere drove reseatEnvelopeKeys with unstated
// numerics before this one.
test("reseatEnvelopeKeys: unstated envelope keys seed from the offered row's declared defaults — never invented", () => {
  const spec: FormSpecDoc = {
    form: 'x',
    model: 'krea-2',
    model_defaults: { steps: 51, cfg: 1.5 },
    variants: [
      V('raw', 'Variant', { sampler_envelope: { steps: [30, 60], cfg: [2, 6] }, defaults: { steps: 52, cfg: 3.5 } }),
    ],
  } as unknown as FormSpecDoc
  const seated = reseatEnvelopeKeys(spec, { model: 'krea-2', variant: 'raw' })
  expect(seated, 'the row\'s declared defaults seed (inside their envelope), not model_defaults').toEqual({ model: 'krea-2', variant: 'raw', steps: 52, cfg: 3.5 })
  // the no-declared-numerics cell: NOTHING seeds — absent stays absent
  const bare: FormSpecDoc = {
    form: 'y',
    model: 'anima',
    variants: [V('base', 'Variant', { sampler_envelope: { steps: [1, 9], cfg: [1, 2] } })],
  } as unknown as FormSpecDoc
  expect(reseatEnvelopeKeys(bare, { model: 'anima', variant: 'base' }), 'no declared default and no model_defaults: the key stays ABSENT').toEqual({ model: 'anima', variant: 'base' })
})

// (reseat-chrome M3, 2026-11-06) THE MIXED WRITE: free (non-envelope)
// stated keys ride VERBATIM while envelope-bound keys clamp in the
// SAME write — the reseat touches only the envelope's vocabulary.
test('reseatEnvelopeKeys: a MIXED doc clamps the bound key and passes the free key through untouched', () => {
  const spec: FormSpecDoc = {
    form: 'x',
    model: 'krea-2',
    variants: [
      V('turbo', 'Variant', { sampler_envelope: { steps: [4, 8], cfg: [1, 2] } }),
    ],
  } as unknown as FormSpecDoc
  const seated = reseatEnvelopeKeys(spec, { model: 'krea-2', variant: 'turbo', cfg: 3.5, steps: 52, guidance: 7 })
  expect(seated.guidance, 'guidance sits OUTSIDE the envelope vocabulary: rides verbatim').toBe(7)
  expect(seated.cfg, 'cfg IS the envelope vocabulary: clamps to the nearest bound').toBe(2)
  expect(seated.steps, 'steps IS the envelope vocabulary: clamps to the nearest bound').toBe(8)
})

test('modelSwitchPatch: an axis with nothing composing rests empty', () => {
  const spec: FormSpecDoc = {
    form: 'x',
    model: 'krea-2',
    features: { variant_groups: { Variant: {}, Precision: {} } },
    variants: [V('r-hd', 'Variant')],
  } as unknown as FormSpecDoc
  expect(modelSwitchPatch(spec, 'krea-2')).toEqual({ model: 'krea-2', variant: 'r-hd', precision: '' })
})

// THE EMPTY-SELECTION LAW's form half (2026-10-10): an axis with
// no composing row is UNSTATED — the seed OMITS the key. The old
// seed wrote '' and the add door wrote that as the stage's params:
// a bench stage born with quant:"", which the run door refuses
// ('unknown quant "" ... (known: int8)' — the operator's live face).
test('seedAxisValues: an axis with no composing row OMITS its key (never a stated "")', () => {
  const sparse: FormSpecDoc = {
    form: 'x',
    features: { variant_groups: { Precision: {} } },
    variants: [],
  } as unknown as FormSpecDoc
  expect(seedAxisValues(sparse, {})).toEqual({});
});

test('seedAxisValues: first-composing rows seed; the held always win; the family stamps the model', () => {
  const spec = doc()
  expect(seedAxisValues(spec, {})).toEqual({ variant: 'r-hd', quant: 'q-fp8', model: 'krea-2' })
  expect(seedAxisValues(spec, { variant: 'r-sd' })).toEqual({ variant: 'r-sd', quant: 'q-fp8', model: 'krea-2' })
  // a held string model is never overwritten (nor re-seeded — the user plane owns it)
  expect(seedAxisValues(spec, { model: 'other' })).toEqual({ variant: 'r-hd', quant: 'q-fp8' })
  // a held non-string model still seeds the served family
  expect(seedAxisValues(spec, { model: 7 })).toMatchObject({ model: 'krea-2' })
  // no axes, no seeds
  expect(seedAxisValues({ form: 'x' }, {})).toEqual({})
  // an axis with nothing composing stays UNSTATED — the key is
  // OMITTED (2026-10-10's empty-selection law: this arm used to
  // expect { precision: '' }, and that stated-empty is what the add
  // door wrote into a stage's params — the operator's live bench
  // refused at Run: 'unknown quant "" ... (known: int8)')
  // a familyless spec with a non-string held model stamps no model
  expect(seedAxisValues({ form: 'x' }, { model: 7 })).toEqual({})
})

test('THE THREE-AXIS CHAIN: an owner in a later axis skips the miss and still binds', () => {
  const spec: FormSpecDoc = {
    form: 'x',
    model: 'krea-2',
    features: { variant_groups: { A: {}, B: {}, C: {} } },
    variants: [V('ra', 'A', { owner: 'rc' }), V('rb', 'B'), V('rc', 'C')],
  } as unknown as FormSpecDoc
  // composing: B misses the owner, C names it — the row binds on the C selection
  expect(composingRows(spec, 'A', { C: 'rc' }).map((r) => r.id)).toEqual(['ra'])
  expect(composingRows(spec, 'A', { C: 'other' })).toEqual([])
  // active: the same walk resolves the row once its owner holds
  expect(activeRowId(spec, { model: 'krea-2' }, 'A', { C: 'rc' })).toBe('ra')
  expect(activeRowId(spec, { model: 'krea-2' }, 'A', { C: 'other' })).toBeUndefined()
})

test('seedUser: axes seed under the held bag; a poison recipe drops (the stamp never rides)', () => {
  const spec = doc()
  expect(seedUser(spec, { prompt: 'kept', recipe: 'dead-card' })).toEqual({
    prompt: 'kept',
    variant: 'r-hd',
    quant: 'q-fp8',
    model: 'krea-2',
    recipe: undefined,
  })
  // a schema that DECLARES recipe keeps the held pick (an ordinary multi-set)
  const withRecipe = {
    ...spec,
    schema: {
      uid: 0,
      refs: {
        0: { type: 'object', dict: { recipe: 1 } },
        1: { type: 'string', meta: {} },
      },
    },
  } as unknown as FormSpecDoc
  expect(seedUser(withRecipe, { recipe: 'macro-pick' })).toMatchObject({ recipe: 'macro-pick' })
})

// THE VERBATIM-STRING LAW (#36's settled shape): coerceFieldEdit
// rides '' VERBATIM (display continuity — each FACE owns its blank
// semantics at its own door: the studios' edit verb converts '' to
// the unset signal; the bench's run door refuses a blank loud).
// Pinned here at the shared coercion, pinned at the studio verb
// through the h3 rail's own suite.
test('THE EDIT COERCION: blank and unparseable strings ride verbatim', () => {
  const num = { name: 'steps', label: 'Steps', type: 'number' } as SpecField
  expect(coerceFieldEdit(num, '')).toBe('')
  expect(coerceFieldEdit(num, '  ')).toBe('  ')
  expect(coerceFieldEdit(num, '12')).toBe(12)
  expect(coerceFieldEdit(num, 'abc')).toBe('abc') // unparseable rides verbatim (the loud backstop)
  expect(coerceFieldEdit(undefined, '')).toBe('') // undeclared keys ride untouched (the mod bag's own law)
})

// ── composeValidate — THE DOOR-MIRRORED GATE (#37's second half):
// the client's a-priori compose lint must spell the SAME three
// clauses the run door judges: unknown variant (against the door's
// pool, Recipe/Quant rows excluded), unknown quant (against the
// RESOLVED variant's cells — never the still-held variant), and the
// sampler envelope (against the resolved variant's own domain).
// Every arm here constructs the refusal it names. ──

// the fixture with the two clauses the shared doc() lacks: an
// envelope-carrying variant and a Quant cell owned by the FIRST
// pool row (the unstated-variant default).
function gateDoc(): FormSpecDoc {
  const base = doc()
  return {
    ...base,
    variants: [
      ...(base.variants ?? []),
      V('r-env', 'Variant', { sampler_envelope: { steps: [1, 64], cfg: [1, 2] } }),
      V('q-env-only', 'Quant', { owner: 'r-hd' }),
    ],
  } as unknown as FormSpecDoc
}

test('composeValidate: an off-pool variant refuses naming the whole matrix (the door\'s honest law — D6)', () => {
  // the resolver consolidation (D6, 2026-10-17): the mirror and the
  // door call ONE resolver, so the miss voice names the matrix's own
  // ids — Recipe rows included, exactly the door's pinned voice
  // ('known: recipe, base, turbo'). The pre-consolidation mirror
  // hid Recipe from the list; that was the divergence, not the law.
  const out = composeValidate(gateDoc(), { variant: 'nope' })
  expect(out.length).toBe(1)
  expect(out[0]?.message).toBe(
    'card_compose: unknown variant "nope" for model "krea-2" (known: r-hd, r-sd, r-empty, recipe-x, r-env)',
  )
})

test('composeValidate: an unknown quant refuses against the RESOLVED variant, cells named', () => {
  const out = composeValidate(gateDoc(), { variant: 'r-hd', quant: 'zzz' })
  expect(out.length).toBe(1)
  expect(out[0]?.message).toBe(
    'card_compose: unknown quant "zzz" for model "krea-2" variant "r-hd" (known: q-hd-only, q-env-only)',
  )
})

test('composeValidate: an unstated variant is a RESOLUTION (pool[0]), never a skip — the quant is judged against it', () => {
  // unstated variant resolves r-hd; a stated quant that is no cell
  // of r-hd refuses, exactly as the door does after a half-switch
  const out = composeValidate(gateDoc(), { quant: 'zzz' })
  expect(out.length).toBe(1)
  expect(out[0]?.message).toContain('unknown quant "zzz" for model "krea-2" variant "r-hd"')
})

test('composeValidate: a route-spelled variant is legal at the door and legal here', () => {
  // every fixture row carries route 'krea-2' — the door matches id
  // OR route, and so must the mirror
  expect(composeValidate(gateDoc(), { variant: 'krea-2', quant: 'q-hd-only' })).toEqual([])
})

// A SERVED DOC WITH NO MODEL. FormSpecDoc.model is `string | null`
// (formSpec.ts:283 — "the Model axis' resting value and the run's
// family when no variant re-point has ridden"), so a doc whose family
// resolution left it unset is a legal served shape. The refusal must
// still speak, and it speaks the EMPTY model word — never "null",
// never a dropped clause.
test('composeValidate: a doc whose model is null refuses the variant with an empty model word', () => {
  const out = composeValidate({ ...gateDoc(), model: null } as unknown as FormSpecDoc, { variant: 'nope' })
  expect(out.length).toBe(1)
  expect(out[0]?.message).toBe(
    'card_compose: unknown variant "nope" for model "" (known: r-hd, r-sd, r-empty, recipe-x, r-env)',
  )
})

test('composeValidate: a doc whose model is null refuses the quant with an empty model word', () => {
  const out = composeValidate({ ...gateDoc(), model: null } as unknown as FormSpecDoc, { variant: 'r-hd', quant: 'zzz' })
  expect(out.length).toBe(1)
  expect(out[0]?.message).toBe(
    'card_compose: unknown quant "zzz" for model "" variant "r-hd" (known: q-hd-only, q-env-only)',
  )
})

test('composeValidate: the envelope clause fires against the RESOLVED variant, cure appended', () => {
  const out = composeValidate(gateDoc(), { variant: 'r-env', cfg: 9 })
  expect(out.length).toBe(1)
  expect(out[0]?.message).toBe(
    'card_compose: stated cfg 9 is OUTSIDE the route envelope for variant "r-env" (route krea-2) — the declared envelope is [1, 2]. '
      + 'The variant rail owns its sampler marriage: state values inside the envelope, or pick a different route.',
  )
  // inside the envelope: caller agency, no refusal
  expect(composeValidate(gateDoc(), { variant: 'r-env', cfg: 1.5 })).toEqual([])
})

test('composeValidate: a doc held by ANOTHER model is not this spec\'s law; a null spec judges nothing', () => {
  expect(composeValidate(gateDoc(), { model: 'other-model', variant: 'nope' })).toEqual([])
  // an EMPTY held model keeps judging (blank is not a handoff)
  expect(composeValidate(gateDoc(), { model: '', variant: 'nope' }).length).toBe(1)
  expect(composeValidate(null, { variant: 'nope' })).toEqual([])
})

// ── THE RECIPE BIRTH-STAMP (D12, the operator's "Default needs to
// be a 4 step LORA"): a fresh card is born stamped with the first
// composing Recipe row's payload — the axis seed writes axis keys
// only, and compose never applies recipe wire_defaults
// server-side. A doc with NO Recipe rows returns its seeds
// untouched (the stamp-less families); a doc WITH one stamps the
// payload for keys the seed does not hold. ──
test('seedRecipeStamp: no Recipe rows — the seeds ride untouched', () => {
  const bare = doc()
  bare.variants = (bare.variants ?? []).filter((v) => v.group !== 'Recipe')
  const seeds = { variant: 'r-hd', quant: 'q-fp8' }
  expect(seedRecipeStamp(bare, seeds)).toBe(seeds)
  // an axis-less doc: the loop never runs, still untouched
  expect(seedRecipeStamp({ form: 'x' } as FormSpecDoc, seeds)).toBe(seeds)
})

test('seedRecipeStamp: the DECLARED default recipe stamps its payload — model re-point and seeded axes never ride', () => {
  const d = doc()
  d.variants = [
    ...(d.variants ?? []).filter((v) => v.group !== 'Recipe'),
    V('standard', 'Recipe', {
      label: 'Standard',
      defaults: { model: 're-point-never-lands', variant: 'hijack-never-lands', steps: 4, loras: [{ id: 'h3_dmad_4step' }] },
    }),
    V('draft', 'Recipe', { label: 'Draft', defaults: {} }),
  ]
  d.features = { ...d.features, variant_groups: { ...(d.features?.variant_groups ?? {}), Recipe: { label: 'Recipe', default: 'standard' } } }
  // a stated-empty axis key is not active (the empty-selection law)
  const out = seedRecipeStamp(d, { variant: '', quant: 'q-fp8', model: 'krea-2' })
  expect(out).toMatchObject({ quant: 'q-fp8', model: 'krea-2', steps: 4, loras: [{ id: 'h3_dmad_4step' }] })
  expect(out['variant']).toBe('')
  // a non-string seed layer passes through to the same stamp
  const out2 = seedRecipeStamp(d, { quant: 'q-fp8' })
  expect(out2).toMatchObject({ steps: 4 })
})

test('seedRecipeStamp: the initial recipe is DECL-DECLARED, never row-order-emergent (k, 2026-11-08 — the declared row stamps even when NOT first; no declaration = blank)', () => {
  // THE ONE LAW (ERRORS.md (k) cure): a card's first-render recipe
  // is a DECLARED fact — the family names its default Recipe row on
  // the variant_groups contract (features.variant_groups.Recipe.default,
  // served from the DECL by groupContract), the birth stamp takes
  // the DECLARED row, and an undeclared family starts BLANK. The
  // old emergent first-row law is dead: row order is presentation,
  // never state.
  const d = doc()
  d.variants = [
    ...(d.variants ?? []).filter((v) => v.group !== 'Recipe'),
    V('draft', 'Recipe', { label: 'Draft', defaults: { steps: 4 } }),
    V('standard', 'Recipe', {
      label: 'Standard',
      defaults: { steps: 8, loras: [{ id: 'h3_turbo8_v1' }] },
    }),
  ]
  d.features = { ...d.features, variant_groups: { ...(d.features?.variant_groups ?? {}), Recipe: { label: 'Recipe', default: 'standard' } } }
  // the DECLARED row stamps — even though draft declares first
  const out = seedRecipeStamp(d, { variant: '', quant: 'q-fp8' })
  expect(out).toMatchObject({ steps: 8, loras: [{ id: 'h3_turbo8_v1' }] })
  expect(out['steps']).toBe(8)
  // no declaration → BLANK: the row exists, the stamp does not ride
  const undeclared = doc()
  undeclared.variants = [
    ...(undeclared.variants ?? []).filter((v) => v.group !== 'Recipe'),
    V('only', 'Recipe', { label: 'Only', defaults: { steps: 4 } }),
  ]
  expect(seedRecipeStamp(undeclared, { quant: 'q-fp8' })).toEqual({ quant: 'q-fp8' })
})

// ── THE DEPARTED-PRESET RESEAT (D4, 2026-11-06 — the four-time
// recurrence: "switch between recipes. THEY ARE ALL LOSE
// RESOLUTION") ──────────────────────────────────────────────────
// A preset OWNS its stamps while it is the named pick: Draft's
// 768×448 rode under Standard and Final Cut forever because
// patch-only rows never unstate. The reseat nulls a departed row's
// residue (held value still equal to the departed stamp); a
// hand-edit is the user's word and stands. Scoped to NON-AXIS
// groups — the chain groups belong to the envelope law.
test('axisPickPatch: departing a recipe unstated its residue (null deletes at compose)', () => {
  const spec = {
    form: 'x',
    model: 'krea-2',
    schema: {
      uid: 0,
      refs: {
        0: { type: 'object', dict: { prompt: 1, steps: 2, width: 3, height: 4, sr_switch: 5 } },
        1: { type: 'string', meta: { default: 'a cat' } },
        2: { type: 'number', meta: { default: 20 } },
        3: { type: 'number', meta: { default: 1344 } },
        4: { type: 'number', meta: { default: 768 } },
        5: { type: 'boolean', meta: { default: false } },
      },
    },
    features: { variant_groups: { Recipe: { label: 'Recipe' } } },
    variants: [
      V('draft', 'Recipe', { label: 'Draft', defaults: { model: 'krea-2', width: 768, height: 448 } }),
      V('standard', 'Recipe', { label: 'Standard', defaults: { model: 'krea-2', steps: 30 } }),
      V('final', 'Recipe', { label: 'Final Cut', defaults: { model: 'krea-2', steps: 4, sr_switch: true } }),
    ],
  } as unknown as FormSpecDoc
  const rows = rowsFor(spec, 'Recipe')
  const draft = rows.find((r) => r.id === 'draft')!
  const standard = rows.find((r) => r.id === 'standard')!
  const final = rows.find((r) => r.id === 'final')!
  // THE ARMS RIDE THE PUBLIC VERB (write-then-pick — never a
  // hand-fed `recipe` literal; audit 0be61df8 F2: the old arms fed a
  // key no writer produces, so they certified a precondition
  // production never reaches). `held` is what the PREVIOUS PICK
  // actually wrote.
  const heldFromDraft = axisPickPatch(spec, draft, {})
  expect(heldFromDraft).toEqual({ width: 768, height: 448 })
  // THE LAW: draft's 768×448 still held verbatim → picking final
  // unstated BOTH (the carrier floor shows again), while final's own
  // stamps ride as values. The model re-point never lands (stroke 21).
  expect(axisPickPatch(spec, final, heldFromDraft)).toEqual({
    steps: 4, sr_switch: true, width: null, height: null,
  })
  // STATED-BY-HAND: a width the operator edited away from the stamp
  // is THEIR word — the pick does not unstate it, while the untouched
  // height (still equal to draft's stamp) does unstate.
  expect(axisPickPatch(spec, final, { ...heldFromDraft, width: 1024 })).toEqual({
    steps: 4, sr_switch: true, height: null,
  })
  // NO DEPARTURE: re-picking the row the doc already holds unstated
  // nothing (the held layer IS the incoming row's own roster).
  const heldFromFinal = axisPickPatch(spec, final, {})
  expect(axisPickPatch(spec, final, heldFromFinal)).toEqual({
    steps: 4, sr_switch: true,
  })
  // THE DERIVED IDENTITY (2026-10-16, F2's cure): a held layer
  // carrying a sibling's roster IS a departure even with no identity
  // key — the identity is derived from the values, which is why the
  // reseat works without a channel nothing writes. Draft's stamps are
  // held verbatim → picking standard returns the family floor for
  // both (the composability the operator asked for).
  expect(axisPickPatch(spec, standard, { width: 768, height: 448 })).toEqual({
    steps: 30, width: null, height: null,
  })
  // A STALE IDENTITY KEY (names a row the spec no longer serves) is
  // not the law — the derivation still reads the roster the doc
  // carries, so the departure is found.
  expect(axisPickPatch(spec, standard, { recipe: 'ghost', width: 768 })).toEqual({
    steps: 30, width: null,
  })
})

test('axisPickPatch: the reseat never fires on an axis group (the envelope law owns the chain)', () => {
  const spec = {
    form: 'x',
    model: 'krea-2',
    schema: { uid: 0, refs: { 0: { type: 'object', dict: { steps: 1 } }, 1: { type: 'number', meta: { default: 20 } } } },
    features: { variant_groups: { Variant: { label: 'Variant' } } },
    variants: [
      V('r-hd', 'Variant', { label: 'HD', defaults: { model: 'krea-2', steps: 40 } }),
      V('r-sd', 'Variant', { label: 'SD', defaults: { model: 'krea-2', steps: 10 } }),
    ],
  } as unknown as FormSpecDoc
  const hd = rowsFor(spec, 'Variant').find((r) => r.id === 'r-hd')!
  const sd = rowsFor(spec, 'Variant').find((r) => r.id === 'r-sd')!
  // a departed variant's differing stamp NEVER nulls through the
  // reseat — the envelope reconcile judges numerics its own way and
  // null never appears in a chain pick's patch
  const patch = axisPickPatch(spec, sd, { variant: 'r-hd', steps: 40 })
  expect(Object.values(patch).includes(null)).toBe(false)
  expect(patch['variant']).toBe('r-sd')
})
