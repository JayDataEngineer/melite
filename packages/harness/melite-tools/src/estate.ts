/**
 * estate.ts — the tools' ONE transport: the ctx seats, in-process.
 *
 * NO HTTP, NO URL, NO PORT (the remotes migration, R2b). The KV/runs
 * lanes ride the estate row's Typert seats (draftsRemote/
 * benchRemote/runsRemote — plain method calls on ctx). The lane
 * fallback died with the gateway (2026-09-10): any lane without a
 * seat throws LOUD — no silent absorb, QUEUE LANE LAW.
 *
 * Seat reads are OPTIONAL-dependency probes — ctx.get(name), the
 * tutorial's documented pattern (cordis-tutorial/03-services.md:
 * "skip inject and probe at the use site"; property reads demand
 * inject and the tools plane must activate in EVERY composition).
 *
 * Remote failures arrive as the protocol's RemoteError (code +
 * details) — discriminate with remoteErrorOf, never instanceof.
 */

// Type-only: pulls the `draft/*` + `bench/*` RemoteErrorDetailsMap
// merges from the producing package into every tools compilation
// (erased at runtime; the DSH-generated client assembly replaces
// this reference when the generation pipeline lands host-side).
import type {} from '@melite/estate-drafts'

/**
 * DYING SHIM (HTTP-era refusal carrier). The seats never throw it;
 * only lanes still awaiting their remotes keep instanceof arms for
 * it, and it is deleted with the last of those. Bench/drafts lanes
 * are already migrated (RemoteError codes).
 */
export class RayGatewayError extends Error {
  readonly status: number
  readonly url: string
  readonly body: string

  constructor(status: number, url: string, body: string) {
    super(`melite gateway ${status} ${url}: ${body}`)
    this.name = 'RayGatewayError'
    this.status = status
    this.url = url
    this.body = body
  }
}


export type EstateMethod = 'GET' | 'POST' | 'PATCH'
export type EstateRequest = (
  method: EstateMethod,
  path: string,
  body: unknown,
  execSignal: AbortSignal,
  timeoutMs: number,
) => Promise<unknown>

/** The estate row's Context-merged seats, stated structurally
 *  (the compiled remote types stay out of this source-run package). */
