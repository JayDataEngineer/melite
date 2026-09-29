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
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote } from '@melite/card-base/estate-remote'
import { resetStageWrites } from '../src/client/draft.ts'
import { createElement } from 'react'

import { resetCardFamiliesCache } from '@melite-plugin/melite-run-wire'
import { CardsTab } from '../src/client/CardsTab.tsx'
import { schemaEnvelope } from '../src/client/spec-form.tsx'
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

interface StubOpts {
  /** The bench/get doc the stub serves (default: the BENCH fixture's wire shape). */
  bench?: Record<string, unknown>
  /** Per-model form-spec docs (keyed by the model query param). A
   *  fetch of an unmapped model falls back to the default doc — the
   *  wall names what it expects to serve. */
  formSpecs?: Record<string, Record<string, unknown>>
  /** Records every form-spec model key fetched (the live-filter
   *  walls assert the refetch). */
  specsSeen?: string[]
  /** The drafts/get stages the stub serves (default: the live-params
   *  row — override to carry the served `resolved` map like the real
   *  lane's resolved serve does). */
  draftStages?: Array<Record<string, unknown>>
  /** Sequential runs/status docs (default: one queued doc). */
  runDocs?: Array<Record<string, unknown>>
  /** Queue of drafts/patch answers served INSTEAD of success (the CAS
   *  walls burn one conflict, then the door succeeds). */
  patchFailures?: Array<Record<string, unknown>>
  /** The bench-block rev drafts/get serves (default 7). */
  draftBenchRev?: number
}
function stubWire(opts?: StubOpts): { calls: Call[] } {
  // THE ONE-FAKE LAW (stroke 81): estate verbs ride bindEstateRemote
  // fakes (mountEstateFakes); fetch answers ONLY the /v1 discovery
  // doors (form-spec, model-catalog) — no fetch stub may carry an
  // estate envelope.
  const estate = mountEstateFakes({
    benchDoc: opts?.bench,
    draftStages: opts?.draftStages,
    draftBenchRev: opts?.draftBenchRev,
    runDocs: opts?.runDocs,
    patchFailures: opts?.patchFailures,
  })
  const impl = async (url: unknown): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      const qm = path.includes('model=') ? path.split('model=')[1]?.split('&')[0] : undefined
      if (qm !== undefined) opts?.specsSeen?.push(qm)
      if (qm !== undefined && opts?.formSpecs?.[qm] !== undefined) {
        return new Response(JSON.stringify(opts.formSpecs[qm]), { status: 200, headers: { 'content-type': 'application/json' } })
      }
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
  }
  vi.stubGlobal('fetch', impl)
  return { calls: estate.calls }
}

const noop = (): void => {}

/** True when the node sits inside the zoom bar (the Run/Stop strip). */
function sitsInZoomBar(node: HTMLElement): boolean {
  return node.closest('div[class*="zoomBar"]') !== null
}

/** The tile's OPEN button — the dnd-kit sortable wrapper (li) also
 * carries role="button" with the same accessible name; scope to the
 * tile's inner button by its class (module hash keeps tileInner). */
function tileButton(): HTMLElement {
  const el = document.querySelector('button[class*="tileInner"]')
  if (el === null) throw new Error('tile button not found')
  return el as HTMLElement
}

afterEach(() => {
  unbindEstateRemote()
  // THE LEDGER RESET (the one-press/one-engine law): the write
  // ledger is accountable module state — specs share draft/stage ids
  // across tests, and a refusal recorded by one test must not refuse
  // the next test's run.
  resetStageWrites()
  cleanup()
  vi.unstubAllGlobals()
})

