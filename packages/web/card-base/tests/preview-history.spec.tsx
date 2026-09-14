// @vitest-environment happy-dom
/**
 * preview-history.spec.tsx — STROKE 40 (the operator's QOL law):
 * "Under the Preview for cards … there is a mini-version below the
 * main preview. When we re-generate on the card, and it is unique,
 * that should be a 'card output history' section, with a reasonable
 * maximum, so we can track our latest changes."
 *
 * The estate archives the stage's previous results server-side
 * (estate/drafts bench.spec walls the archive: cap 12, unique by
 * url set, live faces never destroy outputs); these walls pin the
 * RENDER half — the history section under the hero, click-to-view,
 * and the reset when a new run lands.
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement as h } from 'react'

import { ImageStagePreview } from '../src/preview.tsx'
import type { PreviewOwnerProps } from '@melite/contracts'

afterEach(cleanup)

const CURRENT: PreviewOwnerProps = {
  kind: 'image',
  artifacts: [{ name: 'out', url: '/runs/cur/out.png' }],
  runStatus: 'completed',
  stageId: 's_0',
  history: [
    [{ name: 'out', url: '/runs/prev1/out.png' }],
    [{ name: 'out', url: '/runs/prev2/out.png' }],
  ],
}

test('THE SECTION: the history renders under the hero, titled, newest first, capped by the estate', () => {
  const { container } = render(h(ImageStagePreview, CURRENT))
  const block = container.querySelector('[data-testid="stage-output-history"]')
  expect(block).not.toBeNull()
  expect(block?.textContent).toContain('History')
  const tiles = block?.querySelectorAll('button')
  expect(tiles?.length).toBe(2)
  // newest first: the head tile is the LAST run before the current
  expect(tiles?.[0]?.querySelector('img')?.getAttribute('src')).toBe('/runs/prev1/out.png')
  // the hero is the CURRENT run's output — never a history entry
  const hero = container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/cur/out.png')
})

test('NO HISTORY, NO SECTION: a stage with no previous outputs renders no history block', () => {
  const { container } = render(h(ImageStagePreview, { ...CURRENT, history: undefined }))
  expect(container.querySelector('[data-testid="stage-output-history"]')).toBeNull()
})

test('CLICK TO VIEW: promoting a history entry swaps the hero; the stage row is never rewritten', () => {
  const { container } = render(h(ImageStagePreview, CURRENT))
  const tiles = container.querySelectorAll('[data-testid="stage-output-history"] button')
  fireEvent.click(tiles[1] as HTMLElement)
  const hero = container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/prev2/out.png')
})

test('THE RESET: a NEW result reclaims the hero (the view selection never outlives its run)', () => {
  const holder: { props: PreviewOwnerProps } = { props: CURRENT }
  const { rerender } = render(h(ImageStagePreview, holder.props))
  const tiles = () => document.querySelectorAll('[data-testid="stage-output-history"] button')
  fireEvent.click(tiles()[1] as HTMLElement)
  let hero = document.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/prev2/out.png')
  // the next run lands: new current artifacts + the old current
  // archived at the history head
  holder.props = {
    ...holder.props,
    artifacts: [{ name: 'out', url: '/runs/next/out.png' }],
    history: [[{ name: 'out', url: '/runs/cur/out.png' }], ...holder.props.history!],
  }
  rerender(h(ImageStagePreview, holder.props))
  hero = document.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/next/out.png')
})

test('EMPTY HISTORY FACE: with no current run, the history still tracks the latest changes (hero falls to newest)', () => {
  const { container } = render(h(ImageStagePreview, { ...CURRENT, artifacts: [], runStatus: '' }))
  // no current artifacts: the hero falls back to the newest history
  // entry — the card's last output stays visible between runs
  const hero = container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/prev1/out.png')
})
