// the wire is pinned to a COMMITTED GOLDEN: the composed topology IS
// the official MOSS-Image template (the Comfy-Org `image_moss_image_t2i`
// template, cross-checked against the OpenMOSS developer workflow) —
// the loader trio over the moss tokenizer (w4a8_gptq), the small VAE,
// the declared ModelSamplingAuraFlow shift, the
// CLIPTextEncode/ConditioningZeroOut negative branch,
// SkipLayerGuidanceDiTSimple on single layer 22, and the template's
// plain KSampler (er_sde/simple). The interpreter's own contract
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
// lane_inputs on a minimal family row (the mods bags ride the card's
// absorption — this spec composes the bare lane).
const laneInputs = DECL.lane_inputs;
assert.ok(laneInputs, "the moss-image DECL declares lane_inputs");
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
  width: 1024,
  height: 1024,
  seed: 7,
  steps: 50,
  cfg: 3,
  sampler: "er_sde",
  scheduler: "simple",
};

const seedOf = (g: GraphBuilder): unknown =>
  Object.values(graphOf(g)).find((n) => n.class_type === "KSampler")?.inputs.seed;

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

const nodesOf = (g: GraphBuilder, classType: string): number =>
  Object.values(graphOf(g)).filter((n) => n.class_type === classType).length;

