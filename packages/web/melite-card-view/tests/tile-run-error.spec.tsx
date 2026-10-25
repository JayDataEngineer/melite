// @vitest-environment happy-dom
// @contract cards-unknown-status-health
// (the tile error-face half of the row: the refusal renders verbatim)
/**
 * tile-run-error.spec.tsx — THE FAILURE FACE (2026-09-13, operator:
 * "I run image edit, no response at all"). A failed run's reason is
 * carried onto the bench row (observeRunOutcome's failure carry) and
 * must RENDER on both faces:
 *
 *   tile caption — the sliced reason (140 chars + …, title=full)
 *   stage drill  — the full reason, where it is READ
 *
 * Before the cure the error text was dropped at every seam: the tile
 * flipped back with no artifact and no word — indistinguishable from
 * a dead wire. The lane presence gate now refuses missing weights
 * BEFORE ComfyUI sees the graph; this spec pins that whatever DOES
 * fail after that never dies silent again.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote } from '@melite/card-base/client'
import { unknownVariantVoice } from '@melite/contracts/laneRelations'

import { CardsTab } from '../src/client/CardsTab.tsx'
import { schemaEnvelope } from '@melite/card-base/client'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

// The verbatim ComfyUI refusal shape the estate serves on
// stages[].error (the 2026-09-13 image-edit incident).
const REFUSAL = "ComfyError: POST /prompt 400 — node_errors 'edit::CLIPLoader.0' value_not_in_list: clip_name 'qwen_2.5_vl_7b_fp8_scaled.safetensors' not in [14 available clips]"

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
      status: 'failed' as const,
      runStatus: 'failed',
      params: { prompt: 'a red cube' },
      result: { error: REFUSAL },
    },
  ],
  log: [],
}

function stubWire(): void {
  // THE ONE-FAKE LAW (stroke 81): the failed bench/run rows ride the
  // bound namespaces; fetch answers ONLY the /v1 discovery doors.
  mountEstateFakes({
    benchDoc: {
      draft_id: 'bench-s1', rev: 7,
      stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', status: 'failed' as const, runStatus: 'failed', params: { prompt: 'a red cube' }, result: { error: REFUSAL } }],
      log: [],
    },
    runDocs: [{ run_id: 'run-1', status: 'failed' as const, draft_id: 'bench-s1', error: REFUSAL, stages: [{ id: 's_0', status: 'error', url: '', error: REFUSAL }] }],
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
}

function tileButton(): HTMLElement {
  const el = document.querySelector('[role="button"][class*="tileInner"]')
  if (el === null) throw new Error('tile button not found')
  return el as HTMLElement
}

afterEach(() => {
  cleanup()
  unbindEstateRemote()
  vi.unstubAllGlobals()
})

test('the tile caption carries the sliced reason; the drill carries it whole', async () => {
  stubWire()
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: BENCH }),
  }))

  // THE TILE FACE: the sliced refusal renders in the caption strip
  const tile = tileButton()
  const tileErr = await within(tile).findByTestId('tile-run-error', undefined, { timeout: 4000 })
  expect(tileErr.textContent!.length).toBeLessThanOrEqual(141) // 140 + …
  expect(tileErr.textContent!.endsWith('…')).toBe(true)
  // the title attribute keeps the full text for the hover
  expect(tileErr.getAttribute('title')).toBe(REFUSAL)

  // THE DRILL FACE: click the tile, the zoom opens, the reason is
  // rendered WHOLE (this is where it is read)
  await user.click(tile)
  const drillErr = await screen.findByTestId('drill-run-error', undefined, { timeout: 4000 })
  expect(drillErr.textContent).toBe(REFUSAL)
})

test('a healthy row never renders an error face (absent ≡ clean)', async () => {
  stubWire()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({
      status: 'live' as const,
      value: {
        ...BENCH,
        stages: [{
          id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
          status: 'done', runStatus: 'done', params: { prompt: 'x' },
          result: { url: '/melite-media/out/frame.png' },
        }],
      } as unknown as CardsBenchValue,
    }),
  }))
  const tile = tileButton()
  expect(within(tile).queryByTestId('tile-run-error')).toBeNull()
})

// THE REFUSAL CARRY (operator 2026-09-14: the turbo-for-anima compose
// refusal "needs to be in drill down card as well, it is not yet"):
// pressing Run in the drill on a stage the estate refuses writes the
// row FAILED with the reason — the open drill's failure face reads
// the why where the Run was pressed, not just the tab top.
// the door's own voice, built from its one home (the judge
// spells the quoting; this fixture never re-spells it)
const TURBO_REFUSAL = 'card_compose phase 1: ' + unknownVariantVoice('turbo', 'anima', ['standard', 'default'])

test('a normalized bench stage error mounts the tab error and rescue', async () => {
  stubWire()
  const error = "card 'mask' needs weight 'sams/sam2.1_hiera_large.pt' — absent on the models tree; fetch declared-source (provision_model model=mask)"
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({
      status: 'live' as const,
      value: {
        ...BENCH,
        stages: [{
          id: 's_0', card: 'mask', title: 'mask', engine: 'comfyui', status: 'failed' as const, runStatus: 'failed',
          params: { prompt: 'a red cube' }, result: { error },
        }],
      } as unknown as CardsBenchValue,
    }),
  }))
  expect((await screen.findAllByText(error)).length).toBeGreaterThan(0)
  expect(screen.getByText(/Missing model file/)).toBeTruthy()
})

test('a normalized draft stage error mounts the draft error and rescue', async () => {
  stubWire()
  const error = "card 'mask' needs weight 'sams/sam2.1_hiera_large.pt' — absent on the models tree; fetch declared-source (provision_model model=mask)"
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/draft/bench-s1/s_0' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({
      status: 'live' as const,
      value: {
        kind: 'draft' as const, draftId: 'bench-s1', stageId: 's_0', intent: 'mask', rev: 7,
        stages: [{
          id: 's_0', card: 'mask', title: 'mask', engine: 'comfyui', status: 'failed' as const, runStatus: 'failed',
          params: { prompt: 'a red cube' }, result: { error },
        }],
      },
    }),
  }))
  expect((await screen.findAllByText(error)).length).toBeGreaterThan(0)
  expect(screen.getByText(/Missing model file/)).toBeTruthy()
})

test('a refused start lands on the row — the open drill reads the why', async () => {
  // THE REFUSAL RIDES THE ERROR BRANCH (stroke 81): runs/start
  // refuses with the compose text; the outcome patch applies into
  // the SAME stage object bench/get serves, so the refetch carries
  // the failure without a second fixture.
  const stage: Record<string, unknown> = { id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', status: 'idle', params: { prompt: 'a red cube' } }
  mountEstateFakes({
    benchDoc: { draft_id: 'bench-s1', rev: 7, stages: [stage], log: [] },
    draftStages: [stage],
    refusals: [{ method: 'runs/start', message: TURBO_REFUSAL }],
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
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({
      status: 'live' as const,
      value: {
        kind: 'bench', draftId: 'bench-s1', rev: 7, log: [],
        stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', status: 'idle', params: { prompt: 'a red cube' } }],
      } as unknown as CardsBenchValue,
    }),
  }))
  // open the drill, press its labeled Run
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  const drill = document.querySelector('div[class*="zoomCard"]') as HTMLElement
  await user.click(within(drill).getByRole('button', { name: 'Run stage' }))
  // the refusal lands IN the drill — the full compose text
  const drillErr = await screen.findByTestId('drill-run-error', undefined, { timeout: 4000 })
  expect(drillErr.textContent).toContain(unknownVariantVoice('turbo', 'anima', ['standard', 'default']))
})

// ── THE CONTENT-MODEL LAW (2026-10-21, the × parity follow-up) ────
// The tile face carries REAL buttons (the error ×, run/stop, trash);
// HTML forbids interactive content inside a <button> — three nested
// buttons rode the tile from the × parity cure. The tile is a
// role=button DIV with the button's whole contract: tab focus,
// Enter/Space activation, the same open.
test('the tile is a role=button div — real buttons inside, Enter opens like the button it replaced', async () => {
  stubWire()
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: BENCH }),
  }))

  const tile = tileButton()
  // the law: never a <button> itself (its children include buttons)
  expect(tile.tagName).toBe('DIV')
  expect(tile.getAttribute('role')).toBe('button')
  expect(tile.querySelector('button')).not.toBeNull() // the error × is a real button

  // the contract the type="button" gave for free: keyboard activation
  tile.focus()
  await user.keyboard('{Enter}')
  expect(await screen.findByTestId('drill-run-error', undefined, { timeout: 4000 })).toBeTruthy()
})
