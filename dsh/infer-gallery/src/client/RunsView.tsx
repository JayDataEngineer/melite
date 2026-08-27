/**
 * Presentational runs view: grid of RunCards over a RunsState. Loading,
 * error (the proxy's actual error body, verbatim), and empty states render
 * inline — the view never throws.
 */
import { RunCard } from './RunCard.tsx'
import type { RunsState } from './runs-data.ts'
import css from './gallery.module.css'

export interface RunsViewProps {
  state: RunsState
  onRefresh?: () => void
}

export function RunsView({ state, onRefresh }: RunsViewProps) {
  const countLabel = state.phase === 'ready'
    ? state.runs.length + ' runs'
    : state.phase === 'loading' ? 'loading…' : 'unavailable'
  return (
    <div className={css.view} data-dsh-part="runs-view">
      <div className={css.toolbar}>
        <span className={css.count}>{countLabel}</span>
        {onRefresh !== undefined
          ? <button type="button" className={css.refresh} onClick={onRefresh}>refresh</button>
          : null}
      </div>
      {state.phase === 'loading' ? <div className={css.loading}>Loading runs…</div> : null}
      {state.phase === 'error' ? (
        <div className={css.errorBox} data-dsh-part="runs-error">
          <strong>Gallery data unavailable (HTTP {state.status})</strong>
          <pre className={css.errorBody}>{state.body}</pre>
        </div>
      ) : null}
      {state.phase === 'ready' && state.runs.length === 0
        ? <div className={css.empty}>No runs yet — generate something in Melite first.</div>
        : null}
      {state.phase === 'ready' && state.runs.length > 0 ? (
        <div className={css.grid}>
          {state.runs.map((run, i) => <RunCard key={run.run_id ?? String(i)} run={run} />)}
        </div>
      ) : null}
    </div>
  )
}