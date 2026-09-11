// flowStore.activity.spec.tsx — the WS activity onTick mapping (2026-08-10).
//
// The backend's protocol sink streams live ComfyUI frames (model load,
// sampling steps, executed nodes, errors) as `activity` envelopes on the
// run-status poll. runAll's chain-backed onTick maps each RUNNING brick's
// envelope onto the card at the SAME INDEX (cards == bricks), gated on the
// brick's status: a non-running brick's activity is never mapped (a stale
// frame must not paint a queued card).
//
// The REAL store + REAL pollFlowRun — only the network (editorClient
// wire calls + apiFetch) is mocked, exactly like agent-flow-loadspec.
// The capture reads the store state on each STATUS FETCH, which runs after
// the PREVIOUS tick's onTick applied (pollFlowRun: fetch → onTick →
// sleep → fetch) — so each capture holds the state that tick left behind.
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { useAgentFlowStore } from "../../surfaces/flow/flowStore"
import { apiFetch } from "@melite/catalog"
import { editorClient } from "@/rpc/editorClient"
import type { FlowRunStatus } from "@melite/catalog"

vi.mock("@melite/catalog/api", () => ({
 apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" }),
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


const brick = (over: Record<string, unknown>) => ({
 id: "video_generate_0",
 // The status-channel contract core (2026-08-11): every stage carries
 // id/name/index/status on the real wire (runner.get_run_status) — the
 // mock must too, or the contract refuses it.
 name: "video_generate",
 index: 0,
 family_id: "video_generate",
 title: "Gen",
 status: "running",
 params: { prompt: "a robot dances" },
 ...over,
})

/** Model-load window: the checkpoint loader's executing frame classified
 * "loading" (node_class lookup from the submitted workflow). */
const TICK_LOADING: FlowRunStatus = {
 run_id: "one_1",
 status: "running",
 stages: [
 brick({
 progress: { value: 3, max: 20, node: "1" },
 activity: { phase: "loading", node: "1", node_class: "CheckpointLoaderSimple" },
 }),
 ],
}

/** Sampling window: a KSampler step frame (value/max + the envelope). */
const TICK_SAMPLING: FlowRunStatus = {
 run_id: "one_1",
 status: "running",
 stages: [
 brick({
 progress: { value: 5, max: 20, node: "7" },
 activity: { phase: "sampling", node: "7", node_class: "KSampler", value: 5, max: 20 },
 }),
 ],
}

/** A NON-running brick that still carries activity: the running-gate must
 * drop it — a stale envelope must never paint a card that isn't running. */
const TICK_QUEUED: FlowRunStatus = {
 run_id: "one_1",
 status: "running",
 stages: [
 brick({
 status: "queued",
 progress: { value: 9, max: 20 },
 activity: { phase: "waiting", message: "slot held by another client" },
 }),
 ],
}

/** The terminal run — hydration rebuilds the card from this. Run-level
 * status is "completed" (contracts.py RunStatusValue); "done" is the
 * STAGE-level value the store maps onto the card. */
const DONE_RUN: FlowRunStatus = {
 run_id: "one_1",
 status: "completed",
 stages: [
 {
 id: "video_generate_0",
 name: "video_generate",
 index: 0,
 family_id: "video_generate",
 title: "Gen",
 status: "done",
 params: { prompt: "a robot dances" },
 url: "data:image/png;base64,out0",
 secs: 3.2,
 },
 ],
}

beforeEach(() => {
 useAgentFlowStore.getState().clear()
 vi.mocked(editorClient.startChain).mockResolvedValue({ runId: "one_1" })
})

afterEach(() => {
 vi.clearAllMocks()
})

/** Seed a graph-backed (named-flow) doc directly — the spec-library
 * door retired; the run paths read only this store state. */
async function loadOneShot() {
 useAgentFlowStore.setState({
 flow: {
 id: "one_shot",
 intent: "one_shot.yaml",
 stages: [
 { id: "s_0", kind: "generation", service: "video_generate", title: "Gen",
 status: "pending", error: null, params: { prompt: "a robot dances" },
 inputs: [], result: null, cacheKey: null },
 ],
 status: "ready",
 createdAt: Date.now(),
 completedAt: null,
 flowName: "one_shot.yaml",
 },
 runningStageId: null,
 })
 return useAgentFlowStore.getState().flow!
}

describe("flowStore — runAll chain onTick: WS activity → card (2026-08-10)", () => {
 it("maps each running brick's activity+progress by index and clears on done", async () => {
 await loadOneShot()

 // Status sequence: loading → sampling → (queued w/ stale activity) → done.
 const statuses = [TICK_LOADING, TICK_SAMPLING, TICK_QUEUED, DONE_RUN]
 let statusIdx = 0
 // Each capture happens on a STATUS FETCH — i.e. AFTER the previous
 // tick's onTick applied (pollFlowRun: fetch → onTick → sleep →
 // fetch). captured[0] is the pre-tick baseline.
 const captured: Array<{ activity: unknown; progress: unknown }> = []
 vi.mocked(apiFetch).mockImplementation(async (url: string) => {
 const u = String(url)
 if (u.startsWith("/v1/flows/status/")) {
 const p = useAgentFlowStore.getState().flow
 captured.push({
 activity: p?.stages[0]?.activity ?? null,
 progress: p?.stages[0]?.progress ?? null,
 })
 const body = statuses[Math.min(statusIdx, statuses.length - 1)]
 statusIdx++
 return new Response(JSON.stringify(body), {
 status: 200,
 headers: { "Content-Type": "application/json" },
 })
 }
 return new Response(JSON.stringify({}), { status: 404 })
 })

 await useAgentFlowStore.getState().runAll()

 // Baseline: running but no frame yet → no activity, no progress.
 expect(captured[0]).toEqual({ activity: null, progress: null })
 // Model-load window mapped: the loading envelope IS on the card.
 expect(captured[1].activity).toEqual({
 phase: "loading", node: "1", node_class: "CheckpointLoaderSimple",
 })
 expect(captured[1].progress).toEqual({ value: 3, max: 20, node: "1" })
 // Sampling window mapped: the step frame replaced the loading line.
 expect(captured[2].activity).toEqual({
 phase: "sampling", node: "7", node_class: "KSampler", value: 5, max: 20,
 })
 expect(captured[2].progress).toEqual({ value: 5, max: 20, node: "7" })
 // RUNNING-GATE: the queued brick's stale envelope is NOT mapped.
 expect(captured[3].activity).toBeNull()
 expect(captured[3].progress).toBeNull()
 // Done: hydration rebuilt the card — no activity/progress on the rest.
 const p = useAgentFlowStore.getState().flow!
 expect(p.status).toBe("done")
 expect(p.stages[0].status).toBe("done")
 expect(p.stages[0].activity).toBeNull()
 expect(p.stages[0].progress).toBeNull()
 })

 it("a run that vanished server-side (404) fails FAST — no hour-long fake spinner", async () => {
 // The "infinite loading" bug (2026-08-10): pollFlowRun treated a
 // 404 (run gone — server restart / DEV_MODE reload killed it) as a
 // retryable tick and polled for the full 60-min ceiling. The card
 // stayed "running" (overlay covering the controls) the whole time.
 await loadOneShot()
 vi.mocked(apiFetch).mockImplementation(async (url: string) => {
 const u = String(url)
 if (u.startsWith("/v1/flows/status/")) {
 return new Response(JSON.stringify({ error: "Run not found", run_id: "one_1" }), {
 status: 404,
 headers: { "Content-Type": "application/json" },
 })
 }
 return new Response(JSON.stringify({}), { status: 404 })
 })

 await useAgentFlowStore.getState().runAll()

 // The stage flipped to error with the explanatory message — NOT an
 // eternal "running" overlay. Re-run works from here.
 const p = useAgentFlowStore.getState().flow!
 expect(p.status).toBe("failed")
 expect(p.stages[0].status).toBe("error")
 expect(p.stages[0].error).toMatch(/gone|restarted/i)
 })

 it("a persisted 'running' stage hydrates as pending — dead run, never a loading overlay", async () => {
 // Second half of the same bug: the sidecar saves pipe_status=running
 // when the server dies mid-run. Every page load re-hydrated the card
 // as "running" with NO poll behind it → infinite loading forever.
 // A stored protocol can't hold a live run (the poll is in-session
 // only), so hydration demotes it to pending.
 const DEAD_RUN = {
 run_id: "one_1",
 status: "running",
 stages: [
 {
 id: "video_generate_0",
 family_id: "video_generate",
 title: "Gen",
 status: "running",
 params: { prompt: "a robot dances" },
 secs: 0,
 },
 ],
 }
 await useAgentFlowStore.getState().loadRun("one", DEAD_RUN as never)

 const p = useAgentFlowStore.getState().flow!
 expect(p.stages[0].status).toBe("pending")
 // Flow-level too — no canvas running chip, card is interactive.
 expect(p.status).not.toBe("running")
 })
})
