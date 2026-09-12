// @vitest-environment happy-dom
/**
 * The mask-studio client face (gap-2, 2026-09-12 — the studio was DEAD
 * on the lane: component.tsx exported, nothing imported it). Pins:
 *   - the registration itself (keyed under 'mask-studio', the ui-tool law)
 *   - the adapter: a bench row becomes the tenant's CardStage (params IS
 *     the document); the bare row shows the image-import card; a row
 *     with input_image leaves the empty state; writes ride onPatch.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { apply as maskApply, inject as maskInject, MaskStudio, name as studioName } from '../src/client/index.ts'

const OWNER = {
  stageId: 's_m',
  cardName: 'mask-studio',
  row: { id: 's_m', card: 'mask-studio', title: 'mask', params: {} },
  runStatus: '',
  onPatch: vi.fn(),
  onRun: vi.fn(),
  onStop: () => {},
  onRemove: vi.fn(),
  onSurface: () => {},
  upstream: [],
  runId: null,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// happy-dom ships no Canvas2D implementation (getContext('2d') is
// null — a real browser always returns a context). The studio sizes
// and blits paint canvases on mount, so the lane supplies the minimal
// 2d surface: every method a noop, pixel reads blank. Product code is
// untouched — this is the standard jsdom/happy-dom canvas gap.
function stubCanvas2D(): void {
  const methods = [
    'clearRect', 'fillRect', 'strokeRect', 'drawImage', 'putImageData',
    'save', 'restore', 'translate', 'scale', 'rotate', 'setTransform',
    'resetTransform', 'beginPath', 'closePath', 'moveTo', 'lineTo',
    'stroke', 'fill', 'clip', 'arc', 'ellipse', 'rect', 'fillText',
    'strokeText', 'createImageData',
  ]
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    ((kind: string) => {
      if (kind !== '2d') return null
      const ctx: Record<string, unknown> = {
        canvas: null,
        getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createPattern: () => null,
        measureText: () => ({ width: 0 }),
      }
      for (const m of methods) ctx[m] = () => {}
      return ctx
    }) as typeof HTMLCanvasElement.prototype.getContext,
  )
}

beforeEach(() => { stubCanvas2D() })

test('registration: maskStudio injects slots and keys the view under mask-studio', () => {
  expect(studioName).toBe('maskStudio')
  expect(maskInject).toEqual(['slots'])
  const registered: Array<[unknown, unknown]> = []
  const ctx = {
    slots: {
      inject: (_name: string, factory: () => void) => { factory() },
      register: (desc: unknown, comp: unknown) => { registered.push([desc, comp]) },
    },
  }
  maskApply(ctx as never)
  expect(registered.length).toBe(1)
  expect(registered[0][0]).toEqual({ name: 'cards.stage.view', key: 'mask-studio' })
  expect(registered[0][1]).toBe(MaskStudio)
})

test('the bare bench row shows the image-import card', async () => {
  render(createElement(MaskStudio, { ...OWNER }))
  expect(await screen.findByText('Drop an image to mask', {}, { timeout: 4000 })).toBeTruthy()
  expect(screen.getByText('Upload image')).toBeTruthy()
})

test('a row with input_image leaves the empty state (the paint canvas owns the surface)', async () => {
  const { container } = render(createElement(MaskStudio, {
    ...OWNER,
    row: { ...OWNER.row, params: { input_image: 'data:image/png;base64,iVBORw0KGgo=' } },
  }))
  await waitFor(() => { expect(container.querySelector('canvas')).toBeTruthy() }, { timeout: 4000 })
  expect(screen.queryByText('Drop an image to mask')).toBeNull()
})
