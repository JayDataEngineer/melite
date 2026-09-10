/**
 * `@infer-media/dsh-gallery` — host half.
 *
 * Registers two same-origin routes on the `webServer` service, proxying the
 * Melite gateway (:33081 by default, `gatewayUrl` config):
 *
 * - `GET /infer-gallery/runs` → `GET <gateway>/v1/flows/runs`, with every
 *   gateway-relative artifact/thumbnail URL rewritten to the artifact proxy
 *   below, so the browser stays same-origin.
 * - `GET /infer-gallery/artifact?path=…` → streams one gateway asset. Only
 *   paths under `/v1/assets/runs/` are accepted (the run-artifact tree).
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
/** Directory holding run-<id>/_flow.json sidecars (the gateway's output tree). */
flowDir?: string
}

/** A gallery mounted far from its estate names the OWNING DSH in
 * its profile row (config.gatewayUrl, REQUIRED in that posture —
 * the refusal below is loud). No code default exists at all; a
 * same-host gallery never fetches (the lanes answer in-process). */
const DEFAULT_TIMEOUT_MS = 15_000
const RUNS_UPSTREAM = '/v1/flows/runs?limit=50'
/** The only gateway tree the artifact proxy may touch
 *  (Phase 2 consolidation, 2026-09-04: /v1/assets/runs → /v1/assets/runs). */
const ASSET_PREFIX = '/v1/assets/runs/'
/** Sidecar tree default: the estate runs stream (SERVER-STATE ROOT LAW —
 *  build/ was the C era's cwd and is gone). */
const DEFAULT_FLOW_DIR = '/home/user/Documents/programs/active/inference.cpp/data/runs/output'

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

/** Rewrite one gateway-relative asset path to a same-origin proxy URL (empty in, empty out). */
function proxyAssetUrl(path: unknown): string {
  if (typeof path !== 'string' || path === '') return ''
  return `/infer-gallery/artifact?path=${encodeURIComponent(path)}`
}

export function apply(ctx: Context, config: Config = {}): void {
  const gatewayUrl = (config.gatewayUrl ?? '').replace(/\/+$/, '')
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const flowDir = config.flowDir ?? DEFAULT_FLOW_DIR

  // MODE (no apply-time estate probe — cordis initializes bundles
  // concurrently and a ctx.runsRemote read here throws "without
  // inject" whenever the estate lands later (boot race, proven
  // 2026-09-10: identical tree booted clean, then crashed on
  // restart). The mode is structural, resolved per request: a
  // pinned gatewayUrl means cross-host; otherwise the estate's own
  // lanes answer in-process, and an unclaimed lane is a loud 502
  // naming the fix — misconfiguration stays loud, boot stays total.
  // THE GATEWAY KILL (2026-09-10): the in-process lanes are dead.
  // Same-host answers 502 LOUD until the gallery rides named Typert
  // remotes; cross-host still fetches the pinned owning DSH.
  const upstream = async (path: string): Promise<Response> => {
    if (gatewayUrl === '') {
      throw new Error('infer-gallery: estate lanes died with the gateway (2026-09-10) — pin gatewayUrl or migrate to a named Typert remote (GET ' + path + ')')
    }
    return fetch(`${gatewayUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs) })
  }

  ctx.logger.info('infer-gallery proxying %s (gateway %s)', RUNS_UPSTREAM, gatewayUrl)

  /* The FLOWS door: the drafts list (the composed action cards, the
   * queue-native flow instances). /v1/flows/drafts is newest-first;
   * DRAFTS_LIMIT caps the payload — the sidebar is a browser, not an
   * archive (the full index stays reachable at the gateway itself).
   * Draft rows are params docs: no artifact URLs to rewrite, unlike runs. */
  const DRAFTS_UPSTREAM = '/v1/flows/drafts'
  const DRAFTS_LIMIT = 200
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-gallery/drafts',
    handler: async (_req, res) => {
      try {
        const response = await upstream(DRAFTS_UPSTREAM)
        const body = await response.text()
        if (!response.ok) {
          res.writeHead(response.status, JSON_HEADERS)
          res.end(JSON.stringify({
            error: 'gateway_error',
            status: response.status,
            upstream: `${gatewayUrl}${DRAFTS_UPSTREAM}`,
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
            message: 'upstream /v1/flows/drafts returned non-JSON body',
            body: body.slice(0, 2_000),
          }))
          return
        }
        const all = Array.isArray((payload as { drafts?: unknown })?.drafts)
          ? (payload as { drafts: Record<string, unknown>[] }).drafts
          : []
        const drafts = all.slice(0, DRAFTS_LIMIT)
        const draftsBody = JSON.stringify({
          gateway: gatewayUrl,
          total: all.length,
          truncated: all.length > drafts.length,
          drafts,
        })
        res.writeHead(200, { ...JSON_HEADERS, 'content-length': String(Buffer.byteLength(draftsBody)) })
        res.end(Buffer.from(draftsBody))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        ctx.logger.warn('infer-gallery: gateway unreachable: %s', message)
        res.writeHead(502, JSON_HEADERS)
        res.end(JSON.stringify({
          error: 'gateway_unreachable',
          message,
          gatewayUrl,
          upstream: `${gatewayUrl}${DRAFTS_UPSTREAM}`,
        }))
      }
    },
  }), 'infer-gallery: /infer-gallery/drafts route')

  /* The params round-trip door: serve one run's _flow.json sidecar so
   * the media panel can rehydrate the generation as an editable card.
   * Legacy sidecars written by the pre-2026-08-27 binary carry a doubled
   * quote before `seed`/`error` (`,""seed":`) — repaired on read, so even
   * yesterday's films round-trip. run_id is strictly [A-Za-z0-9_-]. */
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-gallery/flow',
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://infer-gallery.invalid')
      const runId = url.searchParams.get('run_id') ?? ''
      const fail = (status: number, code: string, message: string): void => {
        const b = JSON.stringify({ error: code, message })
        res.writeHead(status, { ...JSON_HEADERS, 'content-length': String(Buffer.byteLength(b)) })
        res.end(Buffer.from(b))
      }
      if (!/^[A-Za-z0-9_-]+$/.test(runId)) {
        fail(400, 'bad_run_id', 'run_id must be [A-Za-z0-9_-]+')
        return
      }
      try {
        const fs = await import('node:fs/promises')
        const raw = await fs.readFile(`${flowDir}/${runId}/_flow.json`, 'utf8')
        let doc: unknown
        try {
          doc = JSON.parse(raw)
        } catch {
          doc = JSON.parse(raw.replaceAll(',""', ',"'))
        }
        const body = JSON.stringify({ run_id: runId, flow: doc })
        res.writeHead(200, { ...JSON_HEADERS, 'content-length': String(Buffer.byteLength(body)) })
        res.end(Buffer.from(body))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        ctx.logger.warn('infer-gallery: flow doc read failed: %s', message)
        fail(404, 'no_sidecar', `no readable _flow.json for ${runId}`)
      }
    },
  }), 'infer-gallery: /infer-gallery/flow route')

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
            message: 'upstream /v1/flows/runs returned non-JSON body',
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
        const runsBody = JSON.stringify({ gateway: gatewayUrl, runs })
        res.writeHead(200, { ...JSON_HEADERS, 'content-length': String(Buffer.byteLength(runsBody)) })
        res.end(Buffer.from(runsBody))
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
          // explicit length: remote proxies (tailscale serve) mishandle chunked
          // framing on lossy links — a known length lets them buffer instead.
          'content-length': String(buffer.byteLength),
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
