// gateway.test — THE DSH↔GATEWAY SEAM CONTRACT (2026-08-22).
//
// dsh/melite-tools/src/gateway.ts is the ONLY path every melite tool takes to the
// gateway. Its error law is load-bearing for the assistant UX: a thrown tool
// error becomes the MODEL-FACING text, so
//
//   - non-2xx → RayGatewayError carrying status + url + the BODY VERBATIM
//     (the gateway's operator-facing message must survive the hop);
//   - network failure → names the URL and the underlying cause;
//   - non-JSON 200 → named as such, never silently undefined.
//
// All fetch is mocked — milliseconds, no gateway, no network. Runs under
// bun test from the package dir (zero deps; bun:test is built in).
import { afterEach, describe, expect, test } from 'bun:test'
import {
  RayGatewayError,
  gatewayRequest,
  normalizeGatewayUrl,
} from '../src/gateway.ts'

const origFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = origFetch })

describe('normalizeGatewayUrl', () => {
  test('strips one-to-many trailing slashes so path joins stay single-slash', () => {
    expect(normalizeGatewayUrl('http://localhost:33081')).toBe('http://localhost:33081')
    expect(normalizeGatewayUrl('http://localhost:33081/')).toBe('http://localhost:33081')
    expect(normalizeGatewayUrl('http://localhost:33081///')).toBe('http://localhost:33081')
  })

})

describe('RayGatewayError', () => {
  test('message = status + url + body VERBATIM; fields carried', () => {
    const e = new RayGatewayError(502, 'http://g/v1/x', '<html>bad gateway</html>')
    expect(e.name).toBe('RayGatewayError')
    expect(e.status).toBe(502)
    expect(e.url).toBe('http://g/v1/x')
    expect(e.body).toBe('<html>bad gateway</html>')
    expect(e.message).toBe('melite gateway 502 http://g/v1/x: <html>bad gateway</html>')
  })
})

describe('gatewayRequest', () => {
  test('happy GET parses JSON; no content-type header, no body on the wire', async () => {
    let seenInit: RequestInit | undefined
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      seenInit = init
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as typeof fetch
    const out = await gatewayRequest(
      'http://g/', 'GET', '/v1/models', undefined,
      new AbortController().signal, 1000,
    )
    expect(out).toEqual({ ok: true })
    expect(seenInit!.method).toBe('GET')
    expect(seenInit!.body).toBeUndefined()
    expect((seenInit!.headers as Record<string, string>)?.['content-type']).toBeUndefined()
  })

  test('POST JSON-stringifies the body, sets content-type, joins the normalized URL', async () => {
    let seenUrl = ''
    let seenInit: RequestInit | undefined
    globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
      seenUrl = String(url)
      seenInit = init
      return new Response(JSON.stringify({ ran: true }), { status: 200 })
    }) as typeof fetch
    await gatewayRequest(
      'http://g', 'POST', '/v1/flows/start', { model: 'z-image' },
      new AbortController().signal, 1000,
    )
    expect(seenUrl).toBe('http://g/v1/flows/start') // no double slash
    expect(seenInit!.headers).toEqual({ 'content-type': 'application/json' })
    expect(seenInit!.body).toBe(JSON.stringify({ model: 'z-image' }))
  })

  test('FAILURE PATH: non-2xx throws RayGatewayError with the body VERBATIM', async () => {
    globalThis.fetch = (async () =>
      new Response('{"error":"model_not_loaded","detail":"qwen busy"}', { status: 503 })) as typeof fetch
    try {
      await gatewayRequest('http://g', 'GET', '/v1/compose', undefined, new AbortController().signal, 1000)
      throw new Error('EXPECTED RayGatewayError')
    } catch (e) {
      expect(e instanceof RayGatewayError).toBe(true)
      const rge = e as RayGatewayError
      expect(rge.status).toBe(503)
      // THE LAW: the gateway's operator-facing message survives verbatim:
      expect(rge.body).toBe('{"error":"model_not_loaded","detail":"qwen busy"}')
      expect(rge.message).toContain('melite gateway 503 http://g/v1/compose:')
      expect(rge.message).toContain('"detail":"qwen busy"')
    }
  })

  test('FAILURE PATH: unreachable gateway names the URL and the cause', async () => {
    globalThis.fetch = (async () => { throw new TypeError('fetch failed') }) as typeof fetch
    try {
      await gatewayRequest('http://127.0.0.1:1', 'GET', '/health', undefined, new AbortController().signal, 1000)
      throw new Error('EXPECTED throw')
    } catch (e) {
      const msg = (e as Error).message
      expect(msg).toContain('melite gateway unreachable at http://127.0.0.1:1/health')
      expect(msg).toContain('fetch failed')
      expect(e instanceof RayGatewayError).toBe(false) // NOT a gateway answer
    }
  })

  test('FAILURE PATH: 200 non-JSON is named, not swallowed', async () => {
    globalThis.fetch = (async () => new Response('<html>not json</html>', { status: 200 })) as typeof fetch
    try {
      await gatewayRequest('http://g', 'GET', '/x', undefined, new AbortController().signal, 1000)
      throw new Error('EXPECTED throw')
    } catch (e) {
      expect((e as Error).message).toContain('melite gateway returned non-JSON at http://g/x')
      expect((e as Error).message).toContain('<html>not json</html>')
    }
  })

  test('caller-abort wins: a pre-aborted signal rethrows unwrapped', async () => {
    const ac = new AbortController()
    ac.abort()
    globalThis.fetch = (async () => {
      throw new Error('fetch rejection must not mask the caller abort')
    }) as typeof fetch
    try {
      await gatewayRequest('http://g', 'GET', '/x', undefined, ac.signal, 1000)
      throw new Error('EXPECTED throw')
    } catch (e) {
      // The seam rethrows the CALLER'S abort first — it must not become an
      // "unreachable" wrapper that lies about the cause:
      expect(ac.signal.aborted).toBe(true)
      expect((e as Error).message).not.toContain('melite gateway unreachable')
    }
  })
})
