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
  finalizeImageEdit, finalizeTagger, finalizeMask,
 inputPrepLane, maskT1, taggerLane,
  annyLane,
  admitMeshLift, transferRigArm, trellisArm, pixalArm, type StripTable,
  quadRemeshLane, musicT1, imageEdit, refuseImageEditFiring, finalizeAnny, finalizeMotion, finalizeH3,
  ttsT1,
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
const MASK_PINS = { checkpoint: "sam3_pin.pth", unet: "rtdetr_pin.pth", sam2: "sam2_pin.pt", segm: "segm/person_pin.pt", face: "bbox/face_pin.pt", hand: "bbox/hand_pin.pt" };
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

  it("the exports loop: paint + text (the shorter zip arm); scope_bbox is the PRIMARY's box and never leaks into exports", () => {
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
    assert.ok(saves.length >= 3, "combined + painted + text saves ride");
    const names = saves.map((s) => String(s.inputs.filename_prefix));
    assert.ok(names.some((n) => n.endsWith("mask_painted")), "the paint export saves");
    assert.ok(names.some((n) => n.endsWith("mask_cloak")), "the text export saves");
    assert.ok(!names.some((n) => n.endsWith("mask_extra")), "zip stops at the shorter row");
    const detect = Object.values(row).filter((n) => n.class_type === "SAM3_Detect");
    assert.equal(detect.length, 2, "the primary + the TEXT export detect (paint rides the mask, never detects)");
    // the primary (SAM3_Detect.0, emitted first) now threads its OWN
    // scope as the detect hint (the 512-hunt threading); the wall's
    // law narrows to its exact meaning: the EXPORT never inherits it
    const primary = row["SAM3_Detect.0"] as { inputs: Record<string, unknown> } | undefined;
    const exportDet = row["SAM3_Detect.1"] as { inputs: Record<string, unknown> } | undefined;
    assert.ok(primary, "the primary detect rides");
    assert.ok(exportDet, "the text export detect rides");
    assert.equal((primary.inputs.bboxes as { x?: number } | undefined)?.x, 8, "the primary's OWN hint threads (the 512-hunt law)");
    assert.equal((exportDet.inputs.bboxes as { x?: number } | undefined)?.x, undefined, "no export inherits the primary's box (the primary's scope multiplies the anchor, never the exports)");
    const mult = Object.values(row).find((n) => n.class_type === "MaskComposite" && (n.inputs as { operation?: string }).operation === "multiply");
    assert.ok(mult, "the primary's box scopes mask_combined (the rect scope)");
  });

  it("the SAM2 impact-pack arm: the detector proposes, SAM2 refines, the pins ride (the operator's SAM2)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_via_sam2: true, primary_sam2_labels: "face,hand", detection_threshold: 0.6,
    }, MASK_PINS, g, "r_sam2");
    const row = dump(g);
    assert.deepEqual(classes(row).filter((c) => ["UltralyticsDetectorProvider", "BboxDetectorSEGS", "SAMLoader", "SAMDetectorCombined"].includes(c)).sort(),
      ["BboxDetectorSEGS", "SAMDetectorCombined", "SAMLoader", "UltralyticsDetectorProvider"], "the full impact chain rides");
    assert.ok(!classes(row).includes("CLIPTextEncode"), "the sam2 arm never touches the CLIP text lane");
    const face = Object.values(row).find((n) => n.class_type === "UltralyticsDetectorProvider")!;
    assert.equal(face.inputs.model_name, "bbox/face_yolov8m.pt", "the pack's OWN face detector rides (caller pins retired — the Impact Pack examples' specialized model)");
    const det = Object.values(row).find((n) => n.class_type === "BboxDetectorSEGS")!;
    assert.equal(det.inputs.labels, "face,hand", "the labels set rides");
    assert.equal(det.inputs.threshold, 0.6, "the detection threshold rides verbatim");
    const sam = Object.values(row).find((n) => n.class_type === "SAMLoader")!;
    assert.equal(sam.inputs.model_name, "sam2_pin.pt", "the card's SAM2 pin rides (never a caller string)");
    const comb = Object.values(row).find((n) => n.class_type === "SAMDetectorCombined")!;
    assert.equal(comb.inputs.detection_hint, "center-1", "the pack's best-practice hint rides");
    const saves = Object.values(row).filter((n) => n.class_type === "SaveImage");
    assert.ok(saves.some((s) => String(s.inputs.filename_prefix).endsWith("mask_combined")), "the sam2 primary anchors combined");
  });

  it("THE SEGM AUTO-LANE (the gap audit's #2): person-only rides SegmDetectorSEGS + the segm pin, others ride the bbox detector; every ride saves per-instance crops", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person" }, MASK_PINS, g, "r_segm");
    const row = dump(g);
    const segmDet = Object.values(row).find((n) => n.class_type === "SegmDetectorSEGS");
    assert.ok(segmDet, "person-only routes the SEGMENTATION detector");
    assert.ok(!Object.values(row).some((n) => n.class_type === "BboxDetectorSEGS"), "never both detectors for one payload");
    const providers = Object.values(row).filter((n) => n.class_type === "UltralyticsDetectorProvider");
    assert.ok(providers.some((n) => n.inputs.model_name === "segm/person_yolov8m-seg.pt"), "the pack's OWN segmentation detector rides");
    assert.ok(Object.values(row).some((n) => n.class_type === "SEGSToImageList"), "SEGSToImageList unwraps the crops");
    const cropSave = Object.values(row).find((n) => n.class_type === "SaveImage" && String(n.inputs.filename_prefix).endsWith("instance"));
    assert.ok(cropSave, "the per-instance crops save under the run dir");

    const g2 = new GraphBuilder();
    assert.throws(
      () => maskT1({ ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person,face" }, MASK_PINS, g2, "r_segm2"),
      /one detector per sam2 entry/,
      "a mixed-family set refuses LOUD (person rides segm, face rides bbox — split across two entries)",
    );
  });

  it("THE FIGURE MASKS (the operator's 2026-10-09 order): sam2_figures picks primary instances through the pack's own ImpactSEGSPicker — AND rides the SAME two-step (SAM refines the picked SEGS, never step-one segm/rect masks)", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person", sam2_figures: [2] }, MASK_PINS, g, "r_fig");
    const row = dump(g);
    const pick = Object.values(row).find((n) => n.class_type === "ImpactSEGSPicker")!;
    assert.equal(pick.inputs.picks, "2", "the figure number rides the picker's picks verbatim");
    // the figure arm's SAMDetectorCombined must eat the PICKED segs (the
    // two-step law: YOLO proposes, SAM extracts — per figure, every class)
    const sams = Object.values(row).filter((n) => n.class_type === "SAMDetectorCombined");
    assert.equal(sams.length, 2, "the combined arm AND the figure arm each refine (one SAM per arm)");
    const figSam = sams.find((n) => JSON.stringify(n.inputs.segs).includes("ImpactSEGSPicker"))!;
    assert.ok(figSam, "the figure's SAM reads the PICKER's segs, not the raw detection");
    assert.equal(figSam.inputs.detection_hint, "center-1", "the pack test's own hint rides the figure arm too");
    assert.equal(figSam.inputs.threshold, 0.93, "the primary's sam_threshold rides the figure arm too");
    const saves = Object.values(row).filter((n) => n.class_type === "SaveImage");
    assert.ok(saves.some((s) => String(s.inputs.filename_prefix).endsWith("mask_figure_2")), "figure two saves its own mask_figure_2");
  });

  it("a garbage sam2_figures refuses LOUD (1-based numbers, never a silent no-pick)", () => {
    assert.throws(
      () => maskT1({ ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person", sam2_figures: [0] }, MASK_PINS, new GraphBuilder(), "r_figx"),
      /sam2_figures must be 1-based/,
    );
  });

  it("the sam2 export arm: labels + its OWN box (the primary's box never leaks)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person",
      scope_bbox: [1, 2, 30, 40],
      exports: [["hands", "hand", [50, 60, 70, 80]]],
      export_kind: ["sam2"],
    }, MASK_PINS, g, "r_sam2e");
    const row = dump(g);
    const names = Object.values(row).filter((n) => n.class_type === "SaveImage").map((s) => String(s.inputs.filename_prefix));
    assert.ok(names.some((n) => n.endsWith("mask_hands")), "the sam2 export saves under its own name");
    const mults = Object.values(row).filter((n) => n.class_type === "MaskComposite" && (n.inputs as { operation?: string }).operation === "multiply");
    assert.equal(mults.length, 2, "the primary's box AND the export's own box each scope once (never cross-applied)");
  });

  it("an empty sam2 labels word refuses LOUD (never an empty detector selection)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => maskT1({ ...maskBase, primary_via_sam2: true, primary_sam2_labels: "" }, MASK_PINS, g, "r_sam2x"),
      /a sam2 selection needs labels/,
    );
  });

  it("an unstated sam2 labels word falls back to 'all' (the lane's detector fallback — never undefined)", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, primary_via_sam2: true }, MASK_PINS, g, "r_sam2a");
    const det = Object.values(dump(g)).find((n) => n.class_type === "BboxDetectorSEGS")!;
    assert.equal(det.inputs.labels, "all", "the detector reads 'all' when the caller states no word (the card never sends this — labelsOf refuses empty first)");
  });

  it("a scoped RTDETR primary multiplies the proposal (the primary's box scopes combined)", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, primary_via_rtdetr: true, scope_bbox: [8, 8, 64, 64] }, MASK_PINS, g, "r_rts");
    const row = dump(g);
    const mult = Object.values(row).find((n) => n.class_type === "MaskComposite" && (n.inputs as { operation?: string }).operation === "multiply");
    assert.ok(mult, "the RTDETR primary's box scopes mask_combined");
  });

  it("a non-string sam2 export payload refuses LOUD at the lane (never a coerced label)", () => {
    assert.throws(
      () => maskT1({ ...maskBase, exports: [["x", 7 as unknown as string]], export_kind: ["sam2"] }, MASK_PINS, new GraphBuilder(), "r_sam2t"),
      /sam2 export 'x' needs labels/,
    );
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

  it("a paint export with NO payload refuses loud (stroke 78: never a silent empty mask)", () => {
    assert.throws(
      () => maskT1({ ...maskBase, exports: [["ghost", ""]], export_kind: ["paint"] }, MASK_PINS, new GraphBuilder(), "r5f"),
      /paint export 'ghost' needs a payload — the drawn PNG is the mask/,
    );
  });

  it("per-entry paint payloads render one LoadImageMask each (the ordered-draw law)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_class: "person",
      exports: [["a", "/m/one.png"], ["b", "/m/one.png"], ["c", "/m/two.png"]],
      export_kind: ["paint", "paint", "paint"],
    }, MASK_PINS, g, "r5g");
    const loads = Object.values(dump(g)).filter((n) => n.class_type === "LoadImageMask");
    assert.equal(loads.length, 2, "two distinct paths = two nodes (the shared path memoizes)");
  });

  it("a per-entry bbox rides the export's third arm (the bbox-canvas leaf's rectangle)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_class: "person",
      exports: [["spot", "the dog", [12, 34, 120, 90]]], export_kind: ["text"],
    }, MASK_PINS, g, "r5h");
    const detect = Object.values(dump(g)).filter((n) => n.class_type === "SAM3_Detect");
    const scoped = detect.find((d) => (d.inputs.bboxes as { x?: number } | undefined)?.x === 12);
    assert.ok(scoped, "the per-entry bbox reaches the detect");
    assert.deepEqual(scoped!.inputs.bboxes, { x: 12, y: 34, width: 120, height: 90 });
  });

  it("a malformed per-entry bbox refuses loud (never a silent skip)", () => {
    assert.throws(
      () => maskT1({ ...maskBase, exports: [["x", "dog", [1, 2]]], export_kind: ["text"] }, MASK_PINS, new GraphBuilder(), "r5i"),
      /export bbox must be \[x, y, w, h\] pixels/,
    );
  });

  it("paint_masks chains the ordered union (one composite per hop, terminal combined_union)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_class: "person", sam_dilation: 0,
      paint_masks: ["/m/a.png", "/m/b.png"],
      exports: [["a", "/m/a.png"], ["b", "/m/b.png"]], export_kind: ["paint", "paint"],
    }, MASK_PINS, g, "r5j");
    const row = dump(g);
    const composites = Object.values(row).filter((n) => n.class_type === "MaskComposite");
    assert.equal(composites.length, 2, "two draws = two union hops");
    assert.ok(Object.values(row).some((n) => n.class_type === "SaveImage" && String(n.inputs.filename_prefix).endsWith("mask_combined_union")));
  });

  it("paint_masks without a primary refuses loud (an ordered draw needs a standalone source)", () => {
    assert.throws(
      () => maskT1({ ...maskBase, paint_masks: ["/m/a.png"], exports: [["a", "/m/a.png"]], export_kind: ["paint"] }, MASK_PINS, new GraphBuilder(), "r5k"),
      /paint_masks stacks ONTO a mask — add a standalone source/,
    );
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

  // ── stroke 95: the per-entry tune (each export owns its knobs) ──

  it("PER-ENTRY TUNE: a text export's tune threads ITS OWN detect (threshold + refine) and ITS OWN save (dilation)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_class: "person", sam_threshold: 0.7,
      exports: [["spot", "the dog", undefined, { threshold: 0.95, refine: 4, dilation: 12 }]],
      export_kind: ["text"],
    }, MASK_PINS, g, "r_t1");
    const row = dump(g);
    const dets = Object.values(row).filter((n) => n.class_type === "SAM3_Detect");
    assert.equal(dets.length, 2, "primary + the export");
    // the primary's detect builds first; the export's detect is the second
    const scoped = dets[1]!;
    assert.equal(scoped.inputs.threshold, 0.95, "the export's own threshold — never the primary's 0.7");
    assert.equal(scoped.inputs.refine_iterations, 4, "the export's own refine");
    const grows = Object.values(row).filter((n) => n.class_type === "GrowMask") as Array<{ inputs: Record<string, unknown> }>;
    assert.ok(grows.some((n) => n.inputs.expand === 12), "the export's own dilation reaches its save");
  });

  it("PER-ENTRY TUNE: an unstated tune arm falls back to the lane flat reads (never undefined)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_class: "person", sam_threshold: 0.71,
      exports: [["spot", "the dog", undefined, { threshold: 0.9 }]],
      export_kind: ["text"],
    }, MASK_PINS, g, "r_t2");
    const dets = Object.values(dump(g)).filter((n) => n.class_type === "SAM3_Detect");
    const spot = dets[1]!;
    assert.equal(spot.inputs.threshold, 0.9, "the stated arm rides");
    assert.equal(spot.inputs.refine_iterations, 2, "the unstated refine falls back to the pin");
  });

  it("PER-ENTRY TUNE: a sam2 export's tune threads its detector (detection_threshold + threshold)", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person",
      exports: [["hands", "hand", undefined, { detection_threshold: 0.2, threshold: 0.9, dilation: 5 }]],
      export_kind: ["sam2"],
    }, MASK_PINS, g, "r_t3");
    const row = dump(g);
    const dets = Object.values(row).filter((n) => n.class_type === "BboxDetectorSEGS");
    const hands = dets.find((d) => d.inputs.labels === "hand")!;
    assert.equal(hands.inputs.threshold, 0.2, "the export's own detection threshold reaches its detector");
    const combs = Object.values(row).filter((n) => n.class_type === "SAMDetectorCombined");
    assert.ok(combs.some((c) => c.inputs.threshold === 0.9), "the export's own SAM threshold");
    assert.ok(combs.some((c) => c.inputs.dilation === 5), "the export's own dilation");
  });

  it("a malformed export tune refuses LOUD (never a coerced knob)", () => {
    assert.throws(
      () => maskT1({ ...maskBase, primary_class: "p", exports: [["x", "dog", undefined, 7]], export_kind: ["text"] }, MASK_PINS, new GraphBuilder(), "r_t4"),
      /maskT1: an export tune must be an object/,
    );
    assert.throws(
      () => maskT1({ ...maskBase, primary_class: "p", exports: [["x", "dog", undefined, { threshold: "high" }]], export_kind: ["text"] }, MASK_PINS, new GraphBuilder(), "r_t5"),
      /maskT1: an export tune's 'threshold' must be a finite number/,
    );
    assert.throws(
      () => maskT1({ ...maskBase, primary_class: "p", exports: [["x", "dog", undefined, { mystery: 1 }]], export_kind: ["text"] }, MASK_PINS, new GraphBuilder(), "r_t6"),
      /maskT1: an export tune carries unknown key\(s\) mystery/,
    );
    // THE AUDIT'S G1: the finite check once covered only 4 of 9
    // keys — the 5 newer knobs flowed garbage to node inputs (an
    // engine 400, not a loud lane refusal). EVERY tune key validates.
    for (const key of ["box_expansion", "hint_threshold", "detection_dilation", "crop_factor", "drop_size"]) {
      assert.throws(
        () => maskT1({ ...maskBase, primary_class: "p", exports: [["x", "dog", undefined, { [key]: "lots" }]], export_kind: ["text"] }, MASK_PINS, new GraphBuilder(), `r_g1_${key}`),
        new RegExp(`maskT1: an export tune's '${key}' must be a finite number`),
        `${key} validates (G1 wall)`,
      );
    }
  });
});

