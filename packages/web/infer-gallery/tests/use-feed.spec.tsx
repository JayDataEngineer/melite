// @vitest-environment jsdom
/**
 * useFeed — the ONE fetch/load/never-stale engine for sidebar feeds:
 *
 *   load    — decodes at the door; an !ok door answers its error, a
 *             messageless door answers 'HTTP n', transport failures
 *             land in error (never a throw past React);
 *   stale   — visibility/focus refetch, throttled (a new chat session
 *             does NOT reload the SPA — without this the panel sits on
 *             hour-old data);
 *   handle  — reload refetches, setData writes through.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

import { useFeed } from '../src/client/useFeed.ts'

interface Row {
  runs: unknown[]
}

const EMPTY: Row = { runs: [] }
const decode = (json: unknown): Row => ({ runs: (json as { runs?: unknown[] }).runs ?? [] })
// Module-level (a stable reference — an inline decode would mint a new
// load callback every render and refetch forever).
const throwingDecode = (): Row => {
  throw new Error('bad shape')
}

function stubFetch(handler: (url: string) => Promise<Response>): { calls: string[] } {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: unknown): Promise<Response> => {
    calls.push(String(input))
    return handler(String(input))
  }))
  return { calls }
}

const ok = (body: unknown): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function visibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state })
}

describe('useFeed — the load engine', () => {
  it('loads and decodes at the door (loading clears, error stays empty)', async () => {
    stubFetch(() => ok({ runs: [{ run_id: 'r1' }] }))
    const { result } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    expect(result.current.loading).toBe(true)
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.data).toEqual({ runs: [{ run_id: 'r1' }] })
    expect(result.current.error).toBe('')
  })

  it('an !ok door answers its error; a messageless door answers HTTP n', async () => {
    stubFetch(() => Promise.resolve(new Response(JSON.stringify({ error: 'door down' }), { status: 502 })))
    const failing = renderHook(() => useFeed('/u', decode, EMPTY))
    await waitFor(() => {
      expect(failing.result.current.loading).toBe(false)
    })
    expect(failing.result.current.error).toBe('door down')
    failing.unmount()

    stubFetch(() => Promise.resolve(new Response(JSON.stringify({}), { status: 500 })))
    const empty = renderHook(() => useFeed('/u', decode, EMPTY))
    await waitFor(() => {
      expect(empty.result.current.loading).toBe(false)
    })
    expect(empty.result.current.error).toBe('HTTP 500')
    empty.unmount()

    stubFetch(() => Promise.resolve(new Response(JSON.stringify({ error: '' }), { status: 500 })))
    const blank = renderHook(() => useFeed('/u', decode, EMPTY))
    await waitFor(() => {
      expect(blank.result.current.loading).toBe(false)
    })
    expect(blank.result.current.error).toBe('HTTP 500')
    blank.unmount()
  })

  it('transport failures land in error (Errors and bare throws alike)', async () => {
    stubFetch(() => Promise.reject(new Error('socket reset')))
    const failing = renderHook(() => useFeed('/u', decode, EMPTY))
    await waitFor(() => {
      expect(failing.result.current.loading).toBe(false)
    })
    expect(failing.result.current.error).toBe('socket reset')
    failing.unmount()

    stubFetch(() => Promise.reject('bare string failure'))
    const bare = renderHook(() => useFeed('/u', decode, EMPTY))
    await waitFor(() => {
      expect(bare.result.current.loading).toBe(false)
    })
    expect(bare.result.current.error).toBe('bare string failure')
    bare.unmount()
  })

  it('a throwing decode lands in error (validation lives at the door)', async () => {
    stubFetch(() => ok({ runs: [] }))
    const { result, unmount } = renderHook(() => useFeed('/u', throwingDecode, EMPTY))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.error).toBe('bad shape')
    unmount()
  })

  it('reload refetches and setData writes through', async () => {
    const { calls } = stubFetch(() => ok({ runs: [] }))
    const { result, unmount } = renderHook(() => useFeed('/u', decode, EMPTY))
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(calls).toHaveLength(1)
    act(() => {
      result.current.reload()
    })
    await waitFor(() => {
      expect(calls).toHaveLength(2)
    })
    act(() => {
      result.current.setData({ runs: [{ run_id: 'r9' }] })
    })
    expect(result.current.data).toEqual({ runs: [{ run_id: 'r9' }] })
    unmount()
  })

  // G2 (feed-plane coverage audit, 2026-11-02): reload CLEARS a landed
  // error — the banner never outlives its cause once a retry seats.
  // The load() door wipes error before the fetch (useFeed :149); this
  // arm proves the whole face: terminal error → reload → fresh seat
  // → error empty AND data fresh, together.
  it('reload clears a landed error when the retry seats (the banner never outlives its cause)', async () => {
    let n = 0
    stubFetch(() => {
      ++n
      return n === 1
        ? Promise.resolve(new Response(JSON.stringify({ error: 'estate_unreachable' }), { status: 502 }))
        : ok({ runs: [{ run_id: 'r2' }] })
    })
    const { result, unmount } = renderHook(() => useFeed('/u', decode, EMPTY))
    await waitFor(() => { expect(result.current.loading).toBe(false) })
    expect(result.current.error).toBe('estate_unreachable')
    act(() => { result.current.reload() })
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('')
    })
    expect(result.current.data).toEqual({ runs: [{ run_id: 'r2' }] })
    expect(n).toBe(2)
    unmount()
  })
})

describe('useFeed — the estate boot race (wait voices, never terminal)', () => {
  // The 3088 incident's client half (2026-10-18): a lane's seats
  // mount behind its boot URL — the doors answer 503
  // estate/pending and the gallery rows 502 no_estate_seat while
  // composition runs. The feed must WAIT (loading stays true, error
  // stays empty) within the doors' grace window, and surface the
  // voice honestly only once the window closes.
  const pending = (): Promise<Response> =>
    Promise.resolve(new Response(JSON.stringify({
      error: 'estate composition is still activating',
      code: 'estate/pending',
      pending: true,
    }), { status: 503 }))
  const noSeat = (): Promise<Response> =>
    Promise.resolve(new Response(JSON.stringify({
      error: 'no_estate_seat',
      message: 'infer-gallery: no estate seat for /v1/flows/runs',
    }), { status: 502 }))

  it('a boot-race 502 no_estate_seat retries to the serving door (error stays empty)', async () => {
    vi.useFakeTimers()
    try {
      let n = 0
      stubFetch(() => { ++n; return n === 1 ? noSeat() : ok({ runs: [{ run_id: 'r1' }] }) })
      const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
      expect(result.current.loading).toBe(true)
      await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('')
      expect(result.current.data).toEqual({ runs: [{ run_id: 'r1' }] })
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  // PENDING IS A WAIT, NOT A DEADLINE (E2-3, 2026-10-22): the door
  // saying estate/pending outranks the clock — past the grace the
  // feed KEEPS WAITING (loading stays true, error stays empty) at a
  // backing-off cadence until the door changes its word. The old
  // arm terminaled at 120s while the measured activation was ~112s
  // — the operator's 5-minute first-load burn was reloads entering
  // fresh activation windows. Only no_estate_seat absence surfaces
  // as the honest error past the window.
  it('a pending voice that outlives the grace window KEEPS WAITING (loading honest, never terminal)', async () => {
    vi.useFakeTimers()
    try {
      let n = 0
      stubFetch(() => { ++n; return pending() })
      const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
      await act(async () => { await vi.advanceTimersByTimeAsync(120_000) })
      const atGrace = n
      expect(result.current.loading).toBe(true)
      expect(result.current.error).toBe('')
      // attempts CONTINUED past the grace window (the backoff
      // ceiling is 5s: +30s of past-window naps must grow the count)
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
      expect(result.current.loading).toBe(true)
      expect(n).toBeGreaterThan(atGrace)
      expect(n).toBeGreaterThanOrEqual(atGrace + 5)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })

  it('a no_estate_seat voice that outlives the grace window surfaces honestly (absence is misconfiguration)', async () => {
    vi.useFakeTimers()
    try {
      let n = 0
      stubFetch(() => { ++n; return noSeat() })
      const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
      await act(async () => { await vi.advanceTimersByTimeAsync(120_000 + 2_000) })
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe('no_estate_seat')
      // the cadence bounded the attempts: ~grace/retry, never a tight loop
      expect(n).toBeLessThanOrEqual(123)
      unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('useFeed — the never-stale refetch', () => {
  it('refetches when the page becomes visible (past the throttle)', async () => {
    const { calls } = stubFetch(() => ok({ runs: [] }))
    let now = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    try {
      const { unmount } = renderHook(() => useFeed('/u', decode, EMPTY))
      await waitFor(() => {
        expect(calls).toHaveLength(1)
      })
      // inside the throttle window a visibility flip stays quiet.
      visibility('visible')
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      expect(calls).toHaveLength(1)
      // past the window the same flip refetches.
      now += 16_000
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await waitFor(() => {
        expect(calls).toHaveLength(2)
      })
      // a hidden page never refetches.
      now += 16_000
      visibility('hidden')
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      expect(calls).toHaveLength(2)
      // focus refetches past the window too.
      now += 16_000
      act(() => {
        window.dispatchEvent(new Event('focus'))
      })
      await waitFor(() => {
        expect(calls).toHaveLength(3)
      })
      unmount()
    } finally {
      visibility('visible')
    }
  })

  it('unmount drops the listeners (no refetch after unload)', async () => {
    const { calls } = stubFetch(() => ok({ runs: [] }))
    let now = 2_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    try {
      const { unmount } = renderHook(() => useFeed('/u', decode, EMPTY))
      await waitFor(() => {
        expect(calls).toHaveLength(1)
      })
      unmount()
      now += 60_000
      visibility('visible')
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
      expect(calls).toHaveLength(1)
    } finally {
      visibility('visible')
    }
  })
})

// ── THE BOOT-STAGED FEED (E2-3 arm 2, operator 2026-10-22: "the first
// load from history takes 5+ minutes" — the boot-race wait) ──
// The last served feed persists client-side (localStorage, keyed by
// the bare feed url — estates never cross-paint through the STORE's
// own origin partitioning, not through a key term) and paints
// INSTANTLY on boot with a stale face while the fresh feed
// seats. First load after a lane restart = instant stale-then-fresh,
// never minutes of spinner.
describe('useFeed — the boot-staged cache (E2-3 arm 2)', () => {
  const KEY = 'melite:feed:/infer-gallery/runs'

  afterEach(() => {
    localStorage.clear()
  })

  it('a served feed persists; the next boot paints it instantly, stale, until fresh seats', async () => {
    localStorage.removeItem(KEY)
    // first mount: no cache, loads fresh and WRITES the cache
    stubFetch(() => ok({ runs: [{ run_id: 'r1' }] }))
    const first = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    await waitFor(() => { expect(first.result.current.loading).toBe(false) })
    expect(first.result.current.stale).toBe(false)
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({ v: 1, feed: { runs: [{ run_id: 'r1' }] } })
    first.unmount()

    // second boot: the fetch hangs (the boot race) — the cached feed
    // is ALREADY painted, marked stale
    vi.unstubAllGlobals()
    let release: (() => void) | null = null
    const gate = new Promise<void>((res) => { release = res })
    vi.stubGlobal('fetch', vi.fn(async () => { await gate; return ok({ runs: [{ run_id: 'r2' }] }) }))
    const second = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    expect(second.result.current.data).toEqual({ runs: [{ run_id: 'r1' }] })
    expect(second.result.current.stale).toBe(true)
    expect(second.result.current.loading).toBe(true)
    // the fresh feed seats: replaces the cache, clears stale
    release!()
    await waitFor(() => { expect(second.result.current.loading).toBe(false) })
    expect(second.result.current.data).toEqual({ runs: [{ run_id: 'r2' }] })
    expect(second.result.current.stale).toBe(false)
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({ v: 1, feed: { runs: [{ run_id: 'r2' }] } })
    second.unmount()
  })

  it('a corrupt cache falls back to the initial feed fresh (never a crashed boot)', async () => {
    localStorage.setItem(KEY, '{not json')
    stubFetch(() => ok({ runs: [] }))
    const { result } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    expect(result.current.stale).toBe(false)
    await waitFor(() => { expect(result.current.loading).toBe(false) })
    expect(result.current.data).toEqual(EMPTY)
  })

  // ── AUDIT F6 CLOSE (2026-11-12): the version stamp + the judged
  // discard. An older-era cache (bare feed, no envelope) hydrated
  // UNDER-REPORTED faces until fresh seated; a poisoned entry was
  // left in the store to re-poison every later boot. Four arms.
  // EVICTION IS OBSERVED AT BOOT, with the fetch HANGING: a fresh
  // load that seats overwrites the store, so asserting after the
  // settle would pass with eviction toggled out (the first toggle
  // red proved exactly that — the weaker-law lesson).
  const hangFetch = (): void => {
    vi.stubGlobal('fetch', vi.fn(async () => { await new Promise<void>(() => {}); return ok({ runs: [] }) }))
  }

  it('an OLD-ERA bare cache refuses AND evicts (never hydrates under-reported faces)', async () => {
    localStorage.setItem(KEY, JSON.stringify({ runs: [{ run_id: 'old-era' }] }))
    hangFetch()
    const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    expect(result.current.stale, 'no staged face from an unstamped cache').toBe(false)
    expect(result.current.data).toEqual(EMPTY)
    expect(localStorage.getItem(KEY), 'the old-era entry is EVICTED at boot, before any fresh write could mask it').toBeNull()
    unmount()
  })

  it('a FOREIGN-VERSION cache refuses and evicts too', async () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 99, feed: { runs: [{ run_id: 'future' }] } }))
    hangFetch()
    const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    expect(result.current.stale).toBe(false)
    expect(result.current.data).toEqual(EMPTY)
    expect(localStorage.getItem(KEY), 'the foreign-version entry is EVICTED at boot').toBeNull()
    unmount()
  })

  // G3 (feed-plane coverage audit, 2026-11-02): the stamp law's SECOND
  // conjunct fires alone — a CURRENT-version envelope with NO feed
  // member is not a cache either (v:1 passes, !('feed' in env) evicts).
  // The old-era arm drove conjunct one; this arm owns conjunct two.
  it('a current-version envelope with NO feed member evicts (the second conjunct fires alone)', async () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1 }))
    hangFetch()
    const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    expect(result.current.stale, 'no staged face from a feedless envelope').toBe(false)
    expect(result.current.data).toEqual(EMPTY)
    expect(localStorage.getItem(KEY), 'the feedless envelope is EVICTED at boot').toBeNull()
    unmount()
  })

  it('a CURRENT-VERSION cache whose decode THROWS evicts the entry (the boot survives fresh)', async () => {
    // the envelope is current but the feed shape is poison for THIS
    // era's decoder — the discard must also REMOVE, or every later
    // boot re-parses the same poison.
    localStorage.setItem(KEY, JSON.stringify({ v: 1, feed: { runs: 'not-an-array' } }))
    const strictDecode = (json: unknown): Row => {
      const runs = (json as { runs?: unknown }).runs
      if (!Array.isArray(runs)) throw new Error('bad shape')
      return { runs }
    }
    hangFetch()
    const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', strictDecode, EMPTY))
    expect(result.current.stale, 'a decode-throwing cache stages nothing').toBe(false)
    expect(result.current.data).toEqual(EMPTY)
    expect(localStorage.getItem(KEY), 'the decode-throwing entry is REMOVED at boot').toBeNull()
    unmount()
  })

  it('a corrupt cache is EVICTED (not just ignored) — the poison never survives to the next boot', async () => {
    localStorage.setItem(KEY, '{not json')
    hangFetch()
    const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    expect(result.current.stale).toBe(false)
    expect(localStorage.getItem(KEY), 'the unparseable entry is gone from the store at boot').toBeNull()
    unmount()
  })

  // THE SUPERSEDED LOAD'S SETTLE (audit 2026-11-12-boot-feed F4a): a
  // reload mid-stale aborts the first load — when that dead load's
  // transport THEN settles (rejected), its catch stays SILENT and its
  // finally clears NOTHING: the stale face, the loading truth, and
  // the cached paint all belong to the load that replaced it. Judges
  // both abort guards (useFeed.ts catch + finally) that no earlier
  // arm reached.
  it('a superseded load settling after its abort touches nothing (stale stays, loading stays, error stays empty)', async () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, feed: { runs: [{ run_id: 'r1' }] } }))
    let failFirst: ((error: Error) => void) | null = null
    const gate1 = new Promise<void>((_, reject) => { failFirst = reject })
    let release2: (() => void) | null = null
    const gate2 = new Promise<void>((res) => { release2 = res })
    let n = 0
    stubFetch(() => {
      ++n
      if (n === 1) return gate1.then(() => ok({ runs: [] }))
      return gate2.then(() => ok({ runs: [{ run_id: 'r2' }] }))
    })
    const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    // the cached feed paints instantly, stale, load #1 hanging
    expect(result.current.data).toEqual({ runs: [{ run_id: 'r1' }] })
    expect(result.current.stale).toBe(true)
    // reload mid-stale: load #1 is aborted, load #2 hangs
    act(() => { result.current.reload() })
    expect(n).toBe(2)
    // the superseded load's transport settles REJECTED after its abort
    await act(async () => { failFirst!(new Error('stale transport')) })
    expect(result.current.stale, 'the aborted finally clears no stale face').toBe(true)
    expect(result.current.loading, 'the aborted finally clears no loading truth').toBe(true)
    expect(result.current.error, 'the aborted catch is silence, never an error face').toBe('')
    expect(result.current.data, 'the cached paint is untouched by the dead load').toEqual({ runs: [{ run_id: 'r1' }] })
    // CACHE NON-POLLUTION (consistency audit F6, 2026-11-12): the dead
    // load's settle never writes the cache either — the persisted feed
    // is the owning load's alone (a rejected superseded write would
    // poison the NEXT boot's first paint with a feed no live load ever
    // served). The aborted load persists nothing — the cache keeps the
    // last SERVED feed:
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ v: 1, feed: { runs: [{ run_id: 'r1' }] } }))
    // the owning load seats: replaces the paint, clears stale
    release2!()
    await waitFor(() => { expect(result.current.loading).toBe(false) })
    expect(result.current.data).toEqual({ runs: [{ run_id: 'r2' }] })
    expect(result.current.stale).toBe(false)
    // and the OWNING load's cache write is the one that lands (its
    // served feed persists):
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ v: 1, feed: { runs: [{ run_id: 'r2' }] } }))
    unmount()
  })

  // THE SUPERSEDED SUCCESS (boot-feed audit F4b): the abort only
  // rejects an IN-FLIGHT fetch — a response that already arrived keeps
  // its body read alive. Pre-cure the late body read setData'd OVER
  // the load that replaced it (and poisoned the cache with a feed no
  // live load ever served). The success path is abort-guarded on both
  // sides of the body read, since the abort can land while the bytes
  // stream in.
  it('a superseded load whose BODY resolves after its abort paints nothing (no data, no cache write)', async () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, feed: { runs: [{ run_id: 'r1' }] } }))
    let releaseBody1: (() => void) | null = null
    const bodyGate1 = new Promise<void>((res) => { releaseBody1 = res })
    let release2: (() => void) | null = null
    const gate2 = new Promise<void>((res) => { release2 = res })
    const LATE = { runs: [{ run_id: 'r1-late' }] }
    let n = 0
    stubFetch(() => {
      ++n
      if (n === 1) {
        // the response ARRIVED (fetch resolved) but its body read hangs
        return Promise.resolve({ ok: true, status: 200, json: () => bodyGate1.then(() => LATE) } as unknown as Response)
      }
      return gate2.then(() => ok({ runs: [{ run_id: 'r2' }] }))
    })
    const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    expect(result.current.data).toEqual({ runs: [{ run_id: 'r1' }] })
    // reload mid-body-read: load #1 is aborted, load #2 hangs
    act(() => { result.current.reload() })
    expect(n).toBe(2)
    // the superseded load's BODY resolves after its abort
    await act(async () => { releaseBody1!() })
    expect(result.current.data, 'the dead load paints no data over the cached face').toEqual({ runs: [{ run_id: 'r1' }] })
    expect(result.current.loading, 'the dead load clears no loading truth').toBe(true)
    expect(result.current.stale, 'the dead load clears no stale face').toBe(true)
    expect(localStorage.getItem(KEY), 'the dead load writes no cache either').toBe(JSON.stringify({ v: 1, feed: { runs: [{ run_id: 'r1' }] } }))
    // the owning load seats normally
    release2!()
    await waitFor(() => { expect(result.current.loading).toBe(false) })
    expect(result.current.data).toEqual({ runs: [{ run_id: 'r2' }] })
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ v: 1, feed: { runs: [{ run_id: 'r2' }] } }))
    unmount()
  })

  // THE PRE-READ GUARD (cure-wave audit 2026-11-02, the solo-firing
  // debt): the arm above proves the POST-read side — the abort lands
  // while the bytes stream. THIS arm proves the other side alone: the
  // response itself resolves only AFTER its load was superseded, so
  // the then-callback ENTERS already-aborted and must return BEFORE
  // the body read — r.json is never even called.
  it('a superseded load whose RESPONSE resolves after its abort never reads the body (the pre-read guard fires alone)', async () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, feed: { runs: [{ run_id: 'r1' }] } }))
    let release1: (() => void) | null = null
    const gate1 = new Promise<void>((res) => { release1 = res })
    let release2: (() => void) | null = null
    const gate2 = new Promise<void>((res) => { release2 = res })
    const json1 = vi.fn(() => Promise.resolve({ runs: [{ run_id: 'r1-late' }] }))
    let n = 0
    stubFetch(() => {
      ++n
      if (n === 1) {
        // the transport itself is gated: the response ARRIVES only
        // after this load was already aborted
        return gate1.then(() => ({ ok: true, status: 200, json: json1 } as unknown as Response))
      }
      return gate2.then(() => ok({ runs: [{ run_id: 'r2' }] }))
    })
    const { result, unmount } = renderHook(() => useFeed('/infer-gallery/runs', decode, EMPTY))
    expect(result.current.data).toEqual({ runs: [{ run_id: 'r1' }] })
    // reload while load #1's transport still hangs: load #1 is aborted
    act(() => { result.current.reload() })
    expect(n).toBe(2)
    // the superseded transport RESOLVES after its abort — a success
    // arriving for a dead load
    await act(async () => { release1!() })
    expect(json1, 'the pre-read guard returned before the body read — r.json never ran').not.toHaveBeenCalled()
    expect(result.current.data, 'the dead load paints nothing over the cached face').toEqual({ runs: [{ run_id: 'r1' }] })
    expect(result.current.loading, 'the dead load clears no loading truth').toBe(true)
    expect(result.current.stale, 'the dead load clears no stale face').toBe(true)
    expect(localStorage.getItem(KEY), 'the dead load writes no cache either').toBe(JSON.stringify({ v: 1, feed: { runs: [{ run_id: 'r1' }] } }))
    // the owning load seats normally
    release2!()
    await waitFor(() => { expect(result.current.loading).toBe(false) })
    expect(result.current.data).toEqual({ runs: [{ run_id: 'r2' }] })
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ v: 1, feed: { runs: [{ run_id: 'r2' }] } }))
    unmount()
  })
})
