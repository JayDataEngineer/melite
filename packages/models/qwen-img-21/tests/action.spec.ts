// the wire is pinned to a COMMITTED GOLDEN — recorded while the kit's legacy
// @contract models-gen-detailer-serve
// imageT2I still existed and this spec compared the two arms byte-for-byte.
// That arm is deleted (the families own their lanes now), so the golden
// carries the compatibility law. The interpreter's own contract walls live
// in card-kit's tests/action.spec.ts.
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
assert.ok(laneInputs, "the qwen-img-21 DECL declares lane_inputs");
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
  steps: 25,
  cfg: 1,
  sampler: "euler",
  scheduler: "simple",
};

const seedOf = (g: GraphBuilder): unknown =>
  (g.toJSON() as Record<string, { inputs: Record<string, unknown> }>)["KSampler.0"]?.inputs.seed;

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the t2i action — byte-stability (the pilot's compatibility law)", () => {
  it("THE GEN DETAILER SERVE (operator 2026-11-07, the mod SERVES): a stated region rides the crop_stitch arm — DetailerForEach over the Impact segs, saved under gen", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, mask: [{ input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }, FACTS, action, "probe-region");
    const nodes = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>);
    const detailer = nodes.find((n) => n.class_type === "DetailerForEach");
    assert.ok(detailer, "the stated region mints DetailerForEach (crop_stitch via Impact on gen)");
    assert.ok(nodes.some((n) => n.class_type === "MaskToSEGS"), "the painted mask converts through MaskToSEGS");
    const saved = nodes.find((n) => n.class_type === "SaveImage");
    assert.strictEqual(saved?.inputs?.filename_prefix, "probe-region/gen", "the detailed image saves under the gen prefix");
  });

  it("the composed prompt is the committed golden arm (the plain path)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-arm-t-f241fab97f"), graphOf(action), "the composed prompt is the committed golden arm (the plain path)");
  });

  it("THE AUTOGROW WALL (models-hop56 wave-2): stated reference_images map the dotted images.image_N keys contiguously from image_1 — the edit lane's :73-74 pin lifted to the t2i lane", () => {
    const p = { ...PARAMS, reference_images: ["input/anchor.png", "input/r1.png"] };
    const action = new GraphBuilder({});
    instantiateAction(t2i, p, FACTS, action, "probe-t2i-refs");
    const enc = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).find(
      (n) => n.class_type === "TextEncodeQwenImage21",
    );
    assert.ok(enc, "the t2i lane rides the same encoder class");
    const inputs = enc!.inputs ?? {};
    // t2i carries NO anchor slot: the refs own image_1..N contiguous,
    // no gaps (the executor's dynamic-path split nests them — a bare
    // image_N kwarg dies)
    assert.ok("images.image_1" in inputs, "ref 1 rides the dotted key image_1");
    assert.ok("images.image_2" in inputs, "ref 2 rides the dotted key image_2");
    assert.ok(!("images.image_3" in inputs), "no gap key past the stated refs");
    // the refs are per-slot LoadImage anchors (not bare strings)
    const loads = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>)
      .filter((n) => n.class_type === "LoadImage")
      .map((n) => n.inputs?.image);
    assert.deepEqual(loads, ["input/anchor.png", "input/r1.png"], "each stated ref mints its own LoadImage");
    // and the encoder's vae seam rides with the refs (the splice law)
    assert.ok("vae" in inputs, "the encoder carries the vae splice when refs ride");
  });

  it("the autogrow law byte-stable across the blank-ref filter (a '' ref rides nothing, never a gap)", () => {
    const clean = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, reference_images: ["input/a.png", "input/b.png"] }, FACTS, clean, "probe-blank");
    const blanked = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, reference_images: ["input/a.png", "", "input/b.png"] }, FACTS, blanked, "probe-blank");
    assert.deepEqual(blanked.toJSON(), clean.toJSON(), "a blank ref filters out — the composed graph is byte-identical");
  });

  it("the golden holds on the sampling-shift arm (the AuraFlow wrap)", () => {
    const shifted: ModelFacts = { ...FACTS, lane_inputs: { ...FACTS.lane_inputs, sampling_shift: 3 } };
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, shifted, action, "probe-shift");
    assertGraphGolden(golden("the-golden-holds-on-the-sampling-shift-arm-the-auraflow-wrap"), graphOf(action), "the golden holds on the sampling-shift arm (the AuraFlow wrap)");
    assert.ok(
      Object.values(action.toJSON() as Record<string, { class_type?: string }>).some((n) => n.class_type === "ModelSamplingAuraFlow"),
      "the shift arm wraps the unet",
    );
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

  it("an absent negative_prompt composes the empty string — and stays byte-equal to the legacy arm", () => {
    const { negative_prompt: _drop, ...noNeg } = PARAMS;
    const action = new GraphBuilder({});
    instantiateAction(t2i, noNeg, FACTS, action, "probe-noneg");
    assertGraphGolden(golden("an-absent-negative-prompt-composes-the-empty-stri-471d834b76"), graphOf(action), "an absent negative_prompt composes the empty string — and stays byte-equal to the legacy arm");
    const enc = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).find(
      (n) => n.class_type === "TextEncodeQwenImage21",
    )!;
    assert.equal(enc.inputs?.negative_prompt, "");
  });
});

describe("the t2i facts door (closed-set drift refuses loud)", () => {
  it("the RESOLVED merge parses green: the bf16 variant's lane_inputs override rides", () => {
    const facts = parseT2IFacts({
      ...FACTS.lane_inputs,
      unet: "qwen_image_2.1_bf16.safetensors",
      text_encoder: "qwen3vl_8b_bf16.safetensors",
    });
    assert.equal(facts.unet, "qwen_image_2.1_bf16.safetensors");
    assert.equal(facts.text_encode_node, "TextEncodeQwenImage21");
  });

  it("a shift-less facts row parses green (the shift stays optional)", () => {
    const facts = parseT2IFacts({ ...FACTS.lane_inputs, sampling_shift: undefined });
    assert.equal(facts.sampling_shift, undefined);
  });

  it("an unknown encoder class refuses — never a silent stock-lane route", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, text_encode_node: "CLIPTextEncode" }),
      /text_encode_node.*TextEncodeQwenImage21/,
    );
  });

  it("a missing weight string refuses field-named", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, unet: undefined }),
      /lane_inputs\.unet.*non-empty string/,
    );
  });

  it("an empty weight string refuses (the blank arm)", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, vae: "" }),
      /lane_inputs\.vae.*non-empty string/,
    );
  });

  it("a non-number sampling_shift refuses", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, sampling_shift: "3" }),
      /lane_inputs\.sampling_shift.*a number is required/,
    );
  });
});