// ── the tagger dispatch (four arms + the no-arm refusal) ──────────
describe("taggerLane (the four-family dispatch)", () => {
  const arms: Array<[string, RegExp, Record<string, unknown>, string, string]> = [
    // family, node, arm params, loader class, expected model wire value
    ["wd14", /WD14Tagger\|pysssss/, { input_image: "/m/p.png", checkpoint: "c", threshold: 0.35 }, "WD14Tagger|pysssss", "c"],
    ["joytag", /CXH_JoyTag/, { input_image: "/m/p.png", threshold: 0.2 }, "CXH_JoyTag", ""],
    ["florence2", /DownloadAndLoadFlorence2Model/, { input_image: "/m/p.png", checkpoint: "f" }, "DownloadAndLoadFlorence2Model", "f"],
    ["joycaption", /JJC_JoyCaption/, { input_image: "/m/p.png", checkpoint: "j" }, "JJC_DownloadAndLoadJoyCaptionModel", "j"],
  ];
  for (const [family, node, params, loader, wired] of arms) {
    it(`the ${family} arm rides its family node`, () => {
      const model = facts.models[family]!;
      assert.ok(model, `the ${family} facts row serves`);
      const g = new GraphBuilder();
      taggerLane(params, model, g, "run_1");
      const row = dump(g);
      assert.ok(classes(row).some((c) => node.test(c)), `the ${family} node rides`);
      if (wired !== "") {
        const loaderNode = Object.values(row).find((n) => n.class_type === loader)!;
        assert.equal(loaderNode.inputs.model, wired, `the ${family} arm wires the rail-stamped checkpoint`);
      }
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

  });

  it("finalizeMask strips ONLY the autofilled quarter-hint (the red-box hunt)", () => {
    const g = {
      A: { class_type: "SAM3_Detect", inputs: { threshold: 0.5, bboxes: { x: 0, y: 0, width: 512, height: 512 } } },
      B: { class_type: "SAM3_Detect", inputs: { threshold: 0.5, bboxes: { x: 8, y: 9, width: 64, height: 64 } } },
      C: { class_type: "SAM3_Detect", inputs: { threshold: 0.5, bboxes: ["RTDETR_detect.0", 0] } },
      D: { class_type: "SAM3_Detect", inputs: { threshold: 0.5 } },
      E: { class_type: "KSampler", inputs: { seed: 1 } },
    } as never;
    const out = finalizeMask(g);
    assert.ok(!("bboxes" in out.A.inputs), "the default-equal quarter-hint dies — the whole image is the search");
    assert.deepEqual(out.B.inputs.bboxes, { x: 8, y: 9, width: 64, height: 64 }, "a drawn Region quad survives");
    assert.deepEqual(out.C.inputs.bboxes, ["RTDETR_detect.0", 0], "RT-DETR's own boxes (a link) survive");
    assert.ok(!("bboxes" in out.D.inputs), "an already-hintless detect is untouched");
    assert.equal(out.E.inputs.seed, 1, "non-SAM3 nodes are untouched");
  });
});

// ── the small exported helpers ────────────────────────────────────
describe("the exported helpers", () => {
  it("annyLane composites whatever body handle the card hands it (the admission stays on the card)", () => {
    const render = { resolution: 2, framing: 2, focal_length: 2, samples: 2, transparent: true };
    const g = new GraphBuilder();
    const prim = g.node("PrimitiveString", { value: "/m/b.glb" });
    annyLane({ ...render }, g, prim.out());
    const row = dump(g);
    assert.ok(row["CompositeCharacter.0"], "the composite rides the card's handle");
    assert.ok(classes(row).some((c) => c.startsWith("RayRenderGLBViews")), "the views ride");
  });

  it("annyLane has NO SAM arm (photo→body is the hmr-estimate verb — stroke 89)", () => {
    const render = { resolution: 2, framing: 2, focal_length: 2, samples: 2, transparent: true };
    const g = new GraphBuilder();
    const prim = g.node("PrimitiveString", { value: "/m/b.glb" });
    annyLane({ source_image: "/m/s.png", ...render } as Record<string, unknown>, g, prim.out());
    const row = classes(dump(g));
    assert.ok(!row.includes("RaySAMSegmentHairClothing"), "the SAM sprite node is gone from the lane");
    assert.ok(!row.includes("LoadImage"), "no image ingest arm");
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

// ── kit helpers (the ideogram lane + finalize retired with the card) ──
describe("kit helpers (strip/defaults — the ideogram lane retired with its card)", () => {
  it("stripEmptyAutofill drops empties and keeps the rest (both ==='' arms)", () => {
    // finalizeMotion is the stripEmptyAutofill face WITH entries
    // (MOTION_STRIP — ANNY_STRIP; the fit/skin strips
    // retired stroke 87 with their cards).
    const out = finalizeMotion({
      M: { class_type: "KimodoTextToPose", inputs: { prev_motion_npz: "", motion_prompts: "a walk" } },
      N: { class_type: "LoadImage", inputs: { image: "kept.png" } },
    } as never);
    assert.ok(!("prev_motion_npz" in out.M.inputs), "the empty string drops");
    assert.equal(out.M.inputs.motion_prompts, "a walk", "a non-empty value stays");
    assert.equal(out.N.inputs.image, "kept.png", "classes outside the table ride untouched");
  });

  it("finalizeH3: the t4r family marker rides untouched (strip never fires)", () => {
    const out = finalizeH3({
      "MiniMaxH3ImageToVideo.0": { class_type: "MiniMaxH3ImageToVideo", inputs: { image: "x.png" } },
    } as never);
    assert.deepEqual(out, {
      "MiniMaxH3ImageToVideo.0": { class_type: "MiniMaxH3ImageToVideo", inputs: { image: "x.png" } },
    }, "the t4r marker short-circuits the strip");
  });

  it("finalizeH3: a non-t4r graph strips the t4 autofill keys, keeps the rest", () => {
    const out = finalizeH3({
      L: { class_type: "LTX_lora_loader", inputs: { lora_ui: "", strength: 0.8 } },
      S: { class_type: "SeedVR2LoadVAEModel", inputs: { cache_model: true, decode_tiled: "", keep: 1 } },
      X: { class_type: "LoadImage", inputs: { image: "ref.png" } },
    } as never);
    assert.ok(!("lora_ui" in out.L.inputs), "a strip-table empty drops");
    assert.equal(out.L.inputs.strength, 0.8, "a non-empty table value stays");
    assert.ok(!("decode_tiled" in out.S.inputs), "the seed strip row drops empties too");
    assert.equal(out.S.inputs.keep, 1, "untouched seed keys stay");
    assert.equal(out.X.inputs.image, "ref.png", "classes outside the table ride");
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

  it("imageEdit on 2511 maps the unified stack onto the stock image2/image3 slots (one concept, narrow end)", () => {
    const model = facts.models["qwen-img-edit-2511"]!;
    const g = new GraphBuilder();
    imageEdit({
      prompt: "make it night", image1: "/m/1.png",
      reference_images: ["/m/s1.png", "/m/s2.png"],
      negative_prompt: "blur", seed: 5,
    }, model, g, "run_5s");
    const row = dump(g);
    const loads = Object.values(row).filter((n) => n.class_type === "LoadImage");
    assert.equal(loads.length, 3, "anchor + two stack refs load (no legacy slots stated)");
    const enc = Object.values(row).filter((n) => n.class_type === "TextEncodeQwenImageEditPlus");
    assert.ok(enc.length >= 2, "pos + neg encode");
    assert.ok("image2" in enc[0]!.inputs && "image3" in enc[0]!.inputs, "the stack's refs ride the stock slots");
  });

  it("imageEdit on 2511 refuses past-2 references LOUD at the lane (direct callers bypass the gate)", () => {
    const model = facts.models["qwen-img-edit-2511"]!;
    assert.throws(
      () => imageEdit({
        prompt: "too many", image1: "/m/1.png",
        image2: "/m/2.png", reference_images: ["/m/s1.png", "/m/s2.png"],
        seed: 5,
      }, model, new GraphBuilder(), "run_5x"),
      /'reference_images' fires .*\(this lane takes 2 references/,
    );
  });

  it("the stock arm asserts its own node shape (a lying DECL with max_images past 3 refuses, never drops)", () => {
    const lying = {
      ...facts.models["qwen-img-edit-2511"]!,
      lane_inputs: { ...facts.models["qwen-img-edit-2511"]!.lane_inputs, max_images: 99 },
    };
    assert.throws(
      () => imageEdit({
        prompt: "lying decl", image1: "/m/1.png",
        reference_images: ["/m/s1.png"],
        seed: 5,
      }, lying, new GraphBuilder(), "run_5lie"),
      /'reference_images' fires .*stock TextEncodeQwenImageEditPlus.*max_images 99/,
      "the arm serves the 3-input stock node — a roomier DECL is a bug, refused LOUD",
    );
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

  it("a non-object single-entry bag states nothing (the typeof arm)", () => {
    assert.doesNotThrow(
      () => refuseImageEditFiring({ mask: ["/m/stray.png"] }),
      "a single string entry is not a region row — the gate passes",
    );
    assert.doesNotThrow(
      () => refuseImageEditFiring({ mask: [null] }),
      "a single null entry is not a region row — the gate passes",
    );
  });

  it("the gate merges the same row (flat wins, bag fills the rest)", () => {
    assert.doesNotThrow(
      () => refuseImageEditFiring({ input_mask: "/m/flat.png", mask: [{ input_mask: "/m/bag.png" }] }),
      "flat region + single bag entry passes the gate — the flat key wins the merge",
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

// ── the stroke-78 arm sweep (coverage: every new loud arm fires) ──

describe("maskT1 (the stroke-78 arms)", () => {
  it("a NaN-coercing bbox quad refuses loud (finite numbers only)", () => {
    assert.throws(
      () => maskT1({ ...maskBase, exports: [["x", "dog", [1, "wide", 3, 4]]], export_kind: ["text"] }, MASK_PINS, new GraphBuilder(), "r8a"),
      /export bbox needs four finite numbers/,
    );
  });

  it("a non-array paint_masks refuses loud", () => {
    assert.throws(
      () => maskT1({ ...maskBase, paint_masks: "nope" as never }, MASK_PINS, new GraphBuilder(), "r8b"),
      /paint_masks must be an array of payload paths/,
    );
  });

  it("an empty paint_masks with no primary stays silent (nothing to union)", () => {
    const g = new GraphBuilder();
    maskT1({ ...maskBase, paint_masks: [] }, MASK_PINS, g, "r8c");
    assert.ok(!classes(dump(g)).includes("MaskComposite"), "an empty chain unions nothing");
  });

  it("an empty-path hop SKIPS (the '' continue arm) yet the terminal still saves", () => {
    const g = new GraphBuilder();
    maskT1({
      ...maskBase, primary_class: "person", paint_masks: [""],
      exports: [["only", "/m/a.png"]], export_kind: ["paint"],
    }, MASK_PINS, g, "r8d");
    const row = dump(g);
    assert.ok(!classes(row).includes("MaskComposite"), "the empty hop composites nothing");
    assert.ok(Object.values(row).some((n) => n.class_type === "SaveImage" && String(n.inputs.filename_prefix).endsWith("mask_combined_union")), "the terminal save still rides");
  });
});

// ── THE TTS LANE DISPATCH (the lane-branch law, 2026-09-20) ──────────
// branch key = lane_inputs DATA (synth_lane), never a family-id
// switch — the latent_node/text_encode_node precedent, applied to
// the tts trio. The stub ids are DELIBERATELY NOT the real family
// ids: if the dispatch keyed on model.id these tests would route
// wrong (that is the point — the key is the data, not the name).
describe("the tts lane dispatch (synth_lane data, never the family id)", () => {
  const stub = (id: string, synthLane: string) => ({
    id,
    card: "tts",
    defaults: { mode: "tts" },
    lane_inputs: { model_path: id, synth_lane: synthLane },
    variants: [],
    variant_groups: [],
    mods: ["qvoice_save"],
    accepts: [],
    studio: {},
  }) as never as import("../src/facts.ts").ModelFacts

  it("synth_lane 'design' routes the VoiceStudio lane whatever the id", () => {
    const g = new GraphBuilder();
    // THE LANE'S OWN PROMPT ROW (2026-09-23): design_prompt is the
    // card's task-named "Voice Persona & Timbre" row — the pack
    // carries the export name + sampling, never the prompt.
    ttsT1({ text: "hi", seed: 1, voice_name: "V", design_prompt: "warm" }, stub("not-the-real-id", "design"), g, "rd");
    assert.ok(classes(dump(g)).includes("AudiocoreVoiceStudio"), "the design lane emits the studio node");
  });

  it("synth_lane 'clone' routes the clone lane (reference audio + transcript)", () => {
    const g = new GraphBuilder();
    ttsT1({ text: "hi", seed: 1, ref_audio: "/a.wav", ref_text: "a" }, stub("whatever", "clone"), g, "rc");
    const row = dump(g);
    assert.ok(classes(row).includes("AudiocoreTTS"), "the clone lane emits the synth node");
    assert.ok(Object.values(row).some((n) => n.inputs.reference_audio === "/a.wav"), "the reference rides");
  });

  it("an absent key falls to the speak lane (the ''-absent law)", () => {
    const g = new GraphBuilder();
    ttsT1({ text: "hi", seed: 1 }, stub("anything", ""), g, "rs");
    const row = dump(g);
    assert.ok(classes(row).includes("AudiocoreTTS"), "the speak lane emits the synth node");
    assert.ok(!Object.values(row).some((n) => n.class_type === "AudiocoreVoiceStudio"), "no studio node");
  });
});
