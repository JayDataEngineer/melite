/**
 * MediaPanel — the native media archive tab.
 *
 * One merged grid over GET /infer-media/runs (host half merges every
 * gateway). Everything renders with NATIVE elements: <video controls
 * autoPlay> in a fullscreen overlay, <img>, <audio controls>. No iframe, no
 * editor SPA dependency, no asset-type resolver to fall through.
 *
 * Label law (operator-specified format):
 *   "first 48 chars of the prompt…" — Aug 28, 05:01 AM · filename.mp4
 * Runs with an empty prompt fall back to run name/pipeline.
 */
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

interface RunArtifact {
  url?: string
  type?: string
  name?: string
  size?: number
}

interface RunRow {
  run_id?: string
  name?: string
  pipeline?: string
  status?: string
  created_at?: number
  prompt?: string
  thumbnail?: string
  artifacts?: RunArtifact[]
  source?: string
  /** Card linkage served by the gateway's runs list (2026-08-30 full
   *  flow): the action card this run belongs to, for wand replay. */
  draft_id?: string
}

type Kind = 'video' | 'image' | 'audio'
type Cat = 'all' | Kind

interface MediaItem {
  id: string
  kind: Kind
  url: string
  poster: string
  head: string
  final: boolean
  runId: string
  draftId: string
  time: string
  file: string
  created: number
}

const VIDEO_EXT = /\.(mp4|webm|mov|mkv)(\?|$)/i
const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i
const AUDIO_EXT = /\.(mp3|wav|flac|ogg|m4a|aac)(\?|$)/i
/** Numbered frame dumps (per-frame PNG exports) — noise in a run with 100+ frames. */
const FRAME_DUMP = /(^|_)\d{3,}_?\.png$/i

function kindOf(a: RunArtifact): Kind | null {
  const t = a.type ?? ''
  const u = a.url ?? ''
  if (t === 'video' || t.startsWith('video/') || VIDEO_EXT.test(u)) return 'video'
  if (t === 'audio' || t.startsWith('audio/') || AUDIO_EXT.test(u)) return 'audio'
  if (t === 'image' || t.startsWith('image/') || IMAGE_EXT.test(u)) return 'image'
  return null
}

function baseName(u: string): string {
  const clean = u.split('?')[0] ?? u
  const parts = clean.split('/')
  return parts[parts.length - 1] ?? clean
}

function timeLabel(sec: unknown): string {
  if (typeof sec !== 'number' || !Number.isFinite(sec) || sec <= 0) return ''
  try {
    return new Date(sec * 1000).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch {
    return ''
  }
}

/** One row of the gateway drafts list — a COMPOSED action card (a
 * pipeline instance), not yet (or no longer) necessarily run. Click
 * opens the Cards studio with this exact draft hydrated. */
interface DraftRow {
  draft_id?: string
  name?: string
  model?: string
  source?: string
}

function flatten(runs: RunRow[]): MediaItem[] {
  const items: MediaItem[] = []
  const seen = new Set<string>()
  for (const run of runs) {
    const arts = Array.isArray(run.artifacts) ? run.artifacts : []
    // Poster map: sibling *_last_frame.png / *_poster.png keyed by artifact stem.
    const posters = new Map<string, string>()
    for (const a of arts) {
      const n = a.name ?? baseName(a.url ?? '')
      const m = n.match(/^(.+)_last_frame\.png$/i) ?? n.match(/^(.+)_poster\.png$/i)
      if (m !== null && a.url) posters.set(m[1] ?? '', a.url)
    }
    // Image-flood guard: runs that dump every frame would drown the grid —
    // when a run has >20 images, drop numbered frame dumps, keep the rest.
    const imageCount = arts.reduce((n, a) => (kindOf(a) === 'image' ? n + 1 : n), 0)
    const dropFrames = imageCount > 20
    let lastWindowPoster = ''
    for (const a of arts) {
      const kind = kindOf(a)
      const url = a.url ?? ''
      if (kind === null || url === '' || seen.has(url)) continue
      seen.add(url)
      const file = a.name ?? baseName(url)
      if (dropFrames && kind === 'image' && FRAME_DUMP.test(file)) continue
      const stem = file.replace(/\.[^.]+$/, '')
      const prompt = String(run.prompt ?? '').replace(/\s+/g, ' ').trim()
      // YAML-pipeline runs carry no run.prompt — the story text lives in
      // params.calls[0].text; use it before the bare pipeline name so the
      // tile is labeled AND searchable ("cyberpunk" must hit).
      const callsText = String((run.params as { calls?: { text?: string }[] } | undefined)?.calls?.[0]?.text ?? '').replace(/\s+/g, ' ').trim()
      const labelSrc = prompt !== '' ? prompt : (run.name ?? '') !== '' ? String(run.name) : callsText
      const head = labelSrc !== ''
        ? '"' + labelSrc.slice(0, 48) + (labelSrc.length > 48 ? '\u2026' : '') + '"'
        : String(run.pipeline ?? run.run_id ?? '')
      // concatenated film = video without a _w<N>_hash window suffix
      const isFinal = kind === 'video' && !/_w\d+_[0-9a-f]+\.mp4$/.test(file)
      let poster = ''
      if (kind === 'video') {
        poster = posters.get(stem) ?? ''
        if (poster === '' && isFinal) poster = lastWindowPoster
        if (/_w\d+_[0-9a-f]+\.mp4$/.test(file)) {
          const wf = posters.get(stem)
          if (wf !== '') lastWindowPoster = wf
        }
        if (poster === '') poster = run.thumbnail ?? ''
      } else if (kind === 'image') {
        poster = url
      }
      items.push({
        id: url,
        kind,
        url,
        poster,
        head,
        final: isFinal,
        runId: String(run.run_id ?? ''),
        draftId: typeof run.draft_id === 'string' ? run.draft_id : '',
        time: timeLabel(run.created_at),
        file,
        created: typeof run.created_at === 'number' ? run.created_at : 0,
      })
    }
  }
  items.sort((a, b) => (b.created - a.created) || (Number(b.final) - Number(a.final)))
  return items
}

function Glyph({ kind, size = 26 }: { kind: string; size?: number }) {
  if (kind === 'video') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2.5" y="5" width="13" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15.5 10.5 21 7.6v8.8l-5.5-2.9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'audio') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 10v4M8 6.5v11M12 3.5v17M16 7.5v9M20 10v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m6 16 4.5-5.5 3 3.5L16 11l2.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9" cy="8.5" r="1.3" fill="currentColor" />
    </svg>
  )
}

