// @vitest-environment happy-dom
// mods-presets.spec.tsx — THE MASTER MODAL (the collapse's slice 5,
// 2026-11-16): a preset-carrying kind's chips are DOORS INTO THE ONE
// LEAF, never a second editor — the press OPENS the modal seeded with
// the named cell (field defaults + the entry overlay + the patch, the
// merge law: staged files stay, the cell's dials move), the preset
// switches ride INSIDE the modal's head (a press re-stages the same
// way, the pressed cell paints), the riding fields declare their
// submenus through the one visible_when grammar, and the save is the
// operator's own press. The registration law that judges the patches
// lives engine-side (edit-presets.spec.ts, validateDeclaredMods);
// this wall owns the FACE.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ModifierKind } from '../src/spec.ts'
import { ModifiersSection } from '../src/mods.tsx'

afterEach(cleanup)

const EDIT = {
  kind: 'edit', label: 'Video edit', param_key: 'edit', cardinality: 'list', max_stack: 1,
  fields: [
    { name: 'mask_source', label: 'Mask source', type: 'select', default: 'region', options: [
      { value: 'region', label: 'Region' }, { value: 'whole-frame', label: 'Whole frame' },
    ] },
    { name: 'reference', label: 'Identity anchors', type: 'select', default: 'self', options: [
      { value: 'self', label: 'Source' }, { value: 'still+mannequin', label: 'Still + mannequin' },
    ] },
    { name: 'denoise', label: 'Denoise', type: 'number', default: 0.32, min: 0.05, max: 1, step: 0.01 },
    { name: 'still', label: 'Replacement still', type: 'image', default: '' },
    { name: 'refine', label: 'Refine pass', type: 'boolean', default: false },
    // THE NAMED SUBMENU (the roadmap's own words: "the refine switch
    // opening the scale submenu") — scale rides only the refine pass
    { name: 'scale', label: 'Refine scale', type: 'number', default: 2, min: 1, max: 4, step: 0.05, visible_when: 'refine=true' },
  ],
  presets: [
    { id: 'repair-region', label: 'Repair a region', patch: { mask_source: 'region', reference: 'self', denoise: 0.32 } },
    { id: 'identity-swap', label: 'Identity swap', patch: { mask_source: 'region', reference: 'still+mannequin', denoise: 1 } },
    { id: 'refine-2x', label: 'Refine 2x', patch: { mask_source: 'whole-frame', reference: 'self', denoise: 0.32, refine: true, scale: 2 } },
  ],
} as unknown as ModifierKind

function chip(id: string): HTMLElement {
  return document.querySelector(`[data-testid="cb-mod-preset-${id}"]`) as HTMLElement
}

// THE PRESS (the span-click burn): the DSH Button owns the press —
// a click on the wrapping span never reaches its onClick (the
// button swallows the wrapper's bubble), so the wall presses the
// button itself, the same door the user's pointer lands on.
function press(id: string): void {
  const button = chip(id).querySelector('button')
  expect(button, `the ${id} chip renders a pressable button`).toBeTruthy()
  fireEvent.click(button as HTMLElement)
}

function leafSwitch(id: string): HTMLElement {
  // the span carries the id, the DSH Button owns the press (the
  // span-click burn - same law as the outer chip's own press)
  const span = document.querySelector(`[data-leaf-preset="${id}"]`) as HTMLElement
  const button = span.querySelector('button')
  expect(button, `the ${id} switch renders a pressable button`).toBeTruthy()
  return button as HTMLElement
}

// THE MODAL SCOPE (the DSH Modal renders role=dialog): every draft
// query rides WITHIN the open leaf - the underlying card face keeps
// its own rows, and the wall judges the modal's draft alone.
function modal(): ReturnType<typeof within> {
  return within(screen.getByRole('dialog'))
}

function denoiseInput(): HTMLInputElement {
  return modal().getByLabelText('Denoise', { selector: 'input[type="number"]' }) as HTMLInputElement
}