interface Seats {
  draftsRemote?: {
    list(signal?: AbortSignal): Promise<{ count: number; drafts: unknown[] }>
    get(draftId: string, signal?: AbortSignal): Promise<unknown>
  }
  benchRemote?: {
    get(session: string, signal?: AbortSignal): Promise<unknown>
    ensure(doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    patch(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    addStage(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    removeStage(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    rewire(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
    undo(session: string, doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
  }

  /** The live-run REGISTRY seat (REBUILD-6) — the seat is named
   *  'runs' (RunsRegistryService: the business arms validate/start/
   *  status/stop/list as plain methods). NOT runsRemote (the Typert
   *  transport service whose wire methods are remoteExport*) — the
   *  lanes call the registry in-process. */
  runs?: {
    start(doc: unknown, signal: AbortSignal): Promise<unknown>
    status(runId: string, signal: AbortSignal, includeLog?: boolean): Promise<unknown>
    stop(runId: string, signal: AbortSignal): Promise<unknown>
    list(rawLimit: string, signal: AbortSignal): Promise<unknown>
    validate(doc: unknown, signal: AbortSignal): Promise<unknown>
  }

  /** The disclosure seat (REBUILD-14): discover over both planes,
   *  derived live (the flows registry + the card registry). */
  disclose?: {
    discover(lookup: string, q: string, tags: string): unknown
  }
}

/** Route one KV/runs lane to its seat; undefined = no seat / no match. */
async function trySeats(
  ctx: unknown,
  method: EstateMethod,
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<unknown | undefined> {
  // OPTIONAL-dependency probes: ctx.get returns undefined when no
  // provider is loaded (the tutorial's pattern) — a seatless lane
  // then falls to the LOUD no-remote throw below.
  const probe = ctx as { get(name: string): unknown }
  const seats: Seats = {
    get draftsRemote() { return probe.get('draftsRemote') as Seats['draftsRemote'] },
    get benchRemote() { return probe.get('benchRemote') as Seats['benchRemote'] },
    get runs() { return probe.get('runs') as Seats['runs'] },
    get disclose() { return probe.get('disclose') as Seats['disclose'] },
  }
  signal.throwIfAborted()

  if (method === 'GET' && path === '/v1/flows/drafts') {
    if (seats.draftsRemote === undefined) return undefined
    return seats.draftsRemote.list(signal)
  }
  let m = /^\/v1\/flows\/drafts\/([^/?]+)$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.draftsRemote === undefined) return undefined
    return seats.draftsRemote.get(decodeURIComponent(m[1]!), signal)
  }
  if (method === 'POST' && path === '/v1/bench/ensure') {
    if (seats.benchRemote === undefined) return undefined
    if (body === undefined || typeof body !== 'object' || body === null) {
      throw new Error('bench ensure needs a JSON body')
    }
    return seats.benchRemote.ensure(body as Record<string, unknown>, signal)
  }
  m = /^\/v1\/bench\/([^/?]+)$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.benchRemote === undefined) return undefined
    return seats.benchRemote.get(decodeURIComponent(m[1]!), signal)
  }
  // The bench's mutation arms (REBUILD-4): /v1/bench/:session/<verb>
  // routes to the matching seat method (the door's URL grammar is
  // the tools' lane grammar — the remote methods are 1:1 beneath).
  if (method === 'POST') {
    const arm = /^\/v1\/bench\/([^/?]+)\/(patch|add_stage|remove_stage|rewire|undo)$/.exec(path)
    if (arm !== null) {
      if (seats.benchRemote === undefined) return undefined
      if (body === undefined || typeof body !== 'object' || body === null) {
        throw new Error(`bench ${arm[2]!} needs a JSON body`)
      }
      const session = decodeURIComponent(arm[1]!)
      const doc = body as Record<string, unknown>
      switch (arm[2]) {
        case 'patch': return seats.benchRemote.patch(session, doc, signal)
        case 'add_stage': return seats.benchRemote.addStage(session, doc, signal)
        case 'remove_stage': return seats.benchRemote.removeStage(session, doc, signal)
        case 'rewire': return seats.benchRemote.rewire(session, doc, signal)
        case 'undo': return seats.benchRemote.undo(session, doc, signal)
      }
    }
  }
  // The validate lane (REBUILD-8): the pure compile over the runs
  // seat — the door's arm order lives in the registry.
  if (method === 'POST' && path === '/v1/flows/validate') {
    if (seats.runs === undefined) return undefined
    return seats.runs.validate(body, signal)
  }
  // The runs plane's lanes (REBUILD-6): the flowsRun door arms over
  // the registry seat — submit, live status (with the log tail on
  // ?include_log), stop receipt.
  if (method === 'POST' && path === '/v1/flows/start') {
    if (seats.runs === undefined) return undefined
    return seats.runs.start(body, signal)
  }
  m = /^\/v1\/flows\/status\/([^/?]+)(?:\?([^/]*))?$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.runs === undefined) return undefined
    const first = m[2] === undefined ? null : m[2].split('&')[0] ?? null
    const flagValue = first === null ? '' : first.split('=')[1] ?? ''
    const includeLog = ['1', 'true', 'yes'].includes(
      decodeURIComponent(flagValue).toLowerCase(),
    )
    return seats.runs.status(decodeURIComponent(m[1]!), signal, includeLog)
  }
  m = /^\/v1\/flows\/stop\/([^/?]+)$/.exec(path)
  if (method === 'POST' && m !== null) {
    if (seats.runs === undefined) return undefined
    return seats.runs.stop(decodeURIComponent(m[1]!), signal)
  }
  m = /^\/v1\/flows\/runs(?:\/|$|\?)/.exec(path)
  if (method === 'GET' && m !== null && path !== '/v1/flows/runs/') {
    if (seats.runs === undefined) return undefined
    // The RAW limit string rides (py int() semantics: underscores
    // parse, junk refuses LOUD — the door's text, never NaN).
    const lim = /(?:^|[?&])limit=([^&]*)/.exec(path)
    return seats.runs.list(
      lim !== null ? decodeURIComponent(lim[1]!) : '200',
      signal,
    )
  }
  // The disclose lane (REBUILD-14): Melite discover over both
  // planes — the seat derives rows LIVE (the flows registry + the
  // primed card registry). The query string rides the door's own
  // params (lookup / q / tags).
  m = /^\/v1\/discover(?:\?([^/]*))?$/.exec(path)
  if (method === 'GET' && m !== null) {
    if (seats.disclose === undefined) return undefined
    const qs = new URLSearchParams(m[1] ?? '')
    return seats.disclose.discover(
      qs.get('lookup') ?? 'all',
      qs.get('q') ?? '',
      qs.get('tags') ?? '',
    )
  }
  return undefined
}

/** Build the tools' request: seats only, in-process. A lane with no
 *  seat is a hard error (the gateway that used to absorb it is
 *  dead) — the caller migrates to a named remote. */
export function makeEstateRequest(ctx: unknown): EstateRequest {
  return async (method, path, body, execSignal): Promise<unknown> => {
    const viaSeats = await trySeats(ctx, method, path, body, execSignal)
    if (viaSeats !== undefined) return viaSeats
    throw new Error(
      `no remote serves ${method} ${path} (the gateway lane fallback died 2026-09-10 — migrate to a named Typert remote)`,
    )
  }
}
