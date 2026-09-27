// @vitest-environment happy-dom
// icons.spec.tsx — THE ONE GLYPH SET (DSH-pure stroke law): every
// exported icon renders one 24×24 svg (stroke=currentColor, round
// caps/joins, hidden from assistive tech); the caller's className
// sizes it, extra props spread through. Each glyph renders once —
// the per-file function gate counts every drawing.
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement as h } from 'react'

import * as icons from '../src/icons.tsx'

afterEach(cleanup)

const GLYPHS: Array<[string, (props: icons.IconProps) => ReturnType<typeof h>]> = Object.entries(icons).filter(
  (entry): entry is [string, (props: icons.IconProps) => ReturnType<typeof h>] => // the glyphs return the same element h builds — unknown would erase the drawing contract
    typeof entry[1] === 'function' && /^[A-Z]/.test(entry[0]),
)

test('the set is non-empty (the spec fails LOUD if the barrel empties)', () => {
  expect(GLYPHS.length).toBeGreaterThan(40)
})

for (const [name, Glyph] of GLYPHS) {
  test(`${name}: one hidden 24×24 svg carrying its drawing`, () => {
    const { container } = render(h(Glyph as (props: icons.IconProps) => ReturnType<typeof h>, {
      className: 'tenant-size',
      'data-testid': `glyph-${name}`,
    }))
    const svg = container.querySelector('svg') as SVGSVGElement | null
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg!.getAttribute('stroke')).toBe('currentColor')
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
    // the drawing itself: at least one shape child
    expect(svg!.childElementCount).toBeGreaterThan(0)
    expect(svg!.className.baseVal !== undefined ? String(svg!.className) : svg!.getAttribute('class')).toContain('tenant-size')
  })
}

test('TriangleAlert aliases the AlertTriangle drawing (one drawing, two names)', () => {
  const a = render(h(icons.AlertTriangle)).container.innerHTML
  cleanup()
  const b = render(h(icons.TriangleAlert)).container.innerHTML
  expect(a).toBe(b)
})

test('style + extra props spread onto the svg (the sizing seam)', () => {
  const { container } = render(h(icons.X, {
    style: { color: 'red' },
    'data-testid': 'x-glyph',
    strokeWidth: 1,
  }))
  const svg = container.querySelector('svg') as SVGSVGElement | null
  expect(svg!.getAttribute('data-testid')).toBe('x-glyph')
  expect(svg!.getAttribute('stroke-width')).toBe('1')
  expect(svg!.style.color).toBe('red')
})
