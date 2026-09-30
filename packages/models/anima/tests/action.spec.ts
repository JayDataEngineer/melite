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

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the t2i action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden arm (the stock latent, shift 0)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-arm-t-10969721e7"), graphOf(action), "the composed prompt is the committed golden arm (the stock latent, shift 0)");
    const nodes = Object.values(action.toJSON() as Record<string, { class_type?: string }>);
    assert.ok(nodes.some((n) => n.class_type === "EmptyLatentImage"), "the stock latent rides");
    assert.ok(
      !nodes.some((n) => n.class_type === "ModelSamplingAuraFlow"),
      "shift 0 is present-and-inert: no AuraFlow node",
    );
  });

  it("an absent negative_prompt composes the empty string — and stays byte-equal to the legacy arm", () => {
    const { negative_prompt: _drop, ...noNeg } = PARAMS;
    const action = new GraphBuilder({});
    instantiateAction(t2i, noNeg, FACTS, action, "probe-noneg");
    assertGraphGolden(golden("an-absent-negative-prompt-composes-the-empty-stri-471d834b76"), graphOf(action), "an absent negative_prompt composes the empty string — and stays byte-equal to the legacy arm");
    const neg = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).filter(
      (n) => n.class_type === "CLIPTextEncode",
    );
    assert.ok(neg.some((n) => n.inputs?.text === ""), "the negative arm composes the empty string");
  });

  it("the golden holds on the sampling-shift arm (the AuraFlow wrap)", () => {
    // anima's own row spells 0 (inert); this arm pins the wrap the
    // lane grammar admits (the door takes any number).
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
