// flowStore.card-identity.test.tsx — CARD IDENTITY (2026-08-12).
//
// The user directive: "Very first card. Not the premade card." Every yaml
// brick must hydrate as its CATALOG CARD, never a raw flow-family
// string. The backend now emits `service` on describe + status payloads
// (pydantic-validated: contracts.DescribeStep REQUIRES it, extra="forbid")
// and the family modules point at their cards via CATALOG_FAMILY
// (kimodo_motion → "kimodo" — the premade Motion card, genre "motion",
// which is what CardDetailModal's bespoke-editor dispatch keys off).
//
// These tests pin the FRONTEND half: hydrateSpecSteps / hydrateRunStages
// consume `service` — a kimodo_motion brick hydrates as service "kimodo",
// not the raw family id. The family/model fallbacks stay for legacy wire
// shapes (old runs / pre-service describe payloads).
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { useAgentFlowStore } from "../../surfaces/flow/flowStore"
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
// Spread pattern: loadFlowSpec (real) talks to the mocked describeChain.
vi.mock("@/rpc/editorClient", async () => {
 const actual = await vi.importActual<typeof import("@/rpc/editorClient")>("@/rpc/editorClient")
 return {
 ...actual,
 editorClient: {
 ...actual.editorClient,
 describeChain: vi.fn(),
 startChain: vi.fn(),
 },
 }
})

/** Brick 01 of character_cards.yaml as served today: family kimodo_motion,
 * service "kimodo" — the premade Motion card. */
/** Legacy wire shape (pre-2026-08-12): no service key — must fall back to
 * the family id rather than becoming undefined. */
/** Status-channel stage as served by runner.get_run_status: family_id plus
 * the resolved card identity `service`. */
const MOTION_RUN: FlowRunStatus = {
 run_id: "card_1",
 status: "completed",
 stages: [
 {
 id: "kimodo_motion_0",
 name: "kimodo_motion",
 index: 0,
 family_id: "kimodo_motion",
 service: "kimodo",
 title: "Motion: walk cycle",
 status: "done",
 params: { prompt: "walk cycle" },
 url: "data:image/png;base64,motion",
 secs: 4.2,
 },
 ],
}

/** Legacy run-stage shape: no service — falls back to params.model, then
 * family_id. */
const LEGACY_RUN: FlowRunStatus = {
 run_id: "legacy_1",
 status: "completed",
 stages: [
 {
 id: "kimodo_motion_0",
 name: "kimodo_motion",
 index: 0,
 family_id: "kimodo_motion",
 title: "Motion: walk cycle",
 status: "done",
 params: { prompt: "walk cycle" },
 url: "data:image/png;base64,motion",
 },
 ],
}

beforeEach(() => {
 useAgentFlowStore.getState().clear()
 vi.mocked(editorClient.startChain).mockResolvedValue({ runId: "x" })
})

afterEach(() => {
 vi.clearAllMocks()
})

describe("flowStore — card identity: yaml bricks hydrate as their catalog card (2026-08-12)", () => {
 it("loadRun: a status stage with service 'kimodo' hydrates as the Motion card", async () => {
 await useAgentFlowStore.getState().loadRun("card_1", MOTION_RUN)
 const stage = useAgentFlowStore.getState().flow!.stages[0]
 expect(stage.service).toBe("kimodo")
 })

 it("loadRun: legacy stage without service falls back to family_id", async () => {
 await useAgentFlowStore.getState().loadRun("legacy_1", LEGACY_RUN)
 const stage = useAgentFlowStore.getState().flow!.stages[0]
 expect(stage.service).toBe("kimodo_motion")
 })
})
