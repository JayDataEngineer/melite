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

import { describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { foldConnects, meliteFlow, observeAndAttribute } from '../src/tools/melite-flow.ts'
import type { EstateRequest } from '../src/estate.ts'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { JsonValue, TextBlock } from '../src/types.ts'
import { fakeExec } from './fake-exec.ts'

// The render's value/blocks are the tool's own result faces (JsonValue
// in, text blocks out); the walls feed rows that are JSON by
// construction and renders that answer text.
const asJson = (value: unknown): JsonValue => value as JsonValue
const asText = (block: ContentBlock | undefined): string => ((block!) as TextBlock).text

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
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.ok(String(out.error).includes(refusal), String(out.error) + ' lacks ' + refusal)   // verbatim compile text, valued
    assert.equal(seen.calls.some((c) => c.url.includes('/v1/flows/drafts')), false)
  })

  test('initial wires without a kind refuse pre-HTTP (nothing to infer)', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      stages: [{ id: 'a', engine: 'comfyui' }],
      connects: [{ from: 'initial.prompt', to: 'a.prompt' }],
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.ok(String(out.error).includes('initial wires ALWAYS need an explicit kind'), String(out.error) + ' lacks ' + 'initial wires ALWAYS need an explicit kind')
    assert.equal(seen.calls.length, 0)      // refused before any HTTP
  })

  test('connects naming unknown stages refuse with the known list', async () => {
    const quiet = mockFetch([okBench, ])
    const tool = meliteFlow(quiet.request)
    const out = await tool.execute({
      stages: [{ id: 'a', engine: 'comfyui' }],
      connects: [{ from: 'ghost', to: 'a.x' }],
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
      fakeExec(AbortSignal.timeout(2000)),
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

  // M7 (the fallback audit): an unknown card refused at the TOOL —
  // never a draft birthed with the bogus id, never a run-door
  // refusal after the bench is polluted.
  test('an UNKNOWN card refuses at the tool — the bench is never polluted (M7)', async () => {
    const seen = cardMocks()
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { card: 'no-such-card', model: 'new-model-1', prompt: 'hi' },
      fakeExec(AbortSignal.timeout(2000)),
    ) as Record<string, unknown>
    assert.match(String(out.error), /unknown card 'no-such-card'/)
    assert.match(String(out.error), /nothing was written to the bench/)
    assert.equal(out.mode, 'card')
    assert.equal(
      seen.calls.some((c) => c.url.endsWith('/v1/bench/ensure')),
      false,
      'no bench/ensure call — the refusal precedes every write',
    )
  })

  // THE WIRED-BENCH CONTRACT (2026-10-10, the operator's a-priori
  // order): a single-card body against a bench carrying wiring
  // composes ONE stage with inputNames: {} — the wires would be
  // discarded and the run door's wall reads as nonsense to the
  // human ("no FromStage links"). The tool holds the contract
  // ITSELF: it reads the bench it just ensured; ANY stage carrying
  // wiring → the start rides the FLOW arm (draft_id alone, the
  // wires ride as stage inputs), never a single-card body.
  test('THE WIRED-BENCH CONTRACT: a bench carrying wiring rides the FLOW arm — never a single-card body', async () => {
    const wiredBench = {
      rev: 3,
      stages: [
        { id: 's_0', card: 'image-gen', params: { prompt: 'a cat' } },
        { id: 's_1', card: 'image-edit', params: { input_images: '$input_images' },
          inputs: { input_images: { stage: 's_0', output: 'default' } } },
      ],
    }
    // the wired GET handler FIRST (okBenchWith would answer the
    // bench read with empty stages from further down the chain)
    const seen = mockFetch([
      // the post-ensure read (the one-bench law: no agent id →
      // the main bench): the bench carries wiring
      (u: string) => {
        if (String(u).endsWith('/v1/bench/main')) {
          return { status: 200, body: wiredBench }
        }
        return undefined
      },
      okBenchWith('d-w'),
      // the ensure answers with the wired doc (the door's answer
      // carries the bench's stages)
      (_u: string, _body: unknown) => {
        if (String(_u).endsWith('/v1/bench/ensure')) {
          return { status: 200, body: { draftId: 'd-w', stages: wiredBench.stages } }
        }
        return undefined
      },
      // the start: the flow arm's answer
      (_u: string) => {
        if (String(_u).endsWith('/v1/flows/start')) {
          return { status: 202, body: { run_id: 'r-w', status: 'queued' } }
        }
        return undefined
      }])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'image-edit', model: 'image-edit-21',
      params: { prompt: 'edit this' },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.run_id, 'r-w')
    assert.match(String(out.rode), /flow-arm/)
    // THE CONTRACT: the start body carries NO model, NO params — a
    // single-card composition can never reach the door against a
    // wired bench
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.equal(startBody.model, undefined)
    assert.equal(startBody.prompt, undefined)
    assert.equal(startBody.draft_id, 'd-w')
  })

  test('a wired bench whose flow-arm start REFUSES carries the rode line + the refusal (never a silent single-card retry)', async () => {
    // the wired-bench contract's error arm: the bench carries
    // wiring, the start rides the FLOW arm, and the door refuses —
    // the receipt names the arm it rode and the door's own error
    // (no fallback re-press through the single-card body: that
    // would discard the wires the contract exists to keep).
    const wiredBench = {
      session: 'main', rev: 0, log: [],
      stages: [
        { id: 's_0', card: 'image-gen', params: { prompt: 'a cat' } },
        { id: 's_1', card: 'image-edit', params: { input_images: '$input_images' },
          inputs: { input_images: { stage: 's_0', output: 'default' } } },
      ],
    }
    const seen = mockFetch([
      (u: string) => {
        if (String(u).endsWith('/v1/bench/main')) return { status: 200, body: wiredBench }
        if (String(u).endsWith('/v1/bench/ensure')) {
          return { status: 200, body: { bench: 'main', draft_id: 'd-w', stages: wiredBench.stages } }
        }
        if (String(u).endsWith('/v1/flows/start')) {
          return { status: 409, body: { error: 'runs/active-run: a run is already pressing' } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'image-edit', model: 'image-edit-21',
      params: { prompt: 'edit this' },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.match(String(out.rode), /flow-arm/)
    assert.match(String(out.error), /active-run/)
    // and exactly ONE start press: the refusal never re-pressed
    const starts = seen.calls.filter((c) => c.url.endsWith('/v1/flows/start'))
    assert.equal(starts.length, 1, 'the refusal retried the start')
  })

  test('an empty run_id on the wired bench rides the flow arm with NO observation (the empty-error trap\'s twin)', async () => {
    // startRun's twin trap (melite-flow.ts:245): an answer carrying
    // `error: ''` is not a refusal, so the wired leg falls past it to
    // the run_id gate — an EMPTY run id names no run, so the observer
    // never starts and the receipt carries exactly what the door said
    // (the re-audit, 2026-10-16).
    const wiredBench = {
      session: 'main', rev: 3, log: [],
      stages: [
        { id: 's_0', card: 'image-gen', params: { prompt: 'a cat' } },
        { id: 's_1', card: 'image-edit', params: { input_images: '$input_images' },
          inputs: { input_images: { stage: 's_0', output: 'default' } } },
      ],
    }
    const seen = mockFetch([
      (u: string) => {
        if (String(u).endsWith('/v1/bench/main')) return { status: 200, body: wiredBench }
        if (String(u).endsWith('/v1/bench/ensure')) {
          return { status: 200, body: { bench: 'main', draft_id: 'd-w', stages: wiredBench.stages } }
        }
        if (String(u).endsWith('/v1/flows/start')) {
          return { status: 202, body: { error: '', run_id: '' } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'image-edit', model: 'image-edit-21',
      params: { prompt: 'edit this' },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.match(String(out.rode), /flow-arm/)
    assert.equal(out.error, undefined, 'an empty error string is not a refusal')
    assert.equal(out.run_id, '', 'the door named no run — the receipt invents none')
    // the observer is fired ONLY on a real run id: give the fire-and-
    // forget a beat, then prove the poll never went out
    await new Promise((r): void => { setTimeout(r, 100) })
    assert.equal(
      seen.calls.some((c) => String(c.url).includes('/v1/flows/status/')),
      false,
      'an empty run_id must never start an observation',
    )
  })

  test('a bench read whose row carries no stages array falls to the single-card arm (the advisory read never lies)', async () => {
    // the wired-bench contract's read arm: a 200 row WITHOUT a
    // stages array (the shape drift the door could answer mid-roll)
    // is not wiring evidence — the start rides the single-card body
    // as if the bench were empty, and the receipt carries the model.
    const seen = mockFetch([
      (u: string) => {
        // ensure FIRST: the bench-read regex below would swallow the
        // ensure POST (the door's paths share the prefix)
        if (String(u).endsWith('/v1/bench/ensure')) {
          return { status: 200, body: { bench: 'main', draft_id: 'd-flat', stages: [] } }
        }
        if (/\/v1\/bench\/[^/?]+$/.test(u)) {
          return { status: 200, body: { session: 'main', rev: 7, stages: 'drifting' } }
        }
        if (String(u).endsWith('/v1/flows/start')) {
          return { status: 202, body: { run_id: 'r-flat', status: 'queued' } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'image-gen', model: 'new-model-1',
      params: { prompt: 'flat bench' },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.run_id, 'r-flat')
    assert.equal(out.model, 'new-model-1', 'the single-card body carried the model')
    assert.doesNotMatch(String(out.rode ?? ''), /bench carries wiring/)
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.equal(startBody.model, 'new-model-1', 'the start rode the single-card body')
  })

  test('normalizes card JSON arrays before the bench and start doors', async () => {
    const seen = mockFetch([okBenchWith('d-json'), okDraftThenStart('d-json', 'r-json')])
    const tool = meliteFlow(seen.request)
    const calls = [{ text: 'wide lighthouse dawn', start_frame: 0, end_frame: 124 }]
    const clips = [{ src: '/v1/assets/runs/r1/line.flac', start_frame: 124, dur_frames: 48, text: 'the line' }]
    const out = await tool.execute({
      card: 'h3-timeline',
      model: 'h3',
      params: { calls: JSON.stringify(calls), audio_clips: JSON.stringify(clips), unlisted: '[1]' },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.run_id, 'r-json')
    const ensure = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init)
    const stage = (ensure.stages as Array<{ params: Record<string, unknown> }>)[0]!
    assert.deepEqual(stage.params.calls, calls)
    assert.deepEqual(stage.params.audio_clips, clips)
    assert.equal(stage.params.unlisted, '[1]')
    const start = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.deepEqual(start.calls, calls)
    assert.deepEqual(start.audio_clips, clips)
    assert.equal(start.unlisted, '[1]')
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
      fakeExec(AbortSignal.timeout(2000)),
    ) as Record<string, unknown>
    assert.ok(typeof out.error === 'string' && out.error !== '', 'expected a refusal')
    assert.ok(String(out.error).includes('no model unit for model: not-a-card'),
      String(out.error) + ' lacks the arm voice')
  })
  test('card mode attributes its terminal result to the bench stage', async () => {
    let patchBody: Record<string, unknown> | undefined
    let resolvePatch!: () => void
    const patched = new Promise<void>((resolve) => { resolvePatch = resolve })
    const seen = mockFetch([
      okBenchWith('d-headless'),
      okDraftThenStart('d-headless', 'r-headless'),
      (u: string, body: unknown) => {
        if (u.startsWith('/v1/flows/status/')) {
          return { status: 200, body: {
            status: 'completed',
            stages: [{
              id: 's_0',
              url: 'h3-film/film.mp4',
              gallery: [
                { name: 'h3-film/film.mp4' },
                { name: 'h3-film/mix.flac' },
              ],
            }],
          } }
        }
        if (u.includes('/stages/s_0')) {
          patchBody = body as Record<string, unknown>
          resolvePatch()
          return { status: 200, body: { delivered: true } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'h3-timeline',
      model: 'h3',
      params: { calls: [{ text: 'a shot', start_frame: 0, end_frame: 56 }] },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.run_id, 'r-headless')
    await Promise.race([
      patched,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('headless attribution timeout')), 1500)),
    ])
    assert.deepEqual(patchBody?.result, {
      run_id: 'r-headless',
      url: '/melite-media/runs/r-headless/h3-film/film.mp4',
      artifacts: {
        'h3-film/film.mp4': '/melite-media/runs/r-headless/h3-film/film.mp4',
        'h3-film/mix.flac': '/melite-media/runs/r-headless/h3-film/mix.flac',
      },
      assetUrls: [
        '/melite-media/runs/r-headless/h3-film/film.mp4',
        '/melite-media/runs/r-headless/h3-film/mix.flac',
      ],
    })
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
      fakeExec(AbortSignal.timeout(2000)),
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
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
      fakeExec(AbortSignal.timeout(2000)),
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
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.ok(String(out.error).includes('queue full'), String(out.error) + ' lacks queue full')
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
      fakeExec(AbortSignal.timeout(2000)),
    ) as { error?: string }
    assert.ok(String(out.error).includes('unknown flow'), String(out.error) + ' lacks unknown flow')
  })

  test('adhoc: test:true rides the flow_inline start', async () => {
    const seen = mockFetch([okBenchWith('d2'), okValidate, okDraftThenStart('d2', 'r2')])
    const tool = meliteFlow(seen.request)
    await tool.execute({ ...FLOW, test: true }, fakeExec(AbortSignal.timeout(2000)))
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
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.draft_id, 'draft-tile-1')
    const parts = tool.output.render({ flow: 'foo' }, out as never) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.equal(parseTileToken(text), 'draft-tile-1')
  })

  test('adhoc success: render token parses to the minted draft', async () => {
    const seen = mockFetch([okBenchWith('draft-tile-2'), okValidate, okDraftThenStart('draft-tile-2', 'r8')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.draft_id, 'draft-tile-2')
    const parts = tool.output.render({ ...FLOW }, out as never) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.equal(parseTileToken(text), 'draft-tile-2')
  })

  test('THE RUN-ID VISIBILITY LAW (032/033): bench success names the final run at top level and EVERY minted id in the prose', async () => {
    // the maker paid for two runs; the old render printed ONE '?'
    // and both commissions burned ledger_tail detours to learn ids
    // the tool already held (the transcript-016 law's success half).
    let n = 0
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_rid', rev: 2, stages: [
            { id: 's_0', card: 'tts', params: {} },
            { id: 's_1', card: 'sfx', params: {} },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) {
          return { status: 202, body: { run_id: `r_bench_${n++}`, status: 'queued' } }
        }
        if (u.startsWith('/v1/flows/status/')) {
          return { status: 200, body: { status: 'completed', stages: [
            { id: 's_0', url: '/runs/a.flac' }, { id: 's_1', url: '/runs/b.flac' },
          ] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 3, patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    assert.equal(out.run_id, 'r_bench_1', 'the final stage\'s run id rides the top level')
    const text = (tool.output.render({ bench: true }, out as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    assert.ok(text.includes('r_bench_0') && text.includes('r_bench_1'), 'every minted id prints')
    assert.ok(text.includes('s_1 sfx → r_bench_1 [done] /runs/b.flac'), 'a pass row spells stage, card, id, status, url')
    assert.ok(!text.includes(' → ? '), 'no anonymous arrow remains')
  })

  test('THE ALL-SKIPPED BENCH (032/033 run-id law, the loop fallthrough): a bench with nothing to mint returns run_id blank, never a phantom id', async () => {
    // every row already done: zero starts, status done, and the
    // top-level run_id is the EMPTY string (the lastRun loop's
    // fallthrough — no pass entry carries an id). A maker reading
    // this return must NOT poll: there is nothing to poll.
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_skip', rev: 5, stages: [
            { id: 's_0', card: 'tts', runStatus: 'done', params: {} },
            { id: 's_1', card: 'sfx', runStatus: 'done', params: {} },
          ] } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    assert.equal(out.run_id, '', 'no run minted — the id is blank, never guessed')
    assert.deepEqual(out.pass, [
      { stage: 's_0', card: 'tts', skipped: 'done' },
      { stage: 's_1', card: 'sfx', skipped: 'done' },
    ])
    assert.equal(seen.calls.filter((c) => c.url.endsWith('/v1/flows/start')).length, 0)
    const text = (tool.output.render({ bench: true }, out as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    assert.ok(text.includes('s_0 tts [done]'), 'a skipped row prints stage, card, and its skipped mark')
    assert.ok(!text.includes('→'), 'no arrow prints — there is no id to point at')
  })

  test('AN UNREADABLE ROW WORD RUNS, NEVER THROWS (2026-10-12 follow-through): unreachable is not done', async () => {
    // 'unreachable' riding a persisted runStatus is the ERA spelling
    // (the escalation writes the health channel since 2026-10-12) —
    // no door validated the word. The cache-hit skip reads the
    // view-side fold: an unreadable word is not done, so the pass
    // proceeds (here it stops at the no-card gate — this row never
    // carried one); the classifier's refusal must never kill the tool
    // call.
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_unread', rev: 2, stages: [
            { id: 's_0', card: '', runStatus: 'unreachable', params: {} },
          ] } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.error, 'stage s_0 names no card — nothing to compose (melite_construct patch)')
  })

  test('THE PASS-ROWS RENDER NEVER CRASHES (the receipt over unknown JSON): partial rows print ? marks, never throw', async () => {
    // the render faces tool-output values, typed unknown — a row
    // missing every key (a persisted shape from before the pass
    // list, a hand-built replay) prints its ? marks; the receipt
    // degrades, never throws.
    const seen = mockFetch([okBenchWith('draft-render-1')])
    const tool = meliteFlow(seen.request)
    const text = (v: unknown): string =>
      (tool.output.render({ bench: true }, v as never) as Array<{ text?: string }>)
        .map((p) => p?.text ?? '').join('\n')
    assert.ok(
      text({ mode: 'bench', draft_id: 'd', target: 't', status: 'done', pass: [{}] }).includes('· ? ? [?]'),
      'an empty row prints three ? marks',
    )
    assert.ok(
      text({ mode: 'bench', draft_id: 'd', target: 't', status: 'done', pass: [{ stage: 's', card: 'c' }] }).includes('· s c [?]'),
      'a keyless row still names its stage and card',
    )
  })

  test('presentationMeta carries the handle — the native channel, pure', async () => {
    const seen = mockFetch([okBenchWith('draft-meta-7'), okDraftThenStart('draft-meta-7', 'r9')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const refused = await tool.execute({}, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    const rmeta = tool.output.presentationMeta!({}, refused as never) as Record<string, unknown>
    assert.equal(rmeta.draft_id, undefined)
    assert.equal(typeof rmeta.error, 'string')
  })

  test('refusals carry no token (nothing to hydrate — the legacy branch stays dark)', async () => {
    const { request } = mockFetch([])
    const tool = meliteFlow(request)
    const out = await tool.execute({}, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ flow: 'still-to-motion' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true, flow: 'x' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.ok(String(out.error).includes('exactly one composition'), String(out.error))
    assert.equal(seen.calls.length, 0)
  })

  // THE STRING-BOOLEAN TRAP (the arg-coerce valve's deletion,
  // 2026-10-01): the valve rewrote bench:"true" → true AFTER the
  // session log wrote it — executed args the log could not
  // reconstruct. The gate's own type refusal is the voice now,
  // named, before any estate call; the description teaches the
  // spelling beforehand.
  test('a string "true" on bench refuses at the gate, named (never a post-log rewrite)', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    await assert.rejects(
      tool.execute({ bench: 'true' } as never, fakeExec(AbortSignal.timeout(2000))),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /"bench" must be a boolean/)
        return true
      },
    )
    assert.equal(seen.calls.length, 0)
  })

  test('schema violations throw at the wrapper gate (presence contract)', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    await assert.rejects(tool.execute(undefined as never, fakeExec(AbortSignal.timeout(2000))), ToolArgsError)
    await assert.rejects(tool.execute({ stages: 'x' } as never, fakeExec(AbortSignal.timeout(2000))), ToolArgsError)
    await assert.rejects(tool.execute({ params: [] } as never, fakeExec(AbortSignal.timeout(2000))), ToolArgsError)
    assert.equal(seen.calls.length, 0)
  })

  // THE ROW CONTRACT (the strictness audit's fix 8): stage and
  // connect rows were additionalProperties blobs — a typo'd row key
  // rode silent into the fold. The rows are declared now: validateArgs
  // refuses an undeclared key, a stage row missing id/engine, and a
  // connect missing from/to BEFORE execute, with the key named.
  // Cross-mode exactly-one stays in execute — the implicit object
  // root grammar carries per-property annotations only (no root
  // oneOf); the two-compositions test above pins that refusal.
  test('stage rows refuse undeclared keys, missing id/engine at the wrapper gate', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    await assert.rejects(
      tool.execute({ stages: [{ id: 's1', engine: 'comfyui', boardd: 1 }] } as never, fakeExec(AbortSignal.timeout(2000))),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /"stages\[0\]\.boardd" is not a declared property/)
        return true
      },
    )
    await assert.rejects(
      tool.execute({ stages: [{ engine: 'comfyui' }] } as never, fakeExec(AbortSignal.timeout(2000))),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /missing required property "stages\[0\]\.id"/)
        return true
      },
    )
    await assert.rejects(
      tool.execute({ stages: [{ id: 's1' }] } as never, fakeExec(AbortSignal.timeout(2000))),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /missing required property "stages\[0\]\.engine"/)
        return true
      },
    )
    assert.equal(seen.calls.length, 0)
  })

  test('connect rows refuse missing from/to and undeclared keys at the wrapper gate', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    await assert.rejects(
      tool.execute({ stages: [{ id: 's1', engine: 'comfyui' }], connects: [{ to: 's1.image' }] } as never, fakeExec(AbortSignal.timeout(2000))),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /missing required property "connects\[0\]\.from"/)
        return true
      },
    )
    await assert.rejects(
      tool.execute({ stages: [{ id: 's1', engine: 'comfyui' }], connects: [{ from: 's1', to: 's2.image', zeta: 1 }] } as never, fakeExec(AbortSignal.timeout(2000))),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /"connects\[0\]\.zeta" is not a declared property/)
        return true
      },
    )
    assert.equal(seen.calls.length, 0)
  })

  test('empty stages refuse (non-empty rows only)', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ stages: [] }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ card: 'tts', model: 'm', qvoice_save: [{ voice_name: 'x' }] } as never, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.ok(String(out.error).includes('qvoice_save'), 'the stray key is named')
    assert.ok(String(out.error).includes('INSIDE params'), 'the seat is stated')
    assert.equal(seen.calls.length, 0, 'nothing starts on a stray arg')
  })
})

