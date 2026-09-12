// viewport — local native port of the the shared kit viewport seams
// (ViewportAnchor, ViewportOverlays + the ViewportOverlay type, and
// the Skeleton block PaintCanvas2D uses while the image decodes).
//
// DSH ships no viewport atoms: geometry-only divs + the package's
// own CSS module. Overlay semantics verbatim (status / toggle /
// segmented rows, docked corners, ghosted until pointer-near).
import type { ComponentProps, ReactElement, ReactNode } from "react"
import { clsx } from "clsx"
import { Loader2 } from "./icons"
import styles from "./mask.module.css"

/* ── ViewportAnchor ─────────────────────────────────────────────── */
export type ViewportAnchorDock =
  | "top-right" | "top-left" | "bottom-right" | "bottom-left"
  | "bottom-center" | "bottom" | "fill" | "edge-right" | "edge-left"

const DOCK_GEOMETRY: Record<ViewportAnchorDock, string> = {
  "top-right": styles.anchorTR,
  "top-left": styles.anchorTL,
  "bottom-right": styles.anchorBR,
  "bottom-left": styles.anchorBL,
  "bottom-center": styles.anchorBC,
  bottom: styles.anchorBottom,
  fill: styles.anchorFill,
  "edge-right": styles.anchorEdgeR,
  "edge-left": styles.anchorEdgeL,
}

export interface ViewportAnchorProps extends ComponentProps<"div"> {
  /** Where the content docks (default top-right — the pin shape). */
  dock?: ViewportAnchorDock
}

export function ViewportAnchor({ dock = "top-right", className, ...props }: ViewportAnchorProps) {
  return (
    <div
      data-slot="viewport-anchor"
      data-dock={dock}
      className={clsx(styles.anchor, DOCK_GEOMETRY[dock], className)}
      {...props}
    />
  )
}

/* ── ViewportOverlays ───────────────────────────────────────────── */
export type OverlayDock = "tl" | "tr" | "bl" | "br"
export type OverlayKind = "toggle" | "segmented" | "status"

export interface ViewportOverlay {
  /** Stable row id (grouping + React keys). */
  id: string
  kind: OverlayKind
  dock: OverlayDock
  /** Rows of one group stack together at the dock. */
  group?: string
  /** toggle/status: the chip text. segmented: omitted (options carry it). */
  label?: string
  /** toggle: the pressed state. */
  active?: boolean
  /** segmented: the closed option list + the lit one. */
  options?: readonly string[]
  value?: string
  /** status: in-flight rows carry the spinner. */
  busy?: boolean
  /** toggle/segmented: the row's gesture (view-state writes). */
  onAct?: (value?: string) => void
  /** Optional leading glyph (status/toggle). */
  icon?: ReactNode
}

const OVERLAY_DOCK_CLASS: Record<OverlayDock, string> = {
  tl: styles.overlayTL,
  tr: styles.overlayTR,
  bl: styles.overlayBL,
  br: styles.overlayBR,
}

function OverlayChip({ row }: { row: ViewportOverlay }): ReactElement | null {
  if (row.kind === "status") {
    return (
      <span className={styles.overlayChip}>
        {row.busy && <Loader2 className={clsx(styles.sz12, styles.accentInk, styles.spin)} />}
        {row.icon}
        {row.label}
      </span>
    )
  }
  if (row.kind === "toggle") {
    return (
      <button
        type="button"
        aria-pressed={row.active ?? false}
        onClick={() => row.onAct?.(row.id)}
        className={clsx(
          styles.overlayChip,
          row.active ? styles.overlayToggleOn : styles.overlayToggleOff,
        )}
      >
        {row.icon}
        {row.label}
      </button>
    )
  }
  // segmented: one chip per option, the lit one branded
  return (
    <span className={styles.overlaySeg}>
      {(row.options ?? []).map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={opt === row.value}
          onClick={() => row.onAct?.(opt)}
          className={clsx(styles.overlaySegOpt, opt === row.value && styles.overlaySegLit)}
        >
          {opt}
        </button>
      ))}
    </span>
  )
}

/** The renderer: one absolutely-positioned stack per dock corner,
 * rows grouped (same group stacks in declaration order), the whole
 * dock GHOSTED until pointer-near. Empty docks render nothing. */
export function ViewportOverlays({
  overlays,
}: {
  overlays: readonly ViewportOverlay[]
}): ReactElement | null {
  if (overlays.length === 0) return null
  const docks = new Map<OverlayDock, ViewportOverlay[]>()
  for (const row of overlays) {
    const list = docks.get(row.dock) ?? []
    list.push(row)
    docks.set(row.dock, list)
  }
  return (
    <>
      {[...docks.entries()].map(([dock, rows]) => (
        <div key={dock} data-overlay-dock={dock} className={clsx(styles.overlayDock, OVERLAY_DOCK_CLASS[dock])}>
          {rows.map((row) => (
            <OverlayChip key={row.id} row={row} />
          ))}
        </div>
      ))}
    </>
  )
}

/* ── Skeleton ───────────────────────────────────────────────────── */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="skeleton" className={clsx(styles.viewSkeleton, styles.pulse, className)} {...props} />
}
