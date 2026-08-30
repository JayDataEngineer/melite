/**
 * assets-tab — RAY MEDIA + RAY CARDS in the DSH right sidebar
 * (dsh-better-sidebar). TWO tabs, because they were TWO things
 * (operator 2026-08-22: "media and the cards to make action cards were
 * different"):
 *
 *   Melite Media — the MEDIA ARCHIVE (what we made): an iframe of
 *     /editor/?meliteAssets=media rendering the REAL SidebarBody (search,
 *     sort, upload, category groups, virtualized). Tiles drag the asset
 *     MIME (application/tech-noir-asset) — drop attaches to a card slot
 *     or spawns an Ops input card.
 *   Melite Cards — the CAPABILITY LIBRARY (what we can make): an iframe of
 *     /editor/?meliteAssets=cards rendering the REAL LibrarySidebar
 *     (search, genre groups, provenance badges, studio tiles). Tiles
 *     drag the capability MIME (application/tech-noir-capability) —
 *     drop lands an action card.
 *   Melite ComfyUI (2026-08-25) — the ComfyUI MANAGEMENT surface: an iframe
 *     of /editor/?meliteAssets=comfy rendering the REAL ComfyManagerRailPanel
 *     (backend endpoint door + Manager upkeep readout/actions) — the old
 *     standalone ComfyUI-Manager plugin, mirrored as a third tab.
 *   Melite Pipelines (2026-08-25) — the PIPELINE TEMPLATES: an iframe of
 *     /editor/?meliteAssets=pipelines rendering the REAL PipelinesSection
 *     under its own search (PipelinesPane). Click loads a spec in-frame;
 *     the row DRAGS application/tech-noir-pipeline — dropping it on the
 *     deck canvas or chat cards lands the WHOLE spec as its action cards
 *     (the drag is what crosses frames; clicks cannot).
 *
 * THE REAL components, MOVED — no reimplementation. Native HTML5 drags
 * cross same-origin frames, so tiles drag from these panels onto the
 * Cards takeover canvas and the chat cards. Both registered on the
 * PUBLIC registry (ctx.betterSidebar.registerTab); DSH theming is LIVE
 * via the ONE embed-bridge each tab runs on its iframe.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { startEmbedBridge, type EmbedHandle } from './embed-bridge.ts'
import css from './deck.module.css'

/** One tab body: an iframe host for one REAL sidebar + the theme bridge. */
function SidebarFrame({ src, title, marker }: { src: string; title: string; marker: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  useEffect(() => {
    if (frameRef.current === null) return
    const bridge: EmbedHandle = startEmbedBridge(frameRef.current)
    return () => { bridge.stop() }
  }, [])
  return (
    <iframe
      ref={frameRef}
      src={src}
      title={title}
      className={css.assetsFrame}
      data-melite-frame={marker}
    />
  )
}

/**
 * MediaPanel — the media archive tab + the FULLSCREEN preview overlay.
 * A tile click inside the frame posts melite-preview-open; the overlay is a
 * DEDICATED iframe (/editor/?melitePreview=<id>) portal'd to document.body —
 * OUTSIDE the animated panel, whose slide transform is the
 * containing-block trap that ate two earlier attempts (a fixed iframe
 * inside the panel parks off-screen; MOVING the live frame reloads it
 * and kills the dialog). The overlay page renders the REAL
 * AssetPreviewDialog alone; its own bg-black/90 backdrop dims the page.
 *
 * PERSISTENT FRAME + NAVIGATE (2026-08-25 "huge lag loading assets"):
 * remounting /editor/?melitePreview=<id> per click booted the WHOLE editor
 * app every time — seconds over a tailscale link. The iframe now mounts
 * ONCE on the first preview and STAYS ALIVE: later previews post
 * melite-preview-navigate {assetId} into it and the page swaps assets
 * in-place (its ready echo carries the asset id). Close only HIDES the
 * frame (opacity 0); reopen of an already-shown asset is instant.
 *
 * ATOMIC REVEAL (2026-08-25 "blinks black, then loads the rest in" +
 * "'Unsupported Media' before the video loads"): while a target asset is
 * not yet confirmed, the frame holds at opacity 0 — boot frames and media
 * loads happen off-screen; 'melite-preview-ready' (echoing the asset id)
 * flips opacity to 1 in one transition. Host failsafe 7s pairs the page's
 * own 5s: a dead iframe still fails VISIBLE.
 */
/** One run row from the gateway runs list (wire shape 2026-08-27). */
interface RunArtifact { url?: string; type?: string; name?: string; size?: number }
interface RunRow {
  run_id: string
  name?: string
  pipeline?: string
  status?: string
  created_at?: number
  prompt?: string
  thumbnail?: string
  artifacts?: RunArtifact[]
}

/** A _pipeline.json sidecar doc (flat generation shape). */
interface PipelineDoc {
  model?: string
  prompt?: string
  seed?: number
  [k: string]: unknown
}

/** Keys of the sidecar that are bookkeeping, not generation parameters. */
const DOC_META_KEYS = new Set(['run_id', 'created', 'status', 'error', 'stages', 'yaml', 'thumbnail', 'name'])

/**
 * ParamsCard — the params round-trip (operator 2026-08-27: "this icon brings
 * back the parameters of the generation through the card system on the card
 * panel"). One icon per media item; it opens the run's generation spec as an
 * editable card — model/seed/prompt plus every non-meta sidecar key — and
 * the RUN button submits through the card system's own door
 * (POST /melite-deck/start -> gateway /v1/pipelines/start), so a re-run is
 * a first-class new run, identical to any deck-launched card.
 */
function ParamsCard({ run, doc, onClose, onStarted }: {
  run: RunRow
  doc: PipelineDoc
  onClose(): void
  onStarted(runId: string): void
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const [k, v] of Object.entries(doc)) {
      if (DOC_META_KEYS.has(k)) continue
      init[k] = typeof v === 'string' ? v : String(v)
    }
    return init
  })
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const start = (): void => {
    setBusy(true)
    setNote(null)
    const payload: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(values)) {
      if (v === '') continue
      const t = v.trim()
      payload[k] = /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : v
    }
    fetch('/melite-deck/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (r) => {
        const text = await r.text()
        if (!r.ok) throw new Error(`HTTP ${String(r.status)}: ${text.slice(0, 160)}`)
        const d = JSON.parse(text) as { run_id?: string }
        if (typeof d.run_id === 'string') {
          setNote(`run started: ${d.run_id}`)
          onStarted(d.run_id)
        } else {
          setNote(`accepted (no run id): ${text.slice(0, 120)}`)
        }
      })
      .catch((e: unknown) => { setNote(`failed: ${e instanceof Error ? e.message : String(e)}`) })
      .finally(() => { setBusy(false) })
  }

  const fields = Object.keys(values)
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2147483000, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => { e.stopPropagation() }} style={{ width: 'min(560px, 94vw)', maxHeight: '88vh', overflowY: 'auto', background: '#16181d', border: '1px solid rgba(128,128,128,.5)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, color: '#e8e8e8', fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <strong>Re-run parameters</strong>
          <span style={{ color: '#9aa', fontSize: 11 }}>{run.name ?? run.pipeline ?? run.run_id}</span>
        </div>
        {fields.map((k) => (
          <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ color: '#9aa', fontSize: 11 }}>{k}</span>
            {k === 'prompt'
              ? <textarea rows={5} value={values[k]} onChange={(e) => { setValues({ ...values, [k]: e.target.value }) }} style={{ resize: 'vertical' }} />
              : <input value={values[k]} onChange={(e) => { setValues({ ...values, [k]: e.target.value }) }} />}
          </label>
        ))}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={start} disabled={busy || fields.length === 0} style={{ fontWeight: 600 }}>
            {busy ? 'starting…' : '▶ Run again'}
          </button>
          <button onClick={() => {
            void navigator.clipboard?.writeText(JSON.stringify(values, null, 2)).catch(() => {})
            setNote('parameters copied')
          }}>Copy JSON</button>
          <button onClick={onClose}>Close</button>
          {note !== null && <span style={{ fontSize: 11, color: note.startsWith('failed') ? '#f87' : '#8d8' }}>{note}</span>}
        </div>
      </div>
    </div>
  )
}

