/**
 * waitState — the estate's boot-race WAIT voices, classified and
 * retried by their own contract (the 3088 incident's client cure,
 * 2026-10-18):
 *
 *   voices  — 503 estate/pending and 502 no_estate_seat are waits;
 *             a generic 503, a coded 502, and every other status
 *             are terminal at this seam;
 *   retry   — fetchUntilSeated returns the first non-wait response
 *             unchanged (success or failure alike), retries the
 *             wait voices on the retry cadence, and hands back the
 *             LAST 502 no_estate_seat voice once the doors' grace
 *             window closes (absence past the window is the honest
 *             error; the body re-readable for the caller's own
 *             error extraction). A 503 estate/pending body RETRIES
 *             PAST the grace at a backing-off cadence — pending is
 *             a wait, not a deadline (E2-3, 2026-10-22);
 *   posts   — the request init rides verbatim on every attempt
 *             (the CAS ensure is safe to re-send: the door never
 *             executed it while its seat was absent).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ESTATE_WAIT_GRACE_MS,
  ESTATE_WAIT_RETRY_MS,
  estateWaitVoiceOf,
  fetchUntilSeated,
} from '../src/client/waitState.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

const PENDING = { error: 'estate composition is still activating', code: 'estate/pending', pending: true }
const NO_SEAT = { error: 'no_estate_seat', message: 'infer-gallery: no estate seat for /v1/flows/runs', lane: '/v1/flows/runs' }

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('waitState — the wait voices', () => {
  it('503 estate/pending and 502 no_estate_seat are the wait voices', () => {
    expect(estateWaitVoiceOf(503, PENDING)).toBe(true)
    expect(estateWaitVoiceOf(503, { pending: true })).toBe(true)
    expect(estateWaitVoiceOf(502, NO_SEAT)).toBe(true)
  })

  it('everything else is terminal at this seam', () => {
    expect(estateWaitVoiceOf(503, { error: 'upstream died' })).toBe(false)
    expect(estateWaitVoiceOf(503, null)).toBe(false)
    expect(estateWaitVoiceOf(503, 'Service Unavailable')).toBe(false)
    expect(estateWaitVoiceOf(502, { error: 'door down' })).toBe(false)
    expect(estateWaitVoiceOf(502, 42)).toBe(false)
    expect(estateWaitVoiceOf(500, { error: 'x' })).toBe(false)
    expect(estateWaitVoiceOf(404, { error: 'no such run' })).toBe(false)
    expect(estateWaitVoiceOf(200, PENDING)).toBe(false)
  })
})

describe('waitState — fetchUntilSeated', () => {
  it('returns the first non-wait response unchanged (success or failure alike)', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: unknown): Promise<Response> => {
      calls.push(String(input))
      return json({ runs: [{ run_id: 'r1' }] }, 200)
    }))
    const res = await fetchUntilSeated('/infer-gallery/runs')
    expect(res.status).toBe(200)
    expect(calls).toEqual(['/infer-gallery/runs'])

    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => json({ error: 'door down' }, 502)))
    const failing = await fetchUntilSeated('/u')
    expect(failing.status).toBe(502)
    expect(await failing.json()).toEqual({ error: 'door down' })
  })

  it('retries the wait voices on the cadence until the door serves', async () => {
    let n = 0
    const sleeps: number[] = []
    let clock = 10_000
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
      ++n
      return n === 1 ? json(NO_SEAT, 502) : n === 2 ? json(PENDING, 503) : json({ runs: [] }, 200)
    }))
    const res = await fetchUntilSeated('/u', undefined,
      () => clock,
      (ms) => { sleeps.push(ms); clock += ms; return Promise.resolve() })
    expect(res.status).toBe(200)
    // the cadence backs off after each nap (E2-3): 1s then 2s
    expect(sleeps).toEqual([ESTATE_WAIT_RETRY_MS, ESTATE_WAIT_RETRY_MS * 2])
    expect(n).toBe(3)
  })

  it('a non-JSON wait-status body is terminal (nothing parses to a voice)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> =>
      new Response('Service Unavailable', { status: 503 })))
    const res = await fetchUntilSeated('/u', undefined, () => 0, () => Promise.resolve())
    expect(res.status).toBe(503)
    expect(await res.text()).toBe('Service Unavailable')
  })

  it('hands back the LAST no_estate_seat voice once the grace window closes (absence past the window is the honest error — body re-readable)', async () => {
    let n = 0
    let clock = 0
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
      ++n
      return json(NO_SEAT, 502)
    }))
    const res = await fetchUntilSeated('/u', undefined,
      () => clock,
      (ms) => { clock += ms; return Promise.resolve() })
    expect(res.status).toBe(502)
    const body = await res.json() as { error?: string }
    expect(body['error']).toBe('no_estate_seat')
    // the cadence bounded the attempts: ~grace/retry, never a tight loop
    expect(n).toBeLessThanOrEqual(Math.ceil(ESTATE_WAIT_GRACE_MS / ESTATE_WAIT_RETRY_MS) + 1)
  })

  // PENDING IS A WAIT, NOT A DEADLINE (E2-3, operator burn
  // 2026-10-22: "the first load from history takes 5+ minutes"):
  // the door saying estate/pending outranks the clock — a 503
  // pending body retries PAST the grace at a backing-off cadence
  // until the voice changes. The measured activation (~112s on the
  // 1931-run estate) collided with the old cap and terminaled the
  // history panel mid-boot; every reload re-entered the window.
  it('a 503 pending voice RETRIES PAST the grace window until the door changes its word', async () => {
    let n = 0
    let clock = 0
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
      ++n
      // the seat lands on the 130th attempt — past the 120s grace
      return n < 130 ? json(PENDING, 503) : json({ runs: [] }, 200)
    }))
    const res = await fetchUntilSeated('/u', undefined,
      () => clock,
      (ms) => { clock += ms; return Promise.resolve() })
    expect(res.status).toBe(200)
    // the clock passed the grace window on its way to the seat
    expect(clock).toBeGreaterThan(ESTATE_WAIT_GRACE_MS)
    expect(n).toBe(130)
  })

  it('a pre-aborted signal throws at once — fetch never fires (audit V-E2)', async () => {
    const fetches = vi.fn(async (): Promise<Response> => json(PENDING, 503))
    vi.stubGlobal('fetch', fetches)
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(fetchUntilSeated('/u', { signal: ctrl.signal }, () => 0, () => Promise.resolve()))
      .rejects.toMatchObject({ name: 'AbortError' })
    expect(fetches).not.toHaveBeenCalled()
  })

  it('an abort during the retry nap ends the wait immediately (audit V-E2)', async () => {
    let n = 0
    let napResolved = false
    const ctrl = new AbortController()
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
      ++n
      return json(PENDING, 503)
    }))
    const wait = fetchUntilSeated('/u', { signal: ctrl.signal }, () => 0, () =>
      new Promise<void>((resolve) => {
        // the injected nap outlives the abort: the race must not
        // wait for it
        setTimeout(() => { napResolved = true; resolve() }, 50)
      }))
    await Promise.resolve()
    ctrl.abort()
    await expect(wait).rejects.toMatchObject({ name: 'AbortError' })
    expect(n).toBe(1)
    expect(napResolved).toBe(false)
  })

  it('a live signal never aborts: the wait rides to its answer as before', async () => {
    let n = 0
    vi.stubGlobal('fetch', vi.fn(async (): Promise<Response> => {
      ++n
      return n === 1 ? json(PENDING, 503) : json({ runs: [] }, 200)
    }))
    const ctrl = new AbortController()
    const res = await fetchUntilSeated('/u', { signal: ctrl.signal }, () => 0, () => Promise.resolve())
    expect(res.status).toBe(200)
    expect(n).toBe(2)
  })

  it('passes the init verbatim on every attempt (the CAS POST is safe to re-send)', async () => {
    let n = 0
    const inits: Array<RequestInit | undefined> = []
    vi.stubGlobal('fetch', vi.fn(async (_input: unknown, init?: RequestInit): Promise<Response> => {
      inits.push(init)
      return ++n === 1 ? json(NO_SEAT, 502) : json({ ok: true }, 200)
    }))
    const init: RequestInit = { method: 'POST', body: '{"expect_rev":3}' }
    const res = await fetchUntilSeated('/v1/bench/ensure', init,
      () => 0,
      () => Promise.resolve())
    expect(res.status).toBe(200)
    expect(inits).toEqual([init, init])
  })
})
