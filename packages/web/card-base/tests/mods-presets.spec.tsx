// @vitest-environment happy-dom
// mods-presets.spec.tsx — THE PRESET CHIP FACE (the timeline rework
// stage 3): a preset-carrying kind renders its named starting cells
// as chips above the tiles — an EMPTY bag's press CREATES the single
// entry (field defaults seeded, the patch applied), a seated bag's
// press PATCHES entry 0 as a MERGE (staged files stay, every dial
// stays movable). The registration law that judges the patches
// lives engine-side (edit-presets.spec.ts, validateDeclaredMods);
// this wall owns the FACE: the chip row is the retired bag names'
// cells, never a second editor.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  ],
  presets: [
    { id: 'repair-region', label: 'Repair a region', patch: { mask_source: 'region', reference: 'self', denoise: 0.32 } },
    { id: 'identity-swap', label: 'Identity swap', patch: { mask_source: 'region', reference: 'still+mannequin', denoise: 1 } },
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

test('an EMPTY preset-carrying bag still renders its chips, and a press CREATES the single entry (defaults + patch)', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit, onPatch: undefined }))
  // the empty bag is NOT hidden: the chips are the fast path in
  expect(chip('repair-region')).toBeTruthy()
  expect(chip('identity-swap')).toBeTruthy()
  press('identity-swap')
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [key, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(key).toBe('edit')
  expect(bag).toHaveLength(1)
  // field defaults seed, the patch wins on its own dials
  expect(bag[0]).toMatchObject({ mask_source: 'region', reference: 'still+mannequin', denoise: 1, still: '' })
})

test('a seated bag\'s press PATCHES entry 0 as a MERGE — staged files stay, the patch\'s dials move', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, {
    kinds: [EDIT],
    values: { edit: [{ mask_source: 'region', reference: 'self', denoise: 0.32, still: 'stills/girl.png' }] },
    onEdit, onPatch: undefined,
  }))
  press('identity-swap')
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [key, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(key).toBe('edit')
  expect(bag).toHaveLength(1)
  // the staged STILL survives the press (a merge, never a replace)
  expect(bag[0]).toMatchObject({ mask_source: 'region', reference: 'still+mannequin', denoise: 1, still: 'stills/girl.png' })
})

test('a preset-less kind renders NO chip row (the empty bag stays hidden — the law before stage 3)', () => {
  const bare = { ...EDIT, presets: undefined } as unknown as ModifierKind
  render(h(ModifiersSection, { kinds: [bare], values: {}, onEdit: vi.fn(), onPatch: undefined }))
  expect(document.querySelector('[data-testid="cb-mod-preset-row"]')).toBe(null)
  expect(screen.queryByText('Repair a region')).toBe(null)
})