/**
 * MediaPanel — NATIVE media archive (2026-08-27). The old panel iframed
 * /editor/?meliteAssets=media, but the editor SPA was DELETED (2026-08-26)
 * — every asset tab has pointed at a 404 since. This one renders the REAL
 * runs from the gateway list (/infer-gallery/runs — the inference.cpp
 * extension route, same origin) as a poster grid; a click plays the run's
 * video artifact in a fullscreen native <video> overlay (click to close).
 * No iframe, no editor boot, works over the tailscale link.
 */
function MediaPanel() {
  const [runs, setRuns] = useState<RunRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [play, setPlay] = useState<{ url: string; title: string } | null>(null)
  /** The open params card: which run + its sidecar doc. */
  const [card, setCard] = useState<{ run: RunRow; doc: PipelineDoc } | null>(null)
  /** The REAL action cards: an editor cards embed for the run's draft. */
  const [cards, setCards] = useState<{ draftId: string; title: string } | null>(null)

  /** Icon handler: h3-timeline runs reopen the REAL timeline action card
   * (the editor cards embed — the same clickable/zoomable tiles the chat
   * renders, draft draft-timeline-h3 served by the inference gateway);
   * anything else falls back to the editable params card. */
  const openCard = (r: RunRow): void => {
    const model = `${r.pipeline ?? ''} ${r.name ?? ''}`.toLowerCase()
    if (model.includes('h3') || model.includes('timeline')) {
      setCards({ draftId: 'draft-timeline-h3', title: r.name ?? r.pipeline ?? r.run_id })
      return
    }
    fetch(`/infer-gallery/pipeline?run_id=${encodeURIComponent(r.run_id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${String(res.status)}`)
        return await res.json() as { pipeline?: PipelineDoc }
      })
      .then((d) => {
        const doc = d.pipeline ?? {}
        if (typeof doc !== 'object' || doc === null || Object.keys(doc).length === 0) {
          throw new Error('empty sidecar')
        }
        setCard({ run: r, doc })
      })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)) })
  }

  const load = (): void => {
    setLoading(true)
    setError(null)
    fetch('/infer-gallery/runs')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${String(r.status)}`)
        return await r.json() as { runs?: RunRow[] }
      })
      .then((d) => {
        setRuns(Array.isArray(d.runs) ? d.runs : [])
        setLoading(false)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid rgba(128,128,128,.35)' }}>
        <strong>{String(runs.length)} items</strong>
        <button onClick={load} disabled={loading} style={{ fontSize: 11 }}>
          {loading ? 'loading…' : 'refresh'}
        </button>
        {error !== null && <span style={{ color: '#f87', fontSize: 11 }}>{error}</span>}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 8, alignContent: 'start' }}>
        {runs.map((r) => {
          const vid = (r.artifacts ?? []).find((a) => a.type === 'video' && typeof a.url === 'string')
          const url = vid !== undefined && typeof vid.url === 'string' ? vid.url : ''
          const title = r.name ?? r.pipeline ?? r.run_id
          return (
            <div
              key={r.run_id}
              title={r.prompt ?? title}
              onClick={() => { if (url !== '') setPlay({ url, title: `${title} · ${vid?.name ?? ''}` }) }}
              style={{ cursor: url !== '' ? 'pointer' : 'default', border: '1px solid rgba(128,128,128,.4)', borderRadius: 6, overflow: 'hidden', background: 'rgba(0,0,0,.35)', position: 'relative' }}
            >
              {typeof r.thumbnail === 'string' && r.thumbnail !== '' && (
                <img src={r.thumbnail} alt='' loading='lazy'
                     style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }} />
              )}
              {/* The params round-trip icon (top-right of every tile). */}
              <button
                title='bring parameters back as a card'
                onClick={(e) => { e.stopPropagation(); openCard(r) }}
                style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, padding: 0, border: '1px solid rgba(128,128,128,.6)', borderRadius: 5, background: 'rgba(10,12,16,.75)', color: '#dde', fontSize: 12, lineHeight: '22px', cursor: 'pointer' }}
              >⎋</button>
              <div style={{ padding: '4px 6px', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title} · {r.status ?? '?'}
              </div>
            </div>
          )
        })}
      </div>
      {play !== null && createPortal(
        <div
          onClick={() => { setPlay(null) }}
          style={{ position: 'fixed', inset: 0, zIndex: 2147483000, background: 'rgba(0,0,0,.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <div style={{ color: '#eee', fontSize: 13, padding: '0 16px', maxWidth: '90vw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {play.title} — click anywhere to close
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* The same params icon, beside the film — open the card without closing the video. */}
            <button
              title='bring parameters back as a card'
              onClick={(e) => {
                e.stopPropagation()
                const hit = runs.find((x) => `${x.name ?? x.pipeline ?? x.run_id} · ${x.artifacts?.find(a => a.type === 'video')?.name ?? ''}` === play.title)
                if (hit !== undefined) openCard(hit)
              }}
              style={{ padding: '6px 12px', fontSize: 12, border: '1px solid rgba(128,128,128,.6)', borderRadius: 6, background: 'rgba(20,22,28,.85)', color: '#dde', cursor: 'pointer' }}
            >⎋ parameters</button>
          </div>
          {/* stopPropagation so the video controls stay usable */}
          <video src={play.url} controls autoPlay onClick={(e) => { e.stopPropagation() }} style={{ maxWidth: '92vw', maxHeight: '82vh' }} />
        </div>,
        document.body,
      )}
      {/* The params round-trip card — opened from either icon. */}
      {card !== null && createPortal(
        <ParamsCard
          run={card.run}
          doc={card.doc}
          onClose={() => { setCard(null) }}
          onStarted={() => { window.setTimeout(load, 1500) }}
        />,
        document.body,
      )}
      {/* The REAL action cards — the editor cards embed, same surface the
       * chat mounts: clickable tiles, zoom drilldown, params on each card,
       * Run per card. Drafts stream from /v1/pipelines/drafts/<id> through
       * the deck proxy (byte-identical since the content-length fix). */}
      {cards !== null && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 2147483000, background: 'rgba(0,0,0,.94)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
            <strong style={{ color: '#eee', fontSize: 13 }}>{cards.title} — action cards</strong>
            <span style={{ color: '#9a9', fontSize: 11 }}>draft {cards.draftId}</span>
            <button
              onClick={() => { setCards(null) }}
              style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 12, border: '1px solid rgba(128,128,128,.6)', borderRadius: 6, background: 'rgba(20,22,28,.85)', color: '#dde', cursor: 'pointer' }}
            >close ✕</button>
          </div>
          <iframe
            src={`/editor/?meliteCards=${encodeURIComponent(cards.draftId)}`}
            title='pipeline action cards'
            style={{ flex: 1, width: '100%', border: 'none', background: '#0b0d11' }}
          />
        </div>,
        document.body,
      )}
    </div>
  )
}

function MediaPanelLegacy() {
  /** The persistent overlay frame: built once from the FIRST preview. */
  const [frame, setFrame] = useState<{ src: string; bootAssetId: string } | null>(null)
  /** The asset the user wants on screen right now (null = closed). */
  const [target, setTarget] = useState<string | null>(null)
  /** The last asset the overlay page confirmed ready (echoed id). */
  const [readyId, setReadyId] = useState<string | null>(null)
  const frameRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    const onMsg = (e: MessageEvent): void => {
      const d = e.data as { type?: string; asset?: { id?: string }; assetId?: string } | null
      if (d === null || typeof d !== 'object') return
      if (d.type === 'melite-preview-open' && typeof d.asset?.id === 'string') {
        const id = d.asset.id
        console.warn('[MediaPanel] open', id.split('/').pop())
        setFrame((f) => f ?? { src: '/editor/?melitePreview=' + encodeURIComponent(id), bootAssetId: id })
        setTarget(id)
      } else if (d.type === 'melite-preview-close') {
        console.warn('[MediaPanel] close')
        // HIDE, don't unmount — the booted page IS the latency fix.
        setTarget(null)
      } else if (d.type === 'melite-preview-ready') {
        // The inner echoes which asset settled; superseded navigations are
        // ignored until their own ready arrives.
        console.warn('[MediaPanel] ready echo', d.assetId)
        if (typeof d.assetId === 'string') setReadyId(d.assetId)
      }
    }
    window.addEventListener('message', onMsg)
    return () => { window.removeEventListener('message', onMsg) }
  }, [])

  // Navigate the LIVING frame whenever the target diverges from what it
  // last confirmed — but never before its first boot settled (a navigate
  // posted into a half-booted page would be lost).
  useEffect(() => {
    console.warn('[MediaPanel] nav-effect', JSON.stringify({ target, readyId }))
    if (target === null || readyId === null || readyId === target) return
    const win = frameRef.current?.contentWindow
    console.warn('[MediaPanel] posting navigate to', win ? 'live win' : 'NO WIN')
    win?.postMessage(
      { type: 'melite-preview-navigate', assetId: target },
      window.location.origin,
    )
  }, [target, readyId])

  // Host-side failsafe: reveal even if the inner page never signals.
  useEffect(() => {
    if (target === null || readyId === target) return
    const t = window.setTimeout(() => setReadyId(target), 7000)
    return () => window.clearTimeout(t)
  }, [target, readyId])

  const revealed = target !== null && readyId === target
  return (
    <>
      <SidebarFrame src="/editor/?meliteAssets=media" title="Melite Media" marker="media" />
      {frame !== null && createPortal(
        <iframe
          ref={frameRef}
          src={frame.src}
          title="Melite Media preview"
          style={{
            position: 'fixed',
            inset: '0',
            width: '100vw',
            height: '100vh',
            border: '0',
            zIndex: 2147483000,
            background: '#000',
            opacity: revealed ? 1 : 0,
            transition: revealed ? 'opacity 140ms ease-out' : 'none',
            pointerEvents: revealed ? 'auto' : 'none',
          }}
        />,
        document.body,
      )}
    </>
  )
}
const CardsPanel = () => <SidebarFrame src="/editor/?meliteAssets=cards" title="Melite Cards" marker="cards" />
const ComfyPanel = () => <SidebarFrame src="/editor/?meliteAssets=comfy" title="Melite ComfyUI" marker="comfy" />
const PipelinesPanel = () => <SidebarFrame src="/editor/?meliteAssets=pipelines" title="Melite Pipelines" marker="pipelines" />

/** The picture glyph — the media archive (what we made). */
function MediaIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5.6" cy="6.4" r="1" fill="currentColor" />
      <path d="M2.6 11.4l3.2-3.2 2.4 2.4 2.2-2.2 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The stacked-cards glyph — the capability library (action cards). */
function CardsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.5" y="2.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="var(--dsw-alias-bg-base, #17171c)" />
    </svg>
  )
}

/** The server-rack glyph — ComfyUI management (the GPU backend + its upkeep). */
function ComfyIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="4.6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="2.5" y="8.9" width="11" height="4.6" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5.1" cy="4.8" r="0.9" fill="currentColor" />
      <circle cx="5.1" cy="11.2" r="0.9" fill="currentColor" />
      <path d="M8.2 4.8h3.2M8.2 11.2h3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

/** The connected-nodes glyph — pipeline templates (one spec, N steps). */
function PipelinesIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2.5" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9.5" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 6.5v3a2 2 0 0 0 2 2H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

interface TabCtx {
  effect(fn: () => void, name?: string): unknown
  betterSidebar: {
    registerTab(tab: {
      id: string
      title(): string
      icon(size: number): React.ReactNode
      order: number
      single: boolean
      component: React.ComponentType<Record<string, unknown>>
    }): unknown
    /** Dock controls (optional — older host builds may omit them). */
    openTab?(seed: { type: string }): unknown
    getSnapshot?(): { bottomOpen?: boolean; bottomOpenedOnce?: boolean } | undefined
  }
}

function register(ctx: TabCtx, id: string, title: string, order: number, icon: (size: number) => React.ReactNode, component: React.ComponentType<Record<string, unknown>>): void {
  ctx.effect(() => {
    const dispose = ctx.betterSidebar.registerTab({
      id,
      title: () => title,
      icon,
      order,
      single: true,
      component,
    })
    return typeof dispose === 'function' ? dispose : () => {}
  }, 'melite-card-deck: ' + id + ' tab')
}

/** Register ALL FOUR tabs on the better-sidebar registry. */
export function registerRayAssetsTab(ctx: TabCtx): void {
  // 2026-08-27 (rev 2): the media tab mounts the EDITOR EMBED again
  // (MediaPanelLegacy → /editor/?meliteAssets=media → the categorical
  // archive: MEDIA / Images / Video / Audio). The native MediaPanel
  // (run rows from /infer-gallery/runs) was built on the belief the
  // editor SPA was deleted — it is NOT: web/editor dist serves at
  // :3080/editor/ (embeds render, QA'd). Operator verdict on the runs
  // list: "the [REDACTED 2026-11-05] / just the video slop, not the nice categories".
  register(ctx, 'melite-card-deck:media', 'Melite Media', 60, (s) => <MediaIcon size={s} />, MediaPanelLegacy as unknown as React.ComponentType<Record<string, unknown>>)
  register(ctx, 'melite-card-deck:cards', 'Melite Cards', 61, (s) => <CardsIcon size={s} />, CardsPanel as unknown as React.ComponentType<Record<string, unknown>>)
  register(ctx, 'melite-card-deck:comfy', 'Melite ComfyUI', 62, (s) => <ComfyIcon size={s} />, ComfyPanel as unknown as React.ComponentType<Record<string, unknown>>)
  register(ctx, 'melite-card-deck:pipelines', 'Melite Pipelines', 63, (s) => <PipelinesIcon size={s} />, PipelinesPanel as unknown as React.ComponentType<Record<string, unknown>>)

  // DOCK REACHABILITY SELF-HEAL (2026-08-26 "can no longer press the right
  // sidebar open button"): the tab strip docks in better-sidebar's BOTTOM
  // panel, whose openness is SESSION-scoped localStorage (bottomOpen boots
  // false). After a host restart lands the user in a fresh session, the
  // dock stays collapsed and these very buttons sit below the viewport.
  // Raise it ONCE per session (bottomOpenedOnce latches) — afterwards the
  // user's own open/closed choice persists and we never touch it again.
  // SIDEBAR AUTO-OPEN (2026-08-26 "can no longer press the right sidebar open
  // button"): better-sidebar 0.15 moved registered-tab launchers into the
  // panel's "+ New tab" menu and boots both the panel and its bottom dock
  // closed on a fresh session — the buttons the user knew are simply not on
  // screen anymore. Until the deck ships its own pinned entry point, raise
  // the sidebar ONCE per page load and activate Melite Cards through the same
  // menu a human would use. A page where the user already opened anything
  // (any [data-melite-frame] present) is left untouched.
  // SINGLE-SHOT LATCH: exactly one open sequence per page load. Every
  // earlier draft kept polling while its own follow-up timers were still
  // in flight, so late ticks re-clicked 'Expand sidebar' and toggled the
  // panel back out from under the user (their "open button is broken").
  // Claiming the run BEFORE the first click makes the sequence atomic.
  // RESILIENT AUTO-OPEN, v2 (2026-08-26): a tick-wise state machine instead
  // of one-shot chains. Each 400ms tick advances ONE step based on what is
  // actually on screen, so boot-timing races and React commit gaps cannot
  // strand it halfway: hidden panel -> press Expand; panel open without our
  // tab -> open the + menu; menu open -> click Melite Cards; frame mounted ->
  // done (latch). Works identically for a fresh session and for the user's
  // persisted layout with some other tab active.
  let tries = 0
  const timer = window.setInterval(() => {
    tries++
    if (tries > 250 || document.querySelector("[data-melite-frame='cards']")) { window.clearInterval(timer); return }
    ctx.betterSidebar.openTab?.({ type: 'melite-card-deck:cards' })
  }, 700)

}
