// @vitest-environment jsdom
/**
 * MediaPanel run grouping (operator 2026-11-10, "can grouping happen
 * in the media sidebar?") — the law the fold owes its own wall:
 * the completed film is the visible card, its sections ride collapsed
 * under a count badge (never hidden — folded), the fold keys by runId
 * globally so the sort faces cannot shatter a run, and the tucked
 * face NEVER folds (the mass-archive law owns those tiles).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'

import { flatten, groupPage, MediaPanel } from '../src/client/MediaPanel.tsx'
import type { GalleryRunRow } from '../src/client/decode.ts'

const runsFeed = (runs: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ runs, errors: [] }), { status: 200 }))
const draftsFeed = (): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ drafts: [], errors: [] }), { status: 200 }))

const run = (over: Record<string, unknown>): GalleryRunRow =>
  ({ run_id: 'r1', created_at: 1, ...over }) as GalleryRunRow

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

const film = (url: string, name = url.split('/').pop() ?? url): Record<string, unknown> =>
  ({ url, name, type: 'video' })
const windowFilm = (n: number): Record<string, unknown> =>
  ({ url: `/v/film_w${n}_ab12f.mp4`, name: `film_w${n}_ab12f.mp4`, type: 'video' })

describe('groupPage — the derivation', () => {
  it('a run folds to its final film as hero, sections in shown order', () => {
    const items = flatten([run({ artifacts: [windowFilm(1), film('/v/film.mp4'), windowFilm(2)] })])
    const groups = groupPage(items)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.hero.url).toBe('/v/film.mp4')
    expect(groups[0]!.sections.map((s) => s.url)).toEqual(['/v/film_w1_ab12f.mp4', '/v/film_w2_ab12f.mp4'])
  })

  it('a run with no final keeps its first tile as hero', () => {
    const items = flatten([run({ artifacts: [windowFilm(1), windowFilm(2)] })])
    const groups = groupPage(items)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.hero.url).toBe('/v/film_w1_ab12f.mp4')
    expect(groups[0]!.sections.map((s) => s.url)).toEqual(['/v/film_w2_ab12f.mp4'])
  })

  it('keys by runId GLOBALLY — an interleaved sort face never shatters a run', () => {
    // two runs, items interleaved as a sort face would leave them
    const a = flatten([run({ run_id: 'ra', created_at: 2, artifacts: [film('/v/a.mp4'), windowFilm(1)] })])
    const b = flatten([run({ run_id: 'rb', created_at: 1, artifacts: [film('/v/b.mp4')] })])
    const interleaved = [a[0]!, b[0]!, a[1]!]
    const groups = groupPage(interleaved)
    expect(groups).toHaveLength(2)
    expect(groups[0]!.hero.runId).toBe('ra')
    expect(groups[0]!.sections).toHaveLength(1)
    expect(groups[1]!.hero.runId).toBe('rb')
    expect(groups[1]!.sections).toHaveLength(0)
  })

  it('single-artifact runs carry no sections — a lone tile is its own face', () => {
    const items = flatten([run({ artifacts: [film('/v/solo.mp4')] })])
    const groups = groupPage(items)
    expect(groups).toHaveLength(1)
    expect(groups[0]!.sections).toHaveLength(0)
  })

  it('THE TUCKED FACE NEVER FOLDS — archived tiles render flat, outside the run group', () => {
    const items = flatten([run({
      artifacts: [{ url: '/v/live.png', name: 'live.png', type: 'image' }],
      archived: [{ url: '/v/old.png', name: 'old.png', type: 'image' }],
    })])
    const groups = groupPage(items)
    // two groups: the live run (no chrome) and the tucked tile flat —
    // the restore sweep selects it directly, never behind a badge
    expect(groups).toHaveLength(2)
    expect(groups.every((g) => g.sections.length === 0)).toBe(true)
    expect(groups.some((g) => g.hero.archived)).toBe(true)
  })
})

describe('MediaPanel — the fold face', () => {
  const multiRun = (): GalleryRunRow => run({
    run_id: 'run-fold',
    prompt: 'the ad take',
    artifacts: [film('/v/film.mp4'), windowFilm(1), windowFilm(2)],
  })

  const feedOf = (rows: GalleryRunRow[]): void => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs' ? runsFeed(rows) : draftsFeed())
  }

  it('collapsed by default: the hero film + the count badge, sections absent', async () => {
    feedOf([multiRun()])
    render(<MediaPanel />)
    await waitFor(() => { expect(document.querySelector('[data-infer-media-group]')).toBeTruthy() })
    const badge = document.querySelector('[data-infer-media-group]') as HTMLElement
    expect(badge.textContent).toMatch(/\+2 ▾/)
    expect(badge.getAttribute('aria-expanded')).toBe('false')
    // the sections are folded, not deleted: only the hero tile mounts
    // (window sections would render as SEGMENT-chipped tiles — none do)
    const chips = Array.from(document.querySelectorAll('button span'))
      .filter((s) => s.textContent === 'SEGMENT')
    expect(chips).toHaveLength(0)
    expect(document.querySelector('button video[src="/v/film.mp4"]')).not.toBeNull()
  })

  it('the badge expands the fold: sections mount, the badge says collapse', async () => {
    feedOf([multiRun()])
    render(<MediaPanel />)
    await waitFor(() => { expect(document.querySelector('[data-infer-media-group]')).not.toBeNull() })
    fireEvent.click(document.querySelector('[data-infer-media-group]') as HTMLElement)
    // the previews cure paints each window section with the final's
    // first frame — the SEGMENT chips are the section's own name
    const segments = await waitFor(() => {
      const chips = Array.from(document.querySelectorAll('button span'))
        .filter((s) => s.textContent === 'SEGMENT')
      expect(chips).toHaveLength(2)
      return chips
    })
    expect(segments).toHaveLength(2)
    const badge = document.querySelector('[data-infer-media-group]') as HTMLElement
    expect(badge.textContent).toMatch(/\+2 ▴/)
    expect(badge.getAttribute('aria-expanded')).toBe('true')
    // collapsing again folds them back
    fireEvent.click(badge)
    await waitFor(() => {
      const chips = Array.from(document.querySelectorAll('button span'))
        .filter((s) => s.textContent === 'SEGMENT')
      expect(chips).toHaveLength(0)
    })
  })

  it('the badge never hijacks the tile: its click does not open the preview', async () => {
    feedOf([multiRun()])
    render(<MediaPanel />)
    await waitFor(() => { expect(document.querySelector('[data-infer-media-group]')).not.toBeNull() })
    fireEvent.click(document.querySelector('[data-infer-media-group]') as HTMLElement)
    // no overlay/lightbox mounted — the tile's own click still owns that
    expect(document.querySelector('[data-infer-overlay], [role="dialog"]')).toBeNull()
  })

  it('a lone-artifact run wears no badge — group chrome is earned by sections', async () => {
    feedOf([run({ artifacts: [film('/v/solo.mp4')] })])
    render(<MediaPanel />)
    await waitFor(() => { expect(document.querySelector('button video[src="/v/solo.mp4"]')).not.toBeNull() })
    expect(document.querySelector('[data-infer-media-group]')).toBeNull()
  })
})
