// flow-dependency-autorun — executeStage's dependency closure (2026-08-15).
//
// THE BUG: "When I start from the second card 'upscale', I get an error
// because I am using a previous action card's output. The system should be
// smart enough to run the dependency card if it has that dependency." A
// single-card Run whose upstream producers never executed compiled WITHOUT
// its input — collectUpstreamResults had no result to inject — and the
// boundary 400'd ("requires an input image but none was provided").
//
// Covered here (composer path — NOT chain-backed; a chain-backed card's
// single-step re-run encodes the dependency via start_from/reuse_run_id):
//   • the un-executed producer runs FIRST, in flow order; the clicked
//     card's compile then receives its output as input_image
//   • a FAILED dependency stops the pass — its card carries the error; the
//     clicked card is never compiled doomed
//   • a satisfied producer (done + servable result) is NOT re-run
//   • scope is the card's OWN closure: an unrelated pending card never runs
//   • chain-backed flows skip the auto-run entirely
import { afterEach, describe, expect, it, vi } from "vitest"
import type { FlowDoc, FlowStage, StageResult } from "@melite/contracts"
import type { FlowRunStatus } from "@melite/catalog"

vi.mock("@melite/catalog", async () => {
  const actual = await vi.importActual<typeof import("@melite/catalog")>("@melite/catalog")
  return {
    ...actual,
    pollFlowRun: vi.fn(),
  }
})

vi.mock("@/rpc/editorClient", async () => {
  const actual = await vi.importActual<typeof import("@/rpc/editorClient")>("@/rpc/editorClient")
  return {
    ...actual,
    // executeGeneration → runGeneration; executeInput → runGeneration
    // too (the input lane is a weightless native {model:"input"} card —
    // the retired startInlineDoc {flow:} door is gone with the
    // pipe-carry); the chain path → startChain + pollFlowRun (the store
    // imports the re-export, so the mock covers both call sites).
    editorClient: {
      ...actual.editorClient,
      runGeneration: vi.fn(),
      startChain: vi.fn(),
    },
    pollFlowRun: vi.fn(),
  }
})

import { useLibraryFlowStore } from "../surfaces/flow/flowStore"
import { editorClient } from "@/rpc/editorClient"
import { pollFlowRun } from "@melite/catalog"

const IN_URL = "/assets/runs/r_in/input.png"
const UP_URL = "/assets/runs/r_up/upscaled.png"

/** The input card's finished run — one brick, one servable artifact. */
const inputDone: FlowRunStatus = {
  run_id: "r_in",
  status: "completed",
  stages: [{ id: "0", name: "input", index: 0, status: "done", url: IN_URL }],
}

function inputCard(over: Partial<FlowStage> = {}): FlowStage {
  return {
    id: "s_in",
    title: "Input Prep",
    kind: "input",
    service: "input",
    params: { source: "data:image/png;base64,AAAA" },
    inputs: [],
    result: null,
    status: "pending",
    error: null,
    cacheKey: null,
    ...over,
  }
}

function upscaleCard(over: Partial<FlowStage> = {}): FlowStage {
  return {
    id: "s_up",
    title: "Upscale",
    kind: "generation",
    service: "seedvr2_ema",
    // input_image null-seeded — the slot the upstream wire fills.
    params: { resolution: 2048, input_image: null },
    inputs: ["s_in"],
    result: null,
    status: "pending",
    error: null,
    cacheKey: null,
    ...over,
  }
}

function seed(stages: FlowStage[], flowName?: string) {
  const doc: FlowDoc = {
    id: "p1",
    intent: "Image Ops",
    stages,
    status: "ready",
    createdAt: 0,
    completedAt: null,
    ...(flowName ? { flowName } : {}),
  }
  useLibraryFlowStore.setState({ flow: doc, runningStageId: null, _abort: null })
}

function mockHappyPaths() {
  // Both lanes ride runGeneration — route by the body's model.
  vi.mocked(editorClient.runGeneration).mockImplementation(async (body) => {
    const b = (body ?? {}) as Record<string, unknown>
    if (b.model === "input") {
      return { kind: "started", runId: "r_in", urls: [IN_URL], status: inputDone } as never
    }
    return {
      kind: "started",
      runId: "r_up",
      urls: [UP_URL],
      status: { run_id: "r_up", status: "completed", stages: [] },
    } as never
  })
  vi.mocked(pollFlowRun).mockResolvedValue(inputDone)
}

afterEach(() => {
  useLibraryFlowStore.setState({ flow: null, runningStageId: null, _abort: null })
  vi.clearAllMocks()
})

