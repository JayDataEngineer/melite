// melite_construct walls (vitest, estate mocked — no gateway, no
// GPU). Pins THE AUTHOR VERB over the one shared bench:
//   1. BENCH KEY: a valid bench rides the path; anything else is
//      the default bench ("main") — zero ids on the surface.
//   2. READ: GET; missing bench births via ensure then GETs again;
//      other failures refuse as values, never throws.
//   3. VERBS: read ('' defaults to read) | validate (empty refuses,
//      compiles maps ok|valid) | load | patch | add_stage |
//      remove_stage | rewire (from clears when absent) | undo |
//      unknown refuses with the verb vocabulary.
//   4. CAS LAW: the refusal voice carries code + message +
//      current_rev exactly when the remote names one; plain
//      failures ride error_kind remote.
//   5. PRESENTATION: Bench <verb>[ · <stage|card>] card; render
//      refuses loud or names verb → rev.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { meliteConstruct, projectStages } from '../src/tools/melite-construct.ts'
import type { Estate } from '../src/estate.ts'
import { fakeEstate, fakeEstateRecorded } from './fake-estate.ts'
import { fakeExec } from './fake-exec.ts'
import { loadCardDefs } from '@melite/comfyui-cordis'

// The foreign seat's undeclared failure code this wall simulates —
// declared here (type-only, erased at runtime) so the RemoteError seam
// accepts the shape a real seat would throw.
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    'bench/broken': { readonly session?: string };
    // the non-cas verb failure the rebase wall simulates (a stage
    // refusal from the seat — type-only, erased at runtime)
    'bench/no-such-stage': { readonly stage?: string };
  }
}

/** The typed-lane mock (F-1, 2026-11-05): handlers dispatch on
 * (lane, args) — the URL grammar is the browser face's own seam,
 * never the tool tests'. Lanes used here: benchGet(args[0]=session),
 * benchEnsure(args[0]=doc), benchVerb(args[0]=session, args[1]=verb,
 * args[2]=doc), runsValidate(args[0]=doc), runsList(args[0]=limit). */
function mockEstate(handler: (lane: string, args: unknown[]) => unknown): {
  seen: Array<{ lane: string; args: unknown[]; timeoutMs?: number }>;
  estate: Estate;
} {
  const seen: Array<{ lane: string; args: unknown[]; timeoutMs?: number }> = []
  const { estate } = fakeEstateRecorded(seen, handler)
  return { seen, estate }
}

function exec() {
  // THE ONE-SEAT LAW's test face (audit 2026-10-31): a delegated
  // lane carries no conversation id and refuses — every spec here
  // drives the PARENT conversation's seat (session-<uuid>), the only
  // lane the door authors.
  return fakeExec(AbortSignal.timeout(5000), { agent: { id: 'session-chat7' } })
}

function stubEstate(): Estate {
  return fakeEstate({}).estate
}

const ROW = { session: 'session-chat7', rev: 4, intent: 'make art', stages: [{ id: 's0' }], log: [{ rev: 4 }] }

describe('melite_construct presentCall — the Bench card', () => {
  test('verb + stage ride the title', () => {
    const tool = meliteConstruct(stubEstate())
    const view = tool.presentCall!({ verb: 'patch', stage: 's1' })
    assert.equal(view?.card, 'generic')
    assert.equal(view?.title, 'Bench patch · s1')
    assert.equal(view?.kind, 'execute')
  })

  test('the card falls back when no stage rides', () => {
    const tool = meliteConstruct(stubEstate())
    assert.equal(tool.presentCall!({ verb: 'add_stage', card: 'image-gen' })?.title, 'Bench add_stage · image-gen')
  })

  test('a bare verb renders alone', () => {
    const tool = meliteConstruct(stubEstate())
    assert.equal(tool.presentCall!({ verb: 'read' })?.title, 'Bench read')
  })

  test('junk verbs/stages ride the gate (single seat — no re-attached fallback)', () => {
    const tool = meliteConstruct(stubEstate())
    // (§7 P7: the presenter rides defineTool validation. Slice 5 made
    // `verb` REQUIRED in the schema, so the presenter refuses a call
    // with no verb exactly as execute does — one gate, not two.)
    assert.equal(tool.presentCall!({})?.title, undefined)
    assert.equal(tool.presentCall!(null), undefined)
    assert.equal(tool.presentCall!({ verb: 7, stage: '', card: '' }), undefined)
  })
})

describe('melite_construct — THE ONE-SEAT BENCH (stroke 44 + the one-seat law, receipt 2026-10-31-infra-bench-one-seat-identity: the flow belongs to the conversation, and an attributed lane never merges into main)', () => {
  test("the agent's own session IS the bench key — ToolExecution.agent.id binds it", async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { ...ROW, session: 'session-chat7' }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read' }, fakeExec(AbortSignal.timeout(5000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.bench, 'session-chat7')
    assert.equal(out.ok, true)
    assert.ok(seen.some((r) => r.lane === 'benchGet' && r.args[0] === 'session-chat7'))
  })

  test('the conversation WINS over an explicit bench key — cross-conversation state is unreachable, not merely discouraged', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { ...ROW, session: 'session-chat7' }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read', bench: 'main' }, fakeExec(AbortSignal.timeout(5000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.bench, 'session-chat7')
  })

  test('no agent (headless/script seats) — the explicit key applies, else main (the genuinely unattributed seat is the fallback the one-seat law leaves alive)', async () => {
    const a = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'probe') return ROW
      throw new Error('unmocked lane ' + lane)
    })
    const outA = await meliteConstruct(a.estate).execute({ verb: 'read', bench: 'probe' }, fakeExec(AbortSignal.timeout(5000))) as Record<string, unknown>
    assert.equal(outA.bench, 'probe')

    const b = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'main') return ROW
      throw new Error('unmocked lane ' + lane)
    })
    const outB = await meliteConstruct(b.estate).execute({ verb: 'read' }, fakeExec(AbortSignal.timeout(5000))) as Record<string, unknown>
    assert.equal(outB.bench, 'main')
  })

  test('a DELEGATED id (bare uuid) forwards under the seat prefix — the re-seat is the estate seatOf\'s call, never a tool-side sanitize (the DELEGATION arm)', async () => {
    const delegated = '3f9d2c1a-6f0e-4a55-9c1a-2b7d8e4f5a60'
    const seat = 'delegate:' + delegated
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === seat) return { ...ROW, session: seat }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read' }, fakeExec(AbortSignal.timeout(5000), { agent: { id: delegated } })) as Record<string, unknown>
    assert.equal(out.bench, seat, 'the bare uuid rides under the seat prefix — the estate owns the re-seat')
    assert.ok(seen.some((r) => r.lane === 'benchGet' && r.args[0] === seat))
    assert.equal(seen.some((r) => r.args[0] === 'main'), false, 'never silently sanitized onto main')
  })
})

describe('melite_construct read — freshness first', () => {
  test('read GETs the bench row', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return ROW
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.verb, 'read')
    assert.equal(out.bench, 'session-chat7')
    assert.equal(out.ok, true)
    assert.equal(out.rev, 4)
    assert.equal(out.intent, 'make art')
    assert.deepEqual(out.stages, [{ id: 's0' }])
    assert.deepEqual(out.log, [{ rev: 4 }])
    assert.equal(out.hint, 'mutate with expect_rev=4')
    assert.equal(seen[0]!.timeoutMs, 15_000)
  })

  test('a missing verb REFUSES at the schema gate — a bare call never reads (slice 5)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return ROW
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    // THE BURN (session 7a82): two payload-with-no-verb calls silently
    // READ while the agent believed it was composing. Correction 1 of
    // the rework's adjudication made the verb required in the schema —
    // a payload never derives a verb, and a bare call is not exempt.
    await assert.rejects(
      tool.execute({}, exec()),
      /missing required property "verb"/,
      'the schema gate names the missing verb before execute',
    )
    assert.equal(seen.length, 0, 'nothing was read or written')
  })

  test('a named side-bench is IGNORED — the conversation wins (the one-seat law: an attributed lane never leaves its conversation)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { ...ROW, session: 'session-chat7' }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read', bench: 'side_1' }, exec()) as Record<string, unknown>
    assert.equal(out.bench, 'session-chat7')
    assert.equal(seen[0]!.lane, 'benchGet')
    assert.equal(seen[0]!.args[0], 'session-chat7', 'side_1 was never read — the conversation bench was')
  })

  test('an invalid bench falls back to the shared bench', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return ROW
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read', bench: 'bad bench!' }, exec()) as Record<string, unknown>
    assert.equal(out.bench, 'session-chat7')
    assert.equal(seen[0]!.lane, 'benchGet')
  })

  test('a missing bench births via ensure, then reads', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') {
        if (seen.filter((c) => c.lane === 'benchGet').length === 1) {
          throw new RemoteError('bench/not-found', 'no such bench', { session: 'session-chat7' })
        }
        return ROW
      }
      if (lane === 'benchEnsure') return { rev: 0 }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.rev, 4)
    assert.deepEqual(
      seen.map((c) => c.lane),
      ['benchGet', 'benchEnsure', 'benchGet'],
    )
    assert.deepEqual(seen[1]!.args[0], { session: 'session-chat7' })
  })

  test('a foreign remote on the read refuses, never births', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') {
        throw new RemoteError('bench/broken', 'seat blew up', { session: 'session-chat7' })
      }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.error, 'seat blew up')
    assert.equal(out.error_kind, 'bench/broken')
    assert.equal(seen.some((c) => c.lane === 'benchEnsure'), false)
  })

  test('a plain failure on the read refuses as a value', async () => {
    const { estate } = mockEstate(() => { throw new Error('down') })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.verb, 'read')
    assert.equal(out.bench, 'session-chat7')
    assert.equal(out.ok, false)
    assert.equal(out.error, 'down')
    assert.equal(out.error_kind, 'remote')
  })
})

describe('melite_construct validate — compile, no GPU', () => {
  test('an empty bench refuses without touching the door', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') return { ...ROW, stages: [] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, true)
    assert.equal(out.rev, 4)
    assert.equal(out.compiles, false)
    assert.equal(out.note, 'bench is empty')
    assert.equal(seen.some((c) => c.lane === 'runsValidate'), false)
  })

  test('stages project onto the wire contract and compile', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        return {
          ...ROW,
          stages: [{ id: 'a', engine: '', params: { p: 1 }, card: 'c', title: 't', result: 1 }],
        }
      }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, true)
    assert.deepEqual(out.report, { ok: true })
    const validate = seen.find((c) => c.lane === 'runsValidate')!
    assert.equal(validate.timeoutMs, 20_000)
    // 2026-09-21: the tool supplies the flow id itself (the bench's
    // intent when legal, else 'bench') — the caller never spells one.
    // card RIDES (the phantom-refusal cure): the kinds pass derives
    // wired-input kinds from the card's flowKinds — the doors admit
    // card (STAGE_KEYS), only provenance/runStatus/result/title strip.
    // THE CARD-PORTS LAW (2026-09-26): outputs stay {} on a card
    // stage (channels derive from the card's own ports at compile —
    // the fabricated image default mis-kinded video/tts cards).
    assert.deepEqual(validate.args[0], {
      flow_inline: {
        id: 'bench',
        stages: [{ id: 'a', engine: 'comfyui', params: { p: 1 }, inputs: {}, outputs: {}, card: 'c' }],
      },
    })
  })

  test('the valid flag compiles too', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') return { ...ROW, stages: [{ id: 'a' }] }
      if (lane === 'runsValidate') return { ok: false, valid: true }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, true)
  })

  test('a refused compile rides compiles:false', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') return { ...ROW, stages: [{ id: 'a' }] }
      if (lane === 'runsValidate') return { ok: false, valid: false }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, false)
  })
})

// THE LIVE-ROWS LAW (GAPS-9, the archived-compile burn: an archived
// stale draft's params blocked every future bench-wide compile).
// F11 rests archived rows on the RUN faces; the COMPILE faces rest
// them too — projectStages strips the archived FLAG (not a wire key)
// but kept the ROW, so a spent row's stale params judged bench-wide.
// These arms mint two rows, archive one post-mint through the real
// archive verb, and prove the compile excludes it: the validate door
// below REFUSES any bench whose archived row rides (the burn's own
// shape — a stale draft that no longer compiles), so a green
// compiles:true proves the archived row never reached the judge.
describe('melite_construct validate — GAPS-9: only LIVE rows judge', () => {
  // A bench whose rows carry the archive flag the way the seat
  // stores them post-archive: one live row, one spent row with the
  // stale params of the burn.
  const mintThenArchive = () => {
    let archived = false
    const live = { id: 's_live', engine: 'comfyui', params: { p: 1 } }
    const spent = { id: 's_old', engine: 'comfyui', params: { p: 'stale' } }
    const doc = () => ({
      session: 'session-chat7', rev: archived ? 10 : 9, intent: '', log: [],
      stages: archived ? [live, { ...spent, archived: true }] : [live, spent],
    })
    return { live, spent, doc, setArchived: () => { archived = true } }
  }

  test('an archived row post-mint never reaches the compile — live rows alone judge', async () => {
    const bench = mintThenArchive()
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') return bench.doc()
      // the archive verb lands on the seat (the F11 mark)
      if (lane === 'benchVerb' && args[1] === 'archive') {
        bench.setArchived()
        return { rev: 10, stage: 's_old' }
      }
      if (lane === 'runsValidate') {
        // THE BURN'S OWN SHAPE: the seat refuses a bench whose spent
        // row rides — its stale params no longer compile. A green
        // verdict proves the archived row was excluded, never judged.
        const stages = (args[0] as { flow_inline: { stages: unknown[] } }).flow_inline.stages
        const ids = stages.map((s) => (s as Record<string, unknown>)['id'])
        if (ids.includes('s_old')) return { ok: false, error: 'stale draft params do not compile' }
        return { ok: true }
      }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const archived = await tool.execute({ verb: 'archive', stage: 's_old', expect_rev: 9 }, exec()) as Record<string, unknown>
    assert.equal(archived.archived, true, 'the spent row rests post-mint')
    const out = await tool.execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, true, 'the live row alone compiles — the archived row never judged')
    const validate = seen.find((c) => c.lane === 'runsValidate')!
    const sent = (validate.args[0] as { flow_inline: { stages: Array<Record<string, unknown>> } }).flow_inline.stages
    assert.deepEqual(sent.map((s) => s['id']), ['s_live'], 'only the LIVE row rides the wire')
    assert.ok(!('archived' in sent[0]!), 'no archived flag leaks onto the wire')
  })

  test('an all-archived bench compiles nothing — the empty-bench voice, no door call', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') {
        return {
          session: 'session-chat7', rev: 10, intent: '', log: [],
          stages: [{ id: 's_old', engine: 'comfyui', params: { p: 'stale' }, archived: true }],
        }
      }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, false)
    assert.equal(out.note, 'bench is empty', 'a bench of only resting rows holds nothing to judge')
    assert.equal(seen.some((c) => c.lane === 'runsValidate'), false, 'no live rows, no door call')
  })
})

