// @vitest-environment happy-dom
/**
 * anny SlotSquare + RailTabs — the rail's square and tab strip.
 * Behavioral pins through the real seams (no module mocks): drops
 * ride synthetic DragEvents with a manual dataTransfer, picks ride
 * the hidden file input, tabs ride plain button clicks.
 */
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ASSET_DRAG_MIME, SlotSquare, isImageUrl } from '../src/ui/studio/slot.tsx'
import { RailTabs } from '../src/ui/studio/railTabs.tsx'

afterEach(cleanup)

describe('isImageUrl', () => {
  test('the thumbnail rule across shapes', () => {
    expect(isImageUrl('data:image/png;base64,AAA')).toBe(true)
    expect(isImageUrl('DATA:IMAGE/WEBP;base64,AAA')).toBe(true)
    expect(isImageUrl('blob:https://host/uuid')).toBe(true)
    expect(isImageUrl('https://host/a.png')).toBe(true)
    expect(isImageUrl('https://host/a.JPEG?w=1#x')).toBe(true)
    expect(isImageUrl('//host/a.webp')).toBe(true)
    expect(isImageUrl('https://host/a.mp4')).toBe(false)
    expect(isImageUrl('/mnt/x.glb')).toBe(false)
    expect(isImageUrl('data:application/json,{}')).toBe(false)
    expect(isImageUrl('hello')).toBe(false)
  })
})

/** A synthetic drop carrying an asset payload and/or files. */
function drop(node: HTMLElement, opts: { asset?: string; files?: File[]; types?: string[] }): void {
  const ev = createEvent.drop(node)
  const getData = (t: string): string => (t === ASSET_DRAG_MIME && opts.asset !== undefined ? opts.asset : '')
  Object.defineProperty(ev, 'dataTransfer', {
    value: { getData, files: opts.files ?? [], types: opts.types ?? [] },
  })
  fireEvent(node, ev)
}

function dragOver(node: HTMLElement, types: string[]): void {
  const ev = createEvent.dragOver(node)
  Object.defineProperty(ev, 'dataTransfer', { value: { types } })
  fireEvent(node, ev)
}

function square(): HTMLElement {
  return document.querySelector('[data-slot-square]') as HTMLElement
}

