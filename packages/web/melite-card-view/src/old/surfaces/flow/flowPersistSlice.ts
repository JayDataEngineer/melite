// flowPersistSlice — loadRun / loadRunById / _finishChainRun (Cut 6
// file-size pivot). Method bodies verbatim from the origin
// flowStore.ts create call; the slice factory is the only seam.
// loadFlowSpec + saveChain retired 2026-09-05 with the yaml spec
// library (NO LEGACY — the /v1/flows/yaml/* family died with the
// format; a saved canvas is a DRAFT, a reusable flow is a py
// declaration).

import type { StoreApi } from "zustand"
import type { FlowState } from "./flowStoreTypes"
import { editorClient } from "@/rpc/editorClient"
import { useToastStore } from "@melite/ui"
import { useMediaVersion } from "../library/mediaVersion"
import type { FlowStatus, FlowStage } from "@melite/contracts"
import { computeCacheKey, hydrateRunStages, newFlowId } from "./flowStoreHelpers"
import { hydrateChainResults } from "./flowStoreRevive"

type PersistSlice = Pick<FlowState, "loadRun" | "loadRunById" | "_finishChainRun">

export const createPersistSlice = (
 set: StoreApi<FlowState>["setState"],
 get: () => FlowState,
): PersistSlice => ({
 loadRun: async (intent, status) => {
 // Same invariant as buildFlow: never replace a flow that's
 // actively executing. The user (or agent) can clear first.
 const current = get().flow
 const hasRunning = current && current.stages.some((s) => s.status === "running")
 if (hasRunning) {
 useToastStore.getState().addToast(
 "info",
 "Flow is executing — wait for it to finish or press Cancel before loading a run.",
 )
 return
 }
 // CLOBBER GUARD (2026-08-09): never silently replace a non-empty flow.
 // The wand icon ("Open as cards") on sidebar assets routes here via
 // loadRunById; without this guard, clicking it OBLITERATES the composed
 // flow with zero confirmation. The only exception is an empty canvas
 // (no flow or zero stages) — load freely.
 // WORDING (2026-08-10): the message intentionally does NOT say "not saved" —
 // storePersistence.ts mirrors the doc to localStorage on every change, so
 // claiming it's unsaved was both a lie and a dead end (there's no Save
 // button to click). The honest framing is REPLACEMENT, not saving.
 if (current && current.stages.length > 0) {
 const n = current.stages.length
 const ok = typeof window !== "undefined" &&
 window.confirm(
 `Replace the current flow (${n} card${n === 1 ? "" : "s"}) with this run?`,
 )
 if (!ok) return
 }
 const raw = status.stages ?? [] // FlowRunStage[] satisfies the loose protocol view structurally
 if (raw.length === 0) {
 useToastStore.getState().addToast("info", "Run has no stages — nothing to load.")
 return
 }
 // ONE WAY to revive a run (pipe-carry retirement, 2026-09-05):
 // the run's OWN records — the brick shapes the backend reports
 // (hydrateRunStages). The pipe-carry arm is retired WITH the wire:
 // no gateway ever stashed `pipe`/`stage_id`, `flow_doc` was never
 // emitted, so the `status.flow_doc` branch revived a shape no run
 // ever carried (its only "proof" was mocks of a fictional server).
 // The revive rail is the run registry + the draft door (draft_id).
 let stages: FlowStage[] = hydrateRunStages(raw, status)
 // Compute cacheKeys in stage order (topological — same as buildFlow).
 for (const s of stages) {
 const upstreamKeys = s.inputs.map((id) => stages.find((x) => x.id === id)?.cacheKey ?? null)
 s.cacheKey = await computeCacheKey(s.service, s.params, upstreamKeys)
 }
 const allDone = stages.every((s) => s.status === "done" || s.status === "cached")
 set({
 flow: {
 id: newFlowId(),
 intent,
 stages,
 status: allDone ? ("done" as FlowStatus) : ("ready" as FlowStatus),
 createdAt: Date.now(),
 completedAt: allDone ? Date.now() : null,
 },
 runningStageId: null,
 })
 useToastStore.getState().addToast("info", `Loaded run: ${stages.length} stage${stages.length === 1 ? "" : "s"}`)
 },

 loadRunById: async (runId, intent) => {
 try {
 const status = await editorClient.fetchRunStatus(runId)
 await get().loadRun(intent || runId, status)
 } catch (e) {
 useToastStore.getState().addToast(
 "error",
 `Failed to load run ${runId}: ${e instanceof Error ? e.message : String(e)}`,
 )
 }
 },

 _finishChainRun: async (status, runId, label) => {
 const p = get().flow
 if (!p) return
 const stages = hydrateChainResults(p, status)
 const allDone = stages.every((s) => s.status === "done" || s.status === "cached")
 set({
 flow: {
 ...p,
 stages,
 status: allDone ? ("done" as FlowStatus) : ("ready" as FlowStatus),
 completedAt: allDone ? Date.now() : null,
 flowRunId: runId,
 },
 runningStageId: null,
 _abort: null,
 })
 useToastStore.getState().addToast(
 allDone ? "success" : "info",
 allDone ? `${label} complete` : `${label} finished`,
 )
 // AUTOSAVE SIGNAL — same rationale as executeStage's bump: the chain
 // produced artifacts that every open media view should reflect now.
 if (allDone) useMediaVersion.getState().bump()
 },

})
