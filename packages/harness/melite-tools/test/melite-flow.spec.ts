// melite_flow walls (vitest, fetch mocked — no gateway, no
// GPU). Ports the flow_run / card_run L4 walls onto the ONE execution
// verb:
//   1. W-1 (2026-11-05): the ad-hoc door is GONE — {stages}/{connects}
//      refuse in tombstone words naming the per-stage verb, before any
//      bench read; the {stage} press leaves siblings + intent untouched
//   2. CARD: the allowlist is DERIVED from /v1/card-tools (the
//      hardcoded 6-model list is dead); refusals ride the value
//   3. L4: the test flag rides the start body in every mode
//   4. CARD BIRTH LAW: compose-first in every mode — the start
//      rides the minted draft_id; a refused compose never starts

import { describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { meliteFlow, observeAndAttribute } from '../src/tools/melite-flow.ts'
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
      fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }),
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
      fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }),
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
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    assert.equal(verb.args[0], 'session-chat7')
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

  // W-5 (2026-11-05, F3-12 double spend — the FRICTION_3.md burn, cure
  // map bench-state Item 2 option (b), operator ruling: "card press on
  // a bench already holding that card → REFUSE naming the row"): the
  // twin arms BOUND the merge law above — the append-on-held-bench is
  // lawful only for work the bench does not already hold. Registry row
  // harness-flow-card-twin-refuse.
  const twinParams = { text: 'a cat', seed: 73020, loras: [{ id: 'x', strength: 1 }] }
  const twinBench = (result?: Record<string, unknown>) => ({
    session: 'main', rev: 3, draft_id: 'd-held', log: [],
    stages: [{
      id: 's_0', card: 'tts', params: { ...twinParams, model: 'tts-1' },
      ...(result !== undefined ? { result } : {}),
    }],
  })
  const twinHandlers = (): Array<(lane: string, args: unknown[]) => { status: number; body: unknown } | undefined> => [
    (lane: string, args: unknown[]) => {
      if (lane === 'benchGet') return { status: 200, body: twinBench({ run_id: 'r-first', url: '/runs/first.wav' }) }
      if (lane === 'benchVerb') return { status: 200, body: { rev: 4, stage: 's_1' } }
      if (lane === 'runsStart') return { status: 202, body: { run_id: 'r-twin', status: 'queued' } }
      if (lane === 'runsStatus') {
        return { status: 200, body: { status: 'completed', stages: [{ id: String((args[0] as Record<string, unknown>)['run_id'] ?? 's_1'), url: 'tts/out.wav' }] } }
      }
      if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
      return undefined
    },
  ]

  test('W-5 arm 1 (THE WALL): a card press on a bench already holding the SAME card with the same params/seed REFUSES — zero runs minted, zero stage rows added', async () => {
    const seen = mockEstate(twinHandlers())
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'tts', model: 'tts-1',
      params: { ...twinParams },
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'card')
    assert.equal(out.target, 'tts')
    assert.match(
      String(out.error),
      /already holds this card as stage s_0 with the same params/,
      'the refusal names the held row',
    )
    assert.equal(
      seen.calls.filter((c) => c.lane === 'runsStart').length,
      0,
      'ZERO run ids minted — the second identical GPU run never starts (the F3-12 burn spent run-8b69504fd7cc beside run-96e2635542b9)',
    )
    assert.equal(
      seen.calls.filter((c) => c.lane === 'benchVerb').length,
      0,
      'ZERO stage rows added — the minted-stage half dies with the append that never fires (the burn minted s_1, rev 126→127)',
    )
  })

  test('W-5 arm 2 (voice + the working door): the refusal names the row id, its last_run, and a door that RUNS', async () => {
    // the twin has NO result memory — the honest voice says "never
    // run" instead of inventing a run id (the qa8 GAPS-12 law's twin).
    const seen = mockEstate(twinHandlers().map((h) => (lane: string, args: unknown[]) => {
      if (lane === 'benchGet') return { status: 200, body: twinBench() }
      return h(lane, args)
    }))
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'tts', model: 'tts-1', params: { ...twinParams },
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.match(String(out.error), /stage s_0 with the same params \(never run\)/,
      'the row id rides the refusal, and a row with no result names the truth')
    assert.match(String(out.error), /melite_flow \{stage:"s_0"\}/, 'the press door is named')
    assert.match(String(out.error), /melite_construct patch/, 'the patch door is named')
    // THE NAMED DOOR DELIVERS (doors-refusal-door-pin's law): the very
    // same bench pressed through the named door runs the row.
    const byDoor = await tool.execute({ stage: 's_0' }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(byDoor.error, undefined, JSON.stringify(byDoor))
    assert.equal(byDoor.run_id, 'r-twin', 'the door the refusal named is a working door')
  })

  test('W-5 arm 3 (guard boundary): a DIFFERENT card on the held bench still appends + runs — the F15 merge keeps its receipt', async () => {
    const seen = mockEstate(twinHandlers())
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'image-edit', model: 'image-edit-21', params: { prompt: 'edit this' },
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, undefined, 'a different card never trips the twin guard')
    assert.match(String(out.rode), /merge-arm \(bench held 1 stage\(s\) — appended s_1, nothing replaced\)/)
    assert.equal(seen.calls.filter((c) => c.lane === 'benchVerb').length, 1, 'the lawful append fired once')
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStart').length, 1, 'the run minted once')
  })

  test('W-5 arm 4 (params-mismatch — the strict form judged): the SAME card with DIFFERENT params is not a twin — it appends + runs per the F15 law, never refuses-and-silences', async () => {
    const seen = mockEstate(twinHandlers())
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      card: 'tts', model: 'tts-1',
      params: { ...twinParams, seed: 999 },
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, undefined, 'a params mismatch is not the held work — the strict form stays silent')
    assert.match(String(out.rode), /merge-arm/, 'the F15 merge answers (bounded, not deleted)')
    assert.equal(seen.calls.filter((c) => c.lane === 'benchVerb').length, 1)
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStart').length, 1)
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
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.run_id, 'r-cas')
    assert.equal(verbs.length, 2, 'exactly one rebase — a second conflict refuses')
    assert.equal(verbs[0]!['expect_rev'], 7)
    assert.equal(verbs[1]!['expect_rev'], 8)
  })

  test('a rev-less bench read appends WITHOUT expect_rev (the tolerant CAS read — no phantom rev invented)', async () => {
    // the merge arm reads existing['rev'] for the CAS write; a bench
    // row carrying no rev (legacy/advisory read) appends with NO
    // expect_rev key rather than expecting an invented rev — the `{}`
    // alternate of the rev-guard spread.
    const heldBench = {
      draft_id: 'd-norev',
      stages: [{ id: 's_0', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } }],
    }
    const mock = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: heldBench }
        if (lane === 'benchVerb') {
          const doc = args[2] as Record<string, unknown>
          assert.ok(!('expect_rev' in doc), 'no CAS key invented for a rev-less read: ' + JSON.stringify(doc))
          return { status: 200, body: { rev: 5, stage: 's_7' } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r-norev', status: 'queued' } }
        return undefined
      },
    ])
    const tool = meliteFlow(mock.request)
    const out = await tool.execute({
      card: 'image-gen', model: 'image-gen-1',
      params: { prompt: 'a new still' },
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.run_id, 'r-norev')
    assert.match(String(out.rode), /merge-arm \(bench held 1 stage\(s\) — appended s_7, nothing replaced\)/)
  })

  test('an append that DIES in transport refuses with the transport voice — the merge arm never swallows a write death', async () => {
    // benchVerb throws a non-CAS Error: remoteErrorOf finds no code,
    // so the rethrow arm (not the rebase arm) fires and the outer
    // catch values the Error's own message.
    const heldBench = {
      session: 'main', rev: 3, draft_id: 'd-held', log: [],
      stages: [{ id: 's_0', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } }],
    }
    const mock = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: heldBench }
        if (lane === 'benchVerb') throw new Error('append transport died')
        return undefined
      },
    ])
    const tool = meliteFlow(mock.request)
    const out = await tool.execute({
      card: 'image-gen', model: 'image-gen-1',
      params: { prompt: 'a new still' },
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'card')
    assert.equal(out.error, 'append transport died', 'the transport voice rides the value — never a phantom stage id')
    assert.equal(mock.calls.filter((c) => c.lane === 'runsStart').length, 0, 'a dead append never starts')
  })

  test('an append that dies WITHOUT an Error still voices — the String() arm answers a bare wire-down', async () => {
    // the same write death thrown as a bare string (the lanes' own
    // 'wire-down' shape): remoteErrorOf finds no code, the rethrow
    // fires, and the outer catch String()s the voice.
    const heldBench = {
      session: 'main', rev: 3, draft_id: 'd-held', log: [],
      stages: [{ id: 's_0', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } }],
    }
    const mock = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: heldBench }
        if (lane === 'benchVerb') throw 'wire-down'
        return undefined
      },
    ])
    const tool = meliteFlow(mock.request)
    const out = await tool.execute({
      card: 'image-gen', model: 'image-gen-1',
      params: { prompt: 'a new still' },
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'card')
    assert.equal(out.error, 'wire-down')
  })

  test('an append answered with a domain error refuses with the door\u2019s own voice (never a minted id)', async () => {
    // the door answers 200 WITH an error body (a domain refusal, not
    // transport): the merge arm values it directly — no stage id is
    // trusted, no start rides.
    const heldBench = {
      session: 'main', rev: 3, draft_id: 'd-held', log: [],
      stages: [{ id: 's_0', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } }],
    }
    const mock = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: heldBench }
        if (lane === 'benchVerb') return { status: 200, body: { rev: 4, error: 'bench/moved: rev is stale' } }
        return undefined
      },
    ])
    const tool = meliteFlow(mock.request)
    const out = await tool.execute({
      card: 'image-gen', model: 'image-gen-1',
      params: { prompt: 'a new still' },
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'card')
    assert.equal(out.error, 'bench/moved: rev is stale')
    assert.equal(mock.calls.filter((c) => c.lane === 'runsStart').length, 0, 'a refused append never starts')
  })

  test('an append answered with an empty error and no stage keeps the s_0 seat — the empty string refuses nothing', async () => {
    // error: '' is the empty-error trap's own shape (a success face
    // carrying no stage id): the merge guard falls through (the `&&`
    // right operand false), the stage arm keeps s_0, and the press
    // still rides.
    const heldBench = {
      session: 'main', rev: 3, draft_id: 'd-held', log: [],
      stages: [{ id: 's_0', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } }],
    }
    const mock = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: heldBench }
        if (lane === 'benchVerb') return { status: 200, body: { rev: 5, error: '' } }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r-emptystage', status: 'queued' } }
        return undefined
      },
    ])
    const tool = meliteFlow(mock.request)
    const out = await tool.execute({
      card: 'image-gen', model: 'image-gen-1',
      params: { prompt: 'a new still' },
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.run_id, 'r-emptystage')
    assert.match(String(out.rode), /appended s_0/, 'no stage id rode — the s_0 seat stands: ' + String(out.rode))
  })

  test('a bench read with no draft_id mints the caller bench seat (the merge arm births no draft)', async () => {
    // existing carries stages but no draft_id string: the merge arm
    // derives the draft from the caller's own bench key
    // (benchDraftIdOf) instead of inventing one — the `??`-chain's
    // fallback arm.
    const heldBench = {
      session: 'main', rev: 3, log: [],
      stages: [{ id: 's_0', card: 'image-gen', params: { prompt: 'a cat', model: 'image-gen-1' } }],
    }
    const mock = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: heldBench }
        if (lane === 'benchVerb') return { status: 200, body: { rev: 4, stage: 's_1' } }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r-nodraft', status: 'queued' } }
        return undefined
      },
    ])
    const tool = meliteFlow(mock.request)
    const out = await tool.execute({
      card: 'image-gen', model: 'image-gen-1',
      params: { prompt: 'a new still' },
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.draft_id, 'bench-session-chat7', 'the caller conversation bench — never a minted draft')
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
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
      fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }),
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
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
  // THE LABEL LAW (queue 12, operator 2026-11-08: "there is no place
  // for the ai agent or the user through the card UI to label output
  // names"): the settled gallery may carry display `label`s (the
  // output_name mint at settle) beside its file names — the terminal
  // stamp keys artifacts by LABEL, urls stay the name's media route.
  test('card mode keys the terminal stamp by the gallery labels (queue 12)', async () => {
    let patchBody: Record<string, unknown> | undefined
    let resolvePatch!: () => void
    const patched = new Promise<void>((resolve) => { resolvePatch = resolve })
    const seen = mockEstate([
      okBenchWith('d-headless'),
      okDraftThenStart('d-headless', 'r-label'),
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStatus') {
          return { status: 200, body: {
            status: 'completed',
            stages: [{
              id: 's_0',
              url: 'h3-film/film.mp4',
              gallery: [
                { name: 'h3-film/film.mp4', label: 'golden hour' },
                { name: 'h3-film/mix.flac', label: 'golden hour · 2' },
                { name: 'h3-film/extra.png' },
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
    }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.run_id, 'r-label')
    await patched
    assert.deepEqual(patchBody?.result, {
      run_id: 'r-label',
      url: '/melite-media/runs/r-label/h3-film/film.mp4',
      artifacts: {
        'golden hour': '/melite-media/runs/r-label/h3-film/film.mp4',
        'golden hour · 2': '/melite-media/runs/r-label/h3-film/mix.flac',
        'h3-film/extra.png': '/melite-media/runs/r-label/h3-film/extra.png',
      },
      assetUrls: [
        '/melite-media/runs/r-label/h3-film/film.mp4',
        '/melite-media/runs/r-label/h3-film/mix.flac',
        '/melite-media/runs/r-label/h3-film/extra.png',
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
      { signal: AbortSignal.timeout(2000), agent: { id: 'session-chat7' } } as never,
    ) as Record<string, unknown>
    assert.equal(out.error, undefined)
    // the CAS read AND the ensure both ride the conversation key —
    // the same key melite_construct binds for this agent (construct's
    // benchKeyOfExec parity: the composed tiles and the executed
    // pipeline are one bench)
    const get = seen.calls.find((c) => c.lane === 'benchGet')
    assert.equal(get!.args[0], 'session-chat7')
    const ensure = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
    assert.equal(ensure.session, 'session-chat7')
  })

  test('an unattributed seat (no agent id) falls back to main — construct parity (the genuinely unattributed seat is the fallback the one-seat law leaves alive)', async () => {
    const seen = cardMocks()
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { card: 'image-gen', model: 'new-model-1', prompt: 'hi' },
      // the arm's seat IS the subject: an inline UNATTRIBUTED exec
      // (no agent id) — not the file's seated helper
      { signal: AbortSignal.timeout(2000) } as never,
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
      { signal: AbortSignal.timeout(2000), agent: { id: 'session-chat7' } } as never,
    ) as Record<string, unknown>
    // the fixture bench is empty — the refusal still proves WHICH
    // bench was read (the conversation's, not main's)
    assert.ok(typeof out.error === 'string' && out.error.includes('empty'))
    assert.equal(seen.calls[0]!.lane, 'benchGet')
    assert.equal(seen.calls[0]!.args[0], 'session-chat7')
    assert.equal(out.target, 'bench-session-chat7')
  })
})

describe('melite_flow L4 — the test flag rides every mode', () => {
  test('template: test:false default, flow explicitly named, THE MATERIALIZING PRESS (flows-are-compositions slice C, 2026-11-14)', async () => {
    const seen = mockEstate([flowLoad(UP_ROWS), okBenchWith('bench-session-chat7'), startOk('r0')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.mode, 'flow')
    assert.equal(out.run_id, 'r0')
    // THE MATERIALIZING PRESS LAW: read the bundle (bench_stages) →
    // land the rows as ONE bench write (the landing declares itself)
    // → start through the flow door carrying the bench draft. Three
    // lanes, in that order — the press is visible as bench rows AND
    // a run row.
    assert.deepEqual(seen.calls.map((c) => c.lane), ['loadCard', 'benchGet', 'benchEnsure', 'runsStart'])
    const ensured = decodeJsonBody(seen.calls[2]!.args)
    assert.equal(ensured.session, 'session-chat7')
    assert.equal(ensured.intent, 'foo')
    assert.equal(ensured.overwrite, true, 'the landing declares itself (the one-shared-state law)')
    assert.deepEqual(ensured.stages, UP_ROWS, 'the bundle rows land verbatim — the bench shows the graph the door composes')
    const body = decodeJsonBody(seen.calls[3]!.args)
    assert.equal(body.test, false)
    assert.equal(body.flow, 'foo')
    assert.equal(body.draft_id, 'bench-session-chat7', 'the CARD BIRTH envelope rides the bench the press just landed')
    assert.equal(body.yaml, undefined)
    assert.equal(out.draft_id, 'bench-session-chat7')
    assert.equal(out.materialized, 2)
  })

  test('template: a card-less flow (family/engine stages) presses draft-less — the flow-doc face', async () => {
    const seen = mockEstate([flowLoad(undefined), startOk('r_leaf')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.run_id, 'r_leaf')
    // no card seats → no materialization: no bench read, no write, no
    // draft (the start door's flow-doc exemption admits the press;
    // the run row is the landing)
    assert.deepEqual(seen.calls.map((c) => c.lane), ['loadCard', 'runsStart'])
    const body = decodeJsonBody(seen.calls[1]!.args)
    assert.equal('draft_id' in body, false)
    assert.equal(out.draft_id, undefined)
    assert.equal(out.materialized, undefined)
  })

  test('template: test:true + params ride the start — SPLIT (N1: knobs nest under params, the door reads them there)', async () => {
    const seen = mockEstate([flowLoad(UP_ROWS), okBenchWith('bench-session-chat7'), startOk('r0')])
    const tool = meliteFlow(seen.request)
    await tool.execute(
      { flow: 'bar', params: { seed: 42, steps: 8 }, test: true },
      fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }),
    )
    const posts = seen.calls.filter((s) => s.lane === 'runsStart')
    assert.equal(posts.length, 1)
    const body = decodeJsonBody(posts[0]!.args)
    assert.equal(body.test, true)
    // N1 (2026-11-15): the old splat spread every knob top-level,
    // where the named-flow door never looks — seed died there while
    // _request.json carried it like a promise. Knobs now ride nested
    // params (the overlay door's one spelling); no knob leaks top.
    assert.deepEqual(body.params, { seed: 42, steps: 8 })
    assert.equal('seed' in body, false, 'no top-level seed — the dead letter is gone')
    assert.equal('steps' in body, false)
    // the flow is still EXPLICITLY named (QUEUE LANE LAW) — test is
    // a side flag, never a substitute for the named flow
    assert.equal(body.flow, 'bar')
  })

  test('template: initials stay top-level while knobs nest (N1 — the prompt rides the initialValidators seat)', async () => {
    const seen = mockEstate([flowLoad(UP_ROWS), okBenchWith('bench-session-chat7'), startOk('r0')])
    const tool = meliteFlow(seen.request)
    await tool.execute(
      { flow: 'bar', params: { prompt: 'a slow push in', seed: 73070 }, test: true },
      fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }),
    )
    const posts = seen.calls.filter((s) => s.lane === 'runsStart')
    assert.equal(posts.length, 1)
    const body = decodeJsonBody(posts[0]!.args)
    assert.equal(body.prompt, 'a slow push in', 'the initial stays top-level — the initialValidators gate reads body keys')
    assert.deepEqual(body.params, { seed: 73070 }, 'the knob nests — the overlay door reads params')
    assert.equal(body.flow, 'bar')
  })

  test('a refused start carries the error; the materialized bench SURVIVES (the cards stay to fix)', async () => {
    // start refuses (a required initial missing): the error names it,
    // the run_id is absent — but the bench rows LANDED and stay (the
    // operator sees the flow's cards; undo is their cure; the next
    // press re-lands). The draft_id rides the value: the bench is
    // real, not a ghost.
    const seen = mockEstate([flowLoad(UP_ROWS), okBenchWith('bench-session-chat7'),
      () => ({ status: 400, body: { error: 'queue full' } }),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.ok(String(out.error).includes('queue full'), String(out.error) + ' lacks queue full')
    assert.equal(out.draft_id, 'bench-session-chat7')
    assert.equal(out.run_id, undefined)
    const meta = tool.output.presentationMeta!({ flow: 'foo' }, out as never) as Record<string, unknown>
    assert.equal(meta.draft_id, 'bench-session-chat7')
    assert.ok(String(meta.error).includes('queue full'), String(meta.error) + ' lacks ' + 'queue full')
  })

  test('template: a refused load (unknown flow) never reaches the bench or the start door', async () => {
    const seen = mockEstate([
      () => ({ status: 400, body: { error: 'unknown flow' } }),
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute(
      { flow: 'no-such-flow' },
      fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }),
    ) as { error?: string }
    assert.ok(String(out.error).includes('unknown flow'), String(out.error) + ' lacks unknown flow')
    assert.deepEqual(seen.calls.map((c) => c.lane), ['loadCard'])
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

  test('template success: the draft face splits — materialized leads its bench token, card-less leads none (flows-are-compositions slice C)', async () => {
    // A MATERIALIZED flow press carries the bench draft it landed: the
    // `card <id>` token leads (the native tile hydrates from the meta
    // channel — the handle resolves, the bench holds the cards) and
    // the prose names the flow, the run, and the landing.
    const seen = mockEstate([flowLoad(UP_ROWS), okBenchWith('bench-session-chat7'), startOk('r7')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.draft_id, 'bench-session-chat7')
    const parts = tool.output.render({ flow: 'foo' }, out as never) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(text.startsWith('card bench-session-chat7 · '), 'the bench token leads: ' + text)
    assert.ok(text.includes('flow foo'), text + ' lacks the flow name')
    assert.ok(text.includes('r7'), text + ' lacks the run id')
    assert.ok(text.includes('materialized'), text + ' lacks the landing note')
    // A CARD-LESS flow (family action / engine verb) carries no draft
    // and no token — the run row alone is the landing; a fake token
    // would feed the legacy tile parser a handle that resolves
    // nowhere.
    const seen2 = mockEstate([flowLoad(undefined), startOk('r7b')])
    const tool2 = meliteFlow(seen2.request)
    const out2 = await tool2.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out2.draft_id, undefined)
    const text2 = (tool2.output.render({ flow: 'foo' }, out2 as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    assert.equal(parseTileToken(text2), null)
    assert.ok(text2.includes('flow foo'), text2 + ' lacks the flow name')
    assert.ok(text2.includes('r7b'), text2 + ' lacks the run id')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    assert.equal(out.run_id, 'r_bench_1', 'the final stage\'s run id rides the top level')
    const text = (tool.output.render({ bench: true }, out as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    assert.ok(text.includes('r_bench_0') && text.includes('r_bench_1'), 'every minted id prints')
    assert.ok(text.includes('s_1 sfx → r_bench_1 [done] /runs/b.flac'), 'a pass row spells stage, card, id, status, url')
    assert.ok(!text.includes(' → ? '), 'no anonymous arrow remains')
  })

  test('GHOST CURE (2026-11-19): a familyless stage press carries its RESOLVED params + bench_stage_id — the door composes one row, never the bench', async () => {
    // The burn: "running flows that don't show up on the bench."
    // A familyless stage (a flow composition card — no boarded
    // family) pressed with {draft_id, bench_stage_id} ALONE used to
    // drop the resolved bag and ride the draft door's whole-bench
    // compose: every sibling re-executed in one merged run the
    // bench could not see. The press now carries the wire-resolved
    // params (the server's claim arm overlays them onto the pressed
    // row — THE WIRE RESOLUTION LAW's client half) and the claim
    // key, so the run composes exactly the pressed row.
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_ghost', rev: 3, stages: [
            { id: 's_0', card: 'tts', runStatus: 'done', result: { url: '/runs/up.mp3', run_id: 'r_up' }, params: {} },
            {
              id: 's_1',
              card: 'flow-sweep-x',
              params: { subject: 'cyberpunk girl', source: '$source' },
              inputs: { source: { stage: 's_0', output: 'default' } },
            },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_ghost_1', status: 'queued' } }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_1', url: '/runs/sweep.mp4' }] } }
        }
        if (lane === 'benchVerb' && args[1] === 'patch') return { status: 200, body: { rev: 4, patched: ['runStatus'] } }
        if (lane === 'draftsStagePatch') return { status: 200, body: { draftId: args[0], stageId: args[1], delivered: true, patched: ['runStatus', 'result'] } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    const starts = seen.calls.filter((c) => c.lane === 'runsStart')
    assert.equal(starts.length, 1, 'the done sibling is skipped, the familyless stage presses ONCE')
    const body = starts[0]!.args[0] as Record<string, unknown>
    assert.equal(body['bench_stage_id'], 's_1', 'the claim key rides — the door composes only this row')
    assert.equal(body['draft_id'], 'd_ghost')
    assert.equal(body['test'], false)
    assert.equal(body['subject'], 'cyberpunk girl', 'the row params ride')
    assert.equal(body['source'], '/runs/up.mp3',
      'THE WIRE RESOLUTION LAW rides the familyless press too — the upstream\'s resolved value, never the $spell')
    assert.ok(!('model' in body), 'no model key — the familyless walk never selects the card arm')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done')
    assert.equal(out.run_id, '', 'no run minted — the id is blank, never guessed')
    assert.deepEqual(out.pass, [
      // THE LAST-RUN GROUND (qa8 GAPS-12/F19, 2026-11-01): the skip
      // mark carries its evidence — these rows bear a done word with
      // NO result memory, so last_run rides null and the render must
      // not claim "unchanged since its last run" for them.
      { stage: 's_0', card: 'tts', skipped: 'done', last_run: null },
      { stage: 's_1', card: 'sfx', skipped: 'done', last_run: null },
    ])
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStart').length, 0)
    const text = (tool.output.render({ bench: true }, out as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    assert.ok(
      text.includes('s_0 tts [skipped done — done on record but no last run behind it; patch params to force a run]'),
      'a skipped row SAYS it skipped — never the bare [done] that sent the warm-fire agent hunting a run that never existed, and never "unchanged" for a mark with no run behind it',
    )
    assert.ok(!text.includes('unchanged since its last run'), 'no unchanged claim prints for last_run-null rows')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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

  // (B-1, the back-end evasion audit 2026-11-07) the pre-collapse
  // scan judged replace/repair/extend only — the SERVED edit
  // spelling (same resolution seat, same plan tier) rode with NO
  // admission while every F18 arm stayed green on retired names.
  // This arm rides the served spelling; the scan is DERIVED from
  // the card's own declaration (CROSS_REGIME_BAG_KEYS).
  test('F18: the SERVED edit-bag spelling admits too — the roster is derived, never a hand list of retired names', async () => {
    const seen = mockEstate([
      (lane: string, _args: unknown[]) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_f18_edit', rev: 1, stages: [
            { id: 's_0', card: 'h3-timeline', params: {
              width: 1344, height: 768,
              edit: [{ source_clip: 'film_a', edit_prompt: 'fix the seam', resolution: '736p' }],
            } },
          ] } }
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_f18_edit', status: 'queued' } }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [
            { id: 's_0', url: '/runs/film_edit.mp4' },
          ] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done', 'the admission NEVER refuses — the run completes')
    const pass = out.pass as Array<Record<string, unknown>>
    const warning = String(pass[0]!['warning'] ?? '')
    assert.ok(warning.startsWith('h3-timeline: CROSS-REGIME JOIN'),
      'the SERVED spelling carries the same admission: ' + JSON.stringify(pass[0]))
    assert.ok(warning.includes("tier '736p' renders 1280×736"), 'the derived mod shape names the tier')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const seen = mockEstate([flowLoad(undefined), startOk('r9')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    // the projector is the persisted payload (ToolResultNode.meta): the
    // client card view narrows it — never parses prose. Pure: same value
    // in, same payload out. A CARD-LESS flow press carries the RUN
    // handle only — no draft_id (the run row is the landing).
    const meta = tool.output.presentationMeta!({ flow: 'foo' }, out as never) as Record<string, unknown>
    assert.deepEqual(meta, {
      mode: 'flow',
      target: 'foo',
      run_id: 'r9',
      status: 'queued',
    })
    assert.deepEqual(tool.output.presentationMeta!({ flow: 'foo' }, out as never), meta)
    // the MATERIALIZED face carries the bench handle too — the tile
    // hydrates from the very cards the run is pressing.
    const seen2 = mockEstate([flowLoad(UP_ROWS), okBenchWith('bench-session-chat7'), startOk('r9b')])
    const out2 = await meliteFlow(seen2.request).execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    const meta2 = meliteFlow(seen2.request).output.presentationMeta!({ flow: 'foo' }, out2 as never) as Record<string, unknown>
    assert.equal(meta2.draft_id, 'bench-session-chat7')
    assert.equal(meta2.run_id, 'r9b')
    // refusals project the error with NO handle
    const refused = await tool.execute({}, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    const rmeta = tool.output.presentationMeta!({}, refused as never) as Record<string, unknown>
    assert.equal(rmeta.draft_id, undefined)
    assert.equal(rmeta.run_id, undefined)
    assert.equal(typeof rmeta.error, 'string')
  })

  test('refusals carry no token (nothing to hydrate — the legacy branch stays dark)', async () => {
    const { request } = mockEstate([])
    const tool = meliteFlow(request)
    const out = await tool.execute({}, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, 'the bench is empty — construct stages first (melite_construct)')
    assert.equal(out.draft_id, undefined)
  })

  test('a CAS-moved bench cannot refuse a CARD-LESS flow press (that face never touches the bench)', async () => {
    // FLOWS-ARE-COMPOSITIONS (2026-11-14): the flow press rode the
    // bench ensure until today, so a moved bench refused a press that
    // had nothing to do with it. The card-less face (family action /
    // engine verb) never reads the bench — even a bench that WOULD
    // refuse every write stays untouched.
    const seen = mockEstate([
      flowLoad(undefined),
      (lane) => {
        if (lane === 'benchGet' || lane === 'benchVerb' || lane === 'benchEnsure') {
          throw new RemoteError('bench/cas-conflict', 'bench moved: rev is 2, caller held 1', { current_rev: 2, expect_rev: 1 })
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_free', status: 'queued' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'still-to-motion' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, undefined)
    assert.equal(out.run_id, 'r_free')
    assert.equal(
      seen.calls.some((c) => c.lane === 'benchGet' || c.lane === 'benchEnsure' || c.lane === 'benchVerb'),
      false,
      'the card-less flow press never crosses a bench door',
    )
  })

  test('a CAS-moved bench refuses a MATERIALIZING press before the start (no run row without its landing)', async () => {
    // the materializing face is the opposite law: the landing IS the
    // press (the anti-ghost-bench ruling — every press lands visible
    // bench rows AND a run row). A bench that refuses every write
    // refuses the press honestly, BEFORE any run presses — a run row
    // whose cards never landed would be exactly the ghost the ruling
    // kills.
    const seen = mockEstate([
      flowLoad(UP_ROWS),
      (lane) => {
        if (lane === 'benchGet' || lane === 'benchVerb' || lane === 'benchEnsure') {
          throw new RemoteError('bench/cas-conflict', 'bench moved: rev is 2, caller held 1', { current_rev: 2, expect_rev: 1 })
        }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_ghost', status: 'queued' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.ok(String(out.error).includes('bench moved'), String(out.error))
    assert.equal(out.run_id, undefined)
    assert.equal(out.draft_id, undefined)
    assert.equal(seen.calls.some((c) => c.lane === 'runsStart'), false, 'the start never presses when the landing refuses')
  })
})

// ---- gap closure (2026-09-12): per-file 100% for melite-flow.ts ----
// the run fns are module-private, so their arms close through execute
// with a scripted estate. All remotes scripted: no gateway, no GPU.

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

// ── the slice-C materializing press fixtures (flows-are-compositions,
// 2026-11-14: a card-stage flow's load bundle carries bench_stages —
// the rows the press lands on the bench before starting) ──────────

/** The flow's projected card rows — image-upscale's exact shape (two
 *  card stages, an initial wire on s_0, a remapped fromStage wire on
 *  s_1, $spells binding the wires). */
const UP_ROWS = [
  { id: 's_0', card: 'image-gen', engine: 'comfyui', description: 'T2I', params: { model: 'krea-2', prompt: '$prompt' }, inputs: { prompt: { initial: 'prompt' } }, outputs: { image: 'image' } },
  { id: 's_1', card: 'upscale-tools', engine: 'comfyui', description: 'upscale', params: { model: 'seedvr2-ema', input_image: '$image' }, inputs: { image: { stage: 's_0', output: 'image' } }, outputs: { image: 'image' } },
]

/** The load face of a flow: bench_stages present (a card-stage flow —
 *  materializes) or absent (family/engine flow — the run-door face). */
function flowLoad(rows?: Array<Record<string, unknown>>, initials?: Record<string, unknown>) {
  return (lane: string, _args: unknown[]) => {
    if (lane === 'loadCard') {
      return {
        status: 200,
        body: rows === undefined
          ? { name: 'foo', kind: 'flow', stages: [{ id: 'go', family: 'anny', action: 'estimate_photo', card: '' }] }
          : {
              name: 'foo', kind: 'flow',
              stages: [{ id: 'make', card: 'image-gen' }, { id: 'polish', card: 'upscale-tools' }],
              bench_stages: rows,
              // the initials seat the split press reads (image-upscale
              // shape: prompt is the initial, knobs are not)
              initials: { validators: initials ?? { prompt: 'text' }, required: ['prompt'], keys: Object.keys(initials ?? { prompt: 'text' }), glosses: {} },
            },
      }
    }
    return undefined
  }
}

describe('melite_flow guards — the exactly-one law + the wrapper gate', () => {
  test('two compositions refuse without touching the estate', async () => {
    const seen = mockEstate([okBench, okValidate])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true, flow: 'x' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
      const out = await tool.execute(args as never, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
      tool.execute({ bench: 'true' } as never, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })),
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
    await assert.rejects(tool.execute(undefined as never, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })), ToolArgsError)
    await assert.rejects(tool.execute({ params: [] } as never, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })), ToolArgsError)
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
    const out = await tool.execute({ card: 'tts', model: 'm', qvoice_save: [{ voice_name: 'x' }] } as never, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.ok(String(out.error).includes('qvoice_save'), 'the stray key is named')
    assert.ok(String(out.error).includes('INSIDE params'), 'the seat is stated')
    assert.equal(seen.calls.length, 0, 'nothing starts on a stray arg')
  })

  // THE TOMBSTONE GATE (W-1, 2026-11-05, operator option 2): the
  // ad-hoc hatch is DELETED — {stages}/{connects} (+ the ad-hoc-only
  // {id}/{description}) are no longer known args, so they refuse at
  // the stray gate in tombstone words naming the per-stage verb,
  // BEFORE the exactly-one gate (a bare {stages:[...]} names its cure,
  // never reads as nothing-selected) and before any bench read.
  test('W-1 arm 1 (THE WALL): {stages} refuses in tombstone words naming the {stage} press, before any bench read', async () => {
    const seen = mockEstate([])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ stages: [{ id: 'a', engine: 'comfyui' }] } as never, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.ok(String(out.error).includes('stages'), 'the refused key is named')
    assert.ok(String(out.error).includes('ad-hoc stages are gone'), 'the tombstone names the deletion')
    assert.ok(String(out.error).includes('stage: "<bench stage id>"'), 'the refusal names the per-stage press')
    assert.ok(String(out.error).includes('bench row'), 'the refusal names the bench row')
    assert.equal(out.mode, 'flow')
    assert.equal(seen.calls.length, 0, 'the refusal precedes every estate call — no bench read, no landing')
  })

  test('W-1 arm 2: {stages + connects} refuse TOGETHER — the stray gate fires before the exactly-one voice', async () => {
    const seen = mockEstate([])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({
      stages: [{ id: 'a', engine: 'comfyui' }],
      connects: [{ from: 'initial.prompt', to: 'a.prompt', kind: 'text' }],
    } as never, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    const msg = String(out.error)
    assert.ok(msg.includes('"connects"'), 'the stray enumeration carries BOTH deleted keys')
    assert.ok(msg.includes('ad-hoc stages are gone'), 'the tombstone voice carries')
    assert.equal(seen.calls.length, 0, 'nothing reaches the estate')
  })

  test('W-1 arm 3: the ad-hoc-only {id}/{description} params refuse too', async () => {
    const seen = mockEstate([])
    const tool = meliteFlow(seen.request)
    for (const args of [{ id: 'my-graph' }, { description: 'what it makes' }]) {
      const out = await tool.execute(args as never, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
      assert.ok(String(out.error).includes('ad-hoc stages are gone'), String(out.error))
    }
    assert.equal(seen.calls.length, 0)
  })
})

describe('melite_flow presentCall/render/meta — the faces', () => {
  test('presentCall names card | flow | ? (the gate owns the junk face)', () => {
    const tool = meliteFlow(fakeEstate({}).estate)
    // (§7 P7: the faces render only schema-valid args — mistyped or
    // non-object args are refused by the gate, never rendered by a
    // second seat. {} is schema-valid (all top-level optional).
    // W-1: {stages} is no longer a declared arg (the ad-hoc hatch is
    // deleted) — it renders the unseated face, never an ad-hoc card.)
    const pc = (a: unknown) => tool.presentCall!(a as never)
    assert.equal(pc({ card: 'image-gen' })!.title, 'Run image-gen')
    assert.equal(pc({ card: '', flow: 'foo' })!.title, 'Run foo')
    assert.equal(pc({ flow: 'foo' })!.title, 'Run foo')
    assert.equal(pc({ stage: 's_0' })!.title, 'Run stage s_0')
    assert.equal(pc({ card: 5, flow: 'f' }), undefined)
    assert.equal(pc({ stages: [1, 2] })!.title, 'Run ?')
    assert.equal(pc({})!.title, 'Run ?')
    assert.equal(pc({ card: '', flow: '', stages: 'x' })!.title, 'Run ?')
    assert.equal(pc(undefined), undefined)
    assert.equal(pc(null), undefined)
    assert.equal(pc('x'), undefined)
    assert.equal(pc({ card: 'c' })!.card, 'generic')
  })

  test('render tolerates sparse values (the legacy replay path)', () => {
    const tool = meliteFlow(fakeEstate({}).estate)
    const parts = tool.output.render({} as never, {} as never) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    // the draft-less head never mints a fake `card ?` token — the
    // flow name and status carry the line
    assert.ok(text.includes('flow ?'), text)
    assert.ok(!text.includes('card ?'), text)
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
    const out = await tool.execute({ card: 'image-gen', model: 'm1' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.run_id, 'r9')
    assert.deepEqual(tool.output.presentationMeta!({ card: 'image-gen', model: 'm1' }, out as never), {
      mode: 'card', target: 'image-gen', model: 'm1', draft_id: 'd9', run_id: 'r9', status: 'queued',
    })
    assert.deepEqual(tool.output.presentationMeta!({} as never, {} as never), { mode: '?', target: '?' })
    // a nullish frozen value (legacy sessions) falls back the same way
    assert.deepEqual(tool.output.presentationMeta!({} as never, undefined as never), { mode: '?', target: '?' })
  })

  test('presentationMeta carries the press\'s OWN settled heroes (the refresh-flood cure, 2026-11-19)', () => {
    // THE FROZEN CHANNEL: the chat card's inline strip derives from
    // these persisted rows — the pass rows that minted a url. Before
    // this key the card re-derived the strip from the present-time
    // draft doc, and every historical card in a replayed transcript
    // stamped the whole bench's CURRENT heroes under itself (the
    // operator's burn: one refresh re-rendered the same artifacts in
    // every historical card, repeating). Skipped rows (no url) never ride.
    const tool = meliteFlow(fakeEstate({}).estate)
    const meta = tool.output.presentationMeta!({ bench: true } as never, {
      mode: 'bench', target: 'd1 @ rev 3', draft_id: 'd1', status: 'done',
      pass: [
        { stage: 's_0', card: 'tts', skipped: 'done', last_run: null },
        { stage: 's_1', card: 'sweep', run_id: 'r1', status: 'done', url: '/runs/sweep.mp4' },
        { stage: 's_2', card: 'still', run_id: 'r2', status: 'done' },
      ],
    } as never) as Record<string, unknown>
    assert.deepEqual(meta['previews'], [
      { stage: 's_1', url: '/runs/sweep.mp4', status: 'done' },
    ], 'only the rows that minted a url ride — frozen at settle time')
    // a value with no pass (card mode, refusals) carries no key: the
    // chat card renders no strip for a call that pressed nothing
    const bare = tool.output.presentationMeta!({ bench: true } as never, {
      mode: 'bench', target: 'd1 @ rev 3', status: 'stopped', error: 'no',
    } as never) as Record<string, unknown>
    assert.ok(!('previews' in bare), 'no pass, no previews key — never an empty-strip ambiguity')
  })

  test('presentationMeta persists the pass rows + the settle-time intent (the discriminator, cure 1, 2026-11-15)', () => {
    // THE STALE-TWO-RUN BURN (audit chat-flowcard-stale-videos,
    // 2026-11-05): the replayed card re-derived its rows AND its head
    // from the re-fetched present-time bench doc — a pending row and a
    // foreign intent under a settled block, on a bench every later
    // press rewrites whole. The cure freezes the pass rows THEMSELVES
    // (every stage of THAT call's press: settled, skipped, thrown) and
    // the settle-time intent into the meta, so the card renders its
    // own press and fires no drafts/get.
    const tool = meliteFlow(fakeEstate({}).estate)
    const meta = tool.output.presentationMeta!({ bench: true } as never, {
      mode: 'bench', target: 'd1 @ rev 3', draft_id: 'd1', status: 'done',
      intent: 'four 5s takes',
      pass: [
        { stage: 's_0', card: 'tts', skipped: 'done', last_run: null },
        { stage: 's_1', card: 'h3', run_id: 'r1', status: 'done', url: '/melite-media/runs/r1/h3-film/film.mp4', artifacts: ['h3-film/film.mp4'], asset_urls: ['/melite-media/runs/r1/h3-film/film.mp4', '/melite-media/runs/r1/h3-film/w1.mp4'] },
        { stage: 's_2', card: 'still', run_id: 'r2', status: 'queued' },
        { stage: 's_3', card: 'sweep', thrown: 'transport died mid-start' },
      ],
    } as never) as Record<string, unknown>
    assert.deepEqual(meta['rows'], [
      { stage: 's_0', card: 'tts', status: 'skipped' },
      { stage: 's_1', card: 'h3', status: 'done', run_id: 'r1', url: '/melite-media/runs/r1/h3-film/film.mp4', artifacts: ['/melite-media/runs/r1/h3-film/film.mp4', '/melite-media/runs/r1/h3-film/w1.mp4'] },
      { stage: 's_2', card: 'still', status: 'queued', run_id: 'r2' },
      { stage: 's_3', card: 'sweep', status: 'error' },
    ], 'every pass row freezes with its settle-time truth — skipped/thrown included')
    assert.equal(meta['intent'], 'four 5s takes', 'the settle-time intent rides beside the rows — the frozen head')
    // no intent in the value (a pre-cure replay, a hand-built row) →
    // no key: the card falls back, never fabricates a head
    const bare = tool.output.presentationMeta!({ bench: true } as never, {
      mode: 'bench', target: 'd1 @ rev 3', draft_id: 'd1', status: 'done',
      pass: [{ stage: 's_0', card: 'tts', run_id: 'r1', status: 'done', url: '/melite-media/runs/r1/out.wav' }],
    } as never) as Record<string, unknown>
    assert.ok(!('intent' in bare), 'no intent in the value, no intent key')
  })

  test('a pass row carrying the artifact SET persists the set in the meta row (the four-take face, cure 2, 2026-11-15)', () => {
    // THE FOUR-TAKE BURN: the chat card froze the LEAD url alone, so
    // the run's other takes (the window shards beside the film) never
    // reached the thread. The observer's SET — the media-spelled urls
    // it already rewrites (asset_urls, lead first) — persists into the
    // meta row whole, and the chat strip renders every take.
    const tool = meliteFlow(fakeEstate({}).estate)
    const set = [
      '/melite-media/runs/r1/h3-film/SaveVideo.2_film_00001_.mp4',
      '/melite-media/runs/r1/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4',
      '/melite-media/runs/r1/h3-film/SaveVideo.1_h3_t4_w2_00001_.mp4',
      '/melite-media/runs/r1/h3-film/SaveVideo.3_h3_t4_w3_00001_.mp4',
    ]
    const meta = tool.output.presentationMeta!({ bench: true } as never, {
      mode: 'bench', target: 'd1 @ rev 3', draft_id: 'd1', status: 'done',
      pass: [
        { stage: 's_1', card: 'h3', run_id: 'r1', status: 'done',
          url: set[0], artifacts: ['h3-film/SaveVideo.2_film_00001_.mp4'], asset_urls: set },
      ],
    } as never) as Record<string, unknown>
    const previews = meta['previews'] as Array<Record<string, unknown>>
    assert.deepEqual(previews[0]!['artifacts'], set,
      'the SET persists — the lead first, every take with it')
    assert.equal(previews[0]!['url'], set[0], 'the lead url is unchanged (the frozen hero)')
    const rows = meta['rows'] as Array<Record<string, unknown>>
    assert.deepEqual(rows[0]!['artifacts'], set, 'the frozen row carries the same set')
  })
})

describe('melite_flow bench — the agent drives THE shared bench', () => {
  test('F20 (thrown half) — a stage whose start THROWS records the failure and the pass keeps pressing', async () => {
    // before this cure a thrown start aborted the whole tool call and
    // took pass[] with it: the operator saw a stack and none of the
    // stages' outcomes. A settled failure continues; so does a throw.
    let starts = 0
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_bench', rev: 1, stages: [
            { id: 's_0', card: 'image-gen', params: {} },
            { id: 's_1', card: 'image-gen', params: {} },
          ] } }
        }
        if (lane === 'runsStart') {
          starts += 1
          if (starts === 1) throw new Error('transport died mid-start')
          return { status: 202, body: { run_id: 'rb1', status: 'queued' } }
        }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_1', url: 'img/a.png' }] } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true, test: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_0')
    assert.match(String(out.error), /threw \(a transport or resolution error/)
    const rows = out.pass as Array<Record<string, unknown>>
    // the thrown stage is IN the pass, and the next stage still ran
    assert.equal(rows[0]!['stage'], 's_0')
    assert.match(String(rows[0]!['thrown']), /transport died mid-start/)
    assert.equal(rows[1]!['run_id'], 'rb1')
    assert.equal(starts, 2, 'the press reached the second stage after the throw')
  })

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
    const out = await tool.execute({ bench: true, test: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'bench')
    assert.equal(out.target, 'bench-session-chat7 @ rev 3')
    assert.equal(out.draft_id, 'd_bench')
    assert.equal(out.status, 'done')
    // F21 — THE PRESS ROW'S OWN KEY (2026-10-30): the run door persists
    // bench_stage_id and the sidecar maps it back onto the row; before
    // this the bench press never wrote it, so every live press
    // (run-c6bfa91defe7, run-9dacc8612feb) omitted the key and the
    // stage's last_run stayed null forever.
    const pressBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args)
    assert.equal(pressBody.bench_stage_id, 's_1', 'the press stamps the stage it presses')
    assert.deepEqual(out.pass, [
      // GAPS-12/F19: the skip mark carries its evidence (no result
      // memory here, so last_run rides null — the render reads it
      // honestly, never "unchanged").
      { stage: 's_0', card: 'img-to-mesh', skipped: 'done', last_run: null },
      { stage: 's_1', card: 'image-gen', run_id: 'rb1', status: 'done', url: '/melite-media/runs/rb1/img/SaveImage_00001_.png',
        // THE FOUR-TAKE FACE (cure 2, 2026-11-15): the browser-spelled
        // artifact set rides beside the raw `artifacts` wire spelling.
        asset_urls: ['/melite-media/runs/rb1/img/SaveImage_00001_.png'],
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
      mode: 'bench', target: 'bench-session-chat7 @ rev 3', draft_id: 'd_bench', run_id: 'rb1', status: 'done',
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

  test('a reason-less refused stamp still answers loud: the not-delivered fallback voices instead of undefined', async () => {
    // the drafts door answers delivered:false with NO reason key —
    // the `&&` guard fails, so the 'not delivered' alternate (not an
    // empty note, not the word undefined) rides the miss.
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0' }] } }
        }
        if (lane === 'draftsStagePatch') {
          return { status: 200, body: { draftId: 'd_noreason', stageId: 's_0', delivered: false } }
        }
        return undefined
      },
    ])
    const out = await observeAndAttribute(seen.request, draftIdOf('d_noreason'), 's_0', 'run-noreason', new AbortController().signal, false, 40, 0)
    assert.equal(out.status, 'done', 'the run itself succeeded — the miss is the stamp, never the run')
    assert.equal(out.stamp_note, 'attribution refused: not delivered')
  })

  test('a thrown NON-Error stamp answers loud too: the String() arm voices a bare wire-down', async () => {
    // the lane throws a bare string (the lanes' own 'wire-down'
    // shape) — e instanceof Error fails, so String(e) (not a crash
    // on .message, not "[object Object]") rides the miss.
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0' }] } }
        }
        if (lane === 'draftsStagePatch') {
          throw 'wire-down'
        }
        return undefined
      },
    ])
    const out = await observeAndAttribute(seen.request, draftIdOf('d_wirenote'), 's_0', 'run-wirenote', new AbortController().signal, false, 40, 0)
    assert.equal(out.status, 'done')
    assert.equal(out.stamp_note, 'attribution failed: wire-down')
  })

  test('a NON-Error throw on the LIVE stamp is noted, never thrown: the poll keeps its cadence to the queued receipt', async () => {
    // the run stays live, so the queue-feedback stamp fires — and the
    // lane throws a bare string. The miss is NOTED (superseded by
    // whatever the terminal stamp does), the poll continues, and the
    // budget-0 deadline ends the observation on the queued receipt.
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'running', stages: [] } }
        }
        if (lane === 'draftsStagePatch') {
          throw 'live wire down'
        }
        return undefined
      },
    ])
    const out = await observeAndAttribute(seen.request, draftIdOf('d_livemiss'), 's_0', 'run-livemiss', new AbortController().signal, false, 0, 0)
    assert.equal(out.status, 'queued', 'the wait expired on a live run — pending, never failed')
    assert.equal(out.stamp_note, 'attribution live stamp failed: live wire down')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
      const exec = fakeExec(new AbortController().signal, { agent: { id: 'session-chat7' } })
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.draft_id, 'bench-session-chat7')
    assert.equal(out.target, 'bench-session-chat7 @ rev ?')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, 'queue full')
    assert.equal(out.draft_id, 'd_bench')
    assert.equal(out.target, 'bench-session-chat7 @ rev 3')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.deepEqual(out, { error: 'lane down', mode: 'bench', target: 'bench-session-chat7' })
  })

  test('a messageless remote bench failure refuses as remote-refused', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') throw new RemoteError('runs/unknown-run', '', { runId: '' })
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    await assert.rejects(tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })), /gate down/)
  })
})

