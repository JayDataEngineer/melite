// subgraph.test — the ONE first-class compound projection (2026-08-12).
//
// Proves the formalization replaces the three hacks:
//   • a real ``compound`` parent (mode="fanout") condenses its children
//     into ONE segment — even when the children are NON-consecutive and
//     even when they're NOT the family the legacy predicate matches;
//   • first-class identity survives reorder (the segment id is
//     ``compound:<parentId>``, stable across child moves — the big win over
//     the old pure-view projection, which dissolved the moment a member
//     moved away from its siblings);
//   • children are SKIPPED in the flat array (never double-render);
//   • the legacy fallback still condenses a flat array of consecutive
//     same-family stages with no explicit parent (backward-compat bridge);
//   • aggregateStatus is the ONE reducer (empty, mixed, all-done).
import { describe, it, expect } from "vitest"
import {
  aggregateStatus,
  compoundChildren,
  consumedChildIds,
  isCompoundStage,
  projectSubgraphs,
  segmentId,
  EMPTY_AGGREGATE,
} from "@/surfaces/flow/subgraph"
import type { FlowStage } from "@melite/contracts"

function gen(id: string, service: string, over: Partial<FlowStage> = {}): FlowStage {
  return {
    id,
    title: id,
    kind: "generation",
    service,
    params: {},
    inputs: [],
    result: null,
    status: "pending",
    error: null,
    cacheKey: null,
    ...over,
  }
}

const edit = (id: string) => gen(id, "edit_image")
const other = (id: string) => gen(id, "krea-2")
const isEdit = (s: FlowStage) => s.service === "edit_image"

function compound(id: string, childIds: string[], mode: "fanout" | "flow" | "modifiers" = "fanout"): FlowStage {
  return gen(id, "", { kind: "compound", title: id, compound: { mode, childIds } })
}

describe("projectSubgraphs — first-class compound parent", () => {
  it("collapses a compound parent's children into ONE segment (parent present)", () => {
    const stages: FlowStage[] = [
      compound("g1", ["a", "b", "c"]),
      edit("a"),
      edit("b"),
      edit("c"),
    ]
    const segs = projectSubgraphs(stages, isEdit)
    expect(segs).toHaveLength(1)
    expect(segs[0].kind).toBe("chain")
    if (segs[0].kind !== "chain") return
    expect(segs[0].stages.map((s) => s.id)).toEqual(["a", "b", "c"])
    expect(segs[0].parent?.id).toBe("g1")
    expect(segs[0].mode).toBe("fanout")
  })

  it("children are skipped — never double-rendered as free tiles", () => {
    const stages: FlowStage[] = [
      compound("g1", ["a", "b"]),
      edit("a"),
      edit("b"),
    ]
    const segs = projectSubgraphs(stages, isEdit)
    // ONE segment, zero singles — the children don't leak.
    expect(segs).toHaveLength(1)
    expect(segs.every((s) => s.kind === "chain")).toBe(true)
  })

  it("identity survives reorder — segment id is compound:<parentId>", () => {
    // Children in ARBITRARY positions, non-consecutive, interleaved with a
    // free stage. The old pure-view projection would have dissolved the
    // group (a non-edit stage BREAKS a run). The first-class parent holds.
    const stages: FlowStage[] = [
      compound("g1", ["a", "b"]),
      edit("a"),
      other("x"), // breaks a legacy run
      edit("b"),
    ]
    const segs = projectSubgraphs(stages, isEdit)
    expect(segs).toHaveLength(2)
    const group = segs.find((s) => s.kind === "chain")!
    expect(segmentId(group)).toBe("compound:g1")
    if (group.kind !== "chain") return
    expect(group.stages.map((s) => s.id)).toEqual(["a", "b"])
    const free = segs.find((s) => s.kind === "single")!
    expect(free.kind).toBe("single")
    expect((free as { stage: FlowStage }).stage.id).toBe("x")
  })

  it("multiple compound parents each collapse independently", () => {
    const stages: FlowStage[] = [
      compound("g1", ["a", "b"]),
      compound("g2", ["c", "d"]),
      edit("a"), edit("b"), edit("c"), edit("d"),
    ]
    const segs = projectSubgraphs(stages, isEdit)
    expect(segs).toHaveLength(2)
    expect(segs.every((s) => s.kind === "chain")).toBe(true)
    expect(segs.map(segmentId)).toEqual(["compound:g1", "compound:g2"])
  })
})

