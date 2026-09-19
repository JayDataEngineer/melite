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

import { ImageStagePreview, MeshStagePreview } from '../src/preview.tsx'
import type { PreviewOwnerProps } from '@melite/contracts'
import { resetPickCellsForTests } from '../src/preview.tsx'

// THE CELLS ARE IDENTITY-SHARED BY DESIGN (DSH's client-state law);
// walls reset between cases so no pick bleeds across tests
afterEach(() => { cleanup(); resetPickCellsForTests() })

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

test('THE STRIP OPT-OUT (gap 4): historyStrip false kills the strip — the card claims its own bottom bar', () => {
  const owner: PreviewOwnerProps = {
    ...CURRENT,
    historyStrip: false,
  }
  const r = render(h(ImageStagePreview, owner))
  expect(r.container.querySelector('[data-testid="stage-output-history"]')).toBe(null)
  expect(r.container.querySelector('[data-testid="stage-preview-image-hero"]')).not.toBe(null)
})

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

test('THE NOT-CURRENT BADGE (output-component stroke): an explicit pick tags the hero stale; the current hero and the fallback hero carry no badge', () => {
  const { container } = render(h(ImageStagePreview, CURRENT))
  // current hero: no badge
  expect(container.querySelector('[data-testid="history-stale-badge"]')).toBeNull()
  const tiles = container.querySelectorAll('[data-testid="stage-output-history"] button')
  fireEvent.click(tiles[0] as HTMLElement)
  expect(container.querySelector('[data-testid="history-stale-badge"]')?.textContent).toContain('Not current')
})

test('NO BADGE ON THE FALLBACK: between runs (no current artifacts) the newest archive is the hero WITHOUT a stale tag', () => {
  const { container } = render(h(ImageStagePreview, { ...CURRENT, artifacts: [], runStatus: '' }))
  expect(container.querySelector('[data-testid="stage-preview-image-hero"]')).not.toBeNull()
  expect(container.querySelector('[data-testid="history-stale-badge"]')).toBeNull()
})

test('MULTI-OUTPUT HISTORY VIEWING: promoting a multi-artifact entry swaps the WHOLE set — hero plus its own thumbs, never the current run\'s row', () => {
  const multi: PreviewOwnerProps = {
    ...CURRENT,
    artifacts: [
      { name: 'cur', url: '/runs/cur/a.png' },
      { name: 'cur2', url: '/runs/cur/b.png' },
    ],
    history: [
      [
        { name: 'old', url: '/runs/prev1/a.png' },
        { name: 'old2', url: '/runs/prev1/b.png' },
      ],
    ],
  }
  const { container } = render(h(ImageStagePreview, multi))
  // current run: hero + its own second thumb (the row ABOVE the
  // history block is the ACTIVE set's row — hero excluded)
  const activeRowSrcs = (): string[] => {
    const historyBlock = container.querySelector('[data-testid="stage-output-history"]')
    const heroImg = container.querySelector('[data-testid="stage-preview-image-hero"]')
    const srcs: string[] = []
    container.querySelectorAll('img').forEach((img) => {
      if (!historyBlock?.contains(img) && img !== heroImg) srcs.push(img.getAttribute('src') ?? '')
    })
    return srcs
  }
  let hero = container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/cur/a.png')
  expect(activeRowSrcs()).toEqual(['/runs/cur/b.png'])
  // promote the old MULTI entry: hero AND the row under it flip to
  // the entry's set — the current run's thumb never mixes in
  const tiles = container.querySelectorAll('[data-testid="stage-output-history"] button')
  fireEvent.click(tiles[0] as HTMLElement)
  hero = container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/prev1/a.png')
  expect(activeRowSrcs()).toEqual(['/runs/prev1/b.png'])
})

test('MESH GAINS THE HISTORY LAW: the mesh preview renders the strip and the badge like every other kind', () => {
  const { container } = render(h(MeshStagePreview, CURRENT))
  expect(container.querySelector('[data-testid="stage-output-history"]')).not.toBeNull()
  const tiles = container.querySelectorAll('[data-testid="stage-output-history"] button')
  fireEvent.click(tiles[0] as HTMLElement)
  expect(container.querySelector('[data-testid="history-stale-badge"]')).not.toBeNull()
})

