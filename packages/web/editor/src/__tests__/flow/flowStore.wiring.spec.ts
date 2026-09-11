// Proves multi-card data composition: when a downstream stage declares
// inputIndices, its /v1/flows/generate request auto-injects the
// upstream output URL as input_image (the universal key). This is the
// gap-closer test — collectUpstreamResults used to return {}; now it
// wires real data.
//
// Execution protocol (Phase C step 4): POST /v1/flows/generate →
// {run_id} → poll GET /v1/flows/status/{run_id} → {status:
// "completed", stages: [{url}]}. The mock serves BOTH calls per stage —
// a run_id derived from a per-stage counter, and a status body whose
// artifact URL embeds that same counter so wiring assertions can prove
// stage N's URL is what stage N+1 received as input_image/end_image.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import type { StageDescriptor } from "@melite/contracts"
import { makeDraft } from "@/__tests__/__fixtures__/backendDraft"

// Each call records its body so we can assert the second stage received
// the first stage's output as input_image.
const fetchCalls: Array<{ url: string; body: Record<string, unknown> }> = []
let genIdx = 0

beforeEach(() => {
  fetchCalls.length = 0
  genIdx = 0
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
          return new Response(JSON.stringify({ draftId: "draft-test-wiring" }), {
            status: 200, headers: { "Content-Type": "application/json" },
          })
        }
        if (u.endsWith("/v1/flows/start")) {
      // One run per stage — the counter is embedded in the run_id AND in
      // the status artifact URL so assertions can match them up.
      const idx = genIdx++
      return new Response(JSON.stringify({ run_id: `p-test-${idx}` }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    }
    if (u.startsWith("/v1/flows/status/")) {
      const stage = Number((u.split("/").pop() ?? "").replace("p-test-", ""))
      // Contract-valid body — the poll validates run_id + the stage core
      // (id/name/index/status) at the wire (runStatusContract.ts).
      return new Response(JSON.stringify({
        run_id: `p-test-${stage}`,
        status: "completed",
        stages: [{ id: `s${stage}`, name: `s${stage}`, index: 0, status: "completed", url: `data:image/png;base64,stage${stage}` }],
      }), { status: 200, headers: { "Content-Type": "application/json" } })
    }
    return new Response(JSON.stringify({}), { status: 404 })
  }))
})

afterEach(() => { vi.unstubAllGlobals() })

