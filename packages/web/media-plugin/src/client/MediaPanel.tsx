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
 * Runs with an empty prompt fall back to run name/flow.
 */
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getSidebarService, openWithDraft } from './apply-guard.ts'
import { decodeRuns, decodeDrafts } from './decode.ts'
import type { DraftRow, RunArtifact, RunRow } from './decode.ts'
import { useFeed } from './useFeed.ts'
import {
  Empty,
  ErrorBanner,
  FONT,
  GatewayErrors,
  PanelShell,
  RefreshButton,
  SearchInput,
  Stat,
  gradientCaption,
  gradientStage,
} from './ui.tsx'
import MEDIA_KINDS from '../../media-kinds.json'
import {
  bgBase1,
  bgBase2,
  bgBase3,
  bgOverlay2,
  borderL2,
  fillSubtle2,
  labelPrimary1,
  labelPrimary2,
  labelPrimary3,
  labelPrimary4,
  labelSecondary1,
  labelSecondary2,
  stateBusinessPrimary,
  stateBusinessPrimaryBg1,
  stateBusinessPrimaryBg2,
  stateWarnPrimary1,
  stateWarnPrimary2,
  textTertiary1,
  textTertiary2,
  textTertiary3,
} from './ui.tokens.ts'

/** Media kinds — DERIVED from the SSOT (media-kinds.json), never restated.
 *  Adding a kind = one JSON entry; every classifier, chip, badge and glyph
 *  below reads this map (the Sep-6 3D outage was three hand-kept copies). */
type Kind = keyof typeof MEDIA_KINDS.kinds
/** JSON key order = classifier precedence (video beats image on a contradictory row). */
const KIND_ORDER = Object.keys(MEDIA_KINDS.kinds) as Kind[]
const KIND_LABEL = Object.fromEntries(
  KIND_ORDER.map((k) => [k, (MEDIA_KINDS.kinds[k] as { label: string }).label])
) as Record<Kind, string>
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

const extRe = (exts: readonly string[]): RegExp => new RegExp('\\.(' + exts.join('|') + ')(\\?|$)', 'i')
const KIND_RE = Object.fromEntries(
  KIND_ORDER.map((kind) => [kind, extRe((MEDIA_KINDS.kinds[kind] as { exts: readonly string[] }).exts)])
) as Record<Kind, RegExp>
/** Numbered frame dumps (per-frame PNG exports) — noise in a run with 100+ frames. */
const FRAME_DUMP = /(^|_)\d{3,}_?\.png$/i

/* FILENAME CONTRACTS with the render lanes — declared once, used by name
 * (the Sep-6 audit's F5: magic stems and suffix regexes restated at every
 * use site drift silently). Pinned by test_media_sidebar.py
 * (test_filename_contracts_single_definition). */
/** Concatenated film = video WITHOUT a per-window suffix; window films
 *  carry it (video lanes emit `<stem>_w<idx>_<hash>.mp4`). */
const WINDOW_FILM = /_w\d+_[0-9a-f]+\.mp4$/
/** Poster siblings rendered beside a film, keyed by artifact stem. */
const POSTER_STEMS = [/^(.+)_last_frame\.png$/i, /^(.+)_poster\.png$/i]

/** Classifier — kind ORDER comes from the SSOT JSON's key order; the
 *  type field beats the URL, mime prefixes are the last resort. */
export function kindOf(a: RunArtifact): Kind | null {
  const t = a.type ?? ''
  const u = a.url ?? ''
  for (const kind of KIND_ORDER) {
    if (t === kind) return kind
  }
  for (const kind of KIND_ORDER) {
    if (KIND_RE[kind].test(u)) return kind
  }
  if (t.startsWith('video/')) return 'video'
  if (t.startsWith('audio/') || t === 'audio') return 'audio'
  if (t.startsWith('image/')) return 'image'
  return null
}

/** params is UNTRUSTED wire data — only a structurally-validated
 *  calls[0].text feeds tile labels (audit F8: the old raw cast trusted
 * any object shape). */
export function callsTextOf(params: unknown): string {
  if (params == null || typeof params !== 'object') return ''
  const calls = (params as { calls?: unknown }).calls
  if (!Array.isArray(calls) || calls.length === 0) return ''
  const text = (calls[0] as { text?: unknown } | null)?.text
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
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
 *  flow instance). Wire shape in decode.ts (DraftRow); rendering here. */

