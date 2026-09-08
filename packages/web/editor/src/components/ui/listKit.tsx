// listKit — the ONE presentational component family for every sidebar list.
//
// Replaces the duplicated RowAction variants (AppSidebar bare + with
// active+danger, TileAction) + the per-sidebar ListRow/
// AssetRow reinventions. Each sidebar maps its domain model into these
// components via type-safe props; the kit owns layout, hover states, active
// highlight, and the empty/loading/error trio.
//
// CLOSED SYSTEM: these are the ONLY list primitives. A sidebar that needs
// a new shape extends the kit (adding a variant or prop), not copies a row.
// That's the one-pattern-one-system discipline.
import { type ReactNode, type RefObject } from "react"
import { ChevronDown, FolderOpen, AlertCircle } from "lucide-react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@melite/ui/collapsible"
import { Badge } from "@melite/ui/badge"
import { Skeleton } from "@melite/ui/skeleton"
import { Tip } from "@melite/ui/tip"
import { cn } from "@melite/ui"

// ── RowAction — the ONE icon-button definition (was 3x duplicated) ────────

export function RowAction({
  children,
  onClick,
  title,
  active,
  danger,
  variant = "row",
}: {
  children: ReactNode
  onClick: (e: React.MouseEvent) => void
  title: string
  active?: boolean
  danger?: boolean
  /** "row" (default) sits in a list row — muted until hover/active.
   *  "tile" sits over an image preview — dark translucent so it reads against
   *  any backdrop. Absorbs the old AppSidebar TileAction into one definition. */
  variant?: "row" | "tile"
}) {
  return (
    <Tip tip={title}>
      <button
        onClick={onClick}
        aria-label={title}
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded backdrop-blur-sm transition-colors",
          variant === "tile"
            ? cn(
                "bg-black/55 text-foreground/80 hover:bg-black/80 hover:text-foreground",
                active && "bg-brand/30 text-brand",
                danger && "hover:text-red-400",
              )
            : cn(
                "text-muted-foreground/70",
                active ? "bg-brand/20 text-brand" : "hover:bg-sidebar/80",
                danger ? "hover:text-red-400" : "hover:text-foreground",
              ),
        )}
      >
        {children}
      </button>
    </Tip>
  )
}

// ── ListRow — the unified row layout (was ThreadRow / AssetRow) ──────────

export function ListRow({
  icon: Icon,
  title,
  subtitle,
  meta,
  active,
  onClick,
  onDoubleClick,
  actions,
  draggable,
  onDragStart,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  active?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
  actions?: ReactNode
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  className?: string
}) {
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={draggable}
      onDragStart={onDragStart}
      // aria-current="true" on the active row — the semantic flag for screen
      // readers. Was bespoke per-sidebar (ServicesSidebar's inline button set
      // it manually); now the shared primitive does it for every caller.
      aria-current={active ? "true" : undefined}
      className={cn(
        "group/row relative flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
        active
          ? "bg-brand/10 ring-1 ring-brand/30"
          : "hover:bg-sidebar-accent",
        className,
      )}
    >
      {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-brand" : "text-brand/70")} />}
      <span className="min-w-0 flex-1">
        <Tip tip={typeof title === "string" ? title : undefined}>
          <span className={cn(
            "block truncate text-xs leading-tight",
            active ? "font-medium text-brand" : "text-foreground/95",
          )}>
            {title}
          </span>
        </Tip>
        {subtitle && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {meta && <span className="shrink-0 text-[10px] text-muted-foreground/60">{meta}</span>}
      {actions && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 group-hover/row:flex">
          {actions}
        </div>
      )}
    </div>
  )
}

// ── SectionHeader — collapsible section with count badge ─────────────────

export function SectionHeader({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  children,
  className,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  count?: number
  defaultOpen?: boolean
  children?: ReactNode
  /** Trigger className override — merged AFTER the defaults via cn, so a
   *  caller can bump text size / weight / padding (tailwind-merge resolves
   *  conflicts). ServicesSidebar keeps the default; LibrarySidebar passes
   *  a larger variant. The icon + count badge + chevron scale naturally. */
  className?: string
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <CollapsibleTrigger className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium tracking-tight text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
        className,
      )}>
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {/* tracking-tight lives on the trigger (not the span) so a caller's
            tracking override via className merges and wins (History-style
            section labels, 2026-08-15). Default look is unchanged. */}
        <span className="flex-1 text-left">{title}</span>
        {typeof count === "number" && (
          <Badge variant="secondary" className="h-4 min-w-4 px-1 justify-center text-[10px] tabular-nums">
            {count}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[panel-open]/collapsible:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}

// ── SearchInput — the unified search field ───────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  icon: Icon,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  /** Optional leading icon (e.g. lucide Search). When set, the input gains
   *  left padding so text doesn't overlap the icon. */
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 py-1 text-[11px] text-sidebar-foreground placeholder:text-muted-foreground/40 outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/30 transition-colors",
          Icon ? "pl-7 pr-2" : "px-2",
        )}
      />
    </div>
  )
}

