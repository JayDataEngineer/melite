// Unit tests for flowToChainSteps — the serializer that turns a composed
// FlowDoc into the chain-YAML steps POST /v1/flows/yaml/save accepts.
// Pure + local — no store, no network. The inverse of hydrateSpecSteps.
import { describe, it, expect, beforeAll } from "vitest"
import { flowToChainSteps } from "../../surfaces/flow/flowToChainYaml"
import { setInputVocabulary, type InputVocabulary } from "@melite/catalog"
import type { FlowDoc } from "@melite/contracts"

// The catalog's input_vocabulary shape — a family param (input_artifact) →
// slot (image1) alias. setInputVocabulary populates the module-level table
// normalizeSlotParams + the serializer's inverse fold read.
beforeAll(() => {
 setInputVocabulary({
 slots: ["image1", "image2"],
 aliases: { input_artifact: "image1", input_image: "image1", ref_image: "image2" },
 } satisfies InputVocabulary)
})

function doc(stages: FlowDoc["stages"]): FlowDoc {
 return {
 id: "p1", intent: "test", stages,
 status: "draft", createdAt: 0, completedAt: null,
 }
}

describe("flowToChainSteps — generation stages", () => {
 it("emits one step per generation stage with scalar params verbatim", () => {
 const { steps, skipped } = flowToChainSteps(doc([
 { id: "s0", title: "Gen", kind: "generation", service: "krea_2",
 params: { prompt: "a cat", seed: 42, width: 1024 },
 inputs: [], result: null, status: "pending", error: null, cacheKey: null },
 ]))
 expect(skipped).toEqual([])
 expect(steps).toHaveLength(1)
 expect(steps[0].family).toBe("krea_2")
 expect(steps[0].title).toBe("Gen")
 expect(steps[0].params.prompt).toBe("a cat")
 expect(steps[0].params.seed).toBe(42)
 expect(steps[0].outputs).toEqual(["out_0"])
 expect(steps[0].inputs).toEqual([])
 })

 it("drops null-valued params (family default wins)", () => {
 const { steps } = flowToChainSteps(doc([
 { id: "s0", title: "G", kind: "generation", service: "krea_2",
 params: { prompt: "x", seed: null, width: 1024 },
 inputs: [], result: null, status: "pending", error: null, cacheKey: null },
 ]))
 // The serializer keeps nulls (the BACKEND drops them on write). This
 // keeps the serializer a faithful projection; the backend owns the
 // null-purge (one place, testable in test_flow_yaml_save).
 expect(steps[0].params.seed).toBeNull()
 expect(steps[0].params.width).toBe(1024)
 })
})

// ── Reproducibility (2026-08-13): seed=-1 → the actual seed the run used ──
describe("flowToChainSteps — seed=-1 bakes the actual seed", () => {
 it("substitutes seed=-1 with the result's actualSeed so the workflow reproduces", () => {
 const { steps } = flowToChainSteps(doc([
 { id: "s0", title: "Gen", kind: "generation", service: "krea_2",
 params: { prompt: "hero", seed: -1 },
 inputs: [], status: "done", error: null, cacheKey: null,
 result: { assetUrls: ["data:image/png;base64,abc"],
 artifacts: {}, metadata: { actualSeed: 123456 }, completedAt: 1, durationSec: 2 } },
 ]))
 // -1 would re-randomize on every run; the saved workflow bakes the
 // concrete seed so re-running reproduces byte-identical bytes.
 expect(steps[0].params.seed).toBe(123456)
 })

 it("substitutes seed=0 too (the other random sentinel _resolve_seed accepts)", () => {
 const { steps } = flowToChainSteps(doc([
 { id: "s0", title: "Gen", kind: "generation", service: "krea_2",
 params: { prompt: "hero", seed: 0 },
 inputs: [], status: "done", error: null, cacheKey: null,
 result: { assetUrls: ["data:image/png;base64,abc"],
 artifacts: {}, metadata: { actualSeed: 99 }, completedAt: 1, durationSec: 2 } },
 ]))
 expect(steps[0].params.seed).toBe(99)
 })

 it("keeps a fixed seed unchanged (no actualSeed needed)", () => {
 const { steps } = flowToChainSteps(doc([
 { id: "s0", title: "Gen", kind: "generation", service: "krea_2",
 params: { prompt: "hero", seed: 42 },
 inputs: [], status: "done", error: null, cacheKey: null,
 result: { assetUrls: ["data:image/png;base64,abc"],
 artifacts: {}, metadata: { actualSeed: 999 }, completedAt: 1, durationSec: 2 } },
 ]))
 // A fixed seed is already reproducible — never overwritten.
 expect(steps[0].params.seed).toBe(42)
 })

 it("keeps seed=-1 when the stage never ran (no actualSeed)", () => {
 const { steps } = flowToChainSteps(doc([
 { id: "s0", title: "Gen", kind: "generation", service: "krea_2",
 params: { prompt: "hero", seed: -1 },
 inputs: [], result: null, status: "pending", error: null, cacheKey: null },
 ]))
 // No result → the workflow stays random (the user hasn't generated yet).
 expect(steps[0].params.seed).toBe(-1)
 })
})

