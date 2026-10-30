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
import type { Estate } from '../src/estate.ts'
import { fakeEstate, fakeEstateStatus } from './fake-estate.ts'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { JsonValue, TextBlock } from '../src/types.ts'
import { fakeExec } from './fake-exec.ts'
import { draftIdOf } from '@melite/contracts/benchStage'

// The render's value/blocks are the tool's own result faces (JsonValue
// in, text blocks out); the walls feed rows that are JSON by
// construction and renders that answer text.
const asJson = (value: unknown): JsonValue => value as JsonValue
const asText = (block: ContentBlock | undefined): string => ((block!) as TextBlock).text

// The recording fake IS the estate's far side (EstateRequest, the
// transport contract): no global fetch, no HTTP, no port — the same
// seam makeEstateRequest builds in production.
interface Seen {
  /** The typed-lane call log: { lane, args } per call (fakeEstateStatus). */
  calls: Array<{ lane: string; args: unknown[] }>
  request: Estate
}

/** The typed-lane status mock (F-1, 2026-11-05): fixtures answer in
 * the door's {status, body} contract but dispatch on the LANE — the
 * URL grammar is the browser face's seam, never the tool tests'.
 * fakeEstateStatus carries the refusal voices (bench* 404 →
 * bench/not-found; other 4xx → runs/flow-compile). */
