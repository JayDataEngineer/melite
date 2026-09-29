// @vitest-environment happy-dom
// gate-r7b-axes.spec.tsx — GATE R7b: RecipePills' three dark arms
// (axes.tsx:285 values-undefined, :288 unknown-id return, :300
// empty-select skip). Every row renders the real dropdown and
// asserts real behavior — never a bare call.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { FormSpecDoc, VariantRow } from '../src/spec.ts'
import { RecipePills } from '../src/axes.tsx'

afterEach(cleanup)

const V = (id: string, group: string, extra: Partial<VariantRow> = {}): VariantRow => ({
  id,
  label: id,
  group,
  defaults: {},
  route: 'krea-2',
  ...extra,
} as VariantRow)

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
  const select = screen.getByRole('combobox', { name: 'Recipe' }) as HTMLSelectElement
  expect(select.value).toBe('')
  expect(screen.getByText('-- recipe --')).not.toBeNull()
  expect(onPick).not.toHaveBeenCalled()
})

test('RECIPE: a change to an unoffered id writes nothing (never a pick from thin air)', () => {
  // axes.tsx:288 — pick('ghost-recipe') finds no row and returns: a
  // stale DOM option (a spec swap landing under an open select)
  // cannot stamp knobs the card never declared.
  const onPick = vi.fn()
  render(h(RecipePills, { spec: doc(), values: {}, onPick }))
  const select = screen.getByRole('combobox', { name: 'Recipe' }) as HTMLSelectElement
  const stale = document.createElement('option')
  stale.value = 'ghost-recipe'
  stale.textContent = 'Ghost'
  select.appendChild(stale)
  let seen = ''
  select.addEventListener('change', (e) => { seen = (e.target as HTMLSelectElement).value })
  fireEvent.change(select, { target: { value: 'ghost-recipe' } })
  expect(seen).toBe('ghost-recipe')
  expect(onPick).not.toHaveBeenCalled()
})

test('RECIPE: re-picking the placeholder writes nothing (the empty-select skip)', () => {
  // axes.tsx:300 — onChange with '' takes the skip arm: the
  // placeholder is a face, never a stamp.
  const onPick = vi.fn()
  render(h(RecipePills, { spec: doc(), values: {}, onPick }))
  const select = screen.getByRole('combobox', { name: 'Recipe' }) as HTMLSelectElement
  fireEvent.change(select, { target: { value: 'recipe-x' } })
  expect(onPick).toHaveBeenCalledWith({ steps: 50 })
  onPick.mockClear()
  fireEvent.change(select, { target: { value: '' } })
  expect(onPick).not.toHaveBeenCalled()
})