describe('melite_flow presentCall/render/meta — the faces', () => {
  test('presentCall names card | flow | adhoc | ? (junk renders generic)', () => {
    const tool = meliteFlow((async () => ({})) as EstateRequest)
    const pc = (a: unknown) => tool.presentCall!(a as never)! // the faces never return undefined for these args
    assert.equal(pc({ card: 'image-gen' }).title, 'Run image-gen')
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
    const out = await tool.execute({ card: 'image-gen', model: 'm1' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.run_id, 'r9')
    assert.deepEqual(tool.output.presentationMeta!({ card: 'image-gen', model: 'm1' }, out as never), {
      mode: 'card', target: 'image-gen', model: 'm1', draft_id: 'd9', run_id: 'r9', status: 'queued',
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
    const out = await tool.execute({ bench: true, test: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
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
     assert.deepEqual(patches[1]!.result, {
       run_id: 'rb1',
       url: '/melite-media/runs/rb1/img/SaveImage_00001_.png',
       assetUrls: ['/melite-media/runs/rb1/img/SaveImage_00001_.png'],
     })
  })

  // THE OBSERVATION BUDGET (the commission wedge landing, 2026-10-03):
  // the outcome observer polled WITHOUT a wall clock — a run whose
  // claim never released hung the tool for the life of the session
  // (the film press wedged 95 min on a dead engine). The budget
  // bounds the OBSERVATION, never the run: expiry returns the
  // waiting face ('queued' — a word the terminal arm never produces)
  // and a background re-arm link keeps attributing through the
  // drafts stage door until the run settles.
  test('the observation budget expires loud: still-live run → the waiting face, and the re-arm link lands the terminal stamp', async () => {
    let polls = 0
    const patches: Array<Record<string, unknown>> = []
    const seen = mockFetch([
      (u: string) => {
        if (u.startsWith('/v1/flows/status/')) {
          polls += 1
          // live for the first link's polls, terminal once the
          // re-arm link takes over
          return { status: 200, body: polls <= 2
            ? { status: 'running', stages: [] }
            : { status: 'completed', stages: [{ id: 's_0' }] } }
        }
        if (u === '/v1/flows/drafts/d_b/stages/s_0') {
          patches.push(decodeJsonBody(seen.calls[seen.calls.length - 1]!.init))
          return { status: 200, body: {} }
        }
        return undefined
      },
    ])
    // budget 40ms, one re-arm: the first link polls twice (t0 live,
    // then sleeps past its deadline), returns the waiting face, and
    // its successor observes the terminal and stamps done
    const out = await observeAndAttribute(seen.request, 'd_b', 's_0', 'run-x', new AbortController().signal, 40, 1)
    assert.equal(out.status, 'queued')
    assert.equal(out.url, '')
    assert.deepEqual(out.artifacts, [])
    assert.ok(patches.length >= 1, 'the live stamp landed')
    assert.equal(patches[0]!.runStatus, 'running')
    // the re-arm link's terminal stamp lands within the poll cadence
    for (let i = 0; i < 100 && !patches.some((p) => p['runStatus'] === 'done'); i++) {
      await new Promise((r) => setTimeout(r, 20))
    }
    assert.equal(patches[patches.length - 1]!.runStatus, 'done')
  })

  test('the LAST link expires without re-arming: no successor poll, the waiting face answers', async () => {
    // the rearms-0 arm: the chain's final link spends its budget on
    // a still-live run, answers the waiting face, and STOPS — no
    // successor link exists to stamp (the contrast with the re-arm
    // spec above: there the successor landed the terminal stamp).
    let polls = 0
    const seen = mockFetch([
      (u: string) => {
        if (u.startsWith('/v1/flows/status/')) {
          polls += 1
          return { status: 200, body: { status: 'running', stages: [] } }
        }
        return undefined
      },
    ])
    const out = await observeAndAttribute(seen.request, 'd_last', 's_0', 'run-last', new AbortController().signal, 40, 0)
    assert.equal(out.status, 'queued', 'the waiting face')
    const pollsAtExpiry = polls
    assert.ok(pollsAtExpiry >= 1, 'the link observed at least once')
    // no re-arm: the poll count is stable past the cadence
    await new Promise((r) => setTimeout(r, 120))
    assert.equal(polls, pollsAtExpiry, 'a rearms-0 link re-armed anyway')
  })

  // The bench caller's receipt for the same expiry: the flow is NOT
  // failed — the receipt is pending, names the run, and renders
  // through the success face (no REFUSED), so the maker re-waits
  // with run_status instead of re-pressing the bench.
  test('a bench stage that outlives the observation budget returns pending (not stopped, no refusal render)', async () => {
    vi.useFakeTimers()
    try {
      const patches: Array<Record<string, unknown>> = []
      const seen = mockFetch([
        (u: string) => {
          if (u === '/v1/bench/main') {
            return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
              { id: 's_0', card: 'image-gen', params: { prompt: 'hi' } },
            ] } }
          }
          if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rb1', status: 'queued' } }
          if (u.startsWith('/v1/flows/status/')) {
            return { status: 200, body: { status: 'running', stages: [] } }
          }
          if (u === '/v1/flows/drafts/d_bench/stages/s_0') {
            patches.push(decodeJsonBody(seen.calls[seen.calls.length - 1]!.init))
            return { status: 200, body: {} }
          }
          return undefined
        },
      ])
      const tool = meliteFlow(seen.request)
      // a never-aborting signal: the fake clock owns time, and a
      // wall-clock timeout would fire inside the 900s advance
      const exec = fakeExec(new AbortController().signal)
      const runP = tool.execute({ bench: true, test: true }, exec) as Promise<Record<string, unknown>>
      await vi.advanceTimersByTimeAsync(900_100)
      const out = await runP
      assert.equal(out.mode, 'bench')
      assert.equal(out.status, 'pending')
      assert.equal(out.stoppedAt, 's_0')
      assert.equal(out.run_id, 'rb1')
      assert.ok(!('error' in out), 'a pending receipt is not a refusal')
      const passRow = (out.pass as Array<Record<string, unknown>>)[0]!
      assert.equal(passRow['status'], 'queued')
      // the receipt renders through the success face: the header
      // names the run and the poll door, never REFUSED
      const rendered = tool.output!.render!({ bench: true, test: true } as never, asJson(out))
      const text = asText(rendered[0])
      assert.match(text, /\[pending\]/)
      assert.match(text, /→ rb1 \[pending\] — poll with run_status/)
      assert.ok(!text.includes('REFUSED'))
      // the observer stamped the live face before its budget spent
      assert.ok(patches.some((p) => p['runStatus'] === 'running'))
    } finally {
      vi.useRealTimers()
    }
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    // 2026-10-01 vocab law: the stop prose rides the FOLDED CardStatus —
    // raw 'failed' folds to 'error' at the owner (statusOf), so the
    // message carries the one vocabulary every row already speaks.
    assert.equal(out.error, 'stage s_0 (image-gen) ended error')
    assert.equal(out.run_id, 'rb9')
    // THE RENDER LAW (transcript-016): a stopped-mid-flow refusal PRINTS
    // the run id — the maker must never glob output/ to find a run it
    // already paid for (ten wasted calls before this pin).
    const rendered = tool.output!.render!({ bench: true } as never, asJson(out))
    assert.match(asText(rendered[0]), /melite_flow REFUSED: stage s_0 \(image-gen\) ended error — run rb9 \(poll with run_status\)/)
    // a PRE-RUN refusal (no run started) renders without the run clause
    const preRun = tool.output!.render!({ bench: true } as never, { mode: 'bench', target: 'x', status: 'stopped', error: 'stage s_0 names no card' })
    assert.equal(asText(preRun[0]), 'melite_flow REFUSED: stage s_0 names no card')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    await assert.rejects(tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))), /gate down/)
  })
})

