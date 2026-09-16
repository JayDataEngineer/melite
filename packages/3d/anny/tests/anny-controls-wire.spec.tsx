// @vitest-environment happy-dom
/**
 * anny controls + WirePickerModal — the knob seams and the wire UX.
 * Mirrors the card-base wire-picker pins against anny's port (same
 * data-wire-* hooks); knobs ride native events + window keys.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CardStage } from '@melite/contracts'

import { Checkbox, NumberField, SelectMenu, Tip, VerbChip } from '../src/ui/studio/controls.tsx'
import { WirePickerModal } from '../src/ui/studio/WirePickerModal.tsx'

afterEach(cleanup)

describe('Tip', () => {
  test('undefined renders the child bare; a tip wraps the bubble', () => {
    const { unmount } = render(h(Tip, { tip: undefined, children: h('span', {}, 'bare') }))
    expect(screen.getByText('bare')).not.toBeNull()
    unmount()
    render(h(Tip, { tip: 'bubble', children: h('span', {}, 'wrapped') }))
    expect(screen.getByText('wrapped')).not.toBeNull()
  })
})

describe('VerbChip', () => {
  test('rest/busy/icon/note variants', () => {
    const noop = (): void => {}
    const { unmount } = render(h(VerbChip, { onClick: noop, label: 'Compose' }))
    expect(screen.getByRole('button', { name: /Compose/ })).not.toBeNull()
    unmount()
    render(h(VerbChip, { onClick: noop, label: 'Run', busy: true, note: 'halfway', icon: h('i', {}, 'zap') }))
    // busy swaps the icon for the spinner — the custom glyph never shows
    expect(screen.queryByText('zap')).toBeNull()
    expect(screen.getByRole('status')).not.toBeNull()
  })

  test('a custom icon rides at rest; an error note alerts', () => {
    const noop = (): void => {}
    render(h(VerbChip, { onClick: noop, label: 'Go', icon: h('i', {}, 'zap'), note: 'loud', noteIsError: true }))
    expect(screen.getByText('zap')).not.toBeNull()
    expect(screen.getByRole('alert')).not.toBeNull()
  })

  test('the click fires', () => {
    const onClick = vi.fn()
    render(h(VerbChip, { onClick, label: 'Go' }))
    fireEvent.click(screen.getByRole('button', { name: /Go/ }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('SelectMenu', () => {
  const OPTS = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ]

  function openMenu(props: Record<string, unknown> = {}) {
    const onChange = vi.fn()
    render(h(SelectMenu, { value: 'b', options: OPTS, onChange, 'aria-label': 'pick', ...props }))
    fireEvent.click(screen.getByRole('button', { name: 'pick' }))
    return onChange
  }

  test('the current label shows; an unknown value shows raw', () => {
    const { unmount } = render(h(SelectMenu, { value: 'b', options: OPTS, onChange: () => {}, 'aria-label': 'pick' }))
    expect(screen.getByText('Beta')).not.toBeNull()
    unmount()
    render(h(SelectMenu, { value: 'zz', options: OPTS, onChange: () => {}, 'aria-label': 'pick' }))
    expect(screen.getByText('zz')).not.toBeNull()
  })

  test('an option click selects and closes', () => {
    const onChange = openMenu()
    fireEvent.click(screen.getByRole('option', { name: 'Gamma' }))
    expect(onChange).toHaveBeenCalledWith('c')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  test('hover follows the mouse; arrows walk; Enter commits', () => {
    const onChange = openMenu()
    fireEvent.mouseEnter(screen.getByRole('option', { name: 'Alpha' }))
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('b')
  })

  test('arrows clamp at the ends; Space commits too', () => {
    const onChange = openMenu()
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: ' ' })
    expect(onChange).toHaveBeenCalledWith('a')
    cleanup()
    openMenu()
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(screen.queryByRole('listbox')).not.toBeNull()
  })

  test('Escape and outside presses close; inside presses do not', () => {
    openMenu()
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Alpha' }))
    expect(screen.queryByRole('listbox')).not.toBeNull()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
    cleanup()
    openMenu()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  test('an empty menu swallows Enter; the disabled button never opens', () => {
    const onChange = vi.fn()
    render(h(SelectMenu, { value: 'x', options: [], onChange, 'aria-label': 'empty' }))
    fireEvent.click(screen.getByRole('button', { name: 'empty' }))
    expect(screen.queryByRole('listbox')).not.toBeNull()
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    cleanup()
    render(h(SelectMenu, { value: 'b', options: OPTS, onChange, 'aria-label': 'off', disabled: true }))
    expect(screen.getByRole('button', { name: 'off' }).hasAttribute('disabled')).toBe(true)
  })

  test('an unmapped key rests', () => {
    openMenu()
    fireEvent.keyDown(window, { key: 'x' })
    expect(screen.queryByRole('listbox')).not.toBeNull()
    fireEvent.keyDown(window, { key: 'Escape' })
  })
})

describe('NumberField', () => {
  test('writes ride parsed; garbage rides 0', () => {
    const onChange = vi.fn()
    render(h(NumberField, { value: 3, onChange, label: 'Steps', tooltip: 'count' }))
    const input = screen.getByLabelText('Steps') as HTMLInputElement
    fireEvent.change(input, { target: { value: '7' } })
    expect(onChange).toHaveBeenCalledWith(7)
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(0)
    fireEvent.change(input, { target: { value: 'Infinity' } })
    expect(onChange).toHaveBeenCalledWith(0)
  })

  test('a non-finite value shows 0', () => {
    render(h(NumberField, { value: Number.NaN, onChange: () => {} }))
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('0')
  })

  test('bare and label-only variants', () => {
    const { unmount } = render(h(NumberField, { value: 1, onChange: () => {} }))
    expect(screen.getByRole('spinbutton')).not.toBeNull()
    unmount()
    render(h(NumberField, { value: 1, onChange: () => {}, label: 'Seed' }))
    expect(screen.getByLabelText('Seed')).not.toBeNull()
  })
})

describe('Checkbox', () => {
  test('props pass through', () => {
    const onChange = vi.fn()
    render(h(Checkbox, { checked: false, onChange }))
    const box = screen.getByRole('checkbox') as HTMLInputElement
    fireEvent.click(box)
    expect(onChange).toHaveBeenCalled()
  })
})

/* ── WirePickerModal ─────────────────────────────────────────── */

