// @vitest-environment happy-dom
/**
 * THE BBOX LEAF FACE, EMBEDDED (stroke 95): the selection canvas
 * that renders INSIDE the mod leaf popup. Cover: the
 * empty-reference ready path (blank canvas, never a crash), the
 * drag → COMMIT-ON-POINTER-UP rectangle contract (IMAGE-pixel
 * coordinates, rounded — no Save button: the leaf's own chrome
 * owns the commit), the commit's REF-MIRROR law (a synchronous
 * move+up pair still commits the LATEST rectangle — pointerup is
 * a continuous event, its closure may hold stale state), the
 * seeded rectangle (an entry's current box renders), Clear →
 * onChange(null), and the no-context degrade (happy-dom has no
 * canvas 2d — the guards hold).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { BboxLeafCanvas } from '../src/ui/BboxLeafCanvas.tsx'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

function mountCanvas(over?: Partial<Parameters<typeof BboxLeafCanvas>[0]>) {
  const onChange = vi.fn()
  render(createElement(BboxLeafCanvas, {
    referenceUrl: '',
    value: null,
    onChange,
    ...over,
  }))
  return { onChange }
}

test('empty reference readies the blank canvas — hint seated, never a crash', async () => {
  mountCanvas()
  const view = await screen.findByTestId('bbox-leaf-view')
  expect(view.style.display).toBe('block')
  expect(screen.getByText('drag on the image to scope the selection')).toBeTruthy()
})

test('a drag without a 2d context still commits — the rectangle is STATE, the context only draws', async () => {
  // (unlike the paint face, whose strokes LIVE on the canvas: a box
  // is geometry — the overlay is cosmetic, the commit never needs
  // it. The unsized happy-dom view (the 300×150 default) makes the
  // exact numbers meaningless here — the fitted tests pin the math.)
  const { onChange } = mountCanvas()
  const view = await screen.findByTestId('bbox-leaf-view')
  expect((view as HTMLCanvasElement).getContext('2d')).toBeNull()
  ;(view as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 }) as DOMRect
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerMove(view, { clientX: 60, clientY: 60 })
  fireEvent.pointerUp(view)
  expect(onChange).toHaveBeenCalledTimes(1)
  const box = onChange.mock.calls[0]![0] as { x: number; y: number; width: number; height: number }
  expect(Number.isFinite(box.x) && Number.isFinite(box.y) && Number.isFinite(box.width) && Number.isFinite(box.height)).toBe(true)
})

/** The stubbed 2d context (the DRAW path — every member the canvas touches). */
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

test('the commit converts view px to IMAGE px (blank canvas: 1024 naturals on a 640 view)', async () => {
  stubContext()
  const { onChange } = mountCanvas()
  const view = await screen.findByTestId('bbox-leaf-view')
  // the fit law: a blank 1024 image fits to a 640 view (×0.625) —
  // wait for the fit BEFORE dragging (the ready flip is async)
  await waitFor(() => { expect((view as HTMLCanvasElement).width).toBe(640) })
  ;(view as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 }) as DOMRect
  dragOn(view, { x: 10, y: 20 }, { x: 110, y: 70 })   // 100×50 view px
  expect(onChange).toHaveBeenCalledTimes(1)
  const box = onChange.mock.calls[0]![0] as { x: number; y: number; width: number; height: number }
  // view → natural = ×(1024/640) = 1.6, rounded
  expect(box).toEqual({ x: 16, y: 32, width: 160, height: 80 })
  expect(screen.getByText('box 100×50 (view px)')).toBeTruthy()
})

test('an image-loaded canvas scales view → natural pixels (the rectangle law: naturals)', async () => {
  stubContext()
  // a 2048-natural image on a 640 view: the drawn 100×50 view box
  // commits as 320×160 image pixels
  const origImage = window.Image
  class FakeImage {
    onload: (() => void) | null = null
    naturalWidth = 2048
    naturalHeight = 2048
    set src(_v: string) { this.onload?.() }
  }
  vi.stubGlobal('Image', FakeImage as never)
  const { onChange } = mountCanvas({ referenceUrl: 'http://x/img.png' })
  const view = await screen.findByTestId('bbox-leaf-view')
  ;(view as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 }) as DOMRect
  ;(view as HTMLCanvasElement).width = 640
  ;(view as HTMLCanvasElement).height = 640
  dragOn(view, { x: 10, y: 10 }, { x: 110, y: 60 })
  expect(onChange).toHaveBeenCalledTimes(1)
  const box = onChange.mock.calls[0]![0] as { x: number; y: number; width: number; height: number }
  // 640 view ← 2048 natural: scale 3.2 — the box triples
  expect(box).toEqual({ x: 32, y: 32, width: 320, height: 160 })
  vi.unstubAllGlobals()
  void origImage
})

