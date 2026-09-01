// ProvenanceBadge — the agent-generated marker, rendered next to the
// ServiceBadge in card surfaces.
//
// BACKEND CONTRACT: backend/core/ui/list_filter_schema.py :: Provenance.
// The closed vocabulary is {agent, user, imported}. This component renders
// nothing for `user` (the silent default — user-authored is the baseline,
// no need to badge it) and for undefined provenance (graceful rollout:
// existing call sites that don't set the field keep rendering unchanged).
//
// `agent`    → Sparkles icon, brand accent, "Agent" label
// `imported` → Download icon, sky accent, "Imported" label
// `user`     → null
// undefined  → null

import { isProvenance, Provenance } from "@melite/contracts"
import { Sparkles, Download, type LucideIcon } from "lucide-react"
import { cn } from "./utils"
import { Tip } from "./tip"

export function ProvenanceBadge({
  provenance,
  /** compact = icon only (for dense tiles); default = icon + label. */
  compact = false,
  className,
}: {
  provenance?: Provenance
  compact?: boolean
  className?: string
}) {
  // Graceful rollout: unset or invalid → render nothing. The isProvenance
  // guard means a past run with a typo in its metadata doesn't crash the
  // card — it silently degrades to "no badge."
  if (!provenance || !isProvenance(provenance)) return null
  // The silent default — user-authored cards don't get a badge.
  if (provenance === "user") return null

  const meta = PROVENANCE_META[provenance]
  const Icon = meta.icon
  return (
    <Tip tip={meta.hint}>
      <span
        aria-label={meta.label}
        className={cn(
          "inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold",
          meta.accent,
          className,
        )}
      >
        <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
        {!compact && <span>{meta.label}</span>}
      </span>
    </Tip>
  )
}


// ── Presentation metadata — one source of truth for the badge + the filter
//    chip + any future provenance surface. Adding a value means adding a
//    row here AND in the backend enum in the same edit. ──

export interface ProvenanceMeta {
  /** Lucide icon — rendered at h-2.5 w-2.5 (tile) or h-3 w-3 (badge). */
  icon: LucideIcon
  /** Tailwind text-color class for the icon + label. */
  accent: string
  /** User-facing label (title attribute + filter chip text). */
  label: string
  /** One-line description for tooltips. */
  hint: string
}

export const PROVENANCE_META: Record<Provenance, ProvenanceMeta> = {
  agent: {
    icon: Sparkles,
    accent: "text-brand",
    label: "Agent",
    hint: "Built by the agent",
  },
  user: {
    icon: Sparkles, // never rendered — user is the silent default
    accent: "text-muted-foreground",
    label: "You",
    hint: "Hand-authored by you",
  },
  imported: {
    icon: Download,
    accent: "text-sky-500",
    label: "Imported",
    hint: "Loaded from a past run or external source",
  },
}
