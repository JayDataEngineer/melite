/**
 * wire.ts — the misfire monitor: every wire call the page makes, watched.
 *
 * The misfire class (operator report, 2026-10-02): "you press the generate
 * button, or go to the media sidebar, and it says 502 or 404 — I see these
 * a lot." No lane watched the JUNCTION — what the page actually emits vs
 * what the backend actually serves. This helper is the browser-side half:
 *
 *   DRIFT       404 whose body says "no such route" — the door does not
 *               exist on this backend. Always a bug (or a REVIEWING entry).
 *   SERVER      any 5xx — the backend itself failed.
 *   NETWORK     requestfailed — proxy dead / connection refused (the 502
 *               class a user sees when the gateway is down).
 *
 * 4xx that is NOT no-such-route is a semantic answer (validation door,
 * "model not found") — expected on deliberate misfire probes, allowlisted
 * per-test via `allow`.
 *
 * The KNOWN_ABSENT prefixes mirror the REVIEWING table in
 * tests/test_wire_surface.py (its fossil guard + this census keep the two
 * honest). Known-absent doors are COUNTED and reported as a census line,
 * never silently — but they do not fail a test; anything new does.
 */

/** Routes confirmed dead 2026-10-02 (see tests/walls/suites/test_wire_surface.py).
 * ('/poser/' WAS here — the gateway studio bridge was rebuilt
 * 2026-09-05 and now serves the prefix by forwarding to the engine
 * endpoint's poser pack; the exemption retired with the fix.)
 * EMPTIED 2026-09-07 (the legacy-removal stroke): the py REVIEWING
 * table is empty and every entry below was recovered — doors ported
 * (/v1/loras, the drafts stage-result loop) or callers deleted/repointed
 * (agent/manager panels, compose, controlnets, flow-catalog,
 * download-model/stream, media/upload, speech-length, comfyui direct
 * doors, render_glb/render_textured, /health). The lists stay as the
 * mechanism — NEW absent doors land here only with a date. */
export const KNOWN_ABSENT_PREFIXES: readonly string[] = [
]

export const KNOWN_ABSENT_EXACT: readonly string[] = [
]

/**
 * Doors that EXIST as arms but answer wrongly for legal traffic — the
 * swallowed-path class. Found live 2026-10-02: the run-truth verification
 * flow (flowRunSlice, operator-ordered 2026-08-30) GETs
 * /v1/flows/drafts/:id/stages/:sid/result — the heal door — but the
 * py gateway never ported it, and the greedy drafts-get regex
 * ^/v1/flows/drafts/(.+)$ swallows the subpath and 400s "bad id".
 * One silent 400 per done stage per open. Static extraction CANNOT catch
 * this (the greedy regex claims to serve any drafts/* path); only a live
 * monitor can. Port the door or delete the verify call, then shrink this.
 *
 * RESOLVED 2026-09-07 (the legacy-removal stroke): the gateway serves
 * both halves of the loop now — PATCH .../stages/{sid} persists,
 * GET .../stages/{sid}/result answers 200 {found, result}. The list
 * stays as the mechanism for the next swallowed-path class.
 */
export const KNOWN_SWALLOWED: readonly { prefix: string; status: number }[] = [
]

export type MisfireKind = 'drift' | 'server' | 'network' | 'unexpected-4xx'

export interface WireMisfire {
  kind: MisfireKind
  method: string
  url: string
  status?: number
  detail: string
}

export interface KnownAbsent {
  method: string
  url: string
  status: number
}

export interface WireMonitor {
  /** Misfires NOT covered by the KNOWN_ABSENT tables — these fail tests. */
  misfires(): WireMisfire[]
  /** Dead doors the census already knows about — reported, not fatal. */
  census(): KnownAbsent[]
  /** Human-readable block for failure messages. */
  report(): string
}

const WIRE_RE = /(\/v1\/|\/poser\/|\/comfyui\/|\/health$)/

function isKnownAbsent(pathname: string): boolean {
  return (
    KNOWN_ABSENT_PREFIXES.some((p) => pathname.startsWith(p)) ||
    KNOWN_ABSENT_EXACT.includes(pathname)
  )
}

function isKnownSwallowed(pathname: string, status: number): boolean {
  return KNOWN_SWALLOWED.some((k) => pathname.startsWith(k.prefix) && status === k.status)
}

/**
 * Attach to a page BEFORE navigation. `allow` permits expected semantic
 * 4xx (e.g. the validation door on a deliberate misfire probe).
 */
export function attachWireMonitor(
  page: import('@playwright/test').Page,
  opts: { allow?: (method: string, pathname: string, status: number) => boolean } = {},
): WireMonitor {
  const misfires: WireMisfire[] = []
  const knownAbsent: KnownAbsent[] = []

  page.on('response', async (res) => {
    const url = res.url()
    if (!WIRE_RE.test(url)) return
    const status = res.status()
    if (status < 400) return
    const { pathname } = new URL(url)
    const method = res.request().method()
    if (status >= 500) {
      misfires.push({ kind: 'server', method, url, status, detail: 'server error' })
      return
    }
    // 4xx: distinguish the absent door from the semantic answer.
    let body = ''
    try { body = await res.text() } catch { /* body already gone */ }
    if (body.includes('no such route')) {
      const hit = { method, url, status }
      if (isKnownAbsent(pathname)) knownAbsent.push(hit)
      else misfires.push({ kind: 'drift', method, url, status, detail: body.slice(0, 120) })
      return
    }
    if (isKnownSwallowed(pathname, status)) {
      knownAbsent.push({ method, url, status })
      return
    }
    if (!opts.allow?.(method, pathname, status)) {
      misfires.push({ kind: 'unexpected-4xx', method, url, status, detail: body.slice(0, 120) })
    }
  })

  page.on('requestfailed', (req) => {
    const url = req.url()
    if (!WIRE_RE.test(url)) return
    misfires.push({
      kind: 'network',
      method: req.method(),
      url,
      detail: req.failure()?.errorText ?? 'request failed',
    })
  })

  return {
    misfires: () => [...misfires],
    census: () => [...knownAbsent],
    report: () => {
      const lines = [
        ...misfires.map((m) => `  [${m.kind}] ${m.method} ${m.status ?? '—'} ${m.url} — ${m.detail}`),
        ...knownAbsent.map((k) => `  [known-absent] ${k.method} ${k.status} ${k.url}`),
      ]
      return lines.length ? lines.join('\n') : '  (clean wire)'
    },
  }
}
