// @vitest-environment happy-dom
// mods-section.spec.tsx — THE MOD SYSTEM's section face (mods.tsx
// half 1): the section chrome, the pack-level scalar rows, the tile
// row (labels + strengths), the add grammar (square → kind menu →
// leaf), the stack-limit refusal, and the native reorder drag. The
// leaf's per-kind save laws ride mods-leaf.spec.tsx.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ModifierKind } from '../src/spec.ts'

import { ModifiersSection } from '../src/mods.tsx'

const MOD_DRAG_MIME = 'application/x-melite-mod'

afterEach(cleanup)

const MIME = 'application/x-melite-mod'

const LORA = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'detail', label: 'Detail', defaults: { strength: 0.8 } },
    { value: 'plain', label: 'Plain' },
  ],
} as unknown as ModifierKind

const CONTROL = {
  kind: 'controlnet', label: 'ControlNet', param_key: 'controlnets', cardinality: 'multi',
  entry: 'hybrid', option_key: 'type', scalar_key: 'strength',
  options: [{ value: 'depth', label: 'Depth', model: 'm-depth', preprocessor: 'p-depth', defaults: { strength: 0.5 } }],
  fields: [
    { name: 'type', type: 'text', label: 'Type' },
    { name: 'strength', type: 'number', label: 'Strength' },
    { name: 'cond', type: 'text', label: 'Conditioning' },
  ],
} as unknown as ModifierKind

const FLOOR = {
  kind: 'floor', label: 'Floor', param_key: 'floor', cardinality: 'scalar',
  kindFields: [{ name: 'floor', type: 'number', label: 'Floor', default: 0.5 }],
} as unknown as ModifierKind

function openSection(props: Partial<Parameters<typeof ModifiersSection>[0]> = {}) {
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  const rendered = render(h(ModifiersSection, {
    kinds: [], values: {}, onEdit, onPatch, ...props,
  }))
  return { onEdit, onPatch, ...rendered }
}

const tile = (id: string): HTMLElement =>
  document.querySelector(`[data-mod-tile="${id}"]`) as HTMLElement

test('NO KINDS, NO SECTION (never an empty modifiers block)', () => {
  const { container } = openSection()
  expect(container.innerHTML).toBe('')
})

test('THE CHROME: one flowing row — title, hint, and the add square when addable kinds ride', () => {
  openSection({ kinds: [LORA] })
  expect(screen.getByText('Modifiers')).not.toBeNull()
  expect(screen.getByText('drag to set apply order')).not.toBeNull()
  expect(document.querySelector('[data-subcard-add="mod"]')).not.toBeNull()
})

test('THE ADD GRAMMAR: the square seats the kind menu; picking a kind opens its create leaf', () => {
  openSection({ kinds: [LORA] })
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  fireEvent.click(screen.getByRole('menuitem', { name: 'LoRA' }))
  expect(screen.getByText('Add LoRA')).not.toBeNull()
})

test('THE ADD GRAMMAR: scalar-only kinds seat no square (nothing addable, nothing offered)', () => {
  openSection({ kinds: [FLOOR] })
  expect(document.querySelector('[data-subcard-add="mod"]')).toBeNull()
})

test('THE KIND MENU: Escape closes it without opening a leaf (never a stuck menu)', () => {
  openSection({ kinds: [LORA] })
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  expect(screen.getByRole('menuitem', { name: 'LoRA' })).not.toBeNull()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('menuitem', { name: 'LoRA' })).toBeNull()
  expect(screen.queryByText('Add LoRA')).toBeNull()
})

test('THE PACK ROW: kindFields commit + persist like any card scalar (never flat in the form)', () => {
  const { onEdit, onPatch } = openSection({ kinds: [FLOOR], values: {} })
  const input = screen.getByLabelText('Floor') as HTMLInputElement
  expect(input.value).toBe('0.5')
  fireEvent.change(input, { target: { value: '0.9' } })
  expect(onEdit).toHaveBeenCalledWith('floor', 0.9)
  expect(onPatch).toHaveBeenCalledWith({ floor: 0.9 })
})

test('THE PACK ROW: the values map wins over the field default (the run shows what runs)', () => {
  openSection({ kinds: [FLOOR], values: { floor: 0.3 } })
  expect((screen.getByLabelText('Floor') as HTMLInputElement).value).toBe('0.3')
})

