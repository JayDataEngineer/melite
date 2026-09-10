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

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { meliteFlow } from '../src/tools/melite-flow.ts'
import type { EstateRequest } from '../src/estate.ts'

// The recording fake IS the estate's far side (EstateRequest, the
// transport contract): no global fetch, no HTTP, no port — the same
// seam makeEstateRequest builds in production.
interface Seen {
  calls: Array<{ url: string; init: { body?: unknown } | undefined }>
  request: EstateRequest
}

function mockFetch(handlers: Array<(url: string, body: unknown) => { status: number; body: unknown } | undefined>): Seen {
  const seen: Seen = {
    calls: [],
    request: undefined as never,
  }
  seen.request = (async (_method: 'POST', path: string, body: unknown): Promise<unknown> => {
    const u = path
    seen.calls.push({ url: u, init: { body } })
    for (const h of handlers) {
      const r = h(u, body)
      if (r !== undefined) {
        if (r.status < 200 || r.status >= 300) {
          // Bench lanes speak the remote voice: the missing bench is
          // the classified bench/not-found RemoteError (the seats'
          // law; the HTTP 404 died with the door).
          if (/\/v1\/bench(\/|$)/.test(u) && r.status === 404) {
            const msg = typeof r.body === 'object' && r.body !== null && 'error' in r.body
              ? String((r.body as { error: unknown }).error)
              : 'no such bench'
            throw new RemoteError('bench/not-found', msg, { session: 'main' })
          }
          // The seats' voice: a 4xx is a named RemoteError (the
          // body's error text rides the message — what the seats
          // deliver for compile/start refusals).
          const msg = typeof r.body === 'object' && r.body !== null && 'error' in r.body
            ? String((r.body as { error: unknown }).error)
            : 'mock refusal'
          throw new RemoteError('runs/flow-compile', msg, { loc: 'flow' })
        }
        return r.body
      }
    }
    throw new RemoteError('runs/unknown-run', 'unmocked lane ' + u, { runId: '' })
  }) as EstateRequest
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

/** The bench law: every run mode ensures THE shared bench first —
 *  the fixtures answer it like the bench door would. The CAS
 *  read-modify-write (REBUILD-12): the client GETs the bench row
 *  first (a live rev rides as expect_rev; not-found births) — the
 *  fixtures answer the GET with a live bench row. */
function okBenchWith(id: string): (url: string) => { status: number; body: unknown } | undefined {
  return (url: string) => {
    if (url.endsWith('/v1/bench/ensure')) {
      return { status: 200, body: { bench: 'the-shared-bench', draft_id: id, ok: true } }
    }
    if (/\/v1\/bench\/[^/?]+$/.test(url)) {
      return { status: 200, body: { session: 'main', rev: 0, stages: [], log: [] } }
    }
    return undefined
  }
}
const okBench = okBenchWith('d_bench')

function okValidate(url: string, body: unknown) {
  if (url.endsWith('/v1/flows/validate')) {
    return { status: 200, body: { ok: true, flow: (body as { id: string }).id, stages: [] } }
  }
  return undefined
}

function okDraftThenStart(draftId: string, runId: string) {
  return (_u: string, body: unknown) => {
    if (String(_u).endsWith('/v1/bench/ensure')) {
      return { status: 200, body: { draftId, stages: (body as { stages: unknown[] }).stages } }
    }
    if (String(_u).endsWith('/v1/flows/start')) {
      return { status: 202, body: { run_id: runId, status: 'queued' } }
    }
    return undefined
  }
}

function decodeJsonBody(init: { body?: unknown } | undefined): Record<string, unknown> {
  if (!init || init.body === undefined) throw new Error('no body captured')
  return init.body as Record<string, unknown>
}

describe('melite_flow adhoc — the AI feedback loop', () => {
  test('validate runs FIRST; draft + start follow; result carries no flow body', async () => {
    const seen = mockFetch([okBenchWith('d1'), okValidate, okDraftThenStart('d1', 'r1')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.mode, 'adhoc')
    assert.equal(out.target, 'still-to-motion')
    assert.equal(out.run_id, 'r1')
    // ONE carrier: the compiled body rides the DRAFT DOC (`flow`
    // member — the card surface hydrates from the draft), never the
    // tool result. A result-carried copy would be a second source of
    // truth to drift.
    assert.equal(out.flow_inline, undefined)
    assert.equal(out.flow, undefined)
    const paths = seen.calls.map((c) => c.url)
    // the CURRENT law (REBUILD-12): validate FIRST (no GPU on a bad
    // wire), then the CAS read (GET the bench row — a live rev rides
    // as expect_rev), then the bench ensure (the doc-backed draft),
    // then start. No drafts door.
    assert.ok(paths[0].includes('/v1/flows/validate'), paths[0] + ' lacks ' + '/v1/flows/validate')
    assert.ok(/^\/v1\/bench\/[^/?]+$/.test(paths[1]), paths[1] + ' lacks the CAS bench read')
    assert.ok(paths[2].includes('/v1/bench/ensure'), paths[2] + ' lacks ' + '/v1/bench/ensure')
    assert.ok(paths[3].includes('/v1/flows/start'), paths[3] + ' lacks ' + '/v1/flows/start')
    const draftBody = decodeJsonBody(seen.calls[2].init)
    // the folded body: connect inference + explicit kind
    const move = (draftBody.stages as Array<{ inputs: unknown; expected: unknown }>)[1]
    assert.deepEqual(move.inputs, {
      frame: { stage: 'still', output: 'default' },
      prompt: { initial: 'prompt' },
    })
    assert.deepEqual(move.expected, { frame: 'image', prompt: 'text' })
    // the draft body: one tile per stage, ids SHARED with the flow
    // body (the editor's param overlay joins card ↔ flow stage by id —
    // mismatched ids would silently drop user edits at Run time)
    const tiles = draftBody.stages as Array<{ id: string; engine: string }>
    assert.equal(tiles.length, 2)
    assert.deepEqual(tiles.map((s) => s.id), ['still', 'move'])
    assert.equal(tiles[0].engine, 'comfyui')
    // the start rides the COMPILED body + the bench's doc-backed draft
    const startBody = decodeJsonBody(seen.calls[3].init)
    assert.equal((startBody.flow_inline as { id: string }).id, 'still-to-motion')
    assert.equal(startBody.draft_id, 'd1')
    assert.equal(startBody.test, false)
  })

  test('a compile refusal rides the VALUE verbatim and no draft is posted', async () => {
    const refusal = "flow 'x' stage 'move' input 'frame': expected text, got image "
      + "from stage 'still' output 'default' — must be text"
    const seen = mockFetch([okBench, 
      () => ({ status: 400, body: { error: refusal } }),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.ok(String(out.error).includes(refusal), String(out.error) + ' lacks ' + refusal)   // verbatim compile text, valued
    assert.equal(seen.calls.some((c) => c.url.includes('/v1/flows/drafts')), false)
  })

  test('initial wires without a kind refuse pre-HTTP (nothing to infer)', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      stages: [{ id: 'a', engine: 'comfyui' }],
      connects: [{ from: 'initial.prompt', to: 'a.prompt' }],
    }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.ok(String(out.error).includes('initial wires ALWAYS need an explicit kind'), String(out.error) + ' lacks ' + 'initial wires ALWAYS need an explicit kind')
    assert.equal(seen.calls.length, 0)      // refused before any HTTP
  })

  test('connects naming unknown stages refuse with the known list', async () => {
    const quiet = mockFetch([okBench, ])
    const tool = meliteFlow(quiet.request)
    const out = await tool.execute({
      stages: [{ id: 'a', engine: 'comfyui' }],
      connects: [{ from: 'ghost', to: 'a.x' }],
    }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.ok(String(out.error).includes('unknown stage'), String(out.error) + ' lacks ' + 'unknown stage')
    assert.ok(String(out.error).includes('"ghost"'), String(out.error) + ' lacks ' + '"ghost"')
  })
})

describe('melite_flow card — the live allowlist', () => {
  const CATALOG = { models: { 'new-model-1': { family: 'krea' } }, families: { krea: { label: 'Krea 2' } } }
  const TOOLS = [
    { model: 'new-model-1', stage_title: 'New', params_schema: null },
    { model: 'music3', stage_title: 'Music', params_schema: null },
  ]
  const cardMocks = () => mockFetch([okBenchWith('d9'), 
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
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { card: 'image-gen', model: 'new-model-1', prompt: 'hi' },
      { signal: AbortSignal.timeout(2000) },
    ) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.mode, 'card')
    assert.equal(out.target, 'image-gen')
    assert.equal(out.run_id, 'r9')
    const draftBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init)
    const tiles = draftBody.stages as Array<{ card?: string; params: Record<string, unknown> }>
    assert.equal(tiles[0].card, 'image-gen')
    assert.equal(tiles[0].params.prompt, 'hi')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.equal(startBody.model, 'new-model-1')
    assert.equal(startBody.prompt, 'hi')
    assert.equal(startBody.draft_id, 'd9')
  })

  test('a model the card arm refuses surfaces the DOOR voice (REBUILD-9)', async () => {
    // The manifest/runnability gates moved INTO the runs registry's
    // start {model:} arm (phase1Card) — the tool no longer re-derives
    // card-tools client-side (those lanes died with the gateway).
    // The refusal rides the protocol's RemoteError; the tool surfaces
    // the arm's own text (door-verbatim), never a transport code.
    const refusal = Object.assign(
      new Error('no model unit for model: not-a-card (no .catalog.models row not-a-card in the frozen discovery catalog and no family declares route not-a-card in its variants\' cells — checked the class tree\'s _routes map)'),
      // the protocol's structural marker (remoteErrorOf reads
      // isDSHRemoteError + code — never instanceof, cross-copy law)
      { name: 'RemoteError', isDSHRemoteError: true, code: 'runs/model-unresolvable' },
    )
    const { request } = mockFetch([
      okBenchWith('d9'),
      (u) => {
        if (u.endsWith('/v1/flows/start')) throw refusal
        return undefined
      },
    ])
    const tool = meliteFlow(request)
    const out = await tool.execute(
      { card: 'image-gen', model: 'not-a-card', prompt: 'hi' },
      { signal: AbortSignal.timeout(2000) },
    ) as Record<string, unknown>
    assert.ok(typeof out.error === 'string' && out.error !== '', 'expected a refusal')
    assert.ok(String(out.error).includes('no model unit for model: not-a-card'),
      String(out.error) + ' lacks the arm voice')
  })
})

