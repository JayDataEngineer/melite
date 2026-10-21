// estate-typed walls (vitest, scripted seats — no gateway, no
// network): the TYPED lane seam (F-1, 2026-11-05). Every lane's
// happy arm, every lane's seatless refusal (the router's exact
// voice at the lane's canonical spelling), the queue tail's
// designed empty degrade, the abort law, and the wall-clock bound.
// The URL router's own arms live in estate.spec.ts — the two faces
// share one seat truth and one refusal builder.
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { makeEstate, type Estate, type EstateHost } from '../src/estate.ts'

function ctxWith(seats: Record<string, unknown>): EstateHost {
  // the estate reads seats through one reflect face — ctx.get — and
  // never assumes more of the host (the probe law)
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

/** A seat object that records its method calls and answers `answer`. */
function recorder(answer: unknown = { ok: 1 }): { seat: Record<string, unknown>, calls: Array<[string, unknown[]]> } {
  const calls: Array<[string, unknown[]]> = []
  const seat = new Proxy({}, {
    get(_t, prop: string) {
      return (...args: unknown[]) => {
        calls.push([prop, args])
        return answer
      }
    },
  }) as Record<string, unknown>
  return { seat, calls }
}

interface LaneRow {
  /** The seat service name the lane probes (ctx.get spelling). */
  seat: string
  /** The seat method the lane must call 1:1. */
  method: string
  /** Drive the lane; args[0..] are the lane args before the signal. */
  call: (e: Estate) => Promise<unknown>
  /** THE SEAT-SIGNATURE WALL (the silent-attribution kill, 2026-10-22):
   *  the arg vector the SEAT must receive, in the seat's own parameter
   *  order. The typed Seats interface is stated structurally in this
   *  package, so nothing else can catch a drift between it and the
   *  compiled service — the drift that burned: draftsRemote.patch grew
   *  expectRev (the CAS law) while the lane kept calling
   *  (id, stage, patch, signal), the AbortSignal landed in expectRev's
   *  slot, signal landed undefined, and the service's first line
   *  (signal.throwIfAborted) killed every attribution stamp the agent
   *  ever made — each swallowed as bookkeeping, so agent-run benches
   *  showed the watching user nothing at all. */
  seatArgs?: unknown[]
}

const BENCH: Record<string, unknown> = { benchRemote: recorder().seat }
const ROWS: LaneRow[] = [
  { seat: 'draftsRemote', method: 'list', call: (e) => e.draftsList(SIG, 250), seatArgs: [SIG] },
  { seat: 'draftsRemote', method: 'get', call: (e) => e.draftsGet('d1', SIG, 250), seatArgs: ['d1', SIG] },
  { seat: 'draftsRemote', method: 'patch', call: (e) => e.draftsStagePatch('d1', 's_0', { a: 1 }, SIG, 250), seatArgs: ['d1', 's_0', { a: 1 }, null, SIG] },
  { seat: 'benchRemote', method: 'get', call: (e) => e.benchGet('default', SIG, 250), seatArgs: ['default', SIG] },
  { seat: 'benchRemote', method: 'ensure', call: (e) => e.benchEnsure({ session: 'default' }, SIG, 250), seatArgs: [{ session: 'default' }, SIG] },
  { seat: 'benchRemote', method: 'patch', call: (e) => e.benchVerb('default', 'patch', {}, SIG, 250), seatArgs: ['default', {}, SIG] },
  { seat: 'benchRemote', method: 'addStage', call: (e) => e.benchVerb('default', 'add_stage', {}, SIG, 250), seatArgs: ['default', {}, SIG] },
  { seat: 'benchRemote', method: 'removeStage', call: (e) => e.benchVerb('default', 'remove_stage', {}, SIG, 250), seatArgs: ['default', {}, SIG] },
  { seat: 'benchRemote', method: 'clear', call: (e) => e.benchVerb('default', 'clear', {}, SIG, 250), seatArgs: ['default', {}, SIG] },
  { seat: 'benchRemote', method: 'rewire', call: (e) => e.benchVerb('default', 'rewire', {}, SIG, 250), seatArgs: ['default', {}, SIG] },
  { seat: 'benchRemote', method: 'undo', call: (e) => e.benchVerb('default', 'undo', {}, SIG, 250), seatArgs: ['default', {}, SIG] },
  { seat: 'runs', method: 'validate', call: (e) => e.runsValidate({}, SIG, 250), seatArgs: [{}, SIG] },
  { seat: 'runs', method: 'start', call: (e) => e.runsStart({}, SIG, 250), seatArgs: [{}, SIG] },
  { seat: 'runs', method: 'status', call: (e) => e.runsStatus('r1', true, SIG, 250), seatArgs: ['r1', SIG, true] },
  { seat: 'runs', method: 'stop', call: (e) => e.runsStop('r1', SIG, 250), seatArgs: ['r1', SIG] },
  { seat: 'runs', method: 'list', call: (e) => e.runsList('100', SIG, 250), seatArgs: ['100', SIG] },
  { seat: 'disclose', method: 'discover', call: (e) => e.discover('all', '', '', SIG, 250) },
  { seat: 'disclose', method: 'contracts', call: (e) => e.flowsContracts(SIG, 250) },
  { seat: 'manage', method: 'act', call: (e) => e.manageAct({}, SIG, 250) },
  { seat: 'meliteSkills', method: 'index', call: (e) => e.skillsIndex(SIG, 250) },
  { seat: 'meliteSkills', method: 'read', call: (e) => e.skillRead('sk1', SIG, 250) },
  { seat: 'load', method: 'load', call: (e) => e.loadCard('card', 'music', SIG, 250) },
  { seat: 'queue', method: 'ledger', call: (e) => e.ledgerTail('50', 'run.', SIG, 250) },
]

describe('the typed lanes (F-1)', () => {
  test('every lane rides its seat 1:1 — method name and args in seat order', async () => {
    for (const row of ROWS) {
      const { seat, calls } = recorder()
      const e = makeEstate(ctxWith({ [row.seat]: seat }))
      const out = await row.call(e)
      assert.deepEqual(out, { ok: 1 }, row.seat + '.' + row.method)
      assert.equal(calls.length, 1, row.seat + '.' + row.method + ': exactly one seat call')
      assert.equal(calls[0]![0], row.method, row.seat + ': the 1:1 method')
      if (row.seatArgs !== undefined) {
        assert.deepEqual(calls[0]![1], row.seatArgs, row.seat + '.' + row.method + ': the seat\u2019s own parameter order')
      }
    }
  })

  test('an aborted signal refuses before any seat probe (the router\u2019s law)', async () => {
    const { seat, calls } = recorder()
    const e = makeEstate(ctxWith({ meliteSkills: seat }))
    const ctrl = new AbortController()
    ctrl.abort()
    await assert.rejects(e.skillsIndex(ctrl.signal, 250))
    assert.equal(calls.length, 0)
  })

  test('a seatless lane refuses with the shared voice at the canonical spelling', async () => {
    for (const row of ROWS) {
      // The queue tail is the designed empty degrade (its own arm
      // below) — every OTHER lane refuses seatless.
      if (row.seat === 'queue') continue
      const msg = await throwsMsg(() => row.call(makeEstate(ctxWith({}))))
      assert.match(msg, /^no seat on this lane serves /, row.seat + '.' + row.method)
      assert.match(msg, /ABSENCE, not a broken registry/, row.seat + '.' + row.method)
    }
  })

  test('the queue tail\u2019s SEATLESS read degrades to an empty tail, never a refusal', async () => {
    const e = makeEstate(ctxWith({}))
    assert.deepEqual(await e.ledgerTail('50', 'run.', SIG, 250), [])
  })

  test('the refusal probes ONLY the lane\u2019s own family — a live sibling seat is never named', async () => {
    // The eager-sweep lesson (2026-09-22): an all-seat sweep
    // instantiates defined-but-unloaded services. The runs lane names
    // its own family and probes only 'runs' — a live disclose seat
    // stays untouched and unnamed in the refusal.
    const probed: string[] = []
    const host = {
      get(name: string): unknown {
        probed.push(name)
        return name === 'disclose' ? { discover: () => ({}) } : undefined
      },
    }
    const msg = await throwsMsg(() => makeEstate(host).runsStart({}, SIG, 250))
    assert.ok(msg.includes('the live-run registry (the runs seat) is not mounted'), msg)
    assert.ok(msg.includes('No seat of that family is mounted'), msg)
    assert.ok(!msg.includes('Live seats here'), msg)
    assert.deepEqual([...new Set(probed)], ['runs'], 'only the lane\u2019s own family is probed')
  })

  test('the wall-clock bound races a stuck seat at its bound, named', async () => {
    const never: Promise<unknown> = new Promise(() => {})
    const e = makeEstate(ctxWith({ benchRemote: { ensure: () => never } }))
    const started = Date.now()
    const msg = await throwsMsg(() => e.benchEnsure({}, SIG, 25))
    assert.match(msg, /outlived its 25ms bound/)
    assert.ok(Date.now() - started < 4000, 'the bound fired first')
  })

  test('a caller abort mid-flight leaves the race to the WORK (the doors law on the typed face)', async () => {
    // The fused form was rolled back (doors.spec: a caller that goes
    // away must settle from the work, never a fabricated refusal) —
    // the typed lane keeps that law: the abort rides the seat's own
    // signal, and a seat that answers anyway is the truth.
    const ctrl = new AbortController()
    let seatSignal: AbortSignal | null = null
    const e = makeEstate(ctxWith({
      benchRemote: {
        ensure: (_doc: unknown, signal: AbortSignal) => {
          seatSignal = signal
          return new Promise((res) => { setTimeout(() => res({ survived: 1 }), 40) })
        },
      },
    }))
    const pending = e.benchEnsure({}, ctrl.signal, 5000)
    ctrl.abort()
    assert.equal((seatSignal as AbortSignal | null)!.aborted, true)
    assert.deepEqual(await pending, { survived: 1 })
  })

  test('a caller abort with a stuck seat still settles at the bound voice', async () => {
    const ctrl = new AbortController()
    const e = makeEstate(ctxWith({ benchRemote: { ensure: () => new Promise(() => {}) } }))
    const pending = e.benchEnsure({}, ctrl.signal, 30)
    ctrl.abort()
    await assert.rejects(pending, /outlived its 30ms bound/)
  })

  test('a boundless lane keeps the no-invented-timeout contract', async () => {
    let settled = false
    const slow = new Promise((res) => { setTimeout(() => { settled = true; res({ late: 1 }) }, 30) })
    const e = makeEstate(ctxWith({ benchRemote: { ensure: () => slow } }))
    assert.deepEqual(await e.benchEnsure({}, SIG), { late: 1 })
    assert.ok(settled)
  })

  test('cardCompose rides the ONE compose lane (read \u2192 expect_rev \u2192 ensure)', async () => {
    let gets = 0
    const e = makeEstate(ctxWith({
      benchRemote: {
        get: async () => { gets += 1; return { rev: 7 } },
        ensure: async (doc: { expect_rev?: unknown }) => {
          assert.equal(doc.expect_rev, 7)
          return { draft_id: 'd-typed' }
        },
      },
    }))
    assert.deepEqual(await e.cardCompose({ prompt: 'a boat' }, SIG, 250), { draftId: 'd-typed' })
    assert.equal(gets, 1)
  })

  test('cardCompose on a seatless bench refuses with the compose spelling', async () => {
    const msg = await throwsMsg(() => makeEstate(ctxWith({})).cardCompose({}, SIG, 250))
    assert.ok(msg.includes('no seat on this lane serves POST /v1/flows/drafts'), msg)
  })
})
