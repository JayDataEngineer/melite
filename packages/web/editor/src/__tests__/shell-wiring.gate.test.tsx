// shell-wiring.gate — the MISSING-PRODUCTION-WIRING gate (the empty-rail
// failure path, 2026-08-21).
//
// The rail's entries register at module scope in @/shell/activityEntries
// (the center tabs in @/shell/centerEntries) — a registration runs ONLY
// when the module is IMPORTED. The browser chain is
// main.tsx → App → WorkspaceLayout, and THAT file is the one production
// importer of the entries module (a side-effect import next to the
// ActivityBar import). shell-slots.gate's own `import "@/shell/activityEntries"`
// is a TEST dogfood — it proves the registrations work, not that the
// browser ever executes them (the 2026-08-19 seam cut shipped exactly
// that gap: test green, rail empty).
//
// This gate is the failure path: it imports the production module in a
// FRESH module registry (vi.resetModules — no activityEntries import
// anywhere in this file) and asserts the four activity seats are
// occupied by the exact first-party ids. Seats stay DECLARED either way
// (ActivityBar, which WorkspaceLayout imports, registers them) — only
// the side-effect import fills them. Delete the import → this fails.

import { describe, expect, it, vi } from "vitest"

const FIRST_PARTY: Record<string, string[]> = {
  "activity.primary": ["library"],
  "activity.drawer": ["media"],
  // The studio seat is declared but intentionally EMPTY (2026-08-21):
  // the studios are action cards on the Library canvas (card seam), not
  // tabs — Pose's rail icon died; the seat stays open for a future
  // registration.
  "activity.studio": [],
  "activity.foot": ["plugins"],
  // H-RIGHT: the right sidebar's internal tab panes ride the library
  // center (mode coupling via each pane's `modes` meta). The settings +
  // comfy-manager panes died with their dialogs — workspace is the only
  // first-party pane.
  "right.panels": ["workspace"],
}

/** Read one seat's occupant ids from the FRESH registry the graph just
 * built (seats.ts re-instantiates shellSlots per module graph). */
async function seatIds(seat: string): Promise<string[]> {
  const { shellSlots } = await import("@/shell/seats")
  const child = shellSlots.describe().children.find((c) => c.name === seat)
  return (child?.occupants ?? []).map((o) => o.id).sort()
}

describe("production shell wiring (fresh module graph)", () => {
  it("importing the layout fills all four activity seats — no direct entry import in this test", async () => {
    vi.resetModules()
    // The production chain. If the side-effect import is gone from
    // WorkspaceLayout.tsx, the seats below are declared but EMPTY.
    await import("@/surfaces/shared/WorkspaceLayout")
    const { shellSlots } = await import("@/shell/seats")
    for (const [seat, expected] of Object.entries(FIRST_PARTY)) {
      // An EMPTY seat must still be DECLARED (a missing seat also reads
      // [] — the declaration is the contract, not the occupancy).
      expect(shellSlots.isDeclared(seat), `seat ${seat} declared`).toBe(true)
      expect(await seatIds(seat), `seat ${seat}`).toEqual([...expected].sort())
    }
  })
})
