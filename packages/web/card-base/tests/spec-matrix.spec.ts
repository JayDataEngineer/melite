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
  seedRecipeStamp,
  seedUser,
  variantGroupsContract,
  variantRows,
  type FormSpecDoc,
  type SpecField,
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

test('modelSwitchPatch: the same family keeps its coordinates; a switch clears every axis', () => {
  const spec = doc()
  // same family: the re-point match seats (SD), the chain seats (FP8)
  expect(modelSwitchPatch(spec, 'krea-2')).toEqual({ model: 'krea-2', variant: 'r-sd', quant: 'q-fp8' })
  // a re-pointed route is still a SWITCH (routes are not models):
  // EVERY axis clears — the drill refetches the HD family's own spec
  expect(modelSwitchPatch(spec, 'krea-2-hd')).toEqual({ model: 'krea-2-hd', variant: '', quant: '' })
  // a foreign family: EVERY axis clears (this spec's rows are another family's)
  expect(modelSwitchPatch(spec, 'other')).toEqual({ model: 'other', variant: '', quant: '' })
  // no re-point union for the empty model: first-composing rows seat
  expect(modelSwitchPatch(spec, '')).toEqual({ model: '', steps: 40, variant: 'r-hd', quant: 'q-fp8' })
})

test('modelSwitchPatch: a matched row overlay rides — except its model re-point (never the user layer)', () => {
  const spec: FormSpecDoc = {
    form: 'x',
    model: 'm',
    variants: [V('r', 'Variant', { defaults: { model: 'm', steps: 9 } })],
  } as unknown as FormSpecDoc
  expect(modelSwitchPatch(spec, 'm')).toEqual({ model: 'm', steps: 9, variant: 'r' })
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

test('composeValidate: an off-pool variant refuses naming the door pool (Recipe excluded)', () => {
  const out = composeValidate(gateDoc(), { variant: 'nope' })
  expect(out.length).toBe(1)
  expect(out[0]?.message).toBe(
    'card_compose: unknown variant "nope" for model "krea-2" (known: r-hd, r-sd, r-empty, r-env)',
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
    'card_compose: unknown variant "nope" for model "" (known: r-hd, r-sd, r-empty, r-env)',
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

test('seedRecipeStamp: the first composing recipe stamps its payload — model re-point and seeded axes never ride', () => {
  const d = doc()
  d.variants = [
    ...(d.variants ?? []).filter((v) => v.group !== 'Recipe'),
    V('standard', 'Recipe', {
      label: 'Standard',
      defaults: { model: 're-point-never-lands', variant: 'hijack-never-lands', steps: 4, loras: [{ id: 'h3_dmad_4step' }] },
    }),
    V('draft', 'Recipe', { label: 'Draft', defaults: {} }),
  ]
  // a stated-empty axis key is not active (the empty-selection law)
  const out = seedRecipeStamp(d, { variant: '', quant: 'q-fp8', model: 'krea-2' })
  expect(out).toMatchObject({ quant: 'q-fp8', model: 'krea-2', steps: 4, loras: [{ id: 'h3_dmad_4step' }] })
  expect(out['variant']).toBe('')
  // a non-string seed layer passes through to the same stamp
  const out2 = seedRecipeStamp(d, { quant: 'q-fp8' })
  expect(out2).toMatchObject({ steps: 4 })
})
