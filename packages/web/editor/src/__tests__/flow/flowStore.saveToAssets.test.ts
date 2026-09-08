// flowStore.saveToAssets.test.ts — the save-to-assets toggle (2026-08-12).
//
// The user's directive: "a toggle whether to save this to assets or not.
// That way, even if the image persists, it doesn't clog up the left
// sidebar." This pins the store half: setSaveToAssets flips the per-stage
// flag and immediately hides/unhides the current run's id in the
// hiddenRuns store (so the sidebar filter updates WITHOUT waiting for a
// re-run). The completion-path hook (executeStage → hideRun on done)
// is covered by the run-completion test below.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import { useHiddenRuns } from "@/surfaces/library/hiddenRuns"

beforeEach(() => {
 localStorage.clear()
 useHiddenRuns.getState().setHidden([])
 useAgentFlowStore.getState().clear()
 vi.stubGlobal("fetch", vi.fn(async (url: string) => {
 const u = String(url)
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
     return new Response(JSON.stringify({ draftId: "draft-test-save" }), {
     status: 200, headers: { "Content-Type": "application/json" },
     })
     }
     if (u.endsWith("/v1/flows/start")) {
 return new Response(JSON.stringify({ run_id: "p-test-0" }), {
 status: 200, headers: { "Content-Type": "application/json" },
 })
 }
 if (u.startsWith("/v1/flows/status/")) {
 return new Response(JSON.stringify({
 run_id: "p-test-0", status: "completed",
 stages: [{ id: "s0", name: "s0", index: 0, status: "completed",
 url: "data:image/png;base64,abc" }],
 }), { status: 200, headers: { "Content-Type": "application/json" } })
 }
 return new Response(JSON.stringify({}), { status: 404 })
 }))
})

afterEach(() => { vi.unstubAllGlobals() })

describe("flowStore.setSaveToAssets", () => {
 it("flips the per-stage saveToAssets flag to false", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("image")
 await s.addStage({ kind: "generation", service: "flux-dev",
 title: "Gen", params: { prompt: "hero" } })
 const stageId = useAgentFlowStore.getState().flow!.stages[0].id

 s.setSaveToAssets(stageId, false)
 expect(useAgentFlowStore.getState().flow!.stages[0].saveToAssets).toBe(false)
 })

 it("flips the per-stage saveToAssets flag back to true", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("image")
 await s.addStage({ kind: "generation", service: "flux-dev",
 title: "Gen", params: { prompt: "hero" } })
 const stageId = useAgentFlowStore.getState().flow!.stages[0].id

 s.setSaveToAssets(stageId, false)
 s.setSaveToAssets(stageId, true)
 expect(useAgentFlowStore.getState().flow!.stages[0].saveToAssets).toBe(true)
 })

 it("does NOT hide a run when toggled before the stage has run (no runId yet)", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("image")
 await s.addStage({ kind: "generation", service: "flux-dev",
 title: "Gen", params: { prompt: "hero" } })
 const stageId = useAgentFlowStore.getState().flow!.stages[0].id

 // Before running — no result, no runId. Toggling off just sets the flag.
 s.setSaveToAssets(stageId, false)
 expect(useHiddenRuns.getState().hiddenRunIds.size).toBe(0)
 })

 it("hides the run id immediately when toggled off AFTER a run completes", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("image")
 await s.addStage({ kind: "generation", service: "flux-dev",
 title: "Gen", params: { prompt: "hero" } })
 const stageId = useAgentFlowStore.getState().flow!.stages[0].id

 // Run the stage so it gets a result with a runId.
 await s.executeStage(stageId)
 const result = useAgentFlowStore.getState().flow!.stages[0].result
 expect(result).not.toBeNull()
 const runId = String(result!.metadata.runId ?? "")
 expect(runId).not.toBe("")

 // Toggle off — the run should be hidden immediately.
 s.setSaveToAssets(stageId, false)
 expect(useHiddenRuns.getState().isHidden(runId)).toBe(true)
 expect(useAgentFlowStore.getState().flow!.stages[0].saveToAssets).toBe(false)
 })

 it("unhides the run id when toggled back on", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("image")
 await s.addStage({ kind: "generation", service: "flux-dev",
 title: "Gen", params: { prompt: "hero" } })
 const stageId = useAgentFlowStore.getState().flow!.stages[0].id

 await s.executeStage(stageId)
 const runId = String(useAgentFlowStore.getState().flow!.stages[0].result!.metadata.runId ?? "")

 s.setSaveToAssets(stageId, false)
 expect(useHiddenRuns.getState().isHidden(runId)).toBe(true)

 s.setSaveToAssets(stageId, true)
 expect(useHiddenRuns.getState().isHidden(runId)).toBe(false)
 })

 it("newly-completed stages with saveToAssets===false are hidden from the sidebar", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("image")
 await s.addStage({ kind: "generation", service: "flux-dev",
 title: "Gen", params: { prompt: "hero" } })
 const stageId = useAgentFlowStore.getState().flow!.stages[0].id

 // Toggle OFF before running.
 s.setSaveToAssets(stageId, false)
 // Run — the completion path should add the runId to the hidden set.
 await s.executeStage(stageId)
 const runId = String(useAgentFlowStore.getState().flow!.stages[0].result!.metadata.runId ?? "")
 expect(runId).not.toBe("")
 expect(useHiddenRuns.getState().isHidden(runId)).toBe(true)
 })

 it("newly-completed stages with saveToAssets===true (default) are NOT hidden", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("image")
 await s.addStage({ kind: "generation", service: "flux-dev",
 title: "Gen", params: { prompt: "hero" } })
 const stageId = useAgentFlowStore.getState().flow!.stages[0].id

 // Default — saveToAssets is undefined (truthy → save to sidebar).
 await s.executeStage(stageId)
 const runId = String(useAgentFlowStore.getState().flow!.stages[0].result!.metadata.runId ?? "")
 expect(useHiddenRuns.getState().isHidden(runId)).toBe(false)
 })

 it("is a no-op for an unknown stage id (no crash, no state change)", async () => {
 const s = useAgentFlowStore.getState()
 await s.startFlow("image")
 const before = useAgentFlowStore.getState().flow
 s.setSaveToAssets("totally-fake-id", false)
 expect(useAgentFlowStore.getState().flow).toBe(before)
 })
})
