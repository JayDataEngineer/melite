// @vitest-environment happy-dom
/**
 * THE RUN GATE (the one-press/one-engine law, 2026-09-23).
 *
 * THE OPERATOR'S LAW, verbatim: "Me pressing one thing and ComfyUI
 * getting another thing should be IMPOSSIBLE. By construction."
 *
 * The incident: the operator toggled the h3 seam cut→carried, pressed
 * Run ten seconds later, and a 15-minute film composed from the CUT —
 * the bench log held NO patch for the toggle (the write died before
 * the wire). The drill's own "Run stage" has its patch-first law; the
 * TILE's bare verb (and the zoom pill, and the draft view) had NO
 * gate at all — the engine composed from whatever the doc held.
 *
 * THE LAWS THIS SPEC PINS, through the REAL channel (the real
 * draft.ts ledger → the real onRunStage gate → the fake wire):
 *  1. a write that FAILED before the press REFUSES the run loud —
 *     no runs/start fires, and the refusal names the unlanded write;
 *  2. the gate is the ledger, not a latch — after a LATER write
 *     lands, the same press runs (a refused run costs one press).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote } from '@melite/card-base/client'
import { createElement } from 'react'

import { CardsTab } from '../src/client/CardsTab.tsx'
import { patchStageParams, resetStageWrites } from '../src/client/draft.ts'
import { schemaEnvelope } from '@melite/card-base/client'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'
import { draftIdOf } from '@melite/contracts/benchStage';

const BENCH: CardsBenchValue = {
  kind: 'bench',
  draftId: draftIdOf('bench-s1'),
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

function stubWire(
  patchFailures?: Array<Record<string, unknown>>,
  runDocs?: Array<Record<string, unknown>>,
  fakes?: Parameters<typeof mountEstateFakes>[0],
): { calls: Array<{ method: string; args: Record<string, unknown> }> } {
  const estate = mountEstateFakes({ patchFailures, runDocs, ...fakes })
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      const doc = {
        form: 'image-gen', genre: 'image', engine: 'comfyui',
        schema: schemaEnvelope({
          prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
          steps: { type: 'number', meta: { description: 'Steps', default: 8, min: 1, max: 150, step: 1, extra: { wtype: 'number' } } },
          turbo: { type: 'boolean', meta: { description: 'Turbo', default: false } },
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
  return { calls: estate.calls }
}

function mountTab(resource: { status: 'live' | 'failed'; failure?: { message?: string } } = { status: 'live' }): void {
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: resource.status, value: BENCH, ...(resource.failure !== undefined ? { failure: resource.failure } : {}) }),
  }))
}

/** The TILE's bare run verb (data-testid tile-run → onRunStage — the
 *  verb with no patch-first law of its own; the gate's seat). */
async function pressTileRun(): Promise<void> {
  const user = userEvent.setup()
  const btn = await screen.findByTestId('tile-run', {}, { timeout: 4000 })
  await user.click(btn)
}

afterEach(() => {
  unbindEstateRemote()
  resetStageWrites()
  cleanup()
  vi.unstubAllGlobals()
})

test('THE RUN GATE: a write that failed before the press refuses the run — no runs/start, the refusal names the unlanded write', async () => {
  // the FIRST drafts/patch fails (the toggle's write dying before
  // the wire); everything after succeeds.
  const { calls } = stubWire([{ draftId: 'bench-s1', stageId: 's_0', delivered: false, reason: 'stage not found' }])
  // THE DEAD WRITE, through the REAL channel: a surface save fires,
  // the door refuses, the ledger holds the failure. The operator
  // sees the patch banner — then presses the tile's bare Run.
  await expect(patchStageParams(draftIdOf('bench-s1'), 's_0', { steps: 20 }, 7)).rejects.toThrow(/stage not found/)
  mountTab()
  await pressTileRun()
  await waitFor(() => {
    expect(screen.getByText(/THE WRITE DID NOT LAND/)).toBeTruthy()
  })
  expect(calls.some((c) => c.method === 'runs/start')).toBe(false)
})

test('THE GATE IS THE LEDGER, NOT A LATCH: after a later write lands, the same press runs', async () => {
  const { calls } = stubWire([{ draftId: 'bench-s1', stageId: 's_0', delivered: false, reason: 'stage not found' }])
  await expect(patchStageParams(draftIdOf('bench-s1'), 's_0', { steps: 20 }, 7)).rejects.toThrow(/stage not found/)
  mountTab()
  await pressTileRun()
  await screen.findByText(/THE WRITE DID NOT LAND/)
  expect(calls.some((c) => c.method === 'runs/start')).toBe(false)
  // THE RECOVERY: the operator's write lands this time (the failure
  // burned) — the ledger clears, and the SAME bare press now runs.
  await patchStageParams(draftIdOf('bench-s1'), 's_0', { steps: 20 }, 7)
  await pressTileRun()
  await waitFor(() => {
    expect(calls.some((c) => c.method === 'runs/start')).toBe(true)
  })
})

