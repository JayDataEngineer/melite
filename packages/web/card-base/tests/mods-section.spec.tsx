// @vitest-environment happy-dom
// mods-section.spec.tsx — THE MOD SYSTEM's section face (mods.tsx
// half 1): the section chrome, the pack-level scalar rows, the tile
// row (labels + strengths), the add grammar (square → kind menu →
// leaf), the stack-limit refusal, and the native reorder drag. The
// leaf's per-kind save laws ride mods-leaf.spec.tsx.
// @contract cards-mods-tile-identity
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ModifierKind } from '../src/spec.ts'

import { ModifiersSection, modTileIds } from '../src/mods.tsx'

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

/** The minted id for a kind's Nth entry (the render's own grammar —
 * one truth, imported: the wall never re-spells the id class). */
const tid = (k: ModifierKind, entries: Array<Record<string, unknown>>, i: number): string =>
  modTileIds(k, entries)[i]!

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

// THE MOD-KIND KNOB LAW (E2-7, the operator's burn: "WHY AM I SEEING
// CONTROLNET STRENGTH FLOOR OUTSIDE OF THE CONTROLNET MOD? WHY? WHAT
// REASON? THAT SHOULD NOT BE THERE" — the ledger carries the
// verbatim voice): a kind-level scalar of a LEAF-BEARING kind
// (cardinality ≠ 'scalar') renders ONLY inside the mod's own leaf —
// never as a section-level row beside the tiles. The client derives
// kindFields for hybrid kinds off the mod_schemas envelope
// (form.tsx:199, kindScalarFieldsOfEnvelope — the controlnet floor
// on z-image), so the leak is live for every boarded family, seated
// or not. A LEAFLESS kind (cardinality 'scalar' — no entries, no
// add square) keeps its section rows: they are its ONLY face, there
// is no mod modal to host them and no "outside" to leak from.
const CONTROL_FLOOR = {
  ...CONTROL,
  kindFields: [{ name: 'controlnet_strength_floor', type: 'number', label: 'Strength Floor', default: 0 }],
} as unknown as ModifierKind

test('THE MOD-KIND KNOB LAW (E2-7) THE BURN ARM: a hybrid kind\'s scalars NEVER render at the section (seated or not)', () => {
    // zero entries seated — the burn's exact face: a ControlNet knob
    // on a card with no ControlNet at all.
    openSection({ kinds: [CONTROL_FLOOR], values: {} })
    expect(screen.queryByLabelText('Strength Floor')).toBeNull()
    // and with an entry seated — still never beside the tiles.
    openSection({ kinds: [CONTROL_FLOOR], values: { controlnets: [{ type: 'depth', strength: 0.5 }] } })
    expect(screen.queryByLabelText('Strength Floor')).toBeNull()
  })

test('THE MOD-KIND KNOB LAW (E2-7) THE LEAF FACE: the create leaf carries the kind\'s scalars and commits them envelope-level', () => {
    const { onEdit, onPatch } = openSection({ kinds: [CONTROL_FLOOR], values: {} })
    fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
    fireEvent.click(screen.getByRole('menuitem', { name: 'ControlNet' }))
    const input = screen.getByLabelText('Strength Floor') as HTMLInputElement
    expect(input.value).toBe('0')
    fireEvent.change(input, { target: { value: '0.9' } })
    expect(onEdit).toHaveBeenCalledWith('controlnet_strength_floor', 0.9)
    expect(onPatch).toHaveBeenCalledWith({ controlnet_strength_floor: 0.9 })
  })

test('THE MOD-KIND KNOB LAW (E2-7) THE LEAF FACE, EDIT MODE: the edit leaf carries the same scalars (one face, both doors)', () => {
    const { onEdit } = openSection({
      kinds: [CONTROL_FLOOR],
      values: { controlnets: [{ type: 'depth', strength: 0.5 }], controlnet_strength_floor: 0.4 },
    })
    fireEvent.click(tile(tid(CONTROL_FLOOR, [{ type: 'depth', strength: 0.5 }], 0)))
    expect((screen.getByLabelText('Strength Floor') as HTMLInputElement).value).toBe('0.4')
    fireEvent.change(screen.getByLabelText('Strength Floor'), { target: { value: '0.6' } })
    expect(onEdit).toHaveBeenCalledWith('controlnet_strength_floor', 0.6)
  })

test('THE MOD-KIND KNOB LAW (E2-7) THE LEAFLESS EXCEPTION: a scalar-only kind keeps its section rows (its only face)', () => {
    const { onEdit } = openSection({ kinds: [FLOOR], values: {} })
    const input = screen.getByLabelText('Floor') as HTMLInputElement
    fireEvent.change(input, { target: { value: '0.9' } })
  expect(onEdit).toHaveBeenCalledWith('floor', 0.9)
})