test('the REF-MIRROR law: a second drag whose move and up land in ONE tick commits the LATEST box', async () => {
  stubContext()
  const { onChange } = mountCanvas()
  const view = await screen.findByTestId('bbox-leaf-view')
  await waitFor(() => { expect((view as HTMLCanvasElement).width).toBe(640) })
  ;(view as HTMLCanvasElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 640 }) as DOMRect
  // TWO full drags back-to-back: the second up must read the
  // second rect through the ref even if the closure state lags
  dragOn(view, { x: 10, y: 10 }, { x: 60, y: 60 })
  dragOn(view, { x: 20, y: 20 }, { x: 120, y: 70 })
  expect(onChange).toHaveBeenCalledTimes(2)
  const box = onChange.mock.calls[1]![0] as { x: number; y: number; width: number; height: number }
  expect(box).toEqual({ x: 32, y: 32, width: 160, height: 80 })
})

test('a seeded rectangle renders; Clear reports null (the four fields stay the caller truth)', async () => {
  stubContext()
  const { onChange } = mountCanvas({ value: { x: 10, y: 20, width: 30, height: 40 } })
  await screen.findByTestId('bbox-leaf-view')
  await waitFor(() => {
    expect(screen.getByText('box 19×25 (view px)')).toBeTruthy()
  }, { timeout: 3000 })
  fireEvent.click(screen.getByRole('button', { name: 'Clear box' }))
  expect(onChange).toHaveBeenCalledWith(null)
})

test('a failed image load degrades to the blank canvas (onerror → null, never a crash)', async () => {
  stubContext()
  class FailImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_v: string) { this.onerror?.() }
  }
  vi.stubGlobal('Image', FailImage as never)
  mountCanvas({ referenceUrl: 'http://x/broken.png' })
  const view = await screen.findByTestId('bbox-leaf-view')
  // the null image rides the 1024 blank-canvas law
  await waitFor(() => { expect((view as HTMLCanvasElement).width).toBe(640) })
  expect(screen.getByText('drag on the image to scope the selection')).toBeTruthy()
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
  const { unmount } = render(createElement(BboxLeafCanvas, {
    referenceUrl: 'http://x/slow.png', value: null, onChange: () => {},
  }))
  unmount()
  held.onload?.()   // resolve after the unmount — the alive guard holds
  expect(document.querySelector('[data-bbox-leaf-canvas="embedded"]')).toBeNull()
  vi.unstubAllGlobals()
})

test('pre-fit pointer events drop SILENT (a held image keeps the view unfitted — the guards, deterministically)', async () => {
  stubContext()
  class HeldImage {
    onload: (() => void) | null = null
    set src(_v: string) { /* never fires — the load hangs */ }
  }
  vi.stubGlobal('Image', HeldImage as never)
  const { onChange } = mountCanvas({ referenceUrl: 'http://x/hangs.png' })
  const view = await screen.findByTestId('bbox-leaf-view')
  // a move with no active draw: the drawingRef guard
  fireEvent.pointerMove(view, { clientX: 40, clientY: 40 })
  // a down against the unfitted view: toView's null + onDown's drop
  fireEvent.pointerDown(view, { button: 0, clientX: 40, clientY: 40 })
  expect(onChange).not.toHaveBeenCalled()
  // a Clear against the unfitted view: redraw's early return
  fireEvent.click(screen.getByRole('button', { name: 'Clear box' }))
  expect(onChange).toHaveBeenCalledWith(null)
  vi.unstubAllGlobals()
})

test('a re-render with the SAME box never re-seeds (the key guard)', async () => {
  stubContext()
  const onChange = vi.fn()
  const { rerender } = render(createElement(BboxLeafCanvas, {
    referenceUrl: '', value: { x: 10, y: 20, width: 30, height: 40 }, onChange,
  }))
  await waitFor(() => { expect(screen.getByTestId('bbox-leaf-view').style.display).toBe('block') })
  // a fresh object with the SAME contents: the seeded key matches, the
  // re-seed returns early (a Clear stays cleared until the VALUE moves)
  rerender(createElement(BboxLeafCanvas, {
    referenceUrl: '', value: { x: 10, y: 20, width: 30, height: 40 }, onChange,
  }))
  await waitFor(() => { expect(screen.getByTestId('bbox-leaf-view')).toBeTruthy() })
  expect(onChange).not.toHaveBeenCalled()
})

test('a bare up (no draw) and a bare click (0×0 drag) commit NOTHING', async () => {
  stubContext()
  const { onChange } = mountCanvas()
  const view = await screen.findByTestId('bbox-leaf-view')
  // an up with no active draw: the drawingRef guard
  fireEvent.pointerUp(view)
  expect(onChange).not.toHaveBeenCalled()
  // a down + up with no move: 0×0 keeps the previous box (never commits)
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerUp(view)
  expect(onChange).not.toHaveBeenCalled()
})