// ZOOM CONTRACT (2026-09-12, TEST-3 debt paid): the drill rides the
// shared-element zoom card — tile click morphs (skeleton until
// settled, 500ms jsdom fallback), then StageDrill renders INSIDE the
// zoomed card (portal to body). The drill is NOT role=dialog; scope
// queries through the zoom detail host.
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
    useResource: () => ({ status: 'live' as const, value: BENCH }),
  }))
  const tile = tileButton()
  // THE TILE FACE: kind face in the preview cell, caption strip below
  // THE TITLE-CASE FACE: the eye gets prose, the door keeps ids
  expect(within(tile).getByText('Image Gen')).toBeTruthy()
  expect(within(tile).getByText('Comfyui')).toBeTruthy()
  expect(tile.querySelector('[data-kind="image-gen"]')).toBeTruthy()
  await user.click(tile)
  // the zoom opens: bar title + (after the settle) the drill fields
  expect(screen.getByText('Stage hero frame')).toBeTruthy()
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
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
    useResource: () => ({ status: 'live' as const, value: BENCH }),
  }))
  await user.click(tileButton())
  // the drill's fields arrive after the morph settles
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  // edit steps 8 → 20 AND type a prompt (the drill's own Run — not
  // the bench head's; the prompt is the operator's exact case: a
  // REQUIRED param the compose guard refuses when dropped)
  const boxes = screen.getAllByRole('textbox')
  expect(boxes.length).toBeGreaterThan(0)
  await user.type(boxes[0] as HTMLElement, 'a red cube on ice')
  const steps = screen.getByDisplayValue('8')
  await user.clear(steps)
  await user.type(steps, '20')
  const detail = screen.getByText('Steps').closest('div[class*="zoomCard"]') as HTMLElement
  await user.click(within(detail).getByRole('button', { name: 'Run stage' }))
  await waitFor(() => {
    const methods = calls.map((c) => c.method)
    expect(methods.indexOf('drafts/patch')).toBeGreaterThanOrEqual(0)
    expect(methods.indexOf('runs/start')).toBeGreaterThan(methods.indexOf('drafts/patch'))
  })
  const patch = calls.find((c) => c.method === 'drafts/patch')
  const typed = String((patch?.args as { patch?: { params?: { prompt?: unknown } } }).patch?.params?.prompt ?? '')
  expect(typed).toContain('red cube')
  // THE DROP-PIN (2026-09-13 incident): the started run must CARRY the
  // typed value — the composing door re-reads the estate's row AFTER
  // the patch (freshStageRow), never the client's stale open-row. The
  // old assertion stopped at patch-order; the run composed the row as
  // it stood at tile-click and silently dropped every edit.
  const methods = calls.map((c) => c.method)
  expect(methods.indexOf('drafts/get')).toBeGreaterThan(methods.indexOf('drafts/patch'))
  const start = calls.find((c) => c.method === 'runs/start')
  expect(start?.args).toMatchObject({ doc: { prompt: typed, steps: 20 } })
  // THE BENCH IS NEVER TAKEN OVER (2026-09-12): the started run
  // stays a TILE — no navigation, the bench surface stays; the
  // observer writes running/terminal onto the row
  expect(open).not.toHaveBeenCalled()
  expect(document.querySelector('section[data-cards-bench]')).toBeTruthy()
})

test('a patch refusal names itself and the run never fires', async () => {
  // the refusal rides the namespace fake's OK-arm value carrying
  // `reason` (the client's CAS-refusal reader — same shape the real
  // door serves); runs/start NEVER fires after it.
  const { calls } = stubWire({ patchFailures: [{ draftId: 'bench-s1', stageId: 's_0', delivered: false, reason: 'stage not found' }] })
  const user = userEvent.setup()
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
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  const steps = screen.getByDisplayValue('8')
  await user.clear(steps)
  await user.type(steps, '20')
  const detail = screen.getByText('Steps').closest('div[class*="zoomCard"]') as HTMLElement
  await user.click(within(detail).getByRole('button', { name: 'Run stage' }))
  await waitFor(() => {
    expect(screen.getByText(/stage not found/)).toBeTruthy()
  })
  expect(calls.some((c) => c.method === 'runs/start')).toBe(false)
})

// ── THE MEDIA DRILLDOWN MIRROR (hour 24: "clicking the preview
//    component should mirror the media drilldown view 1:1") — the
//    seat is a door; the SHARED component (the gallery's own
//    MediaDrilldown) answers ──────────────────────────────────────
test('clicking the preview seat opens the SHARED media drilldown (1:1)', async () => {
  const user = userEvent.setup()
  const calls: Call[] = []
  const benchWithResult: Record<string, unknown> = {
    draft_id: 'bench-s1', rev: 7,
    stages: [{
      id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
      params: { prompt: 'a red cube', steps: 8, turbo: false },
      result: { url: '/melite-media/runs/run-1/img/gen_00001_.png', name: 'gen_00001_.png' },
    }],
    log: [],
  }
  // the tab's FIRST paint reads the resource fixture — the result rides THERE
  const benchLive: CardsBenchValue = {
    kind: 'bench', draftId: 'bench-s1', rev: 7,
    sessionKey: 's1',
    stages: [{
      id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
      params: { prompt: 'a red cube', steps: 8, turbo: false },
      result: { url: '/melite-media/runs/run-1/img/gen_00001_.png', name: 'gen_00001_.png' },
    }],
    log: [],
  }
  vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({ form: 'image-gen', model: 'krea-2', schema: schemaEnvelope({
        prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } } }), variants: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: { 'image-gen': { label: 'Image Gen', genre: 'image', families: ['krea-2'] } } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string, method: string }
    calls.push({ method: frame.method, args: {} })
    let value: Record<string, unknown> = { ok: true }
    if (frame.method === 'bench/get') value = benchWithResult
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  })
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: benchLive }),
  } as Parameters<typeof CardsTab>[0]))
  // open the drill
  await user.click(await screen.findByText('hero frame', {}, { timeout: 4000 }))
  // the preview seat is a DOOR (role button, the aria contract)
  const seat = await screen.findByRole('button', { name: 'Open media drilldown' }, { timeout: 4000 })
  await user.click(seat)
  // THE SHARED DRILLDOWN answers: the media modal's own caption +
  // esc hint (the gallery Overlay's face, verbatim)
  expect(await screen.findByText('Esc or click the mask to close', {}, { timeout: 4000 })).toBeTruthy()
  expect(screen.getAllByText('hero frame').length).toBeGreaterThan(0) // tile + drilldown caption
  expect(screen.getByText(/gen_00001_\.png/)).toBeTruthy()
  // and the artifact itself renders (the image)
  expect(document.querySelector('img[src*="gen_00001_"]')).toBeTruthy()
})