test('THE PER-KEY MEMORY (the audit B2): a later success on an UNRELATED key does not erase the refusal — the press still refuses, naming the unlanded key', async () => {
  const { calls } = stubWire([{ draftId: 'bench-s1', stageId: 's_0', delivered: false, reason: 'stage not found' }])
  await expect(patchStageParams(draftIdOf('bench-s1'), 's_0', { steps: 20 }, 7)).rejects.toThrow(/stage not found/)
  // an UNRELATED key lands clean after the failure — the old single
  // slot would have cleared the refusal here; per-key memory holds.
  await patchStageParams(draftIdOf('bench-s1'), 's_0', { prompt: 'a blue cube' }, 7)
  mountTab()
  await pressTileRun()
  await waitFor(() => {
    expect(screen.getByText(/THE WRITE DID NOT LAND/)).toBeTruthy()
  })
  expect(screen.getByText(/unlanded keys: steps/)).toBeTruthy()
  expect(calls.some((c) => c.method === 'runs/start')).toBe(false)
})

test('THE STALE-LIST FENCE (the audit A4): Run ALL on a failed refresh refuses — never composes from last-good state', async () => {
  const { calls } = stubWire()
  mountTab({ status: 'failed' as const, failure: { message: 'door down' } })
  const user = userEvent.setup()
  const btn = await screen.findByRole('button', { name: /Play/ }, { timeout: 4000 })
  await user.click(btn)
  await waitFor(() => {
    expect(screen.getByText(/not composing from it/)).toBeTruthy()
  })
  expect(calls.some((c) => c.method === 'runs/start')).toBe(false)
})

test('THE TWIN-PRESS FENCE (audit L-ERROR-1): a live run refuses a second start on the same stage — one engine run, the voice names the live one', async () => {
  const { calls } = stubWire()
  mountTab()
  await pressTileRun()
  // the mapping arms in onStarted BEFORE the observer's first
  // status call — the fence can trust it from here on
  await waitFor(() => { expect(calls.some((c) => c.method === 'runs/status')).toBe(true) }, { timeout: 4000 })
  const startsAfterFirst = calls.filter((c) => c.method === 'runs/start').length
  expect(startsAfterFirst).toBe(1)
  // the SECOND press must not mint a second engine run
  await pressTileRun()
  expect(calls.filter((c) => c.method === 'runs/start').length).toBe(1)
  // and the press is not silent — the face names the live run (a
  // start-claim voices at the tab error seam, not the tile slice)
  const err = await screen.findByText(/already has a run going/, {}, { timeout: 4000 })
  expect(err.textContent).toMatch(/already has a run going/)
})

test('THE SETTLER HANDOFF (audit L-ERROR-1): a settled observer clears only its own id — the stage runs again', async () => {
  const { calls } = stubWire(undefined, [{
    // 'completed' — the run row's terminal word (stageView's
    // TERMINAL_RUN_STATUSES; 'done' is the STAGE word and would keep
    // the observer watching to its ceiling)
    run_id: 'run-1', status: 'completed', draft_id: 'bench-s1',
    stages: [{ id: 's_0', status: 'done', url: '' }],
  }])
  mountTab()
  await pressTileRun()
  // the observer settles terminal on the scripted done row and the
  // id-aware clear drops the mapping (the run id matches)
  await waitFor(() => { expect(calls.filter((c) => c.method === 'runs/status').length).toBeGreaterThan(0) }, { timeout: 4000 })
  await waitFor(() => { expect(calls.some((c) => c.method === 'runs/start')).toBe(true) }, { timeout: 4000 })
  // the settle needs a beat to land its clear — then the stage is
  // runnable again: the second press STARTS (count 2), never fences
  await waitFor(async () => {
    await pressTileRun()
    expect(calls.filter((c) => c.method === 'runs/start').length).toBe(2)
  }, { timeout: 8000 })
})

test('THE WEDGE FENCE (audit V-E1): a THROWN Run ALL pass un-wedges Play — the rejection is a face and the button re-arms', async () => {
  // runs/start rejects at the transport (the wire is down): the
  // pass's promise REJECTS — the one-arg .then never saw it, running
  // stuck true, and Play stayed dead for the tab's lifetime.
  const { calls } = stubWire(undefined, undefined, { throws: [{ method: 'runs/start', message: 'wire down' }] })
  mountTab()
  const user = userEvent.setup()
  const btn = await screen.findByRole('button', { name: /Play/ }, { timeout: 4000 })
  await user.click(btn)
  // the rejection lands as a FACE — the tab's error line AND the pass
  // accounting both name it (the settled-outcome row), so the arm
  // asserts presence, never a single node
  await waitFor(() => {
    expect(screen.getAllByText(/wire down/).length).toBeGreaterThan(0)
  }, { timeout: 4000 })
  // the fence lifts: the button is live again, and the re-press
  // reaches the door (the throw entry was one-shot — the second
  // start composes)
  expect((btn as HTMLButtonElement).disabled).toBe(false)
  await user.click(btn)
  await waitFor(() => {
    expect(calls.filter((c) => c.method === 'runs/start').length).toBe(2)
  }, { timeout: 4000 })
})

test('THE PASS FENCE (audit L-ERROR-2): Run ALL re-pressed mid-pass refuses — no duplicate pass, the voice names the live one', async () => {
  const { calls } = stubWire()
  mountTab()
  const user = userEvent.setup()
  const btn = await screen.findByRole('button', { name: /Play/ }, { timeout: 4000 })
  await user.click(btn)
  await waitFor(() => { expect(calls.some((c) => c.method === 'runs/start')).toBe(true) }, { timeout: 4000 })
  await user.click(btn)
  // the re-press starts nothing: the primary entry is the button's
  // own disabled fence (L-ERROR-2), and a verb/rescue entry that
  // reaches onRun past it hits the ref fence + voice (the twin-press
  // wall pins that voice on the stage path)
  expect(calls.filter((c) => c.method === 'runs/start').length).toBe(1)
})
