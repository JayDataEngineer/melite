// mesh-official-fidelity.spec.ts — THE IMG-TO-MESH FIDELITY WALL
// (the operator's live burn: "extreme low quality, when I supposed
// to follow the comfyui default workflow").
//
// THE TRUTH HOME is the official ComfyUI template
// (Comfy-Org/workflow_templates
// `templates/3d_pixal3d_trellis2_image_to_model.json` — the Pixal3D
// & TRELLIS.2 unified default; local copy:
// /home/user/tools/comfyui/.venv/lib/python3.14/site-packages/comfyui_workflow_templates_json/templates/).
// The OFFICIAL_* literals below are that template's own values
// (KSampler widget orders [seed, control, steps, cfg, sampler,
// scheduler, denoise]; upsample target; bake sizes incl. the
// PrimitiveInt-4096 texture_size override; the shared
// images=LoadImage crop). They are pinned literals because the
// upstream file is not vendored — the MELITE side of every arm
// rides the REAL doors (real DECL defaults through the real
// cascade, real action build through GraphBuilder), never a copy.
//
// What this wall caught (2026-10-27 session):
//   1. the default tier ran the 1024 upsample while the template
//      defaults 1536 — every default run sampled coarse geometry;
//   2. both arms conditioned on MaskToImage's white silhouette
//      instead of the cropped photo — DINOv3+NAF starved of
//      appearance, MoGe fed a depth-less blob (auto-FOV and the
//      projection matrices garbage out with it). The template has
//      NO MaskToImage node at all.
//   3. both arms fabricated the negative with ConditioningZeroOut
//      ([[zeros, {}]] — empty extras) instead of the conditioning's
//      own output 1 (zeros + the shared proj pack), which
//      ComfySwitchNode.315 routes as every pass's negative.
//   4. the OOM (2026-10-28): runs died at RemeshMesh with ~19 GiB
//      resident — NOT the default flow but hero_mesh stamps
//      (remesh 2048 + 2M faces) restored onto the bench. The
//      template remeshes at 768 + decimates to 700k; its UnwrapMesh
//      2048 widget is dead (the PrimitiveInt-4096 link wins), so
//      unwrap stays 4096 and is pinned against decouple-slop.
//
// Run: node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/mesh-official-fidelity.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "../../../../packages/engines/comfyui-card-kit/src/graph.ts";
import { instantiateAction } from "../../../../packages/engines/comfyui-card-kit/src/action.ts";
import type { ModelFacts } from "../../../../packages/engines/comfyui-card-kit/src/facts.ts";
import { DECL as PIXAL_DECL } from "../../../../packages/models/pixal3d/src/index.ts";
import { mesh as pixalMesh, parseMeshFacts as pixalFacts } from "../../../../packages/models/pixal3d/src/actions.ts";
import { DECL as TRELLIS_DECL } from "../../../../packages/models/trellis2-native/src/index.ts";
import { mesh as trellisMesh, parseMeshFacts as trellisFacts } from "../../../../packages/models/trellis2-native/src/actions.ts";

type Node = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, Node>;

// ── the official template's own values (see header) ──
const OFFICIAL = {
  upsampleTarget: 1536,
  struct: { steps: 12, cfg: 7.5, scheduler: "normal" },
  shape: { steps: 20, cfg: 7.5, scheduler: "normal" },
  shape1024: { steps: 12, cfg: 7.5, scheduler: "simple" },
  texture: { steps: 12, cfg: 1, scheduler: "normal" },
  sampler: "euler",
  rescaleShape: 0.5,
  rescaleStruct: 0.7,
  overrideShape: 0.769,
  overrideStruct: 0.667,
  sd3Shift: 5,
  structDecode: "32",
  bakeColor: 4096,
  unwrap: 4096,
  remesh: 768,
  decimate: 700000,
  bakeAO: 1024,
  bakeNormal: 2048,
  crop: { pad: 1.1, width: 1024, height: 1024, grow: 0, background: "#000000" },
} as const;

