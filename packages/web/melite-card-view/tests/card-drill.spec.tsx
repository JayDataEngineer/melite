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

interface StubOpts {
  /** The bench/get doc the stub serves (default: the BENCH fixture's wire shape). */
  bench?: Record<string, unknown>
  /** Sequential runs/status docs (default: one queued doc). */
  runDocs?: Array<Record<string, unknown>>
}
function stubWire(opts?: StubOpts): { calls: Call[] } {
  const calls: Call[] = []
  const benchDoc: Record<string, unknown> = opts?.bench ?? {
    draft_id: 'bench-s1', rev: 7,
    stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: { prompt: 'a red cube', steps: 8, turbo: false } }],
    log: [],
  }
  const runDocs = [...(opts?.runDocs ?? [{ run_id: 'run-1', status: 'queued', draft_id: 'bench-s1', stages: [] }])]
  // THE ESTATE MODEL (2026-09-13 incident): drafts/patch APPLIES into
  // the served draft — the fresh read (drafts/get) must see what the
  // patch wrote, or the harness lies about the read-back law.
  const liveParams: Record<string, unknown> = { prompt: '', steps: 8, turbo: false }
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
    if (frame.method === 'bench/get') value = benchDoc
    if (frame.method === 'drafts/get') value = { draft_id: 'bench-s1', rev: 7, intent: '', stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui', params: liveParams }] }
    if (frame.method === 'runs/status') value = runDocs.length > 1 ? runDocs.shift()! : runDocs[0]!
    if (frame.method === 'runs/start') value = { run_id: 'run-1', status: 'queued' }
    if (frame.method === 'drafts/patch') {
      const patch = (frame.payload.args as { patch?: { params?: Record<string, unknown> } }).patch
      if (patch?.params !== undefined) Object.assign(liveParams, patch.params)
      value = { draftId: 'bench-s1', stageId: 's_0', delivered: true, patched: ['params'] }
    }
    return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
  }
  vi.stubGlobal('fetch', impl)
  return { calls }
}

const noop = (): void => {}

/** The tile's OPEN button — the dnd-kit sortable wrapper (li) also
 * carries role="button" with the same accessible name; scope to the
 * tile's inner button by its class (module hash keeps tileInner). */
function tileButton(): HTMLElement {
  const el = document.querySelector('button[class*="tileInner"]')
  if (el === null) throw new Error('tile button not found')
  return el as HTMLElement
}

afterEach(() => {
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
    useResource: () => ({ status: 'live', value: BENCH }),
  }))
  const tile = tileButton()
  // THE TILE FACE: kind face in the preview cell, caption strip below
  expect(within(tile).getByText('image-gen')).toBeTruthy()
  expect(within(tile).getByText('comfyui')).toBeTruthy()
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
    useResource: () => ({ status: 'live', value: BENCH }),
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
  const detail = screen.getByText('Steps').closest('div[class*="zoomDetail"]') as HTMLElement
  await user.click(within(detail).getByRole('button', { name: 'Run' }))
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
  await user.click(tileButton())
  await screen.findByText('Prompt', {}, { timeout: 4000 })
  const steps = screen.getByDisplayValue('8')
  await user.clear(steps)
  await user.type(steps, '20')
  const detail = screen.getByText('Steps').closest('div[class*="zoomDetail"]') as HTMLElement
  await user.click(within(detail).getByRole('button', { name: 'Run' }))
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
      return new Response(JSON.stringify({ form: 'image-gen', model: 'krea-2', fields: [
        { name: 'prompt', label: 'Prompt', type: 'textarea' }], variants: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
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
    useResource: () => ({ status: 'live', value: benchLive }),
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
      return new Response(JSON.stringify({ form: 'image-gen', model: 'krea-2', fields: [
        { name: 'prompt', label: 'Prompt', type: 'textarea' },
        { name: 'negative_prompt', label: 'Negative Prompt', type: 'textarea' },
      ], variants: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
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
      status: 'live',
      value: {
        kind: 'bench', draftId: 'bench-s1', rev: 7,
        stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
          params: { prompt: 'a red cube', negative_prompt: '', steps: 8 } }],
        log: [],
      } as CardsBenchValue,
    }),
  } as Parameters<typeof CardsTab>[0]))
  await user.click(await screen.findByText('hero frame', {}, { timeout: 4000 }))
  const wand = await screen.findByRole('button', { name: 'Agent Enhance' }, { timeout: 4000 })
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
  expect(screen.getByText('enhanced via dsh/default')).toBeTruthy()
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
      return new Response(JSON.stringify({ form: 'image-gen', model: 'krea-2', fields: [
        { name: 'prompt', label: 'Prompt', type: 'textarea' },
        { name: 'negative_prompt', label: 'Negative Prompt', type: 'textarea' },
      ], variants: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
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
      status: 'live',
      value: {
        kind: 'bench', draftId: 'bench-s1', rev: 7,
        stages: [{ id: 's_0', card: 'image-gen', title: 'hero frame', engine: 'comfyui',
          params: { prompt: 'a red cube', negative_prompt: 'user wrote this', steps: 8 } }],
        log: [],
      } as CardsBenchValue,
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
