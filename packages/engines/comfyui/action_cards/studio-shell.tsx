/**
 * studio-shell — DSH-pure replacements for the kit studio chrome
 * the action_cards studios used (kit studioShell, viewport-frame,
 * viewport-anchor, viewportOverlays, empty-state,
 * reference-image-badge, shellDeclaration).
 *
 * Mapping (kit → DSH):
 *   StudioShell / StudioShellErrorLine → local shell (same three
 *                 seams rail/center/bottom + the loud error line;
 *                 the RAIL still portals through card-base's
 *                 StudioRail — the domain rail slot, not UI kit).
 *   defineShellDeclaration + seam types → local frozen-data copy
 *                 (same closed ViewportKind/BarKind unions).
 *   ViewportFrame / ViewportAnchor → local geometry (same
 *                 data-slot/data-dock hooks, same docks).
 *   ViewportOverlays + ViewportOverlay → local renderer (same
 *                 dock grouping, same toggle/segmented/status
 *                 rows, same data-overlay-dock hooks).
 *   EmptyState / ReferenceImageBadge → local leaves (same
 *                 variants, same null-when-no-url contract).
 */
import type { ComponentProps, ReactElement, ReactNode } from "react"
import { StudioRail } from "@melite/card-base/shell"
import { AlertTriangle } from "./ui-icons"
import { Loader2 } from "./ui-icons"
import styles from "./studio-shell.module.css"

// ── shell declaration (the typed seam tables, as data) ─────────

export type ViewportKind = "stage3d" | "paint2d" | "native"
export type BarKind = "recipe" | "timeline"

export interface CenterSeam {
  kind: ViewportKind
}

export interface BottomSeam {
  kind: BarKind
}

export interface RailSeam {
  slots: readonly string[]
}

export interface ShellDeclaration {
  center: CenterSeam
  bottom?: BottomSeam
  rail: RailSeam
}

export function defineShellDeclaration(
  declaration: ShellDeclaration,
): Readonly<ShellDeclaration> {
  return Object.freeze(declaration)
}

// ── StudioShell ─────────────────────────────────────────────────

export interface StudioShellError {
  id: string
  message: string
}

export interface StudioShellProps {
  rail: ReactNode
  center: ReactNode
  bottom?: ReactNode
  errors?: StudioShellError[]
  className?: string
}

export function StudioShellErrorLine({
  errors,
}: {
  errors: StudioShellError[]
}): ReactElement | null {
  if (errors.length === 0) return null
  return (
    <div role="alert" className={styles.errorLine}>
      {errors.map((e) => (
        <p key={e.id} className={styles.errorRow}>
          <AlertTriangle className={styles.errorIcon} />
          {e.id}: {e.message}
        </p>
      ))}
    </div>
  )
}

export function StudioShell({
  rail,
  center,
  bottom,
  errors = [],
  className,
}: StudioShellProps): ReactElement {
  return (
    <div className={className ? `${styles.shell} ${className}` : styles.shell}>
      <StudioRail>{rail}</StudioRail>
      {center}
      {bottom}
      <StudioShellErrorLine errors={errors} />
    </div>
  )
}

// ── ViewportFrame ───────────────────────────────────────────────

export interface ViewportFrameProps extends ComponentProps<"div"> {
  label?: string
  empty?: ReactNode
}

export function ViewportFrame({ children, label, empty, className, ...props }: ViewportFrameProps) {
  return (
    <div
      data-slot="viewport-frame"
      aria-label={label}
      className={className ? `${styles.viewportFrame} ${className}` : styles.viewportFrame}
      {...props}
    >
      {children}
      {empty}
    </div>
  )
}

// ── ViewportAnchor ──────────────────────────────────────────────

export type ViewportAnchorDock =
  | "top-right" | "top-left"
  | "bottom-right" | "bottom-left" | "bottom-center" | "bottom"
  | "fill" | "edge-right" | "edge-left"

const DOCK_GEOMETRY: Record<ViewportAnchorDock, string> = {
  "top-right": styles.dockTopRight,
  "top-left": styles.dockTopLeft,
  "bottom-right": styles.dockBottomRight,
  "bottom-left": styles.dockBottomLeft,
  "bottom-center": styles.dockBottomCenter,
  bottom: styles.dockBottom,
  fill: styles.dockFill,
  "edge-right": styles.dockEdgeRight,
  "edge-left": styles.dockEdgeLeft,
}

