// action.spec.ts — the t2i atom's own conformance: every branch of
// the build (the bare template, the negative-seat refusal, the mod
// gates, the gen-detailer serve's two arms) composed through
// instantiateAction on the REAL facts row. The GPU e2e pins the same
// graph against the live engine; this spec owns the unit-tier
// branches (the fleet's per-family action.spec law, registry
// models-gen-detailer-serve).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { t2i, parseT2IFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the DECL's own
// lane_inputs on a minimal family row (mods = the DECL's own
// boarding, narrowed to pack names).
const laneInputs = DECL.lane_inputs;
assert.ok(laneInputs, "the h3-image DECL declares lane_inputs");
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "image-gen",
  defaults: {},
  lane_inputs: laneInputs,
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};
assert.ok((FACTS.mods ?? []).includes("mask"), "h3-image boards the mask pack");
assert.ok((FACTS.mods ?? []).includes("loras"), "h3-image boards the loras pack");

const PARAMS = {
  prompt: "a small red cube on a white field",
  width: 1024,
  height: 1024,
  seed: 7,
  steps: 6,
  cfg: 1,
  sampler: "euler",
  scheduler: "simple",
};

type Nodes = Record<string, { class_type: string; inputs: Record<string, unknown> }>;
const graphOf = (g: GraphBuilder): Nodes => g.toJSON() as never;
const byClass = (g: GraphBuilder, cls: string) => Object.entries(graphOf(g)).filter(([, n]) => n.class_type === cls);

describe("the t2i action — the official template's bare lane", () => {
  it("ONE conditioning node emits positive + canvas latent; the negative rides ConditioningZeroOut; NO vae key", () => {
    const g = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, g, "probe");
    const enc = byClass(g, "MiniMaxH3ImageConditioning");
    assert.equal(enc.length, 1, "exactly one H3 conditioning node");
    const inputs = enc[0]![1].inputs;
    assert.ok(!("vae" in inputs), "the bare t2i template wires NO vae (reference latents are the edit lane's law)");
    assert.equal(inputs.width, 1024, "the conditioning node carries the stated canvas");
    assert.equal(inputs.height, 1024);
    const zero = byClass(g, "ConditioningZeroOut");
    assert.equal(zero.length, 1, "the negative is the zeroed positive (distilled guidance at cfg 1)");
    const sampler = byClass(g, "KSampler")[0]!;
    const sIn = sampler[1].inputs;
    const encId = enc[0]![0];
    assert.deepEqual(sIn.positive, [encId, 0], "positive rides the conditioning's output 0");
    assert.deepEqual(sIn.negative, [zero[0]![0], 0], "negative is the ConditioningZeroOut output");
    assert.deepEqual(sIn.latent_image, [encId, 1], "the latent canvas is the conditioning's OWN output 1");
    assert.equal(sIn.steps, 6, "the official t2i recipe stamps steps 6");
    assert.equal(sIn.cfg, 1, "cfg 1 — distilled guidance");
    assert.equal(sIn.denoise, 1.0);
    const saved = byClass(g, "SaveImage")[0]!;
    assert.equal(saved[1].inputs.filename_prefix, "probe/gen", "the render saves under <run>/gen");
  });

  it("the lane has NO negative seat: a stated non-empty negative_prompt refuses LOUD, never drops", () => {
    assert.throws(
      () => instantiateAction(t2i, { ...PARAMS, negative_prompt: "blur" }, FACTS, new GraphBuilder({}), "r"),
      /negative_prompt stated on family 'h3-image'.*no negative seat.*Unstate it/s,
    );
  });

  it("an EMPTY negative_prompt composes (the null default's seat — only a stated value refuses)", () => {
    const g = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, negative_prompt: "" }, FACTS, g, "r-empty");
    assert.equal(byClass(g, "MiniMaxH3ImageConditioning").length, 1);
  });

  it("GATE S rides the declared rule: the sentinel -1 mints a concrete seed, two runs differ", () => {
    const g1 = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, seed: -1 }, FACTS, g1, "r-a");
    const g2 = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, seed: -1 }, FACTS, g2, "r-b");
    const seed = (g: GraphBuilder): unknown => byClass(g, "KSampler")[0]![1].inputs.seed;
    const s1 = seed(g1);
    const s2 = seed(g2);
    assert.ok(typeof s1 === "number" && Number.isInteger(s1) && s1 >= 0, `minted a concrete int (got ${String(s1)})`);
    assert.ok(typeof s2 === "number" && s2 >= 0);
    assert.notEqual(s1, s2, "run-again under the sentinel mints fresh");
  });
});