test('THE PARAMS CHIP: a picked generation with differing params names the keys on the badge and the tile tooltip', () => {
  const { container } = render(h(ImageStagePreview, {
    ...CURRENT,
    historyNotes: ['seed, steps', ''],
  }))
  const tiles = container.querySelectorAll('[data-testid="stage-output-history"] button')
  // the tile tooltip carries the diff before the pick
  expect((tiles[0] as HTMLElement).getAttribute('title')).toContain('seed, steps')
  expect((tiles[1] as HTMLElement).getAttribute('title')).not.toContain('differs')
  // pick the differing entry: the badge names the keys
  fireEvent.click(tiles[0] as HTMLElement)
  const badge = container.querySelector('[data-testid="history-stale-badge"]')
  expect(badge?.textContent).toContain('differs: seed, steps')
  // pick the same-params entry: the badge stays silent on params
  fireEvent.click(tiles[1] as HTMLElement)
  const badge2 = container.querySelector('[data-testid="history-stale-badge"]')
  expect(badge2?.textContent).not.toContain('differs')
})

test('THE TOGGLE LAW (the operator\'s bug, 2026-09-16): clicking the PICKED tile again returns to the current hero', () => {
  const { container } = render(h(ImageStagePreview, CURRENT))
  const tiles = (): NodeListOf<HTMLButtonElement> => container.querySelectorAll('[data-testid="stage-output-history"] button')
  fireEvent.click(tiles()[1] as HTMLElement)
  let hero = container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/prev2/out.png')
  // the picked tile marks itself (aria-pressed — the click that
  // lands is visible; the click that returns says so)
  expect((tiles()[1] as HTMLElement).getAttribute('aria-pressed')).toBe('true')
  expect((tiles()[0] as HTMLElement).getAttribute('aria-pressed')).toBe('false')
  // clicking the SAME tile again: back to current, badge gone
  fireEvent.click(tiles()[1] as HTMLElement)
  hero = container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/cur/out.png')
  expect(container.querySelector('[data-testid="history-stale-badge"]')).toBeNull()
  expect((tiles()[1] as HTMLElement).getAttribute('aria-pressed')).toBe('false')
})

test('THE RETURN CONTROL: the stale badge is the visible way back — clicking it restores the current hero', () => {
  const { container } = render(h(ImageStagePreview, CURRENT))
  const tiles = container.querySelectorAll('[data-testid="stage-output-history"] button')
  fireEvent.click(tiles[0] as HTMLElement)
  const badge = container.querySelector('[data-testid="history-stale-badge"]') as HTMLButtonElement
  expect(badge.textContent).toContain('Return to current')
  expect(badge.tagName).toBe('BUTTON')
  fireEvent.click(badge)
  const hero = container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/cur/out.png')
  expect(container.querySelector('[data-testid="history-stale-badge"]')).toBeNull()
})

test('THE PICKED MARK: the tile owning the hero carries the active class (an unmarked pick reads as an ignored click)', () => {
  const { container } = render(h(ImageStagePreview, CURRENT))
  const tiles = container.querySelectorAll('[data-testid="stage-output-history"] button')
  fireEvent.click(tiles[0] as HTMLElement)
  expect((tiles[0] as HTMLElement).className).toContain('historyTileActive')
  expect((tiles[1] as HTMLElement).className).not.toContain('historyTileActive')
  // switching picks moves the mark
  fireEvent.click(tiles[1] as HTMLElement)
  expect((tiles[0] as HTMLElement).className).not.toContain('historyTileActive')
  expect((tiles[1] as HTMLElement).className).toContain('historyTileActive')
})

test('THE PICK IS A KEY, NEVER AN INDEX (the operator\'s catch, 2026-09-21: "the state constantly corrupts") — history growth never swaps the viewed entry', () => {
  const holder: { props: PreviewOwnerProps } = { props: CURRENT }
  const { rerender } = render(h(ImageStagePreview, holder.props))
  const tiles = () => document.querySelectorAll('[data-testid="stage-output-history"] button')
  fireEvent.click(tiles()[1] as HTMLElement) // prev2 (index 1, newest-first)
  // an archive lands at the HEAD with NO new current run — every
  // index shifts by one; an index-based pick would silently swap
  // to prev1. The keyed pick stays on prev2.
  holder.props = {
    ...holder.props,
    history: [[{ name: 'out', url: '/runs/prev0/out.png' }], ...holder.props.history!],
  }
  rerender(h(ImageStagePreview, holder.props))
  const hero = document.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/prev2/out.png')
  // and the ACTIVE MARK follows the same entry (index 2 now) —
  // the pressed tile's own thumb is the picked url
  const active = document.querySelector('[data-testid="stage-output-history"] button[aria-pressed="true"]') as HTMLElement
  const activeThumb = active.querySelector('img, [data-testid="history-thumb-missing"]') as HTMLImageElement
  expect(activeThumb.getAttribute('src')).toBe('/runs/prev2/out.png')
})

