import type { ReactNode } from "react"
import { cn } from "./utils"

/**
 * EmptyState — THE shared nothing-here block (row 5 follow-up).
 *
 * Assembly (No parts on the stage yet), H3 (No render yet) and motion
 * (No motion yet / Run the card) each hand-rolled a centered icon +
 * two-line note. TWO placements, one vocabulary:
 *
 *   overlay — absolute inset-0 over a viewport (Stage, figure, canvas).
 *   pane    — in-flow block inside a preview/strip pane.
 *
 * shadcn rules: data-slot, cn(), className wins.
 */
export type EmptyStateVariant = "overlay" | "pane"

export interface EmptyStateProps {
  /** Small glyph above the title. */
  icon?: ReactNode
  title: ReactNode
  hint?: ReactNode
  variant?: EmptyStateVariant
  className?: string
}

export function EmptyState({ icon, title, hint, variant = "pane", className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      data-variant={variant}
      className={cn(
        variant === "overlay"
          ? "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-6 text-center"
          : "flex h-full w-full flex-col items-center justify-center gap-1.5 py-6 text-center",
        className
      )}
    >
      {icon}
      <p className="text-xs font-medium text-foreground/70">{title}</p>
      {hint != null ? (
        <p className="max-w-100 text-[10px] leading-relaxed text-muted-foreground/50">{hint}</p>
      ) : null}
    </div>
  )
}