describe('melite_flow card — compose inside', () => {
  test('THE MODEL DERIVE (zero-friction audit, 2026-10-21): a card with no explicit model derives its boarded family and starts — the refusal era is over', async () => {
    const seen = mockEstate([ensureOk('d_derive'), benchAlive, startOk('r_derive')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.run_id, 'r_derive')
    // the derived family rode the start doc — modelForCard's own
    // resolution (the QUEUE LANE resolver, never a minted id)
    const startBody = decodeJsonBody(seen.calls.find((c) => c.lane === 'runsStart')!.args) as Record<string, unknown>
    assert.equal(typeof startBody['model'], 'string')
    assert.notEqual(String(startBody['model']), '')
    // and an explicit model still WINS over the derivation
    const seen2 = mockEstate([ensureOk('d_derive2'), benchAlive, startOk('r_derive2')])
    const tool2 = meliteFlow(seen2.request)
    await tool2.execute({ card: 'image-gen', model: 'explicit-fam' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }))
    const startBody2 = decodeJsonBody(seen2.calls.find((c) => c.lane === 'runsStart')!.args) as Record<string, unknown>
    assert.equal(startBody2['model'], 'explicit-fam')
  })

  test('no prompt anywhere: the intent falls back to the card', async () => {
    const seen = mockEstate([ensureOk('d3'), benchAlive, startOk('r3')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
      fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }),
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
      fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }),
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
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    await assert.rejects(tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })), /socket hangup/)
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
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ card: 'image-gen', model: 'm' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    await tool.execute({ card: 'h3-timeline', model: 'h3' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } }))
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
    const out = await tool.execute({ card, model: 'm' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.match(String(out.error), /unknown card/)
    assert.equal(
      seen.calls.some((c) => c.lane === 'benchEnsure'),
      false,
      'the long unknown id refuses before the bench write',
    )
  })
})