test('THE CROSS-STAGE LEAK IS DEAD — a stage switch resets the pick (hosts mount unkeyed; the selection never outlives its stage)', () => {
  const holder: { props: PreviewOwnerProps } = { props: CURRENT }
  const { rerender } = render(h(ImageStagePreview, holder.props))
  const tiles = () => document.querySelectorAll('[data-testid="stage-output-history"] button')
  fireEvent.click(tiles()[0] as HTMLElement) // prev1 picked
  expect(document.querySelector('[data-testid="history-stale-badge"]')).not.toBeNull()
  // the user drills ANOTHER stage: same mount position, same
  // component instance — the pick must NOT survive the switch
  holder.props = {
    ...holder.props,
    stageId: 's_7',
    artifacts: [{ name: 'other', url: '/runs/other/out.png' }],
    history: [[{ name: 'other', url: '/runs/other-prev/out.png' }]],
  }
  rerender(h(ImageStagePreview, holder.props))
  const hero = document.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement
  expect(hero.getAttribute('src')).toBe('/runs/other/out.png')
  expect(document.querySelector('[data-testid="history-stale-badge"]')).toBeNull()
})

test('THE HONEST DEAD FACE (the operator\'s catch, 2026-09-21: "There\'s no sideways error") — a gone artifact shows its name, never a silent broken void', () => {
  const owner: PreviewOwnerProps = {
    ...CURRENT,
    history: [[{ name: 'dead_gen.png', url: '/runs/gone/dead_gen.png' }]],
  }
  const { container } = render(h(ImageStagePreview, owner))
  const img = container.querySelector('[data-testid="stage-output-history"] img') as HTMLImageElement
  fireEvent.error(img)
  const dead = container.querySelector('[data-testid="history-thumb-missing"]') as HTMLElement
  expect(dead).not.toBeNull()
  expect(dead.textContent).toBe('gone')
  expect(dead.getAttribute('title')).toContain('dead_gen.png')
})

test('THE EMPTY NOTE SLOT (alignment law): an entry without a params snapshot renders NO differs chip — the badge stays clean', () => {
  const owner: PreviewOwnerProps = {
    ...CURRENT,
    historyNotes: ['', 'steps, seed'],
  }
  const { container } = render(h(ImageStagePreview, owner))
  const tiles = container.querySelectorAll('[data-testid="stage-output-history"] button')
  // the snapshotted entry names its keys
  fireEvent.click(tiles[1] as HTMLElement)
  let badge = container.querySelector('[data-testid="history-stale-badge"]') as HTMLElement
  expect(badge.textContent).toContain('differs: steps, seed')
  // the snapshot-less entry (EMPTY slot — kept for index alignment)
  // renders the badge with NO differs chip at all
  fireEvent.click(tiles[0] as HTMLElement)
  badge = container.querySelector('[data-testid="history-stale-badge"]') as HTMLElement
  expect(badge.textContent).not.toContain('differs')
})

test('THE CELL CAP (64, LRU): an ancient stage\'s pick is evicted by churn; a recent one survives it', () => {
  resetPickCellsForTests()
  const first: PreviewOwnerProps = { ...CURRENT, stageId: 's_first' }
  const r1 = render(h(ImageStagePreview, first))
  fireEvent.click(r1.container.querySelectorAll('[data-testid="stage-output-history"] button')[0] as HTMLElement)
  expect((r1.container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement).getAttribute('src')).toBe('/runs/prev1/out.png')
  cleanup()
  // 64 MORE identities ride through — the first stage's cell is the
  // oldest insertion and falls out of the capped store
  for (let i = 0; i < 64; i++) {
    render(h(ImageStagePreview, { ...CURRENT, stageId: 's_bulk_' + i }))
    cleanup()
  }
  const again = render(h(ImageStagePreview, first))
  expect((again.container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement).getAttribute('src')).toBe('/runs/cur/out.png')
  // a RECENT identity keeps its pick across the same churn (LRU:
  // re-reading refreshes insertion order, eviction takes the OLDEST)
  resetPickCellsForTests()
  const recent: PreviewOwnerProps = { ...CURRENT, stageId: 's_recent' }
  const r2 = render(h(ImageStagePreview, recent))
  fireEvent.click(r2.container.querySelectorAll('[data-testid="stage-output-history"] button')[0] as HTMLElement)
  cleanup()
  for (let i = 0; i < 8; i++) {
    render(h(ImageStagePreview, { ...CURRENT, stageId: 's_more_' + i }))
    cleanup()
  }
  const r3 = render(h(ImageStagePreview, recent))
  expect((r3.container.querySelector('[data-testid="stage-preview-image-hero"]') as HTMLImageElement).getAttribute('src')).toBe('/runs/prev1/out.png')
})
