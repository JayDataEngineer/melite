// melite_flow walls (vitest, fetch mocked — no gateway, no
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

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { foldConnects, meliteFlow } from '../src/tools/melite-flow.ts'
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

describe('melite_flow bench — THE ONE-BENCH LAW (§22)', () => {
  // the card-mode recipe, self-contained (the card describe owns its
  // own scoped copy — this wall must not reach into it)
  const TOOLS = [
    { model: 'new-model-1', stage_title: 'New', params_schema: null },
    { model: 'music3', stage_title: 'Music', params_schema: null },
  ]
  const CATALOG = { models: { 'new-model-1': { family: 'krea' } }, families: { krea: { label: 'Krea 2' } } }
  const cardMocks = () => mockFetch([okBenchWith('d9'),
    (u) => (u.endsWith('/v1/card-tools')
      ? { status: 200, body: TOOLS } : undefined),
    (u) => (u.endsWith('/v1/model-catalog')
      ? { status: 200, body: CATALOG } : undefined),
    (u) => (u.includes('validate?model=')
      ? { status: 200, body: { runnable: true } } : undefined),
    okDraftThenStart('d9', 'r9'),
  ])
  test('card mode lands on the caller conversation bench, never hardcoded main', async () => {
    const seen = cardMocks()
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { card: 'image-gen', model: 'new-model-1', prompt: 'hi' },
      { signal: AbortSignal.timeout(2000), agent: { id: 'sess-1' } } as never,
    ) as Record<string, unknown>
    assert.equal(out.error, undefined)
    // the CAS read AND the ensure both ride the conversation key —
    // the same key melite_construct binds for this agent (construct's
    // benchKeyOfExec parity: the composed tiles and the executed
    // pipeline are one bench)
    const get = seen.calls.find((c) => /^\/v1\/bench\/[^/?]+$/.test(c.url))
    assert.equal(get!.url, '/v1/bench/sess-1')
    const ensure = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init)
    assert.equal(ensure.session, 'sess-1')
  })

  test('an unattributed seat (no agent id) falls back to main — construct parity', async () => {
    const seen = cardMocks()
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { card: 'image-gen', model: 'new-model-1', prompt: 'hi' },
      { signal: AbortSignal.timeout(2000) },
    ) as Record<string, unknown>
    assert.equal(out.error, undefined)
    const get = seen.calls.find((c) => /^\/v1\/bench\/[^/?]+$/.test(c.url))
    assert.equal(get!.url, '/v1/bench/main')
  })

  test('bench mode reads the caller conversation bench (run owed to the same tiles)', async () => {
    const seen = mockFetch([okBenchWith('d_bench')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { bench: true },
      { signal: AbortSignal.timeout(2000), agent: { id: 'sess-1' } } as never,
    ) as Record<string, unknown>
    // the fixture bench is empty — the refusal still proves WHICH
    // bench was read (the conversation's, not main's)
    assert.ok(typeof out.error === 'string' && out.error.includes('empty'))
    assert.equal(seen.calls[0].url, '/v1/bench/sess-1')
    assert.equal(out.target, 'bench-sess-1')
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

// ---- gap closure (2026-09-12): per-file 100% for melite-flow.ts ----
// foldConnects is pure (exported) — its arms close directly; the run
// fns are module-private, so their arms close through execute with a
// scripted estate. All remotes scripted: no gateway, no GPU.

function ensureOk(draftId: string) {
  return (u: string) => {
    if (u.endsWith('/v1/bench/ensure')) return { status: 200, body: { draft_id: draftId } }
    return undefined
  }
}

function benchRow(body: unknown) {
  return (u: string) => {
    if (/\/v1\/bench\/[^/?]+$/.test(u)) return { status: 200, body }
    return undefined
  }
}

const benchAlive = benchRow({ session: 'main', rev: 0, stages: [], log: [] })

function startOk(runId: string, status = 'queued') {
  return (u: string) => {
    if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: runId, status } }
    return undefined
  }
}

function benchNotFound() {
  return (u: string) => {
    if (/\/v1\/bench\/[^/?]+$/.test(u)) {
      throw new RemoteError('bench/not-found', 'no such bench', { session: 'main' })
    }
    return undefined
  }
}

describe('melite_flow guards — the exactly-one law + the wrapper gate', () => {
  test('two compositions refuse without touching the estate', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true, flow: 'x' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.ok(String(out.error).includes('exactly one composition'), String(out.error))
    assert.equal(seen.calls.length, 0)
  })

  test('schema violations throw at the wrapper gate (presence contract)', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    await assert.rejects(tool.execute(undefined as never, { signal: AbortSignal.timeout(2000) }), ToolArgsError)
    await assert.rejects(tool.execute({ stages: 'x' } as never, { signal: AbortSignal.timeout(2000) }), ToolArgsError)
    await assert.rejects(tool.execute({ params: [] } as never, { signal: AbortSignal.timeout(2000) }), ToolArgsError)
    assert.equal(seen.calls.length, 0)
  })

  test('empty stages refuse (non-empty rows only)', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ stages: [] }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.mode, 'adhoc')
    assert.ok(String(out.error).includes('non-empty array'), String(out.error))
    assert.equal(seen.calls.length, 0)
  })

  test('THE CARD-MODE PROMPT SEAT (027 self-critique #2): the prompt field states SINGLE-only + the params seat', () => {
    // 027's maker reached for top-level prompt in card mode (the
    // schema advertised it generically) and paid a refusal turn —
    // the card admission rejects it (tts wants `text` in params).
    const tool = meliteFlow(mockFetch([]).request) as unknown as { parameters: { properties: Record<string, { description?: string }> } }
    const desc = tool.parameters.properties.prompt.description ?? ''
    assert.ok(desc.includes('SINGLE mode ONLY'), 'card mode is excluded by name')
    assert.ok(desc.includes('INSIDE params'), 'the card seat is stated')
  })

  test('THE UNKNOWN-ARG VOICE (029 self-critique #1): a card param at flow top-level refuses loud — never silently dropped', async () => {
    // 029's maker passed qvoice_save beside card (not inside
    // params); the bag spread dropped it and the maker paid a
    // generic missing-params refusal instead of the pointed one.
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'tts', model: 'm', qvoice_save: [{ voice_name: 'x' }] } as never, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.ok(String(out.error).includes('qvoice_save'), 'the stray key is named')
    assert.ok(String(out.error).includes('INSIDE params'), 'the seat is stated')
    assert.equal(seen.calls.length, 0, 'nothing starts on a stray arg')
  })
})

