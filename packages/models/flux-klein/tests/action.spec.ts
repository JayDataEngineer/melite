// the wire is pinned to a COMMITTED GOLDEN (recorded at the family's
// birth, 2026-10-22): the composed topology IS the official
// FLUX.2 Klein 4B template (comfyui-workflow-templates
// image_flux2_klein_text_to_image / image_flux2_klein_image_edit_4b),
// so the golden carries the template-fidelity law — the loader trio,
// the CLIPTextEncode/ConditioningZeroOut negative branch, the
// Flux2Scheduler sampling stack, and the ReferenceLatent reference
// arm. The interpreter's own contract walls live in card-kit's
// tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
import { DECL } from "../src/index.ts";
import { t2i, parseT2IFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the DECL's own
// lane_inputs on a minimal family row (mods absent — this family
// boards none).
const laneInputs = DECL.lane_inputs;
assert.ok(laneInputs, "the flux-klein DECL declares lane_inputs");
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "image-gen",
  defaults: {},
  lane_inputs: laneInputs,
  variants: [],
  variant_groups: [],
  outputs: [],
};

const PARAMS = {
  prompt: "a quiet hallway",
  negative_prompt: "blur",
  width: 1280,
  height: 768,
  seed: 7,
  steps: 4,
  cfg: 1,
  sampler: "euler",
  scheduler: "simple",
};

const seedOf = (g: GraphBuilder): unknown =>
  (g.toJSON() as Record<string, { inputs: Record<string, unknown> }>)["RandomNoise.0"]?.inputs.noise_seed;

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

const nodesOf = (g: GraphBuilder, classType: string): number =>
  Object.values(graphOf(g)).filter((n) => n.class_type === classType).length;

describe("the t2i action — the official FLUX.2 Klein 4B template topology", () => {
  it("the composed prompt is the committed golden arm (a stated negative encodes)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-arm-a-s"), graphOf(action), "the composed prompt is the committed golden arm (a stated negative encodes)");
  });

  it("a blank negative composes ConditioningZeroOut — the distilled template's true unconditional", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, negative_prompt: "" }, FACTS, action, "probe-zero");
    const graph = graphOf(action);
    assert.equal(nodesOf(action, "ConditioningZeroOut"), 1, "the blank negative rides the zero-out arm");
    assert.equal(nodesOf(action, "CLIPTextEncode"), 1, "only the positive encodes through the tokenizer");
    assertGraphGolden(golden("a-blank-negative-composes-conditioningzeroout-t"), graph, "a blank negative composes ConditioningZeroOut (the distilled template's true unconditional)");
    const absent = new GraphBuilder({});
    const { negative_prompt: _omitted, ...noNegative } = PARAMS;
    instantiateAction(t2i, noNegative, FACTS, absent, "probe-zero");
    assert.deepEqual(graphOf(absent), graph, "an ABSENT negative_prompt composes the identical zero-out wire");
  });

  it("the reference arm chains ReferenceLatent and the first reference sizes the canvas", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, reference_images: ["ref-a.png", "ref-b.png"] }, FACTS, action, "probe-ref");
    const graph = graphOf(action);
    assert.equal(nodesOf(action, "ReferenceLatent"), 2, "each stated reference chains one ReferenceLatent");
    assert.equal(nodesOf(action, "ImageScaleToTotalPixels"), 2, "each reference scales to a megapixel (the official edit template's own scaling)");
    const latent = Object.values(graph).find((n) => n.class_type === "EmptyFlux2LatentImage")!;
    const w = latent.inputs.width as [string, number];
    assert.ok(Array.isArray(w) && w[0].startsWith("GetImageSize"), "the first reference's GetImageSize wires the latent width (an output-handle array reference)");
    const h = latent.inputs.height as [string, number];
    assert.ok(Array.isArray(h) && h[0].startsWith("GetImageSize"), "the first reference's GetImageSize wires the latent height");
    assertGraphGolden(golden("the-reference-arm-chains-referencelatent-and-the-f"), graph, "the reference arm chains ReferenceLatent and the first reference sizes the canvas");
  });

  it("GATE S rides the declared rule: the sentinel -1 mints a concrete seed, two runs differ", () => {
    const g1 = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, seed: -1 }, FACTS, g1, "r-a");
    const g2 = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, seed: -1 }, FACTS, g2, "r-b");
    const s1 = seedOf(g1);
    const s2 = seedOf(g2);
    assert.ok(typeof s1 === "number" && Number.isInteger(s1) && s1 >= 0, `minted a concrete int (got ${String(s1)})`);
    assert.ok(typeof s2 === "number" && s2 >= 0);
    assert.notEqual(s1, s2, "run-again under the sentinel mints fresh");
  });

  it("the sampling stack is the template's own — Flux2Scheduler, KSamplerSelect, CFGGuider, SamplerCustomAdvanced; no KSampler", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe-stack");
    for (const classType of ["Flux2Scheduler", "KSamplerSelect", "CFGGuider", "SamplerCustomAdvanced", "RandomNoise", "UNETLoader", "EmptyFlux2LatentImage"]) {
      assert.equal(nodesOf(action, classType), 1, `${classType} composes exactly once`);
    }
    assert.equal(nodesOf(action, "KSampler"), 0, "FLUX.2 sigmas ride the advanced sampler, never the stock KSampler");
    assert.equal(nodesOf(action, "SamplerCustom"), 0);
  });

  it("a reference count past the DECL cap refuses LOUD before any image loads", () => {
    assert.throws(
      () => {
        const action = new GraphBuilder({});
        instantiateAction(t2i, { ...PARAMS, reference_images: ["1.png", "2.png", "3.png", "4.png", "5.png"] }, FACTS, action, "probe-cap");
      },
      /this lane takes 4 reference images.*never drops one quietly/,
    );
  });

  it("blank reference entries contribute no slot", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, reference_images: ["", "  "] }, FACTS, action, "probe-blank");
    assert.equal(nodesOf(action, "ReferenceLatent"), 0, "blanks never occupy a reference slot");
    assert.equal(nodesOf(action, "LoadImage"), 0);
    const latent = Object.values(graphOf(action)).find((n) => n.class_type === "EmptyFlux2LatentImage")!;
    assert.equal(latent.inputs.width, 1280, "the plain path sizes the canvas from the card fields");
  });

  it("a spell reference rides verbatim into the scaler (no LoadImage in the way)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, reference_images: ["$image1"] }, FACTS, action, "probe-spell");
    assert.equal(nodesOf(action, "LoadImage"), 0, "the spell resolves caller-side — no file load composes");
    assert.equal(nodesOf(action, "ReferenceLatent"), 1, "the spell still chains one reference");
    const scale = Object.values(graphOf(action)).find((n) => n.class_type === "ImageScaleToTotalPixels")!;
    assert.equal(scale.inputs.image, "$image1", "the spell string rides the scaler's image input verbatim");
  });

  it("a facts row without the cap or with a drifted encoder refuses at the door (the DECL states it)", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, max_references: undefined }),
      /lane_inputs\.max_references.*a number ≥ 1 is required/,
    );
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, text_encode_node: "TextEncodeQwenImage21" }),
      /flux-klein t2i: lane_inputs\.text_encode_node = "TextEncodeQwenImage21" — the action builds on CLIPTextEncode/,
    );
  });
});
