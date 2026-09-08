// store-strict-hydration.test.tsx — the editor store hydration strict wall.
//
// (QUEUE LANE LAW, 2026-09-05, strict=True) The editor store
// hydrates FlowStage objects from TWO sources: a past run's
// RunProtocolStage (via hydrateRunStages), and a chain run's
// FlowDoc+status (via hydrateChainResults, where the chain-spec arm
// died with the yaml retirement). (The pipe-carry source died with
// the wire 2026-09-05 — reviveFromPipeDoc is retired, and its strict
// block retires with it.) Every hydration path MUST construct FlowStage
// objects whose keys are a subset of the FlowStage contract — a
// fossil field, an unknown field, or a renamed field is dropped at
// the door (a console.warn for dev visibility; never a silent
// accept that lets a fossil shape ride a card into the next run).
//
// The wall pins: every hydration output's keys are within the
// FlowStage contract. A field that was in a past schema but isn't
// in the current contract (yamlRunId etc.) is dropped, not echoed
// back as an unknown key.
//
// No GPU, no network. Pure store math.
import { describe, it, expect } from "vitest"
import {
 hydrateRunStages,
} from "../surfaces/flow/flowStoreHelpers"
import type { FlowRunStatus } from "@melite/catalog"
import type { FlowStage } from "@melite/contracts"

/** The FlowStage contract's known keys (web/contracts/src/FlowTypes.ts).
 * Source of truth — when a field is added, add it here. When a field
 * is removed, delete it from here. The wall's intent: hydration
 * output keys are a SUBSET of this set. */
const FLOW_STAGE_KEYS: ReadonlySet<string> = new Set([
 "id",
 "title",
 "subtitle",
 "kind",
 "service",
 "params",
 "inputs",
 "inputOutputs",
 "result",
 "status",
 "error",
 "cacheKey",
 "progress",
 "activity",
 "provenance",
 "groupId",
 "groupName",
 "compound",
 "flowName",
 "flowRunId",
 "runId",
 "actualSeed",
])

function assertFlowStageKeys(s: FlowStage, where: string) {
 for (const k of Object.keys(s)) {
 expect(FLOW_STAGE_KEYS.has(k), `${where}: key "${k}" not in FlowStage contract`).toBe(true)
 }
}

describe("hydrateRunStages — strict hydration", () => {
 it("the output keys are a subset of the FlowStage contract", () => {
 const raw = [
 {
 id: "gen_0",
 name: "video_generate",
 family_id: "video_generate",
 title: "Gen",
 service: "video_generate",
 status: "done",
 params: { prompt: "a robot dances" },
 url: "/runs/abc/clip0.mp4",
 secs: 1.2,
 outputs: ["clip_0"],
 inputs: [],
 },
 ] as never
 const status = { run_id: "abc", status: "completed" } as FlowRunStatus
 const out = hydrateRunStages(raw, status)
 expect(out).toHaveLength(1)
 assertFlowStageKeys(out[0], "hydrateRunStages")
 })

 it("an unknown RunProtocolStage field does NOT leak into the FlowStage", () => {
 // The wire is a contract we read loosely — a fresh run might
 // include a field the editor doesn't know about. Strict
 // construction (named-field assembly) refuses to echo it back.
 const raw = [
 {
 id: "gen_0",
 name: "video_generate",
 family_id: "video_generate",
 title: "Gen",
 service: "video_generate",
 status: "done",
 params: { prompt: "x" },
 url: "/runs/abc/clip0.mp4",
 secs: 1.2,
 outputs: ["clip_0"],
 inputs: [],
 // fossil fields that the wire might carry under permissive
 // schemas:
 fossil_field: "creature-flow",
 yamlRunId: "y_abc",
 sidecar_internal: 1,
 } as never,
 ]
 const status = { run_id: "abc", status: "completed" } as FlowRunStatus
 const out = hydrateRunStages(raw, status)
 assertFlowStageKeys(out[0], "hydrateRunStages no leak")
 })
})
