// @melite/models-trellis2-native — THE TRELLIS MESH LAWS, at the lane's new home (the kit-arm retirement, 2026-09-30). The lane is this family's declared
// action; these cases moved with it out of the card kit, where they
// called the arm directly. The wire is pinned to committed goldens in
// action.spec.ts; these cases pin the LAWS that shape it.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { mesh } from "../src/actions.ts";
import { DECL } from "../src/index.ts";

const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS = {
  id: DECL.id,
  card: "img-to-mesh",
  defaults: {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
  lane_inputs: (DECL as { lane_inputs: Record<string, unknown> }).lane_inputs,
} as unknown as ModelFacts;

const dump = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;
const classes = (row: Record<string, { class_type: string }>): string[] => Object.values(row).map((n) => n.class_type);

describe("the trellis2-native mesh lane (the arm cases the kit wall used)", () => {
  it("the trellis arm builds (the crop eats the photo)", () => {
    const base = {
      input_image: "/m/p.png", resolution: "1024",
      atlas_size: "2048", ao_size: "512", normal_size: "1024",
      override_shape: 0.769, rescale_shape: 0.5, override_struct: 0.667,
      rescale_struct: 0.7, sd3_shift: 5, seed: 3, steps: 12, cfg: 7.5,
      shape_steps: 20, shape_cfg: 7.5, tex1_steps: 12, tex1_cfg: 7.5,
      tex2_steps: 12, tex2_cfg: 1, remesh_resolution: 768,
      decimate_faces: 70000, smooth_angle: 180,
      struct_sampler: "euler", struct_scheduler: "normal",
      shape_sampler: "euler", shape_scheduler: "normal",
      tex1_sampler: "euler", tex1_scheduler: "simple",
      tex2_sampler: "euler", tex2_scheduler: "normal",
    };
    const g1 = new GraphBuilder();
    instantiateAction(mesh, base, FACTS, g1, "probe-mesh-law");
    const on = dump(g1);
    assert.ok(classes(on).includes("ImageCropToMask"), "the shared crop rides");
    assert.ok(!classes(on).includes("MaskToImage"), "no mask bridge");
    assert.equal(on["Trellis2UpsampleStage.0"]?.inputs.target_resolution, 1024);
    assert.equal(typeof on["UnwrapMesh.0"]?.inputs.resolution, "number");
    assert.equal(typeof on["BakeTextureFromVoxel.0"]?.inputs.texture_size, "number");
    assert.equal(typeof on["BakeAmbientOcclusion.0"]?.inputs.resolution, "number");
    assert.equal(typeof on["BakeNormalMapFromMesh.0"]?.inputs.resolution, "number");
  });

  // THE SWEEP CATCH (beyond the independent audit's two gaps):
  // img-to-mesh seats input_image, so a producer CAN wire into a
  // lift — the arm used to build LoadImage unconditionally and ROW-4
  // refused the link at merge. Now the spell rides verbatim.
  it("THE SPELL ARM: a spelled image builds no loader — the spell rides conditioning verbatim", () => {
    const tBase = {
      input_image: "$src", resolution: "1024",
      atlas_size: "2048", ao_size: "512", normal_size: "1024",
      override_shape: 0.769, rescale_shape: 0.5, override_struct: 0.667,
      rescale_struct: 0.7, sd3_shift: 5, seed: 3, steps: 12, cfg: 7.5,
      shape_steps: 20, shape_cfg: 7.5, tex1_steps: 12, tex1_cfg: 7.5,
      tex2_steps: 12, tex2_cfg: 1, remesh_resolution: 768,
      decimate_faces: 70000, smooth_angle: 180,
      struct_sampler: "euler", struct_scheduler: "normal",
      shape_sampler: "euler", shape_scheduler: "normal",
      tex1_sampler: "euler", tex1_scheduler: "simple",
      tex2_sampler: "euler", tex2_scheduler: "normal",
    };
    const g = new GraphBuilder();
    instantiateAction(mesh, tBase, FACTS, g, "probe-mesh-spell");
    const row = dump(g);
    assert.ok(!classes(row).includes("LoadImage"), "no loader carries the spell on trellis");
    const crop = Object.values(row).find((n) => n.class_type === "ImageCropToMask")!;
    assert.equal(crop.inputs.images, "$src", "the spell rides the lane verbatim — the crop eats it");
    const cond = Object.values(row).find((n) => n.class_type === "Trellis2Conditioning")!;
    assert.ok(String(cond.inputs.image).startsWith("ImageCropToMask."), "the conditioning rides the shared crop");
  });

// THE CLOSED-SET ADMISSION, at the lane's new home (the kit-arm
  // retirement, 2026-09-30): the refusals the kit's shared gate used to
  // raise, now raised by this family's own admission slice.
  it("the closed-set refusals name the closed set (resolution, bg, bake sizes)", () => {
    // the seed rides because the action reads it BEFORE its admission
    // (GATE S: -1 mints, below -1 refuses) — a doc without one never
    // reaches the closed sets
    const base = {
      input_image: "/m/p.png", resolution: "1024",
      atlas_size: "2048", ao_size: "512", normal_size: "1024", seed: 3,
    };
    assert.throws(() => instantiateAction(mesh, { ...base, resolution: "999" }, FACTS, new GraphBuilder(), "x"),
      /resolution "999" is not one of 1024\|1536/);
    assert.throws(() => instantiateAction(mesh, { ...base, ao_size: "77" }, FACTS, new GraphBuilder(), "x"),
      /ao_size "77" is not one of 512\|1024/);
    assert.throws(() => instantiateAction(mesh, { ...base, input_image: "   " }, FACTS, new GraphBuilder(), "x"),
      /required param 'input_image' \(Source image\) missing/);
    // the fov gate belongs to pixal, never to this family
    instantiateAction(mesh, { ...base, camera_fov: "12" }, FACTS, new GraphBuilder(), "x");
  });

  // (the missing-tests audit #6, 2026-11-06) bg_removal appeared in
  // ZERO test files across the mesh families — the explicit-value
  // arms and the closed-set refusal were dead in every pool.
  it("bg_removal admits its explicit values and refuses outside the closed set (verbatim voice)", () => {
    const base = {
      input_image: "/m/p.png", resolution: "1024",
      atlas_size: "2048", ao_size: "512", normal_size: "1024", seed: 3,
    };
    for (const bg of ["auto", "on", "off"]) {
      // an explicit value composes (the || fallback's present side)
      instantiateAction(mesh, { ...base, bg_removal: bg }, FACTS, new GraphBuilder(), "x");
    }
    assert.throws(() => instantiateAction(mesh, { ...base, bg_removal: "bogus" }, FACTS, new GraphBuilder(), "x"),
      /bg_removal "bogus" is not one of auto\|on\|off — birefnet either cuts or it doesn't/);
    // absent falls to 'auto' (the || fallback's absent side) — composes
    instantiateAction(mesh, { ...base }, FACTS, new GraphBuilder(), "x");
  });
});
