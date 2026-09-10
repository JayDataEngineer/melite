/**
 * MediaPanel — the native media archive tab.
 *
 * One grid over the runs door DIRECTLY (GET /v1/flows/runs?limit=500,
 * same-origin — the estate collapse deleted the host-side merge). Everything renders with NATIVE elements: <video controls
 * autoPlay> in a fullscreen overlay, <img>, <audio controls>. No iframe, no
 * editor SPA dependency, no asset-type resolver to fall through.
 *
 * Label law (operator-specified format):
 *   "first 48 chars of the prompt…" — Aug 28, 05:01 AM · filename.mp4
 * Runs with an empty prompt fall back to run name/flow.
 */
import * as React from 'react'
import { useMemo, useState } from 'react'
import { Modal, Pill, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { cardsRunAddress, loadDraftOntoBench } from './bench-load.ts'

/** THE ESTATE-ARTIFACT ADDRESS (2026-09-10 regression fix): run artifacts
 *  live on the estate gateway, outside the DSH workspace, so no document
 *  owner can read them. The native seam for addressable non-workspace
 *  content is a resource address claimed by a tab type — dsh-glb-viewer
 *  claims `dsh-resource://estate-artifact/<b64url of the same-origin
 *  artifact URL>` (its own tab renders the mesh). The URL this panel
 *  embeds is its SAME-ORIGIN proxy path (fetchable from the body; the
 *  gateway origin never leaks). The address FORMAT is the cross-plugin
 *  contract (both sides carry the 4-line codec — client bundles cannot
 *  import across plugins); dsh-glb-viewer/src/client.js is the other side.
 */
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
import type { DraftRow, RunArtifact, RunRow } from './decode.ts'
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
import MEDIA_KINDS from '../../media-kinds.json'
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
 * 3D artifact view — hands the artifact to the sidebar as a RESOURCE
 * (estate-artifact address, claimed by dsh-glb-viewer's tab type; the
 * mesh renders in the right panel, orbitable beside the run list).
 * The download link stays: when the viewer plugin is absent no tab type
 * claims the address and openResource is a no-op — the artifact must
 * still be reachable.
 */
function ModelView({ item, openArtifact }: { item: MediaItem; openArtifact: (item: MediaItem) => void }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <a
        role="button"
        tabIndex={0}
        style={{ color: stateBusinessPrimary, fontSize: 14, cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); openArtifact(item) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); openArtifact(item) } }}
      >open 3D view in sidebar</a>
      <a
        href={item.url}
        download={item.file}
        style={{ color: textTertiary3, fontSize: 13, cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation() }}
      >download {item.file}</a>
    </div>
  )
}

/**
 * The centered preview — DSH's Modal (headless), the FlowCards drilldown
 * ride verbatim: body portal, mask, Escape, aria-modal, and focus
 * handling are the primitive's, never ours. The 2026-09-10 operator
 * audit caught this as a handrolled portal (own keydown listener, own
 * fixed mask div, own z-index) — retired. Media sizing rides the
 * `.lightbox` class (overlay.module.css); inner flex + captions stay
 * as content styles.
 */
function Overlay({ item, onClose, openArtifact }: { item: MediaItem; onClose: () => void; openArtifact: (item: MediaItem) => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title={item.file || 'media preview'}
      headless
      className={css.lightbox}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
        {item.kind === 'video'
          ? (
              <video
                src={item.url}
                controls
                autoPlay
                playsInline
                style={{ maxWidth: '94vw', maxHeight: '78vh', borderRadius: 8, background: bgBase1 }}
              />
            )
          : item.kind === 'audio'
            ? (
                <audio
                  src={item.url}
                  controls
                  autoPlay
                  style={{ width: 'min(560px, 90vw)' }}
                />
              )
            : item.kind === 'model'
            ? (
                <ModelView item={item} openArtifact={openArtifact} />
              )
            : item.kind === 'image'
            ? (
                <img
                  src={item.url}
                  alt={item.file}
                  style={{ maxWidth: '94vw', maxHeight: '78vh', borderRadius: 8, objectFit: 'contain' }}
                />
              )
            : null}
        <div style={{ color: labelPrimary2, fontSize: 13, maxWidth: '80vw', textAlign: 'center', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600 }}>{item.head}</div>
          <div style={{ opacity: 0.7 }}>{[item.time, item.file].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ color: textTertiary3, fontSize: 12 }}>Esc or click the mask to close</div>
      </div>
    </Modal>
  )
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

