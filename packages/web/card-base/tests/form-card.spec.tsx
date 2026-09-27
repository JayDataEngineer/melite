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

test('RAIL: a mod-owned field NEVER seats — it renders inside its mod modal (the mod-modal law)', () => {
  // The operator's final law (2026-10-10): "Region Mask goes inside
  // the mask mod — the reference input image goes inside the mask
  // mod, not on the base card, just like Img Create." The stroke-32
  // kind fallback seated mod-owned slots on the base rail — the
  // deviation, erased: the rail seats CARD-OWNED fields only.
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
  expect(rail?.textContent ?? '').not.toContain('Brick')
})

test('RAIL: text edges never become squares — the rail seats only slot-shaped rows (signature singles + declared stacks)', () => {
  const spec = doc({ inputs: [{ name: 'prompt', kind: 'text' }, { nope: 1 }, { name: 'missing', kind: 'image' }] })
  form({ spec })
  const rail = document.querySelector('[data-input-rail]')
  // the fixture's declared stack seats (the progressive-stack law) —
  // but the text edge never becomes a square
  if (rail === null) throw new Error('the declared stack seats: rail renders')
  expect(rail.querySelector('[aria-label*="Prompt"]')).toBeNull()
  expect(rail.querySelector('[data-input-stack="shots"]')).not.toBeNull()
  expect(screen.getByLabelText('Prompt')).not.toBeNull()
})

test('RAIL: a declared mesh edge seats its square — the same slot grammar as images', () => {
  const spec = {
    form: 'rig-copy',
    model: 'transfer_rig',
    schema: {
      uid: 0,
      refs: {
        0: { type: 'object', dict: { rig: 1 } },
        1: { type: 'string', meta: { description: 'Rig', extra: { wtype: 'mesh' } } },
      },
    },
    inputs: [{ name: 'rig', kind: 'mesh' }],
    packs: [],
  } as unknown as FormSpecDoc
  form({ spec })
  const rail = document.querySelector('[data-input-rail]')
  if (rail === null) throw new Error('the mesh edge seats: rail renders')
  expect(screen.getByRole('button', { name: 'Rig source' })).not.toBeNull()
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
  // the claims ride the grid too — wrapped in the columns
  expect(screen.getAllByTestId('claimed').length).toBe(3)
  expect(screen.getByText('*')).not.toBeNull()
  // HOUR 21: help prose rides the hover (i) glyph's aria — not a flat line
  expect(document.querySelector('[class*="specInfo"][aria-label="info: first"]')).not.toBeNull()
  // the gridded slot row still seats its square; the prompt still spans
  expect(screen.getByRole('button', { name: 'A5 source' })).not.toBeNull()
  expect(screen.getByLabelText('A2')).not.toBeNull()
  // THE SUBMENU LAW (stroke 89): the ungrouped contrast row seats
  // behind its own tab — switching renders its claim BARE (the
  // stacked-all-groups render is retired; the panel is exclusive).
  fireEvent.click(document.querySelector('[data-form-group-tab="general"]'))
  expect(screen.getAllByTestId('claimed').length).toBe(1)
  // THE GRID IS THE LAW (2026-09-21, the operator's catch): the
  // undeclared group grids 2 columns by DEFAULT — the form-card
  // grammar (pairs on a row) is the system default at the CARD
  // level, never per-card decoration a card can forget. A card
  // declares its own stack with columns: 1.
  const defaultGrid = container.querySelector('[data-form-group-panel="general"] [style*="grid-template-columns"]')
  expect(defaultGrid).not.toBeNull()
  expect(defaultGrid!.getAttribute('style')).toContain('repeat(2')
})

test('GRID: no signature — singles stay grouped, but a declared stack still claims the rail (a stack always has a face)', () => {
  const spec = doc({ inputs: undefined })
  form({ spec, user: {} })
  const rail = document.querySelector('[data-input-rail]')
  if (rail === null) throw new Error('the declared stack seats without a signature')
  expect(rail.querySelector('[data-input-stack="shots"]')).not.toBeNull()
  // the single's square lives in the groups now, never the rail
  expect(rail.querySelector('[aria-label="Image source"]')).toBeNull()
  expect(document.querySelector('[data-form-group-panel] [aria-label="Image source"]')).not.toBeNull()
})

