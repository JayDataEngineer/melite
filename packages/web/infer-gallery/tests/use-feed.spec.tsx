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
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({ runs: [{ run_id: 'r1' }] })
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
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({ runs: [{ run_id: 'r2' }] })
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

  // THE SUPERSEDED LOAD'S SETTLE (audit 2026-11-12-boot-feed F4a): a
  // reload mid-stale aborts the first load — when that dead load's
  // transport THEN settles (rejected), its catch stays SILENT and its
  // finally clears NOTHING: the stale face, the loading truth, and
  // the cached paint all belong to the load that replaced it. Judges
  // both abort guards (useFeed.ts catch + finally) that no earlier
  // arm reached.
  it('a superseded load settling after its abort touches nothing (stale stays, loading stays, error stays empty)', async () => {
    localStorage.setItem(KEY, JSON.stringify({ runs: [{ run_id: 'r1' }] }))
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
    // the owning load seats: replaces the paint, clears stale
    release2!()
    await waitFor(() => { expect(result.current.loading).toBe(false) })
    expect(result.current.data).toEqual({ runs: [{ run_id: 'r2' }] })
    expect(result.current.stale).toBe(false)
    unmount()
  })
})
