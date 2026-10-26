// THE MISADDRESSED DELETE (stroke 80 — the operator's burn, verbatim:
// "It says 'stage not found: s_1' when I try to delete things on the
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
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote } from '@melite/card-base/client'

import { CardsTab } from '../src/client/CardsTab.tsx'
import { schemaEnvelope } from '@melite/card-base/client'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'
import { draftIdOf } from '@melite/contracts/benchStage';

const BENCH: CardsBenchValue = {
  kind: 'bench',
  draftId: draftIdOf('bench-conv-42'),
  rev: 3,
  sessionKey: 'conv-42',
  stages: [
    { id: 's_0', card: 'image-gen', title: 'first', engine: 'comfyui', params: { prompt: 'a' } },
    { id: 's_1', card: 'image-gen', title: 'second', engine: 'comfyui', params: { prompt: 'b' } },
  ],
  log: [],
}

function stubWire(): { calls: Array<{ method: string; args: Record<string, unknown> }> } {
  // THE ONE-FAKE LAW (stroke 81): the remove verb rides the bound
  // bench namespace; fetch answers ONLY the /v1 discovery doors.
  const estate = mountEstateFakes({
    benchDoc: {
      draft_id: 'bench-conv-42', rev: 3,
      stages: BENCH.stages.map((s) => ({ ...s })),
      log: [],
    },
  })
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
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
    throw new Error('estate door on the fetch lane: ' + path)
  })
  return { calls: estate.calls }
}

afterEach(() => {
  cleanup()
  unbindEstateRemote()
  vi.unstubAllGlobals()
})

test('THE TILE TRASH ON A NON-MAIN BENCH ADDRESSES THAT BENCH (never main — the misaddressed-delete law)', async () => {
  const { calls } = stubWire()
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench/conv-42' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: BENCH }),
  }))
  const trash = await screen.findAllByTestId('tile-remove', undefined, { timeout: 4000 })
  expect(trash.length).toBe(2)
  await user.click(trash[1]!)
  const remove = await vi.waitFor(() => {
    const call = calls.find((c) => c.method === 'bench/remove-stage')
    expect(call).toBeTruthy()
    return call!
  })
  // THE LAW: the namespace call carries the RENDERED bench's session
  // key and the RENDERED row's id — before the fix this fired with
  // sessionKey 'main' and the estate refused 'stage not found: s_1'.
  expect(remove.args['sessionKey']).toBe('conv-42')
  expect((remove.args['doc'] as { stage?: string })['stage']).toBe('s_1')
})