describe("flowStore — multi-stage data wiring", () => {
  it("injects upstream output as input_image on a downstream generation stage", async () => {
    const stages: StageDescriptor[] = [
      { title: "Generate", kind: "generation", service: "anima-base",
        params: { prompt: "a neon samurai", seed: 42 } },
      { title: "Upscale", kind: "generation", service: "seedvr2-ema-3b",
        params: { target_scale: 2.0 }, inputIndices: [0] },
    ]
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("generate → upscale", stages))
    await useAgentFlowStore.getState().runAll()

    const runCalls = fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))
    expect(runCalls.length).toBe(2)

    // Stage 0 output URL (registered into the asset store + result).
    const stage0Url = useAgentFlowStore.getState().flow!.stages[0].result!.assetUrls[0]
    expect(stage0Url).toBe("data:image/png;base64,stage0")

    // Stage 1: plain generate, no input_image.
    expect(runCalls[0].body.model).toBe("anima-base")
    expect(runCalls[0].body.input_image).toBeUndefined()

    // Stage 2: upscale — MUST have input_image injected from stage 0's output.
    expect(runCalls[1].body.model).toBe("seedvr2-ema-3b")
    expect(runCalls[1].body.input_image).toBe(stage0Url)

    // Both stages done.
    const pipe = useAgentFlowStore.getState().flow!
    expect(pipe.stages[0].status).toBe("done")
    expect(pipe.stages[1].status).toBe("done")
  })

  it("uses reference_image for SCAIL-2 character animation", async () => {
    const stages: StageDescriptor[] = [
      { title: "Character", kind: "generation", service: "flux-dev",
        params: { prompt: "hero", seed: 1 } },
      { title: "Animate", kind: "generation", service: "scail2-character",
        params: { pose_video: "/motions/walk.npz" }, inputIndices: [0] },
    ]
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("generate → animate", stages))
    await useAgentFlowStore.getState().runAll()

    const runCalls = fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))
    const stage0Url = useAgentFlowStore.getState().flow!.stages[0].result!.assetUrls[0]
    // Stage 1 (scail2) gets reference_image, NOT input_image.
    expect(runCalls[1].body.reference_image).toBe(stage0Url)
    expect(runCalls[1].body.input_image).toBeUndefined()
  })

  it("does NOT override an explicitly-set input_image param", async () => {
    const stages: StageDescriptor[] = [
      { title: "Generate", kind: "generation", service: "anima-base",
        params: { prompt: "sunset", seed: 1 } },
      { title: "Upscale", kind: "generation", service: "seedvr2-ema-3b",
        params: { input_image: "/gallery/explicit.png" }, inputIndices: [0] },
    ]
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("explicit override", stages))
    await useAgentFlowStore.getState().runAll()

    const runCalls = fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))
    // Explicit wins — auto-wire stands down.
    expect(runCalls[1].body.input_image).toBe("/gallery/explicit.png")
  })

  it("injects end_image from the second upstream (video FLF2V)", async () => {
    const stages: StageDescriptor[] = [
      { title: "First frame", kind: "generation", service: "flux-dev",
        params: { prompt: "start", seed: 1 } },
      { title: "Last frame", kind: "generation", service: "flux-dev",
        params: { prompt: "end", seed: 2 } },
      { title: "FLF2V", kind: "generation", service: "ltx-director-distilled",
        params: { num_frames: 96 }, inputIndices: [0, 1] },
    ]
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("first+last → video", stages))
    await useAgentFlowStore.getState().runAll()

    const runCalls = fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))
    const s0Url = useAgentFlowStore.getState().flow!.stages[0].result!.assetUrls[0]
    const s1Url = useAgentFlowStore.getState().flow!.stages[1].result!.assetUrls[0]
    // Stage 2 (video) gets input_image from stage 0 + end_image from stage 1.
    expect(runCalls[2].body.input_image).toBe(s0Url)
    expect(runCalls[2].body.end_image).toBe(s1Url)
  })

  it("standalone stage with no inputIndices gets no injection", async () => {
    const stages: StageDescriptor[] = [
      { title: "Generate", kind: "generation", service: "anima-base",
        params: { prompt: "solo", seed: 1 } },
    ]
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("standalone", stages))
    await useAgentFlowStore.getState().runAll()

    const runCalls = fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))
    expect(runCalls[0].body.input_image).toBeUndefined()
    expect(runCalls[0].body.reference_image).toBeUndefined()
    expect(runCalls[0].body.end_image).toBeUndefined()
  })
})

describe("flowStore — reorderStage (drag order = flow order)", () => {
  it("rewrites the array order and keeps ids + wiring intact", async () => {
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("chain", [
      { title: "Generate", kind: "generation", service: "anima-base", params: { prompt: "a" } },
      { title: "Upscale", kind: "generation", service: "seedvr2-ema-3b", params: {}, inputIndices: [0] },
      { title: "Detail", kind: "generation", service: "upscale", params: {}, inputIndices: [1] },
    ]))
    const ids = () => useAgentFlowStore.getState().flow!.stages.map((s) => s.id)
    const before = ids()
    // Drag the last card onto the first slot — arrayMove semantics (the
    // dnd-kit drop contract the grid's onReorder passes through).
    useAgentFlowStore.getState().reorderStage(before[2], before[0])
    expect(ids()).toEqual([before[2], before[0], before[1]])
    // Order = execution order — a reordered canvas runs differently, so
    // prior run results no longer correspond (same rule as removeStage).
    expect(useAgentFlowStore.getState().flow!.status).toBe("stale")
    // Wiring survives by id: Detail still consumes Upscale wherever it sits.
    const stages = useAgentFlowStore.getState().flow!.stages
    const detail = stages.find((s) => s.title === "Detail")!
    const upscale = stages.find((s) => s.title === "Upscale")!
    expect(detail.inputs).toEqual([upscale.id])
    expect(detail.cacheKey).not.toBeNull() // keys recomputed after reorder
  })

  it("same-position + unknown-id reorders are no-ops", async () => {
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("chain", [
      { title: "A", kind: "generation", service: "anima-base", params: { prompt: "a" } },
      { title: "B", kind: "generation", service: "anima-base", params: { prompt: "b" } },
    ]))
    const ids = () => useAgentFlowStore.getState().flow!.stages.map((s) => s.id)
    const before = [...ids()]
    useAgentFlowStore.getState().reorderStage(before[0], before[0])
    expect(ids()).toEqual(before)
    useAgentFlowStore.getState().reorderStage("does-not-exist", before[1])
    expect(ids()).toEqual(before)
    useAgentFlowStore.getState().reorderStage(before[1], "does-not-exist")
    expect(ids()).toEqual(before)
  })
})