describe('melite_flow template — the flows-are-compositions law (2026-11-14)', () => {
  // Slice C: the marker-row ceremony is dead twice over — slice A
  // killed the ref_flow marker, slice C replaced the press it
  // poisoned. A card-stage flow MATERIALIZES: the load bundle serves
  // the flow's bench rows, the press lands them as ONE bench write
  // (the same expansion the {flow} door composes — the parity wall
  // lives estate-side), and the run presses the flow door carrying
  // the bench's draft_id. A card-less flow keeps the draft-less
  // face. This cluster pins the law at the tool's remote seams.
  test('THE MATERIALIZING PRESS LAW: read the bundle, land the rows as ONE write, ride the bench draft', async () => {
    const seen = mockEstate([flowLoad(UP_ROWS), okBenchWith('bench-session-chat7'), startOk('r_law')])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'flow')
    assert.equal(out.run_id, 'r_law')
    assert.equal(out.draft_id, 'bench-session-chat7')
    assert.equal(out.materialized, 2)
    assert.deepEqual(seen.calls.map((c) => c.lane), ['loadCard', 'benchGet', 'benchEnsure', 'runsStart'])
    // the landing declares itself: the flow is the bench's intent,
    // the bundle's rows land verbatim, the write is an overwrite
    const ensured = decodeJsonBody(seen.calls[2]!.args)
    assert.equal(ensured.intent, 'foo')
    assert.equal(ensured.overwrite, true)
    assert.deepEqual(ensured.stages, UP_ROWS)
    // the start rides the FLOW door (never {model}, never a bare
    // draft press) carrying the bench draft the landing minted
    const body = decodeJsonBody(seen.calls[3]!.args)
    assert.equal(body.flow, 'foo')
    assert.equal(body.draft_id, 'bench-session-chat7')
    assert.equal(body.model, undefined)
  })

  test('a load transport failure values the error (no bench write, no start)', async () => {
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'loadCard') throw new Error('gate down')
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'flow')
    assert.ok(String(out.error).includes('gate down'), String(out.error))
    assert.deepEqual(seen.calls.map((c) => c.lane), ['loadCard'], 'a dead read must not half-land')
  })

  test('a transport start failure propagates (never a silent value)', async () => {
    const seen = mockEstate([
      flowLoad(undefined),
      (lane: string) => {
        if (lane === 'runsStart') throw new Error('gate down')
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    await assert.rejects(
      tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })),
      /gate down/,
    )
    assert.deepEqual(seen.calls.map((c) => c.lane), ['loadCard', 'runsStart'])
  })

  test('a non-Error start failure propagates its throw (the belt stays honest)', async () => {
    const seen = mockEstate([
      flowLoad(undefined),
      (lane: string) => {
        if (lane === 'runsStart') throw 42
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    await assert.rejects(
      tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })),
      (e: unknown) => e === 42,
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    assert.equal(out.stoppedAt, 's_2')
    assert.equal(out.error, 'stage s_2 names no card — nothing to compose (melite_construct patch)')
    // nothing ever started
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStart').length, 0)
  })
})