test('THE TILES: served rows name + seed; id-less option rows fall to "Label N"; strengths print 2dp', () => {
  openSection({
    kinds: [LORA],
    values: { loras: [{ id: 'detail', strength: 0.8 }, { strength: 0.5 }] },
  })
  const first = tile('loras-0')
  expect(within(first).getByText('Detail')).not.toBeNull()
  expect(within(first).getByText('0.80')).not.toBeNull()
  const second = tile('loras-1')
  expect(within(second).getByText('LoRA 2')).not.toBeNull()
  expect(within(second).getByText('0.50')).not.toBeNull()
  fireEvent.click(first)
  expect(screen.getByText('Edit LoRA')).not.toBeNull()
})

test('THE TILES: drifted option ids title-case (never blank, never the fallback)', () => {
  openSection({ kinds: [LORA], values: { loras: [{ id: 'ghost' }] } })
  expect(within(tile('loras-0')).getByText('Ghost')).not.toBeNull()
  expect(tile('loras-0').textContent).not.toContain('.')
})

test('THE TILES: hybrid rows name their served type; drifted types title-case (never blank)', () => {
  openSection({
    kinds: [CONTROL],
    values: { controlnets: [{ type: 'depth', strength: 0.5 }, { type: 'custom-x' }] },
  })
  expect(within(tile('controlnets-0')).getByText('Depth')).not.toBeNull()
  expect(within(tile('controlnets-1')).getByText('Custom X')).not.toBeNull()
})

test('THE TILES: unserved rows seed from the row default (never an unpriced dial)', () => {
  openSection({ kinds: [LORA], values: { loras: [{ id: 'detail' }] } })
  expect(within(tile('loras-0')).getByText('0.80')).not.toBeNull()
})

test('THE TILES: junk bags never tile (a string bag, a mixed bag with strays)', () => {
  const first = openSection({ kinds: [LORA], values: { loras: 'nope' } })
  expect(document.querySelector('[data-mod-tile]')).toBeNull()
  first.unmount()
  openSection({ kinds: [LORA], values: { loras: [{ id: 'detail' }, 7, null] } })
  expect(tile('loras-0')).not.toBeNull()
  expect(document.querySelector('[data-mod-tile="loras-1"]')).toBeNull()
})

test('THE STACK LIMIT: a full stack refuses LOUD at the section (never a silent over-add)', () => {
  const capped = { ...LORA, max_stack: 1 } as unknown as ModifierKind
  openSection({ kinds: [capped], values: { loras: [{ id: 'detail' }] } })
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  fireEvent.click(screen.getByRole('menuitem', { name: 'LoRA' }))
  expect(screen.getByText(/stack limit reached/)).not.toBeNull()
  expect(screen.queryByText('Add LoRA')).toBeNull()
})

function dragDrop(over: HTMLElement, active: string, types: string[] = [MIME]): boolean {
  return fireEvent.drop(over, {
    dataTransfer: {
      types,
      getData: () => active,
      setData: () => {},
    },
  })
}

test('THE REORDER: dropping a tile on its sibling rewrites the bag (apply order = array order)', () => {
  const { onEdit } = openSection({
    kinds: [LORA],
    values: { loras: [{ id: 'detail' }, { id: 'plain' }] },
  })
  const first = tile('loras-0')
  fireEvent.dragStart(first, { dataTransfer: { setData: () => {}, effectAllowed: '' } })
  fireEvent.dragOver(tile('loras-1'), { dataTransfer: { types: [MIME], dropEffect: '' } })
  dragDrop(tile('loras-1'), 'loras-0')
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'plain' }, { id: 'detail' }])
  fireEvent.dragEnd(first)
})

test('THE REORDER: a drop of a stray id commits nothing (never a reorder to nowhere)', () => {
  const { onEdit } = openSection({
    kinds: [LORA],
    values: { loras: [{ id: 'detail' }, { id: 'plain' }] },
  })
  dragDrop(tile('loras-0'), 'loras-9')
  expect(onEdit).not.toHaveBeenCalled()
})

test('THE REORDER: dropping a tile on itself commits nothing (never a no-op write)', () => {
  const { onEdit } = openSection({
    kinds: [LORA],
    values: { loras: [{ id: 'detail' }, { id: 'plain' }] },
  })
  dragDrop(tile('loras-0'), 'loras-0')
  expect(onEdit).not.toHaveBeenCalled()
})

