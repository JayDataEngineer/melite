// @melite/comfyui-card-kit — the lanes' own arms (TEST-2 breadth,
// 2026-09-12). The card specs drive each lane through its compose
// door; THIS file owns the arms the cards' happy paths do not reach
// (the mask lane's proposal/export/union arms, the four tagger
// dispatches, the input-prep row gates, the mesh admission throws,
// the finalize strips). The lane IS the unit here — direct calls,
// GraphBuilder truth.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { GraphBuilder } from "../src/graph.ts";
import {
  finalizeIdeogram, finalizeImageEdit, finalizeTagger,
  ideogramLane, inputPrepLane, maskT1, taggerLane,
  annyLane, fitModelStem, skinLane,
  admitMeshLift, transferRigArm, trellisArm, pixalArm, type StripTable,
  quadRemeshLane, musicT1, fitLane, imageEdit, refuseImageEditFiring, finalizeAnny, finalizeMotion,
} from "../src/kit.ts";
import { loadFacts } from "../src/facts.ts";
import { deriveDefaults } from "../src/graph.ts";
import { vocabulary } from "../src/vocab.ts";
import {

  getModel, registryIds, registryModel,
} from "../../comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

const dump = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;
const classes = (row: Record<string, { class_type: string }>): string[] =>
  Object.values(row).map((n) => n.class_type);

beforeAll(() => { assert.ok(Object.keys(facts.models).length > 0, "the facts file serves"); });

// ── the mask lane (RT-DETR proposals, exports, unions, manifests) ──
const MASK_PINS = { checkpoint: "sam3_pin.pth", unet: "rtdetr_pin.pth" };
const maskBase = {
  input_image: "/m/p.png", sam_threshold: 0.93, sam_dilation: 0,
  export_boxes: false, primary_via_rtdetr: false,
};