const FAMILIES = [
  {
    id: "pixal3d",
    DECL: PIXAL_DECL,
    mesh: pixalMesh,
    parseFacts: pixalFacts,
    conditioning: "Pixal3DConditioning",
    hasMoGe: true,
  },
  {
    id: "trellis2-native",
    DECL: TRELLIS_DECL,
    mesh: trellisMesh,
    parseFacts: trellisFacts,
    conditioning: "Trellis2Conditioning",
    hasMoGe: false,
  },
] as const;

function factsOf(DECL: { id: string; lane_inputs?: Record<string, unknown> }): ModelFacts {
  return {
    id: DECL.id,
    card: "img-to-mesh",
    defaults: {},
    lane_inputs: DECL.lane_inputs ?? {},
    variants: [],
    variant_groups: [],
    outputs: [],
  };
}

function nodesOf(g: Graph, cls: string): Array<{ id: string; node: Node }> {
  return Object.entries(g)
    .filter(([, n]) => n.class_type === cls)
    .map(([id, node]) => ({ id, node }));
}

function linkTarget(inputs: Record<string, unknown>, key: string): [string, number] | null {
  const v: unknown = inputs[key];
  return Array.isArray(v) && typeof v[0] === "string" && typeof v[1] === "number"
    ? [v[0] as string, v[1] as number]
    : null;
}

/** Compose the family's mesh action on the FAMILY DEFAULTS (the
 *  defaults-driven doc — resolution unstated, exactly what a fresh
 *  card press composes), riding the real cascade + real build. */
function composeDefaults(fam: (typeof FAMILIES)[number]): Graph {
  const defaults = (fam.DECL as { defaults?: Record<string, unknown> }).defaults ?? {};
  return composeWithParams(fam, defaults);
}

/** Compose on an EXPLICIT params doc — what a row that picked a
 *  recipe variant composes (the resolver merges the family's
 *  defaults with the variant stamps — the stamps override, the
 *  rest of the doc rides the defaults). Same real build path as
 *  the defaults twin; only the doc differs. */
function composeWithParams(fam: (typeof FAMILIES)[number], params: Record<string, unknown>): Graph {
  const defaults = (fam.DECL as { defaults?: Record<string, unknown> }).defaults ?? {};
  const g = new GraphBuilder({});
  instantiateAction(
    fam.mesh,
    { ...defaults, input_image: "/in/probe.png", ...params },
    factsOf(fam.DECL),
    g,
    "wall",
  );
  return g.toJSON() as Graph;
}