// ── THE ✦ AGENT ENHANCE PIN (hour 24 stroke 10): one press — the
//    sweep door enhances every declared field; the write-back rides
//    the same values seam a hand edit rides; the no-clobber law
//    holds (an empty negative never wipes the card's own) ─────────
test('✦ Agent Enhance sweeps the declared fields and writes back through the values seam', async () => {
  const user = userEvent.setup()
  const enhanceCalls: Array<Record<string, unknown>> = []
  vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url)
    if (path.includes('/melite-tools/enhance')) {
      enhanceCalls.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response(JSON.stringify({
        model: 'krea-2',
        results: {
          prompt: { positive: 'A weathered fisherman mending nets at golden hour, 85mm portrait lens…', negative: 'blurry, low quality, distorted', via: 'dsh/default' },
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({ form: 'image-gen', model: 'krea-2', schema: schemaEnvelope({
        prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
        negative_prompt: { type: 'string', meta: { description: 'Negative Prompt', extra: { wtype: 'textarea' } } },
      }), variants: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: { 'image-gen': { label: 'Image Gen', genre: 'image', families: ['krea-2'] } } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string, method: string }
    let value: Record<string, unknown> = { ok: true }
    if (frame.method === 'bench/get') value = {
      draft_id: 'bench-s1', rev: 7,
      stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
        params: { prompt: 'a red cube', negative_prompt: '', steps: 8 } }],
      log: [],
    }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  })
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
        kind: 'bench', draftId: 'bench-s1', rev: 7,
        sessionKey: 's1',
        stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
          params: { prompt: 'a red cube', negative_prompt: '', steps: 8 } }],
        log: [],
      } as unknown as CardsBenchValue,
    }),
  } as Parameters<typeof CardsTab>[0]))
  await user.click(await screen.findByText('hero frame', {}, { timeout: 4000 }))
  const wand = await screen.findByRole('button', { name: 'Agent Enhance' }, { timeout: 4000 })
  // STROKE 23: the ✦ rides the TOP BAR beside Run (the frame's
  // capsule — data-testid drill-enhance), never the params rail
  expect(wand.getAttribute('data-testid')).toBe('drill-enhance')
  expect(sitsInZoomBar(wand)).toBe(true)
  await user.click(wand)
  // the sweep wire: {model, prompt} — the card's model + the live text
  expect(enhanceCalls.length).toBe(1)
  expect(enhanceCalls[0]!['model']).toBe('krea-2')
  expect(enhanceCalls[0]!['prompt']).toBe('a red cube')
  // the write-back: both text fields hold the enhanced values, the
  // serving route is named (never silent)
  await waitFor(() => {
    expect((screen.getByLabelText('Prompt') as HTMLTextAreaElement).value)
      .toBe('A weathered fisherman mending nets at golden hour, 85mm portrait lens…')
  }, { timeout: 4000 })
  expect((screen.getByLabelText('Negative Prompt') as HTMLTextAreaElement).value)
    .toBe('blurry, low quality, distorted')
  expect(screen.getByText('enhanced via dsh/default (2 fields)')).toBeTruthy()
})

