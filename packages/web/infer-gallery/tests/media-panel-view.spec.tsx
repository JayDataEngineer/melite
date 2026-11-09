// @vitest-environment jsdom
/**
 * THE VIEW DIALS (operator 2026-11-09, "change the size of the
 * previews to something bigger, and option to set the pagination per
 * page"): two persisted settings over the artifacts grid — the tile
 * size (the grid's minmax column width: S=148 native, M=220, L=320)
 * and the page size (30/60/120, 60 the default this face always had).
 * Pinned at the DOM level: the grid's own style answers the dial, the
 * scan re-anchors on a wider page, and both survive a remount through
 * localStorage (a foreign stored value falls to the default).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { MediaPanel } from '../src/client/MediaPanel.tsx'
import type { GalleryRunRow } from '../src/client/decode.ts'

const runsFeed = (runs: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ runs, errors: [] }), { status: 200 }))
const draftsFeed = (drafts: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ drafts, errors: [] }), { status: 200 }))

/** One run holding n images — a grid of tiles with no windowing noise. */
const imagesRun = (n: number): GalleryRunRow =>
  ({
    run_id: 'r1', created_at: 1,
    artifacts: Array.from({ length: n }, (_, i) => ({ url: `/v/i${String(i)}.png`, type: 'image' })),
  }) as GalleryRunRow

const gridColumns = (): string => {
  const grid = document.querySelector('[data-infer-media-grid]') as HTMLElement | null
  expect(grid).toBeTruthy()
  return grid?.style.gridTemplateColumns ?? ''
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

describe('the view dials — preview size + page size over the artifacts grid', () => {
  it('the tile dial widens the grid (S native 148 → L 320)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs' ? runsFeed([imagesRun(3)]) : draftsFeed([]))
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText(/1 runs · 3 artifacts/)).toBeTruthy() })
    expect(gridColumns()).toContain('148px')
    fireEvent.click(screen.getByText('L'))
    expect(gridColumns()).toContain('320px')
    fireEvent.click(screen.getByText('M'))
    expect(gridColumns()).toContain('220px')
  })

  it('the page dial re-anchors the scan — 61 items: 2 pages at 60, 3 at 30', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs' ? runsFeed([imagesRun(61)]) : draftsFeed([]))
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText(/page 1 of 2/)).toBeTruthy() })
    // page 2 holds the one tile past the first 60
    fireEvent.click(screen.getByText('Next ›'))
    await waitFor(() => { expect(screen.getByText(/page 2 of 2/)).toBeTruthy() })
    fireEvent.click(screen.getByText('30'))
    // a page dial change re-anchors to page 1 and re-splits: 61/30 → 3 pages
    await waitFor(() => { expect(screen.getByText(/page 1 of 3/)).toBeTruthy() })
    const grid = document.querySelector('[data-infer-media-grid]') as HTMLElement | null
    expect(grid?.children.length).toBe(30)
  })

  it('both dials persist across a remount; a foreign stored value falls to the default', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs' ? runsFeed([imagesRun(2)]) : draftsFeed([]))
    const { unmount } = render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText(/1 runs · 2 artifacts/)).toBeTruthy() })
    fireEvent.click(screen.getByText('L'))
    fireEvent.click(screen.getByText('120'))
    expect(localStorage.getItem('infer-media-tile')).toBe('l')
    expect(localStorage.getItem('infer-media-page')).toBe('120')
    // a poisoned key (a stale schema, a hand-edit) must never mint a
    // foreign layout — the default owns it
    localStorage.setItem('infer-media-tile', 'xxl')
    unmount()
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText(/1 runs · 2 artifacts/)).toBeTruthy() })
    // page 120 survived the remount (the dial sits active); the
    // poisoned tile key fell back to the native 148
    expect(gridColumns()).toContain('148px')
    const active120 = screen.getByText('120').closest('button')
    expect(active120?.getAttribute('class')).toMatch(/active|true|selected/i)
  })

  it('the dials ride the artifacts face only — the flows and files faces own no grid', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs' ? runsFeed([imagesRun(2)]) : draftsFeed([]))
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText('Per page')).toBeTruthy() })
    fireEvent.click(screen.getByText(/Flows 0/))
    expect(screen.queryByText('Per page')).toBe(null)
  })
})
