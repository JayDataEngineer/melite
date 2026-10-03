// @vitest-environment happy-dom
/**
 * THE PAINT LEAF FACE, EMBEDDED (dev_docs/design/paint-leaf-canvas.md,
 * stroke 76; the stroke-95 embed rework): the brush canvas that
 * renders INSIDE the mod leaf popup — no modal chrome, no Save
 * button: every finished stroke COMMITs its PNG data URL through
 * onChange (alpha = strokes), Clear commits ''. Cover: the
 * empty-reference ready path (blank 1024 fit), the stroke →
 * commit contract, the degrade guards (no 2d context → a gesture
 * commits NOTHING, never a blank wipe), the payload seed
 * (paint-over), Clear, the brush dial, and the late size adopt.
 * happy-dom has no canvas 2d context — the stroke arm runs
 * against a stubbed context (the stub proves the DRAW path, the
 * un-stubbed run proves the degrade path).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { PAINT_STROKE_INK } from '../src/paintInk.ts'
import { PaintLeafCanvas } from '../src/ui/PaintLeafCanvas.tsx'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

function mountCanvas(over?: Partial<Parameters<typeof PaintLeafCanvas>[0]>) {
  const onChange = vi.fn()
  render(createElement(PaintLeafCanvas, {
    referenceUrl: '',
    value: '',
    onChange,
    ...over,
  }))
  return { onChange }
}

/** The stubbed 2d context (the DRAW path — every member the canvas touches). */
function stubContext() {
  const ctx = {
    clearRect: vi.fn(), drawImage: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    strokeStyle: '', lineWidth: 0, lineCap: '', lineJoin: '',
  }
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  vi.spyOn(window.HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,STROKE')
  return ctx
}

/** A reference image whose URL names its size ('img:800x600' → 800×600). */
function fakeImages() {
  class FakeImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = 800
    naturalHeight = 600
    set src(v: string) {
      const m = /(\d+)x(\d+)/.exec(v)
      if (m) { this.naturalWidth = Number(m[1]); this.naturalHeight = Number(m[2]) }
      this.onload?.()
    }
  }
  vi.stubGlobal('Image', FakeImage as never)
}

test('empty reference readies the blank canvas — brush seated, hint seated, never a crash', async () => {
  mountCanvas()
  const view = await screen.findByTestId('paint-leaf-view')
  expect(view.style.display).toBe('block')
  expect(screen.getByText('28')).toBeTruthy()
  expect(screen.getByText('drag on the image to paint the mask')).toBeTruthy()
})

test('a gesture without a 2d context degrades silent — no crash, NOTHING commits', async () => {
  const { onChange } = mountCanvas()
  const view = await screen.findByTestId('paint-leaf-view')
  // happy-dom supplies no canvas 2d context: the guards hold, the
  // pointer-up never wipes the field's value with a blank payload
  expect((view as HTMLCanvasElement).getContext('2d')).toBeNull()
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerMove(view, { clientX: 60, clientY: 60 })
  fireEvent.pointerUp(view)
  expect(onChange).not.toHaveBeenCalled()
})

test('stroke → pointer-up commits the payload PNG data URL (the field contract)', async () => {
  const ctx = stubContext()
  const { onChange } = mountCanvas()
  const view = await screen.findByTestId('paint-leaf-view')
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerMove(view, { clientX: 60, clientY: 60 })
  fireEvent.pointerUp(view)
  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenCalledWith('data:image/png;base64,STROKE')
  expect(ctx.strokeStyle).toBe(PAINT_STROKE_INK)
  // the readout flips to the strokes state
  expect(screen.getByText('strokes paint the mask (alpha = the mask)')).toBeTruthy()
})

test('Clear wipes the layer and commits the empty payload', async () => {
  stubContext()
  const { onChange } = mountCanvas()
  const view = await screen.findByTestId('paint-leaf-view')
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerUp(view)
  expect(onChange).toHaveBeenCalledWith('data:image/png;base64,STROKE')
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(onChange).toHaveBeenLastCalledWith('')
  expect(screen.getByText('drag on the image to paint the mask')).toBeTruthy()
})