describe('melite_construct mutations — every verb', () => {
  test('load replaces stages wholesale', async () => {
    const stages = [{ id: 's1', engine: 'comfyui' }]
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchEnsure') return { rev: 5, stages }
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 5, intent: 'make art', stages, log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'load', stages, intent: 'make art', expect_rev: 4 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.rev, 5)
    assert.deepEqual(out.stages, stages)
    assert.equal(out.landing, 'landed_and_compiling', 'a load that lands stages carries its compile verdict (slice 5)')
    // the pre-mint gate (F14/F26) composes BEFORE the write — the
    // ensure is the write, not the first call anymore
    const ensure = seen.find((r) => r.lane === 'benchEnsure')
    assert.ok(ensure, 'the ensure fired after the gate')
    assert.deepEqual(ensure!.args[0], { session: 'session-chat7', stages, intent: 'make art', expect_rev: 4 })
  })

  test('load defaults to empty stages and drops a blank intent', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchEnsure') return { rev: 1, stages: [] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    await tool.execute({ verb: 'load', intent: '', expect_rev: 0 }, exec())
    assert.deepEqual(seen[0]!.args[0], { session: 'session-chat7', stages: [], expect_rev: 0 })
  })

  test('load with overwrite:true confirms wholesale replacement (the overwrite law)', async () => {
    const stages = [{ id: 's1', engine: 'comfyui' }]
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchEnsure') return { rev: 6, stages }
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 6, intent: 'make art', stages, log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'load', stages, intent: 'make art', overwrite: true, expect_rev: 4 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.rev, 6)
    assert.deepEqual(out.stages, stages)
    const ensure = seen.find((r) => r.lane === 'benchEnsure')
    assert.ok(ensure, 'the ensure fired after the gate')
    assert.deepEqual(ensure!.args[0], { session: 'session-chat7', stages, intent: 'make art', overwrite: true, expect_rev: 4 })
  })

  // THE AUTO-REV FRONT DOOR (session 90a0b920's friction map: the
  // agent burned a whole bench read per mutation just to learn the
  // rev, then the render told it to repeat). An omitted expect_rev
  // takes the rebase's own path: one bounded read, the fresh rev,
  // the write — the CAS door still guards every write.
  test('an omitted expect_rev fills from one bounded read (the mutation never demands a prior read call)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { session: 'session-chat7', rev: 9, intent: '', stages: [{ id: 's1' }], log: [] }
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 10, stage: 's1', patched: ['p'] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's1', params: { p: 1 } },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.rev, 10)
    // the fill-read precedes the write, and the write carries the
    // read's rev — never undefined
    assert.equal(seen[0]!.lane, 'benchGet')
    assert.equal(seen[1]!.lane, 'benchVerb')
    assert.deepEqual(seen[1]!.args[2], { stage: 's1', params: { p: 1 }, expect_rev: 9 })
    // ONE read — the fill is bounded, not a loop
    assert.equal(seen.filter((r) => r.lane === 'benchGet').length, 1)
  })

  test('a supplied expect_rev skips the fill-read entirely (the caller saw the state)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 11, stage: 's1', patched: ['p'] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    await tool.execute({ verb: 'patch', stage: 's1', params: { p: 1 }, expect_rev: 5 }, exec())
    assert.deepEqual(seen.map((r) => r.lane), ['benchVerb'])
    assert.deepEqual(seen[0]!.args[2], { stage: 's1', params: { p: 1 }, expect_rev: 5 })
  })

  test('a changed patch answers stale:true — the model reads WHY its next run re-runs (the silent no-op cure)', async () => {
    // The door's invalidation is invisible unless the answer
    // carries it: the patch that cleared a done mark must say so,
    // or the agent meets an unexplained skip-to-run transition.
    // The payload prints every key — stale rides the door's own
    // answer, and its ABSENCE on an idempotent write is equally
    // readable (the done mark stands).
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 7, stage: 's1', patched: ['p'], stale: true }
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 7, intent: '', stages: [{ id: 's1', params: { p: 2 } }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'patch', stage: 's1', params: { p: 2 }, expect_rev: 6 }, exec()) as Record<string, unknown>
    assert.equal(out.stale, true, 'the door\'s staleness voice rides the answer')
    // THE RENDER IS THE MODEL'S READ (the warm-2 fire: the payload
    // carried stale:true and the render never printed it — the
    // model could not see why the next flow would re-run): the
    // rendered text names the invalidation, or the voice is unheard.
    const blocks = tool.output!.render!({ verb: 'patch', stage: 's1' } as never, out as never) as Array<{ type?: string, text?: string }>
    const rendered = blocks.map((b) => b.text ?? '').join('\n')
    assert.ok(rendered.includes('stale: params changed'), 'the render prints the staleness line — a payload key nobody prints is a voice nobody hears')
    const quiet = await (async () => {
      const { estate: e2 } = mockEstate((lane, args) => {
        if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 8, stage: 's1', patched: ['p'] }
        throw new Error('unmocked lane ' + lane)
      })
      return meliteConstruct(e2).execute({ verb: 'patch', stage: 's1', params: { p: 2 }, expect_rev: 7 }, exec()) as Promise<Record<string, unknown>>
    })()
    assert.equal(quiet.stale, undefined, 'an idempotent write carries no stale key')
  })

  test('patch merges params onto one stage', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 6, stage: 's1', patched: ['p'] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's1', params: { p: 1 }, expect_rev: 5 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.rev, 6)
    assert.equal(out.stage, 's1')
    assert.deepEqual(seen[0]!.args[2], { stage: 's1', params: { p: 1 }, expect_rev: 5 })
  })

  test('add_stage carries the optional wiring', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 7, stage: 's2' }
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 7, intent: '', stages: [{ id: 's2' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'add_stage', card: 'c', engine: 'comfyui', params: { p: 1 }, inputs: { x: 1 }, expect_rev: 6 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.stage, 's2')
    const add = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    assert.ok(add, 'the add_stage write fired')
    assert.deepEqual(add!.args[2], {
      card: 'c', engine: 'comfyui', params: { p: 1 }, inputs: { x: 1 }, expect_rev: 6,
    })
  })

  test('add_stage drops absent wiring', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 7, stage: 's2' }
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 7, intent: '', stages: [{ id: 's2' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    await tool.execute({ verb: 'add_stage', card: 'c', expect_rev: 6 }, exec())
    const add = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    assert.ok(add, 'the add_stage write fired')
    assert.deepEqual(add!.args[2], { card: 'c', expect_rev: 6 })
  })

  test('remove_stage splices one stage out', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'remove_stage') return { rev: 8, stage: 's1' }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'remove_stage', stage: 's1', expect_rev: 7 }, exec()) as Record<string, unknown>
    assert.equal(out.stage, 's1')
    assert.deepEqual(seen[0]!.args[2], { stage: 's1', expect_rev: 7 })
  })

  // F11 (2026-11-12) — THE SPENT-STAGE MARK: archive keeps the row
  // (result + history) and skips every run face; unarchive restores
  // it. The verb rides the bench's own archive door with its CAS.
  test('archive marks a spent stage; unarchive restores it (F11)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'archive') return { rev: 9, stage: 's1' }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'archive', stage: 's1', expect_rev: 8 }, exec()) as Record<string, unknown>
    assert.equal(out.stage, 's1')
    assert.equal(out.archived, true)
    assert.deepEqual(seen[0]!.args[2], { stage: 's1', off: false, expect_rev: 8 })
    const out2 = await tool.execute({ verb: 'unarchive', stage: 's1', expect_rev: 9 }, exec()) as Record<string, unknown>
    assert.equal(out2.archived, false)
    assert.deepEqual(seen[1]!.args[2], { stage: 's1', off: true, expect_rev: 9 })
  })

  // THE CLEAR ALL (2026-10-10, the operator: "THERE IS NO CLEAR ALL"
  // — the bench wedge left no way out but the wedge).
  test('clear empties the bench in one verb (the demanded clear all)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'clear') return { rev: 12, cleared: 6 }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'clear', expect_rev: 11 }, exec()) as Record<string, unknown>
    assert.equal(out.cleared, 6)
    assert.equal(out.rev, 12)
    // no stage arg: the verb is the bench itself
    assert.deepEqual(seen[0]!.args[2], { expect_rev: 11 })
  })

  test('the verb table ADVERTISES clear (an unlisted door is a door the agent never finds)', () => {
    const tool = meliteConstruct(stubEstate())
    const schema = JSON.stringify(tool.parameters ?? {})
    assert.match(schema, /clear/)
  })

  test('rewire sets a binding', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'rewire') return { rev: 9, stage: 's1', input: 'in' }
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 7, intent: '', stages: [{ id: 's2' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'rewire', stage: 's1', input: 'in', from: { stage: 's0', output: 'default' }, expect_rev: 8 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.input, 'in')
    // slice 5: the lane law reads the stage's card BEFORE the write
    // (one bounded read), so the rewire call is not seen[0] anymore.
    const write = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'rewire')
    assert.ok(write, 'the rewire write rode the bench verb')
    assert.deepEqual(write.args[2], {
      stage: 's1', input: 'in', from: { stage: 's0', output: 'default' }, expect_rev: 8,
    })
  })

  test('rewire without from clears the binding', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'rewire') return { rev: 9, stage: 's1', input: 'in' }
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 7, intent: '', stages: [{ id: 's2' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    await tool.execute({ verb: 'rewire', stage: 's1', input: 'in', expect_rev: 8 }, exec())
    const write = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'rewire')
    assert.ok(write, 'the rewire write rode the bench verb')
    assert.deepEqual(write.args[2], { stage: 's1', input: 'in', expect_rev: 8 })
  })

  test('undo walks the log', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'undo') return { rev: 10, undone: 2, stages: [] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'undo', n: 2, author: 'user', expect_rev: 11 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.rev, 10)
    assert.equal(out.undone, 2)
    assert.deepEqual(seen[0]!.args[2], { n: 2, author: 'user', expect_rev: 11 })
  })

  test('undo defaults ride omitted', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'undo') return { rev: 10, undone: 1, stages: [] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    await tool.execute({ verb: 'undo', expect_rev: 11 }, exec())
    assert.deepEqual(seen[0]!.args[2], { expect_rev: 11 })
  })

  test('an unknown verb refuses with the vocabulary', async () => {
    // The refusal moved to the schema boundary (the strictness
    // audit's fix 8): the verb is a literal enum now, so
    // validateArgs fires BEFORE execute with the same vocabulary —
    // ToolArgsError instead of the execute-side unknown-verb row.
    const { estate } = mockEstate(() => ({ rev: 1 }))
    const tool = meliteConstruct(estate)
    await assert.rejects(
      tool.execute({ verb: 'bogus' }, exec()),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message,
          /"verb" must be one of \["read","load","patch","add_stage","remove_stage","archive","unarchive","clear","floor","rewire","undo","validate"\]/)
        return true
      },
    )
  })

  test('rewire from-rows and load stage-rows refuse undeclared keys at the wrapper gate (fix 8)', async () => {
    const { estate } = mockEstate(() => ({ rev: 1 }))
    const tool = meliteConstruct(estate)
    await assert.rejects(
      tool.execute({ verb: 'rewire', stage: 's', input: 'image', from: { stage: 'a', output: 'image', zeta: 1 } }, exec()),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /"from\.zeta" is not a declared property/)
        return true
      },
    )
    await assert.rejects(
      tool.execute({ verb: 'load', stages: [{ id: 's1', boardd: 'x' }], overwrite: true, expect_rev: 1 }, exec()),
      (e: unknown) => {
        assert.ok(e instanceof ToolArgsError)
        assert.match((e as ToolArgsError).message, /"stages\[0\]\.boardd" is not a declared property/)
        return true
      },
    )
  })
})

describe('melite_construct refusals — the CAS voice', () => {
  test('a moved bench carries current_rev', async () => {
    const { estate } = mockEstate(() => {
      throw new RemoteError('bench/cas-conflict', 'bench moved: rev is 7, caller held 6', {
        current_rev: 7,
        expect_rev: 6,
      })
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's1', params: {}, expect_rev: 6 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.verb, 'patch')
    assert.equal(out.ok, false)
    assert.equal(out.error, 'bench moved: rev is 7, caller held 6')
    assert.equal(out.error_kind, 'bench/cas-conflict')
    assert.equal(out.current_rev, 7)
  })

  test('a remote without a rev carries none', async () => {
    const { estate } = mockEstate(() => {
      throw new RemoteError('bench/cas-conflict', 'bench moved', undefined as never) // no details at runtime — the carry-none arm
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'patch', stage: 's1', expect_rev: 6 }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'bench moved')

  })

  // THE STATED-HOLD LAW (GAPS-10, the silent-land burn: `patch
  // {expect_rev: 58}` on a rev-69 bench LANDED at rev 70): a STATED
  // expect_rev is an assertion — "the state you saw" — and a bench
  // that moved under the assertion REFUSES loud. The verdict
  // surfaces verbatim with current_rev (the client re-reads and
  // re-applies); no re-read, no retry, no silent land. The
  // drafts-side CAS (estate/drafts bench.ts casCheck) always
  // refused — this wall pins the TOOL face to the same law.
  test('GAPS-10: a STATED stale expect_rev refuses loud — one POST, no re-read, current_rev rides', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') return { rev: 69, stages: [] } // must never be read
      throw new RemoteError('bench/cas-conflict',
        'bench moved under the patch (expect_rev 58, current 69) — re-read and re-apply',
        { current_rev: 69, expect_rev: 58 })
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      // numeric params carry no spell token and no wire shape, so
      // the patch arm fires no pre-read — the ONLY call is the POST
      { verb: 'patch', stage: 's_0', params: { steps: 22 }, expect_rev: 58 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.ok, false, 'the stale stated hold never lands')
    assert.equal(out.rev, undefined, 'no rev returned — nothing was written')
    assert.equal(out.error_kind, 'bench/cas-conflict')
    assert.equal(out.error, 'bench moved under the patch (expect_rev 58, current 69) — re-read and re-apply')
    assert.equal(out.current_rev, 69, 'the verdict carries the CURRENT rev for the re-read')
    // exactly ONE post, ZERO reads (numeric params carry no spell
    // token and no wire shape, so the patch arm fires no pre-read):
    // the stated hold never rebases
    assert.equal(seen.filter((s) => s.lane === 'benchVerb').length, 1)
    assert.equal(seen.filter((s) => s.lane === 'benchGet').length, 0)
  })

  // THE STATED-HOLD LAW, spelled out (a stated STRING-carrying patch
  // pre-reads its card — the pre-read is NOT a rebase): the stale
  // hold still refuses after its own pre-read, with NO second re-read
  // and NO retry.
  test('GAPS-10, spelled: a stated string patch refuses on its own pre-read — one GET, one POST, no retry', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') return { rev: 69, stages: [{ id: 's_0', card: 'image-gen' }] }
      throw new RemoteError('bench/cas-conflict',
        'bench moved under the patch (expect_rev 58, current 69) — re-read and re-apply',
        { current_rev: 69, expect_rev: 58 })
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's_0', params: { model: 'qwen-img-edit-2511' }, expect_rev: 58 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.ok, false, 'the stale stated hold never lands')
    assert.equal(out.current_rev, 69, 'the verdict carries the CURRENT rev for the re-read')
    assert.equal(seen.filter((s) => s.lane === 'benchVerb').length, 1)
    assert.equal(seen.filter((s) => s.lane === 'benchGet').length, 1,
      'only the card pre-read — no rebase re-read')
  })

  // THE ONE-RETRY REBASE (the operator's stuck-agent cure, 2026-10-09:
  // "I can't even change models in the cards — it breaks"): the tool
  // face inherits the GUI's withRebase law for the rev the TOOL
  // filled. An OMITTED expect_rev is no assertion — the fill-read's
  // rev can race a concurrent write, and one bounded re-read +
  // re-apply lands the agent's model switch instead of stranding on
  // a race it never authored. A STATED hold never takes this path
  // (the GAPS-10 wall above).
  test('THE REBASE: an OMITTED expect_rev re-reads the fresh rev and re-applies once — the model switch lands', async () => {
    let posts = 0
    const { seen, estate } = mockEstate((lane, args) => {
      const b = (lane === 'benchVerb' ? args[2] : args[0]) as Record<string, unknown>
      if (lane === 'benchGet') return { rev: 23, stages: [] }
      posts += 1
      if (posts === 1) {
        // the door's verdict: the bench moved under the fill's rev
        throw new RemoteError('bench/cas-conflict',
          'bench main moved: rev is 23, caller held 21', { current_rev: 23, expect_rev: 21 })
      }
      assert.equal(b['expect_rev'], 23, 'the retry carries the FRESH rev')
      return { rev: 24, stage: b['stage'], patched: true }
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's_0', params: { model: 'qwen-img-edit-2511' } },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.verb, 'patch')
    assert.equal(out.rev, 24)
    assert.equal(out.stage, 's_0')
    // the sequence: the craft pre-read (slice 6 — a string-bearing
    // patch must learn the stage's card before its law can apply; it
    // doubles as the auto-rev fill), the refused POST, the fresh GET,
    // the landing POST (23) — one retry, no loops
    assert.deepEqual(seen.map((s) => s.lane), [
      'benchGet',
      'benchVerb',
      'benchGet',
      'benchVerb',
    ])
  })

  test('THE REBASE SPENDS ONE retry: a second cas-conflict surfaces (never loops)', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') return { rev: 23, stages: [] }
      throw new RemoteError('bench/cas-conflict',
        'bench main moved: rev is 99, caller held 23', { current_rev: 99, expect_rev: 23 })
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's_0', params: { model: 'qwen-img-edit-2511' } },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.error_kind, 'bench/cas-conflict')
    // the string params pre-read BOTH the auto-rev fill (caller's own
    // land) and the card — hence full sequence GET,POST,GET,POST
    assert.deepEqual(seen.map((s) => s.lane), ['benchGet', 'benchVerb', 'benchGet', 'benchVerb'])
    // TWO posts only: the raced fill attempt + the single re-applied
    // retry — then the verdict surfaces
    assert.equal(seen.filter((s) => s.lane === 'benchVerb').length, 2)
  })

  // The rebase's two exit hatches (batch-4 closure, 2026-10-14): a
  // NON-cas error never enters the rebase, and a fresh read that
  // carries no numeric rev rethrows the CAS verdict itself — the
  // bench is unreadable, so the caller keeps the verdict that
  // explains why.
  test('a NON-cas failure on the verb surfaces as itself — the rebase never fires', async () => {
    let gets = 0
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') { gets += 1; return { rev: 23, stages: [] } }
      throw new RemoteError('bench/no-such-stage', 'stage s_9 is not on the bench', undefined as never)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's_9', params: {}, expect_rev: 21 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.error_kind, 'bench/no-such-stage')
    // no re-read, no retry: the rebase is for CAS verdicts only
    assert.equal(gets, 0)
    assert.deepEqual(seen.map((s) => s.lane), ['benchVerb'])
  })

  test('a fresh read with NO numeric rev rethrows the CAS verdict — one read, no blind retry', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') return { stages: [] } // unreadable bench: no rev field
      throw new RemoteError('bench/cas-conflict',
        'bench main moved: rev is 23, caller held 21', { current_rev: 23, expect_rev: 21 })
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's_0', params: {} },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.error_kind, 'bench/cas-conflict')
    assert.equal(out.error, 'bench main moved: rev is 23, caller held 21')
    // the fill GET, the POST, the revless re-read GET — and no second POST
    assert.deepEqual(seen.map((s) => s.lane), ['benchGet', 'benchVerb', 'benchGet'])
  })

  test('a non-numeric rev carries none', async () => {
    const { estate } = mockEstate(() => {
      throw new RemoteError('bench/cas-conflict', 'bench moved', { current_rev: 'seven' as unknown as number }) // intentionally mistyped rev: non-numeric carries none (undefined below)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'patch', stage: 's1', expect_rev: 6 }, exec()) as Record<string, unknown>
    assert.equal(out.error, 'bench moved')
    assert.equal(out.current_rev, undefined)
  })

  test('a bare throw refuses remote', async () => {
    const { estate } = mockEstate(() => { throw 'bare failure' })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, false)
    assert.equal(out.error, 'bare failure')
    assert.equal(out.error_kind, 'remote')
  })
})

