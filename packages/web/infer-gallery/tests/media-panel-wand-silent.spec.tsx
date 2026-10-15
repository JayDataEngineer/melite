// @vitest-environment jsdom
/**
 * MediaPanel — THE SILENT-WAND WALL (operator 2026-11-05: the
 * yellow history button died with no banner, no tab, nothing).
 * The wand's restore chain had three unvoiced rejections: a
 * throwing tab service (the probe's open fan-out), a run load
 * that rejects past its own catch (the probe chain's bare .then),
 * and the draft-fallback load (a bare void — its rejection fell
 * off the chain entirely). Every one of them must voice on the
 * panel above the intact grid — a wand click never ends in
 * silence. Five arms: the three unvoiced rejections, the
 * in-flight restoring voice (a hung door reads as activity), and
 * the Tip seat re-pinned beside the voice (the bubble law stands —
 * no silence cure ever trades it for a native title again).
 * RED-PROOF (receipted, not claimed): arms 1-4 fire on the
 * original bare-void chain — three arms timing out at ~1s waiting
 * for banners that never come (the live silence reproduced) plus
 * the voice that never reads; arm 5 fires on a Tip-removed tree —
 * the standing suite's own Tip arms red on that identical tree
 * (same run), and this arm judges the same DOM facts (a native
 * title present where null is law, a tile-button parent where the
 * tipAnchor seat is law).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'

vi.mock('../src/client/bench-load.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/client/bench-load.ts')>()
  return { ...actual, loadRunOntoBench: vi.fn(), loadDraftOntoBench: vi.fn() }
})

import { loadDraftOntoBench, loadRunOntoBench } from '../src/client/bench-load.ts'
import { MediaPanel } from '../src/client/MediaPanel.tsx'
import type { GalleryRunRow } from '../src/client/decode.ts'

const runsFeed = (runs: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ runs, errors: [] }), { status: 200 }))
const draftsFeed = (drafts: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ drafts, errors: [] }), { status: 200 }))
const run = (over: Record<string, unknown>): GalleryRunRow =>
  ({ run_id: 'r1', created_at: 1, ...over }) as GalleryRunRow

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

async function wand(): Promise<HTMLElement> {
  return waitFor(() => screen.getByLabelText('Open as cards — this run') as HTMLElement)
}

async function bannerText(): Promise<string> {
  const banners = await screen.findAllByRole('status')
  return banners.map((b) => b.textContent ?? '').join('\n')
}

describe('MediaPanel — the silent-wand law (a wand click never ends in silence)', () => {
  it('a throwing tab service voices honestly (the probe fan-out never dies unhandled)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      String(url) === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
        : draftsFeed([]))
    // the run load succeeds through the probe (the bench CAS load
    // rode fine) — the death is the HOST's open, after the restore
    vi.mocked(loadRunOntoBench).mockImplementationOnce(async (_runId, deps) => {
      deps.openResource('dsh-resource://cards/bench/main')
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: () => { throw new Error('tab host tore down') } } },
    }) as never} />)
    fireEvent.click(await wand())
    expect(await bannerText()).toContain('open failed: the cards tab refused the open (tab host tore down)')
    // the grid survives — the wand is still there to press again
    expect(screen.getByLabelText('Open as cards — this run')).toBeTruthy()
    // every exit drops the restoring voice — a stuck voice names a
    // hung door, never a forgotten flag
    await waitFor(() => { expect(screen.queryByText(/restoring/i)).toBeNull() })
  })

  it('a run load that rejects past its own catch voices honestly (rejections land in the chain catch)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      String(url) === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
        : draftsFeed([]))
    vi.mocked(loadRunOntoBench).mockRejectedValueOnce(new Error('torn host'))
    const opened: string[] = []
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    fireEvent.click(await wand())
    expect(await bannerText()).toContain('open failed: bench load failed — torn host')
    expect(opened).toEqual([])
    await waitFor(() => { expect(screen.queryByText(/restoring/i)).toBeNull() })
    expect(screen.getByLabelText('Open as cards — this run')).toBeTruthy()
  })

  it('a rejecting draft fallback voices honestly (the fallback returns its load — never a bare void)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      String(url) === '/infer-gallery/runs'
        ? runsFeed([run({ draft_id: 'd9', artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
        : draftsFeed([]))
    // the sidecar keeps no record (probe opens nothing) — the row
    // draft is the lawful fallback, and its load tears
    vi.mocked(loadRunOntoBench).mockImplementationOnce(async (_runId, deps) => {
      deps.onError('sidecar unreadable')
    })
    vi.mocked(loadDraftOntoBench).mockRejectedValueOnce(new Error('draft door down'))
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: () => { /* must never fire on a torn load */ } } },
    }) as never} />)
    fireEvent.click(await wand())
    expect(await bannerText()).toContain('open failed: bench load failed — draft door down')
    await waitFor(() => { expect(screen.queryByText(/restoring/i)).toBeNull() })
    expect(screen.getByLabelText('Open as cards — this run')).toBeTruthy()
  })

  it('the tile names the in-flight restore (a hung door reads as activity, never silence)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      String(url) === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
        : draftsFeed([]))
    // the load parks mid-flight: the probe address is captured but
    // the chain has not settled — the voice must already read
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    vi.mocked(loadRunOntoBench).mockImplementationOnce(async (_runId, deps) => {
      deps.openResource('dsh-resource://cards/bench/main')
      await gate
    })
    const opened: string[] = []
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    fireEvent.click(await wand())
    // pending: the voice reads, the tab has NOT switched yet
    expect(await screen.findByText(/restoring/i)).toBeTruthy()
    expect(opened).toEqual([])
    release()
    await waitFor(() => { expect(opened).toEqual(['dsh-resource://cards/bench/main']) })
    // settled: the voice drops with the switch
    await waitFor(() => { expect(screen.queryByText(/restoring/i)).toBeNull() })
  })

  it('the wand keeps the estate Tip (native title stays gone — the bubble law stands)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      String(url) === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
        : draftsFeed([]))
    vi.mocked(loadRunOntoBench).mockImplementationOnce(async (_runId, deps) => {
      deps.openResource('dsh-resource://cards/bench/main')
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: () => { /* success — the structure is the assertion */ } } },
    }) as never} />)
    const el = await wand()
    // the hover text rides the estate Tip alone: a native title
    // would double-voice beside the bubble, and the bubble's seat
    // (card-base Tip, never the raw atom) is the suite's own law —
    // this arm re-pins it beside the voice so no silence cure ever
    // trades it away again (the module class hashes under test, so
    // the seat is judged by substring on the anchor, never a
    // literal selector)
    expect(el.getAttribute('title')).toBeNull()
    expect(el.parentElement?.className).toMatch(/tipAnchor/)
  })
})
