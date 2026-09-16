// THE MISADDRESSED DELETE (stroke 80 — the operator's burn, verbatim:
// "It says 'stage not found: s_1' when I try to delete [REDACTED 2026-11-05] on the
// card bar"). ROOT CAUSE: the multi-session seam (stroke 44) threaded
// the session key through the READ path (bench address) and ONE add
// call, but every OTHER mutation wire hardcoded 'main' — a non-main
// bench's adds landed in its own draft while its deletes/reorders/
// groups hit MAIN's doc and refused 'stage not found' against rows
// main never held. THE FIX: the bench value CARRIES its sessionKey,
// and every mutation wire receives it. This wall pins the law: the
// delete on a conv-42 bench ADDRESSES conv-42 — never main.
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { CardsTab } from '../src/client/CardsTab.tsx'
import { schemaEnvelope } from '../src/client/spec-form.tsx'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

const BENCH: CardsBenchValue = {
  kind: 'bench',
  draftId: 'bench-conv-42',
  rev: 3,
  sessionKey: 'conv-42',
  stages: [
    { id: 's_0', card: 'image-gen', title: 'first', engine: 'comfyui', params: { prompt: 'a' } },
    { id: 's_1', card: 'image-gen', title: 'second', engine: 'comfyui', params: { prompt: 'b' } },
  ],
  log: [],
}

const removes: Array<Record<string, unknown>> = []

function stubWire(): void {
  vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({
        form: 'image-gen', genre: 'image', engine: 'comfyui',
        schema: schemaEnvelope({
          prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
        }),
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: {
        'image-gen': { label: 'Image Gen', description: 'generate an image', genre: 'image', families: ['image-gen'] },
      } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const frame = JSON.parse(String(init?.body)) as {
      rpcId: string; method: string
      payload?: { args?: { sessionKey?: string; doc?: Record<string, unknown> } }
    }
    let value: Record<string, unknown> = { ok: true }
    const args = frame.payload?.args ?? {}
    if (frame.method === 'bench/get') {
      value = {
        draft_id: 'bench-conv-42', rev: 3,
        stages: BENCH.stages.map((s) => ({ ...s })),
        log: [],
      }
    }
    if (frame.method === 'bench/remove-stage') {
      removes.push({ sessionKey: args.sessionKey, stage: args.doc?.['stage'] })
    }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  removes.length = 0
})

test('THE TILE TRASH ON A NON-MAIN BENCH ADDRESSES THAT BENCH (never main — the misaddressed-delete law)', async () => {
  stubWire()
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench/conv-42' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: 'live', value: BENCH }),
  }))
  const trash = await screen.findAllByTestId('tile-remove', undefined, { timeout: 4000 })
  expect(trash.length).toBe(2)
  await user.click(trash[1]!)
  await vi.waitFor(() => { expect(removes.length).toBe(1) })
  // THE LAW: the wire frame carries the RENDERED bench's session key
  // and the RENDERED row's id — before the fix this fired with
  // sessionKey 'main' and the estate refused 'stage not found: s_1'.
  expect(removes[0]).toEqual({ sessionKey: 'conv-42', stage: 's_1' })
})
