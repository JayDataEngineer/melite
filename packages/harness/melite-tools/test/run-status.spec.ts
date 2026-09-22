// run_status walls (vitest, estate mocked — no gateway, no GPU):
//   1. the pre-fetch guard refuses bare runId values (empty string —
//      the wrapper gate proves a string, ToolArgsError proves presence)
//   2. status fetch refusals ride the value as `code: message`
//      (RemoteError) while transport failures propagate (rethrow)
//   3. gateway-shaped rows project with honest defaults (unknown / []
//      / 0) and a gateway {error} refuses without a status
//   4. the render tolerates sparse values (replay path) and counts
//      completions past null stage rows; queue suffix only past 0

import { describe, test, vi, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { runStatus } from '../src/tools/run-status.ts'
import { withArgCoercion, coerceArgs } from '../src/tools/arg-coerce.ts'
import type { EstateRequest } from '../src/estate.ts'

afterEach(() => { vi.useRealTimers() })

function mockRequest(
  handler: (method: string, path: string, body: unknown) => unknown,
): { calls: Array<{ method: string; path: string; body: unknown }>; request: EstateRequest } {
  const calls: Array<{ method: string; path: string; body: unknown }> = []
  const request = (async (method: string, path: string, body: unknown): Promise<unknown> => {
    calls.push({ method, path, body })
    return handler(method, path, body)
  }) as EstateRequest
  return { calls, request }
}

const exec = { signal: AbortSignal.timeout(2000) }

describe('run_status presentCall — the streaming tile', () => {
  test('titles the run; junk renders generic (the re-attached presenter)', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    assert.equal(tool.presentCall!({ runId: 'r1' } as never).title, 'Run status: r1')
    assert.equal(tool.presentCall!({ runId: 'r1' } as never).rawInput, 'r1')
    assert.equal(tool.presentCall!({} as never).title, 'Run status: ?')
    assert.equal(tool.presentCall!(null as never).title, 'Run status: ?')
    assert.equal(tool.presentCall!('x' as never).title, 'Run status: ?')
    assert.equal(tool.presentCall!({ runId: 'r1' } as never).card, 'generic')
  })
})

describe('run_status execute — the run monitor', () => {
  test('missing runId throws at the wrapper gate (presence contract)', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = runStatus(request)
    await assert.rejects(tool.execute({} as never, exec), ToolArgsError)
  })

  test('empty runId refuses bare without any fetch', async () => {
    const seen = mockRequest(() => ({}))
    const tool = runStatus(seen.request)
    const out = await tool.execute({ runId: '' }, exec) as Record<string, unknown>
    assert.equal(out.error, 'runId is required')
    assert.equal(seen.calls.length, 0)
  })

  test('a full row projects verbatim (encoding rides the path)', async () => {
    const seen = mockRequest((_m, path) => {
      assert.equal(path, '/v1/flows/status/' + encodeURIComponent('r/1'))
      return {
        run_id: 'r/1', status: 'running',
        stages: [{ id: 's_0', status: 'completed' }],
        artifacts: [{ path: 'out.png', bytes: 12 }],
        queue_position: 2,
      }
    })
    const tool = runStatus(seen.request)
    const out = await tool.execute({ runId: 'r/1' }, exec) as Record<string, unknown>
    assert.equal(out.run_id, 'r/1')
    assert.equal(out.status, 'running')
    assert.deepEqual(out.stages, [{ id: 's_0', status: 'completed' }])
    assert.deepEqual(out.artifacts, [{ path: 'out.png', bytes: 12 }])
    assert.equal(out.queue_position, 2)
    assert.equal(out.error, undefined)
  })

  test('a sparse row falls back honestly (unknown / [] / 0, no error key)', async () => {
    const { request } = mockRequest(() => ({}))
    const tool = runStatus(request)
    const out = await tool.execute({ runId: 'r9' }, exec) as Record<string, unknown>
    assert.deepEqual(out, {
      run_id: 'r9', status: 'unknown', stages: [], artifacts: [], queue_position: 0,
    })
  })

  test('non-array stages/artifacts and a non-number queue fall back', async () => {
    const { request } = mockRequest(() => ({ run_id: 'r', status: 'queued', stages: 'x', artifacts: null, queue_position: 'soon' }))
    const tool = runStatus(request)
    const out = await tool.execute({ runId: 'r' }, exec) as Record<string, unknown>
    assert.deepEqual(out.stages, [])
    assert.deepEqual(out.artifacts, [])
    assert.equal(out.queue_position, 0)
  })

  test('a gateway {error} refuses without a status', async () => {
    const { request } = mockRequest(() => ({ error: 'queue forgot this run' }))
    const tool = runStatus(request)
    const out = await tool.execute({ runId: 'r' }, exec) as Record<string, unknown>
    assert.deepEqual(out, { run_id: 'r', error: 'queue forgot this run' })
  })

  test('a remote refusal rides the value as code + message', async () => {
    const { request } = mockRequest(() => {
      throw new RemoteError('runs/unknown-run', 'no such run', { runId: 'r9' })
    })
    const tool = runStatus(request)
    const out = await tool.execute({ runId: 'r9' }, exec) as Record<string, unknown>
    assert.deepEqual(out, { run_id: 'r9', error: 'runs/unknown-run: no such run' })
  })

  test('a transport failure propagates (never valued)', async () => {
    const { request } = mockRequest(() => { throw new Error('socket hangup') })
    const tool = runStatus(request)
    await assert.rejects(tool.execute({ runId: 'r' }, exec), /socket hangup/)
  })
})