describe('melite_flow bench — the degenerate-shape arms', () => {
  test('an ensure answer with no draft_id refuses loud (the bench write never happened)', async () => {
    // benchGet answers a live row (the CAS read), benchEnsure answers
    // 200 with no error AND no draft_id — the wire shape the guard
    // owns: the landing's answer must name the bench it wrote.
    const seen = mockEstate([
      flowLoad(UP_ROWS),
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd', rev: 2, stages: [] } }
        if (lane === 'benchEnsure') return { status: 200, body: { ok: true } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, 'bench ensure returned no draft_id')
  })

  test('a bench whose stages is not an array is the empty refusal (never a crash)', async () => {
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: { draft_id: 'd', rev: 2, stages: 'junk-not-array' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(3000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(10000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'stopped')
    // folded: the classified unknown-outcome arm speaks the CardStatus
    assert.equal(out.error, 'stage s_0 (image-gen) ended stopped (the pass still pressed the remaining stages)')
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
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

describe('melite_flow stage — THE PER-STAGE PRESS (W-8, 2026-11-05)', () => {
  // F3-10's shape: one half-written stage aborts the WHOLE press ("the
  // bench holds no ... — its stages are ..." is the unknown-id cousin;
  // the burn itself is a compose-incomplete sibling blocking every
  // other probe in the batch), and there is no per-stage verb to route
  // around it. The bench below holds three card stages; s_2's wire
  // dangles at a stage that does not exist, so a whole-bench press
  // would press s_0 + s_1 then STOP at s_2 — the per-stage verb presses
  // s_0 alone and leaves s_1/s_2 and the bench intent byte-identical.
  function stageBench() {
    return {
      draft_id: 'd_stage', rev: 7, intent: 'three takes for the client cut',
      stages: [
        { id: 's_0', card: 'tts', params: {} },
        { id: 's_1', card: 'sfx', params: {} },
        { id: 's_2', card: 'sfx', params: {}, inputs: { clip: { stage: 's_9', output: 'default' } } },
      ],
    }
  }

  function stagePressEstate(bench: ReturnType<typeof stageBench>) {
    return mockEstate([
      (lane: string, _args: unknown[]) => {
        if (lane === 'benchGet') return { status: 200, body: bench }
        // served (never pressed on the green path) so a reintroduced
        // landing (the F3-13 shape) reds on the WALL's own assertion,
        // not on an unmocked-lane crash
        if (lane === 'benchEnsure') return { status: 200, body: { delivered: true, draft_id: bench.draft_id } }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r_stage_0', status: 'queued' } }
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: '/runs/a0.flac' }] } }
        }
        if (lane === 'draftsStagePatch') return { status: 200, body: { delivered: true, patched: ['runStatus', 'result'] } }
        return undefined
      },
    ])
  }

  test('W-8 arm 1 (THE WALL): {stage:"s_0"} presses s_0 alone — one start, one-row pass, named receipt, siblings + intent untouched', async () => {
    const bench = stageBench()
    const before = JSON.stringify(bench.stages)
    const seen = stagePressEstate(bench)
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ stage: 's_0' }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'bench', 'the mode word stays bench — the per-stage press is the bench pass with a one-row filter, never a fifth composition')
    assert.equal(out.status, 'done')
    assert.equal(out.stage, 's_0', 'the receipt names the pressed row')
    assert.equal(out.target, 'bench-session-chat7 @ rev 7')
    assert.equal(out.intent, 'three takes for the client cut', 'the bench intent rides untouched')
    assert.equal(out.run_id, 'r_stage_0')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass.length, 1, 'the pass holds exactly the pressed row — never its siblings')
    assert.equal(pass[0]!['stage'], 's_0')
    assert.equal(pass[0]!['run_id'], 'r_stage_0')
    const starts = seen.calls.filter((c) => c.lane === 'runsStart')
    assert.equal(starts.length, 1, 'exactly one run is minted — a whole-bench press would mint s_0 + s_1 then stop at s_2')
    for (const s of starts) {
      assert.equal((s.args[0] as Record<string, unknown>)['bench_stage_id'], 's_0', 'no press of s_1/s_2 rides any start body')
    }
    assert.equal(JSON.stringify(bench.stages), before, 'the sibling rows are byte-identical across the press')
  })

  // W-1 arm 2 — the F3-13 recut, off W-8's verb: the per-stage press is
  // the ONLY hand-built press left, and it must be bench-PRESERVING —
  // no CAS landing, no overwrite, ever. F3-13 proved the deleted hatch
  // (runAdHoc → loadBench overwrite:true) REPLACED the shared bench's
  // stages + intent; this arm pins that no {stage} press ever lands a
  // new bench.
  test('W-1 arm 2 (F3-13 recut): a {stage} press never lands a bench — zero benchEnsure, the read bench is THE bench', async () => {
    const bench = stageBench()
    const before = JSON.stringify(bench)
    const seen = stagePressEstate(bench)
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ stage: 's_0' }, fakeExec(AbortSignal.timeout(8000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.status, 'done', String(out.error))
    const ensures = seen.calls.filter((c) => c.lane === 'benchEnsure')
    assert.equal(ensures.length, 0, `a per-stage press must never land a bench — benchEnsure fired ${ensures.length}× (F3-13: the deleted hatch replaced the shared bench through loadBench overwrite:true)`)
    assert.equal(JSON.stringify(bench), before, 'the bench doc is byte-identical across the press — stages AND intent')
    // R-4 (D3-04): the press READS the bench twice — the snapshot it
    // judges against + the ONE advisory rev-confirm before the start —
    // and WRITES it never. The read bound stays pinned at 2: a third
    // read would be a re-read loop, and any benchVerb/benchEnsure lane
    // here is a landing (F3-13).
    const writes = seen.calls.filter((c) => c.lane !== 'runsStart' && c.lane !== 'runsStatus' && c.lane !== 'draftsStagePatch')
    assert.deepEqual(
      writes.map((c) => c.lane),
      ['benchGet', 'benchGet'],
      'besides the run lifecycle, the press only READS the bench — the snapshot + the ONE advisory rev-confirm (R-4), never a write lane',
    )
  })

  test('W-8 arm 2: an unknown stage id refuses naming the known ids, with zero starts', async () => {
    const seen = stagePressEstate(stageBench())
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ stage: 's_3' }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'bench')
    assert.match(
      String(out.error),
      /the bench holds no stage "s_3" — its stages are s_0, s_1, s_2; add it with melite_construct add_stage or press one of those/,
      'the refusal names the unknown id, every known id, and the cure',
    )
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStart').length, 0, 'no run starts on an unknown stage')
  })

  test('W-8 arm 3: {stage + bench} refuses in the exactly-one voice without touching the estate', async () => {
    const seen = stagePressEstate(stageBench())
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ stage: 's_0', bench: true }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.match(String(out.error), /exactly one composition per call: bench \| card \| flow \| stage — never combined/, 'the exclusivity voice names the stage arm')
    assert.equal(seen.calls.length, 0, 'the refusal precedes every estate call')
    // An empty-string stage counts as absent (the hasStage gate): the
    // call refuses as nothing-selected, never as a stage press.
    const seen2 = stagePressEstate(stageBench())
    const tool2 = meliteFlow(seen2.request)
    const out2 = await tool2.execute({ stage: '' }, fakeExec(AbortSignal.timeout(6000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.match(String(out2.error), /one composition is required/, 'an empty stage is absent — the call names nothing selected')
    assert.equal(seen2.calls.length, 0)
  })

  test('W-8 presentCall face: the pressed stage rides the title', async () => {
    const tool = meliteFlow(fakeEstate({}).estate)
    const pc = (a: unknown) => tool.presentCall!(a as never)
    assert.equal(pc({ stage: 's_0' })!.title, 'Run stage s_0')
    assert.equal(pc({ stage: '' })!.title, 'Run ?')
  })
})