describe("the t2i action — the official MOSS-Image template topology", () => {
  it("the composed prompt is the committed golden arm (a stated negative encodes)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-arm-a-s"), graphOf(action), "the composed prompt is the committed golden arm (a stated negative encodes)");
  });

  it("a blank negative composes ConditioningZeroOut — the true unconditional", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, negative_prompt: "" }, FACTS, action, "probe-zero");
    const graph = graphOf(action);
    assert.equal(nodesOf(action, "ConditioningZeroOut"), 1, "the blank negative rides the zero-out arm");
    assert.equal(nodesOf(action, "CLIPTextEncode"), 1, "only the positive encodes through the tokenizer");
    assertGraphGolden(golden("a-blank-negative-composes-conditioningzeroout-t"), graph, "a blank negative composes ConditioningZeroOut (the true unconditional)");
    const absent = new GraphBuilder({});
    const { negative_prompt: _omitted, ...noNegative } = PARAMS;
    instantiateAction(t2i, noNegative, FACTS, absent, "probe-zero");
    assert.deepEqual(graphOf(absent), graph, "an ABSENT negative_prompt composes the identical zero-out wire");
  });

  it("THE DECLARED SHIFT: the moss lane wraps ModelSamplingAuraFlow at 5.0 (the krea-2 arm, not klein's scheduler-computed shift)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe-shift");
    const graph = graphOf(action);
    const shiftNodes = Object.values(graph).filter((n) => n.class_type === "ModelSamplingAuraFlow");
    assert.equal(shiftNodes.length, 1, "the declared shift composes exactly one sampling-model wrap");
    assert.equal(shiftNodes[0]?.inputs.shift, 5.0, "the wrap rides the DECL's declared 5.0");
    // and the sampler consumes the SLG patch over the WRAPPED model
    // (the wire spells connections as [nodeId, outputIndex] handles)
    const slg = Object.values(graph).find((n) => n.class_type === "SkipLayerGuidanceDiTSimple");
    assert.deepEqual(slg?.inputs.model, ["ModelSamplingAuraFlow.0", 0], "SLG patches the shift wrap");
    const sampler = Object.values(graph).find((n) => n.class_type === "KSampler");
    assert.deepEqual(sampler?.inputs.model, ["SkipLayerGuidanceDiTSimple.0", 0], "the sampler samples through the SLG patch");
    // the inert spelling (the door's optional-shift contract): a
    // resolved row carrying no sampling_shift composes the bare unet
    const bare = new GraphBuilder({});
    const { sampling_shift: _omitted, ...noShift } = FACTS.lane_inputs as Record<string, unknown>;
    instantiateAction(t2i, PARAMS, { ...FACTS, lane_inputs: noShift } as ModelFacts, bare, "probe-no-shift");
    assert.equal(nodesOf(bare, "ModelSamplingAuraFlow"), 0, "no declared shift, no wrap");
    const bareSlg = Object.values(graphOf(bare)).find((n) => n.class_type === "SkipLayerGuidanceDiTSimple");
    assert.deepEqual(bareSlg?.inputs.model, ["UNETLoader.0", 0], "SLG patches the raw unet");
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

  it("the sampler rides the SLG-patched model over the template canvas (the wire, not just the census)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe-wire");
    const graph = graphOf(action);
    const slg = Object.values(graph).find((n) => n.class_type === "SkipLayerGuidanceDiTSimple");
    const sampler = Object.values(graph).find((n) => n.class_type === "KSampler");
    // the wire spells connections as [nodeId, outputIndex] handles
    assert.deepEqual(sampler?.inputs.model, ["SkipLayerGuidanceDiTSimple.0", 0], "the KSampler samples through the SLG patch");
    assert.deepEqual(sampler?.inputs.latent_image, ["EmptyFlux2LatentImage.0", 0], "the canvas feeds the sampler");
    assert.deepEqual(slg?.inputs.model, ["ModelSamplingAuraFlow.0", 0], "SLG patches the shift-wrapped model");
    assert.equal(sampler?.inputs.seed, 7, "the stated seed rides the KSampler");
    assert.equal(sampler?.inputs.steps, 50, "steps ride through");
    assert.equal(sampler?.inputs.cfg, 3, "cfg rides through");
  });

  it("a facts row with a drifted encoder refuses at the door (the DECL states it)", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, text_encode_node: "TextEncodeQwenImage21" }),
      /moss-image t2i: lane_inputs\.text_encode_node = "TextEncodeQwenImage21" — the action builds on CLIPTextEncode/,
    );
  });

  // THE TEMPLATE TOPOLOGY (the 2026-10-20 weave burn — the operator's
  // own order: "look for the original comfyui workflow, you must be
  // violating it"): the compose IS the Comfy-Org template
  // (image_moss_image_t2i: TextGenerate→CLIPTextEncode→KSampler(er_sde,
  // simple)→VAEDecode, SLG on single layer 22, w4a8_gptq tokenizer,
  // small VAE). The born-red arm: every template load-bearing piece,
  // one assertion each.
  it("THE TEMPLATE TOPOLOGY: w4a8_gptq + small VAE + plain KSampler er_sde/simple + SLG on single layer 22", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, sampler: "er_sde" }, FACTS, action, "probe-template");
    const graph = graphOf(action);
    const clip = Object.values(graph).find((n) => n.class_type === "CLIPLoader");
    assert.equal(clip?.inputs.clip_name, "qwen3.5_9b_w4a8_gptq.safetensors", "the tokenizer is the template's w4a8_gptq, not the int8 convrot");
    assert.equal(clip?.inputs.type, "moss_image", "the loader type stays moss_image");
    const vae = Object.values(graph).find((n) => n.class_type === "VAELoader");
    assert.equal(vae?.inputs.vae_name, "flux2-vae_small.safetensors", "the VAE is the template's small, not the full flux2 VAE");
    const sampler = Object.values(graph).find((n) => n.class_type === "KSampler");
    assert.ok(sampler, "the template samples through the plain KSampler, not the advanced stack");
    assert.equal(sampler?.inputs.sampler_name, "er_sde", "the template sampler is er_sde");
    assert.equal(sampler?.inputs.scheduler, "simple", "the template scheduler is simple");
    const slg = Object.values(graph).find((n) => n.class_type === "SkipLayerGuidanceDiTSimple");
    assert.ok(slg, "skip-layer guidance rides — the template carries it ON in all four templates");
    assert.equal(slg?.inputs.single_layers, "22", "guidance at the official layer 22");
    for (const gone of ["Flux2Scheduler", "KSamplerSelect", "CFGGuider", "RandomNoise", "SamplerCustomAdvanced"]) {
      assert.equal(nodesOf(action, gone), 0, `${gone} leaves with the advanced stack`);
    }
  });
});
