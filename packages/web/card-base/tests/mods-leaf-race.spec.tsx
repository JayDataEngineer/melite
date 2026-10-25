// mods-leaf-race.spec.tsx — debt 23 (client-state F4 supplementary,
// 2026-10-31 triage §B; audited 2026-11-01: every bench frame is a
// FRESH JSON PARSE — streamBenchFrames re-serves the bag as new
// objects, so reference identity alone orphans every concurrent
// hand into false ghost refusals). The leaf modal commits by ENTRY
// IDENTITY, never by index, across ALL THREE resolution tiers:
// reference (no re-parse), the catalog key (optionKeyOf — the lora
// name, the row id; survives other hands' scalar edits), and full
// content (field kinds, whose every field is a dial). Every wall
// drives the real ModifiersSection + a live rerender (the
// concurrent hand), asserting the commit payload on the captured
// onEdit; the fresh-parse arms are the PRODUCTION shape.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement as h } from 'react'
import { ModifiersSection, modTileIds } from '../src/mods.tsx'
import type { ModifierKind } from '../src/spec.ts'

const LORA = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'plain', label: 'Plain' },
    { value: 'turbo', label: 'LightX2V Turbo 4-8 step', defaults: { strength: 0.6, steps: 8, steps_min: 4, steps_max: 8 } },
  ],
} as unknown as ModifierKind

