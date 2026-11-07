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

// (F2, the front-end evasion audit 2026-11-07) the preset contract
// was narrated for EVERY kind but seeded only for field kinds: a
// lawful hybrid-kind preset opened a dead modal — no dial moved, no
// switch row rendered, green everywhere. ONE law, all three shapes
// now: the patch's option/scalar seats open their own drafts, the
// cell's remaining dials ride the params, and the switches row
// renders inside the hybrid leaf too.
test("(F2) ONE LAW, ALL THREE SHAPES — a HYBRID kind's chip seeds the modal: the option/scalar seats open their drafts, the cell's dials ride the params", () => {
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
    presets: [
      { id: 'soft-depth', label: 'Soft depth', patch: { type: 'depth', strength: 0.35, cond: 'soft edges' } },
    ],
  } as unknown as ModifierKind
  render(h(ModifiersSection, {
    kinds: [HYBRID],
    values: { controlnets: [{ type: 'canny', strength: 0.9, cond: 'hard edges' }] },
    onEdit, onPatch: undefined,
  }))
  press('soft-depth')
  // the modal opened ON THE MERGE and the switches ride the hybrid
  // leaf too (the chips are the kind's OWN cells)
  expect(leafSwitch('soft-depth').getAttribute('aria-pressed')).toBe('true')
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

// ── THE OPTION SHAPE'S OWN ROUTER ARM (the F2 law's third shape):
// a served-catalog kind whose cell names the router's three seats
// (id/strength/steps). The seated bag's chip opens the leaf on the
// merge — the option-kind branch of routePresetPatch, the branch the
// field/hybrid walls never reach. ──
const OPTION_PRESET = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'p1', label: 'Plain', defaults: { strength: 0.5, steps: 4 } },
    { value: 'p2', label: 'Turbo', defaults: { strength: 0.8, steps: 8 } },
  ],
  presets: [
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

test("(F2, the option shape) a SEATED bag's chip seeds the leaf on the merge: the three seats route into their drafts and the save carries them", () => {
  const { onEdit } = seatOptionBag()
  press('turbo-6')
  // the modal opened on EDIT (the seated entry stays the entry); the
  // pick pane is the option shape's ONE-ROW seat (no switch row here —
  // the chips opened it)
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
  press('steps-6')
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

test('the painted cell re-pressed: the no-op un-paints with the manual-edit law and holds the staged dials (the switch is a door, never a toggle)', () => {
  const onEdit = vi.fn()
  render(h(ModifiersSection, { kinds: [EDIT], values: {}, onEdit, onPatch: undefined }))
  press('identity-swap')
  expect(leafSwitch('identity-swap').getAttribute('aria-pressed')).toBe('true')
  expect(denoiseInput().value).toBe('1')
  // THE RE-PRESS on the already-painted seat: onPresetPick's guard is
  // the no-op arm — it declines the re-paint (the seat IS the cell),
  // and the draftParams wrapper's un-paint STANDS: the cell drops its
  // paint exactly like a manual dial edit, while the staged dials hold
  fireEvent.click(leafSwitch('identity-swap'))
  expect(leafSwitch('identity-swap').getAttribute('aria-pressed')).not.toBe('true')
  expect(denoiseInput().value).toBe('1')
  // and the save still carries the cell — the staged draft survived
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  const [, bag] = onEdit.mock.calls[0] as [string, Array<Record<string, unknown>>]
  expect(bag[0]).toMatchObject({ mask_source: 'region', reference: 'still+mannequin', denoise: 1 })
})
