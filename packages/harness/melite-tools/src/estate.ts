/**
 * estate.ts — the tools' ONE transport: the ctx seats, in-process.
 *
 * NO HTTP, NO URL, NO PORT (the remotes migration, R2b). The KV/runs
 * lanes ride the wire package's Typert seats (draftsRemote/
 * benchRemote/runsRemote — plain method calls on ctx); every other
 * estate lane rides callEstateLane — the SAME door listeners the
 * webserver routes wrap, invoked directly (the doors' own dispatch,
 * never a fetch to self). When R5 retires the route rows the
 * listeners stay: they are the domain layer, and the remotes that
 * replace the rows call them too.
 */
import { callEstateLane } from '@melite/gateway-doors'

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

/** The wire package's Context-merged seats, stated structurally
 *  (the compiled wire types stay out of this source-run package). */
interface Seats {
  draftsRemote?: {
    list(signal?: AbortSignal): Promise<{ count: number; drafts: unknown[] }>
    get(draftId: string, signal?: AbortSignal): Promise<unknown>
  }
  benchRemote?: {
    get(session: string, signal?: AbortSignal): Promise<unknown>
    ensure(doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
  }
  runsRemote?: {
    list(limit: number, signal: AbortSignal): Promise<unknown>
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
  const seats = ctx as Seats
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
  if (method === 'GET' && path.startsWith('/v1/flows/runs')) {
    if (seats.runsRemote === undefined) return undefined
    const lim = /(?:^|[?&])limit=(\d+)/.exec(path)
    return seats.runsRemote.list(lim !== null ? Number(lim[1]) : 200, signal)
  }
  return undefined
}

/** Build the tools' request: seats first, then the door listeners —
 *  both in-process. There is no third path. */
export function makeEstateRequest(ctx: unknown): EstateRequest {
  return async (method, path, body, execSignal): Promise<unknown> => {
    const viaSeats = await trySeats(ctx, method, path, body, execSignal)
    if (viaSeats !== undefined) return viaSeats
    const out = await callEstateLane(ctx as never, method, path, body)
    if (out === undefined) {
      throw new Error(`no estate lane claims ${method} ${path}`)
    }
    if (out.status >= 200 && out.status < 300) return out.body
    throw new RayGatewayError(
      out.status,
      `estate lane ${method} ${path}`,
      (typeof out.body === 'string' ? out.body.slice(0, 300) : JSON.stringify(out.body)?.slice(0, 300) ?? ''),
    )
  }
}