describe("the mod-plane gates refuse THROUGH the action (loud, not silent)", () => {
  it("an ip_adapters bag refuses at compose — the family boards no ip_adapter pack (smuggled drift, not a skip)", () => {
    assert.throws(
      () => instantiateAction(t2i, { ...PARAMS, ip_adapters: [{ kind: "style" }] }, FACTS, new GraphBuilder({}), "r"),
      /model 'h3-image' does not board the 'ip_adapter' pack/,
    );
  });

  it("a stated loras bag stacks LoraLoaderModelOnly ahead of the sampler (the boarded pack fires)", () => {
    const g = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, loras: [{ name: "ink-line.safetensors", strength: 0.8 }] }, FACTS, g, "r-lora");
    const lora = byClass(g, "LoraLoaderModelOnly");
    assert.equal(lora.length, 1, "the pick stacks exactly one model-only lora");
    assert.equal(lora[0]![1].inputs.lora_name, "ink-line.safetensors");
    assert.equal(lora[0]![1].inputs.strength_model, 0.8);
    const sampler = byClass(g, "KSampler")[0]!;
    assert.deepEqual(sampler[1].inputs.model, [lora[0]![0], 0], "the sampler rides the lora-wrapped model");
  });
});

// THE GEN DETAILER SERVE (operator 2026-11-09, "ANY model can
// inpaint, not just krea-2"): the two arms on THIS lane's own
// conditioning — the region is a delta, never a family privilege.
describe("the gen detailer serve — the region arm on the h3-image lane", () => {
  it("THE FRESH-GEN ARM: a stated mask rides DetailerForEach over the lane's own decoded frame, saved under gen", () => {
    const g = new GraphBuilder({});
    instantiateAction(t2i, { ...PARAMS, mask: [{ input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }, FACTS, g, "probe-region");
    const nodes = Object.values(graphOf(g));
    const detailer = nodes.find((n) => n.class_type === "DetailerForEach");
    assert.ok(detailer, "the stated region mints DetailerForEach (the generic tail serves this lane)");
    assert.ok(nodes.some((n) => n.class_type === "MaskToSEGS"), "the painted mask converts through MaskToSEGS");
    assert.match(String(detailer!.inputs.image), /^VAEDecode/, "the detailer reworks the lane's OWN decoded frame");
    const saved = nodes.find((n) => n.class_type === "SaveImage")!;
    assert.strictEqual(saved.inputs?.filename_prefix, "probe-region/gen", "the detailed image saves under the gen prefix");
  });

  it("THE PHOTO ARM: input_image + input_mask composes LoadImage→DetailerForEach and NO generation node exists", () => {
    const g = new GraphBuilder({});
    instantiateAction(
      t2i,
      { ...PARAMS, mask: [{ input_image: "/v1/assets/photo.png", input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" },
      FACTS,
      g,
      "probe-photo",
    );
    const nodes = Object.values(graphOf(g));
    const classes = nodes.map((n) => String(n.class_type));
    const load = nodes.find((n) => n.class_type === "LoadImage");
    assert.ok(load, "the stated base photograph loads (the pair's image half)");
    assert.strictEqual(load!.inputs.image, "/v1/assets/photo.png", "the base seat rides input_image");
    const detailer = nodes.find((n) => n.class_type === "DetailerForEach");
    assert.ok(detailer, "the pair mints the region detailer");
    assert.match(String(detailer!.inputs.image), /^LoadImage/, "DetailerForEach's image input is the LoadImage output (the photo is the base)");
    assert.ok(!classes.includes("KSampler"), "no KSampler node exists in the photo arm");
    assert.ok(!classes.some((c) => c.includes("Latent")), "no latent node exists in the photo arm");
    const saved = nodes.find((n) => n.class_type === "SaveImage")!;
    assert.strictEqual(saved.inputs?.filename_prefix, "probe-photo/gen", "the detailed photo saves under the gen prefix");
  });
});

describe("the t2i facts door (closed-set drift refuses loud)", () => {
  it("a drifted conditioning class refuses — never a silent topology route", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, text_encode_node: "CLIPTextEncode" }, FACTS),
      /text_encode_node.*MiniMaxH3ImageConditioning/,
    );
  });

  it("a missing unet weight string refuses field-named", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, unet: undefined }, FACTS),
      /lane_inputs\.unet.*non-empty string/,
    );
  });
});
