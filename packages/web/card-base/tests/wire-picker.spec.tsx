// @vitest-environment happy-dom
// wire-picker.spec.tsx — THE SHARED WIRE PICKER: prior stages by
// array index (wires point backwards); 0–1 named artifacts ride the
// legacy primary row, >1 expands one row per output; the pick writes
// (upstream id + output name) and the caller owns the write.
// Rows keep their data-wire-* hooks — the spec reads those hooks,
// never invented test ids.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { CardStage } from '@melite/contracts'

import { WirePickerModal } from '../src/wirePicker.tsx'

afterEach(cleanup)

function stage(id: string, title: string, result?: unknown): CardStage {
  return {
    id, title, kind: 'txt2img', service: 'krea-2', params: {}, inputs: [], inputIndices: [],
    result: result ?? null,
  } as unknown as CardStage
}

const runResult = (assetUrls: string[] = [], artifacts: Record<string, unknown> = {}) =>
  ({ assetUrls, artifacts }) as unknown

function openPicker(props: Partial<Parameters<typeof WirePickerModal>[0]> = {}) {
  const onPick = vi.fn()
  const onUnwire = vi.fn()
  const onClose = vi.fn()
  const rendered = render(h(WirePickerModal, {
    slot: 'input_image', priorStages: [], onPick, onUnwire, onClose, ...props,
  }))
  // the Modal atom portals to document.body — hooks read document-wide
  const options = (): HTMLElement[] =>
    Array.from(document.querySelectorAll('[data-wire-option]')) as HTMLElement[] // same DOM-without-Iterable read as the axes wall
  const wire = (hook: string): HTMLElement | null => document.querySelector(`[data-wire-${hook}]`)
  return { onPick, onUnwire, onClose, container: rendered.container, unmount: rendered.unmount, options, wire }
}

test('THE EMPTY RAIL: no earlier cards — the picker says so (never an empty list)', () => {
  const { wire } = openPicker()
  expect(wire('modal')).not.toBeNull()
  expect(screen.getByText(/No earlier cards yet/)).not.toBeNull()
  expect(wire('option')).toBeNull()
  expect(screen.getByText(/Wire input_image from an earlier card/)).not.toBeNull()
})

test('THE UN-RUN UPSTREAM: numbered, fallback glyph, "not run yet" — still wireable', () => {
  const { onPick, options } = openPicker({ priorStages: [stage('a', 'Krea')] })
  expect(options().length).toBe(1)
  const option = options()[0]!
  expect(option.getAttribute('data-wire-option')).toBe('primary')
  expect(within(option).getByText('01')).not.toBeNull()
  expect(within(option).getByText('Krea')).not.toBeNull()
  expect(within(option).getByText('not run yet')).not.toBeNull()
  expect(option.querySelector('img')).toBeNull()
  fireEvent.click(option)
  expect(onPick).toHaveBeenCalledTimes(1)
  expect(onPick).toHaveBeenCalledWith('a', null)
})

test('THE RUN UPSTREAM: the image primary mirrors; indices count 01/02 down the rail', () => {
  const { options } = openPicker({
    priorStages: [
      stage('a', 'Krea', runResult(['https://host/a.png'])),
      stage('b', 'Flux', runResult(['https://host/b.png'])),
    ],
  })
  expect(options().length).toBe(2)
  expect(within(options()[0]!).getByText('01')).not.toBeNull()
  expect(within(options()[1]!).getByText('02')).not.toBeNull()
  expect(options()[0]!.querySelector('img')?.getAttribute('src')).toBe('https://host/a.png')
  expect(within(options()[0]!).getByText('https://host/a.png')).not.toBeNull()
})

test('A RUN UPSTREAM with no artifacts says "no artifacts" (never a blank sub)', () => {
  openPicker({ priorStages: [stage('a', 'Krea', runResult())] })
  expect(screen.getByText('no artifacts')).not.toBeNull()
})

