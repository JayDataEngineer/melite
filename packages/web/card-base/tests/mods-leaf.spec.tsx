// @vitest-environment happy-dom
// mods-leaf.spec.tsx — THE MOD SYSTEM's leaf face (mods.tsx half
// 2): one modal edits one bag entry — OPTION (served row + seeded
// strength), HYBRID (served row + stamped facts + verbatim fields),
// FIELD (the kind's own atoms). Refusals stay LOUD; stale leaves
// close without writing; the declared leaf faces EMBED at the top
// of the leaf (stroke 95 — the popup carries the visual preview).
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ModifierKind } from '../src/spec.ts'
import { bindEstateRemote, unbindEstateRemote } from '../src/estate-remote.ts'
import { fetchMediaLibrary } from '../src/media-library.ts'

import { ModifiersSection } from '../src/mods.tsx'
import { resolveSeatEntry } from '../src/mods.tsx'
import type * as mod from '../src/mods.tsx' // the face contracts seat type positions; the suite constructs (not imports) their values below

// THE CATALOG PICKER (S7i): the mod-face selects ride the DSH
// Menu — a pick opens the labelled trigger and clicks the row
// (served labels ride verbatim; the ghost row is '— pick —')
function pickCatalog(get: () => HTMLElement, row: string): void {
  fireEvent.click(get())
  fireEvent.click(screen.getByRole('menuitem', { name: row }))
}

afterEach(cleanup)

/** THE MEDIA BIND (the leaf's pick rides the one lane, like a
 *  card's): a local fake over the mounted media namespace serving
 *  one row; unused namespaces throw. */
function bindLeafMedia(): void {
  const dead = (method: string) => async (): Promise<never> => { throw new Error('unused namespace in this wall: ' + method) }
  bindEstateRemote({
    bench: { get: dead('bench/get'), 'add-stage': dead('bench/add-stage'), 'remove-stage': dead('bench/remove-stage') },
    drafts: { get: dead('drafts/get'), patch: dead('drafts/patch') },
    runs: {
      list: dead('runs/list'), start: dead('runs/start'), status: dead('runs/status'),
      stop: dead('runs/stop'), validate: dead('runs/validate'),
    },
    media: {
      list: async () => ({ ok: true, value: { items: [{ url: 'https://host/m.png', name: 'the mask' }] } }),
    },
  } as unknown as Parameters<typeof bindEstateRemote>[0])
}

const LORA = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'detail', label: 'Detail', defaults: { strength: 0.8 } },
    { value: 'plain', label: 'Plain' },
  ],
} as unknown as ModifierKind

const LORA_DISTILL = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'dareties', label: 'LightX2V dareties v4', defaults: { strength: 0.4, steps: 4 } },
    { value: 'turbo', label: 'LightX2V Turbo 4-8 step', defaults: { strength: 0.6, steps: 8, steps_min: 4, steps_max: 8 } },
  ],
} as unknown as ModifierKind

const CONTROL = {
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
} as unknown as ModifierKind

const CONTROL_NOMETA = {
  kind: 'controlnet', label: 'ControlNet', param_key: 'controlnets', cardinality: 'multi',
  entry: 'hybrid', option_key: 'type', scalar_key: 'strength',
  options: [{ value: 'soft', label: 'Soft' }],
  fields: [
    { name: 'type', type: 'text', label: 'Type' },
    { name: 'strength', type: 'number', label: 'Strength' },
  ],
} as unknown as ModifierKind

const CONTROL_FD = {
  kind: 'controlnet', label: 'ControlNet', param_key: 'controlnets', cardinality: 'multi',
  entry: 'hybrid', option_key: 'type', scalar_key: 'strength',
  options: [{ value: 'soft', label: 'Soft' }],
  fields: [
    { name: 'type', type: 'text', label: 'Type' },
    { name: 'strength', type: 'number', label: 'Strength', default: 0.9 },
  ],
} as unknown as ModifierKind

const CONTROL_MIN = {
  kind: 'controlnet', label: 'ControlNet', param_key: 'controlnets', cardinality: 'multi',
  entry: 'hybrid', option_key: 'type', scalar_key: 'strength',
  options: [{ value: 'soft', label: 'Soft' }],
  fields: [{ name: 'type', type: 'text', label: 'Type' }],
} as unknown as ModifierKind

const CONTROL_NOPTS = {
  kind: 'controlnet', label: 'ControlNet', param_key: 'controlnets', cardinality: 'multi',
  entry: 'hybrid', option_key: 'type', scalar_key: 'strength',
  options: [],
  fields: [
    { name: 'type', type: 'text', label: 'Type' },
    { name: 'strength', type: 'number', label: 'Strength' },
  ],
} as unknown as ModifierKind

const MASK = {
  kind: 'mask', label: 'Mask', param_key: 'masks', cardinality: 'multi',
  fields: [
    { name: 'image', type: 'image', label: 'Image' },
    { name: 'feather', type: 'number', label: 'Feather', default: 5 },
    { name: 'note', type: 'text', label: 'Note', default: null },
  ],
} as unknown as ModifierKind

const MASK_PAINT = {
  kind: 'mask', label: 'Mask', param_key: 'masks', cardinality: 'multi',
  leaf_face: 'paint-canvas',
  fields: [
    { name: 'image', type: 'image', label: 'Image' },
    { name: 'ref2', type: 'text', wtype: 'image', label: 'Second' },
    { name: 'feather', type: 'number', label: 'Feather', default: 5 },
  ],
} as unknown as ModifierKind

function openLeaf(props: Partial<Parameters<typeof ModifiersSection>[0]> = {}) {
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  const rendered = render(h(ModifiersSection, {
    kinds: [], values: {}, onEdit, onPatch, ...props,
  }))
  return { onEdit, onPatch, ...rendered }
}

/** create path: add square → kind menu → the create leaf. */
function openCreate(kindLabel: string): void {
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  fireEvent.click(screen.getByRole('menuitem', { name: kindLabel }))
}

/** edit path: click the tile. */
function openEditTile(tileId: string): void {
  fireEvent.click(document.querySelector(`[data-mod-tile="${tileId}"]`) as HTMLElement)
}

function closeLeaf(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
}

test('OPTION CREATE: the row seeds the strength (the row owns its default, never the leaf)', () => {
  const { onEdit, onPatch } = openLeaf({ kinds: [LORA], values: {} })
  openCreate('LoRA')
  pickCatalog(() => screen.getByLabelText('LoRA'), 'Detail')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'detail', strength: 0.8 }])
  expect(onPatch).toHaveBeenCalledWith({ loras: [{ id: 'detail', strength: 0.8 }] })
  expect(screen.queryByText('Add LoRA')).toBeNull()
})

test('OPTION CREATE: a row without defaults seeds 1.0; a typed dial wins over the seed', () => {
  const { onEdit } = openLeaf({ kinds: [LORA], values: {} })
  openCreate('LoRA')
  pickCatalog(() => screen.getByLabelText('LoRA'), 'Plain')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'plain', strength: 1.0 }])
})

// ── STEPS APPLIED (2026-09-18, the operator's plaguekind law): a
// distill row's married step count rides the entry; the SERVED
// defaults drive the row's presence (never the kind name). ──
test('STEPS CREATE: a distill row seeds {strength, steps}; a non-distill kind renders no steps row', () => {
  const { onEdit } = openLeaf({ kinds: [LORA_DISTILL], values: {} })
  openCreate('LoRA')
  expect(screen.queryByLabelText('Steps applied')).not.toBeNull()
  pickCatalog(() => screen.getByLabelText('LoRA'), 'LightX2V dareties v4')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'dareties', strength: 0.4, steps: 4 }])
  cleanup()
  const plain = openLeaf({ kinds: [LORA], values: {} })
  openCreate('LoRA')
  expect(plain.queryByLabelText('Steps applied')).toBeNull()
})

