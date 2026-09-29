// @vitest-environment happy-dom
// form-submenu.spec.tsx — THE PARAMETER SUBMENU (the multi-group
// face): a card declaring MORE THAN ONE param group renders the
// tab rail with one visible panel at a time. The image-gen shape
// (prompt ×2 textareas, resolution numbers, sampling numbers) is
// pinned whole: every declared field has a face, and the rail
// switches panels (the operator's missing-fields report,
// 2026-09-20 — no silent field drops behind the tabs).
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { FormSpecDoc } from '../src/spec.ts'

import { CardForm } from '../src/form.tsx'

afterEach(cleanup)

type Ref = { type: string; meta?: Record<string, unknown>; dict?: Record<string, number> }

/** The image-gen shape: three param groups, two textareas sharing
 *  the prompt panel, numbers in resolution + sampling. */
function doc(): FormSpecDoc {
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { prompt: 1, negative_prompt: 2, width: 3, height: 4, steps: 5, seed: 6 } },
    1: { type: 'string', meta: { description: 'Prompt', extra: { order: 0, group: 'prompt', zone: 'params', wtype: 'textarea', required: true } } },
    2: { type: 'string', meta: { description: 'Negative Prompt', extra: { order: 1, group: 'prompt', zone: 'params', wtype: 'textarea' } } },
    3: { type: 'number', meta: { description: 'Width', default: 1024, min: 256, max: 2048, step: 16, extra: { order: 0, group: 'resolution', zone: 'params', wtype: 'number' } } },
    4: { type: 'number', meta: { description: 'Height', default: 1024, min: 256, max: 2048, step: 16, extra: { order: 1, group: 'resolution', zone: 'params', wtype: 'number' } } },
    5: { type: 'number', meta: { description: 'Steps', default: 8, min: 1, max: 100, step: 1, extra: { order: 0, group: 'sampling', zone: 'params', wtype: 'number' } } },
    6: { type: 'number', meta: { description: 'Seed', default: -1, step: 1, extra: { order: 4, group: 'sampling', zone: 'params' } } },
  }
  return { form: 'image-gen', model: 'krea-2', schema: { uid: 0, refs }, inputs: [] } as unknown as FormSpecDoc
}

function mount() {
  const onSet = vi.fn()
  render(h(CardForm, { spec: doc(), user: {}, onSet, onPick: () => {}, wire: { candidates: [] } }))
  return { onSet }
}

function tabs(): string[] {
  return Array.from(document.querySelectorAll('[role="tab"]')).map((t) => t.textContent ?? '')
}

function panels(): Array<string | null> {
  return Array.from(document.querySelectorAll('[data-form-group-panel]')).map((p) => p.getAttribute('data-form-group-panel'))
}

test('the rail names every param group; the first panel shows BOTH prompts', () => {
  mount()
  expect(tabs()).toEqual(['Prompt', 'Resolution', 'Sampling'])
  expect(panels()).toEqual(['prompt'])
  expect(screen.getByText('Prompt', { selector: 'span' })).not.toBeNull()
  expect(screen.getByText('Negative Prompt')).not.toBeNull()
})

test('switching tabs swaps the visible panel — steps lives under Sampling', () => {
  mount()
  fireEvent.click(screen.getByRole('tab', { name: 'Sampling' }))
  expect(panels()).toEqual(['sampling'])
  expect(screen.getByText('Steps')).not.toBeNull()
  expect(screen.getByText('Seed')).not.toBeNull()
  expect(screen.queryByText('Negative Prompt')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: 'Resolution' }))
  expect(panels()).toEqual(['resolution'])
  expect(screen.getByText('Width')).not.toBeNull()
  expect(screen.getByText('Height')).not.toBeNull()
})

test('an edit on a hidden panel stamps the user layer (tabs never gate the values)', () => {
  const { onSet } = mount()
  fireEvent.click(screen.getByRole('tab', { name: 'Sampling' }))
  const input = document.querySelector('[data-form-group-panel="sampling"] input') as HTMLInputElement | null
  if (input === null) throw new Error('no steps input')
  fireEvent.change(input, { target: { value: '52' } })
  expect(onSet).toHaveBeenCalledWith('steps', 52)
})
