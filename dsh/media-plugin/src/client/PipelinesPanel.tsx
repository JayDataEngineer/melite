/**
 * PipelinesPanel — the RIGHT-SIDEBAR Pipelines tab.
 *
 * Lists the composed action cards (drafts) from the host half's merged
 * /infer-media/drafts door — every gateway's queue-native pipeline
 * instances, newest first. Click a row: the Cards studio opens with THAT
 * card hydrated (the deck's own __meliteDeckOpenWithDraft seam — the same
 * door the media panel's run wand uses), ready to refine and Run.
 *
 * Deliberately sibling to MediaPanel's styling family (plain inline
 * styles, no css-modules) — the two tabs read as one system.
 */
import { useCallback, useEffect, useState } from 'react'

/** One drafts row from /infer-media/drafts (host-merged, source-tagged). */
interface DraftRow {
  draft_id?: string
  name?: string
  model?: string
  source?: string
}

interface Feed {
  drafts: DraftRow[]
  errors: Array<{ gateway: string; message: string }>
}

/** Sidebar tab glyph — a flow arrow, exported for the client entry. */
export function PipelinesTabIcon({ size }: { size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4h5a3 3 0 0 1 3 3v2a3 3 0 0 0 3 3h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="2.8" cy="4" r="1.4" fill="currentColor" />
      <circle cx="13.2" cy="12" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function PipelinesPanel(): JSX.Element {
  const [feed, setFeed] = useState<Feed>({ drafts: [], errors: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetch('/infer-media/drafts')
      .then(async (r) => {
        const data = await r.json() as Partial<Feed> & { error?: string }
        if (!r.ok) throw new Error(String(data.error ?? r.status))
        setFeed({
          drafts: Array.isArray(data.drafts) ? data.drafts : [],
          errors: Array.isArray(data.errors) ? data.errors : [],
        })
      })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  // Same never-stale contract as the media panel: refetch on visibility,
  // throttled — a composed card in a fresh chat must appear here.
  useEffect(() => {
    let last = Date.now()
    const refresh = (): void => {
      if (Date.now() - last < 15000) return
      last = Date.now()
      load()
    }
    const onVis = (): void => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  const openDraft = (draftId: string): void => {
    if (draftId === '') return
    const open = (window as unknown as Record<string, unknown>).__meliteDeckOpenWithDraft
    if (typeof open !== 'function') {
      setError('Cards studio unavailable (deck plugin not loaded)')
      return
    }
    if (!(open as (id: string) => boolean)(draftId)) {
      setError('Cards studio refused to open')
    }
  }

  const q = search.trim().toLowerCase()
  const shown = q === ''
    ? feed.drafts
    : feed.drafts.filter((d) =>
        [d.name ?? '', d.model ?? '', d.draft_id ?? ''].join(' ').toLowerCase().includes(q))

  return (
    <div data-infer-pipelines-panel="1" style={{ padding: 14, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: 'rgb(226,232,240)', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Pipelines</span>
        <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.9)' }}>
          {feed.drafts.length} cards{feed.errors.length > 0 ? ' · ' + feed.errors.length + ' gateway down' : ''}
        </span>
        <span style={{ flex: 1 }} />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value) }}
          placeholder="search name, model…"
          style={{
            background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.25)', color: 'rgb(226,232,240)',
            borderRadius: 8, padding: '5px 10px', fontSize: 12, width: 170, fontFamily: 'inherit',
          }}
        />
        <button onClick={() => { load() }} disabled={loading}
          style={{
            border: '1px solid rgba(148,163,184,0.25)', background: 'transparent', color: 'rgb(203,213,225)',
            borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
          }}>{loading ? 'loading…' : 'refresh'}</button>
      </div>

      {feed.errors.map((e) => (
        <div key={e.gateway} style={{ fontSize: 11, color: 'rgba(251,191,36,0.9)', marginBottom: 4 }}>
          gateway {e.gateway} unreachable — {e.message}
        </div>
      ))}
      {error !== ''
        ? <div style={{ padding: 14, borderRadius: 8, background: 'rgba(127,29,29,0.35)', border: '1px solid rgba(248,113,113,0.4)', fontSize: 13 }}>
            {error}
          </div>
        : loading && feed.drafts.length === 0
          ? <div style={{ color: 'rgba(148,163,184,0.9)', fontSize: 13, padding: 20 }}>loading cards…</div>
          : shown.length === 0
            ? <div style={{ color: 'rgba(148,163,184,0.9)', fontSize: 13, padding: 20 }}>no composed cards yet — build one in a chat.</div>
            : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {shown.map((d) => (
                    <button
                      key={d.draft_id ?? Math.random()}
                      onClick={() => { openDraft(d.draft_id ?? '') }}
                      data-draft={d.draft_id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                        border: '1px solid rgba(148,163,184,0.18)', borderRadius: 10, padding: '8px 12px',
                        background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)', cursor: 'pointer',
                        color: 'rgb(226,232,240)', fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 15, lineHeight: 0, color: 'rgba(250,204,21,0.9)' }}>▸</span>
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.name || d.draft_id}
                        </span>
                        <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: 'rgba(148,163,184,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.model || 'card'} · {d.draft_id}
                        </span>
                      </span>
                      {typeof d.source === 'string' && d.source !== ''
                        ? <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.75)', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 6, padding: '2px 6px' }}>
                            {d.source.replace(/^https?:\/\//, '')}
                          </span>
                        : null}
                    </button>
                  ))}
                </div>
              )}
    </div>
  )
}
