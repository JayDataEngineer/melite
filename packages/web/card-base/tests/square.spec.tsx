// @vitest-environment happy-dom
// square.spec.tsx — THE ONE SQUARE: any slot-shaped value renders
// the same way (thumbnail when it passes isImageUrl, the PLUS
// otherwise); the click IS the wire when a picker is attached, the
// file dialog only for a bare empty square; drops speak the asset
// MIME first, files second. Fakes: FileReader doubles + hand-built
// drop payloads — the component math runs for real.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h, useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import { ASSET_DRAG_MIME, InputSquare, isImageUrl, isMeshUrl } from '../src/square.tsx'
import { readAsDataURL } from '../src/chrome.ts'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

test('THE THUMBNAIL RULE: data/blob/http(s)/root-relative images pass, everything else files', () => {
  for (const good of [
    'data:image/png;base64,AAA',
    'DATA:IMAGE/WEBP;BASE64,AAA',
    'blob:https://host/uuid',
    'BLOB:http://host/uuid',
    'https://host/a.png',
    'http://host/a.JPG?x=1#y',
    '//host/a.webp?v=2',
    '/estate/a.avif',
    'https://host/a.jpeg',
    'https://host/a.gif',
    'https://host/a.bmp',
  ]) expect(isImageUrl(good)).toBe(true)
  for (const bad of [
    '', 'notaurl', 'https://host/noext',
    // svg is classified as an image but is DELIBERATELY not a
    // thumbnail (a square would embed it as a document) — the one
    // sanctioned divergence from the shared vocabulary, pinned here
    // so nobody re-adds svg to the square by accident
    'https://host/a.svg',
    'https://host/a.png.evil', 'data:application/pdf;base64,AAA',
    'https://host/a.png"', 'ftp://host/a.png',
  ]) expect(isImageUrl(bad)).toBe(false)
})

test('readAsDataURL: THE ONE read path resolves the mirror', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | null = null
    error: Error | null = null
    readAsDataURL(_f: Blob): void {
      this.result = 'data:image/png;base64,AAA'
      queueMicrotask(() => { this.onload?.() })
    }
  } as unknown as typeof RealReader
  try {
    await expect(readAsDataURL(new File(['x'], 'a.png'))).resolves.toBe('data:image/png;base64,AAA')
  } finally {
    globalThis.FileReader = RealReader
  }
})

test('readAsDataURL: a reader error rejects with the reader error, or the fallback when errorless', async () => {
  const RealReader = globalThis.FileReader
  const failing = (error: Error | null) => class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | null = null
    error: Error | null = error
    readAsDataURL(_f: Blob): void {
      queueMicrotask(() => { this.onerror?.() })
    }
  } as unknown as typeof RealReader
  globalThis.FileReader = failing(new Error('disk gone'))
  await expect(readAsDataURL(new File(['x'], 'a.png'))).rejects.toThrow(/disk gone/)
  globalThis.FileReader = failing(null)
  try {
    await expect(readAsDataURL(new File(['x'], 'a.png'))).rejects.toThrow(/read failed/)
  } finally {
    globalThis.FileReader = RealReader
  }
})

test('THE EMPTY SQUARE: the PLUS shows, captioned (or captionless when the section already names it)', () => {
  const { container, rerender } = render(h(InputSquare, { label: 'input_image' }))
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('svg')).not.toBeNull()
  expect(screen.getByText('input_image')).not.toBeNull()
  expect(screen.getByRole('button', { name: 'input_image source' })).not.toBeNull()
  rerender(h(InputSquare, { label: '' }))
  expect(container.querySelector('.does-not-exist')).toBeNull()
  expect(screen.getByRole('button', { name: 'source' })).not.toBeNull()
})

test('THE FILLED SQUARE: the thumbnail mirrors the value + the metric rides below', () => {
  const { container } = render(h(InputSquare, { label: 'input_image', value: 'https://host/a.png', metric: '512²' }))
  const img = container.querySelector('img')
  expect(img?.getAttribute('src')).toBe('https://host/a.png')
  expect(img?.getAttribute('alt')).toBe('input_image')
  expect(screen.getByText('512²')).not.toBeNull()
})

test('A NON-IMAGE value files (the PLUS, never a broken thumbnail)', () => {
  const { container } = render(h(InputSquare, { label: 'x', value: 'https://host/a.svg' }))
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('svg')).not.toBeNull()
})