describe('run_status execute — THE WAIT PRIMITIVE (efficiency fix 5)', () => {
  // Fake timers own setTimeout AND Date — the loop's deadline math
  // and its 5s cadence both advance under advanceTimersByTimeAsync.
  function fakeClock(): void {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
  }

  test('wait_s=0 keeps the single-shot read (no wait keys, one fetch)', async () => {
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running' }))
    const tool = runStatus(seen.request)
    const out = await tool.execute({ runId: 'r', wait_s: 0 }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(seen.calls.length, 1)
    assert.equal(out.wait_expired, undefined)
    assert.equal(out.waited_s, undefined)
  })

  test('the long-poll absorbs the poll loop: terminal inside budget → ONE call, waited_s receipt', async () => {
    fakeClock()
    let n = 0
    const seen = mockRequest(() => {
      n += 1
      return n === 1
        ? { run_id: 'r', status: 'running', stages: [] }
        : { run_id: 'r', status: 'completed', stages: [{ id: 's_0', status: 'completed' }], artifacts: [{ path: 'f.mp4' }] }
    })
    const tool = runStatus(seen.request)
    const p = tool.execute({ runId: 'r', wait_s: 300 }, { signal: AbortSignal.timeout(5000) })
    const raced = Promise.race([p, vi.advanceTimersByTimeAsync(5000).then(() => new Promise(() => {}))])
    const out = await raced as Record<string, unknown>
    assert.equal(seen.calls.length, 2)          // running → (5s sleep) → completed
    assert.equal(out.status, 'completed')
    assert.equal(out.wait_expired, undefined)
    assert.equal(typeof out.waited_s, 'number')
  })

  test('budget expiry on a live run → wait_expired:true + the last row (never fabricated)', async () => {
    fakeClock()
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running', stages: [] }))
    const tool = runStatus(seen.request)
    const p = tool.execute({ runId: 'r', wait_s: 3 }, { signal: AbortSignal.timeout(5000) })
    const out = await Promise.race([p, vi.advanceTimersByTimeAsync(10_000).then(() => new Promise(() => {}))]) as Record<string, unknown>
    assert.equal(out.status, 'running')        // the truth at expiry, not a guess
    assert.equal(out.wait_expired, true)
    assert.equal(out.wait_budget_s, 3)
    assert.ok(seen.calls.length >= 2)          // fetch → sleep-past-deadline → fetch
  })

  test('a numeric-string wait_s coerces (the 4× timeoutMs lesson, fix 3)', async () => {
    const seen = mockRequest(() => ({ run_id: 'r', status: 'completed' }))
    // the registration-site wrap (index.ts) — the valve BEFORE the gate
    const tool = withArgCoercion(runStatus(seen.request))
    const out = await tool.execute({ runId: 'r', wait_s: '0' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.equal(out.status, 'completed')
    assert.equal(seen.calls.length, 1)
  })

  test('a cancelled wait rejects through the sleep (no lingering fetch)', async () => {
    fakeClock()
    const ac = new AbortController()
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running' }))
    const tool = runStatus(seen.request)
    const p = tool.execute({ runId: 'r', wait_s: 300 }, { signal: ac.signal })
    const guard = p.catch((e: unknown) => e)
    vi.advanceTimersByTimeAsync(1000).then(() => ac.abort(new Error('user cancelled')))
    const settled = await Promise.race([guard, vi.advanceTimersByTimeAsync(6000).then(() => new Promise(() => {}))])
    assert.ok(settled instanceof Error || settled === undefined)
  })

  test('a bare abort (no reason) falls back to the generic error (the ?? arm)', async () => {
    fakeClock()
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running' }))
    const tool = runStatus(seen.request)
    const ac = new AbortController()
    ac.abort()   // reason undefined — the sleep rejects with 'aborted'
    await assert.rejects(
      tool.execute({ runId: 'r', wait_s: 30 }, { signal: ac.signal }),
      /aborted/,
    )
    assert.equal(seen.calls.length, 1)
  })

  test('a non-conforming signal with undefined reason still rejects loud (the ?? fallback)', async () => {
    fakeClock()
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running' }))
    const tool = runStatus(seen.request)
    // aborted on entry with reason undefined (a stub, never a real
    // AbortSignal whose default reason is truthy) — the fallback
    // Error('aborted') is the rejection, never a silent hang
    const stub = { aborted: true, reason: undefined } as never
    await assert.rejects(tool.execute({ runId: 'r', wait_s: 30 }, { signal: stub }), /aborted/)
    assert.equal(seen.calls.length, 1)
  })

  test('an ALREADY-aborted signal rejects before the first fetch (the sleep pre-check arm)', async () => {
    fakeClock()
    const seen = mockRequest(() => ({ run_id: 'r', status: 'running' }))
    const tool = runStatus(seen.request)
    const ac = new AbortController()
    ac.abort(new Error('late arrival'))
    // wait_s>0 forces the loop; the signal is dead on entry — the
    // sleep's pre-abort arm rejects without a second fetch.
    await assert.rejects(
      tool.execute({ runId: 'r', wait_s: 30 }, { signal: ac.signal }),
      /late arrival/,
    )
    assert.equal(seen.calls.length, 1)   // the one pre-sleep fetch only
  })

  test('a live-plan row projects verbatim (planned_stages/card/run_age_s true paths)', async () => {
    const seen = mockRequest(() => ({
      run_id: 'r', status: 'running',
      planned_stages: [{ id: 'h3-film', engine: 'comfyui' }],
      card: 'h3-timeline', run_age_s: 42,
    }))
    const tool = runStatus(seen.request)
    const out = await tool.execute({ runId: 'r' }, { signal: AbortSignal.timeout(2000) }) as Record<string, unknown>
    assert.deepEqual(out.planned_stages, [{ id: 'h3-film', engine: 'comfyui' }])
    assert.equal(out.card, 'h3-timeline')
    assert.equal(out.run_age_s, 42)
  })
})

describe('coerceArgs — the numeric-string valve (fix 3)', () => {
  const props = { wait_s: { type: 'number' }, deep: { type: 'boolean' }, s: { type: 'string' } }
  test('numeric strings coerce; boolean strings coerce; garbage stays for the gate', () => {
    const out = coerceArgs(props, { wait_s: '300', deep: 'true', s: 'keep' }) as Record<string, unknown>
    assert.equal(out.wait_s, 300)
    assert.equal(out.deep, true)
    assert.equal(out.s, 'keep')
    const bad = coerceArgs(props, { wait_s: 'soon' }) as Record<string, unknown>
    assert.equal(bad.wait_s, 'soon')
    const empty = coerceArgs(props, { wait_s: '' }) as Record<string, unknown>
    assert.equal(empty.wait_s, '')
    // a boolean slot given a non-'true'/'false' string rides verbatim
    // (the || else arm) — the gate still owns it
    const boolGarbage = coerceArgs(props, { deep: 'yes' }) as Record<string, unknown>
    assert.equal(boolGarbage.deep, 'yes')
    const boolFalse = coerceArgs(props, { deep: 'false' }) as Record<string, unknown>
    assert.equal(boolFalse.deep, false)
  })
  test('withArgCoercion passes through defs it cannot wrap (the early-return arm)', () => {
    const bare = { name: 'x' }
    assert.equal(withArgCoercion(bare as never), bare)
    const noExecute = { parameters: { properties: { wait_s: { type: 'number' } } } }
    assert.equal(withArgCoercion(noExecute as never), noExecute)
  })
  test('non-objects and schema-less defs ride untouched', () => {
    const obj = { a: '1' }
    assert.equal(coerceArgs(undefined, obj), obj)
    assert.equal(coerceArgs(props, null), null)
    assert.equal(coerceArgs(props, 'x'), 'x')
  })
})

describe('run_status render — the human line', () => {
  test('errors name the run, status and refusal', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(text({ run_id: 'r', status: 'error', error: 'boom' }), 'run r error — boom')
    assert.equal(text({ error: 'boom' }), 'run ? ? — boom')
  })

  test('progress counts completions past null rows; queue suffix only past 0', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(
      text({ run_id: 'r1', status: 'running', stages: [null, { status: 'running' }, { status: 'completed' }], artifacts: [{}, {}], queue_position: 5 }),
      'run r1 running (queue #5) — 1/3 stage(s) · 2 artifact(s)',
    )
    assert.equal(text({}), 'run ? ? — 0/0 stage(s)')
    assert.equal(text({ run_id: 'r', status: 'queued', queue_position: 0 }), 'run r queued — 0/0 stage(s)')
  })

  test('a live row with no stage rows renders its registered plan + age (Fix 2)', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(
      text({ run_id: 'r1', status: 'running', stages: [], planned_stages: [{ id: 'h3-film', engine: 'comfyui' }], card: 'h3-timeline', run_age_s: 754 }),
      'run r1 running — 0/0 stage(s) · plan: 1 stage(s) (h3-timeline) · age 754s',
    )
    // no plan: the bare render survives (honest fallback, never fabricated)
    assert.equal(
      text({ run_id: 'r2', status: 'queued', stages: [], queue_position: 0 }),
      'run r2 queued — 0/0 stage(s)',
    )
    // plan WITHOUT card/age: the cond-expr else arms (no parens, no age suffix)
    assert.equal(
      text({ run_id: 'r3', status: 'running', stages: [], planned_stages: [{ id: 'h3-film' }] }),
      'run r3 running — 0/0 stage(s) · plan: 1 stage(s)',
    )
  })

  test('the wait receipts render: expiry asks for another wait, waited_s proves absorption (Fix 5)', () => {
    const tool = runStatus((async () => ({})) as EstateRequest)
    const text = (v: unknown) => (tool.output.render({} as never, v as never) as Array<{ text?: string }>)[0].text ?? ''
    assert.equal(
      text({ run_id: 'r', status: 'running', stages: [], wait_expired: true, wait_budget_s: 300 }),
      'run r running — 0/0 stage(s) · wait expired (budget spent, not terminal — wait again)',
    )
    assert.equal(
      text({ run_id: 'r', status: 'completed', stages: [{ status: 'completed' }], waited_s: 5 }),
      'run r completed — 1/1 stage(s) · waited 5s',
    )
  })
})
