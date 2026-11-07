// @vitest-environment happy-dom
// mods-sections.spec.tsx — THE MASTER MODAL (the collapse's slice 5,
// 2026-11-16; rebuilt under the ONE-DOOR law same day): a declared
// section is a STARTING CELL INSIDE the one leaf — the posture
// switches ride the modal's head (a press stages the named cell over
// the draft: field defaults + the entry overlay + the patch, the
// merge law — staged files stay, the cell's dials move), the riding
// fields declare their submenus through the one visible_when
// grammar, and the save is the operator's own press. THE ENTRY is
// the system's own door: the plus box and the kind picker for a new
// entry, the seated entry's own tile for an edit — the chip row that
// once shadowed these doors is deleted (mods-one-door.spec.tsx owns
// that law). The registration law that judges the patches lives
// engine-side (edit-sections.spec.ts, validateDeclaredMods); this
// wall owns the FACE.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ModifierKind } from '../src/spec.ts'
import { ModifiersSection } from '../src/mods.tsx'
import { chromeCopy } from '../src/locales/chromeCopy.ts'

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
  sections: [
    { id: 'repair-region', label: 'Repair a region', patch: { mask_source: 'region', reference: 'self', denoise: 0.32 } },
    { id: 'identity-swap', label: 'Identity swap', patch: { mask_source: 'region', reference: 'still+mannequin', denoise: 1 } },
    { id: 'refine-2x', label: 'Refine 2x', patch: { mask_source: 'whole-frame', reference: 'self', denoise: 0.32, refine: true, scale: 2 } },
  ],
} as unknown as ModifierKind

/** THE ONE-DOOR ENTRY for a new entry: the plus box opens the kind
 *  picker, the kind's own label opens the leaf (the Loras grammar —
 *  no chip row exists). */
function openLeafViaPicker(kindLabel: string): void {
  const add = document.querySelector('[data-subcard-add="mod"]') as HTMLElement
  expect(add, 'the plus box renders').toBeTruthy()
  fireEvent.click(add)
  fireEvent.click(screen.getByText(kindLabel))
}

/** THE ONE-DOOR ENTRY for a seated entry: its own tile opens the
 *  leaf in EDIT mode on that entry (the operator's press door). */
function openSeatedLeafViaTile(index: number): void {
  const tiles = document.querySelectorAll('[data-mod-tile]')
  expect(tiles.length, 'the seated entry renders its tile').toBeGreaterThan(index)
  fireEvent.click(tiles[index] as HTMLElement)
}

/** A section CHECK INSIDE the leaf (§0.8's flow face): the label
 *  carries the id, the native checkbox input owns the press. */
function leafSwitch(id: string): HTMLInputElement {
  const label = document.querySelector(`[data-mod-section="${id}"]`) as HTMLElement
  expect(label, `the ${id} section renders`).toBeTruthy()
  const input = label.querySelector('input')
  expect(input, `the ${id} section renders a checkbox`).toBeTruthy()
  return input as HTMLInputElement
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

test('THE PICKER OPENS THE MASTER MODAL (never an instant commit) — the posture press paints, Add commits the seeded draft', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit, onPatch: undefined }))
  openLeafViaPicker('Video edit')
  // NO commit rode the door — the modal is the door, the save is
  // the operator's own press (the one-interface law)
  expect(onEdit).not.toHaveBeenCalled()
  // the posture press stages the cell: the switches ride inside
  fireEvent.click(leafSwitch('identity-swap'))
  expect(leafSwitch('repair-region')).toBeTruthy()
  expect(leafSwitch('identity-swap').checked).toBe(true)
  expect(denoiseInput().value).toBe('1')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [key, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(key).toBe('edit')
  expect(bag).toHaveLength(1)
  // field defaults seed, the patch wins on its own dials
  expect(bag[0]).toMatchObject({ mask_source: 'region', reference: 'still+mannequin', denoise: 1, still: '' })
})

test('a SEATED bag opens the modal on the merge via its tile (staged files stay), and an in-modal switch re-stages the same way', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, {
    kinds: [EDIT],
    values: { edit: [{ mask_source: 'region', reference: 'self', denoise: 0.32, still: 'stills/girl.png' }] },
    onEdit, onPatch: undefined,
  }))
  openSeatedLeafViaTile(0)
  // the modal opened on EDIT (the entry stays the entry); the posture
  // press stages over the seed, the still untouched in the draft
  fireEvent.click(leafSwitch('identity-swap'))
  expect(leafSwitch('identity-swap').checked).toBe(true)
  expect(denoiseInput().value).toBe('1')
  // an in-modal second check COMPOSES (§0.8: repair + swap in the
  // one bag — both boxes stay checked, the later seed wins shared
  // dials, last-writer-wins the merge law)
  fireEvent.click(leafSwitch('repair-region'))
  expect(leafSwitch('repair-region').checked).toBe(true)
  expect(leafSwitch('identity-swap').checked).toBe(true)
  expect(denoiseInput().value).toBe('0.32')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  // the staged STILL survives the whole walk (a merge, never a replace)
  expect(bag[0]).toMatchObject({ mask_source: 'region', reference: 'self', denoise: 0.32, still: 'stills/girl.png' })
})

