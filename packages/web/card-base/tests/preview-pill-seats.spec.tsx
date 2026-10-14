// @vitest-environment happy-dom
// preview-pill-seats.spec.tsx — THE PREVIEW CATALOG-SEAT WALL (S7j,
// LAW 4).
//
// THE INVARIANT: the two preview chrome verbs ride the catalog atoms
// — the stale badge is the Pill interactive capsule (ui-primitives
// README line 77: Tag is the READ-ONLY badge, "for Pill when the
// capsule is selectable (active and onClick…)"), and the text copy
// verb is the Button atom outline+sm (the card-view bench-verb
// idiom, S6a). NOT the retired hand-painted chip buttons.
//
// RED WHEN THE CURE IS TOGGLED OUT: the raw <button class=staleBadge>
// / <button class=textCopy> seats carry neither Pill's nor Button's
// own module faces — the class arms below fail while the behavior
// arms keep passing (the point: the wall judges the catalog seam,
// not just the click).
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement as h } from 'react'

import { ImageStagePreview, TextStagePreview, resetPickCellsForTests } from '../src/preview.tsx'
import type { PreviewOwnerProps } from '@melite/contracts'

afterEach(() => { cleanup(); resetPickCellsForTests(); vi.unstubAllGlobals() })

const OWNER: PreviewOwnerProps = {
  kind: 'image',
  artifacts: [{ name: 'out', url: '/runs/cur/out.png' }],
  runStatus: 'completed',
  stageId: 's_0',
  history: [[{ name: 'out', url: '/runs/prev1/out.png' }]],
}

function renderStale(): void {
  render(h(ImageStagePreview, OWNER))
  fireEvent.click(screen.getAllByTestId('stage-output-history')[0]!.querySelectorAll('button')[0]!)
}

const badge = (): HTMLElement => {
  const el = screen.getByTestId('history-stale-badge')
  if (!(el instanceof HTMLElement)) throw new Error('the stale badge is not an element')
  return el
}

// the hero is re-queried per read: the layout-preserving seat swaps
// the img NODE on url change (key=seatUrl) — a captured reference
// goes stale on exactly the swap this wall judges
const heroSrc = (): string | null =>
  (document.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement | null)
    ?.getAttribute('src') ?? null

test('THE STALE BADGE IS THE PILL: capsule faces on the return control; the click returns without bubbling', () => {
  renderStale()
  const el = badge()
  // Pill's own module faces — hashed under the test pipeline, so the
  // assertion rides the face NAME (the retired chip rendered neither)
  expect(el.className, 'the badge rides Pill\'s pill face').toMatch(/_pill_/)
  expect(el.className, 'the badge is Pill\'s interactive face').toMatch(/_interactive_/)
  expect(el.textContent).toContain('Not current — earlier generation')
  expect(el.textContent).toContain('· Return to current')
  // the seat-bubble law: the return click consumes itself (the badge
  // lives inside the walk-opening seat)
  expect(heroSrc()).toBe('/runs/prev1/out.png')
  fireEvent.click(el)
  expect(heroSrc()).toBe('/runs/cur/out.png')
  expect(screen.queryByTestId('history-stale-badge')).toBeNull()
})

const TEXT: PreviewOwnerProps = {
  kind: 'text',
  artifacts: [{ name: 'SaveText.0_tags_00001.txt', url: '/melite-media/runs/cur/tagger/SaveText.0_tags_00001.txt' }],
  runStatus: 'completed',
  stageId: 's_0',
}

test('THE COPY VERB IS THE BUTTON ATOM: outline+sm faces on the verb; the click copies the hero body', async () => {
  vi.stubGlobal('fetch', (async (): Promise<Response> =>
    new Response('tags: one, two', { status: 200 })) as typeof fetch)
  const writeText = vi.fn(async (): Promise<void> => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  render(h(TextStagePreview, TEXT))
  await screen.findByTestId('stage-preview-text-body')
  const verb = screen.getByTestId('stage-preview-text-copy')
  // Button's own module faces (Button.tsx:27-35: base + variant +
  // size) — hashed under the test pipeline, so the assertions ride
  // the face NAMES
  expect(verb.className, 'the verb rides the Button atom face').toMatch(/_button_/)
  expect(verb.className, 'the verb is the outline variant').toMatch(/_outline_/)
  expect(verb.className, 'the verb is the sm size').toMatch(/_sm_/)
  expect(verb.getAttribute('aria-label')).toBe('copy text output')
  fireEvent.click(verb)
  await waitFor(() => { expect(screen.getByTestId('stage-preview-text-copy').textContent).toBe('copied ✓') })
  expect(writeText).toHaveBeenCalledWith('tags: one, two')
})