const CONTROL = {
  kind: 'controlnet', label: 'ControlNet', param_key: 'controlnets', cardinality: 'multi',
  entry: 'hybrid', option_key: 'type', scalar_key: 'strength',
  options: [
    { value: 'depth', label: 'Depth', model: 'm-depth', preprocessor: 'p-depth' },
    { value: 'canny', label: 'Canny', model: 'm-canny', preprocessor: 'p-canny' },
  ],
  fields: [
    { name: 'type', type: 'text', label: 'Type' },
    { name: 'strength', type: 'number', label: 'Strength' },
    { name: 'cond', type: 'text', label: 'Conditioning' },
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

type Row = Record<string, unknown>

/** THE PRODUCTION HAND: the next frame re-serves the bag from the
 * wire — new objects, same content. A reference-only identity law
 * sees every entry as gone after this. */
const fresh = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

function seat(kinds: ModifierKind[], values: Record<string, unknown>) {
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  const rendered = render(h(ModifiersSection, { kinds, values: values as never, onEdit, onPatch }))
  // onPatch rides out too (round-2 F5): a no-write wall must assert
  // BOTH doors stayed shut, not the onEdit proxy alone.
  return { onEdit, onPatch, ...rendered }
}

function openEditTile(tileId: string): void {
  fireEvent.click(document.querySelector(`[data-mod-tile="${tileId}"]`) as HTMLElement)
}

/** Open the edit leaf on a kind's Nth entry — the id minted by the
 * render's own grammar (modTileIds, debt 24: one truth, the wall
 * never re-spells the id class). */
function editSeat(k: typeof LORA, bag: Array<Record<string, unknown>>, i: number): void {
  openEditTile(modTileIds(k, bag)[i]!)
}

afterEach(cleanup)

test('REFERENCE TIER: a preserved reference still resolves (the intra-frame fast path)', () => {
  const b: Row = { id: 'turbo', strength: 0.6, steps: 8 }
  const { onEdit, rerender } = seat([LORA], { loras: [{ id: 'plain', strength: 1 }, b] })
  editSeat(LORA, [{ id: 'plain', strength: 1 }, b], 1)
  // no re-parse: the same object, now at index 0
  rerender(h(ModifiersSection, { kinds: [LORA], values: { loras: [b] } as never, onEdit, onPatch: vi.fn() }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.9' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'turbo', strength: 0.9, steps: 8 }])
})

test('NEAREST-OF-DUPLICATES: two same-key rows both confirming — the save lands on the SEAT NEARER the opened index, never the first walk match', () => {
  const dupA: Row = { id: 'turbo', strength: 0.6, steps: 4 }
  const dupB: Row = { id: 'turbo', strength: 0.6, steps: 8 }
  const dupFar: Row = { id: 'turbo', strength: 0.6, steps: 2 }
  const { onEdit, rerender } = seat([LORA], {
    loras: [{ id: 'plain', strength: 1 }, dupA, { id: 'other', strength: 1 }, dupB],
  })
  editSeat(LORA, [{ id: 'plain', strength: 1 }, dupA, { id: 'other', strength: 1 }, dupB], 3)
  // the wire re-serves the same bag fresh: the opened turbo (steps 8,
  // index 3) is gone by reference; BOTH rows match the catalog key
  // and the rides — the nearest walk must IMPROVE past the first
  // match (index 1, distance 2) onto the true seat (index 3)
  rerender(h(ModifiersSection, {
    kinds: [LORA],
    // dupFar rides LAST and FARTHER: the walk finds it after the
    // true seat and must NOT regress best onto it
    values: fresh({ loras: [{ id: 'plain', strength: 1 }, dupA, { id: 'other', strength: 1 }, dupB, dupFar] }) as never,
    onEdit, onPatch: vi.fn(),
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.9' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [
    { id: 'plain', strength: 1 },
    { id: 'turbo', strength: 0.6, steps: 4 },
    { id: 'other', strength: 1 },
    { id: 'turbo', strength: 0.9, steps: 8 },
    { id: 'turbo', strength: 0.6, steps: 2 },
  ])
})

test('FRESH-PARSE SHRINK: a re-served bag that shrank above the entry still lands the edit (catalog key beats reference-orphan)', () => {
  const { onEdit, rerender } = seat([LORA], {
    loras: [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }],
  })
  editSeat(LORA, [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }], 1)
  // the production hand: fresh objects, first entry gone — the
  // opened reference no longer exists anywhere in the bag
  rerender(h(ModifiersSection, {
    kinds: [LORA], values: fresh({ loras: [{ id: 'turbo', strength: 0.6, steps: 8 }] }) as never, onEdit, onPatch: vi.fn(),
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.9' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'turbo', strength: 0.9, steps: 8 }])
})

test('GHOST RACE (fresh parse): the edited entry vanishing refuses LOUD — the draft values SURVIVE, never a silent close', () => {
  const { onEdit, onPatch, rerender } = seat([LORA], { loras: [{ id: 'turbo', strength: 0.6, steps: 8 }] })
  editSeat(LORA, [{ id: 'turbo', strength: 0.6, steps: 8 }], 0)
  rerender(h(ModifiersSection, { kinds: [LORA], values: fresh({ loras: [] }) as never, onEdit, onPatch }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.8' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).not.toHaveBeenCalled()
  expect(onPatch).not.toHaveBeenCalled()
  expect(screen.getByText(/was removed from the bench while you edited it/)).not.toBeNull()
  expect(screen.getByText('Edit LoRA')).not.toBeNull()
  // the draft itself is intact — the typed dial survives the refusal
  expect((screen.getByLabelText('Strength') as HTMLInputElement).value).toBe('0.8')
})

test('FRESH-PARSE REORDER (option kind): the edit lands on the OPENED row at its new seat', () => {
  const { onEdit, rerender } = seat([LORA], {
    loras: [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }],
  })
  editSeat(LORA, [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }], 1)
  rerender(h(ModifiersSection, {
    kinds: [LORA], values: fresh({ loras: [{ id: 'turbo', strength: 0.6, steps: 8 }, { id: 'plain', strength: 1 }] }) as never, onEdit, onPatch: vi.fn(),
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  expect(onEdit).toHaveBeenCalledWith('loras', [
    { id: 'turbo', strength: 0.5, steps: 8 },
    { id: 'plain', strength: 1 },
  ])
})

test('FRESH-PARSE REORDER (hybrid kind): the catalog-key tier rides the option_key, not the reference', () => {
  const { onEdit, rerender } = seat([CONTROL], {
    controlnets: [
      { type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5 },
      { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.7 },
    ],
  })
  editSeat(CONTROL, [
    { type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5 },
    { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.7 },
  ], 1)
  rerender(h(ModifiersSection, {
    kinds: [CONTROL],
    values: fresh({
      controlnets: [
        { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.7 },
        { type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5 },
      ],
    }) as never,
    onEdit, onPatch: vi.fn(),
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  // canny edited at its new seat 0; depth untouched at seat 1
  expect(onEdit).toHaveBeenCalledWith('controlnets', [
    { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.4 },
    { type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5 },
  ])
})

test('FRESH-PARSE REORDER (field kind): the content tier matches the whole entry', () => {
  const { onEdit, rerender } = seat([MASK], {
    masks: [
      { image: 'i1', feather: 5, note: null },
      { image: 'i2', feather: 7, note: 'x' },
    ],
  })
  editSeat(MASK, [
    { image: 'i1', feather: 5, note: null },
    { image: 'i2', feather: 7, note: 'x' },
  ], 1)
  rerender(h(ModifiersSection, {
    kinds: [MASK],
    values: fresh({
      masks: [
        { image: 'i2', feather: 7, note: 'x' },
        { image: 'i1', feather: 5, note: null },
      ],
    }) as never,
    onEdit, onPatch: vi.fn(),
  }))
  fireEvent.change(screen.getByLabelText('Feather'), { target: { value: '9' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  // (the dial rides COERCED — the leaf's own patch boundary owns
  // coercion now, the sam_threshold cure at mods-leaf.spec)
  expect(onEdit).toHaveBeenCalledWith('masks', [
    { image: 'i2', feather: 9, note: 'x' },
    { image: 'i1', feather: 5, note: null },
  ])
})

test('FIELD GHOST (fresh parse): a concurrent edit to the SAME field entry refuses loud (the honest voice — content moved)', () => {
  const { onEdit, onPatch, rerender } = seat([MASK], { masks: [{ image: 'i1', feather: 5, note: null }] })
  editSeat(MASK, [{ image: 'i1', feather: 5, note: null }], 0)
  // another hand changed the entry: full content no longer matches
  rerender(h(ModifiersSection, {
    kinds: [MASK], values: fresh({ masks: [{ image: 'i1', feather: 3, note: null }] }) as never, onEdit, onPatch,
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).not.toHaveBeenCalled()
  expect(onPatch).not.toHaveBeenCalled()
  expect(screen.getByText(/was removed from the bench while you edited it/)).not.toBeNull()
  expect(screen.getByText('Edit Mask')).not.toBeNull()
})

test('CONCURRENT SCALAR EDIT (option kind): another hand edited the SAME entry — the catalog key still finds it (content tier would ghost)', () => {
  const { onEdit, rerender } = seat([LORA], {
    loras: [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }],
  })
  editSeat(LORA, [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }], 1)
  // the concurrent hand re-tuned steps on the OPENED entry: neither
  // its reference nor its full content survives — the catalog key
  // (the row id) is the only tier that can still seat the save
  rerender(h(ModifiersSection, {
    kinds: [LORA], values: fresh({ loras: [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 6 }] }) as never, onEdit, onPatch: vi.fn(),
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  // (the save lands on the RIGHT entry; the steps DIAL carries the
  // modal's own draft 8 — the leaf owns the fields it displays,
  // last-writer-wins per the debt-23 design note)
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.5, steps: 8 }])
})

test('CONCURRENT SCALAR EDIT (hybrid kind): the option_key survives a re-tuned entry', () => {
  const { onEdit, rerender } = seat([CONTROL], {
    controlnets: [
      { type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5 },
      { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.7 },
    ],
  })
  editSeat(CONTROL, [
    { type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5 },
    { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.7 },
  ], 1)
  rerender(h(ModifiersSection, {
    kinds: [CONTROL],
    values: fresh({
      controlnets: [
        { type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5 },
        { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.9 },
      ],
    }) as never,
    onEdit, onPatch: vi.fn(),
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [
    { type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5 },
    { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.4 },
  ])
})

test('DELETE RACE (fresh parse): Remove kills the OPENED entry after a reorder — a reference filter would remove nothing', () => {
  const { onEdit, rerender } = seat([LORA], {
    loras: [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }],
  })
  editSeat(LORA, [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }], 1)
  rerender(h(ModifiersSection, {
    kinds: [LORA],
    values: fresh({ loras: [{ id: 'turbo', strength: 0.6, steps: 8 }, { id: 'plain', strength: 1 }] }) as never,
    onEdit, onPatch: vi.fn(),
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
  expect(onEdit).toHaveBeenCalledTimes(1)
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'plain', strength: 1 }])
})

test('DELETE-GONE (fresh parse): Remove on an already-vanished entry closes WITHOUT a write (never a ledger no-op)', () => {
  const { onEdit, onPatch, rerender } = seat([LORA], {
    loras: [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }],
  })
  editSeat(LORA, [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }], 1)
  rerender(h(ModifiersSection, {
    kinds: [LORA], values: fresh({ loras: [{ id: 'plain', strength: 1 }] }) as never, onEdit, onPatch,
  }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
  // the intent is satisfied: close only — no commit, no ledger
  // write the Run fence would have to land before press. BOTH doors
  // stay shut (round-2 F5: onPatch is the write-through seat too)
  expect(onEdit).not.toHaveBeenCalled()
  expect(onPatch).not.toHaveBeenCalled()
  expect(screen.queryByText('Edit LoRA')).toBeNull()
})

test('DUPLICATE ROWS (fresh parse): two identical rows resolve to the seat NEAREST the opened index', () => {
  const { onEdit, rerender } = seat([LORA], {
    loras: [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }, { id: 'turbo', strength: 0.6, steps: 8 }],
  })
  editSeat(LORA, [{ id: 'plain', strength: 1 }, { id: 'turbo', strength: 0.6, steps: 8 }, { id: 'turbo', strength: 0.6, steps: 8 }], 1)
  // reverse: the matches sit at 0 and 1; the opened index 1 is
  // itself a match — nearest wins
  rerender(h(ModifiersSection, {
    kinds: [LORA],
    values: fresh({
      loras: [{ id: 'turbo', strength: 0.6, steps: 8 }, { id: 'turbo', strength: 0.6, steps: 8 }, { id: 'plain', strength: 1 }],
    }) as never,
    onEdit, onPatch: vi.fn(),
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [
    { id: 'turbo', strength: 0.6, steps: 8 },
    { id: 'turbo', strength: 0.2, steps: 8 },
    { id: 'plain', strength: 1 },
  ])
})

// ── ROUND-2 AUDIT WALLS (2026-11-01, report
// 2026-11-01-round2-verify-mods-identity.md): F1/F3 the divergent
// duplicate, F2 the ride-through boundary pinned, F4 the keyless
// fallthrough. ──────────────────────────────────────────────────

test('F1 DUPLICATE DIVERGENT (fresh parse): a same-key stranger with divergent ride-through fields is NOT the opened row — the save refuses loud, never a silent wrong-seat clobber', () => {
  const { onEdit, onPatch, rerender } = seat([LORA], {
    loras: [
      { id: 'plain', strength: 1 },
      { id: 'turbo', strength: 0.6, steps: 8, extra: 'mine' },
    ],
  })
  editSeat(LORA, [
    { id: 'plain', strength: 1 },
    { id: 'turbo', strength: 0.6, steps: 8, extra: 'mine' },
  ], 1)
  // the opened seat is gone; the survivor shares the catalog key but
  // diverges on a ride-through field (one the modal does not own)
  rerender(h(ModifiersSection, {
    kinds: [LORA], values: fresh({ loras: [{ id: 'turbo', strength: 0.55, steps: 6, extra: 'theirs' }] }) as never,
    onEdit, onPatch,
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.9' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByText(/was removed from the bench while you edited it/)).toBeTruthy()
  expect(onEdit).not.toHaveBeenCalled()
  expect(onPatch).not.toHaveBeenCalled()
  // the draft survives in the open modal
  expect((screen.getByLabelText('Strength') as HTMLInputElement).value).toBe('0.9')
})

test('F2 RIDE-THROUGH EDIT (fresh parse, the declared boundary): a concurrent edit to a NON-owned field on the same row refuses loud — the modal never silently clobbers a field it does not display', () => {
  const { onEdit, onPatch, rerender } = seat([LORA], {
    loras: [{ id: 'turbo', strength: 0.6, steps: 8, extra: 'mine' }],
  })
  editSeat(LORA, [{ id: 'turbo', strength: 0.6, steps: 8, extra: 'mine' }], 0)
  // another hand tuned the ride-through field on the SAME row; the
  // owned dials (strength/steps) are untouched — tier 2's confirm
  // owns exactly the split: dials survive (the walls above), rides
  // ghost (the modal cannot promise what it never showed)
  rerender(h(ModifiersSection, {
    kinds: [LORA], values: fresh({ loras: [{ id: 'turbo', strength: 0.6, steps: 8, extra: 'theirs' }] }) as never,
    onEdit, onPatch,
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.7' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByText(/was removed from the bench while you edited it/)).toBeTruthy()
  expect(onEdit).not.toHaveBeenCalled()
  expect((screen.getByLabelText('Strength') as HTMLInputElement).value).toBe('0.7')
})

test('F4 KEYLESS PRESENT (fresh parse): a row the catalog key cannot name still resolves by full content — present-but-keyless never ghosts, and a catalog pick re-keys it', () => {
  const { onEdit, rerender } = seat([LORA], {
    loras: [{ strength: 0.6, extra: 'z' }],
  })
  editSeat(LORA, [{ strength: 0.6, extra: 'z' }], 0)
  // reorder under the modal + fresh parse: the keyless row moves to
  // the far seat (a tier-2 key match could never find it)
  rerender(h(ModifiersSection, {
    kinds: [LORA], values: fresh({ loras: [{ id: 'plain', strength: 1 }, { strength: 0.6, extra: 'z' }] }) as never,
    onEdit, onPatch: vi.fn(),
  }))
  // the repair path: pick a served row — the save stamps the key on
  // the seat CONTENT found, landing the id the row always lacked
  // S7i: the catalog picker rides the DSH Menu (label face pick)
  fireEvent.click(screen.getByLabelText('LoRA'))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Plain' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('loras', [
    { id: 'plain', strength: 1 },
    { id: 'plain', strength: 0.6, extra: 'z' },
  ])
})


// ── ROUND-3 AUDIT WALLS (2026-11-01,
// 2026-11-01-round3-verify-mods-identity.md G1): the ride-through
// confirm's HYBRID arm — the owned set is the kind's own fields,
// everything else must still content-match. ─────────────────────

test('G1 HYBRID OWNED-DIAL SURVIVAL (fresh parse): a concurrent edit to a hybrid owned field lands the save — kind fields are dials, last-writer-wins by design', () => {
  const { onEdit, rerender } = seat([CONTROL], {
    controlnets: [
      { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.7, cond: 'img-a.png' },
    ],
  })
  editSeat(CONTROL, [
    { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.7, cond: 'img-a.png' },
  ], 0)
  // another hand edited `cond` — a field the modal OWNS (it rides
  // the leaf's own dial rail); the confirm must ignore owned keys
  // exactly as it ignores the strength scalar
  rerender(h(ModifiersSection, {
    kinds: [CONTROL],
    values: fresh({ controlnets: [{ type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.7, cond: 'img-b.png' }] }) as never,
    onEdit, onPatch: vi.fn(),
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.4' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onEdit).toHaveBeenCalledWith('controlnets', [
    { type: 'canny', model: 'm-canny', preprocessor: 'p-canny', strength: 0.4, cond: 'img-a.png' },
  ])
})

test('G1 HYBRID RIDE GHOST (fresh parse): two same-type rows with divergent STAMPS are strangers — the hybrid save never lands on the wrong seat', () => {
  const { onEdit, onPatch, rerender } = seat([CONTROL], {
    controlnets: [
      { type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5 },
      { type: 'canny', model: 'm-canny-old', preprocessor: 'p-canny-old', strength: 0.7 },
    ],
  })
  editSeat(CONTROL, [
    { type: 'depth', model: 'm-depth', preprocessor: 'p-depth', strength: 0.5 },
    { type: 'canny', model: 'm-canny-old', preprocessor: 'p-canny-old', strength: 0.7 },
  ], 1)
  // the opened canny is gone; the survivor shares the type (the
  // catalog key) but its stamps are from another era — ride-through
  // fields, never interchangeable
  rerender(h(ModifiersSection, {
    kinds: [CONTROL],
    values: fresh({ controlnets: [{ type: 'canny', model: 'm-canny-new', preprocessor: 'p-canny-new', strength: 0.5 }] }) as never,
    onEdit, onPatch,
  }))
  fireEvent.change(screen.getByLabelText('Strength'), { target: { value: '0.3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByText(/was removed from the bench while you edited it/)).toBeTruthy()
  expect(onEdit).not.toHaveBeenCalled()
  expect(onPatch).not.toHaveBeenCalled()
  expect((screen.getByLabelText('Strength') as HTMLInputElement).value).toBe('0.3')
})
