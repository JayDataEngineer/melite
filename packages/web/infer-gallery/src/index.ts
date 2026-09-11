/**
 * `@infer-media/dsh-gallery` — host half.
 *
 * Registers same-origin routes on the `webServer` service.
 *
 * THE GATEWAY KILL (2026-09-10, REBUILD-18): the gateway app is
 * dead. Two postures, resolved per request (no apply-time probe —
 * boot races proven 2026-09-10; per-request seat reads are safe):
 *
 * - cross-host: `gatewayUrl` pinned names the OWNING DSH — every
 *   route fetches it verbatim (the named-remote posture until
 *   Typert remotes land).
 * - in-tree: no `gatewayUrl` — the estate's own seats answer
 *   in-process (`runs`, `draftsRemote` via optional per-request
 *   probes; artifacts stream from the runs output tree itself —
 *   the same sidecar tree /infer-gallery/flow reads). An absent
 *   seat answers LOUD 502 naming the fix; nothing absorbs.
 *
 * - `GET /infer-gallery/runs` → the runs list (the 500-run window,
 *   the runs-window law), with run-relative artifact/thumbnail
 *   names rewritten to the artifact route below, so the browser
 *   stays same-origin.
 * - `GET /infer-gallery/drafts` → the drafts list (queue-native
 *   flow instances), newest-first, capped.
 * - `GET /infer-gallery/flow?run_id=…` → the run's _flow.json
 *   sidecar (disk read — no seat at all).
 * - `GET /infer-gallery/artifact?path=…` → streams one run
 *   artifact. Only run-relative names (`run-<id>/<file>`) are
 *   accepted (the run-artifact tree, confined).
 *
 * Failure policy: route handlers own their full response
 * lifecycle; the routes never throw.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the webServer service declaration onto Context.
import type {} from '@deepseek-ai/dsh-host-webserver'

export const name = 'infer-gallery'

/** Routes arrive with the webServer service. */
export const inject = ['webServer']

export interface Config {
/** Base URL of the OWNING DSH (no trailing slash needed) — the
 *  cross-host posture. Empty (or unset) means in-tree: the
 *  estate's seats answer in-process. */
gatewayUrl?: string
/** Upstream fetch timeout in milliseconds (cross-host only). */
timeoutMs?: number
/** Directory holding run-<id>/_flow.json sidecars (the runs output
 *  tree). Defaults to the estate's SERVER-STATE ROOT LAW tree. */
flowDir?: string
}

const DEFAULT_TIMEOUT_MS = 15_000
/** THE RUNS-WINDOW LAW (restored with the media full port, 2026-09-11):
 *  always pull the door's hard max — a smaller window lets sidecar
 *  floods push artifact rows out of the listing. 500 is the runs
 *  seat's hard max (the deleted dsh-media panel rode the same law on
 *  /v1/flows/runs?limit=500). */
const RUNS_LIMIT = '500'
const DRAFTS_LIMIT = 200
/** Sidecar tree default: the estate runs stream (SERVER-STATE ROOT
 *  LAW — build/ was the C era's cwd and is gone). */
const DEFAULT_FLOW_DIR = '/home/user/Documents/programs/active/inference.cpp/data/runs/output'
/** A run dir name: run-<hex>-<word> (the runs grammar). */
const RUN_DIR = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/
/** One path segment inside a run dir (traversal refuses at the
 *  grammar; realpath containment re-checks at the read). */
const RUN_SEGMENT = /^[A-Za-z0-9._-]+$/

/** A run-relative artifact name: run-<hex>-<word>/<file...> — the
 *  confinement the artifact route enforces. The file part is one or
 *  more segments: real artifacts live in subdirs (generate/...,
 *  input_prep/...) and the runs-list rewrite emits exactly this
 *  shape — the single-segment grammar refusing its own output was
 *  the 400 the live probe caught (2026-09-11). Each segment must be
 *  a real name; `.`/`..` refuse here and realpath containment
 *  re-checks below. */
