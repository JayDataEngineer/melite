// @vitest-environment happy-dom
/**
 * tile-chrome.spec.tsx — THE CHAT-INPUT CHROME LAW (2026-09-13, the
 * operator): the bench tile's status face is NOT a badge + green dot
 * — it mirrors the DSH chat input: hover-revealed ghost icon circles
 * (trash top-right, play bottom-right; play flips to stop while
 * running) and a loading spinner bottom-left that PERSISTS past the
 * hover while the row runs. All DSH icon primitives; the verbs ride
 * the estate doors (run = the composing door, stop = runs/stop with
 * the tab-armed run id, remove = the bench CAS door).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { CardsTab } from '../src/client/CardsTab.tsx'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

const BENCH: CardsBenchValue = {
  kind: 'bench',
  draftId: 'bench-s1',
  rev: 7,
  stages: [
    {
      id: 's_0',
      card: 'image-gen',
      title: 'hero frame',
      engine: 'comfyui',
      params: { prompt: 'a red cube', steps: 8, turbo: false },
    },
  ],
  log: [],
}

interface Call { method: string; args: Record<string, unknown> }

/**
 * THE ESTATE MODEL: bench/get serves a LIVE stage — the drafts/patch
 * door (params AND outcome patches) applies into it, so the running
 * flip the observer writes is what the refetched bench shows (the
 * read-back law, or the harness lies).
 */
function stubWire(): { calls: Call[] } {
  const calls: Call[] = []
  const stage: Record<string, unknown> = {
    id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
    params: { prompt: 'a red cube', steps: 8, turbo: false },
  }
  const benchDoc: Record<string, unknown> = { draft_id: 'bench-s1', rev: 7, stages: [stage], log: [] }
  let runStatus = 'queued'
  const impl = async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      const doc = {
        form: 'image-gen', genre: 'image', engine: 'comfyui',
        fields: [
          { name: 'prompt', label: 'Prompt', type: 'textarea' },
          { name: 'steps', label: 'Steps', type: 'number', default: 8, min: 1, max: 150 },
          { name: 'turbo', type: 'switch', default: false },
        ],
      }
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      const doc = { cards: { 'image-gen': { label: 'Image Gen', description: 'generate an image', genre: 'image', families: ['image-gen'] } } }
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const frame = JSON.parse(String(init?.body)) as {
      rpcId: string; method: string; payload: { args: Record<string, unknown> }
    }
    calls.push({ method: frame.method, args: frame.payload.args })
    let value: Record<string, unknown> = { ok: true }
    if (frame.method === 'bench/get') value = benchDoc
    if (frame.method === 'drafts/get') value = { draft_id: 'bench-s1', rev: 7, intent: '', bench: { rev: 7, log: [] }, stages: [stage] }
    if (frame.method === 'runs/status') value = { run_id: 'run-1', status: runStatus, draft_id: 'bench-s1', stages: [] }
    if (frame.method === 'runs/list') value = { runs: [] }
    if (frame.method === 'runs/start') value = { run_id: 'run-1', status: 'queued' }
    if (frame.method === 'runs/stop') { runStatus = 'stopped'; value = { ok: true } }
    if (frame.method === 'drafts/patch') {
      const patch = (frame.payload.args as { patch?: Record<string, unknown> }).patch ?? {}
      if (patch['params'] !== undefined) Object.assign((stage as { params: Record<string, unknown> })['params'], patch['params'])
      if (patch['runStatus'] !== undefined) stage['runStatus'] = patch['runStatus']
      if (patch['result'] !== undefined) stage['result'] = patch['result']
      value = { draftId: 'bench-s1', stageId: 's_0', delivered: true, patched: Object.keys(patch) }
    }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  }
  vi.stubGlobal('fetch', impl)
  return { calls }
}

const noop = (): void => {}

function mount(): void {
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({ status: 'live', value: BENCH }),
  }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('the idle tile: play + trash chrome ride, no spinner, and the badge + green dot are gone', async () => {
  stubWire()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({ status: 'live', value: BENCH }),
  }))
  await screen.findByRole('button', { name: 'Run stage' })
  expect(screen.getByRole('button', { name: 'Remove stage' })).toBeTruthy()
  expect(screen.queryByTestId('tile-spin')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Stop run' })).toBeNull()
  // THE LAW: no StateDot seat, no status badge — the chrome owns the
  // status face (the spinner + stop), the caption owns identity.
  expect(document.querySelector('[class*="tileDot"]')).toBeNull()
  expect(screen.queryByText('done')).toBeNull()
})

test('the play button runs the stage (the composing door: drafts/get, then runs/start) and never opens the drill', async () => {
  const { calls } = stubWire()
  const user = userEvent.setup()
  mount()
  await user.click(await screen.findByRole('button', { name: 'Run stage' }))
  await waitFor(() => { expect(calls.some((c) => c.method === 'runs/start')).toBe(true) })
  expect(calls.some((c) => c.method === 'drafts/get')).toBe(true)
  // the chrome click must not morph the tile into the zoom drill
  expect(screen.queryByRole('button', { name: 'Collapse card' })).toBeNull()
})

test('a running row: the spinner persists (no hover needed), play flips to stop, and stop rides runs/stop', async () => {
  const { calls } = stubWire()
  const user = userEvent.setup()
  mount()
  await user.click(await screen.findByRole('button', { name: 'Run stage' }))
  // the observer stamps running onto the estate; the refetched bench
  // shows it — the spinner + stop appear WITHOUT any hover gesture
  const stop = await screen.findByRole('button', { name: 'Stop run' })
  expect(screen.getByTestId('tile-spin')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Run stage' })).toBeNull()
  await user.click(stop)
  await waitFor(() => {
    const c = calls.find((x) => x.method === 'runs/stop')
    expect(c?.args['runId']).toBe('run-1')
  })
})

test('the trash removes through the bench CAS door', async () => {
  const { calls } = stubWire()
  const user = userEvent.setup()
  mount()
  await user.click(await screen.findByRole('button', { name: 'Remove stage' }))
  await waitFor(() => {
    const c = calls.find((x) => x.method === 'bench/remove-stage')
    const doc = (c?.args['doc'] ?? {}) as { stage?: string; expect_rev?: number }
    expect(doc.stage).toBe('s_0')
    expect(doc.expect_rev).toBe(7)
  })
})