function mockEstate(handlers: Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined>): Seen {
  const fake = fakeEstateStatus(handlers)
  return { calls: fake.calls, request: fake.estate }
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
function okBenchWith(id: string): (lane: string, _args: unknown[]) => { status: number; body: unknown } | undefined {
  return (lane: string) => {
    if (lane === 'benchEnsure') {
      return { status: 200, body: { bench: 'the-shared-bench', draft_id: id, ok: true } }
    }
    if (lane === 'benchGet') {
      return { status: 200, body: { session: 'main', rev: 0, stages: [], log: [] } }
    }
    return undefined
  }
}
const okBench = okBenchWith('d_bench')

function okValidate(lane: string, args: unknown[]) {
  if (lane === 'runsValidate') {
    return { status: 200, body: { ok: true, flow: (args[0] as { id: string }).id, stages: [] } }
  }
  return undefined
}

function okDraftThenStart(draftId: string, runId: string) {
  return (lane: string, args: unknown[]) => {
    if (lane === 'benchEnsure') {
      return { status: 200, body: { draftId, stages: (args[0] as { stages: unknown[] }).stages } }
    }
    if (lane === 'runsStart') {
      return { status: 202, body: { run_id: runId, status: 'queued' } }
    }
    return undefined
  }
}

/** Typed lanes pass the doc object itself — the decode step died
 * with the URL transport; the name stays for the assertion sites. */
function decodeJsonBody(args: unknown[] | undefined): Record<string, unknown> {
  if (!args || args[0] === undefined) throw new Error('no body captured')
  return args[0] as Record<string, unknown>
}

describe('melite_flow adhoc — the AI feedback loop', () => {
  test('validate runs FIRST; draft + start follow; result carries no flow body', async () => {
    const seen = mockEstate([okBenchWith('d1'), okValidate, okDraftThenStart('d1', 'r1')])
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
    const paths = seen.calls.map((c) => c.lane)
    // the CURRENT law (REBUILD-12): validate FIRST (no GPU on a bad
    // wire), then the CAS read (GET the bench row — a live rev rides
    // as expect_rev), then the bench ensure (the doc-backed draft),
    // then start. No drafts door.
    assert.equal(paths[0], 'runsValidate')
    assert.equal(paths[1], 'benchGet', 'the CAS bench read')
    assert.equal(paths[2], 'benchEnsure')
    assert.equal(paths[3], 'runsStart')
    const draftBody = decodeJsonBody(seen.calls[2]!.args)
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
    const startBody = decodeJsonBody(seen.calls[3]!.args)
    assert.equal((startBody.flow_inline as { id: string }).id, 'still-to-motion')
    assert.equal(startBody.draft_id, 'd1')
    assert.equal(startBody.test, false)
  })

  test('a compile refusal rides the VALUE verbatim and no draft is posted', async () => {
    const refusal = "flow 'x' stage 'move' input 'frame': expected text, got image "
      + "from stage 'still' output 'default' — must be text"
    const seen = mockEstate([okBench, 
      () => ({ status: 400, body: { error: refusal } }),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.ok(String(out.error).includes(refusal), String(out.error) + ' lacks ' + refusal)   // verbatim compile text, valued
    assert.equal(seen.calls.some((c) => c.lane === 'cardCompose'), false)
  })

  test('initial wires without a kind refuse pre-HTTP (nothing to infer)', async () => {
    const seen = mockEstate([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      stages: [{ id: 'a', engine: 'comfyui' }],
      connects: [{ from: 'initial.prompt', to: 'a.prompt' }],
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.ok(String(out.error).includes('initial wires ALWAYS need an explicit kind'), String(out.error) + ' lacks ' + 'initial wires ALWAYS need an explicit kind')
    assert.equal(seen.calls.length, 0)      // refused before any HTTP
  })

  test('connects naming unknown stages refuse with the known list', async () => {
    const quiet = mockEstate([okBench, ])
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
  const cardMocks = () => mockEstate([okBenchWith('d9'), 
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
    const draftBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
    const tiles = draftBody.stages as Array<{ card?: string; params: Record<string, unknown> }>
    assert.equal(tiles[0].card, 'image-gen')
    assert.equal(tiles[0].params.prompt, 'hi')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
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
      seen.calls.some((c) => c.lane === 'benchEnsure'),
      false,
      'no bench/ensure call — the refusal precedes every write',
    )
  })

  // THE WIRED-BENCH CONTRACT (2026-10-10, the operator's a-priori
  // F15 (2026-11-12) — THE MERGE LAW: a single-card press on a
  // bench that already holds stages APPENDS through the bench's own
  // add_stage verb and rides the ONE-PRESS ONE-CARD body (the
  // operator's 2026-10-26 law: the pressed card composes ONE stage,
  // never the whole bench). The 2026-10-10 wired-bench flow-arm
  // diversion was the fan-out shape the operator cursed — dead with
  // the wipe it followed, superseded here.
  test('THE MERGE LAW (F15): a bench holding stages gains the pressed stage — never replaces, never fans out', async () => {
    const heldBench = {
      rev: 3,
      draft_id: 'd-held',
      stages: [
        { id: 's_0', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } },
        { id: 's_1', card: 'image-edit', params: { prompt: 'edit', model: 'image-edit-21' },
          inputs: { input_images: { stage: 's_0', output: 'default' } } },
      ],
    }
    let patchBody: Record<string, unknown> | undefined
    let resolvePatch!: () => void
    const patched = new Promise<void>((resolve) => { resolvePatch = resolve })
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: heldBench }
        if (lane === 'benchVerb') {
          return { status: 200, body: { rev: 4, stage: 's_2' } }
        }
        if (lane === 'runsStart') {
          return { status: 202, body: { run_id: 'r-merge', status: 'queued' } }
        }
        if (lane === 'runsStatus') {
          return { status: 200, body: {
            status: 'completed',
            stages: [{ id: 's_2', url: 'tts/out.wav', gallery: [{ name: 'tts/out.wav' }] }],
          } }
        }
        if (lane === 'draftsStagePatch' && args[1] === 's_2') {
          patchBody = args[2] as Record<string, unknown>
          resolvePatch()
          return { status: 200, body: { delivered: true } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'image-gen', model: 'image-gen-1',
      params: { prompt: 'a new still' },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.run_id, 'r-merge')
    assert.match(String(out.rode), /merge-arm \(bench held 2 stage\(s\) — appended s_2, nothing replaced\)/)
    // NO ensure ever fired: the held stages + intent were never
    // asked to move (the F15 burn's wipe class)
    assert.equal(
      seen.calls.some((c) => c.lane === 'benchEnsure'),
      false,
      'the merge arm must never ensure-overwrite the bench',
    )
    // the append rode the bench's own add_stage verb with the CAS
    // rev and the F16 model stamp on the stage params
    const verb = seen.calls.find((c) => c.lane === 'benchVerb')!
    assert.equal(verb.args[0], 'main')
    assert.equal(verb.args[1], 'add_stage')
    const doc = verb.args[2] as Record<string, unknown>
    assert.equal(doc['card'], 'image-gen')
    assert.equal(doc['expect_rev'], 3)
    assert.equal((doc['params'] as Record<string, unknown>)['model'], 'image-gen-1')
    // the start rode the ONE-PRESS ONE-CARD body: model + params +
    // the held draft — never a bare flow press
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
    assert.equal(startBody.model, 'image-gen-1')
    assert.equal(startBody.prompt, 'a new still')
    assert.equal(startBody.draft_id, 'd-held')
    // the observer attributes to the MINTED stage id (s_2), not a
    // hardcoded s_0
    await patched
    assert.deepEqual((patchBody as { result?: unknown }).result, {
      run_id: 'r-merge',
      url: '/melite-media/runs/r-merge/tts/out.wav',
      artifacts: { 'tts/out.wav': '/melite-media/runs/r-merge/tts/out.wav' },
      assetUrls: ['/melite-media/runs/r-merge/tts/out.wav'],
    })
  })

  test('a merged press whose start REFUSES carries the rode line + the refusal (never a silent retry)', async () => {
    const heldBench = {
      session: 'main', rev: 0, draft_id: 'd-held', log: [],
      stages: [{ id: 's_0', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } }],
    }
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: heldBench }
        if (lane === 'benchVerb') return { status: 200, body: { rev: 1, stage: 's_1' } }
        if (lane === 'runsStart') {
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
    assert.match(String(out.rode), /merge-arm/)
    assert.match(String(out.error), /active-run/)
    // and exactly ONE start press: the refusal never re-pressed
    const starts = seen.calls.filter((c) => c.lane === 'runsStart')
    assert.equal(starts.length, 1, 'the refusal retried the start')
  })

  test('an empty run_id on a merged press rides with NO observation (the empty-error trap\'s twin)', async () => {
    const heldBench = {
      session: 'main', rev: 3, draft_id: 'd-held', log: [],
      stages: [{ id: 's_0', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } }],
    }
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: heldBench }
        if (lane === 'benchVerb') return { status: 200, body: { rev: 4, stage: 's_1' } }
        if (lane === 'runsStart') {
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
    assert.match(String(out.rode), /merge-arm/)
    assert.equal(out.error, undefined, 'an empty error string is not a refusal')
    assert.equal(out.run_id, '', 'the door named no run — the receipt invents none')
    await new Promise((r): void => { setTimeout(r, 100) })
    assert.equal(
      seen.calls.some((c) => c.lane === 'runsStatus'),
      false,
      'an empty run_id must never start an observation',
    )
  })

  test('a CAS race on the append rebases ONCE — the second append rides the fresh rev (F15)', async () => {
    const heldBench = {
      session: 'main', rev: 7, draft_id: 'd-held', log: [],
      stages: [{ id: 's_0', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } }],
    }
    let revReads = 0
    const conflict = Object.assign(
      new Error('bench/cas-conflict: the bench moved under the write'),
      { name: 'RemoteError', isDSHRemoteError: true, code: 'bench/cas-conflict' },
    )
    // two-phase handlers: benchVerb refuses the rev-7 write once,
    // then admits the fresh rev-8 write
    const verbs: Array<Record<string, unknown>> = []
    const mock = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          revReads += 1
          return { status: 200, body: { ...heldBench, rev: revReads === 1 ? 7 : 8 } }
        }
        if (lane === 'benchVerb') {
          const doc = args[2] as Record<string, unknown>
          verbs.push(doc)
          if (doc['expect_rev'] === 7) throw conflict
          return { status: 200, body: { rev: 9, stage: 's_1' } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r-cas', status: 'queued' } }
        return undefined
      },
    ])
    const tool = meliteFlow(mock.request)
    const out = await tool.execute({
      card: 'image-edit', model: 'image-edit-21',
      params: { prompt: 'edit this' },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.run_id, 'r-cas')
    assert.equal(verbs.length, 2, 'exactly one rebase — a second conflict refuses')
    assert.equal(verbs[0]!['expect_rev'], 7)
    assert.equal(verbs[1]!['expect_rev'], 8)
  })

  test('F16: a birth press writes the model INTO the stage params — the bench it leaves behind compiles standalone', async () => {
    // the burn: the tts stage a press minted carried no params.model,
    // and the bench refused at compile ("card 'tts' requires
    // params.model"). The stage row must carry what the start rode.
    const seen = mockEstate([
      okBenchWith('d-f16'),
      okDraftThenStart('d-f16', 'r-f16'),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'image-gen', model: 'image-gen-1',
      params: { prompt: 'a still' },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, undefined)
    const ensureDoc = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
    const stage = (ensureDoc['stages'] as Array<Record<string, unknown>>)[0]!
    assert.equal((stage['params'] as Record<string, unknown>)['model'], 'image-gen-1')
  })

  test('F16 negative: a pure-tool card (requiresModel false) takes NO model stamp on the stage', async () => {
    // a phantom model seat pollutes nothing: image-edit composes
    // without one (its def says requiresModel false), so neither the
    // birth stage nor a merged append carries a model key.
    const seen = mockEstate([
      okBenchWith('d-f16n'),
      okDraftThenStart('d-f16n', 'r-f16n'),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'image-edit', model: 'image-edit-21',
      params: { prompt: 'edit this' },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, undefined)
    const ensureDoc = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
    const stage = (ensureDoc['stages'] as Array<Record<string, unknown>>)[0]!
    assert.equal('model' in (stage['params'] as Record<string, unknown>), false)
    // the START body still carries the model key — the door's {model:}
    // shape is unchanged; only the stage row is stamp-free
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
    assert.equal(startBody.model, 'image-edit-21')
  })

  test('a bench read whose row carries no stages array falls to the single-card arm (the advisory read never lies)', async () => {
    // the wired-bench contract's read arm: a 200 row WITHOUT a
    // stages array (the shape drift the door could answer mid-roll)
    // is not wiring evidence — the start rides the single-card body
    // as if the bench were empty, and the receipt carries the model.
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        // ensure FIRST: the bench-read regex below would swallow the
        // ensure POST (the door's paths share the prefix)
        if (lane === 'benchEnsure') {
          return { status: 200, body: { bench: 'main', draft_id: 'd-flat', stages: [] } }
        }
        if (lane === 'benchGet') {
          return { status: 200, body: { session: 'main', rev: 7, stages: 'drifting' } }
        }
        if (lane === 'runsStart') {
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
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
    assert.equal(startBody.model, 'new-model-1', 'the start rode the single-card body')
  })

  test('normalizes card JSON arrays before the bench and start doors', async () => {
    const seen = mockEstate([okBenchWith('d-json'), okDraftThenStart('d-json', 'r-json')])
    const tool = meliteFlow(seen.request)
    const calls = [{ text: 'wide lighthouse dawn', start_frame: 0, end_frame: 124 }]
    const clips = [{ src: '/v1/assets/runs/r1/line.flac', start_frame: 124, dur_frames: 48, text: 'the line' }]
    const out = await tool.execute({
      card: 'h3-timeline',
      model: 'h3',
      params: { calls: JSON.stringify(calls), audio_clips: JSON.stringify(clips), unlisted: '[1]' },
    }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.run_id, 'r-json')
    const ensure = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
    const stage = (ensure.stages as Array<{ params: Record<string, unknown> }>)[0]!
    assert.deepEqual(stage.params.calls, calls)
    assert.deepEqual(stage.params.audio_clips, clips)
    assert.equal(stage.params.unlisted, '[1]')
    const start = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
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
    const { request } = mockEstate([
      okBenchWith('d9'),
      (lane) => {
        if (lane === 'runsStart') throw refusal
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
    const seen = mockEstate([
      okBenchWith('d-headless'),
      okDraftThenStart('d-headless', 'r-headless'),
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStatus') {
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
        if (lane === 'draftsStagePatch' && args[1] === 's_0') {
          patchBody = args[2] as Record<string, unknown>
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
    // an event, not a clock (flake audit 2026-10-13 item 7): the
    // wall-clock race produced the WRONG error under load; the test
    // timeout owns a true hang
    await patched
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
  const cardMocks = () => mockEstate([okBenchWith('d9'),
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
    const get = seen.calls.find((c) => c.lane === 'benchGet')
    assert.equal(get!.args[0], 'sess-1')
    const ensure = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
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
    const get = seen.calls.find((c) => c.lane === 'benchGet')
    assert.equal(get!.args[0], 'main')
  })

  test('bench mode reads the caller conversation bench (run owed to the same tiles)', async () => {
    const seen = mockEstate([okBenchWith('d_bench')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { bench: true },
      { signal: AbortSignal.timeout(2000), agent: { id: 'sess-1' } } as never,
    ) as Record<string, unknown>
    // the fixture bench is empty — the refusal still proves WHICH
    // bench was read (the conversation's, not main's)
    assert.ok(typeof out.error === 'string' && out.error.includes('empty'))
    assert.equal(seen.calls[0]!.lane, 'benchGet')
    assert.equal(seen.calls[0]!.args[0], 'sess-1')
    assert.equal(out.target, 'bench-sess-1')
  })
})

describe('melite_flow L4 — the test flag rides every mode', () => {
  test('template: test:false default, flow explicitly named, draft minted', async () => {
    const seen = mockEstate([okBenchWith('draft-headless-1'), okDraftThenStart('draft-headless-1', 'r0')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.mode, 'flow')
    assert.equal(out.run_id, 'r0')
    // CARD BIRTH LAW (bench form): the bench ensure carries the
    // template reference; the start rides its doc-backed draft
    assert.equal(seen.calls.length, 3)
    assert.equal(seen.calls[0]!.lane, 'benchGet', 'CAS read first')
    assert.equal(seen.calls[1]!.lane, 'benchEnsure')
    const composed = decodeJsonBody(seen.calls[1]!.args)
    assert.equal(composed.intent, 'foo')
    const body = decodeJsonBody(seen.calls[2]!.args)
    assert.equal(body.test, false)
    assert.equal(body.flow, 'foo')
    // the dead {yaml:} key must not ride along (retired 2026-09-04
    // with the yaml text parser — resolve_request accepts flow/model)
    assert.equal(body.yaml, undefined)
    assert.equal(body.draft_id, 'draft-headless-1')
  })

  test('template: test:true + params ride the start', async () => {
    const seen = mockEstate([okBenchWith('draft-headless-1'), okDraftThenStart('draft-headless-1', 'r0')])
    const tool = meliteFlow(seen.request)
    await tool.execute(
      { flow: 'bar', params: { seed: 42, steps: 8 }, test: true },
      fakeExec(AbortSignal.timeout(2000)),
    )
    const posts = seen.calls.filter((s) => s.lane === 'runsStart')
    assert.equal(posts.length, 1)
    const body = decodeJsonBody(posts[0]!.args)
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
    const seen = mockEstate([okBench, 
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
    const seen = mockEstate([
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
    const seen = mockEstate([okBenchWith('d2'), okValidate, okDraftThenStart('d2', 'r2')])
    const tool = meliteFlow(seen.request)
    await tool.execute({ ...FLOW, test: true }, fakeExec(AbortSignal.timeout(2000)))
    const posts = seen.calls.filter((s) => s.lane === 'runsStart')
    assert.equal(posts.length, 1)
    const body = decodeJsonBody(posts[0]!.args)
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
    const seen = mockEstate([okBenchWith('draft-tile-1'), okDraftThenStart('draft-tile-1', 'r7')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.draft_id, 'draft-tile-1')
    const parts = tool.output.render({ flow: 'foo' }, out as never) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.equal(parseTileToken(text), 'draft-tile-1')
  })

  test('adhoc success: render token parses to the minted draft', async () => {
    const seen = mockEstate([okBenchWith('draft-tile-2'), okValidate, okDraftThenStart('draft-tile-2', 'r8')])
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_rid', rev: 2, stages: [
            { id: 's_0', card: 'tts', params: {} },
            { id: 's_1', card: 'sfx', params: {} },
          ] } }
        }
        if (lane === 'runsStart') {
          return { status: 202, body: { run_id: `r_bench_${n++}`, status: 'queued' } }
        }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [
            { id: 's_0', url: '/runs/a.flac' }, { id: 's_1', url: '/runs/b.flac' },
          ] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 3, patched: ['runStatus'] } }
        // the attribution stamp lands (this arm judges the ids, not
        // the stamp's miss face — the loud-miss arms own that law)
        if (lane === 'draftsStagePatch') return { status: 200, body: { draftId: args[0], stageId: args[1], delivered: true, patched: ['runStatus', 'result'] } }
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
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
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStart').length, 0)
    const text = (tool.output.render({ bench: true }, out as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    assert.ok(
      text.includes('s_0 tts [skipped done — unchanged since its last run; patch params to re-run]'),
      'a skipped row SAYS it skipped — never the bare [done] that sent the warm-fire agent hunting a run that never existed',
    )
    assert.ok(!text.includes('→'), 'no arrow prints — there is no id to point at')
  })

  test('F11: an ARCHIVED row is skipped on the pass — a spent stage never re-runs ahead of newer work', async () => {
    // the archived mark keeps the row for provenance and the pass
    // leaves it out: skipped 'archived' in the pass rows, zero
    // starts for it, the live row ahead of it still runs.
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_arc', rev: 3, stages: [
            { id: 's_0', card: 'tts', archived: true, runStatus: 'done', params: {} },
            { id: 's_1', card: 'sfx', params: { sfx: 'boom' } },
          ] } }
        }
        if (lane === 'runsStart') {
          return { status: 202, body: { run_id: 'r_live', status: 'queued' } }
        }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [
            { id: 's_1', url: 'sfx/boom.flac', gallery: [{ name: 'sfx/boom.flac' }] },
          ] } }
        }
        if (lane === 'draftsStagePatch') {
          return { status: 200, body: { delivered: true } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    const pass = out.pass as Array<Record<string, unknown>>
    assert.deepEqual(pass[0], { stage: 's_0', card: 'tts', skipped: 'archived' })
    assert.ok(String(pass[1]!['stage']) === 's_1', 'the live row runs')
    const starts = seen.calls.filter((c) => c.lane === 'runsStart')
    assert.equal(starts.length, 1, 'exactly one start — the archived row never presses')
    const text = (tool.output.render({ bench: true }, out as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    assert.ok(
      text.includes('s_0 tts [skipped archived — spent stage resting; unarchive to run it again]'),
      'the pass names the archived skip in the operator voice',
    )
  })

  // F18 — THE CROSS-REGIME JOIN ADMISSION at the pass face: an
  // h3-timeline stage whose armed mod bag carries a tier that renders
  // a different shape than the doc's film regime ADMITS the mismatch
  // on its pass row (warning + the rendered ⚠ face), naming both
  // regimes and the pin — and the shape-true tier stays silent.
  test('F18: an h3 mod stage joining a mismatched regime ADMITS it on the pass row (warn, never refuse)', async () => {
    const seen = mockEstate([
      (lane: string, _args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_f18', rev: 1, stages: [
            { id: 's_0', card: 'h3-timeline', params: {
              width: 1344, height: 768,
              extend: [{ source_clip: 'film_a', extend_prompt: 'more', resolution: '736p' }],
            } },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_f18', status: 'queued' } }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [
            { id: 's_0', url: '/runs/film_b.mp4' },
          ] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'done', 'the admission NEVER refuses — the run completes')
    const pass = out.pass as Array<Record<string, unknown>>
    const warning = String(pass[0]!['warning'] ?? '')
    assert.ok(warning.startsWith('h3-timeline: CROSS-REGIME JOIN'),
      'the pass row carries the admission: ' + JSON.stringify(pass[0]))
    assert.ok(warning.includes("tier '736p' renders 1280×736"), 'the admission names the derived mod shape')
    assert.ok(warning.includes("pin the bag's resolution 768p"), 'the admission names the shape-true pin')
    const text = (tool.output.render({ bench: true }, out as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    assert.ok(text.includes('⚠ h3-timeline: CROSS-REGIME JOIN'),
      'the render PRINTS the admission in the row prose — the maker reads the render')
  })

  test('F18: the shape-true tier stays SILENT — a reconciled join never nags, other cards never speak', async () => {
    const seen = mockEstate([
      (lane: string, _args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_f18_true', rev: 1, stages: [
            { id: 's_0', card: 'h3-timeline', params: {
              width: 1344, height: 768,
              repair: [{ source_clip: 'film_a', resolution: '768p' }],
            } },
            { id: 's_1', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } },
          ] } }
        }
        if (lane === 'runsStart') {
          return { status: 202, body: { run_id: 'r_f18_true', status: 'queued' } }
        }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [
            { id: 's_0', url: '/runs/film_c.mp4' }, { id: 's_1', url: '/runs/cat.png' },
          ] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['warning'], undefined, '768p renders 1344×768 exactly — no admission')
    assert.equal(pass[1]!['warning'], undefined, 'a foreign card never speaks in the family\'s voice')
  })

  test('AN UNREADABLE ROW WORD RUNS, NEVER THROWS (2026-10-12 follow-through): unreachable is not done', async () => {
    // 'unreachable' riding a persisted runStatus is the ERA spelling
    // (the escalation writes the health channel since 2026-10-12) —
    // no door validated the word. The cache-hit skip reads the
    // view-side fold: an unreadable word is not done, so the pass
    // proceeds (here it stops at the no-card gate — this row never
    // carried one); the classifier's refusal must never kill the tool
    // call.
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
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
    const seen = mockEstate([okBenchWith('draft-render-1')])
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
    const seen = mockEstate([okBenchWith('draft-meta-7'), okDraftThenStart('draft-meta-7', 'r9')])
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
    const { request } = mockEstate([])
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
    const seen = mockEstate([
      (lane) => {
        if (lane === 'benchGet' || lane === 'benchVerb') return { status: 404, body: { error: 'no such bench' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, 'the bench is empty — construct stages first (melite_construct)')
    assert.equal(out.draft_id, undefined)
  })

  test('a CAS-moved bench refuses with the remote message (no silent merge)', async () => {
    const seen = mockEstate([
      (lane) => {
        if (lane === 'benchGet' || lane === 'benchVerb') {
          return { status: 200, body: { bench: 'main', draft_id: 'd_bench', rev: 2, stages: [{ id: 's_0' }] } }
        }
        if (lane === 'benchEnsure') {
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
  return (lane: string, args: unknown[]) => {
    if (lane === 'benchEnsure') return { status: 200, body: { draft_id: draftId } }
    return undefined
  }
}

function benchRow(body: unknown) {
  return (lane: string, args: unknown[]) => {
    if (lane === 'benchGet') return { status: 200, body }
    return undefined
  }
}

const benchAlive = benchRow({ session: 'main', rev: 0, stages: [], log: [] })

function startOk(runId: string, status = 'queued') {
  return (lane: string, args: unknown[]) => {
    if (lane === 'runsStart') return { status: 202, body: { run_id: runId, status } }
    return undefined
  }
}

function benchNotFound() {
  return (lane: string, args: unknown[]) => {
    if (lane === 'benchGet') {
      throw new RemoteError('bench/not-found', 'no such bench', { session: 'main' })
    }
    return undefined
  }
}

describe('melite_flow guards — the exactly-one law + the wrapper gate', () => {
  test('two compositions refuse without touching the estate', async () => {
    const seen = mockEstate([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true, flow: 'x' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.ok(String(out.error).includes('exactly one composition'), String(out.error))
    assert.equal(seen.calls.length, 0)
  })

  // THE MASKED-VOICE CURE (the af-move2 commission, 2026-10-09): the
  // guards returned bare {error}, the declared output.schema demands
  // mode/target, and the tool-call validation layer's "missing
  // value.mode/target" reached the agent INSTEAD of the guard's own
  // voice — three masked diagnostics in one live run. Every guard
  // refusal carries the schema's required keys; the error text is
  // the agent-visible voice.
  test('every composition guard refusal carries mode+target (the voice survives the schema)', async () => {
    const seen = mockEstate([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    for (const args of [
      {},
      { bench: true, card: 'rig' },
      { card: 'rig', voice_name: 'nova' },
    ]) {
      const out = await tool.execute(args as never, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
      assert.equal(out.mode, 'flow', String(out.error))
      assert.equal(out.target, '', String(out.error))
      assert.ok(typeof out.error === 'string' && out.error !== '', 'a guard refusal names its voice')
    }
    assert.equal(seen.calls.length, 0)
  })

  // THE STRING-BOOLEAN TRAP (the arg-coerce valve's deletion,
  // 2026-10-01): the valve rewrote bench:"true" → true AFTER the
  // session log wrote it — executed args the log could not
  // reconstruct. The gate's own type refusal is the voice now,
  // named, before any estate call; the description teaches the
  // spelling beforehand.
  test('a string "true" on bench refuses at the gate, named (never a post-log rewrite)', async () => {
    const seen = mockEstate([okBench, okValidate])
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
    const seen = mockEstate([okBench, okValidate])
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
    const seen = mockEstate([okBench, okValidate])
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
    const seen = mockEstate([okBench, okValidate])
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
    const seen = mockEstate([okBench, okValidate])
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
    const tool = meliteFlow(mockEstate([]).request) as unknown as { parameters: { properties: Record<string, { description?: string }> } }
    const desc = tool.parameters.properties.prompt.description ?? ''
    assert.ok(desc.includes('SINGLE mode ONLY'), 'card mode is excluded by name')
    assert.ok(desc.includes('INSIDE params'), 'the card seat is stated')
  })

  test('THE UNKNOWN-ARG VOICE (029 self-critique #1): a card param at flow top-level refuses loud — never silently dropped', async () => {
    // 029's maker passed qvoice_save beside card (not inside
    // params); the bag spread dropped it and the maker paid a
    // generic missing-params refusal instead of the pointed one.
    const seen = mockEstate([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'tts', model: 'm', qvoice_save: [{ voice_name: 'x' }] } as never, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.ok(String(out.error).includes('qvoice_save'), 'the stray key is named')
    assert.ok(String(out.error).includes('INSIDE params'), 'the seat is stated')
    assert.equal(seen.calls.length, 0, 'nothing starts on a stray arg')
  })
})

describe('melite_flow presentCall/render/meta — the faces', () => {
  test('presentCall names card | flow | adhoc | ? (the gate owns the junk face)', () => {
    const tool = meliteFlow(fakeEstate({}).estate)
    // (§7 P7: the faces render only schema-valid args — mistyped or
    // non-object args are refused by the gate, never rendered by a
    // second seat. {} is schema-valid (all top-level optional).)
    const pc = (a: unknown) => tool.presentCall!(a as never)
    assert.equal(pc({ card: 'image-gen' })!.title, 'Run image-gen')
    assert.equal(pc({ card: '', flow: 'foo' })!.title, 'Run foo')
    assert.equal(pc({ flow: 'foo' })!.title, 'Run foo')
    assert.equal(pc({ card: 5, flow: 'f' }), undefined)
    assert.equal(pc({ stages: [1, 2] }), undefined)
    assert.equal(pc({})!.title, 'Run ?')
    assert.equal(pc({ card: '', flow: '', stages: 'x' }), undefined)
    assert.equal(pc(undefined), undefined)
    assert.equal(pc(null), undefined)
    assert.equal(pc('x'), undefined)
    assert.equal(pc({ card: 'c' })!.card, 'generic')
  })

  test('render tolerates sparse values (the legacy replay path)', () => {
    const tool = meliteFlow(fakeEstate({}).estate)
    const parts = tool.output.render({} as never, {} as never) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(text.includes('card ?'), text)
    assert.ok(text.includes('[queued]'), text)
  })

  test('presentationMeta carries the card model; sparse values stay minimal', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchEnsure') return { status: 200, body: { draft_id: 'd9' } }
        if (lane === 'benchGet') return { status: 200, body: { session: 'main', rev: 0, stages: [], log: [] } }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r9', status: 'queued' } }
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'img-to-mesh', runStatus: 'done', params: {} },
            { id: 's_1', card: 'image-gen', params: { prompt: 'hi' } },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rb1', status: 'queued' } }
        if (lane === 'runsStatus') {
          polls += 1
          if (polls === 1) return { status: 200, body: { status: 'running', stages: [] } }
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_1', url: 'img/SaveImage_00001_.png' }] } }
        }
        if (lane === 'draftsStagePatch' && args[0] === 'd_bench' && args[1] === 's_1') {
          patches.push(seen.calls[seen.calls.length - 1]!.args[2] as Record<string, unknown>)
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
      { stage: 's_1', card: 'image-gen', run_id: 'rb1', status: 'done', url: '/melite-media/runs/rb1/img/SaveImage_00001_.png',
        host_paths: ['test-output/rb1/img/SaveImage_00001_.png'] },
    ])
    // ONE start — the DONE row never starts (skip-done law)
    const starts = seen.calls.filter((c) => c.lane === 'runsStart')
    assert.equal(starts.length, 1)
    const startBody = decodeJsonBody(starts[0]!.args)
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

  // THE RUN CONTRACT'S HOST FACE (session 90a0b920's F7): the
  // agent read `/melite-media/...` urls — the BROWSER's channel —
  // tried them on the host (`ls: cannot access '/melite-media/'`),
  // and burned ~6 bash calls on find + a path-dialect census before
  // daring to touch a file. The flow's success answer now carries
  // out-rooted host paths, and the render prints them in
  // run_status's resolving-root voice — the maker feeds them to
  // bash/load lanes with zero archaeology.
  test('the run contract prints host-readable artifact paths (F7: the media url is the browser channel, the shell never sees it)', async () => {
    const tool = meliteFlow(fakeEstate({}).estate)
    const render = tool.output.render as unknown as (a: unknown, v: unknown) => Array<{ type: string; text: string }>
    const text = render({}, {
      mode: 'bench', target: 'bench-main @ rev 3', draft_id: 'd_bench', run_id: 'rb1', status: 'done',
      host_paths: ['output/rb1/img/SaveImage_00001_.png', 'output/rb1/img/SaveImage_00002_.png'],
      pass: [
        { stage: 's_1', card: 'image-gen', run_id: 'rb1', status: 'done',
          url: '/melite-media/runs/rb1/img/SaveImage_00001_.png',
          host_paths: ['output/rb1/img/SaveImage_00001_.png', 'output/rb1/img/SaveImage_00002_.png'] },
      ],
    })[0]!.text
    assert.ok(text.includes('(host: output/rb1/img/SaveImage_00001_.png'), 'the pass row names the shell-openable path')
    assert.ok(text.includes('artifacts on host (rooted at the estate output tree, not your cwd):'), 'run_status resolving-root voice')
    assert.ok(text.includes('output/rb1/img/SaveImage_00002_.png'), 'every minted path prints')
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStatus') {
          polls += 1
          // live for the first link's polls, terminal once the
          // re-arm link takes over
          return { status: 200, body: polls <= 2
            ? { status: 'running', stages: [] }
            : { status: 'completed', stages: [{ id: 's_0' }] } }
        }
        if (lane === 'draftsStagePatch' && args[0] === 'd_b' && args[1] === 's_0') {
          patches.push(seen.calls[seen.calls.length - 1]!.args[2] as Record<string, unknown>)
          return { status: 200, body: {} }
        }
        return undefined
      },
    ])
    // budget 40ms, one re-arm: the first link polls twice (t0 live,
    // then sleeps past its deadline), returns the waiting face, and
    // its successor observes the terminal and stamps done
    const out = await observeAndAttribute(seen.request, draftIdOf('d_b'), 's_0', 'run-x', new AbortController().signal, false, 40, 1)
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStatus') {
          polls += 1
          return { status: 200, body: { status: 'running', stages: [] } }
        }
        return undefined
      },
    ])
    const out = await observeAndAttribute(seen.request, draftIdOf('d_last'), 's_0', 'run-last', new AbortController().signal, false, 40, 0)
    assert.equal(out.status, 'queued', 'the waiting face')
    const pollsAtExpiry = polls
    assert.ok(pollsAtExpiry >= 1, 'the link observed at least once')
    // no re-arm: the poll count is stable past the cadence
    await new Promise((r) => setTimeout(r, 120))
    assert.equal(polls, pollsAtExpiry, 'a rearms-0 link re-armed anyway')
  })

  // THE LOUD MISS (the no-feedback defect, 2026-10-22): the operator
  // watched an agent bench pass mint five runs while the cards tab
  // showed NOTHING — every attribution stamp the tool made died at
  // the seat seam and each death was swallowed as "bookkeeping". A
  // stamp that does not land is a voice the user never hears: the
  // observation answer must SAY so, so the maker can tell the user
  // their tab will not paint this run.
  test('a refused attribution stamp answers loud: stamp_note names the refusal (a delivered:false patch is a miss, never silence)', async () => {
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0' }] } }
        }
        if (lane === 'draftsStagePatch') {
          // the drafts door's DOMAIN outcome — delivered:false with a
          // reason (the exact answer shape patchBody answers for a
          // doc or stage the store never had)
          return { status: 200, body: { draftId: 'd_miss', stageId: 's_0', delivered: false, reason: 'stage not found' } }
        }
        return undefined
      },
    ])
    const out = await observeAndAttribute(seen.request, draftIdOf('d_miss'), 's_0', 'run-miss', new AbortController().signal, false, 40, 0)
    assert.equal(out.status, 'done', 'the run itself succeeded — the miss is the stamp, never the run')
    assert.ok(out.stamp_note !== undefined && out.stamp_note.includes('stage not found'),
      'the miss says why: ' + JSON.stringify(out.stamp_note))
  })

  test('a thrown attribution patch answers loud too: stamp_note names the transport failure', async () => {
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0' }] } }
        }
        if (lane === 'draftsStagePatch') {
          throw new Error('seat is gone')
        }
        return undefined
      },
    ])
    const out = await observeAndAttribute(seen.request, draftIdOf('d_throw'), 's_0', 'run-throw', new AbortController().signal, false, 40, 0)
    assert.equal(out.status, 'done')
    assert.ok(out.stamp_note !== undefined && out.stamp_note.includes('seat is gone'),
      'the miss says why: ' + JSON.stringify(out.stamp_note))
  })

  // The RENDERED face of the same law (the payload-only assertion
  // is the exact gap class the staleness cure closed this morning):
  // a bench pass whose stamp never landed must PRINT the miss in the
  // row prose — the maker reads the render, not the payload.
  test('the bench render prints the miss: a refused stamp\'s row says the cards tab will NOT show the run', async () => {
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_miss_render', rev: 1, stages: [
            { id: 's_0', card: 'tts', params: {} },
          ] } }
        }
        if (lane === 'runsStart') {
          return { status: 202, body: { run_id: 'r_miss_render', status: 'queued' } }
        }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: '/runs/a.flac' }] } }
        }
        if (lane === 'draftsStagePatch') {
          return { status: 200, body: { delivered: false, reason: 'stage not found' } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'done', 'the run itself succeeded')
    const text = (tool.output.render({ bench: true }, out as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    assert.ok(text.includes('STAMP MISSED'), 'the render says the stamp missed')
    assert.ok(text.includes('stage not found'), 'the render carries the refusal\u2019s own reason')
    assert.ok(text.includes('cards tab will NOT show this run'), 'the render tells the maker what the user will not see')
  })

  // The bench caller's receipt for the same expiry: the flow is NOT
  // failed — the receipt is pending, names the run, and renders
  // through the success face (no REFUSED), so the maker re-waits
  // with run_status instead of re-pressing the bench.
  test('a bench stage that outlives the observation budget returns pending (not stopped, no refusal render)', async () => {
    vi.useFakeTimers()
    try {
      const patches: Array<Record<string, unknown>> = []
      const seen = mockEstate([
        (lane: string, args: unknown[]) => {
          if (lane === 'benchGet') {
            return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
              { id: 's_0', card: 'image-gen', params: { prompt: 'hi' } },
            ] } }
          }
          if (lane === 'runsStart') return { status: 202, body: { run_id: 'rb1', status: 'queued' } }
          if (lane === 'runsStatus') {
            return { status: 200, body: { status: 'running', stages: [] } }
          }
          if (lane === 'draftsStagePatch' && args[0] === 'd_bench' && args[1] === 's_0') {
            patches.push(seen.calls[seen.calls.length - 1]!.args[2] as Record<string, unknown>)
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

  test('a failed stage is RECORDED and the pass presses the REST (F20 residual — never a silent abandon)', async () => {
    // The round-4 burn: `run all` stopped at the first failed stage, so
    // the later stages never got their press and the operator re-pressed
    // blind. The pass now presses every stage, records the failure, and
    // the final status still says stopped + names the FIRST failure.
    const starts: string[] = []
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
            { id: 's_1', card: 'upscale-tools', params: {} },
          ] } }
        }
        if (lane === 'runsStart') {
          starts.push('start')
          return { status: 202, body: { run_id: 'r' + String(starts.length), status: 'queued' } }
        }
        if (lane === 'runsStatus') {
          // the FIRST stage settles failed; every later stage completes
          return { status: 200, body: { status: starts.length === 1 ? 'failed' : 'completed', stages: [] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped', 'a pass with a failed stage never reads clean')
    assert.equal(out.stoppedAt, 's_0', 'the FIRST failure is named')
    assert.equal(out.error, 'stage s_0 (image-gen) ended error (the pass still pressed the remaining stages)')
    // the LATER stage ran: two starts, and its own pass row carries its run id
    assert.equal(starts.length, 2, 's_1 reached the queue after s_0 failed')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass.length, 2, 'both stages have an outcome row')
    assert.equal(pass[0]!.status, 'error')
    assert.equal(pass[1]!.status, 'done')
  })

  test('a failed stage never reads clean — the pass still presses the rest and names the first failure', async () => {
    let polls = 0
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
            { id: 's_1', card: 'upscale-tools', params: {} },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rb9', status: 'queued' } }
        if (lane === 'runsStatus') {
          polls += 1
          return { status: 200, body: polls === 1 ? { status: 'running', stages: [] } : { status: 'failed', stages: [] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
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
    assert.equal(out.error, 'stage s_0 (image-gen) ended error — 2 stages failed (the pass still pressed every stage; read pass[])')
    assert.equal(out.run_id, 'rb9')
    // THE RENDER LAW (transcript-016): a stopped-mid-flow refusal PRINTS
    // the run id — the maker must never glob output/ to find a run it
    // already paid for (ten wasted calls before this pin).
    const rendered = tool.output!.render!({ bench: true } as never, asJson(out))
    assert.match(asText(rendered[0]), /melite_flow REFUSED: stage s_0 \(image-gen\) ended error — 2 stages failed \(the pass still pressed every stage; read pass\[\]\) — run rb9 \(poll with run_status\)/)
    // a PRE-RUN refusal (no run started) renders without the run clause
    const preRun = tool.output!.render!({ bench: true } as never, { mode: 'bench', target: 'x', status: 'stopped', error: 'stage s_0 names no card' })
    assert.equal(asText(preRun[0]), 'melite_flow REFUSED: stage s_0 names no card')
    // THE PRESS KEEPS GOING (F20 residual, 2026-10-30): s_1 IS pressed
    // after s_0 failed — the round-4 burn was the silent abandon, never
    // a lost refusal
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStart').length, 2)
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass.length, 2)
    assert.equal(pass[1]!.status, 'error')
  })

  test('a bench without draft_id/rev falls back honestly', async () => {
    let polls = 0
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: { stages: [{ id: 's_0', card: 'image-gen', params: {} }] } }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rb2', status: 'queued' } }
        if (lane === 'runsStatus') {
          polls += 1
          return { status: 200, body: polls === 1 ? { status: 'queued', stages: [] } : { status: 'completed', stages: [{ id: 's_0', url: 'x.png' }] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 1, stage: 's_0', patched: ['runStatus'] } }
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd', rev: 1, stages: [] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.mode, 'bench')
    assert.equal(out.error, 'the bench is empty — construct stages first (melite_construct)')
  })

  test('a refused bench start carries the error with the draft', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [{ id: 's_0', card: 'image-gen', params: {} }] } }
        if (lane === 'runsStart') return { status: 400, body: { error: 'queue full' } }
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [{ id: 's_0', params: {} }] } }
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') throw new RemoteError('runs/unknown-run', 'lane down', { runId: '' })
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.deepEqual(out, { error: 'lane down', mode: 'bench', target: 'bench-main' })
  })

  test('a messageless remote bench failure refuses as remote-refused', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') throw new RemoteError('runs/unknown-run', '', { runId: '' })
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, 'remote refused')
    assert.equal(out.mode, 'bench')
  })

  test('a transport bench failure propagates (never valued)', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') throw new Error('gate down')
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    await assert.rejects(tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000))), /gate down/)
  })
})

