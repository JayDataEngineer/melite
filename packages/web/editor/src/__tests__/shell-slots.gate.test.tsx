// shell-slots.gate — the proof-cut gate for the Minimal Shell seam
// (DSH-PLUGIN-GAP-ANALYSIS.md §8.1/§8.2). Two jobs:
//
// PART A — vendored core semantics: declaration-merging vocabulary,
// load-time validation (undeclared seat, duplicate declaration, list id,
// priority occupancy), ledger order, disposal that collapses declared
// children recursively, microtask-batched notifications, describe() tree.
//
// PART B — THE GATE: the ActivityBar seam migration cannot silently
// regress. The closed `ActivityPanel` union and the hardcoded item arrays
// stay dead (source-scan), the four tier seats stay declared, the
// first-party id set stays exact (describe() tree), and the outlet renders
// live from the registry — including a runtime third-party registration
// that appears and disappears WITHOUT touching ActivityBar.tsx.
import { createElement } from "react"
import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"
import { SlotCore } from "@melite/slots"
import { SlotOutlet } from "@melite/slots"
import { shellSlots } from "@/shell/seats"
// Dogfood: importing the modules performs the registrations (module-scope
// effects, once per file) — ActivityBar declares the tier seats, entries
// populate them, centerEntries populates the center seat — before any
// test below runs.
import "@/shell/activityEntries"
import { centerEntry, centerRightPanelPx } from "@/shell/centerEntries"
import { STARTUP_TAB } from "@/surfaces/shared/activeSurfaceStore"

// Test seat vocabulary — dogfood of the declaration-merge pattern: a
// module opens its own seats by merging into SlotMap.
declare module "@melite/slots/vendored/core" {
  interface SlotMap {
    "test.panel": { kind: "single" }
    "test.a": { kind: "list" }
    "test.b": { kind: "list" }
  }
}

const Null = (): null => null

// ── PART A — core semantics (fresh registry) ────────────────────────────

