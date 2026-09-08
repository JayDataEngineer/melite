// L4 barrier wall: the melite harness tools must ride the test flag
// into the start body. test:true => the run goes to test-output and
// stays hidden from production /v1/assets.
//
// Runs under bun:test from the package dir (zero deps; bun:test is
// built in). fetch is mocked -- milliseconds, no gateway, no GPU.

import { afterEach, describe, expect, test } from 'bun:test'
import { flowRun } from '../src/tools/flow-run.ts'
import { cardRun } from '../src/tools/card-run.ts'

const origFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = origFetch })

function captureFetch(returnBody: unknown, status = 200) {
  const seen: { url: string; init: RequestInit | undefined } = {
    url: '', init: undefined,
  }
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    seen.url = String(url)
    seen.init = init
    return new Response(JSON.stringify(returnBody), { status })
  }) as typeof fetch
  return seen
}

function decodeJsonBody(init: RequestInit | undefined): Record<string, unknown> {
  if (!init || !init.body) throw new Error('no body captured')
  if (typeof init.body !== 'string') throw new Error('body is not a string')
  return JSON.parse(init.body) as Record<string, unknown>
}

describe('flow_run L4 -- test flag rides into the start body', () => {
  const tool = flowRun('http://g')

  // CARD BIRTH LAW (operator order 2026-09-06): flow_run composes the
  // headless card FIRST (POST /v1/flows/drafts → {draftId}), then
  // rides the minted id on the start envelope. The mock routes by
  // path; call order + both bodies are asserted.
  function mockComposeThenStart() {
    const seen: { url: string; init: RequestInit | undefined }[] = []
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      const u = String(url)
      seen.push({ url: u, init })
      if (u.endsWith('/v1/flows/drafts')) {
        return new Response(JSON.stringify({ draftId: 'draft-headless-1' }),
                            { status: 200 })
      }
      return new Response(
        JSON.stringify({ run_id: 'r0', status: 'queued' }), { status: 202 })
    }) as typeof fetch
    return seen
  }

  function startBody(seen: { url: string; init: RequestInit | undefined }[]) {
    const posts = seen.filter(s => String(s.url).endsWith('/v1/flows/start'))
    if (posts.length !== 1) throw new Error('expected exactly one start POST')
    return decodeJsonBody(posts[0].init)
  }

  test('test:false is the default (production submission)', async () => {
    const seen = mockComposeThenStart()
    await tool.execute({ template: 'foo' }, { signal: AbortSignal.timeout(2000) })
    const body = startBody(seen)
    expect(body.test).toBe(false)
    expect(body.flow).toBe('foo')
    // the dead {yaml:} key must not ride along (retired 2026-09-04
    // with the yaml text parser — resolve_request accepts flow/model)
    expect(body.yaml).toBeUndefined()
  })

  test('test:true routes to the test-output root (L3) and tags the sidecar (L1)', async () => {
    const seen = mockComposeThenStart()
    await tool.execute(
      { template: 'foo', test: true },
      { signal: AbortSignal.timeout(2000) },
    )
    const body = startBody(seen)
    expect(body.test).toBe(true)
    // the flow is still EXPLICITLY named (QUEUE LANE LAW) -- test is
    // a side flag, never a substitute for the named flow
    expect(body.flow).toBe('foo')
  })

  test('test is propagated alongside user params (override shape is preserved)', async () => {
    const seen = mockComposeThenStart()
    await tool.execute(
      { template: 'bar', params: { seed: 42, steps: 8 }, test: true },
      { signal: AbortSignal.timeout(2000) },
    )
    const body = startBody(seen)
    expect(body.test).toBe(true)
    expect(body.seed).toBe(42)
    expect(body.steps).toBe(8)
    expect(body.flow).toBe('bar')
  })

  test('CARD BIRTH LAW: compose-first, minted draft_id rides the start', async () => {
    const seen = mockComposeThenStart()
    const out = await tool.execute(
      { template: 'foo', params: { seed: 7 } },
      { signal: AbortSignal.timeout(2000) },
    ) as { run_id?: string; error?: string }
    expect(out.error).toBeUndefined()
    expect(out.run_id).toBe('r0')
    // compose happened FIRST, carrying the headless card
    expect(seen.length).toBe(2)
    expect(seen[0].url).toBe('http://g/v1/flows/drafts')
    const composed = decodeJsonBody(seen[0].init)
    expect(composed.flow).toBe('foo')
    expect(composed.seed).toBe(7)
    // the start rides the minted id on the envelope
    const body = startBody(seen)
    expect(body.flow).toBe('foo')
    expect(body.draft_id).toBe('draft-headless-1')
  })

  test('CARD BIRTH LAW: a refused compose never reaches the start door', async () => {
    globalThis.fetch = (async (url: unknown) => {
      const u = String(url)
      if (u.endsWith('/v1/flows/drafts')) {
        return new Response(JSON.stringify({ error: 'unknown flow' }),
                            { status: 400 })
      }
      throw new Error('start door must not be reached, got ' + u)
    }) as typeof fetch
    const out = await tool.execute(
      { template: 'no-such-flow' },
      { signal: AbortSignal.timeout(2000) },
    ) as { error?: string }
    expect(out.error).toContain('unknown flow')
  })
})

describe('card_run L4 -- test flag rides into the start body', () => {
  const tool = cardRun('http://g')

  function mockDraftFetch(draftBody: unknown) {
    // card_run does two fetches: GET /v1/flows/drafts/<id> then
    // POST /v1/flows/start. The test only cares about the POST,
    // so we route based on method + url.
    const seen: { url: string; init: RequestInit | undefined }[] = []
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      const u = String(url)
      const m = init?.method ?? 'GET'
      seen.push({ url: u, init })
      if (m === 'GET') {
        return new Response(JSON.stringify(draftBody), { status: 200 })
      }
      return new Response(JSON.stringify({ run_id: 'r4', status: 'queued' }),
                          { status: 202 })
    }) as typeof fetch
    return seen
  }

  const singleDraft = {
    stages: [{ service: 'z-image', params: { prompt: 'a' } }],
  }

  test('test:false is the default (production submission)', async () => {
    const seen = mockDraftFetch(singleDraft)
    await tool.execute(
      { draftId: 'd-1' },
      { signal: AbortSignal.timeout(2000) },
    )
    const post = seen.find(s => s.init?.method === 'POST')!
    const body = decodeJsonBody(post.init)
    expect(body.test).toBe(false)
    expect(body.model).toBe('z-image')
    // CARD BIRTH LAW: the start rides the fetched draft's id
    expect(body.draft_id).toBe('d-1')
  })

  test('test:true routes to the test-output root and tags the sidecar', async () => {
    const seen = mockDraftFetch(singleDraft)
    await tool.execute(
      { draftId: 'd-2', test: true },
      { signal: AbortSignal.timeout(2000) },
    )
    const post = seen.find(s => s.init?.method === 'POST')!
    const body = decodeJsonBody(post.init)
    expect(body.test).toBe(true)
    expect(body.model).toBe('z-image')
    expect(body.draft_id).toBe('d-2')
  })
})