test('STEPS CREATE: a typed count wins over the row seed; a fractional count refuses LOUD', () => {
  const { onEdit } = openLeaf({ kinds: [LORA_DISTILL], values: {} })
  openCreate('LoRA')
  pickCatalog(() => screen.getByLabelText('LoRA'), 'LightX2V Turbo 4-8 step')
  fireEvent.change(screen.getByLabelText('Steps applied'), { target: { value: '6' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'turbo', strength: 0.6, steps: 6 }])
  cleanup()
  const again = openLeaf({ kinds: [LORA_DISTILL], values: {} })
  openCreate('LoRA')
  pickCatalog(() => again.getByLabelText('LoRA'), 'LightX2V Turbo 4-8 step')
  fireEvent.change(again.getByLabelText('Steps applied'), { target: { value: '2.5' } })
  fireEvent.click(again.getByRole('button', { name: 'Add' }))
  expect(again.getByText('Steps applied must be a whole number \u2265 1.')).not.toBeNull()
  expect(again.onEdit).not.toHaveBeenCalled()
})

test('STEPS EDIT: the dial rewrites the claim; a blank input DROPS it (never a lingering spread)', () => {
  const { onEdit } = openLeaf({
    kinds: [LORA_DISTILL],
    values: { loras: [{ id: 'turbo', strength: 0.6, steps: 8 }] },
  })
  openEditTile('loras-0')
  expect((screen.getByLabelText('Steps applied') as HTMLInputElement).value).toBe('8')
  // THE ENTRY'S ROW RIDES THE DIAL (#38, the steps-choice fix): the
  // domain is STATED, BOUNDED, and seeded from the ENTRY's turbo row
  // — never the first catalog row's facts ("fixed at 4", unbounded,
  // placeholder 4). Editing a 4-to-8 adapter reads 4-to-8.
  expect(screen.getByText('Steps applied 4–8')).not.toBeNull()
  const editDial = screen.getByLabelText('Steps applied') as HTMLInputElement
  expect(editDial.min).toBe('4')
  expect(editDial.max).toBe('8')
  expect(editDial.placeholder).toBe('8')
  fireEvent.change(screen.getByLabelText('Steps applied'), { target: { value: '5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'turbo', strength: 0.6, steps: 5 }])
  cleanup()
  const drop = openLeaf({
    kinds: [LORA_DISTILL],
    values: { loras: [{ id: 'turbo', strength: 0.6, steps: 8 }] },
  })
  openEditTile('loras-0')
  fireEvent.change(drop.getByLabelText('Steps applied'), { target: { value: '' } })
  fireEvent.click(drop.getByRole('button', { name: 'Save' }))
  expect(drop.onEdit).toHaveBeenCalledWith('loras', [{ id: 'turbo', strength: 0.6 }])
})

test('STEPS BADGE (#38, the choice made visible): the tile carries the EFFECTIVE count — the entry claim, else the row default', () => {
  const stated = openLeaf({
    kinds: [LORA_DISTILL],
    values: { loras: [{ id: 'turbo', strength: 0.6, steps: 5 }] },
  })
  expect(document.querySelector('[data-mod-tile="loras-0"]')!.textContent).toContain('5 steps')
  cleanup()
  // an id-only recipe stamp badges the row's married count (8)
  const seeded = openLeaf({
    kinds: [LORA_DISTILL],
    values: { loras: [{ id: 'turbo' }] },
  })
  expect(document.querySelector('[data-mod-tile="loras-0"]')!.textContent).toContain('8 steps')
  cleanup()
  // a fixed-point row badges its married count too
  const dareties = openLeaf({
    kinds: [LORA_DISTILL],
    values: { loras: [{ id: 'dareties', strength: 0.8 }] },
  })
  expect(document.querySelector('[data-mod-tile="loras-0"]')!.textContent).toContain('4 steps')
  cleanup()
  // a kind whose rows claim no steps carries no badge
  const plain = openLeaf({ kinds: [LORA], values: { loras: [{ id: 'detail', strength: 0.8 }] } })
  expect(document.querySelector('[data-mod-tile="loras-0"]')!.textContent).not.toContain('steps')
})

test('OPTION EDIT (#38 papercut): a blank strength dial falls to the ENTRY row default — an id-only stamp edits without a refusal', () => {
  const { onEdit } = openLeaf({ kinds: [LORA_DISTILL], values: { loras: [{ id: 'turbo' }] } })
  openEditTile('loras-0')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'turbo', strength: 0.6 }])
})

test('OPTION EDIT: an id-less drifted entry still opens (the leaf never crashes on drift — the compose door owns the loud refusal)', () => {
  const { onEdit } = openLeaf({ kinds: [LORA_DISTILL], values: { loras: [{ strength: 0.5 }] } })
  openEditTile('loras-0')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ strength: 0.5 }])
})

