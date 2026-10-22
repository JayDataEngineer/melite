// @vitest-environment happy-dom
// shell-chrome.spec.ts — THE SHELL's remaining chrome (the
// three-slot body + toast law ride shell.spec.tsx):
//  1. THE EMPTY ERROR LINE: no errors render no alert (the loud
//     line exists only when there is something loud to say).
//  2. RailSection: the shared rail grouping — string titles name
//     the section (aria-label), element titles carry no label,
//     actions/titleClassName/className/props spread through.
//  3. defineShellDeclaration: the construction door — the exact
//     declaration back, runtime-frozen.
//  4. THE RAIL SLOT (studioRail.tsx): standalone tenants render
//     inline; a tenant inside a studio projects into the slot node
//     (portal) — the mount-order null frame never drops content.
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement as h, useContext } from 'react'
import { createPortal } from 'react-dom'
import { join } from 'node:path'

import { repoRoot } from './helpers/repo-root.ts'

import {
  defineShellDeclaration,
  RailSection,
  StudioRail,
  StudioShell,
  StudioShellErrorLine,
  type RailSectionProps,
} from '../src/shell.tsx'
import { StudioRailCtx } from '../src/studioRail.tsx'

afterEach(cleanup)

test('THE EMPTY ERROR LINE: zero errors render no alert', () => {
  const { container } = render(h(StudioShellErrorLine, { errors: [] }))
  expect(container.querySelector('[role="alert"]')).toBeNull()
  expect(container.textContent).toBe('')
})

test('THE EMPTY ERROR LINE: an omitted errors prop renders no alert either', () => {
  const { container } = render(h(StudioShell, {
    params: h('div'),
    preview: h('div'),
  }))
  expect(container.querySelector('[role="alert"]')).toBeNull()
})

test('RailSection: a string title names the section; actions and classes ride through', () => {
  const { container } = render(h(RailSection, {
    title: 'Model',
    actions: h('span', { 'data-testid': 'rail-action' }, 'ACT'),
    className: 'tenant-root',
    titleClassName: 'tenant-title',
    'data-testid': 'rail-section',
  } as RailSectionProps, 'BODY'))
  const section = screen.getByTestId('rail-section')
  expect(section.getAttribute('aria-label')).toBe('Model')
  expect(section.textContent).toContain('Model')
  expect(section.textContent).toContain('BODY')
  expect(screen.getByTestId('rail-action').textContent).toBe('ACT')
  expect(section.className).toContain('tenant-root')
  expect(container.querySelector('.tenant-title')?.textContent).toBe('Model')
})

test('RailSection: an element title carries NO aria-label (never a stringified object)', () => {
  render(h(RailSection, {
    title: h('span', null, 'Rich Title'),
    'data-testid': 'rich-section',
  } as RailSectionProps))
  const section = screen.getByTestId('rich-section')
  expect(section.hasAttribute('aria-label')).toBe(false)
  expect(section.textContent).toContain('Rich Title')
})

test('RailSection: the shell re-exports the rail slot (one import, one shell)', () => {
  // structural: the StudioRail the shell re-exports IS the slot —
  // a tenant inside the shell projects, never inlines
  const slot = document.createElement('div')
  document.body.appendChild(slot)
  try {
    render(h(StudioRailCtx.Provider, { value: slot }, h(StudioRail, null, h('em', null, 'TOOL'))))
    expect(slot.textContent).toContain('TOOL')
  } finally {
    slot.remove()
  }
})

test('defineShellDeclaration: the construction door returns the declaration frozen', () => {
  const decl = defineShellDeclaration({
    preview: { kind: 'image' },
    bottom: { kind: 'scrub' },
    params: { slots: ['model', 'prompt'] },
  })
  expect(decl).toEqual({
    preview: { kind: 'image' },
    bottom: { kind: 'scrub' },
    params: { slots: ['model', 'prompt'] },
  })
  expect(Object.isFrozen(decl)).toBe(true)
})

test('defineShellDeclaration: bottom is optional (form cards leave it unclaimed)', () => {
  const decl = defineShellDeclaration({ preview: { kind: 'form' }, params: { slots: [] } })
  expect(decl.bottom).toBeUndefined()
})

test('THE RAIL SLOT: a standalone tenant renders inline (no shell, no portal)', () => {
  render(h(StudioRail, null, h('button', { type: 'button' }, 'Skeleton')))
  expect(screen.getByRole('button', { name: 'Skeleton' })).toBeTruthy()
})

test('THE RAIL SLOT: inside a studio the tools project into the slot node', () => {
  const slot = document.createElement('div')
  slot.setAttribute('data-testid', 'rail-slot')
  document.body.appendChild(slot)
  try {
    const { container } = render(
      h(StudioRailCtx.Provider, { value: slot }, h(StudioRail, null, h('button', { type: 'button' }, 'Refine pose'))),
    )
    // projected — the tenant position holds no copy
    expect(container.textContent).not.toContain('Refine pose')
    expect(slot.textContent).toContain('Refine pose')
  } finally {
    slot.remove()
  }
})

test('THE RAIL SLOT: the slot context publishes null outside a studio (the inline contract)', () => {
  function Probe() {
    const slot = useContext(StudioRailCtx)
    return h('span', { 'data-testid': 'probe' }, slot === null ? 'inline' : 'studio')
  }
  render(h(Probe))
  expect(screen.getByTestId('probe').textContent).toBe('inline')
})

test('THE RAIL SLOT: createPortal is the projection mechanic (no split tenant, no lifted state)', () => {
  // structural wall: the rail projects through react-dom portals —
  // the tenant stays ONE component writing through onSave
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs') as typeof import('node:fs')
  const rail = fs.readFileSync(join(repoRoot(), 'packages/web/card-base/src/studioRail.tsx'), 'utf8')
  expect(rail).toContain('createPortal')
  expect(createPortal).toBeTypeOf('function')
})