function Overlay({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        background: 'rgba(8,9,12,0.93)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: 24, cursor: 'zoom-out',
      }}
    >
      {item.kind === 'video'
        ? (
            <video
              src={item.url}
              controls
              autoPlay
              playsInline
              style={{ maxWidth: '94vw', maxHeight: '78vh', borderRadius: 8, background: '#000', cursor: 'default' }}
              onClick={(e) => { e.stopPropagation() }}
            />
          )
        : item.kind === 'audio'
          ? (
              <audio
                src={item.url}
                controls
                autoPlay
                style={{ width: 'min(560px, 90vw)' }}
                onClick={(e) => { e.stopPropagation() }}
              />
            )
          : (
              <img
                src={item.url}
                alt={item.file}
                style={{ maxWidth: '94vw', maxHeight: '78vh', borderRadius: 8, objectFit: 'contain', cursor: 'default' }}
                onClick={(e) => { e.stopPropagation() }}
              />
            )}
      <div style={{ color: 'rgba(226,232,240,0.85)', fontSize: 13, maxWidth: '80vw', textAlign: 'center', lineHeight: 1.5, cursor: 'default' }}>
        <div style={{ fontWeight: 600 }}>{item.head}</div>
        <div style={{ opacity: 0.7 }}>{[item.time, item.file].filter(Boolean).join(' · ')}</div>
      </div>
      <div style={{ color: 'rgba(148,163,184,0.8)', fontSize: 12 }}>click anywhere or press Esc to close</div>
    </div>,
    document.body,
  )
}

/** Sidebar tab glyph — exported for the (JSX-free) client entry. */
export function MediaTabIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.8" y="3" width="8.4" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.2 6.4 14 4.6v6.8l-3.8-1.8" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M3.6 5.4h1.6M3.6 8h1.6M3.6 10.6h1.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

