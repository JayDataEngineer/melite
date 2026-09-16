// viewer-routes.spec — the host half's same-origin proxy pair, pinned
// WITHOUT the estate (fake cordis ctx, node-http-shaped req/res):
//
//   - headless compositions (no webServer service) skip silently;
//   - GET /melite-viewer/run/<id> → the runs status door (400 without
//     an id; the 502 kill voice otherwise — proxyDoor is pinned in
//     viewer.spec.ts);
//   - GET /melite-viewer/asset/<run>/<rel> → the asset door (400
//     without a path; the 502 kill voice otherwise).
import { describe, expect, it } from 'vitest'
import { apply } from '../src/index.ts'
import { ASSET_ROUTE_PREFIX, RUN_ROUTE_PREFIX } from '@melite/viewer-base/wire'

interface Handler {
  (req: { url?: string }, res: {
    writeHead(status: number, headers?: Record<string, string>): void
    end(data?: Buffer | string): void
  }): Promise<void> | void
}

interface Ctx {
  routes: Array<{ kind: string; path: string; handler: Handler }>
  webServer: { register(route: unknown): unknown } | undefined
}

function mount(webServer: boolean, config: Record<string, unknown> = {}): Ctx {
  const ctx: Ctx = {
    routes: [],
    webServer: webServer
      ? { register: (route: unknown) => { ctx.routes.push(route as never); return () => {} } }
      : undefined,
  }
  const cordis = {
    effect(fn: () => unknown, _name?: string) { return fn() },
    get: (name: string) => (name === 'webServer' ? ctx.webServer : undefined),
  }
  apply(cordis as never, config as never)
  return ctx
}

interface Saw { status: number; headers: Record<string, string>; body: string }

async function hit(ctx: Ctx, path: string, url?: string): Promise<Saw> {
  const route = ctx.routes.find((r) => r.path === path)
  if (route === undefined) throw new Error('no route for ' + path)
  const saw: Saw = { status: 0, headers: {}, body: '' }
  await route.handler({ url }, {
    writeHead(status: number, headers: Record<string, string> = {}) {
      saw.status = status
      saw.headers = headers
    },
    end(data: Buffer | string = '') {
      saw.body = typeof data === 'string' ? data : data.toString('utf8')
    },
  })
  return saw
}

describe('apply — the webServer probe', () => {
  it('a headless composition registers nothing', () => {
    expect(mount(false).routes).toEqual([])
  })

  it('registers the run-status + asset prefix pair', () => {
    const ctx = mount(true, { gateway: 'https://gw.example/// ' })
    expect(ctx.routes.map((r) => [r.kind, r.path])).toEqual([
      ['prefix', RUN_ROUTE_PREFIX],
      ['prefix', ASSET_ROUTE_PREFIX],
    ])
  })
})

describe('GET /melite-viewer/run/<run_id>', () => {
  it('refuses the id-less door (and the urlless request) with a 400', async () => {
    const ctx = mount(true)
    for (const url of ['/melite-viewer/run/', '/melite-viewer/run', undefined]) {
      const saw = await hit(ctx, RUN_ROUTE_PREFIX, url)
      expect(saw.status).toBe(400)
      expect(JSON.parse(saw.body)).toEqual({ error: 'missing_run_id' })
    }
  })

  it('proxies the runs door voice (the 502 kill, headers riding)', async () => {
    const ctx = mount(true)
    const saw = await hit(ctx, RUN_ROUTE_PREFIX, '/melite-viewer/run/r 9')
    expect(saw.status).toBe(502)
    expect(saw.headers['content-type']).toBe('application/json')
    expect(JSON.parse(saw.body)).toEqual({ error: 'estate_killed', path: '/v1/flows/runs/r%209' })
  })
})

describe('GET /melite-viewer/asset/<run>/<rel>', () => {
  it('refuses the path-less door (and the urlless request) with a 400', async () => {
    const ctx = mount(true)
    for (const url of ['/melite-viewer/asset/', '/melite-viewer/asset', undefined]) {
      const saw = await hit(ctx, ASSET_ROUTE_PREFIX, url)
      expect(saw.status).toBe(400)
      expect(JSON.parse(saw.body)).toEqual({ error: 'missing_asset_path' })
    }
  })

  it('proxies the asset door voice (the 502 kill, path riding)', async () => {
    const ctx = mount(true)
    const saw = await hit(ctx, ASSET_ROUTE_PREFIX, '/melite-viewer/asset/r_9/out/img.png')
    expect(saw.status).toBe(502)
    expect(JSON.parse(saw.body)).toEqual({ error: 'estate_killed', path: '/v1/assets/runs/r_9/out/img.png' })
  })
})
