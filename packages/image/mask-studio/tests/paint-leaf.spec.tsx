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
  expect(view.getContext('2d')).toBeNull()
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
  expect(ctx.strokeStyle).toBe('rgba(255, 255, 255, 1)')
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
