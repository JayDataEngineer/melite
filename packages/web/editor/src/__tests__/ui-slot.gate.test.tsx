// ui-slot.gate — the gate for THE UI SLOT KERNEL (2026-08-19, the
// overrides doctrine: "Cards are supposed to be a composition of
// elements. Every part of the UI, such as chat input, sidebars, are
// plugins that allow for overrides").
//
// PART A — kernel laws on a FRESH slot: tier collision loud (+ the
//          shadowing hint), dup id loud, walk order, deferring, empty
//          walk → null, live version bumps on register/dispose.
// PART B+C — the doctrine in the running app: first-party element and
//          region defaults are the QUIETEST claims (precedence 10) and
//          a louder claim shadows then restores on dispose.
// PART D — pluginUi wire laws: unknown slot names skip fail-safe,
//          missing components skip loud, sync never throws, and
//          card-body is deliberately NOT on the wire (E4 writes
//          contract rides the studio lane — pinned by source scan).
import { describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { createUiSlot } from "@melite/slots"
import { cardIconSlot, cardPreviewSlot, cardRunSlot } from "@melite/slots"
import { sidebarRegionSlot } from "@melite/slots"
// Side-effect: melite-core's ICON fold registers in code (a per-stage data
// fold, not a fixed component — the one element claim that cannot ride
// the wire's component factories). PREVIEW + RUN + the REGION defaults
// all ride the ui-claim WIRE (packages/melite-core/ui/*/ui.yaml → the
// fixtures below → syncPluginUi).

// HERMETIC LANE (2026-08-22): PART D's loadPluginUi fetches /v1/ui-slots.
// Un-mocked it hits the LIVE gateway when the dev stack is up — the real
// payload's component imports hang vitest past the 5s timeout, so the
// suite was red whenever the stack ran. The wire law under test ("a dead
// lane must not brick boot") is about FAIL-SAFE, not about a live HTTP
// dependency: serve the melite-core fixture lanes here; a rejected fetch is
// the dead-lane arm (the catch logs, never throws).
vi.mock("@/rpc/editorClient", () => ({
  editorClient: {
    listUiSlots: vi.fn(async () => [...PLUGIN_REGION_CLAIMS, ...PLUGIN_ELEMENT_CLAIMS]),
  },
}))

import "@/surfaces/flow/cardElements"
import { syncPluginUi, loadPluginUi } from "@/shell/pluginUi"

import { PLUGIN_REGION_CLAIMS, PLUGIN_ELEMENT_CLAIMS } from "./pluginUiLane"

type Payload = { tag: string }

// ── PART A — kernel laws ─────────────────────────────────────────────────

describe("uiSlot kernel", () => {
  it("walks highest precedence first; disposing the loud claim restores the quiet one", () => {
    const s = createUiSlot<Payload, string>("gate-walk")
    s.register({ id: "low", precedence: 10, resolve: (i) => ({ tag: "low:" + i }) })
    const disposeHigh = s.register({ id: "high", precedence: 200, resolve: (i) => ({ tag: "high:" + i }) })
    expect(s.resolve("x")?.tag).toBe("high:x")
    disposeHigh() // the shadow leaves → the quiet default renders again
    expect(s.resolve("x")?.tag).toBe("low:x")
  })

  it("a tier collision is LOUD, with the shadowing hint", () => {
    const s = createUiSlot<Payload, string>("gate-tier")
    s.register({ id: "a", precedence: 100, resolve: () => ({ tag: "a" }) })
    expect(() =>
      s.register({ id: "b", precedence: 100, resolve: () => ({ tag: "b" }) }),
    ).toThrow(/precedence 100 is taken by "a"[\s\S]*different precedence to shadow/)
  })

  it("a duplicate provider id is LOUD", () => {
    const s = createUiSlot<Payload, string>("gate-dup")
    s.register({ id: "dup", precedence: 10, resolve: () => ({ tag: "one" }) })
    expect(() =>
      s.register({ id: "dup", precedence: 999, resolve: () => ({ tag: "two" }) }),
    ).toThrow(/already registered/)
  })

  it("deferring falls through the walk; an empty walk returns null (host fail-safe)", () => {
    const s = createUiSlot<Payload, string>("gate-defer")
    s.register({ id: "skip", precedence: 500, resolve: () => null })
    s.register({ id: "take", precedence: 100, resolve: (i) => ({ tag: "take:" + i }) })
    expect(s.resolve("y")?.tag).toBe("take:y")
    const empty = createUiSlot<Payload, string>("gate-empty")
    expect(empty.resolve("y")).toBeNull()
  })

  it("is a STORE: version bumps on register and dispose, listeners fire", () => {
    const s = createUiSlot<Payload, string>("gate-store")
    const seen: number[] = []
    const unsub = s.subscribe(() => seen.push(s.getVersion()))
    const v0 = s.getVersion()
    const dispose = s.register({ id: "watched", precedence: 1, resolve: () => null })
    expect(s.getVersion()).toBeGreaterThan(v0)
    dispose()
    dispose() // double-dispose is a no-op, never a throw
    expect(s.getVersion()).toBeGreaterThan(v0 + 1)
    expect(seen.length).toBe(2)
    unsub()
  })

  it("registered() lists claims highest-precedence-first (gate order pin)", () => {
    const s = createUiSlot<Payload, string>("gate-list")
    s.register({ id: "quiet", precedence: 10, resolve: () => null })
    s.register({ id: "loud", precedence: 900, resolve: () => null })
    expect(s.registered()).toEqual(["900:loud", "10:quiet"])
  })
})

// ── PART B+C — the doctrine in the running app ───────────────────────────

describe("first-party chrome is static, the quietest tier (web-registry ruling)", () => {
  it("element slots carry STATIC chrome defaults at precedence 10 — no wire needed", async () => {
    // The chrome registers at pluginUi import (no sync, no wire): the
    // shell owns its defaults; the icon claim remains a code-side DATA
    // fold (a fold is not a fixed component — see cardElements.tsx).
    expect(cardIconSlot.registered()).toEqual(["10:melite-core/kind-icon"])
    expect(cardPreviewSlot.registered()).toContain("10:chrome/asset-preview")
    expect(cardRunSlot.registered()).toContain("10:chrome/tile-run")
    expect(cardPreviewSlot.resolve(null)?.Preview).toBeTruthy()
    expect(cardRunSlot.resolve(null)?.Run).toBeTruthy()
  })

  it("region slots carry STATIC chrome defaults — resolve without any wire", async () => {
    expect(sidebarRegionSlot.registered()).toContain("10:chrome/media-sidebar")
    expect(sidebarRegionSlot.resolve(null)?.Sidebar).toBeTruthy()
  })

  it("a wire diff NEVER disposes static chrome (it ships with the shell)", async () => {
    // The wire is TOTAL for PLUGIN claims only — an empty sync disposes
    // every plugin claim and leaves chrome untouched.
    await syncPluginUi([])
    expect(cardPreviewSlot.registered()).toEqual(["10:chrome/asset-preview"])
    expect(sidebarRegionSlot.registered()).toEqual(["10:chrome/media-sidebar"])
  })

  it("a louder PLUGIN claim SHADOWS the chrome; dispose restores it (the override doctrine)", async () => {
    const dispose = cardRunSlot.register({
      id: "gate/override-run",
      precedence: 400,
      resolve: () => ({ Run: () => null as never }),
    })
    expect(cardRunSlot.registered()).toEqual(["400:gate/override-run", "10:chrome/tile-run"])
    dispose()
    expect(cardRunSlot.registered()).toEqual(["10:chrome/tile-run"])
  })
})

// ── PART D — the wire ────────────────────────────────────────────────────

describe("pluginUi wire laws", () => {
  it("an unknown slot name skips loud — never a throw, never a register", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {})
    await syncPluginUi([
      ...PLUGIN_REGION_CLAIMS,
      { plugin: "gate-plugin", id: "weird", slot: "no-such-slot", precedence: 300 },
    ])
    expect(err.mock.calls.some((c) => String(c[0]).includes("unknown slot"))).toBe(true)
    // Nothing registered anywhere new: the element slots still show
    // ONLY the melite-core defaults; the regions keep their lane claims.
    expect(cardIconSlot.registered()).toEqual(["10:melite-core/kind-icon"])
    err.mockRestore()
  })

  it("a known slot with no component.tsx skips loud (a wire lie, caught)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {})
    await syncPluginUi([
      ...PLUGIN_REGION_CLAIMS,
      { plugin: "gate-plugin", id: "ghost", slot: "sidebar", precedence: 300 },
    ])
    expect(err.mock.calls.some((c) => String(c[0]).includes("no component.tsx"))).toBe(true)
    // The ghost registered NOTHING; the real claims stand.
    expect(sidebarRegionSlot.registered()).toEqual(["10:chrome/media-sidebar"])
    err.mockRestore()
  })

  it("loadPluginUi NEVER throws (a dead lane must not brick boot)", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(loadPluginUi()).resolves.toBeUndefined()
    err.mockRestore()
  })

  it("card-body is NOT on the ui wire — the E4 writes contract rides the studio lane", () => {
    const src = readFileSync("src/shell/pluginUi.ts", "utf8")
    const factoriesBlock = src.slice(src.indexOf("SLOT_FACTORIES"), src.indexOf("_disposers"))
    expect(factoriesBlock).not.toMatch(/["']card-body["']/)
    expect(factoriesBlock).toMatch(/["']card-preview["']/)
  })
})
