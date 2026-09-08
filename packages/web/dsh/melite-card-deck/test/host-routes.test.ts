// host-routes.test — THE GUI<->GATEWAY PROXY CONTRACT (2026-08-26;
// rewritten 2026-09-04 after the sidebar card deck retirement).
//
// The operator flew blind: a raw TypeError surfaced as a JSON 502 in the
// GUI with zero test cover for it. src/index.ts registers the editor
// host's proxy routes; its failure law is load-bearing:
//
//   - reachable webServer + DEAD gateway -> 502 JSON {gateway_unreachable},
//     the handler NEVER throws, NEVER hangs;
//   - live gateway -> status + body pass through VERBATIM (upstream errors
//     included — a gateway 503 must reach the browser as 503, not re-wrapped);
//   - the /v1/llm lane is stubbed at the wire (the assistant lives in DSH);
//   - the events WS tunnel registers at the exact /v1/flows/events path;
//   - the SIDEBAR CARD DECK IS GONE (operator order 2026-09-04: "we don't
//     need ray cards in the sidebar at all") — no /ray-deck/* door exists.
//
// All fetch is mocked — milliseconds, no gateway, no network. Mirrors
// dsh/melite-tools/test/gateway.test.ts (the tools-lane seam contract).
import { afterEach, describe, expect, test } from 'bun:test'
import { apply } from '../src/index.ts'

const origFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = origFetch })

// ── Harness: fake cordis ctx + node-http-shaped req/res ─────────────────
interface Reg { kind: string; path: string; handler: (req: unknown, res: unknown) => Promise<void> }
interface Up { path: string; handler: (req: unknown, socket: unknown, head: unknown) => void }

function mount(config: Record<string, unknown> = {}): { routes: Reg[]; upgrades: Up[] } {
  const routes: Reg[] = []
  const upgrades: Up[] = []
  const ctx = {
    effect(fn: () => unknown) { fn(); return () => {} },
    webServer: {
      register(r: Reg) { routes.push(r); return () => {} },
      registerUpgrade(u: Up) { upgrades.push(u); return () => {} },
    },
    logger: { info() {} },
  }
  apply(ctx as never, config)
  return { routes, upgrades }
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

// The user's exact failure, verbatim: dead gateway -> TypeError('fetch failed').
const DEAD_GATEWAY = (async () => { throw new TypeError('fetch failed') }) as typeof fetch

function errCode(saw: Saw): string {
  const parsed = JSON.parse(saw.body) as { error?: string; message?: string }
  return parsed.error ?? '(no error field)'
}

describe('registration shape (the host registry relies on it)', () => {
  test('the editor host registers its proxies; /v1/llm OUTLENGTHS /v1; the tunnel registers', () => {
    const { routes, upgrades } = mount({ gatewayUrl: 'http://g' })
    const byPath = routes.map((r) => r.kind + ' ' + r.path)
    for (const want of [
      'prefix /v1', 'prefix /v1/llm', 'prefix /comfyui', 'prefix /poser', 'prefix /health',
      'prefix /editor',
    ]) {
      expect(byPath).toContain(want)
    }
    // Phase 2 consolidation (2026-09-04): run artifacts ride /v1/assets/
    // runs through the /v1 proxy — the separate /editor/assets/runs
    // registration is GONE and /editor is purely static.
    expect(byPath).not.toContain('prefix /editor/assets/runs')
    expect(upgrades.map((u) => u.path)).toEqual(['/v1/flows/events'])
  })

  test('THE RETIREMENT PIN: no /ray-deck/* door exists (sidebar cards are gone)', () => {
    const { routes, upgrades } = mount({ gatewayUrl: 'http://g' })
    const every = [...routes.map((r) => r.path), ...upgrades.map((u) => u.path)]
    expect(every.filter((p) => p.startsWith('/ray-deck'))).toEqual([])
  })
})

describe('FAILURE CONTRACT: dead gateway -> 502 gateway_unreachable, never a throw', () => {
  test('THE OPERATOR CASE: GET /v1/model-catalog -> 502 JSON with the TypeError named', async () => {
    globalThis.fetch = DEAD_GATEWAY
    const { routes } = mount({ gatewayUrl: 'http://localhost:33081' })
    const saw = await hit(routes, '/v1/model-catalog')
    expect(saw.status).toBe(502)
    expect(saw.headers['content-type']).toContain('application/json')
    const parsed = JSON.parse(saw.body) as { error: string; message: string }
    expect(parsed.error).toBe('gateway_unreachable')
    expect(parsed.message).toContain('fetch failed')
  })

  test('EVERY proxy route shares the same contract — sweep', async () => {
    globalThis.fetch = DEAD_GATEWAY
    const { routes } = mount({ gatewayUrl: 'http://g' })
    const cases: Array<[string, string]> = [
      ['/v1/model-catalog', 'GET'],
      ['/v1/form-spec?model=z-image', 'GET'],
      ['/v1/flows/start', 'POST'],
      ['/comfyui/system_stats', 'GET'],
      ['/poser/status', 'GET'],
      ['/health', 'GET'],
      ['/v1/assets/runs/r1/a.png', 'GET'],
    ]
    for (const [url, method] of cases) {
      const saw = await hit(routes, url, method, method === 'POST' ? '{}' : undefined)
      if (saw.status !== 502 || errCode(saw) !== 'gateway_unreachable') {
        throw new Error('route ' + url + ' broke the failure contract: ' + saw.status + ' ' + saw.body)
      }
    }
  })

  test('a HANGING gateway still resolves: timeout aborts -> 502, no infinite wait', async () => {
    globalThis.fetch = (async (_u: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        const sig = init?.signal
        if (sig) sig.addEventListener('abort', () => reject((sig as AbortSignal).reason))
      })) as typeof fetch
    const { routes } = mount({ gatewayUrl: 'http://g', timeoutMs: 60 })
    const saw = await hit(routes, '/v1/model-catalog')
    expect(saw.status).toBe(502)
    expect(errCode(saw)).toBe('gateway_unreachable')
  })
})