describe('W-2 — the stale downstream skip (the input_runs snapshot law)', () => {
  // THE BURN (FRICTION_3.md:464, RG-P4-3, the operator's "serious
  // one"): bench s_0 image-gen → s_1 upscale wired input_image ←
  // s_0.default. First press: s_0 skipped-done, s_1 ran
  // (run-b6a124416862). Patched s_0 seed 42750 → 73001 (the door
  // cleared the done mark) and pressed: s_0 re-ran (run-d83403ae8eb5,
  // new image), s_1 SKIPPED and kept its artifact derived from the OLD
  // s_0 image — the bench presented the new output beside a stale
  // derived output. The runStatus-only skip never noticed the upstream
  // identity move. THE LAW (W-2): a done row skips only while its
  // recorded input_runs snapshot still names the run identities its
  // wires resolve to now; the attribution stamps the snapshot, so the
  // match is judgeable on the next press.
  //
  // The fake estate's stage-patch door WRITES the stamp into the doc
  // (runStatus + result) exactly like the real drafts door — a press
  // leaves persistent marks the next press reads.

  /** The RG-P4-3 bench: both rows done; s_1 carries the snapshot from
   *  its own last run (it consumed r_gen_1's output). */
  function w2Bench(): Record<string, unknown> {
    return {
      draft_id: 'd_w2', rev: 12, intent: 'lighthouse upscale', log: [],
      stages: [
        { id: 's_0', card: 'image-gen', runStatus: 'done', params: { model: 'krea-2', seed: 42750 },
          result: { run_id: 'r_gen_1', url: '/melite-media/runs/r_gen_1/gen/SaveImage_00001_.png' } },
        { id: 's_1', card: 'upscale-tools', runStatus: 'done',
          params: { model: 'seedvr2-ema', input_image: '$input_image' },
          inputs: { input_image: { stage: 's_0', output: 'default' } },
          result: { run_id: 'r_up_1', url: '/melite-media/runs/r_up_1/upscale/SaveImage_00001_.png',
            input_runs: { input_image: 'r_gen_1' } } },
      ],
    }
  }

  /** The live estate: fresh run ids per start (minted off the burn's
   *  own sequence), per-run completed polls, and the patch door that
   *  lands the stamp on the doc. */
  function w2Handler(bench: Record<string, unknown>) {
    const seq: Record<string, number> = {}
    const runStage = new Map<string, string>()
    return (lane: string, args: unknown[]): { status: number; body: unknown } | undefined => {
      if (lane === 'benchGet') return { status: 200, body: bench }
      if (lane === 'runsStart') {
        const body = args[0] as Record<string, unknown>
        const stage = String(body['bench_stage_id'])
        seq[stage] = (seq[stage] ?? 1) + 1
        const id = stage === 's_0' ? `r_gen_${seq[stage]}` : `r_up_${seq[stage]}`
        runStage.set(id, stage)
        return { status: 202, body: { run_id: id, status: 'queued' } }
      }
      if (lane === 'runsStatus') {
        const stage = runStage.get(args[0] as string) ?? ''
        return { status: 200, body: { status: 'completed', stages: [{
          id: stage,
          url: stage === 's_0' ? 'gen/SaveImage_00001_.png' : 'upscale/SaveImage_00001_.png',
        }] } }
      }
      if (lane === 'draftsStagePatch') {
        const stageId = args[1] as string
        const body = args[2] as Record<string, unknown>
        const row = (bench.stages as Array<Record<string, unknown>>).find((s) => s['id'] === stageId)
        if (row !== undefined) {
          if (typeof body['runStatus'] === 'string') row['runStatus'] = body['runStatus']
          if (body['result'] !== undefined) row['result'] = body['result']
        }
        return { status: 200, body: { delivered: true, patched: ['runStatus', 'result'] } }
      }
      return undefined
    }
  }

  async function press(handler: ReturnType<typeof w2Handler>): Promise<{ out: Record<string, unknown>; seen: ReturnType<typeof mockEstate> }> {
    const seen = mockEstate([handler])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ bench: true }, fakeExec(AbortSignal.timeout(15000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    return { out, seen }
  }

  test('W-2 ARM A (THE WALL): s_0 re-runs on the seed patch — wired s_1 ALSO RUNS and stamps the NEW upstream identity', async () => {
    const bench = w2Bench()
    // the operator's patch: seed changed → the patch door cleared the
    // done mark (W-9); the old result memory stays on the row
    ;(bench.stages as Array<Record<string, unknown>>)[0]!['runStatus'] = 'pending'
    const { out, seen } = await press(w2Handler(bench))
    assert.equal(out.status, 'done', String(out.error))
    const starts = seen.calls.filter((c) => c.lane === 'runsStart')
    assert.equal(starts.length, 2, `THE BURN SHAPE: both rows must run — s_1 skipped its stale upstream result (${starts.length} starts)`)
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['run_id'], 'r_gen_2', 's_0 re-ran')
    assert.equal(pass[1]!['run_id'], 'r_up_2', 's_1 minted a NEW run — the burn kept run-b6a124416862 alive under its stale skip')
    assert.match(String(pass[1]!['stale']), /input snapshot mismatch/,
      'the pass row says WHY the row re-ran — the burn was invisible exactly here')
    // the derivation: s_1's press carries s_0's NEW output, never the
    // old image (the burn presented the new source beside a stale
    // derived artifact)
    const s1Body = starts[1]!.args[0] as Record<string, unknown>
    assert.equal(s1Body['bench_stage_id'], 's_1')
    assert.equal(s1Body['input_image'], '/melite-media/runs/r_gen_2/gen/SaveImage_00001_.png',
      'the wire resolved to the NEW s_0 run — the artifact derives from the moved source')
    // the snapshot landed: s_1's terminal stamp names the CURRENT
    // upstream identity, so the NEXT press can judge the match
    const s1Patches = seen.calls
      .filter((c) => c.lane === 'draftsStagePatch' && c.args[1] === 's_1')
      .map((c) => c.args[2] as Record<string, unknown>)
    const terminal = s1Patches.find((p) => p['runStatus'] === 'done')
    assert.deepEqual((terminal!['result'] as Record<string, unknown>)['input_runs'],
      { input_image: 'r_gen_2' }, 'the stamp carries the press-time snapshot')
    // and s_0 (no wired inputs) takes no snapshot seat
    const s0Terminal = seen.calls
      .filter((c) => c.lane === 'draftsStagePatch' && c.args[1] === 's_0')
      .map((c) => c.args[2] as Record<string, unknown>)
      .find((p) => p['runStatus'] === 'done')
    assert.ok(!('input_runs' in (s0Terminal!['result'] as Record<string, unknown>)), 'a row with no wired inputs stamps no snapshot')
    // the render face prints the stale voice beside the run
    const text = (meliteFlow(seen.request).output.render({ bench: true }, out as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    assert.ok(text.includes('↻ input snapshot mismatch'), 'the operator reads why the row re-ran in the pass prose')
  })

  test('W-2 ARM B (guard, no over-invalidation): an unchanged re-press with matching snapshots skips both rows — zero starts', async () => {
    const { out, seen } = await press(w2Handler(w2Bench()))
    assert.equal(out.status, 'done')
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStart').length, 0,
      'the skip law preserved — a matching snapshot never spends a run')
    assert.deepEqual(out.pass, [
      { stage: 's_0', card: 'image-gen', skipped: 'done', last_run: 'r_gen_1' },
      { stage: 's_1', card: 'upscale-tools', skipped: 'done', last_run: 'r_up_1' },
    ])
  })

  test('W-2 ARM C (guard, sibling): a patched unwired sibling runs alone — the wired branch still skips', async () => {
    const bench = w2Bench()
    // s_2 (no wires) was patched — its done mark cleared; s_0/s_1
    // untouched, s_1's snapshot still matches
    ;(bench.stages as Array<Record<string, unknown>>).push({
      id: 's_2', card: 'tts', runStatus: 'pending', params: { model: 'tts-1' },
    })
    const { out, seen } = await press(w2Handler(bench))
    assert.equal(out.status, 'done', String(out.error))
    const starts = seen.calls.filter((c) => c.lane === 'runsStart')
    assert.equal(starts.length, 1, 'only the patched sibling runs')
    assert.equal((starts[0]!.args[0] as Record<string, unknown>)['bench_stage_id'], 's_2')
    const pass = out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['skipped'], 'done', 'the wired branch does not inherit the sibling\u2019s staleness')
    assert.equal(pass[1]!['skipped'], 'done', 's_1\u2019s snapshot names only ITS wires — an unrelated patch never invalidates it')
  })

  test('W-2 ARM D (legacy): a done wired row with NO input_runs re-runs ONCE, stamps, then skips on the next press', async () => {
    const bench = w2Bench()
    // the pre-W-2 done mark: the snapshot was never stamped
    const legacyResult = (bench.stages as Array<Record<string, unknown>>)[1]!['result'] as Record<string, unknown>
    delete legacyResult['input_runs']
    const first = await press(w2Handler(bench))
    assert.equal(first.out.status, 'done', String(first.out.error))
    // safe-on-stale: the row runs once (s_0 done-skips — it has no wires)
    assert.equal(first.seen.calls.filter((c) => c.lane === 'runsStart').length, 1)
    const pass = first.out.pass as Array<Record<string, unknown>>
    assert.equal(pass[0]!['skipped'], 'done')
    assert.equal(pass[1]!['run_id'], 'r_up_2')
    assert.match(String(pass[1]!['stale']), /input snapshot missing/,
      'the legacy voice names the missing snapshot, not a silent re-run')
    const s1Patches = first.seen.calls
      .filter((c) => c.lane === 'draftsStagePatch' && c.args[1] === 's_1')
      .map((c) => c.args[2] as Record<string, unknown>)
    const terminal = s1Patches.find((p) => p['runStatus'] === 'done')
    assert.deepEqual((terminal!['result'] as Record<string, unknown>)['input_runs'],
      { input_image: 'r_gen_1' }, 'the stamp records what the run consumed — s_0 did not move')
    // second press: the stamp landed persistently — the row skips now
    const second = await press(w2Handler(bench))
    assert.equal(second.out.status, 'done')
    assert.equal(second.seen.calls.filter((c) => c.lane === 'runsStart').length, 0,
      'the stamped row skips — safe-on-stale spends exactly one run')
    assert.equal((second.out.pass as Array<Record<string, unknown>>)[1]!['skipped'], 'done')
  })
})

