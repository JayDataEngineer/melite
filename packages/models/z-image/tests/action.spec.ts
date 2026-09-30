// the wire is pinned to a COMMITTED GOLDEN — recorded while the kit's legacy
// imageT2I still existed and this spec compared the two arms byte-for-byte.
// That arm is deleted (the families own their lanes now), so the golden
// carries the compatibility law. The ip-adapter gate refuses through
// instantiateAction. The interpreter's own contract walls live in card-kit's
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
// lane_inputs (shift 3 — the default graph wraps AuraFlow) on a
// minimal family row (mods = the DECL's own boarding).
const laneInputs = DECL.lane_inputs;
assert.ok(laneInputs, "the z-image DECL declares lane_inputs");
// The facts row carries pack NAMES (ModelFacts.mods is string[]);
// the DECL's marriage members narrow to their pack at the splice.
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
assert.ok((FACTS.mods ?? []).includes("controlnet"), "z-image boards the controlnet pack");

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
  it("the composed prompt is the committed golden arm (the default row wraps AuraFlow)", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-arm-t-15abd457f5"), graphOf(action), "the composed prompt is the committed golden arm (the default row wraps AuraFlow)");
    const wrap = Object.values(action.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>).find(
      (n) => n.class_type === "ModelSamplingAuraFlow",
    )!;
    assert.equal(wrap.inputs?.shift, 3, "the default row's shift 3 rides");
  });

  it("the golden holds on the FIRED controlnets arm (the mod plane's stack, advanced-parameter vocabulary)", () => {
    // The fired shape from the mod plane's own law: a stated entry
    // with type + weight file + conditioning artifact, full
    // schedule (start 0, end 1 — the node carries no start/end
    // inputs). Both routes ride the same mod-level firing gate +
    // stack; the family boards the pack, the action delegates.
    const fired = {
      ...PARAMS,
      controlnets: [{ type: "depth", model: "z_image_depth.safetensors", artifact: "asset:1", strength: 1.0 }],
    };
    const action = new GraphBuilder({});
    instantiateAction(t2i, fired, FACTS, action, "probe-cn");
    assertGraphGolden(golden("the-golden-holds-on-the-fired-controlnets-arm-the-00f323b7d4"), graphOf(action), "the golden holds on the FIRED controlnets arm (the mod plane's stack, advanced-parameter vocabulary)");
    assert.ok(
      Object.values(action.toJSON() as Record<string, { class_type?: string }>).some((n) => n.class_type === "ZImageFunControlnet"),
      "the fired entry stacks the z-image controlnet node",
    );
  });

  it("the golden holds on the shift-INERT arm (a 0 row composes no AuraFlow node)", () => {
    // z-image's own row spells 3 (the wrap rides by default); this
    // arm pins the inert half — 0 is present-and-falsy, the wrap
    // never builds, and the legacy arm agrees byte-for-byte.
    const inert: ModelFacts = { ...FACTS, lane_inputs: { ...FACTS.lane_inputs, sampling_shift: 0 } };
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, inert, action, "probe-inert");
    assertGraphGolden(golden("the-golden-holds-on-the-shift-inert-arm-a-0-row-c-d3350bbf83"), graphOf(action), "the golden holds on the shift-INERT arm (a 0 row composes no AuraFlow node)");
    assert.ok(
      !Object.values(action.toJSON() as Record<string, { class_type?: string }>).some((n) => n.class_type === "ModelSamplingAuraFlow"),
      "shift 0 builds no wrap",
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
      () => parseT2IFacts({ ...FACTS.lane_inputs, latent_node: "EmptyLatentImage" }),
      /latent_node.*EmptySD3LatentImage/,
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
      () => parseT2IFacts({ ...FACTS.lane_inputs, sampling_shift: "3" }),
      /lane_inputs\.sampling_shift.*a number is required/,
    );
  });
});

describe("the mod-plane gates refuse THROUGH the action (loud, not silent)", () => {
  it("an ip_adapters bag refuses at compose — no t2i segment builds it in this plane", () => {
    const fired = { ...PARAMS, ip_adapters: [{ kind: "style" }] };
    assert.throws(
      () => instantiateAction(t2i, fired, FACTS, new GraphBuilder({}), "r"),
      /ip_adapters .* refuses: no executable IP-Adapter lane exists/,
    );
  });
});