// ── THE CARD LLM DROPDOWN (operator order: "the cards need a model
//    dropdown to select the models we want. muse-spark-1.3-contributor
//    i want to use over glm-5v-turbo"): the ✦ rail's select lists the
//    LIVE routes off the catalog door; a pick threads `llm` through
//    every enhance press; Auto sends nothing (the door's preference
//    chain serves) ──────────────────────────────────────────────────
test('the ✦ rail model dropdown picks the enhancer route and threads it', async () => {
  const user = userEvent.setup()
  const enhanceCalls: Array<Record<string, unknown>> = []
  window.localStorage.clear()
  vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url)
    if (path.includes('/melite-tools/catalog')) {
      return new Response(JSON.stringify({
        tools: [],
        llmRoutes: ['opencode-go/muse-spark-1.3-contributor', 'zai/glm-5v-turbo'],
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/melite-tools/enhance')) {
      enhanceCalls.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response(JSON.stringify({
        model: 'krea-2',
        results: { prompt: { positive: 'enhanced prose', negative: '', via: 'opencode-go/muse-spark-1.3-contributor' } },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({ form: 'image-gen', model: 'krea-2', schema: schemaEnvelope({
        prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      }), variants: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: { 'image-gen': { label: 'Image Gen', genre: 'image', families: ['krea-2'] } } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string, method: string }
    let value: Record<string, unknown> = { ok: true }
    if (frame.method === 'bench/get') value = {
      draft_id: 'bench-llm', rev: 3,
      stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
        params: { prompt: 'a red cube', steps: 8 } }],
      log: [],
    }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  })
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
        kind: 'bench', draftId: 'bench-llm', rev: 3,
        sessionKey: 'llm',
        stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
          params: { prompt: 'a red cube', steps: 8 } }],
        log: [],
      } as unknown as CardsBenchValue,
    }),
  } as Parameters<typeof CardsTab>[0]))
  await user.click(await screen.findByText('hero frame', {}, { timeout: 4000 }))
  // the dropdown rides the ✦ rail: Auto + the LIVE route list
  const sel = await screen.findByRole('combobox', { name: 'Enhance model' }, { timeout: 4000 })
  expect(sel.getAttribute('data-testid')).toBe('drill-llm')
  const options = [...sel.querySelectorAll('option')].map((o) => o.value)
  expect(options).toEqual(['', 'opencode-go/muse-spark-1.3-contributor', 'zai/glm-5v-turbo'])
  // Auto first: no llm on the wire (the door's chain serves)
  await user.click(await screen.findByRole('button', { name: 'Agent Enhance' }, { timeout: 4000 }))
  await waitFor(() => { expect(enhanceCalls.length).toBe(1) }, { timeout: 4000 })
  expect(enhanceCalls[0]!['llm']).toBeUndefined()
  // the pick: muse-spark over glm-5v — the press names it explicitly
  await user.selectOptions(sel, 'opencode-go/muse-spark-1.3-contributor')
  await user.click(await screen.findByRole('button', { name: 'Agent Enhance' }, { timeout: 4000 }))
  await waitFor(() => { expect(enhanceCalls.length).toBe(2) }, { timeout: 4000 })
  expect(enhanceCalls[1]!['llm']).toBe('opencode-go/muse-spark-1.3-contributor')
  // the choice PERSISTS (the shared card-LLM store)
  expect(window.localStorage.getItem('melite:card-llm:v1')).toBe('opencode-go/muse-spark-1.3-contributor')
  // back to Auto clears the store and the wire param
  await user.selectOptions(sel, '')
  await user.click(await screen.findByRole('button', { name: 'Agent Enhance' }, { timeout: 4000 }))
  await waitFor(() => { expect(enhanceCalls.length).toBe(3) }, { timeout: 4000 })
  expect(enhanceCalls[2]!['llm']).toBeUndefined()
  expect(window.localStorage.getItem('melite:card-llm:v1')).toBeNull()
  window.localStorage.clear()
})

test('the no-clobber law: an empty negative never wipes the card\'s own', async () => {
  const user = userEvent.setup()
  vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url)
    if (path.includes('/melite-tools/enhance')) {
      // distilled flavor: negative comes back "" (the model ignores it)
      return new Response(JSON.stringify({
        model: 'krea-2',
        results: { prompt: { positive: 'enhanced prose', negative: '', via: 'dsh/default' } },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({ form: 'image-gen', model: 'krea-2', schema: schemaEnvelope({
        prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
        negative_prompt: { type: 'string', meta: { description: 'Negative Prompt', extra: { wtype: 'textarea' } } },
      }), variants: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: { 'image-gen': { label: 'Image Gen', genre: 'image', families: ['krea-2'] } } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const frame = JSON.parse(String(init?.body)) as { rpcId: string, method: string }
    let value: Record<string, unknown> = { ok: true }
    if (frame.method === 'bench/get') value = {
      draft_id: 'bench-s1', rev: 7,
      stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
        params: { prompt: 'a red cube', negative_prompt: 'user wrote this', steps: 8 } }],
      log: [],
    }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  })
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
        kind: 'bench', draftId: 'bench-s1', rev: 7,
        sessionKey: 's1',
        stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
          params: { prompt: 'a red cube', negative_prompt: 'user wrote this', steps: 8 } }],
        log: [],
      } as unknown as CardsBenchValue,
    }),
  } as Parameters<typeof CardsTab>[0]))
  await user.click(await screen.findByText('hero frame', {}, { timeout: 4000 }))
  await user.click(await screen.findByRole('button', { name: 'Agent Enhance' }, { timeout: 4000 }))
  await waitFor(() => {
    expect((screen.getByLabelText('Prompt') as HTMLTextAreaElement).value).toBe('enhanced prose')
  }, { timeout: 4000 })
  // the card's OWN negative survives the empty result
  expect((screen.getByLabelText('Negative Prompt') as HTMLTextAreaElement).value).toBe('user wrote this')
})