export interface ViewportAnchorProps extends ComponentProps<"div"> {
  dock?: ViewportAnchorDock
}

export function ViewportAnchor({ dock = "top-right", className, ...props }: ViewportAnchorProps) {
  const dockClass = DOCK_GEOMETRY[dock]
  return (
    <div
      data-slot="viewport-anchor"
      data-dock={dock}
      className={className ? `${dockClass} ${className}` : dockClass}
      {...props}
    />
  )
}

// ── ViewportOverlays ────────────────────────────────────────────

export type OverlayKind = "toggle" | "segmented" | "status"
export type OverlayDock = "tl" | "tr" | "bl" | "br"

export interface ViewportOverlay {
  id: string
  kind: OverlayKind
  dock: OverlayDock
  group?: string
  label?: string
  active?: boolean
  options?: readonly string[]
  value?: string
  busy?: boolean
  onAct?: (value?: string) => void
  icon?: ReactNode
}

const OVERLAY_DOCK_CLASS: Record<OverlayDock, string> = {
  tl: styles.overlayTl,
  tr: styles.overlayTr,
  bl: styles.overlayBl,
  br: styles.overlayBr,
}

function OverlayChip({
  row,
}: {
  row: ViewportOverlay
}): ReactElement | null {
  if (row.kind === "status") {
    return (
      <span className={`${styles.overlayChip} ${styles.overlayChipStatus}`}>
        {row.busy && <Loader2 className={styles.overlaySpin} />}
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
        className={`${styles.overlayChip} ${styles.overlayChipToggle} ${row.active ? styles.overlayChipToggleActive : styles.overlayChipToggleIdle}`}
      >
        {row.icon}
        {row.label}
      </button>
    )
  }
  // segmented: one chip per option, the lit one branded
  return (
    <span className={styles.overlaySegmented}>
      {(row.options ?? []).map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={opt === row.value}
          onClick={() => row.onAct?.(opt)}
          className={opt === row.value ? `${styles.overlayOption} ${styles.overlayOptionLit}` : styles.overlayOption}
        >
          {opt}
        </button>
      ))}
    </span>
  )
}

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
        <div
          key={dock}
          data-overlay-dock={dock}
          className={`${styles.overlayDock} ${OVERLAY_DOCK_CLASS[dock]}`}
        >
          {rows.map((row) => (
            <OverlayChip key={row.id} row={row} />
          ))}
        </div>
      ))}
    </>
  )
}

// ── EmptyState ──────────────────────────────────────────────────

export type EmptyStateVariant = "overlay" | "pane"

export interface EmptyStateProps {
  icon?: ReactNode
  title: ReactNode
  hint?: ReactNode
  variant?: EmptyStateVariant
  className?: string
}

export function EmptyState({ icon, title, hint, variant = "pane", className }: EmptyStateProps) {
  const base = variant === "overlay" ? styles.emptyOverlay : styles.emptyPane
  return (
    <div
      data-slot="empty-state"
      data-variant={variant}
      className={className ? `${base} ${className}` : base}
    >
      {icon}
      <p className={styles.emptyTitle}>{title}</p>
      {hint != null ? (
        <p className={styles.emptyHint}>{hint}</p>
      ) : null}
    </div>
  )
}

// ── ReferenceImageBadge ─────────────────────────────────────────

export interface ReferenceImageBadgeProps extends ComponentProps<"figure"> {
  url: string | null
  label: string
}

export function ReferenceImageBadge({
  url,
  label,
  className,
  ...props
}: ReferenceImageBadgeProps) {
  if (!url) return null
  return (
    <figure
      data-slot="reference-image-badge"
      data-reference-image
      aria-label={label}
      className={className ? `${styles.refBadge} ${className}` : styles.refBadge}
      {...props}
    >
      <img
        src={url}
        alt={label}
        className={styles.refBadgeImg}
        draggable={false}
      />
      <figcaption className={styles.refBadgeCaption}>
        {label}
      </figcaption>
    </figure>
  )
}

export default ReferenceImageBadge
