// Store-level block reorder (2026-08-12) — reorderRange, the multi-edit
// condensation's drag semantics: a CONTIGUOUS BLOCK of stages (the collapsed
// chain) moves as one unit, anchored at the over-target's post-removal
// index (arrayMove generalization). A 1-element block must be EXACTLY
// reorderStage — the single-card contract cannot regress. Unknown ids /
// missing anchors are no-ops; the move marks the flow stale (the
// execution order changed).
import { describe, it, expect, beforeEach } from "vitest"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"

const state = () => useAgentFlowStore.getState()
const ids = () => state().flow!.stages.map((s) => s.id)

// The five stages' REAL ids — addStage generates s_* ids, so the tests pin
// order by captured ids, never literals.
let a = "", b = "", c = "", d = "", e = ""

beforeEach(async () => {
  state().clear()
  await state().startFlow("reorder-range test")
  for (const svc of ["a", "b", "c", "d", "e"]) {
    await state().addStage({ kind: "generation", service: svc, title: svc, params: { prompt: "x" } })
  }
  ;[a, b, c, d, e] = ids()
})

describe("reorderRange — block moves (2026-08-12, multi-edit condensation)", () => {
  it("moves a contiguous block before its anchor — arrayMove semantics", () => {
    state().reorderRange([c, d], b) // drag chain [c,d] onto b
    expect(ids()).toEqual([a, c, d, b, e])
  })

  it("moves the block to the FRONT (anchor is the first stage)", () => {
    state().reorderRange([d, e], a)
    expect(ids()).toEqual([d, e, a, b, c])
  })

  it("moves the block to the END — drop onto the last stage = land before it", () => {
    state().reorderRange([a, b], e)
    expect(ids()).toEqual([c, d, a, b, e])
  })

  it("a 1-element block is exactly reorderStage — parity for the same (from, to)", () => {
    state().reorderRange([e], b)
    expect(ids()).toEqual([a, e, b, c, d])
  })

  it("reorderStage itself still moves a single stage to the same array", () => {
    state().reorderStage(e, b)
    expect(ids()).toEqual([a, e, b, c, d])
  })

  it("tolerates non-contiguous fromIds (the grid guarantees contiguity; the store stays honest)", () => {
    state().reorderRange([a, c], b)
    expect(ids()).toEqual([a, c, b, d, e])
  })

  it("unknown from-ids or a missing anchor are no-ops", () => {
    state().reorderRange(["s_nope"], b)
    expect(ids()).toEqual([a, b, c, d, e])
    state().reorderRange([a], "s_nope")
    expect(ids()).toEqual([a, b, c, d, e])
  })

  it("marks the flow stale — the execution order changed", () => {
    expect(state().flow!.status).not.toBe("stale")
    state().reorderRange([c, d], b)
    expect(state().flow!.status).toBe("stale")
  })

  it("no flow loaded → silent no-op", () => {
    state().clear()
    expect(() => state().reorderRange([a], b)).not.toThrow()
    expect(state().flow).toBeNull()
  })
})
