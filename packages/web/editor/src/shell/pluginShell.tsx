// pluginShell — the shell lane's runtime mount (§8.2 third lane, cut
// 2026-08-19). GET /v1/shell serves every ENABLED plugin's shell entries
// (declarative yaml: label/icon/order/url/rail); THIS module materializes
// them as slot registrations — the same seats, the same shapes, the same
// registry the first-party entries ride (the dogfood law, now in both
// directions: first-party rides plugin seams, plugins ride first-party
// seats).
//
// Discipline (the studio lane's, minus the component map):
//   - the surface is an IFRAME — props contract = NONE, writes allowlist =
//     NOTHING. No plugin code ever loads into the editor.
//   - sandbox="allow-scripts" (opaque origin: no same-origin privileges,
//     no cookies; the panel can still fetch the public /v1 API itself).
//   - ids are namespaced: center tab "plugin:<id>", rail button
//     "shell:<id>" — a plugin entry can never shadow a first-party id.
//   - syncPluginShell is the ONE diff point: dispose gone, register new —
//     the PluginsPanel's toggle calls it after a flip, so a disabled
//     plugin's UI vanishes LIVE (the unregister is total).
import {
  Bot, Blocks, FolderTree, Timeline, PersonStanding, Puzzle,
  Globe, Package, Terminal, Image, Video, Music, Box,
  Cpu, Database, FileText, Gauge, Layers, MessageSquare,
  Play, Radio, Server, Sparkles, Wand2, Webhook, Zap,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect } from "react"
import { shellSlots, type ActivityOwnerProps } from "@/shell/seats"
import { ActivityButton, type ActivityItem } from "@/surfaces/shared/ActivityBar"
import { useActiveSurfaceStore } from "@/surfaces/shared/activeSurfaceStore"
import { useRightPanelStore } from "@/surfaces/shared/rightPanelStore"
import { editorClient } from "@/rpc/editorClient"
import type { ShellEntry, RightPaneEntry } from "@/rpc/editorApi"

/** The icon set — EXACTLY the server's sanctioned names (plugins.ts
 * SHELL_ICONS). One source of truth per side of the wire; the gate pins
 * the key set. */
export const SHELL_ICONS: Record<string, LucideIcon> = {
  Bot, Blocks, FolderTree, Timeline, PersonStanding, Puzzle,
  Globe, Package, Terminal, Image, Video, Music, Box,
  Cpu, Database, FileText, Gauge, Layers, MessageSquare,
  Play, Radio, Server, Sparkles, Wand2, Webhook, Zap,
}

const REGISTRANT = "melite-shell/plugin-lane"

/** rail value → the literal seat name (register() wants the union, not a
 *  concatenation — the closed vocabulary stays closed at the type level). */
const SHELL_SEATS = {
  primary: "activity.primary",
  drawer: "activity.drawer",
  studio: "activity.studio",
} as const

/** The center tab id for a shell entry id. */
export function pluginTabId(entryId: string): string {
  return "plugin:" + entryId
}

/** Map a rail id to its center tab — null for non-plugin ids (the layout's
 * select switch uses this; owner behavior stays in the owner). */
export function pluginRailIdToTab(railId: string): string | null {
  if (!railId.startsWith("shell:")) return null
  return pluginTabId(railId.slice(6))
}

/** The iframe surface — full-bleed, sandboxed, no props. */
function shellSurface(entry: ShellEntry): React.ComponentType {
  const Surface = () => (
    <iframe
      src={entry.url}
      title={entry.label}
      sandbox="allow-scripts"
      className="h-full w-full border-0 bg-background"
    />
  )
  Surface.displayName = "ShellPluginSurface(" + entry.id + ")"
  return Surface
}

/** The rail button — the same ActivityItem shape the first-party rail
 * entries use (icon + label + hint; the owner share is the same). */
function shellRailEntry(entry: ShellEntry) {
  const item: ActivityItem = {
    id: "shell:" + entry.id,
    icon: SHELL_ICONS[entry.icon] ?? Puzzle,
    label: entry.label,
    hint: entry.plugin + " · plugin shell · " + entry.url,
  }
  const Entry = ({ active, onSelect }: ActivityOwnerProps) => (
    <ActivityButton item={item} isActive={active.has(item.id)} onSelect={onSelect} />
  )
  Entry.displayName = "ShellPluginEntry(" + entry.id + ")"
  return Entry
}

// ── The ONE diff point ────────────────────────────────────────────────
const mounted = new Map<string, Array<() => void>>()

/** Reconcile the registry against the served entries: dispose gone,
 *  register new, keep unchanged. Idempotent; safe to call repeatedly. */
