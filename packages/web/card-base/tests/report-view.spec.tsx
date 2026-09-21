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
