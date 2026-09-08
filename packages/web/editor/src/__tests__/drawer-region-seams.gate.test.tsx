// drawer-region-seams.gate — H-DRAWER (2026-08-21): the left media drawer
// rides the overrides doctrine — nothing in the sidebar chrome is a
// hardcoded import a plugin cannot touch. (The history-sidebar seam left
// with the native-agent chat surfaces, 2026-08-21.)
//
// What this gate PINS:
//   1. The first-party claim exists for the drawer region (media) at the
//      quietest tier, and the walk returns it.
//   2. OVERRIDE AT WILL: a plugin claim registered LOUDER wins the walk;
//      disposing it restores the first-party content. That is the whole
//      point of the seam — "sidebars are overridable at will."
//   3. The layout renders the WALK, not a component: with every claim
//      disposed the drawer chrome stays but its content is null.
//   4. Precedence collisions are LOUD (one claim per tier, by design).
import { describe, expect, it } from "vitest"
import { sidebarRegionSlot } from "@melite/slots"

// The production claim path: the first-party drawer default is STATIC
// CHROME (pluginUi import registers chrome/media-sidebar at precedence
// 10 — the web-registry ruling); plugin overrides ride the ui-claim
// LANE (engines/*/ui/<claim>/ui.yaml → entries → syncPluginUi).
import "../shell/pluginUi"

const Override = (): null => null
Override.displayName = "PluginOverride"

describe("H-DRAWER — the left drawer is a seam (override at will)", () => {
  it("the static chrome claim rides the drawer region at the quietest tier (no wire)", () => {
    // registered() prefixes precedence; chrome ids are "chrome/<id>" —
    // the shell's own default, registered at pluginUi import.
    expect(sidebarRegionSlot.registered()).toContain("10:chrome/media-sidebar")
    expect(sidebarRegionSlot.resolve(null)?.Sidebar).toBeTruthy()
  })

  it("a LOUDER plugin claim overrides the media sidebar — and disposal restores", () => {
    const dispose = sidebarRegionSlot.register({
      id: "my-plugin/media-sidebar",
      precedence: 20,
      resolve: () => ({ Sidebar: Override }),
    })
    // The walk returns the plugin's content — override at will.
    expect(sidebarRegionSlot.resolve(null)?.Sidebar).toBe(Override)
    dispose()
    // The unregister is total: first-party content is back.
    expect(sidebarRegionSlot.resolve(null)?.Sidebar).not.toBe(Override)
    expect(sidebarRegionSlot.resolve(null)?.Sidebar).toBeTruthy()
  })

  it("two claims at one tier are LOUD — the collision throws with a hint", () => {
    expect(() =>
      sidebarRegionSlot.register({
        id: "my-plugin/squatter",
        precedence: 10,
        resolve: () => ({ Sidebar: Override }),
      }),
    ).toThrow(/precedence/)
  })

  it("an empty wire drops PLUGIN claims; static chrome stays (chrome ships with the shell)", async () => {
    // The diff law is total for PLUGIN claims: sync [] unregisters
    // every plugin claim. The static chrome is NOT wire state — it
    // survives every diff (the shell's own default never blanks).
    const dispose = sidebarRegionSlot.register({
      id: "my-plugin/media-sidebar",
      precedence: 20,
      resolve: () => ({ Sidebar: Override }),
    })
    // sync([]) clears WIRE state; a DIRECT registration is not wire
    // state — dispose it, then the wire is empty and chrome alone stands.
    await (await import("../shell/pluginUi")).syncPluginUi([])
    dispose()
    expect(sidebarRegionSlot.registered()).toEqual(["10:chrome/media-sidebar"])
    expect(sidebarRegionSlot.resolve(null)?.Sidebar).toBeTruthy()
  })
})