/**
 * PaintCanvas2D — the 2D paint viewport PRIMITIVE (row 5 stroke 3,
 * 2026-09-07; design record docs/design/studio-shell.md §2 + §7).
 *
 * The CENTER seam's 2D counterpart of 3d/ui/viewers Stage: the
 * zoom/pan canvas a paint card sees THROUGH. Extracted verbatim from
 * mask_studio's StudioCanvas (the load-bearing canvas wrapper), the
 * same way Stage serves assembly — the card declares, primitives
 * render.
 *
 * WHAT THE PRIMITIVE OWNS (genre-blind, no mask vocabulary):
 *   • the canvas WRAPPER — drop target (handlers optional: undefined
 *     suppresses drops, the live-wire block), hugged sizing when an
 *     image is present (viewSize) vs the flex fill for the empty
 *     state, the highlight ring;
 *   • the view CANVAS element — pointer wiring + the zoom/pan
 *     transform + cursor classes (panMode = the move tool);
 *   • the loading skeleton while the image decodes;
 *   • THE THREE-STATE TRIAGE as slots: `waiting` renders INSTEAD of
 *     the canvas (the block state), `empty` when no image (the
 *     import card), children = overlays ON the canvas in every
 *     state (badges, panels, bars — card chrome, verbatim).
 *
 * WHAT IT NEVER OWNS: paint data (the paint canvas + strokes stay
 * with the card — this primitive renders the VIEW layer), mask
 * semantics, detect/prep vocabulary. The three-producer semantics
 * moved VERBATIM: the card still decides which state is armed by
 * filling the slots.
 *
 * HOME (PRIMITIVE HOME LAW): the image genre dir today — one
 * consumer (mask). The move-up trigger is the second genre: when a
 * non-image card consumes it, it moves to the workspace packages
 * (web/) with a package name, consumers repoint, and the wall's
 * path-consumed rule takes over. Until then a relative import is
 * the honest shape (the SlotGrid precedent + debt note).
 */
import type { ReactElement, ReactNode } from "react"
import { Skeleton, ViewportOverlays, cn } from "@melite/ui"
import type { ViewportOverlay } from "@melite/ui"

/** Viewport ease while a zoom/pan gesture settles (verbatim from the
 *  mask canvas constants — the feel IS the primitive). */
export const CANVAS_VIEW_EASE = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"

/** Fitted view size in CSS px (null while the image is decoding). */
export interface CanvasViewSize {
  w: number
  h: number
}

export interface PaintCanvas2DProps {
  /** The wrapper div (the drop target) — the card's container ref. */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** The view canvas element ref. */
  viewCanvasRef: React.RefObject<HTMLCanvasElement | null>
  /** An image is present → the wrapper HUGS the fitted canvas. */
  hasImage: boolean
  viewSize: CanvasViewSize | null
  imageLoading: boolean
  dropHighlight: boolean
  /** Drop target handlers — all optional; undefined suppresses. */
  onDrop?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  /** Viewport state (the useCanvasView values). */
  zoom: number
  pan: { x: number; y: number }
  isZoomed: boolean
  panDragging: { x: number; y: number } | null
  /** The pan/move tool is active → grab cursors (else crosshair). */
  panMode: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  /** The BLOCK state (live wire pending) — renders instead of the
   *  canvas; the wrapper stays the drop target underneath. */
  waiting?: ReactNode
  /** The EMPTY state (no image) — the import card. */
  empty?: ReactNode
  /** Overlays ON the canvas — render in every state (badges,
   *  panels, selection bars; the card's chrome, verbatim). */
  children?: ReactNode
  /** DECLARED viewport overlays (§2.5): docked chip rows the
   *  renderer positions — never hand-rolled absolute DOM. */
  overlays?: readonly ViewportOverlay[]
}

export function PaintCanvas2D({
  containerRef,
  viewCanvasRef,
  hasImage,
  viewSize,
  imageLoading,
  dropHighlight,
  onDrop,
  onDragOver,
  onDragLeave,
  zoom,
  pan,
  isZoomed,
  panDragging,
  panMode,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  waiting,
  empty,
  children,
  overlays,
}: PaintCanvas2DProps): ReactElement {
  return (
    <div
      ref={containerRef}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        // With an image the wrapper HUGS the fitted canvas (viewSize)
        // so there is no letterboxed black around it; the flex-1 fill
        // is only for the empty state's import card. shrink-0 keeps
        // the flex column from squeezing the wrapper (it would clip
        // the canvas's bottom edge — the canvas keeps its style
        // height while the wrapper shrank, 2026-08-10). m-auto
        // centers the hugged canvas in whatever height the stretch
        // layout leaves above the bottom bar.
        "relative m-auto overflow-hidden rounded-md bg-[#0e0e1a] transition-all",
        hasImage ? "shrink-0" : "flex min-h-0 flex-1 items-center justify-center",
        dropHighlight ? "ring-2 ring-brand ring-inset" : "ring-1 ring-border/50",
      )}
      style={hasImage && viewSize ? { width: viewSize.w, height: viewSize.h } : undefined}
    >
      {imageLoading && (
        <div
          role="status"
          aria-busy="true"
          aria-label="Loading image"
          className="absolute inset-0 z-10 flex items-center justify-center bg-[#0e0e1a]/70"
        >
          {/* Skeleton stands in for the image while it decodes — a
              quiet block instead of a spinning dot over the canvas. */}
          <Skeleton className="h-16 w-16 rounded-md bg-muted/30" />
        </div>
      )}
      {waiting ?? (hasImage ? (
        <canvas
          ref={viewCanvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className={cn(
            "select-none",
            panMode ? (isZoomed ? "cursor-grab" : "cursor-default") : "cursor-crosshair",
            panDragging && "cursor-grabbing",
          )}
          style={viewSize ? {
            width: viewSize.w,
            height: viewSize.h,
            touchAction: "none",
            transform: isZoomed
              ? `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`
              : undefined,
            transition: panDragging ? "none" : CANVAS_VIEW_EASE,
          } : { touchAction: "none" }}
        />
      ) : empty)}
      {children}
      <ViewportOverlays overlays={overlays ?? []} />
    </div>
  )
}
