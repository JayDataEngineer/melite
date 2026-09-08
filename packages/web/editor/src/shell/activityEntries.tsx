// activityEntries — the FIRST-PARTY activity registrations (the dogfood
// law: first-party surfaces ride the same seams a third party would —
// DSH-PLUGIN-GAP-ANALYSIS.md §8.1). Every icon that used to live in
// PRIMARY_ITEMS / DRAWER_ITEMS / STUDIO_ITEMS arrays in ActivityBar.tsx is
// a registration here, in ledger order:
//
//   PRIMARY: library (20)              — the main workspace (the Agent
//                                       center tab died 2026-08-21 with the
//                                       native-agent chat; the assistant
//                                       lives in the DSH plugins)
//   DRAWER:  media (20)                 — content drawer (the Chat History
//                                       drawer died with the chat)
//   STUDIO:  (empty)                    — the studios are ACTION CARDS on the
//                                       Library canvas (the card seam), not
//                                       tabs — Pose's rail icon died 2026-08-21.
//                                       The seat stays declared: a future
//                                       studio registers without a layout edit.
//   FOOT:    plugins (10)               — the Plugins inventory (§6.4: the
//                                       HTTP register surface's panel; the
//                                       removed settings gear's seam reused)
//
// A third party (or a plugin under packages/*/shell/ once that lane lands)
// registers at an interleaving order — no rail edit, no union to extend.
// The gate test (src/__tests__/shell-slots.gate.test.tsx) pins these exact
// ids and tiers, so silent removal of a first-party entry fails CI.
import {
  Blocks,
  FolderTree,
  Puzzle,
} from "lucide-react"
import { shellSlots, type ActivityOwnerProps } from "@/shell/seats"
import { ActivityButton, type ActivityItem } from "@/surfaces/shared/ActivityBar"

const LIBRARY: ActivityItem = {
  id: "library",
  icon: Blocks,
  label: "Library",
  hint: "Card canvas · capability tiles · author flows",
}
const MEDIA: ActivityItem = {
  id: "media",
  icon: FolderTree,
  label: "History / Media",
  hint: "Asset gallery · generations · imports",
}
const PLUGINS: ActivityItem = {
  id: "packages",
  icon: Puzzle,
  label: "Plugins",
  hint: "Inventory · enable / disable · reversible unregister",
}

/** Wrap one item as a seat component: the atom plus the owner share. */
function entryFor(item: ActivityItem) {
  const Entry = ({ active, onSelect }: ActivityOwnerProps) => (
    <ActivityButton item={item} isActive={active.has(item.id)} onSelect={onSelect} />
  )
  Entry.displayName = `ActivityEntry(${item.id})`
  return Entry
}

const REGISTRANT = "melite-shell/first-party"

export const disposeActivityEntries = [
  shellSlots.register(
    { name: "activity.primary", id: "library", order: 20, registrant: REGISTRANT },
    entryFor(LIBRARY),
  ),
  shellSlots.register(
    { name: "activity.drawer", id: "media", order: 20, registrant: REGISTRANT },
    entryFor(MEDIA),
  ),
  shellSlots.register(
    { name: "activity.foot", id: "packages", order: 10, registrant: REGISTRANT },
    entryFor(PLUGINS),
  ),
]
