/**
 * `@melite-plugin/dsh-card-view` — host half.
 *
 * Registers one prefix route on the `webServer` service that proxies the Melite
 * gateway (:33081) under the DSH origin, so the browser card can read run
 * status and stream artifact thumbnails same-origin (no browser CORS). The
 * proxy is pass-through only: paths, queries, statuses, and error bodies are
 * forwarded verbatim — a bad run id surfaces the gateway's own 404, a bad
 * start payload the gateway's own 400.
 *
 * The package also has a client half (`src/client/`, served from
 * `lib/client.js` via the `dsh.client` declaration in package.json). Deploy
 * shape is two overlay rows pointing at ONE package:
 *
 * - host row   — `name:` = absolute path of `lib/index.mjs` (the Melite deploy
 *                convention: no profile install). This fiber owns the route.
 * - client row — `name:` = the package name itself; exists so the host's
 *                client-module scanner picks up the browser bundle. Its fiber
 *                must set `clientRowOnly: true`, because both rows import the
 *                same module and a second route registration would throw
 *                (`webserver: duplicate prefix route`).
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the webServer service declaration onto Context.
import type {} from '@deepseek-ai/dsh-host-webserver'

export const name = 'melite-card-view'

/** Routes arrive with the webServer service. */
export const inject = ['webServer']

export interface Config {
  /** Base URL of the Melite gateway (no trailing slash needed). */
  gatewayUrl?: string
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

export function apply(ctx: Context, config: Config): void {
  if (config.clientRowOnly === true) {
    ctx.logger.info('melite-card-view client row mounted (bundle-table contribution only)')
    return
  }

  const gatewayUrl = (config.gatewayUrl ?? 'http://127.0.0.1:33081').replace(/\/+$/, '')
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
      const target = gatewayUrl + subPath + url.search
      const method = req.method ?? 'GET'
      const headers: Record<string, string> = {}
      const contentType = req.headers['content-type']
      if (typeof contentType === 'string') headers['content-type'] = contentType

      let body: Buffer | undefined
      if (method !== 'GET' && method !== 'HEAD') body = await readBody(req)

      try {
        const upstream = await fetch(target, {
          method,
          headers,
          body,
          signal: AbortSignal.timeout(timeoutMs),
        })
        const payload = Buffer.from(await upstream.arrayBuffer())
        const outHeaders: Record<string, string> = { 'cache-control': 'no-cache' }
        const upstreamType = upstream.headers.get('content-type')
        outHeaders['content-type'] = upstreamType ?? 'application/octet-stream'
        // decoded-length framing: undici decompresses gzip transparently, so
        // the only safe content-length is the one we measured ourselves.
        outHeaders['content-length'] = String(payload.byteLength)
        res.writeHead(upstream.status, outHeaders)
        res.end(payload)
      } catch (error) {
        // Upstream unreachable/timed out: our own 502 — the one status this
        // route invents; every gateway answer passes through untouched.
        res.writeHead(502, { 'content-type': 'application/json' })
        res.end(JSON.stringify({
          error: 'melite gateway unreachable',
          target,
          detail: error instanceof Error ? error.message : String(error),
        }))
      }
    },
  }), 'melite-card-view: gateway proxy route')

  ctx.logger.info('melite-card-view proxying %s/* -> %s', prefix, gatewayUrl)
}
