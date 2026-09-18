/**
 * layout.spec.tsx — THE ESTATE'S LAYOUT GRAMMAR (2026-09-18,
 * promoted verbatim from h3's studio kit). Pins the promoted faces:
 * the row, the section heading + tail, the empty state's two
 * variants, the pane chrome, and the tooltip anchor's passthrough.
 */
import { createElement as h } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { ControlRow, SectionLabel, EmptyState, PaneHeader, PaneShell, Tip } from '../src/layout.tsx'

afterEach(cleanup)

test('ControlRow: the label + control line, density variants', () => {
  render(h(ControlRow, { label: 'Steps' }, 'the-control'))
  const row = screen.getByText('Steps').closest('label')
  expect(row).not.toBeNull()
  expect(row!.textContent).toContain('the-control')
  cleanup()
  render(h(ControlRow, { label: 'Fine', density: 'sm' }, 'x'))
  expect(screen.getByText('Fine').closest('label')).not.toBeNull()
})

test('SectionLabel: the uppercase heading with its tail', () => {
  render(h(SectionLabel, { tail: '3/9' }, 'Images'))
  expect(screen.getByText('Images')).not.toBeNull()
  expect(screen.getByText('3/9')).not.toBeNull()
})

test('EmptyState: pane and overlay variants carry their data faces', () => {
  const { container } = render(h(EmptyState, { title: 'No render yet', hint: 'author the calls' }))
  const pane = container.querySelector('[data-slot="empty-state"]')!
  expect(pane.getAttribute('data-variant')).toBe('pane')
  expect(screen.getByText('No render yet')).not.toBeNull()
  expect(screen.getByText('author the calls')).not.toBeNull()
  cleanup()
  const over = render(h(EmptyState, { title: 'Gone', variant: 'overlay' })).container
  expect(over.querySelector('[data-slot="empty-state"]')!.getAttribute('data-variant')).toBe('overlay')
})

test('PaneHeader/PaneShell: strip and preview chrome', () => {
  const { container } = render(h(PaneHeader, { title: 'Preview', meta: '2 calls', hint: 'edit' }))
  const head = container.querySelector('[data-slot="pane-header"]')!
  expect(head.getAttribute('data-variant')).toBe('strip')
  expect(screen.getByText('Preview')).not.toBeNull()
  expect(screen.getByText('2 calls')).not.toBeNull()
  cleanup()
  const prev = render(h(PaneHeader, { title: 'Prev', variant: 'preview' })).container
  expect(prev.querySelector('[data-slot="pane-header"]')!.getAttribute('data-variant')).toBe('preview')
  cleanup()
  const shell = render(h(PaneShell, null, h('span', null, 'inside'))).container
  expect(shell.querySelector('[data-slot="pane-shell"]')!.textContent).toContain('inside')
})

test('Tip: absent tip passes the child through unchanged; present wraps the anchor', () => {
  const bare = render(h(Tip, { tip: undefined }, h('button', { type: 'button' }, 'Go'))).container
  expect(bare.querySelector('button')!.textContent).toBe('Go')
  expect(bare.querySelector('span')).toBeNull()
})