test('THE REORDER: a foreign drag passes through (never swallowed — preventDefault stays false)', () => {
  const { onEdit } = openSection({
    kinds: [LORA],
    values: { loras: [{ id: 'detail' }] },
  })
  const over = tile('loras-0')
  expect(fireEvent.dragOver(over, { dataTransfer: { types: ['Files'], dropEffect: '' } })).toBe(true)
  expect(fireEvent.drop(over, { dataTransfer: { types: ['Files'], getData: () => 'x' } })).toBe(true)
  expect(onEdit).not.toHaveBeenCalled()
})

// ── THE CATEGORY LAW (stroke 78 — the mods-abstraction law) ──

const SAM3K = {
  kind: 'sam3', label: 'SAM3', param_key: 'sam3', cardinality: 'list',
  category: 'standalone', leaf_face: 'bbox-canvas',
  fields: [
    { name: 'name', type: 'string', label: 'Name', default: 'sam3' },
    { name: 'bbox_x', type: 'number', label: 'Box x', default: -1 },
  ],
} as unknown as ModifierKind

const DRAWK = {
  kind: 'draw', label: 'Draw', param_key: 'draw', cardinality: 'list',
  category: 'ordered', leaf_face: 'paint-canvas',
  fields: [{ name: 'payload', type: 'path', wtype: 'image', label: 'Payload', default: '' }],
} as unknown as ModifierKind

test('STANDALONE TILES ARE NOT DRAGGABLE (order is void — each entry is its own output)', () => {
  openSection({ kinds: [SAM3K], values: { sam3: [{ name: 'a' }, { name: 'b' }] } })
  const first = tile('sam3-0')
  expect(first.getAttribute('draggable')).not.toBe('true')
  // a stray drop on a standalone tile commits nothing (no reorder arm)
  dragDrop(first, 'sam3-1')
  expect(document.querySelector('[data-mod-tile="sam3-1"]')).not.toBeNull()
})

test('ORDERED TILES STAY DRAGGABLE (the stacking law — loras, draw)', () => {
  openSection({ kinds: [DRAWK], values: { draw: [{ payload: '/a.png' }, { payload: '/b.png' }] } })
  expect(tile('draw-0').getAttribute('draggable')).toBe('true')
})

test('THE HINT NAMES THE CATEGORY (all-standalone = own-output hint; any ordered = the drag hint)', () => {
  const a = openSection({ kinds: [SAM3K], values: { sam3: [{ name: 'a' }] } })
  expect(screen.getByText('each entry is its own output (standalone)')).not.toBeNull()
  a.unmount()
  openSection({ kinds: [SAM3K, DRAWK], values: { sam3: [{ name: 'a' }], draw: [{ payload: '/a.png' }] } })
  expect(screen.getByText('drag to set apply order')).not.toBeNull()
})

test('A CATEGORY-LESS KIND DEFAULTS ORDERED (no served row changes shape)', () => {
  openSection({ kinds: [LORA], values: { loras: [{ id: 'detail' }] } })
  expect(tile('loras-0').getAttribute('draggable')).toBe('true')
})

test('a standalone tile FIRES no drag start (the onDragStart guard)', () => {
  openSection({ kinds: [SAM3K], values: { sam3: [{ name: 'a' }] } })
  const tile = document.querySelector('[data-mod-tile="sam3-0"]') as HTMLElement
  const dt = { setData: vi.fn(), effectAllowed: '' }
  fireEvent.dragStart(tile, { dataTransfer: dt as never })
  expect(dt.setData).not.toHaveBeenCalled()
})

test('an ordered tile FIRES the drag start (the MIME + reorder wake)', () => {
  openSection({ kinds: [DRAWK], values: { draw: [{ payload: 'p1' }, { payload: 'p2' }] } })
  const tile = document.querySelector('[data-mod-tile="draw-0"]') as HTMLElement
  const dt = { setData: vi.fn(), effectAllowed: '', types: [MOD_DRAG_MIME] }
  fireEvent.dragStart(tile, { dataTransfer: dt as never })
  expect(dt.setData).toHaveBeenCalledWith(MOD_DRAG_MIME, 'draw-0')
  const dtEnd = { ...dt, dropEffect: '' }
  fireEvent.dragOver(document.querySelector('[data-mod-tile="draw-1"]') as HTMLElement, { dataTransfer: dtEnd as never })
  fireEvent.dragEnd(tile, { dataTransfer: dtEnd as never })
})
