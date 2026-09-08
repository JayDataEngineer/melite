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
import { setSidebarService } from '../apply-guard.ts'

const runsFeed = (runs: unknown[], errors: unknown[] = []): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ runs, errors }), { status: 200 }))
const draftsFeed = (drafts: unknown[]): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ drafts, errors: [] }), { status: 200 }))

const run = (over: Record<string, unknown>): unknown => ({ run_id: 'r1', created_at: 1, ...over })

beforeEach(() => { setSidebarService(null) })
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

  it('model tile routes through the sidebar viewer registry, with a download fallback', async () => {
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-media/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/scene.glb', type: 'model' }] })])
        : draftsFeed([]))
    // No viewer claims .glb → download fallback first.
    const { unmount } = render(<MediaPanel />)
    let tile = await waitFor(() => {
      const el = screen.getByText(/scene\.glb/).closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(tile)
    expect(screen.getByText(/download scene\.glb/)).toBeTruthy()
    fireEvent.click(document.body) // close overlay
    unmount()

    // Registry seam returns a viewer component → it renders with the URL.
    vi.stubGlobal('fetch', (url: string) =>
      url === '/infer-media/runs'
        ? runsFeed([run({ artifacts: [{ url: '/v/scene.glb', type: 'model' }] })])
        : draftsFeed([]))
    setSidebarService({
      matchFileViewer: (f: string) => f.endsWith('.glb')
        ? { component: ({ mediaUrl }: { mediaUrl?: string }) => <div data-fake-glb={mediaUrl}>3D</div> }
        : undefined,
    } as never)
    render(<MediaPanel />)
    tile = await waitFor(() => {
      const el = screen.getByText(/scene\.glb/).closest('button')
      expect(el).toBeTruthy()
      return el as HTMLElement
    })
    fireEvent.click(tile)
    const viewer = document.querySelector('[data-fake-glb]') as HTMLElement | null
    expect(viewer).toBeTruthy()
    expect(viewer?.getAttribute('data-fake-glb')).toContain('/v/scene.glb')
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
