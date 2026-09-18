// @vitest-environment happy-dom
/**
 * motion studio II — export framing (dialog + stage rectangle).
 * Split from motion-studio.spec.tsx: PURE MOVE, zero test-content
 * changes (sibling spec in the same tests/ dir, auto-discovered by
 * the vitest dom project). Shared setup lives in ./helpers.ts.
 *
 * MOUNT PATTERN (2026-09-16): NO act() anywhere — render outside
 * act, waitFor polling finds settled content, root.unmount() in
 * afterEach kills the viewer's async loop. 'Not wrapped in act'
 * warnings are tolerated noise.
 */
import { fireEvent, getByRole } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { waitForText } from './harness.tsx'
import { MOTION_URL } from './fixtures.ts'
import { resetStudio, stubLoads, mountEditor } from './helpers.ts'

afterEach(() => resetStudio())

describe('export framing (dialog + stage rectangle)', () => {
  async function mountedWithRun() {
    stubLoads()
    const m = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    return m
  }

  async function exportOpened() {
    await mountedWithRun()
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
      // the dialog's size labels are aria-only, never text
      if (!document.body.querySelector('[aria-label="Output width (pixels)"]')) throw new Error('no dialog yet')
    }, { timeout: 10000 })
  }

  function rectStyle(): string {
    const r = document.body.querySelector('[data-export-rect]') as HTMLElement
    return `${r.style.left}|${r.style.top}|${r.style.width}|${r.style.height}`
  }

  /** Sync-scoped rect stub: install → dispatch → restore with no awaits
   *  between, so the block is atomic (no viewer pass can interleave). */
  function dragRect(target: HTMLElement, fromX: number, toX: number, fromY = 50, toY = 50) {
    const proto = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      return { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 450, width: 800, height: 450, toJSON() {} } as DOMRect
    }
    try {
      fireEvent.pointerDown(target, { clientX: fromX, clientY: fromY, button: 0 })
      fireEvent.pointerMove(target, { clientX: toX, clientY: toY })
      fireEvent.pointerUp(target, { clientX: toX, clientY: toY })
    } finally {
      Element.prototype.getBoundingClientRect = proto
    }
  }

  test('typed outputs clamp to 8..4096', async () => {
    await exportOpened()
    const w = document.body.querySelector('[aria-label="Output width (pixels)"]') as HTMLInputElement
    fireEvent.change(w, { target: { value: '5000' } })
    await vi.waitFor(() => {
      const cur = document.body.querySelector('[aria-label="Output width (pixels)"]') as HTMLInputElement
      if (cur.value !== '4096') throw new Error('width not clamped yet')
    }, { timeout: 10000 })
    const hh = document.body.querySelector('[aria-label="Output height (pixels)"]') as HTMLInputElement
    fireEvent.change(hh, { target: { value: '1' } })
    await vi.waitFor(() => {
      const cur = document.body.querySelector('[aria-label="Output height (pixels)"]') as HTMLInputElement
      if (cur.value !== '8') throw new Error('height not clamped yet')
    }, { timeout: 10000 })
  })

  test('frame presets refit the rectangle', async () => {
    await exportOpened()
    const before = rectStyle()
    fireEvent.click(getByRole(document.body, 'button', { name: 'Reset frame' }))
    await vi.waitFor(() => {
      if (rectStyle() === before) throw new Error('reset did not refit yet')
    }, { timeout: 10000 })
    const mid = rectStyle()
    fireEvent.click(getByRole(document.body, 'button', { name: 'Whole stage' }))
    await vi.waitFor(() => {
      if (rectStyle() === mid) throw new Error('whole did not refit yet')
    }, { timeout: 10000 })
  })

  test('rect body drag moves the frame', async () => {
    await exportOpened()
    const before = rectStyle()
    dragRect(document.body.querySelector('[data-export-rect]') as HTMLElement, 400, 460)
    await vi.waitFor(() => {
      if (rectStyle() === before) throw new Error('rect did not move yet')
    }, { timeout: 10000 })
    // a zero-delta drag hits the same-coords arm (no-op write)
    dragRect(document.body.querySelector('[data-export-rect]') as HTMLElement, 400, 400)
    await new Promise((r) => setTimeout(r, 300))
  })

  test('rect corner drag resizes aspect-locked', async () => {
    await exportOpened()
    const before = rectStyle()
    // inward: the refit rect already spans full height, so only a
    // shrink changes both axes (growth re-derives identically)
    dragRect(document.body.querySelector('[data-export-corner="se"]') as HTMLElement, 400, 360, 225, 200)
    await vi.waitFor(() => {
      if (rectStyle() === before) throw new Error('rect did not resize yet')
    }, { timeout: 10000 })
  })

  test('export toggles the panel shut', async () => {
    await exportOpened()
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-export-rect]')) throw new Error('rect still there')
    }, { timeout: 10000 })
  })
})