test('RAIL: a shared slot name seats NOTHING — mod-owned fields render in their mods (the mod-modal law)', () => {
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
  expect(rail?.textContent ?? '').not.toContain('First')
  expect(rail?.textContent ?? '').not.toContain('Second')
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
  // HOUR 21: help prose rides the hover (i) glyph's aria — not a flat line
  expect(document.querySelector('[class*="specInfo"][aria-label="info: be nice"]')).not.toBeNull()
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

test('BBOX THREAD: CardForm seats the host bbox face down to the section (the defined arm of the seam)', () => {
  const spec = doc({
    features: {
      modifiers: [{
        param_key: 'sam3', label: 'SAM3', entry: 'field', leaf_face: 'bbox-canvas',
        fields: [
          { name: 'img', label: 'Img', type: 'image' },
          { name: 'bbox_x', label: 'Bx', type: 'number', default: -1, faceOwned: true },
          { name: 'bbox_y', label: 'By', type: 'number', default: -1, faceOwned: true },
          { name: 'bbox_w', label: 'Bw', type: 'number', default: -1, faceOwned: true },
          { name: 'bbox_h', label: 'Bh', type: 'number', default: -1, faceOwned: true },
        ],
      }],
    },
  })
  const Face = (): ReturnType<typeof h> => h('div', { 'data-testid': 'seated-bbox-face' }, 'seated')
  form({ spec, bboxFace: Face as never })
  // open the kind's create leaf — the embedded canvas renders the seated face
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  fireEvent.click(screen.getByRole('menuitem', { name: 'SAM3' }))
  expect(screen.getByTestId('seated-bbox-face')).not.toBeNull()
})

// ---------------------------------------------------------------------------
// THE PARAMETER SUBMENU (stroke 89): >1 declared group renders a
// switchable tab rail; ≤1 group keeps the stacked sections. The
// constructor reads the declared `group` extras — nothing bespoke.
// ---------------------------------------------------------------------------

/** A grouped doc: parts (1 field), ingest (1), turnaround (2) — the
 *  anny emission shape (three declared parameter groups). */
function groupedDoc(): FormSpecDoc {
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { body_glb: 1, source_photo: 2, steps: 3, frames: 4 } },
    1: { type: 'string', meta: { description: 'Body glb', extra: { group: 'parts' } } },
    2: { type: 'string', meta: { description: 'Source photo', extra: { group: 'ingest' } } },
    3: { type: 'number', meta: { description: 'Steps', default: 20, extra: { group: 'turnaround' } } },
    4: { type: 'number', meta: { description: 'Frames', default: 8, extra: { group: 'turnaround' } } },
  }
  return {
    form: 'anny', model: 'none', schema: { uid: 0, refs }, inputs: [], packs: [],
  } as unknown as FormSpecDoc
}

test('SUBMENU: >1 group renders a tab rail; only the first panel is visible', () => {
  form({ spec: groupedDoc() })
  const rail = document.querySelector('[data-form-submenu]')
  if (rail === null) throw new Error('no submenu rail for a 3-group emission')
  const tabs = Array.from(rail.querySelectorAll('[data-form-group-tab]'))
  expect(tabs.map((t) => t.getAttribute('data-form-group-tab'))).toEqual(['parts', 'ingest', 'turnaround'])
  // first-seen group seats active; its panel is the ONLY panel
  expect(document.querySelectorAll('[data-form-group-panel]').length).toBe(1)
  expect(document.querySelector('[data-form-group-panel]')?.getAttribute('data-form-group-panel')).toBe('parts')
  expect(screen.getByLabelText('Body glb')).not.toBeNull()
  expect(screen.queryByLabelText('Steps')).toBeNull()
})

test('SUBMENU: clicking a tab switches the visible panel', () => {
  form({ spec: groupedDoc() })
  const tab = document.querySelector('[data-form-group-tab="turnaround"]')
  if (tab === null) throw new Error('no turnaround tab')
  expect(tab.getAttribute('aria-selected')).toBe('false')
  fireEvent.click(tab)
  expect(document.querySelector('[data-form-group-panel]')?.getAttribute('data-form-group-panel')).toBe('turnaround')
  expect(screen.getByLabelText('Steps')).not.toBeNull()
  expect(screen.queryByLabelText('Body glb')).toBeNull()
  expect(document.querySelector('[data-form-group-tab="turnaround"]')?.getAttribute('aria-selected')).toBe('true')
})

test('SUBMENU: a single group keeps the stacked sections (no rail)', () => {
  form()
  expect(document.querySelector('[data-form-submenu]')).toBeNull()
  expect(screen.getByLabelText('Prompt')).not.toBeNull()
  expect(screen.getByLabelText('Steps')).not.toBeNull()
})

