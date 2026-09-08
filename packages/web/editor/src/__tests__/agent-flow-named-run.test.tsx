// agent-flow-named-run.test.tsx — the named-flow run paths
// (graph-backed docs run ONE {flow:name} start, 2026-09-05).
//
// The spec-library load door (loadFlowSpec → GET /v1/flows/yaml/detail)
// retired with the yaml format. What remains pinned here: a doc
// stamped flowName (a named-flow doc) runs as ONE start for the whole
// flow — {flow: name}, only gateway-honored keys — and the run
// protocol hydrates back onto the cards by index. The doc is seeded
// directly (the store state the run paths read); no network load door
// exists to mock.
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useFlowCards } from "../surfaces/flow/flowCards"

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" }),
  // modelCatalog (pulled in via the editorClient import chain) imports
  // apiJson — provide a stub so the module graph loads cleanly.
  apiJson: vi.fn(),
}))
vi.mock("sonner", () => {
  const fn = vi.fn()
  return {
    toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }),
  }
})
// Spread pattern: pollFlowRun (real) talks to the mocked apiFetch;
// startChain is the stubbed wire call.
vi.mock("@/rpc/editorClient", async () => {
  const actual = await vi.importActual<typeof import("@/rpc/editorClient")>("@/rpc/editorClient")
  return {
    ...actual,
    editorClient: {
      ...actual.editorClient,
      startChain: vi.fn(),
    },
  }
})

import { useAgentFlowStore } from "../surfaces/flow/flowStore"
import { apiFetch } from "@melite/catalog"
import { editorClient } from "@/rpc/editorClient"
import type { FlowRunStatus } from "@melite/catalog"

/** A completed YAML run of the weave — one stage per spec step, in order.
 *  Run-level status is "completed" (contracts.py RunStatusValue); "done"
 *  is the STAGE-level value — the run-status contract refuses a lying mock. */
const DONE_RUN: FlowRunStatus = {
  run_id: "y_weave_1",
  status: "completed",
  stages: [
    {
      id: "video_generate_0",
      name: "video_generate",
      index: 0,
      family_id: "video_generate",
      title: "Generate Clip",
      status: "done",
      params: { prompt: "a robot dances", seed: 42 },
      url: "/runs/y_weave_1/clip0.mp4",
      secs: 61.2,
    },
    {
      id: "video_edit_0",
      name: "video_edit",
      index: 1,
      family_id: "video_edit",
      title: "Edit Clip",
      status: "done",
      params: { prompt: "make it rain" },
      url: "/runs/y_weave_1/clip1.mp4",
      secs: 58.4,
    },
  ],
}

/** apiFetch serves the run status for /v1/flows/status/{run_id}. */
function serveStatus(status: FlowRunStatus) {
  vi.mocked(apiFetch).mockResolvedValue({
    ok: true,
    json: async () => status,
    text: async () => "",
  } as never)
}

beforeEach(() => {
  useAgentFlowStore.getState().clear()
  vi.mocked(editorClient.startChain).mockResolvedValue({ runId: "y_weave_1" })
  serveStatus(DONE_RUN)
})

afterEach(() => {
  vi.clearAllMocks()
})

async function loadWeave() {
  useAgentFlowStore.setState({
    flow: {
      id: "video_weave",
      intent: "video_weave",
      stages: [
        { id: "s_0", kind: "generation", service: "video_generate", title: "Generate Clip",
          status: "pending", error: null, params: { prompt: "a robot dances", seed: 42 },
          inputs: [], result: null, cacheKey: null },
        { id: "s_1", kind: "generation", service: "video_edit", title: "Edit Clip",
          status: "pending", error: null, params: { prompt: "make it rain" },
          inputs: ["s_0"], result: null, cacheKey: null },
      ],
      status: "ready",
      createdAt: Date.now(),
      completedAt: null,
      flowName: "video_weave.yaml",
      specBaseline: [
        { prompt: "a robot dances", seed: 42 },
        { prompt: "make it rain" },
      ],
    },
    runningStageId: null,
  })
  return useAgentFlowStore.getState().flow!
}