describe('melite_construct render — refused or revved', () => {
  test('a refusal renders REFUSED', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render(
      { verb: 'patch' },
      { verb: 'patch', bench: 'main', ok: false, error: 'bench moved' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'melite_construct REFUSED: bench moved')
  })

  // (flow-link F4, 2026-11-06) 'the agent never sees this payload'
  // was narrated, never judged: no arm rendered a settled value and
  // asserted the bench key is ABSENT from the model-visible text.
  // The link address rides the persisted meta alone; a render
  // regression that leaked the key would have passed every arm.
  test('THE NO-LEAK ARM: a settled read with a chat bench never renders the key', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render(
      { verb: 'read' },
      { verb: 'read', bench: 's_chat7', ok: true, rev: 5, stages: [{ id: 's1' }] } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.equal(text, 'bench read → rev 5\nstages: 1\n  s1 — ? [?]')
    assert.ok(!text.includes('s_chat7'), 'the bench key is meta-only — the model-visible text never carries it')
  });

  test('a success renders verb → rev', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render(
      { verb: 'read' },
      { verb: 'read', bench: 'main', ok: true, rev: 5 } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'bench read → rev 5')
  })

  // STROKE 85 (the blind read that wrecked the operator's bench):
  // the render MUST disclose the stages the payload carries — a
  // model that cannot see the bench probes it destructively.
  test('read discloses its stages one line each', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render(
      { verb: 'read' },
      {
        verb: 'read', bench: 'main', ok: true, rev: 47,
        intent: 'the working set',
        hint: 'mutate with expect_rev=47',
        stages: [
          { id: 's_1', card: 'image-gen', engine: 'comfyui' },
          { id: 's_2', card: 'image-edit', engine: 'comfyui' },
        ],
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'bench read → rev 47\nstages: 2\n  s_1 — image-gen [comfyui]\n  s_2 — image-edit [comfyui]\nintent: the working set\nhint: mutate with expect_rev=47',
    )
  })

  // THE RECEIPT DETAIL (024's self-critique #5, 2026-09-24): the
  // last_run suffix voices the mint + first artifact — the read
  // answers which .qvoice the draft holds, not just that a run
  // exists. String rows print verbatim; object rows print path;
  // ./ prefixes strip; null stays the honest never-ran line.
  test('read voices last_run mint + first artifact in the suffix', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render(
      { verb: 'read' },
      {
        verb: 'read', bench: 'main', ok: true, rev: 47,
        stages: [
          { id: 's_1', card: 'qwen3-tts', engine: 'comfyui', last_run: { run_id: 'run-abc', status: 'completed', artifacts: ['output/run-abc/tts/f.flac'], export_name: 'night-keeper', export_path: '/mnt/data/models/audio/voices/night-keeper_17.qvoice' } },
          { id: 's_2', card: 'qwen3-tts', engine: 'comfyui', last_run: { run_id: 'run-def', status: 'completed', artifacts: [{ path: './output/run-def/tts/f.flac' }] } },
          { id: 's_3', card: 'image-gen', engine: 'comfyui', last_run: null },
        ],
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'bench read → rev 47\nstages: 3\n  s_1 — qwen3-tts [comfyui] — last_run run-abc (completed, 1 artifact(s), export \'night-keeper\' @ /mnt/data/models/audio/voices/night-keeper_17.qvoice, output/run-abc/tts/f.flac)\n  s_2 — qwen3-tts [comfyui] — last_run run-def (completed, 1 artifact(s), output/run-def/tts/f.flac)\n  s_3 — image-gen [comfyui] — last_run null (draft has no run in the window)',
    )
  })

  // THE NULL-VOICE TRUTH (the invisible-press burn, 2026-10-20): the
  // operator's read printed "runs window: ... matched 2" beside
  // "last_run null (draft has no run in the window)" on every stage —
  // a contradiction that hid a COMPLETED press (its digest named the
  // card skeleton, not the bench row). The two nulls are different
  // diseases and the voice must say which: runs exist but none name
  // this stage (matched > 0) vs the draft truly has no run (matched 0).
  test('read voices the null truth by the matched count — runs that name no stage never read as a run-less draft', () => {
    const tool = meliteConstruct(stubEstate())
    const base = {
      verb: 'read', bench: 'main', ok: true, rev: 6,
      stages: [{ id: 's_0', card: 'image-gen', engine: 'comfyui', last_run: null }],
    }
    const named = tool.output.render(
      { verb: 'read' },
      { ...base, runs: { checked: 100, total: 1808, matched: 2 } } as never,
    ) as Array<{ text?: string }>
    const namedText = named.map((p) => p?.text ?? '').join('\n')
    assert.ok(
      namedText.includes('s_0 — image-gen [comfyui] — last_run null (no run in the window names this stage)'),
      'matched>0 + a null stage says NO RUN NAMES THIS STAGE, never "draft has no run"',
    )
    assert.ok(namedText.includes('matched 2'), 'the window facts ride the same read')
    const bare = tool.output.render(
      { verb: 'read' },
      { ...base, runs: { checked: 100, total: 1808, matched: 0 } } as never,
    ) as Array<{ text?: string }>
    assert.ok(
      (bare.map((p) => p?.text ?? '').join('\n')).includes('last_run null (draft has no run in the window)'),
      'matched 0 keeps the never-ran voice',
    )
  })

  test('an empty bench says so — never silence', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render(
      { verb: 'load' },
      { verb: 'load', bench: 'main', ok: true, rev: 41, stages: [] } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'bench load → rev 41\nstages: (bench is empty)',
    )
  })

  test('undo/load disclose the restored stages (the probing cure)', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render(
      { verb: 'undo' },
      { verb: 'undo', bench: 'main', ok: true, rev: 48, stages: [{ id: 's_1', card: 'image-gen', engine: 'comfyui' }] } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'bench undo → rev 48\nstages: 1\n  s_1 — image-gen [comfyui]',
    )
  })

  // the placeholder arms: a malformed stage row renders honest '?'
  // cells, never a crash and never silence (the render wall's law)
  test('malformed stage rows render placeholders, never crash', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render(
      { verb: 'read' },
      {
        verb: 'read', bench: 'main', ok: true, rev: 3,
        stages: [
          { engine: 'mcp:blender' },
          { id: 's_9', card_id: 'image-gen' },
        ],
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'bench read → rev 3\nstages: 2\n  ? — ? [mcp:blender]\n  s_9 — image-gen [?]',
    )
  })

  test('missing verb/rev fall back to ?', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render({ verb: 'read' }, { bench: 'main', ok: true } as never) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'bench ? → rev ?')
  })

  test('an empty error renders the success line', () => {
    const tool = meliteConstruct(stubEstate())
    const parts = tool.output.render(
      { verb: 'read' },
      { verb: 'read', bench: 'main', error: '' } as never,
    ) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'bench read → rev ?')
  })
})

describe('projectStages — the wire projection', () => {
  test('non-arrays project to empty', () => {
    assert.deepEqual(projectStages(undefined), [])
    assert.deepEqual(projectStages('x'), [])
    assert.deepEqual(projectStages({}), [])
  })

  test('rows normalize, default, and strip presentation extras', () => {
    assert.deepEqual(
      projectStages([
        {
          id: 'a', engine: 'custom', params: { p: 1 },
          inputs: { x: { stage: 's', output: 'o' } }, outputs: { default: 'video' },
          expected: { x: 'text' },
          card: 'c', provenance: 'p', runStatus: 'r', result: 1, title: 't',
        },
        { id: 'b', engine: 5, params: 'nope', inputs: null, outputs: ['arr'], expected: 'nope' },
        { engine: '', params: null, inputs: ['arr'], outputs: null, expected: null },
        { id: 7, params: ['arr'], inputs: 'nope', outputs: 42, expected: ['arr'] },
        'junk', null, ['nested'], 42,
      ]),
      [
        {
          id: 'a', engine: 'custom', params: { p: 1 },
          inputs: { x: { stage: 's', output: 'o' } }, outputs: { default: 'video' },
          expected: { x: 'text' }, card: 'c',
        },
        { id: 'b', engine: 'comfyui', params: {}, inputs: {}, outputs: { default: 'image' } },
        { id: '', engine: 'comfyui', params: {}, inputs: {}, outputs: { default: 'image' } },
        { id: '7', engine: 'comfyui', params: {}, inputs: {}, outputs: { default: 'image' } },
      ],
    )
  })
})

describe('melite_construct — THE INTERFACE LAW (the agent-mode breakdown, 2026-09-13)', () => {
  // The description names the run door the mount owns: the browser
  // face ends the contract AT THE BENCH (the user's Run press is the
  // start door — melite_flow is not the browser agent's verb); the
  // headless face keeps the delegated-operator phrasing. A phantom
  // verb in the description sent the caught session hunting a run
  // door it was never given.
  test('the browser face (default) never names melite_flow', async () => {
    const tool = meliteConstruct(stubEstate())
    assert.ok(!tool.description.includes('melite_flow'), tool.description)
    assert.ok(tool.description.includes('You compose the flow and edit its state here, live with the user'), tool.description)
    assert.ok(tool.description.includes("runs start at the user's Run press, never yours"), tool.description)
  })

  test('the delegated face keeps the delegated-operator phrasing', async () => {
    const tool = meliteConstruct(stubEstate(), { delegated: true })
    assert.ok(tool.description.includes('melite_flow runs what is here'), tool.description)
  })
})

describe('melite_construct read — last_run (the lookup the agent cannot do itself)', () => {
  // Runs are born from drafts (the start door refuses cardless
  // runs), so the bench's draft_id joins to the runs list
  // server-side — the read annotates, the agent never hunts.
  const BENCH = {
    session: 'session-chat7', rev: 2, intent: 'bench', draft_id: 'bench-main',
    stages: [{ id: 's_0', card: 'image-gen' }, { id: 's_1', card: 'image-edit' }],
    log: [],
  }
  const RUNS = {
    count: 3,
    runs: [
      { run_id: 'run-old-0001', draft_id: 'bench-main', status: 'done', created_at: 100, thumbnail: 't1', artifacts: [{ name: 'a.png' }], stage_ids: ['s_0'] },
      { run_id: 'run-new-0002', draft_id: 'bench-main', status: 'done', created_at: 200, thumbnail: 't2', artifacts: [{ name: 'b.png' }], stage_ids: ['s_0', 's_1'] },
      { run_id: 'run-foreign-0003', draft_id: 'bench-other', status: 'done', created_at: 300, thumbnail: 't3', artifacts: [{ name: 'c.png' }], stage_ids: ['s_0', 's_1'] },
    ],
  }

  test('each stage carries the NEWEST run that names it; foreign drafts never leak', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return BENCH
      if (lane === 'runsList' && args[0] === '100') return RUNS
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const stages = out.stages as Array<Record<string, unknown>>
    assert.equal(stages.length, 2)
    for (const s of stages) {
      const last = s.last_run as Record<string, unknown>
      assert.equal(last.run_id, 'run-new-0002')
      assert.equal(last.status, 'done')
      assert.deepEqual(last.artifacts, [{ name: 'b.png' }])
    }
  })

  test('a run that composed only one stage stamps only that stage — the TTS stage never advertises a PNG (commission 015 §6 finding 6)', async () => {
    // The roadmap scenario verbatim: the image-edit run topped the
    // draft, and the shared stamp told a human the TTS stage last
    // produced a PNG. Membership in the run's stage_ids digest is
    // now the only ticket to a stamp.
    const seen = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return BENCH
      if (lane === 'runsList' && args[0] === '100') return {
        count: 1,
        runs: [
          { run_id: 'run-img-0001', draft_id: 'bench-main', status: 'done', created_at: 200, thumbnail: 't2', artifacts: [{ name: 'b.png' }], stage_ids: ['s_0'] },
        ],
      }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(seen.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const stages = out.stages as Array<Record<string, unknown>>
    assert.equal((stages[0].last_run as Record<string, unknown>).run_id, 'run-img-0001')
    assert.equal(stages[1].last_run, null)
  })

  test('a run with no stage_ids digest (pre-fix sidecar) stamps nothing — unknown membership is no stamp', async () => {
    const seen = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return BENCH
      if (lane === 'runsList' && args[0] === '100') return {
        count: 1,
        runs: [
          { run_id: 'run-legacy-0001', draft_id: 'bench-main', status: 'done', created_at: 200, thumbnail: 't2', artifacts: [{ name: 'b.png' }] },
        ],
      }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(seen.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    for (const s of out.stages as Array<Record<string, unknown>>) {
      assert.equal(s.last_run, null)
    }
    // the facts window still shows the draft ran — the evidence is
    // in the totals, never faked onto a stage row.
    assert.deepEqual(out.runs, { checked: 1, total: 1, matched: 1 })
  })

  test('a stage with no id takes no stamp — the join needs a name to match on', async () => {
    // An id-less stage row is an object (past the malformed guard) but
    // names nothing, so even the newest matching run stamps nothing.
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { ...BENCH, stages: [{ card: 'image-gen' }] }
      if (lane === 'runsList' && args[0] === '100') return RUNS
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const stages = out.stages as Array<Record<string, unknown>>
    assert.equal(stages.length, 1)
    assert.equal(stages[0].last_run, null)
  })

  test('a failed runs call degrades to verbatim stages with NO runs key — lookup-failed stays distinct', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return BENCH
      throw new Error('runs seat down')
    })
    const out = await meliteConstruct(estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.equal(out.ok, true)
    assert.deepEqual(out.stages, BENCH.stages)
    assert.ok(!('runs' in out), 'no runs key when the lookup itself died')
  })

  test('no draft match — explicit null + window facts (never-ran vs window-miss reads off the totals)', async () => {
    const norun = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return BENCH
      if (lane === 'runsList' && args[0] === '100') return { count: 1372, runs: [RUNS.runs[2]] }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(norun.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    for (const s of out.stages as Array<Record<string, unknown>>) {
      assert.equal(s.last_run, null)
    }
    // total >> checked: the agent can see the window may have missed.
    assert.deepEqual(out.runs, { checked: 1, total: 1372, matched: 0 })
    const nodraft = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return ROW
      throw new Error('unmocked lane ' + lane)
    })
    const out2 = await meliteConstruct(nodraft.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out2.stages, ROW.stages)
  })

  test('a hit carries the window facts too', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return BENCH
      if (lane === 'runsList' && args[0] === '100') return { count: 3, runs: RUNS.runs }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.runs, { checked: 3, total: 3, matched: 2 })
  })
})