describe("projectSubgraphs — legacy fallback (backward-compat)", () => {
  it("a flat array of consecutive same-family stages still condenses (no parent)", () => {
    const stages = [edit("a"), edit("b"), edit("c")]
    const segs = projectSubgraphs(stages, isEdit)
    expect(segs).toHaveLength(1)
    expect(segs[0].kind).toBe("chain")
    if (segs[0].kind !== "chain") return
    expect(segs[0].parent).toBeUndefined()
    // Legacy id shape — composite of member ids.
    expect(segmentId(segs[0])).toBe("chain:a|b|c")
  })

  it("a lone same-family stage stays a single (no grouping at length 1)", () => {
    const stages = [edit("solo")]
    const segs = projectSubgraphs(stages, isEdit)
    expect(segs).toHaveLength(1)
    expect(segs[0].kind).toBe("single")
  })

  it("predicate-free call: everything is a single (no implicit grouping)", () => {
    const stages = [edit("a"), edit("b"), other("c")]
    const segs = projectSubgraphs(stages) // no predicate → no legacy grouping
    expect(segs).toHaveLength(3)
    expect(segs.every((s) => s.kind === "single")).toBe(true)
  })

  it("STRING-KEY predicates scope runs by family — a key CHANGE breaks the run", () => {
    // 2026-08-13: the upscale condensation. A boolean predicate that is true
    // for BOTH families would merge edit×8 + upscale×9 into ONE 17-member
    // chain; the key form keeps them as TWO chains.
    const up = (id: string) => gen(id, "upscale_image")
    const keyOf = (s: FlowStage): string | null => {
      if (s.service === "edit_image") return "qwen-img-edit-2511"
      if (s.service === "upscale_image") return "upscale"
      return null
    }
    const stages: FlowStage[] = [
      edit("e1"), edit("e2"), up("u1"), up("u2"), up("u3"), other("x"),
    ]
    const segs = projectSubgraphs(stages, keyOf)
    expect(segs.map(segmentId)).toEqual(["chain:e1|e2", "chain:u1|u2|u3", "x"])
    expect(segs.every((s) => s.kind === "chain" || s.kind === "single")).toBe(true)
  })

  it("a boolean predicate still groups maximal runs (back-compat unchanged)", () => {
    const up = (id: string) => gen(id, "upscale_image")
    // The OLD contract: any predicate-true stage joins the run — edit and
    // upscale are indistinguishable, so ALL of them land in ONE chain.
    const allGroupable = (s: FlowStage) =>
      s.service === "edit_image" || s.service === "upscale_image"
    const stages: FlowStage[] = [edit("a"), up("b"), up("c"), edit("d")]
    const segs = projectSubgraphs(stages, allGroupable)
    expect(segs).toHaveLength(1)
    expect(segmentId(segs[0])).toBe("chain:a|b|c|d")
  })
})

describe("aggregateStatus — the ONE reducer", () => {
  it("empty children → EMPTY_AGGREGATE (no throw)", () => {
    expect(aggregateStatus([])).toEqual(EMPTY_AGGREGATE)
  })

  it("mixed statuses aggregate correctly", () => {
    const children = [
      edit("a"),
      gen("b", "edit_image", { status: "done", result: { assetUrls: ["cover.png"], artifacts: {}, metadata: {}, completedAt: 0, durationSec: 0 } }),
      gen("c", "edit_image", { status: "error" }),
      gen("d", "edit_image", { status: "running" }),
    ]
    const agg = aggregateStatus(children)
    expect(agg).toMatchObject({
      total: 4,
      doneCount: 1,
      anyRunning: true,
      anyError: true,
      allDone: false,
      coverUrl: "cover.png",
      title: "a",
    })
  })

  it("all-done → allDone true, no running/error", () => {
    const children = [
      gen("a", "x", { status: "done", result: { assetUrls: ["1.png"], artifacts: {}, metadata: {}, completedAt: 0, durationSec: 0 } }),
      gen("b", "x", { status: "cached" }),
    ]
    const agg = aggregateStatus(children)
    expect(agg.allDone).toBe(true)
    expect(agg.anyRunning).toBe(false)
    expect(agg.doneCount).toBe(2)
  })
})

describe("compound helpers", () => {
  it("isCompoundStage discriminates the container kind", () => {
    expect(isCompoundStage(compound("g", ["a"]))).toBe(true)
    expect(isCompoundStage(edit("a"))).toBe(false)
  })

  it("compoundChildren resolves by id in declared order; drops stale ids", () => {
    const parent = compound("g", ["a", "b", "ghost"])
    const stages = [parent, edit("a"), edit("b")]
    expect(compoundChildren(parent, stages).map((s) => s.id)).toEqual(["a", "b"])
  })

  it("consumedChildIds is the union of every compound parent's children", () => {
    const stages = [compound("g1", ["a", "b"]), compound("g2", ["c"]), edit("a"), edit("b"), edit("c")]
    expect(consumedChildIds(stages)).toEqual(new Set(["a", "b", "c"]))
  })
})
