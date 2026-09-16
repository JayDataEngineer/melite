// @vitest-environment happy-dom
/**
 * THE BBOX LEAF FACE (stroke 78 — the mods-abstraction law): the
 * selection modal for bbox-canvas kinds. Cover: the empty-reference
 * ready path (blank canvas, Save disabled — never a crash), both
 * cancel paths (button + backdrop), the drag → Save rectangle
 * contract (IMAGE-pixel coordinates, rounded), the seeded rectangle
 * (an entry's current box renders + re-saves), and the no-context
 * degrade (happy-dom has no canvas 2d — the guards hold).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { BboxLeafModal } from '../src/ui/BboxLeafModal.tsx'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

function mountModal(over?: Partial<Parameters<typeof BboxLeafModal>[0]>) {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(createElement(BboxLeafModal, {
    referenceUrl: '',
    bbox: null,
    onSave,
    onCancel,
    ...over,
  }))
  return { onSave, onCancel }
}

test('empty reference readies the blank canvas — Save disabled, hint seated, never a crash', async () => {
  mountModal()
  const view = await screen.findByTestId('bbox-leaf-view')
  expect(view.style.display).toBe('block')
  expect(screen.getByRole('button', { name: 'Save box' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByText('drag on the image to draw the box')).toBeTruthy()
})

test('both cancel paths close without saving', async () => {
  const { onCancel, onSave } = mountModal({ title: 'Pick it' })
  await screen.findByTestId('bbox-leaf-view')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onSave).not.toHaveBeenCalled()
})

test('backdrop pointer-down cancels (the card chrome law — click outside closes)', async () => {
  const { onCancel } = mountModal()
  await screen.findByTestId('bbox-leaf-view')
  const dialog = screen.getByRole('dialog')
  fireEvent.pointerDown(dialog, { button: 0 })
  expect(onCancel).toHaveBeenCalledTimes(1)
})

test('a drag without a 2d context still arms Save — the rectangle is STATE, the context only draws', async () => {
  // (unlike the paint face, whose strokes LIVE on the canvas: a box
  // is geometry — the overlay is cosmetic, the save never needs it)
  mountModal()
  const view = await screen.findByTestId('bbox-leaf-view')
  expect((view as HTMLCanvasElement).getContext('2d')).toBeNull()
  ;(view as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 }) as DOMRect
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerMove(view, { clientX: 60, clientY: 60 })
  fireEvent.pointerUp(view)
  expect(screen.getByRole('button', { name: 'Save box' }).hasAttribute('disabled')).toBe(false)
})

/** The stubbed 2d context (the DRAW path — every member the modal touches). */
function stubContext() {
  const ctx = {
    clearRect: vi.fn(), drawImage: vi.fn(),
    strokeRect: vi.fn(), setLineDash: vi.fn(),
    strokeStyle: '', lineWidth: 0,
  }
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}

function dragOn(view: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }): void {
  fireEvent.pointerDown(view, { button: 0, clientX: from.x, clientY: from.y })
  fireEvent.pointerMove(view, { clientX: to.x, clientY: to.y })
  fireEvent.pointerUp(view)
}

/** A canvas whose bounding rect + width/height make view == image
 *  pixels (scale 1:1) — the coordinate law proves in the raw. */
test('a drag arms Save; the save converts view px to IMAGE px (blank canvas: 1024 naturals on a 640 view)', async () => {
  stubContext()
  const { onSave } = mountModal()
  const view = await screen.findByTestId('bbox-leaf-view')
  // the fit law: a blank 1024 image fits to a 640 view (×0.625) —
  // wait for the fit BEFORE dragging (the ready flip is async)
  await waitFor(() => { expect((view as HTMLCanvasElement).width).toBe(640) })
  ;(view as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 }) as DOMRect
  dragOn(view, { x: 10, y: 20 }, { x: 110, y: 70 })   // 100×50 view px
  const save = screen.getByRole('button', { name: 'Save box' })
  expect(save.hasAttribute('disabled')).toBe(false)
  expect(screen.getByText('box 100×50 (view px)')).toBeTruthy()
  fireEvent.click(save)
  expect(onSave).toHaveBeenCalledTimes(1)
  const box = onSave.mock.calls[0]![0] as { x: number; y: number; width: number; height: number }
  // view → natural = ×(1024/640) = 1.6, rounded
  expect(box).toEqual({ x: 16, y: 32, width: 160, height: 80 })
})