test('ONE named artifact rides the legacy primary row (no per-output split below two)', () => {
  const { onPick, options } = openPicker({
    priorStages: [stage('a', 'Prep', runResult(['https://host/p.png'], { media: 'https://host/m.png' }))],
  })
  expect(options().length).toBe(1)
  expect(options()[0]!.getAttribute('data-wire-option')).toBe('primary')
  fireEvent.click(options()[0]!)
  expect(onPick).toHaveBeenCalledWith('a', null)
})

test('MULTI named artifacts expand one row per output (mask wires by NAME)', () => {
  const { onPick, options } = openPicker({
    priorStages: [stage('a', 'Prep', runResult([], { media: 'https://host/m.png', mask: 'https://host/k.png' }))],
  })
  expect(options().length).toBe(2)
  expect(options()[0]!.getAttribute('data-wire-option')).toBe('media')
  expect(options()[1]!.getAttribute('data-wire-option')).toBe('mask')
  expect(within(options()[1]!).getByText(/mask/)).not.toBeNull()
  fireEvent.click(options()[1]!)
  expect(onPick).toHaveBeenCalledWith('a', 'mask')
})

test('A NON-IMAGE artifact url rides the fallback glyph (never a broken thumbnail)', () => {
  const { options } = openPicker({
    priorStages: [stage('a', 'Prep', runResult([], { media: 'https://host/m.mp4', mask: 'https://host/k.png' }))],
  })
  expect(options()[0]!.querySelector('img')).toBeNull()
  expect(options()[0]!.querySelector('svg')).not.toBeNull()
  expect(options()[1]!.querySelector('img')?.getAttribute('src')).toBe('https://host/k.png')
})

test('A NAMELESS artifact url renders "no artifacts" in its sub (never undefined text)', () => {
  const { options } = openPicker({
    priorStages: [stage('a', 'Prep', runResult([], { media: 'https://host/m.png', ghost: undefined }))],
  })
  expect(options().length).toBe(2)
  expect(within(options()[1]!).getByText('no artifacts')).not.toBeNull()
  expect(options()[1]!.querySelector('img')).toBeNull()
})

test('THE WIRED TAG: the current (id + output) pair marks — mismatches mark nothing', () => {
  const multi = [stage('a', 'Prep', runResult([], { media: 'https://host/m.png', mask: 'https://host/k.png' }))]
  const first = openPicker({ priorStages: multi, currentId: 'a', currentOutput: 'mask' })
  expect(screen.getAllByText('wired').length).toBe(1)
  first.unmount()
  // primary selection: currentOutput null seats the primary row
  const primary = [stage('a', 'Krea', runResult(['https://host/a.png']))]
  const second = openPicker({ priorStages: primary, currentId: 'a', currentOutput: null })
  expect(screen.getAllByText('wired').length).toBe(1)
  second.unmount()
  // a foreign currentId marks nothing (the wire points elsewhere)
  openPicker({ priorStages: primary, currentId: 'ghost' })
  expect(screen.queryByText('wired')).toBeNull()
})

test('currentOutput mismatch marks nothing (primary is not the mask)', () => {
  openPicker({
    priorStages: [stage('a', 'Krea', runResult(['https://host/a.png']))],
    currentId: 'a', currentOutput: 'mask',
  })
  expect(screen.queryByText('wired')).toBeNull()
})

test('THE UNWIRE: offered only when wired; the click unwires', () => {
  const { wire, onUnwire } = openPicker({ priorStages: [stage('a', 'Krea')], currentId: 'a' })
  fireEvent.click(wire('unwire') as HTMLElement)
  expect(onUnwire).toHaveBeenCalledTimes(1)
})

test('THE UNWIRE: absent when nothing is wired (never an unwire to nowhere)', () => {
  const { wire } = openPicker({ priorStages: [stage('a', 'Krea')] })
  expect(wire('unwire')).toBeNull()
})

test('THE CLOSE: the labelled close voices onClose', () => {
  const { onClose } = openPicker()
  fireEvent.click(screen.getByRole('button', { name: 'Close wire picker' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})
