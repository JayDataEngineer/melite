/**
 * `@infer-media/dsh-media` — host half.
 *
 * ONE media archive across EVERY gateway (the inference.cpp C++ orchestrator
 * AND the ray node gateway): a run made through either lane shows up in the
 * same sidebar. Two same-origin routes on the webServer service:
 *
 * - GET /infer-media/runs     → merged /v1/flows/runs from all gateways,
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
  /** Origins to merge (no trailing slash needed). REQUIRED — no default
   *  endpoint (QUEUE LANE LAW: missing required params fail LOUDLY). */
  gateways: string[]
  /** Upstream fetch timeout in milliseconds. */
  timeoutMs?: number
  /** Per-gateway run limit. */
  limit?: number
}

const DEFAULT_TIMEOUT_MS = 15_000
/* 2026-09-01 ARTIFACT-BLINDNESS FIX: the gateway door returns only the
 * NEWEST N runs. Chaos-test floods + error bursts fill the window with
 * sidecar-only rows and push every artifact-bearing run OUT of the
 * listing (sidebar showed "116 runs · 0 artifacts" while 58 real
 * artifacts sat past the window at limit=500). 500 is the door's hard
 * max — always pull it. Regression-tested by test/runs-window.mjs. */
const DEFAULT_LIMIT = 500
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }

interface WireArtifact { url?: unknown; type?: unknown; name?: unknown; size?: unknown }
interface WireRun {
  run_id?: unknown; name?: unknown; flow?: unknown; status?: unknown
  created_at?: unknown; prompt?: unknown; thumbnail?: unknown; source?: unknown
  artifacts?: unknown; families?: unknown; params?: unknown
}

/**
 * Door validators (the sidebar's Phase-1 gate): gateway rows arrive as
 * `unknown` and the old code pushed them through with two typeof checks.
 * Malformed rows are DROPPED and counted LOUDLY into the response's
 * `errors` array (the panel's existing error channel) — never pushed as
 * partials, never vanished silently. A run without a string run_id is
 * undedupeable and unkeyable; an artifact without a string url is
 * unrenderable; both are refused here.
 */
/** Absolute-src proxy URL for one asset; relative paths are rooted at the
 * gateway that served the run. Empty in, empty out; non-gateway absolutes
 * are dropped (empty string) rather than leaked. */
function toProxy(gw: string, path: unknown): string {
  if (typeof path !== 'string' || path === '') return ''
  let abs: string = path
  if (abs.startsWith('http://') || abs.startsWith('https://')) {
    try {
      if (new URL(abs).origin !== gw) return ''
    } catch {
      return ''
    }
  } else if (abs.startsWith('/')) {
    abs = gw + abs
  } else {
    return ''
  }
  return '/infer-media/artifact?src=' + encodeURIComponent(abs)
}

