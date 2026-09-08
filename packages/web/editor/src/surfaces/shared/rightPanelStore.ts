// rightPanelStore — per-tab right-panel visibility, persisted.
//
// The single source of truth for "is the right panel open on this tab." Each
// tab that supports a right rail reads `open[tab]` and conditionally renders
// its RightPanel. Tabs without a right rail (flow/agent) read
// `supported[tab] === false` and the header toggle hides itself.
//
// Why a store (not local component state): the toggle lives in the
// WorkspaceLayout header, but the panels live inside each tab. They need to
// share state without prop-drilling through the tab boundary. Zustand +
// localStorage gives us a persistent, framework-agnostic handle.
//
// Persistence: the open/closed state per tab survives reloads via
// localStorage key `melite:right-panel-state:v1`. Supported tabs default to
// open; unsupported tabs are always closed and not persisted.
//
// H-RIGHT browser tabs (2026-08-21): the strip is user-curated. `hidden`
// records the panes the user closed OUT of the strip, per mode (the +
// menu re-adds them); `widths` records dragged rail widths per PANE id
// (absent = the pane's declared meta.px). Both persist (`…hidden:v1`,
// `…width:v1`). Closing the LAST tab closes the rail and clears that
// mode's curation — a browser closes the window with its last tab, and
// the next open shows the mode's defaults again.
import { create } from "zustand"

// §8.2 (2026-08-19): the closed RightPanelTab union is DEAD. Keys are
// plain strings (the shell registry's center ids). The SUPPORTED set is
// SEEDED by the registry owner (shell/centerEntries.tsx calls
// setRightPanelSupported with every id whose registration carries
// rightPanelPx) — one definition site, no hand list to drift.
export type RightPanelTab = string

/** Tabs that OWN a right panel via the shared RightPanel/TwoPaneLayout system.
 *  Others are full-width OR manage their own panel system internally:
 *    - flow (agent): settings rail (2026-08-08) — the same RightPanel
 *      chrome the Library rail uses, exposing the chat's settings (web-search
 *      toggle etc.) instead of the deleted footer Settings button.
 *    The Library rail (task #74, 2026-08-07) lists the ACTION vocabulary —
 *    capabilities (the same tiles as the ServicePicker, one derivation path
 *    in lib/capabilityCards.ts) + past runs (click → the run's stages
 *    hydrate the canvas as cards via flowStore.loadRun). Optional —
 *    the header toggle shows/hides it. */
/** Live supported set — seeded by the center registrations' meta. Empty
 * until centerEntries evaluates (module-scope effect); every consumer
 * renders after that, so the gap is unobservable. */
const SUPPORTED = new Set<string>()

/** Called ONCE by the registry owner (shell/centerEntries.tsx): the ids
 * whose registrations declare rightPanelPx. */
export function setRightPanelSupported(ids: readonly string[]): void {
  SUPPORTED.clear()
  for (const id of ids) SUPPORTED.add(id)
  // Refresh the reactive snapshot so subscribed selectors re-render.
  const snap: Record<string, boolean> = {}
  for (const id of ids) snap[id] = true
  // First-visit default: every supported tab starts OPEN unless a
  // persisted value already says otherwise (the old loadOpen base —
  // order-independent now: the default lands when the registry owner
  // evaluates, whenever that is).
  const state = useRightPanelStore.getState()
  const open = { ...state.open }
  let touched = false
  for (const id of ids) {
    if (!(id in open)) {
      open[id] = true
      touched = true
    }
  }
  useRightPanelStore.setState(
    touched ? { supported: snap, open } : { supported: snap },
  )
}

const STORAGE_KEY = "melite:right-panel-state:v1"
const PANE_KEY = "melite:right-panel-pane:v1"
const HIDDEN_KEY = "melite:right-panel-hidden:v1"
const WIDTH_KEY = "melite:right-panel-width:v1"

function persistHidden(hidden: Record<string, string[]>) {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden))
  } catch { /* quota/privacy — in-memory only */ }
}

function persistWidths(widths: Record<string, number>) {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(WIDTH_KEY, JSON.stringify(widths))
  } catch { /* quota/privacy — in-memory only */ }
}

function persistPane(pane: Record<string, string>) {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(PANE_KEY, JSON.stringify(pane))
  } catch { /* quota/privacy — in-memory only */ }
}

function loadPane(): Record<string, string> {
  if (typeof localStorage === "undefined") return {}
  try {
    const raw = localStorage.getItem(PANE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    const out: Record<string, string> = {}
    for (const k of Object.keys(parsed)) {
      if (typeof parsed[k] === "string") out[k] = parsed[k]
    }
    return out
  } catch {
    return {} // corrupt — start clean, never break boot
  }
}

function loadHidden(): Record<string, string[]> {
  if (typeof localStorage === "undefined") return {}
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, string[]> = {}
    for (const k of Object.keys(parsed)) {
      const v = parsed[k]
      if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string")
    }
    return out
  } catch {
    return {} // corrupt — start clean, never break boot
  }
}

