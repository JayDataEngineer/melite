// estate.ts walls (vitest, scripted seats — no gateway, no network):
// every seat lane's success arm, every no-seat refusal, every body
// guard, and the compose CAS law. The fake ctx IS the estate row:
// get(name) answers the seat or undefined (seatless).
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { makeEstateRequest, asEstateCall, seatFamilyForPath, type EstateRequest } from '../src/estate.ts'

function ctxWith(seats: Record<string, unknown>): unknown {
  return { get: (name: string) => seats[name] }
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

function req(seats: Record<string, unknown>): EstateRequest {
  return makeEstateRequest(ctxWith(seats))
}

describe('transport law', () => {
  test('an aborted signal refuses before any seat', async () => {
    let touched = false
    const r = req({ meliteSkills: { index: () => { touched = true; return [] } } })
    const ctrl = new AbortController()
    ctrl.abort()
    await assert.rejects(r('GET', '/v1/skills', undefined, ctrl.signal, 1000))
    assert.equal(touched, false)
  })

  test('an unknown lane refuses naming the F-8 actionable parts (family, absence, exit — never archaeology)', async () => {
    const msg = await throwsMsg(() => req({})('GET', '/nope', undefined, SIG, 1000))
    assert.ok(msg.includes('no seat on this lane serves GET /nope'))
    assert.ok(msg.includes('ABSENCE, not a broken registry'), msg)
    assert.ok(msg.includes('MELITE_STATE_ROOT'), msg)
    assert.ok(msg.includes('melite_construct'), msg)
  })

  test('the seatless refusal names the family the path needs (and probes ONLY that family — an eager all-seat sweep instantiates defined-but-unloaded services)', async () => {
    const live = { disclose: { discover: () => ({}) } }
    const msg = await throwsMsg(() => req(live)('POST', '/v1/flows/start', undefined, SIG, 1000))
    assert.ok(msg.includes('the live-run registry (the runs seat) is not mounted'), msg)
    assert.ok(msg.includes('No seat of that family is mounted'), msg)
    // path-scoped probing: disclose lives but is NOT named for a flows path
    assert.ok(!msg.includes('Live seats here: disclose'), msg)
  })

  test('a partial family voices its live members', async () => {
    const live = { draftsRemote: { list: async () => ({ count: 0, drafts: [] }) } }
    const msg = await throwsMsg(() => req(live)('POST', '/v1/bench/ensure', { a: 1 }, SIG, 1000))
    assert.ok(msg.includes('bench plane'), msg)
    assert.ok(msg.includes('Live seats here: draftsRemote'), msg)
  })

  test('a seat value rides verbatim', async () => {
    const r = req({ meliteSkills: { index: () => ({ rows: [1] }) } })
    assert.deepEqual(await r('GET', '/v1/skills', undefined, SIG, 1000), { rows: [1] })
  })

  test('asEstateCall forwards a carried signal verbatim', async () => {
    const seen: unknown[] = []
    const r: EstateRequest = async (method, path, body, signal, timeoutMs) => {
      seen.push(method, path, body, signal, timeoutMs)
      return { ok: true }
    }
    const value = await asEstateCall(r)('POST', '/v1/flows/drafts', { a: 1 }, SIG, 250)
    assert.deepEqual(value, { ok: true })
    assert.deepEqual(seen, ['POST', '/v1/flows/drafts', { a: 1 }, SIG, 250])
  })

  test('asEstateCall refuses a signalless call with the named error', async () => {
    const msg = await throwsMsg(() => asEstateCall(req({}))('GET', '/v1/flows/drafts', undefined, undefined, 1000))
    assert.ok(msg.includes('estate call GET /v1/flows/drafts arrived without a caller signal'), msg)
  })
})

describe('drafts lanes', () => {
  test('GET list rides the signal; seatless refuses', async () => {
    let seen: unknown[] = []
    const r = req({ draftsRemote: { list: async (s: unknown) => { seen = [s]; return { count: 0, drafts: [] } } } })
    assert.deepEqual(await r('GET', '/v1/flows/drafts', undefined, SIG, 1000), { count: 0, drafts: [] })
    assert.equal(seen[0], SIG)
    const msg = await throwsMsg(() => req({})('GET', '/v1/flows/drafts', undefined, SIG, 1000))
    assert.ok(msg.includes('no seat on this lane serves GET /v1/flows/drafts'))
  })

  test('GET one decodes the id; seatless refuses', async () => {
    let seen: unknown[] = []
    const r = req({ draftsRemote: { get: async (id: string, s: unknown) => { seen = [id, s]; return { id } } } })
    assert.deepEqual(await r('GET', '/v1/flows/drafts/a%20b', undefined, SIG, 1000), { id: 'a b' })
    assert.deepEqual(seen, ['a b', SIG])
    await assert.rejects(req({})('GET', '/v1/flows/drafts/x', undefined, SIG, 1000))
  })

  test('PATCH stage decodes both ids and passes the patch; seatless refuses', async () => {
    let seen: unknown[] = []
    const r = req({
      draftsRemote: {
        patch: async (d: string, s: string, p: unknown, sig: unknown) => {
          seen = [d, s, p, sig]
          return { ok: true }
        },
      },
    })
    const out = await r('PATCH', '/v1/flows/drafts/d%201/stages/s_0/result', { x: 1 }, SIG, 1000)
    assert.deepEqual(out, { ok: true })
    assert.deepEqual(seen, ['d 1', 's_0', { x: 1 }, SIG])
    await assert.rejects(req({})('PATCH', '/v1/flows/drafts/d/stages/s', { x: 1 }, SIG, 1000))
  })

  test('PATCH stage without a JSON body refuses (undefined/null/string)', async () => {
    const r = req({ draftsRemote: { patch: async () => ({}) } })
    for (const bad of [undefined, null, 'str']) {
      const msg = await throwsMsg(() => r('PATCH', '/v1/flows/drafts/d/stages/s', bad, SIG, 1000))
      assert.ok(msg.includes('draft stage patch needs a JSON body'))
    }
  })
})

describe('card compose lane (POST /v1/flows/drafts)', () => {
  test('a prompt body composes: intent sliced at 80, prompt stamped into params, rev rides', async () => {
    let ensured: Record<string, unknown> = {}
    const r = req({
      benchRemote: {
        get: async () => ({ rev: 3 }),
        ensure: async (doc: Record<string, unknown>) => {
          ensured = doc
          return { draft_id: 'd9' }
        },
      },
    })
    const prompt = 'p'.repeat(100)
    const out = await r('POST', '/v1/flows/drafts', { prompt, params: { seed: 1 } }, SIG, 1000)
    assert.deepEqual(out, { draftId: 'd9' })
    assert.equal(ensured['session'], 'default')
    // THE TOOL-BENCH OWNERSHIP LAW (2026-09-22): the lane is the
    // sole writer of 'default' — it SAYS its own wholesale replace.
    // Without this pin the omit-regression wedges every render tool
    // behind bench/overwrite-required (the maker jam, live receipt).
    assert.equal(ensured['overwrite'], true)
    assert.equal((ensured['intent'] as string).length, 78) // 77 + …
    assert.ok((ensured['intent'] as string).endsWith('…'))
    assert.deepEqual((ensured['stages'] as Array<{ params: unknown }>)[0].params, { seed: 1, prompt })
    assert.equal(ensured['expect_rev'], 3)
  })

  test('THE MAKER JAM (2026-09-22): a non-empty default bench never wedges a tool mint — the lane owns the scope and says overwrite', async () => {
    let calls = 0
    const ensured: Array<Record<string, unknown>> = []
    const r = req({
      benchRemote: {
        get: async () => ({ rev: calls === 0 ? 4 : 5 }),
        ensure: async (doc: Record<string, unknown>) => {
          calls += 1
          ensured.push(doc)
          if (calls === 1) {
            // the first mint races a sibling (rev moved) — the lane
            // retries once with the fresh rev
            const e = new Error('bench moved: rev is 5, caller held 4') as Error & { code?: string }
            e.code = 'bench/cas-conflict'
            throw e
          }
          return { draft_id: 'd-racy' }
        },
      },
    })
    const out = await r('POST', '/v1/flows/drafts', { prompt: 'second try' }, SIG, 1000)
    assert.deepEqual(out, { draftId: 'd-racy' })
    assert.equal(calls, 2, 'one conflict + one retry, never a wedged refusal')
    assert.equal(ensured[0]!['overwrite'], true)
    assert.equal(ensured[1]!['expect_rev'], 5, 'the retry carries the fresh rev')
  })

  test('intent falls back to intent, then card; short prompts ride whole', async () => {
    let ensured: Record<string, unknown> = {}
    const r = req({
      benchRemote: {
        get: async () => undefined, // no live bench — no expect_rev
        ensure: async (doc: Record<string, unknown>) => {
          ensured = doc
          return { draft_id: 'd1' }
        },
      },
    })
    await r('POST', '/v1/flows/drafts', { intent: 'my idea' }, SIG, 1000)
    // intent stays the identity key verbatim (the studio consult
    // keys off it); the tool-mint provenance rides the snapshot's
    // bench_head instead (runsStart's write, walled there).
    assert.equal(ensured['intent'], 'my idea')
    assert.equal('expect_rev' in ensured, false)
    await r('POST', '/v1/flows/drafts', {}, SIG, 1000)
    assert.equal(ensured['intent'], 'card')
  })

  test('a non-numeric bench rev rides nothing', async () => {
    let ensured: Record<string, unknown> = {}
    const r = req({
      benchRemote: {
        get: async () => ({ rev: 'live' }),
        ensure: async (doc: Record<string, unknown>) => {
          ensured = doc
          return { draft_id: 'd1' }
        },
      },
    })
    await r('POST', '/v1/flows/drafts', {}, SIG, 1000)
    assert.equal('expect_rev' in ensured, false)
  })

  test('an empty prompt does not stamp params; absent params start empty', async () => {
    let ensured: Record<string, unknown> = {}
    const r = req({
      benchRemote: {
        get: async () => undefined,
        ensure: async (doc: Record<string, unknown>) => {
          ensured = doc
          return { draft_id: 'd1' }
        },
      },
    })
    await r('POST', '/v1/flows/drafts', { prompt: '' }, SIG, 1000)
    assert.deepEqual((ensured['stages'] as Array<{ params: unknown }>)[0].params, {})
  })

  test('a compose with no draft_id refuses loud (undefined row / non-string id)', async () => {
    for (const row of [undefined, { draft_id: 42 }]) {
      const r = req({ benchRemote: { get: async () => undefined, ensure: async () => row } })
      const msg = await throwsMsg(() => r('POST', '/v1/flows/drafts', {}, SIG, 1000))
      assert.ok(msg.includes('card compose returned no draft_id'))
    }
  })

  test('a non-object body refuses; a seatless bench refuses', async () => {
    const r = req({ benchRemote: { get: async () => undefined, ensure: async () => ({}) } })
    for (const bad of [undefined, null, 7]) {
      const msg = await throwsMsg(() => r('POST', '/v1/flows/drafts', bad, SIG, 1000))
      assert.ok(msg.includes('card compose needs a JSON body'))
    }
    const msg = await throwsMsg(() => req({})('POST', '/v1/flows/drafts', {}, SIG, 1000))
    assert.ok(msg.includes('no seat on this lane serves POST /v1/flows/drafts'))
  })
})

describe('bench lanes', () => {
  test('POST ensure passes the doc; non-object refuses; seatless refuses', async () => {
    let seen: unknown = null
    const r = req({ benchRemote: { ensure: async (doc: unknown) => { seen = doc; return { ok: 1 } } } })
    assert.deepEqual(await r('POST', '/v1/bench/ensure', { a: 1 }, SIG, 1000), { ok: 1 })
    assert.deepEqual(seen, { a: 1 })
    const msg = await throwsMsg(() => r('POST', '/v1/bench/ensure', null, SIG, 1000))
    assert.ok(msg.includes('bench ensure needs a JSON body'))
    await assert.rejects(req({})('POST', '/v1/bench/ensure', { a: 1 }, SIG, 1000))
  })

  test('GET one decodes the session; seatless refuses', async () => {
    const r = req({ benchRemote: { get: async (s: string) => ({ session: s }) } })
    assert.deepEqual(await r('GET', '/v1/bench/main%20x', undefined, SIG, 1000), { session: 'main x' })
    await assert.rejects(req({})('GET', '/v1/bench/main', undefined, SIG, 1000))
  })

  test('all five mutation verbs route to their seat method', async () => {
    const calls: Array<{ verb: string; session: string; doc: unknown }> = []
    const r = req({
      benchRemote: {
        patch: async (s: string, d: unknown) => { calls.push({ verb: 'patch', session: s, doc: d }); return 1 },
        addStage: async (s: string, d: unknown) => { calls.push({ verb: 'add_stage', session: s, doc: d }); return 2 },
        removeStage: async (s: string, d: unknown) => { calls.push({ verb: 'remove_stage', session: s, doc: d }); return 3 },
        rewire: async (s: string, d: unknown) => { calls.push({ verb: 'rewire', session: s, doc: d }); return 4 },
        undo: async (s: string, d: unknown) => { calls.push({ verb: 'undo', session: s, doc: d }); return 5 },
      },
    })
    const outs: unknown[] = []
    for (const verb of ['patch', 'add_stage', 'remove_stage', 'rewire', 'undo']) {
      outs.push(await r('POST', '/v1/bench/s%20e/' + verb, { v: verb }, SIG, 1000))
    }
    assert.deepEqual(outs, [1, 2, 3, 4, 5])
    assert.deepEqual(calls[0], { verb: 'patch', session: 's e', doc: { v: 'patch' } })
  })

  test('mutation with a non-object body refuses; unknown verbs fall through; seatless refuses', async () => {
    const r = req({
      benchRemote: {
        patch: async () => ({}),
        addStage: async () => ({}),
        removeStage: async () => ({}),
        rewire: async () => ({}),
        undo: async () => ({}),
      },
    })
    const msg = await throwsMsg(() => r('POST', '/v1/bench/s/undo', 'nope', SIG, 1000))
    assert.ok(msg.includes('bench undo needs a JSON body'))
    const fall = await throwsMsg(() => r('POST', '/v1/bench/s/frobnicate', { a: 1 }, SIG, 1000))
    assert.ok(fall.includes('no seat on this lane serves POST /v1/bench/s/frobnicate'))
    await assert.rejects(req({})('POST', '/v1/bench/s/patch', { a: 1 }, SIG, 1000))
  })
})

describe('runs plane lanes', () => {
  test('validate/start ride the body; seatless refuses', async () => {
    const r = req({
      runs: {
        validate: async (doc: unknown) => ({ valid: true, doc }),
        start: async (doc: unknown) => ({ run_id: 'r', doc }),
      },
    })
    assert.deepEqual(
      await r('POST', '/v1/flows/validate', { id: 'f' }, SIG, 1000),
      { valid: true, doc: { id: 'f' } },
    )
    assert.deepEqual(
      await r('POST', '/v1/flows/start', { flow: 'f' }, SIG, 1000),
      { run_id: 'r', doc: { flow: 'f' } },
    )
    await assert.rejects(req({})('POST', '/v1/flows/validate', {}, SIG, 1000))
    await assert.rejects(req({})('POST', '/v1/flows/start', {}, SIG, 1000))
  })

  test('status decodes the id and parses the log flag', async () => {
    const calls: Array<{ id: string; log: boolean }> = []
    const seats = {
      runs: {
        status: async (id: string, _s: unknown, log?: boolean) => {
          calls.push({ id, log: log === true })
          return { id, log }
        },
      },
    }
    const r = req(seats)
    await r('GET', '/v1/flows/status/r%201', undefined, SIG, 1000)
    await r('GET', '/v1/flows/status/r1?include_log=1', undefined, SIG, 1000)
    await r('GET', '/v1/flows/status/r1?include_log=TRUE', undefined, SIG, 1000)
    await r('GET', '/v1/flows/status/r1?include_log=yes', undefined, SIG, 1000)
    await r('GET', '/v1/flows/status/r1?include_log=0', undefined, SIG, 1000)
    await r('GET', '/v1/flows/status/r1?include_log', undefined, SIG, 1000)
    await r('GET', '/v1/flows/status/r1?include_log=true&other=1', undefined, SIG, 1000)
    assert.deepEqual(calls.map((c) => c.log), [false, true, true, true, false, false, true])
    assert.equal(calls[0].id, 'r 1')
    await assert.rejects(req({})('GET', '/v1/flows/status/r1', undefined, SIG, 1000))
  })

  test('stop decodes the id; seatless refuses', async () => {
    const r = req({ runs: { stop: async (id: string) => ({ stopped: id }) } })
    assert.deepEqual(await r('POST', '/v1/flows/stop/a%2Fb', undefined, SIG, 1000), { stopped: 'a/b' })
    await assert.rejects(req({})('POST', '/v1/flows/stop/x', undefined, SIG, 1000))
  })

  test('runs list rides the raw limit string; the bare-slash path is not a lane', async () => {
    const seen: unknown[] = []
    const r = req({ runs: { list: async (lim: string) => { seen.push(lim); return [lim] } } })
    assert.deepEqual(await r('GET', '/v1/flows/runs', undefined, SIG, 1000), ['200'])
    assert.deepEqual(await r('GET', '/v1/flows/runs?limit=50', undefined, SIG, 1000), ['50'])
    assert.deepEqual(await r('GET', '/v1/flows/runs?limit=a%20b', undefined, SIG, 1000), ['a b'])
    assert.deepEqual(seen, ['200', '50', 'a b'])
    const msg = await throwsMsg(() => r('GET', '/v1/flows/runs/', undefined, SIG, 1000))
    assert.ok(msg.includes('no seat on this lane serves GET /v1/flows/runs/'))
    await assert.rejects(req({})('GET', '/v1/flows/runs', undefined, SIG, 1000))
  })
})

describe('disclose/manage/skills/load/ledger lanes', () => {
  test('discover parses lookup/q/tags with door defaults; seatless refuses', async () => {
    let seen: unknown[] = []
    const r = req({ disclose: { discover: (l: string, q: string, t: string) => { seen = [l, q, t]; return [l, q, t] } } })
    assert.deepEqual(
      await r('GET', '/v1/discover?lookup=cards&q=boat&tags=a', undefined, SIG, 1000),
      ['cards', 'boat', 'a'],
    )
    assert.deepEqual(seen, ['cards', 'boat', 'a'])
    assert.deepEqual(await r('GET', '/v1/discover', undefined, SIG, 1000), ['all', '', ''])
    await assert.rejects(req({})('GET', '/v1/discover', undefined, SIG, 1000))
  })

  test('manage rides the doc; seatless refuses', async () => {
    const r = req({ manage: { act: async (doc: unknown) => ({ acted: doc }) } })
    assert.deepEqual(await r('POST', '/v1/manage', { action: 'x' }, SIG, 1000), { acted: { action: 'x' } })
    await assert.rejects(req({})('POST', '/v1/manage', {}, SIG, 1000))
  })

  test('skills index + read (decoded); seatless refuses', async () => {
    const r = req({ meliteSkills: { index: () => ['a'], read: (id: string) => ({ id }) } })
    assert.deepEqual(await r('GET', '/v1/skills', undefined, SIG, 1000), ['a'])
    assert.deepEqual(await r('GET', '/v1/skills/skill%20x', undefined, SIG, 1000), { id: 'skill x' })
    await assert.rejects(req({})('GET', '/v1/skills', undefined, SIG, 1000))
    await assert.rejects(req({})('GET', '/v1/skills/a', undefined, SIG, 1000))
  })

  test('load parses inference_type/name with door defaults; seatless refuses', async () => {
    let seen: unknown[] = []
    const r = req({ load: { load: (t: string, n: string) => { seen = [t, n]; return [t, n] } } })
    assert.deepEqual(
      await r('GET', '/v1/load?inference_type=image&name=m', undefined, SIG, 1000),
      ['image', 'm'],
    )
    assert.deepEqual(await r('GET', '/v1/load', undefined, SIG, 1000), ['', ''])
    assert.deepEqual(seen, ['', ''])
    await assert.rejects(req({})('GET', '/v1/load', undefined, SIG, 1000))
  })

  test('ledger rides limit/event with door defaults; seatless reads an empty tail', async () => {
    let seen: unknown[] = []
    const r = req({ queue: { ledger: (l: string, e: string) => { seen = [l, e]; return [l, e] } } })
    assert.deepEqual(
      await r('GET', '/v1/ledger?limit=10&event=run', undefined, SIG, 1000),
      ['10', 'run'],
    )
    assert.deepEqual(await r('GET', '/v1/ledger', undefined, SIG, 1000), ['50', ''])
    assert.deepEqual(seen, ['50', ''])
    assert.deepEqual(await req({})('GET', '/v1/ledger', undefined, SIG, 1000), [])
  })

  test('the ledger family is named directly even when its optional seat answers empty', () => {
    assert.deepEqual(seatFamilyForPath('/v1/ledger'), { family: 'queue', probeNames: ['queue'] })
  })

  test('a non-conflict compose refusal propagates without a retry', async () => {
    const r = req({ benchRemote: {
      get: async () => undefined,
      ensure: async () => { throw new Error('ensure exploded') },
    } })
    await assert.rejects(r('POST', '/v1/flows/drafts', {}, SIG, 1000), /ensure exploded/)
  })

  test('a conflict retry accepts a fresh bench without a revision', async () => {
    let gets = 0
    const r = req({ benchRemote: {
      get: async () => { gets += 1; return gets === 1 ? { rev: 1 } : undefined },
      ensure: async () => {
        if (gets === 1) {
          const error = new Error('moved') as Error & { code?: string }
          error.code = 'bench/cas-conflict'
          throw error
        }
        return { draft_id: 'd-retry' }
      },
    } })
    assert.deepEqual(await r('POST', '/v1/flows/drafts', {}, SIG, 1000), { draftId: 'd-retry' })
  })
})