test('THE TILES: served rows name + seed; id-less option rows fall to "Label N"; strengths print 2dp', () => {
  openSection({
    kinds: [LORA],
    values: { loras: [{ id: 'detail', strength: 0.8 }, { strength: 0.5 }] },
  })
  const BAG = [{ id: 'detail', strength: 0.8 }, { strength: 0.5 }]
  const first = tile(tid(LORA, BAG, 0))
  expect(within(first).getByText('Detail')).not.toBeNull()
  expect(within(first).getByText('0.80')).not.toBeNull()
  const second = tile(tid(LORA, BAG, 1))
  expect(within(second).getByText('LoRA 2')).not.toBeNull()
  expect(within(second).getByText('0.50')).not.toBeNull()
  fireEvent.click(first)
  expect(screen.getByText('Edit LoRA')).not.toBeNull()
})

test('THE TILES: drifted option ids title-case (never blank, never the fallback)', () => {
  openSection({ kinds: [LORA], values: { loras: [{ id: 'ghost' }] } })
  expect(within(tile(tid(LORA, [{ id: 'ghost' }], 0))).getByText('Ghost')).not.toBeNull()
  expect(tile(tid(LORA, [{ id: 'ghost' }], 0)).textContent).not.toContain('.')
})

test('THE TILES: hybrid rows name their served type; drifted types title-case (never blank)', () => {
  openSection({
    kinds: [CONTROL],
    values: { controlnets: [{ type: 'depth', strength: 0.5 }, { type: 'custom-x' }] },
  })
  expect(within(tile(tid(CONTROL, [{ type: 'depth', strength: 0.5 }, { type: 'custom-x' }], 0))).getByText('Depth')).not.toBeNull()
  expect(within(tile(tid(CONTROL, [{ type: 'depth', strength: 0.5 }, { type: 'custom-x' }], 1))).getByText('Custom X')).not.toBeNull()
})

const MCPSK = {
  kind: 'agent_mcps', label: 'MCPs', param_key: 'mcps', cardinality: 'list',
  fields: [
    { name: 'server', type: 'select', label: 'Server', options: [{ value: 'blender', label: 'blender' }, { value: 'unity', label: 'unity' }] },
  ],
} as unknown as ModifierKind

test('THE TILES: a select-shaped entry names its selection (never the bare kind label)', () => {
  openSection({
    kinds: [MCPSK],
    values: { mcps: [{ server: 'unity' }, {}] },
  })
  expect(within(tile(tid(MCPSK, [{ server: 'unity' }, {}], 0))).getByText('unity')).not.toBeNull()
  expect(within(tile(tid(MCPSK, [{ server: 'unity' }, {}], 1))).getByText('MCPs')).not.toBeNull()
})

test('THE TILES: a drifted select value falls to the kind label (never blank, never a crash)', () => {
  openSection({ kinds: [MCPSK], values: { mcps: [{ server: 'ghost' }] } })
  expect(within(tile(tid(MCPSK, [{ server: 'ghost' }], 0))).getByText('MCPs')).not.toBeNull()
})

const MIXEDK = {
  kind: 'mixed', label: 'Mixed', param_key: 'mixed', cardinality: 'list',
  fields: [
    { name: 'server', type: 'select', label: 'Server' },
    { name: 'flavor', type: 'select', label: 'Flavor', options: ['spicy', { value: 'mild', label: 'Mild One' }] },
  ],
} as unknown as ModifierKind

test('THE TILES: string options name verbatim; option-less selects fall to the kind label', () => {
  openSection({
    kinds: [MIXEDK],
    values: { mixed: [{ flavor: 'spicy' }, { flavor: 'mild' }, { server: 'x' }] },
  })
  expect(within(tile(tid(MIXEDK, [{ flavor: 'spicy' }, { flavor: 'mild' }, { server: 'x' }], 0))).getByText('spicy')).not.toBeNull()
  expect(within(tile(tid(MIXEDK, [{ flavor: 'spicy' }, { flavor: 'mild' }, { server: 'x' }], 1))).getByText('Mild One')).not.toBeNull()
  expect(within(tile(tid(MIXEDK, [{ flavor: 'spicy' }, { flavor: 'mild' }, { server: 'x' }], 2))).getByText('Mixed')).not.toBeNull()
})

test('THE TILES: unserved rows seed from the row default (never an unpriced dial)', () => {
  openSection({ kinds: [LORA], values: { loras: [{ id: 'detail' }] } })
  expect(within(tile(tid(LORA, [{ id: 'detail' }], 0))).getByText('0.80')).not.toBeNull()
})

