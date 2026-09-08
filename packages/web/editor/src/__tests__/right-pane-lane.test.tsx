// right-pane-lane — the PLUGIN right-pane lane (H-RIGHT, §16.7).
//
// Pins the third-party half of the lane: syncPluginRightPanes registers
// declarative panes (wire shape: label/icon/order/url/modes/px) into the
// `right.panels` seat as `plugin-right:<id>` — meta rides the component
// as statics (the SAME read the host does for first-party panes), the
// surface is a sandboxed iframe, and the diff discipline is the shell
// lane's (dispose gone, register new, keep unchanged).
//
// The first-party half (seat declaration, settings/workspace ids, mode
// coupling in the host) is pinned by shell-wiring / shell-slots /
// right-panel-mode gates — this file owns the PLUGIN half only.
import { describe, expect, it, vi, beforeEach } from "vitest"
import { createElement } from "react"
import { render } from "@testing-library/react"
import type { RightPaneEntry } from "../rpc/editorApi"

// Seat declaration + first-party panes ride these chains (order is the
// contract: centerEntries declares the seat, rightPanelEntries registers
// into it).
import "../shell/centerEntries"
import "../shell/rightPanelEntries"
import { syncPluginRightPanes, pluginPaneId } from "../shell/pluginShell"
import { rightPanesForMode } from "../shell/rightPanelEntries"
import { shellSlots } from "../shell/seats"

function pane(overrides: Partial<RightPaneEntry> = {}): RightPaneEntry {
  return {
    id: "gateway-health",
    label: "Gateway health",
    icon: "Gauge",
    order: 30,
    url: "/health",
    modes: ["library"],
    px: 320,
    plugin: "hello-plugin",
    ...overrides,
  }
}

const paneIds = () =>
  shellSlots
    .entriesOfSlot("right.panels")
    .map((e) => e.id)
    .sort()

beforeEach(() => {
  vi.resetModules()
  syncPluginRightPanes([])
})

describe("syncPluginRightPanes — the plugin right-pane lane", () => {
  it("empty wire → no plugin panes (the seat may hold first-party only)", () => {
    syncPluginRightPanes([])
    expect(shellSlots.entriesOfSlot("right.panels").some((e) => e.id.startsWith("plugin-right:"))).toBe(false)
  })

  it("one entry registers plugin-right:<id> with meta verbatim on the component statics", () => {
    syncPluginRightPanes([pane({ modes: ["flow", "library"], px: 320 })])
    expect(paneIds()).toContain("plugin-right:gateway-health")

    const e = shellSlots.entriesOfSlot("right.panels").find((x) => x.id === pluginPaneId("gateway-health"))!
    const meta = e.component as unknown as {
      label?: string
      px?: number
      modes?: string[]
      subtitle?: string
    }
    expect(meta.label).toBe("Gateway health")
    expect(meta.px).toBe(320)
    expect(meta.modes).toEqual(["flow", "library"])
    expect(meta.subtitle).toContain("hello-plugin")
  })

  it("MODE COUPLING: the pane appears for each declared mode and NOT for undeclared ones", async () => {
    syncPluginRightPanes([pane({ modes: ["library"] })])
    // Slot mutations batch on a microtask (notifications coalesce) — the
    // registry is authoritative only after the flush.
    await Promise.resolve()
    const entries = shellSlots.entriesOfSlot("right.panels")
    expect(rightPanesForMode(entries, "library").map((e) => e.id)).toContain("plugin-right:gateway-health")
    expect(rightPanesForMode(entries, "flow").map((e) => e.id)).not.toContain("plugin-right:gateway-health")
    // A plugin CENTER-tab id is as valid a mode as a first-party one.
    // (Pane ids are the diff key — the same id with new modes is a
    // NO-OP to the reconciler by design; use a different id.)
    syncPluginRightPanes([pane({ id: "stats-pane", modes: ["plugin:stats"] })])
    await Promise.resolve()
    const next = shellSlots.entriesOfSlot("right.panels")
    expect(rightPanesForMode(next, "plugin:stats").map((e) => e.id)).toContain("plugin-right:stats-pane")
    expect(rightPanesForMode(next, "library").map((e) => e.id)).not.toContain("plugin-right:stats-pane")
  })

  it("re-sync with the same entry is idempotent — no churn, still one entry", () => {
    syncPluginRightPanes([pane({})])
    syncPluginRightPanes([pane({})])
    const ids = paneIds().filter((id) => id === "plugin-right:gateway-health")
    expect(ids).toHaveLength(1)
  })

  it("syncing [] disposes the registration — the unregister is TOTAL", () => {
    syncPluginRightPanes([pane({})])
    expect(paneIds()).toContain("plugin-right:gateway-health")
    syncPluginRightPanes([])
    expect(paneIds()).not.toContain("plugin-right:gateway-health")
  })

  it("the pane surface is a sandboxed iframe with the entry's url + title", () => {
    syncPluginRightPanes([pane({ url: "https://example.com/pane" })])
    const e = shellSlots.entriesOfSlot("right.panels").find((x) => x.id === "plugin-right:gateway-health")!
    const Pane = e.component as React.ComponentType
    const { container } = render(createElement(Pane))
    const frame = container.querySelector("iframe")
    expect(frame).not.toBeNull()
    expect(frame!.getAttribute("sandbox")).toBe("allow-scripts")
    expect(frame!.getAttribute("src")).toBe("https://example.com/pane")
    expect(frame!.getAttribute("title")).toBe("Gateway health")
  })

  it("two panes with different modes coexist and filter per mode", () => {
    syncPluginRightPanes([
      // "gallery" — a plugin-invented mode id (no first-party meaning).
      pane({ id: "health", modes: ["gallery"], url: "/health" }),
      pane({ id: "stats", modes: ["library"], url: "/stats", label: "Stats" }),
    ])
    const entries = shellSlots.entriesOfSlot("right.panels")
    const gallery = rightPanesForMode(entries, "gallery").map((e) => e.id)
    const library = rightPanesForMode(entries, "library").map((e) => e.id)
    expect(gallery).toContain("plugin-right:health")
    expect(gallery).not.toContain("plugin-right:stats")
    expect(library).toContain("plugin-right:stats")
    expect(library).not.toContain("plugin-right:health")
  })
})
