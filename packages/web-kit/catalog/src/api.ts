// Central resilient fetch wrapper.
//
// ─── NO SILENT SWALLOWS POLICY ────────────────────────────────────────────
// Every fetch / apiFetch / apiJson call MUST surface failures. Either:
//   1. Let the throw propagate (apiJson throws on non-2xx) — caller MUST
//      have a `.catch` that toasts, sets an error state, or otherwise
//      shows the user what broke.
//   2. Catch with `(e) => console.error("[Component] what failed:", e)` so
//      the failure is at least visible in dev tools and error reporters.
//   3. For state-cleanup catches (where the UI needs to clear stale data
//      on failure), STILL log — e.g. `.catch((e) => { console.error(...);
//      setX([]) })`.
//
// The ONLY acceptable silent `.catch(() => {})` is for browser-policy
// rejections on HTMLMediaElement.play() / Fullscreen API — those reject
// for legitimate UX reasons (no prior user gesture), not backend
// failures. Every such catch MUST carry a comment saying so explicitly.
//
// Why: the form-spec 404 bug hid for days because `loadFormSpec` silently
// returned null. An empty form looks like "no features" — a logged error
// looks like "the endpoint is broken, fix it." Loud > silent. Always.
// ──────────────────────────────────────────────────────────────────────────
//
// Every backend call in the editor should go through `apiFetch` (or the
// `apiJson` convenience helper). This gives us, for free:
//
//   * retry with exponential backoff + jitter on 5xx and network errors
//     (so a Melite Serve redeploy or a 2-second blip is invisible to the UI)
//   * in-flight GET deduplication (kills the React.StrictMode double-fire
//     duplicate request in dev, and collapses concurrent mount storms)
//   * a global backend liveness signal with three states
//     (online | degraded | offline) broadcast via `onBackendState`, so a
//     single <BackendStatus/> badge can surface outages instead of every
//     component independently logging red errors
//
// The signature matches `fetch()` exactly, so `fetch(...)` → `apiFetch(...)`
// is a drop-in replacement at every call site. 4xx responses are returned
// as-is (never retried) — only transient failures (5xx + network) retry.
//
// ─── THE DOOR GATE (2026-09-05, the loras incident) ──────────────────────
// apiFetch/apiJson accept ONLY FetchUrl = EstateDoorUrl | ExternalUrl.
// EstateDoorUrl is the HAND-MAINTAINED browser door table
// (./generated/gatewayDoors.ts — the generator died with the gateway,
// so the table is curated by hand against the served lanes): a frontend
// fetch of a door the estate does not serve is a COMPILE ERROR, not a
// runtime 404 rendering "nothing found" over live data (LoraPicker
// fetched /v1/loras over 12 declared krea-2 rows for exactly that
// reason). Non-door URLs go through externalUrl(...) — a named,
// greppable escape. There is no `string` overload: an unlisted door must not
// compile. ─────────────────────────────────────────────────────────────────

import type { EstateDoorUrl } from "./generated/gatewayDoors"
import { readAsDataURL } from "@melite/formats/readFile"

/** A URL outside the door table (another service or a same-host row
 * door like /melite-tools/*). Constructible ONLY via externalUrl()
 * — never spell one inline at a fetch call site. */
declare const externalBrand: unique symbol
export type ExternalUrl = string & { readonly [externalBrand]: true }

/** The named escape for non-table URLs. Every use is deliberate and
 * greppable. */
export function externalUrl(
  u: `/${string}` | `http${string}` | `data:${string}`,
): ExternalUrl {
  return u as ExternalUrl
}

/** Everything apiFetch/apiJson may fetch. */
export type FetchUrl = EstateDoorUrl | ExternalUrl

const MAX_RETRIES = 4            // 5 attempts total (initial + 4 retries)
const BASE_MS = 400              // first backoff
const CAP_MS = 4_000             // backoff ceiling between attempts
const OFFLINE_THRESHOLD = 3      // consecutive failures before "offline"
const TOTAL_BUDGET_MS = 15_000   // hard ceiling across all retries

// Methods that are safe to retry on any 5xx (idempotent — re-running
// them has the same effect as running once). Non-safe methods (POST,
// PUT, PATCH, DELETE) are retried only on network errors and gateway
// codes (502/503/504) — those specifically indicate the request never
// reached the origin server, so re-issuing can't cause a duplicate
// side effect. 500 on a POST might mean the server started processing
// and then failed, so we don't retry.
const SAFE_METHODS = new Set(['GET', 'HEAD'])
const GATEWAY_CODES = new Set([502, 503, 504])

function shouldRetryStatus(status: number, method: string): boolean {
  return GATEWAY_CODES.has(status) || (SAFE_METHODS.has(method) && status >= 500 && status < 600)
}

export type BackendState = 'online' | 'degraded' | 'offline'

let state: BackendState = 'online'
let consecutiveFail = 0

const listeners = new Set<(s: BackendState) => void>()

export function getBackendState(): BackendState { return state }