// THE JOURNEY HOP (W-12, 2026-11-05): the burn was felt one hop
// downstream of the runs row — a read ~1 s after a [queued] press
// rendered `a0 — last_run run-… (failed)` on the BENCH FACE
// (withLastRun → summaryOf :703 carries the row's own word into the
// render suffix). The estate-side family (runs-list.spec.ts) judges
// the row face; this family judges the hop itself: whatever word the
// cured row serves, the bench face voices — a non-terminal word stays
// non-terminal through construct, and the settle flip crosses the hop.
describe('W-12 — the queued window never reads failed on the bench face', () => {
  // The burn's own bench shape: stage `a0` on the conversation's bench,
  // and the run id the W-12 receipt quotes verbatim.
  const BENCH = {
    session: 'session-chat7', rev: 9, intent: 'bench', draft_id: 'bench-main',
    stages: [{ id: 'a0', card: 'image-gen', engine: 'comfyui' }],
    log: [],
  }
  const RUN_ID = 'run-936922a1d3fd-abdf75fd'
  // The runs-list row as the CURED read (667630ed0) serves it: the
  // sidecar's word verbatim — the settle rewrites it later.
  const row = (status: string): Record<string, unknown> => ({
    run_id: RUN_ID, draft_id: 'bench-main', status, created_at: 1000,
    thumbnail: '', artifacts: [], stage_ids: ['a0'],
  })
  const faceOf = async (status: string): Promise<string> => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return BENCH
      if (lane === 'runsList' && args[0] === '100') return { count: 1, runs: [row(status)] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const parts = tool.output.render({ verb: 'read' }, out as never) as Array<{ text?: string }>
    return parts.map((p) => p?.text ?? '').join('\n')
  }

  test('a QUEUED row voices the queued word on the bench face — the terminal word never renders in the queue window', async () => {
    const face = await faceOf('queued')
    assert.ok(
      face.includes(`a0 — image-gen [comfyui] — last_run ${RUN_ID} (queued)`),
      face,
    )
    assert.ok(!face.includes('failed'), 'a non-terminal window never voices the terminal word — ' + face)
  })

  test('a RUNNING row voices the running word — the burn shape rides the hop too', async () => {
    const face = await faceOf('running')
    assert.ok(
      face.includes(`a0 — image-gen [comfyui] — last_run ${RUN_ID} (running)`),
      face,
    )
    assert.ok(!face.includes('failed'), 'the old override folded running to failed — it must not re-fold here — ' + face)
  })

  test('the same id, later settled-completed, re-reads completed on the bench face — the settle flip crosses the hop', async () => {
    let status = 'queued'
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return BENCH
      if (lane === 'runsList' && args[0] === '100') return { count: 1, runs: [row(status)] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const read = async (): Promise<string> => {
      const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
      const parts = tool.output.render({ verb: 'read' }, out as never) as Array<{ text?: string }>
      return parts.map((p) => p?.text ?? '').join('\n')
    }
    assert.ok((await read()).includes(`last_run ${RUN_ID} (queued)`), 'the queue window voices queued first')
    status = 'completed' // the settle rewrote the sidecar — same id, later read
    const settled = await read()
    assert.ok(settled.includes(`a0 — image-gen [comfyui] — last_run ${RUN_ID} (completed)`), settled)
    assert.ok(!settled.includes('failed'), 'a settled run voices its own word — ' + settled)
  })
})

describe('melite_construct projectStages — card rides (the phantom-refusal cure)', () => {
  // The kinds pass derives wired-input kinds from the card's own
  // flowKinds — a projection that stripped `card` manufactured
  // "wired but untyped" refusals on correctly-wired card stages.
  // STAGE_KEYS admit card; only the true extras strip.
  test('card survives, provenance/runStatus/result/title do not', async () => {
    const { projectStages } = await import('../src/tools/melite-construct.ts')
    const out = projectStages([{
      id: 's_1', card: 'image-edit', engine: 'comfyui',
      params: { image1: '$image1' }, inputs: { image1: { stage: 's_0', output: 'default' } },
      provenance: 'x', runStatus: 'done', result: {}, title: 't',
    }])
    assert.equal(out.length, 1)
    assert.equal(out[0]!.card, 'image-edit')
    assert.deepEqual(out[0]!.inputs, { image1: { stage: 's_0', output: 'default' } })
    for (const k of ['provenance', 'runStatus', 'result', 'title']) {
      assert.ok(!(k in out[0]!), k + ' strips')
    }
  })

  test('validate forwards card in flow_inline — derivation can fire', async () => {
    const { estate, seen } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') {
        return {
          session: 'session-chat7', rev: 1, intent: 'bench',
          stages: [{
            id: 's_1', card: 'image-edit', engine: 'comfyui',
            params: { image1: '$image1', prompt: 'suit' },
            inputs: { image1: { stage: 's_0', output: 'default' } },
          }],
          log: [],
        }
      }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, true)
    const post = seen.find((r) => r.lane === 'runsValidate')
    const stages = ((post!.args[0] as Record<string, unknown>).flow_inline as Record<string, unknown>).stages as Array<Record<string, unknown>>
    assert.equal(stages[0]!.card, 'image-edit')
  })
})

describe('melite_construct add_stage — expected/outputs ride (the load workaround, retired)', () => {
  // The door admits expected + outputs (ADD_KEYS) but the verb
  // dropped them — chained benches had to route through load to
  // hand-type kinds. Stated keys forward; absent keys stay absent.
  test('stated expected/outputs forward verbatim', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 7, stage: 's2' }
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 7, intent: '', stages: [{ id: 's2' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      {
        verb: 'add_stage', card: 'c', expect_rev: 6,
        params: { p: 1 }, inputs: { x: { stage: 's_0', output: 'default' } },
        expected: { x: 'image' }, outputs: { default: 'image' },
      },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.stage, 's2')
    const add = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    assert.ok(add, 'the add_stage write fired')
    assert.deepEqual(add!.args[2], {
      card: 'c', params: { p: 1 }, inputs: { x: { stage: 's_0', output: 'default' } },
      expected: { x: 'image' }, outputs: { default: 'image' }, expect_rev: 6,
    })
  })

  test('stated non-records refuse LOUD at the arg gate — never accept-and-ignore to the bench', async () => {
    const { estate } = mockEstate(() => {
      throw new Error('must not reach the bench')
    })
    const tool = meliteConstruct(estate)
    // type:object in the schema refuses null/[] before execute —
    // junk the bench's isRecord would shed silently never travels.
    await assert.rejects(
      tool.execute(
        { verb: 'add_stage', card: 'c', expect_rev: 6, expected: null, outputs: [] },
        exec(),
      ),
      (e: unknown) => e instanceof Error && /must be an object/.test(e.message),
    )
  })
})

// ── THE ARRAY WIRE GUARD (P2, ROADMAP §36.4) — commission 034's
// forensic receipts: arrays under free-form params corrupt on the
// wire (`{item:[…]}` non-empty, `""` empty). The tool-boundary
// unwrap runs BEFORE any request: the bench stores clean.
describe('melite_construct execute — the array wire guard', () => {
  test('THE RECEIPT: add_stage params carrying {item:[…]} POST unwrapped', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 3, intent: '', stages: [], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      if (lane === 'benchVerb') return {}
      return {}
    })
    const tool = meliteConstruct(estate)
    const r = (await tool.execute(
      {
        verb: 'add_stage', card: 'h3-timeline', expect_rev: 3,
        params: { ref_images: { item: ['/a.png'] }, prompt: 'x' },
      },
      exec(),
    )) as Record<string, unknown>
    assert.equal(r.ok, true)
    const add = seen.find((s) => s.lane === 'benchVerb' && s.args[1] === 'add_stage')
    assert.ok(add !== undefined, 'the add_stage request fired')
    assert.deepEqual(
      (add.args[2] as { params: Record<string, unknown> }).params.ref_images,
      ['/a.png'],
      'the wrapped array reached the estate UNWRAPPED',
    )
    assert.equal((add.args[2] as { params: Record<string, unknown> }).params.prompt, 'x')
  })

  test('load stages[].params unwrap at depth; the "" arm stays for the card seat', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'runsValidate') return { ok: true }
      return { rev: 5, stages: [] }
    })
    const tool = meliteConstruct(estate)
    await tool.execute(
      {
        verb: 'load', expect_rev: 4,
        stages: [{ id: 's0', card: 'h3-timeline', params: { calls: { item: [{ text: 'hi' }] } } }],
      },
      exec(),
    )
    const ensure = seen.find((s) => s.lane === 'benchEnsure')
    assert.ok(ensure !== undefined)
    const row = (ensure.args[0] as { stages: Array<{ params: Record<string, unknown> }> }).stages[0]
    assert.deepEqual(row.params.calls, [{ text: 'hi' }])
  })

  test('FROZEN wire args never throw and still unwrap (the 035 freeze receipt: Cannot assign to read only property params)', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 1, intent: '', stages: [], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      return {}
    })
    const tool = meliteConstruct(estate)
    // the wire may deliver the args object read-only — the rebind
    // law walks a copy and never writes to the caller's object
    const frozen = Object.freeze({ verb: 'add_stage', card: 'c', expect_rev: 1, params: { tags: { item: ['a'] } } })
    let threw: unknown = null
    try { await tool.execute(frozen, exec()) } catch (e) { threw = e }
    assert.equal(threw, null)
    const add = seen.find((s) => s.lane === 'benchVerb' && s.args[1] === 'add_stage')
    assert.deepEqual((add!.args[2] as { params: Record<string, unknown> }).params.tags, ['a'])
  })

  test('a genuine object with an item key never unwraps (two keys = not the wire shape)', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 1, intent: '', stages: [], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      return {}
    })
    const tool = meliteConstruct(estate)
    await tool.execute(
      { verb: 'add_stage', card: 'c', expect_rev: 1, params: { meta: { item: 'label', x: 1 } } },
      exec(),
    )
    const add = seen.find((s) => s.lane === 'benchVerb' && s.args[1] === 'add_stage')
    assert.deepEqual(
      (add!.args[2] as { params: Record<string, unknown> }).params.meta,
      { item: 'label', x: 1 },
    )
  })
})

describe("add_stage — the empty-stage drop (035 attempt-14 Probe-A strand)", () => {
  test("a shared-schema stage:'' rides dropped (never the full refusal)", async () => {
    const seen = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { rev: 1, stages: [] }
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 2, stage: 's_0' }
      if (lane === 'runsValidate') return { ok: true }
      return undefined
    })
    const tool = meliteConstruct(seen.estate)
    const out = await tool.execute({ verb: 'add_stage', card: 'image-gen', stage: '', params: { prompt: 'x' }, expect_rev: 1 }, exec()) as Record<string, unknown>
    assert.equal(out['stage'], 's_0')
    const add = seen.seen.find((c) => c.lane === 'benchVerb' && c.args[1] === 'add_stage')
    assert.equal((add!.args[2] as Record<string, unknown>)['stage'], undefined)
  })
  test("a NON-EMPTY stage on add_stage still refuses loud (addressing intent)", async () => {
    const seen = mockEstate(() => undefined)
    const tool = meliteConstruct(seen.estate)
    const out = await tool.execute({ verb: 'add_stage', card: 'image-gen', stage: 's_9', params: { prompt: 'x' } }, exec()) as Record<string, unknown>
    assert.match(String(out['error']), /assigns its own stage id/)
  })
});

describe("read — the params summary (035 attempt-15 gap #3)", () => {
  test("stage rows carry model + array shapes for probe verification", async () => {
    const seen = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') {
        return {
          rev: 2, draft_id: 'd1',
          stages: [{ id: 's_0', card: 'h3-timeline', engine: 'comfyui', params: { model: 'h3', ref_images: ['/a.png', '/b.png'], prompt: 'x' } }],
        }
      }
      if (lane === 'runsList' && args[0] === '100') return { runs: [], count: 0 }
      return undefined
    })
    const tool = meliteConstruct(seen.estate)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const row = (out['stages'] as Array<Record<string, unknown>>)[0]!
    assert.equal(row['model'], 'h3')
    assert.deepEqual(row['arrays'], { ref_images: 'array[2]' })
  })
});

describe("read — the params summary guard paths", () => {
  test("a wrapped {item} array is named 'wrapped{item}' (the Probe-B receipt shape)", async () => {
    const seen = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') {
        return {
          rev: 2, draft_id: 'd1',
          stages: [{ id: 's_0', card: 'h3', params: { ref_images: { item: ['/a.png'] } } }],
        }
      }
      if (lane === 'runsList' && args[0] === '100') return { runs: [], count: 0 }
      return undefined
    })
    const tool = meliteConstruct(seen.estate)
    const out = await tool.execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const row = (out['stages'] as Array<Record<string, unknown>>)[0]!
    assert.deepEqual(row['arrays'], { ref_images: 'wrapped{item}' })
  })
})

