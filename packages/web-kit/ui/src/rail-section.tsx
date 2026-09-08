import type { ComponentProps } from "react"
import { cn } from "./utils"

/**
 * RailSection — THE shared rail grouping (row 5 follow-up).
 *
 * Anny alone carried six copies of the rounded-lg/border/px-3/py-2
 * box with the 10px uppercase title; mask and body tenants each
 * carried their own variant. ONE section, verbatim visuals. Props
 * spread onto the <section> (id, data-*, aria) — the shadcn rule.
 *
 * shadcn rules: data-slot, cn(), className wins.
 */
export interface RailSectionProps extends Omit<ComponentProps<"section">, "title"> {
  /** Section title (the uppercase heading). */
  title: React.ReactNode
  /** Optional right-aligned action (button, chip, count). */
  actions?: React.ReactNode
  /** Override for the title line. */
  titleClassName?: string
}

export function RailSection({ title, actions, children, className, titleClassName, ...props }: RailSectionProps) {
  return (
    <section
      data-slot="rail-section"
      aria-label={typeof title === "string" ? title : undefined}
      className={cn("rounded-lg border border-sidebar-border/50 px-3 py-2", className)}
      {...props}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70",
          titleClassName
        )}>
          {title}
        </p>
        {actions}
      </div>
      {children}
    </section>
  )
}
