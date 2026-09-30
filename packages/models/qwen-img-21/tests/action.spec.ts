// The atom's own proof (the stroke-1 pilot): the t2i action's
// serialized prompt is BYTE-IDENTICAL to the legacy lane arm on the
// same resolved facts — the card's route change moves no wire — and
// the facts door refuses closed-set drift LOUD (an unknown encoder
// class never silently routes to a stock lane). The interpreter's
// own contract walls live in card-kit's tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { imageT2I, instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
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

describe("the t2i action — byte-stability (the pilot's compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy lane arm (the plain path)", () => {
    const legacy = new GraphBuilder({});
    imageT2I(PARAMS, FACTS, legacy, "probe");
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
  });

  it("byte equality holds on the sampling-shift arm (the AuraFlow wrap)", () => {
    const shifted: ModelFacts = { ...FACTS, lane_inputs: { ...FACTS.lane_inputs, sampling_shift: 3 } };
    const legacy = new GraphBuilder({});
    imageT2I(PARAMS, shifted, legacy, "probe-shift");
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, shifted, action, "probe-shift");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
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
    const legacy = new GraphBuilder({});
    imageT2I(noNeg, FACTS, legacy, "probe-noneg");
    const action = new GraphBuilder({});
    instantiateAction(t2i, noNeg, FACTS, action, "probe-noneg");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
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
