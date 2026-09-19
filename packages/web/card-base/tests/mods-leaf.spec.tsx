// @vitest-environment happy-dom
// mods-leaf.spec.tsx — THE MOD SYSTEM's leaf face (mods.tsx half
// 2): one modal edits one bag entry — OPTION (served row + seeded
// strength), HYBRID (served row + stamped facts + verbatim fields),
// FIELD (the kind's own atoms). Refusals stay LOUD; stale leaves
// close without writing; the paint verb mounts the host face.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ModifierKind } from '../src/spec.ts'
import { bindEstateRemote, unbindEstateRemote } from '../src/estate-remote.ts'
import { fetchMediaLibrary } from '../src/media-library.ts'

import { ModifiersSection } from '../src/mods.tsx'

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
  fireEvent.change(screen.getByLabelText('LoRA'), { target: { value: 'detail' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'detail', strength: 0.8 }])
  expect(onPatch).toHaveBeenCalledWith({ loras: [{ id: 'detail', strength: 0.8 }] })
  expect(screen.queryByText('Add LoRA')).toBeNull()
})

test('OPTION CREATE: a row without defaults seeds 1.0; a typed dial wins over the seed', () => {
  const { onEdit } = openLeaf({ kinds: [LORA], values: {} })
  openCreate('LoRA')
  fireEvent.change(screen.getByLabelText('LoRA'), { target: { value: 'plain' } })
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
  fireEvent.change(screen.getByLabelText('LoRA'), { target: { value: 'dareties' } })
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
  fireEvent.change(screen.getByLabelText('LoRA'), { target: { value: 'turbo' } })
  fireEvent.change(screen.getByLabelText('Steps applied'), { target: { value: '6' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'turbo', strength: 0.6, steps: 6 }])
  cleanup()
  const again = openLeaf({ kinds: [LORA_DISTILL], values: {} })
  openCreate('LoRA')
  fireEvent.change(again.getByLabelText('LoRA'), { target: { value: 'turbo' } })
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
  fireEvent.change(screen.getByLabelText('LoRA'), { target: { value: 'turbo' } })
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
  fireEvent.change(fixed.getByLabelText('LoRA'), { target: { value: 'dareties' } })
  expect(fixed.getByText('Steps applied (fixed at 4)')).not.toBeNull()
  expect((fixed.getByLabelText('Steps applied') as HTMLInputElement).min).toBe('')
})

