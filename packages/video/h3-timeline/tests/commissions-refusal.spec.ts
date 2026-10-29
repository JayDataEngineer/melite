// commissions-refusal.spec.ts — §9's defensiveness arm: the rail's
// refusal voice never renders an empty or object-ish sentence.
//
// The compose door raises Errors today, but `catch` receives `unknown`
// (the estate's ban on assuming a thrown shape), so the rail's coercion
// has two faces: an Error's message, and String(err) for anything else.
// The mocked solver here is the THROWER only — every other arm of the
// derivation rides the real @melite/models-h3 solver (commissions.spec
// ARM 4 pins the agreement).
import { describe, expect, it, vi } from "vitest"

const thrower = vi.hoisted(() => ({ thrown: undefined as unknown }))

vi.mock("@melite/models-h3/timelineContract", async (importOriginal) => {
  const real = await importOriginal<typeof import("@melite/models-h3/timelineContract")>()
  return {
    ...real,
    solveWindowComposition: () => { throw thrower.thrown },
  }
})

const { deriveCommissions } = await import("../src/ui/studio/commissions.ts")

const EXTEND = { source_clip: "clips/take3.mp4", extend_prompt: "she walks on", extend_seconds: 16.5 }

describe("§9 — the rail's refusal voice (a throw is coerced, never dropped)", () => {
  it("an Error's message IS the row's voice", () => {
    thrower.thrown = new Error("h3-timeline extend: stated 127f composes nowhere exactly")
    const row = deriveCommissions({ extend: [EXTEND] })[0]!
    expect(row.refusal).toBe("h3-timeline extend: stated 127f composes nowhere exactly")
    expect(row.geometry).toBeUndefined()
  })

  it("a non-Error throw still names itself (String(err)) — never 'undefined' on the lane", () => {
    thrower.thrown = "engine refused the slice"
    const row = deriveCommissions({ extend: [EXTEND] })[0]!
    expect(row.refusal).toBe("engine refused the slice")
  })
})