describe("maskT1 (the selection lane's arms)", () => {
  it("the class-prompt primary arm (CLIP conditioning)", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, primary_class: "person" }, MASK_PINS, g, "r1");
    const row = dump(g);
    assert.ok(classes(row).includes("CLIPTextEncode"), "the class arm conditions");
    assert.ok(classes(row).includes("SAM3_Detect"), "the detect rides");
  });

  it("the free-prompt primary arm", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, primary_prompt: "the red cloak" }, MASK_PINS, g, "r2");
    assert.ok(classes(dump(g)).includes("CLIPTextEncode"));
  });

  it("the painted primary arm (LoadImageMask)", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, primary_is_paint: true, paint_mask: "/m/paint.png" }, MASK_PINS, g, "r3");
    assert.ok(classes(dump(g)).includes("LoadImageMask"));
  });

  it("the RT-DETR proposal lane (boxes + manifest + capped instances)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, export_boxes: true, primary_via_rtdetr: true,
      detection_threshold: 0.4, max_instances: 0, // || 100 fallback arm
    }, MASK_PINS, g, "r4");
    const row = dump(g);
    assert.ok(classes(row).includes("RTDETR_detect"), "the proposal rides");
    assert.ok(classes(row).includes("DrawBBoxes"), "the manifest draws");
    const rt = Object.values(row).find((n) => n.class_type === "RTDETR_detect")!;
    assert.equal(rt.inputs.max_detections, 100, "a zero max_instances falls back to the 100 cap");
  });

  it("the exports loop: paint + text + scope (the shorter zip arm)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, paint_mask: "/m/paint.png",
      primary_class: "person",
      exports: [["painted", ""], ["cloak", "the red cloak"], ["extra", "unmatched"]],
      export_kind: ["paint", "text"],
      scope_bbox: [8, 8, 64, 64],
    }, MASK_PINS, g, "r5");
    const row = dump(g);
    const saves = Object.values(row).filter((n) => n.class_type === "SaveImage");
    assert.ok(saves.length >= 3, "combined + painted + scoped-text saves ride");
    const names = saves.map((s) => String(s.inputs.filename_prefix));
    assert.ok(names.some((n) => n.endsWith("mask_painted")), "the paint export saves");
    assert.ok(names.some((n) => n.endsWith("mask_cloak")), "the text export saves (scoped)");
    assert.ok(!names.some((n) => n.endsWith("mask_extra")), "zip stops at the shorter row");
    const detect = Object.values(row).filter((n) => n.class_type === "SAM3_Detect");
    assert.equal(detect.length, 2, "the primary + the TEXT export detect (paint rides the mask, never detects)");
    const scoped = detect.find((d) => (d.inputs.bboxes as { x?: number }).x === 8);
    assert.deepEqual(scoped!.inputs.bboxes, { x: 8, y: 8, width: 64, height: 64 }, "the scope rides as a bbox dict");
  });

  it("the paint union folds into combined (GrowMask ×2 + MaskComposite)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_class: "person", paint_mask: "/m/p.png",
      sam_dilation: 4, union_paint_into_combined: true,
      exports: [["all", ""]], export_kind: ["paint"],
    }, MASK_PINS, g, "r6");
    const row = dump(g);
    assert.ok(classes(row).includes("MaskComposite"), "the union composites");
    assert.ok(classes(row).includes("GrowMask"), "dilation re-applies on the primary");
    assert.ok(Object.values(row).some((n) => n.class_type === "SaveImage" && String(n.inputs.filename_prefix).endsWith("mask_combined_union")));
  });

  it("a TEXT export with an empty payload detects unconditioned (the if (payload) arm)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_class: "person",
      exports: [["plain", ""]], export_kind: ["text"],
    }, MASK_PINS, g, "r5b");
    const dets = Object.values(dump(g)).filter((n) => n.class_type === "SAM3_Detect");
    assert.equal(dets.length, 2, "primary + the unconditioned export");
    assert.ok(!("conditioning" in dets[1]!.inputs), "no payload, no conditioning");
  });

  it("a painted primary with an unstated paint_mask rides the '' fallback", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, primary_is_paint: true }, MASK_PINS, g, "r5c");
    const load = Object.values(dump(g)).find((n) => n.class_type === "LoadImageMask")!;
    assert.equal(load.inputs.image, "");
  });

  it("the union refuses nothing when there is no paint to union (the && short-circuit arms)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_class: "person", union_paint_into_combined: true,
    }, MASK_PINS, g, "r5d");
    assert.ok(!classes(dump(g)).includes("MaskComposite"), "no paint export, no union");
  });

  it("two paint exports share the ONE masked node (the paintMasked memo)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, paint_mask: "/m/paint.png",
      exports: [["one", ""], ["two", ""]], export_kind: ["paint", "paint"],
    }, MASK_PINS, g, "r5e");
    const loads = Object.values(dump(g)).filter((n) => n.class_type === "LoadImageMask");
    assert.equal(loads.length, 1, "the second paint export reuses the masked node");
  });

  it("a paint export with an unstated paint_mask rides the '' fallback", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, exports: [["ghost", ""]], export_kind: ["paint"],
    }, MASK_PINS, g, "r5f");
    const load = Object.values(dump(g)).find((n) => n.class_type === "LoadImageMask")!;
    assert.equal(load.inputs.image, "");
  });

  it("a malformed scope_bbox refuses loud (never silently dropped)", () => {
    assert.throws(
      () => maskT1({ ...maskBase, exports: [["x", ""]], export_kind: ["text"], scope_bbox: [1, 2, 3] }, MASK_PINS, new GraphBuilder(), "r7"),
      /scope_bbox refused .* exactly \[x, y, w, h\] pixels \(got 3 values\)/,
    );
  });

  it("dilation grows (the non-zero arm)", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, primary_class: "p", sam_dilation: 6 }, MASK_PINS, g, "r8");
    const grow = Object.values(dump(g)).find((n) => n.class_type === "GrowMask");
    assert.ok(grow, "dilation rides");
    assert.equal(grow!.inputs.expand, 6);
  });

  it("refine_iterations falls back to the 2 pin when unstated", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, primary_class: "p" }, MASK_PINS, g, "r9");
    const detect = Object.values(dump(g)).find((n) => n.class_type === "SAM3_Detect")!;
    assert.equal(detect.inputs.refine_iterations, 2);
  });
});