test('the drill renders the SERVED resolved map under the user layer (the 1:1 law)', async () => {
  // the drill fresh-reads the row through drafts/get (the 2026-09-13
  // drop-pin) — the served `resolved` rides THAT read, like the real
  // lane's resolved serve
  const served = {
    draft_id: 'bench-s1', rev: 7,
    stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
      params: { prompt: 'a red cube' }, resolved: { steps: 52 } }],
    log: [],
  }
  stubWire({
    bench: served,
    draftStages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
      params: { prompt: 'a red cube' }, resolved: { steps: 52 } }],
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
    // the estate served the run's own stamps (steps 52 — neither the
    // schema default 8 nor any user key); the user layer holds only
    // the prompt, so the served base is what the Steps input shows
    useResource: () => ({
      status: 'live' as const,
      value: {
        kind: 'bench', draftId: 'bench-s1', rev: 7,
        sessionKey: 's1',
        stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
          params: { prompt: 'a red cube' }, resolved: { steps: 52 } }],
        log: [],
      } as unknown as CardsBenchValue,
    }),
  } as Parameters<typeof CardsTab>[0]))
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  // served 52 wins over the schema default 8 (no user steps key)
  expect(screen.getByDisplayValue('52')).toBeTruthy()
})


// ── STROKE 20: THE LIVE FILTER (the operator's burn: "changing the
//    MODEL isn't changing any parameters or filtering variants") —
//    through the REAL drill wiring: the pick lives in the USER
//    layer; the spec key follows the EFFECTIVE model; the refetched
//    family's own matrix reseeds the axes. ──────────────────────
test('picking a family in the Model select RE-SPECS LIVE: the anima matrix lands and the Variant axis reseats to anima\'s own row', async () => {
  const kreaSpec = {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model: 'krea-2',
    families: [{ id: 'anima', present: true }],
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
    }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: { model: 'krea-2' }, route: 'krea-2' },
      { id: 'int8', label: 'INT8', group: 'Quant', defaults: {}, route: 'krea-2', owner: 'turbo' },
      { id: 'raw', label: 'Raw', group: 'Variant', defaults: { model: 'krea-2-raw' }, route: 'krea-2-raw' },
      { id: 'raw__int8', label: 'INT8', group: 'Quant', defaults: {}, route: 'krea-2-raw', owner: 'raw' },
    ],
  }
  const animaSpec = {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model: 'anima',
    families: [{ id: 'krea-2', present: true }],
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
    }),
    variants: [
      { id: 'standard', label: 'Standard', group: 'Variant', defaults: {}, route: 'anima' },
      { id: 'f32', label: 'F32', group: 'Quant', defaults: {}, route: 'anima', owner: 'standard' },
    ],
  }
  const specsSeen: string[] = []
  stubWire({
    formSpecs: { 'krea-2': kreaSpec, anima: animaSpec },
    specsSeen,
    bench: {
      draft_id: 'bench-s1', rev: 7,
      stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { model: 'krea-2', prompt: 'a red cube' } }],
      log: [],
    },
  })
  // the resource value carries the held model too (the drill's stage
  // rides the LIVE resource, not the stub's bench/get)
  const LIVE: CardsBenchValue = {
    ...BENCH,
    stages: [{ ...BENCH.stages[0], params: { ...BENCH.stages[0].params, model: 'krea-2' } }],
  }
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: LIVE }),
  }))
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  const modelSel = await screen.findByLabelText('Model', {}, { timeout: 2000 })
  // seeded on the bench row's family: krea's turbo/int8
  expect((modelSel as HTMLSelectElement).value).toBe('krea-2')
  await screen.findByLabelText('Variant')
  expect((screen.getByLabelText('Variant') as HTMLSelectElement).value).toBe('turbo')
  // THE PICK: anima (a boarded family outside krea's matrix)
  await user.selectOptions(modelSel, 'anima')
  // the spec RE-FETCHES for anima (the user layer's pick drives the
  // key — the bench row still says krea-2)
  await waitFor(() => { expect(specsSeen).toContain('anima') })
  // THE FILTER: the Variant axis reseats to ANIMA's own row — turbo
  // (krea's variant) is gone from the offers
  const variant = await screen.findByLabelText('Variant')
  await waitFor(() => { expect((variant as HTMLSelectElement).value).toBe('standard') })
  const offered = [...variant.querySelectorAll('option')].map((o) => o.value)
  expect(offered).toEqual(['standard'])
})