function isRunRelative(target: string): boolean {
  const slash = target.indexOf('/')
  if (slash <= 0) return false
  if (!RUN_DIR.test(target.slice(0, slash))) return false
  const rest = target.slice(slash + 1)
  if (rest.length === 0) return false
  return rest.split('/').every(
    (seg) => RUN_SEGMENT.test(seg) && seg !== '.' && seg !== '..',
  )
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

/** The in-process estate seats this host reads (optional probes at
 *  the USE site — the cordis-tutorial optional-dependency law; the
 *  fiber contract stays ['webServer'] so a gallery may mount
 *  estate-free in the cross-host posture). */
interface EstateSeats {
  runs?: { list(limit: string, signal: AbortSignal): Promise<unknown> }
  draftsRemote?: { list(signal: AbortSignal): Promise<unknown> }
}

/** Rewrite one run-relative artifact name to a same-origin route
 * URL (empty in, empty out). */
function proxyAssetUrl(path: unknown): string {
  if (typeof path !== 'string' || path === '') return ''
  return `/infer-gallery/artifact?path=${encodeURIComponent(path)}`
}

const fail = (res: { writeHead(s: number, h: Record<string, string>): void; end(b: string): void }, status: number, code: string, payload: Record<string, unknown>): void => {
  const body = JSON.stringify({ error: code, ...payload })
  res.writeHead(status, { ...JSON_HEADERS, 'content-length': String(Buffer.byteLength(body)) })
  res.end(body)
}

export function apply(ctx: Context, config: Config = {}): void {
  const gatewayUrl = (config.gatewayUrl ?? '').replace(/\/+$/, '')
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const flowDir = config.flowDir ?? DEFAULT_FLOW_DIR

  /** One upstream JSON document. Cross-host fetches the owning DSH
   *  verbatim; in-tree answers over the seat. An absent seat is a
   *  LOUD 502 naming the fix — no fallback absorbs it. */
  const upstream = async (lane: string, seat: unknown, call: () => Promise<unknown>): Promise<unknown> => {
    if (gatewayUrl !== '') {
      const response = await fetch(`${gatewayUrl}${lane}`, { signal: AbortSignal.timeout(timeoutMs) })
      const body = await response.text()
      if (!response.ok) {
        throw new GalleryUpstreamError(`upstream ${lane} answered ${response.status}`, body.slice(0, 2_000), response.status)
      }
      return JSON.parse(body)
    }
    if (seat === undefined) {
      throw new GallerySeatError(`infer-gallery: no estate seat for ${lane} in this tree — mount @melite-plugin/melite-estate or pin gatewayUrl (the owning DSH)`)
    }
    return call()
  }

  ctx.logger.info('infer-gallery serving (%s)', gatewayUrl === '' ? 'in-tree estate seats' : `owning DSH ${gatewayUrl}`)

  /* The FLOWS door: the drafts list (the composed action cards, the
   * queue-native flow instances). Newest-first; DRAFTS_LIMIT caps
   * the payload — the sidebar is a browser, not an archive. Draft
   * rows are params docs: no artifact names to rewrite, unlike
   * runs. */
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-gallery/drafts',
    handler: async (_req, res) => {
      try {
        const signal = new AbortController().signal
        const payload = (await upstream('/v1/flows/drafts', ctx.get('draftsRemote', false), () => (ctx.get('draftsRemote', false) as EstateSeats['draftsRemote'])!.list(signal))) as { drafts?: Record<string, unknown>[] }
        const all = Array.isArray(payload?.drafts) ? payload.drafts : []
        const drafts = all.slice(0, DRAFTS_LIMIT)
        const body = JSON.stringify({
          gateway: gatewayUrl,
          total: all.length,
          truncated: all.length > drafts.length,
          drafts,
        })
        res.writeHead(200, { ...JSON_HEADERS, 'content-length': String(Buffer.byteLength(body)) })
        res.end(Buffer.from(body))
      } catch (error) {
        ctx.logger.warn('infer-gallery: drafts failed: %s', error instanceof Error ? error.message : String(error))
        if (error instanceof GalleryUpstreamError) {
          fail(res, error.status, 'gateway_error', { upstream: `${gatewayUrl}/v1/flows/drafts`, body: error.body })
        } else if (error instanceof GallerySeatError) {
          fail(res, 502, 'no_estate_seat', { message: error.message, lane: '/v1/flows/drafts' })
        } else {
          fail(res, 502, 'gateway_unreachable', { message: error instanceof Error ? error.message : String(error), gatewayUrl, upstream: `${gatewayUrl}/v1/flows/drafts` })
        }
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
      if (!/^[A-Za-z0-9_-]+$/.test(runId)) {
        fail(res, 400, 'bad_run_id', { message: 'run_id must be [A-Za-z0-9_-]+' })
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
        fail(res, 404, 'no_sidecar', { message: `no readable _flow.json for ${runId}` })
      }
    },
  }), 'infer-gallery: /infer-gallery/flow route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-gallery/runs',
    handler: async (_req, res) => {
      try {
        const signal = new AbortController().signal
        const payload = (await upstream(`/v1/flows/runs?limit=${RUNS_LIMIT}`, ctx.get('runs', false), () => (ctx.get('runs', false) as EstateSeats['runs'])!.list(RUNS_LIMIT, signal))) as { runs?: Record<string, unknown>[] }
        const runs = Array.isArray(payload?.runs) ? payload.runs : []
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
        const body = JSON.stringify({ gateway: gatewayUrl, runs })
        res.writeHead(200, { ...JSON_HEADERS, 'content-length': String(Buffer.byteLength(body)) })
        res.end(Buffer.from(body))
      } catch (error) {
        ctx.logger.warn('infer-gallery: runs failed: %s', error instanceof Error ? error.message : String(error))
        if (error instanceof GalleryUpstreamError) {
          fail(res, error.status, 'gateway_error', { upstream: `${gatewayUrl}/v1/flows/runs`, body: error.body })
        } else if (error instanceof GallerySeatError) {
          fail(res, 502, 'no_estate_seat', { message: error.message, lane: '/v1/flows/runs' })
        } else {
          fail(res, 502, 'gateway_unreachable', { message: error instanceof Error ? error.message : String(error), gatewayUrl, upstream: `${gatewayUrl}/v1/flows/runs` })
        }
      }
    },
  }), 'infer-gallery: /infer-gallery/runs route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-gallery/artifact',
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://infer-gallery.invalid')
      const target = url.searchParams.get('path') ?? ''
      if (!isRunRelative(target)) {
        fail(res, 400, 'forbidden_path', { message: 'artifact route only serves run-relative names (run-<id>/<file>)', path: target })
        return
      }
      try {
        if (gatewayUrl !== '') {
          // Cross-host: the owning DSH's asset tree (the /v1/assets
          // prefix rides only in this posture — the in-tree rows are
          // run-relative by the REBUILD-6 divergence law).
          const response = await fetch(`${gatewayUrl}/v1/assets/runs/${target}`, { signal: AbortSignal.timeout(timeoutMs) })
          if (!response.ok || response.body === null) {
            fail(res, response.status, 'gateway_error', { upstream: `${gatewayUrl}/v1/assets/runs/${target}` })
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
          return
        }
        // In-tree: the runs output tree itself (the same sidecar
        // tree /infer-gallery/flow reads — one disk, no seat).
        // DOUBLE CONFINEMENT (the media route's law): the grammar
        // refused traversal above; resolved-path containment proves
        // the read stays inside flowDir.
        const fs = await import('node:fs/promises')
        const path = await import('node:path')
        const root = path.resolve(flowDir)
        const full = path.resolve(root, target)
        if (full !== root && !full.startsWith(root + path.sep)) {
          fail(res, 400, 'forbidden_path', { message: 'artifact escapes the runs tree', path: target })
          return
        }
        const file = await fs.readFile(full)
        const ext = target.slice(target.lastIndexOf('.') + 1).toLowerCase()
        const type = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : ext === 'mp4' || ext === 'webm' ? 'video/webm' : 'application/octet-stream'
        res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'content-length': String(file.byteLength) })
        res.end(file)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        ctx.logger.warn('infer-gallery: artifact failed: %s', message)
        fail(res, 502, 'artifact_unreadable', { message, path: target })
      }
    },
  }), 'infer-gallery: /infer-gallery/artifact route')
}

/** Cross-host upstream answered an error status (its body rides). */
class GalleryUpstreamError extends Error {
  readonly body: string
  readonly status: number
  constructor(message: string, body: string, status: number) {
    super(message)
    this.body = body
    this.status = status
  }
}

/** In-tree posture with the estate absent — the loud 502 (nothing
 *  absorbs a missing seat). */
class GallerySeatError extends Error {}
