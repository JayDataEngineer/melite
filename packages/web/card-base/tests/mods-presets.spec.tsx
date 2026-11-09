// @vitest-environment happy-dom
// mods-presets.spec.tsx — THE MASTER MODAL'S FIELD FACE (re-pinned
// 2026-11-08 by the operator's re-rule: the §0.8 checkbox row was
// INVENTED UI — named-posture checks over the four-axes grammar,
// the §0.7 pill crime in new clothes, and a checkbox cannot open
// anything). THE FACE IS THE KIND'S OWN FIELD GRAMMAR — the estate
// pattern every card kind already serves: Mask source is a MENU
// (DSH Menu through SpecMenuSelect) whose choice dynamically opens
// the region seats or the staged-PNG MASK SLOT, the anchors menu
// opens the still + mannequin seats, the refine switch opens
// scale, all visible_when-judged on the LIVE draft in the SAME
// open modal. The named starting cells stay engine-side (the DECL's
// sections, registration-judged — the agent lane stages their
// patches into the bag; edit-presets.spec.ts owns that law); no UI
// layer renders them. This wall owns the FACE.
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
      { value: 'static-png', label: 'Static PNG — one staged mask' },
    ] },
    { name: 'region_prompt', label: 'Region prompt', type: 'text', default: '', visible_when: 'mask_source=region' },
    { name: 'mask', label: 'Mask PNG', type: 'image', default: '', visible_when: 'mask_source=static-png' },
    { name: 'reference', label: 'Identity anchors', type: 'select', default: 'self', options: [
      { value: 'self', label: 'Source' }, { value: 'still+mannequin', label: 'Still + mannequin' },
    ] },
    { name: 'denoise', label: 'Denoise', type: 'number', default: 0.32, min: 0.05, max: 1, step: 0.01 },
    { name: 'still', label: 'Replacement still', type: 'image', default: '', visible_when: 'reference=still+mannequin' },
    { name: 'mannequin', label: 'Mannequin video', type: 'file', media: 'video', default: '', visible_when: 'reference=still+mannequin' },
    { name: 'refine', label: 'Refine pass', type: 'boolean', default: false },
    // THE NAMED SUBMENU (the roadmap's own words: "the refine switch
    // opening the scale submenu") — scale rides only the refine pass
    { name: 'scale', label: 'Refine scale', type: 'number', default: 2, min: 1, max: 4, step: 0.05, visible_when: 'refine=true' },
  ],
  // the engine-side starting cells (the agent lane's patches —
  // registration-judged, never rendered): present in the fixture ON
  // PURPOSE — the face must ignore them, not crash on them.
  sections: [
    { id: 'repair-region', label: 'Repair a region', patch: { mask_source: 'region', reference: 'self', denoise: 0.32 } },
    { id: 'identity-swap', label: 'Identity swap', patch: { mask_source: 'region', reference: 'still+mannequin', denoise: 1 } },
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

// THE MODAL SCOPE (the DSH Modal renders role=dialog): every draft
// query rides WITHIN the open leaf - the underlying card face keeps
// its own rows, and the wall judges the modal's draft alone.
function modal(): ReturnType<typeof within> {
  return within(screen.getByRole('dialog'))
}

function denoiseInput(): HTMLInputElement {
  return modal().getByLabelText('Denoise', { selector: 'input[type="number"]' }) as HTMLInputElement
}

/** The DSH Menu's trigger for a select field (SpecMenuSelect owns
 *  the dynamic menu; the trigger carries the current titled face). */
function menuTrigger(label: string): HTMLElement {
  const btn = modal().getByRole('button', { name: new RegExp(label) })
  return btn
}

/** Picks a row in the DSH Menu SpecMenuSelect opens (the estate's
 *  dynamic-menu law: the trigger opens the menu, the menuitem row
 *  picks — the menu portals to the document, never inside the
 *  dialog). */
function pickMenuRow(label: string, rowLabel: string): void {
  fireEvent.click(menuTrigger(label))
  // the menu's rows render through the estate's TITLE-CASE face law
  // (every label titled) — the pick matches case-insensitively so
  // the wall states the DECL's own spelling.
  const item = screen.getAllByRole('menuitem').find((n) => n.textContent?.toLowerCase() === rowLabel.toLowerCase())
  expect(item, `the ${rowLabel} menu row renders`).toBeTruthy()
  fireEvent.click(item as HTMLElement)
}

test('THE FACE IS THE FIELD GRAMMAR + THE CHIP ROW — the checkbox face stays dead, the sanctioned posture layer rides as draft-patcher Pills inside the leaf (operator 2026-11-09)', () => {
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit: vi.fn(), onPatch: undefined }))
  openLeafViaPicker('Video edit')
  // the four axes render as the kind's own seats, inside the modal
  expect(menuTrigger('Mask source')).toBeTruthy()
  expect(menuTrigger('Identity anchors')).toBeTruthy()
  expect(denoiseInput()).toBeTruthy()
  expect(modal().getByText('Refine pass')).toBeTruthy()
  // THE CHECKBOX FACE STAYS DEAD (operator 2026-11-08): no checkbox
  // row, no native checks beside the grammar — the invented layer's
  // SHAPES never return
  expect(document.querySelector('[data-mod-sections]')).toBe(null)
  expect(document.querySelector('[data-mod-section]')).toBe(null)
  expect(document.querySelector('[data-testid="cb-mod-section-row"]')).toBe(null)
  const dlg = screen.getByRole('dialog')
  expect(dlg.querySelectorAll('input[type="checkbox"]').length).toBe(0)
  // THE CHIPS ARE THE POSTURE LAYER (operator 2026-11-09): the
  // declared sections render as Pills INSIDE the leaf — verbatim
  // labels, press = a draft patch, never a checkbox
  const chips = dlg.querySelector('[data-leaf-chips]')
  expect(chips, 'the section chip row renders inside the leaf').not.toBeNull()
  expect(chips?.getAttribute('data-leaf-chips'), 'the declared section ids ride the chip row').toContain('repair-region')
  expect(modal().getByText('Repair a region')).toBeTruthy()
})