// ── the tagger dispatch (four arms + the no-arm refusal) ──────────
describe("taggerLane (the four-family dispatch)", () => {
  const arms: Array<[string, RegExp]> = [
    ["wd14", /WD14Tagger\|pysssss/],
    ["joytag", /CXH_JoyTag/],
    ["florence2", /DownloadAndLoadFlorence2Model/],
    ["joycaption", /JJC_JoyCaption/],
  ];
  for (const [family, node] of arms) {
    it(`the ${family} arm rides its family node`, () => {
      const model = facts.models[family]!;
      assert.ok(model, `the ${family} facts row serves`);
      const g = new GraphBuilder();
      taggerLane({ input_image: "/m/p.png", checkpoint: "c", threshold: 0.35 }, model, g, "run_1");
      assert.ok(classes(dump(g)).some((c) => node.test(c)), `the ${family} node rides`);
    });
  }

  it("an unknown family refuses with the known list", () => {
    assert.throws(
      () => taggerLane({ input_image: "x" }, { ...facts.models["wd14"]!, id: "nope" }, new GraphBuilder(), "r"),
      /tagger model 'nope' has no arm \(known families: florence2, joycaption, joytag, wd14\)/,
    );
  });

  it("a non-string input_image walks as the empty string", () => {
    const g = new GraphBuilder();
    taggerLane({ input_image: 5 }, facts.models["wd14"]!, g, "run_2");
    const load = Object.values(dump(g)).find((n) => n.class_type === "LoadImage")!;
    assert.equal(load.inputs.image, "");
  });
});

// ── the input-prep row gates ──────────────────────────────────────
describe("inputPrepLane (the row gates)", () => {
  it("the audio arm saves through LoadAudio", () => {
    const g = new GraphBuilder();
    inputPrepLane({ media_type: "audio", source: "/m/a.wav" }, g, "run_1");
    const row = dump(g);
    assert.ok(classes(row).includes("LoadAudio"));
    assert.ok(classes(row).includes("SaveAudio"));
  });

  it("a good crop + scale chain (method default and explicit)", () => {
    const g1 = new GraphBuilder();
    inputPrepLane({ source: "/m/p.png", crop: { x: 1, y: 2, width: 3, height: 4 } }, g1, "run_2");
    const crop = Object.values(dump(g1)).find((n) => n.class_type === "ImageCrop")!;
    assert.deepEqual([crop.inputs.x, crop.inputs.width], [1, 3]);

    const g2 = new GraphBuilder();
    inputPrepLane({
      source: "/m/p.png", crop: { x: 0, y: 0, width: 10, height: 10 },
      scale: { width: 20, height: 30 }, // method unstated → lanczos
    }, g2, "run_3");
    const scale = Object.values(dump(g2)).find((n) => n.class_type === "ImageScale")!;
    assert.equal(scale.inputs.upscale_method, "lanczos");

    const g3 = new GraphBuilder();
    inputPrepLane({
      source: "/m/p.png",
      scale: { width: 20, height: 30, method: "nearest-exact" },
    }, g3, "run_4");
    assert.equal(
      Object.values(dump(g3)).find((n) => n.class_type === "ImageScale")!.inputs.upscale_method,
      "nearest-exact",
    );
  });

  it("malformed rows refuse loud (crop member + scale numbers)", () => {
    assert.throws(
      () => inputPrepLane({ source: "p", crop: { x: "a", y: 0, width: 1, height: 1 } }, new GraphBuilder(), "r"),
      /crop row refused on the input-prep card: 'x' must be a number \(got "a"\)/,
    );
    assert.throws(
      () => inputPrepLane({ source: "p", scale: { width: 1 } }, new GraphBuilder(), "r"),
      /scale row refused on the input-prep card: 'width'\/'height' must be numbers/,
    );
  });
});

// ── the finalize strips (autofill removal) ────────────────────────
describe("the finalize strips", () => {
  it("stripAutofill/stripEmptyAutofill drop the pinned keys", () => {
    const g = {
      A: { class_type: "CLIPLoader", inputs: { device: "cpu", clip_name: "x" } },
      B: { class_type: "LoadImage", inputs: { upload: "", image: "y" } },
      C: { class_type: "KSampler", inputs: { control_after_generate: "fixed", seed: 1 } },
    } as never;
    const out = finalizeImageEdit(g);
    assert.ok(!("device" in out.A.inputs), "stripAutofill drops the pinned key");
    assert.ok("upload" in out.B.inputs, "the edit strip's LoadImage row is EMPTY — nothing dropped");
    assert.ok(!("control_after_generate" in out.C.inputs));

    // the tagger strip DOES list upload for LoadImage
    const empty = { D: { class_type: "LoadImage", inputs: { upload: "", image: "z" } } } as never;
    const out2 = finalizeTagger(empty);
    assert.ok(!("upload" in out2.D.inputs), "the tagger strip drops the empty upload");

    const ideo = finalizeIdeogram({} as never);
    assert.deepEqual(Object.keys(ideo), [], "the ideogram strip passes an empty graph through");
  });
});

