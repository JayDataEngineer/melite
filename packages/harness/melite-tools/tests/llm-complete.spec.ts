// llm-complete residual walls (vitest, fake seam — no host, no key).
// Closes every arm llm-route-preference.spec.ts leaves dark:
// resolveHarnessRoutes (empty/throwing/uneven providers, the 12-route
// slice), harnessCompleteOnRoute (signal leg, temperature gate, chunk
// shapes, finish taxonomy), matchHarnessRoute (bare hit, family
// resolution, stem-less/empty-family throws), harnessEnhance (empty-
// string llm/default), parseEnhanceJson (fenced/sliced/negative-less
// shapes, the honest throw).
import { beforeAll, describe, test } from 'vitest'
import assert from 'node:assert/strict'
import {
  harnessCompleteOnRoute,
  harnessEnhance,
  matchHarnessRoute,
  parseEnhanceJson,
  resolveHarnessRoutes,
  routeName,
  type HarnessRoute,
  type LlmStreamSeam,
} from '../src/llm-complete.ts'

const JSON_REPLY = '{"positive":"P","negative":"N"}'

type Chunk = { type: string; text?: unknown; reason?: unknown }

interface FakeOpts {
  providers?: Array<{ id: string; models: string[]; explodes?: boolean }>
  chunks?: Chunk[]
  onOptions?: (o: Record<string, unknown>) => void
}

function fakeSeam(opts: FakeOpts = {}): LlmStreamSeam {
  const providers = opts.providers ?? [{ id: 'p', models: ['m'] }]
  const chunks = opts.chunks
  return {
    listProviders: () => providers.map((p) => ({ id: p.id })),
    listModels: async (provider: string) => {
      const hit = providers.find((p) => p.id === provider)
      if (hit?.explodes) throw new Error('enumerate blew up')
      return (hit?.models ?? []).map((id) => ({ id }))
    },
    stream: (o: Record<string, unknown>) => {
      opts.onOptions?.(o)
      async function* gen(): AsyncGenerator<Chunk> {
        if (chunks !== undefined) {
          for (const c of chunks) yield c
          return
        }
        yield { type: 'text-delta', text: JSON_REPLY }
        yield { type: 'finish', reason: { kind: 'stop' } }
      }
      return gen() as AsyncIterable<Chunk>
    },
  } as unknown as LlmStreamSeam
}

async function throwsMsg(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn()
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
  throw new Error('did not throw')
}

const ROUTE = { provider: 'p', model: 'm' }
const REQ = { system: 'sys', prompt: 'a red boat' }

