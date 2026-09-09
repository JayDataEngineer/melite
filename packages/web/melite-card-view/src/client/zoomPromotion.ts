// zoomPromotion — THE frame sync state machine for the toolview iframe.
// Extracted from FlowCards' useSeamlessFrame effect (2026-08-22 testing
// pass): the inline closure was UNTESTABLE, which is exactly how the
// stuck-promotion family shipped (a #17171c slab at z 2147483000 over the
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
//
// CLOSE GLIDE (2026-09-06, the fold lands on the wrong spot): the drilldown
// exit morph (framer-motion layoutId) used to converge onto the tile's
// PROMOTED box because the demote landed at unmount, after the morph
// finished. Demoting DURING the exit is not an option: motion-dom kills
// every running layout projection on a window.innerWidth change
// (finishAnimation plus a 250ms update block — read in the motion-dom@13
// source, and proven empirically: instant and gradual resizes both freeze
// the exit inside ~60ms). So the close keeps the viewport STATIC and rides
// the frame home instead: at close-start every overlay root stamps
// [data-card-closing] and the frame WAAPI-glides (transform translate plus
// clip-path inset) from fullscreen to the captured resting box. Transforms
// and clips never resize the viewport, so the projection runs its proven
// static-viewport trajectory in iframe space while the document rides home,
// and the fold lands pixel-exact on the tile's resting spot. The resting
// grid is pinned to the captured width for the zoom lifetime ([data-grid-pin]
// max-width) so the post-unmount bake (clear plus fit, one task) changes
// zero pixels: no grid reflow, no snap. Hosts without rect or WAAPI keep
// the legacy instant path (the pin still applies whenever measurable).
export interface PromotableFrameStyle {
  position: string
  inset: string
  width: string
  height: string
  zIndex: string
  background: string
  transform: string
  clipPath: string
}

export interface PromotableGridNode {
  style: { maxWidth: string }
}

export interface PromotableFrame {
  contentDocument: Document | null
  classList: { add(c: string): void; remove(c: string): void }
  style: PromotableFrameStyle
  getBoundingClientRect?: () => { left: number; top: number; width: number; height: number }
  animate?: (
    keyframes: Record<string, string>[],
    options: { duration: number; easing: string; fill: FillMode },
  ) => { cancel(): void }
}

export interface ZoomPromotionDeps {
  intervalMs: number
  setInterval: (fn: () => void, ms: number) => number
  clearInterval: (id: number) => void
  MutationObserverCtor: new (cb: () => void) => { observe(t: unknown, o: unknown): void; disconnect(): void }
  onDocReady?: (doc: Document) => void
  overlaySelectors?: readonly string[]
  fitHeight?: boolean
  background?: string
}

export interface ZoomPromotion {
  attach(): void
  detach(): void
  sync(): void
  tick(): void
  load(): void
  isZoomOpen(): boolean
}

export const ZOOM_OVERLAY_SELECTOR = "[data-card-zoom-overlay]"
export const PREVIEW_DIALOG_SELECTOR = "[data-asset-preview-dialog]"
/** Close-start marker, queried two ways: document-wide (the full path,
 * for debuggers) and per overlay root (the bare marker -- querySelector only
 * searches DESCENDANTS, so the root query must not name the root itself). */
export const ZOOM_CLOSING_SELECTOR = "[data-card-zoom-overlay] [data-card-closing]"
const CLOSING_ATTR = "data-card-closing"
const ROOT_CLOSING_SELECTOR = "[" + CLOSING_ATTR + "]"
export const GRID_PIN_SELECTOR = "[data-grid-pin]"
const GLIDE_MS = 300
const GLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
const DEFAULT_SELECTORS: readonly string[] = [ZOOM_OVERLAY_SELECTOR]
const Z_INDEX = "2147483000"
const BG = "var(--dsw-alias-bg-base, #17171c)"
export const FULLSCREEN_CLASS = "melite-zoom-fullscreen"

const CLEARABLE = ["position", "inset", "width", "height", "zIndex", "background"] as const

