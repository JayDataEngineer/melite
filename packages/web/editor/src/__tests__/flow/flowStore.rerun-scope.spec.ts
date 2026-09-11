// Rerun-scope regression (2026-08-11): reRunFrom(stageId) must NOT sweep
// upstream never-run stages into the pass.
//
// Live bug (run p203e211e): a 2-card pipe [z-image "Create Image" (never
// run, EMPTY prompt), moss-sfx "Sound Effects" ('Wolves howling')]. The
// user clicked Run on the SFX card right after it completed — the card's
// Run action routes done cards to reRunFrom — and runAll executed the
// never-run upstream image card FIRST: empty prompt → instant
// "generate_image: prompt is required" error → chain broke → the SFX card
// the user actually clicked never executed.
//
// Fix: runAll(fromIndex) skips stages before the rerun point; reRunFrom
// passes the stage index. The top-level "Run all" button calls runAll()
// with no index → every stage executes, exactly as before.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import type { StageDescriptor } from "@melite/contracts"
import { makeDraft } from "@/__tests__/__fixtures__/backendDraft"

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
          return new Response(JSON.stringify({ draftId: "draft-test-rerun" }), {
            status: 200, headers: { "Content-Type": "application/json" },
          })
        }
        if (u.endsWith("/v1/flows/start")) {
      const idx = genIdx++
      return new Response(JSON.stringify({ run_id: `p-rerun-${idx}` }), {
        status: 200, headers: { "Content-Type": "application/json" },
      })
    }
    if (u.startsWith("/v1/flows/status/")) {
      return new Response(JSON.stringify({
        run_id: "rerun",
        status: "completed",
        stages: [{ id: "s0", name: "s0", index: 0, status: "completed", url: "data:audio/flac;base64,sfx" }],
      }), { status: 200, headers: { "Content-Type": "application/json" } })
    }
    return new Response(JSON.stringify({}), { status: 404 })
  }))
})

afterEach(() => { vi.unstubAllGlobals() })