function stage(id: string, title: string, result?: unknown): CardStage {
  return {
    id, title, kind: 'txt2img', service: 'anny', params: {}, inputs: [], inputIndices: [],
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
    slot: 'source_glb', priorStages: [], onPick, onUnwire, onClose, ...props,
  }))
  // the Modal atom portals to document.body — hooks read document-wide
  const options = (): HTMLElement[] =>
    [...document.querySelectorAll('[data-wire-option]')] as HTMLElement[]
  const wire = (hook: string): HTMLElement | null => document.querySelector(`[data-wire-${hook}]`)
  return { onPick, onUnwire, onClose, unmount: rendered.unmount, options, wire }
}

describe('WirePickerModal', () => {
  test('the empty rail says so', () => {
    const { wire } = openPicker()
    expect(wire('modal')).not.toBeNull()
    expect(screen.getByText(/No earlier cards yet/)).not.toBeNull()
    expect(wire('option')).toBeNull()
    expect(screen.getByText(/Wire source_glb from an earlier card/)).not.toBeNull()
  })

  test('the un-run upstream numbers, falls back, waits — still wireable', () => {
    const { onPick, options } = openPicker({ priorStages: [stage('a', 'Anny')] })
    expect(options().length).toBe(1)
    const option = options()[0]!
    expect(option.getAttribute('data-wire-option')).toBe('primary')
    expect(within(option).getByText('01')).not.toBeNull()
    expect(within(option).getByText('not run yet')).not.toBeNull()
    expect(option.querySelector('img')).toBeNull()
    fireEvent.click(option)
    expect(onPick).toHaveBeenCalledWith('a', null)
  })

  test('a run upstream mirrors its image; indices count on', () => {
    const { options } = openPicker({
      priorStages: [
        stage('a', 'Prep', runResult(['https://host/a.png'])),
        stage('b', 'Mesh', runResult(['https://host/b.glb'])),
      ],
    })
    expect(options().length).toBe(2)
    expect(within(options()[0]!).getByText('01')).not.toBeNull()
    expect(within(options()[1]!).getByText('02')).not.toBeNull()
    expect(options()[0]!.querySelector('img')?.getAttribute('src')).toBe('https://host/a.png')
    // a .glb primary is no thumbnail — the fallback glyph rides
    expect(options()[1]!.querySelector('img')).toBeNull()
    expect(options()[1]!.querySelector('svg')).not.toBeNull()
  })

  test('a run upstream with no artifacts says so', () => {
    openPicker({ priorStages: [stage('a', 'Prep', runResult())] })
    expect(screen.getByText('no artifacts')).not.toBeNull()
  })

  test('one named artifact rides the primary row', () => {
    const { onPick, options } = openPicker({
      priorStages: [stage('a', 'Prep', runResult(['https://host/p.png'], { media: 'https://host/m.png' }))],
    })
    expect(options().length).toBe(1)
    fireEvent.click(options()[0]!)
    expect(onPick).toHaveBeenCalledWith('a', null)
  })

  test('multi named artifacts expand one row per output; keys stay unique', () => {
    const { onPick, options } = openPicker({
      priorStages: [stage('a', 'Prep', runResult([], { media: 'https://host/m.png', mask: 'https://host/k.png' }))],
    })
    expect(options().length).toBe(2)
    expect(options()[0]!.getAttribute('data-wire-option')).toBe('media')
    expect(options()[1]!.getAttribute('data-wire-option')).toBe('mask')
    fireEvent.click(options()[1]!)
    expect(onPick).toHaveBeenCalledWith('a', 'mask')
  })

  test('a nameless artifact renders the explicit sub', () => {
    const { options } = openPicker({
      priorStages: [stage('a', 'Prep', runResult([], { media: 'https://host/m.png', ghost: undefined }))],
    })
    expect(options().length).toBe(2)
    expect(within(options()[1]!).getByText('no artifacts')).not.toBeNull()
  })

  test('the wired tag marks the (id + output) pair only', () => {
    const multi = [stage('a', 'Prep', runResult([], { media: 'https://host/m.png', mask: 'https://host/k.png' }))]
    const first = openPicker({ priorStages: multi, currentId: 'a', currentOutput: 'mask' })
    expect(screen.getAllByText('wired').length).toBe(1)
    first.unmount()
    const primary = [stage('a', 'Krea', runResult(['https://host/a.png']))]
    const second = openPicker({ priorStages: primary, currentId: 'a', currentOutput: null })
    expect(screen.getAllByText('wired').length).toBe(1)
    second.unmount()
    openPicker({ priorStages: primary, currentId: 'ghost' })
    expect(screen.queryByText('wired')).toBeNull()
  })

  test('an output mismatch marks nothing', () => {
    openPicker({
      priorStages: [stage('a', 'Krea', runResult(['https://host/a.png']))],
      currentId: 'a', currentOutput: 'mask',
    })
    expect(screen.queryByText('wired')).toBeNull()
  })

  test('the unwire shows only when wired and fires', () => {
    const { wire, onUnwire } = openPicker({ priorStages: [stage('a', 'K')], currentId: 'a' })
    fireEvent.click(wire('unwire') as HTMLElement)
    expect(onUnwire).toHaveBeenCalledTimes(1)
  })

  test('the unwire hides when nothing is wired', () => {
    const { wire } = openPicker({ priorStages: [stage('a', 'K')] })
    expect(wire('unwire')).toBeNull()
  })

  test('the labelled close voices onClose', () => {
    const { onClose } = openPicker()
    fireEvent.click(screen.getByRole('button', { name: 'Close wire picker' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