describe('melite_flow presentCall/render/meta — the faces', () => {
  test('presentCall names card | flow | adhoc | ? (junk renders generic)', () => {
    const tool = meliteFlow((async () => ({})) as EstateRequest)
    const pc = (a: unknown) => tool.presentCall!(a as never)
    assert.equal(pc({ card: 'img' }).title, 'Run img')
    assert.equal(pc({ card: '', flow: 'foo' }).title, 'Run foo')
    assert.equal(pc({ flow: 'foo' }).title, 'Run foo')
    assert.equal(pc({ card: 5, flow: 'f' }).title, 'Run f')
    assert.equal(pc({ stages: [1, 2] }).title, 'Run adhoc (2 stages)')
    assert.equal(pc({}).title, 'Run ?')
    assert.equal(pc({ card: '', flow: '', stages: 'x' }).title, 'Run ?')
    assert.equal(pc(undefined).title, 'Run ?')
    assert.equal(pc(null).title, 'Run ?')
    assert.equal(pc('x').title, 'Run ?')
    assert.equal(pc({ card: 'c' }).card, 'generic')
  })

  test('render tolerates sparse values (the legacy replay path)', () => {
    const tool = meliteFlow((async () => ({})) as EstateRequest)
    const parts = tool.output.render({} as never, {} as never) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(text.includes('card ?'), text)
    assert.ok(text.includes('[queued]'), text)
  })

  test('presentationMeta carries the card model; sparse values stay minimal', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u.endsWith('/v1/bench/ensure')) return { status: 200, body: { draft_id: 'd9' } }
        if (/\/v1\/bench\/[^/?]+$/.test(u)) return { status: 200, body: { session: 'main', rev: 0, stages: [], log: [] } }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'r9', status: 'queued' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'c', model: 'm1' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.run_id, 'r9')
    assert.deepEqual(tool.output.presentationMeta!({ card: 'c', model: 'm1' }, out as never), {
      mode: 'card', target: 'c', model: 'm1', draft_id: 'd9', run_id: 'r9', status: 'queued',
    })
    assert.deepEqual(tool.output.presentationMeta!({} as never, {} as never), { mode: '?', target: '?' })
    // a nullish frozen value (legacy sessions) falls back the same way
    assert.deepEqual(tool.output.presentationMeta!({} as never, undefined as never), { mode: '?', target: '?' })
  })
})

