// the wire is pinned to a COMMITTED GOLDEN (recorded at the family's
// birth, 2026-11-07): the composed topology IS the official MOSS-Image
// template (the Comfy-Org MOSS workflow) — the loader trio over the
// moss tokenizer, the declared ModelSamplingAuraFlow shift, the
// CLIPTextEncode/ConditioningZeroOut negative branch, and the
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
    // and the guider consumes the WRAPPED model, never the raw unet
    // (the wire spells connections as [nodeId, outputIndex] handles)
    const guider = Object.values(graph).find((n) => n.class_type === "CFGGuider");
    assert.deepEqual(guider?.inputs.model, ["ModelSamplingAuraFlow.0", 0], "the guider samples through the shift wrap");
    // the inert spelling (the door's optional-shift contract): a
    // resolved row carrying no sampling_shift composes the bare unet
    const bare = new GraphBuilder({});
    const { sampling_shift: _omitted, ...noShift } = FACTS.lane_inputs as Record<string, unknown>;
    instantiateAction(t2i, PARAMS, { ...FACTS, lane_inputs: noShift } as ModelFacts, bare, "probe-no-shift");
    assert.equal(nodesOf(bare, "ModelSamplingAuraFlow"), 0, "no declared shift, no wrap");
    const bareGuider = Object.values(graphOf(bare)).find((n) => n.class_type === "CFGGuider");
    assert.deepEqual(bareGuider?.inputs.model, ["UNETLoader.0", 0], "the guider samples the raw unet");
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

  it("the sampling stack is the template's own — Flux2Scheduler, KSamplerSelect, CFGGuider, SamplerCustomAdvanced; no KSampler, no skip-layer arm", () => {
    const action = new GraphBuilder({});
    instantiateAction(t2i, PARAMS, FACTS, action, "probe-stack");
    for (const classType of ["Flux2Scheduler", "KSamplerSelect", "CFGGuider", "SamplerCustomAdvanced", "RandomNoise", "UNETLoader", "EmptyFlux2LatentImage"]) {
      assert.equal(nodesOf(action, classType), 1, `${classType} composes exactly once`);
    }
    assert.equal(nodesOf(action, "KSampler"), 0, "FLUX.2 sigmas ride the advanced sampler, never the stock KSampler");
    assert.equal(nodesOf(action, "SkipLayerGuidanceDiTSimple"), 0, "the optional skip-layer refinement is not on the declared surface");
  });

  it("a facts row with a drifted encoder refuses at the door (the DECL states it)", () => {
    assert.throws(
      () => parseT2IFacts({ ...FACTS.lane_inputs, text_encode_node: "TextEncodeQwenImage21" }),
      /moss-image t2i: lane_inputs\.text_encode_node = "TextEncodeQwenImage21" — the action builds on CLIPTextEncode/,
    );
  });
});
