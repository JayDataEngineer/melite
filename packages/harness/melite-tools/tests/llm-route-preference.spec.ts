// llm route preference (vitest, fake seam — no host, no key).
// Operator order 2026-09-06: the ✦ button serves the USER'S model;
// queue lane law: NO WALK, NO FALLBACKS. Pins:
//   1. explicit llm serves that route, via echoes it (deepseek first
//      + healthy is NOT touched — the exact grievance)
//   2. unnamed + host default serves the DEFAULT (never first-breathing)
//   3. unknown explicit name throws naming the live routes (-> 400)
//   4. stale default throws naming the live routes (-> 502)
//   5. dead named route throws LOUDLY (no step-past, ever)
//   6. no name + no default throws (never a blind walk)
//   7. ambiguous bare model throws naming both (never a guess)
import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import {
  harnessEnhance,
  matchHarnessRoute,
  resolveHarnessRoutes,
  type LlmStreamSeam,
} from '../src/llm-complete.ts'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'

const JSON_REPLY = '{"positive":"P","negative":"N"}'

interface SeenCall {
  provider: string
  model: string
}

function fakeSeam(opts?: {
  dead?: Set<string>
  zai?: boolean
  ambiguous?: boolean
}): LlmStreamSeam & { seen: SeenCall[]; systems: string[] } {
  const seen: SeenCall[] = []
  const systems: string[] = []
  const dead = opts?.dead ?? new Set<string>()
  const providers = [
    { id: 'deepseek-official', models: ['deepseek-chat'] },
    { id: 'opencode-go', models: ['muse-spark'] },
    // The operator's vision session model (the host default when the
    // lane runs vision loops) — the preference pins ride this pair.
    ...(opts?.zai === true ? [{ id: 'zai', models: ['glm-5v-turbo'] }] : []),
    // A second advertiser of the preference's bare name — the
    // ambiguity the quiet arm must skip, never guess between.
    ...(opts?.ambiguous === true ? [{ id: 'other', models: ['muse-spark'] }] : []),
  ]
  return {
    seen,
    systems,
    listProviders: () => providers.map((p) => ({ id: p.id, name: p.id })), // fakes carry no display names — the id doubles
    listModels: async (provider: string) =>
      (providers.find((p) => p.id === provider)?.models ?? []).map((id) => ({ provider, id, name: id })),
    stream: (o: GenerateOptions) => {
      seen.push({ provider: o.provider, model: o.model })
      if (typeof o.system === 'string') systems.push(o.system)
      const key = o.provider + '/' + o.model
      async function* gen(): AsyncGenerator<StreamChunk> {
        if (dead.has(key)) {
          yield { type: 'finish', reason: { kind: 'error', failure: { message: 'quota dead', code: 'AUTH' } } }
          return
        }
        yield { type: 'text-delta', index: 0, text: JSON_REPLY }
        yield { type: 'finish', reason: { kind: 'stop' } }
      }
      return gen()
    },
  }
}

const REQ = { system: 'sys', prompt: 'a red boat' }
const DEFAULT = 'opencode-go/muse-spark'

async function throwsMsg(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn()
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
  throw new Error('did not throw')
}

