// flowExecuteSlice — executeStage / runAll / reRunFrom / openInStudio /
// consumeStudioOpen / clear / cancelRun / setFlowThread (Cut 6 file-size
// pivot). Method bodies verbatim from the origin flowStore.ts create
// call; the slice factory is the only seam. Cross-slice calls go through
// get() exactly as before.

import type { StoreApi } from "zustand"
import type { FlowState } from "./flowStoreTypes"
import { editorClient } from "@/rpc/editorClient"
import { pollFlowRun, streamFlowEvents } from "@melite/catalog"
import { useToastStore } from "@melite/ui"
import { useMediaVersion } from "../library/mediaVersion"
import { useHiddenRuns } from "../library/hiddenRuns"
import { agentFlowKey, touchFlowIndex, evictOldestFlowSnapshots, writeLastCanvasThread } from "./flowThreadKeys"
import { enqueueResultPatch } from "./resultOutbox"
import type { FlowRunStatus, FlowRunStage } from "@melite/catalog"
import type { FlowDoc, FlowStatus, FlowStageStatus } from "@melite/contracts"

import { missingDependencyIds, serverStatusToLiveCard, executeGeneration, executeChain, executeInput, syncInlineFlow, resolveStageRunner } from "./flowStoreHelpers"
import { kindDef } from "@melite/slots"
// Kinds arrive via the kinds lane (GET /v1/kinds → pluginKinds' sync).
// Before it lands, kindDef() reads UNKNOWN — fail-safe: never
// executable, so a boot-race run cannot start.

function chainTick(
 get: () => FlowState,
 set: StoreApi<FlowState>["setState"],
): (status: FlowRunStatus) => void {
 return (status) => {
 const p = get().flow
 if (!p) return
 const brickStages = (status.stages ?? []) as FlowRunStage[]
 // Stamp the ACTIVE run id on every stage (2026-08-15): mid-run surfaces
 // (the studio's Stop button) need it BEFORE completion — metadata.runId
 // only exists after the run finishes, which left Stop unrenderable
 // mid-run. One run per chain execution; every brick belongs to it.
 const liveRunId = String(status.run_id ?? "")
 // Queue feedback (2026-08-14): while the RUN is queued, keep stages
 // as "queued" — the poll reports per-brick "pending" (nothing has
 // run yet) which would overwrite the "queued" card status and look
 // like the button did nothing.
 const runQueued = String(status.status ?? "") === "queued"
 set({
 flow: {
 ...p,
 stages: p.stages.map((s, i) => {
 const brick = brickStages[i]
 if (!brick) return s
 const bstatus = (brick as { status?: string }).status
 const prog = bstatus === "running" ? (brick.progress ?? null) : null
 const act = bstatus === "running" ? (brick.activity ?? null) : null
 // While the RUN is queued, preserve "queued" on pending bricks.
 if (runQueued && bstatus === "pending") {
 return { ...s, status: "queued" as FlowStageStatus, progress: null, activity: null, runId: liveRunId || s.runId }
 }
 // PROXY, NEVER DICTATE (2026-08-12): the card's status MIRRORS the
 // backend brick status on every tick. The optimistic "running" write
 // at run start is provisional; the first tick replaces it with what
 // the backend actually reports — a dead wire can no longer leave a
 // permanent fake "running".
 const cardSt = bstatus ? serverStatusToLiveCard(bstatus) : null
 return cardSt
 ? { ...s, status: cardSt, progress: prog, activity: act, runId: liveRunId || s.runId }
 : { ...s, progress: prog, activity: act, runId: liveRunId || s.runId }
 }),
 },
 })
 }
}

type ExecuteSlice = Pick<FlowState, "executeStage" | "runAll" | "reRunFrom" | "openInStudio" | "consumeStudioOpen" | "clear" | "cancelRun" | "setFlowThread">