describe('resolveHarnessRoutes residuals', () => {
  test('zero providers throws the no-adapter error', async () => {
    const msg = await throwsMsg(() => resolveHarnessRoutes(fakeSeam({ providers: [] })))
    assert.ok(msg.includes('no LLM adapter is registered'))
  })

  test('a provider that cannot enumerate is skipped; all-skipped throws the no-model error', async () => {
    const msg = await throwsMsg(() =>
      resolveHarnessRoutes(fakeSeam({ providers: [{ id: 'bad', models: ['x'], explodes: true }] })),
    )
    assert.ok(msg.includes('no registered harness provider advertises any model'))
  })

  test('a provider with zero models is skipped, the healthy one serves', async () => {
    const routes = await resolveHarnessRoutes(
      fakeSeam({ providers: [{ id: 'empty', models: [] }, { id: 'ok', models: ['m1'] }] }),
    )
    assert.deepEqual(routes, [{ provider: 'ok', model: 'm1' }])
  })

  test('uneven providers interleave round-robin and the list is COMPLETE — no slice (burn e)', async () => {
    // Burn e (operator 2026-10-26: the enhance dropdown "IS MISSING
    // MANY MODELS"): the retired walk's 12-route slice died with it —
    // the picker and the matcher both read this list. 8 + 8 = 16
    // routes, every one served.
    const many = Array.from({ length: 8 }, (_, i) => 'm' + i)
    const routes = await resolveHarnessRoutes(
      fakeSeam({
        providers: [
          { id: 'a', models: many },
          { id: 'b', models: many.map((m) => 'n' + m) },
        ],
      }),
    )
    assert.equal(routes.length, 16)
    // Round-robin: every provider's first route rides ahead of any
    // second — b's rows interleave, never starve.
    assert.deepEqual(routes[0], { provider: 'a', model: 'm0' })
    assert.deepEqual(routes[1], { provider: 'b', model: 'nm0' })
    assert.deepEqual(routes[2], { provider: 'a', model: 'm1' })
    assert.deepEqual(routes[15], { provider: 'b', model: 'nm7' })
    // THE TAIL CADENCE (picker audit F3, 2026-10-26): first+last pins
    // leave the middle unjudged — a resolver that interleaves the
    // head then dumps one provider's tail contiguously would pass
    // above. The WHOLE array is the cadence's witness: strict
    // alternation to the end, both providers' models in order.
    assert.deepEqual(routes, Array.from({ length: 16 }, (_, i) => (
      i % 2 === 0 ? { provider: 'a', model: 'm' + (i / 2) } : { provider: 'b', model: 'nm' + ((i - 1) / 2) }
    )), 'the round-robin cadence holds at EVERY position, not just first+last')
  })

  test('a provider with many more models than its siblings is served WHOLE (the missing-models burn)', async () => {
    // The live shape the burn named: one provider advertises 40, its
    // siblings 1 each — the old slice showed 12 interleaved routes
    // and starved the other 28. The complete list serves all 42.
    const wide = Array.from({ length: 40 }, (_, i) => 'w' + i)
    const routes = await resolveHarnessRoutes(
      fakeSeam({
        providers: [
          { id: 'wide', models: wide },
          { id: 'x', models: ['x0'] },
          { id: 'y', models: ['y0'] },
        ],
      }),
    )
    assert.equal(routes.length, 42)
    assert.deepEqual(routes[0], { provider: 'wide', model: 'w0' })
    assert.deepEqual(routes[1], { provider: 'x', model: 'x0' })
    assert.deepEqual(routes[2], { provider: 'y', model: 'y0' })
    assert.deepEqual(routes[3], { provider: 'wide', model: 'w1' })
    assert.deepEqual(routes[41], { provider: 'wide', model: 'w39' })
    // every wide model present (the starvation arm)
    for (let i = 0; i < 40; i++) {
      assert.ok(routes.some((r) => r.provider === 'wide' && r.model === 'w' + i))
    }
  })

  test('routeName is provider/model, the only spelling', () => {
    assert.equal(routeName({ provider: 'a', model: 'b' }), 'a/b')
  })
})

describe('harnessCompleteOnRoute residuals', () => {
  test('the caller signal fuses with the deadline; finite temperature rides', async () => {
    let seen: Record<string, unknown> = {}
    const llm = fakeSeam({ onOptions: (o) => { seen = o } })
    const text = await harnessCompleteOnRoute(llm, ROUTE, {
      ...REQ,
      signal: AbortSignal.timeout(5000),
      temperature: 0.7,
    })
    assert.equal(text, JSON_REPLY)
    assert.equal(seen['provider'], 'p')
    assert.equal(seen['model'], 'm')
    assert.equal(seen['temperature'], 0.7)
    assert.ok(typeof seen['system'] === 'string' && seen['system'].includes('Output contract'))
  })

  test('NaN temperature is dropped like an absent one', async () => {
    for (const t of [undefined, NaN]) {
      let seen: Record<string, unknown> = {}
      const llm = fakeSeam({ onOptions: (o) => { seen = o } })
      await harnessCompleteOnRoute(llm, ROUTE, { ...REQ, temperature: t })
      assert.equal('temperature' in seen, false)
    }
  })

  test('text-delta without string text and unknown chunks are ignored', async () => {
    const llm = fakeSeam({
      chunks: [
        { type: 'text-delta' },
        { type: 'text-delta', text: 42 },
        { type: 'mystery', text: 'x' },
        { type: 'text-delta', text: 'hi' },
        { type: 'finish', reason: { kind: 'stop' } },
      ],
    })
    assert.equal(await harnessCompleteOnRoute(llm, ROUTE, REQ), 'hi')
  })

  test('a stream with no terminal finish throws', async () => {
    const msg = await throwsMsg(() =>
      harnessCompleteOnRoute(fakeSeam({ chunks: [{ type: 'text-delta', text: 'hi' }] }), ROUTE, REQ),
    )
    assert.ok(msg.includes('ended without a terminal finish'))
  })

  test('error finish with message+code names the route and both', async () => {
    const msg = await throwsMsg(() =>
      harnessCompleteOnRoute(
        fakeSeam({ chunks: [{ type: 'finish', reason: { kind: 'error', failure: { message: 'quota dead', code: 'AUTH' } } }] }),
        ROUTE, REQ,
      ),
    )
    assert.ok(msg.includes('p/m failed'))
    assert.ok(msg.includes('quota dead [AUTH]'))
  })

  test('error finish without a code marks it unknown', async () => {
    const msg = await throwsMsg(() =>
      harnessCompleteOnRoute(
        fakeSeam({ chunks: [{ type: 'finish', reason: { kind: 'error', failure: { message: 'boom' } } }] }),
        ROUTE, REQ,
      ),
    )
    assert.ok(msg.includes('boom [?]'))
  })

  test('error finish without a failure surfaces the kind', async () => {
    const msg = await throwsMsg(() =>
      harnessCompleteOnRoute(
        fakeSeam({ chunks: [{ type: 'finish', reason: { kind: 'aborted' } }] }),
        ROUTE, REQ,
      ),
    )
    assert.ok(msg.includes('p/m failed — aborted'))
  })

  test('finish without a reason object stringifies the absence', async () => {
    const msg = await throwsMsg(() =>
      harnessCompleteOnRoute(fakeSeam({ chunks: [{ type: 'finish' }] }), ROUTE, REQ),
    )
    assert.ok(msg.includes('p/m failed — null'))
  })

  test('finish with a non-string kind stringifies the whole reason', async () => {
    const msg = await throwsMsg(() =>
      harnessCompleteOnRoute(fakeSeam({ chunks: [{ type: 'finish', reason: { kind: 42 } }] }), ROUTE, REQ),
    )
    assert.ok(msg.includes('p/m failed — {"kind":42}'))
  })
})

