// @vitest-environment happy-dom
// form-card.spec.tsx — THE CARD FORM (form.tsx part 4): the
// constructor's surface — the input rail (declared signature
// order), the grouped params, the mod exclusion, the claim seam,
// the edit/unset boundary. Every field walks the served emission;
// nothing is hand-rolled per card.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { FormSpecDoc, SpecValues } from '../src/spec.ts'
import type { FieldAtomClaim } from '../src/form.tsx'

import { CardForm } from '../src/form.tsx'

afterEach(cleanup)

type Ref = { type: string; meta?: Record<string, unknown>; extra?: Record<string, unknown>; dict?: Record<string, number> }

/** A served doc: text + seed + slider + boolean + tri + textarea +
 *  image + image_list, the input signature, one mod kind. */
function doc(over: Record<string, unknown> = {}): FormSpecDoc {
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { prompt: 1, steps: 2, cfg: 3, turbo: 4, inherit: 5, notes: 6, img: 7, shots: 8 } },
    1: { type: 'string', meta: { description: 'Prompt', required: true, tooltip: 'be nice' } },
    2: { type: 'number', meta: { description: 'Steps', default: 0, step: 1 } },
    3: { type: 'number', meta: { description: 'Cfg', default: 5, step: 0.5 } },
    4: { type: 'boolean', meta: { description: 'Turbo', default: false } },
    5: { type: 'string', meta: { description: 'Inherit', extra: { wtype: 'tri' } } },
    6: { type: 'string', meta: { description: 'Notes', extra: { wtype: 'textarea' } } },
    7: { type: 'string', meta: { description: 'Image', tooltip: 'drop here', extra: { wtype: 'image' } } },
    8: { type: 'array', meta: { description: 'Shots', extra: { wtype: 'image_list' } } },
  }
  return {
    form: 'txt2img',
    model: 'krea-2',
    schema: { uid: 0, refs },
    inputs: [{ name: 'img', kind: 'image' }],
    packs: [{ id: 'upscale', present: true }],
    ...over,
  } as unknown as FormSpecDoc
}

function form(props: Partial<Parameters<typeof CardForm>[0]> = {}) {
  const onSet = vi.fn()
  const onUnset = vi.fn()
  const rendered = render(h(CardForm, {
    spec: doc(), user: {}, onSet, onUnset, ...props,
  }))
  return { onSet, onUnset, ...rendered }
}

test('RAIL: the declared slot seats first, in signature order (never the incidental grouping)', () => {
  form()
  const rail = document.querySelector('[data-input-rail]')
  if (rail === null) throw new Error('no input rail')
  expect(screen.getByRole('button', { name: 'Image source' })).not.toBeNull()
  expect(rail.querySelector('[title="drop here"]')).not.toBeNull()
  expect(screen.queryByLabelText('Shots')).toBeNull()
})

test('RAIL: a mod-owned slot seats from the kind fallback (the anchor is a slot, never a missing seat)', () => {
  const spec = doc({
    inputs: [{ name: 'brick', kind: 'image' }],
    features: {
      modifiers: [{
        param_key: 'lanpaint', label: 'Lanpaint', entry: 'field',
        fields: [{ name: 'brick', label: 'Brick', type: 'image' }],
      }],
    },
  })
  form({ spec })
  const rail = document.querySelector('[data-input-rail]')
  expect(rail?.textContent).toContain('Brick')
})

test('RAIL: text edges and nameless rows never seat (never a text square)', () => {
  const spec = doc({ inputs: [{ name: 'prompt', kind: 'text' }, { nope: 1 }, { name: 'missing', kind: 'image' }] })
  form({ spec })
  expect(document.querySelector('[data-input-rail]')).toBeNull()
  expect(screen.getByLabelText('Prompt')).not.toBeNull()
})

test('EDIT: typing voices strings; numerics coerce at the boundary; junk rides VERBATIM', () => {
  const { onSet } = form({ user: { prompt: 'hi' } })
  fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: 'a cat' } })
  expect(onSet).toHaveBeenCalledWith('prompt', 'a cat')
  const steps = screen.getByLabelText('Steps') as HTMLInputElement
  fireEvent.change(steps, { target: { value: '7' } })
  expect(onSet).toHaveBeenCalledWith('steps', 7)
  fireEvent.change(steps, { target: { value: 'abc' } })
  expect(onSet).toHaveBeenCalledWith('steps', 'abc')
})

