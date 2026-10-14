// @vitest-environment happy-dom
// form-submenu-tabs.spec.tsx — THE SUBMENU TABLIST WALL (S7j, LAW 4).
//
// THE INVARIANT: the parameter submenu's group rail rides the catalog
// SegmentedTabs (ui-primitives SegmentedTabs.tsx:24-80) — the DSH
// tablist grammar (role=tablist/tab, aria-selected, the sliding
// indicator span, the arrow walk), NOT the retired raw-button chip
// rail. The DSH panel-mount receipt: PresetGuideDialog.tsx:123-141.
// The panel stays EXCLUSIVE (stroke 89: one visible panel) — the
// selected tab is the only tab stop and its panel is the mounted one,
// so the tab→panel link holds on the active seat.
//
// RED WHEN THE CURE IS TOGGLED OUT: the raw-button rail renders no
// tablist label, no indicator span, no aria-controls linkage, and no
// arrow walk — every arm below fails.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test } from 'vitest'
import type { FormSpecDoc } from '../src/spec.ts'

import { CardForm } from '../src/form.tsx'
import { chromeCopy } from '../src/locales/chromeCopy.ts'

afterEach(cleanup)

type Ref = { type: string; dict?: Record<string, number>; meta?: Record<string, unknown>; extra?: Record<string, unknown> }

/** A grouped doc: parts (1 field), ingest (1), turnaround (2). */
function groupedDoc(): FormSpecDoc {
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { body_glb: 1, source_photo: 2, steps: 3, frames: 4 } },
    1: { type: 'string', meta: { description: 'Body glb', extra: { group: 'parts' } } },
    2: { type: 'string', meta: { description: 'Source photo', extra: { group: 'ingest' } } },
    3: { type: 'number', meta: { description: 'Steps', default: 20, extra: { group: 'turnaround' } } },
    4: { type: 'number', meta: { description: 'Frames', default: 8, extra: { group: 'turnaround' } } },
  }
  return {
    form: 'anny', model: 'none', schema: { uid: 0, refs }, inputs: [], packs: [],
  } as unknown as FormSpecDoc
}

function form(): void {
  render(h(CardForm, { spec: groupedDoc(), user: {}, onSet: () => {}, onPick: () => {} }))
}

const tablist = (): HTMLElement => {
  const list = document.querySelector('[data-form-submenu] [role="tablist"]')
  if (list === null) throw new Error('no tablist under the submenu seat')
  return list as HTMLElement
}

test('THE TABLIST: the rail rides the catalog SegmentedTabs — named tablist, role=tab rows, the indicator span', () => {
  form()
  const list = tablist()
  // the tablist names itself (the SegmentedTabs `label` is required —
  // ui-primitives README line 50)
  expect(list.getAttribute('aria-label')).toBe(chromeCopy.paramGroupsLabel)
  const tabs = Array.from(list.querySelectorAll('[role="tab"]'))
  expect(tabs.map((t) => t.textContent)).toEqual(['Parts', 'Ingest', 'Turnaround'])
  // the catalog's own sliding indicator (SegmentedTabs.tsx:59-63) —
  // the retired raw rail rendered no indicator at all
  expect(list.querySelector('span[aria-hidden="true"]')).not.toBeNull()
  // first-seen group selected
  expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
  expect(tabs[1]?.getAttribute('aria-selected')).toBe('false')
})

test('THE WALK: ArrowRight moves the selection and swaps the panel (the tablist keyboard contract)', () => {
  form()
  const tabs = (): HTMLElement[] => Array.from(tablist().querySelectorAll('[role="tab"]')) as HTMLElement[]
  // roving tabindex: only the selected tab is a tab stop
  expect(tabs()[0]?.getAttribute('tabindex')).toBe('0')
  expect(tabs()[1]?.getAttribute('tabindex')).toBe('-1')
  fireEvent.keyDown(tabs()[0]!, { key: 'ArrowRight' })
  expect(tabs()[1]?.getAttribute('aria-selected')).toBe('true')
  // the exclusive panel followed the walk
  expect(document.querySelector('[data-form-group-panel]')?.getAttribute('data-form-group-panel')).toBe('ingest')
  expect(screen.getByLabelText('Source photo')).not.toBeNull()
  expect(screen.queryByLabelText('Body glb')).toBeNull()
})

test('THE LINK: the selected tab names its mounted panel — aria-controls resolves, the panel is labelled back', () => {
  form()
  const selected = (): HTMLElement =>
    (Array.from(tablist().querySelectorAll('[role="tab"]')) as HTMLElement[])
      .find((t) => t.getAttribute('aria-selected') === 'true')!
  const tab = selected()
  const controls = tab.getAttribute('aria-controls')
  expect(controls, 'the selected tab carries aria-controls').not.toBeNull()
  const panel = document.getElementById(controls!)
  expect(panel, 'the controlled panel is the mounted one').not.toBeNull()
  expect(panel?.getAttribute('data-form-group-panel')).toBe('parts')
  // the DSH panel contract: the panel points back at its tab
  expect(panel?.getAttribute('aria-labelledby')).toBe(tab.getAttribute('id'))
  // and the link follows the pick
  fireEvent.click(screen.getByRole('tab', { name: 'Turnaround' }))
  const next = selected()
  expect(document.getElementById(next.getAttribute('aria-controls')!)?.getAttribute('aria-labelledby'))
    .toBe(next.getAttribute('id'))
})