describe('melite_flow bench — the agent drives THE shared bench', () => {
  test('the sequential pass: done rows skip, one {model: card-id} start per runnable row, rows attribute through the DRAFTS stage door (the skip-done hole, transcript-011)', async () => {
    // THE SKIP-DONE HOLE (transcript-011's duplicate GPU runs, fixed
    // 2026-09-24): the old observer posted runStatus/result to the
    // BENCH patch verb, whose law REFUSES run outcomes ("run
    // outcomes ride the drafts/patch door") — every agent-side
    // attribution was refused and swallowed as bookkeeping, done
    // marks never landed, and the next bench pass re-ran completed
    // stages. This wall pins the DRAFTS stage door, so a regression
    // to the refused verb fails HERE, not on duplicate GPU spend.
    // the status door: first poll 'running', then terminal 'completed'
    // with the stage's run-relative url (the ONE media-route rewrite).
    let polls = 0
    const patches: Array<Record<string, unknown>> = []
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'img-to-mesh', runStatus: 'done', params: {} },
            { id: 's_1', card: 'image-gen', params: { prompt: 'hi' } },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rb1', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          polls += 1
          if (polls === 1) return { status: 200, body: { status: 'running', stages: [] } }
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_1', url: 'img/SaveImage_00001_.png' }] } }
        }
        if (u === '/v1/flows/drafts/d_bench/stages/s_1') {
          patches.push(decodeJsonBody(seen.calls[seen.calls.length - 1]!.init))
          return { status: 200, body: { rev: 4, stage: 's_1', patched: ['runStatus', 'result'] } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true, test: true }, { signal: AbortSignal.timeout(6000) }) as Record<string, unknown>
    assert.equal(out.mode, 'bench')
    assert.equal(out.target, 'bench-main @ rev 3')
    assert.equal(out.draft_id, 'd_bench')
    assert.equal(out.status, 'done')
    assert.deepEqual(out.pass, [
      { stage: 's_0', card: 'img-to-mesh', skipped: 'done' },
      { stage: 's_1', card: 'image-gen', run_id: 'rb1', status: 'done', url: '/melite-media/runs/rb1/img/SaveImage_00001_.png' },
    ])
    // ONE start — the DONE row never starts (skip-done law)
    const starts = seen.calls.filter((c) => c.url.endsWith('/v1/flows/start'))
    assert.equal(starts.length, 1)
    const startBody = decodeJsonBody(starts[0]!.init)
    // model resolution: the card-id alias resolves through form-spec's
    // law (boarded[0] — image-gen boards krea-2; ONE truth with
    // defaultFamilyForCard, never re-derived)
    assert.equal(startBody.model, 'krea-2')
    assert.equal(startBody.prompt, 'hi')
    assert.equal(startBody.test, true)
    assert.equal(startBody.draft_id, 'd_bench')
    // THE ATTRIBUTION: every flip writes the row — running first,
    // then done + the media-routed result url — THROUGH THE DRAFTS
    // STAGE DOOR (the drafts patch takes runStatus/result directly;
    // the stage rides the URL, not the body — the bench verb's law)
    assert.equal(patches.length, 2)
    assert.equal(patches[0]!.runStatus, 'running')
    assert.deepEqual(patches[0]!.result, { run_id: 'rb1' })
    assert.ok(!('stage' in patches[0]!), 'the stage rides the URL path, never the body')
    assert.equal(patches[1]!.runStatus, 'done')
    assert.deepEqual(patches[1]!.result, { run_id: 'rb1', url: '/melite-media/runs/rb1/img/SaveImage_00001_.png' })
  })

  test('a failed terminal STOPS the pass — later rows never run', async () => {
    let polls = 0
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
            { id: 's_1', card: 'upscale-tools', params: {} },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rb9', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          polls += 1
          return { status: 200, body: polls === 1 ? { status: 'running', stages: [] } : { status: 'failed', stages: [] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(6000) }) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.equal(out.error, 'stage s_0 (image-gen) ended failed')
    assert.equal(out.run_id, 'rb9')
    // THE RENDER LAW (transcript-016): a stopped-mid-flow refusal PRINTS
    // the run id — the maker must never glob output/ to find a run it
    // already paid for (ten wasted calls before this pin).
    const rendered = tool.output!.render!({ bench: true } as never, out)
    assert.match(String(rendered[0]!.text), /melite_flow REFUSED: stage s_0 \(image-gen\) ended failed — run rb9 \(poll with run_status\)/)
    // a PRE-RUN refusal (no run started) renders without the run clause
    const preRun = tool.output!.render!({ bench: true } as never, { mode: 'bench', target: 'x', status: 'stopped', error: 'stage s_0 names no card' })
    assert.equal(String(preRun[0]!.text), 'melite_flow REFUSED: stage s_0 names no card')
    // ONE start total — s_1 never reached the queue
    assert.equal(seen.calls.filter((c) => c.url.endsWith('/v1/flows/start')).length, 1)
  })

  test('a bench without draft_id/rev falls back honestly', async () => {
    let polls = 0
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') return { status: 200, body: { stages: [{ id: 's_0', card: 'image-gen', params: {} }] } }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rb2', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          polls += 1
          return { status: 200, body: polls === 1 ? { status: 'queued', stages: [] } : { status: 'completed', stages: [{ id: 's_0', url: 'x.png' }] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 1, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(6000) }) as Record<string, unknown>
    assert.equal(out.draft_id, 'bench-main')
    assert.equal(out.target, 'bench-main @ rev ?')
    assert.equal(out.status, 'done')
    assert.equal((out.pass as Array<{ status?: string }>)[0]!.status, 'done')
  })

  test('projected-empty stages refuse with the construct pointer', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') return { status: 200, body: { draft_id: 'd', rev: 1, stages: [] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.mode, 'bench')
    assert.equal(out.error, 'the bench is empty — construct stages first (melite_construct)')
  })

  test('a refused bench start carries the error with the draft', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [{ id: 's_0', card: 'image-gen', params: {} }] } }
        if (u.endsWith('/v1/flows/start')) return { status: 400, body: { error: 'queue full' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.error, 'queue full')
    assert.equal(out.draft_id, 'd_bench')
    assert.equal(out.target, 'bench-main @ rev 3')
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
  })

  test('a card-less row stops the pass with the construct pointer', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [{ id: 's_0', params: {} }] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.equal(out.error, 'stage s_0 names no card — nothing to compose (melite_construct patch)')
  })

  test('a remote bench failure refuses as bench (the execute-catch mapping)', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') throw new RemoteError('runs/unknown-run', 'lane down', { runId: '' })
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.deepEqual(out, { error: 'lane down', mode: 'bench', target: 'bench-main' })
  })

  test('a messageless remote bench failure refuses as remote-refused', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') throw new RemoteError('runs/unknown-run', '', { runId: '' })
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.error, 'remote refused')
    assert.equal(out.mode, 'bench')
  })

  test('a transport bench failure propagates (never valued)', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') throw new Error('gate down')
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    await assert.rejects(tool.execute({ bench: true }, { signal: AbortSignal.timeout(2000) }), /gate down/)
  })
})

