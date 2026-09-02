/**
 * assets-tab — RAY MEDIA + RAY CARDS in the DSH right sidebar
 * (dsh-better-sidebar). TWO tabs, because they were TWO things
 * (operator 2026-08-22: "media and the cards to make action cards were
 * different"):
 *
 *   Ray Media — the MEDIA ARCHIVE (what we made): an iframe of
 *     /editor/?rayAssets=media rendering the REAL SidebarBody (search,
 *     sort, upload, category groups, virtualized). Tiles drag the asset
 *     MIME (application/tech-noir-asset) — drop attaches to a card slot
 *     or spawns an Ops input card.
 *   Ray Cards — the CAPABILITY LIBRARY (what we can make): an iframe of
 *     /editor/?rayAssets=cards rendering the REAL LibrarySidebar
 *     (search, genre groups, provenance badges, studio tiles). Tiles
 *     drag the capability MIME (application/tech-noir-capability) —
 *     drop lands an action card.
 *   Ray ComfyUI (2026-08-25) — the ComfyUI MANAGEMENT surface: an iframe
 *     of /editor/?rayAssets=comfy rendering the REAL ComfyManagerRailPanel
 *     (backend endpoint door + Manager upkeep readout/actions) — the old
 *     standalone ComfyUI-Manager plugin, mirrored as a third tab.
 *   Ray Pipelines (2026-08-25) — the PIPELINE TEMPLATES: an iframe of
 *     /editor/?rayAssets=pipelines rendering the REAL PipelinesSection
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
      data-ray-frame={marker}
    />
  )
}

/**
 * MediaPanel — the media archive tab + the FULLSCREEN preview overlay.
 * A tile click inside the frame posts ray-preview-open; the overlay is a
 * DEDICATED iframe (/editor/?rayPreview=<id>) portal'd to document.body —
 * OUTSIDE the animated panel, whose slide transform is the
 * containing-block trap that ate two earlier attempts (a fixed iframe
 * inside the panel parks off-screen; MOVING the live frame reloads it
 * and kills the dialog). The overlay page renders the REAL
 * AssetPreviewDialog alone; its own bg-black/90 backdrop dims the page.
 *
 * PERSISTENT FRAME + NAVIGATE (2026-08-25 "huge lag loading assets"):
 * remounting /editor/?rayPreview=<id> per click booted the WHOLE editor
 * app every time — seconds over a tailscale link. The iframe now mounts
 * ONCE on the first preview and STAYS ALIVE: later previews post
 * ray-preview-navigate {assetId} into it and the page swaps assets
 * in-place (its ready echo carries the asset id). Close only HIDES the
 * frame (opacity 0); reopen of an already-shown asset is instant.
 *
 * ATOMIC REVEAL (2026-08-25 "blinks black, then loads the rest in" +
 * "'Unsupported Media' before the video loads"): while a target asset is
 * not yet confirmed, the frame holds at opacity 0 — boot frames and media
 * loads happen off-screen; 'ray-preview-ready' (echoing the asset id)
 * flips opacity to 1 in one transition. Host failsafe 7s pairs the page's
 * own 5s: a dead iframe still fails VISIBLE.
 */
