// @vitest-environment happy-dom
// gate-r7b-mods.spec.tsx — GATE R7B (mods.tsx dark arms): edit-mode
// steps refusals (whole-number + the row-domain range), the
// no-range/degenerate-range labels, and the defensive `?? []`
// fallbacks (the served rows vanishing mid-render/save degrade,
// never crash). Mirrors mods-leaf.spec.tsx's harness.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ModifierKind, ModifierOption } from '../src/spec.ts'

import { ModifiersSection, modTileIds } from '../src/mods.tsx'

afterEach(cleanup)

const LORA_DISTILL = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'dareties', label: 'LightX2V dareties v4', defaults: { strength: 0.4, steps: 4 } },
    { value: 'turbo', label: 'LightX2V Turbo 4-8 step', defaults: { strength: 0.6, steps: 8, steps_min: 4, steps_max: 8 } },
  ],
} as unknown as ModifierKind

const DISTILL_OPTS = (LORA_DISTILL as unknown as { options: ModifierOption[] }).options

/** A mixed catalog: the FIRST row carries no distill count — the
 *  create leaf's fallback row states a bare dial (no range, no fix,
 *  empty placeholder). */
const LORA_MIXED = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'plain', label: 'Plain' },
    { value: 'turbo', label: 'LightX2V Turbo 4-8 step', defaults: { strength: 0.6, steps: 8, steps_min: 4, steps_max: 8 } },
  ],
} as unknown as ModifierKind

/** A degenerate domain (min === max): the dial states the fix, never
 *  a one-wide range. */
const LORA_EQUAL = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'flat', label: 'Flat six', defaults: { strength: 0.5, steps: 6, steps_min: 6, steps_max: 6 } },
  ],
} as unknown as ModifierKind

/** A half-declared domain (floor only): the dial states the fix, the
 *  short prose rides the title (never the ranged claim). */
const LORA_MINONLY = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'half', label: 'Half declared', defaults: { strength: 0.5, steps: 6, steps_min: 4 } },
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

function openCreate(kindLabel: string): void {
  fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
  fireEvent.click(screen.getByRole('menuitem', { name: kindLabel }))
}

function openEditTile(tileId: string): void {
  fireEvent.click(document.querySelector(`[data-mod-tile="${tileId}"]`) as HTMLElement)
}

function saveLeaf(label: string): void {
  fireEvent.click(screen.getByRole('button', { name: label }))
}

// ── EDIT-MODE STEPS REFUSALS (the whole-number arm) ──

test('STEPS EDIT: a fractional / sub-one count refuses LOUD (never a silent fractional run)', () => {
  // (the dial is a number input — the DOM itself sanitizes
  // non-numeric keystrokes to blank, so the refusal arms ride the
  // values that survive sanitizing yet fail the whole-number law)
  for (const bad of ['2.5', '0']) {
    const { onEdit } = openLeaf({
      kinds: [LORA_DISTILL],
      values: { loras: [{ id: 'turbo', strength: 0.6, steps: 8 }] },
    })
    openEditTile(modTileIds(LORA_DISTILL, [{ id: 'turbo', strength: 0.6, steps: 8 }])[0]!)
    fireEvent.change(screen.getByLabelText('Steps applied'), { target: { value: bad } })
    saveLeaf('Save')
    expect(screen.getByText('Steps applied must be a whole number ≥ 1.')).not.toBeNull()
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByText('Edit LoRA')).not.toBeNull()
    cleanup()
  }
})

test('STEPS EDIT: below the entry row floor refuses LOUD (the 4-to-8 correction, edit side)', () => {
  const { onEdit } = openLeaf({
    kinds: [LORA_DISTILL],
    values: { loras: [{ id: 'turbo', strength: 0.6, steps: 8 }] },
  })
  openEditTile(modTileIds(LORA_DISTILL, [{ id: 'turbo', strength: 0.6, steps: 8 }])[0]!)
  fireEvent.change(screen.getByLabelText('Steps applied'), { target: { value: '3' } })
  saveLeaf('Save')
  expect(screen.getByText('Steps applied must be ≥ 4 on this adapter.')).not.toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
})

test('STEPS EDIT: above the entry row ceiling refuses LOUD (the 4-to-8 correction, edit side)', () => {
  const { onEdit } = openLeaf({
    kinds: [LORA_DISTILL],
    values: { loras: [{ id: 'turbo', strength: 0.6, steps: 8 }] },
  })
  openEditTile(modTileIds(LORA_DISTILL, [{ id: 'turbo', strength: 0.6, steps: 8 }])[0]!)
  fireEvent.change(screen.getByLabelText('Steps applied'), { target: { value: '9' } })
  saveLeaf('Save')
  expect(screen.getByText('Steps applied must be ≤ 8 on this adapter.')).not.toBeNull()
  expect(onEdit).not.toHaveBeenCalled()
})

