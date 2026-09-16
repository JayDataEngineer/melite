// @vitest-environment happy-dom
/**
 * THE PAINT LEAF FACE (docs/design/paint-leaf-canvas.md, stroke 76):
 * the demoted studio's brush modal, self-contained. Cover: the
 * empty-reference ready path (blank 1024 canvas, Save disabled —
 * never a crash), both cancel paths (button + backdrop), the stroke
 * → Save payload contract (alpha PNG data URL into the field), and
 * Clear re-disarming Save. happy-dom has no canvas 2d context — the
 * stroke arm runs against a stubbed context (the modal guards a
 * missing context by design; the stub proves the DRAW path, the
 * un-stubbed run proves the degrade path).
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { PAINT_STROKE_INK } from '../src/paintInk.ts'
import { PaintLeafModal } from '../src/ui/PaintLeafModal.tsx'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

function mountModal(over?: Partial<Parameters<typeof PaintLeafModal>[0]>) {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(createElement(PaintLeafModal, {
    referenceUrl: '',
    onSave,
    onCancel,
    ...over,
  }))
  return { onSave, onCancel }
}

test('empty reference readies the blank canvas — Save disabled, brush seated, never a crash', async () => {
  mountModal()
  const view = await screen.findByTestId('paint-leaf-view')
  expect(view.style.display).toBe('block')
  expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByText('28')).toBeTruthy()
})

test('both cancel paths close without saving', async () => {
  const { onCancel, onSave } = mountModal({ title: 'Paint it' })
  await screen.findByTestId('paint-leaf-view')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onSave).not.toHaveBeenCalled()
})

test('backdrop pointer-down cancels (the card chrome law — click outside closes)', async () => {
  const { onCancel } = mountModal()
  await screen.findByTestId('paint-leaf-view')
  const dialog = screen.getByRole('dialog')
  fireEvent.pointerDown(dialog, { button: 0 })
  expect(onCancel).toHaveBeenCalledTimes(1)
})

test('a stroke without a 2d context degrades silent — no crash, Save stays disarmed', async () => {
  mountModal()
  const view = await screen.findByTestId('paint-leaf-view')
  // happy-dom supplies no canvas 2d context: the guards hold
  expect((view as HTMLCanvasElement).getContext('2d')).toBeNull()
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerMove(view, { clientX: 60, clientY: 60 })
  fireEvent.pointerUp(view)
  expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(true)
})

/** The stubbed 2d context (the DRAW path — every member the modal touches). */
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

test('stroke → Save delivers the payload PNG data URL (the field contract)', async () => {
  const ctx = stubContext()
  const { onSave } = mountModal()
  const view = await screen.findByTestId('paint-leaf-view')
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerMove(view, { clientX: 70, clientY: 70 })
  fireEvent.pointerUp(view)
  // the brush touched the overlay (white strokes, round caps)
  expect(ctx.stroke).toHaveBeenCalled()
  expect(ctx.strokeStyle).toBe(PAINT_STROKE_INK)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(false)
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save payload' }))
  expect(onSave).toHaveBeenCalledWith('data:image/png;base64,STROKE')
})

test('Clear wipes the strokes and re-disarms Save', async () => {
  stubContext()
  mountModal()
  const view = await screen.findByTestId('paint-leaf-view')
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerUp(view)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(false)
  })
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(true)
  })
})

/* ── the reference/payload arms (the fitted-size + seed laws) ── */

/** A controllable Image fake (happy-dom never loads images): sizes keyed by src. */
class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 0
  naturalHeight = 0
  constructor() { FakeImage.live.push(this) }
  set src(v: string) {
    if (v.includes('FAIL')) { queueMicrotask(() => { this.onerror?.() }); return }
    const m = /(\d+)x(\d+)/.exec(v)
    this.naturalWidth = m ? Number(m[1]) : 800
    this.naturalHeight = m ? Number(m[2]) : 600
    // HOLD = the load lands only when the test fires it (the unmount race)
    if (v.includes('HOLD')) { FakeImage.held.push(() => { this.onload?.() }); return }
    queueMicrotask(() => { this.onload?.() })
  }
  static live: FakeImage[] = []
  static held: Array<() => void> = []
}

function stubImages(): void {
  FakeImage.live = []
  FakeImage.held = []
  vi.stubGlobal('Image', FakeImage)
}

function modalProps(over: Record<string, unknown> = {}) {
  return { referenceUrl: '', onSave: () => {}, onCancel: () => {}, ...over }
}

test('a reference image seats the fitted view and redraws under the strokes', async () => {
  stubImages()
  const ctx = stubContext()
  mountModal({ referenceUrl: 'img:800x600' })
  const view = await screen.findByTestId('paint-leaf-view')
  // FIT 640: 800x600 → scale 0.8 → the 640x480 view
  await waitFor(() => { expect((view as HTMLCanvasElement).width).toBe(640) })
  expect((view as HTMLCanvasElement).height).toBe(480)
  expect(view.style.display).toBe('block')
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerUp(view)
  // the view ctx drew the reference under the overlay (the redraw path)
  expect(ctx.drawImage).toHaveBeenCalled()
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(false)
  })
})

test('payload-only (no reference) seeds the strokes from the payload size', async () => {
  stubImages()
  const ctx = stubContext()
  mountModal({ referenceUrl: '', payloadUrl: 'pay:400x400' })
  // the seed drew the payload onto the layer and armed Save at once
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(false)
  })
  expect(ctx.drawImage).toHaveBeenCalled()
  expect((screen.getByTestId('paint-leaf-layer') as HTMLCanvasElement).width).toBe(400)
})

