// @vitest-environment jsdom
/**
 * MediaPanel — THE SILENT-WAND WALL (operator 2026-11-05: the
 * yellow history button died with no banner, no tab, nothing; then:
 * only the hover text shows, blocking the button).
 * SIMPLE by operator law: no module mocks — the REAL bench loader
 * runs and only the NETWORK is stubbed (fetch), exactly the seam
 * the lane owns. Every arm clicks the real wand and asserts a real
 * outcome: a voice while in flight, a banner on every failure, an
 * open on success, and no overlay element anywhere that could eat
 * the click on a host primitive no wall can see. A wand click never
 * ends in silence.
 * FIVE arms: the throwing tab service, the dead network (the real
 * loader's own guard voices), the torn draft fallback (the real
 * loader's own guard voices — the fallback is awaited, never a
 * bare void), the deterministic in-flight voice (a gated sidecar:
 * the voice reads while the open waits, and drops with the
 * switch), and the no-overlay structure (native title, zero
 * tooltip elements after a real hover dwell — the Tip seat is
 * gone by operator mandate, re-pinned the other way).
 * RED-PROOF (receipted, not claimed — and corrected by the
 * mock-free rewrite itself: the first wall's mocks forced
 * rejections the real loader never produces, so two of its "holes"
 * were theater. The truth, against the original bare-void chain:
 * arm 1 REDS (a throwing open died unhandled — the real live hole,
 * ~1s timeout waiting for a banner that never comes); arm 4 REDS
 * (no in-flight voice — a hung door read as a dead button);
 * arms 2-3 stay GREEN on the old chain (the real loader's own
 * guards already voiced those doors — they pin the end-to-end
 * voice against future refactors, not a cure); arm 5 REDS on a
 * Tip-wrapped wand (a rendered bubble where the law allows none).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'

import { MediaPanel } from '../src/client/MediaPanel.tsx'
import { galleryCopy } from '../src/client/galleryCopy.ts'
import type { GalleryRunRow } from '../src/client/decode.ts'

const runsFeed = (runs: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ runs, errors: [] }), { status: 200 }))
const draftsFeed = (drafts: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ drafts, errors: [] }), { status: 200 }))
const run = (over: Record<string, unknown>): GalleryRunRow =>
  ({ run_id: 'r1', created_at: 1, ...over }) as GalleryRunRow
const videoRun = (over: Record<string, unknown> = {}): GalleryRunRow =>
  run({ artifacts: [{ url: '/v/walk.mp4', type: 'video' }], ...over })

// the bench CAS seats, exactly as the real loader doors them
const benchRev = (): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ rev: 7 }), { status: 200 }))
const benchEnsured = (): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ draft_id: 'bench-main', rev: 8 }), { status: 200 }))
const snapshotSidecar = (): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({
    run_id: 'r1',
    flow: {
      draft_id: 'd9',
      card_snapshot: { card: 'image-gen', params: { prompt: 'the prompt that RAN' } },
      artifacts: [],
    },
    request: null,
  }), { status: 200 }))

const tabWith = (openResource: (address: string) => void): never => ({
  tab: { navigation: { address: 'dsh-resource://media' }, actions: { openResource } },
}) as never

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

async function wand(): Promise<HTMLElement> {
  return waitFor(() => screen.getByLabelText('Open as cards — this run') as HTMLElement)
}

async function bannerText(): Promise<string> {
  const banners = await screen.findAllByRole('status')
  return banners.map((b) => b.textContent ?? '').join('\n')
}

describe('MediaPanel — the silent-wand law (a wand click never ends in silence)', () => {
  it('a throwing tab service voices honestly (the real chain owns the throw)', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      const u = String(url)
      if (u === '/infer-gallery/runs') return runsFeed([videoRun()])
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      if (u.startsWith('/infer-gallery/flow?run_id=')) return snapshotSidecar()
      if (u === '/v1/bench/main') return benchRev()
      if (u === '/v1/bench/ensure') return benchEnsured()
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    // the run load succeeds through the probe (the bench CAS load
    // rode fine) — the death is the HOST's open, after the restore
    render(<MediaPanel useTabInfo={() => tabWith(() => { throw new Error('tab host tore down') })} />)
    fireEvent.click(await wand())
    expect(await bannerText()).toContain('open failed: the cards tab refused the open (tab host tore down)')
    // the grid survives — the wand is still there to press again
    expect(screen.getByLabelText('Open as cards — this run')).toBeTruthy()
    // every exit drops the restoring voice — a stuck voice names a
    // hung door, never a forgotten flag
    await waitFor(() => { expect(screen.queryByText(/restoring/i)).toBeNull() })
  })

  it('a dead network voices honestly (the real loader guards its own doors)', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      const u = String(url)
      if (u === '/infer-gallery/runs') return runsFeed([videoRun()])
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      // everything past the feeds is down — the loader's own catch
      // voices, never the console alone
      return Promise.reject(new TypeError('restoration lane down'))
    })
    const opened: string[] = []
    render(<MediaPanel useTabInfo={() => tabWith((a: string) => { opened.push(a) })} />)
    fireEvent.click(await wand())
    expect(await bannerText()).toContain('open failed: bench load failed — restoration lane down')
    expect(opened).toEqual([])
    await waitFor(() => { expect(screen.queryByText(/restoring/i)).toBeNull() })
  })

  it('a torn draft fallback voices honestly (the fallback is awaited, never a bare void)', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      const u = String(url)
      if (u === '/infer-gallery/runs') return runsFeed([videoRun({ draft_id: 'd9' })])
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      // the sidecar keeps no record (200 with no flow) — the row
      // draft is the lawful fallback, and its doc door is down
      if (u.startsWith('/infer-gallery/flow?run_id=')) {
        return Promise.resolve(new Response('{}', { status: 200 }))
      }
      return Promise.reject(new TypeError('draft door down'))
    })
    const opened: string[] = []
    render(<MediaPanel useTabInfo={() => tabWith((a: string) => { opened.push(a) })} />)
    fireEvent.click(await wand())
    expect(await bannerText()).toContain('open failed: bench load failed — draft door down')
    expect(opened).toEqual([])
    await waitFor(() => { expect(screen.queryByText(/restoring/i)).toBeNull() })
    expect(screen.getByLabelText('Open as cards — this run')).toBeTruthy()
  })

  it('the tile names the in-flight restore (a hung door reads as activity, never silence)', async () => {
    // the sidecar parks mid-flight: the probe address is captured
    // but the chain has not settled — the voice must already read
    let release!: () => void
    const gate = new Promise<Response>((resolve) => {
      release = () => { void snapshotSidecar().then(resolve) }
    })
    vi.stubGlobal('fetch', (url: string) => {
      const u = String(url)
      if (u === '/infer-gallery/runs') return runsFeed([videoRun()])
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      if (u.startsWith('/infer-gallery/flow?run_id=')) return gate
      if (u === '/v1/bench/main') return benchRev()
      if (u === '/v1/bench/ensure') return benchEnsured()
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    const opened: string[] = []
    render(<MediaPanel useTabInfo={() => tabWith((a: string) => { opened.push(a) })} />)
    fireEvent.click(await wand())
    // pending: the voice reads, the tab has NOT switched yet
    expect(await screen.findByText(/restoring/i)).toBeTruthy()
    expect(opened).toEqual([])
    release()
    await waitFor(() => { expect(opened).toEqual(['dsh-resource://cards/bench/main']) })
    // settled: the voice drops with the switch
    await waitFor(() => { expect(screen.queryByText(/restoring/i)).toBeNull() })
  })

  it('the wand names itself with a native title and renders zero tooltip elements (the no-overlay law)', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      const u = String(url)
      if (u === '/infer-gallery/runs') return runsFeed([videoRun()])
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    const { container } = render(<MediaPanel useTabInfo={() => tabWith(() => { /* unclicked */ })} />)
    const el = await wand()
    // the hover text rides the platform attribute — no overlay
    // element exists to cover the 13px target or intercept its
    // pointer on any host primitive version
    expect(el.getAttribute('title')).toBe(galleryCopy.wandTooltip)
    expect(el.parentElement?.className).not.toMatch(/tipAnchor/)
    // a real hover dwell past every tooltip delay: still no tooltip
    // element anywhere (a Tip-wrapped wand renders its bubble here)
    fireEvent.mouseEnter(el)
    fireEvent.focus(el)
    await new Promise((r) => { setTimeout(r, 400) })
    expect(container.querySelectorAll('[role="tooltip"]').length).toBe(0)
    expect(document.querySelectorAll('[role="tooltip"]').length).toBe(0)
  })
})
