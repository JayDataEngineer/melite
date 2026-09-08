// railGeometry — the right rail's layout math + shared effective width.
//
// The DSH concession pattern (dsh-client-ui-layout's computeColumns),
// scoped to ONE rail. The solver is a PURE function of (available
// viewport, preferred width) — no hysteresis — so recovery on re-widening
// is automatic and the same inputs always render the same rail.
//
//   viewport >= want + CENTER_MIN   → the rail gets exactly what it wants
//   else if it can keep RAIL_FLOOR  → shrink toward the floor (concede)
//   else                            → 0 (auto-close; preference untouched)
//
// The solved width publishes to a module-level external store so BOTH
// consumers read ONE number (one resolution rule, the same law as
// rightPanelPxForMode):
//   - RightPanelHost renders the rail at it,
//   - WorkspaceLayout offsets the floating status cluster by it.
import { useEffect, useState, useSyncExternalStore } from "react"
import type { RefObject } from "react"

/** Hard clamp for any rail width (drag + defaults land inside this). */
export const RAIL_MIN_PX = 240
export const RAIL_MAX_PX = 520

/** Below this the rail concedes FULLY (auto-closes) instead of squeezing. */
export const RAIL_FLOOR_PX = 300

/** The center column's guaranteed minimum before the rail starts conceding. */
export const CENTER_MIN_PX = 640

/** Clamp a preferred width into the rail's contract range. */
export function clampRailWidth(px: number): number {
  return Math.min(RAIL_MAX_PX, Math.max(RAIL_MIN_PX, Math.round(px)))
}

/**
 * Solve the rail's rendered width for one layout frame.
 * Pure: the output is a function of (viewport, preference) only, so a
 * narrowed window auto-closes and a re-widened one auto-recovers without
 * any stored hysteresis. A closed preference always solves to 0; a zero
 * result never touches the stored preference (the DSH rule: the rendered
 * width derives, the preference persists).
 */
export function concedeRailWidth(viewport: number, preferred: number): number {
  if (!(preferred > 0)) return 0
  const want = clampRailWidth(preferred)
  if (viewport >= want + CENTER_MIN_PX) return want
  const shrunk = viewport - CENTER_MIN_PX
  if (shrunk >= RAIL_FLOOR_PX) return shrunk
  return 0
}

type Listener = () => void

function createWidthStore() {
  let width = 0
  const listeners = new Set<Listener>()
  return {
    /** The rail's currently-rendered effective width (0 = not rendered). */
    get: (): number => width,
    set: (w: number): void => {
      if (w === width) return
      width = w
      for (const l of listeners) l()
    },
    subscribe: (l: Listener): (() => void) => {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
  }
}

/** The ONE published rail width — written by RightPanelHost's layout effect. */
export const railEffectiveWidth = createWidthStore()

/**
 * Track the viewport available to center+rail — the host wrapper's flex
 * parent. ResizeObserver when the platform has it; a window-resize
 * fallback keeps jsdom (and ancient engines) on the innerWidth signal.
 */
export function useRailViewport(ref: RefObject<HTMLElement | null>): number {
  const [viewport, setViewport] = useState(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
  )
  useEffect(() => {
    const el = ref.current?.parentElement
    if (!el) return
    let raf: number | null = null
    const measure = () => {
      // jsdom reports clientWidth 0 for everything — skip so tests keep
      // the unconceded default instead of solving against garbage.
      const w = el.clientWidth
      if (w > 0) setViewport(w)
    }
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        raf ??= requestAnimationFrame(() => {
          raf = null
          measure()
        })
      })
      ro.observe(el)
      measure()
      return () => {
        ro.disconnect()
        if (raf !== null) cancelAnimationFrame(raf)
      }
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [ref])
  return viewport
}

/** Subscribe to the rail's solved width (WorkspaceLayout's icon offset). */
export function useRailEffectiveWidth(): number {
  return useSyncExternalStore(railEffectiveWidth.subscribe, railEffectiveWidth.get)
}
