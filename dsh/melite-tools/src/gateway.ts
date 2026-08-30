/**
 * Thin HTTP seam to the Melite gateway (server-js, default :33081).
 *
 * The gateway STAYS AS-IS — this module is a pure client over the wire
 * contract in melite/docs/PROTOCOL.md. Error law: a non-2xx response surfaces
 * the gateway's body VERBATIM (`RayGatewayError` message = status + url +
 * raw body), because a thrown tool error is materialized by the DSH registry
 * as the model-facing error text. Network failures name the URL and the
 * underlying cause instead of being swallowed.
 */

/** Gateway answered with a non-2xx status; body carried verbatim. */
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

/** Default Melite gateway base URL (the Bun gateway's loopback listen). */
export const DEFAULT_GATEWAY_URL = 'http://localhost:33081'

/** Strip one trailing slash so path joins stay single-slash. */
export function normalizeGatewayUrl(gatewayUrl: string): string {
  return gatewayUrl.replace(/\/+$/, '')
}

/**
 * Fetch JSON from the gateway. The caller's `exec.signal` and a per-call
 * timeout are fused (either abort cancels the request); a non-2xx response
 * throws `RayGatewayError` carrying the response body verbatim.
 */
export async function gatewayRequest(
  gatewayUrl: string,
  method: 'GET' | 'POST',
  path: string,
  body: unknown,
  execSignal: AbortSignal,
  timeoutMs: number,
): Promise<unknown> {
  const url = `${normalizeGatewayUrl(gatewayUrl)}${path}`
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = fuseSignals(execSignal, timeout)
  let resp: Response
  try {
    resp = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (execSignal.aborted) throw e
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`melite gateway unreachable at ${url}: ${msg}`)
  }
  const raw = await resp.text()
  if (!resp.ok) throw new RayGatewayError(resp.status, url, raw)
  try {
    return JSON.parse(raw) as unknown
  } catch {
    throw new Error(`melite gateway returned non-JSON at ${url}: ${raw.slice(0, 300)}`)
  }
}

/** Fuse N signals without requiring AbortSignal.any (Node <20 fallback). */
function fuseSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
  }
  const onAbort = (event: Event) => {
    const target = event.target as AbortSignal
    controller.abort(target.reason)
    cleanup()
  }
  const cleanup = () => {
    for (const signal of signals) signal.removeEventListener('abort', onAbort)
  }
  for (const signal of signals) signal.addEventListener('abort', onAbort, { once: true })
  return controller.signal
}