test('payload seed without a 2d context degrades silent — Save stays disarmed', async () => {
  stubImages()
  mountModal({ referenceUrl: '', payloadUrl: 'pay:400x400' })
  const view = await screen.findByTestId('paint-leaf-view')
  await waitFor(() => { expect(view.style.display).toBe('block') })
  expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(true)
})

test('a failed reference degrades to the blank 1024 canvas', async () => {
  stubImages()
  mountModal({ referenceUrl: 'img:FAIL' })
  const view = await screen.findByTestId('paint-leaf-view')
  // blank 1024 → FIT scale 0.625 → the 640x640 view (redraw set it pre-context)
  await waitFor(() => { expect((view as HTMLCanvasElement).width).toBe(640) })
  expect((view as HTMLCanvasElement).height).toBe(640)
  expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(true)
})

test('unmount before the reference lands never resolves state (no crash)', async () => {
  stubImages()
  const { unmount } = render(createElement(PaintLeafModal, modalProps({ referenceUrl: 'img:HOLD800x600' })))
  expect(FakeImage.live.length).toBe(1)
  unmount()
  FakeImage.held.forEach((fire) => { fire() })
  await Promise.resolve()
})

test('a zero-size reference returns from redraw without crashing', async () => {
  stubImages()
  mountModal({ referenceUrl: 'img:0x600' })
  const view = await screen.findByTestId('paint-leaf-view')
  await waitFor(() => { expect(view.style.display).toBe('block') })
  expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(true)
})

test('a non-left button never starts a stroke', async () => {
  stubImages()
  const ctx = stubContext()
  mountModal()
  const view = await screen.findByTestId('paint-leaf-view')
  await waitFor(() => { expect(view.style.display).toBe('block') })
  fireEvent.pointerDown(view, { button: 2, clientX: 50, clientY: 50 })
  fireEvent.pointerMove(view, { clientX: 60, clientY: 60 })
  fireEvent.pointerUp(view)
  expect(ctx.stroke).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(true)
})

test('pointer input before ready degrades silent (the pre-fit window)', () => {
  stubImages()
  mountModal({ referenceUrl: 'img:HOLD800x600' })
  // the fit has not landed: the point guards hold, never a crash
  const view = screen.getByTestId('paint-leaf-view')
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerMove(view, { clientX: 60, clientY: 60 })
  fireEvent.pointerUp(view)
  expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(true)
})

test('Clear before ready still runs (the early-redraw guard holds)', () => {
  stubImages()
  mountModal({ referenceUrl: 'img:HOLD800x600' })
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(true)
})

test('Save with no strokes never calls onSave (the disarmed click)', async () => {
  stubImages()
  const { onSave } = mountModal()
  await screen.findByTestId('paint-leaf-view')
  fireEvent.click(screen.getByRole('button', { name: 'Save payload' }))
  expect(onSave).not.toHaveBeenCalled()
})

test('the brush slider reseats the size readout (the brush law input)', async () => {
  stubImages()
  mountModal()
  await screen.findByTestId('paint-leaf-view')
  fireEvent.change(screen.getByRole('slider'), { target: { value: '64' } })
  expect(screen.getByText('64')).toBeTruthy()
})

test('a late reference adopt preserves prior strokes across the resize', async () => {
  stubImages()
  stubContext()
  const { rerender } = render(createElement(PaintLeafModal, modalProps()))
  const view = await screen.findByTestId('paint-leaf-view')
  await waitFor(() => { expect(view.style.display).toBe('block') })
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerUp(view)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(false)
  })
  // the reference lands late at a new size: the layer adopts it
  rerender(createElement(PaintLeafModal, modalProps({ referenceUrl: 'img:800x600' })))
  await waitFor(() => { expect((view as HTMLCanvasElement).height).toBe(480) })
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerUp(view)
  // the adopt resized the layer to the reference (prior strokes restored)
  await waitFor(() => { expect((screen.getByTestId('paint-leaf-layer') as HTMLCanvasElement).width).toBe(800) })
})

test('an adopt over an emptied layer skips the restore (no phantom strokes)', async () => {
  stubImages()
  stubContext()
  const { rerender } = render(createElement(PaintLeafModal, modalProps({ referenceUrl: 'img:0x600' })))
  const view = await screen.findByTestId('paint-leaf-view')
  await waitFor(() => { expect(view.style.display).toBe('block') })
  // the zero-width adopt empties the layer (300-wide prior restored aside)
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerUp(view)
  await waitFor(() => { expect((screen.getByTestId('paint-leaf-layer') as HTMLCanvasElement).width).toBe(0) })
  // a second size lands: the empty prior skips the restore, strokes continue
  rerender(createElement(PaintLeafModal, modalProps({ referenceUrl: 'img:800x600' })))
  await waitFor(() => { expect((view as HTMLCanvasElement).height).toBe(480) })
  fireEvent.pointerDown(view, { button: 0, clientX: 50, clientY: 50 })
  fireEvent.pointerUp(view)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Save payload' }).hasAttribute('disabled')).toBe(false)
  })
  expect((screen.getByTestId('paint-leaf-layer') as HTMLCanvasElement).width).toBe(800)
})