describe('read enrichment defensive paths', () => {
  test('empty stages and absent draft ids skip the run lookup', async () => {
    const seen = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { rev: 1, stages: [] }
      throw new Error('unexpected lane ' + lane)
    })
    const out = await meliteConstruct(seen.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.stages, [])
    assert.equal(seen.seen.length, 1)
    const second = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { rev: 1, draft_id: '', stages: [{ id: 's' }] }
      throw new Error('unexpected lane ' + lane)
    })
    const out2 = await meliteConstruct(second.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out2.stages, [{ id: 's' }])
    assert.equal(second.seen.length, 1)
  })

  test('malformed run rows and stage rows degrade to explicit null receipts', async () => {
    const seen = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return {
        rev: 1, draft_id: 'd1', stages: [null, 'bad', { id: 's', params: { model: 'm', list: [1], wrapped: { item: [] } } }],
      }
      if (lane === 'runsList' && args[0] === '100') return {
        count: 5, runs: [null, [], { draft_id: 'other' }, { draft_id: 'd1', created_at: 'old' }],
      }
      throw new Error('unexpected lane ' + lane)
    })
    const out = await meliteConstruct(seen.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.runs, { checked: 4, total: 5, matched: 1 })
    const rows = out.stages as unknown[]
    assert.equal(rows[0], null)
    assert.equal(rows[1], 'bad')
    assert.deepEqual((rows[2] as Record<string, unknown>).arrays, { list: 'array[1]', wrapped: 'wrapped{item}' })
    assert.equal((rows[2] as Record<string, unknown>).model, 'm')
  })

  test('non-array run envelopes and nonnumeric totals use the honest fallback', async () => {
    const badRows = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { rev: 1, draft_id: 'd1', stages: [{ id: 's' }] }
      if (lane === 'runsList' && args[0] === '100') return { runs: {}, count: 4 }
      throw new Error('unexpected lane ' + lane)
    })
    const out = await meliteConstruct(badRows.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.stages, [{ id: 's' }])
    assert.equal('runs' in out, false)
    const badTotal = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { rev: 1, draft_id: 'd1', stages: [{ id: 's' }] }
      if (lane === 'runsList' && args[0] === '100') return { runs: [], count: 'many' }
      throw new Error('unexpected lane ' + lane)
    })
    const out2 = await meliteConstruct(badTotal.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out2.runs, { checked: 0, total: 0, matched: 0 })
  })

  test('a no-match read preserves malformed stage rows and exercises no-match summaries', async () => {
    const seen = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { rev: 1, draft_id: 'd1', stages: [null, 'bad', { id: 's', params: null }] }
      if (lane === 'runsList' && args[0] === '100') return { runs: [{ draft_id: 'other' }], count: 1 }
      throw new Error('unexpected lane ' + lane)
    })
    const out = await meliteConstruct(seen.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    assert.deepEqual(out.stages, [null, 'bad', { id: 's', params: null, last_run: null }])
  })

  test('the newest matching run carries export fields and skips malformed stages', async () => {
    const seen = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return {
        rev: 1, draft_id: 'd1', stages: [null, { id: 's', params: { model: 'm' } }],
      }
      if (lane === 'runsList' && args[0] === '100') return {
        count: 2, runs: [
          { draft_id: 'd1', run_id: 'old', created_at: 1, stage_ids: ['s'] },
          { draft_id: 'd1', run_id: 'new', created_at: 2, status: 'done', artifacts: ['a'], export_name: 'voice', export_path: '/voice.qvoice', stage_ids: ['s'] },
        ],
      }
      throw new Error('unexpected lane ' + lane)
    })
    const out = await meliteConstruct(seen.estate).execute({ verb: 'read' }, exec()) as Record<string, unknown>
    const rows = out.stages as unknown[]
    assert.equal(rows[0], null)
    assert.deepEqual((rows[1] as Record<string, unknown>).last_run, {
      run_id: 'new', status: 'done', created_at: 2, artifacts: ['a'], export_name: 'voice', export_path: '/voice.qvoice',
    })
  })
})

describe('construct render defensive paths', () => {
  test('renders sparse stage receipts and run-window facts', () => {
    const tool = meliteConstruct(stubEstate())
    const render = (stages: unknown[], runs: unknown): string => (tool.output.render({}, {
      verb: 'read', rev: 2, stages, runs,
    } as never) as Array<{ text?: string }>).map((part) => part.text ?? '').join('\n')
    const text = render([
      { id: 's', card: 'c', engine: 'e', last_run: { run_id: 'r', status: '', artifacts: [], export_name: '', export_path: '' } },
    ], { checked: 1, total: 3, matched: 0 })
    assert.ok(text.includes('runs window: checked 1, total 3, matched 0'))
    assert.ok(text.includes('last_run r ()'))
    const noArtifacts = render([{ id: 's', last_run: { run_id: 'r' } }], {})
    assert.ok(noArtifacts.includes('last_run r (?)'))
    const nameOnly = render([{ id: 's', last_run: { run_id: 'r', export_name: 'name' } }], {})
    assert.ok(nameOnly.includes("export 'name'"))
    const pathOnly = render([{ id: 's', last_run: { run_id: 'r', export_path: '/p' } }], {})
    assert.ok(pathOnly.includes('export /p'))
    const missingFacts = render([], {})
    assert.ok(missingFacts.includes('checked ?, total ?, matched ?'))
  })

  test('validate accepts a non-string bench intent and supplies the fallback flow id', async () => {
    const seen = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { rev: 1, intent: 7, stages: [{ id: 's' }] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unexpected lane ' + lane)
    })
    const out = await meliteConstruct(seen.estate).execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out.compiles, true)
    const post = seen.seen.find((row) => row.lane === 'runsValidate')
    assert.equal((post!.args[0] as { flow_inline: { id: string } }).flow_inline.id, 'bench')
  })
})

describe('melite_construct presentationMeta — the native flow-link channel', () => {
  // THE LINK CONTRACT (operator 2026-11-05: "when it edits a flow,
  // the clickable link opens the right sidebar flow view"): the
  // client's ConstructCard derives its flow-link address from the
  // persisted meta alone ({bench} — never prose, never args). These
  // arms execute for REAL through the mocked estate, then project
  // the returned value — the wall pins the value→meta agreement,
  // not the projector's shape in isolation.
  function metaOf(tool: ReturnType<typeof meliteConstruct>, value: unknown): Record<string, unknown> {
    return tool.output.presentationMeta!({} as never, value as never) as Record<string, unknown>
  }

  test('a read projects its bench key — the link opens the conversation flow, never main by default', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet' && args[0] === 'session-chat7') return { ...ROW, session: 'session-chat7' }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'read' }, fakeExec(AbortSignal.timeout(5000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal(out.bench, 'session-chat7')
    assert.deepEqual(metaOf(tool, out), { bench: 'session-chat7' })
  })

  test('a mutation projects its bench key — the edited flow is the linked flow', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 6, stage: 's1', patched: ['p'] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's1', params: { p: 1 }, expect_rev: 5 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.bench, 'session-chat7')
    assert.deepEqual(metaOf(tool, out), { bench: 'session-chat7' })
  })

  test('a refusal still projects the bench — the flow is where the operator looks next', async () => {
    const { estate } = mockEstate(() => {
      throw new RemoteError('bench/cas-conflict', 'bench moved: rev is 7, caller held 6', {
        current_rev: 7,
        expect_rev: 6,
      })
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's1', params: {}, expect_rev: 6 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.ok, false)
    const meta = metaOf(tool, out)
    assert.equal(meta.bench, 'session-chat7')
    assert.ok(String(meta.error).includes('bench moved'), 'the error rides beside the bench')
  })

  // (flow-link F2 sweep, 2026-11-06) the universal 'bench key
  // survives every verb' was judged on 2 of 9 verbs (read + patch).
  // This sweep executes EVERY remaining verb through the mocked
  // estate and deep-equals the projected meta to {bench} — the
  // link contract holds per-verb, not by accident of the two arms.
  test('EVERY verb projects its bench key — load, add_stage, remove_stage, clear, rewire, undo, validate', async () => {
    const { estate } = mockEstate((lane, args) => {
      const verb = args[1]
      if (lane === 'benchGet') return { ...ROW, session: 'session-chat7' }
      if (lane === 'benchEnsure') return { rev: 5, stages: [] }
      if (lane === 'benchVerb') {
        if (verb === 'add_stage') return { rev: 5, stage: 's1', added: true }
        if (verb === 'remove_stage') return { rev: 7, removed: 's1' }
        if (verb === 'clear') return { rev: 12, cleared: 6 }
        if (verb === 'rewire') return { rev: 8, wired: true }
        if (verb === 'undo') return { rev: 10, undone: 2 }
      }
      if (lane === 'runsValidate') return { ok: true, valid: true }
      throw new Error('unmocked lane ' + lane + ' ' + String(verb))
    })
    const tool = meliteConstruct(estate)
    const cases: Array<[string, Record<string, unknown>, string]> = [
      // (audit-followups M1, 2026-11-06) add_stage rides the sweep too
      // — the title always named it; the cases array never did.
      ['add_stage', { verb: 'add_stage', card: 'image-gen', expect_rev: 4 }, 'session-chat7'],
      ['load', { verb: 'load', stages: [], intent: 'x', expect_rev: 4 }, 'session-chat7'],
      ['remove_stage', { verb: 'remove_stage', stage: 's1', expect_rev: 7 }, 'session-chat7'],
      ['clear', { verb: 'clear', expect_rev: 11 }, 'session-chat7'],
      ['rewire', { verb: 'rewire', stage: 's1', input: 'in', expect_rev: 8 }, 'session-chat7'],
      ['undo', { verb: 'undo', n: 2, expect_rev: 11 }, 'session-chat7'],
      ['validate', { verb: 'validate' }, 'session-chat7'],
    ]
    for (const [name, input, bench] of cases) {
      const out = await tool.execute(input, exec()) as Record<string, unknown>
      assert.equal(out.bench, bench, `${name} carries its bench key`)
      assert.deepEqual(metaOf(tool, out), { bench }, `${name} projects exactly {bench}`)
    }
  })

  test('the projector is pure and minimal — junk bench omitted, never a dead link', async () => {
    const tool = meliteConstruct(stubEstate())
    assert.deepEqual(metaOf(tool, { verb: 'read', bench: 'main', rev: 1 }), { bench: 'main' })
    assert.deepEqual(metaOf(tool, { verb: 'read', bench: 'main', error: '' }), { bench: 'main' })
    assert.deepEqual(metaOf(tool, { verb: 'read', bench: '', rev: 1 }), {})
    // (audit-followups W7, 2026-11-06) a NON-STRING bench drops
    // silently through the typeof guard — never a dead link
    assert.deepEqual(metaOf(tool, { verb: 'read', bench: 7, rev: 1 }), {})
    assert.deepEqual(metaOf(tool, { verb: 'read', rev: 1 }), {})
    assert.deepEqual(metaOf(tool, undefined), {})
    // purity: the same frozen value projects the same payload twice
    const value = { verb: 'patch', bench: 's_chat7', rev: 6 }
    assert.deepEqual(metaOf(tool, value), metaOf(tool, value))
  })
})

