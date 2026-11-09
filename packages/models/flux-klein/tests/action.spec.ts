// the wire is pinned to a COMMITTED GOLDEN (recorded at the family's
// birth, 2026-10-22): the composed topology IS the official
// FLUX.2 Klein 4B template (comfyui-workflow-templates
// image_flux2_klein_text_to_image / image_flux2_klein_image_edit_4b),
// so the golden carries the template-fidelity law — the loader trio,
// the CLIPTextEncode/ConditioningZeroOut negative branch, and the
// Flux2Scheduler sampling stack. The interpreter's own contract
// walls live in card-kit's tests/action.spec.ts.
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

  it("a facts row with a drifted encoder refuses at the door (the DECL states it)", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, text_encode_node: "TextEncodeQwenImage21" }, FACTS),
      /flux-klein t2i: lane_inputs\.text_encode_node = "TextEncodeQwenImage21" — the action builds on CLIPTextEncode/,
    );
  });
});

// THE GEN DETAILER SERVE (operator 2026-11-09, "ANY model can
// inpaint, not just krea-2" — the two-family roster was artificial):
// the same two arms krea-2 pins, over THIS lane's own conditioning —
// the distilled ZeroOut negative is the lane's own uncond. The
// canvas law resolves the detailer's steps/cfg/seed exactly like the
// sampling stack's.
describe("the gen detailer serve — the region arm on the flux-klein lane", () => {
  it("THE FRESH-GEN ARM: a stated mask rides DetailerForEach over the lane's own decoded frame, saved under gen", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, mask: [{ input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }, FACTS, action, "probe-region");
    const nodes = Object.values(graphOf(action));
    const detailer = nodes.find((n) => n.class_type === "DetailerForEach");
    assert.ok(detailer, "the stated region mints DetailerForEach (the generic tail serves this lane)");
    assert.ok(nodes.some((n) => n.class_type === "MaskToSEGS"), "the painted mask converts through MaskToSEGS");
    assert.match(String(detailer!.inputs.image), /^VAEDecode/, "the detailer reworks the lane's OWN decoded frame");
    assert.equal(detailer!.inputs.steps, PARAMS.steps, "the detailer's steps are the canvas-resolved stated steps");
    const saved = nodes.find((n) => n.class_type === "SaveImage");
    assert.strictEqual(saved?.inputs?.filename_prefix, "probe-region/gen", "the detailed image saves under the gen prefix");
  });

  it("THE PHOTO ARM: input_image + input_mask composes LoadImage→DetailerForEach and NO generation node exists", () => {
    const action = new GraphBuilder({});
    instantiateAction(
      t2i,
      { ...PARAMS, mask: [{ input_image: "/v1/assets/photo.png", input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" },
      FACTS,
      action,
      "probe-photo",
    );
    const nodes = Object.values(graphOf(action));
    const classes = nodes.map((n) => String(n.class_type));
    const load = nodes.find((n) => n.class_type === "LoadImage");
    assert.ok(load, "the stated base photograph loads (the pair's image half)");
    assert.strictEqual(load!.inputs.image, "/v1/assets/photo.png", "the base seat rides input_image");
    const detailer = nodes.find((n) => n.class_type === "DetailerForEach");
    assert.ok(detailer, "the pair mints the region detailer");
    assert.match(String(detailer!.inputs.image), /^LoadImage/, "DetailerForEach's image input is the LoadImage output (the photo is the base)");
    for (const gone of ["Flux2Scheduler", "KSamplerSelect", "RandomNoise", "CFGGuider", "SamplerCustomAdvanced", "EmptyFlux2LatentImage"]) {
      assert.ok(!classes.includes(gone), `no ${gone} node exists in the photo arm (nothing generates)`);
    }
    const saved = nodes.find((n) => n.class_type === "SaveImage");
    assert.strictEqual(saved!.inputs?.filename_prefix, "probe-photo/gen", "the detailed photo saves under the gen prefix");
  });
});
