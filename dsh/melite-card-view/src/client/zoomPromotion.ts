// zoomPromotion — THE frame sync state machine for the toolview iframe.
// Extracted from PipelineCards' useSeamlessFrame effect (2026-08-22 "improve
// the testing" pass): the inline closure was UNTESTABLE, which is exactly how
// the stuck-promotion family shipped (a #17171c slab at z 2147483000 over the
// app; a dead observer after a document swap). This module has ZERO DOM
// dependencies beyond the frame handle it is handed — every Document touch
// goes through frame.contentDocument.query — so tests drive it with pure
// fakes: swappable documents, manual mutation callbacks, manual ticks.
//
// The contract (each clause = one shipped bug):
//   - overlay mounts in the CURRENT doc  -> promoted within one observer fire
//   - overlay unmounts                   -> cleared (fit resumes)
//   - DOCUMENT SWAPS while open          -> cleared within ONE tick (the tick
//     re-reads frame.contentDocument every pass -- never a stale doc)
//   - load fires while promoted          -> arm() RESETS to unpromoted (a
//     reloaded embed has no zoom state)
//   - card view (no overlay ever)        -> NEVER promoted
//   - stop()                             -> nothing fires afterward; styles restored
export interface PromotableFrameStyle {
  position: string
  inset: string
  width: string
  height: string
  zIndex: string
  background: string
}

export interface PromotableFrame {
  contentDocument: Document | null
  classList: { add(c: string): void; remove(c: string): void }
  style: PromotableFrameStyle
}

export interface ZoomPromotionDeps {
  /** The fit/promote poll cadence. */
  intervalMs: number
  /** Injectable timers -- tests drive ticks manually or with fakes. */
  setInterval: (fn: () => void, ms: number) => number
  clearInterval: (id: number) => void
  /** Injectable observer -- tests trigger its callback manually. */
  MutationObserverCtor: new (cb: () => void) => { observe(t: unknown, o: unknown): void; disconnect(): void }
  /** Called on every arm() AFTER the promotion reset -- the theme bridge hook. */
  onDocReady?: (doc: Document) => void
  /** In-frame selectors whose presence promotes the frame -- ANY match
   * counts, and the frame stays promoted until NONE does (a lightbox
   * layered over the drilldown keeps the slab; closing it returns to the
   * still-promoted drilldown). Default: [ZOOM_OVERLAY_SELECTOR], the
   * toolview's fullscreen-drilldown contract. */
  overlaySelectors?: readonly string[]
  /** Auto-fit the frame height to the document while UNPROMOTED (the
   * toolview's seamless auto-height). Default true. The deck canvas is
   * CSS-sized by its column -- an inline height there would fight the
   * layout on every tick; pass false. */
  fitHeight?: boolean
  /** The promoted slab's backdrop. Default BG (the app base: the promoted
   * DRILLDOWN reads as the app fullscreen). A lightbox-keyed promotion
   * passes opaque #000 -- the lightbox's own black, edge to edge. */
  background?: string
}

export interface ZoomPromotion {
  attach(): void
  detach(): void
  /** Manual sync -- what the observer callback runs. */
  sync(): void
  /** Manual fit+sync pass -- what the interval runs. */
  tick(): void
  /** Manual load -- what the frame's load event runs. */
  load(): void
  isZoomOpen(): boolean
}

export const ZOOM_OVERLAY_SELECTOR = "[data-card-zoom-overlay]"
/** The editor's asset lightbox root (AssetPreviewDialog). A fullscreen
 * modal in EVERY surface that hosts it standalone -- inside a DSH embed
 * iframe it needs the frame promoted or the host chrome (the left
 * sidebar) stays lit beside the black. */
export const PREVIEW_DIALOG_SELECTOR = "[data-asset-preview-dialog]"
const DEFAULT_SELECTORS: readonly string[] = [ZOOM_OVERLAY_SELECTOR]
const Z_INDEX = "2147483000"
const BG = "var(--dsw-alias-bg-base, #17171c)"
export const FULLSCREEN_CLASS = "melite-zoom-fullscreen"

const CLEARABLE = ["position", "inset", "width", "height", "zIndex", "background"] as const

export function createZoomPromotion(
  frame: PromotableFrame & {
    addEventListener(type: string, fn: () => void): void
    removeEventListener(type: string, fn: () => void): void
  },
  deps: ZoomPromotionDeps,
): ZoomPromotion {
  let zoomOpen = false
  let stopped = false
  let timer: ReturnType<typeof deps.setInterval> | undefined
  type ObserverLike = InstanceType<ZoomPromotionDeps["MutationObserverCtor"]>
  let observer: ObserverLike | null = null

  const selectors = deps.overlaySelectors ?? DEFAULT_SELECTORS
  const fitEnabled = deps.fitHeight ?? true
  const slabBackground = deps.background ?? BG

  const overlayOpen = (): boolean => {
    const doc = frame.contentDocument
    if (doc === null) return false
    return selectors.some((sel) => doc.querySelector(sel) != null)
  }

  const fit = (): void => {
    if (stopped || !fitEnabled) return
    const doc = frame.contentDocument
    if (doc === null || doc.documentElement === null) return
    const h = Math.max(
      (doc.documentElement as { scrollHeight?: number }).scrollHeight ?? 0,
      (doc.body as { scrollHeight?: number } | null)?.scrollHeight ?? 0,
    )
    if (h > 0 && frame.style.position !== "fixed") frame.style.height = h + "px"
  }

  /** Idempotent apply -- returns whether the state actually flipped. */
  const applyZoom = (open: boolean): boolean => {
    if (stopped || open === zoomOpen) return false
    zoomOpen = open
    // Inline styles, not a class-only toggle: the client preset may not emit
    // a rule the JSX never references (verified live 2026-08-22).
    if (open) {
      frame.classList.add(FULLSCREEN_CLASS)
      frame.style.position = "fixed"
      frame.style.inset = "0"
      frame.style.width = "100vw"
      frame.style.height = "100vh"
      frame.style.zIndex = Z_INDEX
      frame.style.background = slabBackground
    } else {
      frame.classList.remove(FULLSCREEN_CLASS)
      for (const k of CLEARABLE) frame.style[k] = ""
      fit()
    }
    return true
  }

  const syncZoom = (): void => {
    if (stopped) return
    applyZoom(overlayOpen())
  }

  const tick = (): void => {
    if (stopped) return
    syncZoom()
    if (zoomOpen) return
    fit()
  }

  const arm = (): void => {
    if (stopped) return
    const doc = frame.contentDocument
    if (doc === null) return
    // A fresh load starts UNPROMOTED -- the embed's zoom state dies with its
    // document. This reset IS the stuck-slab self-heal.
    applyZoom(false)
    deps.onDocReady?.(doc)
    if (timer === undefined) timer = deps.setInterval(tick, deps.intervalMs)
    observer?.disconnect()
    observer = new deps.MutationObserverCtor(() => {
      if (stopped) return
      syncZoom()
    })
    observer.observe(doc, { childList: true, subtree: true })
    tick()
  }

  return {
    attach() {
      frame.addEventListener("load", arm)
      if (frame.contentDocument?.readyState === "complete") arm()
    },
    detach() {
      stopped = true
      frame.removeEventListener("load", arm)
      if (timer !== undefined) deps.clearInterval(timer)
      timer = undefined
      observer?.disconnect()
      observer = null
      frame.classList.remove(FULLSCREEN_CLASS)
      for (const k of CLEARABLE) frame.style[k] = ""
    },
    sync: syncZoom,
    tick,
    load: arm,
    isZoomOpen: () => zoomOpen,
  }
}