// ── THE SPELL VOICE (session 90a0b920, 2026-11-09) ─────────────────
// The operator's burn: the agent spelled params {input: '$input'} with
// nothing wired and learned it only at the run's spell gate. The
// mutation answer now carries the judgement at COMPOSE time: every
// $-token named with its ONE resolution source — the wired input (a
// channel) or a run-request initial (nothing wired; the run must
// declare it). No spells → no key (the payload stays lean).
describe('melite_construct — THE SPELL VOICE (compose-time spell judgement)', () => {
  const ADD_ANSWER = { rev: 9, stage: 's_2' }

  test('add_stage: a WIRED $spell resolves to its channel (stage.output)', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return ADD_ANSWER
      if (lane === 'benchGet') return { session: 's_chat7', rev: 9, intent: '', stages: [{ id: 's_2' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'image-edit',
      params: { image1: '$image1' },
      inputs: { image1: { stage: 's_0', output: 'default' } },
    }, exec()) as Record<string, unknown>
    const spells = out['spells'] as Array<Record<string, unknown>>
    assert.equal(spells.length, 1)
    assert.deepEqual(
      { token: spells[0]!['token'], on: spells[0]!['on'], resolves: spells[0]!['resolves'], via: spells[0]!['via'] },
      { token: '$image1', on: 'image1', resolves: 'channel', via: 's_0.default' },
    )
  })

  test('add_stage: the SESSION BURN shape — an unwired $spell reads request_initial and the voice teaches the two legal sources', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return ADD_ANSWER
      // the AUTO-REV fill (rev-less mutations read once) + the
      // pre-mint gate's own read/compose (F14/F26)
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 1, intent: '', stages: [], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'image-edit',
      params: { input: '$input', input_image: '$input_image' },
    }, exec()) as Record<string, unknown>
    const spells = out['spells'] as Array<Record<string, unknown>>
    assert.equal(spells.length, 2)
    for (const line of spells) {
      assert.equal(line['resolves'], 'request_initial')
      // the voice names the fix: wire inputs.<name> or carry the
      // initial; a real file is an asset path, never a $spell
      assert.match(String(line['via']), /inputs\./)
      assert.match(String(line['via']), /asset path/)
    }
    assert.equal(spells[0]!['token'], '$input')
  })

  test('add_stage: no spells → no spells key (payload stays lean)', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return ADD_ANSWER
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 1, intent: '', stages: [], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'image-gen', params: { prompt: 'a cat' },
    }, exec()) as Record<string, unknown>
    assert.equal('spells' in out, false)
  })

  test('patch: the stage\'s BENCH-HELD inputs are the wired truth — one bounded read, only when spells ride', async () => {
    const seen: Array<{ lane: string; args: unknown[]; timeoutMs?: number }> = []
    const rows = { session: 's_chat7', rev: 5, intent: '', stages: [
      { id: 's_1', card: 'image-gen', inputs: { image: { stage: 's_0', output: 'png' } } },
    ], log: [] }
    const { estate } = fakeEstateRecorded(seen, (lane: string, args: unknown[]) => {
      if (lane === 'benchGet') return rows
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 6, stage: 's_1', patched: ['image'] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({
      verb: 'patch', stage: 's_1', params: { image: '$image' },
    }, fakeExec(AbortSignal.timeout(5000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    const spells = out['spells'] as Array<Record<string, unknown>>
    assert.equal(spells[0]!['resolves'], 'channel')
    assert.equal(spells[0]!['via'], 's_0.png')
    // the bounded read rode the bench (the wired truth), exactly once
    assert.equal(seen.filter((entry) => entry.lane === 'benchGet').length, 1)

    // a spell-free STRING-bearing patch pays exactly ONE read even with
    // the rev in hand: the card's craft law is card-owned, so the door
    // must learn the stage's card before it can apply it (slice 6). It
    // never pays a second read and never opens the spell gate.
    seen.length = 0
    const lean = await tool.execute({
      verb: 'patch', stage: 's_1', params: { prompt: 'a cat' }, expect_rev: 4,
    }, fakeExec(AbortSignal.timeout(5000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal('spells' in lean, false)
    assert.equal(seen.filter((entry) => entry.lane === 'benchGet').length, 1)

    // AUTO-REV: rev-less, the spell-free patch pays exactly ONE read
    // (the fill) and spells stay absent — the spell gate never opens
    seen.length = 0
    const filled = await tool.execute({
      verb: 'patch', stage: 's_1', params: { prompt: 'a cat' },
    }, fakeExec(AbortSignal.timeout(5000), { agent: { id: 'session-chat7' } })) as Record<string, unknown>
    assert.equal('spells' in filled, false)
    assert.equal(seen.filter((entry) => entry.lane === 'benchGet').length, 1)
  })

  test('THE RENDER IS THE MODEL\'S READ: the minted stage id and the spell lines print (the 107-call cure)', async () => {
    const tool = meliteConstruct(stubEstate())
    // add_stage shape: the payload the execute above returns
    const parts = tool.output.render(
      { verb: 'add_stage', card: 'image-edit' },
      {
        verb: 'add_stage', bench: 's_chat7', ok: true, rev: 9, stage: 's_2',
        spells: [
          { token: '$image1', on: 'image1', resolves: 'channel', via: 's_0.default' },
          { token: '$input', on: 'input', resolves: 'request_initial', via: 'input — the run must carry this initial (user attaches it at the Run press), or wire inputs.input {stage, output}; a real file is an asset path from melite_view, never a $spell' },
        ],
      } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.match(text, /minted stage s_2/, 'the minted id prints — the model can address the stage it just added')
    assert.match(text, /patch\/remove_stage\/rewire address it/)
    assert.match(text, /spell \$image1 on image1 → channel s_0\.default/)
    assert.match(text, /spell \$input on input → REQUEST INITIAL — nothing wired/)
    assert.match(text, /wire inputs\.input/)

    // patch shape: no minted id, the stage it touched still names
    const patchParts = tool.output.render(
      { verb: 'patch', stage: 's_1' },
      { verb: 'patch', bench: 's_chat7', ok: true, rev: 6, stage: 's_1', patched: ['image'] } as never,
    ) as Array<{ text?: string }>
    assert.match(patchParts.map((p) => p?.text ?? '').join('\n'), /^stage s_1$/m)

    // spell-free payloads stay lean: no spell lines, no minted line
    const leanParts = tool.output.render(
      { verb: 'add_stage', card: 'image-gen' },
      { verb: 'add_stage', bench: 's_chat7', ok: true, rev: 3, stage: 's_0' } as never,
    ) as Array<{ text?: string }>
    const lean = leanParts.map((p) => p?.text ?? '').join('\n')
    assert.match(lean, /minted stage s_0/)
    assert.doesNotMatch(lean, /spell/)
  })

  test('THE COMPILE VERDICT rides the wiring mutation (the worst-loop cure): a refusing gate teaches in the answer — and NO MINT lands on a refusal (F14/F26)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return ADD_ANSWER
      if (lane === 'benchGet') return { session: 's_chat7', rev: 9, intent: '', stages: [{ id: 's_2' }], log: [] }
      if (lane === 'runsValidate') {
        // the gate's teaching refusal, verbatim as the estate throws it
        return Promise.reject(Object.assign(new Error('flow "bench" stage "s_3": inputs/expected mismatch (wired but untyped: ["image1"]) — every input needs an expected Kind, every expected Kind needs an input — state the wire\'s kind with expected {"image1": "image"} on the stage (the closed Kind vocabulary is ["text","image","video","audio","mesh","num","lora","seg","data"]; a card whose ports declare the slot types itself — load its schema first)'), { code: 'flow/invalid' }))
      }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'image-edit',
      inputs: { image1: { stage: 's_0', output: 'default' } },
    }, exec()) as Record<string, unknown>
    // THE GHOST-STAGE LAW (F14/F26): the refusal answers BEFORE the
    // write — the stage was never minted, nothing landed, nothing to
    // undo. The teaching refusal rides the answer verbatim.
    assert.equal(out.ok, false, 'the gate refused — a value, never a failed mutation')
    assert.equal(out.error_kind, 'compile-refused')
    assert.match(String(out.error), /wired but untyped/)
    assert.match(String(out.error), /"image1": "image"/)
    assert.match(String(out.error), /lora/)
    assert.equal(out.stage, undefined, 'no stage was minted on a refused compose')
    assert.equal(out.rev, undefined, 'no rev moved — the bench was never written')
    assert.equal(out.landing, undefined, 'nothing landed — the landing vocabulary never fires on a refusal')
    assert.equal(seen.some((r) => r.lane === 'benchVerb'), false, 'THE MINT NEVER FIRED — the door was never called')
    // THE RENDER prints a landed write's refusing verdict (the rebase
    // path can still land non-compiling — the post-mint verdict's own
    // arm pins that voice below); here the render face over the
    // landed shape.
    const tool = meliteConstruct(estate)
    const parts = tool.output.render(
      { verb: 'add_stage', card: 'image-edit' },
      { verb: 'add_stage', bench: 's_chat7', ok: true, rev: 9, stage: 's_2', compile_ok: false, compile_error: String(out.error) } as never,
    ) as Array<{ text?: string }>
    const text = parts.map((p) => p?.text ?? '').join('\n')
    assert.match(text, /COMPILE REFUSED/)
    assert.match(text, /the write LANDED/)
    // and the OK face: a compiling wire says so — no validate call needed
    const okParts = tool.output.render(
      { verb: 'add_stage', card: 'image-edit' },
      { verb: 'add_stage', bench: 's_chat7', ok: true, rev: 9, stage: 's_2', compile_ok: true } as never,
    ) as Array<{ text?: string }>
    assert.match(okParts.map((p) => p?.text ?? '').join('\n'), /compiles ✓/)
  })

  test('load: every stage swept, each against its OWN inputs', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchEnsure') return { rev: 2, stages: [{ id: 's_0' }, { id: 's_1' }] }
      if (lane === 'benchGet') return { session: 's_chat7', rev: 2, intent: '', stages: [{ id: 's_0' }, { id: 's_1' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'load', stages: [
        { card: 'image-gen', params: { prompt: 'a cat' } },
        { card: 'image-edit', params: { image1: '$image1' }, inputs: { image1: { stage: 's_0' } } },
      ],
    }, exec()) as Record<string, unknown>
    const spells = out['spells'] as Array<Record<string, unknown>>
    assert.equal(spells.length, 1)
    assert.equal(spells[0]!['stage'], 'image-edit')
    assert.equal(spells[0]!['via'], 's_0.default')
  })
})

// ── THE GPU ECONOMY VERB (operator 2026-10-24: "For GPU usage, you
// should have a tool that makes stuff minimum resolution to save GPU
// time"). The floors ride the REAL card defs (contract-law's own
// loadCardDefs — image-gen declares width/height in the resolution
// group with validating minimum 256, card.ts:119-120), so this wall
// judges the live derivation, never a frozen literal: a card that
// moves its floor moves this wall's expectation source with it.
describe('melite_construct — floor (the declared-minimum resolution clamp)', () => {
  // THE ONE-WRITE WALK (the U5 residual's cure): the walk plans every
  // stage's floors, then lands the WHOLE plan through one benchEnsure
  // (the ensure/load door: CAS + the admission seat judge the entire
  // replacement before anything stores) — a refusal anywhere leaves
  // the bench byte-identical. The door-level atomicity arm lives
  // estate-side (drafts/tests/bench-floor-atomicity.spec.ts, row
  // flows-floor-walk-atomicity); THESE arms pin the clamp semantics
  // at the tool seam.
  const benchOf = (stages: unknown[]): Record<string, unknown> => ({ session: 'session-chat7', rev: 7, stages })

  test('clamps above-floor resolution params to the card-declared minimum, voicing every write', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        return benchOf([{ id: 's_0', card: 'image-gen', params: { model: 'qwen-img-21', width: 2048, height: 1024 } }])
      }
      if (lane === 'benchEnsure') return { rev: 8, session: 'session-chat7', stages: [] }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'floor' }, exec()) as Record<string, unknown>
    const rows = out['stages'] as Array<Record<string, unknown>>
    assert.equal(rows.length, 1)
    const floored = rows[0]!['floored'] as Array<Record<string, unknown>>
    const width = floored.find((f) => f['param'] === 'width')
    const height = floored.find((f) => f['param'] === 'height')
    assert.ok(width, 'width is voiced')
    assert.equal(width!['from'], 2048)
    assert.equal(width!['to'], 256)
    assert.ok(height, 'height is voiced')
    assert.equal(height!['to'], 256)
    // THE WIRE: the whole plan lands through ONE whole-bench write —
    // the ensure door's load arm, CAS-held on the read rev.
    const write = seen.find((r) => r.lane === 'benchEnsure')
    assert.ok(write, 'the floor wrote through the ensure door')
    const doc = write!.args[0] as Record<string, unknown>
    assert.equal(doc['overwrite'], true, 'the non-empty bench rides the overwrite gate under CAS')
    assert.equal(doc['expect_rev'], 7, 'the read rev rides the write (CAS)')
    const posted = doc['stages'] as Array<Record<string, unknown>>
    assert.equal(posted.length, 1)
    assert.deepEqual(posted[0]!['params'], { model: 'qwen-img-21', width: 256, height: 256 })
    assert.equal(out['rev'], 8)
  })

  test('absent resolution params are SET to the floor — the default is never assumed minimal', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        return benchOf([{ id: 's_0', card: 'image-gen', params: { model: 'qwen-img-21', prompt: 'x' } }])
      }
      if (lane === 'benchEnsure') return { rev: 9, session: 'session-chat7', stages: [] }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'floor' }, exec()) as Record<string, unknown>
    const doc = (seen.find((r) => r.lane === 'benchEnsure'))!.args[0] as Record<string, unknown>
    const posted = doc['stages'] as Array<Record<string, unknown>>
    assert.deepEqual(posted[0]!['params'], { model: 'qwen-img-21', prompt: 'x', width: 256, height: 256 })
    const floored = ((out['stages'] as Array<Record<string, unknown>>)[0]!['floored']) as Array<Record<string, unknown>>
    assert.equal(floored.find((f) => f['param'] === 'width')!['from'], '(default)')
  })

  test('at-or-below params ride untouched and a stage can be targeted alone — the replacement carries the rest verbatim', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        return benchOf([
          { id: 's_0', card: 'image-gen', params: { model: 'qwen-img-21', width: 256, height: 256 } },
          { id: 's_1', card: 'image-gen', params: { model: 'qwen-img-21', width: 512, height: 512 } },
        ])
      }
      if (lane === 'benchEnsure') return { rev: 10, session: 'session-chat7', stages: [] }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'floor', stage: 's_1' }, exec()) as Record<string, unknown>
    const rows = out['stages'] as Array<Record<string, unknown>>
    assert.equal(rows.length, 1, 'the named stage is the only voiced target')
    assert.equal(rows[0]!['stage'], 's_1')
    const writes = seen.filter((r) => r.lane === 'benchEnsure')
    assert.equal(writes.length, 1, 'the whole walk is one write')
    const posted = (writes[0]!.args[0] as Record<string, unknown>)['stages'] as Array<Record<string, unknown>>
    assert.equal(posted.length, 2, 'every row re-lands — the replacement is the whole bench')
    assert.deepEqual(posted[0], { id: 's_0', card: 'image-gen', params: { model: 'qwen-img-21', width: 256, height: 256 } },
      'the already-minimal s_0 rides verbatim')
    assert.equal((posted[1]!['params'] as Record<string, unknown>)['width'], 256)
  })

  test('a card with no resolution group (or an unknown card) says so honestly — never a silent no-op write', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') return benchOf([{ id: 's_0', card: 'no-such-card', params: { width: 4096 } }])
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'floor' }, exec()) as Record<string, unknown>
    const rows = out['stages'] as Array<Record<string, unknown>>
    assert.equal(rows.length, 1)
    assert.deepEqual(rows[0]!['floored'], [])
    assert.match(String(rows[0]!['note']), /no resolution group/)
    assert.ok(!seen.some((r) => r.lane === 'benchEnsure'), 'nothing written for a floorless card')
  })

  test('an already-minimal bench writes nothing — the no-op keeps its rev and its log', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') {
        return benchOf([{ id: 's_0', card: 'image-gen', params: { model: 'qwen-img-21', width: 256, height: 256 } }])
      }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'floor' }, exec()) as Record<string, unknown>
    assert.equal(out['rev'], 7, 'the read rev rides unchanged')
    assert.match(String(out['note']), /nothing to write/)
    assert.ok(!seen.some((r) => r.lane === 'benchEnsure'), 'an already-minimal bench never writes')
  })

  test('a named stage that is not on the bench refuses by name', async () => {
    const { estate } = mockEstate((lane) => {
      if (lane === 'benchGet') return benchOf([{ id: 's_0', card: 'image-gen', params: {} }])
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'floor', stage: 's_9' }, exec()) as Record<string, unknown>
    assert.match(String(out['error']), /s_9 is not on the bench/)
  })
})

describe('melite_construct — session 7a82 autopsy laws (P3 + P5, 2026-11-12)', () => {
  // The burn: the operator met "'steps': 25 is outside this lane's
  // range (4–8)" at THEIR OWN Run press — the patch that landed the
  // 25 answered only "bench patch → rev N" (the compile verdict rode
  // wiring mutations alone), and the session's first two constructs
  // carried full params with NO verb, silently READ twice, and the
  // agent believed it was composing. Two laws here: the params-
  // changed patch composes AT AUTHORING TIME (the verdict is a
  // closable value, never a refusal — the write landed), and a
  // payload without a verb refuses loud with the menu.

  test('P3: a params-changed patch carries the compile verdict — an envelope violation speaks at LANDING, never at the operator\'s press', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 12, stage: 's1', patched: ['steps'], stale: true }
      if (lane === 'benchGet') {
        return { session: 'session-chat7', rev: 12, intent: '', stages: [
          { id: 's1', card: 'image-gen', params: { model: 'krea-2', steps: 25 } },
        ], log: [] }
      }
      if (lane === 'runsValidate') {
        throw new RemoteError('runs/flow-compile', 'steps: 25 is outside this lane\'s range (4–8) — the model owns the floor and the ceiling (the declaration, not the form)', { loc: 'flow' })
      }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute(
      { verb: 'patch', stage: 's1', params: { steps: 25 }, expect_rev: 11 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out.ok, true, 'the write landed — the verdict is a value, never a refusal')
    assert.equal(out.rev, 12)
    assert.equal(out.compile_ok, false, 'the compose spoke: the envelope class surfaces at authoring time')
    assert.match(String(out.compile_error), /steps: 25 is outside this lane's range/)
    // THE RENDER IS THE MODEL'S READ: the teaching line prints, or
    // the verdict is a voice nobody hears (the warm-2 law).
    const blocks = tool.output!.render!({ verb: 'patch', stage: 's1' } as never, out as never) as Array<{ type?: string, text?: string }>
    const rendered = blocks.map((b) => b.text ?? '').join('\n')
    assert.ok(
      rendered.includes('COMPILE REFUSED — steps: 25 is outside this lane\'s range') && rendered.includes('the write LANDED'),
      'the render prints the closable violation beside the landed write',
    )
  })

  test('P3 control: an idempotent patch (no staleness) composes nothing — the verdict is owed only when params changed', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 13, stage: 's1', patched: [] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'patch', stage: 's1', params: { steps: 8 }, expect_rev: 12 }, exec()) as Record<string, unknown>
    assert.equal(out.compile_ok, undefined)
    assert.equal(seen.filter((r) => r.lane === 'runsValidate').length, 0, 'no compose on a no-op write')
  })

  test('P5 (slice 5): a call with no verb is refused by the SCHEMA gate — a payload never derives a verb, and a bare call is not exempt', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 3, intent: '', stages: [], log: [] }
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    // the session's exact shape: full add_stage params, no verb
    await assert.rejects(
      tool.execute(
        { card: 'image-gen', params: { model: 'anima', prompt: 'an anime girl' }, expect_rev: 0 },
        exec(),
      ),
      /missing required property "verb"/,
      'the schema gate refuses the payload — the silent read default is dead',
    )
    assert.equal(seen.length, 0, 'nothing was read or written')
  })
})

// ── SLICE 5 — THE SELF-HEALING CONSTRUCT (the agent-flow rework,
// 2026-11-12). The transcript's H6/H7 burns: a refusal spoke internal
// vocabulary with a lying cure, and a scalar spell passed compose and
// compile then refused at RUN admission. The door now derives the
// wire shape at the FIRST door (the write), refuses undeclared lanes
// by name, and names its landing state — landed_and_compiling |
// landed_not_compiling | ambiguous_no_write.
describe('melite_construct — slice 6 (the card-owned craft preprocessor)', () => {
  test('add_stage applies the card\'s craft law and echoes craft:<rule> derivations', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 4, stage: 's_0' }
      if (lane === 'benchGet') {
        return { session: 'session-chat7', rev: 4, intent: '', log: [], stages: [{ id: 's_0', card: 'image-gen', params: { model: 'anima:base:fp8', prompt: '1girl, long hair, smile' } }] }
      }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'image-gen',
      params: { model: 'anima:base:fp8', prompt: '1girl,long_hair,,smile' },
      expect_rev: 3,
    }, exec()) as Record<string, unknown>
    const write = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    const params = (write!.args[2] as Record<string, unknown>)['params'] as Record<string, unknown>
    assert.equal(params['prompt'], '1girl, long hair, smile', 'the bench stores the look\'s declared spelling')
    const derived = out['applied_derivations'] as Array<Record<string, unknown>>
    assert.deepEqual(derived.map((d) => d['rule']).sort(), ['craft:tag-separator', 'craft:tag-underscore-space'])
    assert.equal(derived[0]!['param'], 'prompt')
    assert.equal(derived[0]!['from'], '1girl,long_hair,,smile')
    assert.equal(derived[0]!['to'], '1girl, long hair, smile')
    assert.equal(out['landing'], 'landed_and_compiling')
  })

  test('the prose looks collapse whitespace and never touch a legal prompt', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 4, stage: 's_0' }
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 4, intent: '', log: [], stages: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'image-gen',
      params: { model: 'z-image:base:fp8', prompt: '  a macaque  on a mossy stone \n' },
      expect_rev: 3,
    }, exec()) as Record<string, unknown>
    const write = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    const params = (write!.args[2] as Record<string, unknown>)['params'] as Record<string, unknown>
    assert.equal(params['prompt'], 'a macaque on a mossy stone')
    assert.equal((out['applied_derivations'] as Array<Record<string, unknown>>)[0]!['rule'], 'craft:whitespace')
  })
})