describe('live gateway: status + body pass through VERBATIM', () => {
  test('200 catalog body reaches the browser unchanged', async () => {
    const catalog = JSON.stringify({ models: [{ id: 'z-image', family: 'image' }] })
    globalThis.fetch = (async () => new Response(catalog, { status: 200 })) as typeof fetch
    const { routes } = mount({ gatewayUrl: 'http://g' })
    const saw = await hit(routes, '/v1/model-catalog')
    expect(saw.status).toBe(200)
    expect(saw.body).toBe(catalog)
  })

  test('UPSTREAM ERRORS ARE NOT RE-WRAPPED: gateway 503 -> browser sees 503 + verbatim body', async () => {
    const upstream = JSON.stringify({ error: 'model_not_loaded', detail: 'qwen busy' })
    globalThis.fetch = (async () => new Response(upstream, { status: 503 })) as typeof fetch
    const { routes } = mount({ gatewayUrl: 'http://g' })
    const saw = await hit(routes, '/v1/model-catalog')
    expect(saw.status).toBe(503) // NOT 502 — only transport failures 502
    expect(saw.body).toBe(upstream)
  })

  test('CONTENT-LENGTH HONESTY (2026-09-01): a decompressed body states its TRUE byte count', async () => {
    const body = JSON.stringify({ ok: true }) // fetch() already decompressed; upstream length lies
    globalThis.fetch = (async () => new Response(body, {
      status: 200,
      headers: { 'content-length': '9999', 'content-encoding': 'gzip' },
    })) as typeof fetch
    const { routes } = mount({ gatewayUrl: 'http://g' })
    const saw = await hit(routes, '/v1/model-catalog')
    expect(saw.status).toBe(200)
    expect(saw.headers['content-length']).toBe(String(body.length))
    expect(saw.headers['content-encoding']).toBeUndefined()
  })

  test('POST /v1/flows/start forwards method + body upstream (THE run door)', async () => {
    let seenUrl = ''
    let seenInit: RequestInit | undefined
    globalThis.fetch = (async (u: unknown, init?: RequestInit) => {
      seenUrl = String(u)
      seenInit = init
      return new Response(JSON.stringify({ run_id: 'r1' }), { status: 200 })
    }) as typeof fetch
    const { routes } = mount({ gatewayUrl: 'http://g' })
    const saw = await hit(routes, '/v1/flows/start', 'POST', JSON.stringify({ model: 'z-image' }))
    expect(seenUrl).toBe('http://g/v1/flows/start')
    expect(seenInit!.method).toBe('POST')
    expect(String(seenInit!.body)).toBe(JSON.stringify({ model: 'z-image' }))
    expect(saw.status).toBe(200)
    expect(saw.body).toBe(JSON.stringify({ run_id: 'r1' }))
  })
})

describe('/v1/llm stub lane (the assistant lives in DSH, not the editor)', () => {
  test('keys answer canned; unknown llm paths 404 llm_lane_disabled; gateway never touched', async () => {
    let fetched = false
    globalThis.fetch = (async () => { fetched = true; return new Response('{}') }) as typeof fetch
    const { routes } = mount({ gatewayUrl: 'http://g' })
    const keys = await hit(routes, '/v1/llm/keys')
    expect(keys.status).toBe(200)
    expect(JSON.parse(keys.body)).toEqual({ keys: [] })
    const unknown = await hit(routes, '/v1/llm/something/else')
    expect(unknown.status).toBe(404)
    expect(errCode(unknown)).toBe('llm_lane_disabled')
    expect(fetched).toBe(false) // the stub answers BEFORE the gateway proxy
  })
})