// ── the small exported helpers ────────────────────────────────────
describe("the exported helpers", () => {
  it("annyLane's body_glb falls back to the empty string (the card admits it)", () => {
    const render = { resolution: 2, framing: 2, focal_length: 2, samples: 2, transparent: true };
    // no body_glb: the ?? '' fallback rides, CompositeCharacter
    // still builds — the admission stays on the card.
    const g = new GraphBuilder();
    annyLane({ ...render }, g);
    const prim = Object.values(dump(g)).find((n) => n.class_type === "PrimitiveString")!;
    assert.equal(prim.inputs.value, "");
  });

  it("annyLane with and without a source image", () => {
    const render = { resolution: 2, framing: 2, focal_length: 2, samples: 2, transparent: true };
    const g1 = new GraphBuilder();
    annyLane({ body_glb: "/m/b.glb", source_image: "/m/s.png", ...render }, g1);
    assert.ok(classes(dump(g1)).includes("RaySAMSegmentHairClothing"), "the source arm rides");

    const g2 = new GraphBuilder();
    annyLane({ body_glb: "/m/b.glb", ...render }, g2);
    assert.ok(!classes(dump(g2)).includes("LoadImage"), "no source, no load");
  });

  it("fitModelStem edge arms (empty, backslash, spaces)", () => {
    assert.equal(fitModelStem(""), "prop", "no stem falls back to prop");
    assert.equal(fitModelStem("/a/b\\c d.glb"), "c d", "the last path segment wins on both separators");
    assert.equal(fitModelStem("  x  "), "x", "the stem trims");
  });

  it("skinLane refuses unknown kinds and off-vocab map sizes", () => {
    assert.throws(
      () => skinLane({ body_glb: "b", map_size: 512, seed: 1, kind: "not_a_kind", resolution: 2, framing: 2, focal_length: 2, samples: 2, transparent: true }, new GraphBuilder(), "r"),
      /"not_a_kind" is not a meld kind/,
    );
    assert.throws(
      () => skinLane({ body_glb: "b", map_size: 513, seed: 1, kind: "keeper" }, new GraphBuilder(), "r"),
      /map_size = 513 not in \[256, 512, 1024, 2048\]/,
    );
    assert.throws(
      () => skinLane({ body_glb: "b", map_size: " 512x ", seed: 1, kind: "keeper" }, new GraphBuilder(), "r"),
      /map_size = " 512x " not in/,
    );
    // an UNSTATED kind falls back to '' — skinRowFor refuses the
    // empty (the requires stay on the card)
    assert.throws(
      () => skinLane({ map_size: 512, seed: 1, resolution: 2, framing: 2, focal_length: 2, samples: 2, transparent: true }, new GraphBuilder(), "r"),
      /"" is not a meld kind/,
    );
    // a non-string, non-number map size refuses (the typeof arm)
    assert.throws(
      () => skinLane({ body_glb: "b", map_size: null, seed: 1, kind: "keeper" }, new GraphBuilder(), "r"),
      /map_size = null not in/,
    );
  });
});

