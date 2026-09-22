// doors.ts discovery rejection walls (vitest, discovery scripted to
// reject — the live arms never fail, so the door's 500 callbacks are
// driven with a mocked module; both Error and non-Error rejections
// ride, covering the message ternary's two arms).
import { describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

const mockState = vi.hoisted(() => ({ failures: {} as Record<string, unknown> }))

vi.mock('../src/discovery.ts', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../src/discovery.ts')>()
  const arm = (name: string) => async (...args: unknown[]) => {
    if (name in mockState.failures) throw mockState.failures[name]
    const fn = (orig as unknown as Record<string, (...a: unknown[]) => unknown>)[name]
    return fn(...args)
  }
  return {
    ...orig,
    cardToolsArm: arm('cardToolsArm'),
    modelCatalogArm: arm('modelCatalogArm'),
    formsArm: arm('formsArm'),
    kindsDoorArm: arm('kindsDoorArm'),
    formSpecArm: arm('formSpecArm'),
  }
})

import { apply } from '../src/doors.ts'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'

interface Route {
  kind: string
  path: string
  handler: (req: unknown, res: unknown) => void
}

function boot(seats: Record<string, unknown> = {}): Route[] {
  const routes: Route[] = []
  const host = {
    effect: (fn: () => void) => {
      fn()
      return () => {}
    },
    llm: {},
    tools: { schemas: () => [] },
    webServer: {
      port: 1,
      register: (route: Route) => {
        routes.push(route)
        return () => {}
      },
    },
    get: (name: string) => seats[name],
  }
  apply(host as never, {})
  return routes
}

/** POST one JSON body at the /v1 prefix door (readBody wants the
 *  request stream's data/end events). */
function post(routes: Route[], url: string, body: unknown): Promise<{ status: number; text: string }> {
  const route = routes.find((r) => r.path === '/v1')!
  const req = new EventEmitter() as EventEmitter & { method: string; url: string }
  req.method = 'POST'
  req.url = url
  const res = new EventEmitter() as EventEmitter & {
    writeHead: (s: number, h: unknown) => unknown
    end: (d?: unknown) => void
    writableEnded: boolean
  }
  let status = 0
  const chunks: Buffer[] = []
  res.writableEnded = false
  res.writeHead = (s: number) => {
    status = s
    return res
  }
  res.end = (d?: unknown) => {
    if (d !== undefined) chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d as Uint8Array))
    res.writableEnded = true
    resolvePromise({ status, text: Buffer.concat(chunks).toString('utf8') })
    res.emit('close')
  }
  let resolvePromise: (v: { status: number; text: string }) => void = () => {}
  const promise = new Promise<{ status: number; text: string }>((resolve) => { resolvePromise = resolve })
  route.handler(req, res)
  req.emit('data', Buffer.from(JSON.stringify(body), 'utf8'))
  req.emit('end')
  return promise
}

function get(routes: Route[], url: string): Promise<{ status: number; text: string }> {
  const route = routes.find((r) => r.path === '/v1')!
  const req = new EventEmitter() as EventEmitter & { method: string; url: string }
  req.method = 'GET'
  req.url = url
  return new Promise((resolve) => {
    const res = new EventEmitter() as EventEmitter & {
      writeHead: (s: number, h: unknown) => unknown
      end: (d?: unknown) => void
      writableEnded: boolean
    }
    let status = 0
    const chunks: Buffer[] = []
    res.writableEnded = false
    res.writeHead = (s: number) => {
      status = s
      return res
    }
    res.end = (d?: unknown) => {
      if (d !== undefined) chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d as Uint8Array))
      res.writableEnded = true
      resolve({ status, text: Buffer.concat(chunks).toString('utf8') })
      res.emit('close')
    }
    route.handler(req, res)
  })
}

const CASES: Array<[string, string]> = [
  ['cardToolsArm', 'http://localhost/v1/card-tools'],
  ['modelCatalogArm', 'http://localhost/v1/model-catalog'],
  ['formsArm', 'http://localhost/v1/forms'],
  ['kindsDoorArm', 'http://localhost/v1/kinds'],
  ['formSpecArm', 'http://localhost/v1/form-spec?model=tts'],
]

describe('discovery rejection 500s', () => {
  test.each(CASES)('%s rejecting with an Error is a 500 naming the cause', async (arm, url) => {
    mockState.failures = { [arm]: new Error(arm + ' blew up') }
    try {
      const routes = boot()
      const { status, text } = await get(routes, url)
      assert.equal(status, 500)
      assert.ok(text.includes('discovery door: ' + arm + ' blew up'), text)
    } finally {
      mockState.failures = {}
    }
  })

  test.each(CASES)('%s rejecting with a non-Error is a 500 with the raw cause', async (arm, url) => {
    mockState.failures = { [arm]: arm + ' snapped' }
    try {
      const routes = boot()
      const { status, text } = await get(routes, url)
      assert.equal(status, 500)
      assert.ok(text.includes('discovery door: ' + arm + ' snapped'), text)
    } finally {
      mockState.failures = {}
    }
  })
})

