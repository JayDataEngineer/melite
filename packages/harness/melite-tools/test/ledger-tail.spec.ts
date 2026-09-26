// ledger_tail walls (vitest, estate mocked — no gateway): the tail
// builds its query honestly (floored positive numbers ride, the rest
// fall away; the event prefix rides verbatim), rows default past
// misshapen members, and the render counts shown-of-matched (0s on
// sparse values). Non-number limits / non-string events never reach
// the body — they throw at the wrapper gate (presence contract).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { ledgerTail } from '../src/tools/ledger-tail.ts'
import type { EstateRequest } from '../src/estate.ts'

function mockRequest(
  handler: (method: string, path: string, body: unknown) => unknown,
): { calls: Array<{ method: string; path: string }>; request: EstateRequest } {
  const calls: Array<{ method: string; path: string }> = []
  const request = (async (method: string, path: string): Promise<unknown> => {
    calls.push({ method, path })
    return handler(method, path, undefined)
  }) as EstateRequest
  return { calls, request }
}

const exec = { signal: AbortSignal.timeout(2000) }

describe('ledger_tail presentCall — the streaming tile', () => {
  test('echoes the filters; junk renders generic (the re-attached presenter)', () => {
    const tool = ledgerTail((async () => ({})) as EstateRequest)
    assert.deepEqual(
      tool.presentCall!({ limit: 5, event: 'run.' } as never).rawInput,
      { limit: 5, event: 'run.' },
    )
    assert.deepEqual(tool.presentCall!({} as never).rawInput, { limit: undefined, event: undefined })
    assert.deepEqual(tool.presentCall!(null as never).rawInput, { limit: undefined, event: undefined })
    assert.deepEqual(tool.presentCall!('x' as never).rawInput, { limit: undefined, event: undefined })
    assert.equal(tool.presentCall!({} as never).title, 'Ledger tail')
  })
})

describe('ledger_tail execute — the tail', () => {
  test('non-object args throw at the wrapper gate', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = ledgerTail(request)
    await assert.rejects(tool.execute(undefined as never, exec), ToolArgsError)
  })

  test('a string limit throws at the wrapper gate (the gate owns the type)', async () => {
    const seen = mockRequest(() => ({}))
    const tool = ledgerTail(seen.request)
    await assert.rejects(tool.execute({ limit: '10' } as never, exec), ToolArgsError)
    assert.equal(seen.calls.length, 0)
  })

  test('a non-string event throws at the wrapper gate', async () => {
    const seen = mockRequest(() => ({}))
    const tool = ledgerTail(seen.request)
    await assert.rejects(tool.execute({ event: 5 } as never, exec), ToolArgsError)
    assert.equal(seen.calls.length, 0)
  })

  test('bare args tail the door with no query; rows ride verbatim', async () => {
    const entries = [{ ts: 't1', event: 'run.registered', data: {} }]
    const seen = mockRequest((_m, path) => {
      assert.equal(path, '/v1/ledger')
      return { shown: 1, matched: 9, entries }
    })
    const tool = ledgerTail(seen.request)
    const out = await tool.execute({}, exec) as Record<string, unknown>
    assert.deepEqual(out, { shown: 1, matched: 9, entries })
  })

  test('a fractional limit floors onto the query', async () => {
    const seen = mockRequest((_m, path) => {
      assert.equal(path, '/v1/ledger?limit=2')
      return { entries: [] }
    })
    const tool = ledgerTail(seen.request)
    await tool.execute({ limit: 2.7 }, exec)
  })

  test('non-positive limits fall away (bare path)', async () => {
    for (const limit of [0, -3]) {
      const seen = mockRequest((_m, path) => {
        assert.equal(path, '/v1/ledger')
        return { entries: [] }
      })
      const tool = ledgerTail(seen.request)
      await tool.execute({ limit }, exec)
    }
  })

  test('non-finite limits throw at the wrapper gate (finite-JSON rule)', async () => {
    const seen = mockRequest(() => ({}))
    const tool = ledgerTail(seen.request)
    await assert.rejects(tool.execute({ limit: Number.NaN } as never, exec), ToolArgsError)
    await assert.rejects(tool.execute({ limit: Number.POSITIVE_INFINITY } as never, exec), ToolArgsError)
    assert.equal(seen.calls.length, 0)
  })

  test('the event prefix rides verbatim; combined filters join in order', async () => {
    const seen = mockRequest((_m, path) => {
      assert.equal(path, '/v1/ledger?limit=5&event=prov')
      return { entries: [] }
    })
    const tool = ledgerTail(seen.request)
    await tool.execute({ limit: 5, event: 'prov' }, exec)
  })

  test('an empty event falls away (bare path)', async () => {
    const seen = mockRequest((_m, path) => {
      assert.equal(path, '/v1/ledger')
      return { entries: [] }
    })
    const tool = ledgerTail(seen.request)
    await tool.execute({ event: '' }, exec)
  })

  test('misshapen members default past the rows (counts follow entries)', async () => {
    const entries = [{ ts: 't', event: 'e', data: {} }, { ts: 't', event: 'e', data: {} }]
    const { request } = mockRequest(() => ({ entries }))
    const tool = ledgerTail(request)
    const out = await tool.execute({}, exec) as Record<string, unknown>
    assert.deepEqual(out, { shown: 2, matched: 2, entries })
  })

  test('a missing rows member tails empty', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = ledgerTail(request)
    const out = await tool.execute({}, exec) as Record<string, unknown>
    assert.deepEqual(out, { shown: 0, matched: 0, entries: [] })
  })

  test('a searched roots list rides the legacy result', async () => {
    const { request } = mockRequest(() => ({ entries: [], searched: ['/state-a', '/state-b'] }))
    const tool = ledgerTail(request)
    const out = await tool.execute({}, exec) as Record<string, unknown>
    assert.deepEqual(out.searched, ['/state-a', '/state-b'])
  })
})

