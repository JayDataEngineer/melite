// host-routes.test — THE GUI↔GATEWAY PROXY CONTRACT (2026-08-26).
//
// The operator flew blind: `/v1/model-catalog: 502 {"error":"gateway_unreachable"}
// "message":"TypeError: fetch failed"}` in the GUI with zero test cover for it.
// src/index.ts registers every proxy route; its failure law is load-bearing:
//
//   - reachable webServer + DEAD gateway → 502 JSON {gateway_unreachable},
//     the handler NEVER throws, NEVER hangs;
//   - live gateway → status + body pass through VERBATIM (upstream errors
//     included — a gateway 503 must reach the browser as 503, not be re-wrapped);
//   - validation guards (bad ids, forbidden paths, wrong methods) reject at
//     the proxy WITHOUT touching the gateway;
//   - the /v1/llm lane is stubbed at the wire (the assistant lives in DSH).
//
// All fetch is mocked — milliseconds, no gateway, no network. Mirrors
// dsh/melite-tools/test/gateway.test.ts (the tools-lane seam contract).
import { afterEach, describe, expect, test } from 'bun:test'
import { apply } from '../src/index.ts'

const origFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = origFetch })

// ── Harness: fake cordis ctx + node-http-shaped req/res ─────────────────
interface Reg { kind: string; path: string; handler: (req: unknown, res: unknown) => Promise<void> }

function mount(config: Record<string, unknown> = {}): Reg[] {
  const routes: Reg[] = []
  const ctx = {
    effect(fn: () => unknown) { fn(); return () => {} },
    webServer: { register(r: Reg) { routes.push(r); return () => {} } },
    logger: { info() {} },
  }
  apply(ctx as never, config)
  return routes
}

function fakeReq(url: string, method = 'GET', body?: string) {
  return {
    url,
    method,
    headers: { 'content-type': 'application/json' },
    async *[Symbol.asyncIterator]() {
      if (body) yield Buffer.from(body, 'utf8')
    },
  }
}

interface Saw { status: number; headers: Record<string, string>; body: string }

function fakeRes(): { saw: Saw } {
  const saw: Saw = { status: 0, headers: {}, body: '' }
  return {
    saw,
    writeHead(status: number, headers: Record<string, string> = {}) {
      saw.status = status
      saw.headers = headers
    },
    end(body: unknown = '') {
      saw.body = typeof body === 'string' ? body : String(body)
    },
  }
}

const pathname = (u: string) => u.split('?')[0]

// Dispatch mimicking the webServer registry: exact = path equal (query
// stripped); prefix = longest matching prefix wins (the documented law the
// /v1/llm stub relies on to beat the generic /v1 proxy).
function pick(routes: Reg[], url: string): Reg {
  const p = pathname(url)
  const exact = routes.filter((r) => r.kind === 'exact' && r.path === p)
  if (exact.length) return exact[0]
  const prefixes = routes
    .filter((r) => r.kind === 'prefix' && p.startsWith(r.path))
    .sort((a, b) => b.path.length - a.path.length)
  if (!prefixes.length) throw new Error('no route for ' + url)
  return prefixes[0]
}

async function hit(routes: Reg[], url: string, method = 'GET', body?: string): Promise<Saw> {
  const res = fakeRes()
  await pick(routes, url).handler(fakeReq(url, method, body), res)
  return res.saw
}

// The user's exact failure, verbatim: dead gateway → TypeError('fetch failed').
const DEAD_GATEWAY = (async () => { throw new TypeError('fetch failed') }) as typeof fetch

function errCode(saw: Saw): string {
  const parsed = JSON.parse(saw.body) as { error?: string; message?: string }
  return parsed.error ?? '(no error field)'
}

describe('registration shape (the host registry relies on it)', () => {
  test('every proxy route registers with kind + path; /v1/llm prefix OUTLENGTHS /v1', () => {
    const routes = mount({ gatewayUrl: 'http://g' })
    const byPath = routes.map((r) => r.kind + ' ' + r.path)
    for (const want of [
      'exact /melite-deck/forms', 'exact /melite-deck/models', 'exact /melite-deck/form-spec',
      'exact /melite-deck/status', 'exact /melite-deck/start', 'exact /melite-deck/artifact',
      'prefix /v1', 'prefix /v1/llm', 'prefix /comfyui', 'prefix /poser', 'prefix /health',
      'prefix /editor/assets/runs', 'prefix /editor',
    ]) {
      expect(byPath).toContain(want)
    }
  })
})