interface RestBox { left: number; top: number; width: number; height: number }

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
  let restBox: RestBox | null = null
  let glide: { cancel(): void } | null = null

  const selectors = deps.overlaySelectors ?? DEFAULT_SELECTORS
  const fitEnabled = deps.fitHeight ?? true
  const slabBackground = deps.background ?? BG

  const docOf = (): Document | null => frame.contentDocument

  const overlayRoots = (): unknown[] => {
    const doc = docOf() as unknown as Document | null
    if (doc === null) return []
    const out: unknown[] = []
    for (const sel of selectors) {
      try {
        // querySelectorAll is the union path (drilldown + lightbox roots).
        // Minimal docs (and the oldest fakes) only offer querySelector --
        // degrade to single-root semantics rather than wedging.
        const all = (doc as unknown as Record<string, unknown>).querySelectorAll
        if (typeof all === "function") {
          ;(all as (s: string) => { forEach(c: (el: unknown) => void): void }).call(doc, sel)
            .forEach((el) => out.push(el))
        } else {
          const one = doc.querySelector(sel)
          if (one != null) out.push(one)
        }
      } catch { /* a bad selector must never wedge the machine */ }
    }
    return out
  }

  const overlayOpen = (): boolean => overlayRoots().length > 0

  const closeGlideWanted = (): boolean => {
    const doc = docOf() as unknown as Document | null
    if (doc === null) return false
    const roots = overlayRoots() as Element[]
    if (roots.length === 0) return false
    return roots.every((root) => {
      try {
        return root.querySelector(ROOT_CLOSING_SELECTOR) != null
      } catch {
        return false
      }
    })
  }

  const gridNode = (): PromotableGridNode | null => {
    const doc = docOf() as unknown as Document | null
    if (doc === null) return null
    try {
      return (doc.querySelector(GRID_PIN_SELECTOR) as unknown as PromotableGridNode | null) ?? null
    } catch {
      return null
    }
  }

  const pinGrid = (): void => {
    if (restBox === null) return
    const grid = gridNode()
    if (grid === null) return
    try {
      grid.style.maxWidth = restBox.width + "px"
    } catch { /* a hostile node must never wedge the machine */ }
  }

  const unpinGrid = (): void => {
    const grid = gridNode()
    if (grid === null) return
    try {
      grid.style.maxWidth = ""
    } catch { /* a dead grid must never wedge the machine (row 28 — cf. L142/179/205) */ }
  }

  const fit = (): void => {
    if (stopped || !fitEnabled) return
    const doc = docOf() as unknown as Document | null
    if (doc === null || doc.documentElement === null) return
    const h = Math.max(
      (doc.documentElement as { scrollHeight?: number }).scrollHeight ?? 0,
      (doc.body as { scrollHeight?: number } | null)?.scrollHeight ?? 0,
    )
    if (h > 0 && frame.style.position !== "fixed") frame.style.height = h + "px"
  }

  const cancelGlide = (): void => {
    if (glide === null) return
    try {
      glide.cancel()
    } catch { /* a dead animation must never wedge the machine */ }
    glide = null
  }

  const applyZoom = (open: boolean): boolean => {
    if (stopped || open === zoomOpen) return false
    zoomOpen = open
    if (open) {
      try {
        const r = frame.getBoundingClientRect?.()
        restBox = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null
      } catch {
        restBox = null
      }
      frame.classList.add(FULLSCREEN_CLASS)
      frame.style.position = "fixed"
      frame.style.inset = "0"
      frame.style.width = "100vw"
      frame.style.height = "100vh"
      frame.style.zIndex = Z_INDEX
      frame.style.background = slabBackground
      pinGrid()
    } else {
      cancelGlide()
      frame.classList.remove(FULLSCREEN_CLASS)
      for (const k of CLEARABLE) frame.style[k] = ""
      frame.style.transform = ""
      frame.style.clipPath = ""
      unpinGrid()
      fit()
    }
    return true
  }

  const maybeGlide = (): void => {
    if (stopped || glide !== null || frame.animate === undefined) return
    if (!closeGlideWanted()) return
    let from: RestBox | null = null
    try {
      const r = frame.getBoundingClientRect?.()
      from = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null
    } catch {
      from = null
    }
    const to = restBox
    if (from === null || to === null) return
    const dx = to.left - from.left
    const dy = to.top - from.top
    const dw = from.width - to.width
    const dh = from.height - to.height
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dw) < 1 && Math.abs(dh) < 1) return
    const endClip =
      "inset(0px " + Math.max(0, dw) + "px " + Math.max(0, dh) + "px 0px)"
    try {
      glide = frame.animate(
        [
          { transform: "translate(0px, 0px)", clipPath: "inset(0px 0px 0px 0px)" },
          { transform: "translate(" + dx + "px, " + dy + "px)", clipPath: endClip },
        ],
        { duration: GLIDE_MS, easing: GLIDE_EASE, fill: "forwards" },
      )
    } catch {
      glide = null
    }
  }

  const syncZoom = (): void => {
    if (stopped) return
    const open = overlayOpen()
    if (applyZoom(open)) return
    if (open) maybeGlide()
  }

  const tick = (): void => {
    if (stopped) return
    syncZoom()
    if (zoomOpen) return
    fit()
  }

  const arm = (): void => {
    if (stopped) return
    const doc = docOf()
    if (doc === null) return
    applyZoom(false)
    deps.onDocReady?.(doc)
    if (timer === undefined) timer = deps.setInterval(tick, deps.intervalMs)
    observer?.disconnect()
    observer = new deps.MutationObserverCtor(() => {
      if (stopped) return
      syncZoom()
    })
    observer.observe(doc, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [CLOSING_ATTR],
    })
    tick()
  }

  return {
    attach() {
      frame.addEventListener("load", arm)
      if ((frame.contentDocument as unknown as Document | null)?.readyState === "complete") arm()
    },
    detach() {
      stopped = true
      frame.removeEventListener("load", arm)
      if (timer !== undefined) deps.clearInterval(timer)
      timer = undefined
      observer?.disconnect()
      observer = null
      cancelGlide()
      frame.classList.remove(FULLSCREEN_CLASS)
      for (const k of CLEARABLE) frame.style[k] = ""
      frame.style.transform = ""
      frame.style.clipPath = ""
      unpinGrid()
    },
    sync: syncZoom,
    tick,
    load: arm,
    isZoomOpen: () => zoomOpen,
  }
}
