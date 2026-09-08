// useStudioRefs — the mask-studio tenant's shared mutable refs.
//
// Split from component.tsx (the 2870-line monolith split): every ref below
// is the original module-body useRef, verbatim initial value, owned by ONE
// hook so the canvas / paint / instances / prep hooks can share them
// without prop-drilling individual refs. Destructuring at the call site
// keeps every use site spelled exactly as before (`selectionRef.current`).
import { useRef } from "react"
import type { RefObject } from "react"
import type { DetectClass, SelectionRect } from "./constants"

export interface StudioRefs {
  viewCanvasRef: RefObject<HTMLCanvasElement | null>
  canvasContainerRef: RefObject<HTMLDivElement | null>
  paintCanvasRef: RefObject<HTMLCanvasElement | null>
  imgCacheRef: RefObject<Map<string, HTMLImageElement>>
  tintCacheRef: RefObject<Map<string, HTMLCanvasElement>>
  drawingRef: RefObject<boolean>
  lastPtRef: RefObject<{ x: number; y: number } | null>
  rectDragRef: RefObject<{ sx: number; sy: number; cx: number; cy: number } | null>
  /** The COMMITTED selection marquee (2026-08-10 rework). Mutable ref so
  // redraw (memoized on [layers, hasPaint]) reads it without a dep; React
  // state mirrors it for the Segm/Bbox action bar. Cleared at drag start. */
  selectionRef: RefObject<SelectionRect | null>
  imgSizeRef: RefObject<{ w: number; h: number }>
  paintRestoredForRef: RefObject<string | null>
  /** Stale-selection guard: which input image the selection was cleared
  // for. A marquee (and the roi it wrote) belongs to ONE image — a swap
  // must drop both, or the old rectangle silently scopes the new image. */
  selectionClearedForRef: RefObject<string | null>
  /** Persistent paint-tint canvas — reused across redraws so the live stroke
  // (the hot path) never allocates. makeTinted() was called every pointer-
  // move before (2026-08-10 perf fix): allocating a fresh 1M-pixel canvas +
  // 2D context per move was the dominant paintbrush-lag cost. */
  paintTintRef: RefObject<HTMLCanvasElement | null>
  /** rAF handle for coalesced redraws — at most one redraw per display frame
  // regardless of pointer-event rate (120Hz pointers → ≤60Hz redraws). */
  rafRef: RefObject<number | null>
  prepOverlayRef: RefObject<HTMLCanvasElement | null>
  colRef: RefObject<HTMLDivElement | null>
  availRef: RefObject<{ w: number; h: number }>
  /** Pan-drag flag for the move tool (ref, not state — read in handlers). */
  didPanDragRef: RefObject<boolean>
  /** Remembers the last detect class across Text/Brush excursions — coming
  * BACK to Person/Box re-arms it (detect_mode sits at "none" while away,
  * and the producer needs a class). */
  lastClassRef: RefObject<DetectClass>
}

export function useStudioRefs(): StudioRefs {
  const viewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement | null>(null)
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const tintCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const drawingRef = useRef(false)
  const lastPtRef = useRef<{ x: number; y: number } | null>(null)
  const rectDragRef = useRef<{ sx: number; sy: number; cx: number; cy: number } | null>(null)
  const selectionRef = useRef<SelectionRect | null>(null)
  const imgSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const paintRestoredForRef = useRef<string | null>(null)
  const selectionClearedForRef = useRef<string | null>(null)
  const paintTintRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const prepOverlayRef = useRef<HTMLCanvasElement | null>(null)
  const colRef = useRef<HTMLDivElement | null>(null)
  const availRef = useRef({ w: 0, h: 0 })
  const didPanDragRef = useRef(false)
  const lastClassRef = useRef<DetectClass>("body")
  return {
  viewCanvasRef, canvasContainerRef, paintCanvasRef, imgCacheRef,
  tintCacheRef, drawingRef, lastPtRef, rectDragRef, selectionRef,
  imgSizeRef, paintRestoredForRef, selectionClearedForRef, paintTintRef,
  rafRef, prepOverlayRef, colRef, availRef, didPanDragRef, lastClassRef,
  }
}
