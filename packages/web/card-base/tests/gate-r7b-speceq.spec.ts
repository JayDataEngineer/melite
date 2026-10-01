// spec-matrix-adjacent pure-function harness (no DOM).
// gate-r7b-speceq.spec.ts — GATE R7B (spec.ts dark arms): the
// durable Recipe-axis skip in activeRecipeId and every
// deepEqualJson arm (@deepseek-ai/dsh-util-values), driven through the exported
// activeRecipeId with recipe rows stamping arrays/objects/
// primitives. Mirrors spec-matrix.spec.ts's doc/V fixtures.
import { expect, test } from 'vitest'

import {
  activeRecipeId,
  type FormSpecDoc,
  type VariantRow,
} from '../src/spec.ts'

const V = (id: string, group: string, extra: Partial<VariantRow> = {}): VariantRow => ({
  id,
  label: id,
  group,
  defaults: {},
  route: 'krea-2',
  ...extra,
})

/** A served doc WITHOUT the Recipe axis (the common card): recipe
 *  patches carry only their declared-knob stamps. */
function doc(rows: VariantRow[]): FormSpecDoc {
  return {
    form: 'txt2img',
    model: 'krea-2',
    features: {
      variant_groups: { Variant: { label: 'Variant' } },
    },
    variants: [V('v-base', 'Variant', { label: 'Base' }), ...rows],
  } as unknown as FormSpecDoc
}

const BAG = [{ id: 'a', strength: 0.5 }]
const CFG = { a: 1, b: 2 }

test('THE RECIPE-AXIS SKIP: a patch carrying the durable key skips it (never compared)', () => {
  // Recipe never rides as an axis (the recipe-axis yield), so the
  // durable key arrives only when the ROW ITSELF stamps a `recipe`
  // knob — the matcher skips it (the run door refuses an
  // undeclared `recipe` param), while the declared knobs still gate.
  const spec = doc([V('r-x', 'Recipe', { label: 'X', defaults: { steps: 50, recipe: 'r-x' } })])
  // the held layer carries NO recipe key at all — the stamp still matches
  expect(activeRecipeId(spec, { steps: 50 })).toBe('r-x')
  // a mismatched recipe key does not disturb the match either (it is
  // skipped, never compared — a comparison would fail here)
  expect(activeRecipeId(spec, { steps: 50, recipe: 'something-else-entirely' })).toBe('r-x')
  // but the declared-knob stamp still gates: a moved steps is no recipe
  expect(activeRecipeId(spec, { steps: 999, recipe: 'r-x' })).toBeUndefined()
})

test('deepEqualJson ARRAYS: a stamp-for-stamp bag matches (element recursion holds)', () => {
  const spec = doc([V('r-bag', 'Recipe', { label: 'Bag', defaults: { loras: BAG } })])
  expect(activeRecipeId(spec, { loras: [{ id: 'a', strength: 0.5 }] })).toBe('r-bag')
})

test('deepEqualJson ARRAYS: length mismatch never matches', () => {
  const spec = doc([V('r-bag', 'Recipe', { label: 'Bag', defaults: { loras: BAG } })])
  expect(activeRecipeId(spec, { loras: [] })).toBeUndefined()
  expect(activeRecipeId(spec, { loras: [...BAG, { id: 'b', strength: 0.7 }] })).toBeUndefined()
})

test('deepEqualJson ARRAYS: an element drifting off the stamp never matches', () => {
  const spec = doc([V('r-bag', 'Recipe', { label: 'Bag', defaults: { loras: BAG } })])
  expect(activeRecipeId(spec, { loras: [{ id: 'a', strength: 0.9 }] })).toBeUndefined()
})

test('deepEqualJson ARRAYS: array-vs-not-array never matches, either direction', () => {
  const bag = doc([V('r-bag', 'Recipe', { label: 'Bag', defaults: { loras: BAG } })])
  expect(activeRecipeId(bag, { loras: 'nope' })).toBeUndefined()
  const prim = doc([V('r-prim', 'Recipe', { label: 'Prim', defaults: { steps: 7 } })])
  expect(activeRecipeId(prim, { steps: [7] })).toBeUndefined()
})

test('deepEqualJson OBJECTS: null never equals a stamped object, either direction', () => {
  const stamped = doc([V('r-cfg', 'Recipe', { label: 'Cfg', defaults: { cfg: CFG } })])
  expect(activeRecipeId(stamped, { cfg: null })).toBeUndefined()
  const nulled = doc([V('r-null', 'Recipe', { label: 'Null', defaults: { cfg: null } })])
  expect(activeRecipeId(nulled, { cfg: { a: 1 } })).toBeUndefined()
})

test('deepEqualJson OBJECTS: a key-count drift never matches', () => {
  const spec = doc([V('r-cfg', 'Recipe', { label: 'Cfg', defaults: { cfg: CFG } })])
  expect(activeRecipeId(spec, { cfg: { a: 1 } })).toBeUndefined()
  expect(activeRecipeId(spec, { cfg: { a: 1, b: 2, c: 3 } })).toBeUndefined()
})

test('deepEqualJson OBJECTS: a per-key drift never matches; the full stamp does', () => {
  const spec = doc([V('r-cfg', 'Recipe', { label: 'Cfg', defaults: { cfg: CFG } })])
  expect(activeRecipeId(spec, { cfg: { a: 1, b: 999 } })).toBeUndefined()
  expect(activeRecipeId(spec, { cfg: { a: 1, b: 2 } })).toBe('r-cfg')
})

test('deepEqualJson PRIMITIVES: the stamp matches, a moved knob does not', () => {
  const spec = doc([V('r-prim', 'Recipe', { label: 'Prim', defaults: { steps: 7 } })])
  expect(activeRecipeId(spec, { steps: 7 })).toBe('r-prim')
  expect(activeRecipeId(spec, { steps: 8 })).toBeUndefined()
})