test('THE MASK SLOT — the Mask source menu opens it dynamically: static-png seats the staged PNG, whole-frame closes the region seats (the operator\'s ruling, stated as the bag\'s first axis)', () => {
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit: vi.fn(), onPatch: undefined }))
  openLeafViaPicker('Video edit')
  // region (the default): the region prompt seats, NO PNG slot
  expect(modal().getByText('Region prompt')).toBeTruthy()
  expect(modal().queryByText('Mask PNG')).toBe(null)
  // the menu opens and the staged-PNG row seats THE MASK SLOT in
  // the SAME open modal — the dynamic seat the checkbox face never
  // had (the operator: "WHERE IS THE SLOT FOR THE VIDEO MASK")
  pickMenuRow('Mask source', 'Static PNG — one staged mask')
  expect(modal().getByText('Mask PNG')).toBeTruthy()
  expect(modal().queryByText('Region prompt')).toBe(null)
  // whole-frame: nothing held — both mask seats close
  pickMenuRow('Mask source', 'Whole frame')
  expect(modal().queryByText('Mask PNG')).toBe(null)
  expect(modal().queryByText('Region prompt')).toBe(null)
})

test('THE IDENTITY ANCHORS — the anchors menu opens the still + mannequin seats dynamically (the second axis of the ruling)', () => {
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit: vi.fn(), onPatch: undefined }))
  openLeafViaPicker('Video edit')
  // self (the default): no anchor seats
  expect(modal().queryByText('Replacement still')).toBe(null)
  expect(modal().queryByText('Mannequin video')).toBe(null)
  pickMenuRow('Identity anchors', 'Still + mannequin')
  expect(modal().getByText('Replacement still')).toBeTruthy()
  expect(modal().getByText('Mannequin video')).toBeTruthy()
})

