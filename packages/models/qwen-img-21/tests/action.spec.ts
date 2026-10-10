// the wire is pinned to a COMMITTED GOLDEN — recorded while the kit's legacy
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
  it("the composed prompt is the committed golden arm (the plain path)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-arm-t-f241fab97f"), graphOf(action), "the composed prompt is the committed golden arm (the plain path)");
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

describe("the reference-guided arm (004/C4 — the knob and the read land together)", () => {
  it("a draft carrying a reference image composes a graph that consumes it", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, reference_images: ["refs/hero-front.png"] }, FACTS, action, "probe-ref");
    const graph = graphOf(action);
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21")!;
    // the read: the ref rides the encoder's own dotted autogrow slot
    assert.ok(
      Object.prototype.hasOwnProperty.call(enc.inputs, "images.image_1"),
      "the reference rides the images.image_1 slot",
    );
    assert.ok(enc.inputs.vae !== undefined, "the vae splices the reference into the sequence");
    // and the latent is the encoder's own third output (ref-sized)
    const sampler = Object.values(graph).find((n) => n.class_type === "KSampler")!;
    const latent = sampler.inputs.latent_image as [string, number];
    assert.ok(Array.isArray(latent), "the latent rides the ComfyUI wire form");
    assert.match(String(latent[0]), /TextEncodeQwenImage21/, "the latent comes from the encoder node");
    assert.equal(latent[1], 2, "the latent is the encoder's out(2)");
    assert.ok(
      !Object.values(graph).some((n) => n.class_type === "EmptyLatentImage"),
      "no empty latent on the reference arm (the reference sizes the canvas)",
    );
    assert.ok(
      Object.values(graph).some((n) => n.class_type === "LoadImage"),
      "a stated path loads through LoadImage",
    );
  });

  it("two references fill contiguous dotted slots, in list order", () => {
    const action = new GraphBuilder({});
    instantiateAction(
      t2i,
      { ...PARAMS, reference_images: ["refs/a.png", "refs/b.png"] },
      FACTS,
      action,
      "probe-two",
    );
    const enc = Object.values(graphOf(action)).find((n) => n.class_type === "TextEncodeQwenImage21")!;
    assert.ok(Object.prototype.hasOwnProperty.call(enc.inputs, "images.image_1"));
    assert.ok(Object.prototype.hasOwnProperty.call(enc.inputs, "images.image_2"));
    const slot = (k: string): [string, number] => enc.inputs[k] as [string, number];
    assert.ok(Array.isArray(slot("images.image_1")) && String(slot("images.image_1")[0]).startsWith("LoadImage"));
    assert.ok(Array.isArray(slot("images.image_2")) && String(slot("images.image_2")[0]).startsWith("LoadImage"));
    assert.notEqual(String(slot("images.image_1")[0]), String(slot("images.image_2")[0]), "each stated image maps to its own LoadImage");
  });

  it("a spelled reference rides verbatim — no LoadImage for a wired tensor", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, reference_images: ["$upstream.out"] }, FACTS, action, "probe-spell");
    const graph = graphOf(action);
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21")!;
    assert.equal(enc.inputs["images.image_1"], "$upstream.out");
    assert.ok(!Object.values(graph).some((n) => n.class_type === "LoadImage"), "a spell never loads");
  });

  it("an empty list stays the plain path — byte-equal to the no-knob draft", () => {
    const withEmpty = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, reference_images: [] }, FACTS, withEmpty, "probe");
    const without = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, without, "probe");
    assert.deepEqual(withEmpty.toJSON(), without.toJSON());
  });

  it("refs past the DECL cap refuse loud — never a quiet drop", () => {
    assert.throws(
      () =>
        instantiateAction(
          t2i,
          { ...PARAMS, reference_images: ["a.png", "b.png", "c.png", "d.png", "e.png"] },
          FACTS,
          new GraphBuilder({}),
          "probe-cap",
        ),
      /reference_images.*4 reference images.*never drops one quietly/,
    );
  });

  it("blank entries contribute no slot", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, reference_images: ["", "  "] }, FACTS, action, "probe-blank");
    const graph = graphOf(action);
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21")!;
    assert.ok(!Object.prototype.hasOwnProperty.call(enc.inputs, "images.image_1"), "blanks never occupy a slot");
    assert.ok(Object.values(graph).some((n) => n.class_type === "EmptyLatentImage"), "the plain path sizes the canvas");
  });

  it("a facts row without the cap refuses at the door (the DECL states it)", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, max_references: undefined }),
      /lane_inputs\.max_references.*a number ≥ 1 is required/,
    );
  });
});
