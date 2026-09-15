// melite_discover walls (vitest, estate mocked — no gateway, no
// network). Pins the thin discover face over the disclose seat:
//   1. FILTERS: lookup defaults to all; empty q/tags ride omitted
//      (never as empty query params).
//   2. COUNTS-FIRST: past CLAMP (12) lines on either plane the
//      answer clamps (counts + tag vocabulary + first rows + hint);
//      detail=true returns every line.
//   3. REFUSALS ride the value (body text > message > 'discover
//      failed').
//   4. PRESENTATION: Discover[: bits] search card; the render
//      counts flows/cards (REFUSED on refusal), never throwing.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { meliteDiscover } from '../src/tools/melite-discover.ts'
import type { EstateRequest } from '../src/estate.ts'

function mockRequest(handler: (method: string, path: string, body: unknown) => unknown): {
  seen: Array<{ method: string; path: string; body: unknown; timeoutMs: number }>;
  request: EstateRequest;
} {
  const seen: Array<{ method: string; path: string; body: unknown; timeoutMs: number }> = []
  const request = (async (method, path, body, _signal, timeoutMs) => {
    seen.push({ method: method as string, path: path as string, body, timeoutMs: timeoutMs as number })
    return handler(method as string, path as string, body)
  }) as unknown as EstateRequest
  return { seen, request }
}

function exec(): { signal: AbortSignal } {
  return { signal: AbortSignal.timeout(5000) }
}

function stubRequest(): EstateRequest {
  return (async () => ({})) as unknown as EstateRequest
}

function flowLine(i: number): Record<string, unknown> {
  return { name: 'flow-' + i, title: 'Flow ' + i, description: 'd', stages: 2, skillRefs: [] }
}

function cardLine(i: number, tags?: unknown): Record<string, unknown> {
  return tags === undefined
    ? { id: 'card-' + i, label: 'Card ' + i, description: 'd' }
    : { id: 'card-' + i, label: 'Card ' + i, description: 'd', tags }
}

describe('melite_discover presentCall — the Discover card', () => {
  test('lists every salient filter bit', () => {
    const tool = meliteDiscover(stubRequest())
    const view = tool.presentCall!({ lookup: 'cards', tags: 'image,upscale', q: 'hi' })
    assert.equal(view?.card, 'generic')
    assert.equal(view?.title, 'Discover: cards · image,upscale · hi')
    assert.equal(view?.kind, 'search')
  })

  test('empty filters ride omitted', () => {
    const tool = meliteDiscover(stubRequest())
    assert.equal(tool.presentCall!({ lookup: '', tags: '', q: '' })?.title, 'Discover')
    assert.equal(tool.presentCall!({ tags: 'x' })?.title, 'Discover: x')
  })

  test('junk args still render the generic card', () => {
    const tool = meliteDiscover(stubRequest())
    assert.equal(tool.presentCall!({})?.title, 'Discover')
    assert.equal(tool.presentCall!(null)?.title, 'Discover')
  })
})

