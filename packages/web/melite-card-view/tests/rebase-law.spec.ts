// rebase-law.spec.ts — THE STUCK CURE's own wall (2026-09-15).
// The operator's burn, verbatim: "bench main moved: rev is 429,
// caller held 35 — IT STUCK. IT NEVER SUPPOSED TO BE STUCK." A tab
// rendered rev 35; the agent moved the shared bench to 429; every
// door refused and nothing recovered. The law now: a CAS refusal
// re-reads the rev and re-applies ONCE — a moved bench costs one
// silent rebase, never a bricked tab. A second conflict or a
// non-CAS refusal throws loud (the named truth).
//
// The stub speaks the REAL wire law: POST /api/<method> carrying a
// client-request frame; answers are typert server-response envelopes
// (rpcId echoed; domain refusals arrive at HTTP 200 with ok:false —
// the gateway's envelope, not a status code).
import { describe, expect, test, afterEach } from 'vitest'
import { addStageWire, removeStageWire } from '../src/client/add-stage.ts'

/** One stubbed /api round trip, routed by method + expect_rev. */
interface Call { method: string; expectRev: number | undefined }
function stubFetch(script: Array<(call: Call) => { refuse?: string; value?: Record<string, unknown> }>): Call[] {
  const seen: Call[] = []
  let i = 0
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = url.replace('/api/', '')
    let frame: Record<string, unknown> = {}
    if (typeof init?.body === 'string') frame = JSON.parse(init.body) as Record<string, unknown>
    const rpcId = frame['rpcId']
    const args = ((frame['payload'] as { args?: Record<string, unknown> } | undefined)?.args ?? {}) as Record<string, unknown>
    const doc = (args['doc'] as Record<string, unknown> | undefined) ?? {}
    const call: Call = {
      method,
      expectRev: typeof doc['expect_rev'] === 'number' ? doc['expect_rev'] as number : undefined,
    }
    seen.push(call)
    const step = script[Math.min(i, script.length - 1)]
    i++
    const answer = step(call)
    const result = answer.refuse === undefined
      ? { ok: true, value: answer.value ?? {} }
      : { ok: false, error: { message: answer.refuse } }
    return new Response(JSON.stringify({ type: 'server-response', rpcId, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  afterEach(() => { globalThis.fetch = realFetch })
  return seen
}

describe('the rebase law (a moved bench costs one silent rebase, never a stuck tab)', () => {
  test('THE EXACT BURN: held 35 vs rev 429 — the door rebases once and lands', async () => {
    const seen = stubFetch([
      // attempt 1: the held rev refuses (the door's own voice)
      () => ({ refuse: 'bench main moved: rev is 429, caller held 35' }),
      // the re-read: fresh truth
      () => ({ value: { rev: 429 } }),
      // attempt 2 with the fresh rev: lands
      () => ({ value: { rev: 430, stage: 's_9' } }),
    ])
    const row = await addStageWire({ card: 'image-edit', expect_rev: 35 }, 'main')
    expect(row['stage']).toBe('s_9')
    expect(seen.map((c) => [c.method, c.expectRev])).toEqual([
      ['bench/add-stage', 35],
      ['bench/get', undefined],
      ['bench/add-stage', 429],
    ])
  })

  test('a SECOND conflict throws loud — never a blind write, never a loop', async () => {
    stubFetch([
      () => ({ refuse: 'bench main moved: rev is 430, caller held 429' }),
      () => ({ value: { rev: 430 } }),
      () => ({ refuse: 'bench main moved: rev is 431, caller held 430' }),
    ])
    await expect(removeStageWire({ stage: 's_1', expect_rev: 429 }))
      .rejects.toThrow(/rev is 431, caller held 430/)
  })

  test('a non-CAS refusal is the named truth — no rebase, no retry', async () => {
    const seen = stubFetch([
      () => ({ refuse: "input 'image' wires stage 'stage-1' — no such stage on the bench" }),
    ])
    await expect(addStageWire({ card: 'image-edit', expect_rev: 7, inputs: { image: { stage: 'stage-1' } } }, 'main'))
      .rejects.toThrow(/no such stage on the bench/)
    expect(seen).toHaveLength(1)
  })

  test('a dead re-read leaves the original refusal standing', async () => {
    stubFetch([
      () => ({ refuse: 'bench main moved: rev is 429, caller held 35' }),
      () => { throw new Error('network gone') },
    ])
    await expect(removeStageWire({ stage: 's_1', expect_rev: 35 }))
      .rejects.toThrow(/rev is 429, caller held 35/)
  })
})