// ── STROKE 25: THE NO-SILENT-REJECT LAW (the operator: "I should
//    never get auto rejected without an error message") — every
//    rejection path of the ✦ verb renders its face. ──────────────
test('✦ every enhance rejection renders its message — empty prompt, no model, zero-sweep, non-JSON error', async () => {
  const userEv = userEvent.setup()
  const cases: Array<{ name: string, prompt: string, withModel: boolean, status: number, body: string, want: string }> = [
    { name: 'empty prompt', prompt: '', withModel: true, status: 0, body: '', want: 'nothing to enhance — the prompt is empty' },
    { name: 'no model', prompt: 'a red cube', withModel: false, status: 0, body: '', want: 'no model to enhance with' },
    { name: 'zero declared fields', prompt: 'a red cube', withModel: true, status: 200, body: JSON.stringify({ model: 'krea-2', results: { style_notes: { positive: 'x', via: 'dsh/default' } } }), want: 'the enhancer returned no declared fields' },
    { name: 'non-JSON error body', prompt: 'a red cube', withModel: true, status: 502, body: 'upstream melite down', want: 'enhance failed (502: upstream melite down)' },
  ]
  for (const c of cases) {
    const bench: CardsBenchValue = {
      ...BENCH,
      stages: [{
        ...BENCH.stages[0] as typeof BENCH.stages[0],
        params: { prompt: c.prompt, negative_prompt: '', steps: 8, ...(c.withModel ? { model: 'krea-2' } : {}) },
      }],
    }
    vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
      const path = String(url)
      if (path.includes('/melite-tools/enhance')) {
        if (c.status === 0) return new Response(null, { status: 204 })
        return new Response(c.body, { status: c.status, headers: { 'content-type': 'text/plain' } })
      }
      if (path.includes('/v1/form-spec')) {
        return new Response(JSON.stringify({ form: 'image-gen', model: c.withModel ? 'krea-2' : '', schema: schemaEnvelope({
          prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
          negative_prompt: { type: 'string', meta: { description: 'Negative Prompt', extra: { wtype: 'textarea' } } },
        }), variants: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (path.includes('/v1/model-catalog')) {
        return new Response(JSON.stringify({ cards: { 'image-gen': { label: 'Image Gen', genre: 'image', families: ['krea-2'] } } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      const frame = JSON.parse(String(init?.body)) as { rpcId: string, method: string }
      let value: Record<string, unknown> = { ok: true }
      if (frame.method === 'bench/get') value = { draft_id: 'bench-s1', rev: 7, stages: bench.stages, log: [] }
      if (frame.method === 'bench/patch') value = { ok: true, rev: 8 }
      return new Response(JSON.stringify({ v: '1', id: 'f1', rpcId: frame.rpcId, ok: true, value }), { status: 200, headers: { 'content-type': 'application/json' } })
    })
    const view = render(createElement(CardsTab, {
      useTabInfo: () => ({
        tab: {
          kind: 'sidebar.right.pane.tab', contentId: undefined,
          navigation: { address: 'dsh-resource://cards/bench' },
          actions: { openResource: noop },
        },
      }),
      useResource: () => ({ status: 'live' as const, value: bench }),
    }))
    await userEv.click(tileButton())
    const wand = await screen.findByRole('button', { name: 'Agent Enhance' }, { timeout: 5000 })
    await userEv.click(wand)
    const note = await screen.findByTestId('enhance-note', {}, { timeout: 5000 })
    expect(note.textContent ?? '', c.name).toContain(c.want)
    view.unmount()
    cleanup()
  }
})

// ── STROKE 26: THE RUN-START REJECTION FACE (the operator pressed
//    Run and got NOTHING — the guard returned quiet and the start
//    promise had no catch). A THROWN start must render its reason
//    IN THE OPEN DRILL's webhook bar, and the Run pill must come
//    back (running resets). ─────────────────────────────────────
test('a THROWN run start renders its reason in the open drill — never silent, never stuck', async () => {
  stubWire()
  // the BENCH fixture holds no model arm, so the start resolves the
  // default family via the catalog — kill that wire and the start
  // THROWS (the exact unhandled path the old code died on). The
  // family cache is module state: reset it or no fetch fires.
  resetCardFamiliesCache()
  const base = globalThis.fetch
  vi.stubGlobal('fetch', async (u: unknown, init?: RequestInit): Promise<Response> => {
    if (String(u).includes('/v1/model-catalog')) throw new Error('catalog wire down')
    return (base as (u: unknown, init?: RequestInit) => Promise<Response>)(u, init)
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
    useResource: () => ({ status: 'live' as const, value: BENCH }),
  }))
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  const detail = screen.getByText('Steps').closest('div[class*="zoomCard"]') as HTMLElement
  await user.click(within(detail).getByRole('button', { name: 'Run stage' }))
  // the reason lands in the OPEN drill's webhook bar (the startError
  // seam — the tab-level seat renders behind the overlay)
  const face = await screen.findByTestId('drill-run-error', {}, { timeout: 5000 })
  expect(face.textContent ?? '').toContain('catalog wire down')
  // running resets — the Run pill comes back, never stuck on Stop
  await waitFor(() => {
    expect(within(detail).getByRole('button', { name: 'Run stage' })).toBeTruthy()
  })
})

// ── STROKE 27: THE REVLESS-WRITE CURE (the operator pressed Play,
//    the run COMPLETED on the estate, and the drill said nothing —
//    every outcome write sent NO expect_rev and the door requires
//    it, so running/progress/terminal all refused cas-conflict and
//    finished images piled up on disk while the row stayed empty).
//  ─────────────────────────────────────────────────────────────
test('the run-outcome write carries a numeric expect_rev (never revless)', async () => {
  const { calls } = stubWire()
  const user = userEvent.setup()
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
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  // no edits — the flush skips, so the FIRST drafts/patch is the
  // observer's running-outcome write (the exact call that used to
  // ride revless and die on the door's CAS law)
  const detail = screen.getByText('Steps').closest('div[class*="zoomCard"]') as HTMLElement
  await user.click(within(detail).getByRole('button', { name: 'Run stage' }))
  await waitFor(() => {
    expect(calls.some((c) => c.method === 'runs/start')).toBe(true)
    expect(calls.some((c) => c.method === 'drafts/patch')).toBe(true)
  })
  const writes = calls.filter((c) => c.method === 'drafts/patch')
  expect(writes.length).toBeGreaterThan(0)
  for (const w of writes) {
    expect(typeof (w.args as { expectRev?: unknown }).expectRev, 'every outcome write carries expect_rev').toBe('number')
  }
})

test('a CAS-conflicted write re-reads the rev and re-applies once — the run still starts', async () => {
  const { calls } = stubWire({
    patchFailures: [{ draftId: 'bench-s1', stageId: 's_0', delivered: false, reason: 'bench/cas-conflict: bench moved: rev is 8, caller held 7' }],
    draftBenchRev: 8,
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
    useResource: () => ({ status: 'live' as const, value: BENCH }),
  }))
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  // an edit forces the flush write — it conflicts once, rebases to
  // the served rev 8, re-applies, and the run starts with the edit
  const steps = screen.getByDisplayValue('8')
  await user.clear(steps)
  await user.type(steps, '20')
  const detail = screen.getByText('Steps').closest('div[class*="zoomCard"]') as HTMLElement
  await user.click(within(detail).getByRole('button', { name: 'Run stage' }))
  await waitFor(() => {
    expect(calls.some((c) => c.method === 'runs/start')).toBe(true)
  }, { timeout: 5000 })
  const writes = calls.filter((c) => c.method === 'drafts/patch')
  // the conflict burned exactly one failure, the retry carried the
  // fresh rev — the press survived the moved bench
  expect(writes.length).toBeGreaterThanOrEqual(2)
  expect((writes[1]?.args as { expectRev?: unknown }).expectRev).toBe(8)
  const start = calls.find((c) => c.method === 'runs/start')
  expect(start?.args).toMatchObject({ doc: { steps: 20 } })
})

// ── THE ATOMIC PICK / THE MARRIAGE LAW (2026-10-12, the operator's
//    live break: "I OPEN THE IMG GEN CARD, I SWITCH VARIANT TO THE
//    NON TURBO" → 'THE WRITE DID NOT LAND — card_compose: stated cfg
//    3.5 is OUTSIDE the route envelope for variant "turbo" ... The
//    studio shows your edit; the bench does not') ────────────────
// A variant pick is a MARRIAGE — the variant key, its defaults, and
// the below-axis re-seeds are ONE contract, ONE write. The per-key
// path sent cfg 3.5 (raw's default) to a bench still holding turbo;
// the compose door judged the half-state against the OLD envelope
// and refused it (the door is right; the authoring boundary was
// split). THE PIN: the pick lands as ONE drafts/patch frame carrying
// variant AND steps AND cfg TOGETHER — never a lone default against
// the old variant.
test('a variant pick lands as ONE marriage write — variant, steps, and cfg in the same frame', async () => {
  const kreaSpec = {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model: 'krea-2',
    families: [],
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      steps: { type: 'number', meta: { description: 'Steps', default: 4 } },
      cfg: { type: 'number', meta: { description: 'CFG', default: 1 } },
    }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: { model: 'krea-2', steps: 4, cfg: 1 }, route: 'krea-2' },
      { id: 'raw', label: 'Raw', group: 'Variant', defaults: { model: 'krea-2-raw', steps: 52, cfg: 3.5 }, route: 'krea-2-raw' },
    ],
  }
  const { calls } = stubWire({
    formSpecs: { 'krea-2': kreaSpec },
    bench: {
      draft_id: 'bench-s1', rev: 7,
      stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { model: 'krea-2', prompt: 'a red cube' } }],
      log: [],
    },
  })
  const LIVE: CardsBenchValue = {
    ...BENCH,
    stages: [{ ...BENCH.stages[0], params: { ...BENCH.stages[0].params, model: 'krea-2' } }],
  }
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: LIVE }),
  }))
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  const variant = await screen.findByLabelText('Variant', {}, { timeout: 2000 })
  expect((variant as HTMLSelectElement).value).toBe('turbo')
  // THE PICK: the operator's gesture — turbo → raw
  await user.selectOptions(variant, 'raw')
  // THE MARRIAGE: one frame carries variant AND its defaults together
  await waitFor(() => {
    const frames = calls
      .filter((c) => c.method === 'drafts/patch')
      .map((c) => ((c.args as { patch?: { params?: Record<string, unknown> } }).patch?.params) ?? {})
    const marriage = frames.find((p) => p['variant'] === 'raw' && p['steps'] === 52 && p['cfg'] === 3.5)
    expect(marriage, 'ONE write carries the whole marriage: variant raw + steps 52 + cfg 3.5').toBeDefined()
    // and NO half-state ever hit the wire: a frame carrying raw's
    // cfg without the variant key is the refused half-switch itself
    const half = frames.filter((p) => p['cfg'] === 3.5 && p['variant'] !== 'raw')
    expect(half, 'no frame sends raw\'s defaults against the old variant').toEqual([])
  })
})

