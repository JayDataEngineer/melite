// @vitest-environment jsdom
/**
 * MediaPanel — THE FULL-PORT FEATURE BATTERY (2026-09-11):
 * every feature the media sidebar had before the migrations, pinned at
 * the DOM level over stubbed feeds. jsdom + Testing Library; fetch is
 * stubbed per-test — no estate, no live routes, fully offline.
 *
 * SINGLE-TAB SHAPE (operator order, later the same day): ONE sidebar
 * tab — the drafts surface lives exclusively behind the panel's
 * segmented Flows/Artifacts toggle (the flows face). The deleted
 * package's standalone Flows tab is not restored, so every drafts
 * test below drives the flows face, never a second component.
 *
 * The battery is the deleted dsh-media package's panels.test.tsx,
 * upgraded for the port's two deltas: the feeds ride the gallery's OWN
 * routes (/infer-gallery/runs + /infer-gallery/drafts), and the bench
 * load rides the CAS read-modify-write (GET /v1/bench/main first,
 * expect_rev rides the ensure).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { callsTextOf, flatten, kindOf, MediaPanel } from '../src/client/MediaPanel.tsx'
import type { GalleryRunRow } from '../src/client/decode.ts'

const runsFeed = (runs: unknown[], errors: unknown[] = []): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ runs, errors }), { status: 200 }))
const draftsFeed = (drafts: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ drafts, errors: [] }), { status: 200 }))

const run = (over: Record<string, unknown>): GalleryRunRow =>
  ({ run_id: 'r1', created_at: 1, ...over }) as GalleryRunRow

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('kindOf — SSOT-derived classifier', () => {
  it('type beats URL on a contradictory row', () => {
    expect(kindOf({ type: 'model', url: 'x.mp4' })).toBe('model')
    expect(kindOf({ type: 'image', url: 'y.glb' })).toBe('image')
  })
  it('falls to URL extension in SSOT key order (video first)', () => {
    expect(kindOf({ url: 'z.mp4' })).toBe('video')
    expect(kindOf({ url: 'm.glb' })).toBe('model')
    expect(kindOf({ url: 'a.png' })).toBe('image')
    expect(kindOf({ url: 's.wav' })).toBe('audio')
  })
  it('mime prefixes are the last resort; unknown stays null', () => {
    expect(kindOf({ type: 'video/mp4', url: 'none' })).toBe('video')
    expect(kindOf({ type: 'audio', url: 'none' })).toBe('audio')
    expect(kindOf({ type: 'application/pdf', url: 'doc.pdf' })).toBe(null)
  })
  it('classifies the rewritten same-origin artifact URLs (query strings)', () => {
    expect(kindOf({ url: '/infer-gallery/artifact?path=run-x%2Fgen%2Fa.mp4' })).toBe('video')
    expect(kindOf({ url: '/infer-gallery/artifact?path=run-x%2Fgen%2Fb.glb' })).toBe('model')
  })
})

describe('callsTextOf — untrusted params door', () => {
  it('reads a structurally-valid calls[0].text and collapses whitespace', () => {
    expect(callsTextOf({ calls: [{ text: '  a \n b ' }] })).toBe('a b')
  })
  it('refuses every malformed shape', () => {
    expect(callsTextOf(null)).toBe('')
    expect(callsTextOf('x')).toBe('')
    expect(callsTextOf({})).toBe('')
    expect(callsTextOf({ calls: 'x' })).toBe('')
    expect(callsTextOf({ calls: [] })).toBe('')
    expect(callsTextOf({ calls: [{}] })).toBe('')
    expect(callsTextOf({ calls: [{ text: 42 }] })).toBe('')
  })
})

describe('flatten — the archive projection', () => {
  it('labels from prompt, then name, then params.calls[0].text, then flow', () => {
    const items = flatten([
      run({ prompt: 'a red cube', artifacts: [{ url: '/1.png', type: 'image' }] }),
      run({ run_id: 'r2', name: 'named flow', artifacts: [{ url: '/2.png', type: 'image' }] }),
      run({ run_id: 'r3', name: '', params: { calls: [{ text: 'story text' }] }, artifacts: [{ url: '/3.png', type: 'image' }] }),
      run({ run_id: 'r4', name: '', artifacts: [{ url: '/4.png', type: 'image' }] }),
    ])
    expect(items.map((i) => i.head)).toEqual(['"a red cube"', '"named flow"', '"story text"', 'r4'])
  })
  it('dedups by url and dedups the label whitespace; newest-first sort', () => {
    const items = flatten([
      run({ created_at: 10, artifacts: [{ url: '/a.mp4', type: 'video' }, { url: '/a.mp4', type: 'video' }] }),
      run({ run_id: 'r2', created_at: 20, artifacts: [{ url: '/b.png', type: 'image' }] }),
    ])
    expect(items.map((i) => i.url)).toEqual(['/b.png', '/a.mp4'])
  })
  it('FINAL FILM = video without a _w<idx>_<hash> suffix; poster map rides siblings', () => {
    const items = flatten([
      run({ artifacts: [
        { url: '/film.mp4', name: 'film.mp4', type: 'video' },
        { url: '/film_last_frame.png', name: 'film_last_frame.png', type: 'image' },
        { url: '/film_w1_ab12f.mp4', name: 'film_w1_ab12f.mp4', type: 'video' },
        { url: '/film_w1_ab12f_last_frame.png', name: 'film_w1_ab12f_last_frame.png', type: 'image' },
      ] }),
    ])
    const film = items.find((i) => i.file === 'film.mp4')!
    const windowFilm = items.find((i) => i.file === 'film_w1_ab12f.mp4')!
    expect(film.final).toBe(true)
    expect(windowFilm.final).toBe(false)
    // each film's poster is its OWN _last_frame sibling (stem-keyed)
    expect(film.poster).toBe('/film_last_frame.png')
    expect(windowFilm.poster).toBe('/film_w1_ab12f_last_frame.png')
  })
  it('the image-flood guard drops numbered frame dumps past 20 images', () => {
    const arts = [] as Array<{ url: string; type: string; name: string }>
    for (let i = 1; i <= 25; i++) arts.push({ url: `/f_${String(i).padStart(4, '0')}_.png`, name: `f_${String(i).padStart(4, '0')}_.png`, type: 'image' })
    arts.push({ url: '/hero.png', name: 'hero.png', type: 'image' })
    const items = flatten([run({ artifacts: arts })])
    expect(items.some((i) => i.file === 'f_0001_.png')).toBe(false)
    expect(items.some((i) => i.file === 'hero.png')).toBe(true)
  })
})

describe('MediaPanel — stubbed feed over the gallery routes', () => {
  it('renders chips from the merged grid and surfaces capped runs', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([
            run({ artifacts: [{ url: '/v/a.mp4', type: 'video' }, { url: '/v/a_last_frame.png', type: 'image' }] }),
            run({ run_id: 'r2', artifacts: [{ url: '/v/m.glb', type: 'model' }] }),
            run({ run_id: 'r3', truncated: { listed: 3, total: 40 }, artifacts: [{ url: '/v/i.png', type: 'image' }] }),
          ])
        : draftsFeed([]))
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText(/3 runs · 4 artifacts/)).toBeTruthy() })
    expect(screen.getByText(/1 capped/)).toBeTruthy()
    expect(screen.getByText('All 4')).toBeTruthy()
    expect(screen.getByText('Video 1')).toBeTruthy()
    expect(screen.getByText('Images 2')).toBeTruthy()
    expect(screen.getByText('3D 1')).toBeTruthy()
  })

  it('video tile click opens a native <video controls> overlay', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ prompt: 'a walking robot', artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    const tile = await waitFor(() => {
      const el = screen.getByText(/walking robot/).closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(tile)
    const video = document.querySelector('video[controls]') as HTMLVideoElement | null
    expect(video).toBeTruthy()
    expect(video?.getAttribute('src')).toContain('/v/walk.mp4')
    // Esc (the Modal primitive's own document listener) closes the overlay.
    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitFor(() => { expect(document.querySelector('video[controls]')).toBeNull() })
  })

  it('audio tile click opens a native <audio controls> overlay', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ name: 'the song', artifacts: [{ url: '/v/tune.wav', type: 'audio' }] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    const tile = await waitFor(() => {
      const el = screen.getByText(/tune\.wav/).closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(tile)
    const audio = document.querySelector('audio[controls]') as HTMLAudioElement | null
    expect(audio).toBeTruthy()
    expect(audio?.getAttribute('src')).toContain('/v/tune.wav')
  })

  it('image tile click opens the lightbox <img>', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ prompt: 'a still', artifacts: [{ url: '/v/pic.png', type: 'image' }] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    const tile = await waitFor(() => {
      const el = screen.getByText(/pic\.png/).closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(tile)
    const img = document.querySelector('[role="dialog"] img') as HTMLImageElement | null
    expect(img).toBeTruthy()
    expect(img?.getAttribute('src')).toContain('/v/pic.png')
    // the caption law: "head" — time · file (the overlay's copy; the
    // tile caption carries the same head, so both match)
    expect(screen.getAllByText(/a still/).length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText(/pic\.png/).length).toBeGreaterThanOrEqual(2)
  })

  it('no film badges anything (the FINAL FILM tag is dead); a model badges 3D', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [
            { url: '/v/film.mp4', name: 'film.mp4', type: 'video' },
            { url: '/v/scene.glb', name: 'scene.glb', type: 'model' },
          ] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText('3D')).toBeTruthy() })
    expect(screen.queryByText('FINAL FILM')).toBeNull()
  })

  it('the video tile poster comes from the sibling poster map (as the video still — never a broken img)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [
            { url: '/v/film.mp4', name: 'film.mp4', type: 'video' },
            { url: '/v/film_last_frame.png', name: 'film_last_frame.png', type: 'image' },
          ] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    const tile = await waitFor(() => {
      const v = document.querySelector('button video:not([controls])') as HTMLVideoElement | null
      expect(v).toBeTruthy()
      return v as HTMLVideoElement
    })
    expect(tile.getAttribute('src')).toBe('/v/film.mp4')
    expect(tile.getAttribute('poster')).toBe('/v/film_last_frame.png')
    expect(document.querySelector('button img[src="/v/film.mp4"]')).toBeNull()
  })

  it('a posterless video tile renders its own first frame (muted, metadata-only — never autoplay)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [
            { url: '/v/clip.mp4', name: 'clip.mp4', type: 'video' },
            { url: '/v/film_w1_ab12f.mp4', name: 'film_w1_ab12f.mp4', type: 'video' },
          ] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    const tiles = await waitFor(() => {
      const vs = Array.from(document.querySelectorAll('button video:not([controls])')) as HTMLVideoElement[]
      expect(vs).toHaveLength(2)
      return vs
    })
    for (const tile of tiles) {
      expect(tile.muted).toBe(true)
      expect(tile.getAttribute('preload')).toBe('metadata')
      expect(tile.hasAttribute('autoplay')).toBe(false)
    }
    expect(tiles.some((t) => t.getAttribute('src') === '/v/clip.mp4')).toBe(true)
    // the window film has no still sibling: no poster attr, the first frame shows
    const window = tiles.find((t) => t.getAttribute('src') === '/v/film_w1_ab12f.mp4') as HTMLVideoElement
    expect(window.hasAttribute('poster')).toBe(false)
  })

  it('the wand is a history icon (no CARDS text on the tile)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/clip.mp4', name: 'clip.mp4', type: 'video' }] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    const wand = await waitFor(() => screen.getByLabelText('Open as cards — this run') as HTMLElement)
    expect(wand.textContent).not.toMatch(/CARDS/)
    expect(wand.querySelector('svg')).toBeTruthy()
  })

  it('model tile opens the estate-artifact resource, with a download fallback', async () => {
    // The tab's navigation face (the standard hook every tab body
    // receives) stubbed: capture what the panel asks the sidebar to open.
    const opened: string[] = []
    const useTabInfo = (): object => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    })
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/scene.glb', type: 'model' }] })])
        : draftsFeed([]))
    render(<MediaPanel useTabInfo={useTabInfo as never} />)
    const tile = await waitFor(() => {
      const el = screen.getByText(/scene\.glb/).closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(tile)
    // The affordance + the fallback both render in the overlay.
    const open = screen.getByText(/open 3D view in sidebar/)
    expect(open).toBeTruthy()
    expect(screen.getByText(/download scene\.glb/)).toBeTruthy()
    // The click routes through the tab action as an estate-artifact
    // address carrying the b64url of the SAME-ORIGIN artifact URL.
    fireEvent.click(open)
    expect(opened).toHaveLength(1)
    expect(opened[0].startsWith('dsh-resource://estate-artifact/')).toBeTruthy()
    const b64 = opened[0].slice('dsh-resource://estate-artifact/'.length)
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : ''
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/') + pad), c => c.charCodeAt(0)))
    expect(decoded).toBe('/v/scene.glb')
  })

  it('model tile without the tab hook surfaces an honest error, never a silent no-op', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/scene.glb', type: 'model' }] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    const tile = await waitFor(() => {
      const el = screen.getByText(/scene\.glb/).closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(tile)
    fireEvent.click(screen.getByText(/open 3D view in sidebar/))
    // TWO honest absences can now be on screen at once (2026-09-26):
    // the sidebar-tab door's missing tab service, AND the inline viewer's
    // own refusal (jsdom has no WebGL, which is exactly the arm that
    // must speak). Both are matched; the sidebar one is the subject.
    await waitFor(() => { expect(screen.getAllByText(/3D view unavailable/).length).toBeGreaterThanOrEqual(1) })
    expect(screen.getAllByText(/sidebar tab service is not loaded/).length).toBeGreaterThanOrEqual(1)
    // The download fallback still carries the artifact.
    expect(screen.getByText(/download scene\.glb/)).toBeTruthy()
  })

  it('the feed error surfaces in the banner (the route is down)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? Promise.resolve(new Response(JSON.stringify({ error: 'estate_unreachable' }), { status: 502 }))
        : draftsFeed([]))
    render(<MediaPanel />)
    expect(await screen.findByText(/failed to load runs: estate_unreachable/)).toBeTruthy()
  })

  it('rows without run_id are dropped LOUDLY into the gateway notes', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/i.png', type: 'image' }] }), { created_at: 5 }])
        : draftsFeed([]))
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText(/1 runs · 1 artifacts/)).toBeTruthy() })
    expect(screen.getByText(/gateway runs: dropped 1 rows without run_id/)).toBeTruthy()
  })

  it('refresh (a DSH Button) re-fetches the runs route', async () => {
    let fetched = 0
    vi.stubGlobal('fetch', (url: string) => {
      if (url !== '/infer-gallery/runs') return draftsFeed([])
      fetched += 1
      return runsFeed([run({ artifacts: [{ url: '/v/i.png', type: 'image' }] })])
    })
    render(<MediaPanel />)
    await waitFor(() => { expect(fetched).toBeGreaterThanOrEqual(1) })
    fireEvent.click(screen.getByRole('button', { name: /refresh/ }))
    await waitFor(() => { expect(fetched).toBeGreaterThanOrEqual(2) })
  })
})

describe('MediaPanel — the flows face + the bench CAS load', () => {
  const draftDoc = { draft_id: 'd1', status: 'ready', intent: 'the card', stages: [{ id: 's_1', engine: 'comfyui' }] }

  const stubBench = (revResponse: () => Response): { bodies: Array<Record<string, unknown>>; gets: string[] } => {
    const bodies: Array<Record<string, unknown>> = []
    const gets: string[] = []
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u === '/infer-gallery/runs') return runsFeed([])
      if (u === '/infer-gallery/drafts') return draftsFeed([{ draft_id: 'd1', name: 'card one', model: 'qwen' }])
      if (u === '/v1/flows/drafts/d1') return Promise.resolve(new Response(JSON.stringify(draftDoc), { status: 200 }))
      if (u === '/v1/bench/main') { gets.push(u); return Promise.resolve(revResponse()) }
      if (u === '/v1/bench/ensure') {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
        return Promise.resolve(new Response(JSON.stringify({ draft_id: 'bench-main', rev: 4, stages: draftDoc.stages }), { status: 200 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    return { bodies, gets }
  }

  it('draft click runs the CAS read-modify-write then opens the cards bench', async () => {
    const opened: string[] = []
    const { bodies, gets } = stubBench(() => new Response(JSON.stringify({ draft_id: 'bench-main', rev: 3 }), { status: 200 }))
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    // switch to the flows face
    fireEvent.click(await screen.findByText(/Flows 1/))
    const row = await waitFor(() => {
      const el = screen.getByText('card one').closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(row)
    await waitFor(() => { expect(opened).toEqual(['dsh-resource://cards/bench/main']) })
    // THE CAS LAW: the bench row was read first, its rev rode as expect_rev.
    expect(gets).toEqual(['/v1/bench/main'])
    expect(bodies).toHaveLength(1)
    expect(bodies[0]).toEqual({
      session: 'main', author: 'user', stages: draftDoc.stages,
      intent: 'the card', expect_rev: 3, overwrite: true,
    })
  })

  it('a missing bench births (no expect_rev) — the only arm that may create', async () => {
    const opened: string[] = []
    const { bodies } = stubBench(() => new Response(JSON.stringify({ error: 'bench/not-found' }), { status: 502 }))
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    fireEvent.click(await screen.findByText(/Flows 1/))
    fireEvent.click(await waitFor(() => screen.getByText('card one').closest('button') as HTMLElement))
    await waitFor(() => { expect(opened).toEqual(['dsh-resource://cards/bench/main']) })
    expect(bodies).toHaveLength(1)
    expect('expect_rev' in bodies[0]).toBe(false)
  })

  it('a refusing bench door surfaces the door\'s own error text, never a throw (the flows face)', async () => {
    const opened: string[] = []
    vi.stubGlobal('fetch', (url: string) => {
      const u = String(url)
      if (u === '/infer-gallery/runs') return runsFeed([])
      if (u === '/infer-gallery/drafts') return draftsFeed([{ draft_id: 'd1', name: 'card one', model: 'qwen' }])
      if (u === '/v1/flows/drafts/d1') return Promise.resolve(new Response(JSON.stringify(draftDoc), { status: 200 }))
      if (u === '/v1/bench/main') return Promise.resolve(new Response(JSON.stringify({ draft_id: 'bench-main', rev: 3 }), { status: 200 }))
      return Promise.resolve(new Response(JSON.stringify({ error: 'stale expect_rev' }), { status: 409 }))
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    fireEvent.click(await screen.findByText(/Flows 1/))
    fireEvent.click(await waitFor(() => screen.getByText('card one').closest('button') as HTMLElement))
    // the failed open never routes anywhere — and the door's own text
    // surfaces when the artifacts face renders the action error.
    fireEvent.click(screen.getByText(/Artifacts/))
    expect(await screen.findByText(/the bench refused the load \(stale expect_rev\)/)).toBeTruthy()
    expect(opened).toEqual([])
  })

  it('no tab hook → honest error on draft click, never a silent no-op (surfaced on the artifacts face)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      String(url) === '/infer-gallery/runs'
        ? runsFeed([])
        : draftsFeed([{ draft_id: 'd1', name: 'card one', model: 'qwen' }]))
    render(<MediaPanel />)
    fireEvent.click(await screen.findByText(/Flows 1/))
    fireEvent.click(await waitFor(() => screen.getByText('card one').closest('button') as HTMLElement))
    fireEvent.click(screen.getByText(/Artifacts/))
    expect(await screen.findByText(/Media Flow view unavailable/)).toBeTruthy()
  })
})

describe('MediaPanel — the wand restores the run onto the bench', () => {
  const draftDoc = { draft_id: 'd9', status: 'ready', intent: 'walking card', stages: [{ id: 's_1', engine: 'comfyui' }] }

  it('the history wand reads the run sidecar first and falls back to the row draft only when the sidecar keeps no record', async () => {
    const opened: string[] = []
    const bodies: Array<Record<string, unknown>> = []
    const hits: string[] = []
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      const u = String(url)
      hits.push(u)
      if (u === '/infer-gallery/runs') {
        return runsFeed([run({ draft_id: 'd9', artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
      }
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      if (u === '/v1/flows/drafts/d9') return Promise.resolve(new Response(JSON.stringify(draftDoc), { status: 200 }))
      if (u === '/v1/bench/main') return Promise.resolve(new Response(JSON.stringify({ draft_id: 'bench-main', rev: 3 }), { status: 200 }))
      if (u === '/v1/bench/ensure') {
        bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
        return Promise.resolve(new Response(JSON.stringify({ draft_id: 'bench-main', rev: 4 }), { status: 200 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    const wand = await waitFor(() => {
      const el = screen.getByLabelText('Open as cards — this run')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(wand)
    await waitFor(() => { expect(opened).toEqual(['dsh-resource://cards/bench/main']) })
    // RUN-FIRST: the sidecar is always consulted; the row draft serves
    // only because this sidecar keeps no recoverable record.
    expect(hits.some((u) => u.startsWith('/infer-gallery/flow?'))).toBe(true)
    expect(bodies).toHaveLength(1)
    expect(bodies[0]).toEqual({
      session: 'main', author: 'user', stages: draftDoc.stages,
      intent: 'walking card', expect_rev: 3, overwrite: true,
    })
  })

  it('RUN-FIRST — a run with a live row draft AND a card_snapshot restores the snapshot, never the live draft', async () => {
    const opened: string[] = []
    const hits: string[] = []
    const ensures: Record<string, unknown>[] = []
    const liveDraft = { draft_id: 'd9', status: 'ready', intent: 'the draft as edited AFTER the run', stages: [{ id: 's_0', engine: 'comfyui', card: 'image-gen', params: { prompt: 'edited later' } }] }
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      const u = String(url)
      hits.push(u)
      if (u === '/infer-gallery/runs') {
        return runsFeed([run({ draft_id: 'd9', artifacts: [{ url: '/v/ran.png', type: 'image' }] })])
      }
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      if (u.startsWith('/infer-gallery/flow?run_id=')) {
        return Promise.resolve(new Response(JSON.stringify({
          run_id: 'r1',
          flow: {
            draft_id: 'd9',
            card_snapshot: { card: 'image-gen', params: { prompt: 'the prompt that RAN' } },
            artifacts: ['/x/data/runs/output/run-0f1e2d-r1/generate/out.png'],
          },
          request: null,
        }), { status: 200 }))
      }
      if (u === '/v1/flows/drafts/d9') return Promise.resolve(new Response(JSON.stringify(liveDraft), { status: 200 }))
      if (u === '/v1/bench/main') return Promise.resolve(new Response(JSON.stringify({ rev: 7 }), { status: 200 }))
      if (u === '/v1/bench/ensure') {
        ensures.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>)
        return Promise.resolve(new Response(JSON.stringify({ draft_id: 'bench-main', rev: 8 }), { status: 200 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    fireEvent.click(await waitFor(() => screen.getByLabelText('Open as cards — this run') as HTMLElement))
    await waitFor(() => { expect(opened).toEqual(['dsh-resource://cards/bench/main']) })
    // the live draft door is never read — the run's own record wins.
    expect(hits).not.toContain('/v1/flows/drafts/d9')
    expect(ensures[0]?.['stages']).toEqual([
      { id: 's_0', engine: 'comfyui', card: 'image-gen', params: { prompt: 'the prompt that RAN' }, inputs: {}, outputs: {}, provenance: 'restored', result: { run_id: 'r1', url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/generate/out.png'), artifacts: { 'run-0f1e2d-r1/generate/out.png': '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/generate/out.png') }, assetUrls: ['/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/generate/out.png')] } },
    ])
    expect(ensures[0]?.['intent']).toBe('the prompt that RAN')
  })

  it('wand without a row draft resolves through the sidecar, then restores', async () => {
    const opened: string[] = []
    const hits: string[] = []
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      const u = String(url)
      hits.push(u)
      if (u === '/infer-gallery/runs') {
        return runsFeed([run({ artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
      }
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      if (u.startsWith('/infer-gallery/flow?run_id=')) {
        return Promise.resolve(new Response(JSON.stringify({ run_id: 'r1', flow: { draft_id: 'd-side' } }), { status: 200 }))
      }
      if (u === '/v1/flows/drafts/d-side') return Promise.resolve(new Response(JSON.stringify(draftDoc), { status: 200 }))
      if (u === '/v1/bench/main') return Promise.resolve(new Response(JSON.stringify({ error: 'bench/not-found' }), { status: 502 }))
      if (u === '/v1/bench/ensure') {
        return Promise.resolve(new Response(JSON.stringify({ draft_id: 'bench-main', rev: 1 }), { status: 200 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    fireEvent.click(await waitFor(() => screen.getByLabelText('Open as cards — this run') as HTMLElement))
    await waitFor(() => { expect(opened).toEqual(['dsh-resource://cards/bench/main']) })
    expect(hits).toContain('/infer-gallery/flow?run_id=r1')
  })

  it('stroke 45 — a run WITH a card_snapshot restores THAT card exactly; the living bench is never read', async () => {
    const opened: string[] = []
    const hits: string[] = []
    const ensures: Record<string, unknown>[] = []
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      const u = String(url)
      hits.push(u)
      if (u === '/infer-gallery/runs') return runsFeed([run({ draft_id: 'bench-main', artifacts: [{ url: '/v/red.png', type: 'image' }] })])
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      if (u.startsWith('/infer-gallery/flow?run_id=')) {
        return Promise.resolve(new Response(JSON.stringify({
          run_id: 'r1',
          flow: { draft_id: 'bench-main', card_snapshot: { card: 'image-edit', params: { model: 'qwen-img-edit-2511', prompt: 'red hair', draft_id: 'bench-main', test: false } }, artifacts: ['/x/data/runs/output/run-0f1e2d-r1/edit/out.png'] },
          request: null,
        }), { status: 200 }))
      }
      if (u === '/v1/bench/main') return Promise.resolve(new Response(JSON.stringify({ rev: 4 }), { status: 200 }))
      if (u === '/v1/bench/ensure') {
        ensures.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>)
        return Promise.resolve(new Response(JSON.stringify({ draft_id: 'bench-main', rev: 5 }), { status: 200 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    fireEvent.click(await waitFor(() => screen.getByLabelText('Open as cards — this run') as HTMLElement))
    await waitFor(() => { expect(opened).toEqual(['dsh-resource://cards/bench/main']) })
    expect(hits).not.toContain('/v1/flows/drafts/bench-main')
    expect(ensures[0]?.['expect_rev']).toBe(4)
    expect(ensures[0]?.['stages']).toEqual([
      { id: 's_0', engine: 'comfyui', card: 'image-edit', params: { model: 'qwen-img-edit-2511', prompt: 'red hair' }, inputs: {}, outputs: {}, provenance: 'restored', result: { run_id: 'r1', url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/edit/out.png'), artifacts: { 'run-0f1e2d-r1/edit/out.png': '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/edit/out.png') }, assetUrls: ['/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/edit/out.png')] } },
    ])
  })

  it('stroke 45 — an OLD run (no snapshot) restores from its verbatim request body — the honest floor, never the bench draft', async () => {
    const opened: string[] = []
    const hits: string[] = []
    const ensures: Record<string, unknown>[] = []
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      const u = String(url)
      hits.push(u)
      if (u === '/infer-gallery/runs') return runsFeed([run({ draft_id: 'bench-main', artifacts: [{ url: '/v/beach.png', type: 'image' }] })])
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      if (u.startsWith('/infer-gallery/flow?run_id=')) {
        return Promise.resolve(new Response(JSON.stringify({
          run_id: 'r1',
          flow: { draft_id: 'bench-main', artifacts: ['/x/runs/output/run-0f1e2d-r1/generate/img.png'] },
          request: { model: 'anima', prompt: 'beach girl', variant: 'fp8', draft_id: 'bench-main' },
        }), { status: 200 }))
      }
      if (u === '/v1/bench/main') return Promise.resolve(new Response(JSON.stringify({ rev: 9 }), { status: 200 }))
      if (u === '/v1/bench/ensure') {
        ensures.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>)
        return Promise.resolve(new Response(JSON.stringify({ draft_id: 'bench-main', rev: 10 }), { status: 200 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    fireEvent.click(await waitFor(() => screen.getByLabelText('Open as cards — this run') as HTMLElement))
    await waitFor(() => { expect(opened).toEqual(['dsh-resource://cards/bench/main']) })
    expect(hits).not.toContain('/v1/flows/drafts/bench-main')
    expect(ensures[0]?.['stages']).toEqual([
      { id: 's_0', engine: 'comfyui', params: { model: 'anima', prompt: 'beach girl', variant: 'fp8' }, inputs: {}, outputs: { default: 'image' }, provenance: 'restored', result: { run_id: 'r1', url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/generate/img.png'), artifacts: { 'run-0f1e2d-r1/generate/img.png': '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/generate/img.png') }, assetUrls: ['/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/generate/img.png')] } },
    ])
  })

  it('stroke 45d — a run WITH a bench_snapshot restores the FULL workflow; the ran card carries the preview', async () => {
    const opened: string[] = []
    const ensures: Record<string, unknown>[] = []
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u === '/infer-gallery/runs') return runsFeed([run({ draft_id: 'bench-main', artifacts: [{ url: '/v/one.png', type: 'image' }] })])
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      if (u.startsWith('/infer-gallery/flow?run_id=')) {
        return Promise.resolve(new Response(JSON.stringify({
          run_id: 'r1',
          flow: {
            draft_id: 'bench-main',
            card_snapshot: { card: 'image-edit', params: { prompt: 'red hair' } },
            bench_snapshot: { intent: 'the beach flow', stages: [
              { id: 's_0', card: 'image-gen', engine: 'comfyui', params: { prompt: 'beach girl' }, result: { url: '/old.png' } },
              { id: 's_1', card: 'image-edit', engine: 'comfyui', params: { prompt: 'red hair' }, runStatus: 'done' },
            ] },
            artifacts: ['/x/runs/output/run-0f1e2d-r1/edit/out.png'],
          },
          request: null,
        }), { status: 200 }))
      }
      if (u === '/v1/bench/main') return Promise.resolve(new Response(JSON.stringify({ rev: 2 }), { status: 200 }))
      if (u === '/v1/bench/ensure') {
        ensures.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>)
        return Promise.resolve(new Response(JSON.stringify({ draft_id: 'bench-main', rev: 3 }), { status: 200 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    fireEvent.click(await waitFor(() => screen.getByLabelText('Open as cards — this run') as HTMLElement))
    await waitFor(() => { expect(opened).toEqual(['dsh-resource://cards/bench/main']) })
    const stages = ensures[0]?.['stages'] as Record<string, unknown>[]
    expect(stages).toHaveLength(2)
    expect(ensures[0]?.['intent']).toBe('the beach flow')
    // stale run state stripped; provenance restored
    expect(stages?.[0]).not.toHaveProperty('result')
    expect(stages?.[0]?.['provenance']).toBe('restored')
    // THE RAN CARD carries the run's preview
    expect(stages?.[1]?.['result']).toEqual({ run_id: 'r1', url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/edit/out.png'), artifacts: { 'run-0f1e2d-r1/edit/out.png': '/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/edit/out.png') }, assetUrls: ['/infer-gallery/artifact?path=' + encodeURIComponent('run-0f1e2d-r1/edit/out.png')] })
    expect(stages?.[1]).not.toHaveProperty('runStatus')
  })

  it('a run whose sidecar names no draft states it honestly — no bench write, no open', async () => {
    const opened: string[] = []
    let ensured = 0
    vi.stubGlobal('fetch', (url: string) => {
      const u = String(url)
      if (u === '/infer-gallery/runs') {
        return runsFeed([run({ artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
      }
      if (u === '/infer-gallery/drafts') return draftsFeed([])
      if (u.startsWith('/infer-gallery/flow?')) {
        return Promise.resolve(new Response(JSON.stringify({ run_id: 'r1', flow: { status: 'completed' } }), { status: 200 }))
      }
      if (u === '/v1/bench/ensure') {
        ensured += 1
        return Promise.resolve(new Response('{}', { status: 200 }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
    render(<MediaPanel useTabInfo={() => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    }) as never} />)
    fireEvent.click(await waitFor(() => screen.getByLabelText('Open as cards — this run') as HTMLElement))
    expect(await screen.findByText(/keeps no card record/)).toBeTruthy()
    expect(opened).toEqual([])
    expect(ensured).toBe(0)
  })

  it('wand without the tab hook surfaces an honest error', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    const wand = await waitFor(() => {
      const el = screen.getByLabelText('Open as cards — this run')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(wand)
    expect(await screen.findByText(/Media Flow view unavailable/)).toBeTruthy()
  })
})

describe('MediaPanel — DSH primitive ports (no handrolls)', () => {
  const feed = (): void => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ prompt: 'a walking robot', draft_id: 'd9', artifacts: [{ url: '/v/walk.mp4', type: 'video' }] })])
        : draftsFeed([{ draft_id: 'd9', name: 'card nine', model: 'qwen' }]))
  }

  it('Flows/Artifacts segmented Pills switch the archive face', async () => {
    feed()
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText('Artifacts 1')).toBeTruthy() })
    fireEvent.click(screen.getByText('Flows 1'))
    expect(await screen.findByText('card nine')).toBeTruthy()
    fireEvent.click(screen.getByText('Artifacts 1'))
    expect(await screen.findByText(/walking robot/)).toBeTruthy()
  })

  it('wand carries the DSH Tooltip bubble on focus (native title gone)', async () => {
    feed()
    render(<MediaPanel />)
    const wand = await waitFor(() => {
      const el = screen.getByLabelText('Open as cards — this run')
      expect(el.closest('button')).toBeTruthy() // the tile stays the button
      return el as HTMLElement
    })
    expect(wand.getAttribute('title')).toBeNull()
    expect(screen.queryByText(/this run, live in the cards tab/)).toBeNull()
    fireEvent.focus(wand)
    expect(await screen.findByText(/this run, live in the cards tab/)).toBeTruthy()
  })

  it('search filters through the DSH Input, refresh is a DSH Button', async () => {
    feed()
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText(/1 runs · 1 artifacts/)).toBeTruthy() })
    const box = screen.getByPlaceholderText(/search prompt/) as HTMLInputElement
    expect(box.tagName).toBe('INPUT')
    fireEvent.change(box, { target: { value: 'zzz-no-match' } })
    expect(await screen.findByText('no artifacts match.')).toBeTruthy()
    fireEvent.change(box, { target: { value: '' } })
    expect(await screen.findByText(/walking robot/)).toBeTruthy()
  })

  it('the category chips filter the grid (Video keeps the film, drops the image)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ artifacts: [
            { url: '/v/a.mp4', type: 'video' },
            { url: '/v/a_last_frame.png', type: 'image' },
          ] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText('All 2')).toBeTruthy() })
    fireEvent.click(screen.getByText('Video 1'))
    await waitFor(() => {
      // the mp4 tile stays; the loose png tile is gone (its poster duty
      // already served on the film tile)
      expect(screen.getByText(/a\.mp4/)).toBeTruthy()
      expect(screen.queryByText(/a_last_frame\.png/)).toBeNull()
    })
  })
})

describe('MediaPanel — the flows face lists the drafts (the single-tab flows surface)', () => {
  it('renders the drafts rows with model + id behind the Flows toggle', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      String(url) === '/infer-gallery/runs'
        ? runsFeed([])
        : draftsFeed([
            { draft_id: 'd1', name: 'card one', model: 'qwen' },
            { draft_id: 'd2', name: 'another', model: 'ace-step' },
          ]))
    render(<MediaPanel />)
    fireEvent.click(await screen.findByText(/Flows 2/))
    expect(await screen.findByText('card one')).toBeTruthy()
    expect(screen.getByText(/qwen · d1/)).toBeTruthy()
    expect(screen.getByText('another')).toBeTruthy()
    expect(screen.getByText(/ace-step · d2/)).toBeTruthy()
  })

  it('an empty drafts feed states the honest empty copy', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      String(url) === '/infer-gallery/runs' ? runsFeed([]) : draftsFeed([]))
    render(<MediaPanel />)
    fireEvent.click(await screen.findByText(/Flows 0/))
    expect(await screen.findByText(/no composed cards yet/)).toBeTruthy()
  })
})

describe('MediaPanel — the modal delete + rename buttons (the mediasidebar popup modal)', () => {
  const GALLERY_URL = '/infer-gallery/artifact?path=' + encodeURIComponent('run-abc123-def/a.png')
  const galleryRun = (): GalleryRunRow => run({
    prompt: 'a deletable still',
    artifacts: [{ url: GALLERY_URL, name: 'a.png', type: 'image' }],
  })

  async function openModal(): Promise<HTMLElement> {
    const tile = await waitFor(() => {
      const el = screen.getByText(/a\.png/).closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(tile)
    await screen.findByTestId('drill-delete')
    return tile
  }

  it('delete unlinks the gallery artifact, closes the modal and reloads the feed', async () => {
    const seen: Array<{ url: string; init: unknown }> = []
    let runsCalls = 0
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init: unknown): Promise<Response> => {
      const target = String(url)
      seen.push({ url: target, init })
      if (target === '/infer-gallery/runs') {
        runsCalls += 1
        // after the delete the feed is empty (the file is gone).
        return runsCalls === 1 ? runsFeed([galleryRun()]) : runsFeed([])
      }
      if (target === '/infer-gallery/drafts') return draftsFeed([])
      if (target === '/infer-gallery/artifact-delete') {
        return new Response(JSON.stringify({ ok: true, path: 'run-abc123-def/a.png' }), { status: 200 })
      }
      throw new Error('unexpected fetch ' + target)
    }))
    render(<MediaPanel />)
    await openModal()
    fireEvent.click(screen.getByTestId('drill-delete'))
    fireEvent.click(screen.getByTestId('drill-delete-confirm'))
    await waitFor(() => { expect(screen.queryByTestId('drill-delete')).toBeNull() })
    const del = seen.find((s) => s.url === '/infer-gallery/artifact-delete')!
    expect(del).toBeTruthy()
    expect((del.init as { method?: string }).method).toBe('POST')
    expect((del.init as { body?: string }).body).toBe(JSON.stringify({ path: 'run-abc123-def/a.png' }))
    // the feed reloaded behind the close (two runs calls).
    await waitFor(() => { expect(runsCalls).toBeGreaterThanOrEqual(2) })
  })

  it('rename re-points the open preview onto the door answer and reloads behind it', async () => {
    const seen: Array<{ url: string; init: unknown }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init: unknown): Promise<Response> => {
      const target = String(url)
      seen.push({ url: target, init })
      if (target === '/infer-gallery/runs') return runsFeed([galleryRun()])
      if (target === '/infer-gallery/drafts') return draftsFeed([])
      if (target === '/infer-gallery/artifact-rename') {
        return new Response(JSON.stringify({
          ok: true,
          path: 'run-abc123-def/b.png',
          url: '/infer-gallery/artifact?path=' + encodeURIComponent('run-abc123-def/b.png'),
        }), { status: 200 })
      }
      throw new Error('unexpected fetch ' + target)
    }))
    render(<MediaPanel />)
    await openModal()
    fireEvent.click(screen.getByTestId('drill-rename'))
    const input = screen.getByTestId('drill-rename-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'b.png' } })
    fireEvent.click(screen.getByTestId('drill-rename-save'))
    // the preview re-points: the caption now names the new file.
    await waitFor(() => { expect(screen.getAllByText(/b\.png/).length).toBeGreaterThanOrEqual(1) })
    const ren = seen.find((s) => s.url === '/infer-gallery/artifact-rename')!
    expect((ren.init as { body?: string }).body).toBe(JSON.stringify({ path: 'run-abc123-def/a.png', name: 'b.png' }))
  })

  it('a non-gallery URL surfaces the honest error inside the modal (never closes)', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs'
        ? runsFeed([run({ prompt: 'a still', artifacts: [{ url: '/v/pic.png', name: 'pic.png', type: 'image' }] })])
        : draftsFeed([]))
    render(<MediaPanel />)
    const tile = await waitFor(() => {
      const el = screen.getByText(/pic\.png/).closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(tile)
    await screen.findByTestId('drill-delete')
    fireEvent.click(screen.getByTestId('drill-delete'))
    fireEvent.click(screen.getByTestId('drill-delete-confirm'))
    expect(await screen.findByTestId('drill-op-error')).toBeTruthy()
    expect(screen.getByText(/not a gallery artifact/)).toBeTruthy()
  })
})

describe('MediaPanel — selection, mass delete, pagination (2026-10-22 operator order)', () => {
  /** n gallery artifacts, one per run, newest first (created_at desc).
   *  Tile captions end in the file name, so the finder anchors the
   *  name at the caption's end AND behind a non-digit ('1.png' must
   *  not match the '21.png' caption). */
  const galleryItems = (n: number): GalleryRunRow[] =>
    Array.from({ length: n }, (_, i) =>
      run({
        run_id: `run-${i}`,
        created_at: n - i,
        prompt: i === 58 ? 'needle fiftyeight' : undefined,
        artifacts: [{
          url: '/infer-gallery/artifact?path=' + encodeURIComponent(`run-${i}/gen/${i}.png`),
          name: `${i}.png`,
          type: 'image',
        }],
      }))

  const tileOf = async (name: string): Promise<HTMLElement> =>
    waitFor(() => {
      const el = screen.getByText(new RegExp(`(?<![0-9])${name}\\.png$`)).closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })

  const feedOf = (rows: GalleryRunRow[]): void => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-gallery/runs' ? runsFeed(rows) : draftsFeed([]))
  }

  it('the grid paginates: one page mounts, the footer walks, a filter re-anchors to page 1', async () => {
    feedOf(galleryItems(61))
    render(<MediaPanel />)
    await waitFor(() => { expect(screen.getByText(/61 runs · 61 artifacts/)).toBeTruthy() })
    // page 1 only: the 61st artifact (60.png) is not mounted
    expect(screen.queryByText(/(?<![0-9])60\.png$/)).toBeNull()
    expect(screen.getByText(/page 1 of 2 · 61 artifacts/)).toBeTruthy()
    fireEvent.click(screen.getByText('Next ›'))
    expect(await screen.findByText(/(?<![0-9])60\.png$/)).toBeTruthy()
    expect(screen.queryByText(/(?<![0-9])0\.png$/)).toBeNull()
    expect(screen.getByText(/page 2 of 2 · 61 artifacts/)).toBeTruthy()
    fireEvent.click(screen.getByText('‹ Prev'))
    expect(await screen.findByText(/(?<![0-9])1\.png$/)).toBeTruthy()
    // a prompt filter re-anchors: one match stays on page 1, footer gone
    const box = screen.getByPlaceholderText(/search prompt/) as HTMLInputElement
    fireEvent.change(box, { target: { value: 'needle' } })
    expect(await screen.findByText(/(?<![0-9])58\.png$/)).toBeTruthy()
    expect(screen.queryByText(/page \d of/)).toBeNull()
  })

  it('select mode: tile clicks toggle instead of opening, the wand stands down, the armed verb deletes both', async () => {
    const seen: Array<{ url: string; body: unknown }> = []
    let runsCalls = 0
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: RequestInit): Promise<Response> => {
      const target = String(url)
      if (target === '/infer-gallery/runs') {
        runsCalls += 1
        return runsCalls === 1 ? runsFeed(galleryItems(2)) : runsFeed([])
      }
      if (target === '/infer-gallery/drafts') return draftsFeed([])
      if (target === '/infer-gallery/artifact-delete') {
        seen.push({ url: target, body: JSON.parse(String(init?.body)) })
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      throw new Error('unexpected fetch ' + target)
    }))
    render(<MediaPanel />)
    await screen.findByText(/2 runs · 2 artifacts/)
    // every tile carries its wand (2 tiles → 2 wands)
    expect(screen.getAllByLabelText('Open as cards — this run')).toHaveLength(2)

    fireEvent.click(screen.getByText('Select'))
    // the wand stands down in select mode — a tile click is selection
    expect(screen.queryByLabelText('Open as cards — this run')).toBeNull()
    fireEvent.click(await tileOf('0'))
    fireEvent.click(await tileOf('1'))
    expect(screen.getByText('2 selected')).toBeTruthy()
    // no overlay opened by a selection click
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    // THE ARM: the first press names the count, the next deletes
    fireEvent.click(screen.getByText('Delete selected'))
    expect(screen.getByText('Confirm delete 2?')).toBeTruthy()
    expect(seen).toHaveLength(0)
    fireEvent.click(screen.getByText('Confirm delete 2?'))

    await waitFor(() => { expect(seen).toHaveLength(2) })
    expect(seen.map((s) => (s.body as { path: string }).path).sort())
      .toEqual(['run-0/gen/0.png', 'run-1/gen/1.png'])
    // the mode exits and the feed reloaded behind it
    await waitFor(() => { expect(runsCalls).toBeGreaterThanOrEqual(2) })
    expect(screen.queryByText(/selected/)).toBeNull()
  })

  it('a partial mass delete speaks the tally and the failed tile stays visible', async () => {
    const rows = galleryItems(2)
    let runsCalls = 0
    vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: RequestInit): Promise<Response> => {
      const target = String(url)
      if (target === '/infer-gallery/runs') {
        runsCalls += 1
        // the failed file survives the delete: the reload returns it
        return runsFeed(runsCalls === 1 ? rows : rows.slice(1))
      }
      if (target === '/infer-gallery/drafts') return draftsFeed([])
      if (target === '/infer-gallery/artifact-delete') {
        const body = JSON.parse(String(init?.body)) as { path: string }
        if (body.path === 'run-0/gen/0.png') {
          return new Response(JSON.stringify({ error: 'file busy' }), { status: 500 })
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      throw new Error('unexpected fetch ' + target)
    }))
    render(<MediaPanel />)
    await screen.findByText(/2 runs · 2 artifacts/)
    fireEvent.click(screen.getByText('Select'))
    fireEvent.click(await tileOf('0'))
    fireEvent.click(await tileOf('1'))
    fireEvent.click(screen.getByText('Delete selected'))
    fireEvent.click(screen.getByText('Confirm delete 2?'))

    // the tally speaks in its OWN banner (never the feed-error face),
    // with the door's text; the survivor still renders (failed ops
    // keep data visible)
    expect(await screen.findByText(/deleted 1 · failed 1/)).toBeTruthy()
    expect(screen.getByText(/file busy/)).toBeTruthy()
    expect(screen.getByText(/(?<![0-9])1\.png$/)).toBeTruthy()
    expect(screen.queryByText(/(?<![0-9])0\.png$/)).toBeNull()
  })
})