function flatten(runs: RunRow[]): MediaItem[] {
  const items: MediaItem[] = []
  const seen = new Set<string>()
  for (const run of runs) {
    const arts = Array.isArray(run.artifacts) ? run.artifacts : []
    // Poster map: sibling *_last_frame.png / *_poster.png keyed by artifact stem.
    const posters = new Map<string, string>()
    for (const a of arts) {
      const n = a.name ?? baseName(a.url ?? '')
      const m = POSTER_STEMS.map((re) => n.match(re)).find((x): x is RegExpMatchArray => x !== null)
      if (m !== undefined && a.url) posters.set(m[1] ?? '', a.url)
    }
    // Image-flood guard: runs that dump every frame would drown the grid —
    // when a run has >20 images, drop numbered frame dumps, keep the rest.
    // (Display-tier cap for gateways that don't truncate themselves; the
    // py door already caps LISTED images at policy.maxListedImages and
    // flags it via the run-row `truncated` marker — see media-kinds.json.)
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
      // YAML-flow runs carry no run.prompt — the story text lives in
      // params.calls[0].text; use it before the bare flow name so the
      // tile is labeled AND searchable ("cyberpunk" must hit).
      const callsText = callsTextOf(run.params)
      const labelSrc = prompt !== '' ? prompt : (run.name ?? '') !== '' ? String(run.name) : callsText
      const head = labelSrc !== ''
        ? '"' + labelSrc.slice(0, 48) + (labelSrc.length > 48 ? '\u2026' : '') + '"'
        : String(run.flow ?? run.run_id ?? '')
      // concatenated film = video without a _w<N>_hash window suffix
      const isFinal = kind === 'video' && !WINDOW_FILM.test(file)
      let poster = ''
      if (kind === 'video') {
        poster = posters.get(stem) ?? (isFinal ? url : '')
        if (poster === '' && isFinal) poster = lastWindowPoster
        if (WINDOW_FILM.test(file)) {
          const wf = posters.get(stem)
          if (wf !== undefined && wf !== '') lastWindowPoster = wf
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

function Glyph({ kind, size = 26 }: { kind: Kind; size?: number }) {
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
  if (kind === 'model') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 12 20 7.4M12 12 4 7.4M12 12v9.2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'image') {
    return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m6 16 4.5-5.5 3 3.5L16 11l2.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9" cy="8.5" r="1.3" fill="currentColor" />
    </svg>
    )
  }
  const _exhaustive: never = kind
  return _exhaustive
}

/** Tile badge rule — ONE place: a model tile always badges 3D, a final
 *  film badges FINAL FILM, everything else badges nothing. */
function badgeFor(item: MediaItem): { text: string; warn: boolean } | null {
  if (item.kind === 'model') return { text: '3D', warn: false }
  if (item.final) return { text: 'FINAL FILM', warn: true }
  return null
}

function TileBadge({ item }: { item: MediaItem }): JSX.Element | null {
  const badge = badgeFor(item)
  if (badge === null) return null
  return (
    <span style={{
      position: 'absolute', left: 6, top: 6,
      background: badge.warn
        ? stateWarnPrimary2
        : stateBusinessPrimaryBg2,
      color: badge.warn
        ? bgBase3
        : stateBusinessPrimary,
      borderRadius: 5, padding: '2px 6px',
      fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
    }}>{badge.text}</span>
  )
}

/** Image tiles sit on the base surface (no letterbox); everything else on
 *  the gradient stage. */
function tileBgFor(kind: Kind): string {
  if (kind === 'image') return bgBase2
  return 'linear-gradient(160deg, #1e293b 0%, #0f172a 100%)'
}

/**
 * 3D artifact view — resolves the file's viewer through the sidebar
 * registry (the glb viewer owns .glb/.gltf) and renders its component
 * with the gateway asset URL. Falls back to a download link when no
 * viewer claims the file.
 */
function ModelView({ item }: { item: MediaItem }): JSX.Element {
  const bs = getSidebarService()
  const match = bs?.matchFileViewer?.(item.file) as
    | { component?: React.ComponentType<{ mediaUrl?: string; path?: string }> }
    | undefined
  const Viewer = match?.component
  if (Viewer != null) {
    return (
      <div
        style={{ width: 'min(880px, 92vw)', height: 'min(620px, 72vh)', borderRadius: 8, overflow: 'hidden', background: bgBase2, cursor: 'default' }}
        onClick={(e) => { e.stopPropagation() }}
      >
        <Viewer mediaUrl={item.url} path={item.file} />
      </div>
    )
  }
  return (
    <a
      href={item.url}
      download={item.file}
      style={{ color: stateBusinessPrimary, fontSize: 14, cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation() }}
    >download {item.file}</a>
  )
}

function Overlay({ item, onClose }: { item: MediaItem; onClose: () => void }) {  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        background: bgOverlay2, display: 'flex',
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
              style={{ maxWidth: '94vw', maxHeight: '78vh', borderRadius: 8, background: bgBase1, cursor: 'default' }}
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
          : item.kind === 'model'
          ? (
              <ModelView item={item} />
            )
          : item.kind === 'image'
          ? (
              <img
                src={item.url}
                alt={item.file}
                style={{ maxWidth: '94vw', maxHeight: '78vh', borderRadius: 8, objectFit: 'contain', cursor: 'default' }}
                onClick={(e) => { e.stopPropagation() }}
              />
            )
          : null}
      <div style={{ color: labelPrimary2, fontSize: 13, maxWidth: '80vw', textAlign: 'center', lineHeight: 1.5, cursor: 'default' }}>
        <div style={{ fontWeight: 600 }}>{item.head}</div>
        <div style={{ opacity: 0.7 }}>{[item.time, item.file].filter(Boolean).join(' · ')}</div>
      </div>
      <div style={{ color: textTertiary3, fontSize: 12 }}>click anywhere or press Esc to close</div>
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
  /* TWO independent feeds (useFeed): runs and drafts each own their
   * fetch/decode/never-stale engine — one failing never blanks the other
   * (the drafts feed's error is deliberately not rendered; the runs view
   * stays fully usable). */
  const runsFeed = useFeed('/infer-media/runs', decodeRuns, { runs: [], errors: [] })
  const draftsFeed = useFeed('/infer-media/drafts', decodeDrafts, { drafts: [], errors: [] })
  const runs = runsFeed.data.runs
  const gatewayErrors = runsFeed.data.errors
  const drafts = draftsFeed.data.drafts
  const loading = runsFeed.loading
  /* uiError: action errors (wand/draft open) — kept separate from the
   * feed's transport error so a failed open never reads as a dead feed. */
  const [uiError, setUiError] = useState('')
  const error = runsFeed.error !== '' ? runsFeed.error : uiError
  const setError = setUiError
  const [cat, setCat] = useState<Cat>('all')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<MediaItem | null>(null)
  const [tab, setTab] = useState<'artifacts' | 'flows'>('artifacts')
  const load = runsFeed.reload

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
    const res = openWithDraft(draftId)
    if (res === 'no-seam') setError('Cards studio unavailable (deck plugin not loaded)')
    else if (res === 'refused') setError('Cards studio refused to open')
  }

  /** FLOW OPEN: click a draft row → the Cards studio opens with THAT
   *  card hydrated (same deck seam the run wand uses). The card is the
   *  queue-native object: refine it there, press Run when ready. */
  const openDraft = (draftId: string): void => {
    if (draftId === '') return
    const res = openWithDraft(draftId)
    if (res === 'no-seam') setError('Cards studio unavailable (deck plugin not loaded)')
    else if (res === 'refused') setError('Cards studio refused to open')
  }

  const items = useMemo(() => flatten(runs), [runs])
  /* TRUNCATION VISIBILITY (audit gap 6): the door stashes {listed,total}
   * on run rows the gateway capped — surface the count so a 3-of-40
   * listing never reads as data loss. */
  const truncatedRuns = useMemo(
    () => runs.filter((r) => r.truncated !== undefined && r.truncated.total > r.truncated.listed).length,
    [runs],
  )
  const counts = useMemo(() => {
    const c = { all: items.length, ...Object.fromEntries(KIND_ORDER.map((k) => [k, 0])) } as Record<Cat, number>
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
          border: '1px solid ' + (active ? stateBusinessPrimary : borderL2),
          background: active ? stateBusinessPrimaryBg1 : 'transparent',
          color: active ? stateBusinessPrimary : labelSecondary1,
          borderRadius: 999, padding: '3px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >{label} {counts[c]}</button>
    )
  }

  return (
    <PanelShell dataAttr="infer-media-panel">
      {/* ✦ CARDS — card replay: opens THE CARDS TAB with this run's exact
          card loaded (sidecar → draft_id → the deck canvas' native card
          view: intent, shots, fps, seed, ▶ Run through the queue door).
          No editor SPA — that page renders blank on this origin. */}
      <style>{'.im-tile{position:relative}.im-wand{position:absolute;right:6px;top:6px;z-index:3;opacity:0;transition:opacity .12s;display:flex;align-items:center;gap:4px;border:0;border-radius:6px;padding:4px 6px;background:var(--dsw-alias-fill-subtle,rgba(2,6,23,0.82));color:var(--dsw-alias-state-warn-primary,#fde68a);font-size:9px;font-weight:700;letter-spacing:.4px;cursor:pointer;font-family:inherit}.im-tile:hover .im-wand{opacity:1}.im-wand:hover{background:var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-bg-base,#422006)}'}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Infer Media</span>
        <Stat>
          {runs.length} runs · {items.length} artifacts{gatewayErrors.length > 0 ? ' · ' + gatewayErrors.length + ' gateway note' + (gatewayErrors.length > 1 ? 's' : '') : ''}{truncatedRuns > 0 ? ' · ' + truncatedRuns + ' capped' : ''}
        </Stat>
        <span style={{ flex: 1 }} />
        {/* FLOWS ↔ ARTIFACTS: the two faces of the archive — composed
            cards (drafts) vs rendered runs. Segmented like the cat chips. */}
        <span style={{ display: 'flex', gap: 4, padding: 2, border: '1px solid ' + borderL2, borderRadius: 999 }}>
          {(['flows', 'artifacts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t) }}
              style={{
                border: 0, borderRadius: 999, padding: '3px 10px', fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit',
                background: tab === t ? stateBusinessPrimaryBg1 : 'transparent',
                color: tab === t ? stateBusinessPrimary : labelSecondary1,
              }}
            >{t === 'flows' ? 'Flows ' + String(drafts.length) : 'Artifacts ' + String(items.length)}</button>
          ))}
        </span>
        <SearchInput value={search} onChange={setSearch} placeholder="search prompt, file\u2026" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {chip('all', 'All')}{KIND_ORDER.map((k) => chip(k, KIND_LABEL[k]))}
      </div>

      {tab === 'flows'
        ? (drafts.length === 0
            ? <Empty>no composed cards yet — build one in a chat.</Empty>
            : <div data-infer-media-drafts="1" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {drafts.map((d) => (
                  <button
                    key={d.draft_id ?? Math.random()}
                    onClick={() => { openDraft(d.draft_id ?? '') }}
                    data-draft={d.draft_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                      border: '1px solid ' + borderL2, borderRadius: 10, padding: '8px 12px',
                      background: gradientStage, cursor: 'pointer',
                      color: labelPrimary1, fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 15, lineHeight: 0, color: stateWarnPrimary1 }}>▸</span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.name || d.draft_id}
                      </span>
                      <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: labelSecondary2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.model || 'card'} · {d.draft_id}
                      </span>
                    </span>
                    {typeof d.source === 'string' && d.source !== ''
                      ? <span style={{ fontSize: 9, color: textTertiary2, border: '1px solid ' + borderL2, borderRadius: 6, padding: '2px 6px' }}>
                          {d.source.replace(/^https?:\/\//, '')}
                        </span>
                      : null}
                  </button>
                ))}
              </div>)
        : <GatewayErrors errors={gatewayErrors} />}
      {tab === 'artifacts' && (error !== ''
        ? <ErrorBanner>failed to load runs: {error}</ErrorBanner>
        : loading && items.length === 0
          ? <Empty>loading runs\u2026</Empty>
          : shown.length === 0
            ? <Empty>no artifacts match.</Empty>
            : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }}>
                  {shown.map((it) => (
                    <button
                      key={it.id}
                      className="im-tile"
                      onClick={() => { setPreview(it) }}
                      style={{
                        position: 'relative', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden',
                        border: '1px solid ' + borderL2, cursor: 'pointer', padding: 0,
                        background: tileBgFor(it.kind),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: textTertiary2,
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
                              position: 'absolute', right: 6, bottom: 6, background: fillSubtle2,
                              borderRadius: 6, padding: 3, lineHeight: 0, color: labelPrimary4,
                            }}><Glyph kind="video" size={14} /></span>
                          )
                        : null}
                      <TileBadge item={it} />
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
                        ? <span style={{ color: textTertiary1 }}><Glyph kind={it.kind} /></span>
                        : null}
                      <span style={{
                        position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 6px 4px',
                        background: gradientCaption,
                        fontSize: 10, lineHeight: 1.35, color: labelPrimary3,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {it.head !== '' ? it.head + ' \u2014 ' : ''}{[it.time, it.file].filter(Boolean).join(' · ')}
                      </span>
                    </button>
                  ))}
                </div>
              ))}

      {preview !== null ? <Overlay item={preview} onClose={() => { setPreview(null) }} /> : null}
    </PanelShell>
  )
}
