// run_status walls (vitest, estate mocked — no gateway, no GPU):
//   1. the pre-fetch guard refuses bare runId values (empty string —
//      the wrapper gate proves a string, ToolArgsError proves presence)
//   2. status fetch refusals ride the value as `code: message`
//      (RemoteError) while transport failures propagate (rethrow)
//   3. gateway-shaped rows project with honest defaults (unknown / []
//      / 0) and a gateway {error} refuses without a status
//   4. the render tolerates sparse values (replay path) and counts
//      completions past null stage rows; queue suffix only past 0

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { ToolArgsError } from '@deepseek-ai/dsh-tools'
import { runStatus } from '../src/tools/run-status.ts'
import type { EstateRequest } from '../src/estate.ts'

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
  })
})
