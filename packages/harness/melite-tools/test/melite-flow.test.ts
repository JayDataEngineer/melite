// melite_flow walls (bun:test, fetch mocked — no gateway, no
// GPU). Ports the build_flow compose contract + the flow_run /
// card_run L4 walls onto the ONE execution verb:
//   1. AD-HOC: validate runs FIRST and its refusal rides the VALUE
//      verbatim (the AI feedback loop — no draft exists on refusal)
//   2. connects fold into typed edges; inference + loud pre-HTTP
//      refusals for unkind'd initial wires (values, never throws)
//   3. CARD: the allowlist is DERIVED from /v1/card-tools (the
//      hardcoded 6-model list is dead); refusals ride the value
//   4. L4: the test flag rides the start body in ALL THREE modes
//   5. CARD BIRTH LAW: compose-first in every mode — the start
//      rides the minted draft_id; a refused compose never starts

import { afterEach, describe, expect, test } from 'bun:test'
import { meliteFlow } from '../src/tools/melite-flow.ts'

const origFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = origFetch })

interface Seen {
  calls: Array<{ url: string; init: RequestInit | undefined }>
}

function mockFetch(handlers: Array<(url: string, body: unknown) => { status: number; body: unknown } | undefined>): Seen {
  const seen: Seen = { calls: [] }
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const u = String(url)
    const body = init !== undefined && typeof init.body === 'string'
      ? JSON.parse(init.body) : undefined
    seen.calls.push({ url: u, init })
    for (const h of handlers) {
      const r = h(u, body)
      if (r !== undefined) {
        return new Response(JSON.stringify(r.body), { status: r.status })
      }
    }
    return new Response('unmocked', { status: 500 })
  }) as typeof fetch
  return seen
}

const FLOW = {
  id: 'still-to-motion',
  description: 'gen then animate',
  stages: [
    { id: 'still', engine: 'comfyui', params: { workflow: 'w' }, outputs: { default: 'image' } },
    { id: 'move', engine: 'comfyui', params: {} },
  ],
  connects: [
    { from: 'still', to: 'move.frame' },          // kind inferred: image
    { from: 'initial.prompt', to: 'move.prompt', kind: 'text' },
  ],
}

function okValidate(url: string, body: unknown) {
  if (url.endsWith('/v1/flows/validate')) {
    return { status: 200, body: { ok: true, flow: (body as { id: string }).id, stages: [] } }
  }
  return undefined
}

function okDraftThenStart(draftId: string, runId: string) {
  return (_u: string, body: unknown) => {
    if (String(_u).endsWith('/v1/flows/drafts')) {
      return { status: 200, body: { draftId, stages: (body as { stages: unknown[] }).stages } }
    }
    if (String(_u).endsWith('/v1/flows/start')) {
      return { status: 202, body: { run_id: runId, status: 'queued' } }
    }
    return undefined
  }
}

function decodeJsonBody(init: RequestInit | undefined): Record<string, unknown> {
  if (!init || !init.body) throw new Error('no body captured')
  if (typeof init.body !== 'string') throw new Error('body is not a string')
  return JSON.parse(init.body) as Record<string, unknown>
}

