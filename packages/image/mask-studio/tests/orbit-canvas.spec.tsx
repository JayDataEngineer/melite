// @vitest-environment happy-dom
/**
 * THE ORBIT ORB FACE, EMBEDDED (the reshoot orb, 2026-11-15): the reshoot
 * mod leaf's camera-pose orb. Cover: the ready path (the orb names the live
 * pose, the gesture hint seats, never a crash), the degrade guards (no 2d
 * context → a gesture commits NOTHING), the ONE TRUTH (the orb and the
 * orbit/tilt/dolly number dials write the same seats — the aria names the
 * passed pose, a handle drag commits a snapped pose with the dolly
 * untouched), the wheel = dolly law, and the double-click law (view-only,
 * never a pose commit). happy-dom has no canvas 2d context — the draw path
 * runs against a stubbed context, the un-stubbed run proves the degrade path.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { OrbitLeafCanvas } from '../src/ui/OrbitLeafCanvas.tsx'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

const POSE = { orbit: -30, tilt: 20, dolly: 1 }

function mountOrb(over?: Partial<Parameters<typeof OrbitLeafCanvas>[0]>) {
  const onChange = vi.fn()
  render(createElement(OrbitLeafCanvas, {
    value: { ...POSE },
    onChange,
    ...over,
  }))
  return { onChange }
}

/** The stubbed 2d context (the DRAW path — every member the orb touches). */
function stubContext() {
  const ctx = {
    clearRect: vi.fn(), fillRect: vi.fn(), rect: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    arc: vi.fn(), setLineDash: vi.fn(),
    measureText: vi.fn(() => ({ width: 5 })),
    fillText: vi.fn(),
    canvas: null,
  }
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
  return ctx
}

function orbCanvas(): HTMLCanvasElement {
  return screen.getByRole('application') as HTMLCanvasElement
}

test('ready path — the orb names the live pose and seats the gesture hint', () => {
  stubContext()
  mountOrb()
  // ONE TRUTH, read face: the accessible name IS the passed pose seats
  expect(orbCanvas().getAttribute('aria-label')).toBe(
    'Camera pose orb: orbit -30 degrees, tilt 20 degrees, dolly 1',
  )
  expect(screen.getByText(/Drag the blue handle to set orbit\/tilt/)).toBeTruthy()
})

test('a gesture without a 2d context degrades silent — no crash, NOTHING commits', () => {
  const { onChange } = mountOrb()
  const view = orbCanvas()
  // happy-dom supplies no canvas 2d context: the guards hold, the
  // pointer-up never wipes the pose with a blank payload (the wheel
  // is exempt here — it owns no canvas geometry, like the dials)
  expect(view.getContext('2d')).toBeNull()
  fireEvent.pointerDown(view, { button: 0, clientX: 0, clientY: 0 })
  fireEvent.pointerMove(view, { clientX: 0.1, clientY: 0.05 })
  fireEvent.pointerUp(view)
  fireEvent.doubleClick(view)
  expect(onChange).not.toHaveBeenCalled()
})

test('dragging the blue handle commits the snapped pose — dolly untouched', () => {
  stubContext()
  const { onChange } = mountOrb({ value: { orbit: 0, tilt: 0, dolly: 1 } })
  const view = orbCanvas()
  // the home-pose handle sits up-left of center (the arcball resting
  // view): down beside it, drag inside the disc, release
  fireEvent.pointerDown(view, { button: 0, clientX: -0.06, clientY: 0.05 })
  fireEvent.pointerMove(view, { clientX: 0.1, clientY: 0 })
  fireEvent.pointerUp(view)
  expect(onChange).toHaveBeenCalledTimes(1)
  const pose = onChange.mock.calls[0]![0] as { orbit: number; tilt: number; dolly: number }
  // the 5-degree snap law (whole multiples, clamped to the disc)
  expect(pose.orbit % 5).toBe(0)
  expect(pose.tilt % 5).toBe(0)
  expect(pose.orbit).toBeGreaterThanOrEqual(-180)
  expect(pose.orbit).toBeLessThanOrEqual(180)
  expect(pose.tilt).toBeGreaterThanOrEqual(-90)
  expect(pose.tilt).toBeLessThanOrEqual(90)
  // the drag never touches distance — the wheel owns dolly
  expect(pose.dolly).toBe(1)
})

test('a drag that changes nothing commits nothing (pointer-up is the commit)', () => {
  stubContext()
  const { onChange } = mountOrb()
  const view = orbCanvas()
  // empty space drags the VIEW (never the pose) — release commits nothing
  fireEvent.pointerDown(view, { button: 0, clientX: 3, clientY: 3 })
  fireEvent.pointerMove(view, { clientX: 3.1, clientY: 3.1 })
  fireEvent.pointerUp(view)
  expect(onChange).not.toHaveBeenCalled()
})

test('wheel steps the dolly (upstream: 0.05 per notch, clamped 0.1–3)', () => {
  stubContext()
  const { onChange } = mountOrb()
  const view = orbCanvas()
  fireEvent.wheel(view, { deltaY: 120 })
  expect(onChange).toHaveBeenCalledTimes(1)
  expect(onChange).toHaveBeenLastCalledWith({ orbit: -30, tilt: 20, dolly: 1.05 })
  fireEvent.wheel(view, { deltaY: -120 })
  expect(onChange).toHaveBeenLastCalledWith({ orbit: -30, tilt: 20, dolly: 0.95 })
})

test('double-click resets the VIEW only — never a pose commit', () => {
  stubContext()
  const { onChange } = mountOrb()
  fireEvent.doubleClick(orbCanvas())
  expect(onChange).not.toHaveBeenCalled()
})
