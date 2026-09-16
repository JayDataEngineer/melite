/**
 * MediaPanel — the native media archive tab (THE FULL PORT, 2026-09-11:
 * the deleted dsh-media package's panel, ported onto the gallery's own
 * host routes — every feature the migrations lost is here again).
 *
 * One grid over the gallery's runs route DIRECTLY (GET
 * /infer-gallery/runs, same-origin — the host rewrites run-relative
 * artifact names to its same-origin artifact route and serves the
 * 500-run window, the runs-window law). Everything renders with
 * NATIVE elements: <video controls autoPlay> in a fullscreen overlay,
 * <img>, <audio controls>. No iframe, no editor SPA dependency, no
 * asset-type resolver to fall through.
 *
 * Label law (operator-specified format):
 *   "first 48 chars of the prompt…" — Aug 28, 05:01 AM · filename.mp4
 * Runs with an empty prompt fall back to run name/flow.
 */
import * as React from 'react'
import { useMemo, useState } from 'react'
import { Modal, Pill, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { MediaDrilldown } from '../drilldown.tsx'
import { loadDraftOntoBench, loadRunOntoBench } from './bench-load.ts'

/** THE ESTATE-ARTIFACT ADDRESS (2026-09-10 regression fix): run artifacts
 *  live outside the DSH workspace, so no document owner can read them.
 *  The native seam for addressable non-workspace content is a resource
 *  address claimed by a tab type — the viewer tab claims
 *  `dsh-resource://estate-artifact/<b64url of the same-origin artifact
 *  URL>` (its own tab renders the mesh). The URL this panel embeds is
 *  its SAME-ORIGIN route path (fetchable from the body; no foreign
 *  origin ever leaks). The address FORMAT is the cross-plugin contract
 *  (both sides carry the 4-line codec — client bundles cannot import
 *  across plugins). When no viewer tab is loaded, openResource on the
 *  address is a no-op and the download link stays — the artifact must
 *  remain reachable either way. */
const ARTIFACT_PREFIX = 'dsh-resource://estate-artifact/'

function b64uEncode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function estateArtifactAddress(url: string): string {
  return ARTIFACT_PREFIX + b64uEncode(url)
}

/** The standard tab hook the seat injects into every body (local spelling
 *  of UseSidebarRightTabInfo — the actions a tab may take on itself). */
interface TabInfo {
  readonly tab: {
    readonly navigation: { readonly address: string }
    readonly actions: { openResource(address: string): void }
  }
}
import { decodeRuns, decodeDrafts } from './decode.ts'
import type { RunArtifact, RunRow } from './decode.ts'
import { useFeed } from './useFeed.ts'
import css from './overlay.module.css'
import {
  Empty,
  ErrorBanner,
  GatewayErrors,
  PanelShell,
  RefreshButton,
  SearchInput,
  Stat,
  gradientCaption,
  gradientStage,
} from './ui.tsx'
import { MEDIA_KINDS } from './media-kinds.ts'
import {
  bgBase1,
  bgBase2,
  bgBase3,
  borderL2,
  fillSubtle2,
  labelPrimary1,
  labelPrimary2,
  labelPrimary3,
  labelPrimary4,
  labelSecondary2,
  stateBusinessPrimary,
  stateBusinessPrimaryBg2,
  stateWarnPrimary1,
  stateWarnPrimary2,
  textTertiary1,
  textTertiary2,
  textTertiary3,
} from './ui.tokens.ts'

/** Media kinds — DERIVED from the client plane's typed SSOT
 *  (media-kinds.ts), never restated. Adding a kind = one entry; every
 *  classifier, chip, badge and glyph below reads this map (the Sep-6
 *  3D outage was three hand-kept copies). Parity with the estate's
 *  own vocabulary is pinned by the media-sidebar wall. */
type Kind = keyof typeof MEDIA_KINDS.kinds
/** JSON key order = classifier precedence (video beats image on a contradictory row). */
const KIND_ORDER = Object.keys(MEDIA_KINDS.kinds) as Kind[]
const KIND_LABEL = Object.fromEntries(
  KIND_ORDER.map((k) => [k, MEDIA_KINDS.kinds[k].label])
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
  KIND_ORDER.map((kind) => [kind, extRe(MEDIA_KINDS.kinds[kind].exts)])
) as Record<Kind, RegExp>
/** Numbered frame dumps (per-frame PNG exports) — noise in a run with 100+ frames. */
const FRAME_DUMP = /(^|_)\d{3,}_?\.png$/i

/* FILENAME CONTRACTS with the render lanes — declared once, used by name
 * (the Sep-6 audit's F5: magic stems and suffix regexes restated at every
 * use site drift silently). Pinned by the media-sidebar wall
 * (filename contracts single definition). */
/** Concatenated film = video WITHOUT a per-window suffix; window films
 *  carry it (video lanes emit `<stem>_w<idx>_<hash>.mp4`). */
const WINDOW_FILM = /_w\d+_[0-9a-f]+\.mp4$/
/** Poster siblings rendered beside a film, keyed by artifact stem. */
const POSTER_STEMS = [/^(.+)_last_frame\.png$/i, /^(.+)_poster\.png$/i]

/** Classifier — kind ORDER comes from the SSOT's key order; the
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
 * calls[0].text feeds tile labels (audit F8: the old raw cast trusted
 * any object shape). */
export function callsTextOf(params: unknown): string {
  if (params == null || typeof params !== 'object') return ''
  const calls = (params as { calls?: unknown }).calls
  if (!Array.isArray(calls) || calls.length === 0) return ''
  const text = (calls[0] as { text?: unknown } | null)?.text
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
}

function baseName(u: string): string {
  const clean = u.split('?')[0]
  const parts = clean.split('/')
  return parts[parts.length - 1]
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

/** Flatten the runs feed into media tiles (poster map, frame-flood
 *  guard, dedup by url, label law, FINAL FILM detection, newest sort). */
export function flatten(runs: RunRow[]): MediaItem[] {
  const items: MediaItem[] = []
  const seen = new Set<string>()
  for (const run of runs) {
    const arts = Array.isArray(run.artifacts) ? run.artifacts : []
    // Poster map: sibling *_last_frame.png / *_poster.png keyed by artifact stem.
    const posters = new Map<string, string>()
    for (const a of arts) {
      const n = a.name ?? baseName(a.url ?? '')
      const m = POSTER_STEMS.map((re) => n.match(re)).find((x): x is RegExpMatchArray => x !== null)
      if (m !== undefined && a.url) posters.set(m[1], a.url)
    }
    // Image-flood guard: runs that dump every frame would drown the grid —
    // when a run has >20 images, drop numbered frame dumps, keep the rest.
    // (Display-tier cap for gateways that don't truncate themselves; the
    // runs seat already caps LISTED images at policy.maxListedImages and
    // flags it via the run-row `truncated` marker — see media-kinds.ts.)
    const imageCount = arts.reduce((n, a) => (kindOf(a) === 'image' ? n + 1 : n), 0)
    const dropFrames = imageCount > 20
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

function TileBadge({ item }: { item: MediaItem }): React.JSX.Element | null {
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
 *  the gradient stage — the shared token-backed gradient (ui.tsx), never
 *  a restated literal (the single-site token law). */
function tileBgFor(kind: Kind): string {
  if (kind === 'image') return bgBase2
  return gradientStage
}

/**
 * The centered preview — DSH's Modal (headless), the FlowCards drilldown
 * ride verbatim: body portal, mask, Escape, aria-modal, and focus
 * handling are the primitive's, never ours. The 2026-09-10 operator
 * audit caught this as a handrolled portal (own keydown listener, own
 * fixed mask div, own z-index) — retired. Media sizing rides the
 * `.lightbox` class (overlay.module.css); inner flex + captions stay
 * as content styles. (THE LOST MODAL, restored with the full port —
 * the bare gallery opened a new browser tab instead.)
 */
function Overlay({ item, onClose, openArtifact }: { item: MediaItem; onClose: () => void; openArtifact: (item: MediaItem) => void }) {
  // ONE face everywhere (the operator's 1:1 order): the shared
  // MediaDrilldown — this surface only adapts its richer item (the
  // sidebar door keeps the gallery's full MediaItem currency).
  return <MediaDrilldown item={item} onClose={onClose} openArtifact={(drill) => { openArtifact(item) }} />
}

/** Sidebar tab glyph — exported for the (JSX-free) client entry. */
export function MediaTabIcon({ size }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.8" y="3" width="8.4" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.2 6.4 14 4.6v6.8l-3.8-1.8" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M3.6 5.4h1.6M3.6 8h1.6M3.6 10.6h1.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

export function MediaPanel({ useTabInfo, sessionId }: { useTabInfo?: () => TabInfo; sessionId?: string }): React.JSX.Element {
  /* TWO independent feeds (useFeed): runs and drafts each own their
   * fetch/decode/never-stale engine — one failing never blanks the other
   * (the drafts feed's error is deliberately not rendered; the runs view
   * stays fully usable). */
  /* THE FULL PORT's transport: the feeds ride the GALLERY's OWN host
   * routes — same-origin /infer-gallery/runs + /infer-gallery/drafts
   * (the host serves the 500-run window and rewrites artifact names
   * to its same-origin artifact route; the deleted dsh-media rode
   * /v1/flows/* and its dead /v1/assets artifact URLs). */
  const runsFeed = useFeed('/infer-gallery/runs', decodeRuns, { runs: [], errors: [] })
  const draftsFeed = useFeed('/infer-gallery/drafts', decodeDrafts, { drafts: [], errors: [] })
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
  /* The tab's own navigation face (the standard hook every tab body
   * receives). Hook-count law: the prop is stable per mount, so the
   * conditional call keeps one hook order for the panel's lifetime. */
  const tabInfo = useTabInfo !== undefined ? useTabInfo() : undefined
  /** Open one 3D artifact as the estate-artifact resource (ModelView). */
  const openArtifact = (item: MediaItem): void => {
    const open = tabInfo?.tab.actions.openResource
    if (open === undefined) {
      setUiError('3D view unavailable — the sidebar tab service is not loaded.')
      return
    }
    open(estateArtifactAddress(item.url))
  }
  const load = runsFeed.reload

  /** THE WAND (hunk 4, 2026-09-10; restore arm 2026-09-11): "recover
   *  the cards that made this media" restores the run's workflow onto
   *  THE BENCH and opens the cards tab on it. NOT a bare run-address
   *  open: the run view hydrates from the registry's LIVE runs only,
   *  so settled runs land on `runs/unknown-run` — the wand resolves
   *  the producing draft itself (row fast path, else the sidecar)
   *  and rides the bench CAS load. The window-global → DOM-claim →
   *  iframe relay it replaced (window.__meliteDeckOpenWithDraft)
   *  retired with the deck takeover. */
  const openCards = (item: MediaItem): void => {
    const open = tabInfo?.tab.actions.openResource
    if (open === undefined) {
      setError('Media Flow view unavailable — the sidebar tab service is not loaded.')
      return
    }
    const deps = { openResource: open, onError: setError, sessionId }
    // THE MUTABLE-BENCH REFUSAL (stroke 45): a bench-prefixed
    // draft_id names the LIVING bench — loading it serves whatever
    // the bench holds NOW, never the workflow that made this image.
    // Bench-born artifacts always carry their run id: restore from
    // the run's own record instead.
    if (item.draftId !== '' && !item.draftId.startsWith('bench-')) {
      void loadDraftOntoBench(item.draftId, deps)
      return
    }
    void loadRunOntoBench(item.runId, deps)
  }

  /** FLOW OPEN (hunk 4): a draft row loads onto THE BENCH (the shared
   *  state both authors edit) and opens the cards tab — bench-load.ts. */
  const openDraft = (draftId: string): void => {
    if (draftId === '') return
    const open = tabInfo?.tab.actions.openResource
    if (open === undefined) {
      setError('Media Flow view unavailable — the sidebar tab service is not loaded.')
      return
    }
    void loadDraftOntoBench(draftId, { openResource: open, onError: setError, sessionId })
  }

  const items = useMemo(() => flatten(runs), [runs])
  /* TRUNCATION VISIBILITY (audit gap 6): the route stashes {listed,total}
   * on run rows the seat capped — surface the count so a 3-of-40
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

  /* Category chips ride the DSH Pill 1:1 (active/onClick/children —
   * the handrolled bordered-button replica died here 2026-09-09: the
   * panel runs inside the DSH host, so the DSW pill chrome IS the
   * native look. The flows/artifacts segmented control stays custom —
   * DSH ships no segmented atom.) */
  const chip = (c: Cat, label: string): React.JSX.Element => {
    return (
      <Pill
        key={c}
        active={cat === c}
        onClick={() => { setCat(c) }}
      >{label} {counts[c]}</Pill>
    )
  }

  return (
    <PanelShell dataAttr="infer-media-panel">
      {/* ✦ CARDS — card replay: opens THE CARDS TAB with this run's exact
          card loaded (sidecar → draft_id → the deck canvas' native card
          view: intent, shots, fps, seed, ▶ Run through the queue door).
          No editor SPA — that page renders blank on this origin. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Infer Media</span>
        <Stat>
          {runs.length} runs · {items.length} artifacts{gatewayErrors.length > 0 ? ' · ' + gatewayErrors.length + ' gateway note' + (gatewayErrors.length > 1 ? 's' : '') : ''}{truncatedRuns > 0 ? ' · ' + truncatedRuns + ' capped' : ''}
        </Stat>
        <span style={{ flex: 1 }} />
        {/* FLOWS ↔ ARTIFACTS: the two faces of the archive — composed
            cards (drafts) vs rendered runs. Two Pills (DSH owns the
            selected chrome); the bordered segmented wrapper died with
            the handrolled chips — DSH ships no segmented atom and the
            wrapper's only job was that look. */}
        <span style={{ display: 'flex', gap: 4 }}>
          {(['flows', 'artifacts'] as const).map((t) => (
            <Pill
              key={t}
              active={tab === t}
              onClick={() => { setTab(t) }}
            >{t === 'flows' ? 'Flows ' + String(drafts.length) : 'Artifacts ' + String(items.length)}</Pill>
          ))}
        </span>
        <SearchInput value={search} onChange={setSearch} placeholder="search prompt, file…" />
        <RefreshButton loading={loading} onClick={load} />
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
          ? <Empty>loading runs…</Empty>
          : shown.length === 0
            ? <Empty>no artifacts match.</Empty>
            : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }}>
                  {shown.map((it) => (
                    <button
                      key={it.id}
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
                      {/* The wand stays a SPAN, not a DSH Button: the
                        * tile itself is a <button> and button-in-button
                        * is invalid DOM (the span+role predates this
                        * port for exactly that reason). What DSH owns
                        * here is the bubble — Tooltip replaces the
                        * native `title` (same copy), aria-label names
                        * the action. The wand restores the run's
                        * workflow onto the bench and opens the cards
                        * tab on it, so it is always live. Every tile
                        * carries its run id (decode drops id-less rows),
                        * so the wand rides every tile. */}
                      <Tooltip label="Open as cards — this run, live in the cards tab">
                        <span
                          role="button"
                          tabIndex={0}
                          className={css.wand}
                          aria-label="Open as cards — this run"
                          onClick={(e) => {
                            e.stopPropagation()
                            openCards(it)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.stopPropagation()
                              openCards(it)
                            }
                          }}
                        >✦ CARDS</span>
                      </Tooltip>
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

      {preview !== null ? <Overlay item={preview} onClose={() => { setPreview(null) }} openArtifact={openArtifact} /> : null}
    </PanelShell>
  )
}
