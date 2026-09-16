// @vitest-environment happy-dom
// viewport-chrome.spec.ts — THE PREVIEW PORT's CHROME family
// (docks AROUND the shared stage, never inside):
//  1. ViewportFrame: the labelled region — children + the empty
//     face when there is nothing on the stage.
//  2. ViewportAnchor: every dock pins its data-dock hook (the pin
//     shape defaults top-right).
//  3. ReferenceImageBadge: a served url badges (img + caption,
//     undraggable); null hides.
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement as h } from 'react'

import {
  ReferenceImageBadge,
  ViewportAnchor,
  ViewportFrame,
  type ViewportAnchorDock,
  type ViewportFrameProps,
} from '../src/viewportChrome.tsx'

afterEach(cleanup)

test('ViewportFrame: children render in the labelled region with the empty face beside them', () => {
  render(h(ViewportFrame, {
    label: 'mesh stage',
    empty: h('span', { 'data-testid': 'empty-face' }, 'nothing staged'),
    className: 'tenant-frame',
    'data-testid': 'frame',
  } as ViewportFrameProps, h('canvas', { 'data-testid': 'stage-canvas' })))
  const frame = screen.getByTestId('frame')
  expect(frame.getAttribute('data-slot')).toBe('viewport-frame')
  expect(frame.getAttribute('aria-label')).toBe('mesh stage')
  expect(frame.className).toContain('tenant-frame')
  expect(screen.getByTestId('stage-canvas')).toBeTruthy()
  expect(screen.getByTestId('empty-face').textContent).toBe('nothing staged')
})

test('ViewportFrame: no label, no empty — the bare port', () => {
  render(h(ViewportFrame, { 'data-testid': 'bare-frame' } as object, 'STAGE'))
  const frame = screen.getByTestId('bare-frame')
  expect(frame.hasAttribute('aria-label')).toBe(false)
  expect(frame.textContent).toBe('STAGE')
})

const DOCKS: ViewportAnchorDock[] = [
  'top-right',
  'top-left',
  'bottom-right',
  'bottom-left',
  'bottom-center',
  'bottom',
  'fill',
  'edge-right',
  'edge-left',
]

for (const dock of DOCKS) {
  test(`ViewportAnchor: the ${dock} dock pins its hook`, () => {
    render(h(ViewportAnchor, { dock, 'data-testid': `anchor-${dock}` } as object,
      h('button', { type: 'button' }, 'Fit body')))
    const anchor = screen.getByTestId(`anchor-${dock}`)
    expect(anchor.getAttribute('data-slot')).toBe('viewport-anchor')
    expect(anchor.getAttribute('data-dock')).toBe(dock)
    expect(anchor.textContent).toBe('Fit body')
  })
}

test('ViewportAnchor: the pin shape defaults top-right', () => {
  render(h(ViewportAnchor, { 'data-testid': 'default-anchor' } as object))
  expect(screen.getByTestId('default-anchor').getAttribute('data-dock')).toBe('top-right')
})

test('ReferenceImageBadge: a served url badges — img, caption, undraggable', () => {
  render(h(ReferenceImageBadge, { url: '/runs/r1/source.png', label: 'Source photo' }))
  const badge = document.querySelector('[data-slot="reference-image-badge"]') as HTMLElement
  expect(badge).not.toBeNull()
  expect(badge.hasAttribute('data-reference-image')).toBe(true)
  expect(badge.getAttribute('aria-label')).toBe('Source photo')
  const img = badge.querySelector('img') as HTMLImageElement
  expect(img.getAttribute('src')).toBe('/runs/r1/source.png')
  expect(img.getAttribute('alt')).toBe('Source photo')
  expect(img.getAttribute('draggable')).toBe('false')
  expect(badge.querySelector('figcaption')?.textContent).toBe('Source photo')
})

test('ReferenceImageBadge: null url hides (no badge, no img)', () => {
  const { container } = render(h(ReferenceImageBadge, { url: null, label: 'Source photo' }))
  expect(container.querySelector('[data-slot="reference-image-badge"]')).toBeNull()
  expect(container.textContent).toBe('')
})

test('ReferenceImageBadge: the tenant className rides the badge', () => {
  render(h(ReferenceImageBadge, { url: '/runs/r1/source.png', label: 'Source photo', className: 'tenant-badge' }))
  const badge = document.querySelector('[data-slot="reference-image-badge"]') as HTMLElement
  expect(badge.className).toContain('tenant-badge')
})
