// shell seats — the shell's SlotMap vocabulary + the one root instance.
//
// THE SEAT TABLE (first cut, 2026-08-19 — DSH-PLUGIN-GAP-ANALYSIS.md §8.1):
// the ActivityBar's four tier seats, declared by the rail owner's own
// registration (surfaces/shared/ActivityBar.tsx). New seats are added by
// merging into SlotMap HERE and declaring them in the owning registration —
// never by hardcoding a union at a render site.
import { SlotCore } from "@melite/slots"

/** The shell's one slot registry instance. */
export const shellSlots = new SlotCore()

/** Owner share of every activity seat: the live active-id set (multiple
 * icons can be active — a Set, not a single value) and the select handler
 * (toggle semantics belong to the layout). */
export interface ActivityOwnerProps {
  active: ReadonlySet<string>
  onSelect: (id: string) => void
}

/** CENTER seat (§8.2 cut, 2026-08-19): one surface visible at a time —
 * the dsh 'conversation' precedent. The layout renders the entry whose
 * id === the active tab (registry pick, not an outlet mount: mounting
 * every studio at once would defeat lazy mount). Vocabulary lives in the
 * registry — adding a center surface is a registration, never a union
 * edit. Entries may carry static `rightPanelPx` meta (the floating-icon
 * offset + right-panel support flag derive from it). */

declare module "@melite/slots/vendored/core" {
  interface SlotMap {
    /** The a-priori render-tree root hole (seeded by SlotCore itself; the
     * runtime owns this key — do not redeclare). */
    root: { kind: "single" }
    /** PRIMARY tier — the main workspaces (Agent, Library). */
    "activity.primary": { kind: "list"; owner: ActivityOwnerProps }
    /** DRAWER tier — content drawers (Chat History, History/Media). */
    "activity.drawer": { kind: "list"; owner: ActivityOwnerProps }
    /** STUDIO tier — secondary full-bleed studios (Pose). */
    "activity.studio": { kind: "list"; owner: ActivityOwnerProps }
    /** FOOT tier — bottom utility entries (empty today; the seam exists so
     * a future settings/return-to-top entry needs no rail edit). */
    "activity.foot": { kind: "list"; owner: ActivityOwnerProps }
    /** CENTER — the main work area. List-cardinality by id (one entry per
     * surface), single-VISIBLE by the layout's active-tab pick. */
    "center.tabs": { kind: "list" }
    /** RIGHT PANELS (H-RIGHT, §16.7) — the right sidebar's internal tab
     * panes. The layout-owned RightPanelHost is the tab host; each entry
     * is a pane whose static meta carries label/px/modes (the center-tab
     * ids it rides alongside — mode-neutral vocabulary, §17). First-party
     * panes register in rightPanelEntries.tsx; plugin panes arrive via
     * the plugin shell lane. */
    "right.panels": { kind: "list" }
  }
}
