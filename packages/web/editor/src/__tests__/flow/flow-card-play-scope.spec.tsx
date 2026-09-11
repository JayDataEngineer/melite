// CARD PLAY SCOPE (2026-08-18: "WHEN I ZOOM IN ON A CARD AND IT PLAY… IT
// SHOULD ONLY RUN WHAT IS NECESSARY FOR THAT CARD! IT SHOULDN'T GO
// FORWARDS!!!") — a card's play button (tile OR zoomed detail — both go
// through useFlowCards' actions.onRun) runs EXACTLY that card:
//   • upstream: executeStage's DEPENDENCY AUTO-RUN covers the necessary
//     half — un-executed producers run first; done upstreams feed via
//     collectUpstreamResults;
//   • downstream: NEVER auto-run. The old done/stale → reRunFrom(id)
//     marked the clicked card AND EVERY downstream stage pending and
//     re-executed the lot — zoom + play on a mid-pipe card silently
//     re-ran the whole tail. Downstream is only MARKED stale (cacheKey
//     recompute); re-running the tail is the canvas header's deliberate
//     Run (reRunFrom from the first stage).
//
// Protocol mirrors flowStore.slot-wiring.spec.ts: POST
// /v1/flows/start → {run_id} → poll /status/{run_id}; the mock embeds
// the per-run index so call counts are provable.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import { useFlowCards } from "@/surfaces/flow/flowCards"

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
          return new Response(JSON.stringify({ draftId: "draft-test-play-scope" }), {
            status: 200, headers: { "Content-Type": "application/json" },
          })
        }
        if (u.endsWith("/v1/flows/start")) {
      const idx = genIdx++
      return new Response(JSON.stringify({ run_id: `p-test-${idx}` }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    }
    if (u.startsWith("/v1/flows/status/")) {
      const stage = Number((u.split("/").pop() ?? "").replace("p-test-", ""))
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

const genCalls = () => fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))

describe("card play scope — the card, never the tail", () => {
  it("playing a DONE mid-pipe card re-runs ONLY that card (no forward cascade)", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("video")
    await s.addStage({ kind: "generation", service: "flux-dev", title: "Gen", params: { prompt: "a" } })
    await s.addStage({ kind: "generation", service: "flux-dev", title: "Edit", params: { prompt: "b" } })
    await s.addStage({ kind: "generation", service: "flux-dev", title: "Upscale", params: { prompt: "c" } })
    const stages = useAgentFlowStore.getState().flow!.stages
    const mid = stages[1].id, tail = stages[2].id

    // Full pass: all three done (3 starts).
    await useAgentFlowStore.getState().runAll()
    expect(genCalls()).toHaveLength(3)
    expect(useAgentFlowStore.getState().flow!.stages.map((x) => x.status))
      .toEqual(["done", "done", "done"])

    // Play the MIDDLE card (tile play + zoomed Run share actions.onRun).
    const { result } = renderHook(() => useFlowCards(useAgentFlowStore))
    result.current.actions.onRun(mid)

    // Exactly ONE more start — the middle card. Pre-fix this was TWO
    // (reRunFrom re-executed mid + tail): the forward cascade.
    await waitFor(() => {
      const calls = genCalls()
      expect(calls).toHaveLength(4)
      // The played card's identity rides the body as `model` (flux-dev) —
      // the stage_id stowaway died with the pipe-carry (2026-09-05); the
      // proof it ran is the start count + the model's prompt.
      expect(calls[3].body.model).toBe("flux-dev")
      expect(calls[3].body.prompt).toBe("b")
    })

    // No further starts fire (the tail never runs; nothing cascades).
    await new Promise((r) => setTimeout(r, 120))
    expect(genCalls()).toHaveLength(4)

    // The upstream was NOT re-executed…
    const now = useAgentFlowStore.getState().flow!.stages
    expect(now[0].status).toBe("done")
    // …and the tail was not re-run (stale/done is the cacheKey story —
    // the proof it did not execute is the start count above).
    expect(now[2].id).toBe(tail)
  })

  it("playing a STALE card runs the card, not the tail", async () => {
    const s = useAgentFlowStore.getState()
    await s.startFlow("video")
    await s.addStage({ kind: "generation", service: "flux-dev", title: "Gen", params: { prompt: "a" } })
    await s.addStage({ kind: "generation", service: "flux-dev", title: "Edit", params: { prompt: "b" } })
    const stages = useAgentFlowStore.getState().flow!.stages
    const mid = stages[1].id
    await useAgentFlowStore.getState().runAll()
    expect(genCalls()).toHaveLength(2)

    // A param edit marks the card + downstream stale.
    await useAgentFlowStore.getState().updateStageParams(mid, { prompt: "edited" })
    const st = useAgentFlowStore.getState().flow!.stages.map((x) => x.status)
    expect(st[1]).toBe("stale")

    const { result } = renderHook(() => useFlowCards(useAgentFlowStore))
    result.current.actions.onRun(mid)
    await waitFor(() => {
      const calls = genCalls()
      expect(calls).toHaveLength(3)
      // The re-run card's identity rides `model`, not the retired
      // stage_id stowaway (pipe-carry retirement, 2026-09-05) — and the
      // edited prompt proves the CURRENT params rode the body.
      expect(calls[2].body.model).toBe("flux-dev")
      expect(calls[2].body.prompt).toBe("edited")
    })
    await new Promise((r) => setTimeout(r, 120))
    expect(genCalls()).toHaveLength(3)
  })
})