describe('FAILURE CONTRACT: dead gateway → 502 gateway_unreachable, never a throw', () => {
  test('THE OPERATOR CASE: GET /v1/model-catalog → 502 JSON with the TypeError named', async () => {
    globalThis.fetch = DEAD_GATEWAY
    const routes = mount({ gatewayUrl: 'http://localhost:33081' })
    const saw = await hit(routes, '/v1/model-catalog')
    expect(saw.status).toBe(502)
    expect(saw.headers['content-type']).toContain('application/json')
    const parsed = JSON.parse(saw.body) as { error: string; message: string }
    expect(parsed.error).toBe('gateway_unreachable')
    expect(parsed.message).toContain('fetch failed')
  })

  test('EVERY route shares the same contract — sweep', async () => {
    globalThis.fetch = DEAD_GATEWAY
    const routes = mount({ gatewayUrl: 'http://g' })
    const cases: Array<[string, string]> = [
      ['/v1/model-catalog', 'GET'],
      ['/v1/form-spec?model=z-image', 'GET'],
      ['/v1/pipelines/start', 'POST'],
      ['/comfyui/system_stats', 'GET'],
      ['/poser/status', 'GET'],
      ['/health', 'GET'],
      ['/editor/assets/runs/r1/a.png', 'GET'],
      ['/melite-deck/forms', 'GET'],
      ['/melite-deck/models', 'GET'],
      ['/melite-deck/form-spec?model=z-image', 'GET'],
      ['/melite-deck/status?run=run_1', 'GET'],
      ['/melite-deck/start', 'POST'],
      ['/melite-deck/artifact?path=/editor/assets/runs/r1/a.png', 'GET'],
    ]
    for (const [url, method] of cases) {
      const saw = await hit(routes, url, method, method === 'POST' ? '{}' : undefined)
      if (saw.status !== 502 || errCode(saw) !== 'gateway_unreachable') {
        throw new Error('route ' + url + ' broke the failure contract: ' + saw.status + ' ' + saw.body)
      }
    }
  })

  test('a HANGING gateway still resolves: timeout aborts → 502, no infinite wait', async () => {
    globalThis.fetch = (async (_u: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        const sig = init?.signal
        if (sig) sig.addEventListener('abort', () => reject((sig as AbortSignal).reason))
      })) as typeof fetch
    const routes = mount({ gatewayUrl: 'http://g', timeoutMs: 60 })
    const saw = await hit(routes, '/v1/model-catalog')
    expect(saw.status).toBe(502)
    expect(errCode(saw)).toBe('gateway_unreachable')
  })
})

