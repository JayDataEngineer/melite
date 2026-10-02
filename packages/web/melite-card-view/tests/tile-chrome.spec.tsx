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
import { mountEstateFakes } from './estate-harness.ts'
import { schemaEnvelope } from '@melite/card-base/client'
import { unbindEstateRemote } from '@melite/card-base/client'

import { CardsTab } from '../src/client/CardsTab.tsx'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

const BENCH: CardsBenchValue = {
  kind: 'bench',
  draftId: 'bench-s1',
  sessionKey: 's1',
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
  const stage: Record<string, unknown> = {
    id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
    params: { prompt: 'a red cube', steps: 8, turbo: false },
  }
  const benchDoc: Record<string, unknown> = { draft_id: 'bench-s1', rev: 7, stages: [stage], log: [] }
  // THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
  // namespaces; fetch answers ONLY the /v1 discovery doors.
  const estate = mountEstateFakes({ benchDoc, draftStages: [stage] })
  const impl = async (url: unknown): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      // THE HONEST DOOR SHAPE (G10's stage-run cure, 2026-10-12):
      // the real /v1/form-spec answer carries a schema envelope —
      // fetchFormSpec refuses a doc without one, and with the
      // downed-door refusal landed, a bogus doc now refuses the run
      // (the old silent catch rode params verbatim past it).
      const doc = {
        form: 'image-gen', genre: 'image', engine: 'comfyui',
        schema: schemaEnvelope({
          prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
          steps: { type: 'number', meta: { description: 'Steps', extra: { wtype: 'number', min: 1, max: 150, default: 8 } } },
          turbo: { type: 'boolean', meta: { description: 'Turbo', extra: { wtype: 'boolean', default: false } } },
        }),
      }
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      const doc = { cards: { 'image-gen': { label: 'Image Gen', description: 'generate an image', genre: 'image', families: ['image-gen'] } } }
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('estate door on the fetch lane: ' + path)
  }
  vi.stubGlobal('fetch', impl)
  return { calls: estate.calls }
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
    useResource: () => ({ status: 'live' as const, value: BENCH }),
  }))
}

afterEach(() => {
  cleanup()
  unbindEstateRemote()
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
    useResource: () => ({ status: 'live' as const, value: BENCH }),
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

test('THE HEALTH FACE (LOW-23): an escalated row keeps its spinner and captions the transport word — never a status rewrite', async () => {
  // the outage face: the stage is running (the spinner persists —
  // the run may still be live server-side) while the health channel
  // carries 'unreachable'; the caption renders the transport word,
  // and runStatus keeps its own word (no rewrite, no fold).
  stubWire()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({
      status: 'live' as const,
      value: {
        ...BENCH,
        stages: [{
          ...BENCH.stages[0]!,
          runStatus: 'running',
          health: 'unreachable',
        }],
      },
    }),
  }))
  // the spinner rides (running is still the run's own word)
  expect(await screen.findByTestId('tile-spin')).toBeTruthy()
  // the caption carries the transport word verbatim
  const face = screen.getByTestId('tile-health')
  expect(face.textContent).toBe('transport unreachable')
  expect(face.getAttribute('title')).toBe('transport unreachable')
})
