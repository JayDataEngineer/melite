// agent-flow-loadrun.test.tsx — the run-hydration action (task #74).
//
// "Click a flow → it populates the cards": loadRun maps the run
// protocol's stages (runner.get_run_status shape — {family_id, params,
// status, url, gallery, secs, error, outputs, consumes}) onto AgentStages:
//   • service from params.model ?? family_id (compile-path stages carry
//     `model` — the SAME route a card would use)
//   • results attached for done/cached/reused stages (artifact URLs)
//   • inputs wired via the run's declared inputs→outputs topology (consumes
//     is shared config — the 2026-08-08 wiring fix, flow-revive.test)
//   • cacheKeys computed like buildFlow — editing a hydrated card goes
//     stale, and downstream cards go stale with it (re-run re-executes only
//     the changed subtree)
//
// The REAL store + REAL sha256 path — no network: loadRun never calls the
// server, the status doc is passed in. Only sonner (toast) is mocked.
import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" }),
  // modelCatalog (pulled in via the editorClient import chain) imports
  // apiJson — provide a stub so the module graph loads cleanly.
  apiJson: vi.fn(),
}))

// Mock sonner so the real useToastStore works in jsdom.
vi.mock("sonner", () => {
  const fn = vi.fn()
  return {
    toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }),
  }
})

import { useAgentFlowStore } from "../surfaces/flow/flowStore"
import { makeDraft } from "@/__tests__/__fixtures__/backendDraft"
import type { FlowRunStatus } from "@melite/catalog"

beforeEach(() => {
  useAgentFlowStore.getState().clear()
})

/** A completed 2-stage run — one compile-path stage (carries `model` in
 *  params), one YAML-stage (falls back to family_id). Run-level status is
 *  "completed" (contracts.py RunStatusValue); "done" is STAGE-level. */
const DONE_RUN: FlowRunStatus = {
  run_id: "r_abc",
  status: "completed",
  stages: [
    {
      id: "generate_image_0",
      family_id: "generate_image",
      name: "generate_image",
      index: 0,
      title: "Generate",
      status: "done",
      params: { model: "krea-2", prompt: "hello", width: 1024 },
      url: "/runs/r_abc/img1.png",
      secs: 12.3,
    },
    {
      id: "video_generate_0",
      family_id: "video_generate",
      name: "video_generate",
      index: 1,
      title: "Make video",
      status: "done",
      params: { prompt: "clip" },
      gallery: [{ url: "/runs/r_abc/clip.mp4" }],
      secs: 55.0,
    },
  ],
}

