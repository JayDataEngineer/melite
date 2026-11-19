// estate-bench-verbs.spec.ts — the two unfired bench arms + the skills
// write door, both faces; the attribution door (F3 D3-07, typed face);
// the bench verb loud end.
//
// The router's regex admits eight bench verbs but estate.spec's
// "all six mutation verbs" arm rode only six: add_stages (the
// one-write restore — restoreRunToBench's N-stage landing) and
// archive (F11's spent-stage mark) never ran on either face. The
// skills POST write lane (melite_skill_write) never ran on either
// face either — only index + read did. runsAttribute (the D3-07
// stamp-back miss mark) rode only the fake estate's lane table; its
// real typed door lives in the attribution describe below.
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import {
  makeEstate,
  makeEstateRequest,
  type BenchVerb,
  type EstateHost,
} from '../src/estate.ts'
// Type-only: the `runs/*` RemoteError codes (the runs seat owns the
// merge; the attribution arm constructs one verbatim below).
import type {} from '@melite/estate-queue'

function ctxWith(seats: Record<string, unknown>): EstateHost {
  return { get: (name: string) => seats[name] } as unknown as EstateHost
}

const SIG = AbortSignal.timeout(5000)

async function throwsMsg(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn()
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
  throw new Error('did not throw')
}

describe('bench verb arms the six-verb arm never fired (router face)', () => {
  test('POST add_stages routes to the seat addStages with the decoded session and the body', async () => {
    let seen: unknown = null
    const r = makeEstateRequest(
      ctxWith({
        benchRemote: {
          addStages: async (s: string, d: unknown) => {
            seen = [s, d]
            return { added: 2 }
          },
        },
      }),
    )
    const out = await r('POST', '/v1/bench/s%20e/add_stages', { stages: [1, 2] }, SIG, 1000)
    assert.deepEqual(out, { added: 2 })
    assert.deepEqual(seen, ['s e', { stages: [1, 2] }])
  })

  test('POST archive routes to the seat archive with the decoded session and the body', async () => {
    let seen: unknown = null
    const r = makeEstateRequest(
      ctxWith({
        benchRemote: {
          archive: async (s: string, d: unknown) => {
            seen = [s, d]
            return { archived: true }
          },
        },
      }),
    )
    const out = await r('POST', '/v1/bench/s%20e/archive', { stage: 's_0' }, SIG, 1000)
    assert.deepEqual(out, { archived: true })
    assert.deepEqual(seen, ['s e', { stage: 's_0' }])
  })
})

describe('skills write lane (router face)', () => {
  test('POST /v1/skills rides the seat write; seatless refuses naming meliteSkills', async () => {
    const r = makeEstateRequest(
      ctxWith({ meliteSkills: { write: (doc: unknown) => ({ written: doc }) } }),
    )
    assert.deepEqual(
      await r('POST', '/v1/skills', { id: 's1' }, SIG, 1000),
      { written: { id: 's1' } },
    )
    const msg = await throwsMsg(() => makeEstateRequest(ctxWith({}))('POST', '/v1/skills', { id: 's1' }, SIG, 1000))
    assert.ok(msg.includes('meliteSkills'), msg)
    assert.ok(msg.includes('no seat on this lane serves POST /v1/skills'), msg)
  })
})