test('THE GRID IS THE LAW (2026-09-21): every params group grids 2 by default; a declared stack (columns: 1) is the card\'s explicit word', () => {
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { w: 1, h: 2, s: 3, d: 4 } },
    1: { type: 'number', meta: { description: 'Width', extra: { group: 'geo' } } },
    2: { type: 'number', meta: { description: 'Height', extra: { group: 'geo' } } },
    3: { type: 'number', meta: { description: 'Seed', extra: { group: 'stack' } } },
    4: { type: 'number', meta: { description: 'Denoise', extra: { group: 'stack', columns: 1 } } },
  }
  const spec = doc({ schema: { uid: 0, refs } })
  const { container } = form({ spec, user: {} })
  // THE SUBMENU LAW: each group seats behind its tab — open them
  fireEvent.click(document.querySelector('[data-form-group-tab="geo"]')!)
  // the UNDECLARED geo group grids 2 — Width and Height share a row
  const grid = container.querySelector('[data-form-group-panel="geo"] [style*="grid-template-columns"]')
  expect(grid).not.toBeNull()
  expect(grid!.getAttribute('style')).toContain('repeat(2')
  // the declared columns: 1 wins over the default (the card's
  // explicit stack is honored — the law is a default, not a cage)
  fireEvent.click(document.querySelector('[data-form-group-tab="stack"]')!)
  const stack = container.querySelector('[data-form-group-panel="stack"] [style*="grid-template-columns"]')
  expect(stack).not.toBeNull()
  expect(stack!.getAttribute('style')).toContain('repeat(1')
})

test('MODEL GUARD: a leaf declaring model=<family> hides on every other family of the card (the base seeds the grammar)', () => {
  // two families, one card: the bespoke leaf belongs to fam-a only
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { prompt: 1, bespoke: 2 } },
    1: { type: 'string', meta: { description: 'Prompt' } },
    2: { type: 'boolean', meta: { description: 'Bespoke Knob', default: false, extra: { visible_when: 'model=fam-a' } } },
  }
  const docFor = (model: string): FormSpecDoc => ({ form: 'x', model, schema: { uid: 0, refs } } as never)
  // serving fam-a: the leaf renders
  const a = form({ spec: docFor('fam-a') })
  expect(screen.getByText('Bespoke Knob')).not.toBeNull()
  cleanup()
  // serving fam-b (the sibling family): the leaf is GONE — the user
  // never sees a knob its lane does not fire
  const b = form({ spec: docFor('fam-b') })
  expect(screen.queryByText('Bespoke Knob')).toBeNull()
  expect(screen.getByText('Prompt')).not.toBeNull()
  void a; void b
})

test('UNIFICATION: the image-edit face is anchor + ONE universal stack — references are one concept, one row, every lane', () => {
  // the unified image-edit shape: the anchor rail slot + the
  // reference stack with NO model guard (both lanes); the legacy
  // named slots stay in the signature for old flows but seat
  // NOTHING (hidden aliases, never a face).
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { image1: 1, reference_images: 2 } },
    1: { type: 'string', meta: { description: 'Image 1', extra: { wtype: 'image' } } },
    2: { type: 'array', meta: { description: 'Reference Images', extra: { wtype: 'image_list', max_stack: 15 } } },
  }
  const docFor = (model: string): FormSpecDoc => ({
    form: 'image-edit', model, schema: { uid: 0, refs },
    inputs: [{ name: 'image1', kind: 'image' }, { name: 'image2', kind: 'image' }, { name: 'image3', kind: 'image' }],
  } as never)
  for (const lane of ['fam-2511', 'fam-21']) {
    form({ spec: docFor(lane) })
    const rail = document.querySelector('[data-input-rail]')
    if (rail === null) throw new Error(`the ${lane} rail seats`)
    // the anchor seats; the legacy names seat nothing (hidden)
    expect(rail.textContent).toContain('Image 1')
    expect(rail.textContent).not.toContain('Image 2')
    expect(rail.textContent).not.toContain('Image 3')
    // ONE reference row on EVERY lane — no second input concept
    const stack = rail.querySelector('[data-input-stack="reference_images"]')
    expect(stack).not.toBeNull()
    expect(rail.querySelector('[data-stack-head="reference_images"]')?.textContent).toContain('0 / 15')
    cleanup()
  }
})