function MediaPanel() {
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
      if (d.type === 'ray-preview-open' && typeof d.asset?.id === 'string') {
        const id = d.asset.id
        console.warn('[MediaPanel] open', id.split('/').pop())
        setFrame((f) => f ?? { src: '/editor/?rayPreview=' + encodeURIComponent(id), bootAssetId: id })
        setTarget(id)
      } else if (d.type === 'ray-preview-close') {
        console.warn('[MediaPanel] close')
        // HIDE, don't unmount — the booted page IS the latency fix.
        setTarget(null)
      } else if (d.type === 'ray-preview-ready') {
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
      { type: 'ray-preview-navigate', assetId: target },
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
      <SidebarFrame src="/editor/?rayAssets=media" title="Ray Media" marker="media" />
      {frame !== null && createPortal(
        <iframe
          ref={frameRef}
          src={frame.src}
          title="Ray Media preview"
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
const CardsPanel = () => <SidebarFrame src="/editor/?rayAssets=cards" title="Ray Cards" marker="cards" />
const ComfyPanel = () => <SidebarFrame src="/editor/?rayAssets=comfy" title="Ray ComfyUI" marker="comfy" />
const PipelinesPanel = () => <SidebarFrame src="/editor/?rayAssets=pipelines" title="Ray Pipelines" marker="pipelines" />

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
  }, 'ray-card-deck: ' + id + ' tab')
}

/** Register ALL FOUR tabs on the better-sidebar registry. */
export function registerRayAssetsTab(ctx: TabCtx): void {
  register(ctx, 'ray-card-deck:media', 'Ray Media', 60, (s) => <MediaIcon size={s} />, MediaPanel as unknown as React.ComponentType<Record<string, unknown>>)
  register(ctx, 'ray-card-deck:cards', 'Ray Cards', 61, (s) => <CardsIcon size={s} />, CardsPanel as unknown as React.ComponentType<Record<string, unknown>>)
  register(ctx, 'ray-card-deck:comfy', 'Ray ComfyUI', 62, (s) => <ComfyIcon size={s} />, ComfyPanel as unknown as React.ComponentType<Record<string, unknown>>)
  register(ctx, 'ray-card-deck:pipelines', 'Ray Pipelines', 63, (s) => <PipelinesIcon size={s} />, PipelinesPanel as unknown as React.ComponentType<Record<string, unknown>>)

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
  // the sidebar ONCE per page load and activate Ray Cards through the same
  // menu a human would use. A page where the user already opened anything
  // (any [data-ray-frame] present) is left untouched.
  // SINGLE-SHOT LATCH: exactly one open sequence per page load. Every
  // earlier draft kept polling while its own follow-up timers were still
  // in flight, so late ticks re-clicked 'Expand sidebar' and toggled the
  // panel back out from under the user (their "open button is broken").
  // Claiming the run BEFORE the first click makes the sequence atomic.
  // RESILIENT AUTO-OPEN, v2 (2026-08-26): a tick-wise state machine instead
  // of one-shot chains. Each 400ms tick advances ONE step based on what is
  // actually on screen, so boot-timing races and React commit gaps cannot
  // strand it halfway: hidden panel -> press Expand; panel open without our
  // tab -> open the + menu; menu open -> click Ray Cards; frame mounted ->
  // done (latch). Works identically for a fresh session and for the user's
  // persisted layout with some other tab active.
  let tries = 0
  const timer = window.setInterval(() => {
    tries++
    if (tries > 240 || document.querySelector("[data-ray-frame='cards']")) { window.clearInterval(timer); return }
    const panel = document.querySelector("[class*='nArs4W_panel']")
    // Step C: the Ray Cards tab already activated — done.
    if (document.querySelector("[data-ray-frame='cards']")) { window.clearInterval(timer); return }
    // Step A: the panel must be expanded before anything inside it exists.
    if (panel === null || /panelHidden/.test(panel.className)) {
      const expandSidebar = [...document.querySelectorAll('button')].find((b) =>
        (b.getAttribute('aria-label') || b.getAttribute('title') || '').trim() === 'Expand sidebar')
      expandSidebar && expandSidebar.click()
      return
    }
    // Step B1: if the + menu is open, its Ray Cards item is present — click.
    const item = [...document.querySelectorAll('[role=menuitem],[role=option]')].find((x) =>
      /^Ray Cards$/.test((x.textContent || x.getAttribute('aria-label') || '').trim())) as HTMLElement | null
    if (item) {
      item.click()
      // Radix menus dismiss on OUTSIDE pointerdown — a programmatic item
      // click doesn't produce one, so the menu's dismissal layer lingers
      // and eats the user's next press on the top-right toggles (reported
      // 2026-08-26 "the top right sidebar button open is broken"). Fire a
      // synthetic outside pointerdown so the layer unmounts immediately.
      window.setTimeout(() => {
        document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      }, 120)
      return
    }
    // Step B2: otherwise open the + (New tab) menu inside OUR panel.
    const plus = [...panel.querySelectorAll('button')].find((b) =>
      (b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent || '').trim() === 'New tab')
    plus && plus.click()
  }, 400)

}