describe('bench verb arms the typed ROWS never fired + the typed write (typed face)', () => {
  test('benchVerb add_stages calls addStages in the seat order; seatless refuses at the canonical spelling', async () => {
    const calls: unknown[] = []
    const e = makeEstate(
      ctxWith({
        benchRemote: {
          addStages: async (s: string, d: unknown) => {
            calls.push([s, d])
            return { added: 2 }
          },
        },
      }),
    )
    assert.deepEqual(await e.benchVerb('s e', 'add_stages', { stages: [1] }, SIG, 250), { added: 2 })
    assert.deepEqual(calls, [['s e', { stages: [1] }]])
    const msg = await throwsMsg(() => makeEstate(ctxWith({})).benchVerb('s', 'add_stages', {}, SIG, 250))
    assert.ok(msg.includes('no seat on this lane serves POST /v1/bench/s/add_stages'), msg)
  })

  test('benchVerb archive calls archive in the seat order; seatless refuses at the canonical spelling', async () => {
    const calls: unknown[] = []
    const e = makeEstate(
      ctxWith({
        benchRemote: {
          archive: async (s: string, d: unknown) => {
            calls.push([s, d])
            return { archived: true }
          },
        },
      }),
    )
    assert.deepEqual(await e.benchVerb('s e', 'archive', { stage: 's_0' }, SIG, 250), { archived: true })
    assert.deepEqual(calls, [['s e', { stage: 's_0' }]])
    const msg = await throwsMsg(() => makeEstate(ctxWith({})).benchVerb('s', 'archive', {}, SIG, 250))
    assert.ok(msg.includes('no seat on this lane serves POST /v1/bench/s/archive'), msg)
  })

  test('skillWrite rides the seat write; seatless refuses at the canonical spelling', async () => {
    const e = makeEstate(
      ctxWith({ meliteSkills: { write: (doc: unknown) => ({ written: doc }) } }),
    )
    assert.deepEqual(await e.skillWrite({ id: 's1' }, SIG, 250), { written: { id: 's1' } })
    const msg = await throwsMsg(() => makeEstate(ctxWith({})).skillWrite({ id: 's1' }, SIG, 250))
    assert.ok(msg.includes('no seat on this lane serves POST /v1/skills'), msg)
    assert.ok(msg.includes('meliteSkills'), msg)
  })

  test('an out-of-union bench verb fires the loud end, never a seat call', async () => {
    // The closed-union loud end (the same law the router's switch
    // states): an arm the seat pattern admits but no case serves
    // throws LOUD — it never falls through the match unanswered and
    // never reaches a sibling seat's method under the wrong verb.
    const calls: unknown[] = []
    const e = makeEstate(ctxWith({
      benchRemote: {
        patch: async (...a: unknown[]) => { calls.push(a); return { patched: true } },
      },
    }))
    const verb: string = 'explode' // the drift the loud end owns: an arm with no case
    const msg = await throwsMsg(() => e.benchVerb('s', verb as BenchVerb, {}, SIG, 250))
    assert.equal(msg, 'bench arm explode matched its pattern but has no seat')
    assert.deepEqual(calls, [], 'no seat method fired for the unknown arm')
  })
})

describe('the attribution door (F3 D3-07, typed face)', () => {
  test('runsAttribute rides the runs seat attribute 1:1; seatless refuses at the canonical attribution spelling', async () => {
    const calls: unknown[] = []
    const e = makeEstate(
      ctxWith({
        runs: {
          attribute: async (runId: string, value: string, signal: AbortSignal) => {
            calls.push([runId, value, signal])
            return { run_id: runId, attribution: value }
          },
        },
      }),
    )
    assert.deepEqual(
      await e.runsAttribute('r_miss', 'missed', SIG, 250),
      { run_id: 'r_miss', attribution: 'missed' },
    )
    assert.deepEqual(calls, [['r_miss', 'missed', SIG]], 'the seat order is (runId, value, signal)')
    const msg = await throwsMsg(() => makeEstate(ctxWith({})).runsAttribute('r_miss', 'missed', SIG, 250))
    assert.ok(msg.includes('no seat on this lane serves POST /v1/flows/attribution/r_miss'), msg)
    assert.ok(msg.includes('live-run registry (the runs seat)'), msg)
  })

  test('runsAttribute propagates the seat\u2019s RemoteError runs/run-unknown verbatim — the lane maps nothing', async () => {
    // The unknown-run face is the SEAT's own RemoteError (the runs
    // registry throws it, doors.ts translates it to 404 on the
    // browser face); the typed lane neither absorbs nor rewraps it.
    const refusal = new RemoteError('runs/run-unknown', 'unknown run_id "r_ghost"', { runId: 'r_ghost' })
    const e = makeEstate(ctxWith({ runs: { attribute: async () => { throw refusal } } }))
    await assert.rejects(e.runsAttribute('r_ghost', '', SIG, 250), (err: unknown) => {
      assert.ok(err instanceof RemoteError)
      assert.equal(err.code, 'runs/run-unknown')
      assert.equal(err.details.runId, 'r_ghost')
      assert.match(err.message, /r_ghost/)
      return true
    })
  })
})