describe("loadRun — click a flow → it populates the cards", () => {
  it("materializes stages with the card route, title, and result attached", async () => {
    await useAgentFlowStore.getState().loadRun("My flow", DONE_RUN)

    const flow = useAgentFlowStore.getState().flow
    expect(flow).not.toBeNull()
    expect(flow!.intent).toBe("My flow")
    expect(flow!.status).toBe("done") // all stages done
    expect(flow!.completedAt).not.toBeNull()
    expect(flow!.stages).toHaveLength(2)

    const [gen, video] = flow!.stages
    // Compile-path stage: service = params.model (the card route), title
    // from the protocol, result with the artifact URL + duration.
    expect(gen.service).toBe("krea-2")
    expect(gen.title).toBe("Generate")
    expect(gen.status).toBe("done")
    expect(gen.result?.assetUrls).toEqual(["/runs/r_abc/img1.png"])
    expect(gen.result?.durationSec).toBeCloseTo(12.3)
    expect(gen.result?.metadata.runId).toBe("r_abc")
    // YAML-stage: service = family_id fallback; gallery urls collected.
    expect(video.service).toBe("video_generate")
    expect(video.status).toBe("done")
    expect(video.result?.assetUrls).toEqual(["/runs/r_abc/clip.mp4"])
  })

  it("maps every server status onto the card vocabulary", async () => {
    const status: FlowRunStatus = {
      run_id: "r_statuses",
      status: "completed",
      stages: [
        { id: "s0", family_id: "f0", name: "s0", index: 0, title: "Cached", status: "cached", url: "/runs/a.png", secs: 1 },
        { id: "s1", family_id: "f1", name: "s1", index: 1, title: "Reused", status: "reused", url: "/runs/b.png", secs: 1 },
        { id: "s2", family_id: "f2", name: "s2", index: 2, title: "Skipped", status: "skipped" },
        { id: "s3", family_id: "f3", name: "s3", index: 3, title: "Running", status: "running" },
        { id: "s4", family_id: "f4", name: "s4", index: 4, title: "Failed", status: "error", error: "brick exploded" },
        { id: "s5", family_id: "f5", name: "s5", index: 5, title: "Pending", status: "pending" },
      ],
    }
    await useAgentFlowStore.getState().loadRun("statuses", status)

    const stages = useAgentFlowStore.getState().flow!.stages
    expect(stages.map((s) => s.status)).toEqual(["cached", "cached", "pending", "pending", "error", "pending"])
    // Cached/reused carry their artifacts; skipped/running/pending don't.
    expect(stages[0].result?.assetUrls).toEqual(["/runs/a.png"])
    expect(stages[1].result?.assetUrls).toEqual(["/runs/b.png"])
    expect(stages[2].result).toBeNull()
    expect(stages[3].result).toBeNull()
    expect(stages[5].result).toBeNull()
    // The error message survives onto the card.
    expect(stages[4].error).toBe("brick exploded")
  })

  it("wires cards via the run's declared inputs→outputs topology (2026-08-08)", async () => {
    const status: FlowRunStatus = {
      run_id: "r_wired",
      status: "completed",
      stages: [
        {
          id: "generate_image_0",
          family_id: "generate_image",
          name: "generate_image",
          index: 0,
          title: "Generate",
          status: "done",
          params: { model: "krea-2", prompt: "hero" },
          url: "/runs/r_wired/hero.png",
          outputs: ["hero.png"],
          secs: 10,
        },
        {
          id: "edit_image_0",
          family_id: "edit_image",
          name: "edit_image",
          index: 1,
          title: "Edit",
          status: "done",
          params: { model: "qwen-edit", prompt: "add cape" },
          url: "/runs/r_wired/hero_cape.png",
          // The run's DATA flow: stage 1's inputs reference stage 0's
          // output NAME — the canvas must wire card 2 to card 1 the same
          // way. consumes (absent here) is shared config, NOT data flow
          // (the 2026-08-08 save-system rework — see flow-revive.test).
          inputs: ["hero.png"],
          secs: 15,
        },
      ],
    }
    await useAgentFlowStore.getState().loadRun("wired", status)

    const stages = useAgentFlowStore.getState().flow!.stages
    expect(stages[1].inputs).toEqual([stages[0].id])
  })

  it("hydrated cards participate in cache invalidation — editing upstream goes stale downstream", async () => {
    // A WIRED run (stage 1 consumes stage 0's output) — only then is stage 1
    // downstream of stage 0 and its cacheKey hashes the upstream's.
    const status: FlowRunStatus = {
      run_id: "r_invalid",
      status: "completed",
      stages: [
        {
          id: "generate_image_0",
          family_id: "generate_image",
          name: "generate_image",
          index: 0,
          title: "Generate",
          status: "done",
          params: { model: "krea-2", prompt: "hero" },
          url: "/runs/r_invalid/hero.png",
          outputs: ["hero.png"],
          secs: 10,
        },
        {
          id: "edit_image_0",
          family_id: "edit_image",
          name: "edit_image",
          index: 1,
          title: "Edit",
          status: "done",
          params: { model: "qwen-edit", prompt: "add cape" },
          url: "/runs/r_invalid/hero_cape.png",
          // Data flow via inputs (consumes is shared config — 2026-08-08).
          inputs: ["hero.png"],
          secs: 15,
        },
      ],
    }
    await useAgentFlowStore.getState().loadRun("invalidate", status)
    const before = useAgentFlowStore.getState().flow!.stages
    expect(before[1].cacheKey).not.toBeNull()

    // Edit stage 0's prompt (the user tweaks the card). Downstream stage 1
    // must go stale — its cacheKey hashes the upstream's key.
    await useAgentFlowStore.getState().updateStageParams(before[0].id, { prompt: "hello world" })

    const after = useAgentFlowStore.getState().flow!.stages
    expect(after[0].status).toBe("stale")
    expect(after[1].status).toBe("stale")
    expect(after[1].cacheKey).not.toBe(before[1].cacheKey)
  })

  it("refuses to replace a flow that is actively executing", async () => {
    // Build + mark a stage running (the executing-state the guard reads).
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("running", [
      { title: "Generate", kind: "generation", service: "krea-2", params: { prompt: "x" } },
    ]))
    const runningId = useAgentFlowStore.getState().flow!.stages[0].id
    useAgentFlowStore.setState((s) => ({
      flow: s.flow
        ? { ...s.flow, stages: s.flow.stages.map((st) => (st.id === runningId ? { ...st, status: "running" } : st)) }
        : s.flow,
    }))

    await useAgentFlowStore.getState().loadRun("clobber", DONE_RUN)

    const flow = useAgentFlowStore.getState().flow
    expect(flow!.stages).toHaveLength(1)
    expect(flow!.stages[0].id).toBe(runningId) // untouched
  })

  it("no-ops on a run with zero stages", async () => {
    await useAgentFlowStore.getState().loadRun("empty", { run_id: "r0", status: "completed", stages: [] })
    expect(useAgentFlowStore.getState().flow).toBeNull()
  })
})