describe('melite_flow card — compose inside', () => {
  test('a missing model refuses before any HTTP', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'img' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.mode, 'card')
    assert.equal(out.target, 'img')
    assert.ok(String(out.error).includes('model is required'), String(out.error))
    assert.equal(seen.calls.length, 0)
  })

  test('no prompt anywhere: the intent falls back to the card', async () => {
    const seen = mockFetch([ensureOk('d3'), benchAlive, startOk('r3')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'img', model: 'm' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.run_id, 'r3')
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init)
    assert.equal(ensureBody.intent, 'img')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.equal(startBody.model, 'm')
    assert.equal('prompt' in startBody, false)
  })

  test('a long prompt never steals the intent (CARD BIRTH LAW); params.prompt rides the bag', async () => {
    // 2026-09-13, the hour-6 form regression: prompt-as-intent broke
    // the studio consult (the bench normalization strips stage.card;
    // identity survives on the intent alone) and every prompt-carrying
    // chat birth rendered the GENERIC FORM. The law: intent = card id.
    const seen = mockFetch([ensureOk('d4'), benchAlive, startOk('r4')])
    const tool = meliteFlow(seen.request)
    const long = 'p'.repeat(100)
    const out = await tool.execute(
      { card: 'img', model: 'm', prompt: long, params: { seed: 1 } },
      { signal: AbortSignal.timeout(2000) },
    ) as Record<string, unknown>
    assert.equal(out.run_id, 'r4')
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init) as { intent: string }
    assert.equal(ensureBody.intent, 'img')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.equal(startBody.prompt, long)
    assert.equal(startBody.seed, 1)
  })

  test('params.prompt composes when no top-level prompt rides; empty prompt never clobbers', async () => {
    const seen = mockFetch([ensureOk('d5'), benchAlive, startOk('r5')])
    const tool = meliteFlow(seen.request)
    await tool.execute(
      { card: 'img', model: 'm', prompt: '', params: { prompt: 'p2' } },
      { signal: AbortSignal.timeout(2000) },
    )
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.equal(startBody.prompt, 'p2')
  })

  test('a refused bench ensure values the card error (no start, no draft)', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u.endsWith('/v1/bench/ensure')) return { status: 200, body: { error: 'bench moved: rev is 2, caller held 1' } }
        return undefined
      },
      benchAlive,
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'img', model: 'm' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.mode, 'card')
    assert.equal(out.target, 'img')
    assert.ok(String(out.error).includes('bench moved'), String(out.error))
    assert.equal(out.draft_id, undefined)
    assert.equal(seen.calls.some((c) => c.url.endsWith('/v1/flows/start')), false)
  })

  test('a non-Error bench failure values its string form', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (/\/v1\/bench\/[^/?]+$/.test(u) && !u.endsWith('/v1/bench/ensure')) throw 'wire-down'
        return undefined
      },
      ensureOk('d6'),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'img', model: 'm' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.error, 'wire-down')
  })

  test('a transport start failure propagates (never valued)', async () => {
    const seen = mockFetch([
      ensureOk('d7'), benchAlive,
      (u: string) => {
        if (u.endsWith('/v1/flows/start')) throw new Error('socket hangup')
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    await assert.rejects(tool.execute({ card: 'img', model: 'm' }, { signal: AbortSignal.timeout(2000) }), /socket hangup/)
  })

  test('a messageless remote start refusal values the queue default', async () => {
    const seen = mockFetch([
      ensureOk('d8'), benchAlive,
      (u: string) => {
        if (u.endsWith('/v1/flows/start')) throw new RemoteError('runs/flow-compile', '', { loc: 'flow' })
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'img', model: 'm' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.error, 'queue refused the start')
    assert.equal(out.mode, 'card')
  })

  test('a bare start answer defaults run_id/status honestly', async () => {
    const seen = mockFetch([
      ensureOk('d9'), benchAlive,
      (u: string) => {
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: {} }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'img', model: 'm' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.run_id, '')
    assert.equal(out.status, 'queued')
    assert.equal(out.draft_id, 'd9')
  })

  test('an 80+ char card id truncates the bench intent (the receipt stays readable)', async () => {
    const seen = mockFetch([ensureOk('d_long'), benchAlive, startOk('r_long')])
    const tool = meliteFlow(seen.request)
    const card = 'c'.repeat(81)
    const out = await tool.execute({ card, model: 'm' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.run_id, 'r_long')
    assert.equal(out.draft_id, 'd_long')
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init) as { intent: string }
    assert.equal(ensureBody.intent, 'c'.repeat(77) + '…')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.equal(startBody.model, 'm')
  })
})

describe('melite_flow template — the birth arm + compose refusals', () => {
  test('a missing bench births (no expect_rev on the ensure)', async () => {
    const seen = mockFetch([ensureOk('d_birth'), benchNotFound(), startOk('r_birth')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.run_id, 'r_birth')
    assert.equal(out.draft_id, 'd_birth')
    assert.equal(seen.calls.length, 3)
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init)
    assert.equal('expect_rev' in ensureBody, false)
  })

  test('a rev-less bench row births (no expect_rev on the ensure)', async () => {
    const seen = mockFetch([ensureOk('d_rev'), benchRow({ session: 'main', stages: [] }), startOk('r_rev')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.draft_id, 'd_rev')
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init)
    assert.equal('expect_rev' in ensureBody, false)
  })

  test('a transport bench failure values its message', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (/\/v1\/bench\/[^/?]+$/.test(u) && !u.endsWith('/v1/bench/ensure')) throw new Error('gate down')
        return undefined
      },
      ensureOk('d10'),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.mode, 'flow')
    assert.equal(out.error, 'gate down')
  })

  test('a non-Error bench failure values its string form', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (/\/v1\/bench\/[^/?]+$/.test(u) && !u.endsWith('/v1/bench/ensure')) throw 42
        return undefined
      },
      ensureOk('d11'),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.error, '42')
  })

  test('an ensure without a draft_id values the birth failure', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u.endsWith('/v1/bench/ensure')) return { status: 200, body: {} }
        return undefined
      },
      benchAlive,
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.error, 'bench ensure returned no draft_id')
    assert.equal(out.draft_id, undefined)
  })
})