// ── TileGrid — the ONE sidebar tile-grid (auto-fill, never stretch) ──────
// The Media archive's sizing law (2026-08-22), promoted here so EVERY
// sidebar tile grid shares one definition: tiles are FIXED-SIZE and NEVER
// resize with the rail — extra width becomes MORE COLUMNS (CSS auto-fill),
// not wider tiles. The capability rail's old flex-wrap (min-w-[50%] +
// flex-1) stretched with the panel instead; rendering every tile row
// through this primitive keeps the sidebars from drifting apart again.

/** The fixed sidebar tile width. Tailwind cannot see interpolations, so the
 *  track size is spelled out literally in the class below — touch one,
 *  touch both (tsc will not catch the drift). */
export const SIDEBAR_TILE_PX = 118

export function TileGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-1 px-1 pb-1.5 [grid-template-columns:repeat(auto-fill,118px)]",
        className,
      )}
    >
      {children}
    </div>
  )
}

// ── The empty/loading/error trio (was per-sidebar) ───────────────────────

export function ListLoading({ title = "Loading…" }: { title?: string }) {
  // Skeleton rows mirror the row shape the real list will render (a
  // thumb + two text lines) so the user sees structural feedback instead
  // of a spinning dot. aria-busy + the title keep it accessible; the
  // pulse comes from the Skeleton primitive.
  return (
    <div role="status" aria-busy="true" aria-label={title} className="flex flex-col gap-1 px-1 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md px-1.5 py-1.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
      <span className="sr-only">{title}</span>
    </div>
  )
}

export function ListEmpty({
  icon: Icon = FolderOpen,
  title = "Nothing here yet.",
  hint,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title?: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center gap-2">
      <Icon className="h-7 w-7 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground/70">{title}</p>
      {hint && <p className="text-[10px] text-muted-foreground/50">{hint}</p>}
    </div>
  )
}

export function ListError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <AlertCircle className="h-7 w-7 text-destructive/50" />
      <p className="text-xs text-destructive">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-brand hover:underline">
          Retry
        </button>
      )}
    </div>
  )
}

// ── VirtualList — the ONE windowed list primitive ─────────────────────────
// Virtualization for long lists: only the items near the scroll offset are in
// the DOM; a spacer div keeps the total scroll height honest. This is what
// lets a surface render an UNBOUNDED list (no pagination caps) with bounded
// DOM. The consumer passes the scroll container ref (a ScrollArea viewport
// ref) — multiple VirtualLists can share one container (e.g. one per open
// category in a grouped sidebar).
//
// ESTIMATE vs MEASURE: `estimateSize` seeds the layout (the virtualizer must
// know heights before elements exist); `measureElement` self-corrects to the
// real rendered height once the browser lays out. This is also the TEST-MODE
// escape hatch: happy-dom returns zero rects for everything, so the fallback
// (`|| estimateSize(0)`) keeps heights sane and `initialRect` sizes the
// window so items actually render — real browsers re-measure and stay exact.

export function VirtualList<T>({
  items,
  parentRef,
  estimateSize,
  render,
  overscan = 4,
}: {
  items: readonly T[]
  /** The scroll container (a ScrollArea viewport ref). */
  parentRef: RefObject<HTMLElement | null>
  /** Height of the item at index — used until the browser measures it. */
  estimateSize: (index: number) => number
  render: (item: T, index: number) => ReactNode
  /** Extra items rendered above/below the visible window. */
  overscan?: number
}) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan,
    initialRect: { width: 0, height: 640 },
    measureElement: (el) => el.getBoundingClientRect().height || estimateSize(0),
  })
  const vItems = virtualizer.getVirtualItems()
  return (
    <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
      {vItems.map((vi) => (
        <div
          key={vi.key}
          // data-index is the measureElement ref contract: the virtualizer
          // associates the measured element with its virtual item by this
          // attribute — without it, ref-based measurement warns and
          // misattributes sizes.
          data-index={vi.index}
          ref={virtualizer.measureElement}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${vi.start}px)`,
          }}
        >
          {render(items[vi.index], vi.index)}
        </div>
      ))}
    </div>
  )
}
