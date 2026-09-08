// inline-run — the ONE-WAY run law for agent-composed typed flows
// (2026-09-05). A draft that carries a compiled `flow` member is
// GRAPH-BACKED: Run means ONE POST /v1/flows/start with {flow_inline} —
// the whole graph, server-side wiring, cards == bricks. Never the
// per-stage composer path (N {model} runs with the browser wiring
// artifacts), never a second orchestration engine.
//
// Also pins the no-silent-drops seams:
//  • the cards' CURRENT params overlay onto the body per stage id —
//    a user edit before Run reaches the typed run
//  • drift between draft stages and body stages refuses LOUDLY (no
//    partial run, no POST)
//  • the start body carries ONLY knobs the py gateway honors (no
//    start_from / reuse_run_id / stop_after fiction)
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import type { InlineFlowBody, StageDescriptor } from "@melite/contracts"
import { makeDraft } from "@/__tests__/__fixtures__/backendDraft"

const fetchCalls: Array<{ url: string; body: Record<string, unknown> }> = []

/** The two-stage typed flow build_flow's multi mode would persist:
 * still (image) → move (video). Stage ids SHARED between the draft
 * rows and the body — the overlay join key. */
const BODY: InlineFlowBody = {
  id: "still-to-motion",
  description: "gen then animate",
  stages: [
    { id: "still", engine: "comfyui", params: { workflow: "w", seed: 1 },
      outputs: { default: "image" } },
    { id: "move", engine: "comfyui",
      params: { workflow: "v" },
      inputs: { frame: { stage: "still", output: "default" } },
      expected: { frame: "image" },
      outputs: { default: "video" } },
  ],
}

const DESCRIPTORS: StageDescriptor[] = [
  { title: "Still", kind: "generation", service: "comfyui", params: { workflow: "w", seed: 1 } },
  { title: "Move", kind: "generation", service: "comfyui", params: { workflow: "v" } },
]

/** Hydrate a graph-backed doc: the draft rows carry the body's stage
 * ids (build_flow writes both shapes with the same ids). */
function seed(body: InlineFlowBody = BODY, descriptors: StageDescriptor[] = DESCRIPTORS) {
  const draft = makeDraft("still then motion", descriptors, body)
  // makeDraft mints s_* ids; the graph-backed contract needs the
  // BODY's ids on the rows — write them like the tool posts them
  draft.stages.forEach((s, i) => { if (body.stages[i]) s.id = body.stages[i].id })
  return draft
}

beforeEach(() => {
  fetchCalls.length = 0
  useAgentFlowStore.getState().clear()
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url)
    const body = init?.body ? JSON.parse(init.body as string) : {}
    fetchCalls.push({ url: u, body })
        if (u.endsWith("/v1/flows/validate")) {
         // COMPILE-FIRST (pipe-carry retirement, 2026-09-05): every card
         // run compiles here before start — answer ok so these run-path
         // tests exercise the run, not the refusal (pinned separately).
         return new Response(JSON.stringify({ ok: true, card: true }), {
         status: 200, headers: { "Content-Type": "application/json" },
         })
        }
        // CARD BIRTH LAW (2026-09-06): compose-first — the run mints
        // its card here before start. Served so these run-path tests
        // exercise the run, not the compose (refused composes are
        // pinned separately).
        if (u.endsWith("/v1/flows/drafts")) {
          return new Response(JSON.stringify({ draftId: "draft-test-inline" }), {
            status: 200, headers: { "Content-Type": "application/json" },
          })
        }
        if (u.endsWith("/v1/flows/start")) {
      return new Response(JSON.stringify({ run_id: "p-inline-0", status: "running" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    }
    if (u.startsWith("/v1/flows/status/")) {
      return new Response(JSON.stringify({
        run_id: "p-inline-0",
        status: "completed",
        stages: [
          // per-brick vocabulary: "done" (the hydrate mapper's word —
          // run-level "completed" is not a brick status)
          { id: "still", name: "still", index: 0, status: "done", url: "data:image/png;base64,st" },
          { id: "move", name: "move", index: 1, status: "done", url: "data:video/mp4;base64,mv" },
        ],
      }), { status: 200, headers: { "Content-Type": "application/json" } })
    }
    return new Response(JSON.stringify({}), { status: 404 })
  }))
})

afterEach(() => { vi.unstubAllGlobals() })

const startCalls = () => fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))