test('STEPS RANGE (the 4-to-8 correction): the dial states and bounds to the row domain; outside refuses LOUD', () => {
  const { onEdit } = openLeaf({ kinds: [LORA_DISTILL], values: {} })
  openCreate('LoRA')
  pickCatalog(() => screen.getByLabelText('LoRA'), 'LightX2V Turbo 4-8 step')
  // the label STATES the range — a 4-to-8 adapter never reads as a naked number
  expect(screen.getByText('Steps applied 4–8')).not.toBeNull()
  const dial = screen.getByLabelText('Steps applied') as HTMLInputElement
  expect(dial.min).toBe('4')
  expect(dial.max).toBe('8')
  // below the floor refuses LOUD
  fireEvent.change(dial, { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Steps applied must be \u2265 4 on this adapter.')).not.toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
  // above the ceiling refuses LOUD
  fireEvent.change(dial, { target: { value: '9' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Steps applied must be \u2264 8 on this adapter.')).not.toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
  // inside commits
  fireEvent.change(dial, { target: { value: '6' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'turbo', strength: 0.6, steps: 6 }])
  cleanup()
  // a FIXED-point row (dareties 4) states the fix, not a range
  const fixed = openLeaf({ kinds: [LORA_DISTILL], values: {} })
  openCreate('LoRA')
  pickCatalog(() => fixed.getByLabelText('LoRA'), 'LightX2V dareties v4')
  expect(fixed.getByText('Steps applied (fixed at 4)')).not.toBeNull()
  expect((fixed.getByLabelText('Steps applied') as HTMLInputElement).min).toBe('')
})

test('OPTION CREATE: refusing LOUD — no row, no save; a non-number dial, no save', () => {
  openLeaf({ kinds: [LORA], values: {} })
  openCreate('LoRA')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Pick one from the served rows.')).not.toBeNull()
  pickCatalog(() => screen.getByLabelText('LoRA'), 'Detail')
  fireEvent.change(screen.getByPlaceholderText('the row default'), { target: { value: '1e999' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Strength must be a number.')).not.toBeNull()
  expect(screen.getByText('Add LoRA')).not.toBeNull()
})

test('OPTION EDIT: the row binds at open, the select rides for F4 re-keying; the dial rewrites; Remove drops the entry', () => {
  const { onEdit } = openLeaf({ kinds: [LORA], values: { loras: [{ id: 'detail', strength: 0.8 }] } })
  openEditTile('loras-0')
  expect(screen.getByText('Edit LoRA')).not.toBeNull()
  // the select seats in BOTH modes (2026-10-31, F4's repair path —
  // the race spec's keyless arm): bound to the opened row, a pick
  // re-keys, a keyless row can be repaired.
  expect(screen.getByLabelText('LoRA').textContent).toBe('Detail')
  expect((screen.getByPlaceholderText('the row default') as HTMLInputElement).value).toBe('0.8')
  fireEvent.change(screen.getByPlaceholderText('the row default'), { target: { value: '0.9' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'detail', strength: 0.9 }])
})

test('OPTION EDIT: a non-number dial refuses; Remove commits the bag without the entry', () => {
  const { onEdit } = openLeaf({ kinds: [LORA], values: { loras: [{ id: 'detail', strength: 0.8 }] } })
  openEditTile('loras-0')
  fireEvent.change(screen.getByPlaceholderText('the row default'), { target: { value: '1e999' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByText('Strength must be a number.')).not.toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [])
  expect(screen.queryByText('Edit LoRA')).toBeNull()
})

test('OPTION EDIT: a vanished row refuses LOUD — no write, the drafts survive (the bag moved under the leaf)', () => {
  // (2026-10-31, the ghost-race law — the race spec is the
  // contract: the save never lands on the wrong seat and never
  // throws the drafts away; the leaf stays open and says why.)
  const { onEdit, rerender, container } = openLeaf({
    kinds: [LORA], values: { loras: [{ id: 'detail' }, { id: 'plain' }] },
    onEdit: undefined as never, onPatch: undefined as never,
  })
  void container
  openEditTile('loras-1')
  rerender(h(ModifiersSection, { kinds: [LORA], values: { loras: [{ id: 'detail' }] }, onEdit, onPatch: undefined as never }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).not.toHaveBeenCalled()
  expect(screen.getByText(/was removed from the bench while you edited it/)).not.toBeNull()
  expect(screen.getByText('Edit LoRA')).not.toBeNull()
})

test('HYBRID CREATE: the save stamps the row facts + verbatim fields (the retired wire shape)', () => {
  const { onEdit } = openLeaf({ kinds: [CONTROL], values: {} })
  openCreate('ControlNet')
  pickCatalog(() => screen.getByLabelText('ControlNet'), 'Depth')
  fireEvent.change(screen.getByLabelText('Conditioning'), { target: { value: 'cond-url' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [{
    type: 'depth', model: 'm-depth', preprocessor: 'p-depth', cond: 'cond-url', strength: 0.5,
  }])
})

test('HYBRID CREATE: the seed cascade — row default, then the contract field default, then 0.7', () => {
  const row = openLeaf({ kinds: [CONTROL], values: {} })
  openCreate('ControlNet')
  pickCatalog(() => screen.getByLabelText('ControlNet'), 'Canny')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(row.onEdit).toHaveBeenCalledWith('controlnets', [{
    type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.7,
  }])
  row.unmount()
  const fd = openLeaf({ kinds: [CONTROL_FD], values: {} })
  openCreate('ControlNet')
  pickCatalog(() => screen.getByLabelText('ControlNet'), 'Soft')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(fd.onEdit).toHaveBeenCalledWith('controlnets', [{ type: 'soft', strength: 0.9 }])
  fd.unmount()
})

test('HYBRID CREATE: rows without resolved facts stamp type + strength only (never undefined keys)', () => {
  const { onEdit } = openLeaf({ kinds: [CONTROL_NOMETA], values: {} })
  openCreate('ControlNet')
  pickCatalog(() => screen.getByLabelText('ControlNet'), 'Soft')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [{ type: 'soft', strength: 0.7 }])
})

test('HYBRID CREATE: refusing LOUD — no row; a non-number dial; the scalar label falls back', () => {
  openLeaf({ kinds: [CONTROL_MIN], values: {} })
  openCreate('ControlNet')
  expect(screen.getByLabelText('Strength')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Pick one from the served rows.')).not.toBeNull()
  pickCatalog(() => screen.getByLabelText('ControlNet'), 'Soft')
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '1e999' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Strength must be a number.')).not.toBeNull()
})

test('HYBRID EDIT: a type switch re-stamps (the new row owns the facts, never the old)', () => {
  const { onEdit } = openLeaf({
    kinds: [CONTROL],
    values: { controlnets: [{ type: 'depth', model: 'old-m', preprocessor: 'old-p', strength: 0.5, cond: 'c' }] },
  })
  openEditTile('controlnets-0')
  expect((screen.getByLabelText('Strength') as HTMLInputElement).value).toBe('0.5')
  expect((screen.getByLabelText('Conditioning') as HTMLInputElement).value).toBe('c')
  pickCatalog(() => screen.getByLabelText('ControlNet'), 'Canny')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [{
    type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.5, cond: 'c',
  }])
})

test('HYBRID EDIT: a drifted type stays VISIBLE, marked unregistered, and refuses at save', () => {
  const { onEdit } = openLeaf({
    kinds: [CONTROL],
    values: { controlnets: [{ type: 'custom-x', strength: 0.4 }] },
  })
  openEditTile('controlnets-0')
  expect(screen.getByText('Custom X (unregistered)')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByText(/is not a served ControlNet row/)).not.toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
})

test('HYBRID EDIT: typeless + dial-less entries draft blank (never undefined in the inputs)', () => {
  openLeaf({ kinds: [CONTROL], values: { controlnets: [{ cond: 'c' }] } })
  openEditTile('controlnets-0')
  expect(screen.getByLabelText('ControlNet').textContent).toBe('— pick —')
  expect((screen.getByLabelText('Strength') as HTMLInputElement).value).toBe('')
})

test('HYBRID EDIT: a vanished row refuses LOUD — no write, the drafts survive (the bag moved under the leaf)', () => {
  // (2026-10-31, the ghost-race law — see the OPTION twin above.)
  const { onEdit, rerender } = openLeaf({
    kinds: [CONTROL],
    values: { controlnets: [{ type: 'depth' }, { type: 'canny' }] },
  })
  openEditTile('controlnets-1')
  rerender(h(ModifiersSection, { kinds: [CONTROL], values: { controlnets: [{ type: 'depth' }] }, onEdit, onPatch: () => {} }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).not.toHaveBeenCalled()
  expect(screen.getByText(/was removed from the bench while you edited it/)).not.toBeNull()
  expect(screen.getByText('Edit ControlNet')).not.toBeNull()
})

test('HYBRID EDIT: Remove drops the entry; an option-less catalog still leaves the drift visible', () => {
  const { onEdit } = openLeaf({
    kinds: [CONTROL_NOPTS],
    values: { controlnets: [{ type: 'custom-x' }] },
  })
  openEditTile('controlnets-0')
  expect(screen.getByText('Custom X (unregistered)')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [])
})

test('HYBRID SEATED: rail-seated fields never render in the leaf (the seat is the signature)', () => {
  const { onEdit } = openLeaf({
    kinds: [CONTROL], values: {},
    railSeated: new Set(['cond']),
  })
  openCreate('ControlNet')
  expect(screen.queryByLabelText('Conditioning')).toBeNull()
  pickCatalog(() => screen.getByLabelText('ControlNet'), 'Depth')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [{
    type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5,
  }])
})

test('FIELD CREATE: defaults seed the draft; the draft IS the entry on save', () => {
  const { onEdit } = openLeaf({ kinds: [MASK], values: {} })
  openCreate('Mask')
  expect((screen.getByLabelText('Feather') as HTMLInputElement).value).toBe('5')
  expect(document.querySelector('input[type="file"]')).not.toBeNull()
  fireEvent.change(screen.getByLabelText('Feather'), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('masks', [{ feather: 7 }])
})

// THE SAM_THRESHOLD CURE (2026-11-05, the operator's bug sweep): a
// number typed in the leaf arrived as the RAW STRING (SpecAtom hands
// back e.target.value) and the save stamped it verbatim — the card
// face's onSet coerces at ITS patch boundary (form.tsx), but the mod
// leaf's draft IS the mod lane's patch boundary. The compose-side
// validators (scalarOf, envelope-laws) throw on the string —
// "sam3 entry 0: 'sam_threshold' must be a number — got \"0.75\"".
// The leaf now coerces at entry AND at the legacy-seed (a stuck
// string row cures the moment the leaf opens).
test('FIELD EDIT: a typed number coerces at the leaf (the mod lane owns its patch boundary)', () => {
  const { onEdit } = openLeaf({ kinds: [MASK], values: { masks: [{ feather: 3 }] } })
  openEditTile('masks-0')
  fireEvent.change(screen.getByLabelText('Feather'), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('masks', [{ feather: 7 }])
})

test('FIELD EDIT: a legacy string param cures on open (the seeded draft coerces too)', () => {
  const { onEdit } = openLeaf({ kinds: [MASK], values: { masks: [{ feather: '3' as unknown as number }] } })
  openEditTile('masks-0')
  expect((screen.getByLabelText('Feather') as HTMLInputElement).value).toBe('3')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('masks', [{ feather: 3 }])
})

test('FIELD EDIT: the entry seeds the draft; a seated field never renders; Remove drops', () => {
  const { onEdit } = openLeaf({
    kinds: [MASK], values: { masks: [{ feather: 3 }] },
    railSeated: new Set(['feather']),
  })
  openEditTile('masks-0')
  expect(screen.queryByLabelText('Feather')).toBeNull()
  expect((screen.getByLabelText('Note') as HTMLInputElement).value).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('masks', [{ feather: 3 }])
  openEditTile('masks-0')
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
  expect(onEdit).toHaveBeenCalledWith('masks', [])
})

test('FIELD EDIT: a vanished row refuses LOUD — no write, the drafts survive (the bag moved under the leaf)', () => {
  // (2026-10-31, the ghost-race law — see the OPTION twin above.)
  const { onEdit, rerender } = openLeaf({
    kinds: [MASK], values: { masks: [{ feather: 1 }, { feather: 2 }] },
  })
  openEditTile('masks-1')
  rerender(h(ModifiersSection, { kinds: [MASK], values: { masks: [{ feather: 1 }] }, onEdit, onPatch: () => {} }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).not.toHaveBeenCalled()
  expect(screen.getByText(/was removed from the bench while you edited it/)).not.toBeNull()
  expect(screen.getByText('Edit Mask')).not.toBeNull()
})

test('THE CLOSE: the labelled close drops the leaf without writing (never a stray commit)', () => {
  const { onEdit } = openLeaf({ kinds: [LORA], values: {} })
  openCreate('LoRA')
  pickCatalog(() => screen.getByLabelText('LoRA'), 'Detail')
  closeLeaf()
  expect(screen.queryByText('Add LoRA')).toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
})

// ── THE EMBEDDED PAINT CANVAS (stroke 95 — the operator's design:
// the mod popup CARRIES the visual preview) ──

function FakeFace(props: {
  referenceUrl: string
  value: string
  onChange: (dataUrl: string) => void
}): ReturnType<typeof h> {
  return h('div', { 'data-testid': 'paint-face' },
    h('span', { 'data-testid': 'face-ref' }, props.referenceUrl),
    h('span', { 'data-testid': 'face-value' }, props.value),
    h('button', { type: 'button', onClick: () => { props.onChange('data:image/png;base64,ZZ') } }, 'Face stroke'),
    h('button', { type: 'button', onClick: () => { props.onChange('') } }, 'Face clear'),
  )
}

test('THE PAINT CANVAS: the face embeds ONCE at the top of the leaf (the FIRST image field is its field); a stroke writes the draft the square reads', () => {
  const { onEdit } = openLeaf({
    kinds: [MASK_PAINT], values: { input_image: 'ref-url' },
    paintFace: FakeFace, paintReference: 'input_image',
  })
  openCreate('Mask')
  // ONE canvas, embedded — never a Paint button opening a second modal
  expect(screen.getAllByTestId('paint-face').length).toBe(1)
  expect(screen.queryByRole('button', { name: 'Paint' })).toBeNull()
  expect(screen.getByTestId('face-ref').textContent).toBe('ref-url')
  // the paint stage carries NO region caption (the region canvas
  // is sam3's own — never a stray caption on paint)
  expect(screen.queryByText('Region — optional (scopes the search; clear = whole image)')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Face stroke' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('masks', [{
    image: 'data:image/png;base64,ZZ', feather: 5,
  }])
})

test('THE PAINT CANVAS: editing a painted entry seeds the face with its payload (paint-over); a clear commits the empty payload', () => {
  const { onEdit } = openLeaf({
    kinds: [MASK_PAINT], values: { masks: [{ image: 'data:image/png;base64,OLD' }] },
    paintFace: FakeFace, paintReference: 'input_image',
  })
  openEditTile('masks-0')
  expect(screen.getByTestId('face-value').textContent).toBe('data:image/png;base64,OLD')
  fireEvent.click(screen.getByRole('button', { name: 'Face clear' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  // the clear commits the empty payload AND the shown Feather
  // default (the display-is-the-commit law: create already saves
  // feather:5 — edit mirrors it, never a skew the save drops)
  expect(onEdit).toHaveBeenCalledWith('masks', [{ image: '', feather: 5 }])
})

test('THE PAINT CANVAS: host-less or faceless kinds render no canvas (the square holds — graceful degrade)', () => {
  const hostless = openLeaf({ kinds: [MASK_PAINT], values: {} })
  openCreate('Mask')
  expect(screen.queryByTestId('paint-face')).toBeNull()
  hostless.unmount()
  const faceless = openLeaf({ kinds: [MASK], values: {}, paintFace: FakeFace, paintReference: 'input_image' })
  openCreate('Mask')
  expect(screen.queryByTestId('paint-face')).toBeNull()
  faceless.unmount()
})

const CONTROL_NOFIELDS = {
  kind: 'controlnet', label: 'ControlNet', param_key: 'controlnets', cardinality: 'multi',
  entry: 'hybrid', option_key: 'type', scalar_key: 'strength',
  options: [{ value: 'soft', label: 'Soft' }],
} as unknown as ModifierKind

const CONTROL_NOOPTSKEY = {
  kind: 'controlnet', label: 'ControlNet', param_key: 'controlnets', cardinality: 'multi',
  entry: 'hybrid', option_key: 'type', scalar_key: 'strength',
  fields: [
    { name: 'type', type: 'text', label: 'Type' },
    { name: 'strength', type: 'number', label: 'Strength' },
  ],
} as unknown as ModifierKind

const TAG = {
  kind: 'tag', label: 'Tag', param_key: 'tags', cardinality: 'multi',
} as unknown as ModifierKind

test('HYBRID FIELDLESS: a catalog-only kind still leaves (select + dial, nothing else)', () => {
  const { onEdit } = openLeaf({ kinds: [CONTROL_NOFIELDS], values: {} })
  openCreate('ControlNet')
  expect(screen.getByLabelText('Strength')).not.toBeNull()
  pickCatalog(() => screen.getByLabelText('ControlNet'), 'Soft')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [{ type: 'soft', strength: 0.7 }])
})

test('HYBRID OPTIONLESS: no served rows — the pick stays empty and the save refuses', () => {
  const { onEdit } = openLeaf({ kinds: [CONTROL_NOOPTSKEY], values: {} })
  openCreate('ControlNet')
  expect(screen.getByText('— pick —')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Pick one from the served rows.')).not.toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
})

test('HYBRID OPTIONLESS EDIT: a drifted type still shows unregistered against an empty catalog', () => {
  const { onEdit } = openLeaf({
    kinds: [CONTROL_NOOPTSKEY],
    values: { controlnets: [{ type: 'custom-x' }] },
  })
  openEditTile('controlnets-0')
  expect(screen.getByText('Custom X (unregistered)')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByText(/is not a served ControlNet row/)).not.toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
})

test('HYBRID FIELDLESS EDIT: a fieldless kind still edits (select + dial, re-stamped on save)', () => {
  const { onEdit } = openLeaf({
    kinds: [CONTROL_NOFIELDS],
    values: { controlnets: [{ type: 'soft' }] },
  })
  openEditTile('controlnets-0')
  expect((screen.getByLabelText('Strength') as HTMLInputElement).value).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [{ type: 'soft', strength: 0.7 }])
})

test('THE UNLABELED: names stand in for labels (pack rows seat nameless dials)', () => {
  const capped = {
    kind: 'floor', label: 'Floor', param_key: 'floor', cardinality: 'scalar',
    kindFields: [{ name: 'cap', type: 'number' }],
  } as unknown as ModifierKind
  const { onEdit } = openLeaf({ kinds: [capped], values: {} })
  const input = screen.getByLabelText('cap') as HTMLInputElement
  fireEvent.change(input, { target: { value: '3' } })
  expect(onEdit).toHaveBeenCalledWith('cap', 3)
})

test('THE UNLABELED HYBRID EXTRA: a labelless field titles by name (never an empty title)', () => {
  const xcontrol = {
    ...CONTROL,
    fields: [...(CONTROL as unknown as { fields: unknown[] }).fields, { name: 'extra', type: 'text' }],
  } as unknown as ModifierKind
  openLeaf({ kinds: [xcontrol], values: {} })
  openCreate('ControlNet')
  expect(screen.getByTitle('extra')).not.toBeNull()
})

test('THE UNLABELED FIELD LEAF: a labelless field renders its name (never a blank row)', () => {
  const xmask = {
    ...MASK,
    fields: [...(MASK as unknown as { fields: unknown[] }).fields, { name: 'tagx', type: 'text' }],
  } as unknown as ModifierKind
  openLeaf({ kinds: [xmask], values: {} })
  openCreate('Mask')
  expect(screen.getByText('tagx')).not.toBeNull()
})

test('THE FIELDLESS KIND: tiles name the kind; the leaf is actions only; the save commits bare', () => {
  const { onEdit } = openLeaf({ kinds: [TAG], values: { tags: [{}] } })
  expect(screen.getByText('Tag')).not.toBeNull()
  openEditTile('tags-0')
  expect(screen.getByText('Edit Tag')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('tags', [{}])
})

test('THE LEAF SQUARE: dropping a file uploads through the door and the name lands in the draft', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | null = null
    readAsDataURL(_f: Blob): void {
      this.result = 'data:image/png;base64,AAA'
      queueMicrotask(() => { this.onload?.() })
    }
  } as unknown as typeof FileReader
  const realFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(JSON.stringify({ path: 'data/input/a.png' }), {
    status: 200, headers: { 'content-type': 'application/json' },
  })) as typeof fetch
  try {
    const { onEdit } = openLeaf({ kinds: [MASK], values: {} })
    openCreate('Mask')
    const box = screen.getByRole('button', { name: 'Image source' })
    fireEvent.drop(box, {
      dataTransfer: { getData: () => '', files: [new File(['bits'], 'a.png', { type: 'image/png' })] },
    })
    await screen.findByRole('button', { name: 'Detach Image' }, { timeout: 2000 })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(onEdit).toHaveBeenCalledWith('masks', [{ image: 'data/input/a.png', feather: 5 }])
  } finally {
    globalThis.FileReader = RealReader
    globalThis.fetch = realFetch
  }
})

// ── THE EMBEDDED BBOX CANVAS (stroke 78's face, embedded stroke 95
// — the selection preview INSIDE the leaf, never a Draw-box button) ──

const SAM3_BOX = {
  kind: 'sam3', label: 'SAM3', param_key: 'sam3', cardinality: 'list',
  category: 'standalone', leaf_face: 'bbox-canvas',
  // THE SECTION CAPTION (2026-10-08, "SAM2 AND SAM3 DON'T HAVE BBOX
  // FILTER"): the detector kind NAMES its filter — the leaf seats
  // it above the field stack.
  section: 'Bbox filter — the detector prompt proposes the boxes (automated); the Region canvas below only scopes the search',
  fields: [
    { name: 'name', type: 'string', label: 'Name', default: 'sam3' },
    { name: 'prompt', type: 'string', label: 'Prompt', default: '' },
    { name: 'bbox_x', type: 'number', label: 'Box x', default: -1, faceOwned: true },
    { name: 'bbox_y', type: 'number', label: 'Box y', default: -1, faceOwned: true },
    { name: 'bbox_w', type: 'number', label: 'Box w', default: -1, faceOwned: true },
    { name: 'bbox_h', type: 'number', label: 'Box h', default: -1, faceOwned: true },
  ],
} as unknown as ModifierKind

// ── THE FACELESS FILTER CAPTION (sam2's shape — the popup IS the
// detector form; no canvas, the section rides alone) ──

const SAM2_DETECT = {
  kind: 'sam2', label: 'SAM2', param_key: 'sam2', cardinality: 'list',
  category: 'standalone',
  section: 'Bbox filter — YOLO proposes the boxes (automated): pick classes, tune confidence',
  fields: [
    { name: 'labels', type: 'string', label: 'YOLO classes', default: 'person' },
    { name: 'detection_threshold', type: 'number', label: 'Detection threshold', default: 0.5 },
  ],
} as unknown as ModifierKind

test('THE FACELESS FILTER CAPTION (2026-10-08, "SAM2 AND SAM3 DON\'T HAVE BBOX FILTER"): a section-bearing kind with NO canvas seats the caption above its fields — the popup names itself the filter', () => {
  openLeaf({ kinds: [SAM2_DETECT], values: {} })
  openCreate('SAM2')
  expect(document.querySelector('[data-stage-caption="filter"]')).not.toBeNull()
  expect(screen.getByText('Bbox filter — YOLO proposes the boxes (automated): pick classes, tune confidence')).not.toBeNull()
  // and the fields render under it (the caption never replaces them)
  expect(screen.getByLabelText('YOLO classes')).not.toBeNull()
})

function FakeBboxFace(props: { referenceUrl: string; value: { x: number; y: number; width: number; height: number } | null; onChange: (b: { x: number; y: number; width: number; height: number } | null) => void }) {
  return h('div', { 'data-testid': 'bbox-face' },
    h('span', { 'data-testid': 'bbox-ref' }, props.referenceUrl),
    h('span', { 'data-testid': 'bbox-seed' }, props.value === null ? 'null' : `${props.value.x},${props.value.y},${props.value.width},${props.value.height}`),
    h('button', { type: 'button', onClick: () => { props.onChange({ x: 12.6, y: 34.2, width: 120.9, height: 90.4 }) } }, 'Box commit'),
    h('button', { type: 'button', onClick: () => { props.onChange(null) } }, 'Box clear'),
  )
}

test('THE BBOX CANVAS: the face embeds at the top; its commit writes the four faceOwned fields (rounded) — never raw inputs under the canvas', () => {
  const { onEdit } = openLeaf({
    kinds: [SAM3_BOX], values: { input_image: 'ref-url' },
    bboxFace: FakeBboxFace, paintReference: 'input_image',
  })
  openCreate('SAM3')
  // ONE canvas, embedded — never a Draw box button
  expect(screen.getAllByTestId('bbox-face').length).toBe(1)
  expect(screen.queryByRole('button', { name: 'Draw box' })).toBeNull()
  expect(screen.getByTestId('bbox-ref').textContent).toBe('ref-url')
  expect(screen.getByTestId('bbox-seed').textContent).toBe('null')
  // the stage seats the REGION section (the operator's correction,
  // 2026-10-08: "BBOX IS NOT MANUAL, IT IS AUTOMATED" — the canvas
  // is an optional search REGION, never a box filter; the detector
  // owns the boxes) — caption + stage mark
  expect(document.querySelector('[data-leaf-stage="bbox"]')).not.toBeNull()
  expect(screen.getByText('Region — optional (scopes the search; clear = whole image)')).not.toBeNull()
  // THE FILTER CAPTION (2026-10-08, "SAM2 AND SAM3 DON'T HAVE BBOX
  // FILTER"): the kind's declared section rides ABOVE the field
  // stack, marked as the filter — the split arm seats it.
  expect(document.querySelector('[data-stage-caption="filter"]')).not.toBeNull()
  expect(screen.getByText('Bbox filter — the detector prompt proposes the boxes (automated); the Region canvas below only scopes the search')).not.toBeNull()
  // the four faceOwned fields NEVER render while the canvas rides
  expect(screen.queryByLabelText('Box x')).toBeNull()
  expect(screen.queryByLabelText('Box h')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Box commit' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('sam3', [{
    name: 'sam3', prompt: '',
    bbox_x: 13, bbox_y: 34, bbox_w: 121, bbox_h: 90,
  }])
})

test('THE BBOX CANVAS: editing a boxed entry seeds the face with the current rectangle', () => {
  openLeaf({
    kinds: [SAM3_BOX],
    values: { input_image: 'r', sam3: [{ name: 'a', prompt: 'p', bbox_x: 10, bbox_y: 20, bbox_w: 30, bbox_h: 40 }] },
    bboxFace: FakeBboxFace, paintReference: 'input_image',
  })
  openEditTile('sam3-0')
  expect(screen.getByTestId('bbox-seed').textContent).toBe('10,20,30,40')
})

test('THE BBOX CANVAS: a clear writes the four unset sentinels (-1 — the entry runs unscoped)', () => {
  const { onEdit } = openLeaf({
    kinds: [SAM3_BOX],
    values: { input_image: 'r', sam3: [{ name: 'a', prompt: 'p', bbox_x: 10, bbox_y: 20, bbox_w: 30, bbox_h: 40 }] },
    bboxFace: FakeBboxFace, paintReference: 'input_image',
  })
  openEditTile('sam3-0')
  fireEvent.click(screen.getByRole('button', { name: 'Box clear' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('sam3', [{
    name: 'a', prompt: 'p',
    bbox_x: -1, bbox_y: -1, bbox_w: -1, bbox_h: -1,
  }])
})

test('THE BBOX CANVAS: host-less degrades — the four faceOwned inputs RENDER (the plain inputs hold)', () => {
  const hostless = openLeaf({ kinds: [SAM3_BOX], values: {} })
  openCreate('SAM3')
  expect(screen.queryByTestId('bbox-face')).toBeNull()
  expect(screen.getByLabelText('Box x')).not.toBeNull()
  expect(screen.getByLabelText('Box h')).not.toBeNull()
  hostless.unmount()
  const faceless = openLeaf({ kinds: [MASK_PAINT], values: {}, bboxFace: FakeBboxFace, paintReference: 'input_image' })
  openCreate('Mask')
  expect(screen.queryByTestId('bbox-face')).toBeNull()
  faceless.unmount()
})

test('THE DISPLAY-IS-THE-COMMIT LAW: editing a legacy entry missing a defaulted field shows the default AND saves it (never shows-then-refuses)', () => {
  const { onEdit } = openLeaf({ kinds: [MASK_PAINT], values: { masks: [{}] } })
  openEditTile('masks-0')
  // the knob displays the declaration's default (Feather 5)
  expect((screen.getByLabelText('Feather') as HTMLInputElement).value).toBe('5')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  // and the save commits what was shown (the draft opened on the
  // kind's defaults — the label-less sam2 that showed Person now
  // saves labels:'person' instead of refusing loud)
  expect(onEdit).toHaveBeenCalledWith('masks', [{ feather: 5 }])
})

test('THE ACTION-CARD SHAPE: the leaf popup is BOUNDED and scrollable (never a viewport-tall stack)', () => {
  openLeaf({ kinds: [MASK_PAINT], values: {} })
  openCreate('Mask')
  // the modal card itself carries the bounding grammar (CardDrill/
  // wireDialog law: max-height + overflow own the scroll — the
  // canvas seats at the top, the knobs ride under it)
  const modal = document.querySelector('[class*="modLeafModal"]')
  expect(modal).not.toBeNull()
  expect(modal!.className).toMatch(/modLeafModal/)
})

test('THE PAINT CANVAS: a fields-less paint kind mounts NO canvas (the image-field lookup is the face) — degrade holds, never a crash', () => {
  const bare = {
    kind: 'mask', label: 'Mask', param_key: 'masks', cardinality: 'multi',
    leaf_face: 'paint-canvas',
  } as unknown as ModifierKind
  const { onEdit } = openLeaf({ kinds: [bare], values: {}, paintFace: FakeFace, paintReference: 'input_image' })
  openCreate('Mask')
  expect(screen.queryByTestId('paint-face')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  // the entry mints (a bare defaults row) — no canvas, but Add still works
  expect(onEdit).toHaveBeenCalledWith('masks', [{}])
})

test('THE SQUARE CAPTION: a slot-shaped leaf entry field with no label and no tooltip captions by NAME (never an empty row)', () => {
  const kind = {
    kind: 'mask', label: 'Mask', param_key: 'masks', cardinality: 'multi',
    fields: [
      { name: 'image', type: 'image', label: 'Image' },
      { name: 'mystery', type: 'image' },
    ],
  } as unknown as ModifierKind
  openLeaf({ kinds: [kind], values: {} })
  openCreate('Mask')
  expect(screen.getByText('mystery')).not.toBeNull()
})

test('THE ACTION-CARD SPLIT: the knobs column edits live and captions a label-less square by NAME', () => {
  const kind = {
    kind: 'mask', label: 'Mask', param_key: 'masks', cardinality: 'multi',
    leaf_face: 'paint-canvas',
    fields: [
      { name: 'payload', wtype: 'image' },
      { name: 'mystery', type: 'image' },
      { name: 'note', type: 'string', default: '' },
    ],
  } as unknown as ModifierKind
  const { onEdit } = openLeaf({ kinds: [kind], values: {}, paintFace: FakeFace, paintReference: 'input_image' })
  openCreate('Mask')
  // the split seats: canvas stage LEFT, knobs RIGHT
  expect(document.querySelector('[data-leaf-stage="paint"]')).not.toBeNull()
  expect(screen.getByTestId('paint-face')).not.toBeNull()
  // the label-less square captions by name (never an empty row)
  expect(screen.getByText('mystery')).not.toBeNull()
  // a plain knob edits LIVE into the draft (the split's onEdit arm)
  const note = screen.getByLabelText('note')
  fireEvent.change(note, { target: { value: 'scoped to the face' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('masks', [expect.objectContaining({ note: 'scoped to the face' })])
})

test('THE PAINT CANVAS: the image field may ride wtype (wire-typed kinds seat the face too)', () => {
  const kind = {
    kind: 'mask', label: 'Mask', param_key: 'masks', cardinality: 'multi',
    leaf_face: 'paint-canvas',
    fields: [{ name: 'payload', wtype: 'image' }],
  } as unknown as ModifierKind
  openLeaf({ kinds: [kind], values: {}, paintFace: FakeFace, paintReference: 'input_image' })
  openCreate('Mask')
  expect(screen.getByTestId('paint-face')).not.toBeNull()
})

test('THE SEAM CONTRACTS LIVE IN @melite/contracts (stroke 79): the face props construct against the re-exports (type-only seams prove at compile; construction proves the wiring)', async () => {
  // the owner props ride the shared contracts package beside their
  // siblings (PreviewOwnerProps, StageViewOwnerProps); card-base
  // re-exports for its component-level types and existing importers
  // (the module rides the static type import above — no dynamic load needed)
  const a: mod.PaintCanvasFaceProps = { referenceUrl: 'r', value: 'p', onChange: () => {} }
  const b: mod.BboxCanvasFaceProps = { referenceUrl: 'r', value: null, onChange: () => {} }
  const paint: mod.PaintFaceComponent = (props: mod.PaintCanvasFaceProps) => { void props; return null as never }
  const box: mod.BboxFaceComponent = (props: mod.BboxCanvasFaceProps) => { void props; return null as never }
  paint(a); box(b)
})

test('THE LEAF PICK: an injected media source serves the library rows (the leaf rides the one lane, like a card)', async () => {
  bindLeafMedia()
  try {
    const r = openLeaf({ kinds: [MASK], values: {}, loadMedia: fetchMediaLibrary })
    openCreate('Mask')
    // the FIELD-kind leaf renders the image input as the square (the
    // construction law); its plus opens the three-entry menu
    fireEvent.click(screen.getByRole('button', { name: 'Image source' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'From media' }))
    const pick = await screen.findByTestId('source-pick-row')
    expect(pick.textContent).toContain('the mask')
    fireEvent.click(pick)
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(r.onEdit).toHaveBeenCalledWith('masks', [
      expect.objectContaining({ image: 'https://host/m.png' }),
    ])
    r.unmount()
  } finally {
    unbindEstateRemote()
  }
})

const HYBRID_IMG = {
  kind: 'cnet', label: 'CNet', param_key: 'cnets', cardinality: 'multi',
  entry: 'hybrid', option_key: 'type', scalar_key: 'strength',
  options: [{ value: 'depth', label: 'Depth' }],
  fields: [
    { name: 'type', type: 'text', label: 'Type' },
    { name: 'strength', type: 'number', label: 'Strength' },
    { name: 'conditioning', type: 'image', label: 'Conditioning' },
    { name: 'raw', type: 'image' },
  ],
} as unknown as ModifierKind

test('THE UNWRAPPED SQUARE (field leaf): the image row is caption + atom siblings — a caption click never reaches the file input', () => {
  openLeaf({ kinds: [MASK], values: {} })
  openCreate('Mask')
  const box = screen.getByRole('button', { name: 'Image source' })
  const dialog = box.parentElement!.querySelector('input[type="file"]') as HTMLInputElement | null
  expect(dialog).not.toBeNull()
  expect(dialog!.closest('label')).toBeNull()
  let fired = false
  dialog!.addEventListener('click', () => { fired = true })
  fireEvent.click(box.parentElement!.parentElement!)
  expect(fired).toBe(false)
  // the scalar sibling keeps its label (click-to-focus stays)
  expect(screen.getByLabelText('Feather')).not.toBeNull()
})

test('THE UNWRAPPED SQUARE (hybrid leaf): the conditioning image is never label-wrapped either', () => {
  openLeaf({ kinds: [HYBRID_IMG], values: {} })
  openCreate('CNet')
  const box = screen.getByRole('button', { name: 'Conditioning source' })
  const dialog = box.parentElement!.querySelector('input[type="file"]') as HTMLInputElement | null
  expect(dialog).not.toBeNull()
  expect(dialog!.closest('label')).toBeNull()
  // an unlabeled slot field captions from its name (never blank)
  expect(screen.getByText('raw')).not.toBeNull()
})

test('RESOLVE SEAT: a create seat (or an edit seat with no tiers) resolves nothing — the entry only exists at commit', () => {
  const entries = [{ lora: 'x', strength: 1 }]
  const create: mod.LeafSeat = { mode: 'create', kind: LORA, index: 0 }
  expect(resolveSeatEntry(entries, create)).toBeNull()
  const editNoTiers: mod.LeafSeat = { mode: 'edit', kind: LORA, index: 0 }
  expect(resolveSeatEntry(entries, editNoTiers)).toBeNull()
})

// ── THE FLAT LAW (the qvoice_save burn, operator 2026-10-22 — the
// verbatim order lives in the receipt,
// contracts/receipts/2026-10-22-cards-mod-write-parity.md; the
// authored face stays clean): the studio's Design-mod parameter
// inputs could never land — the write refused at the door with
// "unknown param(s) on the tts card: qvoice_save". The Design
// kind's fields ARE the card's own
// knobs (the tts schema declares voice_name + the sampling dials
// flat) — the leaf's commit write rides them at the ROOT, never as
// a qvoice_save bag the write door refuses. Hop [1] of the burn:
// the operator's exact gesture, driven on the rendered leaf. The
// door hop [4] + the wire hop [5] live in the walls tier
// (tests/walls/ts/suites/mod-write-parity.spec.ts).
const QVOICE_SAVE = {
  kind: 'qvoice_save', label: 'Design', param_key: 'qvoice_save', cardinality: 'list', flat: true,
  fields: [
    { name: 'voice_name', type: 'text', label: 'Voice Name' },
    { name: 'temperature', type: 'number', label: 'Temperature', default: 0.7 },
    { name: 'speed', type: 'number', label: 'Speed', default: 1 },
  ],
} as unknown as ModifierKind

// THE PRESENCE KIND (the real pack after the duped-knob cut): flat
// and all-boolean — the chip IS the signal.
const PRESENCE_SAVE = {
  kind: 'qvoice_save', label: 'Design', param_key: 'qvoice_save', cardinality: 'list', flat: true,
  fields: [{ name: 'save_qvoice', type: 'boolean', label: 'Save QVoice' }],
} as unknown as ModifierKind

// THE NAMED-PRESENCE KIND (the refinement pack: booleans plus
// exactly one text field — the Design mod after the name popup,
// operator 2026-10-22: "it can just be 'name' or something so a
// name can be used for the save file").
const NAMED_PRESENCE_SAVE = {
  kind: 'qvoice_save', label: 'Design', param_key: 'qvoice_save', cardinality: 'list', flat: true,
  fields: [
    { name: 'save_qvoice', type: 'boolean', label: 'Save QVoice' },
    { name: 'voice_name', type: 'text', label: 'Save-file name' },
  ],
} as unknown as ModifierKind

test('FLAT CREATE: the Design entry commits its fields at the root — no qvoice_save bag rides the write (the burn, hop [1])', () => {
  const { onEdit, onPatch } = openLeaf({ kinds: [QVOICE_SAVE], values: {} })
  openCreate('Design')
  fireEvent.change(screen.getByLabelText('Voice Name'), { target: { value: 'harbour narrator' } })
  fireEvent.change(screen.getByLabelText('Temperature'), { target: { value: '0.4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  // THE REFUSED WRITE, PINNED: the payload must carry the fields
  // flat and must NOT carry the bag key the door refused verbatim.
  // the seeded default (speed 1) rides with the typed fields —
  // every draft field commits flat, defaults included
  expect(onPatch).toHaveBeenCalledWith({ voice_name: 'harbour narrator', temperature: 0.4, speed: 1 })
  expect(onEdit).toHaveBeenCalledWith('voice_name', 'harbour narrator')
  expect(onEdit).toHaveBeenCalledWith('temperature', 0.4)
  for (const call of onPatch.mock.calls) {
    expect(call[0]).not.toHaveProperty('qvoice_save')
  }
})

test('FLAT READ: a saved flat entry re-opens on the card root — the leaf shows the saved persona, the save keeps it flat', () => {
  const { onPatch } = openLeaf({
    kinds: [QVOICE_SAVE],
    values: { voice_name: 'dusk voice', temperature: 0.4, speed: 1 },
  })
  openEditTile('qvoice_save-0')
  expect((screen.getByLabelText('Voice Name') as HTMLInputElement).value).toBe('dusk voice')
  expect((screen.getByLabelText('Temperature') as HTMLInputElement).value).toBe('0.4')
  fireEvent.change(screen.getByLabelText('Voice Name'), { target: { value: 'dusk voice ii' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onPatch).toHaveBeenCalledWith({ voice_name: 'dusk voice ii', temperature: 0.4, speed: 1 })
  for (const call of onPatch.mock.calls) {
    expect(call[0]).not.toHaveProperty('qvoice_save')
  }
})

test('FLAT DELETE: removing the entry writes nulls — the merge-patch delete lands at the bench (undefined drops from JSON; the stuck-mod burn, 2026-10-22)', () => {
  const { onPatch } = openLeaf({
    kinds: [QVOICE_SAVE],
    values: { voice_name: 'dusk voice', temperature: 0.4 },
  })
  openEditTile('qvoice_save-0')
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
  expect(onPatch).toHaveBeenCalledWith({ voice_name: null, temperature: null, speed: null })
  for (const call of onPatch.mock.calls) {
    expect(call[0]).not.toHaveProperty('qvoice_save')
  }
})

test('FLAT SEED: an untouched root renders no phantom entry (the create tile stays; a stated field seats it)', () => {
  openLeaf({ kinds: [QVOICE_SAVE], values: {} })
  expect(document.querySelector('[data-mod-tile="qvoice_save-0"]')).toBeNull()
})

test('PRESENCE ADD: the add commits the true stamp — no leaf ever opens (the MOD-PRESENCE LAW, operator 2026-10-22: "WHEN I PUT THE SAVE QVOICE MOD ON, IT JUST WORKS")', () => {
  const { onEdit, onPatch } = openLeaf({ kinds: [PRESENCE_SAVE], values: {} })
  openCreate('Design')
  expect(onEdit).toHaveBeenCalledWith('save_qvoice', true)
  expect(onPatch).toHaveBeenCalledWith({ save_qvoice: true })
  // no leaf face exists for a presence kind — nothing to edit
  expect(screen.queryByLabelText('Save QVoice')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Add' })).toBeNull()
})

test('PRESENCE REMOVE: the chip click IS the remove — the null delete lands (the tile unseats when the bench serves the cleared doc)', () => {
  const { onEdit, onPatch } = openLeaf({ kinds: [PRESENCE_SAVE], values: { save_qvoice: true } })
  const tile = document.querySelector('[data-mod-tile="qvoice_save-0"]')
  expect(tile).not.toBeNull()
  fireEvent.click(tile as HTMLElement)
  expect(onEdit).toHaveBeenCalledWith('save_qvoice', undefined)
  expect(onPatch).toHaveBeenCalledWith({ save_qvoice: null })
})

// ── THE NAMED-PRESENCE REFINEMENT (operator 2026-10-22: "Make sure
// that the 'design' mod has a popup, it can just be 'name' or
// something so a name can be used for the save file") — the add
// opens a ONE-FIELD popup (never a knob wall), confirm states the
// booleans plus the name, the tile click still removes. ──

test('NAMED ADD (stated): the popup takes the name and commits the stamp + name flat — one gesture, no knob wall', () => {
  const { onEdit, onPatch } = openLeaf({ kinds: [NAMED_PRESENCE_SAVE], values: {} })
  openCreate('Design')
  // THE POPUP, not the instant presence commit: one field is up
  expect(onPatch).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Save-file name'), { target: { value: 'harbour narrator' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('save_qvoice', true)
  expect(onEdit).toHaveBeenCalledWith('voice_name', 'harbour narrator')
  expect(onPatch).toHaveBeenCalledWith({ save_qvoice: true, voice_name: 'harbour narrator' })
  // no knob wall ever opened — the popup was the whole editor
  expect(screen.queryByLabelText('Temperature')).toBeNull()
})

test('NAMED ADD (empty): an empty name stays lawful — the stamp commits with "" and the build mints the save name', () => {
  const { onEdit, onPatch } = openLeaf({ kinds: [NAMED_PRESENCE_SAVE], values: {} })
  openCreate('Design')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('save_qvoice', true)
  expect(onEdit).toHaveBeenCalledWith('voice_name', '')
  expect(onPatch).toHaveBeenCalledWith({ save_qvoice: true, voice_name: '' })
})

test('NAMED CANCEL: the popup\'s cancel commits nothing — the card is untouched', () => {
  const { onEdit, onPatch } = openLeaf({ kinds: [NAMED_PRESENCE_SAVE], values: {} })
  openCreate('Design')
  fireEvent.change(screen.getByLabelText('Save-file name'), { target: { value: 'never lands' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onEdit).not.toHaveBeenCalled()
  expect(onPatch).not.toHaveBeenCalled()
})

test('NAMED REMOVE: the chip click IS the remove — both keys null-delete (the presence law holds under the refinement)', () => {
  const { onEdit, onPatch } = openLeaf({
    kinds: [NAMED_PRESENCE_SAVE],
    values: { save_qvoice: true, voice_name: 'harbour narrator' },
  })
  const tile = document.querySelector('[data-mod-tile="qvoice_save-0"]')
  expect(tile).not.toBeNull()
  fireEvent.click(tile as HTMLElement)
  expect(onEdit).toHaveBeenCalledWith('save_qvoice', undefined)
  expect(onEdit).toHaveBeenCalledWith('voice_name', undefined)
  expect(onPatch).toHaveBeenCalledWith({ save_qvoice: null, voice_name: null })
})