describe('melite_construct — slice 5 (first-door wire grammar + landing states)', () => {
  test('add_stage restores a declared ARRAY lane at the write and echoes the derivation', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 8, stage: 's_0' }
      if (lane === 'benchGet') {
        return { session: 'session-chat7', rev: 8, intent: '', log: [], stages: [{ id: 's_0', card: 'h3-timeline', params: { ref_images: ['$ref_images'] } }] }
      }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'h3-timeline',
      params: { model: 'minimax-h3', prompt: 'a cat', ref_images: '$ref_images' },
      inputs: { ref_images: { initial: 'ref_images' } },
      expect_rev: 7,
    }, exec()) as Record<string, unknown>
    const write = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    assert.ok(write, 'the stage was written')
    const params = (write.args[2] as Record<string, unknown>)['params'] as Record<string, unknown>
    assert.deepEqual(params['ref_images'], ['$ref_images'], 'the bench stores the ARRAY the run admits — not the spell string (H7)')
    const derived = out['applied_derivations'] as Array<Record<string, unknown>>
    assert.equal(derived.length, 1)
    assert.equal(derived[0]!['param'], 'ref_images')
    assert.equal(derived[0]!['rule'], 'spell-to-array')
    assert.deepEqual(derived[0]!['to'], ['$ref_images'])
    assert.equal(out['landing'], 'landed_and_compiling')
  })

  test('patch restores the lane on a merge (the transcript\'s ref_images rewire)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 9, stage: 's_1', patched: ['ref_images'], stale: true }
      if (lane === 'benchGet') {
        return { session: 'session-chat7', rev: 9, intent: '', log: [], stages: [{ id: 's_1', card: 'h3-timeline', params: { ref_images: ['$ref_images'] } }] }
      }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'patch', stage: 's_1', params: { ref_images: '$ref_images' }, expect_rev: 8,
    }, exec()) as Record<string, unknown>
    const write = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'patch')
    const params = (write!.args[2] as Record<string, unknown>)['params'] as Record<string, unknown>
    assert.deepEqual(params['ref_images'], ['$ref_images'])
    assert.equal((out['applied_derivations'] as Array<Record<string, unknown>>)[0]!['rule'], 'spell-to-array')
    assert.equal(out['landing'], 'landed_and_compiling')
  })

  // ── THE EXPECTED-KIND CURE (friction F32, 2026-11-03): the
  // h3-timeline card doc DOCUMENTS wiring soundtrack producers as
  // custom stage inputs with hand-written expected kinds
  // ({"line1": "audio"}), and the run layer's $spell resolution
  // supports exactly that — but this door's port check refused the
  // card's own documented shape. A custom lane with a declared
  // expected kind is lawful (the kind pass judges it by its kind);
  // without one the refusal stays (the text-only class).
  test('F32: a custom lane with a declared expected kind LANDS (the card doc\'s own documented $spell shape)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        return { session: 'session-chat7', rev: 8, intent: '', log: [], stages: [{ id: 's_0', card: 'tts', params: {} }] }
      }
      if (lane === 'runsValidate') return { ok: true }
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 9, stage: 's_1' }
      throw new Error('unmocked lane ' + lane + ' ' + JSON.stringify(args).slice(0, 80))
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'h3-timeline',
      params: { model: 'minimax-h3', prompt: 'the figure turns', audio_clips: [{ id: 'l1', name: 'line', src: '$line1', start_frame: 0, dur_frames: 22, class: 'dialogue', text: 'you came back' }] },
      inputs: { line1: { stage: 's_0', output: 'default' } },
      expected: { line1: 'audio' },
    }, exec()) as Record<string, unknown>
    assert.equal(out['ok'], true, 'the documented wire lands — never the unknown-lane refusal: ' + String(out['error']))
    const write = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    const written = (write!.args[2] as Record<string, unknown>)['expected'] as Record<string, unknown>
    assert.deepEqual(written, { line1: 'audio' }, 'the expected-kind declaration rides the write')
  })

  test('F32: a custom lane with NO expected kind still refuses, and the refusal names the cure', async () => {
    const { estate } = mockEstate((lane) => { throw new Error('unmocked lane ' + lane) })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'h3-timeline',
      params: { model: 'minimax-h3', prompt: 'x' },
      inputs: { line1: { stage: 's_0', output: 'default' } },
    }, exec()) as Record<string, unknown>
    assert.equal(out['ok'], false)
    assert.equal(out['error_kind'], 'unknown-lane')
    assert.match(String(out['error']), /"line1" is not a port of card "h3-timeline"/)
    assert.match(String(out['error']), /declare the lane's expected kind/, 'the refusal teaches the documented shape')
  })

  test('F32: a load carrying the expected map on the row lands its custom lanes (the row is the declaration\'s home)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') return ROW
      if (lane === 'runsValidate') return { ok: true }
      if (lane === 'benchEnsure') return { rev: 5 }
      if (lane === 'benchVerb' && args[1] === 'load') return { rev: 5 }
      throw new Error('unmocked lane ' + lane + ' ' + JSON.stringify(args).slice(0, 80))
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'load', intent: 'the gauntlet film',
      stages: [{ card: 'h3-timeline', params: { model: 'minimax-h3', prompt: 'x', audio_clips: [{ id: 'l1', name: 'line', src: '$line1', start_frame: 0, dur_frames: 22 }] }, inputs: { line1: { stage: 's_0', output: 'default' } }, expected: { line1: 'audio' } }],
    }, exec()) as Record<string, unknown>
    assert.equal(out['ok'], true, 'the load lands: ' + String(out['error']))
    const ensure = seen.find((r) => r.lane === 'benchEnsure')
    const row = ((ensure!.args[0] as Record<string, unknown>)['stages'] as Array<Record<string, unknown>>)[0]!
    assert.deepEqual(row['expected'], { line1: 'audio' }, 'the expected-kind declaration rides the bench doc')
  })

  test('F32: a rewire of a lawfully-declared custom lane lands (the bench row\'s expected is the declaration)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        return {
          session: 'session-chat7', rev: 9, intent: '', log: [],
          stages: [
            { id: 's_0', card: 'tts', params: {} },
            { id: 's_1', card: 'h3-timeline', params: { model: 'minimax-h3', prompt: 'x' }, inputs: { line1: { stage: 's_0', output: 'default' } }, expected: { line1: 'audio' } },
          ],
        }
      }
      if (lane === 'runsValidate') return { ok: true }
      if (lane === 'benchVerb' && args[1] === 'rewire') return { rev: 10, stage: 's_1', input: 'line1' }
      throw new Error('unmocked lane ' + lane + ' ' + JSON.stringify(args).slice(0, 80))
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'rewire', stage: 's_1', input: 'line1', from: { stage: 's_0', output: 'default' }, expect_rev: 9,
    }, exec()) as Record<string, unknown>
    assert.equal(out['ok'], true, 'the rewire of a declared custom lane lands: ' + String(out['error']))
    assert.ok(seen.some((r) => r.lane === 'benchVerb' && r.args[1] === 'rewire'), 'the write happened')
  })

  test('an undeclared input lane REFUSES, named — never the silent-accept class', async () => {
    const { seen, estate } = mockEstate((lane) => { throw new Error('unmocked lane ' + lane) })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'h3-timeline',
      params: { model: 'minimax-h3', prompt: 'x' },
      inputs: { reference_images: { initial: 'reference_images' } },
    }, exec()) as Record<string, unknown>
    assert.equal(out['ok'], false)
    assert.equal(out['error_kind'], 'unknown-lane')
    assert.match(String(out['error']), /"reference_images" is not a port of card "h3-timeline"/)
    assert.match(String(out['error']), /ref_images/, 'the refusal names the lanes the card DOES declare')
    // 2026-11-12: reshoot_clip retires with §8 — the re-shoot rides
    // the `reshoot` mod bag (bags are not lanes), so the rail roster
    // carries the film's five slots only.
    assert.deepEqual(out['allowed_lanes'], ['image', 'last_frame', 'ref_images', 'ref_videos', 'ref_audios'])
    assert.equal(seen.length, 0, 'nothing was read or written')
  })

  // ── THE GHOST-STAGE LAW (F14/F26, qa8 s_15 + GAPS-15) — NO MINT ON
  // REFUSAL. The add's compile verdict used to run AFTER the mint, so
  // a refused compose still LANDED the illegal row and the ghost
  // blocked every later whole-bench compile/validate. The gate now
  // judges the PROJECTION (live rows + candidate) BEFORE the write —
  // a refusal answers, the bench is never written.
  test('a REFUSED add lands NOTHING — no mint on refusal (F14/F26, the canon arm)', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchVerb') return { rev: 8, stage: 's_0' }
      if (lane === 'benchGet') {
        return { session: 'session-chat7', rev: 8, intent: '', log: [], stages: [{ id: 's_0', card: 'h3-timeline', params: { model: 'minimax-h3', prompt: 'x', steps: 35 } }] }
      }
      if (lane === 'runsValidate') return { ok: false, error: 'flow "bench" stage "s_1": card "h3-timeline" schema refused body — $.steps expected number between 4 and 30' }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'h3-timeline',
      params: { model: 'minimax-h3', prompt: 'x', steps: 35 }, expect_rev: 7,
    }, exec()) as Record<string, unknown>
    assert.equal(out['ok'], false, 'the gate refused — a value, never a failed mutation')
    assert.equal(out['error_kind'], 'compile-refused')
    assert.match(String(out['error']), /schema refused body/)
    assert.match(String(out['error']), /steps/)
    // THE STRUCTURED REMEDY still rides the refusal (the agent can act
    // on it without decoding prose)
    assert.deepEqual(out['remedy'], { public_param: 'steps', current_value: 35, allowed_values: [4, 30] })
    // NOTHING landed: no stage minted, no rev moved, no landing state
    assert.equal(out['stage'], undefined)
    assert.equal(out['rev'], undefined)
    assert.equal(out['landing'], undefined)
    // THE MINT NEVER FIRED — the door was never called; there is
    // nothing to roll back
    assert.equal(seen.some((r) => r.lane === 'benchVerb'), false,
      'a refused add writes NOTHING — never a ghost stage to undo')
  })

  test('the gate judges the PROJECTION — the post-add bench (live rows + candidate), not the args alone', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchVerb') return { rev: 9, stage: 's_1' }
      if (lane === 'benchGet') {
        return { session: 'session-chat7', rev: 8, intent: '', log: [], stages: [{ id: 's_0', card: 'h3-timeline', params: { model: 'minimax-h3', prompt: 'x' } }] }
      }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'h3-timeline',
      params: { model: 'minimax-h3', prompt: 'x', steps: 8 }, expect_rev: 7,
    }, exec()) as Record<string, unknown>
    assert.equal(out['stage'], 's_1', 'the write landed past the gate')
    const v = seen.find((r) => r.lane === 'runsValidate')
    assert.ok(v, 'the gate composed before the write')
    const stages = (v!.args[0] as { flow_inline: { stages: Array<Record<string, unknown>> } }).flow_inline.stages
    assert.equal(stages.length, 2, 'the judged view is the post-add bench')
    assert.equal(stages[0]!['id'], 's_0', 'the live rows judge first')
    assert.equal(stages[1]!['id'], 's_1', 'the candidate rides the door\'s own mint twin (max+1)')
    assert.equal(stages[1]!['card'], 'h3-timeline')
  })

  test('a write that REBASES onto a moved bench composes the LANDED bench — landed_not_compiling survives the pre-gate', async () => {
    let reads = 0
    let posts = 0
    const badRow = { id: 's_9', card: 'h3-timeline', params: { model: 'minimax-h3', prompt: 'x', steps: 35 } }
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        reads += 1
        // read 1: the gate's view (clean). reads 2+: the bench MOVED
        // under the fill race — the rebase's fresh rev and the
        // post-mint verdict's landed truth
        return reads === 1
          ? { session: 'session-chat7', rev: 5, intent: '', log: [], stages: [] }
          : { session: 'session-chat7', rev: 9, intent: '', log: [], stages: [badRow] }
      }
      if (lane === 'benchVerb' && args[1] === 'add_stage') {
        posts += 1
        if (posts === 1) {
          throw new RemoteError('bench/cas-conflict',
            'bench moved under the add (expect_rev 5, current 9) — re-read and re-apply',
            { current_rev: 9, expect_rev: 5 })
        }
        return { rev: 10, stage: 's_10' }
      }
      if (lane === 'runsValidate') {
        // the gate judged the clean projection; the LANDED bench
        // refuses (the moved row's stale params)
        const stages = (args[0] as { flow_inline: { stages: Array<{ id?: unknown }> } }).flow_inline.stages
        return stages.some((s) => s['id'] === 's_9')
          ? { ok: false, error: 'flow "bench" stage "s_9": card "h3-timeline" schema refused body — $.steps expected number between 4 and 30' }
          : { ok: true }
      }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'h3-timeline', params: { model: 'minimax-h3', prompt: 'x' },
    }, exec()) as Record<string, unknown>
    // the write LANDED (the rebase carried it) and the verdict of the
    // LANDED bench rides — the landing vocabulary stays honest
    assert.equal(out['stage'], 's_10')
    assert.equal(out['rev'], 10)
    assert.equal(out['compile_ok'], false)
    assert.equal(out['landing'], 'landed_not_compiling', 'the write LANDED — the refusal is a closable value, not a failed mutation')
    assert.equal(seen.filter((r) => r.lane === 'benchVerb').length, 2,
      'the rebase rode the same door twice (refused attempt, landed retry)')
  })

  test('a transport failure is ambiguous_no_write — never an implied clean no-op', async () => {
    const { estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'patch') throw new Error('socket closed after send')
      throw new Error('unmocked lane ' + lane)
    })
    const tool = meliteConstruct(estate)
    const out = await tool.execute({ verb: 'patch', stage: 's1', params: { p: 2 }, expect_rev: 6 }, exec()) as Record<string, unknown>
    assert.equal(out['ok'], false)
    assert.equal(out['error_kind'], 'remote')
    assert.equal(out['landing'], 'ambiguous_no_write')
    const blocks = tool.output!.render!({} as never, out as never) as Array<{ type?: string, text?: string }>
    const text = blocks.map((b) => b.text ?? '').join('\n')
    assert.match(text, /landing: ambiguous_no_write — the write is UNPROVEN/)
  })
})