test('OPTION CREATE: refusing LOUD — no row, no save; a non-number dial, no save', () => {
  openLeaf({ kinds: [LORA], values: {} })
  openCreate('LoRA')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Pick one from the served rows.')).not.toBeNull()
  fireEvent.change(screen.getByLabelText('LoRA'), { target: { value: 'detail' } })
  fireEvent.change(screen.getByPlaceholderText('the row default'), { target: { value: '1e999' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Strength must be a number.')).not.toBeNull()
  expect(screen.getByText('Add LoRA')).not.toBeNull()
})

test('OPTION EDIT: the row binds at create (no reselect); the dial rewrites; Remove drops the entry', () => {
  const { onEdit } = openLeaf({ kinds: [LORA], values: { loras: [{ id: 'detail', strength: 0.8 }] } })
  openEditTile('loras-0')
  expect(screen.getByText('Edit LoRA')).not.toBeNull()
  expect(screen.queryByLabelText('LoRA')).toBeNull()
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

test('OPTION EDIT: a stale index closes without writing (the bag moved under the leaf)', () => {
  const { onEdit, rerender, container } = openLeaf({
    kinds: [LORA], values: { loras: [{ id: 'detail' }, { id: 'plain' }] },
    onEdit: undefined as never, onPatch: undefined as never,
  })
  void container
  openEditTile('loras-1')
  rerender(h(ModifiersSection, { kinds: [LORA], values: { loras: [{ id: 'detail' }] }, onEdit, onPatch: undefined as never }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).not.toHaveBeenCalled()
  expect(screen.queryByText('Edit LoRA')).toBeNull()
})

test('HYBRID CREATE: the save stamps the row facts + verbatim fields (the retired wire shape)', () => {
  const { onEdit } = openLeaf({ kinds: [CONTROL], values: {} })
  openCreate('ControlNet')
  fireEvent.change(screen.getByLabelText('ControlNet'), { target: { value: 'depth' } })
  fireEvent.change(screen.getByLabelText('Conditioning'), { target: { value: 'cond-url' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [{
    type: 'depth', model: 'm-depth', preprocessor: 'p-depth', cond: 'cond-url', strength: 0.5,
  }])
})

test('HYBRID CREATE: the seed cascade — row default, then the contract field default, then 0.7', () => {
  const row = openLeaf({ kinds: [CONTROL], values: {} })
  openCreate('ControlNet')
  fireEvent.change(screen.getByLabelText('ControlNet'), { target: { value: 'canny' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(row.onEdit).toHaveBeenCalledWith('controlnets', [{
    type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.7,
  }])
  row.unmount()
  const fd = openLeaf({ kinds: [CONTROL_FD], values: {} })
  openCreate('ControlNet')
  fireEvent.change(screen.getByLabelText('ControlNet'), { target: { value: 'soft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(fd.onEdit).toHaveBeenCalledWith('controlnets', [{ type: 'soft', strength: 0.9 }])
  fd.unmount()
})

test('HYBRID CREATE: rows without resolved facts stamp type + strength only (never undefined keys)', () => {
  const { onEdit } = openLeaf({ kinds: [CONTROL_NOMETA], values: {} })
  openCreate('ControlNet')
  fireEvent.change(screen.getByLabelText('ControlNet'), { target: { value: 'soft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [{ type: 'soft', strength: 0.7 }])
})

test('HYBRID CREATE: refusing LOUD — no row; a non-number dial; the scalar label falls back', () => {
  openLeaf({ kinds: [CONTROL_MIN], values: {} })
  openCreate('ControlNet')
  expect(screen.getByLabelText('Strength')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(screen.getByText('Pick one from the served rows.')).not.toBeNull()
  fireEvent.change(screen.getByLabelText('ControlNet'), { target: { value: 'soft' } })
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
  fireEvent.change(screen.getByLabelText('ControlNet'), { target: { value: 'canny' } })
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
  expect((screen.getByLabelText('ControlNet') as HTMLSelectElement).value).toBe('')
  expect((screen.getByLabelText('Strength') as HTMLInputElement).value).toBe('')
})

test('HYBRID EDIT: a stale index closes without writing (the bag moved under the leaf)', () => {
  const { onEdit, rerender } = openLeaf({
    kinds: [CONTROL],
    values: { controlnets: [{ type: 'depth' }, { type: 'canny' }] },
  })
  openEditTile('controlnets-1')
  rerender(h(ModifiersSection, { kinds: [CONTROL], values: { controlnets: [{ type: 'depth' }] }, onEdit, onPatch: () => {} }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).not.toHaveBeenCalled()
  expect(screen.queryByText('Edit ControlNet')).toBeNull()
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
  fireEvent.change(screen.getByLabelText('ControlNet'), { target: { value: 'depth' } })
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
  expect(onEdit).toHaveBeenCalledWith('masks', [{ feather: '7' }])
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

test('FIELD EDIT: a stale index closes without writing (the bag moved under the leaf)', () => {
  const { onEdit, rerender } = openLeaf({
    kinds: [MASK], values: { masks: [{ feather: 1 }, { feather: 2 }] },
  })
  openEditTile('masks-1')
  rerender(h(ModifiersSection, { kinds: [MASK], values: { masks: [{ feather: 1 }] }, onEdit, onPatch: () => {} }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).not.toHaveBeenCalled()
  expect(screen.queryByText('Edit Mask')).toBeNull()
})

test('THE CLOSE: the labelled close drops the leaf without writing (never a stray commit)', () => {
  const { onEdit } = openLeaf({ kinds: [LORA], values: {} })
  openCreate('LoRA')
  fireEvent.change(screen.getByLabelText('LoRA'), { target: { value: 'detail' } })
  closeLeaf()
  expect(screen.queryByText('Add LoRA')).toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
})

function FakeFace(props: {
  referenceUrl: string
  payloadUrl: string
  onSave: (dataUrl: string) => void
  onCancel: () => void
}): ReturnType<typeof h> {
  return h('div', {},
    h('span', { 'data-testid': 'face-ref' }, props.referenceUrl),
    h('span', { 'data-testid': 'face-payload' }, props.payloadUrl),
    h('button', { type: 'button', onClick: () => { props.onSave('data:image/png;base64,ZZ') } }, 'Face save'),
    h('button', { type: 'button', onClick: props.onCancel }, 'Face cancel'),
  )
}

test('THE PAINT VERB: the brush mounts the host face; its save writes the payload the square reads', () => {
  const { onEdit } = openLeaf({
    kinds: [MASK_PAINT], values: { input_image: 'ref-url' },
    paintFace: FakeFace, paintReference: 'input_image',
  })
  openCreate('Mask')
  const paints = screen.getAllByRole('button', { name: 'Paint' })
  expect(paints.length).toBe(2)
  fireEvent.click(paints[0]!)
  expect(screen.getByTestId('face-ref').textContent).toBe('ref-url')
  fireEvent.click(screen.getByRole('button', { name: 'Face save' }))
  expect(screen.queryByTestId('face-ref')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('masks', [{
    image: 'data:image/png;base64,ZZ', feather: 5,
  }])
})

test('THE PAINT VERB: cancel drops the face without seeding; host-less or faceless kinds offer no verb', () => {
  const painted = openLeaf({
    kinds: [MASK_PAINT], values: {},
    paintFace: FakeFace, paintReference: 'input_image',
  })
  openCreate('Mask')
  fireEvent.click(screen.getAllByRole('button', { name: 'Paint' })[0]!)
  expect(screen.getByTestId('face-ref').textContent).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Face cancel' }))
  expect(screen.queryByTestId('face-ref')).toBeNull()
  painted.unmount()
  const hostless = openLeaf({ kinds: [MASK_PAINT], values: {} })
  openCreate('Mask')
  expect(screen.queryByRole('button', { name: 'Paint' })).toBeNull()
  hostless.unmount()
  const faceless = openLeaf({ kinds: [MASK], values: {}, paintFace: FakeFace, paintReference: 'input_image' })
  openCreate('Mask')
  expect(screen.queryByRole('button', { name: 'Paint' })).toBeNull()
  faceless.unmount()
})

test('THE PAINT VERB: editing a painted entry hands its payload to the face (paint-over seeds)', () => {
  const { onEdit } = openLeaf({
    kinds: [MASK_PAINT], values: { masks: [{ image: 'data:image/png;base64,OLD' }] },
    paintFace: FakeFace, paintReference: 'input_image',
  })
  openEditTile('masks-0')
  fireEvent.click(screen.getAllByRole('button', { name: 'Paint' })[0]!)
  expect(screen.getByTestId('face-payload').textContent).toBe('data:image/png;base64,OLD')
  fireEvent.click(screen.getByRole('button', { name: 'Face save' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('masks', [{ image: 'data:image/png;base64,ZZ' }])
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
  fireEvent.change(screen.getByLabelText('ControlNet'), { target: { value: 'soft' } })
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

// ── THE BBOX VERB (stroke 78 — the bbox-canvas leaf face) ──

const SAM3_BOX = {
  kind: 'sam3', label: 'SAM3', param_key: 'sam3', cardinality: 'list',
  category: 'standalone', leaf_face: 'bbox-canvas',
  fields: [
    { name: 'name', type: 'string', label: 'Name', default: 'sam3' },
    { name: 'prompt', type: 'string', label: 'Prompt', default: '' },
    { name: 'bbox_x', type: 'number', label: 'Box x', default: -1 },
    { name: 'bbox_y', type: 'number', label: 'Box y', default: -1 },
    { name: 'bbox_w', type: 'number', label: 'Box w', default: -1 },
    { name: 'bbox_h', type: 'number', label: 'Box h', default: -1 },
  ],
} as unknown as ModifierKind

function FakeBboxFace(props: { referenceUrl: string; bbox: { x: number; y: number; width: number; height: number } | null; onSave: (b: { x: number; y: number; width: number; height: number }) => void; onCancel: () => void }) {
  return h('div', { 'data-testid': 'bbox-face' },
    h('span', { 'data-testid': 'bbox-ref' }, props.referenceUrl),
    h('span', { 'data-testid': 'bbox-seed' }, props.bbox === null ? 'null' : `${props.bbox.x},${props.bbox.y},${props.bbox.width},${props.bbox.height}`),
    h('button', { type: 'button', onClick: () => { props.onSave({ x: 12.6, y: 34.2, width: 120.9, height: 90.4 }) } }, 'Box save'),
    h('button', { type: 'button', onClick: props.onCancel }, 'Box cancel'),
  )
}

test('THE BBOX VERB: the verb mounts the host face ONCE per entry; its save writes the four inputs (rounded)', () => {
  const { onEdit } = openLeaf({
    kinds: [SAM3_BOX], values: { input_image: 'ref-url' },
    bboxFace: FakeBboxFace, paintReference: 'input_image',
  })
  openCreate('SAM3')
  fireEvent.click(screen.getByRole('button', { name: 'Draw box' }))
  expect(screen.getByTestId('bbox-ref').textContent).toBe('ref-url')
  expect(screen.getByTestId('bbox-seed').textContent).toBe('null')
  fireEvent.click(screen.getByRole('button', { name: 'Box save' }))
  expect(screen.queryByTestId('bbox-face')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('sam3', [{
    name: 'sam3', prompt: '',
    bbox_x: 13, bbox_y: 34, bbox_w: 121, bbox_h: 90,
  }])
})

test('THE BBOX VERB: editing a boxed entry seeds the face with the current rectangle', () => {
  openLeaf({
    kinds: [SAM3_BOX],
    values: { input_image: 'r', sam3: [{ name: 'a', prompt: 'p', bbox_x: 10, bbox_y: 20, bbox_w: 30, bbox_h: 40 }] },
    bboxFace: FakeBboxFace, paintReference: 'input_image',
  })
  openEditTile('sam3-0')
  fireEvent.click(screen.getByRole('button', { name: 'Redraw box' }))
  expect(screen.getByTestId('bbox-seed').textContent).toBe('10,20,30,40')
})

test('THE BBOX VERB: cancel drops the face without seeding (never a stray write)', () => {
  const { onEdit } = openLeaf({
    kinds: [SAM3_BOX], values: { input_image: 'ref-url' },
    bboxFace: FakeBboxFace, paintReference: 'input_image',
  })
  openCreate('SAM3')
  fireEvent.click(screen.getByRole('button', { name: 'Draw box' }))
  expect(screen.getByTestId('bbox-face')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Box cancel' }))
  expect(screen.queryByTestId('bbox-face')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(onEdit).toHaveBeenCalledWith('sam3', [{
    name: 'sam3', prompt: '',
    bbox_x: -1, bbox_y: -1, bbox_w: -1, bbox_h: -1,
  }])
})

test('THE BBOX VERB: host-less or faceless kinds offer no verb (the four inputs hold)', () => {
  const hostless = openLeaf({ kinds: [SAM3_BOX], values: {} })
  openCreate('SAM3')
  expect(screen.queryByRole('button', { name: 'Draw box' })).toBeNull()
  hostless.unmount()
  const faceless = openLeaf({ kinds: [MASK_PAINT], values: {}, bboxFace: FakeBboxFace, paintReference: 'input_image' })
  openCreate('Mask')
  expect(screen.queryByRole('button', { name: 'Draw box' })).toBeNull()
  faceless.unmount()
})

test('THE SEAM CONTRACTS LIVE IN @melite/contracts (stroke 79): the face props construct against the re-exports (type-only seams prove at compile; construction proves the wiring)', async () => {
  // the owner props ride the shared contracts package beside their
  // siblings (PreviewOwnerProps, StageViewOwnerProps); card-base
  // re-exports for its component-level types and existing importers
  const mod = await import('../src/mods.tsx')
  const a: mod.PaintFaceComponentProps = { referenceUrl: 'r', payloadUrl: 'p', onSave: () => {}, onCancel: () => {} }
  const b: mod.BboxFaceComponentProps = { referenceUrl: 'r', bbox: null, onSave: () => {}, onCancel: () => {} }
  const paint: mod.PaintFaceComponent = (props) => { void props; return null as never }
  const box: mod.BboxFaceComponent = (props) => { void props; return null as never }
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
