// the wire is pinned to a COMMITTED GOLDEN: the composed topology IS
// the official MOSS-Image template (the Comfy-Org `image_moss_image_t2i`
// template, cross-checked against the OpenMOSS developer workflow) —
// the loader trio over the moss tokenizer (w4a8_gptq), the small VAE,
// the declared ModelSamplingAuraFlow shift, a CLIPTextEncode negative
// on EVERY compose (blank encodes the template's reference default —
// the template never zero-outs), SLG DISARMED (the template ships
// switch_1 "SLG" false, routing the sampler off the raw wrapped
// model — melite emits the bypass directly), and the template's
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

  it("a blank negative encodes the template's reference default — the lane never zero-outs", () => {
    // THE 2026-11-04 ARTIFACT BURN: the Comfy-Org template's negative
    // box carries an exposed default and encodes it on every compose;
    // a zeroed unconditional (score = cfg·cond, no uncond
    // cancellation) fed the 16/32px patch-grid lattice beside the
    // over-armed SLG. Blank encodes the template's own string.
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, negative_prompt: "" }, FACTS, action, "probe-zero");
    const graph = graphOf(action);
    assert.equal(nodesOf(action, "ConditioningZeroOut"), 0, "never a zeroed unconditional on this lane");
    assert.equal(nodesOf(action, "CLIPTextEncode"), 2, "positive and negative BOTH encode through the tokenizer");
    const negative = Object.values(graph).filter((n) => n.class_type === "CLIPTextEncode")
      .find((n) => n.inputs.text !== PARAMS.prompt);
    assert.equal(negative?.inputs.text, "nsfw, worst quality, bad anatomy, watermark, jpeg artifact", "the blank negative encodes the template's exposed default, verbatim");
    assertGraphGolden(golden("a-blank-negative-encodes-the-template-reference-neg"), graph, "a blank negative encodes the template's reference default");
    const absent = new GraphBuilder({});
    const { negative_prompt: _omitted, ...noNegative } = PARAMS;
    instantiateAction(t2i, noNegative, FACTS, absent, "probe-zero");
    assert.deepEqual(graphOf(absent), graph, "an ABSENT negative_prompt composes the identical reference-negative wire");
  });

  it("THE DECLARED SHIFT: the moss lane wraps ModelSamplingAuraFlow at 5.0 (the krea-2 arm, not klein's scheduler-computed shift)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe-shift");
    const graph = graphOf(action);
    const shiftNodes = Object.values(graph).filter((n) => n.class_type === "ModelSamplingAuraFlow");
    assert.equal(shiftNodes.length, 1, "the declared shift composes exactly one sampling-model wrap");
    assert.equal(shiftNodes[0]?.inputs.shift, 5.0, "the wrap rides the DECL's declared 5.0");
    // and the sampler consumes the WRAP directly (the template's SLG
    // ships disarmed — link 51 routes the raw wrapped model; the wire
    // spells connections as [nodeId, outputIndex] handles)
    assert.equal(shiftNodes.length === 1 && Object.values(graph).some((n) => n.class_type === "KSampler" && JSON.stringify(n.inputs.model) === JSON.stringify(["ModelSamplingAuraFlow.0", 0])), true, "the sampler samples through the shift wrap, no SLG patch between");
    // the inert spelling (the door's optional-shift contract): a
    // resolved row carrying no sampling_shift VALUE composes the
    // bare unet. The key stays DECLARED (the variant carries it —
    // the qwen3-tts per-variant precedent) so the typed lane reader
    // refuses only UNDECLARED keys, never a declared-but-absent one.
    const bare = new GraphBuilder({});
    const { sampling_shift: _omitted, ...noShift } = FACTS.lane_inputs as Record<string, unknown>;
    instantiateAction(t2i, PARAMS, {
      ...FACTS,
      lane_inputs: noShift,
      variants: [{ id: "shift", label: "Shift", group: "g", route: "", resolver_defaults: {}, defaults: {}, cells: [], lane_inputs: { sampling_shift: 5.0 } }],
    } as ModelFacts, bare, "probe-no-shift");
    assert.equal(nodesOf(bare, "ModelSamplingAuraFlow"), 0, "no declared shift, no wrap");
    const bareSampler = Object.values(graphOf(bare)).find((n) => n.class_type === "KSampler");
    assert.deepEqual(bareSampler?.inputs.model, ["UNETLoader.0", 0], "no declared shift, the sampler rides the raw unet (still no SLG patch)");
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

  it("the sampler rides the wrapped model over the template canvas, SLG DISARMED (the wire, not just the census)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe-wire");
    const graph = graphOf(action);
    const sampler = Object.values(graph).find((n) => n.class_type === "KSampler");
    // the wire spells connections as [nodeId, outputIndex] handles
    assert.equal(Object.values(graph).filter((n) => n.class_type === "SkipLayerGuidanceDiTSimple").length, 0, "the template ships SLG DISARMED (switch_1 false) — melite emits the bypass, never the patch");
    assert.deepEqual(sampler?.inputs.model, ["ModelSamplingAuraFlow.0", 0], "the KSampler samples through the shift wrap");
    assert.deepEqual(sampler?.inputs.latent_image, ["EmptyFlux2LatentImage.0", 0], "the canvas feeds the sampler");
    assert.equal(sampler?.inputs.seed, 7, "the stated seed rides the KSampler");
    assert.equal(sampler?.inputs.steps, 50, "steps ride through");
    assert.equal(sampler?.inputs.cfg, 3, "cfg rides through");
  });

  it("a facts row with a drifted encoder refuses at the door (the DECL states it)", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, text_encode_node: "TextEncodeQwenImage21" }, FACTS),
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
  it("THE TEMPLATE TOPOLOGY: w4a8_gptq + small VAE + plain KSampler er_sde/simple + SLG disarmed", () => {
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
    // THE ARTIFACT BURN (2026-11-04): the template CARRIES
    // SkipLayerGuidanceDiTSimple but ships it DISARMED — exposed
    // switch_1 ("SLG") false, the ComfySwitchNode routing the
    // KSampler off the raw wrapped model (link 51). Stamping it ON
    // (single layer 22, first half of the schedule) replaces the
    // uncond prediction with a layer-skipped pass, so
    // cfg·(cond − uncond_skipped) amplifies the 2×2 DiT patch-grid
    // bias — the measured 16/32px lattice. Melite emits the bypass
    // directly.
    assert.equal(Object.values(graph).filter((n) => n.class_type === "SkipLayerGuidanceDiTSimple").length, 0, "SLG rides DISARMED — the template's own default, and never the stamped-on patch");
    for (const gone of ["Flux2Scheduler", "KSamplerSelect", "CFGGuider", "RandomNoise", "SamplerCustomAdvanced"]) {
      assert.equal(nodesOf(action, gone), 0, `${gone} leaves with the advanced stack`);
    }
  });
});