test('THE MESH RULE: estate GLB paths and artifact GLB URLs pass; everything else files', () => {
  for (const good of [
    'data/input/donor.glb',
    '/runs/run-1/mesh.glb',
    'https://host/mesh.GLB?download=1',
    '//host/mesh.gltf#preview',
    'data:model/gltf-binary;base64,AAA',
    'data:model/gltf+json;base64,AAA',
  ]) expect(isMeshUrl(good)).toBe(true)
  for (const bad of [
    '', 'donor', 'https://host/mesh.glb.evil', 'https://host/a.png',
  ]) expect(isMeshUrl(bad)).toBe(false)
})

test('THE MESH SQUARE: a GLB value renders the inline viewport (never the image face)', () => {
  const { container } = render(h(InputSquare, { label: 'rigged_glb', value: 'data/input/donor.glb' }))
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('[data-viewport="square-mesh"]')).not.toBeNull()
  expect(screen.getByText('loading mesh…')).not.toBeNull()
})

test('THE SLOT IS THE WIRE: with a picker attached the click opens it, anchored on the square', () => {
  const seen: unknown[] = []
  render(h(InputSquare, { label: 'x', value: 'https://host/a.png', onPick: (a) => { seen.push(a) } }))
  fireEvent.click(screen.getByRole('button', { name: 'x source' }))
  expect(seen.length).toBe(1)
  expect(seen[0]).toBeInstanceOf(HTMLDivElement)
})

test('THE PLUS LAW: a bare empty square files (the hidden dialog opens)', () => {
  const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
  const onFile = vi.fn()
  render(h(InputSquare, { label: 'x', onFile }))
  fireEvent.click(screen.getByRole('button', { name: 'x source' }))
  expect(clickSpy).toHaveBeenCalledTimes(1)
  expect(onFile).not.toHaveBeenCalled()
})

test('A bare FILLED square never files (the value is set — the dialog stays shut)', () => {
  const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
  render(h(InputSquare, { label: 'x', value: 'https://host/a.png', onFile: () => {} }))
  fireEvent.click(screen.getByRole('button', { name: 'x source' }))
  expect(clickSpy).not.toHaveBeenCalled()
})

test('A pickerless, fileless square clicks silent (never a throw on a bare display square)', () => {
  render(h(InputSquare, { label: 'x' }))
  fireEvent.click(screen.getByRole('button', { name: 'x source' }))
})

test('THE DISABLED SQUARE: clicks die at the door (no picker, no dialog)', () => {
  const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
  const onPick = vi.fn()
  const { container } = render(h(InputSquare, { label: 'x', disabled: true, onPick, onFile: () => {} }))
  fireEvent.click(screen.getByRole('button', { name: 'x source' }))
  expect(onPick).not.toHaveBeenCalled()
  expect(clickSpy).not.toHaveBeenCalled()
  expect(container.querySelector('input[type="file"]')).toBeNull()
})

test('Enter opens the wire; other keys walk past', () => {
  const onPick = vi.fn()
  render(h(InputSquare, { label: 'x', onPick }))
  const box = screen.getByRole('button', { name: 'x source' })
  fireEvent.keyDown(box, { key: ' ' })
  expect(onPick).not.toHaveBeenCalled()
  fireEvent.keyDown(box, { key: 'Enter' })
  expect(onPick).toHaveBeenCalledTimes(1)
})

test('THE X: detach fires, the click never leaks to the wire', () => {
  const onClear = vi.fn()
  const onPick = vi.fn()
  render(h(InputSquare, { label: 'x', value: 'https://host/a.png', onClear, onPick }))
  fireEvent.click(screen.getByRole('button', { name: 'Detach x' }))
  expect(onClear).toHaveBeenCalledTimes(1)
  expect(onPick).not.toHaveBeenCalled()
})

test('THE X: only when a value is set AND the host voices detach', () => {
  const withValue = render(h(InputSquare, { label: 'x', value: 'https://host/a.png' }))
  expect(withValue.container.querySelector('button')).toBeNull()
  withValue.unmount()
  const empty = render(h(InputSquare, { label: 'x', onClear: () => {} }))
  expect(empty.container.querySelector('button')).toBeNull()
})