test('THE CHIP OPENS THE MASTER MODAL (never an instant commit) — the pressed cell paints, Add commits the seeded draft', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit, onPatch: undefined }))
  press('identity-swap')
  // NO commit rode the press — the modal is the door, the save is
  // the operator's own press (the one-interface law)
  expect(onEdit).not.toHaveBeenCalled()
  // the modal opened with the cell staged: the switches ride inside
  expect(leafSwitch('repair-region')).toBeTruthy()
  expect(leafSwitch('identity-swap').getAttribute('aria-pressed')).toBe('true')
  expect(denoiseInput().value).toBe('1')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [key, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(key).toBe('edit')
  expect(bag).toHaveLength(1)
  // field defaults seed, the patch wins on its own dials
  expect(bag[0]).toMatchObject({ mask_source: 'region', reference: 'still+mannequin', denoise: 1, still: '' })
})

test('a SEATED bag\'s chip opens the modal on the merge (staged files stay), and an in-modal switch re-stages the same way', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, {
    kinds: [EDIT],
    values: { edit: [{ mask_source: 'region', reference: 'self', denoise: 0.32, still: 'stills/girl.png' }] },
    onEdit, onPatch: undefined,
  }))
  press('identity-swap')
  // the modal opened on EDIT (the entry stays the entry), the patch
  // staged over the seed, the still untouched in the draft
  expect(leafSwitch('identity-swap').getAttribute('aria-pressed')).toBe('true')
  expect(denoiseInput().value).toBe('1')
  // an in-modal switch re-stages: the repair cell moves the dials
  // back through the SAME merge law (the outer chip and the inner
  // switch are one law, two doors)
  fireEvent.click(leafSwitch('repair-region'))
  expect(leafSwitch('repair-region').getAttribute('aria-pressed')).toBe('true')
  expect(leafSwitch('identity-swap').getAttribute('aria-pressed')).not.toBe('true')
  expect(denoiseInput().value).toBe('0.32')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  // the staged STILL survives the whole walk (a merge, never a replace)
  expect(bag[0]).toMatchObject({ mask_source: 'region', reference: 'self', denoise: 0.32, still: 'stills/girl.png' })
})

test('THE NAMED SUBMENU — the scale row rides the refine switch (visible_when judged on the live draft)', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit, onPatch: undefined }))
  // off: the riding field is absent from the open modal
  press('repair-region')
  expect(modal().queryByLabelText('Refine scale', { selector: 'input[type="number"]' })).toBe(null)
  // a switch onto the refine cell re-seats the row in the SAME open
  // modal — the submenu opens under its switch, never a second editor
  fireEvent.click(leafSwitch('refine-2x'))
  expect(modal().getByLabelText('Refine scale', { selector: 'input[type="number"]' })).toBeTruthy()
  expect((modal().getByLabelText('Refine scale', { selector: 'input[type="number"]' }) as HTMLInputElement).value).toBe('2')
})

test('a manual dial edit un-paints the named cell (the draft has left the matrix)', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit, onPatch: undefined }))
  press('identity-swap')
  expect(leafSwitch('identity-swap').getAttribute('aria-pressed')).toBe('true')
  fireEvent.change(denoiseInput(), { target: { value: '0.7' } })
  expect(leafSwitch('identity-swap').getAttribute('aria-pressed')).not.toBe('true')
})

test('a preset-less kind renders NO chip row (the empty bag stays hidden — the law before stage 3)', () => {
  const bare = { ...EDIT, presets: undefined } as unknown as ModifierKind
  render(h(ModifiersSection, { kinds: [bare], values: {}, onEdit: vi.fn(), onPatch: undefined }))
  expect(document.querySelector('[data-testid="cb-mod-preset-row"]')).toBe(null)
  expect(screen.queryByText('Repair a region')).toBe(null)
})
