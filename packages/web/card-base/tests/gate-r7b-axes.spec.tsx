// @vitest-environment happy-dom
// gate-r7b-axes.spec.tsx — GATE R7b: RecipePills' three dark arms
// (axes.tsx:285 values-undefined, :288 unknown-id return, :300
// empty-select skip). Every row renders the real dropdown and
// asserts real behavior — never a bare call.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { FormSpecDoc, FormVariantRow } from '../src/spec.ts'
import { RecipePills } from '../src/axes.tsx'

afterEach(cleanup)

const V = (id: string, group: string, extra: Partial<FormVariantRow> = {}): FormVariantRow => ({
  id,
  label: id,
  group,
  defaults: {},
  route: 'krea-2',
  ...extra,
} as FormVariantRow)

/** The matrix doc (mirrors form-axes.spec's served shape — recipe-x
 *  carries a knob stamp, so the dropdown renders). */
function doc(): FormSpecDoc {
  return {
    form: 'txt2img',
    model: 'krea-2',
    model_defaults: { steps: 30 },
    schema: {
      uid: 0,
      refs: {
        0: { type: 'object', dict: { prompt: 1, steps: 2 } },
        1: { type: 'string', meta: { description: 'Prompt', default: 'a cat' } },
        2: { type: 'number', meta: { default: 20, step: 1 } },
      },
    },
    features: {
      variant_groups: { Variant: { label: 'Variant' }, Quant: { label: 'Quant' } },
    },
    variants: [
      V('r-hd', 'Variant', { label: 'HD', hint: 'crisp', defaults: { model: 'krea-2-hd', steps: 40 } }),
      V('q-fp8', 'Quant', { label: 'FP8' }),
      V('recipe-x', 'Recipe', { label: 'X', hint: 'the macro', defaults: { steps: 50 } }),
      V('recipe-sr', 'Recipe', { label: 'Finish', hint: 'the t4r-dead stamp', defaults: { sr_switch: true } }),
    ],
    packs: [{ id: 'upscale', present: true }],
  } as unknown as FormSpecDoc
}

test('RECIPE: absent values layer shows the placeholder (never a grounded lie)', () => {
  // axes.tsx:285 — values undefined takes the `: undefined` arm: the
  // selection derives from the user layer, and with no layer there is
  // never a recipe to claim.
  const onPick = vi.fn()
  render(h(RecipePills, { spec: doc(), onPick }))
  const trigger = screen.getByLabelText('Recipe') as HTMLButtonElement
  expect(trigger.textContent).toBe('-- recipe --')
  expect(onPick).not.toHaveBeenCalled()
})

test('RECIPE: a change to an unoffered id writes nothing (never a pick from thin air)', () => {
  // axes.tsx:288 — pick('ghost-recipe') finds no row and returns: a
  // stale DOM option (a spec swap landing under an open select)
  // cannot stamp knobs the card never declared.
  const onPick = vi.fn()
  render(h(RecipePills, { spec: doc(), values: {}, onPick }))
  // THE MENU LAW (S7e): the stale-option seam is native-select
  // plumbing — a Menu's rows derive from the spec each render, so
  // an unoffered id has NO row and the pick is structurally
  // impossible (never filtered at write time).
  fireEvent.click(screen.getByLabelText('Recipe'))
  expect(screen.queryByRole('menuitem', { name: 'Ghost' })).toBeNull()
  expect(onPick).not.toHaveBeenCalled()
})

test('RECIPE BLANK WRITE (k, 2026-11-08): picking the blank row with a recipe held applies the active row\'s departure (null-set — the blank is a WRITE, never a persisted recipe key)', () => {
  // THE BURN (ERRORS.md (k)): once a recipe stamps, no seat returns
  // the card to no-recipe — the blank was a face with no write. The
  // cure: the menu\'s blank row carries the D4 departure verb — every
  // key the ACTIVE row stamps that the held layer still carries at
  // the stamp value unstated (null deletes at compose); a hand-edited
  // value is the user\'s word and stands. Pinned here on the held
  // stamp { steps: 50 } (recipe-x\'s own payload): the blank pick
  // writes { steps: null } — and NEVER a `recipe` key.
  const onPick = vi.fn()
  render(h(RecipePills, { spec: doc(), values: { steps: 50 }, onPick }))
  fireEvent.click(screen.getByLabelText('Recipe'))
  fireEvent.click(screen.getByRole('menuitem', { name: /Blank/ }))
  expect(onPick).toHaveBeenCalledTimes(1)
  expect(onPick).toHaveBeenCalledWith({ steps: null })
  const patch = onPick.mock.calls[0]![0] as Record<string, unknown>
  expect('recipe' in patch).toBe(false)
})

test('RECIPE BLANK IDEMPOTENCE: re-picking blank with NOTHING held writes nothing (the departure of nothing is nothing)', () => {
  // axes.tsx\'s empty-select skip, restated under the blank-write law:
  // with no active recipe there is no departure to apply — the blank
  // pick stays a no-op (the placeholder is a face, never a stamp).
  const onPick = vi.fn()
  render(h(RecipePills, { spec: doc(), values: {}, onPick }))
  fireEvent.click(screen.getByLabelText('Recipe'))
  fireEvent.click(screen.getByRole('menuitem', { name: /Blank/ }))
  expect(onPick).not.toHaveBeenCalled()
})

test('RECIPE ROW GATE (2026-10-16, the Final Cut brick — audit 0be61df8 F1): an omitRow predicate removes the row from the menu (a lane that cannot honor a stamp never offers it)', () => {
  // THE BURN: the D8 field gate stopped serving t4r-dead knobs, but
  // the pills stayed ungated — h3's Final Cut stamps sr_switch, a
  // guided one-call doc derives t4r, the walk refuses the stamp, and
  // every later run bricked. The row gate is judged on the row's OWN
  // stamp by the host; this arm pins the FILTER ITSELF: with the
  // predicate returning true for the stamp-carrying row, the menu
  // offers NO such row — the pick is structurally impossible, the
  // same menu law the stale-option arm pins.
  const onPick = vi.fn()
  // the host's predicate shape (RunRecipeEngine's own): a row whose
  // stamp intersects the family-dead keys is omitted
  const omitRow = (row: FormVariantRow): boolean =>
    Object.keys((row as unknown as { defaults?: Record<string, unknown> }).defaults ?? {})
      .includes('sr_switch')
  render(h(RecipePills, { spec: doc(), values: {}, onPick, omitRow }))
  fireEvent.click(screen.getByLabelText('Recipe'))
  // the gated row is structurally absent; its lawful sibling remains
  expect(screen.queryByRole('menuitem', { name: /t4r-dead stamp/ })).toBeNull()
  // Q2 bare name: the lawful sibling's face is the bare name (the hint
  // prose stays in the DECL)
  expect(screen.queryByRole('menuitem', { name: /^X$/ })).not.toBeNull()
  // (k, 2026-11-08) the blank row keeps its no-op with nothing held —
  // the menu voice is the selectable blank, the write law is pinned
  // by the BLANK WRITE arm above.
  fireEvent.click(screen.getByRole('menuitem', { name: /Blank/ }))
  expect(onPick).not.toHaveBeenCalled()
})
