import type { ComponentProps, ReactNode } from "react"
import { cn } from "./utils"

/**
 * ViewportFrame — THE shared viewport box (row 5 follow-up).
 *
 * Every large-view tenant hand-rolled the same frame before:
 * assembly, body, anny, motion and PaintCanvas2D all carried the
 * relative/overflow-hidden/rounded-lg/border/sidebar frame over the
 * dark stage wash, with private min-h values (340 vs 440) and private
 * empty states.
 *
 * ONE frame, verbatim visuals: the default class string is the
 * assembly one (min-h-340). Anny passes min-h-[440px] through
 * className (twMerge resolves the min-h conflict); motion passes its
 * drag-ring border color the same way and its drop handlers through
 * the div props (every HTMLDivElement attribute forwards — drop
 * targets, refs, aria). Empty content renders through the empty prop
 * — never a second hand-rolled absolute box.
 *
 * shadcn rules: data-slot, cn(), className wins, props spread.
 */
export interface ViewportFrameProps extends ComponentProps<"div"> {
  /** Accessible label for the viewport region (renders as aria-label). */
  label?: string
  /** Shown when there is nothing on the stage. */
  empty?: ReactNode
}

export function ViewportFrame({ children, label, empty, className, ...props }: ViewportFrameProps) {
  return (
    <div
      data-slot="viewport-frame"
      aria-label={label}
      className={cn(
        "relative min-h-[340px] flex-1 overflow-hidden rounded-lg border border-sidebar-border/50 bg-[#0e0e1a]",
        className
      )}
      {...props}
    >
      {children}
      {empty}
    </div>
  )
}
