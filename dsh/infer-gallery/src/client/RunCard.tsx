/**
 * One generation run as a card: artifact thumbnail (proxied same-origin),
 * status pill, model/family line, prompt excerpt, and relative time. Cards
 * with an openable artifact are buttons that open it in a new tab; cards
 * without one render as plain tiles (nothing to open).
 */
import { memo } from 'react'
import type { RunRecord } from './runs-data.ts'
import css from './gallery.module.css'

/** The URL a card click opens: first image artifact, else the thumbnail. */
export function runOpenUrl(run: RunRecord): string | undefined {
  const image = (run.artifacts ?? []).find(a => a?.type === 'image' && typeof a.url === 'string' && a.url !== '')
  if (image?.url !== undefined) return image.url
  if (typeof run.thumbnail === 'string' && run.thumbnail !== '') return run.thumbnail
  return undefined
}

/** Model/family label: params.model, else the families list, else the pipeline kind. */
export function runModel(run: RunRecord): string {
  const model = run.params?.['model']
  if (typeof model === 'string' && model !== '') return model
  const families = (run.families ?? []).filter(f => typeof f === 'string' && f !== '')
  if (families.length > 0) return families.join(', ')
  return run.pipeline ?? 'unknown'
}

/** Compact relative/absolute time label from a unix-seconds created_at. */
export function formatRunTime(seconds: number | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return ''
  const ms = seconds * 1000
  const minutes = Math.floor((Date.now() - ms) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return minutes + 'm ago'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours + 'h ago'
  const d = new Date(ms)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function RunCardInner({ run }: { run: RunRecord }) {
  const url = runOpenUrl(run)
  const status = typeof run.status === 'string' && run.status !== '' ? run.status : 'unknown'
  const body = (
    <>
      <span className={css.thumb} data-empty={url === undefined || undefined}>
        {url !== undefined
          ? <img className={css.thumbImg} src={url} alt="" loading="lazy" />
          : <span className={css.thumbPlaceholder} aria-hidden="true">no artifact</span>}
      </span>
      <span className={css.cardBody}>
        <span className={css.cardTop}>
          <span className={css.status} data-status={status}>{status}</span>
          <span className={css.model}>{runModel(run)}</span>
        </span>
        {run.prompt !== undefined && run.prompt !== ''
          ? <span className={css.prompt} title={run.prompt}>{run.prompt}</span>
          : null}
        <span className={css.cardMeta}>
          <span className={css.time}>{formatRunTime(run.created_at)}</span>
          {run.run_id !== undefined ? <span className={css.runId} title={run.run_id}>{run.run_id}</span> : null}
        </span>
      </span>
    </>
  )
  if (url === undefined) {
    return <div className={css.card} data-openable="false" data-dsh-part="run-card">{body}</div>
  }
  return (
    <button
      type="button"
      className={css.card}
      data-openable="true"
      data-dsh-part="run-card"
      title="Open artifact in a new tab"
      onClick={() => { window.open(url, '_blank', 'noopener') }}
    >
      {body}
    </button>
  )
}

/** Memoized: a card re-renders only when its own run record changes. */
export const RunCard = memo(RunCardInner)