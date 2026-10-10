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
  const [data, setData] = useState<T>(initial)
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
      })
      .catch((e: unknown) => {
        // an aborted stale load is silence, not an error face — the
        // load that replaced it owns the surface now
        if (ctrl.signal.aborted) return
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
  }, [url, decode])

  useEffect(() => {
    load()
    return () => { abortRef.current?.abort() }
  }, [load])
  useRefreshOnVisible(load, 15_000)

  return { data, loading, error, reload: load, setData }
}