describe('matchHarnessRoute residuals', () => {
  const routes: HarnessRoute[] = [
    { provider: 'zai', model: 'glm' },
    { provider: 'zai', model: 'glm-4.5-air' },
    { provider: 'zai', model: 'glm.v2' },
    { provider: 'zai', model: 'glm-4.7' },
    { provider: 'zai', model: 'other' },
    { provider: 'other', model: 'glm-9' },
  ]

  test('a bare model matching exactly one route serves it', () => {
    assert.deepEqual(matchHarnessRoute(routes, 'other'), { provider: 'zai', model: 'other' })
  })

  test('a newer-than-live default resolves to the same provider newest family row', () => {
    // glm-5.3 is newer than anything live: zai's highest glm line wins.
    assert.deepEqual(matchHarnessRoute(routes, 'zai/glm-5.3'), { provider: 'zai', model: 'glm-4.7' })
  })

  test('an unversioned family name resolves through the stem', () => {
    const solo: HarnessRoute[] = [{ provider: 'zai', model: 'glm-4.7' }]
    assert.deepEqual(matchHarnessRoute(solo, 'zai/glm'), { provider: 'zai', model: 'glm-4.7' })
  })

  test('a bare name with no match and no slash throws naming the live routes', () => {
    let msg = ''
    try {
      matchHarnessRoute(routes, 'lonelymodel')
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e)
    }
    assert.ok(msg.includes('unknown llm route "lonelymodel"'))
    assert.ok(msg.includes('zai/glm-4.7'))
  })

  test('a named provider with no family row throws naming the live routes', () => {
    let msg = ''
    try {
      matchHarnessRoute(routes, 'zai/nonexistent-9.9')
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e)
    }
    assert.ok(msg.includes('unknown llm route "zai/nonexistent-9.9"'))
  })
})

describe('harnessEnhance residuals', () => {
  test('an empty-string llm falls back to the host default', async () => {
    const llm = fakeSeam()
    const out = await harnessEnhance(llm, { ...REQ, llm: '' }, 'p/m')
    assert.equal(out.via, 'p/m')
  })

  test('empty-string llm with an empty-string default refuses like no name at all', async () => {
    const msg = await throwsMsg(() => harnessEnhance(fakeSeam(), { ...REQ, llm: '' }, ''))
    assert.ok(msg.includes('no llm named and no host default'))
  })

  test('no llm and no default refuses without touching the seam', async () => {
    let touched = false
    const llm = fakeSeam({ onOptions: () => { touched = true } })
    const msg = await throwsMsg(() => harnessEnhance(llm, { ...REQ }))
    assert.ok(msg.includes('no llm named and no host default'))
    assert.equal(touched, false)
  })
})