test('THE X: an unlabeled square still names its detach (never an empty accessible name)', () => {
  render(h(InputSquare, { label: '', value: 'https://host/a.png', onClear: () => {} }))
  expect(screen.getByRole('button', { name: 'Detach source' })).not.toBeNull()
})

test('DRAG-OVER: accepted types light up; unknown and disabled drags stay dark', () => {
  const { container, rerender } = render(h(InputSquare, { label: 'x' }))
  const box = screen.getByRole('button', { name: 'x source' })
  expect(fireEvent.dragOver(box, { dataTransfer: { types: ['Files'], getData: () => '', files: [] } })).toBe(false)
  expect(fireEvent.dragOver(box, { dataTransfer: { types: ['text/plain'], getData: () => '', files: [] } })).toBe(true)
  fireEvent.dragLeave(box)
  rerender(h(InputSquare, { label: 'x', disabled: true }))
  expect(fireEvent.dragOver(screen.getByRole('button', { name: 'x source' }), {
    dataTransfer: { types: ['Files'], getData: () => '', files: [] },
  })).toBe(true)
  expect(container.querySelector('input[type="file"]')).toBeNull()
})

test('DRAG-OVER: missing type metadata refuses the drop hint', () => {
  render(h(InputSquare, { label: 'x' }))
  const box = screen.getByRole('button', { name: 'x source' })
  expect(fireEvent.dragOver(box, { dataTransfer: { getData: () => '', files: [], types: undefined } })).toBe(true)
  expect(fireEvent.dragOver(box, { dataTransfer: { getData: () => '', files: [], types: null } })).toBe(true)
})

test('DROP: the asset MIME speaks first (files never shadow a media-bar drop)', () => {
  const onAsset = vi.fn()
  const onFile = vi.fn()
  render(h(InputSquare, { label: 'x', onAsset, onFile }))
  const box = screen.getByRole('button', { name: 'x source' })
  const payload = { types: [ASSET_DRAG_MIME], getData: (t: string) => (t === ASSET_DRAG_MIME ? JSON.stringify({ url: 'https://host/a.png' }) : ''), files: [new File(['x'], 'a.png')] }
  fireEvent.drop(box, { dataTransfer: payload })
  expect(onAsset).toHaveBeenCalledTimes(1)
  expect(onAsset).toHaveBeenCalledWith('https://host/a.png')
  expect(onFile).not.toHaveBeenCalled()
})

test('DROP: without the asset MIME the file rides; without either nothing fires', () => {
  const onFile = vi.fn()
  render(h(InputSquare, { label: 'x', onFile }))
  const box = screen.getByRole('button', { name: 'x source' })
  const file = new File(['x'], 'a.png', { type: 'image/png' })
  fireEvent.drop(box, { dataTransfer: { types: ['Files'], getData: () => '', files: [file] } })
  expect(onFile).toHaveBeenCalledTimes(1)
  expect(onFile).toHaveBeenCalledWith(file)
  fireEvent.drop(box, { dataTransfer: { types: [ASSET_DRAG_MIME], getData: () => 'garbage{', files: [file] } })
  expect(onFile).toHaveBeenCalledTimes(2)
  fireEvent.drop(box, { dataTransfer: { types: ['Files'], getData: () => '', files: [] as File[] } })
  expect(onFile).toHaveBeenCalledTimes(2)
})

test('DROP: a urlless asset payload falls through to the file', () => {
  const onAsset = vi.fn()
  const onFile = vi.fn()
  render(h(InputSquare, { label: 'x', onAsset, onFile }))
  const box = screen.getByRole('button', { name: 'x source' })
  const file = new File(['x'], 'a.png', { type: 'image/png' })
  fireEvent.drop(box, { dataTransfer: { types: [ASSET_DRAG_MIME], getData: () => JSON.stringify({ noUrl: 1 }), files: [file] } })
  expect(onAsset).not.toHaveBeenCalled()
  expect(onFile).toHaveBeenCalledTimes(1)
  // a non-string url is no url either
  fireEvent.drop(box, { dataTransfer: { types: [ASSET_DRAG_MIME], getData: () => JSON.stringify({ url: 7 }), files: [] as File[] } })
  expect(onAsset).not.toHaveBeenCalled()
  expect(onFile).toHaveBeenCalledTimes(1)
})