// THE BRANCH-EDGE BURN (scope C, 2026-11-19): the CAS birth faces'
// rev-less read, the card-mode start refusal, the flow press's
// non-Error edges, and the render/meta junk-tolerant replay faces —
// arms pinned to the exact uncovered records the reporter named.
describe('melite_flow — the branch-edge arms (CAS births, start refusals, flow edges, replay junk)', () => {
  test('a bench read without a rev births without expect_rev — the CAS read learned nothing to hold', async () => {
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: { session: 'main', stages: [], log: [] } }
        if (lane === 'benchEnsure') return { status: 200, body: { draft_id: 'd9' } }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r9', status: 'queued' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen', model: 'm1' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.run_id, 'r9')
    const ensured = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
    assert.equal('expect_rev' in ensured, false, 'a rev-less read holds no rev — the birth arm rides bare')
  })

  test('a card-mode bench/not-found is the birth arm — no expect_rev, the ensure fires, the run presses', async () => {
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') throw new RemoteError('bench/not-found', 'no such bench', { session: 'main' })
        if (lane === 'benchEnsure') return { status: 200, body: { draft_id: 'd9' } }
        if (lane === 'runsStart') return { status: 202, body: { run_id: 'r9', status: 'queued' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen', model: 'm1' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.run_id, 'r9', 'the birth arm composed and pressed — not-found is an empty bench, never a refusal')
    const ensured = decodeJsonBody(seen.calls.find((c) => c.lane === 'benchEnsure')!.args)
    assert.equal('expect_rev' in ensured, false, 'the birth carries no rev to hold')
    assert.equal(seen.calls[0]!.lane, 'benchGet', 'the CAS read rode first and birthed')
    assert.equal(seen.calls.some((c) => c.lane === 'benchEnsure'), true, 'the birth ensure fired')
    assert.equal(seen.calls.some((c) => c.lane === 'runsStart'), true, 'the run pressed')
  })

  test('a card start the queue REFUSED surfaces the refusal text — never an empty-error success', async () => {
    // THE EMPTY-ERROR TRAP's named face: the start answer carries a
    // NON-empty error — only non-empty refuses, and the refusal text
    // is the receipt.
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: { session: 'main', rev: 0, stages: [], log: [] } }
        if (lane === 'benchEnsure') return { status: 200, body: { draft_id: 'd9' } }
        if (lane === 'runsStart') return { status: 200, body: { error: 'the queue refused the start' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ card: 'image-gen', model: 'm1' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.error, 'the queue refused the start')
    assert.equal(out.run_id, undefined, 'no run id rides a refused start')
    assert.equal(seen.calls.filter((c) => c.lane === 'runsStatus').length, 0, 'the observer never polls a refused start')
    assert.equal(seen.calls.filter((c) => c.lane === 'draftsStagePatch').length, 0, 'no stamp fires for a run that never minted')
  })

  test('a flow load refusal that is not an Error values String(e) — a bare string names itself', async () => {
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'loadCard') throw 'the flow plane died'
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'flow')
    assert.equal(out.error, 'the flow plane died', 'String(throw) — never "[object Object]"')
    assert.deepEqual(seen.calls.map((c) => c.lane), ['loadCard'], 'a dead read must not half-land')
  })

  test('a landing whose CAS ensure throws a bare string names the string', async () => {
    const seen = mockEstate([
      flowLoad(UP_ROWS),
      (lane: string) => {
        if (lane === 'benchGet') return { status: 200, body: { session: 'bench-session-chat7', rev: 3, stages: [], log: [] } }
        if (lane === 'benchEnsure') throw 'bench lane died'
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'flow')
    assert.equal(out.error, 'bench lane died', 'the bare transport throw rides verbatim')
    assert.deepEqual(seen.calls.map((c) => c.lane), ['loadCard', 'benchGet', 'benchEnsure'],
      'the refusal precedes the run press')
  })

  test('a card-less flow start refusal carries NO draft — the flow-doc exemption face', async () => {
    // no bench_stages in the bundle → nothing materializes → a
    // refused start rides no draft id (the flow-doc exemption's
    // refusal face).
    const seen = mockEstate([
      flowLoad(undefined),
      (lane: string) => {
        if (lane === 'runsStart') return { status: 200, body: { error: 'the flow door refused' } }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const out = await tool.execute({ flow: 'foo' }, fakeExec(AbortSignal.timeout(2000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.mode, 'flow')
    assert.equal(out.error, 'the flow door refused')
    assert.equal('draft_id' in out, false, 'no bench ever materialized — no draft id rides the refusal')
    assert.deepEqual(seen.calls.map((c) => c.lane), ['loadCard', 'runsStart'])
  })

  test('the render keeps a legacy empty host set quiet; the frozen faces read junk rows without throwing', () => {
    const tool = meliteFlow(fakeEstate({}).estate)
    // a persisted receipt from an older tool version may carry an
    // EMPTY host set — the replay render prints no host block for it
    const hostQuiet = (tool.output.render({ bench: true } as never, {
      mode: 'bench', target: 'd-legacy @ rev 1', status: 'done', host_paths: [],
      pass: [],
    } as never) as Array<{ text?: string }>).map((p) => p.text ?? '').join('\n')
    assert.ok(!hostQuiet.includes('artifacts on host'), 'an empty persisted host set prints no host block')
    // replay hands the frozen faces rows persisted by OLDER tool
    // versions — junk-typed fields fall back, never throw
    const meta = tool.output.presentationMeta!({ bench: true } as never, {
      mode: 'bench', target: 'd-legacy @ rev 1', status: 'stopped',
      pass: [
        { url: '/runs/lead.mp4', status: 9, stage: 7 },
        { card: 42, thrown: '' },
      ],
    } as never) as Record<string, unknown>
    assert.deepEqual(meta['previews'], [{ stage: '?', url: '/runs/lead.mp4', status: 'done' }],
      'a legacy row\u2019s junk stage/status fall back — the strip renders the mint it names')
    assert.deepEqual(meta['rows'], [
      { stage: '?', card: '', status: '', url: '/runs/lead.mp4' },
      { stage: '?', card: '', status: '' },
    ], 'junk rows freeze with their honest empties — no fabricated verdict')
  })
})

// ── THE STAMP-BACK CONFIRMATION (F3 D3-07, the 15 s bound's third
// burn — F2 D-07 → D3-05 → s_94): a green run whose stamp died when
// the drafts PATCH outlived its bound ONCE. The stamp now takes
// bounded retries (STAMP_TAKES=3, each with its own fresh bound), and
// only a door dead on EVERY take demotes the run row to
// attribution: missed — written through the RUNS plane, never the
// wedged bench plane, so the durable sidecar and every later receipt
// answer "completed — NOT shown on the tab" instead of a bare done.
describe('melite_flow — THE STAMP-BACK CONFIRMATION (D3-07: bounded retry + the run-row miss mark)', () => {
  test('THE RETRY ARM — a transient-bound stamp-back (first take dies, second lands) leaves NO miss: exactly two takes, no stamp_note, no attribution mark, runsAttribute never touched', async () => {
    let patches = 0
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: '/runs/a.mp4' }] } }
        }
        if (lane === 'draftsStagePatch') {
          patches += 1
          if (patches === 1) {
            // the transient wedge: one PATCH outliving its bound —
            // the transport dies, the estate itself stays alive
            throw new Error('patch outlived its bound')
          }
          return { status: 200, body: { delivered: true } }
        }
        return undefined
      },
    ])
    const out = await observeAndAttribute(seen.request, draftIdOf('d_retry'), 's_0', 'run-retry', new AbortController().signal, false, 40, 0)
    assert.equal(out.status, 'done', 'the run itself succeeded — the stamp is bookkeeping, never the run')
    assert.equal(patches, 2, 'exactly two takes: the first died transient, the second landed')
    assert.equal(out.stamp_note, undefined, 'a landed retry leaves no miss voice')
    assert.equal(out.attribution, undefined, 'a landed retry never marks the run row')
    assert.ok(!seen.calls.some((c) => c.lane === 'runsAttribute'),
      'the runs plane is never touched when the stamp lands')
  })

  test('THE FINAL-MISS ARM — a stamp dead on EVERY take (three takes) writes attribution: missed ONCE through the RUNS plane, the miss voice names the failure, the returned row carries the mark', async () => {
    let patches = 0
    const marks: Array<unknown[]> = []
    const seen = mockEstate([
      (lane: string, args: unknown[]) => {
        if (lane === 'runsStatus') {
          return { status: 200, body: { status: 'completed', stages: [{ id: 's_0', url: '/runs/a.mp4' }] } }
        }
        if (lane === 'draftsStagePatch') {
          patches += 1
          throw new Error('seat is gone')
        }
        if (lane === 'runsAttribute') {
          marks.push(args)
          return { status: 200, body: { ok: true } }
        }
        return undefined
      },
    ])
    const out = await observeAndAttribute(seen.request, draftIdOf('d_final'), 's_0', 'run-final', new AbortController().signal, false, 40, 0)
    assert.equal(out.status, 'done', 'the run itself succeeded — the miss is the stamp, never the run')
    assert.equal(patches, 3, 'every take died: the full STAMP_TAKES budget spent')
    assert.ok(out.stamp_note !== undefined && out.stamp_note.includes('seat is gone'),
      'the final take\'s own miss voice rides the note: ' + JSON.stringify(out.stamp_note))
    assert.equal(out.attribution, 'missed', 'the returned row mirrors the run-row mark')
    assert.equal(marks.length, 1, 'the mark is written exactly once, through the runs plane')
    assert.equal(marks[0]![0], 'run-final', 'the mark names the run')
    assert.equal(marks[0]![1], 'missed', 'the mark is the missed attribution')
  })

  test('THE CROSS-CALL RENDER FACE — a pass row marked attribution: missed (no stamp_note: a later receipt reading the durable row) prints STAMP MISSED + the re-stamp lever; the unmarked twin stays bare', async () => {
    // the durable face: stamp_note lives in the call that missed;
    // attribution: missed lives on the RUN ROW. A later render
    // reading the row (the note long aged out) must still voice the
    // miss — the maker reads the render, not the payload.
    const seen = mockEstate([
      (lane: string) => {
        if (lane === 'benchGet') {
          return { status: 200, body: { draft_id: 'd_marked', rev: 1, stages: [
            { id: 's_0', card: 'tts', params: {} },
            { id: 's_1', card: 'tts', params: {} },
          ] } }
        }
        return undefined
      },
    ])
    const tool = meliteFlow(seen.request)
    const payload = {
      pass: [
        { stage: 's_0', card: 'tts', run_id: 'run-marked', status: 'done', attribution: 'missed' },
        { stage: 's_1', card: 'tts', run_id: 'run-clean', status: 'done' },
      ],
    }
    const text = (tool.output.render({ bench: true }, payload as never) as Array<{ text?: string }>)
      .map((p) => p?.text ?? '').join('\n')
    const marked = text.split('\n').find((l) => l.includes('run-marked')) ?? ''
    const clean = text.split('\n').find((l) => l.includes('run-clean')) ?? ''
    assert.ok(marked.includes('STAMP MISSED'), 'the marked row says the stamp missed: ' + marked)
    assert.ok(marked.includes('attribution marked missed on the run row'),
      'the face names the durable mark, not a note: ' + marked)
    assert.ok(marked.includes('re-stamp to show it'), 'the face carries the re-stamp lever: ' + marked)
    assert.ok(!clean.includes('STAMP MISSED'), 'the unmarked twin stays bare: ' + clean)
  })
})
