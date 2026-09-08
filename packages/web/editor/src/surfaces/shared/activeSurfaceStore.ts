// ActiveSurfaceStore — tracks which editor tab/surface is currently visible.
//
// WorkspaceLayout writes the active tab here; deep children (plugin
// capabilities, landing actions) call setActiveTab to navigate.
//
// Keeping this SEPARATE from tabBridge (which is for PENDING navigation
// actions) because this is about CURRENT state, not commands.
//
// REFRESH RESTORE (2026-08-15): "return to the tab I was on." Every
// setActiveTab call persists the tab; the store's initializer reads it
// back, so a page refresh reopens on the surface the user left. The key
// is validated at the RENDER pick — a stale/garbage value (an archived
// tab id from an older build, e.g. the deleted "flow" agent tab)
// falls back to the startup default instead of rendering a blank center.
// A first visit / cleared storage keeps the startup default (the Library
// canvas — the one first-party center surface).
import { create } from "zustand"

// §8.2 (2026-08-19): the closed union is DEAD. The tab vocabulary lives
// in the shell registry (shell/centerEntries.tsx — the first-party
// registrations; a plugin lane would register more). The id is a plain
// string here: validation belongs to the RENDER pick (WorkspaceLayout
// falls back to STARTUP_TAB when no entry registers the persisted id),
// not to a hand list at store init — a hand list would be a second
// source of truth drifting from the registry.
export type SurfaceTab = string

/** Startup default — the Library canvas. The fallback whenever no valid
 * tab was persisted (first visit, cleared storage, stale id). */
export const STARTUP_TAB: SurfaceTab = "library"

const ACTIVE_TAB_KEY = "melite:workspace:activeTab:v1"

/** The persisted tab, if any. Stale ids (an archived tab from an older
 * build) are handled at the render pick — unknown id → STARTUP_TAB's
 * entry — so this returns the raw string. Exported for tests + any boot
 * logic that needs the refresh-restore decision without the store. */
export function readPersistedActiveTab(): SurfaceTab | null {
  if (typeof localStorage === "undefined") return null
  try {
    return localStorage.getItem(ACTIVE_TAB_KEY)
  } catch {
    return null
  }
}

function persistActiveTab(tab: SurfaceTab): void {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(ACTIVE_TAB_KEY, tab)
  } catch {
    // Quota / storage disabled — the tab just won't survive a refresh;
    // never let a persistence write break navigation.
  }
}

interface ActiveSurfaceState {
  activeTab: SurfaceTab
  setActiveTab: (tab: SurfaceTab) => void
}

export const useActiveSurfaceStore = create<ActiveSurfaceState>((set) => ({
  // Lazy init: the last tab the user had open, else the startup default.
  // Reads the (IndexedDB-backed, main.tsx-seeded) localStorage at module
  // eval — before WorkspaceLayout's first render, so the refresh lands on
  // the right surface with zero flash.
  activeTab: readPersistedActiveTab() ?? STARTUP_TAB,
  setActiveTab: (tab) => {
    persistActiveTab(tab)
    set({ activeTab: tab })
  },
}))
