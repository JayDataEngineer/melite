// @melite/models-pixal3d — THE PIXAL MESH LAWS, at the lane's new home (the kit-arm retirement, 2026-09-30). The lane is this family's declared
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

describe("the pixal3d mesh lane (the arm cases the kit wall used)", () => {
  it("the pixal arm builds both fov arms (MoGe auto + the vouched literal)", () => {
    const base = {
      input_image: "/m/p.png", resolution: "1024",
      camera_fov: "auto",
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
    assert.ok(classes(dump(g1)).includes("LoadMoGeModel"), "auto fov rides MoGe");

    const g2 = new GraphBuilder();
    instantiateAction(mesh, { ...base, camera_fov: "49.13" }, FACTS, g2, "probe-mesh-law");
    const row = dump(g2);
    assert.ok(!classes(row).includes("LoadMoGeModel"), "the literal skips MoGe");
    const cond = Object.values(row).find((n) => n.class_type === "Pixal3DConditioning")!;
    assert.equal(cond.inputs.camera_angle_x, 49.13, "the vouched degree rides verbatim");
  });

// THE SPELL ARM, pixal half: a spelled image builds no loader, and the
  // crop reads the wired tensor verbatim.
  it("THE SPELL ARM: the pixal crop reads the wired tensor verbatim", () => {
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
    instantiateAction(mesh, { ...tBase, camera_fov: "49.13" }, FACTS, g, "probe-mesh-spell");
    const row = dump(g);
    assert.ok(!classes(row).includes("LoadImage"), "no loader carries the spell on pixal");
    const crop = Object.values(row).find((n) => n.class_type === "ImageCropToMask")!;
    assert.equal(crop.inputs.images, "$src", "the pixal crop reads the wired tensor verbatim");
  });

// THE PIXAL FOV GATE, at the lane's new home (the kit-arm retirement,
// 2026-09-30): camera_fov is this family's closed set.
  it("the camera_fov closed set refuses, and the other families never see it", () => {
    // the seed rides because the action reads it BEFORE its admission
    // (GATE S: -1 mints, below -1 refuses) — a doc without one never
    // reaches the closed sets
    const base = {
      input_image: "/m/p.png", resolution: "1024",
      atlas_size: "2048", ao_size: "512", normal_size: "1024", seed: 3,
    };
    assert.throws(() => instantiateAction(mesh, { ...base, camera_fov: "12" }, FACTS, new GraphBuilder(), "x"),
      /camera_fov "12" is not one of auto\|35\|49\.13\|60\|75\|90/);
    // an unstated fov falls to the schema pin (the || arm)
    instantiateAction(mesh, { ...base, camera_fov: "auto" }, FACTS, new GraphBuilder(), "x");
    const { camera_fov: _fov, ...noFov } = { ...base, camera_fov: "auto" };
    instantiateAction(mesh, noFov, FACTS, new GraphBuilder(), "x");
  });
});