test('a right-button gesture never starts a stroke (button 0 only)', async () => {
  stubContext()
  const { onChange } = mountCanvas()
  const view = await screen.findByTestId('paint-leaf-view')
  fireEvent.pointerDown(view, { button: 2, clientX: 50, clientY: 50 })
  fireEvent.pointerMove(view, { clientX: 60, clientY: 60 })
  fireEvent.pointerUp(view)
  expect(onChange).not.toHaveBeenCalled()
})

test('a seeded payload arms the strokes state (paint-over) and sizes the layer', async () => {
  stubContext()
  fakeImages()
  const { onChange } = mountCanvas({ value: 'pay:400x400' })
  await screen.findByTestId('paint-leaf-view')
  await waitFor(() => {
    expect((screen.getByTestId('paint-leaf-layer') as HTMLCanvasElement).width).toBe(400)
  }, { timeout: 3000 })
  expect(screen.getByText('strokes paint the mask (alpha = the mask)')).toBeTruthy()
  // a seed alone never commits — the commits are gestures
  expect(onChange).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})

test('the brush dial reseats the readout', async () => {
  stubContext()
  mountCanvas()
  await screen.findByTestId('paint-leaf-view')
  const range = screen.getByRole('slider', { name: 'Brush size' }) as HTMLInputElement
  fireEvent.change(range, { target: { value: '64' } })
  expect(screen.getByText('64')).toBeTruthy()
})

test('a reference image fits the view (800×600 → 640×480) and redraws under the strokes', async () => {
  const ctx = stubContext()
  fakeImages()
  mountCanvas({ referenceUrl: 'img:800x600' })
  const view = await screen.findByTestId('paint-leaf-view')
  await waitFor(() => { expect((view as HTMLCanvasElement).width).toBe(640) })
  await waitFor(() => { expect((view as HTMLCanvasElement).height).toBe(480) })
  // the reference draw fires on every redraw (image under, strokes over)
  expect(ctx.drawImage).toHaveBeenCalled()
  vi.unstubAllGlobals()
})

test('a failed reference load degrades to the blank 1024 canvas (never a crash)', async () => {
  stubContext()
  class FailImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    set src(_v: string) { this.onerror?.() }
  }
  vi.stubGlobal('Image', FailImage as never)
  mountCanvas({ referenceUrl: 'http://x/broken.png' })
  const view = await screen.findByTestId('paint-leaf-view')
  await waitFor(() => { expect((view as HTMLCanvasElement).width).toBe(640) })
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
  const { unmount } = render(createElement(PaintLeafCanvas, {
    referenceUrl: 'http://x/slow.png', value: '', onChange: () => {},
  }))
  unmount()
  held.onload?.()   // resolve after the unmount — the alive guard holds
  expect(document.querySelector('[data-paint-leaf-canvas="embedded"]')).toBeNull()
  vi.unstubAllGlobals()
})

test('a zero-natural reference keeps the guards (the redraw early-return, deterministically)', async () => {
  stubContext()
  fakeImages()
  const { rerender } = render(createElement(PaintLeafCanvas, {
    referenceUrl: 'img:0x600', value: '', onChange: () => {},
  }))
  await waitFor(() => { expect(screen.getByTestId('paint-leaf-view').style.display).toBe('block') })
  // the zero-width adopt empties the layer; a real size then lands
  rerender(createElement(PaintLeafCanvas, {
    referenceUrl: 'img:800x600', value: '', onChange: () => {},
  }))
  const view = screen.getByTestId('paint-leaf-view')
  await waitFor(() => { expect((view as HTMLCanvasElement).height).toBe(480) }, { timeout: 3000 })
  vi.unstubAllGlobals()
})

test('pre-fit pointer events degrade silent (a hung load keeps the view unfitted)', async () => {
  stubContext()
  class HeldImage {
    onload: (() => void) | null = null
    set src(_v: string) { /* never fires — the load hangs */ }
  }
  vi.stubGlobal('Image', HeldImage as never)
  const { onChange } = mountCanvas({ referenceUrl: 'http://x/hangs.png' })
  const view = await screen.findByTestId('paint-leaf-view')
  // a move with no active draw: the drawingRef guard
  fireEvent.pointerMove(view, { clientX: 40, clientY: 40 })
  // an up with no active draw: never commits
  fireEvent.pointerUp(view)
  // a Clear before any stroke: commits the empty payload (the explicit gesture)
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(onChange).toHaveBeenCalledWith('')
  vi.unstubAllGlobals()
})