test('THE TILES: junk bags never tile (a string bag, a mixed bag with strays)', () => {
  const first = openSection({ kinds: [LORA], values: { loras: 'nope' } })
  expect(document.querySelector('[data-mod-tile]')).toBeNull()
  first.unmount()
  openSection({ kinds: [LORA], values: { loras: [{ id: 'detail' }, 7, null] } })
  expect(tile(tid(LORA, [{ id: 'detail' }], 0))).not.toBeNull()
  expect(document.querySelectorAll('[data-mod-tile]').length).toBe(1)
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
  const BAG = [{ id: 'detail' }, { id: 'plain' }]
  const { onEdit } = openSection({
    kinds: [LORA],
    values: { loras: BAG },
  })
  const first = tile(tid(LORA, BAG, 0))
  fireEvent.dragStart(first, { dataTransfer: { setData: () => {}, effectAllowed: '' } })
  fireEvent.dragOver(tile(tid(LORA, BAG, 1)), { dataTransfer: { types: [MIME], dropEffect: '' } })
  dragDrop(tile(tid(LORA, BAG, 1)), tid(LORA, BAG, 0))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'plain' }, { id: 'detail' }])
  fireEvent.dragEnd(first)
})

test('THE REORDER: a drop of a stray id commits nothing (never a reorder to nowhere)', () => {
  const BAG = [{ id: 'detail' }, { id: 'plain' }]
  const { onEdit } = openSection({
    kinds: [LORA],
    values: { loras: BAG },
  })
  dragDrop(tile(tid(LORA, BAG, 0)), 'loras#deadbeef.9')
  expect(onEdit).not.toHaveBeenCalled()
})

test('THE REORDER: dropping a tile on itself commits nothing (never a no-op write)', () => {
  const BAG = [{ id: 'detail' }, { id: 'plain' }]
  const { onEdit } = openSection({
    kinds: [LORA],
    values: { loras: BAG },
  })
  dragDrop(tile(tid(LORA, BAG, 0)), tid(LORA, BAG, 0))
  expect(onEdit).not.toHaveBeenCalled()
})

test('THE REORDER: a foreign drag passes through (never swallowed — preventDefault stays false)', () => {
  const BAG = [{ id: 'detail' }]
  const { onEdit } = openSection({
    kinds: [LORA],
    values: { loras: BAG },
  })
  const over = tile(tid(LORA, BAG, 0))
  expect(fireEvent.dragOver(over, { dataTransfer: { types: ['Files'], dropEffect: '' } })).toBe(true)
  expect(fireEvent.drop(over, { dataTransfer: { types: ['Files'], getData: () => 'x' } })).toBe(true)
  expect(onEdit).not.toHaveBeenCalled()
})

test('THE REORDER RACE (debt 24): a bag that shifts mid-drag never moves the WRONG pair — ids resolve by CONTENT, a vanished entry refuses', async () => {
  // THE BURN CLASS (2026-11-01-round1-verify-mods-identity COVERAGE
  // finding): tile ids were minted `param_key-index` at render and
  // the drop re-matched those ids against the LIVE bag by index —
  // a bag that shrinks or reorders DURING the gesture (the bench
  // re-serves on every other hand's write) resolves the stale ids
  // onto whatever now sits at those indices: the drop lands on the
  // wrong pair. The cure: identity-minted ids (modTileIds) resolved
  // by content (modTileSeat) — the pair the drag meant is the pair
  // the commit moves, and a vanished entry refuses LOUD (no write).
  const A = { id: 'detail' }
  const B = { id: 'plain' }
  const C = { id: 'shadow' }
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  const props = (bag: Array<Record<string, unknown>>) => ({
    kinds: [LORA], onEdit, onPatch,
    values: { loras: bag },
  })
  const seat = render(h(ModifiersSection, props([A, B, C])))
  const idsBefore = modTileIds(LORA, [A, B, C])
  // the gesture starts on A (the drag-start id is frozen in the
  // dataTransfer for the gesture's life)
  fireEvent.dragStart(tile(idsBefore[0]!), { dataTransfer: { setData: () => {}, effectAllowed: '' } })
  // ANOTHER HAND: B leaves the bag mid-drag (a concurrent remove
  // re-serves the whole bag — fresh objects, shifted indices)
  seat.rerender(h(ModifiersSection, props([A, C]) as never))
  const idsAfter = modTileIds(LORA, [A, C])
  // A dropped ON C: content resolution finds A at 0, C at 1 — the
  // commit moves A after C. The INDEX class would have resolved
  // `loras-0`→A,`loras-2`→gone and refused at best; with a bag
  // REORDERED (not shrunk) it moved the wrong pair outright.
  dragDrop(tile(idsAfter[1]!), idsBefore[0]!)
  expect(onEdit).toHaveBeenCalledWith('loras', [C, A])
  expect(onPatch).toHaveBeenCalledWith({ loras: [C, A] })

  // THE VANISH FACE: the dragged entry itself leaves the bag
  // mid-drag — its content matches nothing, the drop REFUSES
  // (never a landing on the stale index's new tenant).
  onEdit.mockClear()
  const idsPair = modTileIds(LORA, [A, B])
  const seat2 = render(h(ModifiersSection, props([A, B]) as never))
  fireEvent.dragStart(tile(idsPair[0]!), { dataTransfer: { setData: () => {}, effectAllowed: '' } })
  seat2.rerender(h(ModifiersSection, props([B]) as never))
  const idsGone = modTileIds(LORA, [B])
  dragDrop(tile(idsGone[0]!), idsPair[0]!)
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
  const first = tile(tid(SAM3K, [{ name: 'a' }, { name: 'b' }], 0))
  expect(first.getAttribute('draggable')).not.toBe('true')
  // a stray drop on a standalone tile commits nothing (no reorder arm)
  dragDrop(first, tid(SAM3K, [{ name: 'a' }, { name: 'b' }], 1))
  expect(tile(tid(SAM3K, [{ name: 'a' }, { name: 'b' }], 1))).not.toBeNull()
})

