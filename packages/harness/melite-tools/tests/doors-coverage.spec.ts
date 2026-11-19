import { describe, expect, test, vi } from 'vitest'
import { EventEmitter } from 'node:events'

const index = vi.hoisted(() => ({
  value: {
    families: [
      { id: 'family-null', entrance: null },
      { id: 'family-live', entrance: 'model:family-live' },
    ],
    cards: [
      { id: 'card-null', entrance: null },
      { id: 'card-live', entrance: 'card:card-live' },
    ],
  },
}))

vi.mock('@melite/estate-queue', () => ({
  buildSkillIndex: () => index.value,
  disclosureRoot: () => '/tmp',
}))

import { apply, seatedMcpEngines } from '../src/doors.ts'

function boot(): Array<{ path: string; handler: (req: unknown, res: unknown) => void }> {
  const routes: Array<{ path: string; handler: (req: unknown, res: unknown) => void }> = []
  const host = {
    effect: (fn: () => void) => { fn(); return () => {} },
    llm: {},
    registry: { values: () => [] },
    tools: { schemas: () => [] },
    webServer: {
      port: 0,
      register: (route: { path: string; handler: (req: unknown, res: unknown) => void }) => {
        routes.push(route)
        return () => {}
      },
    },
    get: () => undefined,
  }
  apply(host as never, {})
  return routes
}

function request(routes: Array<{ path: string; handler: (req: unknown, res: unknown) => void }>): Promise<{ status: number; body: Record<string, unknown> }> {
  const route = routes.find((row) => row.path === '/v1')
  if (route === undefined) throw new Error('missing /v1')
  const req = new EventEmitter() as EventEmitter & { method: string; url: string }
  req.method = 'GET'
  req.url = 'http://localhost/v1/form-spec?model=agent'
  const res = new EventEmitter() as EventEmitter & {
    writableEnded: boolean
    writeHead: (status: number) => void
    end: (body?: string) => void
  }
  res.writableEnded = false
  return new Promise((resolve) => {
    let status = 0
    res.writeHead = (next: number) => { status = next }
    res.end = (body?: string) => {
      res.writableEnded = true
      resolve({ status, body: JSON.parse(body ?? '{}') as Record<string, unknown> })
      res.emit('close')
    }
    route.handler(req, res)
  })
}

describe('doors skill census defensive arms', () => {
  test('keeps live entrances and drops null entrances for both owner planes', async () => {
    const result = await request(boot())
    expect(result.status).toBe(200)
    const options = (((result.body['features'] as { modifiers: Array<{ param_key: string; fields?: Array<{ options?: Array<{ value: string }> }> }> }).modifiers.find((row) => row.param_key === 'skills'))?.fields?.[0]?.options ?? [])
    expect(options.map((row) => row.value)).toEqual(['model:family-live', 'card:card-live'])
  })
})

// THE MCP CARD'S OPT-IN CENSUS (error j2, dev_docs/ERRORS.md:86) —
// seatedMcpEngines reads the estate's OWN engines seat (the config's
// mcpEngines field), never the ambient tools census: ambient
// presence is not operator intent (the 2026-10-12 EXPERIMENTAL
// OPT-IN law). Absence and a hostile seat fold NOTHING — the probe
// never propagates a throw into the discovery doors.
describe('seatedMcpEngines (the MCP card opt-in census)', () => {
  /** A minimal CtxView face for the probe: seatedMcpEngines touches
   *  `get` and nothing else. */
  function ctxOf(get: (name: string) => unknown): Parameters<typeof seatedMcpEngines>[0] {
    return { get } as Parameters<typeof seatedMcpEngines>[0]
  }

  test('an unmounted engines seat folds nothing ([] )', () => {
    expect(seatedMcpEngines(ctxOf(() => undefined))).toEqual([])
  })

  test('a null seat folds nothing ([] )', () => {
    expect(seatedMcpEngines(ctxOf(() => null))).toEqual([])
  })

  test('a seat whose ids face is not a function folds nothing ([] )', () => {
    expect(seatedMcpEngines(ctxOf(() => ({ ids: 'not-a-function' })))).toEqual([])
  })

  test('mcp:-prefixed ids are stripped and sorted; foreign ids are dropped', () => {
    expect(seatedMcpEngines(ctxOf(() => ({ ids: () => ['comfyui', 'mcp:blender'] })))).toEqual(['blender'])
    expect(seatedMcpEngines(ctxOf(() => ({ ids: () => ['mcp:unity', 'mcp:blender'] })))).toEqual(['blender', 'unity'])
    expect(seatedMcpEngines(ctxOf(() => ({ ids: () => [] })))).toEqual([])
    expect(seatedMcpEngines(ctxOf(() => ({ ids: () => ['mcp:blender', 42] })))).toEqual(['blender'])
  })

  test('an ids() throw does NOT propagate — the doors fold nothing, never a 500', () => {
    const boom = ctxOf(() => ({ ids: () => { throw new Error('seat down') } }))
    expect(seatedMcpEngines(boom)).toEqual([])
  })

  test('a THROWING get probe does NOT propagate either', () => {
    expect(seatedMcpEngines(ctxOf(() => { throw new Error('no such service') }))).toEqual([])
  })

  test('a non-array ids() return folds nothing ([] )', () => {
    expect(seatedMcpEngines(ctxOf(() => ({ ids: () => 'blender' })))).toEqual([])
    expect(seatedMcpEngines(ctxOf(() => ({ ids: () => ({ length: 1 }) })))).toEqual([])
  })
})