export function MediaPanel({ useTabInfo }: { useTabInfo?: () => TabInfo }): React.JSX.Element {
  /* TWO independent feeds (useFeed): runs and drafts each own their
   * fetch/decode/never-stale engine — one failing never blanks the other
   * (the drafts feed's error is deliberately not rendered; the runs view
   * stays fully usable). */
  /* THE ESTATE COLLAPSE (E4, 1:1): the feed rides the DOOR directly —
   * same-origin /v1/flows/runs on this host's own webServer (the
   * melite-estate bundle mounts it in-process). The handrolled
   * host-side merge/proxy door is deleted. limit=500 is the runs-window
   * law (the door's hard max — always pull it; a smaller window lets
   * sidecar floods push artifact rows out of the listing). */
  const runsFeed = useFeed('/v1/flows/runs?limit=500', decodeRuns, { runs: [], errors: [] })
  const draftsFeed = useFeed('/v1/flows/drafts', decodeDrafts, { drafts: [], errors: [] })
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

  /** THE WAND (hunk 4, 2026-09-10): "recover the cards that made this
   *  media" is now ONE native call — openResource on the cards tab's
   *  run address (plan §5). The window-global → DOM-claim → iframe
   *  relay it replaced (window.__meliteDeckOpenWithDraft) retired with
   *  the deck takeover; a run is addressable on its own — the draft
   *  link no longer gates the gesture. */
  const openCards = (runId: string): void => {
    if (runId === '') return
    const open = tabInfo?.tab.actions.openResource
    if (open === undefined) {
      setError('Cards view unavailable — the sidebar tab service is not loaded.')
      return
    }
    open(cardsRunAddress(runId))
  }

  /** FLOW OPEN (hunk 4): a draft row loads onto THE BENCH (the shared
   *  state both authors edit) and opens the cards tab — bench-load.ts. */
  const openDraft = (draftId: string): void => {
    if (draftId === '') return
    const open = tabInfo?.tab.actions.openResource
    if (open === undefined) {
      setError('Cards view unavailable — the sidebar tab service is not loaded.')
      return
    }
    void loadDraftOntoBench(draftId, { openResource: open, onError: setError })
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

  /* Category chips ride the DSH Pill 1:1 (active/onClick/children —
   *  the handrolled bordered-button replica died here 2026-09-09: the
   *  panel runs inside the DSH host, so the DSW pill chrome IS the
   *  native look. The flows/artifacts segmented control stays custom —
   *  DSH ships no segmented atom.) */
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
                            /* The wand stays a SPAN, not a DSH Button: the
                             * tile itself is a <button> and button-in-button
                             * is invalid DOM (the span+role predates this
                             * port for exactly that reason). What DSH owns
                             * here is the bubble — Tooltip replaces the
                             * native `title` (same copy), aria-label names
                             * the action. Hunk 4: the run itself is the
                             * addressable card view (draft link no longer
                             * gates), so the wand is always live — the dim
                             * twin (.wandDim) retired with the gate. */
                            <Tooltip label="Open as cards — this run, live in the cards tab">
                              <span
                                role="button"
                                tabIndex={0}
                                className={css.wand}
                                aria-label="Open as cards — this run"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openCards(it.runId)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.stopPropagation()
                                    openCards(it.runId)
                                  }
                                }}
                              >✦ CARDS</span>
                            </Tooltip>
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

      {preview !== null ? <Overlay item={preview} onClose={() => { setPreview(null) }} openArtifact={openArtifact} /> : null}
    </PanelShell>
  )
}
