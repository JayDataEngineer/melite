/**
 * Client tests for the media family (audit gap 2): classifier
 * precedence, untrusted-params validation, panel rendering with a
 * stubbed feed, the 3D viewer seam, and the FlowsPanel no-seam error.
 * jsdom + Testing Library; fetch stubbed per-test — no gateway, no
 * live estate, fully offline.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'
import { callsTextOf, kindOf, MediaPanel } from '../MediaPanel.tsx'
import { FlowsPanel } from '../FlowsPanel.tsx'

const runsFeed = (runs: unknown[], errors: unknown[] = []): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ runs, errors }), { status: 200 }))
const draftsFeed = (drafts: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ drafts, errors: [] }), { status: 200 }))

const run = (over: Record<string, unknown>): unknown => ({ run_id: 'r1', created_at: 1, ...over })

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

describe('MediaPanel — stubbed feed', () => {
  it('renders chips from the merged grid and surfaces capped runs', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-media/runs'
        ? runsFeed([
            run({ artifacts: [{ url: '/v/a.mp4', type: 'video' }, { url: '/v/a_last_frame.png', type: 'image' }] }),
            run({ run_id: 'r2', artifacts: [{ url: '/v/m.glb' }] }),
            run({ run_id: 'r3', truncated: { listed: 3, total: 40 }, artifacts: [{ url: '/v/i.png' }] }),
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
      url === '/infer-media/runs'
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
  })

  it('model tile opens the estate-artifact resource, with a download fallback', async () => {
    // The tab's navigation face (the standard hook every tab body
    // receives) stubbed: capture what the panel asks the sidebar to open.
    const opened: string[] = []
    const useTabInfo = () => ({
      tab: { navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (a: string) => { opened.push(a) } } },
    })
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-media/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/scene.glb', type: 'model' }] })])
        : draftsFeed([]))
    render(<MediaPanel useTabInfo={useTabInfo} />)
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
      url === '/infer-media/runs'
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
    expect(await screen.findByText(/3D view unavailable/)).toBeTruthy()
    // The download fallback still carries the artifact.
    expect(screen.getByText(/download scene\.glb/)).toBeTruthy()
  })
})

describe('FlowsPanel — deck seam contract', () => {
  it('no seam installed → honest error on draft click', async () => {
    delete (window as unknown as Record<string, unknown>).__meliteDeckOpenWithDraft
    vi.stubGlobal('fetch', () => draftsFeed([{ draft_id: 'd1', name: 'card one', model: 'qwen' }]))
    render(<FlowsPanel />)
    const row = await waitFor(() => {
      const el = screen.getByText('card one').closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(row)
    expect(await screen.findByText(/Cards studio unavailable/)).toBeTruthy()
  })
})

describe('MediaPanel — DSH primitive ports (2026-09-09, no handrolls)', () => {
  const feed = (): void => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-media/runs'
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
      const el = screen.getByText('✦ CARDS')
      expect(el.closest('button')).toBeTruthy() // the tile stays the button
      return el as HTMLElement
    })
    expect(wand.getAttribute('title')).toBeNull()
    expect(screen.queryByText(/this run’s card, setup and ready/)).toBeNull()
    fireEvent.focus(wand)
    expect(await screen.findByText(/this run’s card, setup and ready/)).toBeTruthy()
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
})
