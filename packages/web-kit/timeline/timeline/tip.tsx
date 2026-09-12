/**
 * timeline/tip — the bar's tooltip wrapper on the DSH Tooltip atom
 * (DSH-pure UI law: the shared kit's Radix Tip is gone from this package).
 *
 * Same call-site API as the shared-kit Tip it replaces ({tip,
 * shortcut, side, delayDuration, className, withArrow, children}), so
 * every call site below is untouched apart from the import. Mapping:
 * tip → Tooltip label (undefined renders the child bare, as before);
 * shortcut appends to the label text (the DSH bubble is text-only);
 * side keeps the melite default 'top' ('left' has no DSH counterpart
 * and falls back to 'right'); delayDuration → delayMs. className /
 * withArrow have no DSH-Tooltip counterpart and are accepted-but-
 * ignored (no call site in this package sets them).
 */
import type { ReactElement } from "react"
import { Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import type { TooltipSide } from "@deepseek-ai/dsh-client-ui-primitives"

type TipSide = "top" | "bottom" | "left" | "right"

interface TipProps {
  /** Short human-readable label shown in the tooltip bubble. When
   *  undefined the trigger renders bare (no Tooltip). */
  tip?: string
  /** Optional keyboard shortcut shown after the label. */
  shortcut?: string
  /** Which side of the trigger the tooltip appears on. Defaults to top. */
  side?: TipSide
  /** Delay (ms) before the tooltip appears. Defaults to 300 (the melite Tip default). */
  delayDuration?: number
  /** Accepted for call-site compatibility; the DSH bubble owns its chrome. */
  className?: string
  /** Accepted for call-site compatibility; the DSH bubble has no arrow. */
  withArrow?: boolean
  /** The trigger element — a single element (the DSH Tooltip clones it
   *  to attach hover/focus handlers; its own handlers are chained). */
  children: ReactElement<any>
}

const toTooltipSide = (side: TipSide): TooltipSide =>
  side === "left" ? "right" : side

export function Tip({
  tip,
  shortcut,
  side = "top",
  delayDuration = 300,
  className: _className,
  withArrow: _withArrow,
  children,
}: TipProps) {
  if (tip === undefined) return children
  const label = shortcut ? `${tip} (${shortcut})` : tip
  return (
    <Tooltip label={label} side={toTooltipSide(side)} delayMs={delayDuration}>
      {children}
    </Tooltip>
  )
}