describe('melite_flow adhoc — validate + compose refusals', () => {
  test('a transport validate failure propagates (never valued)', async () => {
    const seen = mockFetch([() => { throw new Error('validate down') }])
    const tool = meliteFlow(seen.request)
    await assert.rejects(tool.execute({ ...FLOW }, { signal: AbortSignal.timeout(2000) }), /validate down/)
    assert.equal(seen.calls.length, 1)
  })

  test('a messageless validate refusal values the compile default', async () => {
    const seen = mockFetch([() => { throw new RemoteError('runs/flow-compile', '', { loc: 'flow' }) }])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.error, 'flow does not compile')
    assert.equal(out.mode, 'adhoc')
  })

  test('a refused bench ensure values the adhoc error (no start)', async () => {
    const seen = mockFetch([
      okValidate,
      (u: string) => {
        if (u.endsWith('/v1/bench/ensure')) return { status: 200, body: { error: 'bench moved: rev is 2, caller held 1' } }
        return undefined
      },
      benchAlive,
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.mode, 'adhoc')
    assert.ok(String(out.error).includes('bench moved'), String(out.error))
    assert.equal(seen.calls.some((c) => c.url.endsWith('/v1/flows/start')), false)
  })

  test('a refused adhoc start carries the error and NO draft_id', async () => {
    // 200-with-{error}: the start door answered (not refused) with a
    // value-carried error — startRun's res.error arm (the 400 arm rides
    // the bench refusal test above).
    const seen = mockFetch([okBench, okValidate, () => ({ status: 200, body: { error: 'queue full' } })])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.mode, 'adhoc')
    assert.equal(out.target, 'still-to-motion')
    assert.ok(String(out.error).includes('queue full'), String(out.error))
    assert.equal(out.draft_id, undefined)
  })

  test('a non-Error bench failure values its string form', async () => {
    const seen = mockFetch([
      okValidate,
      (u: string) => {
        if (/\/v1\/bench\/[^/?]+$/.test(u) && !u.endsWith('/v1/bench/ensure')) throw 'wire-down'
        return undefined
      },
      ensureOk('d_adhoc'),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.mode, 'adhoc')
    assert.equal(out.error, 'wire-down')
  })

  test('connect-less stages compile bare (adhoc id + empty description)', async () => {
    const seen = mockFetch([ensureOk('d_nc'), benchAlive, okValidate, startOk('r_nc')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { stages: [{ id: 'a', engine: 'comfyui' }] },
      { signal: AbortSignal.timeout(2000) },
    ) as Record<string, unknown>
    assert.equal(out.mode, 'adhoc')
    assert.equal(out.target, 'adhoc')
    assert.equal(out.run_id, 'r_nc')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.deepEqual((startBody.flow_inline as { stages: unknown }).stages, [
      { id: 'a', engine: 'comfyui', description: '', params: {} },
    ])
  })
})

describe('foldConnects — the typed fold (pure)', () => {
  const pair = [
    { id: 'still', engine: 'comfyui', params: {}, outputs: { default: 'image' } },
    { id: 'move', engine: 'comfyui', params: {} },
  ]

  test('missing row fields default (id/engine/description/params/outputs)', () => {
    assert.deepEqual(foldConnects('f', [{}], []), [
      { id: '', engine: '', description: '', params: {}, inputs: {}, expected: {}, outputs: {} },
    ])
  })

  test('outputs/params shapes: arrays and nulls shed, empties fold bare', () => {
    const folded = foldConnects('f', [
      { id: 'a', engine: 'e', outputs: [], params: [] },
      { id: 'b', engine: 'e', outputs: null, params: null },
      { id: 'c', engine: 'e', outputs: {}, params: { p: 1 } },
    ], [])
    assert.deepEqual(folded.map((s) => s.outputs), [{}, {}, {}])
    assert.deepEqual(folded.map((s) => s.params), [{}, {}, { p: 1 }])
  })

  test('a connect without from/to refuses (nothing to fold)', () => {
    assert.throws(() => foldConnects('f', [{ id: 'a', engine: 'e' }], [{}]), /connect needs \{from, to\}/)
  })

  test('a to without stage.input shape refuses', () => {
    assert.throws(
      () => foldConnects('f', [{ id: 'a', engine: 'e' }], [{ from: 'initial.x', kind: 'text', to: 'nodot' }]),
      /is not "stage\.input"/,
    )
  })

  test('a to naming an unknown stage refuses with the known list', () => {
    assert.throws(
      () => foldConnects('f', [{ id: 'a', engine: 'e' }], [{ from: 'initial.x', kind: 'text', to: 'ghost.in' }]),
      /unknown stage "ghost".*stages: a/,
    )
  })

  test('a dot-less from infers the default output (no kind needed)', () => {
    const folded = foldConnects('f', pair, [{ from: 'still', to: 'move.frame' }])
    assert.deepEqual(folded[1].inputs, { frame: { stage: 'still', output: 'default' } })
    assert.deepEqual(folded[1].expected, { frame: 'image' })
  })

  test('a dotted from infers the named output (no kind needed)', () => {
    const folded = foldConnects('f', pair, [{ from: 'still.default', to: 'move.frame' }])
    assert.deepEqual(folded[1].expected, { frame: 'image' })
  })

  test('a from naming an unknown stage refuses (initial wires named)', () => {
    assert.throws(
      () => foldConnects('f', pair, [{ from: 'ghost.out', to: 'move.frame', kind: 'text' }]),
      /unknown stage "ghost".*initial wires/,
    )
  })

  test('kind resolution: empty/non-string kinds infer; explicit kinds win', () => {
    const empty = foldConnects('f', pair, [{ from: 'still', to: 'move.frame', kind: '' }])
    assert.deepEqual(empty[1].expected, { frame: 'image' })
    const num = foldConnects('f', pair, [{ from: 'still', to: 'move.frame', kind: 5 }])
    assert.deepEqual(num[1].expected, { frame: 'image' })
    const explicit = foldConnects('f', pair, [{ from: 'still', to: 'move.frame', kind: 'video' }])
    assert.deepEqual(explicit[1].expected, { frame: 'video' })
  })

  test('a stage-to-stage wire without kind or declaration refuses upstream-voiced', () => {
    assert.throws(
      () => foldConnects('f', [{ id: 'a', engine: 'e' }, { id: 'b', engine: 'e' }], [{ from: 'a.x', to: 'b.in' }]),
      /does not declare this output/,
    )
  })

  test('a twice-wired input refuses', () => {
    assert.throws(
      () => foldConnects('f', [{ id: 'b', engine: 'e' }], [
        { from: 'initial.p', kind: 'text', to: 'b.in' },
        { from: 'initial.q', kind: 'text', to: 'b.in' },
      ]),
      /wired twice/,
    )
  })
})

describe('melite_flow bench — the queue lane law arms', () => {
  test('an explicit params.model short-circuits (never re-derived from the card id)', async () => {
    let polls = 0
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 7, stages: [
            { id: 's_0', card: 'image-gen', params: { prompt: 'hi', model: 'flux-pro' } },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rbm', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          polls += 1
          return { status: 200, body: polls === 1 ? { status: 'running', stages: [] } : { status: 'completed', stages: [{ id: 's_0', url: 'img/SaveImage_00001_.png' }] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 8, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(6000) }) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    // THE ROW'S OWN MODEL WINS — the params name it, the start rides it verbatim
    assert.equal(startBody.model, 'flux-pro')
  })

  test('an unresolvable card rides verbatim (model = card id; the start door refuses in its own voice)', async () => {
    let polls = 0
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 9, stages: [
            { id: 's_0', card: 'no-such-card', params: {} },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rbx', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          polls += 1
          return { status: 200, body: polls === 1 ? { status: 'running', stages: [] } : { status: 'completed', stages: [{ id: 's_0', url: 'x.png' }] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 10, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(6000) }) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    // NO alias truth exists — the card id IS the model (honest pass-through)
    assert.equal(startBody.model, 'no-such-card')
  })

  test('a row naming no card stops the pass with the construct-patch voice', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 11, stages: [
            { id: 's_2', params: { prompt: 'orphan' } },
          ] } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(6000) }) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_2')
    assert.equal(out.error, 'stage s_2 names no card — nothing to compose (melite_construct patch)')
    // nothing ever started
    assert.equal(seen.calls.filter((c) => c.url.endsWith('/v1/flows/start')).length, 0)
  })
})

