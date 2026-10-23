/**
 * useFeed — the ONE fetch/load/never-stale engine for sidebar feeds
 * (audit F6: the runs and drafts feeds each carried a hand-copied
 * load + 15s-throttled visibility/focus refetch + error trio).
 *
 * decode validates at the door: it receives unknown JSON and returns the
 * typed feed; malformed shapes fall back to empty lists THERE, in one
 * place per feed, instead of Array.isArray sprinkles at render sites.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchUntilSeated } from './waitState.ts'

export interface Feed<T> {
  data: T
  loading: boolean
  error: string
  reload: () => void
  setData: (v: T) => void
  /** True while the panel paints the PERSISTED last-served feed and
   *  the fresh load is still seating — the boot-staged face (E2-3
   *  arm 2): instant stale-then-fresh, never minutes of spinner
   *  through a lane boot. False once the fresh feed lands (or its
   *  error voices — the cached data stays painted either way). */
  stale: boolean
}

/** The staged-cache seat (E2-3 arm 2, operator 2026-10-22: "the
 *  first load from history takes 5+ minutes"): the last served feed
 *  persists client-side and paints instantly on the next boot. Keyed
 *  by the feed url — localStorage is origin-scoped, so two estates
 *  (two lanes, two ports) never cross-paint. A cache that will not
 *  parse is discarded, never a crashed boot. */
const feedCacheKey = (url: string): string => 'melite:feed:' + url

function readFeedCache(url: string): unknown | null {
  try {
    const raw = localStorage.getItem(feedCacheKey(url))
    return raw === null ? null : JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function writeFeedCache(url: string, json: unknown): void {
  try {
    localStorage.setItem(feedCacheKey(url), JSON.stringify(json))
  } catch {
    /* quota or a sealed store — the staged face is a gift, never a law */
  }
}

/** Refetch when the page becomes visible / regains focus, throttled.
 * A new chat session does NOT reload the SPA — without this the panel
 * sits on hour-old data while fresh runs exist. */
function useRefreshOnVisible(reload: () => void, throttleMs: number): void {
  const ref = useRef(reload)
  ref.current = reload
  useEffect(() => {
    let last = Date.now()
    const refresh = (): void => {
      if (Date.now() - last < throttleMs) return
      last = Date.now()
      ref.current()
    }
    const onVis = (): void => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', refresh)
    }
  }, [throttleMs])
}

export function useFeed<T>(url: string, decode: (json: unknown) => T, initial: T): Feed<T> {
  // THE BOOT-STAGED FIRST PAINT (E2-3 arm 2): the persisted feed
  // hydrates SYNCHRONOUSLY (the initializer — no effect, no flicker);
  // a cache whose shape no longer decodes is discarded fresh.
  const [boot] = useState<{ cached: unknown | null }>(() => {
    const json = readFeedCache(url)
    if (json === null) return { cached: null }
    try {
      decode(json)
      return { cached: json }
    } catch {
      return { cached: null }
    }
  })
  const [data, setData] = useState<T>(() => {
    if (boot.cached === null) return initial
    try {
      return decode(boot.cached)
    } catch {
      return initial
    }
  })
  const [stale, setStale] = useState<boolean>(boot.cached !== null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // THE STALE-LOAD ABORT (audit V-E2): each load owns a controller;
  // the next load (and unmount) aborts the previous one so a boot
  // race never keeps a dead feed's wait — and its late .catch never
  // paints a stale error over the newer load's state.
  const abortRef = useRef<AbortController | null>(null)
  const load = useCallback(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError('')
    // fetchUntilSeated: the estate's boot-race wait voices (503
    // estate/pending, 502 no_estate_seat) retry within the doors'
    // grace window — the feed stays loading through a lane boot,
    // never a terminal red banner that heals itself seconds later.
    fetchUntilSeated(url, { signal: ctrl.signal })
      .then(async (r) => {
        const json: unknown = await r.json()
        if (!r.ok) {
          const msg = (json as { error?: unknown }).error
          throw new Error(typeof msg === 'string' && msg !== '' ? msg : 'HTTP ' + String(r.status))
        }
        setData(decode(json))
        writeFeedCache(url, json)
      })
      .catch((e: unknown) => {
        // an aborted stale load is silence, not an error face — the
        // load that replaced it owns the surface now
        if (ctrl.signal.aborted) return
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false)
          setStale(false)
        }
      })
  }, [url, decode])

  useEffect(() => {
    load()
    return () => { abortRef.current?.abort() }
  }, [load])
  useRefreshOnVisible(load, 15_000)

  return { data, loading, error, reload: load, setData, stale }
}