// THE GEN DETAILER SERVE (operator 2026-11-09, "ANY model can
// inpaint, not just krea-2" — the two-family roster was artificial):
// the same two arms krea-2 pins, over THIS lane's own conditioning —
// the template's own negative default included, never a zeroed
// unconditional.
describe("the gen detailer serve — the region arm on the moss-image lane", () => {
  it("THE FRESH-GEN ARM: a stated mask rides DetailerForEach over the lane's own decoded frame, saved under gen", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, mask: [{ input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }, FACTS, action, "probe-region");
    const nodes = Object.values(graphOf(action));
    const detailer = nodes.find((n) => n.class_type === "DetailerForEach");
    assert.ok(detailer, "the stated region mints DetailerForEach (the generic tail serves this lane)");
    assert.ok(nodes.some((n) => n.class_type === "MaskToSEGS"), "the painted mask converts through MaskToSEGS");
    assert.match(String(detailer!.inputs.image), /^VAEDecode/, "the detailer reworks the lane's OWN decoded frame");
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
    for (const gone of ["KSampler", "EmptyFlux2LatentImage"]) {
      assert.ok(!classes.includes(gone), `no ${gone} node exists in the photo arm (nothing generates)`);
    }
    const saved = nodes.find((n) => n.class_type === "SaveImage");
    assert.strictEqual(saved!.inputs?.filename_prefix, "probe-photo/gen", "the detailed photo saves under the gen prefix");
  });
});