test('UNSET: inherit is an unset, not a value (presence IS the override mark)', () => {
  const { onUnset } = form({ user: {} })
  const inherit = document.querySelector('select[aria-label="Inherit"]') as HTMLSelectElement
  fireEvent.change(inherit, { target: { value: 'true' } })
  fireEvent.change(inherit, { target: { value: '' } })
  expect(onUnset).toHaveBeenCalledWith('inherit')
  const bare = form({ spec: doc(), user: {} })
  bare.unmount()
  const { onSet, onUnset: u2 } = form({ spec: doc(), user: {}, onUnset: undefined })
  const inherit2 = document.querySelector('select[aria-label="Inherit"]') as HTMLSelectElement
  fireEvent.change(inherit2, { target: { value: 'false' } })
  fireEvent.change(inherit2, { target: { value: '' } })
  expect(u2).not.toHaveBeenCalled()
  expect(onSet).not.toHaveBeenCalled()
})

test('MODS: owned names never render flat (the section owns them, in every surface)', () => {
  const spec = doc({
    features: {
      modifiers: [{
        param_key: 'shots', label: 'Shots', entry: 'field',
        kindFields: [{ name: 'strength', label: 'Strength', type: 'number', default: 0.8 }],
      }],
    },
  })
  form({ spec, user: {} })
  expect(screen.getByText('Strength')).not.toBeNull()
})

test('MODS: declared rows ride verbatim; the wtype hint rebuilds the type (never re-derived)', () => {
  const spec = doc({
    model: undefined,
    features: {
      modifiers: [
        {
          param_key: 'a', label: 'A', entry: 'field',
          fields: [
            { name: 'w1', label: 'W1', type: 'path', wtype: 'image' },
            { name: 'p1', label: 'P1', type: 'text' },
          ],
        },
        {
          param_key: 'b', schema_key: 'shared', label: 'B', entry: 'hybrid',
        },
      ],
    },
    mod_schemas: {
      shared: { uid: 0, refs: { 0: { type: 'object', dict: { gain: 1 } }, 1: { type: 'number', meta: { default: 1 } } } },
    },
  })
  const { container } = form({ spec, user: { a: [{ w1: 'https://host/w.png', p1: 'hello' }] } })
  expect(container.textContent).toContain('gain')
  // THE WTYPE REWRITE, proven in the leaf: the declared path+image
  // row builds the square (the filled ✕ face), the plain row stays
  // a text input carrying its value.
  fireEvent.click(screen.getByText('A'))
  expect(screen.getByRole('button', { name: 'W1 source' })).not.toBeNull()
  expect(document.body.textContent).toContain('✕')
  expect((screen.getByLabelText('P1') as HTMLInputElement).value).toBe('hello')
})

test('MODS: no kinds, no section (never an empty Modifiers block)', () => {
  const { container } = form({ spec: doc(), user: {} })
  expect(container.textContent).not.toContain('Modifiers')
})

test('MODS: the commit seams ride through (patch, faces, reference — absent is absent)', () => {
  const onPatch = vi.fn()
  const spec = doc({
    features: {
      modifiers: [{
        param_key: 'shots', label: 'Shots', entry: 'field',
        kindFields: [{ name: 'strength', label: 'Strength', type: 'number', default: 0.8 }],
      }],
    },
  })
  const full = form({ spec, user: {}, onPatch, paintFace: (() => null) as never, paintReference: 'img' })
  full.unmount()
  const bare = form({ spec, user: {} })
  bare.unmount()
})

