// DrawerPanel — shared shell for the four left-drawer panels (Media,
// Characters, Motion, Flow). Each drawer slides in from the left,
// right after the ActivityBar. The shell owns: the header (icon + title
// + subtitle + close), the scrollable body, and the neon seam styling.
//
// VISUAL DESIGN: matches the sidebar darkest-tier background (bg-sidebar)
// so drawers recede and the center viewport pops. The header carries a
// bottom hairline divider (gradient brand-tinted) for section separation.
// The close button is a ghost icon that brightens on hover.
import type { ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@melite/ui"
import { Tip } from "@melite/ui/tip"

interface Props {
  /** Lucide icon rendered in the header next to the title. */
  icon: ReactNode
  /** Panel title — uppercase, tracked. */
  title: string
  /** One-line subtitle shown under the title in muted text. */
  subtitle?: string
  /** Close handler — called when the X button is clicked. */
  onClose: () => void
  /** Panel body. The shell wraps it in a ScrollArea. */
  children: ReactNode
  /** Optional right-aligned content in the header (e.g. a count badge). */
  headerTrailing?: ReactNode
  /** Extra className for the root element. */
  className?: string
}

export function DrawerPanel({
  icon,
  title,
  subtitle,
  onClose,
  children,
  headerTrailing,
  className,
}: Props) {
  return (
    <aside
      className={cn(
        "flex w-72 shrink-0 flex-col border-r border-sidebar-border/60 bg-sidebar min-h-0",
        className,
      )}
    >
      {/* Header — 44px tall, icon + title + subtitle, close button right */}
      <header className="tn-seam relative flex h-11 shrink-0 items-center gap-2 px-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/12 text-brand">
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground">
            {title}
          </span>
          {subtitle && (
            <span className="truncate text-[10px] text-muted-foreground/80">
              {subtitle}
            </span>
          )}
        </div>
        {headerTrailing}
        <Tip tip="Close panel">
          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent/70 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </Tip>
        {/* Bottom hairline — gradient brand-tinted divider */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-px h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand) 18%, transparent) 50%, transparent)",
          }}
        />
      </header>
      {/* Body — scrollable, brand-tinted thin scrollbar */}
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  )
}

/**
 * A section header inside a drawer body — used to group related items
 * (e.g. "Presets", "Saved", "Imports" in the Character Library).
 */
export function DrawerSection({
  label,
  count,
  children,
}: {
  label: string
  count?: number
  children: ReactNode
}) {
  return (
    <div className="px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          aria-hidden
          className="h-1 w-1 rounded-full bg-brand/70"
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
          {label}
        </span>
        {typeof count === "number" && (
          <span className="ml-auto rounded-full bg-accent/60 px-1.5 text-[10px] tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/**
 * Empty state — shown when a drawer section has no items. Centered icon
 * + message + hint. Uses muted tones so it recedes.
 */
export function DrawerEmpty({
  icon,
  message,
  hint,
}: {
  icon: ReactNode
  message: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-2 text-muted-foreground/25">{icon}</div>
      <p className="text-xs text-muted-foreground/70">{message}</p>
      {hint && (
        <p className="mt-1 text-[10px] text-muted-foreground/45">{hint}</p>
      )}
    </div>
  )
}
