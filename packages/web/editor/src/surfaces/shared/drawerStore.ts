// drawerStore — the left drawer's active panel, shared app-wide.
//
// The ActivityBar toggles this (Media), and deep children can open the
// drawer WITHOUT prop-drilling through the tab boundary. Mirrors the
// activeSurfaceStore / rightPanelStore pattern: a tiny zustand store as the
// single source of truth for shell-level navigation state.
//
// Why a store (not WorkspaceLayout-local useState): plugin capabilities and
// card actions live several levels deep; lifting the drawer state here lets
// them open the media sidebar with zero prop plumbing. (The Chat History
// drawer died 2026-08-21 with the native-agent chat surfaces.)
import { create } from "zustand"
// Activity rail ids are seat vocabulary since the 2026-08-19 seam
// migration (DSH-PLUGIN-GAP-ANALYSIS.md §8.1): the closed rail-id union is
// gone, the shell slot registry is the authority, and the gate
// test pins the first-party id set so a silent id change fails CI.
export type DrawerId = "media"

interface DrawerState {
 /** The currently-open left drawer, or null when closed. Only the drawer
 * members ("media") are ever assigned (the "flow" drawer merged into
 * the Library rail, ONE_SURFACE Phase 4; "history" died with the chat). */
 activeDrawer: DrawerId | null
 /** Set the drawer to a specific panel (or null to close). */
 setActiveDrawer: (panel: DrawerId | null) => void
 /** Toggle a drawer: open it, or close it if already active. */
 toggleDrawer: (panel: DrawerId) => void
}

export const useDrawerStore = create<DrawerState>((set, get) => ({
 // Closed at boot — the media sidebar opens on demand.
 activeDrawer: null,
 setActiveDrawer: (panel) => set({ activeDrawer: panel }),
 toggleDrawer: (panel) =>
 set({ activeDrawer: get().activeDrawer === panel ? null : panel }),
}))