describe('melite_flow bench — the degenerate-shape arms', () => {
  test('a bench whose stages is not an array is the empty refusal (never a crash)', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') return { status: 200, body: { draft_id: 'd', rev: 2, stages: 'junk-not-array' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(3000) }) as Record<string, unknown>
    assert.equal(out.error, 'the bench is empty — construct stages first (melite_construct)')
  })

  test('a row with null params rides the empty object (the start still carries the model)', async () => {
    let polls = 0
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: null },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rbn', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          polls += 1
          return { status: 200, body: polls === 1 ? { status: 'running', stages: [] } : { status: 'completed', stages: [{ id: 's_0', url: 'img/SaveImage_00001_.png' }] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(8000) }) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.equal(startBody.model, 'krea-2')
    assert.equal('prompt' in startBody, false)
  })

  test('a transport hiccup mid-poll retries on cadence (unclassified error, never terminal)', async () => {
    let polls = 0
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 5, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rbh', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          polls += 1
          if (polls === 1) throw new Error('socket hiccup — unclassified')
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'img/SaveImage_00001_.png' }] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 6, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(10000) }) as Record<string, unknown>
    // the hiccup cost one cadence sleep — the pass still completes
    assert.equal(out.status, 'done')
    assert.equal(polls, 2)
  })

  test('a classified runs/unknown-run mid-poll is terminal (the poll stop set matches the stream law)', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 7, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rbu', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          throw new RemoteError('runs/unknown-run', 'the run vanished', { runId: 'rbu' })
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 8, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(8000) }) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.error, 'stage s_0 (image-gen) ended unknown')
  })
})