test('DROP: disabled squares swallow drops (never a voice past the door)', () => {
  const onAsset = vi.fn()
  const onFile = vi.fn()
  render(h(InputSquare, { label: 'x', disabled: true, onAsset, onFile }))
  fireEvent.drop(screen.getByRole('button', { name: 'x source' }), {
    dataTransfer: { getData: () => JSON.stringify({ url: 'https://host/a.png' }), files: [new File(['x'], 'a.png')] },
  })
  expect(onAsset).not.toHaveBeenCalled()
  expect(onFile).not.toHaveBeenCalled()
})

test('DROP: a fileless square with no asset voice drops silent (never a throw)', () => {
  render(h(InputSquare, { label: 'x' }))
  fireEvent.drop(screen.getByRole('button', { name: 'x source' }), {
    dataTransfer: { getData: () => '', files: [] as File[] },
  })
})

test('THE HIDDEN PICKER: a chosen file voices + the picker resets for the next pick', () => {
  const onFile = vi.fn()
  const { container } = render(h(InputSquare, { label: 'x', onFile }))
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  expect(input.getAttribute('accept')).toBe('image/png,image/jpeg,image/webp')
  const file = new File(['x'], 'a.png', { type: 'image/png' })
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
  expect(onFile).toHaveBeenCalledTimes(1)
  expect(onFile).toHaveBeenCalledWith(file)
  expect(input.value).toBe('')
})

test('THE HIDDEN PICKER: a cancelled pick resets silent (never a voice on empty)', () => {
  const onFile = vi.fn()
  const { container } = render(h(InputSquare, { label: 'x', onFile }))
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [], configurable: true })
  fireEvent.change(input)
  expect(onFile).not.toHaveBeenCalled()
})

let voices = 0
function UnmountingHost(): ReturnType<typeof h> | null { // the host renders nothing once the pick unmounts it
  const [on, setOn] = useState(true)
  if (!on) return null
  return h(InputSquare, { label: 'x', onFile: () => { voices += 1; setOn(false) } })
}

test('THE HIDDEN PICKER: a host that unmounts mid-pick never throws (the reset guards the gone ref)', () => {
  voices = 0
  const { container } = render(h(UnmountingHost))
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.png')], configurable: true })
  fireEvent.change(input)
  // the host unmounted on the voice — the square is gone, no throw, one voice
  expect(container.querySelector('input[type="file"]')).toBeNull()
  expect(voices).toBe(1)
})

test('THE HIDDEN PICKER: a synchronous host unmount leaves no stale input ref', () => {
  let unmount = (): void => {}
  const onFile = vi.fn(() => { unmount() })
  const view = render(h(InputSquare, { label: 'x', onFile }))
  unmount = view.unmount
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [new File(['x'], 'a.png')], configurable: true })
  expect(() => fireEvent.change(input)).not.toThrow()
  expect(onFile).toHaveBeenCalledTimes(1)
  expect(view.container.querySelector('input[type="file"]')).toBeNull()
})

test('the shared square carries mesh compatibility affordances and slot hooks', () => {
  const onPick = vi.fn()
  const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
  const { container, rerender } = render(h(InputSquare, {
    label: 'preview_glb',
    value: 'data/input/rig.glb',
    accept: '.glb,.gltf',
    badge: 'Rigged',
    metric: 'waiting',
    actions: h('button', { type: 'button' }, 'Wire'),
    emptyIcon: h('span', { 'data-testid': 'empty-icon' }, 'Person'),
    showFileAction: true,
    onPick,
    onFile: () => {},
    onAsset: () => {},
    onClear: () => {},
  }))
  expect(container.querySelector('[data-slot-square]')).not.toBeNull()
  expect(container.querySelector('[data-slot-input]')?.getAttribute('accept')).toBe('.glb,.gltf')
  expect(container.querySelector('[data-slot-label]')?.textContent).toBe('preview_glb')
  expect(container.querySelector('[data-slot-badge]')?.textContent).toBe('Rigged')
  fireEvent.click(screen.getByRole('button', { name: 'Wire' }))
  expect(onPick).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Pick a file for preview_glb' }))
  expect(clickSpy).toHaveBeenCalledTimes(1)
  rerender(h(InputSquare, {
    label: 'preview_glb',
    emptyIcon: h('span', { 'data-testid': 'empty-icon' }, 'Person'),
  }))
  expect(screen.getByTestId('empty-icon').textContent).toBe('Person')
})