describe('melite_discover execute — the filter lane', () => {
  test('defaults ride lookup=all on the 15s budget', async () => {
    const flows = [flowLine(0), flowLine(1)]
    const cards = [cardLine(0, ['image']), cardLine(1, ['upscale'])]
    const { seen, request } = mockRequest(() => ({ flows, cards }))
    const tool = meliteDiscover(request)
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.deepEqual(out.flows, flows)
    assert.deepEqual(out.cards, cards)
    assert.equal(seen.length, 1)
    assert.equal(seen[0]!.method, 'GET')
    assert.equal(seen[0]!.path, '/v1/discover?lookup=all')
    assert.equal(seen[0]!.body, undefined)
    assert.equal(seen[0]!.timeoutMs, 15_000)
  })

  test('set filters ride the query string', async () => {
    const { seen, request } = mockRequest(() => ({ flows: [], cards: [] }))
    const tool = meliteDiscover(request)
    await tool.execute({ lookup: 'cards', tags: 'image', q: 'up' }, exec())
    const path = seen[0]!.path
    assert.ok(path.startsWith('/v1/discover?'), path)
    assert.ok(path.includes('lookup=cards'), path)
    assert.ok(path.includes('tags=image'), path)
    assert.ok(path.includes('q=up'), path)
  })

  test('empty-string filters ride omitted (lookup falls back to all)', async () => {
    const { seen, request } = mockRequest(() => ({ flows: [], cards: [] }))
    const tool = meliteDiscover(request)
    await tool.execute({ lookup: '', tags: '', q: '' }, exec())
    assert.equal(seen[0]!.path, '/v1/discover?lookup=all')
  })

  test('a partial gateway answer still returns verbatim (missing planes default empty)', async () => {
    const flows = [flowLine(0)]
    const { request: reqA } = mockRequest(() => ({ flows }))
    const toolA = meliteDiscover(reqA)
    const outA = await toolA.execute({}, exec()) as Record<string, unknown>
    assert.deepEqual(outA, { flows })
    const cards = [cardLine(0, ['image'])]
    const { request: reqB } = mockRequest(() => ({ cards }))
    const toolB = meliteDiscover(reqB)
    const outB = await toolB.execute({}, exec()) as Record<string, unknown>
    assert.deepEqual(outB, { cards })
  })
})

describe('melite_discover execute — counts-first clamp', () => {
  test('a large flow plane clamps with counts + vocabulary + hint', async () => {
    const flows = Array.from({ length: 13 }, (_, i) => flowLine(i))
    const cards = [
      cardLine(0, ['upscale', 'image', '', 7]),
      cardLine(1),
    ]
    const { request } = mockRequest(() => ({ flows, cards }))
    const tool = meliteDiscover(request)
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.deepEqual(out.counts, { flows: 13, cards: 2 })
    // the vocabulary keeps declared string tags only, sorted.
    assert.deepEqual(out.tag_vocabulary, ['image', 'upscale'])
    assert.equal((out.flows as unknown[]).length, 12)
    assert.equal((out.cards as unknown[]).length, 2)
    assert.ok(String(out.hint).includes('clamped'), String(out.hint))
  })

  test('a large card plane alone clamps too', async () => {
    const flows = [flowLine(0)]
    const cards = Array.from({ length: 13 }, (_, i) => cardLine(i, ['t' + (i % 3)]))
    const { request } = mockRequest(() => ({ flows, cards }))
    const tool = meliteDiscover(request)
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.deepEqual(out.counts, { flows: 1, cards: 13 })
    assert.equal((out.cards as unknown[]).length, 12)
    assert.deepEqual(out.tag_vocabulary, ['t0', 't1', 't2'])
  })

  test('detail=true returns every line past the clamp', async () => {
    const flows = Array.from({ length: 13 }, (_, i) => flowLine(i))
    const cards = Array.from({ length: 13 }, (_, i) => cardLine(i))
    const { request } = mockRequest(() => ({ flows, cards }))
    const tool = meliteDiscover(request)
    const out = await tool.execute({ detail: true }, exec()) as Record<string, unknown>
    assert.equal((out.flows as unknown[]).length, 13)
    assert.equal((out.cards as unknown[]).length, 13)
    assert.equal(out.counts, undefined)
  })
})

describe('melite_discover execute — refusals ride the value', () => {
  test('a body-carried refusal wins', async () => {
    const { request } = mockRequest(() => { throw { body: 'seat says no', message: 'wrapped' } })
    const tool = meliteDiscover(request)
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.equal(out.error, 'seat says no')
  })

  test('an empty body falls back to the message', async () => {
    const { request } = mockRequest(() => { throw { body: '', message: 'door message' } })
    const tool = meliteDiscover(request)
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.equal(out.error, 'door message')
  })

  test('a plain Error rides its message', async () => {
    const { request } = mockRequest(() => { throw new Error('boom') })
    const tool = meliteDiscover(request)
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.equal(out.error, 'boom')
  })

  test('a bare throw rides the default text', async () => {
    const { request } = mockRequest(() => { throw 'bare failure' })
    const tool = meliteDiscover(request)
    const out = await tool.execute({}, exec()) as Record<string, unknown>
    assert.equal(out.error, 'discover failed')
  })
})

