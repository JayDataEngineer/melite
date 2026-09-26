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

import { apply } from '../src/doors.ts'

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
