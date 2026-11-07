// @vitest-environment happy-dom
// mods-one-door.spec.tsx — THE ONE-DOOR LAW (operator, 2026-11-16:
// "collapse the mods into one"): the mod system has ONE entry — the
// plus square and the kind picker, the grammar every kind rides
// (Loras prove it). A declared section is a STARTING CELL INSIDE the
// leaf (the posture switches, slice 5), never a chip row outside it.
// The retired bag spellings are compose-door translation for
// pre-collapse documents — they are not UI and render nowhere.
// @contract cards-mods-one-door
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { ModifierKind } from '../src/spec.ts'
import { ModifiersSection } from '../src/mods.tsx'

afterEach(cleanup)

/** A FIELD kind carrying sections — the h3 edit kind's shape (one
 *  schema, named starting cells). The Loras grammar: options, no
 *  sections, nothing but the plus box. */
const EDIT = {
  kind: 'edit', label: 'Edit region', param_key: 'edit', cardinality: 'multi',
  fields: [
    { name: 'mask_source', type: 'text', label: 'Mask source' },
  ],
  sections: [
    { id: 'region', label: 'Repair a region', patch: { mask_source: 'region' } },
    { id: 'static-png', label: 'Static mask pass', patch: { mask_source: 'static-png' } },
  ],
} as unknown as ModifierKind

const LORA = {
  kind: 'lora', label: 'LoRA', param_key: 'loras', cardinality: 'multi',
  options: [
    { value: 'detail', label: 'Detail', defaults: { strength: 0.8 } },
  ],
} as unknown as ModifierKind

function openSection(kinds: ModifierKind[]) {
  const onPatch = vi.fn()
  const rendered = render(h(ModifiersSection, {
    kinds, values: {}, onEdit: vi.fn(), onPatch, loadMedia: () => Promise.resolve([]),
  }))
  return { onPatch, ...rendered }
}

const plusBox = (): HTMLElement =>
  document.querySelector('[data-subcard-add="mod"]') as HTMLElement
const chipRow = (): HTMLElement | null =>
  document.querySelector('[data-testid="cb-mod-section-row"]')
const leafSwitches = (): HTMLElement | null =>
  document.querySelector('[data-mod-sections]')

describe('THE ONE-DOOR LAW — one mod system, one entry (the plus box, like Loras)', () => {
  test('ARM 1 — sections render NO chip row outside the leaf: the section face is the plus box and the tiles, nothing else', () => {
    openSection([EDIT])
    // the door exists for every kind, sections or none
    expect(plusBox()).not.toBeNull()
    // the violation the operator named: the section chip row — the
    // retired bag spellings riding as buttons OUTSIDE the leaf. This
    // arm is RED until the row is deleted.
    expect(chipRow(), 'the section chip row must not render — the + box is the only door').toBeNull()
  })

  test('ARM 2 — a section-carrying kind enters through the PICKER, and its postures live INSIDE the leaf', async () => {
    openSection([EDIT])
    fireEvent.click(plusBox())
    // the kind picker menu (portal): every declared kind, one label —
    // the section kind rides the SAME item list as Loras, no shortcut
    const item = await screen.findByText('Edit region')
    fireEvent.click(item)
    // the leaf opens with the posture switches INSIDE it (slice 5's
    // own seat) — named starting cells are leaf postures, not strip
    // chips
    const switches = await waitFor(() => {
      const el = leafSwitches()
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    expect(switches.textContent).toContain('Repair a region')
    expect(switches.textContent).toContain('Static mask pass')
    // and the OUTSIDE face still carries no chip row
    expect(chipRow()).toBeNull()
  })

  test('ARM 3 — the Loras grammar unchanged: options kind, no sections anywhere, enters through the picker', () => {
    openSection([LORA])
    expect(plusBox()).not.toBeNull()
    expect(chipRow()).toBeNull()
  })
})