// ── the mesh-lift admission throws + the rig arm ──────────────────
describe("the mesh-lift admissions and the rig copy", () => {
  const liftBase = {
    input_image: "/m/p.png", resolution: "1024", bg_removal: "auto",
    atlas_size: "2048", ao_size: "512", normal_size: "1024",
  };
  const trellis = facts.models["trellis2"] ?? facts.models[Object.keys(facts.models).find((k) => k.includes("trellis")) || ""]!;

  it("the closed-set refusals (resolution, bg, bake sizes, fov)", () => {
    assert.throws(() => admitMeshLift({ ...liftBase, resolution: "999" }, trellis),
      /resolution "999" is not one of 512\|1024\|1536/);
    assert.throws(() => admitMeshLift({ ...liftBase, bg_removal: "maybe" }, trellis),
      /bg_removal "maybe" is not one of auto\|on\|off/);
    assert.throws(() => admitMeshLift({ ...liftBase, ao_size: "77" }, trellis),
      /ao_size "77" is not one of 512\|1024/);
    const pixal = { ...trellis, id: "pixal3d" } as never;
    assert.throws(() => admitMeshLift({ ...liftBase, camera_fov: "12" }, pixal),
      /camera_fov "12" is not one of auto\|35\|49\.13\|60\|75\|90/);
    // the pixal fov gate does not fire for other families
    admitMeshLift({ ...liftBase, camera_fov: "12" }, trellis);
    // unstated bg/fov fall back to their schema pins (the || arms)
    const { bg_removal: _bg, ...noBg } = liftBase;
    admitMeshLift(noBg, trellis);
    const pixalFull = { ...liftBase, camera_fov: "auto" };
    admitMeshLift(pixalFull, { ...trellis, id: "pixal3d" } as never);
    const { camera_fov: _fov, ...noFov } = pixalFull;
    admitMeshLift(noFov, { ...trellis, id: "pixal3d" } as never);
    // whitespace input_image refuses (the trim arm)
    assert.throws(() => admitMeshLift({ ...liftBase, input_image: "   " }, trellis),
      /required param 'input_image' \(Source image\) missing/);
  });

  it("the trellis arm builds (bg on AND off)", () => {
    const trellis = facts.models["trellis2-native"]!;
    const base = {
      input_image: "/m/p.png", resolution: "1024", bg_removal: "on",
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
    trellisArm(g1, base, trellis);
    const on = dump(g1);
    assert.ok(classes(on).includes("RemoveBackground"), "bg on cuts");

    const g2 = new GraphBuilder();
    trellisArm(g2, { ...base, bg_removal: "off" }, trellis);
    assert.ok(!classes(dump(g2)).includes("RemoveBackground"), "bg off feeds the image straight");
  });

  it("the pixal arm builds both fov arms (MoGe auto + the vouched literal)", () => {
    const pixal = facts.models["pixal3d"]!;
    const base = {
      input_image: "/m/p.png", resolution: "1024", bg_removal: "off",
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
    pixalArm(g1, base, pixal);
    assert.ok(classes(dump(g1)).includes("LoadMoGeModel"), "auto fov rides MoGe");

    const g2 = new GraphBuilder();
    pixalArm(g2, { ...base, camera_fov: "49.13" }, pixal);
    const row = dump(g2);
    assert.ok(!classes(row).includes("LoadMoGeModel"), "the literal skips MoGe");
    const cond = Object.values(row).find((n) => n.class_type === "Pixal3DConditioning")!;
    assert.equal(cond.inputs.camera_angle_x, 49.13, "the vouched degree rides verbatim");
  });

  it("the rig-copy arm (KimodoTransferWeights + SaveRiggedModel)", () => {
    const g = new GraphBuilder();
    transferRigArm(g, { rigged_glb: "/m/r.glb", target_glb: "/m/t.glb" });
    const row = dump(g);
    assert.ok(classes(row).includes("KimodoTransferWeights"));
    assert.ok(classes(row).includes("SaveRiggedModel"));
  });
});

// ── the ideogram lane's arm (the card spec drives the gate) ───────
describe("ideogramLane (the happy lane, kit-direct)", () => {
  it("stripEmptyAutofill drops empties and keeps the rest (both ==='' arms)", () => {
    // finalizeMotion is the stripEmptyAutofill face WITH entries
    // (MOTION_STRIP — ANNY_STRIP/FIT_STRIP are empty tables).
    const out = finalizeMotion({
      M: { class_type: "KimodoTextToPose", inputs: { prev_motion_npz: "", motion_prompts: "a walk" } },
      N: { class_type: "LoadImage", inputs: { image: "kept.png" } },
    } as never);
    assert.ok(!("prev_motion_npz" in out.M.inputs), "the empty string drops");
    assert.equal(out.M.inputs.motion_prompts, "a walk", "a non-empty value stays");
    assert.equal(out.N.inputs.image, "kept.png", "classes outside the table ride untouched");
  });

  it("deriveDefaults walks a spec with NO required section", () => {
    const out = deriveDefaults({ OptionalOnly: { input: { optional: { pad: ["INT", { default: 3 }] } } } });
    assert.deepEqual(out.OptionalOnly, { pad: 3 });
  });

  it("deriveDefaults walks missing and input-less specs (the ?? {} arms)", () => {
    const out = deriveDefaults({ Ghost: null, Bare: {} });
    assert.equal(out.Ghost, undefined, "a null spec emits no row");
    assert.equal(out.Bare, undefined, "an input-less spec emits no row");
  });

  it("the family scheduler rides", () => {
    const model = facts.models["ideogram"]!;
    const g = new GraphBuilder();
    ideogramLane({ prompt: "a brass astrolabe", magic_prompt_option: "Auto", seed: 5 }, model, g, "run_1");
    assert.ok(classes(dump(g)).includes("Ideogram4Scheduler"));
  });
});

// ── graph.ts deriveDefaults (the object_info walker's arms) ───────
describe("deriveDefaults (the autofill derivation)", () => {
  it("optional-absent and non-array spec tails walk clean", () => {
    const out = deriveDefaults({
      OnlyRequired: { input: { required: { seed: ["INT", { default: 7 }] } } },
      NonArray: { input: { required: { plain: "STRING" } } },
      WithOptional: { input: { optional: { pad: ["INT", { default: 0 }] } } },
    });
    assert.deepEqual(out.OnlyRequired, { seed: 7 });
    assert.equal(out.NonArray, undefined, "a class with no carried defaults emits NO row");
    assert.deepEqual(out.WithOptional, { pad: 0 });
  });
});

// ── the residual lane arms (fit/quad/music/edit) ─────────────────
describe("the residual lane arms", () => {
  it("quadRemeshLane rides the AutoRemesher", () => {
    const g = new GraphBuilder();
    quadRemeshLane({ input: "/m/mesh.glb", target_quads: 40000 }, g, "run_1");
    const node = Object.values(dump(g)).find((n) => n.class_type === "AutoRemesher")!;
    assert.ok(node);
    assert.equal(node.inputs.target_quads, 40000);
    assert.equal(node.inputs.glb_path, "/m/mesh.glb");
  });

  it("quadRemeshLane's unstated input rides the empty pin (the card admits it)", () => {
    const g = new GraphBuilder();
    quadRemeshLane({ target_quads: 1000 }, g, "run_1b");
    const node = Object.values(dump(g)).find((n) => n.class_type === "AutoRemesher")!;
    assert.equal(node.inputs.glb_path, "");
  });

  it("musicT1 carries the lyrics overlay arm (stated and absent)", () => {
    const model = facts.models["music3"]!;
    const stated = new GraphBuilder();
    musicT1({ prompt: "a funky loop", lyrics: "verse one", duration: 90, seed: 3 }, model, stated, "run_2");
    const enc = Object.values(dump(stated)).find((n) => n.class_type === "MiniMaxMusic3TextEncode")!;
    assert.equal(enc.inputs.lyrics, "verse one", "stated lyrics ride the encode");

    const absent = new GraphBuilder();
    musicT1({ prompt: "a funky loop", duration: 90, seed: 3 }, model, absent, "run_2b");
    const enc2 = Object.values(dump(absent)).find((n) => n.class_type === "MiniMaxMusic3TextEncode")!;
    assert.equal(enc2.inputs.lyrics, "", "unstated lyrics ride the lane's empty pin, never undefined");
  });

  it("fitLane's optional bone/ref arms ride both ways", () => {
    const g1 = new GraphBuilder();
    fitLane({
      body_glb: "/m/b.glb", prop_glb: "/m/p.glb", bone: "hand.r",
      align: "grip", position: "0,1,0", rotation: "0,0,0",
      fit_ratio: 0.5, seat_ratio: 0.3, target_width: 2,
      resolution: 2, framing: 2, focal_length: 2, samples: 2, transparent: true,
      fit_ref_bone: "a", fit_ref_bone2: "b", finger_bone: "f",
    }, g1, "run_3");
    assert.ok(classes(dump(g1)).includes("FitRow"));
    const g2 = new GraphBuilder();
    fitLane({
      body_glb: "/m/b.glb", prop_glb: "/m/p.glb",
      align: "grip", position: "0,1,0", rotation: "0,0,0",
      fit_ratio: 0.5, seat_ratio: 0.3, target_width: 2,
      resolution: 2, framing: 2, focal_length: 2, samples: 2, transparent: true,
    }, g2, "run_4");
    const row = Object.values(dump(g2)).find((n) => n.class_type === "FitRow")!;
    assert.equal(row.inputs.fit_ref_bone, "", "the unstated refs ride empty");

    // no body/prop/bone at all: the ?? '' fallbacks ride (the
    // admissions stay on the card; the lane never sees undefined).
    const g3 = new GraphBuilder();
    fitLane({
      align: "grip", position: "0,1,0", rotation: "0,0,0",
      fit_ratio: 0.5, seat_ratio: 0.3, target_width: 2,
      resolution: 2, framing: 2, focal_length: 2, samples: 2, transparent: true,
    }, g3, "run_4b");
    const prims = Object.values(dump(g3)).filter((n) => n.class_type === "PrimitiveString");
    assert.ok(prims.every((n) => n.inputs.value === ""), "the unstated paths ride empty");
  });

  it("imageEdit wires the image2/image3 reference slots", () => {
    const model = facts.models["qwen-img-edit-2511"]!;
    const g = new GraphBuilder();
    imageEdit({
      prompt: "make it night", image1: "/m/1.png",
      image2: "/m/2.png", image3: "/m/3.png",
      negative_prompt: "blur", seed: 5,
    }, model, g, "run_5");
    const row = dump(g);
    const enc = Object.values(row).filter((n) => n.class_type === "TextEncodeQwenImageEditPlus");
    assert.ok(enc.length >= 2, "pos + neg encode");
    assert.ok("image2" in enc[0]!.inputs && "image3" in enc[0]!.inputs, "the reference slots wire");
  });
});

// ── the lanpaint merge arms (kit.ts 171/260/266/268/272) ─────────
// The card spec drives the happy region arm through the compose
// door; THESE arms own the merge-law branches the door never
// reaches (kit-direct, hand-rolled params — no schema defaults to
// hide behind).
describe("the lanpaint merge arms (the bag/flat law)", () => {
  const editModel = (): import("../src/facts.ts").ModelFacts => facts.models["qwen-img-edit-2511"]!;

  it("a region-less single-entry bag states nothing (the ?? '' arm)", () => {
    // bagN === 1 but the entry carries no input_mask — bagMask falls
    // back to '' (kit.ts:171), so no region is stated and the gate
    // passes the run through to the plain-edit lane.
    assert.doesNotThrow(
      () => refuseImageEditFiring({ mask: [{ mask_grow: 4 }] }),
      "a single bag entry without input_mask states no region — the gate passes",
    );
  });

  it("an explicit flat region wins over the single-entry bag (the merge's skip arm)", () => {
    const g = new GraphBuilder();
    imageEdit({
      prompt: "x", image1: "/m/i.png", seed: 7,
      input_mask: "/m/flat.png",
      mask: [{ input_mask: "/m/bag.png", mask_grow: 0, mask_feather: 0 }],
      mask_grow: 0, mask_feather: 0,
    }, editModel(), g, "run_flat");
    const load = Object.values(dump(g)).find((n) => n.class_type === "LoadImageMask")!;
    assert.equal(load.inputs.image, "/m/flat.png", "the explicit flat key wins; the bag value drops");
  });

  it("unstated grow/feather ride the 8px pins (the ?? 8 arms)", () => {
    const g = new GraphBuilder();
    imageEdit({ prompt: "x", image1: "/m/i.png", seed: 7, input_mask: "/m/r.png" }, editModel(), g, "run_pins");
    const row = dump(g);
    const grow = Object.values(row).find((n) => n.class_type === "GrowMask")!;
    assert.equal(grow.inputs.expand, 8, "unstated mask_grow rides the 8 pin");
    const feather = Object.values(row).find((n) => n.class_type === "FeatherMask")!;
    assert.deepEqual(
      [feather.inputs.left, feather.inputs.top, feather.inputs.right, feather.inputs.bottom],
      [8, 8, 8, 8], "unstated mask_feather rides the 8 pin on all four sides",
    );
  });

  it("mask_invert splices the InvertMask into the prep chain (the === true arm)", () => {
    const g = new GraphBuilder();
    imageEdit({
      prompt: "x", image1: "/m/i.png", seed: 7, input_mask: "/m/r.png",
      mask_grow: 0, mask_feather: 0, mask_invert: true,
    }, editModel(), g, "run_inv");
    const row = dump(g);
    const inv = Object.values(row).find((n) => n.class_type === "InvertMask")!;
    assert.deepEqual(inv.inputs.mask, ["LoadImageMask.0", 0], "the invert reads the loaded mask (grow/feather both 0)");
    const enc = Object.values(row).find((n) => n.class_type === "LanPaint_ImageEncode")!;
    assert.deepEqual(enc.inputs.mask, ["InvertMask.0", 0], "the encode reads the INVERTED mask");
  });
});

// ── the vocabulary law ────────────────────────────────────────────
describe("vocabulary (the one-row law)", () => {
  it("an empty closed set refuses (not a type)", () => {
    assert.throws(() => vocabulary([]), /a closed set with no members is not a type/);
  });
});