test('an image-loaded canvas scales view → natural pixels (the rectangle law: naturals)', async () => {
  stubContext()
  // a 2048-natural image on a 1024 view: the drawn 100×50 view box
  // saves as 200×100 image pixels
  const origImage = window.Image
  class FakeImage {
    onload: (() => void) | null = null
    naturalWidth = 2048
    naturalHeight = 2048
    set src(_v: string) { this.onload?.() }
  }
  vi.stubGlobal('Image', FakeImage as never)
  const { onSave } = mountModal({ referenceUrl: 'http://x/img.png' })
  const view = await screen.findByTestId('bbox-leaf-view')
  ;(view as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 }) as DOMRect
  ;(view as HTMLCanvasElement).width = 640
  ;(view as HTMLCanvasElement).height = 640
  dragOn(view, { x: 10, y: 10 }, { x: 110, y: 60 })
  fireEvent.click(screen.getByRole('button', { name: 'Save box' }))
  expect(onSave).toHaveBeenCalledTimes(1)
  const box = onSave.mock.calls[0]![0] as { x: number; y: number; width: number; height: number }
  // 640 view ← 2048 natural: scale 3.2 — the box triples
  expect(box.x).toBe(32)
  expect(box.y).toBe(32)
  expect(box.width).toBe(320)
  expect(box.height).toBe(160)
  vi.unstubAllGlobals()
  void origImage
})

test('a seeded rectangle arms Save; Clear disarms it (the four inputs stay the caller truth)', async () => {
  stubContext()
  const { onSave } = mountModal({ bbox: { x: 10, y: 20, width: 30, height: 40 } })
  const view = await screen.findByTestId('bbox-leaf-view')
  ;(view as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 }) as DOMRect
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Save box' }).hasAttribute('disabled')).toBe(false)
  }, { timeout: 3000 })
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(screen.getByRole('button', { name: 'Save box' }).hasAttribute('disabled')).toBe(true)
  expect(onSave).not.toHaveBeenCalled()
  void view
})

test('a failed image load degrades to the blank canvas (onerror → null, never a crash)', async () => {
  stubContext()
  class FailImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_v: string) { this.onerror?.() }
  }
  vi.stubGlobal('Image', FailImage as never)
  mountModal({ referenceUrl: 'http://x/broken.png' })
  const view = await screen.findByTestId('bbox-leaf-view')
  // the null image rides the 1024 blank-canvas law
  await waitFor(() => { expect((view as HTMLCanvasElement).width).toBe(640) })
  expect(screen.getByText('drag on the image to draw the box')).toBeTruthy()
  vi.unstubAllGlobals()
})

test('an unmount before the load resolves never seeds (the alive guard)', async () => {
  stubContext()
  const held: { onload: (() => void) | null } = { onload: null }
  class HeldImage {
    onload: (() => void) | null = null
    naturalWidth = 512
    naturalHeight = 512
    set src(_v: string) { held.onload = () => { this.onload?.() } }
  }
  vi.stubGlobal('Image', HeldImage as never)
  const { unmount } = render(createElement(BboxLeafModal, {
    referenceUrl: 'http://x/slow.png', bbox: null, onSave: () => {}, onCancel: () => {},
  }))
  unmount()
  held.onload?.()   // resolve after the unmount — the alive guard holds
  expect(document.querySelector('[data-bbox-leaf="backdrop"]')).toBeNull()
  vi.unstubAllGlobals()
})

test('pre-fit pointer events drop SILENT (a held image keeps the view unfitted — the guards, deterministically)', async () => {
  stubContext()
  class HeldImage {
    onload: (() => void) | null = null
    set src(_v: string) { /* never fires — the load hangs */ }
  }
  vi.stubGlobal('Image', HeldImage as never)
  const { onSave } = mountModal({ referenceUrl: 'http://x/hangs.png' })
  const view = await screen.findByTestId('bbox-leaf-view')
  // a move with no active draw: the drawingRef guard
  fireEvent.pointerMove(view, { clientX: 40, clientY: 40 })
  // a down against the unfitted view: toView's null + onDown's drop
  fireEvent.pointerDown(view, { button: 0, clientX: 40, clientY: 40 })
  expect(screen.getByRole('button', { name: 'Save box' }).hasAttribute('disabled')).toBe(true)
  // a Clear against the unfitted view: redraw's early return
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(onSave).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})