test('THE NAMED SUBMENU — the refine switch opens scale in the SAME open modal (visible_when judged on the live draft)', () => {
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit: vi.fn(), onPatch: undefined }))
  openLeafViaPicker('Video edit')
  // off: the riding field is absent from the open modal
  expect(modal().queryByLabelText('Refine scale', { selector: 'input[type="number"]' })).toBe(null)
  // the switch flips ON — the submenu opens under its switch, never
  // a second editor
  const refineSwitch = modal().getByText('Refine pass').closest('label') ?? modal().getByText('Refine pass')
  fireEvent.click(refineSwitch)
  expect(modal().getByLabelText('Refine scale', { selector: 'input[type="number"]' })).toBeTruthy()
  expect((modal().getByLabelText('Refine scale', { selector: 'input[type="number"]' }) as HTMLInputElement).value).toBe('2')
})

test('ONE BAG COMPOSES — the axes stated together land in the one saved bag (the flow law at the field level: mask + anchors + denoise + refine in the same run)', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit, onPatch: undefined }))
  openLeafViaPicker('Video edit')
  expect(onEdit).not.toHaveBeenCalled()
  pickMenuRow('Identity anchors', 'Still + mannequin')
  fireEvent.change(denoiseInput(), { target: { value: '1' } })
  const refineSwitch = modal().getByText('Refine pass').closest('label') ?? modal().getByText('Refine pass')
  fireEvent.click(refineSwitch)
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [key, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(key).toBe('edit')
  expect(bag).toHaveLength(1)
  // the whole matrix in ONE bag — the compose the §0.8 face promised,
  // stated through the axes themselves
  expect(bag[0]).toMatchObject({ mask_source: 'region', reference: 'still+mannequin', denoise: 1, refine: true, scale: 2 })
})

test('a SEATED bag opens the modal on the merge via its tile (staged files stay; the axes re-state over the seated values)', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, {
    kinds: [EDIT],
    values: { edit: [{ mask_source: 'region', reference: 'self', denoise: 0.32, still: 'stills/girl.png' }] },
    onEdit, onPatch: undefined,
  }))
  openSeatedLeafViaTile(0)
  // the modal opened ON THE MERGE: the seated dials present
  expect(denoiseInput().value).toBe('0.32')
  // a hand-move on the pole is intent — it stays in the draft
  fireEvent.change(denoiseInput(), { target: { value: '0.7' } })
  expect(denoiseInput().value).toBe('0.7')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  // the staged STILL survives the whole walk (a merge, never a replace)
  expect(bag[0]).toMatchObject({ mask_source: 'region', denoise: 0.7, still: 'stills/girl.png' })
})

// ── THE OPTION SHAPE (the served-catalog kind): the catalog IS the
// seat — the picker + strength dial ride the leaf; no posture layer
// renders for option kinds either (the cells are engine-side). ──
const OPTION_PRESET = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'p1', label: 'Plain', defaults: { strength: 0.5, steps: 4 } },
    { value: 'p2', label: 'Turbo', defaults: { strength: 0.8, steps: 8 } },
  ],
  sections: [
    { id: 'turbo-6', label: 'Turbo 6', patch: { id: 'p2', strength: 0.75, steps: 6, note: 'staged note' } },
  ],
} as unknown as ModifierKind

test('(the option shape) the catalog is the seat — the picker and dials ride the leaf, and NO posture layer renders over them', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, {
    kinds: [OPTION_PRESET],
    values: { loras: [{ id: 'p1', strength: 0.5, steps: 4 }] },
    onEdit, onPatch: undefined,
  }))
  openSeatedLeafViaTile(0)
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(modal().getByLabelText('LoRA').textContent).toBe('Plain')
  expect((modal().getByLabelText('Strength', { selector: 'input' }) as HTMLInputElement).value).toBe('0.5')
  expect((modal().getByLabelText(chromeCopy.stepsAppliedLabel, { selector: 'input' }) as HTMLInputElement).value).toBe('4')
  // the option kind carries cells in the fixture — the face ignores
  // them (the router that seeded them off a check died with the row)
  expect(document.querySelector('[data-mod-sections]')).toBe(null)
  expect(modal().queryByText('Turbo 6')).toBe(null)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(bag[0]).toMatchObject({ id: 'p1', strength: 0.5, steps: 4 })
})