describe('melite_flow L4 — the test flag rides every mode', () => {
  test('template: test:false default, flow explicitly named, draft minted', async () => {
    const seen = mockFetch([okBenchWith('draft-headless-1'), okDraftThenStart('draft-headless-1', 'r0')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.mode, 'flow')
    assert.equal(out.run_id, 'r0')
    // CARD BIRTH LAW (bench form): the bench ensure carries the
    // template reference; the start rides its doc-backed draft
    assert.equal(seen.calls.length, 3)
    assert.ok(/^\/v1\/bench\/[^/?]+$/.test(seen.calls[0].url), 'CAS read first')
    assert.equal(seen.calls[1].url, '/v1/bench/ensure')
    const composed = decodeJsonBody(seen.calls[1].init)
    assert.equal(composed.intent, 'foo')
    const body = decodeJsonBody(seen.calls[2].init)
    assert.equal(body.test, false)
    assert.equal(body.flow, 'foo')
    // the dead {yaml:} key must not ride along (retired 2026-09-04
    // with the yaml text parser — resolve_request accepts flow/model)
    assert.equal(body.yaml, undefined)
    assert.equal(body.draft_id, 'draft-headless-1')
  })

  test('template: test:true + params ride the start', async () => {
    const seen = mockFetch([okBenchWith('draft-headless-1'), okDraftThenStart('draft-headless-1', 'r0')])
    const tool = meliteFlow(seen.request)
    await tool.execute(
      { flow: 'bar', params: { seed: 42, steps: 8 }, test: true },
      { signal: AbortSignal.timeout(2000) },
    )
    const posts = seen.calls.filter((s) => s.url.endsWith('/v1/flows/start'))
    assert.equal(posts.length, 1)
    const body = decodeJsonBody(posts[0].init)
    assert.equal(body.test, true)
    assert.equal(body.seed, 42)
    assert.equal(body.steps, 8)
    // the flow is still EXPLICITLY named (QUEUE LANE LAW) — test is
    // a side flag, never a substitute for the named flow
    assert.equal(body.flow, 'bar')
  })

  test('a refused start carries the error and NO draft_id (no tile for a dead run)', async () => {
    // compose succeeds, start refuses: the value names the refusal and
    // omits the handle — a tile never mounts for a run that never
    // registered (the estate card-tool law, now uniform).
    const seen = mockFetch([okBench, 
      () => ({ status: 400, body: { error: 'queue full' } }),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.ok(out.error.includes('queue full'), out.error + ' lacks ' + 'queue full')
    assert.equal(out.draft_id, undefined)
    const meta = tool.output.presentationMeta!({ flow: 'foo' }, out as never) as Record<string, unknown>
    assert.equal(meta.draft_id, undefined)
    assert.ok(String(meta.error).includes('queue full'), String(meta.error) + ' lacks ' + 'queue full')
  })

  test('template: a refused compose never reaches the start door', async () => {
    const seen = mockFetch([
      () => ({ status: 400, body: { error: 'unknown flow' } }),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { flow: 'no-such-flow' },
      { signal: AbortSignal.timeout(2000) },
    ) as { error?: string }
    assert.ok(out.error.includes('unknown flow'), out.error + ' lacks ' + 'unknown flow')
  })

  test('adhoc: test:true rides the flow_inline start', async () => {
    const seen = mockFetch([okBenchWith('d2'), okValidate, okDraftThenStart('d2', 'r2')])
    const tool = meliteFlow(seen.request)
    await tool.execute({ ...FLOW, test: true }, { signal: AbortSignal.timeout(2000) })
    const posts = seen.calls.filter((s) => s.url.endsWith('/v1/flows/start'))
    assert.equal(posts.length, 1)
    const body = decodeJsonBody(posts[0].init)
    assert.equal(body.test, true)
    assert.equal((body.flow_inline as { id: string }).id, 'still-to-motion')
    assert.equal(body.draft_id, 'd2')
  })
})

describe('melite_flow tile contract — the chat hydrates from the render', () => {
  // FlowCards parseCardsBlock (packages/web/melite-card-view): the token
  // after the FIRST 'card ' is the draft id iff it starts with draft-
  // or p_. The render leads with the token so the first hit IS the
  // handle — this describe pins that from the tool side (the parser is
  // client-bundle code; the rule is restated here verbatim).
  function parseTileToken(text: string): string | null {
    const atCard = text.indexOf('card ')
    const atIdx = atCard >= 0 ? atCard : text.indexOf('draft ')
    if (atIdx < 0) return null
    const rest = text.slice(atIdx + (atCard >= 0 ? 5 : 6))
    const end = rest.indexOf(' ')
    const tok = end < 0 ? rest : rest.slice(0, end)
    return (tok.startsWith('draft-') || tok.startsWith('p_')) && tok.length > 2 ? tok : null
  }

  test('template success: value carries draft_id; render token parses to it', async () => {
    const seen = mockFetch([okBenchWith('draft-tile-1'), okDraftThenStart('draft-tile-1', 'r7')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.draft_id, 'draft-tile-1')
    const parts = tool.output.render({ flow: 'foo' }, out as never) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.equal(parseTileToken(text), 'draft-tile-1')
  })

  test('adhoc success: render token parses to the minted draft', async () => {
    const seen = mockFetch([okBenchWith('draft-tile-2'), okValidate, okDraftThenStart('draft-tile-2', 'r8')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.draft_id, 'draft-tile-2')
    const parts = tool.output.render({ ...FLOW }, out as never) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.equal(parseTileToken(text), 'draft-tile-2')
  })

  test('presentationMeta carries the handle — the native channel, pure', async () => {
    const seen = mockFetch([okBenchWith('draft-meta-7'), okDraftThenStart('draft-meta-7', 'r9')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    // the projector is the persisted payload (ToolResultNode.meta): the
    // client card view narrows it — never parses prose. Pure: same value
    // in, same payload out.
    const meta = tool.output.presentationMeta!({ flow: 'foo' }, out as never) as Record<string, unknown>
    assert.deepEqual(meta, {
      mode: 'flow',
      target: 'foo',
      draft_id: 'draft-meta-7',
      run_id: 'r9',
      status: 'queued',
    })
    assert.deepEqual(tool.output.presentationMeta!({ flow: 'foo' }, out as never), meta)
    // refusals project the error with NO handle
    const refused = await tool.execute({}, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    const rmeta = tool.output.presentationMeta!({}, refused as never) as Record<string, unknown>
    assert.equal(rmeta.draft_id, undefined)
    assert.equal(typeof rmeta.error, 'string')
  })

  test('refusals carry no token (nothing to hydrate — the legacy branch stays dark)', async () => {
    const { request } = mockFetch([])
    const tool = meliteFlow(request)
    const out = await tool.execute({}, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(typeof out.error, 'string')
    const parts = tool.output.render({}, out as never) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.equal(parseTileToken(text), null)
    assert.ok(text.includes('REFUSED'), text + ' lacks ' + 'REFUSED')
  })
})

describe('melite_flow bench — the remote refusal voice', () => {
  test('an empty bench refuses with the construct pointer (bench/not-found, not HTTP 404)', async () => {
    // The bench remote classifies the missing bench; the tool turns
    // it into the construct pointer — never a crash, never HTTP.
    const seen = mockFetch([
      (u) => {
        if (/\/v1\/bench(\/|$)/.test(u)) return { status: 404, body: { error: 'no such bench' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.error, 'the bench is empty — construct stages first (melite_construct)')
    assert.equal(out.draft_id, undefined)
  })

  test('a CAS-moved bench refuses with the remote message (no silent merge)', async () => {
    const seen = mockFetch([
      (u) => {
        if (/\/v1\/bench(\/|$)/.test(u) && !u.endsWith('/v1/bench/ensure')) {
          return { status: 200, body: { bench: 'main', draft_id: 'd_bench', rev: 2, stages: [{ id: 's_0' }] } }
        }
        if (u.endsWith('/v1/bench/ensure')) {
          throw new RemoteError('bench/cas-conflict', 'bench moved: rev is 2, caller held 1', { current_rev: 2, expect_rev: 1 })
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'still-to-motion' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.ok(String(out.error).includes('bench moved'), String(out.error) + ' lacks the CAS message')
    assert.equal(out.draft_id, undefined)
  })
})
