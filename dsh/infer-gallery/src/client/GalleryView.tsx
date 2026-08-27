/**
 * Gallery view: drives fetchRuns into RunsState and renders RunsView. The
 * refresh button re-runs the effect; unmount cancels late responses.
 */
import { useCallback, useEffect, useState } from 'react'
import { fetchRuns, type RunsState } from './runs-data.ts'
import { RunsView } from './RunsView.tsx'

export function GalleryView() {
  const [state, setState] = useState<RunsState>({ phase: 'loading' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ phase: 'loading' })
    void fetchRuns().then(next => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [tick])

  const refresh = useCallback(() => setTick(t => t + 1), [])
  return <RunsView state={state} onRefresh={refresh} />
}