test('MODEL GUARD: a lane-bespoke rail slot hides on the sibling lane (never relocates to the params)', () => {
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { image1: 1, image2: 2 } },
    1: { type: 'string', meta: { description: 'Image 1', extra: { wtype: 'image' } } },
    2: { type: 'string', meta: { description: 'Image 2', extra: { wtype: 'image', visible_when: 'model=fam-a' } } },
  }
  const docFor = (model: string): FormSpecDoc => ({
    form: 'x', model, schema: { uid: 0, refs },
    inputs: [{ name: 'image1', kind: 'image' }, { name: 'image2', kind: 'image' }],
  } as never)
  form({ spec: docFor('fam-b') })
  const rail = document.querySelector('[data-input-rail]')
  if (rail === null) throw new Error('the rail seats')
  expect(rail.textContent).toContain('Image 1')
  expect(rail.textContent).not.toContain('Image 2')
  // hidden slots vanish — they never relocate into the param groups
  expect(screen.queryByText('Image 2')).toBeNull()
})

// ── THE LANE SURFACE (2026-10-10, the YOU_ARE_A_LIAR fix shape 2's
// form half): a variant's declared field set IS its visibility, and
// the relation words render as a named strip — both read from the
// served `lanes` block, never from a card-side guard table.
test('LANES: a field outside the selected lane surface does not render; a field on it does', () => {
  // the base surface carries every defaulted field (the blank law
  // reads a default as STATED); the lanes differ in the two slot rows
  const spec = doc({
    model: 'qwen3-tts',
    lanes: {
      base: ['prompt', 'steps', 'cfg', 'turbo', 'inherit', 'notes'],
      variants: {
        customvoice: { params: ['img'] },
        base: { params: ['shots'] },
      },
    },
  })
  form({ spec, user: { model: 'qwen3-tts', variant: 'customvoice' } })
  // the customvoice lane declares the reference image seat
  expect(screen.queryByRole('button', { name: 'Image source' })).not.toBeNull()
  expect(document.querySelector('[data-input-stack="shots"]')).toBeNull()
  cleanup()
  form({ spec, user: { model: 'qwen3-tts', variant: 'base' } })
  // the base lane declares the multi-image stack instead
  expect(screen.queryByRole('button', { name: 'Image source' })).toBeNull()
  expect(document.querySelector('[data-input-stack="shots"]')).not.toBeNull()
})

test('LANES: a legacy doc (no lanes block) renders everything — the declare-to-judge degrade', () => {
  form()
  expect(screen.queryByLabelText('Prompt')).not.toBeNull()
  expect(screen.queryByLabelText('Notes')).not.toBeNull()
})

test('LANES: a broken relation renders the named strip with the cure (the form gates from the DECL)', () => {
  const spec = doc({
    model: 'qwen3-tts',
    lanes: {
      base: ['prompt', 'steps', 'cfg', 'turbo', 'inherit', 'notes', 'img', 'shots'],
      relations: {
        together: [{
          fields: ['prompt', 'notes'],
          cure: 'the persona export needs both halves — name the voice and describe it, or drop both',
        }],
      },
    },
  })
  form({ spec, user: { model: 'qwen3-tts', prompt: 'the words' } })
  const strip = document.querySelector('[data-lane-warn="1"]')
  if (strip === null) throw new Error('the relation warning renders')
  expect(strip.textContent ?? '').toContain('prompt')
  expect(strip.textContent ?? '').toContain('notes')
  expect(strip.textContent ?? '').toContain('name the voice and describe it, or drop both')
  // the paired state carries no strip
  cleanup()
  form({ spec, user: { model: 'qwen3-tts', prompt: 'the words', notes: 'the persona' } })
  expect(document.querySelector('[data-lane-warn]')).toBeNull()
})