export const createExecuteSlice = (
 set: StoreApi<FlowState>["setState"],
 get: () => FlowState,
): ExecuteSlice => ({
 executeStage: async (stageId) => {
 const { flow, runningStageId } = get()
 if (!flow) return
 if (runningStageId) {
 // One GPU run at a time (same policy as startFlow): a fast second
 // click while a run is in flight would start a SECOND concurrent run —
 // ComfyUI serializes them but the card would race two polls over the
 // same status. Refuse with a toast instead (2026-08-11: "click run too
 // fast on rerun makes an error" hardening).
 useToastStore.getState().addToast(
   "info",
   "A stage is already running — wait for it to finish or press Cancel.",
 )
 return
 }
 const stage = flow.stages.find((s) => s.id === stageId)
 if (!stage) return
 if (!kindDef(stage.kind).executable) {
 // Non-executable kinds (studio-link, body) don't auto-execute. studio-link waits for
 // the user to double-click and open the studio; body is a SOURCE of
 // identity (a sculpted character), not a GPU stage — its "result" is
 // the params themselves (coeffs + morphs), persisted on every edit.
 return
 }
 // COMPILE-TIME GUARD (2026-09-05): resolve the runner DECLARATIVELY
 // from the kind's `runner` flag and the stage's own `flowName` — no
 // hardcoded kind-name branches (the dispatcher's SSOT is
 // py/card_kinds.py). A refusal here is a clean toast, NOT a thrown
 // Error at run time — "this should be caught compile time".
 const resolution = resolveStageRunner(stage)
 if (resolution.runner === null) {
 useToastStore.getState().addToast("error", resolution.refusal)
 return
 }

 // Graph-backed flow (named spec OR agent-composed inline): the cards
 // ARE the graph's stages and the graph runs as ONE run — the server
 // wires the edges. Never the per-stage compile path here.
 const graphBacked = Boolean(flow.flowName || flow.inlineFlow)
 const idx = flow.stages.findIndex((s) => s.id === stageId)

 // ── DEPENDENCY AUTO-RUN (2026-08-15) ───────────────────────────────
 // Composer path only (chain-backed single-card runs reuse upstream
 // bricks via the YAML runner — start_from/reuse_run_id already encodes
 // the dependency). Run the card's un-executed producers FIRST so the
 // compile path receives their outputs via collectUpstreamResults; then
 // the clicked card executes. A failed dependency stops the pass — its
 // own card carries the error (fail loud, never a doomed downstream
 // compile). runAll is unaffected: its sequential pass executes stages
 // in order, so by the time a card runs its producers already have
 // results and the closure is empty.
 if (!graphBacked) {
  const depIds = missingDependencyIds(stageId, flow)
  for (const depId of depIds) {
   await get().executeStage(depId)
   const dep = get().flow?.stages.find((s) => s.id === depId)
   if (!get().flow || !dep || dep.status === "error") return
  }
 }

 const abort = new AbortController()
 set({ runningStageId: stageId, _abort: abort })

 // ── THE EVENTS STREAM (2026-09-02, the streaming restoration) ──────
 // The gateway's ws door (/v1/flows/events/<run_id>) pushes stage
 // flips + per-step progress the moment they happen; the 700ms poll
 // below remains the terminal authority (a dropped socket never loses
 // a run — streamFlowEvents silently degrades to poll-only).
 // The fold mirrors onTick's PROXY, NEVER DICTATE mapping: a stage
 // frame patches ONLY the fields it carries onto the stage whose
 // index matches (the bus carries the stage index).
 const openEvents = (runId: string, single: boolean) =>
  streamFlowEvents(runId, (frame) => {
   if (frame.type !== "stage" || typeof frame.index !== "number") return
   const p = get().flow
   if (!p) return
   const i = frame.index
   if (i < 0 || i >= p.stages.length) return
   const patch: Record<string, unknown> = { runId }
   if (frame.progress) patch.progress = frame.progress
   if (frame.activity !== undefined) patch.activity = frame.activity
   if (frame.error) patch.error = frame.error
   if (frame.status) {
    // single-card path: only brick 0 belongs to this card.
    if (!single || i === 0) {
     const cardSt = serverStatusToLiveCard(frame.status)
     if (cardSt) patch.status = cardSt
    }
   }
   set({
    flow: {
     ...p,
     stages: p.stages.map((st, si) => (si === i ? { ...st, ...patch } : st)),
    },
   })
  }, { signal: abort.signal })

 // Mark running: the single card (compile path) or this step + all
 // downstream (chain-backed — the whole executed portion hydrates).
 set({
 flow: {
 ...get().flow!,
 stages: get().flow!.stages.map((s, i) =>
 graphBacked
 ? flow.inlineFlow || i >= idx
 ? { ...s, status: "running", error: null }
 : s
 : s.id === stageId ? { ...s, status: "running", error: null } : s,
 ),
 status: "running",
 },
 })

 try {
 if (graphBacked) {
 // ONE WAY: a typed graph runs as ONE run — {flow_inline} body or
 // named {flow} door, same tick, same poll, same finish. No
 // partial-run knobs: the py gateway honors none of them on the
 // flow doors (the C-era start_from/reuse_run_id/stop_after/
 // overrides sends were silent drops — a typed flow is atomic), so
 // "re-run step 3" runs the whole graph. The inline arm overlays
 // the cards' current params onto the body (syncInlineFlow) so a
 // user edit is never silently dropped.
 const doc = get().flow!
 const { runId } = doc.inlineFlow
 ? await editorClient.startInlineFlow(
 syncInlineFlow(doc),
 {
 name: doc.name ?? doc.intent,
 draftId: doc.id,
 signal: abort.signal,
 },
 )
 : await editorClient.startChain(
 doc.flowName!,
 // The flow rename (2026-08-09): runs carry the name into the
 // sidecar + run list. Undefined when not authored → "" server-side.
 { name: doc.name ?? doc.intent, signal: abort.signal },
 )
 openEvents(runId, false)
 // Live KSampler step progress + WS activity: map each running
 // brick's {value, max} and {phase, ...} onto the card at the same
 // index (cards == bricks for graph-backed flows). intervalMs
 // 700 for a smooth per-card progress bar. The running-gate keeps
 // error-phase activity visible during the ~1s pre-flip window
 // (the WS error lands before the poll flips the brick to "error").
 const onTick = chainTick(get, set)
 const finalStatus = await pollFlowRun(runId, abort.signal, { intervalMs: 700, onTick })
 await get()._finishChainRun(finalStatus, runId, stage.title)
 } else {
 // Live step progress for the single executing card: the status
 // payload's first brick IS this card's brick.
 const onTick = (status: FlowRunStatus) => {
 const p = get().flow
 if (!p) return
 const brick = (status.stages ?? [])[0] as FlowRunStage | undefined
 // Same mid-run stamp as the chain path (2026-08-15) — the studio Stop
 // button reads stage.runId while the run is live.
 const liveRunId = String(status.run_id ?? "")
 const prog = brick?.progress ?? null
 const act = brick?.activity ?? null
 // PROXY, NEVER DICTATE (2026-08-12) — same mirror as the chain path:
 // the card's status follows what the backend reports for this brick.
 const bstatus = (brick as { status?: string } | undefined)?.status
 // Queue feedback (2026-08-14): same guard as the chain-backed path —
 // while the RUN is queued, bricks report "pending" which would
 // overwrite the card's "queued" status and look like no feedback.
 const runQueued = String(status.status ?? "") === "queued"
 if (runQueued) {
 set({
 flow: {
 ...p,
 stages: p.stages.map((s) =>
 s.id === stageId
 ? { ...s, status: "queued" as FlowStageStatus, progress: null, activity: null, runId: liveRunId || s.runId }
 : s,
 ),
 },
 })
 return
 }
 const cardSt = bstatus ? serverStatusToLiveCard(bstatus) : null
 set({
 flow: {
 ...p,
 stages: p.stages.map((s) =>
 s.id === stageId
 ? cardSt
 ? { ...s, status: cardSt, progress: prog, activity: act, runId: liveRunId || s.runId }
 : { ...s, progress: prog, activity: act, runId: liveRunId || s.runId }
 : s,
 ),
 },
 })
 }
 const onStreamStart = (runId: string) => openEvents(runId, true)
 const result = resolution.runner === "generation"
 ? await executeGeneration(stage, get().flow!, abort.signal, onTick, onStreamStart)
 : resolution.runner === "input"
 ? await executeInput(stage, get().flow!, abort.signal, onTick, onStreamStart)
 : await executeChain(stage, abort.signal, onTick, onStreamStart)
 const before = get().flow!
 set({
 flow: {
 ...before,
 stages: before.stages.map((s) =>
 s.id === stageId
 ? { ...s, status: "done", result, error: null, progress: null, activity: null }
 : s,
 ),
 },
 runningStageId: null,
 _abort: null,
 })
 useToastStore.getState().addToast("success", `${stage.title} complete (${result.durationSec.toFixed(1)}s)`)

 // PERSIST RESULT TO DRAFT — the generated image must survive history
 // restore. PATCH the slim result to the backend draft so hydrateDraft
 // recovers it when the conversation is reopened (even without a
 // localStorage snapshot — quota miss, pre-feature, different machine).
 //
 // DURABLE OUTBOX (2026-08-14): this used to be `void fetch(...).catch(() => {})`
 // — fire-and-forget. A tab closed before the PATCH landed meant the
 // output NEVER persisted server-side, and reopening the thread lost the
 // card preview forever. enqueueResultPatch queues the PATCH in
 // localStorage FIRST (deduped per draft:stage), then delivers; failures
 // retry on a 30s ticker and at boot. Never blocks or breaks the run.
 enqueueResultPatch(before.id, stageId, {
  result: {
    assetUrls: result.assetUrls,
    artifacts: result.artifacts,
    metadata: { runId: String(result.metadata?.runId ?? result.metadata?.flowRunId ?? "") },
    completedAt: result.completedAt,
    durationSec: result.durationSec,
  },
  runStatus: "done",
 })
 // AUTOSAVE SIGNAL (2026-08-08: "NOR DOES TEH FINAL IMAGE
 // AUTOSAVE"). The server already persisted the artifacts to disk
 // (runs/ dir + _flow.json); this bump tells every open media
 // view (AppSidebar, AssetPreviewDialog, CopilotActions) to
 // re-fetch listMedia() so the new image
 // appears WITHOUT a manual sidebar toggle. Without this, the user
 // generates an image, sees it on the card, but the library shows
 // nothing — looks unsaved even though the server has it.
 useMediaVersion.getState().bump()
 // SAVE-TO-ASSETS GATE (2026-08-12): if the user opted this card
 // OUT of the sidebar, hide the just-produced runId immediately so
 // the bump above re-fetches but the hiddenRuns filter keeps the
 // sidebar clean. The flag lives on the stage; the hide is best-
 // effort (the runId may not be present on every result shape).
 if (stage.saveToAssets === false) {
 const newRunId = String(result.metadata?.runId ?? result.metadata?.id ?? "")
 if (newRunId) useHiddenRuns.getState().hideRun(newRunId)
 }
 }
 } catch (e) {
 if (e instanceof DOMException && e.name === "AbortError") {
 // Cancelled — mark pending, not errored.
 set({
 flow: {
 ...get().flow!,
 stages: get().flow!.stages.map((s, i) =>
 graphBacked
 ? flow.inlineFlow || i >= idx ? { ...s, status: "pending" } : s
 : s.id === stageId ? { ...s, status: "pending" } : s,
 ),
 },
 runningStageId: null,
 _abort: null,
 })
 return
 }
 const msg = e instanceof Error ? e.message : String(e)
 set({
 flow: {
 ...get().flow!,
 stages: get().flow!.stages.map((s, i) =>
 graphBacked
 ? flow.inlineFlow || i >= idx ? { ...s, status: "error", error: msg } : s
 : s.id === stageId ? { ...s, status: "error", error: msg } : s,
 ),
 status: "failed",
 },
 runningStageId: null,
 _abort: null,
 })
 // Toast = short alert; the FULL error lives on the card's error
 // line (hover tooltip) and in the drilldown modal. A multi-KB
 // backend error body (validation reports) must not render as a
 // tall auto-dismissing toast.
 const toastMsg =
 msg.length > 300 ? `${msg.slice(0, 300)}… (full error on the card)` : msg
 useToastStore.getState().addToast("error", `${stage.title} failed: ${toastMsg}`)
 }
 },

 

 runAll: async (fromIndex?: number) => {
 const { flow } = get()
 if (!flow) return
 if (flow.flowName || flow.inlineFlow) {
 // Graph-backed flow (named spec OR agent-composed inline): run the
 // WHOLE graph as ONE run. The run protocol hydrates back onto the
 // cards (cards == bricks). The inline body carries the cards'
 // current params (syncInlineFlow) — user edits are never dropped.
 const abort = new AbortController()
 set({ _abort: abort, runningStageId: null })
 set({
 flow: {
 ...get().flow!,
 stages: get().flow!.stages.map((s) => ({
 ...s, status: "running" as FlowStageStatus, error: null as string | null,
 })),
 status: "running",
 },
 })
 try {
 const doc = get().flow!
 const { runId, queued: startedQueued } = doc.inlineFlow
 ? await editorClient.startInlineFlow(
 syncInlineFlow(doc),
 // The flow rename (2026-08-09): runs carry the name. draft_id
 // links the run to THIS card surface's draft (sidecar linkage).
 { signal: abort.signal, name: doc.name ?? doc.intent, draftId: doc.id },
 )
 : await editorClient.startChain(
 doc.flowName!,
 // The flow rename (2026-08-09): runs carry the name. No
 // overrides — the gateway drops them (silent-drop class).
 { signal: abort.signal, name: doc.name ?? doc.intent },
 )
 // Queue feedback (2026-08-14): if the run was QUEUED (another run is
 // active on the GPU), show "Queued…" on every card instead of letting
 // the first poll tick overwrite the optimistic "running" with "pending"
 // (which looked like the button did nothing).
 if (startedQueued) {
 set({
 flow: {
 ...get().flow!,
 stages: get().flow!.stages.map((s) => ({
 ...s, status: "queued" as FlowStageStatus, error: null as string | null,
 })),
 status: "queued",
 },
 })
 }
 // Live KSampler step progress + WS activity: map each running
 // brick's {value, max} and {phase, ...} onto the card at the same
 // index. The chain runs bricks in order, so at any moment exactly
 // one card carries a non-null progress and its bar drains as the
 // sampler steps forward (2026-08-08).
 const onTick = chainTick(get, set)
 const finalStatus = await pollFlowRun(runId, abort.signal, { intervalMs: 700, onTick })
 await get()._finishChainRun(finalStatus, runId, "Flow")
 } catch (e) {
 if (e instanceof DOMException && e.name === "AbortError") {
 set({
 flow: {
 ...get().flow!,
 stages: get().flow!.stages.map((s) => ({ ...s, status: "pending" as FlowStageStatus })),
 },
 _abort: null,
 })
 return
 }
 const msg = e instanceof Error ? e.message : String(e)
 set({
 flow: {
 ...get().flow!,
 stages: get().flow!.stages.map((s) => ({ ...s, status: "error" as FlowStageStatus, error: msg })),
 status: "failed",
 },
 _abort: null,
 })
 useToastStore.getState().addToast("error", `Flow failed: ${msg}`)
 }
 return
 }
 // Execute stages in order. Skip studio-link + body stages (no GPU work —
 // they wait for the user / hold identity params). Skip stages already
 // "done" with matching cacheKeys (cache hit).
 //
 // RERUN SCOPE (2026-08-11): a pass started by reRunFrom(fromIndex=N)
 // must NOT sweep in upstream never-run stages. The user clicks Run on a
 // mid-pipe card that is done → reRunFrom → this loop. Upstream stages
 // that are still "pending"/"error" are out of scope for that intent —
 // executing them first is a SURPRISE run (e.g. a never-run image card
 // with an empty prompt fails instantly and the card the user actually
 // clicked never executes — the "rerun the sound effects → error" bug).
 // The top-level "Run all" button calls runAll() with no index → every
 // stage executes, exactly as before.
 for (let i = 0; i < flow.stages.length; i++) {
 const stage = flow.stages[i]
 if (!kindDef(stage.kind).executable) continue
 if (fromIndex !== undefined && i < fromIndex) continue
 if (stage.status === "done") continue
 await get().executeStage(stage.id)
 // If a stage failed, stop the chain.
 const cur = get().flow?.stages.find((s) => s.id === stage.id)
 if (cur?.status === "error") break
 }
 // Mark the pass complete (2026-08-22: adding cards MID-PASS is allowed
 // now, so "pending" no longer means "not finished" — a stage appended while
 // this pass ran stays pending and is run EXPLICITLY by the user; it was
 // never in this pass's snapshot). Pending-tolerant close: the flow
 // returns to "ready" when appended stages remain, "done" otherwise.
 const done = get().flow!
 const passComplete = done.stages.every(
 (s) => !kindDef(s.kind).executable || s.status === "done" || s.status === "pending",
 )
 if (passComplete) {
 const allDone = done.stages.every(
 (s) => !kindDef(s.kind).executable || s.status === "done",
 )
 set({ flow: { ...done, status: allDone ? "done" : "ready", completedAt: allDone ? Date.now() : done.completedAt } })
 if (allDone) useToastStore.getState().addToast("success", "Flow complete")
 }
 },

 reRunFrom: async (stageId) => {
 const { flow } = get()
 if (!flow) return
 // Find the stage index. Mark it + all downstream as "pending" so runAll
 // re-executes them. Upstream "done" stages are skipped (cache hit).
 const idx = flow.stages.findIndex((s) => s.id === stageId)
 if (idx < 0) return
 const stages = flow.stages.map((s, i) => {
 if (i < idx) return s // upstream — keep as-is (cache hit if done)
 // Mark downstream as pending so runAll re-executes them.
 return { ...s, status: "pending" as FlowStageStatus, result: null }
 })
 set({ flow: { ...flow, stages, status: "ready" } })
 // Pass the rerun point so runAll skips upstream stages — including
 // never-run (pending) and failed (error) cards. Their statuses are
 // untouched: "re-run from X" never executes stages before X (2026-08-11).
 await get().runAll(idx)
 },

 openInStudio: (stageId) => {
 const { flow } = get()
 if (!flow) return null
 const stage = flow.stages.find((s) => s.id === stageId)
 if (!stage || !kindDef(stage.kind).opensStudio || !stage.studio) return null
 // Emit the studio-open event. WorkspaceLayout subscribes to
 // studioOpenTrigger and handles the tab switch + context load.
 set({
 studioOpenTrigger: get().studioOpenTrigger + 1,
 pendingStudio: { target: stage.studio, context: stage.studioContext },
 })
 return stage.studio
 },

 consumeStudioOpen: () => set({ pendingStudio: null }),

 clear: () => {
 get()._abort?.abort()
 set({ flow: null, runningStageId: null, _abort: null })
 },

 cancelRun: () => {
 const { flow, _abort } = get()
 // Arm 1: stop the live server run(s) through the queue's stop door.
 // POST /v1/flows/stop/{run_id} reaches INTO the render (the py
 // successor of the retired /v1/comfyui/interrupt direct door —
 // that door died with the C gateway and this fetch 404'd).
 // Fire-and-forget with a loud log on failure — the local abort
 // below still unsticks the frontend.
 const live = [...new Set(
   (flow?.stages ?? []).map((s) => s.runId).filter(Boolean),
 )] as string[]
 for (const runId of live) {
   editorClient.stopRun(runId).then((r) => {
     if (r && typeof r === "object" && "error" in r) {
       console.warn(`[cancelRun] stop door refused ${runId}:`,
         (r as { error: unknown }).error)
     }
   }).catch((e) => {
     console.warn("[cancelRun] stop request failed:", e)
   })
 }
 // Arm 2: let the in-flight run reject → its catch marks stages pending.
 _abort?.abort()
 // Arm 3: force-resolve any remaining "running" stages. Covers BOTH the
 // rehydrated phantom (no _abort survived a reload — nothing else would
 // ever clear it) and the moment between abort() and the fetch's
 // rejection. Never a silent "done": pending means "did not finish".
 const stuck = flow?.stages.some((s) => s.status === "running")
 if (stuck) {
   console.warn(
     "[cancelRun] forcing stuck 'running' stage(s) to pending — " +
       (_abort ? "run aborted" : "no live run was tracked (reload/phantom)"),
   )
   set({
     flow: {
       ...flow!,
       stages: flow!.stages.map((s) =>
         s.status === "running"
           ? { ...s, status: "pending" as FlowStageStatus }
           : s,
       ),
       status: flow!.status === "running" ? ("ready" as FlowStatus) : flow!.status,
     },
     runningStageId: null,
   })
 }
 useToastStore.getState().addToast("info", "Run cancelled")
 },

 setFlowThread: (tid) => {
 const { flow, threadId } = get()
 if (tid === threadId) return
 if (tid !== null && threadId === null && flow) {
 // The unnamed default chat just received its mirrored id. The flow
 // was built under the null-thread (legacy) key — MOVE it to the
 // thread's key so a reload of THIS conversation restores it. Safe
 // without an origin stamp: at reload the store starts EMPTY (no
 // module-eval seed), so `threadId null + flow present` can only
 // mean "built this session on the default chat".
 try {
 // NEVER persist ComfyUI's live status (directive 2026-08-12; see
 // storePersistence.stripLiveStatus — importing it here would cycle
 // module eval). A moved doc mid-run must not mint a phantom
 // "running" for the next reload: stage running→pending (did not
 // finish), run-level running→ready. Terminal statuses persist.
 const persisted =
 flow.status === "running" || flow.stages.some((s) => s.status === "running")
 ? {
 ...flow,
 status: flow.status === "running" ? "ready" : flow.status,
 stages: flow.stages.map((s) =>
 s.status === "running" ? { ...s, status: "pending" as FlowStageStatus } : s,
 ),
 }
 : flow
 localStorage.setItem(agentFlowKey(tid), JSON.stringify(persisted))
 // LRU bookkeeping (2026-08-14): the move counts as a write; the cap
 // (oldest snapshots beyond MAX_THREAD_SNAPSHOTS) never evicts THIS key.
 touchFlowIndex(tid)
 evictOldestFlowSnapshots(tid)
 } catch {
 // Quota / storage disabled — the in-memory doc still wins below.
 }
 }
 // Swap the store to the target thread's snapshot. null thread = a fresh
 // chat: NO resurrection — the store clears.
 const next =
 tid === null
 ? null
 : (() => {
 try {
 const raw = localStorage.getItem(agentFlowKey(tid))
 if (!raw) return null
 const parsed = JSON.parse(raw) as FlowDoc
       if (!parsed || typeof parsed !== "object") return null
       // RELOAD-PHANTOM SANITIZE (2026-08-12): a persisted doc can carry
       // stages stuck at "running" — but a reload killed the poll that
       // would have resolved them (no AbortController survives a page
       // load, and nothing re-attaches to the old run). Keeping the
       // status would lock every load/build gate on a run that is not
       // happening — "frontend says running, ComfyUI isn't". Coerce to
       // pending and SAY SO loudly: the truthful state is "did not
       // finish", not "in flight".
       const phantom = parsed.stages?.some((s) => s.status === "running")
       if (phantom) {
         console.warn(
           "[flowStore] rehydrated doc has stuck 'running' stage(s) with no live run — marked pending",
         )
         useToastStore.getState().addToast(
           "info",
           "A previous run's tracking was lost (page reload) — stages marked pending. Re-run to execute.",
         )
         return {
           ...parsed,
           stages: parsed.stages.map((s) =>
             s.status === "running"
               ? { ...s, status: "pending" as FlowStageStatus }
               : s,
           ),
         }
       }
       return parsed
 } catch {
 return null
 }
 })()
 set({ threadId: tid, flow: next })
 // LAST-CANVAS THREAD (2026-08-15): record which conversation's canvas is
 // live — the boot restore (storePersistence) reads this to bring the
 // exact doc back on refresh, Library tab included. Written on
 // every thread change including the MOVE above (the doc follows the
 // thread; the pointer follows the doc).
 writeLastCanvasThread(tid)
 },

})