describe('llm route preference', () => {
  test('explicit serves that route; healthy-first deepseek untouched', async () => {
    const llm = fakeSeam()
    const out = await harnessEnhance(llm, { ...REQ, llm: DEFAULT }, 'deepseek-official/deepseek-chat')
    assert.deepEqual(out, { positive: 'P', negative: 'N', via: DEFAULT })
    assert.deepEqual(llm.seen, [{ provider: 'opencode-go', model: 'muse-spark' }])
  })

  test('unnamed serves the host default, never first-breathing', async () => {
    const llm = fakeSeam()
    const out = await harnessEnhance(llm, { ...REQ }, DEFAULT)
    assert.equal(out.via, DEFAULT)
    assert.deepEqual(llm.seen, [{ provider: 'opencode-go', model: 'muse-spark' }])
  })

  test('unknown explicit name throws naming the live routes', async () => {
    const llm = fakeSeam()
    const msg = await throwsMsg(() => harnessEnhance(llm, { ...REQ, llm: 'nope/nothing' }, DEFAULT))
    assert.ok(msg.includes('unknown llm route'))
    assert.ok(msg.includes('deepseek-official/deepseek-chat'))
    assert.ok(msg.includes('opencode-go/muse-spark'))
  })

  test('stale default throws naming the live routes', async () => {
    const llm = fakeSeam()
    const msg = await throwsMsg(() => harnessEnhance(llm, { ...REQ }, 'gone/model'))
    assert.ok(msg.includes('unknown llm route'))
  })

  test('dead named route throws LOUDLY — no step-past', async () => {
    const llm = fakeSeam({ dead: new Set([DEFAULT]) })
    const msg = await throwsMsg(() => harnessEnhance(llm, { ...REQ }, DEFAULT))
    assert.ok(msg.includes('quota dead'))
    assert.deepEqual(llm.seen, [{ provider: 'opencode-go', model: 'muse-spark' }])
  })

  test('no name + no default throws — never a blind walk', async () => {
    const llm = fakeSeam()
    const msg = await throwsMsg(() => harnessEnhance(llm, { ...REQ }))
    assert.ok(msg.includes('no llm named and no host default'))
    assert.deepEqual(llm.seen, [])
  })

  test('ambiguous bare model throws naming both (never a guess)', async () => {
    const llm = fakeSeam()
    const routes = await resolveHarnessRoutes(llm)
    let msg = ''
    try {
      matchHarnessRoute([...routes, { provider: 'other', model: 'muse-spark' }], 'muse-spark')
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e)
    }
    assert.ok(msg.includes('ambiguous llm'))
  })

  // ── THE CARD PREFERENCE ARM (operator order: "muse-spark-1.3-
  //  contributor i want to use over glm-5v-turbo") ──────────────────
  describe('card llm preference', () => {
    const PREF = 'muse-spark'
    const HOST_DEFAULT = 'zai/glm-5v-turbo'

    test('preference serves over the host default (muse over glm-5v); via echoes', async () => {
      const llm = fakeSeam({ zai: true })
      const out = await harnessEnhance(llm, { ...REQ }, HOST_DEFAULT, PREF)
      assert.equal(out.via, DEFAULT)
      assert.deepEqual(llm.seen, [{ provider: 'opencode-go', model: 'muse-spark' }])
    })

    test('explicit caller llm still beats the preference', async () => {
      const llm = fakeSeam({ zai: true })
      const out = await harnessEnhance(llm, { ...REQ, llm: HOST_DEFAULT }, HOST_DEFAULT, PREF)
      assert.equal(out.via, HOST_DEFAULT)
      assert.deepEqual(llm.seen, [{ provider: 'zai', model: 'glm-5v-turbo' }])
    })

    test('stale preference falls to the host default (ordered candidate, not a contract)', async () => {
      const llm = fakeSeam({ zai: true })
      const out = await harnessEnhance(llm, { ...REQ }, HOST_DEFAULT, 'gone/nothing')
      assert.equal(out.via, HOST_DEFAULT)
    })

    test('named-live preference that dies throws LOUDLY — no step-past to the default', async () => {
      const llm = fakeSeam({ zai: true, dead: new Set([DEFAULT]) })
      const msg = await throwsMsg(() => harnessEnhance(llm, { ...REQ }, HOST_DEFAULT, PREF))
      assert.ok(msg.includes('quota dead'))
      assert.deepEqual(llm.seen, [{ provider: 'opencode-go', model: 'muse-spark' }])
    })

    test('ambiguous preference name skips quietly to the default', async () => {
      const llm = fakeSeam({ zai: true, ambiguous: true })
      const routes = await resolveHarnessRoutes(llm)
      assert.equal(matchHarnessRoute(routes, 'muse-spark', { quiet: true }), undefined)
      let strict = ''
      try {
        matchHarnessRoute(routes, 'muse-spark')
      } catch (e) {
        strict = e instanceof Error ? e.message : String(e)
      }
      assert.ok(strict.includes('ambiguous llm'))
      const out = await harnessEnhance(llm, { ...REQ }, HOST_DEFAULT, 'muse-spark')
      assert.equal(out.via, HOST_DEFAULT)
    })

    test('no default + stale preference still throws loud (never a blind walk)', async () => {
      const llm = fakeSeam()
      const msg = await throwsMsg(() => harnessEnhance(llm, { ...REQ }, undefined, 'gone/nothing'))
      assert.ok(msg.includes('no llm named and no host default'))
    })
  })

  test('output contract rides EVERY recipe, even one with no format word (live-caught 1:1)', async () => {
    const llm = fakeSeam()
    // The exact shape of the operator's failing press: a structure-rules
    // recipe with NO output-format instruction — prose answers 502'd.
    await harnessEnhance(llm, {
      system: 'structure: [subject, action, environment]; rules:; - pair every bare noun with adjectives',
      prompt: 'Test',
    }, DEFAULT)
    assert.equal(llm.systems.length, 1)
    assert.ok(llm.systems[0].includes('structure: [subject'))
    assert.ok(llm.systems[0].includes('Output contract: reply with ONLY a JSON object'))
  })
})
