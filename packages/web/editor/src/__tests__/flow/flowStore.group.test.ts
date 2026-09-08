// Store-level compound grouping (2026-08-12) — groupStages / ungroupStages,
// the ONE authoring primitive for "card holds other cards". The UI's
// "group selection" affordance (FlowTileGrid's floating Group bar) and
// the agent's explicit grouping path both land in groupStages. This pins
// the store half: the parent is inserted at the FIRST member's position,
// children stay in place, the projection collapses them into the parent's
// segment, and ungroupStages dissolves the parent cleanly.
import { describe, it, expect, beforeEach } from "vitest"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import { projectSubgraphs } from "@/surfaces/flow/subgraph"
import type { FlowStage } from "@melite/contracts"

const state = () => useAgentFlowStore.getState()
const ids = () => state().flow!.stages.map((s) => s.id)
const stages = () => state().flow!.stages

let a = "", b = "", c = "", d = ""

beforeEach(async () => {
  state().clear()
  await state().startFlow("group test")
  for (const svc of ["a", "b", "c", "d", "e"]) {
    await state().addStage({ kind: "generation", service: svc, title: svc, params: { prompt: "x" } })
  }
  ;[a, b, c, d] = ids()
})

describe("groupStages — wrap N stages into a compound parent (2026-08-12)", () => {
  it("creates a compound parent at the FIRST member's position; members stay in place", () => {
    const parentId = state().groupStages([b, c])
    expect(parentId, "groupStages must return the new parent id").toBeTruthy()
    // The parent is a compound stage at index 1 (where 'b' was).
    const parent = stages().find((s) => s.id === parentId!)!
    expect(parent.kind).toBe("compound")
    expect(parent.compound).toEqual({ mode: "fanout", childIds: [b, c] })
    // Members stay in the array — the projection skips them inside the
    // parent's segment.
    expect(ids()).toContain(b)
    expect(ids()).toContain(c)
  })

  it("defaults to mode='fanout'; accepts an explicit mode + title", () => {
    const parentId = state().groupStages([a, b], "flow", "My Flow")
    const parent = stages().find((s) => s.id === parentId!)!
    expect(parent.compound!.mode).toBe("flow")
    expect(parent.title).toBe("My Flow")
  })

  it("auto-titles '<N> cards' when no title is supplied", () => {
    const parentId = state().groupStages([a, b, c])
    const parent = stages().find((s) => s.id === parentId!)!
    expect(parent.title).toBe("3 cards")
  })

  it("requires at least 2 valid ids — returns null for 0 or 1", () => {
    expect(state().groupStages([])).toBeNull()
    expect(state().groupStages([a])).toBeNull()
  })

  it("dedupes child ids preserving order", () => {
    const parentId = state().groupStages([b, c, b, c])
    const parent = stages().find((s) => s.id === parentId!)!
    expect(parent.compound!.childIds).toEqual([b, c])
  })

  it("re-grouping members that already belong to another compound re-parents them", () => {
    // First group: [b, c]
    const p1 = state().groupStages([b, c])!
    // Second group: [c, d] — 'c' leaves p1, joins p2.
    const p2 = state().groupStages([c, d])!
    // p1 should have lost 'c' → only [b] → emptied → dropped.
    const p1After = stages().find((s) => s.id === p1)
    expect(p1After, "emptied parent must be dropped").toBeUndefined()
    // p2 owns [c, d].
    const p2After = stages().find((s) => s.id === p2)!
    expect(p2After.compound!.childIds).toEqual([c, d])
  })

  it("marks the flow stale after grouping (execution order changed)", () => {
    state().groupStages([b, c])
    expect(state().flow!.status).not.toBe("draft")
  })

  it("the projection collapses the children into the parent's segment", () => {
    const parentId = state().groupStages([b, c])!
    const segs = projectSubgraphs(stages() as FlowStage[])
    // 4 segments: a (single), parent (chain with 2 children), d (single), e (single).
    expect(segs.length).toBe(4)
    const chainSeg = segs.find((s) => s.kind === "chain")
    expect(chainSeg, "a chain segment must exist").toBeTruthy()
    if (chainSeg!.kind === "chain") {
      expect(chainSeg!.stages.map((s) => s.id)).toEqual([b, c])
      expect(chainSeg!.parent?.id).toBe(parentId)
    }
  })
})

describe("ungroupStages — dissolve a compound parent (2026-08-12)", () => {
  it("removes the parent; children stay in the array at their positions", () => {
    const parentId = state().groupStages([b, c])!
    const ok = state().ungroupStages(parentId)
    expect(ok).toBe(true)
    // Parent is gone.
    expect(stages().find((s) => s.id === parentId)).toBeUndefined()
    // Children are still there.
    expect(ids()).toContain(b)
    expect(ids()).toContain(c)
  })

  it("returns false for a non-compound id (nothing to dissolve)", () => {
    expect(state().ungroupStages(a)).toBe(false)
    expect(state().ungroupStages("s_nope")).toBe(false)
  })

  it("after ungroup, the projection renders each child as a free single", () => {
    const parentId = state().groupStages([b, c])!
    state().ungroupStages(parentId)
    const segs = projectSubgraphs(stages() as FlowStage[])
    // No chain segment — all 5 are singles again.
    expect(segs.every((s) => s.kind === "single")).toBe(true)
    expect(segs.length).toBe(5)
  })

  it("marks the flow stale after ungrouping", () => {
    const parentId = state().groupStages([b, c])!
    state().flow!.status = "done" // pretend it was done
    state().ungroupStages(parentId)
    expect(state().flow!.status).not.toBe("done")
  })
})