describe('melite_flow card — compose inside', () => {
  test('a missing model refuses before any HTTP', async () => {
    const seen = mockFetch([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.mode, 'card')
    assert.equal(out.target, 'image-gen')
    assert.ok(String(out.error).includes('model is required'), String(out.error))
    assert.equal(seen.calls.length, 0)
  })

  test('no prompt anywhere: the intent falls back to the card', async () => {
    const seen = mockFetch([ensureOk('d3'), benchAlive, startOk('r3')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.run_id, 'r3')
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init)
    assert.equal(ensureBody.intent, 'image-gen')
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
      { card: 'image-gen', model: 'm', prompt: long, params: { seed: 1 } },
      fakeExec(AbortSignal.timeout(2000)),
    ) as Record<string, unknown>
    assert.equal(out.run_id, 'r4')
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init) as { intent: string }
    assert.equal(ensureBody.intent, 'image-gen')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/flows/start'))!.init)
    assert.equal(startBody.prompt, long)
    assert.equal(startBody.seed, 1)
  })

  test('params.prompt composes when no top-level prompt rides; empty prompt never clobbers', async () => {
    const seen = mockFetch([ensureOk('d5'), benchAlive, startOk('r5')])
    const tool = meliteFlow(seen.request)
    await tool.execute(
      { card: 'image-gen', model: 'm', prompt: '', params: { prompt: 'p2' } },
      fakeExec(AbortSignal.timeout(2000)),
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
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.mode, 'card')
    assert.equal(out.target, 'image-gen')
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
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    await assert.rejects(tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000))), /socket hangup/)
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
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.run_id, '')
    assert.equal(out.status, 'queued')
    assert.equal(out.draft_id, 'd9')
  })

  test('headless card attribution records every named media row', async () => {
    let patch: Record<string, unknown> | undefined
    let resolvePatch: (() => void) | undefined
    const done = new Promise<void>((resolve) => { resolvePatch = resolve })
    const seen = mockFetch([
      ensureOk('d-observe'),
      benchAlive,
      startOk('rb-observe'),
      (u: string) => {
        if (u.startsWith('/v1/flows/status/')) return {
          status: 200,
          body: {
            status: 'completed',
            stages: [{
              id: 's_0',
              url: 'rb-observe/h3_t4_film_00001_.mp4',
              gallery: [
                { name: 'rb-observe/h3_t4_film_00001_.mp4' },
                null,
                [],
                { name: '' },
                { name: '/absolute/window.mp4' },
                { name: 'https://cdn.test/cover.mp4' },
                { name: 'rb-observe/alias.mp4' },
              ],
            }],
            artifacts: [
              'rb-observe/raw.mp4',
              { path: 'rb-observe/object.mp4' },
              { path: '' },
              { path: 'https://cdn.test/cover.mp4' },
              'alias.mp4',
              42,
            ],
          },
        }
        if (u === '/v1/flows/drafts/d-observe/stages/s_0') {
          patch = decodeJsonBody(seen.calls[seen.calls.length - 1]!.init)
          resolvePatch?.()
          return { status: 200, body: { rev: 2 } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    await tool.execute({ card: 'h3-timeline', model: 'h3' }, fakeExec(AbortSignal.timeout(2000)))
    await Promise.race([done, new Promise((_, reject) => setTimeout(() => reject(new Error('observer timeout')), 1000))])
    assert.equal(patch?.runStatus, 'done')
    assert.deepEqual(patch?.result, {
      run_id: 'rb-observe',
      url: '/melite-media/runs/rb-observe/h3_t4_film_00001_.mp4',
      artifacts: {
        'rb-observe/h3_t4_film_00001_.mp4': '/melite-media/runs/rb-observe/h3_t4_film_00001_.mp4',
        'rb-observe/alias.mp4': '/melite-media/runs/rb-observe/alias.mp4',
        '/absolute/window.mp4': '/absolute/window.mp4',
        'https://cdn.test/cover.mp4': 'https://cdn.test/cover.mp4',
        'rb-observe/raw.mp4': '/melite-media/runs/rb-observe/raw.mp4',
        'rb-observe/object.mp4': '/melite-media/runs/rb-observe/object.mp4',
      },
      assetUrls: [
        '/melite-media/runs/rb-observe/h3_t4_film_00001_.mp4',
        '/absolute/window.mp4',
        'https://cdn.test/cover.mp4',
        '/melite-media/runs/rb-observe/alias.mp4',
        '/melite-media/runs/rb-observe/raw.mp4',
        '/melite-media/runs/rb-observe/object.mp4',
      ],
    })
  })

  test('an 80+ char card id is REFUSED at the tool (M7) — unknown ids never reach the bench', async () => {
    // (M7 rewrote this arm: unknown card ids refuse before any write,
    // so the truncation no longer has a live producer — registry ids
    // are short. The defensive slice stays in the source for the day
    // a real id runs long; the LAW here is the refusal.)
    const seen = mockFetch([ensureOk('d_long'), benchAlive, startOk('r_long')])
    const tool = meliteFlow(seen.request)
    const card = 'c'.repeat(81)
    const out = await tool.execute({ card, model: 'm' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.match(String(out.error), /unknown card/)
    assert.equal(
      seen.calls.some((c) => c.url.endsWith('/v1/bench/ensure')),
      false,
      'the long unknown id refuses before the bench write',
    )
  })
})

describe('melite_flow template — the birth arm + compose refusals', () => {
  test('a missing bench births (no expect_rev on the ensure)', async () => {
    const seen = mockFetch([ensureOk('d_birth'), benchNotFound(), startOk('r_birth')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.run_id, 'r_birth')
    assert.equal(out.draft_id, 'd_birth')
    assert.equal(seen.calls.length, 3)
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.url.endsWith('/v1/bench/ensure'))!.init)
    assert.equal('expect_rev' in ensureBody, false)
  })

  test('a rev-less bench row births (no expect_rev on the ensure)', async () => {
    const seen = mockFetch([ensureOk('d_rev'), benchRow({ session: 'main', stages: [] }), startOk('r_rev')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, 'bench ensure returned no draft_id')
    assert.equal(out.draft_id, undefined)
  })
})

describe('melite_flow adhoc — validate + compose refusals', () => {
  test('a transport validate failure propagates (never valued)', async () => {
    const seen = mockFetch([() => { throw new Error('validate down') }])
    const tool = meliteFlow(seen.request)
    await assert.rejects(tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))), /validate down/)
    assert.equal(seen.calls.length, 1)
  })

  test('a messageless validate refusal values the compile default', async () => {
    const seen = mockFetch([() => { throw new RemoteError('runs/flow-compile', '', { loc: 'flow' }) }])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
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
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.mode, 'adhoc')
    assert.equal(out.error, 'wire-down')
  })

  test('connect-less stages compile bare (adhoc id + empty description)', async () => {
    const seen = mockFetch([ensureOk('d_nc'), benchAlive, okValidate, startOk('r_nc')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { stages: [{ id: 'a', engine: 'comfyui' }] },
      fakeExec(AbortSignal.timeout(2000)),
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

  test('missing row fields default (id/engine/description/card/params/outputs)', () => {
    assert.deepEqual(foldConnects('f', [{}], []), [
      { id: '', engine: '', description: '', card: '', params: {}, inputs: {}, expected: {}, outputs: {} },
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(3000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(10000))) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    // folded: the classified unknown-outcome arm speaks the CardStatus
    assert.equal(out.error, 'stage s_0 (image-gen) ended stopped')
  })
})

describe('melite_flow adhoc — the card fold + compile-first gate (035 dead-route receipt)', () => {
  test('foldConnects keeps the card on the wire body (035 dead-route receipt: the drop hid the card from every gate)', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/flows/validate') return { status: 200, body: { ok: true } }
        if (u === '/v1/bench/main') return { status: 200, body: { draft_id: 'd1', rev: 1, stages: [] } }
        if (u === '/v1/bench/ensure') return { status: 200, body: { draft_id: 'd1', rev: 2 } }
        if (u.endsWith('/v1/flows/start')) return { status: 400, body: { error: 'flow_inline stage "s0": card= stages are unported on this gateway' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ stages: [{ id: 's0', engine: 'comfyui', card: 'image-gen', params: { prompt: 'x' } }] }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    // the START door's own honest voice — never the engine's
    // `node carries no inline workflow`
    assert.match(String(out['error']), /card= stages are unported/)
    const v = seen.calls.find((c) => c.url === '/v1/flows/validate')
    const row = ((v!.init!.body as { stages: Array<Record<string, unknown>> }).stages)[0]!
    assert.equal(row['card'], 'image-gen')
  })

  test('a cardless stages row never synthesizes an empty card key', async () => {
    const rows = foldConnects('f', [{ id: 's0', engine: 'comfyui', params: { prompt: 'x' } }], [])
    assert.equal('card' in (rows[0] as unknown as Record<string, unknown>), true)
    assert.equal((rows[0] as unknown as { card: string }).card, '')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    // no stage row matched — the pass row carries no url key
    const row = (out.pass as Array<Record<string, unknown>>)[0]!
    assert.equal('url' in row, false)
    assert.equal(row['status'], 'done')
  })

  test('the terminal artifacts ride the pass row inline (the gap-5 receipt, 032/033 both re-polled run_status for this)', async () => {
    const seen = mockFetch([
      (u: string) => {
        if (u === '/v1/bench/main') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (u.endsWith('/v1/flows/start')) return { status: 202, body: { run_id: 'rart', status: 'queued' } }
        if (u.startsWith('/v1/flows/status/')) {
          return { status: 200, body: { status: 'completed', stages: [
            { id: 's_0', url: '/melite-media/runs/rart/clip.mp4' },
          ], artifacts: [
            { path: 'run-rart/clip.mp4', bytes: 1234 },
            'run-rart/sheet.png',
            { junk: true }, 42, // non-path rows drop, never throw
          ] } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const row = (out.pass as Array<Record<string, unknown>>)[0]!
    // paths ride AS SERVED (wire spelling — run_status owns the
    // canonicalization law for its own text); junk rows drop
    assert.deepEqual(row['artifacts'], ['run-rart/clip.mp4', 'run-rart/sheet.png'])
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    assert.equal((out.pass as Array<Record<string, unknown>>)[0]!['url'], 'https://cdn.example/abs/clip.mp4')
  })

  test('a non-string status field folds to stopped — terminal, the pass stops', async () => {
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
          // defaults (unknown status; the non-array arm drops to []),
          // then the fold: unknown-outcome is the 'stopped' CardStatus
          return { status: 200, body: { status: 42, stages: 'not-an-array' } }
        }
        if (u === '/v1/bench/main/patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.error, 'stage s_0 (image-gen) ended stopped')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const row = (out.pass as Array<Record<string, unknown>>)[0]!
    assert.equal(row['status'], 'done')
    assert.equal('url' in row, false)
  })
})
