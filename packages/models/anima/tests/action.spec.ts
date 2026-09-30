// The atom's own proof (the atom vocabulary, stroke 2): the t2i
// action's serialized prompt is BYTE-IDENTICAL to the legacy
// imageT2I stock arm on the same resolved facts — and the mod
// plane refuses LOUD through instantiateAction: anima boards NO
// packs, so a smuggled loras or ip_adapters bag refuses at compose,
// never silently drops (the wall law — the calls stay even though
// the picks are always empty). The interpreter's own contract
// walls live in card-kit's tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { imageT2I, instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { t2i, parseT2IFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the DECL's own
// lane_inputs on a minimal family row (mods absent — anima boards
// nothing; the gates stay refusal-only seats).
const laneInputs = DECL.lane_inputs;
assert.ok(laneInputs, "the anima DECL declares lane_inputs");
assert.ok(DECL.mods === undefined, "anima boards no packs");
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

describe("the t2i action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy lane arm (the stock latent, shift 0)", () => {
    const legacy = new GraphBuilder({});
    imageT2I(PARAMS, FACTS, legacy, "probe");
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const nodes = Object.values(action.toJSON() as Record<string, { class_type?: string }>);
    assert.ok(nodes.some((n) => n.class_type === "EmptyLatentImage"), "the stock latent rides");
    assert.ok(
      !nodes.some((n) => n.class_type === "ModelSamplingAuraFlow"),
      "shift 0 is present-and-inert: no AuraFlow node",
    );
  });

  it("an absent negative_prompt composes the empty string — and stays byte-equal to the legacy arm", () => {
    const { negative_prompt: _drop, ...noNeg } = PARAMS;
    const legacy = new GraphBuilder({});
    imageT2I(noNeg, FACTS, legacy, "probe-noneg");
    const action = new GraphBuilder({});
    instantiateAction(t2i, noNeg, FACTS, action, "probe-noneg");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const neg = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).filter(
      (n) => n.class_type === "CLIPTextEncode",
    );
    assert.ok(neg.some((n) => n.inputs?.text === ""), "the negative arm composes the empty string");
  });

  it("byte equality holds on the sampling-shift arm (the AuraFlow wrap)", () => {
    // anima's own row spells 0 (inert); this arm pins the wrap the
    // lane grammar admits (the door takes any number).
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
    const seed = (g: GraphBuilder): unknown =>
      (g.toJSON() as Record<string, { inputs: Record<string, unknown> }>)["KSampler.0"]?.inputs.seed;
    const s1 = seed(g1);
    const s2 = seed(g2);
    assert.ok(typeof s1 === "number" && Number.isInteger(s1) && s1 >= 0, `minted a concrete int (got ${String(s1)})`);
    assert.ok(typeof s2 === "number" && s2 >= 0);
    assert.notEqual(s1, s2, "run-again under the sentinel mints fresh");
  });
});

describe("the t2i facts door (closed-set drift refuses loud)", () => {
  it("a drifted latent class refuses — never a silent topology route", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, latent_node: "EmptySD3LatentImage" }),
      /latent_node.*EmptyLatentImage/,
    );
  });

  it("a missing weight string refuses field-named", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, unet: undefined }),
      /lane_inputs\.unet.*non-empty string/,
    );
  });

  it("a non-number sampling_shift refuses", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, sampling_shift: "0" }),
      /lane_inputs\.sampling_shift.*a number is required/,
    );
  });
});

describe("the mod-plane gates refuse THROUGH the action (loud, not silent)", () => {
  it("a loras bag refuses at compose — anima boards no packs", () => {
    const fired = { ...PARAMS, loras: [{ name: "style.safetensors", strength: 1.0 }] };
    assert.throws(
      () => instantiateAction(t2i, fired, FACTS, new GraphBuilder({}), "r"),
      /does not board the 'loras' pack/,
    );
  });

  it("an ip_adapters bag refuses at compose — the boarding gate first (anima boards nothing)", () => {
    const fired = { ...PARAMS, ip_adapters: [{ kind: "style" }] };
    assert.throws(
      () => instantiateAction(t2i, fired, FACTS, new GraphBuilder({}), "r"),
      /does not board the 'ip_adapter' pack/,
    );
  });
});
