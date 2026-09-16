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