describe('parseEnhanceJson residuals', () => {
  test('a fenced reply parses', () => {
    assert.deepEqual(
      parseEnhanceJson('```json\n{"positive":"P","negative":"N"}\n```'),
      { positive: 'P', negative: 'N' },
    )
  })

  test('prose around the object parses via the brace slice', () => {
    assert.deepEqual(
      parseEnhanceJson('sure! {"positive":"P","negative":"N"} hope that helps'),
      { positive: 'P', negative: 'N' },
    )
  })

  test('a missing negative defaults to empty string', () => {
    assert.deepEqual(parseEnhanceJson('{"positive":"P"}'), { positive: 'P', negative: '' })
  })

  test('a non-string positive falls through every attempt to the honest throw', async () => {
    const msg = await throwsMsg(async () => parseEnhanceJson('{"positive":42,"negative":"N"}'))
    assert.ok(msg.includes('was not the recipe JSON'))
  })

  test('null JSON and garbage throw with the raw head', async () => {
    for (const bad of ['null', 'just prose, no braces at all']) {
      const msg = await throwsMsg(async () => parseEnhanceJson(bad))
      assert.ok(msg.includes('was not the recipe JSON'))
      assert.ok(msg.includes(bad.slice(0, 20)))
    }
  })

  test('the head truncates at 160 chars', async () => {
    const long = 'x'.repeat(500)
    const msg = await throwsMsg(async () => parseEnhanceJson(long))
    assert.ok(msg.includes('x'.repeat(160)))
    assert.equal(msg.includes('x'.repeat(161)), false)
  })
})


// ── the live wire tie (picker audit F4, 2026-10-26) ────────────────
// The fake-seam arms above judge the resolver's laws in-process; this
// arm judges THE WIRE: the estate's served llmRoutes must obey the
// same completeness grammar — every name parses as provider/model,
// every name resolves back through the picker's own matcher, no
// duplicates, and the round-robin head cadence holds (each provider's
// first route rides ahead of any second: the served list is the
// resolver's output, never a reordered or sliced copy). Opt-in by the
// estate being up — unreachable catalog self-skips, a reachable one
// is JUDGED (the ARM 2 shape, at the wire).
const ESTATE_CATALOG = process.env.MELITE_ESTATE_CATALOG ?? 'http://127.0.0.1:3088/melite-tools/catalog'

async function liveCatalog(): Promise<string[] | null> {
  try {
    const res = await fetch(ESTATE_CATALOG, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const body = (await res.json()) as { llmRoutes?: unknown }
    return Array.isArray(body.llmRoutes) && body.llmRoutes.every((r) => typeof r === 'string')
      ? body.llmRoutes as string[]
      : null
  } catch {
    return null
  }
}

describe('the live catalog tie (served llmRoutes obey the resolver grammar)', () => {
  let served: string[] | null = null
  beforeAll(async () => { served = await liveCatalog() })

  test('every served route parses provider/model and resolves through the picker matcher', async () => {
    if (served === null) return // the estate is down — the fake-seam arms above carry the laws
    const routes = served.map((name) => {
      const slash = name.indexOf('/')
      assert.ok(slash > 0, `served route '${name}' is not provider/model — the wire grammar broke`)
      return { provider: name.slice(0, slash), model: name.slice(slash + 1) }
    })
    // no duplicates (a duplicate list starves the round-robin)
    assert.equal(new Set(served).size, served.length, 'the served list carries duplicates')
    // the round-robin cadence, CROSS-ROUND only (within a round the
    // provider order is free): when a provider rides its (r+1)-th
    // route, round r is COMPLETE — every provider that HAS an r-th
    // route has ridden it. Providers exhausted before round r (fewer
    // than r models total) are out of the rotation, never starved.
    const totals = new Map<string, number>()
    for (const r of routes) totals.set(r.provider, (totals.get(r.provider) ?? 0) + 1)
    const seenCounts = new Map<string, number>()
    for (const r of routes) {
      const mine = (seenCounts.get(r.provider) ?? 0) + 1
      seenCounts.set(r.provider, mine)
      if (mine < 2) continue // the first round has no prior round to complete
      const owing = [...totals.entries()].filter(([p, total]) =>
        total >= mine - 1 && (seenCounts.get(p) ?? 0) < mine - 1)
      assert.equal(owing.length, 0,
        `round-robin broken at ${r.provider}/${r.model} (its route #${mine}): round ${mine - 1} incomplete — providers with a route #${mine - 1} still owing one: ${owing.map(([p]) => p).join(', ')}`)
    }
    // every name matches back through the resolver's own matcher
    for (const name of served) {
      assert.ok(matchHarnessRoute(routes, name) !== undefined,
        `served route '${name}' does not resolve through matchHarnessRoute — the picker cannot pick what the wire serves`)
    }
  })
})