describe('melite_flow adhoc — the AI feedback loop', () => {
  test('validate runs FIRST; draft + start follow; result carries no flow body', async () => {
    const seen = mockFetch([okValidate, okDraftThenStart('d1', 'r1')])
    const tool = meliteFlow('http://g')
    const out = await tool.execute({ ...FLOW }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    expect(out.error).toBeUndefined()
    expect(out.mode).toBe('adhoc')
    expect(out.target).toBe('still-to-motion')
    expect(out.run_id).toBe('r1')
    // ONE carrier: the compiled body rides the DRAFT DOC (`flow`
    // member — the card surface hydrates from the draft), never the
    // tool result. A result-carried copy would be a second source of
    // truth to drift.
    expect(out.flow_inline).toBeUndefined()
    expect(out.flow).toBeUndefined()
    // order: validate before drafts before start
    const paths = seen.calls.map((c) => c.url)
    expect(paths[0]).toContain('/v1/flows/validate')
    expect(paths[1]).toContain('/v1/flows/drafts')
    expect(paths[2]).toContain('/v1/flows/start')
    const draftBody = decodeJsonBody(seen.calls[1].init)
    // the folded body: connect inference + explicit kind
    const move = (draftBody.flow as { stages: Array<{ inputs: unknown; expected: unknown }> }).stages[1]
    expect(move.inputs).toEqual({
      frame: { stage: 'still', output: 'default' },
      prompt: { initial: 'prompt' },
    })
    expect(move.expected).toEqual({ frame: 'image', prompt: 'text' })
    // the draft body: one tile per stage, ids SHARED with the flow
    // body (the editor's param overlay joins card ↔ flow stage by id —
    // mismatched ids would silently drop user edits at Run time)
    const tiles = draftBody.stages as Array<{ id: string; service: string }>
    expect(tiles).toHaveLength(2)
    expect(tiles.map((s) => s.id)).toEqual(['still', 'move'])
    expect(tiles[0].service).toBe('comfyui')
    // the start rides the COMPILED body + the minted draft
    const startBody = decodeJsonBody(seen.calls[2].init)
    expect((startBody.flow_inline as { id: string }).id).toBe('still-to-motion')
    expect(startBody.draft_id).toBe('d1')
    expect(startBody.test).toBe(false)
  })

  test('a compile refusal rides the VALUE verbatim and no draft is posted', async () => {
    const refusal = "flow 'x' stage 'move' input 'frame': expected text, got image "
      + "from stage 'still' output 'default' — must be text"
    const seen = mockFetch([
      () => ({ status: 400, body: { error: refusal } }),
    ])
    const tool = meliteFlow('http://g')
    const out = await tool.execute({ ...FLOW }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    expect(String(out.error)).toContain(refusal)   // verbatim compile text, valued
    expect(seen.calls.some((c) => c.url.includes('/v1/flows/drafts'))).toBe(false)
  })

  test('initial wires without a kind refuse pre-HTTP (nothing to infer)', async () => {
    const seen = mockFetch([okValidate])
    const tool = meliteFlow('http://g')
    const out = await tool.execute({
      stages: [{ id: 'a', engine: 'comfyui' }],
      connects: [{ from: 'initial.prompt', to: 'a.prompt' }],
    }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    expect(String(out.error)).toContain('initial wires ALWAYS need an explicit kind')
    expect(seen.calls).toHaveLength(0)      // refused before any HTTP
  })

  test('connects naming unknown stages refuse with the known list', async () => {
    const tool = meliteFlow('http://g')
    const out = await tool.execute({
      stages: [{ id: 'a', engine: 'comfyui' }],
      connects: [{ from: 'ghost', to: 'a.x' }],
    }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    expect(String(out.error)).toContain('unknown stage')
    expect(String(out.error)).toContain('"ghost"')
  })
})

describe('melite_flow card — the live allowlist', () => {
  const CATALOG = { models: { 'new-model-1': { family: 'krea' } }, families: { krea: { label: 'Krea 2' } } }
  const TOOLS = [
    { model: 'new-model-1', stage_title: 'New', params_schema: null },
    { model: 'music3', stage_title: 'Music', params_schema: null },
  ]
  const cardMocks = () => mockFetch([
    (u) => (u.endsWith('/v1/card-tools')
      ? { status: 200, body: TOOLS } : undefined),
    (u) => (u.endsWith('/v1/model-catalog')
      ? { status: 200, body: CATALOG } : undefined),
    (u) => (u.includes('validate?model=')
      ? { status: 200, body: { runnable: true } } : undefined),
    okDraftThenStart('d9', 'r9'),
  ])

  test('a model in the LIVE card-tools list registers (no hardcoded six)', async () => {
    const seen = cardMocks()
    const tool = meliteFlow('http://g')
    const out = await tool.execute(
      { card: 'image-gen', model: 'new-model-1', prompt: 'hi' },
      { signal: AbortSignal.timeout(2000) },
    ) as Record<string, unknown>
    expect(out.error).toBeUndefined()
    expect(out.mode).toBe('card')
    expect(out.target).toBe('image-gen')
    expect(out.run_id).toBe('r9')
    const draftBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/drafts'))!.init)
    const tiles = draftBody.stages as Array<{ service: string; params: Record<string, unknown> }>
    expect(tiles[0].service).toBe('new-model-1')
    expect(tiles[0].params.prompt).toBe('hi')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    expect(startBody.model).toBe('new-model-1')
    expect(startBody.prompt).toBe('hi')
    expect(startBody.draft_id).toBe('d9')
  })

  test('a model with no card tool refuses naming the LIVE list', async () => {
    mockFetch([
      (u) => (u.endsWith('/v1/card-tools')
        ? { status: 200, body: TOOLS } : undefined),
      (u) => (u.endsWith('/v1/model-catalog')
        ? { status: 200, body: CATALOG } : undefined),
    ])
    const tool = meliteFlow('http://g')
    const out = await tool.execute(
      { card: 'image-gen', model: 'not-a-card', prompt: 'hi' },
      { signal: AbortSignal.timeout(2000) },
    ) as Record<string, unknown>
    expect(String(out.error)).toContain('has no card tool')
    expect(String(out.error)).toContain('new-model-1')
    expect(String(out.error)).toContain('music3')
  })
})

describe('melite_flow L4 — the test flag rides every mode', () => {
  test('template: test:false default, flow explicitly named, draft minted', async () => {
    const seen = mockFetch([okDraftThenStart('draft-headless-1', 'r0')])
    const tool = meliteFlow('http://g')
    const out = await tool.execute({ flow: 'foo' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    expect(out.error).toBeUndefined()
    expect(out.mode).toBe('flow')
    expect(out.run_id).toBe('r0')
    // CARD BIRTH LAW: compose happened FIRST, carrying the template
    expect(seen.calls).toHaveLength(2)
    expect(seen.calls[0].url).toBe('http://g/v1/flows/drafts')
    const composed = decodeJsonBody(seen.calls[0].init)
    expect(composed.flow).toBe('foo')
    const body = decodeJsonBody(seen.calls[1].init)
    expect(body.test).toBe(false)
    expect(body.flow).toBe('foo')
    // the dead {yaml:} key must not ride along (retired 2026-09-04
    // with the yaml text parser — resolve_request accepts flow/model)
    expect(body.yaml).toBeUndefined()
    expect(body.draft_id).toBe('draft-headless-1')
  })

  test('template: test:true + params ride the start', async () => {
    const seen = mockFetch([okDraftThenStart('draft-headless-1', 'r0')])
    const tool = meliteFlow('http://g')
    await tool.execute(
      { flow: 'bar', params: { seed: 42, steps: 8 }, test: true },
      { signal: AbortSignal.timeout(2000) },
    )
    const posts = seen.calls.filter((s) => s.url.endsWith('/v1/flows/start'))
    expect(posts).toHaveLength(1)
    const body = decodeJsonBody(posts[0].init)
    expect(body.test).toBe(true)
    expect(body.seed).toBe(42)
    expect(body.steps).toBe(8)
    // the flow is still EXPLICITLY named (QUEUE LANE LAW) — test is
    // a side flag, never a substitute for the named flow
    expect(body.flow).toBe('bar')
  })

  test('template: a refused compose never reaches the start door', async () => {
    globalThis.fetch = (async (url: unknown) => {
      const u = String(url)
      if (u.endsWith('/v1/flows/drafts')) {
        return new Response(JSON.stringify({ error: 'unknown flow' }), { status: 400 })
      }
      throw new Error('start door must not be reached, got ' + u)
    }) as typeof fetch
    const tool = meliteFlow('http://g')
    const out = await tool.execute(
      { flow: 'no-such-flow' },
      { signal: AbortSignal.timeout(2000) },
    ) as { error?: string }
    expect(out.error).toContain('unknown flow')
  })

  test('adhoc: test:true rides the flow_inline start', async () => {
    const seen = mockFetch([okValidate, okDraftThenStart('d2', 'r2')])
    const tool = meliteFlow('http://g')
    await tool.execute({ ...FLOW, test: true }, { signal: AbortSignal.timeout(2000) })
    const posts = seen.calls.filter((s) => s.url.endsWith('/v1/flows/start'))
    expect(posts).toHaveLength(1)
    const body = decodeJsonBody(posts[0].init)
    expect(body.test).toBe(true)
    expect((body.flow_inline as { id: string }).id).toBe('still-to-motion')
    expect(body.draft_id).toBe('d2')
  })
})
