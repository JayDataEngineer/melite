/**
 * `@infer-media/dsh-gallery` — host half.
 *
 * Registers two same-origin routes on the `webServer` service, proxying the
 * Melite gateway (:33081 by default, `gatewayUrl` config):
 *
 * - `GET /infer-gallery/runs` → `GET <gateway>/v1/pipelines/runs`, with every
 *   gateway-relative artifact/thumbnail URL rewritten to the artifact proxy
 *   below, so the browser stays same-origin.
 * - `GET /infer-gallery/artifact?path=…` → streams one gateway asset. Only
 *   paths under `/editor/assets/runs/` are accepted (the run-artifact tree).
 *
 * Failure policy: reachable webServer but unreachable gateway answers `502`
 * with a JSON body carrying the upstream error — the client view renders
 * that body verbatim as its error state. Route handlers own their full
 * response lifecycle; the proxy never throws.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the webServer service declaration onto Context.
import type {} from '@deepseek-ai/dsh-host-webserver'

export const name = 'infer-gallery'

/** Routes arrive with the webServer service. */
export const inject = ['webServer']

export interface Config {
/** Base URL of the Melite gateway (no trailing slash needed). */
gatewayUrl?: string
/** Upstream fetch timeout in milliseconds. */
timeoutMs?: number
}

const DEFAULT_GATEWAY_URL = 'http://localhost:18090'
const DEFAULT_TIMEOUT_MS = 8_000
const RUNS_UPSTREAM = '/v1/pipelines/runs'
/** The only gateway tree the artifact proxy may touch. */
const ASSET_PREFIX = '/editor/assets/runs/'

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

/** Rewrite one gateway-relative asset path to a same-origin proxy URL (empty in, empty out). */
function proxyAssetUrl(path: unknown): string {
  if (typeof path !== 'string' || path === '') return ''
  return `/infer-gallery/artifact?path=${encodeURIComponent(path)}`
}

export function apply(ctx: Context, config: Config): void {
  const gatewayUrl = (config.gatewayUrl ?? DEFAULT_GATEWAY_URL).replace(/\/+$/, '')
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const upstream = (path: string): Promise<Response> =>
    fetch(`${gatewayUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs) })

  ctx.logger.info('infer-gallery proxying %s (gateway %s)', RUNS_UPSTREAM, gatewayUrl)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-gallery/runs',
    handler: async (_req, res) => {
      try {
        const response = await upstream(RUNS_UPSTREAM)
        const body = await response.text()
        if (!response.ok) {
          // Upstream answered with an error status: pass it through verbatim.
          res.writeHead(response.status, JSON_HEADERS)
          res.end(JSON.stringify({
            error: 'gateway_error',
            status: response.status,
            upstream: `${gatewayUrl}${RUNS_UPSTREAM}`,
            body: body.slice(0, 2_000),
          }))
          return
        }
        let payload: unknown
        try {
          payload = JSON.parse(body)
        } catch {
          res.writeHead(502, JSON_HEADERS)
          res.end(JSON.stringify({
            error: 'gateway_bad_payload',
            message: 'upstream /v1/pipelines/runs returned non-JSON body',
            body: body.slice(0, 2_000),
          }))
          return
        }
        const runs = Array.isArray((payload as { runs?: unknown })?.runs)
          ? (payload as { runs: Record<string, unknown>[] }).runs
          : []
        for (const run of runs) {
          run.thumbnail = proxyAssetUrl(run.thumbnail)
          if (Array.isArray(run.artifacts)) {
            for (const artifact of run.artifacts) {
              if (artifact !== null && typeof artifact === 'object') {
                ;(artifact as Record<string, unknown>).url = proxyAssetUrl((artifact as Record<string, unknown>).url)
              }
            }
          }
        }
        res.writeHead(200, JSON_HEADERS)
        res.end(JSON.stringify({ gateway: gatewayUrl, runs }))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        ctx.logger.warn('infer-gallery: gateway unreachable: %s', message)
        res.writeHead(502, JSON_HEADERS)
        res.end(JSON.stringify({
          error: 'gateway_unreachable',
          message,
          gatewayUrl,
          upstream: `${gatewayUrl}${RUNS_UPSTREAM}`,
        }))
      }
    },
  }), 'infer-gallery: /infer-gallery/runs route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-gallery/artifact',
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://infer-gallery.invalid')
      const target = url.searchParams.get('path') ?? ''
      if (!target.startsWith(ASSET_PREFIX)) {
        res.writeHead(400, JSON_HEADERS)
        res.end(JSON.stringify({
          error: 'forbidden_path',
          message: `artifact proxy only serves paths under ${ASSET_PREFIX}`,
          path: target,
        }))
        return
      }
      try {
        const response = await upstream(target)
        if (!response.ok || response.body === null) {
          res.writeHead(response.status, JSON_HEADERS)
          res.end(JSON.stringify({
            error: 'gateway_error',
            status: response.status,
            upstream: `${gatewayUrl}${target}`,
          }))
          return
        }
        const buffer = Buffer.from(await response.arrayBuffer())
        res.writeHead(response.status, {
          'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
          'cache-control': 'no-store',
        })
        res.end(buffer)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        res.writeHead(502, JSON_HEADERS)
        res.end(JSON.stringify({ error: 'gateway_unreachable', message, path: target }))
      }
    },
  }), 'infer-gallery: /infer-gallery/artifact route')
}