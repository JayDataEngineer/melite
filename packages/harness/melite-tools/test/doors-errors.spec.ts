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
// a NAMED protocol refusal (RemoteError — the seat ANSWERED) is a
// 400-class about the caller's request with the stable code in the
// body; only the absent-seat voice stays 502. Before the fix every
// refusal rendered 502 and read as a dead runs seat on a healthy
// lane.
describe('estate lane error classes', () => {
  test('a seat NAMED refusal answers 400 carrying the code', async () => {
    const routes = boot({
      runs: {
        validate: () => Promise.reject(new RemoteError(
          'flow_compile/refused',
          'flow body carries unknown keys ["flow"] — allowed: ["description","id","stages"]',
        )),
      },
    })
    const { status, text } = await post(routes, '/v1/flows/validate', { flow: 'image-gen', stages: [] })
    assert.equal(status, 400)
    const body = JSON.parse(text) as { error: string; code: string }
    assert.equal(body.code, 'flow_compile/refused')
    assert.ok(body.error.includes('unknown keys'), text)
  })

  test('no seat at all stays the loud 502 (the seat-absent voice)', async () => {
    const routes = boot({})
    const { status, text } = await post(routes, '/v1/flows/validate', { id: 'x', stages: [] })
    assert.equal(status, 502)
    assert.ok(text.includes('no remote serves'), text)
  })
})
