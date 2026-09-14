// @vitest-environment happy-dom
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

import { CardsTab } from '../src/client/CardsTab.tsx'
import { schemaEnvelope } from '../src/client/spec-form.tsx'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

// The verbatim ComfyUI refusal shape the estate serves on
// stages[].error (the 2026-09-13 image-edit incident).
const REFUSAL = "ComfyError: POST /prompt 400 — node_errors 'edit::CLIPLoader.0' value_not_in_list: clip_name 'qwen_2.5_vl_7b_fp8_scaled.safetensors' not in [14 available clips]"

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
      status: 'failed',
      runStatus: 'failed',
      params: { prompt: 'a red cube' },
      result: { error: REFUSAL },
    },
  ],
  log: [],
}

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
    const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string }
    let value: Record<string, unknown> = { ok: true }
    if (frame.method === 'bench/get') {
      value = {
        draft_id: 'bench-s1', rev: 7,
        stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', status: 'failed', runStatus: 'failed', params: { prompt: 'a red cube' }, result: { error: REFUSAL } }],
        log: [],
      }
    }
    if (frame.method === 'runs/status') {
      value = { run_id: 'run-1', status: 'failed', draft_id: 'bench-s1', error: REFUSAL, stages: [{ id: 's_0', status: 'error', url: '', error: REFUSAL }] }
    }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  })
}

function tileButton(): HTMLElement {
  const el = document.querySelector('button[class*="tileInner"]')
  if (el === null) throw new Error('tile button not found')
  return el as HTMLElement
}

afterEach(() => {
  cleanup()
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
    useResource: () => ({ status: 'live', value: BENCH }),
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
      status: 'live',
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
const TURBO_REFUSAL = "card_compose phase 1: unknown variant 'turbo' for model 'anima' (known: standard, default)"

test('a refused start lands on the row — the open drill reads the why', async () => {
  let failed = false
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
    const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } }
    let value: Record<string, unknown> = { ok: true }
    if (frame.method === 'bench/get') {
      value = failed
        ? {
            draft_id: 'bench-s1', rev: 8,
            stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', status: 'failed', runStatus: 'failed', params: { prompt: 'a red cube' }, result: { error: TURBO_REFUSAL } }],
            log: [],
          }
        : {
            draft_id: 'bench-s1', rev: 7,
            stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', status: 'idle', params: { prompt: 'a red cube' } }],
            log: [],
          }
    }
    if (frame.method === 'drafts/get') {
      value = { draft_id: 'bench-s1', rev: 7, intent: '', stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { prompt: 'a red cube' } }] }
    }
    if (frame.method === 'runs/start') {
      return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: false, error: { message: TURBO_REFUSAL } } }), { status: 200 })
    }
    if (frame.method === 'drafts/patch') {
      failed = true
      value = { draftId: 'bench-s1', stageId: 's_0', delivered: true, patched: ['runStatus'] }
    }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
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
      status: 'live',
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
  expect(drillErr.textContent).toContain("unknown variant 'turbo'")
})