/** Subscribe to backend liveness changes. Returns an unsubscribe fn. */
export function onBackendState(cb: (s: BackendState) => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

function setState(next: BackendState) {
  if (next === state) return
  state = next
  for (const cb of listeners) {
    try { cb(next) } catch { /* listener faults must not break the chain */ }
  }
}

/** True if `input` targets our own backend (same-origin or root-relative). */
function isBackendUrl(input: string): boolean {
  if (input.startsWith('/')) return true
  try {
    const u = new URL(input, window.location.origin)
    return u.origin === window.location.origin
  } catch {
    // `new URL()` throws on syntactically invalid input — that means "not a
    // URL at all", which by definition isn't our backend. This is a syntax
    // check, NOT a fetch swallow; the no-swallow policy doesn't apply.
    return false
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

// Backoff with full jitter — avoids thundering herd when many components
// retry at once (e.g. on gateway reconnect after a redeploy).
function backoffMs(attempt: number): number {
  const exp = Math.min(CAP_MS, BASE_MS * 2 ** attempt)
  return Math.round(exp * (0.5 + Math.random() * 0.5))
}

// In-flight GET dedup. Keyed by URL only — headers/body are ignored on
// the dedup key, which is fine because GETs should be idempotent.
const inflight = new Map<string, Promise<Response>>()

/**
 * Drop-in replacement for `fetch()` with retry, backoff, GET dedup, and a
 * global liveness signal. Throws only on persistent network failure (after
 * MAX_RETRIES) or caller AbortError. Returns the Response for any HTTP
 * status (including 4xx/5xx) so existing `if (!res.ok)` checks keep working.
 */
export async function apiFetch(input: FetchUrl, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const backend = isBackendUrl(input)
  const dedupKey = method === 'GET' && backend ? input : null

  if (dedupKey && inflight.has(dedupKey)) {
    // Reuse the in-flight GET. A real Response body can only be consumed
    // once, so we clone it for each caller. Test mocks that don't implement
    // clone() fall through to identity — their json()/text() already return
    // fresh Promises, so sharing is safe.
    return inflight.get(dedupKey)!.then((r) => {
      if (r && typeof (r as Response).clone === 'function') return (r as Response).clone()
      return r
    })
  }

  const run = async (): Promise<Response> => {
    const deadline = Date.now() + TOTAL_BUDGET_MS
    let lastErr: unknown = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Caller abort always wins — never swallow it.
      if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      try {
        // Bridge the caller's AbortSignal into the underlying fetch so a
        // cancel propagates immediately rather than after the current attempt.
        const ctrl = new AbortController()
        const callerSignal = init.signal as AbortSignal | undefined
        callerSignal?.addEventListener('abort', () => ctrl.abort(), { once: true })

        const res = await fetch(input, { ...init, signal: ctrl.signal })

        // 5xx is sometimes transient — retry with backoff. 4xx is a real
        // response; return it so the caller can branch on res.status.
        // See shouldRetryStatus for the policy (safe-method vs gateway-code).
        if (shouldRetryStatus(res.status, method) && attempt < MAX_RETRIES && Date.now() < deadline) {
          if (backend) setState('degraded')
          await sleep(backoffMs(attempt), callerSignal)
          continue
        }

        if (backend) {
          consecutiveFail = 0
          setState('online')
        }
        return res
      } catch (err) {
        // AbortError: surface to caller, do not retry.
        if (err instanceof DOMException && err.name === 'AbortError') throw err
        lastErr = err

        if (backend) {
          consecutiveFail++
          setState(consecutiveFail >= OFFLINE_THRESHOLD ? 'offline' : 'degraded')
        }

        if (attempt < MAX_RETRIES && Date.now() < deadline) {
          await sleep(backoffMs(attempt))
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('network request failed')
  }

  const p = run()
  if (dedupKey) {
    inflight.set(dedupKey, p)
    // Always clean up so a subsequent request can fire after this one settles.
    // We attach BOTH handlers (success + failure) via .then so the cleanup
    // promise always resolves — using .finally here would propagate p's
    // rejection into an uncaught promise (Node logs "Unhandled rejection"
    // whenever a retry-exhausted backend GET eventually rejects).
    p.then(
      () => { inflight.delete(dedupKey!) },
      () => { inflight.delete(dedupKey!) },
    )
  }
  return p
}

/**
 * Convenience for JSON endpoints. Throws an Error on non-2xx (message
 * includes status + body excerpt) so callers can use try/catch directly.
 */
export async function apiJson<T = unknown>(input: FetchUrl, init?: RequestInit): Promise<T> {
  const res = await apiFetch(input, init)
  if (!res.ok) {
    // Read the body for error context, but do NOT swallow read failures.
    // If the body can't be read (connection drop, malformed stream), surface
    // that as part of the error — preserving the status code so the caller
    // still knows what HTTP response triggered this.
    let body = ""
    try {
      body = await res.text()
    } catch (readErr) {
      throw new Error(
        `${input}: ${res.status} ${res.statusText} ` +
        `(body read failed: ${readErr instanceof Error ? readErr.message : String(readErr)})`
      )
    }
    throw new Error(`${input}: ${res.status} ${res.statusText} ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

/** Fetch a same-origin artifact URL and re-encode it as a data URL
 *  (survived the unicananvas client purge 2026-08-21 — the ONE live
 *  export of that dead module; generic wire utility, so it lives with
 *  the transport). */
export async function urlToDataUrl(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(
      `Canvas artifact fetch failed: HTTP ${res.status} for ${url.slice(0, 200)}`,
    )
  }
  const blob = await res.blob()
  // Shared readAsDataURL (@melite/ui SlotSquare — the ONE read path) —
  // the URL context is re-attached here so a read failure still names
  // the artifact that failed.
  try {
    return await readAsDataURL(blob)
  } catch {
    throw new Error(`Failed to read ${url.slice(0, 200)} as data URL`)
  }
}
