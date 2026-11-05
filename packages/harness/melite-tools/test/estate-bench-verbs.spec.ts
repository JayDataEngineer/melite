// estate-bench-verbs.spec.ts — the two unfired bench arms + the skills
// write door, both faces.
//
// The router's regex admits eight bench verbs but estate.spec's
// "all six mutation verbs" arm rode only six: add_stages (the
// one-write restore — restoreRunToBench's N-stage landing) and
// archive (F11's spent-stage mark) never ran on either face. The
// skills POST write lane (melite_skill_write) never ran on either
// face either — only index + read did.
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import {
  makeEstate,
  makeEstateRequest,
  type EstateHost,
} from '../src/estate.ts'

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
})