describe("executeStage — dependency auto-run (2026-08-15)", () => {
  it("runs the un-executed producer FIRST; the clicked card compiles with its output", async () => {
    mockHappyPaths()
    seed([inputCard(), upscaleCard()])

    await useLibraryFlowStore.getState().executeStage("s_up")

    // The input card ran — once — and BEFORE the upscale's generate call.
    expect(editorClient.runGeneration).toHaveBeenCalledTimes(2)
    const calls = vi.mocked(editorClient.runGeneration).mock.calls
    expect((calls[0][0] as Record<string, unknown>).model).toBe("input")
    expect((calls[1][0] as Record<string, unknown>).model).toBe("seedvr2_ema")

    // THE FIX: the producer's artifact reached the compile body — the exact
    // injection the missing-result 400 starved.
    const body = vi.mocked(editorClient.runGeneration).mock.calls[1][0] as Record<string, unknown>
    expect(body.input_image).toBe(IN_URL)
    expect(body.model).toBe("seedvr2_ema")

    // Both cards land done with results.
    const st = useLibraryFlowStore.getState().flow!.stages
    expect(st.find((s) => s.id === "s_in")?.status).toBe("done")
    expect(st.find((s) => s.id === "s_in")?.result?.assetUrls).toEqual([IN_URL])
    expect(st.find((s) => s.id === "s_up")?.status).toBe("done")
    expect(st.find((s) => s.id === "s_up")?.result?.assetUrls).toEqual([UP_URL])
  })

  it("a FAILED dependency stops the pass — the clicked card is never compiled doomed", async () => {
    mockHappyPaths()
    vi.mocked(editorClient.runGeneration).mockImplementationOnce(async () => {
      throw new Error("generate failed: HTTP 400: bad source")
    })
    seed([inputCard(), upscaleCard()])

    await useLibraryFlowStore.getState().executeStage("s_up")

    // The dependency's own card carries the error (fail loud, on ITS card).
    const st = useLibraryFlowStore.getState().flow!.stages
    const dep = st.find((s) => s.id === "s_in")!
    expect(dep.status).toBe("error")
    expect(dep.error).toContain("bad source")
    // The clicked card NEVER compiled — no doomed "requires an input image"
    // run; it stays untouched (pending), not error. The ONE runGeneration
    // call is the failed dependency itself.
    expect(editorClient.runGeneration).toHaveBeenCalledTimes(1)
    expect((vi.mocked(editorClient.runGeneration).mock.calls[0][0] as Record<string, unknown>).model).toBe("input")
    const up = st.find((s) => s.id === "s_up")!
    expect(up.status).toBe("pending")
    expect(up.error).toBeNull()
  })

  it("a SATISFIED producer (done + servable result) is not re-run", async () => {
    mockHappyPaths()
    const doneResult: StageResult = {
      assetUrls: ["/assets/runs/r_old/img.png"],
      artifacts: {},
      metadata: { runId: "r_old" },
      completedAt: 1,
      durationSec: 1,
    }
    seed([inputCard({ status: "done", result: doneResult }), upscaleCard()])

    await useLibraryFlowStore.getState().executeStage("s_up")

    expect(editorClient.runGeneration).toHaveBeenCalledTimes(1)
    // The EXISTING artifact is what the compile received.
    const body = vi.mocked(editorClient.runGeneration).mock.calls[0][0] as Record<string, unknown>
    expect(body.input_image).toBe("/assets/runs/r_old/img.png")
  })

  it("scope is the card's OWN closure — an unrelated pending card never runs", async () => {
    mockHappyPaths()
    const orphan: FlowStage = {
      id: "s_orphan",
      title: "Unrelated Sound",
      kind: "generation",
      service: "ace-step",
      params: { prompt: "boom" },
      inputs: [],
      result: null,
      status: "pending",
      error: null,
      cacheKey: null,
    }
    seed([inputCard(), orphan, upscaleCard()])

    await useLibraryFlowStore.getState().executeStage("s_up")

    // The closure ran the input producer only. The unrelated card —
    // pending, but not consumed by the clicked card — is a surprise-run
    // the 2026-08-11 rerun-scope rule forbids.
    expect(editorClient.runGeneration).toHaveBeenCalledTimes(2)
    const st = useLibraryFlowStore.getState().flow!.stages
    expect(st.find((s) => s.id === "s_orphan")?.status).toBe("pending")
  })

  it("chain-backed flows skip the auto-run (start_from/reuse encodes the dependency)", async () => {
    mockHappyPaths()
    vi.mocked(editorClient.startChain).mockResolvedValue({ runId: "r_chain" })
    // The chain run's protocol: brick 0 (the input card) never ran — the
    // YAML runner's start_from skipped it; brick 1 produced the artifact.
    vi.mocked(pollFlowRun).mockResolvedValue({
      run_id: "r_chain",
      status: "completed",
      stages: [
        { id: "0", name: "input", index: 0, status: "pending" },
        { id: "1", name: "seedvr2", index: 1, status: "done", url: UP_URL },
      ],
    })
    seed([inputCard(), upscaleCard()], "image_ops.yaml")

    await useLibraryFlowStore.getState().executeStage("s_up")

    expect(editorClient.runGeneration).not.toHaveBeenCalled()
    expect(editorClient.startChain).toHaveBeenCalledTimes(1)
    // The upstream input card was not executed — the YAML runner owns it.
    const st = useLibraryFlowStore.getState().flow!.stages
    expect(st.find((s) => s.id === "s_in")?.status).toBe("pending")
  })
})