describe('melite_flow bench — the status distill arms', () => {
  test('a multi-stage status body with no matching stage row yields no url (st undefined)', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rbs', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          // two OTHER stages — no single-stage fallback, no match;
          // junk entries (a string row, a null row) exercise the
          // filter's both drop arms — they never reach the find
          return { status: 200, body: { status: 'completed', stages: [
            'junk-row', null, { id: 'other-a', url: 'a.png' }, { id: 'other-b', url: 'b.png' },
          ] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(8000) }) as Record<string, unknown>
    assert.equal(out.status, 'done')
    // no stage row matched — the pass row carries no url key
    const row = (out.pass as Array<Record<string, unknown>>)[0]!
    assert.equal('url' in row, false)
    assert.equal(row['status'], 'done')
  })

  test('an absolute stage url rides verbatim (no media-route rewrite)', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rbv', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          return { status: 200, body: { status: 'completed', stages: [
            { id: 's_0', url: 'https://cdn.example/abs/clip.mp4' },
          ] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(8000) }) as Record<string, unknown>
    assert.equal(out.status, 'done')
    assert.equal((out.pass as Array<Record<string, unknown>>)[0]!['url'], 'https://cdn.example/abs/clip.mp4')
  })

  test('a non-string status field reads as unknown — terminal, the pass stops', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rbq', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          // junk status AND junk stages shape — the distill's honest
          // defaults (unknown status; the non-array arm drops to [])
          return { status: 200, body: { status: 42, stages: 'not-an-array' } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(8000) }) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.error, 'stage s_0 (image-gen) ended unknown')
  })
})

describe('melite_flow bench — the single-stage fallback arm', () => {
  test('a lone foreign stage row is the asked stage (the fallback), url-less when it carries none', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rbl', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          // ONE stage, foreign id, NO url — the fallback adopts it,
          // and the empty-url gate keeps the pass row url-less
          return { status: 200, body: { status: 'completed', stages: [{ id: 'the-only-stage' }] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, { signal: AbortSignal.timeout(8000) }) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const row = (out.pass as Array<Record<string, unknown>>)[0]!
    assert.equal(row['status'], 'done')
    assert.equal('url' in row, false)
  })
})
