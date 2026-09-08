// build_flow multi-step walls (bun:test, fetch mocked — no gateway,
// no GPU). Pins the compose contract:
//   1. validate happens FIRST and its refusal text rides VERBATIM
//      (the AI feedback loop — no draft exists on refusal)
//   2. connects fold into typed edges; inference + loud pre-HTTP
//      refusals for unkind'd initial wires
//   3. the single-step allowlist is DERIVED from /v1/card-tools
//      (the hardcoded 6-model list is dead)

import { afterEach, describe, expect, test } from 'bun:test'
import { buildFlow } from '../src/tools/build-flow.ts'

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

describe('build_flow multi-step — the AI feedback loop', () => {
  test('validate runs FIRST; the draft carries the compiled flow', async () => {
    const seen = mockFetch([
      okValidate,
      (_u, body) => {
        if (String(_u).endsWith('/v1/flows/drafts')) {
          return { status: 200, body: { draftId: 'd1', stages: (body as { stages: unknown[] }).stages } }
        }
        return undefined
      },
    ])
    const tool = buildFlow('http://g')
    const out = await tool.execute({ flow: FLOW }, { signal: AbortSignal.timeout(2000) })
    const v = out as { draftId: string; flow_inline?: unknown }
    expect(v.draftId).toBe('d1')
    // ONE carrier: the compiled body rides the DRAFT DOC (`flow`
    // member — the card surface hydrates from the draft), never the
    // tool result. A result-carried copy would be a second source of
    // truth to drift.
    expect(v.flow_inline).toBeUndefined()
    // order: validate before drafts
    const paths = seen.calls.map((c) => c.url)
    expect(paths[0]).toContain('/v1/flows/validate')
    expect(paths[1]).toContain('/v1/flows/drafts')
    const draftBody = JSON.parse(seen.calls[1].init!.body as string)
    // the folded body: connect inference + explicit kind
    const move = draftBody.flow.stages[1]
    expect(move.inputs).toEqual({
      frame: { stage: 'still', output: 'default' },
      prompt: { initial: 'prompt' },
    })
    expect(move.expected).toEqual({ frame: 'image', prompt: 'text' })
    // the draft body: one tile per stage, ids SHARED with the flow
    // body (the editor's param overlay joins card ↔ flow stage by id —
    // mismatched ids would silently drop user edits at Run time)
    expect(draftBody.stages).toHaveLength(2)
    expect(draftBody.stages.map((s: { id: string }) => s.id)).toEqual(['still', 'move'])
    expect(draftBody.stages[0].service).toBe('comfyui')
  })

  test('a compile refusal propagates VERBATIM and no draft is posted', async () => {
    const refusal = "flow 'x' stage 'move' input 'frame': expected text, got image "
      + "from stage 'still' output 'default' — must be text"
    const seen = mockFetch([
      () => ({ status: 400, body: { error: refusal } }),
    ])
    const tool = buildFlow('http://g')
    let msg = ''
    try {
      await tool.execute({ flow: FLOW }, { signal: AbortSignal.timeout(2000) })
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toContain(refusal)          // verbatim compile text
    expect(seen.calls.some((c) => c.url.includes('/v1/flows/drafts'))).toBe(false)
  })

  test('initial wires without a kind refuse pre-HTTP (nothing to infer)', async () => {
    const seen = mockFetch([okValidate])
    const tool = buildFlow('http://g')
    let msg = ''
    try {
      await tool.execute({
        flow: {
          id: 'f',
          stages: [{ id: 'a', engine: 'comfyui' }],
          connects: [{ from: 'initial.prompt', to: 'a.prompt' }],
        },
      }, { signal: AbortSignal.timeout(2000) })
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toContain('initial wires ALWAYS need an explicit kind')
    expect(seen.calls).toHaveLength(0)      // refused before any HTTP
  })

  test('connects naming unknown stages refuse with the known list', async () => {
    const tool = buildFlow('http://g')
    let msg = ''
    try {
      await tool.execute({
        flow: {
          id: 'f',
          stages: [{ id: 'a', engine: 'comfyui' }],
          connects: [{ from: 'ghost', to: 'a.x' }],
        },
      }, { signal: AbortSignal.timeout(2000) })
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toContain('unknown stage')
    expect(msg).toContain('"ghost"')
  })
})

describe('build_flow single-step — the live allowlist', () => {
  const CATALOG = { models: { 'krea-2': { family: 'krea' } }, families: { krea: { label: 'Krea 2' } } }
  const TOOLS = [
    { model: 'new-model-1', stage_title: 'New', params_schema: null },
    { model: 'music3', stage_title: 'Music', params_schema: null },
  ]

  test('a model in the LIVE card-tools list passes (no hardcoded six)', async () => {
    const seen = mockFetch([
      (u) => (u.endsWith('/v1/card-tools')
        ? { status: 200, body: TOOLS } : undefined),
      (u) => (u.endsWith('/v1/model-catalog')
        ? { status: 200, body: CATALOG } : undefined),
      (u) => (u.includes('validate?model=')
        ? { status: 200, body: { runnable: true } } : undefined),
      (_u, body) => ({ status: 200, body: { draftId: 'd9', stages: (body as { stages: unknown[] }).stages } }),
    ])
    const tool = buildFlow('http://g')
    const out = await tool.execute(
      { model: 'new-model-1', prompt: 'hi' },
      { signal: AbortSignal.timeout(2000) },
    )
    expect((out as { draftId: string }).draftId).toBe('d9')
    // title precedence: manifest stage_title wins over family label
    const draftBody = JSON.parse(
      seen.calls.find((c) => c.url.endsWith('/v1/flows/drafts'))!.init!.body as string)
    expect(draftBody.stages[0].title).toBe('New')
  })

  test('a model with no card tool refuses naming the LIVE list', async () => {
    mockFetch([
      (u) => (u.endsWith('/v1/card-tools')
        ? { status: 200, body: TOOLS } : undefined),
      (u) => (u.endsWith('/v1/model-catalog')
        ? { status: 200, body: CATALOG } : undefined),
    ])
    const tool = buildFlow('http://g')
    let msg = ''
    try {
      await tool.execute({ model: 'not-a-card', prompt: 'hi' }, { signal: AbortSignal.timeout(2000) })
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toContain('has no card tool')
    expect(msg).toContain('new-model-1')
    expect(msg).toContain('music3')
  })
})