test('a pointer-down before the fit degrades silent (toPoint guards the unfitted view)', async () => {
  stubContext()
  class HeldImage {
    onload: (() => void) | null = null
    set src(_v: string) { /* never fires — the load hangs */ }
  }
  vi.stubGlobal('Image', HeldImage as never)
  const { onChange } = mountCanvas({ referenceUrl: 'http://x/hangs2.png' })
  const view = await screen.findByTestId('paint-leaf-view')
  fireEvent.pointerDown(view, { button: 0, clientX: 10, clientY: 10 })
  fireEvent.pointerUp(view)
  expect(onChange).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})

test('a seeded payload with a context-less LAYER keeps the strokes unarmed (the seed degrade)', async () => {
  stubContext()
  fakeImages()
  // the instance override lands before the async seed continues: the
  // VIEW keeps its stubbed context, the hidden stroke layer degrades
  const { container } = render(createElement(PaintLeafCanvas, {
    referenceUrl: '', value: 'pay:400x400', onChange: () => {},
  }))
  const layer = container.querySelector('[data-testid="paint-leaf-layer"]') as HTMLCanvasElement
  layer.getContext = () => null
  await waitFor(() => { expect((screen.getByTestId('paint-leaf-layer') as HTMLCanvasElement).width).toBe(400) })
  // the layer sized, but the strokes never armed (the hint stays cold)
  expect(screen.getByText('drag on the image to paint the mask')).toBeTruthy()
  vi.unstubAllGlobals()
})

test('a late size adopt preserves prior strokes (the first stroke on an unfitted layer)', async () => {
  const ctx = stubContext()
  fakeImages()
  const { onChange } = mountCanvas({ referenceUrl: 'img:800x600' })
  const view = await screen.findByTestId('paint-leaf-view')
  await waitFor(() => { expect((view as HTMLCanvasElement).width).toBe(640) })
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerUp(view)
  expect(onChange).toHaveBeenCalledWith('data:image/png;base64,STROKE')
  // the 300-wide prior drew back onto the adopted 800-wide layer
  expect(ctx.drawImage).toHaveBeenCalled()
  vi.unstubAllGlobals()
})

test('a zero-natural adopt empties the prior (the width-0 path, then a real size lands)', async () => {
  stubContext()
  fakeImages()
  const onChange = vi.fn()
  const { rerender } = render(createElement(PaintLeafCanvas, {
    referenceUrl: 'img:0x600', value: '', onChange,
  }))
  await waitFor(() => { expect(screen.getByTestId('paint-leaf-view').style.display).toBe('block') })
  const view = screen.getByTestId('paint-leaf-view')
  // first stroke: adopt 300→0 (the 300-wide prior restores), commit
  fireEvent.pointerDown(view, { button: 0, clientX: 10, clientY: 10 })
  fireEvent.pointerUp(view)
  expect(onChange).toHaveBeenCalledTimes(1)
  // the reference grows: adopt 0→800 — prior width 0 → NO restore arm
  rerender(createElement(PaintLeafCanvas, {
    referenceUrl: 'img:800x600', value: '', onChange,
  }))
  await waitFor(() => { expect((view as HTMLCanvasElement).height).toBe(480) }, { timeout: 3000 })
  fireEvent.pointerDown(view, { button: 0, clientX: 20, clientY: 20 })
  fireEvent.pointerUp(view)
  expect(onChange).toHaveBeenCalledTimes(2)
  vi.unstubAllGlobals()
})

test('Clear without a 2d context still commits the empty payload (the degrade arm)', async () => {
  const { onChange } = mountCanvas()
  const view = await screen.findByTestId('paint-leaf-view')
  expect((view as HTMLCanvasElement).getContext('2d')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(onChange).toHaveBeenCalledWith('')
})
