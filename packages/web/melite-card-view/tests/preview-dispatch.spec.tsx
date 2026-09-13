// @vitest-environment happy-dom
/**
 * preview-dispatch.spec.tsx — THE PRIMARY-OUTPUT DISPATCH at the UI
 * level (2026-09-13): the drill's preview seat renders the media the
 * CARD DECLARES (form-spec outputs.default) — an audio card renders
 * the shared AUDIO preview, a mesh card the raw-three MESH stage —
 * zero per-card hard-coding in the tab (the url sniff is only the
 * fallback, pinned in preview-kind.spec.ts). Harness mirrors
 * card-drill.spec (fetch stubbed whole; tile click opens the zoom
 * drill).
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'

import { CardsTab } from '../src/client/CardsTab.tsx'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

const noop = (): void => {}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function tileButton(): HTMLElement {
  const el = document.querySelector('button[class*="tileInner"]')
  if (el === null) throw new Error('tile button not found')
  return el as HTMLElement
}

/** Same wire frame as card-drill's stubWire, with the card's OWN
 *  spec (declared outputs) and a done stage carrying artifacts. */
function stubWire(opts: { card: string; outputs: Record<string, string>; artifacts: Record<string, string> }): CardsBenchValue {
  const bench: CardsBenchValue = {
    kind: 'bench', draftId: 'bench-p', rev: 1,
    stages: [{
      id: 's_0', card: opts.card, title: 'the stage', engine: 'comfyui',
      params: {}, runStatus: 'done',
      result: { artifacts: opts.artifacts },
    }],
    log: [],
  }
  const benchDoc = {
    draft_id: 'bench-p', rev: 1,
    stages: [{ id: 's_0', card: opts.card, title: 'the stage', engine: 'comfyui', params: {}, run_status: 'done', result: { artifacts: opts.artifacts } }],
    log: [],
  }
  const impl = async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({
        form: opts.card, genre: 'x', engine: 'comfyui',
        fields: [{ name: 'prompt', label: 'Prompt', type: 'textarea' }],
        outputs: opts.outputs,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } }
    let value: Record<string, unknown> = { ok: true }
    if (frame.method === 'bench/get') value = benchDoc
    if (frame.method === 'runs/status') value = { run_id: 'run-1', status: 'done', draft_id: 'bench-p', stages: [] }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  }
  vi.stubGlobal('fetch', impl)
  return bench
}

test('an AUDIO card previews the shared audio player (declared kind drives the seat)', async () => {
  const bench = stubWire({ card: 'music', outputs: { default: 'audio' }, artifacts: { track: '/out/song.mp3' } })
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({ status: 'live', value: bench }),
  }))
  // the tab boots (bench door answers), the tile opens the drill
  const tile = tileButton()
  expect(tile).toBeTruthy()
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  const el = await waitFor(() => {
    const e = document.querySelector('[data-testid="stage-preview-audio-hero"]')
    expect(e).not.toBeNull()
    return e as Element
  }, { timeout: 4000 })
  expect((el as HTMLAudioElement).getAttribute('src')).toBe('/out/song.mp3')
})

test('a MESH card previews the raw-three stage seat (declared kind)', async () => {
  const bench = stubWire({ card: 'anny', outputs: { default: 'mesh' }, artifacts: { body: '/out/body.glb' } })
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({ status: 'live', value: bench }),
  }))
  const tile = tileButton()
  expect(tile).toBeTruthy()
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  await waitFor(() => {
    expect(document.querySelector('[data-testid="stage-preview-mesh"]')).not.toBeNull()
  }, { timeout: 4000 })
})
