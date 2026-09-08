// centerEntries — the FIRST-PARTY center-surface registrations (§8.2 cut,
// 2026-08-19). Every tab that used to live in WorkspaceLayout's closed
// TabId union + render switch is a registration here, in ledger order:
//
//   library (10)   the card-authoring canvas (R1 combined surface)
//
// The Agent center tab ("flow") died 2026-08-21 with the native-agent
// chat surfaces — the conversational agent lives in the DSH plugins now.
//
// The studio TABS are GONE (cut 5, 2026-08-20): the studios (Pose,
// Inpaint, Body, …) are ACTION CARDS on the Library canvas — the card
// seam — not center tabs. A studio that ever comes back registers here
// (or rides the plugin lane), it does not resurrect a tab.
//
// The dogfood law: first-party surfaces ride the same seam a third party
// would. Adding a center surface = one registration — no union to extend,
// no WorkspaceLayout edit. The layout renders the entry whose id === the
// active tab (activeSurfaceStore); an unknown id falls back to STARTUP_TAB
// (persisted ids from older builds degrade gracefully at render, not at
// store init).
//
// rightPanelPx: the entry's static right-panel meta. The floating status
// cluster reads it for its slide-left offset and the header toggle treats
// defined === "supports a right panel" (rightPanelStore's supported set is
// seeded from exactly these values — ONE definition site).
import { useSyncExternalStore } from "react"
import { shellSlots } from "@/shell/seats"
import type { SlotEntryView } from "@melite/slots"
import { LibraryTab } from "@/surfaces/library/LibraryTab"
import { setRightPanelSupported } from "@/surfaces/shared/rightPanelStore"

/** Static meta a center entry may carry alongside its component. */
export interface CenterEntryMeta {
  /** Right-panel pixel width when this surface supports a right rail;
   * undefined = full-width surface (no toggle, no offset). */
  rightPanelPx?: number
}

type CenterComponent = React.ComponentType & Partial<CenterEntryMeta>

const REGISTRANT = "melite-shell/first-party"

// Seat declaration (the rail pattern, ActivityBar.tsx:177): the center
// owner claims the "center.tabs" seat via a root registration's children
// table — declaration = render authorization = runtime spec. The Null
// holder renders nothing at root; the DECLARATION is the contribution.
const Null = (): null => null
Null.displayName = "CenterSeatHolder"
const disposeCenterSeat = shellSlots.register(
  {
    name: "root",
    id: "center-seat",
    // Root is single-kind and priority 0 is the activity rail's — this
    // declarer rides priority 1 (coexisting per shadow rules; the rail
    // keeps rendering). The CONTRIBUTION is the children-table
    // declaration, not the root render.
    priority: 1,
    registrant: "melite-shell/center",
    children: {
      "center.tabs": { kind: "list" },
      // H-RIGHT (§16.7): the right sidebar's pane seat — declared here
      // (ONE root declarer owns the tree); rightPanelEntries registers
      // the first-party panes, the plugin lane the third-party ones.
      "right.panels": { kind: "list" },
    },
  },
  Null,
)

/** Each entry owns its FULL geometry (the flex wrapper the layout used to
 * hardcode per arm of the switch): inpaint lays out row-wise, the rest
 * column-wise. The entry fills the center region — full-bleed belongs to
 * the surface, not the shell. */
function centerRegistration(
  id: string,
  order: number,
  Component: CenterComponent,
  meta: CenterEntryMeta,
  row = false,
) {
  const cls = row ? "flex-1 min-w-0 min-h-0 flex" : "flex-1 min-w-0 min-h-0 flex flex-col"
  const Entry = () => (
    <div className={cls}>
      <Component />
    </div>
  )
  Entry.displayName = `CenterEntry(${id})`
  Object.assign(Entry, meta)
  const dispose = shellSlots.register(
    { name: "center.tabs", id, order, registrant: REGISTRANT },
    Entry as React.ComponentType,
  )
  return dispose
}

export const disposeCenterEntries = [
  disposeCenterSeat,
  // Library: the card canvas — its rail is w-64 (256px).
  centerRegistration("library", 10, LibraryTab, { rightPanelPx: 256 }),
]

// Seed the right-panel supported set from the registration meta — the ONE
// definition site (this file); the store stays dumb + persisted.
{
  const supported: string[] = []
  for (const e of shellSlots.entriesOfSlot("center.tabs")) {
    const px = (e.component as CenterComponent).rightPanelPx
    if (px !== undefined) supported.push(e.id ?? e.key)
  }
  setRightPanelSupported(supported)
}

/** Live center entries (ledger order), reactive to registry mutations —
 * a runtime registration (plugin lane) appears without a layout edit.
 * The subscribe/getSnapshot closures are MODULE constants: stable
 * identities keep useSyncExternalStore from resubscribing every render,
 * and the store's cached snapshot keeps getSnapshot referentially
 * stable (the infinite-loop contract). */
const subscribeCenter = (cb: () => void): (() => void) =>
  shellSlots.subscribe("center.tabs", cb)
const centerSnapshot = (): readonly SlotEntryView[] =>
  shellSlots.entriesOfSlot("center.tabs")

export function useCenterEntries(): readonly SlotEntryView[] {
  return useSyncExternalStore(subscribeCenter, centerSnapshot)
}

/** The entry for an id, or null when nothing registers it. */
export function centerEntry(
  entries: readonly SlotEntryView[],
  id: string,
): SlotEntryView | null {
  return entries.find((e) => e.id === id) ?? null
}

/** The right-panel pixel offset meta for an id (0 = no panel). */
export function centerRightPanelPx(
  entries: readonly SlotEntryView[],
  id: string,
): number {
  const e = centerEntry(entries, id)
  return e ? ((e.component as CenterComponent).rightPanelPx ?? 0) : 0
}