// ── THE PER-STAGE SOLO FAN-OUT (F28, qa8 residual item 12 — the
// whole-projection verdict said WHETHER the bench compiles, never
// WHICH stage burned) ─────────────────────────────────────────────
// On a refusal the verdict door fans out: each unsiblinged stage
// runs SOLO against the same door, and stage_verdicts names the
// burning stage. Sibling-wired stages skip (their solo would burn
// on the absent sibling — the projection's shape, never their
// fault). The fan-out is read-only judging (runsValidate, never
// benchVerb) — the no-mint law holds: a refused add still lands
// NOTHING. Green answers keep their exact shape with zero extra
// door calls.
describe('melite_construct — F28: the refused verdict names its stage', () => {
  type Doc = { flow_inline: { id: string, stages: Array<Record<string, unknown>> } }
  const idsOf = (args: unknown): string[] =>
    (args as Doc).flow_inline.stages.map((s) => String(s['stage'] ?? s['id'] ?? ''))

  test('validate: a refusing bench fans out — the bad stage burns solo, the good stage clears', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        return {
          session: 'session-chat7', rev: 7, intent: '', log: [],
          stages: [
            { id: 's_0', engine: 'comfyui', params: { p: 'bad' } },
            { id: 's_1', engine: 'comfyui', params: { p: 1 } },
          ],
        }
      }
      if (lane === 'runsValidate') {
        const ids = idsOf(args[0])
        // the whole burns on s_0's stale params; solos judge alone
        if (ids.includes('s_0')) {
          return { ok: false, error: 'stage "s_0" refuses: $.p expected number but got bad' }
        }
        return { ok: true }
      }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out['compiles'], false, 'the whole still refuses')
    assert.deepEqual(out['stage_verdicts'], [
      { stage: 's_0', compile_ok: false, compile_error: 'stage "s_0" refuses: $.p expected number but got bad' },
      { stage: 's_1', compile_ok: true },
    ], 'the refusal names s_0 and clears s_1')
    const calls = seen.filter((r) => r.lane === 'runsValidate')
    assert.equal(calls.length, 3, 'one whole + two solos, in projection order')
    assert.deepEqual(idsOf(calls[1]!.args[0]), ['s_0'], 'the solo carries ONLY its stage')
    assert.deepEqual(idsOf(calls[2]!.args[0]), ['s_1'])
    assert.equal(seen.some((r) => r.lane === 'benchVerb'), false, 'judging never writes')
  })

  test('add_stage: a refused compose names the candidate AND still mints nothing (no-mint intact)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        return {
          session: 'session-chat7', rev: 7, intent: '', log: [],
          stages: [{ id: 's_0', engine: 'comfyui', params: { p: 1 } }],
        }
      }
      if (lane === 'runsValidate') {
        const ids = idsOf(args[0])
        // the candidate twin (max+1) burns at the door on steps 35
        // (the tool grammar passes it — the ghost-test precedent);
        // the live row alone is clean
        if (ids.includes('s_1')) {
          return { ok: false, error: 'stage "s_1" refuses: $.steps expected number between 4 and 30 but got 35' }
        }
        return { ok: true }
      }
      if (lane === 'benchVerb') return { rev: 8, stage: 's_1' }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'h3-timeline',
      params: { model: 'minimax-h3', prompt: 'x', steps: 35 },
    }, exec()) as Record<string, unknown>
    assert.equal(out['ok'], false, 'the gate refused')
    assert.equal(out['error_kind'], 'compile-refused')
    assert.deepEqual(out['stage_verdicts'], [
      { stage: 's_0', compile_ok: true },
      { stage: 's_1', compile_ok: false, compile_error: 'stage "s_1" refuses: $.steps expected number between 4 and 30 but got 35' },
    ], 'the live row clears, the candidate burns')
    assert.equal(out['stage'], undefined, 'no stage minted on a refused compose')
    assert.equal(out['rev'], undefined, 'no rev moved — the bench was never written')
    assert.equal(seen.some((r) => r.lane === 'benchVerb'), false, 'THE MINT NEVER FIRED — the fan-out only judges')
  })

  test('a sibling-wired stage skips its solo and names the sibling — the projection shape is never its fault', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        return {
          session: 'session-chat7', rev: 7, intent: '', log: [],
          stages: [
            { id: 's_0', engine: 'comfyui', params: { p: 1 } },
            { id: 's_1', engine: 'comfyui', params: { p: 2 }, inputs: { image1: { stage: 's_0', output: 'default' } } },
          ],
        }
      }
      if (lane === 'runsValidate') {
        const ids = idsOf(args[0])
        if (ids.length === 2) return { ok: false, error: 'the whole burns (some other stage)' }
        if (ids[0] === 's_0') return { ok: true }
        throw new Error('the sibling-wired solo must never run — got solo for ' + ids[0])
      }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out['compiles'], false, 'the whole still refuses')
    assert.deepEqual(out['stage_verdicts'], [
      { stage: 's_0', compile_ok: true },
      { stage: 's_1', solo: 'skipped-sibling-wired', via: 's_0' },
    ], 's_1 skips and names s_0 instead of burning on the absent sibling')
    assert.equal(seen.filter((r) => r.lane === 'runsValidate').length, 2, 'one whole + the s_0 solo only')
  })

  test('a compiling bench pays zero extra door calls and its answer keeps its exact shape', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchGet') {
        return {
          session: 'session-chat7', rev: 7, intent: '', log: [],
          stages: [{ id: 's_0', engine: 'comfyui', params: { p: 1 } }],
        }
      }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({ verb: 'validate' }, exec()) as Record<string, unknown>
    assert.equal(out['compiles'], true)
    assert.ok(!('stage_verdicts' in out), 'green answers carry no fan-out key')
    assert.equal(seen.filter((r) => r.lane === 'runsValidate').length, 1, 'the whole alone judges')
  })

  test('patch: a landed-but-refusing bench attributes per stage on the post-mint verdict', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') {
        return {
          session: 'session-chat7', rev: 7, intent: '', log: [],
          stages: [{ id: 's_0', engine: 'comfyui' }, { id: 's_1', engine: 'comfyui' }],
        }
      }
      if (lane === 'benchVerb' && args[1] === 'patch') {
        return { rev: 8, stage: 's_0', patched: ['p'], stale: true }
      }
      if (lane === 'runsValidate') {
        const ids = idsOf(args[0])
        if (ids.includes('s_1')) return { ok: false, error: 'stage "s_1" refuses: bad params' }
        return { ok: true }
      }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute({
      verb: 'patch', stage: 's_0', params: { p: 2 }, expect_rev: 7,
    }, exec()) as Record<string, unknown>
    assert.equal(out['compile_ok'], false, 'the post-mint verdict refuses')
    assert.equal(out['landing'], 'landed_not_compiling', 'the write landed — the verdict is honest about it')
    assert.deepEqual(out['stage_verdicts'], [
      { stage: 's_0', compile_ok: true },
      { stage: 's_1', compile_ok: false, compile_error: 'stage "s_1" refuses: bad params' },
    ], 'the landed verdict names s_1')
    assert.equal(seen.filter((r) => r.lane === 'benchVerb').length, 1, 'the write landed exactly once')
  })
})

// ── THE MINT CARRIES THE SEAT (F27, qa8 s_14/s_18 — session 7a82's
// familyless ghosts) ─────────────────────────────────────────────
// The bench stage's family address is params.model. A card-mode add
// for a card whose family rides params.model (image-edit, music)
// minted a FAMILYLESS row, and only the operator's press met
// `no declared action for family ''`. The seat now rides the mint:
// first-declared family when nothing is stated (the same boarded[0]
// the cards tab seeds and the Run press resolves), a stated
// top-level `model` folds into params.model, a stated params.model
// IS the seat. Every wall here derives its expectation from the REAL
// card defs (loadCardDefs) — a card that moves its board moves the
// wall's expectation source with it.
describe('melite_construct add_stage — the mint carries the family seat (F27)', () => {
  const gateLanes = (): ReturnType<typeof mockEstate> => mockEstate((lane, args) => {
    if (lane === 'benchGet') return { session: 'session-chat7', rev: 4, intent: '', log: [], stages: [] }
    if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 5, stage: 's_0' }
    if (lane === 'runsValidate') return { ok: true }
    throw new Error('unmocked lane ' + lane)
  })

  test('a family-carrying card with no stated model takes its FIRST-DECLARED family (boarded[0])', async () => {
    const { seen, estate } = gateLanes()
    const defs = await loadCardDefs()
    const expected = defs.get('image-edit')!.boarded[0]
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'image-edit', params: { prompt: 'make it dusk' },
    }, exec()) as Record<string, unknown>
    assert.equal(out.ok, true)
    const add = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    assert.ok(add, 'the mint fired')
    const params = (add!.args[2] as { params: Record<string, unknown> }).params
    assert.equal(params['model'], expected,
      'the minted row carries the seat — never a familyless ghost')
    const derived = (out['applied_derivations'] as Array<Record<string, unknown>>)
    const seat = derived.find((d) => d['param'] === 'model')
    assert.ok(seat, 'the carry echoes an applied_derivations line')
    assert.equal(seat!['to'], expected)
    assert.equal(seat!['rule'], 'first-declared-family')
  })

  test('a stated top-level model folds into params.model — the seat the mint used to drop', async () => {
    const { seen, estate } = gateLanes()
    const defs = await loadCardDefs()
    const boarded = defs.get('music')!.boarded
    const stated = boarded[boarded.length - 1]! // the NON-default family — the agent's own pick
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'music', model: stated, params: { prompt: 'a slow waltz' },
    }, exec()) as Record<string, unknown>
    const add = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    assert.ok(add, 'the mint fired')
    const params = (add!.args[2] as { params: Record<string, unknown> }).params
    assert.equal(params['model'], stated, 'the stated seat rides the mint')
    const seat = (out['applied_derivations'] as Array<Record<string, unknown>>).find((d) => d['param'] === 'model')
    assert.equal(seat!['rule'], 'model-seat-to-params')
  })

  test('a stated params.model IS the seat — rides untouched, never a second seat', async () => {
    const { seen, estate } = gateLanes()
    const defs = await loadCardDefs()
    const boarded = defs.get('music')!.boarded
    const stated = boarded[boarded.length - 1]!
    const out = await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'music', model: boarded[0], params: { model: stated, prompt: 'x' },
    }, exec()) as Record<string, unknown>
    const add = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    const params = (add!.args[2] as { params: Record<string, unknown> }).params
    assert.equal(params['model'], stated, 'params.model wins — one seat, the bag\'s own word')
    assert.deepEqual(out['applied_derivations'] ?? [], [], 'no model derivation echoed')
  })

  test('a pure-tool card (no board) seeds nothing — never a fake family', async () => {
    const { seen, estate } = gateLanes()
    const defs = await loadCardDefs()
    const def = defs.get('mask')!
    assert.equal(def.boarded.length, 0, 'the probe card is genuinely tool-only')
    await meliteConstruct(estate).execute({
      verb: 'add_stage', card: 'mask', params: { prompt: 'x' },
    }, exec())
    const add = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')
    const params = (add!.args[2] as { params: Record<string, unknown> }).params
    assert.equal('model' in params, false, 'no seat minted for a card that owns none')
  })
})

// ── NO MINT ON REFUSAL at the replace door (F14/F26's law on the
// one-shot compose): load used to benchEnsure the wholesale replace
// BEFORE the compile verdict ran — a refused compose left the bench
// REPLACED with the illegal rows. The gate now composes the
// replacement BEFORE the write; a refusal keeps the prior bench.
describe('melite_construct load — no mint on refusal (F14/F26 at the replace door)', () => {
  test('a refused replacement writes NOTHING — the prior bench stands', async () => {
    const { seen, estate } = mockEstate((lane) => {
      if (lane === 'benchEnsure') return { rev: 6, stages: [] }
      if (lane === 'runsValidate') {
        return { ok: false, error: 'flow "bench" stage "s1": card "h3-timeline" schema refused body — $.steps expected number between 4 and 30' }
      }
      throw new Error('unmocked lane ' + lane)
    })
    const stages = [{ id: 's1', engine: 'comfyui' }]
    const out = await meliteConstruct(estate).execute(
      { verb: 'load', stages, intent: 'make art', overwrite: true, expect_rev: 4 },
      exec(),
    ) as Record<string, unknown>
    assert.equal(out['ok'], false)
    assert.equal(out['error_kind'], 'compile-refused')
    assert.match(String(out['error']), /schema refused body/)
    assert.equal(out['rev'], undefined, 'no rev moved — the bench keeps its prior state')
    assert.equal(out['landing'], undefined)
    assert.equal(seen.some((r) => r.lane === 'benchEnsure'), false,
      'the replace never fired — nothing to undo')
  })
})

describe('melite_construct — THE ONE-SPELLING WRITE (operator 2026-11-14: "I told you ONE BENCH, but the agent and user have different input parameters")', () => {
  // The burn: the agent stated the legacy alias (image1 on
  // image-edit, image_name on the h3 video card), the run composed
  // it engine-side, and the user's drill rendered the CANONICAL
  // seat EMPTY — a blank input square for an image the agent had
  // attached. The write stores the STATE, not the wire's spelling:
  // the fold merges the alias into the canonical seat (the compose
  // lane's own law — declared order, blanks dropped, a stated
  // canonical WINS) and nulls the alias out of the stored row.
  test('patch: the image1 alias lands as input_images — the drill\'s seat, one channel in the stored row', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') return {
        session: 'session-chat7', rev: 3, intent: '',
        stages: [{ id: 's1', card: 'image-edit', params: { model: 'qwen-img-edit-21' } }], log: [],
      }
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 4, stage: 's1', patched: ['image1'] }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute(
      { verb: 'patch', stage: 's1', params: { image1: 'data/input/a.png' } },
      exec(),
    ) as Record<string, unknown>
    const write = seen.find((r) => r.lane === 'benchVerb')!.args[2] as Record<string, unknown>
    const params = write['params'] as Record<string, unknown>
    assert.deepEqual(params['input_images'], ['data/input/a.png'], 'the canonical seat carries the alias value')
    assert.equal(params['image1'], null, 'the alias key is nulled out of the stored row (merge-patch unset)')
    const derivs = out['applied_derivations'] as Array<Record<string, unknown>>
    assert.ok(derivs.some((d) => d['param'] === 'input_images'), 'the fold echoes its derivation — the agent sees the canonical seat')
  })

  test('patch: an alias stated over a row that already holds the canonical seat folds AWAY (the migration law on the merged row)', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') return {
        session: 'session-chat7', rev: 3, intent: '',
        stages: [{ id: 's1', card: 'image-edit', params: { model: 'qwen-img-edit-21', input_images: ['data/input/user.png'] } }], log: [],
      }
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 4, stage: 's1', patched: ['image1'] }
      throw new Error('unmocked lane ' + lane)
    })
    await meliteConstruct(estate).execute(
      { verb: 'patch', stage: 's1', params: { image1: 'data/input/agent.png' } },
      exec(),
    )
    const write = seen.find((r) => r.lane === 'benchVerb')!.args[2] as Record<string, unknown>
    const params = write['params'] as Record<string, unknown>
    assert.equal(params['input_images'], undefined, 'the user\'s stated list WINS — the alias never overwrites it')
    assert.equal(params['image1'], null, 'the alias still leaves the stored row — one spelling')
  })

  test('add_stage: the h3 video card\'s image_name alias mints as the canonical image seat', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchVerb' && args[1] === 'add_stage') return { rev: 7, stage: 's2' }
      if (lane === 'benchGet') return { session: 'session-chat7', rev: 7, intent: '', stages: [{ id: 's2' }], log: [] }
      if (lane === 'runsValidate') return { ok: true }
      throw new Error('unmocked lane ' + lane)
    })
    await meliteConstruct(estate).execute(
      { verb: 'add_stage', card: 'h3-timeline', params: { image_name: 'data/input/first.png' } },
      exec(),
    )
    const add = seen.find((r) => r.lane === 'benchVerb' && r.args[1] === 'add_stage')!
    const params = (add.args[2] as Record<string, unknown>)['params'] as Record<string, unknown>
    assert.equal(params['image'], 'data/input/first.png', 'the canonical First-frame seat carries the alias value')
    assert.equal('image_name' in params, false, 'the fresh row never carries the retired spelling')
  })

  test('patch: a $spell alias folds into the list seat — the spell gate and rewrite both recurse lists', async () => {
    const { seen, estate } = mockEstate((lane, args) => {
      if (lane === 'benchGet') return {
        session: 'session-chat7', rev: 2, intent: '',
        stages: [{ id: 's1', card: 'image-edit', params: { model: 'qwen-img-edit-21' } }], log: [],
      }
      if (lane === 'benchVerb' && args[1] === 'patch') return { rev: 3, stage: 's1', patched: ['image1'] }
      throw new Error('unmocked lane ' + lane)
    })
    const out = await meliteConstruct(estate).execute(
      { verb: 'patch', stage: 's1', params: { image1: '$image1' } },
      exec(),
    ) as Record<string, unknown>
    const write = seen.find((r) => r.lane === 'benchVerb')!.args[2] as Record<string, unknown>
    const params = write['params'] as Record<string, unknown>
    assert.deepEqual(params['input_images'], ['$image1'], 'the channel reference rides the canonical list seat')
    assert.equal(params['image1'], null)
    const spells = out['spells'] as Array<Record<string, unknown>>
    assert.ok(Array.isArray(spells) && spells.length > 0, 'the spell voice still names the token')
  })
})