export function apply(ctx: Context, config: Config): void {
  if (!Array.isArray(config.gateways) || config.gateways.length === 0) {
    throw new Error('infer-media: `gateways` is required in the profile row — no default endpoint (QUEUE LANE LAW)')
  }
  const gateways = config.gateways.map(g => g.replace(/\/+$/, ''))
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const limit = config.limit ?? DEFAULT_LIMIT

  ctx.logger.info('infer-media merging gateways: %s', gateways.join(', '))

  /* THE FLOWS DOOR — the drafts list (composed action cards, the
   * queue-native flow instances) merged from EVERY gateway, exactly
   * like runs: one archive, many lanes. Rows are params docs (no artifact
   * URLs to rewrite); each is tagged with its source gateway so the panel
   * can badge origin. Deduped by draft_id; capped per gateway (limit) —
   * the sidebar is a browser, not an archive. */
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-media/drafts',
    handler: async (_req, res) => {
      const errors: Array<{ gateway: string; message: string }> = []
      const drafts: Array<Record<string, unknown>> = []
      const seenIds = new Set<string>()
      const settled = await Promise.allSettled(gateways.map(async (gw) => {
        const response = await fetch(gw + '/v1/flows/drafts', {
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (!response.ok) throw new Error('HTTP ' + String(response.status))
        const data = await response.json() as { drafts?: unknown }
        const list = Array.isArray(data.drafts) ? data.drafts : []
        let dropped = 0
        let dupes = 0
        for (const raw of list.slice(0, limit)) {
          const draft = raw as Record<string, unknown>
          const id = typeof draft.draft_id === 'string' ? draft.draft_id : ''
          if (id === '') { dropped += 1; continue }
          if (seenIds.has(id)) { dupes += 1; continue }
          seenIds.add(id)
          draft.source = gw
          drafts.push(draft)
        }
        if (dropped > 0) errors.push({ gateway: gw, message: 'dropped ' + String(dropped) + ' drafts without draft_id (unopenable)' })
        /* DEDUPE OBSERVABILITY (audit gap 7): first-wins dedupe used to be
         * silent — a misconfigured gateway mirroring another's drafts
         * looked like zero. Overlap is now counted and reported so a
         * duplicate archive is visible in the panel's stat line. */
        if (dupes > 0) errors.push({ gateway: gw, message: 'deduped ' + String(dupes) + ' drafts already listed by another gateway (cross-gateway overlap)' })
      }))
      settled.forEach((r, i) => {
        if (r.status === 'rejected') {
          errors.push({ gateway: gateways[i], message: String(r.reason).slice(0, 300) })
        }
      })
      if (drafts.length === 0 && errors.length > 0) {
        res.writeHead(502, JSON_HEADERS)
        res.end(JSON.stringify({ error: 'all_gateways_unreachable', errors }))
        return
      }
      res.writeHead(200, JSON_HEADERS)
      res.end(JSON.stringify({ gateways, errors, drafts }))
    },
  }), 'infer-media: /infer-media/drafts route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/infer-media/runs',
    handler: async (_req, res) => {
      const errors: Array<{ gateway: string; message: string }> = []
      const runs: unknown[] = []
      const seenIds = new Set<string>()
      const settled = await Promise.allSettled(gateways.map(async (gw) => {
        const response = await fetch(gw + '/v1/flows/runs?limit=' + String(limit), {
          signal: AbortSignal.timeout(timeoutMs),
        })
        if (!response.ok) throw new Error('HTTP ' + String(response.status))
        const data = await response.json() as { runs?: unknown }
        const list = Array.isArray(data.runs) ? data.runs : []
        let droppedRuns = 0
        let droppedArts = 0
        let dupes = 0
        for (const raw of list) {
          const run = raw as WireRun
          const id = typeof run.run_id === 'string' ? run.run_id : ''
          if (id === '') { droppedRuns += 1; continue }
          if (seenIds.has(id)) { dupes += 1; continue }
          seenIds.add(id)
          run.source = gw
          if (typeof run.thumbnail === 'string') run.thumbnail = toProxy(gw, run.thumbnail)
          if (Array.isArray(run.artifacts)) {
            const kept: WireArtifact[] = []
            for (const a of run.artifacts as WireArtifact[]) {
              // Known shape, not media: the gateway's trailing
              // {truncated,listed,total} marker (run_artifacts documents
              // it). Its counts ride the run row for future badges — the
              // marker itself is not an item.
              if (a !== null && typeof a === 'object' && (a as Record<string, unknown>).truncated === true) {
                const rec = a as Record<string, unknown>
                if (typeof rec.listed === 'number' && typeof rec.total === 'number') {
                  (run as Record<string, unknown>).truncated = { listed: rec.listed, total: rec.total }
                }
                continue
              }
              if (a !== null && typeof a === 'object' && typeof (a as WireArtifact).url === 'string' && (a as WireArtifact).url !== '') {
                a.url = toProxy(gw, a.url)
                if (a.url !== '') kept.push(a)
                else droppedArts += 1
              } else droppedArts += 1
            }
            run.artifacts = kept
          }
          runs.push(run)
        }
        if (droppedRuns > 0) errors.push({ gateway: gw, message: 'dropped ' + String(droppedRuns) + ' runs without run_id (undedupeable)' })
        if (droppedArts > 0) errors.push({ gateway: gw, message: 'dropped ' + String(droppedArts) + ' artifacts without a usable url' })
        /* DEDUPE OBSERVABILITY (audit gap 7): see the drafts door note. */
        if (dupes > 0) errors.push({ gateway: gw, message: 'deduped ' + String(dupes) + ' runs already listed by another gateway (cross-gateway overlap)' })
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
        // Forward Range header for video/audio seeking — the browser's
        // <video controls> sends Range requests to scrub; without them
        // the proxy returns the full file and the player can't seek.
        const range = req.headers.range
        const fetchHeaders: Record<string, string> = {}
        if (range) fetchHeaders['range'] = range

        const response = await fetch(src, {
          signal: AbortSignal.timeout(timeoutMs),
          headers: fetchHeaders,
        })
        if (!response.ok) {
          res.writeHead(response.status, { 'content-type': 'text/plain', 'cache-control': 'no-store' })
          res.end('upstream ' + String(response.status))
          return
        }
        // Stream the upstream response through — preserve status (200 or
        // 206 Partial Content), Content-Range, and Accept-Ranges so the
        // browser knows seeking is supported.
        const upstreamStatus = response.status
        const resHeaders: Record<string, string> = {
          'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
          'cache-control': 'public, max-age=60',
          'accept-ranges': 'bytes',
        }
        const contentLength = response.headers.get('content-length')
        if (contentLength) resHeaders['content-length'] = contentLength
        const contentRange = response.headers.get('content-range')
        if (contentRange) resHeaders['content-range'] = contentRange
        res.writeHead(upstreamStatus, resHeaders)
        // Stream — don't buffer the whole file into memory.  The Node
        // FetchResponse body is a ReadableStream; pipe through to the
        // Node http.ServerResponse which accepts web ReadableStream in
        // recent Node (≥18).  Fallback: buffer for older runtimes.
        const body = response.body
        if (body && typeof (body as any).pipe === 'function') {
          ;(body as any).pipe(res)
        } else if (body && typeof (body as any).getReader === 'function') {
          // Web ReadableStream — consume chunks and write
          const reader = (body as any).getReader()
          const pump = async (): Promise<void> => {
            const { done, value } = await reader.read()
            if (done) { res.end(); return }
            res.write(Buffer.from(value))
            return pump()
          }
          await pump()
        } else {
          const buffer = Buffer.from(await response.arrayBuffer())
          resHeaders['content-length'] = String(buffer.byteLength)
          res.writeHead(upstreamStatus, resHeaders)
          res.end(buffer)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        res.writeHead(502, JSON_HEADERS)
        res.end(JSON.stringify({ error: 'gateway_unreachable', message, src }))
      }
    },
  }), 'infer-media: /infer-media/artifact route')

  /* FLOW TEMPLATE CATALOG — RETIRED 2026-09-05: the gateway's
   * /v1/flows/yaml/* family died with the yaml format (NO LEGACY).
   * The typed flow world: {flow:name} reads flows/<name>/flow.py,
   * {flow_inline} runs agent-composed graphs. No proxy needed. */
}