// ── THE COMPOSE GATE AT THE DRILL (2026-09-29, the operator's law:
//    "IF THE CARD IS A CONTRACT, HOW DOES THE SYSTEM ALLOW
//    CONSTRUCTING BAD CONTRACTS? IT CAN ALL BE VALIDATED BEFOREHAND,
//    IN THE CODE"). The client is a doc-COMPOSER now: every write
//    path assembles the full candidate doc and runs the door's own
//    law BEFORE any wire frame exists. An invalid doc is refused in
//    the studio, with the door's voice — the estate never receives
//    what it would refuse. ────────────────────────────────────────
test('THE COMPOSE GATE: a typed cfg outside the envelope never reaches the wire — refused in the studio with the door\'s own voice', async () => {
  const kreaSpec = {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model: 'krea-2',
    families: [],
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      steps: { type: 'number', meta: { description: 'Steps', default: 4 } },
      cfg: { type: 'number', meta: { description: 'CFG', default: 1 } },
    }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: { model: 'krea-2', steps: 4, cfg: 1 }, route: 'krea-2',
        sampler_envelope: { steps: [4, 8], cfg: [1, 2] } },
    ],
  }
  const { calls } = stubWire({
    formSpecs: { 'krea-2': kreaSpec },
    bench: {
      draft_id: 'bench-s1', rev: 7,
      stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { model: 'krea-2', prompt: 'a red cube', variant: 'turbo', steps: 4, cfg: 1 } }],
      log: [],
    },
  })
  const LIVE: CardsBenchValue = {
    ...BENCH,
    stages: [{ ...BENCH.stages[0], params: { ...BENCH.stages[0].params, model: 'krea-2', variant: 'turbo', steps: 4, cfg: 1 } }],
  }
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: LIVE }),
  }))
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  // number fields render as slider atoms (input[type=range], the
  // spec's own widget law) — drive the range directly; CardForm's
  // edit verb coerces '9' to the number before onSet
  const cfgField = await screen.findByLabelText('CFG', {}, { timeout: 4000 })
  // THE GESTURE: slide 9 against turbo's [1,2] envelope
  fireEvent.input(cfgField, { target: { value: '9' } })
  fireEvent.change(cfgField, { target: { value: '9' } })
  // THE GATE: the door's own law, caught at composition — the face
  // speaks BEFORE any wire round-trip
  await waitFor(() => {
    expect(document.body.textContent ?? '').toContain('THE COMPOSE GATE REFUSED')
    expect(document.body.textContent ?? '').toContain('stated cfg 9 is OUTSIDE the route envelope for variant "turbo"')
  })
  // and NO frame ever left: not the trailing scheduler, not a flush
  await new Promise((r) => setTimeout(r, 500))
  expect(calls.filter((c) => c.method === 'drafts/patch'), 'the invalid doc never reached the wire').toEqual([])
})

