// The atom's own proof (the atom vocabulary, stroke 3): the pixal3d
// mesh action's serialized prompt is BYTE-IDENTICAL to the legacy
// pixalArm on the same doc — the card's binding change moves no
// wire. The DECL's lane_inputs are the facts door (the lift chain's
// five load keys); a missing key refuses field-named, never
// composes a loader on an empty directory. GATE S rides the
// declared seed-sentinel param (the mint feeds all five KSamplers).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import { join } from "node:path";
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
  resolution: "1024",
  bg_removal: "auto",
  camera_fov: "auto",
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

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);

const nodesOf = (g: GraphBuilder, cls: string): Array<Record<string, unknown>> =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).filter(
    (n) => n.class_type === cls,
  );

describe("the pixal3d mesh action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (fov auto — the MoGe pass infers the camera; bg auto — birefnet cuts)", () => {
    const action = new GraphBuilder({});
    instantiateAction(mesh, { ...PARAMS }, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-fov-auto-the-mog"), action.toJSON(), "the composed prompt is the committed golden (fov auto — the MoGe pass infers the camera; bg auto — birefnet cuts)");
    assert.equal(nodesOf(action, "LoadMoGeModel").length, 1, "the MoGe weight literal rides the auto branch");
    assert.equal(nodesOf(action, "RemoveBackground").length, 1, "birefnet cuts the background");
    assert.equal(nodesOf(action, "Save3DAdvanced").length, 1, "the textured glb persists");
    const save = nodesOf(action, "Save3DAdvanced")[0] as { inputs: { filename_prefix: string } };
    assert.equal(save.inputs.filename_prefix, "pixal3d", "the family prefix is a constant, unstamped by run");  });

  it("the golden holds on the vouched-camera branch (fov 60 — MoGe skipped) with bg off (no cut)", () => {

    const p = { ...PARAMS, seed: 7, camera_fov: "60", bg_removal: "off" };
    const action = new GraphBuilder({});
    instantiateAction(mesh, { ...p }, FACTS, action, "probe-fov");
    assertGraphGolden(golden("the-golden-holds-on-the-vouched-camera-branch-fov-60-moge-sk"), action.toJSON(), "the golden holds on the vouched-camera branch (fov 60 — MoGe skipped) with bg off (no cut)");
    assert.equal(nodesOf(action, "MoGeInference").length, 0, "a literal degree skips the depth pass");
    assert.equal(nodesOf(action, "RemoveBackground").length, 0, "bg off feeds the image straight to conditioning");
    const cond = nodesOf(action, "Pixal3DConditioning")[0] as { inputs: { camera_angle_x: number } };
    assert.equal(cond.inputs.camera_angle_x, 60, "the operator-vouched degree rides verbatim");  });

  it("the golden holds on a wired-tensor anchor ('$spell' — the image IS an upstream stage's output)", () => {

    const p = { ...PARAMS, input_image: "$spell.img" };
    const action = new GraphBuilder({});
    instantiateAction(mesh, { ...p }, FACTS, action, "probe-spell");
    assertGraphGolden(golden("the-golden-holds-on-a-wired-tensor-anchor-spell-the-image-is"), action.toJSON(), "the golden holds on a wired-tensor anchor ('$spell' — the image IS an upstream stage's output)");
    assert.equal(nodesOf(action, "LoadImage").length, 0, "a spelled tensor never builds a loader");  });

  it("GATE S — seed -1 mints ONCE per compose and feeds every sampler the same take", () => {

    const a = new GraphBuilder({});
    instantiateAction(mesh, { ...PARAMS, seed: -1 }, FACTS, a, "probe-mint");
    const seeds = nodesOf(a, "KSampler").map((n) => (n as { inputs: { seed: number } }).inputs.seed);
    assert.equal(new Set(seeds).size, 1, "one mint, one take — the five samplers share it");
    assert.notEqual(seeds[0], -1, "the sentinel minted a concrete seed");
    const b = new GraphBuilder({});
    instantiateAction(mesh, { ...PARAMS, seed: -1 }, FACTS, b, "probe-mint-b");
    assert.notEqual(seeds[0], (nodesOf(b, "KSampler")[0] as { inputs: { seed: number } }).inputs.seed, "two -1 runs differ");  });

  it("the facts door refuses a missing load key field-named (never loads an empty directory)", () => {

    const broken = { ...FACTS, lane_inputs: { ...FACTS.lane_inputs, unet: "" } };
    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS }, broken, new GraphBuilder({}), "probe-door"),
      /^Error: pixal3d mesh: lane_inputs\.unet = "" — a non-empty string is required$/
    );
    assert.equal(parseMeshFacts(FACTS.lane_inputs as never).unet, "pixal3d_int8_convrot.safetensors", "the DECL's own row parses clean");  });

  it("the family's admission slice refuses every closed-set drift loud (image, resolution, bg, bake sizes)", () => {

    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS, input_image: "  " }, FACTS, new GraphBuilder({}), "probe-img"),
      /required param 'input_image' \(Source image\) missing on the img-to-mesh card/,
    );
    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS, input_image: "" }, FACTS, new GraphBuilder({}), "probe-img"),
      /required param 'input_image' \(Source image\) missing on the img-to-mesh card/,
    );
    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS, resolution: "2048" }, FACTS, new GraphBuilder({}), "probe-res"),
      /resolution "2048" is not one of 1024\|1536 — the variant table is closed/,
    );
    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS, bg_removal: "maybe" }, FACTS, new GraphBuilder({}), "probe-bg"),
      /bg_removal "maybe" is not one of auto\|on\|off/,
    );
    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS, atlas_size: "8192" }, FACTS, new GraphBuilder({}), "probe-atlas"),
      /atlas_size "8192" is not one of 2048\|4096 — the bake-size table is closed/,
    );  });

  it("the golden holds with the bg key absent (the admission's coercion — auto default; the arm reads the raw doc, so the cut rides)", () => {

    const p = { ...PARAMS };
    delete (p as Record<string, unknown>).bg_removal;
    const action = new GraphBuilder({});
    instantiateAction(mesh, { ...p }, FACTS, action, "probe-coerce");
    assertGraphGolden(golden("the-golden-holds-with-the-bg-key-absent-the-admission-s-coer"), action.toJSON(), "the golden holds with the bg key absent (the admission's coercion — auto default; the arm reads the raw doc, so the cut rides)");
    assert.equal(nodesOf(action, "RemoveBackground").length, 1, "absent bg coerces to auto — the cut rides");  });

  it("an absent camera_fov validates as auto (the coercion arm) while a later closed-set drift still refuses", () => {

    // the compose-door cascade always supplies camera_fov from the
    // row defaults — absence reaches admission only, whose coercion
    // reads auto; the arm below never composes a NaN degree.
    const p = { ...PARAMS, camera_fov: undefined, atlas_size: "8192" };
    assert.throws(
      () => instantiateAction(mesh, { ...p }, FACTS, new GraphBuilder({}), "probe-coerce-fov"),
      /atlas_size "8192" is not one of 2048\|4096 — the bake-size table is closed/,
    );  });

  it("the family's admission slice refuses a camera_fov outside the closed set (never in the schema)", () => {

    assert.throws(
      () => instantiateAction(mesh, { ...PARAMS, camera_fov: "45" }, FACTS, new GraphBuilder({}), "probe-fov-bad"),
      /camera_fov "45" is not one of auto\|35\|49\.13\|60\|75\|90 — pixal3d either lets MoGe infer \('auto'\) or the operator vouches a literal degree/,
    );  });
});
