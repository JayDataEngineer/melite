/**
 * RunCard — one live run, polled until terminal.
 *
 * The four honest statuses (in-flight / complete / failed / error) with the
 * gateway's verbatim error body and artifact previews (image grid through
 * the path-restricted artifact proxy). Mirrors the old GenerateMediaCard:
 * urls become <img>, the status line never invents state.
 */
import { useEffect, useState } from 'react'
import css from './deck.module.css'
import {
  artifactUrl, DeckError, fetchRunStatus, isTerminal,
  type RunStatus,
} from './deck-data.ts'

const POLL_MS = 2500

export function RunCard({ runId, onRemove }: { runId: string; onRemove(): void }) {
  const [status, setStatus] = useState<RunStatus | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      try {
        const s = await fetchRunStatus(runId)
        if (!alive) return
        setStatus(s)
        setErr(null)
        if (!isTerminal(s.status ?? '')) timer = setTimeout(tick, POLL_MS)
      } catch (e) {
        if (!alive) return
        setErr(e instanceof DeckError ? e.body : String(e))
        // Poll errors retry until terminal: transient proxy blips must not
        // kill a live card.
        timer = setTimeout(tick, POLL_MS * 2)
      }
    }
    void tick()
    return () => {
      alive = false
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [runId])

  const st = status?.status ?? 'unknown'
  const terminal = isTerminal(st)
  const failed = st === 'failed' || st === 'error' || st === 'interrupted' || st === 'stopped'
  const artifacts = (status?.artifacts ?? []).slice(0, 6)
  // Images ride both shapes: top-level artifacts[] and per-stage url (the
  // live payload carries stage.url — top-level is null on completed runs).
  const stageImgs = (status?.stages ?? [])
    .filter(s => s.type === 'image' && typeof s.url === 'string')
    .map(s => s.url as string)
  const images = [...new Set([...artifacts.map(artifactUrl), ...stageImgs])]
    .filter(u => u !== '')
    .slice(0, 6)
  const errLine = typeof status?.error === 'string' && status.error !== ''
    ? status.error
    : (status?.log_tail?.length ? status.log_tail[status.log_tail.length - 1] : null)

  return (
    <div className={css.runCard} data-status={st} data-terminal={terminal || undefined}>
      <div className={css.runHead}>
        <span className={css.runId} title={runId}>{runId}</span>
        <span className={css.statusPill} data-st={st}>{st}</span>
        <button type="button" className={css.runClose} aria-label="Dismiss run" onClick={onRemove}>×</button>
      </div>
      {err !== null ? (
        <pre className={css.runError}>{err}</pre>
      ) : status === null ? (
        <p className={css.runPending}>contacting gateway…</p>
      ) : (
        <>
          {images.length > 0 ? (
            <div className={css.runGrid}>
              {images.map((u, i) => (
                <img key={i} src={u} alt={`artifact ${i + 1}`} loading="lazy" />
              ))}
            </div>
          ) : null}
          {!terminal ? <p className={css.runPending}>running…</p> : null}
          {terminal && failed ? (
            <pre className={css.runError}>{errLine ?? 'run failed'}</pre>
          ) : null}
          {terminal && !failed && images.length === 0 ? (
            <p className={css.runOk}>✓ complete</p>
          ) : null}
        </>
      )}
    </div>
  )
}
