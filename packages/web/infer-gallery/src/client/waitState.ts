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
 * misconfiguration. Past it the 502 no_estate_seat voice surfaces
 * as the honest error it then is — a seat that never mounted. */
export const ESTATE_WAIT_GRACE_MS = 120_000

/** The retry cadence inside the grace window. */
export const ESTATE_WAIT_RETRY_MS = 1_000

/** PENDING IS A WAIT, NOT A DEADLINE (E2-3, operator burn
 * 2026-10-22: "the first load from history takes 5+ minutes"):
 * measured activation on the 1931-run estate is ~112s and longer
 * under load — colliding with the old grace cap terminaled the
 * history panel mid-boot and every reload entered a fresh
 * activation window. A 503 estate/pending body is the door still
 * SAYING it activates; the door outranks the clock: pending
 * retries past the grace at a backing-off cadence (doubling to
 * this ceiling). Only the 502 no_estate_seat voice is
 * grace-bounded (absence past the window is misconfiguration). */
export const ESTATE_WAIT_BACKOFF_CEILING_MS = 5_000

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
 *  THE ABORT LAW (audit V-E2, 2026-10-22): an aborted init.signal
 *  ends the wait IMMEDIATELY — the loop checks the signal each pass,
 *  the in-flight fetch rejects natively (init rides verbatim), and
 *  the retry nap races the signal instead of sleeping through it.
 *  Abort surfaces as the signal's own rejection, never a 120s hang
 *  the caller cannot cancel.
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
  const signal = init?.signal ?? null
  const deadline = now() + ESTATE_WAIT_GRACE_MS
  let cadence = ESTATE_WAIT_RETRY_MS
  for (;;) {
    if (signal?.aborted === true) throw abortOf(signal)
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
    // PENDING IS A WAIT, NOT A DEADLINE: a 503 pending body persists
    // past the grace at a backing-off cadence (the door's own voice
    // outranks the clock); only the 502 no_estate_seat absence is
    // grace-bounded — a seat that never mounted surfaces honestly.
    if (res.status === 502 && now() >= deadline) return rebuild(res.status, bodyText, res.headers)
    await nap(sleep, cadence, signal)
    cadence = Math.min(cadence * 2, ESTATE_WAIT_BACKOFF_CEILING_MS)
  }
}

/** The abort reason a cancelled wait throws: the signal's own
 *  reason when it carries one, else the standard AbortError. */
function abortOf(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('The wait was aborted', 'AbortError')
}

/** One retry nap that ends the moment the signal aborts — the bare
 *  sleep kept the wait alive a full cadence past every abort. */
async function nap(
  sleep: (ms: number) => Promise<void>,
  ms: number,
  signal: AbortSignal | null,
): Promise<void> {
  if (signal === null) {
    await sleep(ms)
    return
  }
  await Promise.race([
    sleep(ms),
    new Promise<never>((_, reject) => {
      if (signal.aborted) { reject(abortOf(signal)); return }
      signal.addEventListener('abort', () => { reject(abortOf(signal)) }, { once: true })
    }),
  ])
}
