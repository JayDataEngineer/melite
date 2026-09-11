// @vitest-environment happy-dom
/**
 * CardDrill — the shared drilldown (2026-09-11 rebirth), rendered
 * through the Cards tab's StageDrill mount: the bench stage's second
 * state. Pins THE SHARED-STATE LAW at the UI level —
 *
 *   open drill → edit a param → Run = drafts/patch FIRST, then
 *   runs/start (the patch lands in the domain BEFORE the run reads
 *   it; the card runs what the user SEES)
 *
 * and the normal state's card grammar (Pill kind, bold title, engine
 * Pill, StateDot). fetch is stubbed whole (the wire frame the tab
 * posts is parsed and recorded, per method).
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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

function stubWire(): { calls: Call[] } {
  const calls: Call[] = []
  const impl = async (url: unknown, init?: RequestInit): Promise<Response> => {
    // the /v1 discovery doors (same-origin): the card form spec + catalog
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      const doc = {
        form: 'image-gen', genre: 'image', engine: 'comfyui',
        fields: [
          { name: 'prompt', label: 'Prompt', type: 'textarea' },
          { name: 'steps', label: 'Steps', type: 'number', default: 8, min: 1, max: 150 },
          { name: 'turbo', label: 'Turbo', type: 'switch', default: false },
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
    if (frame.method === 'runs/start') value = { run_id: 'run-1', status: 'queued' }
    if (frame.method === 'drafts/patch') value = { draftId: 'bench-s1', stageId: 's_0', delivered: true, patched: ['params'] }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  }
  vi.stubGlobal('fetch', impl)
  return { calls }
}

const noop = (): void => {}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('the bench row is a card (Pill kind, bold title, engine Pill) and opens the shared drill', async () => {
  stubWire()
  const user = userEvent.setup()
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
  const tile = screen.getByRole('button', { name: /hero frame/ })
  // THE TILE FACE: kind face in the preview cell, caption strip below
  expect(within(tile).getByText('image-gen')).toBeTruthy()
  expect(within(tile).getByText('comfyui')).toBeTruthy()
  expect(tile.querySelector('[data-kind="image-gen"]')).toBeTruthy()
  await user.click(tile)
  // the drill opens with the stage's params as editable fields
  expect(screen.getByText('Stage hero frame')).toBeTruthy()
  expect(screen.getByText('Prompt')).toBeTruthy()
  expect(screen.getByText('Steps')).toBeTruthy()
})

test('Run in the drill patches the domain FIRST, then starts the run', async () => {
  const { calls } = stubWire()
  const user = userEvent.setup()
  const open = vi.fn()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: open },
      },
    }),
    useResource: () => ({ status: 'live', value: BENCH }),
  }))
  await user.click(screen.getByRole('button', { name: /hero frame/ }))
  // edit steps 8 → 20 (the drill's own Run — not the bench head's)
  const steps = screen.getByDisplayValue('8')
  await user.clear(steps)
  await user.type(steps, '20')
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Run' }))
  await waitFor(() => {
    const methods = calls.map((c) => c.method)
    expect(methods.indexOf('drafts/patch')).toBeGreaterThanOrEqual(0)
    expect(methods.indexOf('runs/start')).toBeGreaterThan(methods.indexOf('drafts/patch'))
  })
  const patch = calls.find((c) => c.method === 'drafts/patch')
  expect(patch?.args).toEqual({
    draftId: 'bench-s1', stageId: 's_0', patch: { params: { steps: 20 } },
  })
  // the run navigates to the run view (the tab switches address)
  await waitFor(() => {
    expect(open).toHaveBeenCalledWith('dsh-resource://cards/run/run-1')
  })
})

test('a patch refusal names itself and the run never fires', async () => {
  const { calls } = stubWire()
  vi.stubGlobal('fetch', async (u: unknown, init?: RequestInit): Promise<Response> => {
    if (String(u).includes('/v1/form-spec')) {
      const doc = { form: 'image-gen', fields: [
        { name: 'prompt', label: 'Prompt', type: 'textarea' },
        { name: 'steps', label: 'Steps', type: 'number', default: 8, min: 1, max: 150 },
      ] }
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string }
    calls.push({ method: frame.method, args: {} })
    const value = frame.method === 'drafts/patch'
      ? { draftId: 'bench-s1', stageId: 's_0', delivered: false, reason: 'stage not found' }
      : { run_id: 'run-1' }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  })
  const user = userEvent.setup()
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
  await user.click(screen.getByRole('button', { name: /hero frame/ }))
  const steps = screen.getByDisplayValue('8')
  await user.clear(steps)
  await user.type(steps, '20')
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Run' }))
  await waitFor(() => {
    expect(screen.getByText(/stage not found/)).toBeTruthy()
  })
  expect(calls.some((c) => c.method === 'runs/start')).toBe(false)
})
