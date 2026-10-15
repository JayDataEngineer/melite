/**
 * ONE TRUTH (the rework's firing wall, 2026-10-27).
 *
 * THE LAW (DSH doc law: presenters are pure functions of durable
 * truth; the adapter owns writes; live incrementality is transient
 * and marked — never a second session state joined by a guard):
 * the studio is f(doc, pendingOps). A refresh carrying content
 * older than what the operator stated NEVER rewrites the shown
 * document — stated-but-unsettled writes ride the op overlay until
 * the durable doc itself contains them.
 *
 * THE MIRROR'S CRIME (this wall reds on it): the hydrate-once
 * mirror + 3-position guard reads "ledger quiet" as foreign truth
 * and adopts the stale refresh over live edits — visible text
 * reverts mid-typing, empty faces flash, the reference "goes
 * away". Each arm below reds on the mirror, greens on the
 * collapse.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { H3TimelineStudio } from '../src/client/index.ts'
import type { StageViewOwnerProps } from '@melite/contracts'

const P0 = {
  calls: [
    { text: 'shot one', start_frame: 0, end_frame: 160 },
    { text: 'second shot', start_frame: 160, end_frame: 247 },
  ],
  keyframes: [],
  fps: 24,
  seed: 7,
}

function owner(params: unknown): StageViewOwnerProps {
  return {
    stageId: 's_4',
    cardName: 'h3-timeline',
    upstream: [],
    row: { id: 's_4', card: 'h3-timeline', title: 'H3 Timeline', params: params as Record<string, unknown> },
    runStatus: 'ready',
    onPatch: vi.fn(),
    onRun: vi.fn(),
    onStop: () => {},
    onRemove: () => {},
    onSurface: () => {},
    runId: null,
  } as StageViewOwnerProps
}

describe('ONE TRUTH (the collapse wall)', () => {
  beforeEach(() => cleanup())

  it('a stale refresh never rewrites stated-but-unsettled text', () => {
    const p = owner(P0)
    const { rerender } = render(h(H3TimelineStudio, p))
    fireEvent.click(document.querySelector('[data-call-row="0"]')!)
    const ta = screen.getByLabelText('Call 0 prompt') as HTMLTextAreaElement
    // the operator types: the gesture states the text
    fireEvent.change(ta, { target: { value: 'shot one — typed live' } })
    expect(ta.value).toBe('shot one — typed live')
    // a refresh carrying OTHER (older-or-foreign) content arrives
    // while the operator's write is unsettled: the shown text holds
    const stale = {
      ...P0,
      calls: [
        { text: 'agent overwrite', start_frame: 0, end_frame: 160 },
        { text: 'second shot', start_frame: 160, end_frame: 247 },
      ],
    }
    rerender(h(H3TimelineStudio, owner(stale)))
    // WITHOUT the collapse the guard adopts the refresh (local ==
    // sent, no probe) and the textarea reverts to 'agent overwrite'
    expect(screen.getByLabelText('Call 0 prompt') as HTMLTextAreaElement).toHaveProperty(
      'value', 'shot one — typed live',
    )
  })

  it('a settled refresh shows the settlement (the overlay retires)', () => {
    const p = owner(P0)
    const { rerender } = render(h(H3TimelineStudio, p))
    fireEvent.click(document.querySelector('[data-call-row="0"]')!)
    const ta = screen.getByLabelText('Call 0 prompt') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'shot one — typed live' } })
    // the durable doc now contains the stated text: nothing
    // outstanding, the settlement shows (same content, no flap)
    const settled = {
      ...P0,
      calls: [
        { text: 'shot one — typed live', start_frame: 0, end_frame: 160 },
        { text: 'second shot', start_frame: 160, end_frame: 247 },
      ],
    }
    rerender(h(H3TimelineStudio, owner(settled)))
    expect(screen.getByLabelText('Call 0 prompt') as HTMLTextAreaElement).toHaveProperty(
      'value', 'shot one — typed live',
    )
  })
})

describe('F1 — the doc-spine hook census (component.tsx)', () => {
  it('the tenant carries exactly 1 raw useState/useMemo — the count is deliberate', () => {
    // THE PIN (audit nativity-B F1, 2026-11-05): the collapse's own
    // "no mirror-state smell" invariant, previously prose, now a
    // judge. component.tsx holds exactly ONE memo hook — useMemo (the
    // knob fields fold). RE-PIN 2026-11-06 (the submenu law): the
    // run-panel fold's useState DIED with the fold itself (operator:
    // "get rid of the folding of layer A") — 2 → 1. A SECOND hook is
    // the mirror's first brick: derived state that should project
    // (useDerivedView, useShownDoc) or ride the spine, never a second
    // session state. Adding a hook reds this arm until the count is
    // re-pinned with a dated comment naming WHY the growth is
    // deliberate.
    const src = readFileSync(resolve(import.meta.dirname, '../src/ui/studio/component.tsx'), 'utf8')
    const hooks = [...src.matchAll(/\b(useState|useMemo)\(/g)].map((m) => m[1]!)
    assert.equal(hooks.length, 1, `component.tsx holds ${hooks.length} raw useState/useMemo — a hook growth is a mirror candidate: re-derive it (useDerivedView) or ride the spine (useShownDoc); re-pin only with a dated why`)
  })
})
