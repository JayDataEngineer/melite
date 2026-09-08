// RailTabBar — the right sidebar's browser-style top bar (H-RIGHT).
//
// One row: a chip per OPEN pane tab (icon + label + an × that closes just
// that tab), then the "+" button — the browser's new-tab affordance. The
// + opens a MENU asking which pane to add (every mode-visible pane that
// isn't already a tab); picking one re-adds it and selects it. The far
// right × closes the whole rail (the header toggle's twin).
//
// Keyboard contract: roving tabindex across the chips (ArrowLeft/Right
// move BOTH selection and focus, browser-style), the menu is a real
// role="menu" (ArrowUp/Down navigate, Enter picks, Escape dismisses and
// restores focus to +, outside pointerdown dismisses).
import { useEffect, useRef, useState, type ComponentType } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@melite/ui"

export interface RailTab {
  id: string
  label: string
  /** The pane meta's icon — deliberately the WIDE component type (any
   *  className-driven icon), not lucide's narrower LucideIcon. */
  icon?: ComponentType<{ className?: string }>
}

interface RailTabBarProps {
  tabs: RailTab[]
  activeId: string
  /** Mode-visible panes NOT currently tabs — the + menu's items. */
  addable: RailTab[]
  /** The active pane's subtitle (a slim line under the bar). */
  subtitle?: string
  onSelect: (id: string) => void
  onCloseTab: (id: string) => void
  onAdd: (id: string) => void
  onCloseRail: () => void
}

export function RailTabBar({
  tabs, activeId, addable, subtitle,
  onSelect, onCloseTab, onAdd, onCloseRail,
}: RailTabBarProps) {
  const chipRefs = useRef<Array<HTMLDivElement | null>>([])

  const selectNeighbor = (index: number, dir: 1 | -1) => {
    const next = (index + dir + tabs.length) % tabs.length
    onSelect(tabs[next].id)
    chipRefs.current[next]?.focus()
  }

  const activeLabel = tabs.find((t) => t.id === activeId)?.label ?? "panel"

  return (
    <div className="flex shrink-0 flex-col border-b border-sidebar-border/60 bg-sidebar/70">
      <div className="flex h-9 items-center gap-0.5 px-1.5">
        <div
          role="tablist"
          aria-label="Right sidebar panes"
          className="flex min-w-0 items-center gap-0.5"
        >
          {tabs.map((t, i) => {
            const active = t.id === activeId
            const Icon = t.icon
            return (
              <div
                key={t.id}
                ref={(el) => { chipRefs.current[i] = el }}
                role="tab"
                tabIndex={active ? 0 : -1}
                aria-selected={active}
                aria-label={t.label}
                data-active={active || undefined}
                onClick={() => onSelect(t.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") { e.preventDefault(); selectNeighbor(i, 1) }
                  else if (e.key === "ArrowLeft") { e.preventDefault(); selectNeighbor(i, -1) }
                  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(t.id) }
                }}
                className={cn(
                  "group flex h-6 min-w-0 cursor-pointer select-none items-center gap-1 rounded-sm px-1.5 text-[10px] font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-brand/60",
                  active
                    ? "bg-sidebar-accent/60 text-foreground"
                    : "text-muted-foreground/70 hover:text-foreground",
                )}
              >
                {Icon && <Icon className="h-3 w-3 shrink-0" />}
                <span className="max-w-[110px] truncate leading-none">{t.label}</span>
                <button
                  type="button"
                  aria-label={`Close ${t.label} tab`}
                  onClick={(e) => { e.stopPropagation(); onCloseTab(t.id) }}
                  className={cn(
                    "ml-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] text-muted-foreground/50 transition-opacity hover:bg-accent/60 hover:text-foreground",
                    active ? "opacity-90" : "opacity-40 group-hover:opacity-90",
                  )}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )
          })}
        </div>
        {addable.length > 0 && <PlusMenu items={addable} onAdd={onAdd} />}
        <div className="flex-1" />
        <button
          type="button"
          aria-label={`Close ${activeLabel} panel`}
          onClick={onCloseRail}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {subtitle && (
        <div className="truncate px-3 pb-1.5 text-[10px] leading-none text-muted-foreground/80">
          {subtitle}
        </div>
      )}
    </div>
  )
}

// ── The + menu (browser new-tab → "which pane?") ────────────────────────

function PlusMenu({ items, onAdd }: { items: RailTab[]; onAdd: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Dismissal: outside pointerdown + Escape (focus restored to +).
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  // Opening focuses the first item (menu keyboard contract).
  useEffect(() => {
    if (!open) return
    rootRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      ?.focus()
  }, [open])

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    )
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === "ArrowDown") {
      e.preventDefault()
      items[(i + 1 + items.length) % items.length]?.focus()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length]?.focus()
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        aria-label="Add a pane"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent/60 hover:text-foreground"
      >
        <Plus className="h-3 w-3" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Available panes"
          onKeyDown={onMenuKeyDown}
          className="absolute left-0 top-full z-50 mt-1 min-w-[170px] rounded-md border border-sidebar-border/60 bg-background p-1 shadow-md"
        >
          {items.map((it) => {
            const Icon = it.icon
            return (
              <button
                key={it.id}
                type="button"
                role="menuitem"
                onClick={() => { setOpen(false); onAdd(it.id) }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-foreground/90 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
              >
                {Icon && <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />}
                <span className="truncate">{it.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