describe('SlotSquare', () => {
  test('empty: the Upload glyph, the label, no buttons', () => {
    render(h(SlotSquare, { label: 'source_glb' }))
    expect(square().querySelector('svg')).not.toBeNull()
    expect(screen.getByText('source_glb')).not.toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  test('empty sm defaults small', () => {
    render(h(SlotSquare, { label: 's', size: 'sm' }))
    expect(square().querySelector('svg')).not.toBeNull()
  })

  test('empty sm honors the custom icon', () => {
    render(h(SlotSquare, { label: 's', size: 'sm', emptyIcon: h('b', {}, 'GLB') }))
    expect(screen.getByText('GLB')).not.toBeNull()
  })

  test('an image value thumbnails', () => {
    render(h(SlotSquare, { label: 'input_image', value: 'https://host/a.png' }))
    const img = square().querySelector('img')!
    expect(img.getAttribute('src')).toBe('https://host/a.png')
    expect(img.getAttribute('alt')).toBe('input_image')
  })

  test('a data: non-image truncates; a path shows its basename', () => {
    const { unmount } = render(h(SlotSquare, { label: 'm', value: 'data:model/gltf-brevo,AAAA' }))
    expect(screen.getByText('data:model/gltf-…')).not.toBeNull()
    unmount()
    render(h(SlotSquare, { label: 'm', value: '/mnt/take/model.glb' }))
    expect(screen.getByText('model.glb')).not.toBeNull()
  })

  test('the hidden input picks a file', () => {
    const onPickFile = vi.fn()
    render(h(SlotSquare, { label: 's', onPickFile }))
    const input = document.querySelector('[data-slot-input]') as HTMLInputElement
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)
    expect(onPickFile).toHaveBeenCalledTimes(1)
    expect(onPickFile).toHaveBeenCalledWith(file)
  })

  test('the hidden input rests with no file', () => {
    const onPickFile = vi.fn()
    render(h(SlotSquare, { label: 's', onPickFile }))
    const input = document.querySelector('[data-slot-input]') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [] })
    fireEvent.change(input)
    expect(onPickFile).not.toHaveBeenCalled()
  })

  test('an asset drop with a handler short-circuits the file drop', () => {
    const onDropAsset = vi.fn()
    const onDropFile = vi.fn()
    render(h(SlotSquare, {
      label: 's',
      onDropAsset,
      onDropFile,
    }))
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    drop(square(), { asset: JSON.stringify({ url: 'https://host/a.png' }), files: [file], types: [ASSET_DRAG_MIME, 'Files'] })
    expect(onDropAsset).toHaveBeenCalledWith('https://host/a.png')
    expect(onDropFile).not.toHaveBeenCalled()
  })

  test('an asset drop without its handler falls through to the file', () => {
    const onDropFile = vi.fn()
    render(h(SlotSquare, { label: 's', onDropFile }))
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    drop(square(), { asset: JSON.stringify({ url: 'https://host/a.png' }), files: [file], types: [ASSET_DRAG_MIME] })
    expect(onDropFile).toHaveBeenCalledWith(file)
  })

  test('a malformed asset payload falls through to the file', () => {
    const onDropFile = vi.fn()
    render(h(SlotSquare, { label: 's', onDropFile }))
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    drop(square(), { asset: '{nope', files: [file], types: [ASSET_DRAG_MIME] })
    expect(onDropFile).toHaveBeenCalledWith(file)
  })

  test('a fileless drop with no file handler rests', () => {
    render(h(SlotSquare, { label: 's' }))
    drop(square(), { types: ['Files'] })
    expect(square()).not.toBeNull()
  })

  test('a disabled square rejects the drop', () => {
    const onDropFile = vi.fn()
    render(h(SlotSquare, { label: 's', disabled: true, onDropFile }))
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    drop(square(), { files: [file], types: ['Files'] })
    expect(onDropFile).not.toHaveBeenCalled()
  })

  test('drag-over highlights, leaves nothing, ignores strangers and the disabled', () => {
    render(h(SlotSquare, { label: 's', onDropFile: () => {} }))
    const plain = square().className
    dragOver(square(), ['Files'])
    const hot = square().className
    expect(hot).not.toBe(plain)
    // dragleave does not bubble through React — dispatch it raw (via
    // fireEvent so the state flush lands inside act)
    fireEvent(square(), new Event('dragleave', { bubbles: true }))
    expect(square().className).toBe(plain)
    // a stranger type never highlights
    dragOver(square(), ['text/plain'])
    expect(square().className).toBe(plain)
  })

  test('drag-over on the disabled square never highlights', () => {
    render(h(SlotSquare, { label: 's', disabled: true, onDropFile: () => {} }))
    const plain = square().className
    dragOver(square(), ['Files'])
    expect(square().className).toBe(plain)
  })

  test('clicks ride onClick; the disabled square swallows them', () => {
    const onClick = vi.fn()
    const { unmount } = render(h(SlotSquare, { label: 's', onClick }))
    fireEvent.click(square())
    expect(onClick).toHaveBeenCalledTimes(1)
    unmount()
    const muted = vi.fn()
    render(h(SlotSquare, { label: 's', disabled: true, onClick: muted }))
    fireEvent.click(square())
    expect(muted).not.toHaveBeenCalled()
  })

  test('Detach clears without triggering the square click', () => {
    const onClear = vi.fn()
    const onClick = vi.fn()
    render(h(SlotSquare, { label: 's', value: 'https://host/a.png', onClear, onClick }))
    fireEvent.click(screen.getByRole('button', { name: 'Detach' }))
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  test('Detach hides without a value and under disabled', () => {
    const { unmount } = render(h(SlotSquare, { label: 's', onClear: () => {} }))
    expect(screen.queryByRole('button', { name: 'Detach' })).toBeNull()
    unmount()
    render(h(SlotSquare, { label: 's', value: 'https://host/a.png', disabled: true, onClear: () => {} }))
    expect(screen.queryByRole('button', { name: 'Detach' })).toBeNull()
  })

  test('the pick button opens the chooser; the disabled square hides it', () => {
    const onPickFile = vi.fn()
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    const { unmount } = render(h(SlotSquare, { label: 'source_glb', onPickFile }))
    fireEvent.click(screen.getByRole('button', { name: 'Pick a file for source_glb' }))
    expect(click).toHaveBeenCalled()
    click.mockRestore()
    unmount()
    render(h(SlotSquare, { label: 'source_glb', disabled: true, onPickFile }))
    expect(screen.queryByRole('button', { name: 'Pick a file for source_glb' })).toBeNull()
    expect(onPickFile).not.toHaveBeenCalled()
  })

  test('actions ride along; the disabled square hides them', () => {
    const { unmount } = render(h(SlotSquare, { label: 's', actions: h('em', {}, 'wire') }))
    expect(screen.getByText('wire')).not.toBeNull()
    unmount()
    render(h(SlotSquare, { label: 's', disabled: true, actions: h('em', {}, 'wire') }))
    expect(screen.queryByText('wire')).toBeNull()
  })

  test('a clickable square carries the affordance; a bare one does not', () => {
    const { unmount } = render(h(SlotSquare, { label: 's', onClick: () => {} }))
    const hot = square().className
    unmount()
    render(h(SlotSquare, { label: 's' }))
    expect(square().className).not.toBe(hot)
  })

  test('badge and metric lines; a node badge rides bare', () => {
    const { unmount } = render(h(SlotSquare, { label: 's', badge: 'Krea run', metric: 'not run yet' }))
    expect(screen.getByText('Krea run')).not.toBeNull()
    expect(screen.getByText('not run yet')).not.toBeNull()
    unmount()
    render(h(SlotSquare, { label: 's', badge: h('i', {}, 'node-badge') }))
    expect(screen.getByText('node-badge')).not.toBeNull()
  })
})

describe('RailTabs', () => {
  const TABS = [
    { id: 'character', label: 'Character' },
    { id: 'render', label: 'Render' },
    { id: 'import', label: 'Import' },
  ] as const

  test('clicks switch; the selection voices aria-selected', () => {
    const onChange = vi.fn()
    render(h(RailTabs, {
      tabs: [...TABS], value: 'character' as string, onChange, ariaLabel: 'Anny',
    }))
    const rail = screen.getByRole('tablist', { name: 'Anny' })
    expect(rail).not.toBeNull()
    const render2 = screen.getByRole('tab', { name: 'Render' })
    expect(screen.getByRole('tab', { name: 'Character' }).getAttribute('aria-selected')).toBe('true')
    expect(render2.getAttribute('aria-selected')).toBe('false')
    fireEvent.click(render2)
    expect(onChange).toHaveBeenCalledWith('render')
  })

  test('dense swaps the strip + tab chrome', () => {
    const noop = (): void => {}
    const { unmount } = render(h(RailTabs, {
      tabs: [{ id: 'a', label: 'A' }], value: 'a', onChange: noop, ariaLabel: 'top',
    }))
    const topStrip = screen.getByRole('tablist').className
    const topTab = screen.getByRole('tab').className
    unmount()
    render(h(RailTabs, {
      tabs: [{ id: 'a', label: 'A' }], value: 'a', onChange: noop, ariaLabel: 'dense', dense: true,
    }))
    expect(screen.getByRole('tablist').className).not.toBe(topStrip)
    expect(screen.getByRole('tab').className).not.toBe(topTab)
    cleanup()
    // a dense strip with a RESTING tab covers the idle arm too
    const noop2 = (): void => {}
    render(h(RailTabs, {
      tabs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], value: 'b', onChange: noop2, ariaLabel: 'dense2', dense: true,
    }))
    expect(screen.getByRole('tab', { name: 'A' }).getAttribute('aria-selected')).toBe('false')
  })

  test('badges: counts show, zero and missing hide, tones ride', () => {
    const noop = (): void => {}
    render(h(RailTabs, {
      tabs: [
        { id: 'a', label: 'A', badge: 3 },
        { id: 'b', label: 'B', badge: 2, badgeTone: 'amber' },
        { id: 'c', label: 'C', badgeTone: 'fuchsia' },
        { id: 'd', label: 'D', badge: 0 },
      ],
      value: 'a', onChange: noop, ariaLabel: 'badges',
    }))
    expect(screen.getByText('3')).not.toBeNull()
    const amber = screen.getByText('2')
    expect(amber.className).not.toBe(screen.getByText('3').className)
    expect(screen.queryByText('0')).toBeNull()
  })
})