describe("flowStore — graph-backed (inlineFlow) runs", () => {
  it("hydrateDraft adopts the draft's compiled flow member", async () => {
    await useAgentFlowStore.getState().hydrateDraft(seed())
    const doc = useAgentFlowStore.getState().flow!
    expect(doc.inlineFlow).toBeDefined()
    expect(doc.inlineFlow!.stages.map((s) => s.id)).toEqual(["still", "move"])
    // cards == bricks: the doc stages carry the BODY's ids
    expect(doc.stages.map((s) => s.id)).toEqual(["still", "move"])
  })

  it("runAll posts ONE {flow_inline} run — never per-stage {model} runs", async () => {
    await useAgentFlowStore.getState().hydrateDraft(seed())
    await useAgentFlowStore.getState().runAll()

    const calls = startCalls()
    expect(calls).toHaveLength(1)
    const body = calls[0].body as { flow_inline?: unknown; model?: unknown }
    expect(body.flow_inline).toBeDefined()
    expect(body.model).toBeUndefined()
    // typed edges ride the body verbatim
    const fi = body.flow_inline as InlineFlowBody
    expect(fi.stages[1].inputs).toEqual({ frame: { stage: "still", output: "default" } })
    // run→card linkage: the draft id rides the start body
    expect(calls[0].body.draft_id).toBe(useAgentFlowStore.getState().flow!.id)
    // cards == bricks hydration: both cards done with their artifacts
    const doc = useAgentFlowStore.getState().flow!
    expect(doc.status).toBe("done")
    expect(doc.stages.every((s) => s.status === "done")).toBe(true)
    expect(doc.stages[0].result?.assetUrls[0]).toContain("st")
    expect(doc.stages[1].result?.assetUrls[0]).toContain("mv")
  })

  it("the start body carries ONLY knobs the gateway honors — no partial-run fiction", async () => {
    await useAgentFlowStore.getState().hydrateDraft(seed())
    await useAgentFlowStore.getState().runAll()
    const body = startCalls()[0].body as Record<string, unknown>
    for (const k of ["start_from", "stop_after", "reuse_run_id", "overrides"]) {
      expect(body[k], `body.${k} must not be sent`).toBeUndefined()
    }
  })

  it("card param edits overlay onto the body — a user edit is never silently dropped", async () => {
    const draft = seed()
    await useAgentFlowStore.getState().hydrateDraft(draft)
    // The user edits the still card's seed in the drilldown (the same
    // mutation updateStageParams applies; direct state here keeps the
    // test on the run seam).
    const doc0 = useAgentFlowStore.getState().flow!
    useAgentFlowStore.setState({
      flow: {
        ...doc0,
        stages: doc0.stages.map((s) =>
          s.id === "still" ? { ...s, params: { ...s.params, seed: 42 } } : s
        ),
      },
    })
    await useAgentFlowStore.getState().runAll()
    const fi = startCalls()[0].body.flow_inline as InlineFlowBody
    expect(fi.stages[0].params.seed).toBe(42) // the EDIT wins
    expect(fi.stages[0].params.workflow).toBe("w") // compose-time keys survive
  })

  it("a card Run on a mid-flow stage runs the WHOLE graph (atomic by construction)", async () => {
    await useAgentFlowStore.getState().hydrateDraft(seed())
    await useAgentFlowStore.getState().executeStage("move")
    const calls = startCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].body.flow_inline).toBeDefined()
    expect(calls[0].body.model).toBeUndefined()
  })

  it("draft/body drift refuses LOUDLY — no POST, no partial run", async () => {
    // A body whose stage list disagrees with the draft rows: the join
    // key finds a card with no body stage.
    const drifted: InlineFlowBody = {
      id: "drifted",
      stages: [BODY.stages[0]], // "move" missing from the body
    }
    const draft = seed(drifted)
    await useAgentFlowStore.getState().hydrateDraft(draft)
    await useAgentFlowStore.getState().runAll()

    expect(startCalls()).toHaveLength(0) // never started
    const doc = useAgentFlowStore.getState().flow!
    expect(doc.stages.some((s) => s.status === "error")).toBe(true)
    expect(doc.stages.find((s) => s.status === "error")?.error).toContain("missing stage(s)")
    expect(doc.stages.find((s) => s.status === "error")?.error).toContain("drifted")
  })

  it("a body stage with no card refuses LOUDLY too", async () => {
    const orphan: InlineFlowBody = {
      id: "orphan",
      stages: [BODY.stages[0], BODY.stages[1],
        { id: "ghost", engine: "comfyui", params: {} }],
    }
    const draft = seed(orphan, DESCRIPTORS)
    await useAgentFlowStore.getState().hydrateDraft(draft)
    await useAgentFlowStore.getState().runAll()
    expect(startCalls()).toHaveLength(0)
    const doc = useAgentFlowStore.getState().flow!
    expect(doc.stages.find((s) => s.status === "error")?.error).toContain('"ghost" has no card')
  })

  it("a draft WITHOUT a flow member keeps the composer path (single-card {model} door)", async () => {
    // The undeclared-doc contract is unchanged: hand-authored docs
    // still run per-stage. This is the remaining second way — its
    // retirement (doc→flow compiler) is a named stroke, never a
    // silent fallback for graph-backed docs.
    await useAgentFlowStore.getState().hydrateDraft(
      makeDraft("plain", [
        { title: "Gen", kind: "generation", service: "z-image", params: { prompt: "hi" } },
      ]))
    const id = useAgentFlowStore.getState().flow!.stages[0].id
    await useAgentFlowStore.getState().executeStage(id)
    const calls = startCalls()
    expect(calls).toHaveLength(1)
    expect(calls[0].body.model).toBe("z-image")
    expect(calls[0].body.flow_inline).toBeUndefined()
  })
})