describe('melite_discover render — the counts line', () => {
  test('a refusal renders REFUSED', () => {
    const tool = meliteDiscover(stubRequest())
    const parts = tool.output.render({}, { error: 'nope' } as never) as Array<{ text?: string }>
    assert.equal(parts.map((p) => p?.text ?? '').join('\n'), 'melite_discover REFUSED: nope')
  })

  test('THE ROWS RIDE (melite_load demands a name "exactly as discovered")', () => {
    const tool = meliteDiscover(stubRequest())
    const parts = tool.output.render(
      {},
      {
        flows: [flowLine(0), flowLine(1)],
        cards: [cardLine(0, ['image', 'upscale'])],
      } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'discover: 2 flows, 1 cards — open one with melite_load\n'
      + 'flows:\n'
      + '  flow-0 — Flow 0 (2 stages)\n'
      + '  flow-1 — Flow 1 (2 stages)\n'
      + 'cards:\n'
      + '  card-0 — Card 0 [image,upscale]',
    )
  })

  test('the clamped shape renders counts over truncated rows + vocabulary + hint', () => {
    const tool = meliteDiscover(stubRequest())
    const parts = tool.output.render(
      {},
      {
        counts: { flows: 0, cards: 20 },
        tag_vocabulary: ['image', 'video'],
        hint: 'clamped — narrow with tags/q, or detail=true for every line',
        flows: [],
        cards: Array.from({ length: 8 }, (_v, i) => cardLine(i)),
      } as never,
    ) as Array<{ text?: string }>
    const out = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(out.startsWith('discover: 0 flows, 20 cards — open one with melite_load'), 'counts come from counts (not the truncated array)')
    assert.ok(out.includes('+12 more — narrow with tags/q, or detail=true'), 'the clamp tail counts the rest')
    assert.ok(out.includes('tag vocabulary: image, video'), 'the vocabulary rides')
    assert.ok(out.includes('hint: clamped — narrow with tags/q, or detail=true for every line'), 'the hint rides')
  })

  test('over RENDER_CLAMP per plane the rows clamp with a +N more tail', () => {
    const tool = meliteDiscover(stubRequest())
    const flows = Array.from({ length: 10 }, (_v, i) => flowLine(i))
    const parts = tool.output.render({}, { flows, cards: [] } as never) as Array<{ text?: string }>
    const out = parts.map((p) => p?.text ?? '').join('\n')
    assert.ok(out.includes('  flow-7 —'), 'clamp boundary rides')
    assert.ok(!out.includes('  flow-8 —'), 'past the clamp nothing rides')
    assert.ok(out.includes('+2 more — detail=true lists every line'), 'the tail counts the rest')
  })

  test('missing lines render as zeroes', () => {
    const tool = meliteDiscover(stubRequest())
    const parts = tool.output.render({}, {} as never) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'discover: 0 flows, 0 cards — open one with melite_load',
    )
  })

  test('a nullish value still renders the counts line', () => {
    const tool = meliteDiscover(stubRequest())
    const parts = tool.output.render({}, null as never) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'discover: 0 flows, 0 cards — open one with melite_load',
    )
  })

  test('non-string flow cells render honest placeholders (never a crash)', () => {
    const tool = meliteDiscover(stubRequest())
    const parts = tool.output.render(
      {},
      { flows: [{ name: 7, title: 'T', stages: 'many' }], cards: [] } as never,
    ) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'discover: 1 flows, 0 cards — open one with melite_load\n'
      + 'flows:\n'
      + '   — T (? stages)',
    )
  })

  test('an empty tag vocabulary renders no vocabulary line', () => {
    const tool = meliteDiscover(stubRequest())
    const parts = tool.output.render({}, { flows: [], cards: [], tag_vocabulary: [] } as never) as Array<{ text?: string }>
    assert.equal(
      parts.map((p) => p?.text ?? '').join('\n'),
      'discover: 0 flows, 0 cards — open one with melite_load',
    )
  })
})
