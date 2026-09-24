// @vitest-environment happy-dom
// report-view.spec.tsx — THE REPORT ATOM walls (ROADMAP 11e,
// primitive ①): the default face of a result row's machine-readable
// verdicts — the DSH StateDot semantic (pass→done, warn→warning,
// fail→error), the title/name law, the chips row, and the
// key-value body. Pure render walls: the contract's own optionals
// drive every arm (title absent → the name; chips/rows absent → no
// section).
import { cleanup, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test } from 'vitest'

import { ReportView } from '../src/report-view.tsx'

afterEach(() => { cleanup() })

test('THE FULL FACE: status dot + word, the title, the chips, the rows', () => {
  render(h(ReportView, {
    name: 'validate',
    report: {
      kind: 'report', status: 'pass', title: 'game-ready gate',
      chips: ['triangles', 'materials', 'uv'],
      rows: { triangles: 14980, draw_calls: 3, skinned: true },
    },
  }))
  const card = screen.getByTestId('report-card')
  expect(card.getAttribute('aria-label')).toBe('run report validate')
  expect(screen.getByText('game-ready gate')).not.toBeNull()
  expect(card.querySelector('[data-report-status="pass"]')?.textContent).toBe('PASS')
  // the chips seat in their own row (a chip text may repeat a row key)
  const chipsRow = card.querySelector('[aria-label="report chips"]')
  expect(chipsRow?.textContent).toBe('trianglesmaterialsuv')
  expect(screen.getByText('14980')).not.toBeNull()
  expect(screen.getByText('3')).not.toBeNull()
  // booleans render their string face
  expect(screen.getByText('true')).not.toBeNull()
})

test('THE TITLE LAW: an untitled report renders its own NAME', () => {
  render(h(ReportView, {
    name: 'lint',
    report: { kind: 'report', status: 'fail' },
  }))
  expect(screen.getByText('lint')).not.toBeNull()
  expect(screen.getByText('FAIL')).not.toBeNull()
  // no chips, no rows → neither section renders
  expect(document.querySelector('[aria-label="report chips"]')).toBeNull()
  expect(document.querySelector('[aria-label="report rows"]')).toBeNull()
})

test('THE STATUS VOCABULARY: every verdict seats the DSH dot face', () => {
  for (const status of ['pass', 'warn', 'fail'] as const) {
    cleanup()
    render(h(ReportView, { name: 'gate', report: { kind: 'report', status } }))
    const el = document.querySelector('[data-report-status="' + status + '"]')
    expect(el?.textContent).toBe(status.toUpperCase())
  }
})

test('THE FIT LAW (roadmap §32b, 2026-09-24): the report face never spills a narrow pane — long path/hash keys wrap, the title\'s ellipsis engages', () => {
  // The §32b audit walked every media face for the bare-intrinsic-
  // size disease (video/image heroes + the mesh canvas already
  // carry the fit law; audio is a fixed-height native strip). The
  // report face held the last two instances: .reportKey was
  // flex:none with NO wrap guard (a machine verdict's unbreakable
  // path/hash key pushed the card past a narrow pane), and the
  // head's title ellipsis could never engage (a flex child's
  // min-width:auto is its min-content). Pinned by CSS shape, same
  // law as the hero-cap wall in preview-history.spec.tsx.
  const css = require('node:fs').readFileSync(
    require('node:path').resolve(__dirname, '../src/preview.module.css'), 'utf8')
  const head = css.slice(css.indexOf('.reportHead {'), css.indexOf('}', css.indexOf('.reportHead {') + 200))
  expect(head).toContain('min-width: 0') // the ellipsis engages — the head shrinks with the pane
  const row = css.slice(css.indexOf('.reportRow {'), css.indexOf('}', css.indexOf('.reportRow {') + 200))
  expect(row).toContain('min-width: 0') // the row yields, never pushes
  const key = css.slice(css.indexOf('.reportKey {'), css.indexOf('}', css.indexOf('.reportKey {') + 400))
  expect(key).toContain('overflow-wrap: anywhere') // unbreakable keys wrap at the last resort
  expect(key).toContain('flex: 0 1 auto') // content width when there's room, yields when tight
  expect(key).not.toContain('flex: none') // flex:none is the disease itself
})
