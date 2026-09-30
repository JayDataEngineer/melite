// The atom's own proof (the atom vocabulary, stroke 3): the kimodo
// compose action's serialized prompt is BYTE-IDENTICAL to the
// legacy motionLane on the same doc — the card's binding change
// moves no wire. The DECL's lane_inputs are the facts door
// (model_path — the Kimodo load key); a missing path refuses
// field-named. GATE S rides the declared seed-sentinel param.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { motionLane, instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
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

describe("the kimodo compose action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy lane (explicit seed — the sentinel passes through)", () => {
    const legacy = new GraphBuilder({});
    motionLane({ ...PARAMS }, FACTS, legacy);
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS }, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(poseOf(action).inputs.seed, 42, "the explicit seed rides verbatim");
    assert.equal(
      Object.values(action.toJSON() as Record<string, { class_type: string }>).some((n) => n.class_type === "RaySomaxBake"),
      false,
      "no preview GLB stated — no bake node",
    );
  });

  it("byte equality holds on the preview-bake branch (a rigged GLB skins the motion)", () => {
    const p = { ...PARAMS, seed: 7, preview_glb: "/models/chars/hero.glb" };
    const legacy = new GraphBuilder({});
    motionLane({ ...p }, FACTS, legacy);
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-bake");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    const bake = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "RaySomaxBake",
    )!;
    assert.equal((bake.inputs as { fps: number }).fps, 30, "the bake fps is the lane-internal constant");
  });

  it("byte equality holds on the chain branch (a padded multi-segment trio strips before wiring)", () => {
    const p = { ...PARAMS, motion_npz: "/out/prev.npz", motion_prompts: "  waves  ", motion_constraints: "  left_foot:ground  " };
    const legacy = new GraphBuilder({});
    motionLane({ ...p }, FACTS, legacy);
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-chain");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
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
      /kimodo compose: lane_inputs\.model_path = "" — a non-empty string is required/,
    );
    assert.equal(parseKimodoFacts(FACTS.lane_inputs as never).model_path, "Kimodo-SOMA-RP-v1.1", "the DECL's own row parses clean");
  });
});