test('STEPS EDIT: an entry whose row vanished still saves a typed count (the row bounds only a known row)', () => {
  const { onEdit } = openLeaf({
    kinds: [LORA_DISTILL],
    values: { loras: [{ id: 'ghost', strength: 0.5 }] },
  })
  openEditTile(modTileIds(LORA_DISTILL, [{ id: 'ghost', strength: 0.5 }])[0]!)
  fireEvent.change(screen.getByLabelText('Steps applied'), { target: { value: '6' } })
  saveLeaf('Save')
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'ghost', strength: 0.5, steps: 6 }])
})

// ── DEGENERATE-DOMAIN LABELS (range text + placeholder arms) ──

test('STEPS CREATE: a fallback row without a count states a bare dial with an empty placeholder', () => {
  openLeaf({ kinds: [LORA_MIXED], values: {} })
  openCreate('LoRA')
  // the fallback is the FIRST row (plain, count-less): no range, no fix
  expect(screen.getByText('Steps applied')).not.toBeNull()
  expect(screen.queryByText('Steps applied 4–8')).toBeNull()
  const dial = screen.getByLabelText('Steps applied') as HTMLInputElement
  expect(dial.placeholder).toBe('')
  expect(dial.min).toBe('')
  expect(dial.max).toBe('')
})

test('STEPS CREATE: min === max states the fix (never a one-wide range)', () => {
  openLeaf({ kinds: [LORA_EQUAL], values: {} })
  openCreate('LoRA')
  fireEvent.change(screen.getByLabelText('LoRA'), { target: { value: 'flat' } })
  expect(screen.getByText('Steps applied (fixed at 6)')).not.toBeNull()
  const dial = screen.getByLabelText('Steps applied') as HTMLInputElement
  expect(dial.min).toBe('6')
  expect(dial.max).toBe('6')
})

test('STEPS CREATE: a floor-only domain states the fix and keeps the short prose', () => {
  openLeaf({ kinds: [LORA_MINONLY], values: {} })
  openCreate('LoRA')
  fireEvent.change(screen.getByLabelText('LoRA'), { target: { value: 'half' } })
  expect(screen.getByText('Steps applied (fixed at 6)')).not.toBeNull()
  expect((screen.getByLabelText('Steps applied') as HTMLInputElement).title).toBe(
    'The distill’s own step count — the run’s sampler applies it unless a call pins steps explicitly.',
  )
})

// ── THE VANISHING ROWS (the defensive `?? []` fallbacks) ──

/** A kind whose served rows vanish after a budgeted number of reads
 *  (the estate withdrawing the catalog mid-render — the guards'
 *  nullish arms, never reachable through a steady catalog). */
function flipKind(initialBudget: number, opts: ModifierOption[]) {
  let reads = 0
  let budget = initialBudget
  const kind = {
    kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
    get options() { reads += 1; return reads <= budget ? opts : undefined },
    /** re-arm mid-test: the NEXT `n` reads see the rows, later reads
     *  see the withdrawal (deterministic across renders). */
    __arm: (n: number) => { reads = 0; budget = n },
  } as unknown as ModifierKind & { __arm(n: number): void }
  return kind
}

test('STEPS CREATE: rows vanishing before the steps probe degrade to no steps row (never a crash)', () => {
  // reads: 1 = the option-kind gate, 2 = the create select — the
  // probe itself (read 3) sees the withdrawal.
  openLeaf({ kinds: [flipKind(2, DISTILL_OPTS)], values: {} })
  openCreate('LoRA')
  expect(screen.getByText('Add LoRA')).not.toBeNull()
  expect(screen.queryByLabelText('Steps applied')).toBeNull()
})

test('STEPS CREATE: rows vanishing after the probe degrade to the bare dial (never a crash)', () => {
  // reads: 1 = gate, 2 = select, 3 = probe (sees the rows) — the row
  // lookup (read 4) sees the withdrawal and falls back to nothing.
  openLeaf({ kinds: [flipKind(3, DISTILL_OPTS)], values: {} })
  openCreate('LoRA')
  expect(screen.getByText('Steps applied')).not.toBeNull()
  const dial = screen.getByLabelText('Steps applied') as HTMLInputElement
  expect(dial.placeholder).toBe('')
})

test('STEPS EDIT SAVE: rows vanishing between the kind gate and the row lookup still save (never a crash)', () => {
  const kind = flipKind(Number.POSITIVE_INFINITY, DISTILL_OPTS)
  const { onEdit } = openLeaf({
    kinds: [kind],
    values: { loras: [{ id: 'turbo', strength: 0.6, steps: 8 }] },
  })
  openEditTile(modTileIds(LORA_DISTILL, [{ id: 'turbo', strength: 0.6, steps: 8 }])[0]!)
  fireEvent.change(screen.getByLabelText('Steps applied'), { target: { value: '6' } })
  // re-arm: the save's own gate read sees the rows (read 1), the row
  // lookup (read 2) sees the withdrawal.
  kind.__arm(1)
  saveLeaf('Save')
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'turbo', strength: 0.6, steps: 6 }])
})