describe('live gateway: status + body pass through VERBATIM', () => {
  test('200 catalog body reaches the browser unchanged', async () => {
    const catalog = JSON.stringify({ models: [{ id: 'z-image', family: 'image' }] })
    globalThis.fetch = (async () => new Response(catalog, { status: 200 })) as typeof fetch
    const routes = mount({ gatewayUrl: 'http://g' })
    const saw = await hit(routes, '/v1/model-catalog')
    expect(saw.status).toBe(200)
    expect(saw.body).toBe(catalog)
  })

  test('UPSTREAM ERRORS ARE NOT RE-WRAPPED: gateway 503 → browser sees 503 + verbatim body', async () => {
    const upstream = '{"error":"model_not_loaded","detail":"qwen busy"}'
    globalThis.fetch = (async () => new Response(upstream, { status: 503 })) as typeof fetch
    const routes = mount({ gatewayUrl: 'http://g' })
    const saw = await hit(routes, '/v1/model-catalog')
    expect(saw.status).toBe(503) // NOT 502 — only transport failures 502
    expect(saw.body).toBe(upstream)
  })

  test('POST /melite-deck/start forwards method + body upstream (THE run door)', async () => {
    let seenUrl = ''
    let seenInit: RequestInit | undefined
    globalThis.fetch = (async (u: unknown, init?: RequestInit) => {
      seenUrl = String(u)
      seenInit = init
      return new Response('{"run_id":"r1"}', { status: 200 })
    }) as typeof fetch
    const routes = mount({ gatewayUrl: 'http://g' })
    const saw = await hit(routes, '/melite-deck/start', 'POST', '{"model":"z-image"}')
    expect(seenUrl).toBe('http://g/v1/pipelines/start')
    expect(seenInit!.method).toBe('POST')
    expect(seenInit!.body).toBe('{"model":"z-image"}')
    expect(saw.status).toBe(200)
    expect(saw.body).toBe('{"run_id":"r1"}')
  })

  test('/melite-deck/status rewrites run-artifact URLs to the artifact proxy', async () => {
    const status = JSON.stringify({
      artifacts: [{ url: '/editor/assets/runs/r1/a.png' }],
      stages: [{ url: '/editor/assets/runs/r1/b.png' }],
    })
    globalThis.fetch = (async () => new Response(status, { status: 200 })) as typeof fetch
    const routes = mount({ gatewayUrl: 'http://g' })
    const saw = await hit(routes, '/melite-deck/status?run=r1')
    const parsed = JSON.parse(saw.body) as { artifacts: Array<{ url: string }>; stages: Array<{ url: string }> }
    expect(parsed.artifacts[0].url).toBe('/melite-deck/artifact?path=' + encodeURIComponent('/editor/assets/runs/r1/a.png'))
    expect(parsed.stages[0].url).toBe('/melite-deck/artifact?path=' + encodeURIComponent('/editor/assets/runs/r1/b.png'))
  })
})

describe('validation guards reject at the proxy (gateway never touched)', () => {
  test('form-spec: missing or traversal model id → 400 bad_model', async () => {
    let fetched = false
    globalThis.fetch = (async () => { fetched = true; return new Response('{}') }) as typeof fetch
    const routes = mount({ gatewayUrl: 'http://g' })
    const missing = await hit(routes, '/melite-deck/form-spec')
    expect(missing.status).toBe(400)
    expect(errCode(missing)).toBe('bad_model')
    const evil = await hit(routes, '/melite-deck/form-spec?model=' + encodeURIComponent('../../etc/passwd'))
    expect(evil.status).toBe(400)
    expect(errCode(evil)).toBe('bad_model')
    expect(fetched).toBe(false)
  })

  test('status: missing run → 400 bad_run; artifact: outside runs dir → 403', async () => {
    globalThis.fetch = DEAD_GATEWAY // any fetch here would 502 — guards must fire first
    const routes = mount({ gatewayUrl: 'http://g' })
    const noRun = await hit(routes, '/melite-deck/status')
    expect(noRun.status).toBe(400)
    expect(errCode(noRun)).toBe('bad_run')
    const escape = await hit(routes, '/melite-deck/artifact?path=' + encodeURIComponent('/etc/passwd'))
    expect(escape.status).toBe(403)
    expect(errCode(escape)).toBe('forbidden_path')
  })

  test('start: non-POST → 405 method_not_allowed without upstream fetch', async () => {
    let fetched = false
    globalThis.fetch = (async () => { fetched = true; return new Response('{}') }) as typeof fetch
    const routes = mount({ gatewayUrl: 'http://g' })
    const saw = await hit(routes, '/melite-deck/start', 'GET')
    expect(saw.status).toBe(405)
    expect(errCode(saw)).toBe('method_not_allowed')
    expect(fetched).toBe(false)
  })
})

describe('/v1/llm stub lane (the assistant lives in DSH, not the editor)', () => {
  test('keys + health answer canned; unknown llm paths 404 llm_lane_disabled', async () => {
    let fetched = false
    globalThis.fetch = (async () => { fetched = true; return new Response('{}') }) as typeof fetch
    const routes = mount({ gatewayUrl: 'http://g' })
    const keys = await hit(routes, '/v1/llm/keys')
    expect(keys.status).toBe(200)
    expect(JSON.parse(keys.body)).toEqual({ keys: [] })
    const unknown = await hit(routes, '/v1/llm/whatever')
    expect(unknown.status).toBe(404)
    expect(errCode(unknown)).toBe('llm_lane_disabled')
    expect(fetched).toBe(false) // the stub owns the lane; gateway untouched
  })
})