describe("flowToChainSteps — non-generation stages skipped", () => {
 it("input / studio-link / body stages land in `skipped`, not steps", () => {
 const { steps, skipped } = flowToChainSteps(doc([
 { id: "s0", title: "In", kind: "input", service: "input", params: {},
 inputs: [], result: null, status: "pending", error: null, cacheKey: null },
 { id: "s1", title: "Gen", kind: "generation", service: "krea_2",
 params: { prompt: "x" }, inputs: [], result: null,
 status: "pending", error: null, cacheKey: null },
 { id: "s2", title: "Pose", kind: "studio-link", service: "pose", params: {},
 inputs: [], result: null, status: "pending", error: null, cacheKey: null },
 ]))
 expect(steps).toHaveLength(1)
 expect(steps[0].family).toBe("krea_2")
 expect(skipped).toEqual([
 { title: "In", kind: "input" },
 { title: "Pose", kind: "studio-link" },
 ])
 })
})

describe("flowToChainSteps — wiring (the inverse fold)", () => {
 it("wires a downstream input to its upstream's ctx key + sets the family input param", () => {
 // s1 is wired to s0 via inputs:[s0Id]. The serializer should emit:
 // s0: outputs [out_0], inputs []
 // s1: outputs [out_1], inputs [out_0], params.input_artifact = "out_0"
 // (input_artifact is the inverse-alias of the image1 slot.)
 const { steps } = flowToChainSteps(doc([
 { id: "s0", title: "A", kind: "generation", service: "krea_2",
 params: { prompt: "first" }, inputs: [],
 result: null, status: "pending", error: null, cacheKey: null },
 { id: "s1", title: "B", kind: "generation", service: "edit_image",
 params: { prompt: "second", image1: "data:url" }, inputs: ["s0"],
 result: null, status: "pending", error: null, cacheKey: null },
 ]))
 expect(steps).toHaveLength(2)
 expect(steps[0].outputs).toEqual(["out_0"])
 expect(steps[0].inputs).toEqual([])
 expect(steps[1].inputs).toEqual(["out_0"])
 expect(steps[1].outputs).toEqual(["out_1"])
 // The slot param (image1) is FOLDED BACK to the family param (input_artifact),
 // and its value is the symbolic ctx key — NOT the data: URL (bytes flow at
 // runtime through ctx, the YAML is symbolic).
 expect(steps[1].params.input_artifact).toBe("out_0")
 expect(steps[1].params.image1).toBeUndefined()
 })

 it("dedupes inputs when two slots wire to the same upstream", () => {
 const { steps } = flowToChainSteps(doc([
 { id: "s0", title: "src", kind: "generation", service: "krea_2",
 params: { prompt: "p" }, inputs: [],
 result: null, status: "pending", error: null, cacheKey: null },
 { id: "s1", title: "two-slots", kind: "generation", service: "edit_image",
 params: { prompt: "p", image1: "u", image2: "u" }, inputs: ["s0", "s0"],
 result: null, status: "pending", error: null, cacheKey: null },
 ]))
 expect(steps[1].inputs).toEqual(["out_0"]) // deduped
 })
})