describe("flowStore — reRunFrom rerun scope", () => {
  it("reRunFrom does NOT sweep upstream never-run stages into the pass", async () => {
    const stages: StageDescriptor[] = [
      { title: "Create Image", kind: "generation", service: "z-image",
        params: { prompt: "", seed: -1 } },
      { title: "Sound Effects", kind: "generation", service: "moss-sfx",
        params: { prompt: "Wolves howling", seed: 42 } },
    ]
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("sfx pipe", stages))
    const sfxId = useAgentFlowStore.getState().flow!.stages[1].id

    // 1) The user runs the SFX card — it is pending → direct stage run
    //    (the card's Run action routes pending cards to executeStage).
    await useAgentFlowStore.getState().executeStage(sfxId)
    expect(useAgentFlowStore.getState().flow!.stages[1].status).toBe("done")

    // 2) Fast rerun: the card is done, so Run routes to reRunFrom. The
    //    upstream image card is STILL pending with an empty prompt — it
    //    must NOT be swept into this pass (that sweep was the live bug).
    await useAgentFlowStore.getState().reRunFrom(sfxId)

    const runCalls = fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))
    // Two runs total: the original SFX run + the rerun. Never the image card.
    expect(runCalls).toHaveLength(2)
    expect(runCalls.every((c) => c.body.model === "moss-sfx")).toBe(true)
    expect(runCalls.every((c) => (c.body.prompt as string).includes("Wolves"))).toBe(true)

    const pipe = useAgentFlowStore.getState().flow!
    // The upstream card was never executed — status untouched.
    expect(pipe.stages[0].status).toBe("pending")
    expect(pipe.stages[1].status).toBe("done")
  })

  it("reRunFrom does not sweep upstream FAILED stages either", async () => {
    const stages: StageDescriptor[] = [
      { title: "Create Image", kind: "generation", service: "z-image",
        params: { prompt: "hi", seed: 1 } },
      { title: "Sound Effects", kind: "generation", service: "moss-sfx",
        params: { prompt: "Wolves", seed: 2 } },
    ]
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("failed upstream", stages))
    const pipe0 = useAgentFlowStore.getState().flow!
    const imageId = pipe0.stages[0].id
    const sfxId = pipe0.stages[1].id

    // Upstream image card FAILS (status error), then SFX completes.
    // The user then reruns the SFX card — the failed image card must stay
    // out of scope (the user can click it or Run all to retry it).
    await useAgentFlowStore.getState().executeStage(imageId)
    const pipe1 = useAgentFlowStore.getState().flow!
    // Mock never errors — force the error status like a real failure would.
    useAgentFlowStore.setState({
      flow: {
        ...pipe1,
        stages: pipe1.stages.map((s, i) =>
          i === 0 ? { ...s, status: "error" as const, error: "boom" } : s,
        ),
        status: "failed",
      },
    })
    await useAgentFlowStore.getState().executeStage(sfxId)
    expect(useAgentFlowStore.getState().flow!.stages[1].status).toBe("done")

    await useAgentFlowStore.getState().reRunFrom(sfxId)

    const runCalls = fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))
    // image run + sfx run + sfx rerun — image card never re-executed.
    expect(runCalls).toHaveLength(3)
    expect(runCalls[0].body.model).toBe("z-image")
    expect(runCalls[1].body.model).toBe("moss-sfx")
    expect(runCalls[2].body.model).toBe("moss-sfx")
    expect(useAgentFlowStore.getState().flow!.stages[0].status).toBe("error")
  })

  it("executeStage refuses a second run while one is in flight", async () => {
    // Deferred start response — the first run stays in-flight so a fast
    // second click can be exercised against live state.
    let release: (r: Response) => void = () => {}
    const gate = new Promise<Response>((res) => { release = res })
    const startCalls: Array<Record<string, unknown>> = []
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      const body = init?.body ? JSON.parse(init.body as string) : {}
          if (u.endsWith("/v1/flows/validate")) {
           // COMPILE-FIRST (pipe-carry retirement, 2026-09-05): every card
           // run compiles here before start — answer ok so these run-path
           // tests exercise the run, not the refusal (pinned separately).
           return new Response(JSON.stringify({ ok: true, card: true }), {
           status: 200, headers: { "Content-Type": "application/json" },
           })
          }
          // CARD BIRTH LAW (2026-09-06): compose-first — the run mints
          // its card here before start (the gate below holds the START,
          // not the compose).
          if (u.endsWith("/v1/flows/drafts")) {
            return new Response(JSON.stringify({ draftId: "draft-test-rerun-guard" }), {
              status: 200, headers: { "Content-Type": "application/json" },
            })
          }
          if (u.endsWith("/v1/flows/start")) {
        startCalls.push(body)
        return gate // hold the first run in flight
      }
      if (u.startsWith("/v1/flows/status/")) {
        return new Response(JSON.stringify({
          run_id: "p-guard-0",
          status: "completed",
          stages: [{ id: "s0", name: "s0", index: 0, status: "completed", url: "data:audio/flac;base64,sfx" }],
        }), { status: 200, headers: { "Content-Type": "application/json" } })
      }
      return new Response(JSON.stringify({}), { status: 404 })
    }))
    const stages: StageDescriptor[] = [
      { title: "Sound Effects", kind: "generation", service: "moss-sfx",
        params: { prompt: "Wolves", seed: 42 } },
    ]
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("single", stages))
    const sfxId = useAgentFlowStore.getState().flow!.stages[0].id

    // First click: run starts, held on the gate. Wait until it has crossed
    // the param-contract gate and reached the wire — the run yields on the
    // gate's dynamic import before the /start fetch, so asserting
    // immediately would race an unawaited run.
    const first = useAgentFlowStore.getState().executeStage(sfxId)
    await vi.waitFor(() => { expect(startCalls).toHaveLength(1) })
    // Second click lands while the first run is in flight — refused.
    await useAgentFlowStore.getState().executeStage(sfxId)
    expect(startCalls).toHaveLength(1)
    expect(useAgentFlowStore.getState().runningStageId).toBe(sfxId)

    // Release the gate — the single run completes normally.
    release(new Response(JSON.stringify({ run_id: "p-guard-0" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    }))
    await first
    expect(startCalls).toHaveLength(1)
    expect(useAgentFlowStore.getState().flow!.stages[0].status).toBe("done")
  })

  it("top-level runAll() (no index) still executes never-run upstream stages", async () => {
    const stages: StageDescriptor[] = [
      { title: "Create Image", kind: "generation", service: "z-image",
        params: { prompt: "hi", seed: 1 } },
      { title: "Sound Effects", kind: "generation", service: "moss-sfx",
        params: { prompt: "Wolves", seed: 2 } },
    ]
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("full pipe", stages))
    await useAgentFlowStore.getState().runAll()

    const runCalls = fetchCalls.filter((c) => c.url.endsWith("/v1/flows/start"))
    expect(runCalls).toHaveLength(2)
    expect(runCalls[0].body.model).toBe("z-image")
    expect(runCalls[1].body.model).toBe("moss-sfx")
    const pipe = useAgentFlowStore.getState().flow!
    expect(pipe.stages[0].status).toBe("done")
    expect(pipe.stages[1].status).toBe("done")
  })
})
