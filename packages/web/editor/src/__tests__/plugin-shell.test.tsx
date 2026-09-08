// Plugin-shell lane gate (§8.2 third lane, 2026-08-19). Pins:
//   1. syncPluginShell registers BOTH pieces (center tab "plugin:<id>" +
//      rail button "shell:<id>" in the declared seat) through the SAME
//      slot registry the first-party entries ride.
//   2. The diff: a vanished entry disposes BOTH registrations; an
//      unchanged entry is not re-registered (no dispose churn).
//   3. pluginRailIdToTab routes rail ids to center tabs — and only those.
//   4. The icon map covers EXACTLY the server's sanctioned set (the two
//      sides of the wire stay in lockstep).
import { describe, it, expect, beforeEach } from "vitest"

import { shellSlots } from "@/shell/seats"
// Dogfood: importing the modules performs the seat declarations + the
// first-party registrations before any test runs (same pattern as
// shell-slots.gate.test.tsx).
import "@/shell/activityEntries"
import "@/shell/centerEntries"
import {
  syncPluginShell,
  pluginRailIdToTab,
  pluginTabId,
  SHELL_ICONS,
} from "@/shell/pluginShell"
import type { ShellEntry } from "@/rpc/editorApi"

const entry = (over: Partial<ShellEntry>): ShellEntry => ({
  id: "docs",
  label: "Docs",
  icon: "Globe",
  order: 70,
  url: "http://127.0.0.1:9999/",
  rail: "studio",
  plugin: "gate-plugin",
  ...over,
})

const idsOf = (seat: string) =>
  shellSlots.describe().children.find((c) => c.name === seat)!.occupants.map((o) => o.id)

const SERVER_ICONS = [
  "Bot", "Blocks", "FolderTree", "Timeline", "PersonStanding", "Puzzle",
  "Globe", "Package", "Terminal", "Image", "Video", "Music", "Box",
  "Cpu", "Database", "FileText", "Gauge", "Layers", "MessageSquare",
  "Play", "Radio", "Server", "Sparkles", "Wand2", "Webhook", "Zap",
]

describe("plugin shell lane (§8.2)", () => {
  beforeEach(() => {
    syncPluginShell([])
  })

  it("registers the center tab AND the rail button through the slot registry", () => {
    syncPluginShell([entry({}), entry({ id: "stats", rail: "primary", icon: "Gauge" })])
    expect(idsOf("center.tabs")).toContain("plugin:docs")
    expect(idsOf("center.tabs")).toContain("plugin:stats")
    expect(idsOf("activity.studio")).toContain("shell:docs")
    expect(idsOf("activity.primary")).toContain("shell:stats")
    // namespaced ids — a plugin can never shadow a first-party id
    expect(idsOf("center.tabs")).not.toContain("docs")
  })

  it("the diff disposes vanished entries and keeps unchanged ones stable", () => {
    syncPluginShell([entry({})])
    syncPluginShell([entry({})]) // same again — no churn
    expect(idsOf("center.tabs")).toContain("plugin:docs")

    syncPluginShell([]) // gone — BOTH registrations disposed
    expect(idsOf("center.tabs")).not.toContain("plugin:docs")
    expect(idsOf("activity.studio")).not.toContain("shell:docs")

    // re-register works after a dispose (the flip-back path)
    syncPluginShell([entry({})])
    expect(idsOf("center.tabs")).toContain("plugin:docs")
  })

  it("pluginRailIdToTab routes ONLY shell-prefixed ids", () => {
    expect(pluginRailIdToTab("shell:docs")).toBe("plugin:docs")
    expect(pluginRailIdToTab("agent")).toBeNull()
    expect(pluginRailIdToTab("plugins")).toBeNull()
    expect(pluginTabId("docs")).toBe("plugin:docs")
  })

  it("the icon map matches the server's sanctioned set exactly", () => {
    expect(Object.keys(SHELL_ICONS).sort()).toEqual([...SERVER_ICONS].sort())
    for (const Comp of Object.values(SHELL_ICONS)) expect(Comp).toBeTruthy()
  })
})
