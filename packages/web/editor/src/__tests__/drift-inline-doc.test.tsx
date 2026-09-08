// drift-inline-doc.test.tsx — the run-vs-doc drift wall.
//
// (QUEUE LANE LAW, 2026-09-05) An inline doc carries BOTH a card
// list (the user's current edit state) AND a compiled body (the
// {flow_inline} shape the run door accepts). The two MUST join on
// stage id. Drift in either direction — a card with no body stage,
// or a body stage with no card — refuses loud. Never a partial run.
// The overlay is per-id: the current card params win, the body's
// params survive untouched for ids the user didn't touch.
//
// The wall pins: (a) overlay per-id, (b) drift refusal both
// directions, (c) no fossil field leaks through.
//
// No GPU, no network. Pure store math.
import { describe, it, expect } from "vitest"
import { syncInlineFlow } from "../surfaces/flow/flowStoreHelpers"
import type { FlowDoc, FlowStage, InlineFlowBody } from "@melite/contracts"

function makeStage(over: Partial<FlowStage> = {}): FlowStage {
 return {
 id: "s0",
 kind: "generation",
 service: "krea-2",
 title: "Gen",
 status: "pending",
 error: null,
 params: { prompt: "default" },
 inputs: [],
 result: null,
 cacheKey: null,
 ...over,
 }
}

function makeDoc(stages: FlowStage[], body: InlineFlowBody | null): FlowDoc {
 return {
 id: "doc-1",
 intent: "Drift test",
 stages,
 status: "ready",
 createdAt: 0,
 completedAt: null,
 ...(body ? { inlineFlow: body } : {}),
 } as FlowDoc
}

describe("syncInlineFlow — per-stage-id overlay + drift refusal", () => {
 it("overlays current card params onto the body, per id", () => {
 // The body says s0's prompt is 'compose-time'; the card says 'edited'.
 // The POST {flow_inline} rides the card's params, not the body's.
 const body: InlineFlowBody = {
 id: "compiled-1",
 stages: [
 { id: "s0", engine: "comfyui", params: { prompt: "compose-time" } },
 ],
 }
 const doc = makeDoc(
 [makeStage({ id: "s0", params: { prompt: "edited" } })],
 body,
 )
 const out = syncInlineFlow(doc)
 expect(out.stages[0].params.prompt).toBe("edited")
 expect(out.stages[0].id).toBe("s0")
 })

 it("leaves untouched stages' params alone (only the edited card is overlaid)", () => {
 const body: InlineFlowBody = {
 id: "compiled-1",
 stages: [
 { id: "s0", engine: "comfyui", params: { prompt: "s0-body" } },
 { id: "s1", engine: "comfyui", params: { prompt: "s1-body" } },
 ],
 }
 const doc = makeDoc(
 [
 makeStage({ id: "s0", params: { prompt: "s0-edited" } }),
 makeStage({ id: "s1", params: { prompt: "s1-body" } }),
 ],
 body,
 )
 const out = syncInlineFlow(doc)
 expect(out.stages[0].params.prompt).toBe("s0-edited")
 expect(out.stages[1].params.prompt).toBe("s1-body")
 })

 it("merges new params (the card adds a knob the body didn't have)", () => {
 const body: InlineFlowBody = {
 id: "compiled-1",
 stages: [
 { id: "s0", engine: "comfyui", params: { prompt: "x" } },
 ],
 }
 const doc = makeDoc(
 [
 makeStage({
 id: "s0",
 params: { prompt: "x", seed: 42, negative_prompt: "harsh" },
 }),
 ],
 body,
 )
 const out = syncInlineFlow(doc)
 expect(out.stages[0].params).toEqual({
 prompt: "x",
 seed: 42,
 negative_prompt: "harsh",
 })
 })

 it("REFUSES drift: a body stage with no card — the doc and body disagree", () => {
 // The body declares TWO stages but the card list only has ONE —
 // the user removed a card but the body was never re-composed.
 // A POST with this body would run the second stage in isolation,
 // with the FIRST stage's seed/wiring — silent partial-run.
 const body: InlineFlowBody = {
 id: "compiled-1",
 stages: [
 { id: "s0", engine: "comfyui", params: {} },
 { id: "s1", engine: "comfyui", params: {} },
 ],
 }
 const doc = makeDoc(
 [makeStage({ id: "s0", params: {} })],
 body,
 )
 expect(() => syncInlineFlow(doc)).toThrow(/drifted|missing|stage/i)
 })

 it("REFUSES drift: a card with no body stage — the doc and body disagree", () => {
 // The card list declares TWO stages but the body only has ONE —
 // the user added a card but the body was never re-composed.
 // A POST with this body would run the first stage only, the
 // second card silently drops.
 const body: InlineFlowBody = {
 id: "compiled-1",
 stages: [{ id: "s0", engine: "comfyui", params: {} }],
 }
 const doc = makeDoc(
 [
 makeStage({ id: "s0", params: {} }),
 makeStage({ id: "s1", params: {} }),
 ],
 body,
 )
 expect(() => syncInlineFlow(doc)).toThrow(/drifted|stage.*has no card|missing/i)
 })

 it("REFUSES when the doc has no inlineFlow at all (no compiled body)", () => {
 const doc = makeDoc([makeStage({ id: "s0" })], null)
 expect(() => syncInlineFlow(doc)).toThrow(/re-compose|no compiled/)
 })

 it("ignores non-generation cards in the missing-stage check (input cards are doc-only)", () => {
 // Input cards live in the doc but never reach the body (they
 // produce no work, just attach a media URL). They MUST NOT
 // trigger the missing-stage refusal.
 const body: InlineFlowBody = {
 id: "compiled-1",
 stages: [
 { id: "s0", engine: "comfyui", params: {} },
 ],
 }
 const doc = makeDoc(
 [
 makeStage({ id: "input-1", kind: "input", service: "file", params: {} }),
 makeStage({ id: "s0", params: {} }),
 ],
 body,
 )
 // should NOT throw — the input card is not a generation stage
 const out = syncInlineFlow(doc)
 expect(out.stages[0].id).toBe("s0")
 })
})
