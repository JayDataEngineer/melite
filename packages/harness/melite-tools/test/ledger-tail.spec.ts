// ledger_tail walls (vitest, estate mocked — no gateway): the tail
// builds its query honestly (floored positive numbers ride, the rest
// fall away; the event prefix rides verbatim), rows default past
// misshapen members, and the render counts shown-of-matched (0s on
// sparse values). Non-number limits / non-string events never reach
// the body — they throw at the wrapper gate (presence contract).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import { ledgerTail } from '../src/tools/ledger-tail.ts'
import type { EstateRequest } from '../src/estate.ts'
import { fakeExec } from './fake-exec.ts'

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

const exec = fakeExec(AbortSignal.timeout(2000))

describe('ledger_tail presentCall — the streaming tile', () => {
  test('echoes the filters; junk renders generic (the re-attached presenter)', () => {
    const tool = ledgerTail((async () => ({})) as EstateRequest)
    // The tile always answers the generic card (pinned below) — narrow
    // the ToolCallView union to read its rawInput.
    assert.deepEqual(
      (tool.presentCall!({ limit: 5, event: 'run.' } as never)! as GenericCallView).rawInput,
      { limit: 5, event: 'run.' },
    )
    assert.deepEqual((tool.presentCall!({} as never)! as GenericCallView).rawInput, { limit: undefined, event: undefined })
    assert.deepEqual((tool.presentCall!(null as never)! as GenericCallView).rawInput, { limit: undefined, event: undefined })
    assert.deepEqual((tool.presentCall!('x' as never)! as GenericCallView).rawInput, { limit: undefined, event: undefined })
    assert.equal(tool.presentCall!({} as never)!.title, 'Ledger tail')
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

  // THE ROW-SHAPE COERCIONS (batch-5 closure, 2026-10-14 — O25i):
  // the ledger is a durable file boundary, so the renderer treats
  // every member as hostile: a non-string ts degrades to '?', a
  // non-string event to '(no event)', and data rides whatever shape
  // it arrived in — object members skip nulls and cap at 60, a bare
  // scalar/string data rides the 80-cap note, and no row may throw.
  test('misshapen rows degrade to their sentinels — never throw', () => {
    const out = text({
      shown: 5,
      matched: 5,
      entries: [
        { ts: null, event: 42, data: null },
        { ts: true, event: {}, data: 'plain string note' },
        { ts: 't3', event: 'e3', data: [1, 2] },
        { ts: 4, event: 'e4', data: { long: 'z'.repeat(100) } },
        { ts: 5, event: 'e5', data: { skip: null, keep: 'v' } },
      ],
    })
    const lines = out.split('\n')
    // 1) null ts + numeric event + null data: the sentinels — and
    //    null data rides the JSON note (the guard is !== undefined)
    assert.equal(lines[1], '? (no event) — null')
    // 2) boolean ts, object event, STRING data: string rides as-is
    assert.equal(lines[2], '? (no event) — plain string note')
    // 3) string ts (the other accepted spelling), ARRAY data: the
    //    array falls through the object guard and stringifies
    assert.equal(lines[3], 't3 e3 — [1,2]')
    // 4) an object member past the 60-char cap truncates with the …
    assert.match(lines[4] as string, /e4 — long=zzz/)
    assert.equal((lines[4] as string).includes('z'.repeat(100)), false)
    // 5) a null member is skipped, its sibling keeps the line
    assert.equal(lines[5], '5 e5 — keep=v')
  })

  test('a scalar data rides the 80-cap note — the JSON spelling, never dropped', () => {
    const out = text({
      shown: 2,
      matched: 2,
      entries: [
        { ts: 1, event: 'num', data: 42 },
        { ts: 2, event: 'str', data: 'w'.repeat(200) },
      ],
    })
    const lines = out.split('\n')
    // JSON.stringify spelling for the scalar
    assert.equal(lines[1], '1 num — 42')
    // the 80-cap with the … on the string
    assert.match(lines[2] as string, /2 str — www/)
    assert.equal((lines[2] as string).includes('w'.repeat(200)), false)
    assert.equal(((lines[2] as string).match(/w+/) as RegExpMatchArray)[0].length <= 80, true)
  })

  test('the CHARACTER cap breaks the loop and says where the rest rides', () => {
    // wide object rows (6 members × 57 chars ≈ 430/line) exhaust the
    // 6000-char budget around the 13th row — well under the 20-row
    // cap: the loop breaks, the cap line names the structured result
    const rows = Array.from({ length: 40 }, (_v, i) => ({
      ts: i,
      event: 'wide',
      data: {
        a: 'x'.repeat(57), b: 'x'.repeat(57), c: 'x'.repeat(57),
        d: 'x'.repeat(57), e: 'x'.repeat(57), f: 'x'.repeat(57),
      },
    }))
    const out = text({ shown: 40, matched: 40, entries: rows })
    const lines = out.split('\n')
    // head + 15 wide rows + the char-cap line + the rows-shown pointer
    assert.equal(lines.length, 18)
    assert.match(lines[lines.length - 2] as string, /row cap reached/)
    assert.match(lines[lines.length - 1] as string, /20 more row\(s\) in the structured result/)
  })
})