function loadWidths(): Record<string, number> {
  if (typeof localStorage === "undefined") return {}
  try {
    const raw = localStorage.getItem(WIDTH_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (const k of Object.keys(parsed)) {
      const v = parsed[k]
      if (typeof v === "number" && Number.isFinite(v) && v > 0) out[k] = v
    }
    return out
  } catch {
    return {} // corrupt — start clean, never break boot
  }
}

function loadOpen(): Record<string, boolean> {
  // Defaults: every supported tab starts open, others closed. At load
  // time (module eval) the seeded set may be empty — the persisted blob
  // is merged as-is and unknown keys are simply never read (stale flags
  // for archived tabs are inert, not harmful).
  const base: Record<string, boolean> = {}
  if (typeof localStorage === "undefined") return base
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Record<string, boolean>
    for (const k of Object.keys(parsed)) {
      if (typeof parsed[k] === "boolean") base[k] = parsed[k]
    }
  } catch {
    // Corrupt JSON — fall back to defaults. Never let persistence break the UI.
  }
  return base
}

interface RightPanelState {
  open: Record<string, boolean>
  supported: Record<string, boolean>
  /** H-RIGHT: the ACTIVE PANE id per center tab (the internal tab
   *  strip's selection). Absent = the mode's first visible pane. */
  pane: Record<string, string>
  /** H-RIGHT browser tabs: panes closed OUT of the strip, per mode. The
   *  strip renders mode-visible entries minus this set; the + menu
   *  re-adds them. Cleared when a mode's LAST tab closes (with the rail). */
  hidden: Record<string, string[]>
  /** Dragged rail widths per PANE id. Absent = the pane's declared px. */
  widths: Record<string, number>
  setOpen: (tab: string, v: boolean) => void
  toggle: (tab: string) => void
  /** Select the active pane for a center tab (the tab strip click). */
  setPane: (tab: string, paneId: string) => void
  /** Close one tab: record it hidden (the + menu can bring it back). */
  hidePane: (tab: string, paneId: string) => void
  /** (Re-)open a pane as a tab: unhide, select, raise the rail. */
  showPane: (tab: string, paneId: string) => void
  /** Forget a mode's curation (the last-tab-closed reset). */
  clearHidden: (tab: string) => void
  /** Store (or, with undefined, clear) a pane's dragged rail width. */
  setPaneWidth: (paneId: string, px: number | undefined) => void
  /** Read whether a tab has ANY right panel. */
  isSupported: (tab: string) => boolean
}

export const useRightPanelStore = create<RightPanelState>((set, _get) => ({
  open: loadOpen(),
  // Seeded snapshot (see setRightPanelSupported) — a Record so selectors
  // like s.supported[tab] keep working unchanged.
  supported: {},
  pane: loadPane(),
  hidden: loadHidden(),
  widths: loadWidths(),
  setPane: (tab, paneId) => {
    set((s) => {
      const next = { ...s.pane, [tab]: paneId }
      persistPane(next)
      return { pane: next }
    })
  },
  setOpen: (tab, v) => {
    if (!SUPPORTED.has(tab)) return // unsupported tabs can't open one
    set((s) => {
      const next = { ...s.open, [tab]: v }
      persist(next)
      return { open: next }
    })
  },
  toggle: (tab) => {
    if (!SUPPORTED.has(tab)) return
    set((s) => {
      const next = { ...s.open, [tab]: !s.open[tab] }
      persist(next)
      return { open: next }
    })
  },
  hidePane: (tab, paneId) => {
    set((s) => {
      const list = s.hidden[tab] ?? []
      if (list.includes(paneId)) return s
      const next = { ...s.hidden, [tab]: [...list, paneId] }
      persistHidden(next)
      return { hidden: next }
    })
  },
  showPane: (tab, paneId) => {
    set((s) => {
      const list = s.hidden[tab] ?? []
      const hiddenNext =
        list.length > 0
          ? { ...s.hidden, [tab]: list.filter((x) => x !== paneId) }
          : s.hidden
      if (hiddenNext !== s.hidden) persistHidden(hiddenNext)
      const paneNext = s.pane[tab] === paneId ? s.pane : { ...s.pane, [tab]: paneId }
      if (paneNext !== s.pane) persistPane(paneNext)
      const openNext = s.open[tab] ? s.open : { ...s.open, [tab]: true }
      if (openNext !== s.open) persist(openNext)
      return { hidden: hiddenNext, pane: paneNext, open: openNext }
    })
  },
  clearHidden: (tab) => {
    set((s) => {
      if (!(tab in s.hidden)) return s
      const next = { ...s.hidden }
      delete next[tab]
      persistHidden(next)
      return { hidden: next }
    })
  },
  setPaneWidth: (paneId, px) => {
    set((s) => {
      if (px === undefined) {
        if (!(paneId in s.widths)) return s
        const next = { ...s.widths }
        delete next[paneId]
        persistWidths(next)
        return { widths: next }
      }
      const clamped = Math.round(px)
      if (s.widths[paneId] === clamped) return s
      const next = { ...s.widths, [paneId]: clamped }
      persistWidths(next)
      return { widths: next }
    })
  },
  isSupported: (tab) => SUPPORTED.has(tab),
}))

function persist(open: Record<string, boolean>) {
  if (typeof localStorage === "undefined") return
  try {
    // Only persist supported tabs (keeps the blob small + stable across additions).
    const slim: Record<string, boolean> = {}
    for (const k of Object.keys(open)) {
      if (SUPPORTED.has(k)) slim[k] = open[k]
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim))
  } catch {
    // Quota / privacy mode — silently degrade to in-memory only.
  }
}
