// rightPanelEntries — the FIRST-PARTY right-panel pane registrations
// (H-RIGHT lane, §16.7). The right sidebar is a TAB HOST (the DSH
// pattern, adapted to melite's seam law): the HOST owns the chrome + the
// internal tab strip; panes are REGISTRY ENTRIES on the `right.panels`
// seat, exactly like center tabs on `center.tabs`.
//
//   workspace (10)      the Library action vocabulary    (modes: library)
//   settings (20)       the agent/LLM settings rail      (modes: library)
//   comfy-manager (30)  ComfyUI management — backend + Manager upkeep
//                                                         (modes: library)
//
// MODE VOCABULARY (§17): a pane declares which CENTER TABS it appears
// alongside (`modes: string[]` — the registry's center ids, never a
// kernel enum). "Entering workspace mode" = switching the center tab to
// `library`; the host's visible panes derive from the active tab, so the
// right sidebar changes content and the chat input (which lives only in
// the chat surface) is simply not there. A future roleplay plugin ships
// `right/*.yaml` panes with `modes: [roleplay-chat]` — additive.
//
// Dogfood law: first-party panes ride the SAME seat a third party
// would. Adding a pane = one registration — no union, no layout edit.
// Dependency edge (NOT cosmetic): this module REGISTERS panes at eval
// time, and the `right.panels` seat is declared by centerEntries' root
// declarer — importing it first guarantees declaration precedes
// registration in every module graph, whatever imports this module.
import "./centerEntries"
import { useSyncExternalStore } from "react"
import { Sparkles } from "lucide-react"
import { shellSlots } from "@/shell/seats"
import type { SlotEntryView } from "@melite/slots"
import { LibrarySidebar } from "@/surfaces/library/LibrarySidebar"

/** Static meta a right-panel pane carries alongside its component. */
export interface RightPaneMeta {
  /** The pane's tab label (the host's tab strip + header title). */
  label: string
  /** Optional header subtitle (the host renders it under the label). */
  subtitle?: string
  /** Optional lucide icon component (the host's header). */
  icon?: React.ComponentType<{ className?: string }>
  /** Rail width in px (the host sizes itself from the ACTIVE pane). */
  px: number
  /** The center-tab ids this pane appears alongside (the mode rule). */
  modes: readonly string[]
}

type PaneComponent = React.ComponentType & Partial<RightPaneMeta>

const REGISTRANT = "melite-shell/first-party"

// The `right.panels` SEAT is declared by the center declarer's children
// table (centerEntries.tsx — ONE root declarer owns the tree); this
// module only registers panes into it.

function paneRegistration(
  id: string,
  order: number,
  Component: PaneComponent,
  meta: RightPaneMeta,
) {
  // Meta rides the component as static props (the center-entry pattern:
  // the registry view exposes `component`; consumers read statics). One
  // component instance per pane — assign-then-register, never mutating a
  // shared import.
  const Pane = Object.assign(Component, meta) as React.ComponentType
  return shellSlots.register(
    { name: "right.panels", id, order, registrant: REGISTRANT },
    Pane,
  )
}

export const disposeRightPanelEntries = [
  // The Library action vocabulary (256px) — rides alongside the canvas and
  // stays the mode's PRIMARY pane (order 10).
  paneRegistration("workspace", 10, LibrarySidebar, {
    label: "Library",
    icon: Sparkles,
    px: 256,
    modes: ["library"],
  }),
]

// ── Live entries (the center pattern: stable subscribe/getSnapshot) ──
const subscribeRight = (cb: () => void): (() => void) =>
  shellSlots.subscribe("right.panels", cb)
const rightSnapshot = (): readonly SlotEntryView[] =>
  shellSlots.entriesOfSlot("right.panels")

export function useRightPanelEntries(): readonly SlotEntryView[] {
  return useSyncExternalStore(subscribeRight, rightSnapshot)
}

/** The panes visible in a mode (a center tab id), ledger order. */
export function rightPanesForMode(
  entries: readonly SlotEntryView[],
  centerTab: string,
): readonly SlotEntryView[] {
  return entries.filter((e) => {
    const modes = (e.component as PaneComponent).modes
    return Array.isArray(modes) && modes.includes(centerTab)
  })
}

// (Rail-width resolution moved to surfaces/shared/railGeometry.ts — the
// concession solver publishes ONE effective width that both the host and
// the layout's floating-icon offset read. rightPanelPxForMode was deleted
// with it — no second resolution site survives.)
