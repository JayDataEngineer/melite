// @vitest-environment happy-dom
/**
 * THE MOD SYSTEM (the SubcardGrid port, 2026-09-12): mods NEVER ride
 * the card form — the section owns the mod bags (features.modifiers
 * drives the kinds; the wire IS the storage: params[param_key]).
 * Cover: tile derivation (incl. a landed recipe row's default
 * strength), the + Mod picker (DSH Menu), the leaf editor (create
 * seeds the row's default strength; edit/remove), the max_stack
 * refusal, and the immediate commit (onEdit + onPatch — the old
 * onSaveParams law, never deferred to Run).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { ModifiersSection } from '../src/client/CardsTab.tsx'
import type { ModifierKind, SpecValues } from '../src/client/spec-form.tsx'

const loraKind = (): ModifierKind => ({
  kind: 'lora',
  label: 'LoRAs',
  param_key: 'loras',
  cardinality: 'list',
  options: [
    { value: 'krea2_realism_lora', label: 'Realism', defaults: { strength: 0.7 } },
    { value: 'krea2_darkbrush', label: 'Dark Brush', defaults: { strength: 0.8 } },
  ],
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function mount(values: SpecValues): { onEdit: ReturnType<typeof vi.fn>; onPatch: ReturnType<typeof vi.fn> } {
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  render(createElement(ModifiersSection, {
    kinds: [loraKind()],
    values,
    onEdit,
    onPatch,
  }))
  return { onEdit, onPatch }
}

test('renders nothing when the spec serves no mod kinds (controlnet stays absent by law)', () => {
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  const { container } = render(createElement(ModifiersSection, {
    kinds: [],
    values: {},
    onEdit,
    onPatch,
  }))
  expect(container.textContent).toBe('')
})

test('tiles derive from the bag — a stated strength shows; a landed recipe row shows the option default', () => {
  mount({
    loras: [
      { id: 'krea2_darkbrush', strength: 0.5 },
      { id: 'krea2_realism_lora' },
    ],
  })
  const tiles = Array.from(document.querySelectorAll('[data-mod-tile]'))
  expect(tiles).toHaveLength(2)
  expect(tiles[0].textContent).toContain('Dark Brush')
  expect(tiles[0].textContent).toContain('0.50')
  // the recipe row carries {id} only — the tile never renders undefined
  expect(tiles[1].textContent).toContain('Realism')
  expect(tiles[1].textContent).toContain('0.70')
})

test('+ Mod opens the picker; picking the kind opens the leaf; Add commits the bag with the row-default strength', async () => {
  const { onEdit, onPatch } = mount({})
  await userEvent.click(screen.getByText('+ Mod'))
  // the DSH Menu picker (portal) lists every addable kind
  const pick = await screen.findByRole('menuitem', { name: 'LoRAs' })
  fireEvent.click(pick)
  // the leaf: pick the row, leave strength blank (the row default seeds)
  const select = await screen.findByDisplayValue('— pick —')
  await userEvent.selectOptions(select, 'krea2_realism_lora')
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
  await waitFor(() => {
    expect(onPatch).toHaveBeenCalledWith({
      loras: [{ id: 'krea2_realism_lora', strength: 0.7 }],
    })
  })
  expect(onEdit).toHaveBeenCalledWith('loras', [{ id: 'krea2_realism_lora', strength: 0.7 }])
})

test('a tile click opens the leaf editor — Save patches the strength; Remove drops the entry', async () => {
  const { onEdit, onPatch } = mount({ loras: [{ id: 'krea2_darkbrush', strength: 0.8 }] })
  fireEvent.click(document.querySelector('[data-mod-tile]') as HTMLElement)
  const input = await screen.findByPlaceholderText('the row default')
  expect((input as HTMLInputElement).value).toBe('0.8')
  await userEvent.clear(input)
  await userEvent.type(input, '0.35')
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => {
    expect(onPatch).toHaveBeenCalledWith({ loras: [{ id: 'krea2_darkbrush', strength: 0.35 }] })
  })
  // remove: reopen, delete
  fireEvent.click(document.querySelector('[data-mod-tile]') as HTMLElement)
  await userEvent.click(await screen.findByRole('button', { name: 'Remove' }))
  await waitFor(() => {
    expect(onPatch).toHaveBeenLastCalledWith({ loras: [] })
  })
  expect(onEdit).toHaveBeenCalled()
})

test('a create with no picked row is refused LOUD — never a silent entry', async () => {
  const { onPatch } = mount({})
  await userEvent.click(screen.getByText('+ Mod'))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'LoRAs' }))
  // no option picked — Add must refuse (a number input cannot yield
  // 'abc' in a real browser; the reachable loud refusal is the
  // empty pick)
  await userEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(await screen.findByText(/Pick one from the served rows/)).toBeTruthy()
  expect(onPatch).not.toHaveBeenCalled()
})

test('max_stack refuses a second tile LOUD (the mask cap law)', async () => {
  const onPatch = vi.fn()
  render(createElement(ModifiersSection, {
    kinds: [{ kind: 'mask', label: 'Region Mask', param_key: 'mask', cardinality: 'list', max_stack: 1 }],
    values: { mask: [{ id: 'm1' }] },
    onEdit: vi.fn(),
    onPatch,
  }))
  await userEvent.click(screen.getByText('+ Mod'))
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Region Mask' }))
  expect(await screen.findByText(/stack limit reached \(1\)/)).toBeTruthy()
  expect(onPatch).not.toHaveBeenCalled()
})