describe("SlotCore semantics", () => {
  it("rejects registration into an undeclared seat", () => {
    const core = new SlotCore()
    expect(() => core.register({ name: "test.panel" }, Null)).toThrow(/is not declared/)
  })

  it("one register call contributes the component AND declares child seats", () => {
    const core = new SlotCore()
    core.register(
      {
        name: "root",
        id: "owner",
        children: { "test.panel": { kind: "single" }, "test.a": { kind: "list" } },
      },
      Null,
    )
    expect(core.isDeclared("test.panel")).toBe(true)
    expect(core.kindOf("test.a")).toBe("list")
  })

  it("rejects a second declarer of the same seat, naming the first", () => {
    const core = new SlotCore()
    core.register(
      {
        name: "root",
        id: "owner",
        children: { "test.panel": { kind: "single" }, "test.a": { kind: "list" } },
      },
      Null,
    )
    // A SECOND entry (into the other seat) tries to redeclare test.panel.
    expect(() =>
      core.register(
        { name: "test.a", id: "other", children: { "test.panel": { kind: "single" } } },
        Null,
      ),
    ).toThrow(/test.panel" is already declared/)
  })

  it("list seats require an id; duplicate ids at one priority are loud", () => {
    const core = new SlotCore()
    core.register(
      { name: "root", id: "owner", children: { "test.a": { kind: "list" } } },
      Null,
    )
    expect(() => core.register({ name: "test.a" }, Null)).toThrow(/requires options.id/)
    core.register({ name: "test.a", id: "x", registrant: "one" }, Null)
    expect(() => core.register({ name: "test.a", id: "x" }, Null)).toThrow(
      /entry with id "x".*registered by one/,
    )
  })

  it("single seats shadow at distinct priorities; the lowest renders", () => {
    const core = new SlotCore()
    core.register(
      { name: "root", id: "owner", children: { "test.panel": { kind: "single" } } },
      Null,
    )
    core.register({ name: "test.panel", registrant: "base" }, Null)
    core.register({ name: "test.panel", priority: 1, registrant: "shadow" }, Null)
    const entries = core.entriesOfSlot("test.panel")
    expect(entries).toHaveLength(2)
    expect(entries[0].registrant).toBe("base")
  })

  it("list ledger order: priority, then order, then registration", () => {
    const core = new SlotCore()
    core.register(
      { name: "root", id: "owner", children: { "test.a": { kind: "list" } } },
      Null,
    )
    core.register({ name: "test.a", id: "late", order: 20 }, Null)
    core.register({ name: "test.a", id: "first", order: 10 }, Null)
    core.register({ name: "test.a", id: "second", order: 10 }, Null)
    expect(core.entriesOfSlot("test.a").map((e) => e.id)).toEqual([
      "first",
      "second",
      "late",
    ])
  })

  it("disposal removes the entry AND collapses its declared children recursively; stale disposers no-op; redeclaration is legal", () => {
    const core = new SlotCore()
    core.register(
      { name: "root", id: "owner", children: { "test.a": { kind: "list" } } },
      Null,
    )
    const disposeMiddle = core.register(
      { name: "test.a", id: "middle", children: { "test.b": { kind: "list" } } },
      Null,
    )
    const disposeInner = core.register({ name: "test.b", id: "inner" }, Null)
    expect(core.isDeclared("test.b")).toBe(true)

    disposeMiddle()
    expect(core.isDeclared("test.b")).toBe(false)
    expect(core.entriesOfSlot("test.b")).toHaveLength(0)
    expect(() => disposeInner()).not.toThrow() // stale — no-op
    expect(core.entriesOfSlot("test.a").map((e) => e.id)).toEqual([])

    // Redeclaration after collapse is legal (epoch advanced).
    core.register(
      { name: "test.a", id: "again", children: { "test.b": { kind: "list" } } },
      Null,
    )
    expect(core.isDeclared("test.b")).toBe(true)
  })

  it("notifications batch per microtask: N same-tick mutations → one notification", async () => {
    const core = new SlotCore()
    core.register(
      { name: "root", id: "owner", children: { "test.a": { kind: "list" } } },
      Null,
    )
    const listener = vi.fn()
    core.subscribe("test.a", listener)
    core.register({ name: "test.a", id: "one" }, Null)
    core.register({ name: "test.a", id: "two" }, Null)
    core.register({ name: "test.a", id: "three" }, Null)
    expect(listener).not.toHaveBeenCalled() // versions bumped, notify batched
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("describe() walks the declaration tree from root", () => {
    const core = new SlotCore()
    core.register(
      { name: "root", id: "owner", children: { "test.a": { kind: "list" } } },
      Null,
    )
    core.register({ name: "test.a", id: "x" }, Null)
    const tree = core.describe()
    expect(tree.name).toBe("root")
    const child = tree.children.find((c) => c.name === "test.a")
    expect(child?.kind).toBe("list")
    expect(child?.occupants.map((o) => o.id)).toEqual(["x"])
  })
})

// ── PART B — the ActivityBar seam gate (the real shell) ─────────────────

describe("activity rail seam gate", () => {
  const SEATS = [
    "activity.primary",
    "activity.drawer",
    "activity.studio",
    "activity.foot",
    "center.tabs",
    // H-RIGHT (§16.7): the right sidebar's pane seat — declared by the
    // same root declarer that owns center.tabs.
    "right.panels",
  ]

  it("declares exactly the tier + center seats under root", () => {
    for (const seat of SEATS) expect(shellSlots.isDeclared(seat)).toBe(true)
    const root = shellSlots.describe()
    const names = root.children.map((c) => c.name).sort()
    expect(names).toEqual([...SEATS].sort())
  })

  it("pins the first-party occupancy of every tier (drift = CI failure)", () => {
    const idsOf = (seat: string) =>
      shellSlots
        .describe()
        .children.find((c) => c.name === seat)!
        .occupants.map((o) => o.id)
    expect(idsOf("activity.primary")).toEqual(["library"])
    expect(idsOf("activity.drawer")).toEqual(["media"])
    // The studio seat is declared but intentionally EMPTY (2026-08-21):
    // the studios are ACTION CARDS on the Library canvas (card seam),
    // not tabs — Pose's rail icon died; the seat stays open for a
    // future registration.
    expect(idsOf("activity.studio")).toEqual([])
    expect(idsOf("activity.foot")).toEqual(["packages"])
  })

  it("renders the rail live from the registry (owner share reaches entries)", () => {
    render(
      createElement(SlotOutlet, {
        core: shellSlots,
        name: "activity.primary",
        ctx: { active: new Set(["library"]), onSelect: () => {} },
      }),
    )
    expect(screen.getByRole("button", { name: "Library" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("a runtime third-party registration appears — and disappears on dispose — with zero rail edits", async () => {
    render(
      createElement(SlotOutlet, {
        core: shellSlots,
        name: "activity.drawer",
        ctx: { active: new Set(), onSelect: () => {} },
      }),
    )
    expect(screen.queryByRole("button", { name: "Extra" })).toBeNull()

    const dispose = shellSlots.register(
      { name: "activity.drawer", id: "extra", order: 15, registrant: "gate-test" },
      () => createElement("button", { type: "button", "aria-label": "Extra" }, "Extra"),
    )
    expect(await screen.findByRole("button", { name: "Extra" })).toBeTruthy()

    act(() => dispose())
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByRole("button", { name: "Extra" })).toBeNull()
    // The first-party drawer entries survived the neighbor's disposal.
    expect(screen.getByRole("button", { name: "History / Media" })).toBeTruthy()
  })

  it("the foot tier renders the Plugins inventory entry (§6.4)", () => {
    render(
      createElement(SlotOutlet, {
        core: shellSlots,
        name: "activity.foot",
        ctx: { active: new Set(), onSelect: () => {} },
      }),
    )
    expect(screen.getByRole("button", { name: "Plugins" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  })

  // ── THE SOURCE GATE — the closed union and item arrays stay dead ──────
  it("ActivityBar.tsx carries no ActivityPanel union and no hardcoded item arrays", () => {
    // cwd is web/editor under vitest (config root); source-scan by path.
    const src = readFileSync("src/surfaces/shared/ActivityBar.tsx", "utf8")
    expect(src).not.toContain("type ActivityPanel")
    expect(src).not.toContain("PRIMARY_ITEMS")
    expect(src).not.toContain("DRAWER_ITEMS")
    expect(src).not.toContain("STUDIO_ITEMS")
    expect(src).toContain("SlotOutlet") // the rail renders through seats
  })

  it("no consumer imports the dead ActivityPanel type", () => {
    const layout = readFileSync("src/surfaces/shared/WorkspaceLayout.tsx", "utf8")
    expect(layout).not.toContain("ActivityPanel")
    const store = readFileSync("src/surfaces/shared/drawerStore.ts", "utf8")
    expect(store).not.toContain("ActivityPanel")
  })
})

// ── PART C — the CENTER seat gate (§8.2: the TabId unions stay dead) ────

describe("center seat seam gate", () => {
  const centerIds = () =>
    shellSlots.entriesOfSlot("center.tabs").map((e) => e.id)

  it("pins the first-party center occupancy (drift = CI failure)", () => {
    expect(centerIds()).toEqual(["library"])
  })

  it("the startup tab has a registered entry (the fallback pick is real)", () => {
    expect(centerIds()).toContain(STARTUP_TAB)
  })

  it("right-panel meta rides the registration (one definition site)", () => {
    const entries = shellSlots.entriesOfSlot("center.tabs")
    const px = (id: string) => {
      const e = entries.find((x) => x.id === id)!
      return (e.component as { rightPanelPx?: number }).rightPanelPx
    }
    expect(px("library")).toBe(256)
  })

  it("a runtime third-party center registration appears without layout edits", () => {
    expect(centerIds()).not.toContain("gate-extra")
    const dispose = shellSlots.register(
      { name: "center.tabs", id: "gate-extra", order: 45, registrant: "gate-test" },
      () => null,
    )
    expect(centerIds()).toContain("gate-extra")
    dispose()
    expect(centerIds()).not.toContain("gate-extra")
  })

  it("the pick helpers resolve entries and fall back clean", () => {
    const entries = shellSlots.entriesOfSlot("center.tabs")
    expect(centerEntry(entries, "library")?.id).toBe("library")
    expect(centerEntry(entries, "nope")).toBeNull()
    expect(centerRightPanelPx(entries, "nope")).toBe(0)
  })

  // ── THE SOURCE GATE — the closed tab unions stay dead ──────────────────
  it("no closed TabId/SurfaceTab/RightPanelTab union survives in the shell path", () => {
    const layout = readFileSync("src/surfaces/shared/WorkspaceLayout.tsx", "utf8")
    expect(layout).not.toContain("type TabId")
    expect(layout).not.toContain("as TabId")
    const store = readFileSync("src/surfaces/shared/activeSurfaceStore.ts", "utf8")
    expect(store).not.toMatch(/export type SurfaceTab =\s*\n\s*\|/)
    const rp = readFileSync("src/surfaces/shared/rightPanelStore.ts", "utf8")
    expect(rp).not.toMatch(/export type RightPanelTab =\s*\n\s*\|/)
    const bridge = readFileSync("src/surfaces/shared/tabBridge.ts", "utf8")
    expect(bridge).not.toMatch(/type TabId = "/)
    // The render is a registry pick, not a tab switch.
    expect(layout).toContain("centerEntry(centerEntries, tab)")
  })
})
