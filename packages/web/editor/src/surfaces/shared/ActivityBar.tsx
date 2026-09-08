// ActivityBar — the thin ComfyUI/VS-Code-style icon rail on the far left.
//
// SEAM MIGRATION (2026-08-19, DSH-PLUGIN-GAP-ANALYSIS.md §8.1 — the Minimal
// Shell proof cut): this rail is now an OWNER over slot seats, not a
// hardcoded list. The closed `ActivityPanel` union and the PRIMARY/DRAWER/
// STUDIO item arrays are GONE (gate-tested in
// src/__tests__/shell-slots.gate.test.tsx); the four tier seats
// (activity.primary / .drawer / .studio / .foot) are declared by THIS
// module's owner registration into the a-priori 'root' seat, and every
// icon — including all first-party ones — is a registration in
// @/shell/activityEntries.tsx. A third party adds an icon by registering
// into a seat; nobody edits this file to add navigation.
//
// The registration below stores this component as the 'root' occupant for
// the future root outlet; until the center-seat migration lands,
// WorkspaceLayout renders <ActivityBar/> directly — the same component, one
// render bridge, no second chrome system for this surface.
//
// This is the ALWAYS-VISIBLE spine of the editor's panel system. Each icon
// maps to a concrete drawer (Media, History) or a quick-jump to a CENTER
// tab (Agent, Library). Click an active icon → toggle it off. Multiple icons
// can be active simultaneously — this uses a Set, not a single value.
//
// VISUAL DESIGN: TECH NOIR — the rail is the darkest tier (bg-sidebar) with
// a neon top seam (tn-seam). Active buttons carry a gradient left-rail +
// inner cyan glow + icon text-shadow. Inactive buttons lift to bg-accent on
// hover. The two tiers (primary surfaces + drawers) are separated by a
// gradient hairline. Every transition uses ease-out for tactile responsiveness.
//
import { Blocks } from "lucide-react"
import { cn } from "@melite/ui"
import { shellSlots, type ActivityOwnerProps } from "@/shell/seats"
import { SlotOutlet } from "@melite/slots"

/** One rail entry's descriptor — the data every activity entry renders
 * through the ActivityButton atom. Ids are seat vocabulary: the seat is
 * the authority, and the gate test pins the first-party set. */
export interface ActivityItem {
  id: string
  icon: typeof Blocks
  label: string
  /** Short hint shown under the label in the tooltip. */
  hint: string
}

/**
 * A single icon button in the rail. The active state carries three layers:
 * (1) a gradient left-rail [brand→brand/40], (2) a soft inner glow
 * (inset 0 0 0 1px brand/25 + icon text-shadow), (3) a tonal background
 * (gradient from-brand/15). Inactive buttons get a bg-accent lift on hover
 * with the icon brightening from muted to foreground.
 */
export function ActivityButton({
  item,
  isActive,
  onSelect,
}: {
  item: ActivityItem
  isActive: boolean
  onSelect: (id: string) => void
}) {
  const Icon = item.icon
  return (
    <button
      onClick={() => onSelect(item.id)}
      aria-pressed={isActive}
      aria-label={item.label}
      title={`${item.label} — ${item.hint}`}
      style={
        isActive
          ? {
              // Layer 2: inner cyan glow ring + icon halo
              boxShadow:
                "inset 0 0 0 1px color-mix(in srgb, var(--brand) 22%, transparent), 0 0 14px -4px color-mix(in srgb, var(--brand) 35%, transparent)",
            }
          : undefined
      }
      className={cn(
        // Base: 36px hit target, centered icon, rounded, transitions
        "group relative flex h-9 w-9 items-center justify-center rounded-lg",
        "transition-[background-color,box-shadow,color,transform] duration-150 ease-out",
        "outline-none focus-visible:ring-1 focus-visible:ring-brand/50",
        isActive
          ? // Active: gradient bg + brand-colored icon
            "bg-gradient-to-br from-brand/18 to-brand/[0.04] text-brand"
          : // Inactive: muted icon, hover lifts to accent + foreground
            "text-muted-foreground/70 hover:bg-accent/70 hover:text-foreground",
      )}
    >
      {/* Layer 1: the gradient left-rail — 2px wide, full button height */}
      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-r-full"
          style={{
            background:
              "linear-gradient(180deg, var(--brand) 0%, color-mix(in srgb, var(--brand) 40%, transparent) 100%)",
            boxShadow: "0 0 8px -1px color-mix(in srgb, var(--brand) 60%, transparent)",
          }}
        />
      )}
      {/* The icon — active gets a cyan text-shadow halo for neon-on-noir feel */}
      <Icon
        className={cn(
          "h-[18px] w-[18px] transition-transform duration-150",
          isActive ? "drop-shadow-[0_0_5px_color-mix(in_srgb,var(--brand)_55%,transparent)]" : "group-hover:scale-105",
        )}
      />
    </button>
  )
}

/** The gradient hairline that separates rail tiers. */
function RailDivider() {
  return (
    <div
      aria-hidden
      className="mx-2 my-1.5 h-px w-7 rounded-full"
      style={{
        background:
          "linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand) 22%, transparent) 50%, transparent)",
      }}
    />
  )
}

interface Props {
  /** Which ids are currently active (Set — multiple can be active). */
  active: ReadonlySet<string>
  onSelect: (id: string) => void
}

export function ActivityBar({ active, onSelect }: Props) {
  const ctx: ActivityOwnerProps = { active, onSelect }
  return (
    <div className="tn-seam relative z-30 flex w-12 shrink-0 flex-col items-center border-r border-sidebar-border/60 bg-sidebar py-2.5 select-none">
      {/* Tier 1 — PRIMARY surfaces: Agent + Library (the two main
          workspaces) — seat: activity.primary */}
      <div className="flex flex-col items-center gap-1">
        <SlotOutlet core={shellSlots} name="activity.primary" ctx={ctx} />
      </div>

      <RailDivider />

      {/* Tier 2 — DRAWERS: Media, Chat History (Flow Nodes merged
          into the Library rail, ONE_SURFACE Phase 4) — seat: activity.drawer */}
      <div className="flex flex-col items-center gap-1">
        <SlotOutlet core={shellSlots} name="activity.drawer" ctx={ctx} />
      </div>

      {/* Spacer keeps the rail top-heavy (settings gear removed 2026-08-13). */}
      <div className="flex-1" />

      {/* Tier 3 — STUDIOS: Pose (restored 2026-08-14) — seat: activity.studio */}
      <div className="flex flex-col items-center gap-1">
        <SlotOutlet core={shellSlots} name="activity.studio" ctx={ctx} />
      </div>

      {/* Tier 4 — FOOT: bottom utility entries — seat: activity.foot
          (empty today; renders nothing until something registers). */}
      <div className="flex flex-col items-center gap-1">
        <SlotOutlet core={shellSlots} name="activity.foot" ctx={ctx} />
      </div>
    </div>
  )
}

// ── OWNER REGISTRATION ──────────────────────────────────────────────────
// The rail registers into the a-priori 'root' seat and declares its four
// tier seats in the same call: declaration = render authorization. The
// children table is the whole seat vocabulary this owner opens; a second
// declarer of any of these keys is a loud failure, and disposing this
// registration collapses every seat it declared.
export const disposeActivityRail = shellSlots.register(
  {
    name: "root",
    id: "activity-rail",
    registrant: "melite-shell/activity-bar",
    children: {
      "activity.primary": { kind: "list" },
      "activity.drawer": { kind: "list" },
      "activity.studio": { kind: "list" },
      "activity.foot": { kind: "list" },
    },
  },
  ActivityBar,
)
