// @vitest-environment happy-dom
/**
 * THE REPLAYED-REFUSAL CARRY (2026-10-18, the operator's bug: "when
 * I open img gen I immediately get an error").
 *
 * THE INCIDENT: a past refused Run wrote its refusal onto the bench
 * row as a terminal failure (runStatus 'failed' + result.error — the
 * 2026-09-14 carry). The refusal was an UNSTATED required word (no
 * prompt typed yet), the operator cured it by typing… and every
 * later OPEN of the drill replayed the dead refusal from the row
 * (the zoom bar's failed-text face reads result.error verbatim). The
 * row carried a run that never was: an incomplete draft is BENCH
 * STATE under construction (the incomplete-draft law, 2026-10-10),
 * never a run outcome.
 *
 * THE CONTRACT THIS SPEC PINS, through the real channel (the real
 * tab → the real run gate → the fake wire's coded refusal):
 *  1. a run start refused with code card_compose_incomplete NEVER
 *     writes 'failed' onto the row — it HEALS any poisoned row
 *     (runStatus '' + result {}), and the refusal stays a local
 *     claim at the press (visible, retiring with the next gesture);
 *  2. a stated-wrong refusal (code card_compose, or none) still
 *     carries as a terminal failure — the 2026-09-14 law stands for
 *     real authored state.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote } from '@melite/card-base/client'
import { createElement } from 'react'

import { CardsTab } from '../src/client/CardsTab.tsx'
import { schemaEnvelope } from '@melite/card-base/client'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'
import type { EstateFakes } from './estate-harness.ts'

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
      params: { prompt: 'a red cube', steps: 8 },
    },
  ],
  log: [],
}

const UNSTATED = "card_compose phase 1: lane 'krea-2/turbo' refuses the state: " +
  "this lane requires 'prompt' — 'prompt' is not stated — every image lane states " +
  'WHAT the picture is — write the prompt'
const STATED_WRONG = 'card_compose phase 1: unknown quant "xq" for model "krea-2" variant "turbo"'

function stubWire(refusal: { message: string; code?: string }): EstateFakes {
  const estate = mountEstateFakes({
    refusals: [{ method: 'runs/start', message: refusal.message, code: refusal.code }],
  })
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      const doc = {
        form: 'image-gen', genre: 'image', engine: 'comfyui',
        schema: schemaEnvelope({
          prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
          steps: { type: 'number', meta: { description: 'Steps', default: 8, min: 1, max: 150, step: 1, extra: { wtype: 'number' } } },
        }),
      }
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      const doc = { cards: { 'image-gen': { label: 'Image Gen', description: 'generate an image', genre: 'image', families: ['image-gen'] } } }
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('estate door on the fetch lane: ' + path)
  })
  return estate
}

function mountTab(): void {
  const resource: { status: 'live' | 'failed'; value?: CardsBenchValue; failure?: { message?: string } } = {
    status: 'live', value: BENCH,
  }
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => resource,
  }))
}

async function pressTileRun(): Promise<void> {
  const user = userEvent.setup()
  const btn = await screen.findByTestId('tile-run', {}, { timeout: 4000 })
  await user.click(btn)
}

/** the run-face writes (drafts/patch bodies that touch runStatus). */
function outcomePatches(fakes: EstateFakes): Array<Record<string, unknown>> {
  return fakes.calls
    .filter((c) => c.method === 'drafts/patch')
    .map((c) => c.args['patch'] as Record<string, unknown>)
    .filter((patch) => patch['runStatus'] !== undefined)
}

afterEach(() => {
  unbindEstateRemote()
  cleanup()
  vi.unstubAllGlobals()
})

test('a FRESH card opens with NO red face (the operator\'s law: open is never an error)', async () => {
  // The operator's check, demanded beside the cure: a fresh card —
  // no run history, no persisted refusal — must open CLEAN. Every
  // red face in the tab is gated at a gesture (writeFace), a press
  // (the local start claim, enhanceNote), or a persisted failed row
  // (the zoom strip's failed text, the rescue pane); a fresh row
  // carries none of them, and this pin holds that construction.
  stubWire({ message: UNSTATED, code: 'runs/card-compose-incomplete' })
  // THE OPERATOR'S EXACT FRESH STATE: the promptless image card —
  // the incomplete draft the add door seats (the operator types
  // next). Its open must read as blank canvas, not a complaint.
  BENCH.stages[0]!.params = { steps: 8 }
  mountTab()
  const user = userEvent.setup()
  await screen.findByTestId('tile-run', {}, { timeout: 4000 })
  const tile = document.querySelector('button[class*="tileInner"]') as HTMLElement | null
  if (tile === null) throw new Error('tile button not found')
  await user.click(tile)
  await screen.findByTestId('stage-preview-seat', {}, { timeout: 4000 })
  // no zoom-strip failure, no write face, no error paragraph anywhere
  expect(document.querySelector('[data-testid="drill-run-error"]')).toBeNull()
  expect(document.querySelector('[data-testid="stage-write-face"]')).toBeNull()
  expect(document.querySelectorAll('.runError').length).toBe(0)
})

test('an incomplete-draft refusal HEALS the row — never a failed face, never a replay', async () => {
  const fakes = stubWire({ message: UNSTATED, code: 'runs/card-compose-incomplete' })
  mountTab()
  await pressTileRun()

  // the refusal stays a LOCAL claim at the press: the operator reads
  // the why where Run was pressed…
  await waitFor(() => {
    expect(screen.getByText(/write the prompt/)).toBeTruthy()
  })
  // …and the row write is the HEAL, not the poison: no 'failed'
  // face, the empty status folds to never-ran at every open
  const outcomes = outcomePatches(fakes)
  expect(outcomes.length, 'exactly one run-face write: the heal').toBe(1)
  expect(outcomes[0]!['runStatus']).toBe('')
  expect(outcomes[0]!['result']).toEqual({})
  expect(outcomes.some((p) => p['runStatus'] === 'failed')).toBe(false)
})

test('a stated-wrong refusal still carries as a terminal failure (the 2026-09-14 law stands)', async () => {
  const fakes = stubWire({ message: STATED_WRONG, code: 'card_compose' })
  mountTab()
  await pressTileRun()

  await waitFor(() => {
    const failed = outcomePatches(fakes).filter((p) => p['runStatus'] === 'failed')
    expect(failed.length).toBe(1)
    expect((failed[0]!['result'] as Record<string, unknown>)['error']).toContain('unknown quant')
  })
})

test('an UNNAMED refusal carries as a failure too (only the coded incomplete class heals)', async () => {
  const fakes = stubWire({ message: STATED_WRONG })
  mountTab()
  await pressTileRun()

  await waitFor(() => {
    expect(outcomePatches(fakes).some((p) => p['runStatus'] === 'failed')).toBe(true)
  })
})
