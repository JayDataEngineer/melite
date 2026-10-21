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
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote } from '@melite/card-base/client'

import { CardsTab } from '../src/client/CardsTab.tsx'
import { schemaEnvelope } from '@melite/card-base/client'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'

const noop = (): void => {}
afterEach(() => { cleanup(); unbindEstateRemote(); vi.unstubAllGlobals() })

function tileButton(): HTMLElement {
  const el = document.querySelector('[role="button"][class*="tileInner"]')
  if (el === null) throw new Error('tile button not found')
  return el as HTMLElement
}

/** Same wire frame as card-drill's stubWire, with the card's OWN
 *  spec (declared outputs) and a done stage carrying artifacts. */
function stubWire(opts: { card: string; outputs: Record<string, string>; artifacts: Record<string, string> }): CardsBenchValue {
  const bench: CardsBenchValue = {
    kind: 'bench', draftId: 'bench-p', rev: 1,
    sessionKey: 'p',
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
  // THE ONE-FAKE LAW (stroke 81): bench/get + runs/status ride the
  // bound namespaces; fetch answers ONLY the /v1 discovery doors.
  mountEstateFakes({
    benchDoc,
    runDocs: [{ run_id: 'run-1', status: 'done', draft_id: 'bench-p', stages: [] }],
  })
  const impl = async (url: unknown): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({
        form: opts.card, genre: 'x', engine: 'comfyui',
        schema: schemaEnvelope({
          prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
        }),
        outputs: opts.outputs,
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('estate door on the fetch lane: ' + path)
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
    useResource: () => ({ status: 'live' as const, value: bench }),
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
    useResource: () => ({ status: 'live' as const, value: bench }),
  }))
  const tile = tileButton()
  expect(tile).toBeTruthy()
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
  await waitFor(() => {
    expect(document.querySelector('[data-testid="stage-preview-mesh"]')).not.toBeNull()
  }, { timeout: 4000 })
})