describe('melite_flow card — compose inside', () => {
  test('THE MODEL DERIVE (zero-friction audit, 2026-10-21): a card with no explicit model derives its boarded family and starts — the refusal era is over', async () => {
    const seen = mockEstate([ensureOk('d_derive'), benchAlive, startOk('r_derive')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.run_id, 'r_derive')
    // the derived family rode the start doc — modelForCard's own
    // resolution (the QUEUE LANE resolver, never a minted id)
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args) as Record<string, unknown>
    assert.equal(typeof startBody['model'], 'string')
    assert.notEqual(String(startBody['model']), '')
    // and an explicit model still WINS over the derivation
    const seen2 = mockEstate([ensureOk('d_derive2'), benchAlive, startOk('r_derive2')])
    const tool2 = meliteFlow(seen2.request)
    await tool2.execute({ card: 'image-gen', model: 'explicit-fam' }, fakeExec(AbortSignal.timeout(2000)))
    const startBody2 = decodeJsonBody(seen2.calls.find((c) => c.lane === 'runsStart')!.args) as Record<string, unknown>
    assert.equal(startBody2['model'], 'explicit-fam')
  })

  test('no prompt anywhere: the intent falls back to the card', async () => {
    const seen = mockEstate([ensureOk('d3'), benchAlive, startOk('r3')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.run_id, 'r3')
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
    assert.equal(ensureBody.intent, 'image-gen')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
    assert.equal(startBody.model, 'm')
    assert.equal('prompt' in startBody, false)
  })

  test('a long prompt never steals the intent (CARD BIRTH LAW); params.prompt rides the bag', async () => {
    // 2026-09-13, the hour-6 form regression: prompt-as-intent broke
    // the studio consult (the bench normalization strips stage.card;
    // identity survives on the intent alone) and every prompt-carrying
    // chat birth rendered the GENERIC FORM. The law: intent = card id.
    const seen = mockEstate([ensureOk('d4'), benchAlive, startOk('r4')])
    const tool = meliteFlow(seen.request)
    const long = 'p'.repeat(100)
    const out = await tool.execute(
      { card: 'image-gen', model: 'm', prompt: long, params: { seed: 1 } },
      fakeExec(AbortSignal.timeout(2000)),
    ) as Record<string, unknown>
    assert.equal(out.run_id, 'r4')
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args) as { intent: string }
    assert.equal(ensureBody.intent, 'image-gen')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
    assert.equal(startBody.prompt, long)
    assert.equal(startBody.seed, 1)
  })

  test('params.prompt composes when no top-level prompt rides; empty prompt never clobbers', async () => {
    const seen = mockEstate([ensureOk('d5'), benchAlive, startOk('r5')])
    const tool = meliteFlow(seen.request)
    await tool.execute(
      { card: 'image-gen', model: 'm', prompt: '', params: { prompt: 'p2' } },
      fakeExec(AbortSignal.timeout(2000)),
    )
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
    assert.equal(startBody.prompt, 'p2')
  })

  test('a refused bench ensure values the card error (no start, no draft)', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchEnsure') return { status: 200, body: { error: 'bench moved: rev is 2, caller held 1' } }
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
    assert.equal(seen.calls.some((c) => c.lane === 'runsStart'), false)
  })

  test('a non-Error bench failure values its string form', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet' || lane === 'benchVerb') throw 'wire-down'
        return undefined
      },
      ensureOk('d6'),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, 'wire-down')
  })

  test('a transport start failure propagates (never valued)', async () => {
    const seen = mockEstate([
      ensureOk('d7'), benchAlive,
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStart') throw new Error('socket hangup')
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    await assert.rejects(tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000))), /socket hangup/)
  })

  test('a messageless remote start refusal values the queue default', async () => {
    const seen = mockEstate([
      ensureOk('d8'), benchAlive,
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStart') throw new RemoteError('runs/flow-compile', '', { loc: 'flow' })
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, 'queue refused the start')
    assert.equal(out.mode, 'card')
  })

  test('a bare start answer defaults run_id/status honestly', async () => {
    const seen = mockEstate([
      ensureOk('d9'), benchAlive,
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStart') return { status: 202, body: {} }
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
    const seen = mockEstate([
      ensureOk('d-observe'),
      benchAlive,
      startOk('rb-observe'),
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStatus') return {
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
        if (lane === 'draftsStagePatch' && args[0] === 'd-observe' && args[1] === 's_0') {
          patch = seen.calls[seen.calls.length - 1]!.args[2] as Record<string, unknown>
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
    const seen = mockEstate([ensureOk('d_long'), benchAlive, startOk('r_long')])
    const tool = meliteFlow(seen.request)
    const card = 'c'.repeat(81)
    const out = await tool.execute({ card, model: 'm' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.match(String(out.error), /unknown card/)
    assert.equal(
      seen.calls.some((c) => c.lane === 'benchEnsure'),
      false,
      'the long unknown id refuses before the bench write',
    )
  })
})

describe('melite_flow template — the birth arm + compose refusals', () => {
  test('a missing bench births (no expect_rev on the ensure)', async () => {
    const seen = mockEstate([ensureOk('d_birth'), benchNotFound(), startOk('r_birth')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.run_id, 'r_birth')
    assert.equal(out.draft_id, 'd_birth')
    assert.equal(seen.calls.length, 3)
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
    assert.equal('expect_rev' in ensureBody, false)
  })

  test('a rev-less bench row births (no expect_rev on the ensure)', async () => {
    const seen = mockEstate([ensureOk('d_rev'), benchRow({ session: 'main', stages: [] }), startOk('r_rev')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.draft_id, 'd_rev')
    const ensureBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
    assert.equal('expect_rev' in ensureBody, false)
  })

  test('a transport bench failure values its message', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet' || lane === 'benchVerb') throw new Error('gate down')
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet' || lane === 'benchVerb') throw 42
        return undefined
      },
      ensureOk('d11'),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, '42')
  })

  test('an ensure without a draft_id values the birth failure', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchEnsure') return { status: 200, body: {} }
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
    const seen = mockEstate([() => { throw new Error('validate down') }])
    const tool = meliteFlow(seen.request)
    await assert.rejects(tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))), /validate down/)
    assert.equal(seen.calls.length, 1)
  })

  test('a messageless validate refusal values the compile default', async () => {
    const seen = mockEstate([() => { throw new RemoteError('runs/flow-compile', '', { loc: 'flow' }) }])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.error, 'flow does not compile')
    assert.equal(out.mode, 'adhoc')
  })

  test('a refused bench ensure values the adhoc error (no start)', async () => {
    const seen = mockEstate([
      okValidate,
      (lane: string, args: unknown[]) => {
        if (lane === 'benchEnsure') return { status: 200, body: { error: 'bench moved: rev is 2, caller held 1' } }
        return undefined
      },
      benchAlive,
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.mode, 'adhoc')
    assert.ok(String(out.error).includes('bench moved'), String(out.error))
    assert.equal(seen.calls.some((c) => c.lane === 'runsStart'), false)
  })

  test('a refused adhoc start carries the error and NO draft_id', async () => {
    // 200-with-{error}: the start door answered (not refused) with a
    // value-carried error — startRun's res.error arm (the 400 arm rides
    // the bench refusal test above).
    const seen = mockEstate([okBench, okValidate, () => ({ status: 200, body: { error: 'queue full' } })])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ ...FLOW }, fakeExec(AbortSignal.timeout(2000))) as Record<string, unknown>
    assert.equal(out.mode, 'adhoc')
    assert.equal(out.target, 'still-to-motion')
    assert.ok(String(out.error).includes('queue full'), String(out.error))
    assert.equal(out.draft_id, undefined)
  })

  test('a non-Error bench failure values its string form', async () => {
    const seen = mockEstate([
      okValidate,
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet' || lane === 'benchVerb') throw 'wire-down'
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
    const seen = mockEstate([ensureOk('d_nc'), benchAlive, okValidate, startOk('r_nc')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { stages: [{ id: 'a', engine: 'comfyui' }] },
      fakeExec(AbortSignal.timeout(2000)),
    ) as Record<string, unknown>
    assert.equal(out.mode, 'adhoc')
    assert.equal(out.target, 'adhoc')
    assert.equal(out.run_id, 'r_nc')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 7, stages: [
            { id: 's_0', card: 'image-gen', params: { prompt: 'hi', model: 'flux-pro' } },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rbm', status: 'queued' } }
        if (lane === 'runsStatus') {
          polls += 1
          return { status: 200, body: polls === 1 ? { status: 'running', stages: [] } : { status: 'completed', stages: [{ id: 's_0', url: 'img/SaveImage_00001_.png' }] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 8, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
    // THE ROW'S OWN MODEL WINS — the params name it, the start rides it verbatim
    assert.equal(startBody.model, 'flux-pro')
  })

  test('a familyless card rides the DRAFT ARM — no model key (the rig hop, af-move 2026-10-09)', async () => {
    let polls = 0
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 9, stages: [
            { id: 's_0', card: 'rig', params: { mode: 'auto' } },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rbx', status: 'queued' } }
        if (lane === 'runsStatus') {
          polls += 1
          return { status: 200, body: polls === 1 ? { status: 'running', stages: [] } : { status: 'completed', stages: [{ id: 's_0', url: 'x.glb' }] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 10, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
    // THE FAMILYLESS MARKER (stroke 3): the press carries NO model key —
    // the draft arm composes the bench's stages, the familyless one by
    // its OWN card id. The old press injected the card id as the model
    // and hit the board check first ("model 'rig' is not offered by
    // card 'rig' (boards: none)") — the commission's stop. An unknown
    // card id rides the same arm; the registry door names the ghost.
    assert.ok(!('model' in startBody), 'no model key rides a familyless press')
    assert.equal(startBody.draft_id, 'd_bench')
  })

  test('a row naming no card stops the pass with the construct-patch voice', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
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
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStart').length, 0)
  })
})

describe('melite_flow bench — the degenerate-shape arms', () => {
  test('a bench whose stages is not an array is the empty refusal (never a crash)', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd', rev: 2, stages: 'junk-not-array' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(3000))) as Record<string, unknown>
    assert.equal(out.error, 'the bench is empty — construct stages first (melite_construct)')
  })

  test('a row with null params rides the empty object (the start still carries the model)', async () => {
    let polls = 0
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: null },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rbn', status: 'queued' } }
        if (lane === 'runsStatus') {
          polls += 1
          return { status: 200, body: polls === 1 ? { status: 'running', stages: [] } : { status: 'completed', stages: [{ id: 's_0', url: 'img/SaveImage_00001_.png' }] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
    assert.equal(startBody.model, 'krea-2')
    assert.equal('prompt' in startBody, false)
  })

  test('a transport hiccup mid-poll retries on cadence (unclassified error, never terminal)', async () => {
    let polls = 0
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 5, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rbh', status: 'queued' } }
        if (lane === 'runsStatus') {
          polls += 1
          if (polls === 1) throw new Error('socket hiccup — unclassified')
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: 'img/SaveImage_00001_.png' }] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 6, stage: 's_0', patched: ['runStatus'] } }
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 7, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rbu', status: 'queued' } }
        if (lane === 'runsStatus') {
          throw new RemoteError('runs/unknown-run', 'the run vanished', { runId: 'rbu' })
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 8, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    // folded: the classified unknown-outcome arm speaks the CardStatus
    assert.equal(out.error, 'stage s_0 (image-gen) ended stopped (the pass still pressed the remaining stages)')
  })
})

describe('melite_flow adhoc — the card fold + compile-first gate (035 dead-route receipt)', () => {
  test('foldConnects keeps the card on the wire body (035 dead-route receipt: the drop hid the card from every gate)', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'runsValidate') return { status: 200, body: { ok: true } }
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd1', rev: 1, stages: [] } }
        if (lane === 'benchEnsure') return { status: 200, body: { draft_id: 'd1', rev: 2 } }
        if (lane === 'runsStart') return { status: 400, body: { error: 'flow_inline stage "s0": card= stages are unported on this gateway' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ stages: [{ id: 's0', engine: 'comfyui', card: 'image-gen', params: { prompt: 'x' } }] }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    // the START door's own honest voice — never the engine's
    // `node carries no inline workflow`
    assert.match(String(out['error']), /card= stages are unported/)
    const v = seen.calls.find((c) => c.lane === 'runsValidate')
    const row = ((v!.args[0] as { stages: Array<Record<string, unknown>> }).stages)[0]!
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rbs', status: 'queued' } }
        if (lane === 'runsStatus') {
          // two OTHER stages — no single-stage fallback, no match;
          // junk entries (a string row, a null row) exercise the
          // filter's both drop arms — they never reach the find
          return { status: 200, body: { status: 'completed', stages: [
            'junk-row', null, { id: 'other-a', url: 'a.png' }, { id: 'other-b', url: 'b.png' },
          ] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rart', status: 'queued' } }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [
            { id: 's_0', url: '/melite-media/runs/rart/clip.mp4' },
          ], artifacts: [
            { path: 'run-rart/clip.mp4', bytes: 1234 },
            'run-rart/sheet.png',
            { junk: true }, 42, // non-path rows drop, never throw
          ] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
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
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rbv', status: 'queued' } }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [
            { id: 's_0', url: 'https://cdn.example/abs/clip.mp4' },
          ] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    assert.equal((out.pass as Array<Record<string, unknown>>)[0]!['url'], 'https://cdn.example/abs/clip.mp4')
  })

  test('a non-string status field folds to stopped — terminal, the pass stops', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rbq', status: 'queued' } }
        if (lane === 'runsStatus') {
          // junk status AND junk stages shape — the distill's honest
          // defaults (unknown status; the non-array arm drops to []),
          // then the fold: unknown-outcome is the 'stopped' CardStatus
          return { status: 200, body: { status: 42, stages: 'not-an-array' } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.error, 'stage s_0 (image-gen) ended stopped (the pass still pressed the remaining stages)')
  })
})

describe('melite_flow bench — the single-stage fallback arm', () => {
  test('a lone foreign stage row is the asked stage (the fallback), url-less when it carries none', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 3, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'rbl', status: 'queued' } }
        if (lane === 'runsStatus') {
          // ONE stage, foreign id, NO url — the fallback adopts it,
          // and the empty-url gate keeps the pass row url-less
          return { status: 200, body: { status: 'completed', stages: [{ id: 'the-only-stage' }] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 4, stage: 's_0', patched: ['runStatus'] } }
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

describe('melite_flow bench — THE WIRE RESOLUTION LAW (session 7a82, autopsy P1)', () => {
  // The burn: the agent's image-edit stage carried BOTH a wire
  // (inputs.image1 → s_0) and the bench law's matching $spell
  // (params.image1: "$image1"); the bench pass sent the spell
  // verbatim and the door's spell gate refused in a CIRCLE ("run the
  // bench flow" is the refused call; "replace with a concrete value"
  // names the wrong cure — the WIRE is the resolution). Two dead
  // turns, ~470s, zero output, and the operator met the refusal at
  // their own press. The UI's press has resolved wires to the
  // upstream's last result since 2026-10-10 (stage-run.ts:147) —
  // this describe pins the agent-side mirror: same law, same voice,
  // both callers of THE shared bench.
  const wiredBench = (upstreamUrl: string | undefined) => ({
    draft_id: 'd_wire', rev: 7, stages: [
      {
        id: 's_0', card: 'image-gen', runStatus: 'done', params: { model: 'anima' },
        ...(upstreamUrl !== undefined
          ? { result: { run_id: 'r_up', url: upstreamUrl } }
          : { result: { run_id: 'r_up' } }),
      },
      {
        id: 's_1', card: 'image-edit',
        params: { model: 'qwen-img-edit-21', image1: '$image1', prompt: 'replace the flower' },
        inputs: { image1: { stage: 's_0', output: 'default' } },
      },
    ],
  })

  test('a wired stage starts with the spell RESOLVED to the upstream\'s last result — never the raw $spell, never the circular refusal', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: wiredBench('/melite-media/runs/r_up/generate/SaveImage.0.png') }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_wire', status: 'queued' } }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_1', url: '/melite-media/runs/r_wire/edit/SaveImage.0.png' }] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true, patched: ['runStatus', 'result'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000))) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const start = seen.calls.find((c) => c.lane === 'runsStart')
    assert.ok(start, 'the wired stage started')
    const body = start!.args[0] as Record<string, unknown>
    assert.equal(
      (body.params as Record<string, unknown> | undefined)?.['image1'] ?? body['image1'],
      '/melite-media/runs/r_up/generate/SaveImage.0.png',
      'the $image1 spell resolved to the upstream result url — the concrete value the {model:} door accepts',
    )
    assert.equal(body['model'], 'qwen-img-edit-21')
    const spells = JSON.stringify(body)
    assert.ok(!spells.includes('$image1'), 'no spell rides the start body')
  })

  test('an upstream with no output yet STOPS THE PASS naming the wire — never a doomed run, never a silent drop', async () => {
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: wiredBench(undefined) }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000))) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_1')
    assert.match(
      String(out.error),
      /input "image1" is wired to stage "s_0" which has no output yet — run it first \(or clear the wire\)/,
      'the same voice the UI press answers with',
    )
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStart').length, 0, 'no run started — the pass refused ahead of the wall')
  })
})
