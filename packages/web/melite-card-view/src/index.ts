/**
 * `@melite-plugin/dsh-card-view` — host half.
 *
 * Registers one prefix route on the `webServer` service that proxies the Melite
 * estate lanes in-process under the DSH origin, so the browser card can read run
 * status and stream artifact thumbnails same-origin (no browser CORS). The
 * proxy is pass-through only: paths, queries, statuses, and error bodies are
 * forwarded verbatim — a bad run id surfaces the gateway's own 404, a bad
 * start payload the gateway's own 400.
 *
 * The package also has a client half (`src/client/`, served from
 * `lib/client.js` via the `dsh.client` declaration in package.json).
 * Since the CHANNEL LAW unification (2026-09-10, operator order:
 * everything 1:1 dsh) the package rides as a PROFILE BUNDLE: its own
 * dsh.bundle.patch inserts the row, the dsh.client mechanism loads
 * the browser half, and the apply config defaults to {} (a configless
 * bundle row must boot — the bundle world passes no config object).
 * The legacy two-row clientRowOnly shape (provisioner era) still
 * works but is retired.
 */
import type { Context } from '@deepseek-ai/cordis'
import { callEstateLane } from '@melite/gateway-doors'
// Type-only: pulls the webServer service declaration onto Context.
import type {} from '@deepseek-ai/dsh-host-webserver'

export const name = 'melite-card-view'

/** Routes arrive with the webServer service. */
export const inject = ['webServer']

export interface Config {
  /** Base URL of the Melite gateway (no trailing slash needed). */
  /** Origin path prefix this plugin claims. */
  prefix?: string
  /** True on the package-name companion row: contribute the browser bundle only, register nothing. */
  clientRowOnly?: boolean
  /** Upstream fetch timeout in milliseconds. */
  timeoutMs?: number
}

/** Read the full request body (proxy payloads are small JSON/forms; buffered). */
async function readBody(req: import('node:http').IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
}

export function apply(ctx: Context, config: Config = {}): void {
  if (config.clientRowOnly === true) {
    ctx.logger.info('melite-card-view client row mounted (bundle-table contribution only)')
    return
  }

  void config
  void timeoutMs
  const prefix = config.prefix ?? '/melite-proxy'
  const timeoutMs = config.timeoutMs ?? 30_000

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: prefix,
    handler: async (req, res) => {
      // Strip the claim prefix; everything after it (path + query) addresses
      // the gateway verbatim: /melite-proxy/v1/flows/status/<id> ->
      // <gateway>/v1/flows/status/<id>.
      const url = new URL(req.url ?? '/', 'http://dsh.local')
      const subPath = url.pathname.startsWith(prefix + '/')
        ? url.pathname.slice(prefix.length)
        : '/'
      const method = req.method ?? 'GET'
      const headers: Record<string, string> = {}
      const contentType = req.headers['content-type']
      if (typeof contentType === 'string') headers['content-type'] = contentType

      // rc.1's DOM BodyInit narrows to views over plain ArrayBuffer;
      // Buffer (a pooled view over ArrayBufferLike) fails it, so the
      // proxy copies request bytes into a fresh one.
      let body: BodyInit | undefined
      if (method !== 'GET' && method !== 'HEAD') {
        const raw = await readBody(req)
        const bytes = new Uint8Array(raw.byteLength)
        bytes.set(raw)
        body = bytes
      }

      try {
        // THE ESTATE LANES (R5): same host answers in-process — the
        // browser card's reads never leave the ONE DSH. Body bytes
        // ride JSON when present (the lane contract), else absent.
        let laneBody: unknown
        if (body !== undefined) {
          const bytes = body instanceof Uint8Array ? body : new Uint8Array()
          laneBody = JSON.parse(new TextDecoder().decode(bytes) || 'null')
        }
        const out = await callEstateLane(ctx, method === 'HEAD' ? 'GET' : method, subPath + url.search, laneBody)
        if (out === undefined) {
          res.writeHead(404, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: 'no estate lane claims ' + subPath }))
          return
        }
        const payload = Buffer.from(typeof out.body === 'string' ? out.body : JSON.stringify(out.body))
        const outHeaders: Record<string, string> = { 'cache-control': 'no-cache' }
        outHeaders['content-type'] = out.contentType
        // decoded-length framing: the only safe content-length is the
        // one we measured ourselves.
        outHeaders['content-length'] = String(payload.byteLength)
        res.writeHead(out.status, outHeaders)
        res.end(payload)
      } catch (error) {
        // Lane failure: our own 502 — the one status this route
        // invents; every estate answer passes through untouched.
        res.writeHead(502, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          error: 'estate lane failed',
          path: subPath,
          detail: error instanceof Error ? error.message : String(error),
        }))
      }
    },
  }), 'melite-card-view: gateway proxy route')

  ctx.logger.info('melite-card-view serving %s/* over the estate lanes (in-process)', prefix)
}
