/**
 * `@infer-media/dsh-media` — host half.
 *
 * ONE media archive across EVERY gateway (the inference.cpp C++ orchestrator
 * AND the ray node gateway): a run made through either lane shows up in the
 * same sidebar. Two same-origin routes on the webServer service:
 *
 * - GET /infer-media/runs     → merged /v1/pipelines/runs from all gateways,
 *                               every artifact/thumbnail URL rewritten to the
 *                               artifact proxy below (browser stays same-origin).
 * - GET /infer-media/artifact → streams one asset. Only absolute URLs whose
 *                               origin is a configured gateway are accepted.
 *
 * Failure policy: one gateway down never blanks the archive — the response
 * carries the other gateways' runs plus an `errors` array. Handlers own their
 * full response lifecycle; nothing throws out of a route.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

export const name = 'infer-media'

export const inject = ['webServer']

export interface Config {
  /** Origins to merge (no trailing slash needed). */
  gateways?: string[]
  /** Upstream fetch timeout in milliseconds. */
  timeoutMs?: number
  /** Per-gateway run limit. */
  limit?: number
}

const DEFAULT_GATEWAYS = ['http://localhost:18090']
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_LIMIT = 200
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

interface WireArtifact { url?: unknown; type?: unknown; name?: unknown; size?: unknown }
interface WireRun {
  run_id?: unknown; name?: unknown; pipeline?: unknown; status?: unknown
  created_at?: unknown; prompt?: unknown; thumbnail?: unknown; source?: unknown
  artifacts?: unknown; families?: unknown; params?: unknown
}

/** Absolute-src proxy URL for one asset; relative paths are rooted at the
 * gateway that served the run. Empty in, empty out; non-gateway absolutes
 * are dropped (empty string) rather than leaked. */
function toProxy(gw: string, path: unknown): string {
  if (typeof path !== 'string' || path === '') return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      if (new URL(path).origin !== gw) return ''
    } catch {
      return ''
    }
  } else if (path.startsWith('/')) {
    path = gw + path
  } else {
    return ''
  }
  return '/infer-media/artifact?src=' + encodeURIComponent(path)
}

export function apply(ctx: Context, config: Config): void {
  const gateways = (config.gateways ?? DEFAULT_GATEWAYS).map(g => g.replace(/\/+$/, ''))
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const limit = config.limit ?? DEFAULT_LIMIT

  ctx.logger.info('infer-media merging gateways: %s', gateways.join(', '))

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-media/runs',
    handler: async (_req, res) => {
      const errors: Array<{ gateway: string; message: string }> = []
      const runs: unknown[] = []
      const seenIds = new Set<string>()
      const settled = await Promise.allSettled(gateways.map(async (gw) => {
        const response = await fetch(gw + '/v1/pipelines/runs?limit=' + String(limit), {
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (!response.ok) throw new Error('HTTP ' + String(response.status))
        const data = await response.json() as { runs?: unknown }
        const list = Array.isArray(data.runs) ? data.runs : []
        for (const raw of list) {
          const run = raw as WireRun
          const id = typeof run.run_id === 'string' ? run.run_id : ''
          if (id !== '' && seenIds.has(id)) continue
          if (id !== '') seenIds.add(id)
          run.source = gw
          if (typeof run.thumbnail === 'string') run.thumbnail = toProxy(gw, run.thumbnail)
          if (Array.isArray(run.artifacts)) {
            for (const a of run.artifacts as WireArtifact[]) {
              if (typeof a.url === 'string') a.url = toProxy(gw, a.url)
            }
          }
          runs.push(run)
        }
      }))
      settled.forEach((r, i) => {
        if (r.status === 'rejected') {
          errors.push({ gateway: gateways[i], message: String(r.reason).slice(0, 300) })
        }
      })
      if (runs.length === 0 && errors.length > 0) {
        res.writeHead(502, JSON_HEADERS)
        res.end(JSON.stringify({ error: 'all_gateways_unreachable', errors }))
        return
      }
      runs.sort((a, b) => {
        const ca = typeof (a as WireRun).created_at === 'number' ? (a as WireRun).created_at as number : 0
        const cb = typeof (b as WireRun).created_at === 'number' ? (b as WireRun).created_at as number : 0
        return cb - ca
      })
      res.writeHead(200, JSON_HEADERS)
      res.end(JSON.stringify({ gateways, errors, runs }))
    },
  }), 'infer-media: /infer-media/runs route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-media/artifact',
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://infer-media.invalid')
      const src = url.searchParams.get('src') ?? ''
      let ok = false
      for (const gw of gateways) {
        if (src.startsWith(gw + '/')) { ok = true; break }
      }
      if (!ok) {
        res.writeHead(400, JSON_HEADERS)
        res.end(JSON.stringify({ error: 'bad_src', message: 'src must be an absolute URL under a configured gateway' }))
        return
      }
      try {
        const response = await fetch(src, { signal: AbortSignal.timeout(timeoutMs) })
        if (!response.ok) {
          res.writeHead(response.status, { 'content-type': 'text/plain', 'cache-control': 'no-store' })
          res.end('upstream ' + String(response.status))
          return
        }
        const buffer = Buffer.from(await response.arrayBuffer())
        res.writeHead(response.status, {
          'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
          'cache-control': 'public, max-age=60',
          // explicit length: remote proxies (tailscale serve) mishandle chunked
          // framing on lossy links — a known length lets them buffer instead.
          'content-length': String(buffer.byteLength),
        })
        res.end(buffer)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        res.writeHead(502, JSON_HEADERS)
        res.end(JSON.stringify({ error: 'gateway_unreachable', message, src }))
      }
    },
  }), 'infer-media: /infer-media/artifact route')
}