describe('ledger_tail render — the human line', () => {
  const tool = ledgerTail((async () => ({})) as EstateRequest)
  const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''

  test('shown-of-matched rides the line (0s on sparse values)', () => {
    // THE BODIES LAW (a live 3088 commission found the counts-only
    // render): a maker auditing a commission got "8 of 3688" and no
    // history. The head line is unchanged (walls pin it), and the ROWS
    // ride under it.
    assert.equal(text({ shown: 2, matched: 9 }), 'ledger_tail: 2 of 9 entries')
    assert.equal(text({}), 'ledger_tail: 0 of 0 entries')
  })

  test('the render serves the entry BODIES, not only the counts', () => {
    const out = text({
      shown: 2,
      matched: 3688,
      entries: [
        { ts: 1_757_000_000, event: 'run.start', data: { run_id: 'run-abc', card: 'tts' } },
        { ts: 1_757_000_060, event: 'run.finish', data: { run_id: 'run-abc', status: 'completed' } },
      ],
    })
    assert.match(out, /^ledger_tail: 2 of 3688 entries/)
    assert.match(out, /1757000000 run\.start — run_id=run-abc, card=tts/)
    assert.match(out, /1757000060 run\.finish — run_id=run-abc, status=completed/)
  })

  test('the body rows are capped (a 500-row tail is its own context hazard) and say so', () => {
    const many = Array.from({ length: 40 }, (_v, i) => ({
      ts: 1_757_000_000 + i,
      event: 'run.start',
      data: { run_id: 'run-' + String(i) },
    }))
    const out = text({ shown: 40, matched: 40, entries: many })
    const lines = out.split('\n')
    assert.match(lines[lines.length - 1] as string, /more row\(s\) in the structured result/)
    // 1 head + 20 rows + 1 pointer
    assert.equal(lines.length, 22)
  })

  test('a long data value is truncated in the row, never dropped whole', () => {
    const out = text({
      shown: 1,
      matched: 1,
      entries: [{ ts: 1, event: 'x', data: { blob: 'y'.repeat(500) } }],
    })
    assert.match(out, /blob=yyy/)
    assert.equal(out.includes('y'.repeat(500)), false)
  })
})