describe("img-to-mesh official-template fidelity (the default-workflow contract)", () => {
  for (const fam of FAMILIES) {
    describe(`${fam.id}`, () => {
      // THE DEFAULT TIER, RESEATED (operator 2026-11-02, the mesh
      // trio: "fast, standard, quality… defaulting to standard"):
      // the family default resolution moved 1536 → 1024 — a
      // DELIBERATE pick of the template's every-GPU tier over its
      // 1536 hero example (the audit table: standard = 1024 |
      // remesh 768 | 700k faces). The 1536 geometry tier stays
      // reachable as the quality recipe's explicit pick (it stamps
      // resolution 1536, and the upsample target rides resolution
      // in the action compose).
      it("the default tier IS the every-GPU tier (1024) — resolution seats once, in the family defaults", () => {
        const defaults = (fam.DECL as { defaults?: Record<string, unknown> }).defaults ?? {};
        assert.equal(defaults["resolution"], "1024",
          `${fam.id}: family default resolution is the standard tier's 1024 (the operator's trio directive)`);
        const g = composeDefaults(fam);
        const up = nodesOf(g, "Trellis2UpsampleStage");
        assert.equal(up.length, 1, "one upsample stage");
        assert.equal(up[0]!.node.inputs["target_resolution"], 1024,
          `${fam.id}: a defaults-driven compose samples the every-GPU geometry tier (quality's 1536 is an explicit pick)`);
      });

      it("the surviving lane stamps NO tier (one value, one owner — the family defaults row owns resolution)", () => {
        const variants = (fam.DECL as { variants?: Array<{ id: string; group?: string; resolver_defaults?: Record<string, unknown> }> }).variants ?? [];
        const lanes = variants.filter((v) => v.group !== "Recipe");
        assert.equal(lanes.length, 1, `${fam.id}: exactly one variant lane (the 1024 row; the 1536/512 routes retired with the trio)`);
        assert.equal(lanes[0]?.id, "1024");
        assert.equal(lanes[0]?.resolver_defaults, undefined,
          `${fam.id}: the lane carries no resolver stamp — resolution seats once, in the family defaults`);
        const quality = variants.find((v) => v.id === "quality");
        assert.equal((quality?.wire_defaults as Record<string, unknown>)?.["resolution"], "1536",
          `${fam.id}: only the quality recipe restates resolution (a patch-only pick over the floor)`);
      });

      it("the four sampler passes carry the template's steps/cfg/schedulers", () => {
        const g = composeDefaults(fam);
        const samplers = nodesOf(g, "KSampler");
        assert.equal(samplers.length, 4, "struct + shape + shape-1024 + texture");
        const byId = new Map(samplers.map((s) => [s.id, s.node]));
        // struct: the sampler on the SD3-shifted model
        const shifted = nodesOf(g, "ModelSamplingSD3");
        assert.equal(shifted.length, 1, "one SD3 shift arm");
        const struct = samplers.find((s) => {
          const t = linkTarget(s.node.inputs, "model");
          return t !== null && t[0] === shifted[0]!.id;
        });
        assert.ok(struct, "the struct sampler rides the shifted model");
        assert.deepEqual(
          { steps: struct!.node.inputs["steps"], cfg: struct!.node.inputs["cfg"], scheduler: struct!.node.inputs["scheduler"] },
          { steps: OFFICIAL.struct.steps, cfg: OFFICIAL.struct.cfg, scheduler: OFFICIAL.struct.scheduler },
        );
        // shape-1024: the sampler on the upsampled latent
        const up = nodesOf(g, "Trellis2UpsampleStage")[0]!;
        const shape1024 = samplers.find((s) => {
          const t = linkTarget(s.node.inputs, "latent_image");
          return t !== null && t[0] === up.id;
        });
        assert.ok(shape1024, "the second shape pass samples the upsampled latent");
        assert.deepEqual(
          { steps: shape1024!.node.inputs["steps"], cfg: shape1024!.node.inputs["cfg"], scheduler: shape1024!.node.inputs["scheduler"] },
          { steps: OFFICIAL.shape1024.steps, cfg: OFFICIAL.shape1024.cfg, scheduler: OFFICIAL.shape1024.scheduler },
        );
        // texture: the sampler feeding the texture decode
        const texDecode = nodesOf(g, "VaeDecodeTextureTrellis")[0]!;
        const texFrom = linkTarget(texDecode.node.inputs, "samples");
        assert.ok(texFrom, "the texture decode samples a KSampler");
        const texture = byId.get(texFrom[0]);
        assert.ok(texture !== undefined && texture.class_type === "KSampler", "texture pass is a KSampler");
        assert.deepEqual(
          { steps: texture.inputs["steps"], cfg: texture.inputs["cfg"], scheduler: texture.inputs["scheduler"] },
          { steps: OFFICIAL.texture.steps, cfg: OFFICIAL.texture.cfg, scheduler: OFFICIAL.texture.scheduler },
        );
        // shape-1: the remaining sampler (first shape pass off the structure voxel)
        const rest = samplers.filter((s) => s.id !== struct!.id && s.id !== shape1024!.id && s.id !== texFrom[0]);
        assert.equal(rest.length, 1, "one first-shape sampler left");
        assert.deepEqual(
          { steps: rest[0]!.node.inputs["steps"], cfg: rest[0]!.node.inputs["cfg"], scheduler: rest[0]!.node.inputs["scheduler"] },
          { steps: OFFICIAL.shape.steps, cfg: OFFICIAL.shape.cfg, scheduler: OFFICIAL.shape.scheduler },
        );
        for (const s of samplers) {
          assert.equal(s.node.inputs["sampler_name"], OFFICIAL.sampler, `${s.id} samples euler`);
          assert.equal(s.node.inputs["denoise"], 1, `${s.id} denoises fully`);
        }
      });

      it("the dual guidance arms + SD3 shift + struct decode match the template", () => {
        const g = composeDefaults(fam);
        const rescale = nodesOf(g, "RescaleCFG").map((s) => s.node.inputs["multiplier"]);
        assert.deepEqual([...rescale].sort(), [OFFICIAL.rescaleShape, OFFICIAL.rescaleStruct].sort(),
          "the 0.5 shape arm + the 0.7 struct arm");
        const overrides = nodesOf(g, "CFGOverride").map((s) => s.node.inputs["start_percent"]);
        assert.deepEqual([...overrides].sort(), [OFFICIAL.overrideShape, OFFICIAL.overrideStruct].sort(),
          "the 0.769 shape override + the 0.667 struct override");
        assert.equal(nodesOf(g, "ModelSamplingSD3")[0]!.node.inputs["shift"], OFFICIAL.sd3Shift);
        assert.equal(nodesOf(g, "VaeDecodeStructureTrellis2")[0]!.node.inputs["resolution"], OFFICIAL.structDecode);
      });

      it("conditioning eats the cropped PHOTO — no MaskToImage anywhere in the lane", () => {
        const g = composeDefaults(fam);
        assert.equal(nodesOf(g, "MaskToImage").length, 0,
          `${fam.id}: the template has no MaskToImage node — the silhouette starves every appearance feature`);
        const crops = nodesOf(g, "ImageCropToMask");
        assert.equal(crops.length, 1, "one shared crop");
        const crop = crops[0]!;
        assert.deepEqual(
          {
            pad_factor: crop.node.inputs["pad_factor"],
            width: crop.node.inputs["width"],
            height: crop.node.inputs["height"],
            grow_mask: crop.node.inputs["grow_mask"],
            background: crop.node.inputs["background"],
          },
          {
            pad_factor: OFFICIAL.crop.pad,
            width: OFFICIAL.crop.width,
            height: OFFICIAL.crop.height,
            grow_mask: OFFICIAL.crop.grow,
            background: OFFICIAL.crop.background,
          },
        );
        // images = the photo (LoadImage), never a mask-derived image
        const imagesFrom = linkTarget(crop.node.inputs, "images");
        assert.ok(imagesFrom, "the crop has an images input");
        assert.equal(g[imagesFrom[0]]?.class_type, "LoadImage",
          `${fam.id}: the crop eats the photo — a MaskToImage-sourced crop is the silhouette bug`);
        const cond = nodesOf(g, fam.conditioning);
        assert.equal(cond.length, 1, `one ${fam.conditioning}`);
        const condFrom = linkTarget(cond[0]!.node.inputs, "image");
        assert.ok(condFrom, "the conditioning has an image input");
        assert.equal(condFrom[0], crop.id, "conditioning eats the cropped photo");
        if (fam.hasMoGe) {
          const moge = nodesOf(g, "MoGeInference");
          assert.equal(moge.length, 1, "one MoGe pass");
          const mogeFrom = linkTarget(moge[0]!.node.inputs, "image");
          assert.ok(mogeFrom, "MoGe has an image input");
          assert.equal(mogeFrom[0], crop.id, "MoGe eats the cropped photo (a blob in = garbage FOV out)");
        }
      });

      it("the bake tail sizes match the template (color 4096 / AO 1024 / normal 2048)", () => {
        const g = composeDefaults(fam);
        assert.equal(nodesOf(g, "BakeTextureFromVoxel")[0]!.node.inputs["texture_size"], OFFICIAL.bakeColor);
        assert.equal(nodesOf(g, "BakeAmbientOcclusion")[0]!.node.inputs["resolution"], OFFICIAL.bakeAO);
        assert.equal(nodesOf(g, "BakeNormalMapFromMesh")[0]!.node.inputs["resolution"], OFFICIAL.bakeNormal);
      });

      it("the negative rides the conditioning's own output 1 — never ConditioningZeroOut", () => {
        const g = composeDefaults(fam);
        assert.equal(nodesOf(g, "ConditioningZeroOut").length, 0,
          `${fam.id}: the template has no ConditioningZeroOut — ComfySwitchNode.315 routes the conditioning's output 1`);
        const cond = nodesOf(g, fam.conditioning);
        assert.equal(cond.length, 1, `one ${fam.conditioning}`);
        // struct pass: negative IS the conditioning's second output
        const shifted = nodesOf(g, "ModelSamplingSD3");
        const struct = nodesOf(g, "KSampler").find((s) => {
          const t = linkTarget(s.node.inputs, "model");
          return t !== null && t[0] === shifted[0]!.id;
        });
        assert.ok(struct, "the struct sampler rides the shifted model");
        assert.deepEqual(linkTarget(struct!.node.inputs, "negative"), [cond[0]!.id, 1],
          `${fam.id}: struct negative = conditioning output 1 (a zeroed-out negative drops the shared proj pack)`);
        // every other pass samples a NEGATIVE the stage itself emits
        for (const s of nodesOf(g, "KSampler")) {
          if (s.id === struct!.id) continue;
          const negFrom = linkTarget(s.node.inputs, "negative");
          assert.ok(negFrom, `${s.id} has a negative input`);
          const src = g[negFrom[0]];
          assert.ok(src !== undefined &&
            (src.class_type === "Trellis2ShapeStage" || src.class_type === "Trellis2UpsampleStage" || src.class_type === "Trellis2TextureStage"),
            `${s.id}: negative rides a stage output, never a fabricated zero`);
          assert.equal(negFrom[1], 1, `${s.id}: negative is the stage's output 1`);
        }
      });

      it("the unwrap rides the shared PrimitiveInt-4096 (the 2048 widget is dead)", () => {
        const g = composeDefaults(fam);
        assert.equal(nodesOf(g, "UnwrapMesh")[0]!.node.inputs["resolution"], OFFICIAL.unwrap,
          `${fam.id}: the template's PrimitiveInt-4096 link overrides UnwrapMesh's 2048 widget — decoupling to 2048 is slop`);
      });

      it("the mesh tail defaults ARE the template's (remesh 768 / decimate 700k)", () => {
        const defaults = (fam.DECL as { defaults?: Record<string, unknown> }).defaults ?? {};
        assert.equal(defaults["remesh_resolution"], OFFICIAL.remesh,
          `${fam.id}: the default flow remeshes at 768 like the template`);
        assert.equal(defaults["decimate_faces"], OFFICIAL.decimate,
          `${fam.id}: the default flow decimates to 700k like the template`);
        const g = composeDefaults(fam);
        assert.equal(nodesOf(g, "RemeshMesh")[0]!.node.inputs["resolution"], OFFICIAL.remesh);
        assert.equal(nodesOf(g, "DecimateMesh")[0]!.node.inputs["target_face_count"], OFFICIAL.decimate);
      });

      it("quality is an explicit opt-in with an honest VRAM cost (the OOM contract)", () => {
        // THE MESH TRIO (operator 2026-11-02: fast / standard /
        // quality, defaulting to standard) renamed the old hero_mesh
        // row and gave it the 1536 pick — the only row that restates
        // resolution (the family defaults' 1024 owns the floor).
        const variants = (fam.DECL as {
          variants?: Array<{ id: string; group?: string; hint?: string; wire_defaults?: Record<string, unknown> }>
        }).variants ?? [];
        const hero = variants.find((v) => v.id === "quality" && v.group === "Recipe");
        assert.ok(hero, `${fam.id}: the quality recipe exists`);
        assert.deepEqual(hero.wire_defaults, { resolution: "1536", remesh_resolution: 2048, decimate_faces: 2000000 },
          `${fam.id}: quality stamps exactly the schema ceilings — 1536/2048/2M, never the silent default`);
        assert.match(hero.hint ?? "", /24GB|32GB|VRAM/i,
          `${fam.id}: the quality hint must name its VRAM cost — a 2048 remesh OOMs a 24GB card (RemeshMesh alone wants ~3.6 GiB over a ~19 GiB resident chain)`);
        const first = variants.find((v) => v.group === "Recipe");
        assert.equal(first?.id, "standard",
          `${fam.id}: STANDARD is the first Recipe row — the birth stamp lands every fresh card at the standard tier`);
        assert.ok(first?.wire_defaults === undefined || Object.keys(first.wire_defaults).length === 0,
          `${fam.id}: the standard recipe stamps nothing — the family defaults' floors ARE the official flow`);
        const group = (fam.DECL as { variant_groups?: Array<{ id: string; default?: string }> }).variant_groups
          ?.find((g) => g.id === "Recipe");
        assert.equal(group?.default, "standard", `${fam.id}: the Recipe group default names the standard tier`);
      });

      // THE STANDARD TIER (operator 2026-10-30: "we are lacking a
      // standard"; reworked 2026-11-02 into the fast/standard/quality
      // trio): the calibration rides the family defaults row as the
      // FLOOR — one value, one owner (the old shape duplicated
      // 768/700k across the defaults row AND standard_mesh stamps).
      // STANDARD is the stamp-less first row (the h3 precedent: a
      // recipe stamps only what DIFFERS from the floor); the birth
      // stamp names it on every fresh card, and the defaults test
      // above composes the very same calibration.
      it("standard is the named every-GPU tier — the floors compose verbatim, and fast/quality bracket them", () => {
        const variants = (fam.DECL as {
          variants?: Array<{ id: string; group?: string; hint?: string; wire_defaults?: Record<string, number | string> }>
        }).variants ?? [];
        const std = variants.find((v) => v.id === "standard" && v.group === "Recipe");
        assert.ok(std, `${fam.id}: the standard recipe exists — the default tier`);
        assert.ok(std?.wire_defaults === undefined || Object.keys(std.wire_defaults).length === 0,
          `${fam.id}: standard stamps NOTHING — the family defaults row owns the calibration (one value, one owner)`);
        assert.match(std?.hint ?? "", /24GB/i,
          `${fam.id}: the standard hint must name its 24GB fit — the tier exists because Quality does not fit`);
        const ids = variants.filter((v) => v.group === "Recipe").map((v) => v.id);
        assert.deepEqual(ids, ["standard", "fast", "quality"],
          `${fam.id}: the recipe roster reads Standard (first — the birth stamp) → Fast → Quality`);
        const fast = variants.find((v) => v.id === "fast");
        assert.deepEqual(fast?.wire_defaults, { remesh_resolution: 128, decimate_faces: 10000 },
          `${fam.id}: fast stamps ONLY the preview tail — resolution stays the 1024 floor`);
        // the floors compose: the standard row's own flow rides the
        // calibrated mesh tail, not the fast floors or the ceilings
        const g = composeDefaults(fam);
        assert.equal(nodesOf(g, "RemeshMesh")[0]!.node.inputs["resolution"], OFFICIAL.remesh,
          `${fam.id}: the standard flow composes the calibrated remesh`);
        assert.equal(nodesOf(g, "DecimateMesh")[0]!.node.inputs["target_face_count"], OFFICIAL.decimate,
          `${fam.id}: the standard flow composes the calibrated decimation`);
      });
    });
  }
});
