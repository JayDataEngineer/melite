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
    registry: { values: () => [] },
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

  // All THREE voices the title names, each constructed (audit
  // 2026-10-13: the old body built only `overwrite-required` while the
  // title promised cas-conflict and duplicate-stage too — the same
  // lie shape as the transfer-rig defect, and mutating either missing
  // code's status left the suite green).
  for (const code of ['bench/cas-conflict', 'bench/overwrite-required', 'bench/duplicate-stage'] as const) {
    test(`conflict voice ${code} answers 409 with its details verbatim`, async () => {
      const routes = boot({
        benchRemote: {
          patch: () => Promise.reject(new RemoteError(code, 'load onto a non-empty bench requires overwrite: true', { current_rev: 3, stages: 5 })),
        },
      })
      // the real mutation-arm grammar: POST /v1/bench/:session/<verb>
      const { status, text } = await post(routes, '/v1/bench/default/patch', { expect_rev: 2 })
      assert.equal(status, 409)
      const body = JSON.parse(text) as { code: string; current_rev: number; stages: number }
      assert.equal(body.code, code)
      assert.equal(body.current_rev, 3)
      assert.equal(body.stages, 5)
    })
  }

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
          { action: 'logs', status: 'nope' as unknown as number }, // intentionally mistyped: the seat broke its own envelope — the door must 500
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

  test('named refusals with null or array details still answer the protocol voice', async () => {
    for (const details of [null, []]) {
      const routes = boot({ runs: { status: () => Promise.reject(new RemoteError('runs/unknown-run', 'unknown', details as never)) } })
      const { status, text } = await get(routes, '/v1/flows/status/r')
      assert.equal(status, 404)
      assert.match(text, /runs\/unknown-run/)
    }
  })

  // EVERY ROW OF REFUSAL_STATUS, ONE LOOP (audit 2026-10-13, mutation-
  // proven: the table at doors.ts:618 carries 17 rows and only 3 were
  // pinned — mutating any of the other 14 left the WHOLE melite-tools
  // suite green, because a status nobody asserts is a status nobody
  // owns). The mapping is centralized in failEstate, so one route
  // with a per-code rejection proves every row's class.
  const REFUSAL_CLASS: ReadonlyArray<readonly [string, number]> = [
    // 404 — a named thing is absent
    ['runs/unknown-run', 404],
    ['runs/run-unknown', 404],
    ['bench/not-found', 404],
    ['bench/stage-not-found', 404],
    ['bench/wire-stage-not-found', 404],
    ['bench/nothing-to-undo', 404],
    ['draft/not-found', 404],
    // 409 — state conflicts
    ['bench/cas-conflict', 409],
    ['bench/overwrite-required', 409],
    ['bench/duplicate-stage', 409],
    // 502 — the storage/infra layer refused a valid call
    ['bench/store-failed', 502],
    ['draft/store-failed', 502],
    ['draft/cannot-persist', 502],
    ['media/no-seat', 502],
    ['gateway/internal', 502],
    ['gateway/cancelled', 502],
  ]

  // RemoteError types its code against the DECLARED details map; this
  // loop walks the door's own table, a wider vocabulary than any one
  // caller's declared row, so the construction is cast once here rather
  // than at every call site.
  const refusal = (code: string): Error =>
    new RemoteError(code as never, 'refused', {} as never)

  test('EVERY declared refusal code answers its declared class', async () => {
    for (const [code, expected] of REFUSAL_CLASS) {
      const routes = boot({
        runs: { validate: () => Promise.reject(refusal(code)) },
      })
      const { status, text } = await post(routes, '/v1/flows/validate', { flow: 'image-gen', stages: [] })
      assert.equal(status, expected, `${code} must answer ${String(expected)}`)
      assert.match(text, new RegExp(code.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')), `${code} rides in the body`)
    }
  })

  test('an UNDECLARED code answers 400 — the honest unknown class, never 502', async () => {
    // the table's documented fallback (doors.ts:614): an unknown
    // refusal is the seat's answer with an unknown vocabulary, so it
    // is the caller's 400 — never the dead-seat 502 that reads as an
    // absent lane.
    const routes = boot({
      runs: { validate: () => Promise.reject(refusal('future/unknown-code')) },
    })
    const { status } = await post(routes, '/v1/flows/validate', { flow: 'image-gen', stages: [] })
    assert.equal(status, 400)
  })
})