// The estate lanes' error classes (the false-death fix, 2026-10-08):
// a NAMED protocol refusal (RemoteError — the seat ANSWERED) is
// never the absent-seat 502. Before the fix every refusal rendered
// 502 and read as a dead runs seat on a healthy lane. The status is
// the code's CLASS from the thrown-code inventory (REFUSAL_STATUS in
// doors.ts), and the failure's own details ride in the body verbatim
// — every case below constructs the RemoteError EXACTLY as the
// throwing seat does (same code, same details keys), so a grep for
// the producer of each pinned code finds it:
//   runs/flow-compile  — runsValidateArms.ts (loc + per-stage errors)
//   runs/unknown-run   — runsRegistry.ts status arm (runId)
//   manage/refused     — manageRegistry.ts (action/status/data envelope)
describe('estate lane error classes', () => {
  test('POST validate refusal: 400, the code, and the details (loc + errors) ride verbatim', async () => {
    const routes = boot({
      runs: {
        validate: () => Promise.reject(new RemoteError(
          'runs/flow-compile',
          'flow body carries unknown keys ["flow"] — allowed: ["description","id","stages"]',
          // errors rows are OBJECTS at the real arm (scope/error/
          // code/loc — runsValidateArms' CardArmError envelope), not
          // strings; the live seat answers this exact shape
          { loc: 'flow', errors: [{ scope: 'flow', error: 'stages[0]: missing id', code: 'flow_compile', loc: 'flow' }] },
        )),
      },
    })
    const { status, text } = await post(routes, '/v1/flows/validate', { flow: 'image-gen', stages: [] })
    assert.equal(status, 400)
    const body = JSON.parse(text) as { error: string; code: string; loc: string; errors: string[] }
    assert.equal(body.code, 'runs/flow-compile')
    assert.ok(body.error.includes('unknown keys'), text)
    assert.equal(body.loc, 'flow')
    assert.deepEqual(body.errors, [{ scope: 'flow', error: 'stages[0]: missing id', code: 'flow_compile', loc: 'flow' }])
  })

  test('store faults stay 502 (bench storage refusal is infra, not caller)', async () => {
    // bench/store-failed is thrown by the bench remote's storage
    // open wraps (drafts/src/remote.ts) — reached through the real
    // /v1/bench/ensure door route (the second critique caught this
    // code defaulting to 400: the same opposite-polarity lie)
    const routes = boot({
      benchRemote: {
        ensure: () => Promise.reject(new RemoteError('bench/store-failed', 'the storage open refused', {})),
      },
    })
    const { status, text } = await post(routes, '/v1/bench/ensure', { session: 'default' })
    assert.equal(status, 502, 'bench/store-failed must answer 502')
    assert.ok(text.includes('bench/store-failed'), text)
  })

  test('conflict voices answer 409 (cas, overwrite-required, duplicate-stage)', async () => {
    const routes = boot({
      benchRemote: {
        patch: () => Promise.reject(new RemoteError('bench/overwrite-required', 'load onto a non-empty bench requires overwrite: true', { current_rev: 3, stages: 5 })),
      },
    })
    // the real mutation-arm grammar: POST /v1/bench/:session/<verb>
    const { status, text } = await post(routes, '/v1/bench/default/patch', { expect_rev: 2 })
    assert.equal(status, 409)
    const body = JSON.parse(text) as { code: string; current_rev: number; stages: number }
    assert.equal(body.code, 'bench/overwrite-required')
    assert.equal(body.current_rev, 3)
    assert.equal(body.stages, 5)
  })

  test('GET status refusal: unknown-run is a 404 carrying runId (not-found class)', async () => {
    const routes = boot({
      runs: {
        status: () => Promise.reject(new RemoteError(
          'runs/unknown-run',
          'unknown run_id',
          { runId: 'no-such-run' },
        )),
      },
    })
    const { status, text } = await get(routes, 'http://localhost/v1/flows/status/no-such-run')
    assert.equal(status, 404)
    const body = JSON.parse(text) as { code: string; runId: string }
    assert.equal(body.code, 'runs/unknown-run')
    assert.equal(body.runId, 'no-such-run')
  })

  test('manage/refused: the ENVELOPE\'s own status answers (engine-down 503 stays 503, action rides)', async () => {
    const routes = boot({
      manage: {
        act: () => Promise.reject(new RemoteError(
          'manage/refused',
          'comfyui endpoint unreachable',
          { action: 'restart', status: 503, data: { url: 'http://127.0.0.1:8188' } },
        )),
      },
    })
    const { status, text } = await post(routes, '/v1/manage', { action: 'restart' })
    assert.equal(status, 503)
    const body = JSON.parse(text) as { code: string; action: string; data: { url: string } }
    assert.equal(body.code, 'manage/refused')
    assert.equal(body.action, 'restart')
    assert.equal(body.data.url, 'http://127.0.0.1:8188')
  })

  test('manage/refused with a garbage envelope status answers 500 (the SEAT\'s bug, never the caller\'s)', async () => {
    const routes = boot({
      manage: {
        act: () => Promise.reject(new RemoteError(
          'manage/refused',
          'refused',
          { action: 'logs', status: 'nope' },
        )),
      },
    })
    const { status } = await post(routes, '/v1/manage', { action: 'logs' })
    // production always sets an int status (the manage plane's
    // every return path); garbage means the seat broke its own
    // envelope — 500, not a caller-fault 400 (critique #5)
    assert.equal(status, 500)
  })

  test('no seat at all stays the loud 502 (the seat-absent voice)', async () => {
    const routes = boot({})
    const { status, text } = await post(routes, '/v1/flows/validate', { id: 'x', stages: [] })
    assert.equal(status, 502)
    assert.ok(text.includes('no seat on this lane serves'), text)
  })
})
