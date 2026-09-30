// The atom's own proof (the atom vocabulary, stroke 3): the
// trellis2-native mesh action's serialized prompt is BYTE-IDENTICAL
// to the legacy trellisArm on the same doc — the card's binding
// change moves no wire. The DECL's lane_inputs are the facts door
// (the lift chain's five load keys); a missing key refuses
// field-named. GATE S rides the declared seed-sentinel param.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { trellisArm, admitMeshLift, instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { mesh, parseMeshFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "img-to-mesh",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
};

// The family's mesh knobs (the DECL defaults — the compose-door
// cascade overlays these onto the doc).
const PARAMS = {
  input_image: "/in/sneaker.png",
  seed: 42,
  resolution: "1536",
  bg_removal: "auto",
  steps: 12,
  cfg: 7.5,
  shape_steps: 20,
  shape_cfg: 7.5,
  tex1_steps: 12,
  tex1_cfg: 7.5,
  tex2_steps: 12,
  tex2_cfg: 1,
  remesh_resolution: 768,
  decimate_faces: 700000,
  smooth_angle: 180,
  atlas_size: "4096",
  ao_size: "1024",
  normal_size: "2048",
  struct_sampler: "euler",
  struct_scheduler: "normal",
  shape_sampler: "euler",
  shape_scheduler: "normal",
  tex1_sampler: "euler",
  tex1_scheduler: "simple",
  tex2_sampler: "euler",
  tex2_scheduler: "normal",
  sd3_shift: 5,
  rescale_struct: 0.7,
  rescale_shape: 0.5,
  override_struct: 0.667,
  override_shape: 0.769,
};

/** The card's legacy fallback body (the oracle the action must
 * match byte-for-byte). */
function legacyTrellis(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder): void {
  admitMeshLift(p, model);
  trellisArm(g, p, model);
}

const nodesOf = (g: GraphBuilder, cls: string): Array<Record<string, unknown>> =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).filter(
    (n) => n.class_type === cls,
  );

describe("the trellis2-native mesh action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy arm (DINOv3 conditioning; birefnet cuts the background)", () => {
    const legacy = new GraphBuilder({});
    legacyTrellis({ ...PARAMS }, FACTS, legacy);
    const action = new GraphBuilder({});
    instantiateAction(mesh, { ...PARAMS }, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(nodesOf(action, "Trellis2Conditioning").length, 1, "the image IS the prompt");
    assert.equal(nodesOf(action, "Pixal3DConditioning").length, 0, "the pixal camera pass never rides trellis");
    assert.equal(nodesOf(action, "RemoveBackground").length, 1, "birefnet cuts the background");
    const save = nodesOf(action, "Save3DAdvanced")[0] as { inputs: { filename_prefix: string } };
    assert.equal(save.inputs.filename_prefix, "trellis2_native", "the family prefix is a constant, unstamped by run");
  });

  it("byte equality holds on the bg-off branch (a pre-cleaned image feeds conditioning straight)", () => {
    const p = { ...PARAMS, seed: 7, bg_removal: "off", resolution: "1024", atlas_size: "2048" };
    const legacy = new GraphBuilder({});
    legacyTrellis({ ...p }, FACTS, legacy);
    const action = new GraphBuilder({});
    instantiateAction(mesh, { ...p }, FACTS, action, "probe-off");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(nodesOf(action, "RemoveBackground").length, 0, "no cut stated");
  });

  it("byte equality holds on a wired-tensor anchor ('$spell' — the image IS an upstream stage's output)", () => {
    const p = { ...PARAMS, input_image: "$spell.img" };
    const legacy = new GraphBuilder({});
    legacyTrellis({ ...p }, FACTS, legacy);
    const action = new GraphBuilder({});
    instantiateAction(mesh, { ...p }, FACTS, action, "probe-spell");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(nodesOf(action, "LoadImage").length, 0, "a spelled tensor never builds a loader");
  });

  it("GATE S — seed -1 mints ONCE per compose and feeds every sampler the same take", () => {
    const a = new GraphBuilder({});
    instantiateAction(mesh, { ...PARAMS, seed: -1 }, FACTS, a, "probe-mint");
    const seeds = nodesOf(a, "KSampler").map((n) => (n as { inputs: { seed: number } }).inputs.seed);
    assert.equal(new Set(seeds).size, 1, "one mint, one take");
    assert.notEqual(seeds[0], -1, "the sentinel minted a concrete seed");
  });

  it("an absent source image validates through the coercion arm and refuses (the image admission)", () => {
    const p = { ...PARAMS };
    delete (p as Record<string, unknown>).input_image;
    assert.throws(
      () => instantiateAction(mesh, { ...p }, FACTS, new GraphBuilder({}), "probe-img"),
      /required param 'input_image' \(Source image\) missing on the img-to-mesh card/,
    );
  });

  it("the facts door refuses a missing load key field-named (never loads an empty directory)", () => {
    const broken = { ...FACTS, lane_inputs: { ...FACTS.lane_inputs, texture_vae: "" } };
    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS }, broken, new GraphBuilder({}), "probe-door"),
      /trellis2-native mesh: lane_inputs\.texture_vae = "" — a non-empty string is required/,
    );
    assert.equal(parseMeshFacts(FACTS.lane_inputs as never).clip_vision, "dino_v3_L_naf_fp32.safetensors", "the DECL's own row parses clean");
  });

  it("byte equality holds with the bg key absent (the admission's own coercion — auto default)", () => {
    const p = { ...PARAMS };
    delete (p as Record<string, unknown>).bg_removal;
    const legacy = new GraphBuilder({});
    legacyTrellis({ ...p }, FACTS, legacy);
    const action = new GraphBuilder({});
    instantiateAction(mesh, { ...p }, FACTS, action, "probe-coerce");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(nodesOf(action, "RemoveBackground").length, 1, "absent bg coerces to auto — the cut rides");
  });

  it("the family's admission slice refuses a bg mode and bake size outside the closed sets", () => {
    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS, bg_removal: "maybe" }, FACTS, new GraphBuilder({}), "probe-bg"),
      /bg_removal "maybe" is not one of auto\|on\|off/,
    );
    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS, ao_size: "2048" }, FACTS, new GraphBuilder({}), "probe-ao"),
      /ao_size "2048" is not one of 512\|1024 — the bake-size table is closed/,
    );
  });

  it("the family's admission slice refuses a resolution outside the family routes (the live node would take it — the card won't)", () => {
    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS, resolution: "2048" }, FACTS, new GraphBuilder({}), "probe-res-bad"),
      /resolution "2048" is not one of 1024\|1536 — the variant table is closed/,
    );
  });
});