export function MediaPanel(): JSX.Element {
  const [runs, setRuns] = useState<RunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [gatewayErrors, setGatewayErrors] = useState<Array<{ gateway: string; message: string }>>([])
  const [cat, setCat] = useState<Cat>('all')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<MediaItem | null>(null)
  const [drafts, setDrafts] = useState<DraftRow[]>([])
  const [tab, setTab] = useState<'artifacts' | 'pipelines'>('artifacts')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetch('/infer-media/runs')
      .then(async (r) => {
        const data = await r.json() as { runs?: RunRow[]; errors?: Array<{ gateway: string; message: string }> }
        if (!r.ok) throw new Error(String((data as { error?: string }).error ?? r.status))
        setRuns(Array.isArray(data.runs) ? data.runs : [])
        setGatewayErrors(Array.isArray(data.errors) ? data.errors : [])
      })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  /* PIPELINES: the drafts archive loads independently of runs — one feed
   * failing must never blank the other. Errors land in the shared error
   * strip only if BOTH feeds are empty. */
  const loadDrafts = useCallback(() => {
    fetch('/infer-media/drafts')
      .then(async (r) => {
        const data = await r.json() as { drafts?: DraftRow[] }
        if (!r.ok) throw new Error(String((data as { error?: string }).error ?? r.status))
        setDrafts(Array.isArray(data.drafts) ? data.drafts : [])
      })
      .catch(() => { setDrafts([]) })  // runs view stays fully usable
  }, [])
  useEffect(() => { loadDrafts() }, [loadDrafts])

  // NEVER STALE: a new chat session does NOT reload the SPA — the panel would
  // sit on hour-old data while fresh runs exist. Refetch whenever the page
  // becomes visible again or regains focus, throttled to 15s.
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

  /** CARD REPLAY (final wiring, 2026-08-30): the wand opens THE CARDS
   *  STUDIO — the left-sidebar Cards tab itself — by clicking its row,
   *  exactly as the operator does. The studio opens with its own embed
   *  bridge and full card system, untouched. No iframe here, no editor
   *  dependency in this panel; the row is the deck bundle's own entry
   *  ([data-melite-cards-entry]). The run→card link is the draft_id the
   *  gateway's runs list carries per row (same payload this panel already
   *  loaded — no extra fetch, no gallery route). Missing link or missing
   *  row = honest inline error. */
  const openCards = (runId: string, draftId: string): void => {
    if (runId === '') return
    if (draftId === '') {
      setError('run has no action card (no draft_id in its run row)')
      return
    }
    const open = (window as unknown as Record<string, unknown>).__meliteDeckOpenWithDraft
    if (typeof open !== 'function') {
      setError('Cards studio unavailable (deck plugin not loaded)')
      return
    }
    if (!(open as (id: string) => boolean)(draftId)) {
      setError('Cards studio refused to open')
    }
  }

  /** PIPELINE OPEN: click a draft row → the Cards studio opens with THAT
   *  card hydrated (same deck seam the run wand uses). The card is the
   *  queue-native object: refine it there, press Run when ready. */
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

  const items = useMemo(() => flatten(runs), [runs])
  const counts = useMemo(() => {
    const c: Record<Cat, number> = { all: items.length, video: 0, image: 0, audio: 0 }
    for (const it of items) c[it.kind] += 1
    return c
  }, [items])
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((it) => {
      if (cat !== 'all' && it.kind !== cat) return false
      if (q === '') return true
      return (it.head + ' ' + it.file + ' ' + it.time).toLowerCase().includes(q)
    })
  }, [items, cat, search])

  const chip = (c: Cat, label: string): JSX.Element => {
    const active = cat === c
    return (
      <button
        key={c}
        onClick={() => { setCat(c) }}
        style={{
          border: '1px solid ' + (active ? 'rgba(96,165,250,0.9)' : 'rgba(148,163,184,0.25)'),
          background: active ? 'rgba(59,130,246,0.18)' : 'transparent',
          color: active ? 'rgb(147,197,253)' : 'rgb(203,213,225)',
          borderRadius: 999, padding: '3px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >{label} {counts[c]}</button>
    )
  }

  return (
    <div data-infer-media-panel="1" style={{ padding: 14, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', color: 'rgb(226,232,240)', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      {/* ✦ CARDS — card replay: opens THE CARDS TAB with this run's exact
          card loaded (sidecar → draft_id → the deck canvas' native card
          view: intent, shots, fps, seed, ▶ Run through the queue door).
          No editor SPA — that page renders blank on this origin. */}
      <style>{'.im-tile{position:relative}.im-wand{position:absolute;right:6px;top:6px;z-index:3;opacity:0;transition:opacity .12s;display:flex;align-items:center;gap:4px;border:0;border-radius:6px;padding:4px 6px;background:rgba(2,6,23,0.82);color:#fde68a;font-size:9px;font-weight:700;letter-spacing:.4px;cursor:pointer;font-family:inherit}.im-tile:hover .im-wand{opacity:1}.im-wand:hover{background:rgba(250,204,21,0.95);color:#422006}'}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Infer Media</span>
        <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.9)' }}>
          {runs.length} runs · {items.length} artifacts{gatewayErrors.length > 0 ? ' · ' + gatewayErrors.length + ' gateway down' : ''}
        </span>
        <span style={{ flex: 1 }} />
        {/* PIPELINES ↔ ARTIFACTS: the two faces of the archive — composed
            cards (drafts) vs rendered runs. Segmented like the cat chips. */}
        <span style={{ display: 'flex', gap: 4, padding: 2, border: '1px solid rgba(148,163,184,0.25)', borderRadius: 999 }}>
          {(['pipelines', 'artifacts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t) }}
              style={{
                border: 0, borderRadius: 999, padding: '3px 10px', fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit',
                background: tab === t ? 'rgba(59,130,246,0.18)' : 'transparent',
                color: tab === t ? 'rgb(147,197,253)' : 'rgb(203,213,225)',
              }}
            >{t === 'pipelines' ? 'Pipelines ' + String(drafts.length) : 'Artifacts ' + String(items.length)}</button>
          ))}
        </span>
        <input
          value={search}

          onChange={(e) => { setSearch(e.target.value) }}
          placeholder="search prompt, file\u2026"
          style={{
            background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.25)', color: 'rgb(226,232,240)',
            borderRadius: 8, padding: '5px 10px', fontSize: 12, width: 200, fontFamily: 'inherit',
          }}
        />
        <button onClick={() => { load() }} disabled={loading}
          style={{
            border: '1px solid rgba(148,163,184,0.25)', background: 'transparent', color: 'rgb(203,213,225)',
            borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
          }}>{loading ? 'loading\u2026' : 'refresh'}</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {chip('all', 'All')}{chip('video', 'Video')}{chip('image', 'Images')}{chip('audio', 'Audio')}
      </div>

      {tab === 'pipelines'
        ? (drafts.length === 0
            ? <div style={{ color: 'rgba(148,163,184,0.9)', fontSize: 13, padding: 20 }}>no composed cards yet — build one in a chat.</div>
            : <div data-infer-media-drafts="1" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {drafts.map((d) => (
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
              </div>)
        : gatewayErrors.length > 0
        ? gatewayErrors.map((e) => (
            <div key={e.gateway} style={{ fontSize: 11, color: 'rgba(251,191,36,0.9)', marginBottom: 4 }}>
              gateway {e.gateway} unreachable — {e.message}
            </div>
          ))
        : null}
      {tab === 'artifacts' && (error !== ''
        ? <div style={{ padding: 14, borderRadius: 8, background: 'rgba(127,29,29,0.35)', border: '1px solid rgba(248,113,113,0.4)', fontSize: 13 }}>
            failed to load runs: {error}
          </div>
        : loading && items.length === 0
          ? <div style={{ color: 'rgba(148,163,184,0.9)', fontSize: 13, padding: 20 }}>loading runs\u2026</div>
          : shown.length === 0
            ? <div style={{ color: 'rgba(148,163,184,0.9)', fontSize: 13, padding: 20 }}>no artifacts match.</div>
            : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }}>
                  {shown.map((it) => (
                    <button
                      key={it.id}
                      className="im-tile"
                      onClick={() => { setPreview(it) }}
                      style={{
                        position: 'relative', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden',
                        border: '1px solid rgba(148,163,184,0.18)', cursor: 'pointer', padding: 0,
                        background: it.kind === 'image' ? '#0b0e14' : 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(148,163,184,0.75)',
                        textAlign: 'left', fontFamily: 'inherit',
                      }}
                    >
                      {it.poster !== ''
                        ? <img src={it.poster} alt="" loading="lazy"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        : null}
                      {it.kind === 'video'
                        ? (
                            <span style={{
                              position: 'absolute', right: 6, bottom: 6, background: 'rgba(2,6,23,0.72)',
                              borderRadius: 6, padding: 3, lineHeight: 0, color: '#e2e8f0',
                            }}><Glyph kind="video" size={14} /></span>
                          )
                        : null}
                      {it.final
                        ? (
                            <span style={{
                              position: 'absolute', left: 6, top: 6, background: 'rgba(250,204,21,0.92)',
                              color: '#422006', borderRadius: 5, padding: '2px 6px',
                              fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
                            }}>FINAL FILM</span>
                          )
                        : null}
                      {it.runId !== ''
                        ? (
                            <span
                              role="button"
                              tabIndex={0}
                              className="im-wand"
                              title={it.draftId !== ''
                                ? 'Open as cards — this run\u2019s card, setup and ready'
                                : 'No action card linked to this run'}
                              style={{ opacity: it.draftId !== '' ? 1 : 0.35 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                openCards(it.runId, it.draftId)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.stopPropagation()
                                  openCards(it.runId, it.draftId)
                                }
                              }}
                            >✦ CARDS</span>
                          )
                        : null}
                      {it.poster === ''
                        ? <span style={{ color: 'rgba(148,163,184,0.55)' }}><Glyph kind={it.kind} /></span>
                        : null}
                      <span style={{
                        position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 6px 4px',
                        background: 'linear-gradient(to top, rgba(2,6,23,0.92), rgba(2,6,23,0))',
                        fontSize: 10, lineHeight: 1.35, color: 'rgba(226,232,240,0.92)',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {it.head !== '' ? it.head + ' \u2014 ' : ''}{[it.time, it.file].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              ))}

      {preview !== null ? <Overlay item={preview} onClose={() => { setPreview(null) }} /> : null}
    </div>
  )
}