// (F2, the front-end evasion audit 2026-11-07) the section contract
// was narrated for EVERY kind but seeded only for field kinds: a
// lawful hybrid-kind section opened a dead modal — no dial moved, no
// switch row rendered, green everywhere. ONE law, all three shapes
// now: the patch's option/scalar seats open their own drafts, the
// cell's remaining dials ride the params, and the switches row
// renders inside the hybrid leaf too.
test("(F2) ONE LAW, ALL THREE SHAPES — a HYBRID kind's posture seeds the modal: the option/scalar seats open their drafts, the cell's dials ride the params", () => {
  const onEdit = vi.fn()
  const HYBRID = {
    kind: 'controlnet', label: 'ControlNet', param_key: 'controlnets', cardinality: 'multi',
    entry: 'hybrid', option_key: 'type', scalar_key: 'strength',
    options: [
      { value: 'depth', label: 'Depth', model: 'm-depth', preprocessor: 'p-depth', defaults: { strength: 0.5 } },
      { value: 'canny', label: 'Canny', model: 'm-canny', preprocessor: 'p-canny' },
    ],
    fields: [
      { name: 'type', type: 'text', label: 'Type' },
      { name: 'strength', type: 'number', label: 'Strength' },
      { name: 'cond', type: 'text', label: 'Conditioning' },
    ],
    sections: [
      { id: 'soft-depth', label: 'Soft depth', patch: { type: 'depth', strength: 0.35, cond: 'soft edges' } },
    ],
  } as unknown as ModifierKind
  render(h(ModifiersSection, {
    kinds: [HYBRID],
    values: { controlnets: [{ type: 'canny', strength: 0.9, cond: 'hard edges' }] },
    onEdit, onPatch: undefined,
  }))
  openSeatedLeafViaTile(0)
  // the modal opened ON THE MERGE and the switches ride the hybrid
  // leaf too (the postures are the kind's OWN cells)
  fireEvent.click(leafSwitch('soft-depth'))
  expect(leafSwitch('soft-depth').checked).toBe(true)
  // the scalar seat routed into ITS draft (0.9 → the cell's 0.35)
  expect((modal().getByLabelText('Strength', { selector: 'input' }) as HTMLInputElement).value).toBe('0.35')
  // the cell's remaining dial rode the params, visible in the draft
  expect((modal().getByLabelText('Conditioning', { selector: 'input' }) as HTMLInputElement).value).toBe('soft edges')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  // the save carries the CELL: the option seat, the scalar seat, and
  // the conditioned dial — never the seated entry's stale values
  expect(bag[0]).toMatchObject({ type: 'depth', strength: 0.35, cond: 'soft edges' })
})

test('THE NAMED SUBMENU — the scale row rides the refine switch (visible_when judged on the live draft)', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit, onPatch: undefined }))
  openLeafViaPicker('Video edit')
  // off: the riding field is absent from the open modal
  fireEvent.click(leafSwitch('repair-region'))
  expect(modal().queryByLabelText('Refine scale', { selector: 'input[type="number"]' })).toBe(null)
  // a switch onto the refine cell re-seats the row in the SAME open
  // modal — the submenu opens under its switch, never a second editor
  fireEvent.click(leafSwitch('refine-2x'))
  expect(modal().getByLabelText('Refine scale', { selector: 'input[type="number"]' })).toBeTruthy()
  expect((modal().getByLabelText('Refine scale', { selector: 'input[type="number"]' }) as HTMLInputElement).value).toBe('2')
})

test('a manual dial edit KEEPS the checkbox (§0.8: the box is intent, not paint — the cell-paint law died with the pills)', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit, onPatch: undefined }))
  openLeafViaPicker('Video edit')
  fireEvent.click(leafSwitch('identity-swap'))
  expect(leafSwitch('identity-swap').checked).toBe(true)
  fireEvent.change(denoiseInput(), { target: { value: '0.7' } })
  expect(leafSwitch('identity-swap').checked, 'the operator still wants the swap — only the dial moved').toBe(true)
})