test('ORDERED TILES STAY DRAGGABLE (the stacking law — loras, draw)', () => {
  openSection({ kinds: [DRAWK], values: { draw: [{ payload: '/a.png' }, { payload: '/b.png' }] } })
  expect(tile(tid(DRAWK, [{ payload: '/a.png' }, { payload: '/b.png' }], 0)).getAttribute('draggable')).toBe('true')
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
  expect(tile(tid(LORA, [{ id: 'detail' }], 0)).getAttribute('draggable')).toBe('true')
})

test('a standalone tile FIRES no drag start (the onDragStart guard)', () => {
  openSection({ kinds: [SAM3K], values: { sam3: [{ name: 'a' }] } })
  const tile = document.querySelector(`[data-mod-tile="${tid(SAM3K, [{ name: 'a' }], 0)}"]`) as HTMLElement
  const dt = { setData: vi.fn(), effectAllowed: '' }
  fireEvent.dragStart(tile, { dataTransfer: dt as never })
  expect(dt.setData).not.toHaveBeenCalled()
})

test('an ordered tile FIRES the drag start (the MIME + reorder wake)', () => {
  openSection({ kinds: [DRAWK], values: { draw: [{ payload: 'p1' }, { payload: 'p2' }] } })
  const tile = document.querySelector(`[data-mod-tile="${tid(DRAWK, [{ payload: 'p1' }, { payload: 'p2' }], 0)}"]`) as HTMLElement
  const dt = { setData: vi.fn(), effectAllowed: '', types: [MOD_DRAG_MIME] }
  fireEvent.dragStart(tile, { dataTransfer: dt as never })
  expect(dt.setData).toHaveBeenCalledWith(MOD_DRAG_MIME, tid(DRAWK, [{ payload: 'p1' }, { payload: 'p2' }], 0))
  const dtEnd = { ...dt, dropEffect: '' }
  fireEvent.dragOver(document.querySelector(`[data-mod-tile="${tid(DRAWK, [{ payload: 'p1' }, { payload: 'p2' }], 1)}"]`) as HTMLElement, { dataTransfer: dtEnd as never })
  fireEvent.dragEnd(tile, { dataTransfer: dtEnd as never })
})

test('a standalone tile PASSES drag over through (the onDragOver guard — never a reorder wake)', () => {
  const { onEdit } = openSection({ kinds: [SAM3K], values: { sam3: [{ name: 'a' }] } })
  const t = document.querySelector(`[data-mod-tile="${tid(SAM3K, [{ name: 'a' }], 0)}"]`) as HTMLElement
  expect(fireEvent.dragOver(t, { dataTransfer: { types: [MOD_DRAG_MIME], dropEffect: '' } as never })).toBe(true)
  expect(onEdit).not.toHaveBeenCalled()
})

test('a standalone tile ENDS the drag with no wake (the onDragEnd guard — never a reorder reset)', () => {
  const { onEdit } = openSection({ kinds: [SAM3K], values: { sam3: [{ name: 'a' }] } })
  const t = document.querySelector(`[data-mod-tile="${tid(SAM3K, [{ name: 'a' }], 0)}"]`) as HTMLElement
  fireEvent.dragEnd(t)
  expect(onEdit).not.toHaveBeenCalled()
  expect(document.querySelector(`[data-mod-tile="${tid(SAM3K, [{ name: 'a' }], 0)}"]`)).not.toBeNull()
})
