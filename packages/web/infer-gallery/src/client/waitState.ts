/**
 * waitState — the estate's boot-race WAIT voices, in one place.
 *
 * A lane's estate seats mount behind its boot URL: during that
 * window the doors answer 503 `estate/pending` (doors.ts
 * ESTATE_PENDING_GRACE_MS, 120s) and the gallery's own rows answer
 * 502 `no_estate_seat` for the same in-flight composition (observed
 * live 2026-10-18: a seat probe misses while composition runs —
 * absence, never a broken registry). Both are wait states: the
 * client retries within the doors' own grace window instead of
 * rendering a terminal error that heals itself seconds later.
 *
 * Every other !ok response — a generic 503, a 502 with a different
 * code, a 4xx — is terminal at this seam and returns to the caller
 * unchanged.
 */

/** The doors' own pending grace (doors.ts ESTATE_PENDING_GRACE_MS):
 * the window within which a wait voice is a boot race, not a
 * misconfiguration. Past it the same voice surfaces as the honest
 * error it then is. */
export const ESTATE_WAIT_GRACE_MS = 120_000

/** The retry cadence inside the grace window. */
export const ESTATE_WAIT_RETRY_MS = 1_000

/** Does this response body carry a boot-race wait voice?
 *  @param status the HTTP status (503 or 502 carry the voices).
 *  @param body the parsed JSON body (unknown at this seam).
 *  @returns true when the response is the estate still activating. */
export function estateWaitVoiceOf(status: number, body: unknown): boolean {
  if (status === 503) {
    const rec = body as { code?: unknown; pending?: unknown } | null
    return typeof rec === 'object' && rec !== null
      && (rec['code'] === 'estate/pending' || rec['pending'] === true)
  }
  if (status === 502) {
    const rec = body as { error?: unknown } | null
    return typeof rec === 'object' && rec !== null && rec['error'] === 'no_estate_seat'
  }
  return false
}

/** Rebuild a consumed response so callers can re-read the body. */
function rebuild(status: number, bodyText: string, headers: Headers): Response {
  return new Response(bodyText, { status, headers })
}

/** Fetch a same-origin estate door, retrying the boot-race wait
 *  voices (503 estate/pending, 502 no_estate_seat) until the doors'
 *  grace window closes. The FIRST non-wait response — success or
 *  failure alike — returns to the caller as-is.
 *
 *  POST retries are safe here: the estate doors never executed the
 *  request while its seat was absent, and the bench ensure rides a
 *  CAS (expect_rev), so a retry either lands once or refuses.
 *
 *  @param input the same-origin URL.
 *  @param init the request init, passed verbatim on every attempt.
 *  @param now the clock the grace window reads (injectable).
 *  @param sleep the delay between attempts (injectable).
 *  @returns the final Response, body re-readable. */
export async function fetchUntilSeated(
  input: string,
  init?: RequestInit,
  now: () => number = Date.now,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) }),
): Promise<Response> {
  const deadline = now() + ESTATE_WAIT_GRACE_MS
  for (;;) {
    const res = await fetch(input, init)
    if (res.status !== 502 && res.status !== 503) return res
    const bodyText = await res.text()
    let body: unknown = null
    try {
      body = JSON.parse(bodyText)
    } catch {
      body = null
    }
    if (!estateWaitVoiceOf(res.status, body)) return rebuild(res.status, bodyText, res.headers)
    if (now() >= deadline) return rebuild(res.status, bodyText, res.headers)
    await sleep(ESTATE_WAIT_RETRY_MS)
  }
}