test('a section-less kind renders NO posture switches (the empty bag stays hidden)', () => {
  const bare = { ...EDIT, sections: undefined } as unknown as ModifierKind
  render(h(ModifiersSection, { kinds: [bare], values: {}, onEdit: vi.fn(), onPatch: undefined }))
  expect(document.querySelector('[data-testid="cb-mod-section-row"]')).toBe(null)
  expect(document.querySelector('[data-mod-sections]')).toBe(null)
  expect(screen.queryByText('Repair a region')).toBe(null)
})

// ── THE OPTION SHAPE'S OWN ROUTER ARM (the F2 law's third shape):
// a served-catalog kind whose cell names the router's three seats
// (id/strength/steps). The seated bag's tile opens the leaf on the
// merge — the option-kind branch of routeSectionPatch, the branch the
// field/hybrid walls never reach. ──
const OPTION_PRESET = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'p1', label: 'Plain', defaults: { strength: 0.5, steps: 4 } },
    { value: 'p2', label: 'Turbo', defaults: { strength: 0.8, steps: 8 } },
  ],
  sections: [
    { id: 'turbo-6', label: 'Turbo 6', patch: { id: 'p2', strength: 0.75, steps: 6, note: 'staged note' } },
    { id: 'steps-6', label: 'Steps 6', patch: { steps: 6 } },
  ],
} as unknown as ModifierKind

function seatOptionBag(): { onEdit: ReturnType<typeof vi.fn> } {
  const onEdit = vi.fn()
  render(h(ModifiersSection, {
    kinds: [OPTION_PRESET],
    values: { loras: [{ id: 'p1', strength: 0.5, steps: 4 }] },
    onEdit, onPatch: undefined,
  }))
  return { onEdit }
}

test("(F2, the option shape) a SEATED bag's posture seeds the leaf on the merge: the three seats route into their drafts and the save carries them", () => {
  const { onEdit } = seatOptionBag()
  openSeatedLeafViaTile(0)
  fireEvent.click(leafSwitch('turbo-6'))
  // the modal opened on EDIT (the seated entry stays the entry)
  expect(screen.getByRole('dialog')).toBeTruthy()
  // the id seat routed into the catalog draft — the picker names the
  // PATCHED row, never the seated one
  expect(modal().getByLabelText('LoRA').textContent).toBe('Turbo')
  // the strength seat routed into its dial (the seated 0.5 → the cell's 0.75)
  expect((modal().getByLabelText('Strength', { selector: 'input' }) as HTMLInputElement).value).toBe('0.75')
  // the steps seat routed into its dial (the seated 4 → the cell's 6)
  expect((modal().getByLabelText(chromeCopy.stepsAppliedLabel, { selector: 'input' }) as HTMLInputElement).value).toBe('6')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  // the save carries the routed seats — never the seated entry's stale values
  expect(bag).toHaveLength(1)
  expect(bag[0]).toMatchObject({ id: 'p2', strength: 0.75, steps: 6 })
})

test('(F2, the option shape) a patch that names only one seat: the un-named drafts keep the seated entry\'s own row and dial, the named seat moves', () => {
  const { onEdit } = seatOptionBag()
  openSeatedLeafViaTile(0)
  fireEvent.click(leafSwitch('steps-6'))
  expect(screen.getByRole('dialog')).toBeTruthy()
  // no id/strength seats in the patch — the seated entry's own pick
  // and dial ride (the seed the router never overrode)
  expect(modal().getByLabelText('LoRA').textContent).toBe('Plain')
  expect((modal().getByLabelText('Strength', { selector: 'input' }) as HTMLInputElement).value).toBe('0.5')
  // the one named seat routed (the seated 4 → the cell's 6)
  expect((modal().getByLabelText(chromeCopy.stepsAppliedLabel, { selector: 'input' }) as HTMLInputElement).value).toBe('6')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  const [, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(bag[0]).toMatchObject({ id: 'p1', strength: 0.5, steps: 6 })
})

test('the checked box re-pressed UNCHECKS and strips the seed-only dials (§0.8: the box IS a toggle; hand-moved dials survive)', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit, onPatch: undefined }))
  openLeafViaPicker('Video edit')
  fireEvent.click(leafSwitch('identity-swap'))
  expect(leafSwitch('identity-swap').checked).toBe(true)
  expect(denoiseInput().value).toBe('1')
  // THE RE-PRESS unchecks: the section's seed-only keys strip (the
  // denoise returns to the field default, the anchors to 'self'),
  // while a hand-moved dial would have survived (the strip judges
  // equality against the SEED, never against the default)
  fireEvent.click(leafSwitch('identity-swap'))
  expect(leafSwitch('identity-swap').checked).toBe(false)
  // the dial seat reads UNSET (the seed left the draft; compose
  // falls back to the field's declared default at the door)
  expect(denoiseInput().value).toBe('')
})