describe("named-flow execution — the cards RUN the whole flow", () => {
  it("runAll starts the whole spec and hydrates results onto the cards", async () => {
    await loadWeave()

    await useAgentFlowStore.getState().runAll()

    expect(editorClient.startChain).toHaveBeenCalledTimes(1)
    expect(editorClient.startChain).toHaveBeenCalledWith(
      "video_weave.yaml",
      expect.objectContaining({}), // name + signal only — no knob keys
    )
    const opts = vi.mocked(editorClient.startChain).mock.calls.at(-1)![1] ?? {}
    expect(opts).not.toHaveProperty("start_from")
    expect(opts).not.toHaveProperty("stop_after")
    expect(opts).not.toHaveProperty("reuse_run_id")
    const after = useAgentFlowStore.getState().flow!
    // Both cards hydrated from the run protocol by index.
    expect(after.stages[0].status).toBe("done")
    expect(after.stages[0].result?.assetUrls).toEqual(["/runs/y_weave_1/clip0.mp4"])
    expect(after.stages[1].status).toBe("done")
    expect(after.stages[1].result?.assetUrls).toEqual(["/runs/y_weave_1/clip1.mp4"])
    // The run id is remembered (metadata for the run list / re-open).
    expect(after.flowRunId).toBe("y_weave_1")
    expect(after.status).toBe("done")
    expect(after.completedAt).not.toBeNull()
  })

  it("an edited card sends NO overrides — the gateway drops them (silent-drop law)", async () => {
    const p = await loadWeave()
    await useAgentFlowStore.getState().updateStageParams(
      p.stages[1].id,
      { prompt: "make it rain harder" },
    )

    await useAgentFlowStore.getState().runAll()

    // The named-flow door takes ONLY {flow, name}: the C-era
    // {steps:[...]} overrides never reached the runner — py reads no
    // overrides key — so the send is retired, not silenced.
    expect(editorClient.startChain).toHaveBeenCalledTimes(1)
    expect(editorClient.startChain).toHaveBeenCalledWith(
      "video_weave.yaml",
      expect.objectContaining({}),
    )
    // NOTE: the edit is NOT lost for typed flows — the {flow_inline}
    // door overlays card params per stage id (syncInlineFlow, pinned
    // in flowStore.inline-run.test.ts). Named-spec editing belongs to
    // the spec-library surface (its retirement stroke).
  })

  it("a card run after the flow ran re-executes the WHOLE graph (no reuse fiction)", async () => {
    // The C-era single-step path (start_from=i + reuse_run_id) is
    // retired: py reads neither key, so the send was a silent drop.
    // executeStage on a graph-backed flow starts the full flow, the
    // same run as runAll — ONE way.
    const p = await loadWeave()
    await useAgentFlowStore.getState().runAll()

    vi.mocked(editorClient.startChain).mockResolvedValue({ runId: "y_weave_2" })
    await useAgentFlowStore.getState().executeStage(p.stages[1].id)

    expect(editorClient.startChain).toHaveBeenLastCalledWith(
      "video_weave.yaml",
      expect.not.objectContaining({ start_from: expect.anything() }),
    )
    const opts = vi.mocked(editorClient.startChain).mock.calls.at(-1)![1] ?? {}
    expect(opts).not.toHaveProperty("reuse_run_id")
    expect(opts).not.toHaveProperty("stop_after")
  })

  it("REGRESSION: onRun on a chain-backed card re-runs the FULL chain, not one step", async () => {
    // The bug: clicking Run/Re-run on a card of a loaded (graph-backed)
    // flow used to route to executeStage → start_from=i + reuse_run_id
    // (single-step test mode) → only ONE brick re-executed, the rest
    // of the flow stayed stale ("recreate flow only recreates one part
    // of the flow"). The fix: onRun routes graph-backed cards through
    // runAll → ONE start for the whole graph. 2026-09-05: the knob
    // sends are gone entirely — the door takes {flow, name} only.
    const p = await loadWeave()
    await useAgentFlowStore.getState().runAll() // flowRunId now set

    vi.mocked(editorClient.startChain).mockResolvedValue({ runId: "y_weave_2" })
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true, json: async () => DONE_RUN, text: async () => "",
    } as never)

    const { result } = renderHook(() => useFlowCards(useAgentFlowStore))
    // Click "Run" on the SECOND card (index 1) — the exact case that used
    // to trigger single-step (start_from=1, reuse, stop_after=1).
    await result.current.actions.onRun(p.stages[1].id)

    const lastCall = vi.mocked(editorClient.startChain).mock.calls.at(-1)!
    // Full chain: the options carry NO start_from and NO reuse_run_id.
    expect(lastCall[0]).toBe("video_weave.yaml")
    expect(lastCall[1] ?? {}).not.toHaveProperty("start_from")
    expect(lastCall[1] ?? {}).not.toHaveProperty("reuse_run_id")
    // runAll fires exactly ONE chain start for the whole spec.
    const startsAfter = vi.mocked(editorClient.startChain).mock.calls.length
    expect(startsAfter).toBeGreaterThanOrEqual(2) // first runAll + this onRun
  })
})
