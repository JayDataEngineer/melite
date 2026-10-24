// @vitest-environment jsdom
/**
 * THE CANONICAL TAB-BODY FACE (2026-10-24, the deliverables
 * receipt): the shell's `sidebar.right.pane.tab` slot threads its
 * session-scoped standard props to every registered body —
 * `useTabInfo` AND `sessionId` arrive as PROPS (the reference
 * consumer: dsh-client-ui-deliverables' ReviewTab destructures
 * exactly that face). MediaPanel IS that face; the 2026-11-06
 * factory (mediaTabBodyWith reading uiSession.adapter.current)
 * OVERWROTE the slot's own sessionId prop with an absent main
 * binding — every restore landed on 'main' (gallery-draft-open's
 * two-drive red). THIS wall pins the props-are-the-seam contract:
 *
 *   prop    — the sessionId PROP names the bench the draft load
 *             posts (never 'main' while a conversation seats it);
 *   reseat  — the renderer's SessionMaybeEntry re-keys the body on
 *             a session switch BY CONSTRUCTION (its epoch law); a
 *             NEW prop value reaches the NEXT gesture, live.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

import { MediaPanel } from '../src/client/MediaPanel.tsx'

const runsFeed = (): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ runs: [], errors: [] }), { status: 200 }))
const draftsFeed = (): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({
    drafts: [{ draft_id: 'bench-main', name: 'bench-main', model: 'image-gen' }],
    errors: [],
  }), { status: 200 }))

/** The doors a draft load rides: the doc, the CAS read (always a
 *  miss — a fresh bench births), and the ensure POST whose body this
 *  wall judges. Every call is recorded. */
function stubDoors(): Array<{ url: string; body: Record<string, unknown> }> {
  const posts: Array<{ url: string; body: Record<string, unknown> }> = []
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const u = String(url)
    if (u === '/infer-gallery/runs') return runsFeed()
    if (u === '/infer-gallery/drafts') return draftsFeed()
    if (u === '/v1/flows/drafts/bench-main') {
      return Promise.resolve(new Response(JSON.stringify({
        stages: [{ card: 'image-gen', params: {} }], intent: 'unit',
      }), { status: 200 }))
    }
    if (u === '/v1/bench/ensure') {
      posts.push({ url: u, body: JSON.parse(String(init?.body)) as Record<string, unknown> })
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }
    if (u.startsWith('/v1/bench/')) {
      // the CAS read: a miss (fresh bench births — no expect_rev)
      return Promise.resolve(new Response('no bench', { status: 404 }))
    }
    return Promise.resolve(new Response('{}', { status: 200 }))
  })
  return posts
}

/** The shell's tab seat (the slot's useTabInfo prop): records every
 *  openResource address — the bench ADDRESS names the session too. */
function tabSeat(): { opened: string[]; useTabInfo: () => unknown } {
  const opened: string[] = []
  return {
    opened,
    useTabInfo: () => ({
      tab: {
        navigation: { address: 'dsh-resource://media' },
        actions: { openResource: (address: string) => { opened.push(address) } },
      },
    }),
  }
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear() })

describe('the pane-tab body — the slot\'s sessionId prop is the seam', () => {
  it('the draft load names the prop\'s session, never the unattributed main', async () => {
    const posts = stubDoors()
    const tab = tabSeat()
    // THE SLOT'S STANDARD PROPS, verbatim (the ReviewTab face): the
    // shell hands useTabInfo AND sessionId to the body
    render(<MediaPanel useTabInfo={tab.useTabInfo as never} sessionId="session-11112222-3333-4444-5555-666677778888" />)
    fireEvent.click(await screen.findByText(/Flows 1/))
    fireEvent.click(await screen.findByText('bench-main'))
    const ensure = await waitFor(() => {
      const hit = posts.find((p) => p.url === '/v1/bench/ensure')
      if (hit === undefined) throw new Error('ensure never fired')
      return hit
    })
    expect(ensure.body['session']).toBe('session-11112222-3333-4444-5555-666677778888')
    // THE ADDRESS ARM: openResource names the SAME session's bench
    await waitFor(() => { expect(tab.opened[0]).toBe('dsh-resource://cards/bench/session-11112222-3333-4444-5555-666677778888') })
  })

  it('a re-seated prop reaches the next gesture — the switched bench, live', async () => {
    const posts = stubDoors()
    const tab = tabSeat()
    // the renderer re-keys the body on a switch (SessionMaybeEntry's
    // epoch); a re-RENDER with a new prop is the same contract at
    // this depth — the panel never caches the session
    const view = render(<MediaPanel useTabInfo={tab.useTabInfo as never} sessionId="session-11112222-3333-4444-5555-666677778888" />)
    fireEvent.click(await screen.findByText(/Flows 1/))
    fireEvent.click(await screen.findByText('bench-main'))
    await waitFor(() => { expect(posts.length).toBe(1) })
    await new Promise((resolve) => setTimeout(resolve, 20))
    view.rerender(<MediaPanel useTabInfo={tab.useTabInfo as never} sessionId="session-99998888-7777-6666-5555-444433332221" />)
    fireEvent.click(await screen.findByText('bench-main'))
    const second = await waitFor(() => {
      if (posts[1] === undefined) throw new Error('second ensure never fired — posts=' + JSON.stringify(posts.map((p) => p.url)))
      return posts[1]
    })
    expect(second.body['session']).toBe('session-99998888-7777-6666-5555-444433332221')
  })
})
