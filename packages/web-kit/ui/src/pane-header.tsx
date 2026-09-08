import type { ReactNode } from "react"
import { cn } from "./utils"

/**
 * PaneHeader + PaneShell — THE shared pane chrome (row 5 follow-up).
 *
 * The H3 strip (StudioStripPane), the motion bar transport header and
 * the H3/motion preview headers all hand-rolled the same title/meta/
 * hint line. TWO variants, verbatim visuals:
 *
 *   strip   — the bordered header over a timeline/transport bar
 *             (border-b row, meta readout, ml-auto hint). The lead
 *             slot carries leading interactive clusters (the motion
 *             transport: play/time/fps ride BEFORE the title).
 *   preview — the borderless header over a preview pane
 *             (baseline row, sub note).
 *
 * PaneShell is the outer wrapper both variants sit in.
 * shadcn rules: data-slot, cn(), className wins.
 */
export type PaneHeaderVariant = "strip" | "preview"

export interface PaneHeaderProps {
  /** The pane title (omit when the row is pure chrome — e.g. a
   *  transport bar whose identity rides the lead cluster). */
  title?: ReactNode
  /** Small readout beside the title (counts, frames, fps). */
  meta?: ReactNode
  /** Right-aligned hint or action cluster (ml-auto). */
  hint?: ReactNode
  /** Leading cluster before the title (transport controls). */
  lead?: ReactNode
  variant?: PaneHeaderVariant
  className?: string
}

export function PaneHeader({ title, meta, hint, lead, variant = "strip", className }: PaneHeaderProps) {
  if (variant === "preview") {
    return (
      <div data-slot="pane-header" data-variant="preview" className={cn("flex shrink-0 items-baseline gap-1.5 pb-1.5", className)}>
        {lead}
        {title != null ? <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">{title}</span> : null}
        {meta != null ? <span className="text-[9px] text-muted-foreground/50">{meta}</span> : null}
        {hint}
      </div>
    )
  }
  return (
    <div
      data-slot="pane-header"
      data-variant="strip"
      className={cn("flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-2.5 py-1", className)}
    >
      {lead}
      {title != null ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">{title}</span>
      ) : null}
      {meta != null ? (
        <span className="text-[9px] tabular-nums text-muted-foreground/50">{meta}</span>
      ) : null}
      {hint != null ? <span className="ml-auto text-[9px] text-muted-foreground/45">{hint}</span> : null}
    </div>
  )
}

export function PaneShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-slot="pane-shell" className={cn("shrink-0 overflow-hidden rounded-md border border-white/10", className)}>
      {children}
    </div>
  )
}