// ── THE LANE GATE AGAINST THE SERVED DOC (2026-10-10, the
// form-plane audit's CRITICAL-1 / HIGH-3: the hand fixtures above
// could not fail on either — one put every defaulted field ON the
// base surface, so the "a default reads as stated" mechanism had
// nothing to bite). These run the REAL served tts doc.
const ttsDoc = (over: Record<string, unknown> = {}): FormSpecDoc => ({
  form: 'form_tts',
  model: 'qwen3-tts',
  schema: {
    uid: 0,
    refs: {
      0: { type: 'object', dict: { text: 1, voice: 2, design_prompt: 3, voice_name: 4, ref_audio: 5, ref_text: 6 } },
      1: { type: 'string', meta: { description: 'Text' } },
      2: { type: 'string', meta: { description: 'Voice' } },
      3: { type: 'string', meta: { description: 'Design Prompt', extra: { wtype: 'textarea' } } },
      4: { type: 'string', meta: { description: 'Voice Name' } },
      5: { type: 'string', meta: { description: 'Reference Audio', extra: { wtype: 'file' } } },
      6: { type: 'string', meta: { description: 'Reference Transcript' } },
    },
  },
  model_defaults: { variant: 'customvoice', voice: 'vivian' },
  inputs: [],
  packs: [],
  variants: [
    { id: 'customvoice', label: 'CustomVoice', group: 'Variant', defaults: {}, cells: [{ quant: 'native', label: 'Native', route: 'qwen3-tts' }] },
    { id: 'base', label: 'Base', group: 'Variant', defaults: {}, cells: [{ quant: 'native', label: 'Native', route: 'qwen3-tts-base' }] },
    { id: 'steady_read', label: 'Steady Read', group: 'Recipe', defaults: {}, cells: [] },
  ],
  lanes: {
    base: ['text', 'temperature', 'design_prompt', 'voice_name'],
    relations: {
      together: [{ fields: ['voice_name', 'design_prompt'], cure: 'name the voice and describe it, or drop both' }],
    },
    variants: {
      customvoice: { params: ['voice'] },
      base: { params: ['ref_audio', 'ref_text'] },
    },
  },
  ...over,
} as unknown as FormSpecDoc)

test('LANES: the base lane shows NO strip for a defaulted field it excludes (the uncurable-strip bug)', () => {
  // `voice` is a model_default the base lane excludes. The resolved
  // map carries it; the CARRIED layers do not, so the gate is quiet
  // and the operator is not told to drop a value they never set.
  form({ spec: ttsDoc(), user: { model: 'qwen3-tts', variant: 'base' } })
  expect(document.querySelector('[data-lane-warn]')).toBeNull()
  // the persona row is hidden on this lane (the surface owns it)
  expect(screen.queryByLabelText('Voice')).toBeNull()
})

test('LANES: the customvoice lane is quiet too, and a STATED off-surface value still warns', () => {
  form({ spec: ttsDoc(), user: { model: 'qwen3-tts', variant: 'customvoice' } })
  expect(document.querySelector('[data-lane-warn]')).toBeNull()
  cleanup()
  // a leftover from a variant switch IS carried, so it warns with the cure
  form({ spec: ttsDoc(), user: { model: 'qwen3-tts', variant: 'customvoice', ref_audio: '/a.flac' } })
  const strip = document.querySelector('[data-lane-warn="1"]')
  if (strip === null) throw new Error('a carried off-surface value warns')
  expect(strip.textContent ?? '').toContain('ref_audio')
  expect(strip.textContent ?? '').toContain('fires nothing')
})

test('LANES: an unknown or cleared variant is the run door\'s voice, never this strip', () => {
  for (const variant of ['not-a-variant', '']) {
    form({ spec: ttsDoc(), user: { model: 'qwen3-tts', variant, ref_audio: '/a.flac' } })
    expect(document.querySelector('[data-lane-warn]'), 'variant ' + JSON.stringify(variant)).toBeNull()
    cleanup()
  }
  // a RECIPE variant is served and inherits the family base — judged
  form({ spec: ttsDoc(), user: { model: 'qwen3-tts', variant: 'steady_read', ref_audio: '/a.flac' } })
  expect(document.querySelector('[data-lane-warn="1"]')).not.toBeNull()
})

test('LANES: the export pair warns on the real doc, and clears when cured', () => {
  form({ spec: ttsDoc(), user: { model: 'qwen3-tts', variant: 'customvoice', text: 'x', design_prompt: 'a warm narrator' } })
  const strip = document.querySelector('[data-lane-warn="1"]')
  if (strip === null) throw new Error('the export pair warns')
  expect(strip.textContent ?? '').toContain('voice_name')
  expect(strip.textContent ?? '').toContain('name the voice and describe it, or drop both')
  cleanup()
  form({ spec: ttsDoc(), user: { model: 'qwen3-tts', variant: 'customvoice', text: 'x', design_prompt: 'a warm narrator', voice_name: 'warm_1' } })
  expect(document.querySelector('[data-lane-warn]')).toBeNull()
})
