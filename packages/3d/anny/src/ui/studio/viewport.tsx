/**
 * ViewportFrame + ViewportAnchor + ReferenceImageBadge — studio-local
 * copies of the former kit viewport seams (those kit imports are
 * dead). Same props, same data attributes, DSH-token styling.
 */
import type { ComponentProps, ReactElement, ReactNode } from "react"
import { cx } from "@melite/card-base/chrome"
import styles from "./viewport.module.css"

export interface ViewportFrameProps extends ComponentProps<"div"> {
  /** Accessible label for the viewport region (renders as aria-label). */
  label?: string
  /** Shown when there is nothing on the stage. */
  empty?: ReactNode
}

export function ViewportFrame({ children, label, empty, className, ...props }: ViewportFrameProps): ReactElement {
  return (
    <div
      data-slot="viewport-frame"
      aria-label={label}
      className={cx(styles.frame, className)}
      {...props}
    >
      {children}
      {empty}
    </div>
  )
}

export type ViewportAnchorDock =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom"
  | "fill"
  | "edge-right"
  | "edge-left"

const DOCK_CLASS: Record<ViewportAnchorDock, string> = {
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
  /** Where the content docks (default top-right — the pin shape). */
  dock?: ViewportAnchorDock
}

export function ViewportAnchor({ dock = "top-right", className, ...props }: ViewportAnchorProps): ReactElement {
  return (
    <div
      data-slot="viewport-anchor"
      data-dock={dock}
      className={cx(DOCK_CLASS[dock], className)}
      {...props}
    />
  )
}

export interface ReferenceImageBadgeProps extends ComponentProps<"figure"> {
  /** Servable image URL, or null → hide. */
  url: string | null
  /** Human label ("Source photo"). */
  label: string
}

export function ReferenceImageBadge({
  url,
  label,
  className,
  ...props
}: ReferenceImageBadgeProps): ReactElement | null {
  if (!url) return null
  return (
    <figure
      data-slot="reference-image-badge"
      data-reference-image
      aria-label={label}
      className={cx(styles.badge, className)}
      {...props}
    >
      <img
        src={url}
        alt={label}
        className={styles.badgeImg}
        draggable={false}
      />
      <figcaption className={styles.badgeCaption}>
        {label}
      </figcaption>
    </figure>
  )
}