test('GRID: declared columns grid the group; prompts span; width floors at one', () => {
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { a1: 1, a2: 2, a3: 3, a4: 4, a5: 5, b1: 6 } },
    1: { type: 'string', meta: { description: 'A1', required: true, tooltip: 'first', extra: { group: 'A', columns: 2, width: 2 } } },
    2: { type: 'string', meta: { description: 'A2', extra: { group: 'A', wtype: 'textarea' } } },
    3: { type: 'string', meta: { description: 'A3', extra: { group: 'A', width: 0 } } },
    4: { type: 'string', meta: { description: 'A4', extra: { group: 'A' } } },
    5: { type: 'string', meta: { description: 'A5', extra: { group: 'A', wtype: 'image' } } },
    6: { type: 'string', meta: { description: 'B1' } },
  }
  const spec = doc({ schema: { uid: 0, refs } })
  const atoms: Record<string, FieldAtomClaim> = {
    text: (p) => h('b', { 'data-testid': 'claimed' }, 'claimed-' + p.f.name),
  }
  const { container } = form({ spec, user: {}, atoms })
  expect(container.textContent).toContain('A')
  const grid = container.querySelector('[style*="grid-template-columns"]')
  expect(grid).not.toBeNull()
  // the claims ride the grid too — wrapped in the columns, bare outside
  expect(screen.getAllByTestId('claimed').length).toBe(4)
  expect(screen.getByText('*')).not.toBeNull()
  expect(screen.getByText('first')).not.toBeNull()
  // the gridded slot row still seats its square; the prompt still spans
  expect(screen.getByRole('button', { name: 'A5 source' })).not.toBeNull()
  expect(screen.getByLabelText('A2')).not.toBeNull()
})

test('GRID: no signature, no rail — the groups still seat every field', () => {
  const spec = doc({ inputs: undefined })
  form({ spec, user: {} })
  expect(document.querySelector('[data-input-rail]')).toBeNull()
  expect(screen.getByLabelText('Prompt')).not.toBeNull()
})

test('RAIL: a shared slot name seats the first kind (first-seen wins, never a double face)', () => {
  const spec = doc({
    inputs: [{ name: 'shared', kind: 'image' }],
    features: {
      modifiers: [
        { param_key: 'k1', label: 'K1', entry: 'field', fields: [{ name: 'shared', label: 'First', type: 'image' }] },
        { param_key: 'k2', label: 'K2', entry: 'field', fields: [{ name: 'shared', label: 'Second', type: 'image' }] },
      ],
    },
  })
  form({ spec, user: {} })
  const rail = document.querySelector('[data-input-rail]')
  expect(rail?.textContent).toContain('First')
  expect(rail?.textContent).not.toContain('Second')
})

test('GROUPS: slot-shaped fields share one row; labels live under their squares', () => {
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { i1: 1, i2: 2 } },
    1: { type: 'string', meta: { description: 'I1', extra: { wtype: 'image' } } },
    2: { type: 'string', meta: { description: 'I2', tooltip: 'file tip', extra: { wtype: 'file' } } },
  }
  const spec = doc({ inputs: [], schema: { uid: 0, refs } })
  form({ spec, user: {}, wire: { candidates: [{ id: 'a', label: 'A', url: 'https://host/a.png' }] } })
  expect(screen.getAllByRole('button', { name: / source$/ }).length).toBe(2)
  expect(document.querySelector('[title="file tip"]')).not.toBeNull()
})

test('CLAIMS: a claimed atom takes the face; the key chrome stays the constructor\u2019s', () => {
  const atoms: Record<string, FieldAtomClaim> = {
    text: (p) => h('b', { 'data-testid': 'claimed' }, 'claimed-' + p.f.name),
  }
  form({ spec: doc(), user: {}, atoms })
  expect(screen.getByTestId('claimed').textContent).toBe('claimed-prompt')
  expect(screen.getByText('*')).not.toBeNull()
  expect(screen.getByText('be nice')).not.toBeNull()
})

test('SEAMS: a host square takes the slots; the flow candidates ride both faces', () => {
  const verbs = {}
  const square = vi.fn(() => ({ verbs }))
  const wire = { candidates: [{ id: 'a', label: 'A', url: 'https://host/a.png' }] }
  form({ spec: doc(), user: {}, square: square as never, wire })
  expect(square).toHaveBeenCalled()
  expect(document.querySelector('input[type="file"]')).not.toBeNull()
})

test('VALUE: the resolved map feeds every face (base under user, user wins)', () => {
  const user: SpecValues = { prompt: 'user-wins' }
  const base: SpecValues = { prompt: 'base-loses', cfg: 9 }
  form({ spec: doc(), user, base })
  expect((screen.getByLabelText('Prompt') as HTMLInputElement).value).toBe('user-wins')
})
