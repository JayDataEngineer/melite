// the wire is pinned to a COMMITTED GOLDEN — recorded while the kit's legacy
// motionLane still existed and this spec compared the two arms
// byte-for-byte. That arm is deleted (the families own their lanes now), so
// the golden carries the compatibility law. The DECL's lane_inputs are the
// facts door (model_path — the Kimodo load key); a missing path refuses
// field-named. GATE S rides the declared seed-sentinel param.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
import { DECL } from "../src/index.ts";
import { compose, parseKimodoFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "motion",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};

const PARAMS = {
  prompt: "walks forward slowly, then turns to look at the camera",
  seed: 42,
  duration_sec: 5,
  diffusion_steps: 25,
  num_samples: 1,
  num_transition_frames: 10,
  cfg_type: "separated",
  cfg_weight_a: 2.5,
  cfg_weight_b: 5,
};

const poseOf = (g: GraphBuilder): { inputs: Record<string, unknown> } =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
    (n) => n.class_type === "KimodoTextToPose",
  )!;

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the kimodo compose action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (explicit seed — the sentinel passes through)", () => {
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS }, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-explicit-seed-th"), graphOf(action), "the composed prompt is the committed golden (explicit seed — the sentinel passes through)");
    assert.equal(poseOf(action).inputs.seed, 42, "the explicit seed rides verbatim");
    assert.equal(
      Object.values(action.toJSON() as Record<string, { class_type: string }>).some((n) => n.class_type === "RaySomaxBake"),
      false,
      "no preview GLB stated — no bake node",
    );
  });

  it("the golden holds on the preview-bake branch (a rigged GLB skins the motion)", () => {
    const p = { ...PARAMS, seed: 7, preview_glb: "/models/chars/hero.glb" };
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-bake");
    assertGraphGolden(golden("the-golden-holds-on-the-preview-bake-branch-a-rigged-glb-ski"), graphOf(action), "the golden holds on the preview-bake branch (a rigged GLB skins the motion)");
    const bake = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "RaySomaxBake",
    )!;
    assert.equal((bake.inputs as { fps: number }).fps, 30, "the bake fps is the lane-internal constant");
  });

  it("the golden holds on the chain branch (a padded multi-segment trio strips before wiring)", () => {
    const p = { ...PARAMS, motion_npz: "/out/prev.npz", motion_prompts: "  waves  ", motion_constraints: "  left_foot:ground  " };
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-chain");
    assertGraphGolden(golden("the-golden-holds-on-the-chain-branch-a-padded-multi-segment-"), graphOf(action), "the golden holds on the chain branch (a padded multi-segment trio strips before wiring)");
    const inputs = poseOf(action).inputs as Record<string, string>;
    assert.equal(inputs.motion_prompts, "waves", "a padded prompt never reaches the node");
    assert.equal(inputs.motion_constraints, "left_foot:ground", "a padded constraint never reaches the node");
  });

  it("GATE S — seed -1 mints ONCE per compose; two runs differ (the sentinel's single mint)", () => {
    const a = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS, seed: -1 }, FACTS, a, "probe-mint-a");
    const b = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS, seed: -1 }, FACTS, b, "probe-mint-b");
    const seedA = poseOf(a).inputs.seed as number;
    const seedB = poseOf(b).inputs.seed as number;
    assert.notEqual(seedA, -1, "the sentinel minted a concrete seed");
    assert.notEqual(seedA, seedB, "two -1 runs differ (never a silent constant)");
  });

  it("the facts door refuses a missing model_path field-named (never loads an empty directory)", () => {
    const broken = { ...FACTS, lane_inputs: { ...FACTS.lane_inputs, model_path: "" } };
    assert.throws(
      () => instantiateAction(compose, { ...PARAMS }, broken, new GraphBuilder({}), "probe-door"),
      /^Error: kimodo compose: lane_inputs\.model_path = "" — a non-empty string is required$/
    );
    assert.equal(parseKimodoFacts(FACTS.lane_inputs as never).model_path, "Kimodo-SOMA-RP-v1.1", "the DECL's own row parses clean");
  });
});
