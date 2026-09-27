/**
 * gate-r7b-layout.spec.tsx — GATE R7b: the layout grammar's dark
 * arms (layout.tsx:42 ControlRow-with-hint, :60 SectionLabel
 * without tail, :117/:118 preview without title / with meta,
 * :126-:128 strip without title/meta/hint). Each row renders the
 * real face and asserts it — the scoped run's only uncovered
 * branches in this file.
 */
import { createElement as h } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { ControlRow, PaneHeader, SectionLabel } from '../src/layout.tsx'

afterEach(cleanup)

test('ControlRow: a passed hint rides beside the label (never dropped)', () => {
  render(h(ControlRow, { label: 'Steps', hint: h('span', null, 'the-hint'), children: 'the-control' })) // React types seat children in props; the rest-arg child renders identically
  const row = screen.getByText('Steps').closest('label')
  expect(row).not.toBeNull()
  expect(row!.textContent).toContain('the-hint')
  expect(row!.textContent).toContain('the-control')
})

test('SectionLabel: without a tail there is no tail seat (never an empty span)', () => {
  const { container, rerender } = render(h(SectionLabel, null, 'Images'))
  expect(screen.getByText('Images')).not.toBeNull()
  expect(container.querySelectorAll('span').length).toBe(1)
  rerender(h(SectionLabel, { tail: '3/9', children: 'Images' })) // same children-in-props law as above
  expect(container.querySelectorAll('span').length).toBe(2)
  expect(screen.getByText('3/9')).not.toBeNull()
})

test('PaneHeader preview: title-less with meta (each face derives, never a crash)', () => {
  const { container } = render(h(PaneHeader, { variant: 'preview', meta: 'live' }))
  const head = container.querySelector('[data-slot="pane-header"]')!
  expect(head.getAttribute('data-variant')).toBe('preview')
  expect(screen.getByText('live')).not.toBeNull()
})

test('PaneHeader strip: bare chrome carries no title/meta/hint seats', () => {
  const { container } = render(h(PaneHeader, null))
  const head = container.querySelector('[data-slot="pane-header"]')!
  expect(head.getAttribute('data-variant')).toBe('strip')
  expect(head.textContent).toBe('')
})
