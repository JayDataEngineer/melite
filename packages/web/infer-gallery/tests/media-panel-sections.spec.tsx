// @vitest-environment jsdom
/**
 * MediaPanel sections — the faces the full-port battery doesn't pin:
 * the classifier's mime tail, the projection's hostile rows (shapeless
 * artifacts, id-less runs, poster-less windows, timeless rows), and
 * the panel rails (plural gateway notes, ragged drafts, wand keys,
 * headless captions).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { flatten, kindOf, MediaPanel } from '../src/client/MediaPanel.tsx'
import type { GalleryRunRow } from '../src/client/decode.ts'

const runsFeed = (runs: unknown[], errors: unknown[] = []): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ runs, errors }), { status: 200 }))
const draftsFeed = (drafts: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ drafts, errors: [] }), { status: 200 }))

const run = (over: Record<string, unknown>): GalleryRunRow =>
  ({ run_id: 'r1', created_at: 1, ...over }) as GalleryRunRow

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('kindOf — the mime tail', () => {
  it('mime prefixes past the SSOT keys; the doorless row stays null', () => {
    expect(kindOf({ type: 'audio/mpeg', url: 'none' })).toBe('audio')
    expect(kindOf({ type: 'image/png', url: 'none' })).toBe('image')
    expect(kindOf({} as never)).toBe(null)
  })
})

describe('flatten — hostile rows', () => {
  it('shapeless artifacts never reach the grid; an id-less run flattens bare (decode drops it upstream)', () => {
    const items = flatten([
      run({ artifacts: 'nope' }),
      run({ artifacts: [{ type: 'image' }] }),
      { artifacts: [{ url: '/x.png', type: 'image' }] } as never,
    ])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ url: '/x.png', runId: '', head: '' })
  })

  it('a long prompt ellipsizes; a timeless row reads empty', () => {
    const items = flatten([
      run({ prompt: 'x'.repeat(60), created_at: 'yesterday', artifacts: [{ url: '/l.png', type: 'image' }] }),
    ])
    expect(items).toHaveLength(1)
    expect(items[0].head).toBe('"' + 'x'.repeat(48) + '…"')
    expect(items[0].time).toBe('')
  })

  it('a poster-less window film reads empty; a thumbnail fills the gap', () => {
    const bare = flatten([
      run({ artifacts: [{ url: '/w_w1_ab12cd.mp4', name: 'w_w1_ab12cd.mp4', type: 'video' }] }),
    ])
    expect(bare).toHaveLength(1)
    expect(bare[0].final).toBe(false)
    expect(bare[0].poster).toBe('')
    const thumb = flatten([
      run({ thumbnail: '/t.png', artifacts: [{ url: '/w_w1_ab12cd.mp4', name: 'w_w1_ab12cd.mp4', type: 'video' }] }),
    ])
    expect(thumb[0].poster).toBe('/t.png')
  })
})

describe('MediaPanel — gateway notes and ragged drafts', () => {
  it('plural gateway notes read plural', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed(
            [run({ artifacts: [{ url: '/v/i.png', type: 'image' }] })],
            [{ gateway: 'a', message: 'first' }, { gateway: 'b', message: 'second' }],
          )
        : draftsFeed([]))
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText(/2 gateway notes/)).toBeTruthy() })
  })

  it('ragged drafts render honestly; an unkeyable row is dropped and counted (audit V-S4)', async () => {
    vi.stubGlobal('fetch', (url: string) => {
      const u = String(url)
      if (u === '/infer-gallery/runs') return runsFeed([])
      return draftsFeed([
        { draft_id: 'd1', name: '', model: '', source: 'https://cdn.example.com/pack' },
        { name: 'ghost', model: 'qwen' },
      ])
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: () => { /* opened rows carry ids */ } } },
    }) as never} />)
    fireEvent.click(await screen.findByText(/Flows 1/))
    // nameless → the id; modelless → 'card'; the source badge strips the scheme.
    expect(await screen.findByText('d1')).toBeTruthy()
    expect(screen.getByText(/card · d1/)).toBeTruthy()
    expect(screen.getByText('cdn.example.com/pack')).toBeTruthy()
    // THE UNKEYABLE ROW IS GONE, NOT RENDERED (audit V-S4): a draft
    // without a draft_id has no key to open a door with — it used to
    // render as a clickable face that did nothing; now it is dropped
    // at decode and the drop is counted into the panel's own error
    // channel, so a malformed wire can never pose as an empty click
    expect(screen.queryByText('ghost')).toBeNull()
    // the drop is COUNTED in the head (the runs notes' own law: the
    // list arm shows when the feed is empty, the count carries it
    // when rows render)
    expect(screen.getByText(/1 gateway note/)).toBeTruthy()
    expect(screen.queryByText(/failed to load/)).toBeNull()
  })
})

describe('MediaPanel — the wand keys and the headless caption', () => {
  const feed = (): void => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ flow: '', artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
        : draftsFeed([]))
  }

  it('Enter on the wand opens the cards error honestly; other keys stay quiet', async () => {
    feed()
    render(<MediaPanel />)
    const wand = await waitFor(() => screen.getByLabelText('Open as cards — this run') as HTMLElement)
    fireEvent.keyDown(wand, { key: 'Tab' })
    expect(screen.queryByText(/Media Flow view unavailable/)).toBeNull()
    fireEvent.keyDown(wand, { key: 'Enter' })
    expect(await screen.findByText(/Media Flow view unavailable/)).toBeTruthy()
  })

  it('a flow-less run captions without a head (no dangling dash)', async () => {
    feed()
    render(<MediaPanel />)
    const tile = await waitFor(() => screen.getByText(/walk\.mp4/).closest('button') as HTMLElement)
    expect(tile.textContent).not.toMatch(/—/)
  })
})

// ── THE OVERLAY WALK (2026-09-20, the operator's arrows): the
// gallery's opened artifact walks the FILTERED list — the adapter
// re-finds the full MediaItem by url so setPreview keeps its
// currency (id, poster, runId…).
describe('MediaPanel — the overlay walk', () => {
  it('drill-next walks the tiles\' list; the caption follows', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      String(url) === '/infer-gallery/runs'
        ? runsFeed([
            run({ run_id: 'rA', artifacts: [{ url: '/a/one.png', type: 'image', name: 'one.png' }] }),
            run({ run_id: 'rB', artifacts: [{ url: '/b/two.png', type: 'image', name: 'two.png' }] }),
          ])
        : draftsFeed([]))
    render(<MediaPanel />)
    const tile = await waitFor(() => {
      const img = document.querySelector('img[src="/a/one.png"]') as HTMLImageElement | null
      if (img === null) throw new Error('tile image not landed yet')
      const btn = img.closest('button') as HTMLElement | null
      if (btn === null) throw new Error('tile button not found')
      return btn
    })
    fireEvent.click(tile)
    await screen.findByLabelText('Close preview', {}, { timeout: 4000 })
    const hero = () => (document.querySelector('div[class*="lightbox"] img') as HTMLImageElement | null)?.getAttribute('src')
    expect(hero()).toBe('/a/one.png')
    fireEvent.click(screen.getByTestId('drill-next'))
    expect(hero()).toBe('/b/two.png')
    fireEvent.click(screen.getByTestId('drill-next')) // at the tail: HOLDS — the walk is a line, not a ring
    expect(hero()).toBe('/b/two.png')
  })
})
