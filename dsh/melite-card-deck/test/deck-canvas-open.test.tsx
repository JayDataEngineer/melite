// @vitest-environment happy-dom
/**
 * DeckCanvas open-state machine — behavioral test (2026-09-01).
 *
 * Pins the recreate-caching fix: clicking the wand on the SAME draft
 * while the deck is already mounted MUST bump the iframe URL nonce,
 * forcing a full editor reload and a re-hydrate from the gateway.
 * Before the fix, React's identical-state no-op kept the iframe src
 * unchanged — the wand looked dead.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'

/* ── mocks: modules that touch iframe internals (DOM-heavy, not under test) ── */

vi.mock('./embed-bridge.ts', () => ({
  startEmbedBridge: vi.fn(() => ({ stop: vi.fn() })),
}))

vi.mock('../../melite-card-view/src/client/zoomPromotion.ts', () => ({
  createZoomPromotion: vi.fn(() => ({ attach: vi.fn(), detach: vi.fn() })),
  ZOOM_OVERLAY_SELECTOR: '[data-zoom]',
  PREVIEW_DIALOG_SELECTOR: '[data-preview]',
}))

/* ── the unit under test ── */

import {
  DeckCanvas,
  setPendingDraft,
  OPEN_DRAFT_EVENT,
} from '../src/client/DeckCanvas.tsx'

/** Helper: render, return the iframe element. */
function mountDeck() {
  const result = render(<DeckCanvas />)
  return result
}

function iframeSrc(result: ReturnType<typeof render>): string {
  return (result.container.querySelector('iframe') as HTMLIFrameElement).src
}

describe('DeckCanvas open-state machine', () => {
  beforeEach(() => {
    // clear any parked draft before each test
    setPendingDraft('')
  })

  it('no pending draft → iframe loads /editor/', () => {
    const r = mountDeck()
    const src = iframeSrc(r)
    // should NOT contain meliteCards
    expect(src).toContain('/editor/')
    expect(src).not.toContain('meliteCards=')
    r.unmount()
  })

  it('pending draft consumed at mount → /editor/?meliteCards=<id>&_r=1', () => {
    setPendingDraft('draft-test-001')
    const r = mountDeck()
    const src = iframeSrc(r)
    expect(src).toContain('meliteCards=draft-test-001')
    expect(src).toContain('_r=1')
    r.unmount()
  })

  it('OPEN_DRAFT_EVENT with SAME id bumps nonce (_r changes) — THE REGRESSION', () => {
    setPendingDraft('draft-same')
    const r = mountDeck()
    const src1 = iframeSrc(r)
    expect(src1).toContain('_r=1')

    // dispatch same draft id — before the fix this was a React no-op
    act(() => {
      document.dispatchEvent(
        new CustomEvent(OPEN_DRAFT_EVENT, {
          detail: { draftId: 'draft-same' },
        }),
      )
    })

    const src2 = iframeSrc(r)
    expect(src2).toContain('meliteCards=draft-same')
    expect(src2).toContain('_r=2')  // nonce bumped → iframe URL changed
    expect(src2).not.toEqual(src1)  // iframe MUST navigate to a new URL
    r.unmount()
  })

  it('OPEN_DRAFT_EVENT with different id updates both id and nonce', () => {
    setPendingDraft('draft-old')
    const r = mountDeck()

    act(() => {
      document.dispatchEvent(
        new CustomEvent(OPEN_DRAFT_EVENT, {
          detail: { draftId: 'draft-new' },
        }),
      )
    })

    const src = iframeSrc(r)
    expect(src).toContain('meliteCards=draft-new')
    expect(src).toContain('_r=2')
    r.unmount()
  })

  it('OPEN_DRAFT_EVENT with empty string is ignored', () => {
    setPendingDraft('draft-keep')
    const r = mountDeck()
    const src1 = iframeSrc(r)

    act(() => {
      document.dispatchEvent(
        new CustomEvent(OPEN_DRAFT_EVENT, { detail: { draftId: '' } }),
      )
    })

    expect(iframeSrc(r)).toEqual(src1) // unchanged
    r.unmount()
  })

  it('multiple rapid wands: nonce increments monotonically', () => {
    setPendingDraft('draft-multi')
    const r = mountDeck()

    for (let i = 2; i <= 6; i++) {
      act(() => {
        document.dispatchEvent(
          new CustomEvent(OPEN_DRAFT_EVENT, {
            detail: { draftId: 'draft-multi' },
          }),
        )
      })
      expect(iframeSrc(r)).toContain(`_r=${i}`)
    }
    r.unmount()
  })
})