// THE POSITIVE CONTROL: the same field INSIDE the envelope writes
// normally — the gate is exactly the door's law, never stricter
test('THE COMPOSE GATE\'S POSITIVE CONTROL: cfg inside the envelope writes as before', async () => {
  const kreaSpec = {
    form: 'image-gen', genre: 'image', engine: 'comfyui', model: 'krea-2',
    families: [],
    schema: schemaEnvelope({
      prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
      steps: { type: 'number', meta: { description: 'Steps', default: 4 } },
      cfg: { type: 'number', meta: { description: 'CFG', default: 1 } },
    }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: { model: 'krea-2', steps: 4, cfg: 1 }, route: 'krea-2',
        sampler_envelope: { steps: [4, 8], cfg: [1, 2] } },
    ],
  }
  const { calls } = stubWire({
    formSpecs: { 'krea-2': kreaSpec },
    bench: {
      draft_id: 'bench-s1', rev: 7,
      stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { model: 'krea-2', prompt: 'a red cube', variant: 'turbo', steps: 4, cfg: 1 } }],
      log: [],
    },
  })
  const LIVE: CardsBenchValue = {
    ...BENCH,
    stages: [{ ...BENCH.stages[0], params: { ...BENCH.stages[0].params, model: 'krea-2', variant: 'turbo', steps: 4, cfg: 1 } }],
  }
  const user = userEvent.setup()
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: LIVE }),
  }))
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  const cfgField = await screen.findByLabelText('CFG', {}, { timeout: 4000 })
  fireEvent.input(cfgField, { target: { value: '1.5' } })
  fireEvent.change(cfgField, { target: { value: '1.5' } })
  await waitFor(() => {
    const frames = calls.filter((c) => c.method === 'drafts/patch')
      .map((c) => ((c.args as { patch?: { params?: Record<string, unknown> } }).patch?.params) ?? {})
    expect(frames.some((p) => p['cfg'] === 1.5), 'the valid doc writes as before').toBe(true)
  })
  expect(document.body.textContent ?? '').not.toContain('THE COMPOSE GATE REFUSED')
})