export function syncPluginShell(entries: ShellEntry[]): void {
  const next = new Set(entries.map((e) => e.id))
  for (const [id, disposers] of mounted) {
    if (!next.has(id)) {
      for (const d of disposers) d()
      mounted.delete(id)
    }
  }
  for (const entry of entries) {
    if (mounted.has(entry.id)) continue
    const disposers = [
      shellSlots.register(
        { name: "center.tabs", id: pluginTabId(entry.id), order: entry.order, registrant: REGISTRANT },
        shellSurface(entry),
      ),
      shellSlots.register(
        { name: SHELL_SEATS[entry.rail], id: "shell:" + entry.id, order: entry.order, registrant: REGISTRANT },
        shellRailEntry(entry),
      ),
    ]
    mounted.set(entry.id, disposers)
  }
}

// ── Right-pane lane (H-RIGHT, §16.7) ──────────────────────────────────
// Same diff discipline for right.panels: a pane id "plugin-right:<id>"
// can never shadow a first-party pane. The surface is an iframe (no
// props, sandbox allow-scripts); meta (label/icon/px/modes) rides the
// component as statics — the SAME read the host does for first-party
// panes. `modes` is the yaml's center-tab coupling, verbatim.

/** The right.panels slot id for a plugin pane id. */
export function pluginPaneId(entryId: string): string {
  return "plugin-right:" + entryId
}

const mountedPanes = new Map<string, () => void>()

function paneComponent(entry: RightPaneEntry): React.ComponentType {
  const paneId = pluginPaneId(entry.id)
  const Pane = () => {
    // postMessage door (H-RIGHT, 2026-08-21): a sandboxed pane may drive
    // ITS OWN rail tab — parent.postMessage(
    //   { type: "melite:right-pane", action: "open" | "close" }, "*").
    // Strict shape check; messages naming a foreign pane are dropped; the
    // action only lands when this pane's modes include the ACTIVE tab.
    // That is the entire capability: open/close of itself — nothing else
    // crosses the seam (the iframe stays sandbox="allow-scripts", no
    // same-origin privileges).
    useEffect(() => {
      function onMessage(e: MessageEvent) {
        const d = e.data as { type?: unknown; action?: unknown; pane?: unknown } | null
        if (!d || typeof d !== "object") return
        if (d.type !== "melite:right-pane") return
        if (d.pane !== undefined && d.pane !== entry.id) return
        if (d.action !== "open" && d.action !== "close") return
        const tab = useActiveSurfaceStore.getState().activeTab
        if (!entry.modes.includes(tab)) return
        const store = useRightPanelStore.getState()
        if (d.action === "open") store.showPane(tab, paneId)
        else store.hidePane(tab, paneId)
      }
      window.addEventListener("message", onMessage)
      return () => window.removeEventListener("message", onMessage)
    }, [])
    return (
      <iframe
        src={entry.url}
        title={entry.label}
        sandbox="allow-scripts"
        className="h-full w-full border-0 bg-background"
      />
    )
  }
  Pane.displayName = "RightPluginPane(" + entry.id + ")"
  // Statics = the host's meta read (label/subtitle/icon/px/modes).
  return Object.assign(Pane, {
    label: entry.label,
    subtitle: entry.plugin + " · plugin pane",
    icon: SHELL_ICONS[entry.icon] ?? Puzzle,
    px: entry.px,
    modes: entry.modes,
  })
}

/** Reconcile right.panels against the served panes (the one diff point
 *  for this lane — dispose gone, register new, keep unchanged). */
export function syncPluginRightPanes(panes: RightPaneEntry[]): void {
  const next = new Set(panes.map((e) => e.id))
  for (const [id, dispose] of mountedPanes) {
    if (!next.has(id)) {
      dispose()
      mountedPanes.delete(id)
    }
  }
  for (const entry of panes) {
    if (mountedPanes.has(entry.id)) continue
    mountedPanes.set(
      entry.id,
      shellSlots.register(
        { name: "right.panels", id: pluginPaneId(entry.id), order: entry.order, registrant: REGISTRANT },
        paneComponent(entry),
      ),
    )
  }
}

/** Fetch both wires + sync (boot + post-flip). Failures are logged,
 *  never thrown — a down gateway must not brick the shell. */
export async function loadPluginShell(): Promise<void> {
  try {
    syncPluginShell(await editorClient.listShell())
  } catch (e) {
    console.warn("[shell-lane] load failed (registry untouched):", e)
  }
  try {
    syncPluginRightPanes(await editorClient.listRightPanes())
  } catch (e) {
    console.warn("[right-pane-lane] load failed (registry untouched):", e)
  }
}
