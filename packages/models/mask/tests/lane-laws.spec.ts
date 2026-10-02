// @melite/models-mask — THE MASK LANE'S WALLS, at the family home
// (the atom vocabulary's F1 mint, operator order 2026-10-12; moved
// from image/mask with the lane, having moved there from the kit
// wall — the cases walk the composed graph, and the action composes
// the same graph). The lane is the mask family's declared select
// action; the card binds it through declaredAction off the DECL.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { select as maskLane, MASK_WEIGHTS } from "../src/actions.ts";

const FACTS_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "packages", "engines", "comfyui-cordis", "data", "model-facts.json");
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

// THE FAMILY'S WEIGHTS ARE CONSTANTS (the F1 mint's door change, with
// the behavior): the door no longer reads lane_inputs — no variant of
// this family swaps a weight, so the three names live beside the
// build (MASK_WEIGHTS, the LANE_FILES pattern) and the row carries
// nothing. The old empty-pin refusals died with the row-read: an
// empty loader name is unrepresentable now.
const FACTS: ModelFacts = {
  id: "mask", family: "mask-select", card: "mask", defaults: {},
  lane_inputs: {}, variants: [], variant_groups: [], outputs: [], mods: [],
} as unknown as ModelFacts;

const dump = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;
const classes = (row: Record<string, { class_type: string }>): string[] => Object.values(row).map((n) => n.class_type);

// the mask lane's own fixtures (the case blocks below came from the kit
// wall verbatim)
const maskBase = {
  input_image: "/m/p.png", sam_threshold: 0.93, sam_dilation: 0,
  export_boxes: false, primary_via_rtdetr: false,
};

describe("the mask lane (the selection lane's arms — moved from the kit wall with the lane)", () => {
  it("the class-prompt primary arm (CLIP conditioning)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_class: "person" }, FACTS, g, "r1");
    const row = dump(g);
    assert.ok(classes(row).includes("CLIPTextEncode"), "the class arm conditions");
    assert.ok(classes(row).includes("SAM3_Detect"), "the detect rides");
  });

  it("the free-prompt primary arm", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_prompt: "the red cloak" }, FACTS, g, "r2");
    assert.ok(classes(dump(g)).includes("CLIPTextEncode"));
  });

  it("the painted primary arm (LoadImageMask)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_is_paint: true, paint_mask: "/m/paint.png" }, FACTS, g, "r3");
    assert.ok(classes(dump(g)).includes("LoadImageMask"));
  });

  it("THE SPELL ARM (mask-as-consumer): a spelled anchor builds no loader — the spell rides every tensor slot verbatim", () => {
    // THE GAP-AUDIT HOLE (the independent audit's gap 1): the mask
    // card seats input_image, so a producer CAN wire into it — but
    // the lane built LoadImage unconditionally and ROW-4 refused
    // the link at merge (validate-green, run-red). Now the spell
    // rides the detector tensor slots verbatim and no LoadImage
    // exists to carry it; a path keeps its loader (pinned below).
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, input_image: "$src", primary_class: "person" }, FACTS, g, "r_spell");
    const row = dump(g);
    assert.ok(!classes(row).includes("LoadImage"), "no loader carries the spell");
    const det = Object.values(row).find((n) => n.class_type === "SAM3_Detect")!;
    assert.equal(det.inputs.image, "$src", "the detector reads the wired tensor verbatim");
  });

  it("a file anchor keeps its loader (the disk handoff)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, input_image: "/m/p.png", primary_class: "person" }, FACTS, g, "r_path");
    const row = dump(g);
    const load = Object.values(row).find((n) => n.class_type === "LoadImage")!;
    assert.equal(load.inputs.image, "/m/p.png", "paths keep the LoadImage disk handoff");
  });

  it("the RT-DETR proposal lane (boxes + manifest + capped instances)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, export_boxes: true, primary_via_rtdetr: true,
      detection_threshold: 0.4, max_instances: 0, // || 100 fallback arm
    }, FACTS, g, "r4");
    const row = dump(g);
    assert.ok(classes(row).includes("RTDETR_detect"), "the proposal rides");
    assert.ok(classes(row).includes("DrawBBoxes"), "the manifest draws");
    const rt = Object.values(row).find((n) => n.class_type === "RTDETR_detect")!;
    // THE CARD'S LAW: max_instances 0 means NO CAP (the schema's own
    // "0 = no cap"), so the node keeps its own default rather than a
    // silent 100 — `|| 100` used to drop every detection past 100.
    assert.equal(rt.inputs.max_detections, 0, "a zero max_instances means NO cap, not a 100 ceiling");
  });

  it("the exports loop: paint + text (the shorter zip arm); scope_bbox is the PRIMARY's box and never leaks into exports", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, paint_mask: "/m/paint.png",
      primary_class: "person",
      exports: [["painted", ""], ["cloak", "the red cloak"], ["extra", "unmatched"]],
      export_kind: ["paint", "text"],
      scope_bbox: [8, 8, 64, 64],
    }, FACTS, g, "r5");
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
    instantiateAction(maskLane, {
      ...maskBase, primary_via_sam2: true, primary_sam2_labels: "face,hand", detection_threshold: 0.6,
    }, FACTS, g, "r_sam2");
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
    assert.equal(sam.inputs.model_name, MASK_WEIGHTS.sam2, "the family's SAM2 constant rides (never a caller string)");
    const comb = Object.values(row).find((n) => n.class_type === "SAMDetectorCombined")!;
    assert.equal(comb.inputs.detection_hint, "center-1", "the pack's best-practice hint rides");
    const saves = Object.values(row).filter((n) => n.class_type === "SaveImage");
    assert.ok(saves.some((s) => String(s.inputs.filename_prefix).endsWith("mask_combined")), "the sam2 primary anchors combined");
  });

  it("THE SEGM AUTO-LANE (the gap audit's #2): person-only rides SegmDetectorSEGS + the segm pin, others ride the bbox detector; every ride saves per-instance crops", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person" }, FACTS, g, "r_segm");
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
      () => instantiateAction(maskLane, { ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person,face" }, FACTS, g2, "r_segm2"),
      /one detector per sam2 entry/,
      "a mixed-family set refuses LOUD (person rides segm, face rides bbox — split across two entries)",
    );
  });

  it("THE FIGURE MASKS (the operator's 2026-10-09 order): sam2_figures picks primary instances through the pack's own ImpactSEGSPicker — AND rides the SAME two-step (SAM refines the picked SEGS, never step-one segm/rect masks)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person", sam2_figures: [2] }, FACTS, g, "r_fig");
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

  it("a scoped figure export applies the primary scope to the refined figure mask", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase,
      primary_via_sam2: true,
      primary_sam2_labels: "person",
      sam2_figures: [1],
      scope_bbox: [4, 5, 40, 50],
    }, FACTS, g, "r_fig_scope");
    const row = dump(g);
    const mults = Object.values(row).filter((n) => n.class_type === "MaskComposite" && (n.inputs as { operation?: string }).operation === "multiply");
    assert.equal(mults.length, 2);
    assert.ok(Object.values(row).some((n) => n.class_type === "SaveImage" && String(n.inputs.filename_prefix).endsWith("mask_figure_1")));
  });

  it("a garbage sam2_figures refuses LOUD (1-based numbers, never a silent no-pick)", () => {
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person", sam2_figures: [0] }, FACTS, new GraphBuilder(), "r_figx"),
      /sam2_figures must be 1-based/,
    );
  });

  it("the sam2 export arm: labels + its OWN box (the primary's box never leaks)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person",
      scope_bbox: [1, 2, 30, 40],
      exports: [["hands", "hand", [50, 60, 70, 80]]],
      export_kind: ["sam2"],
    }, FACTS, g, "r_sam2e");
    const row = dump(g);
    const names = Object.values(row).filter((n) => n.class_type === "SaveImage").map((s) => String(s.inputs.filename_prefix));
    assert.ok(names.some((n) => n.endsWith("mask_hands")), "the sam2 export saves under its own name");
    const mults = Object.values(row).filter((n) => n.class_type === "MaskComposite" && (n.inputs as { operation?: string }).operation === "multiply");
    assert.equal(mults.length, 2, "the primary's box AND the export's own box each scope once (never cross-applied)");
  });

  it("an empty sam2 labels word refuses LOUD (never an empty detector selection)", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, primary_via_sam2: true, primary_sam2_labels: "" }, FACTS, g, "r_sam2x"),
      /a sam2 selection needs labels/,
    );
  });

  it("an unstated sam2 labels word falls back to 'all' (the lane's detector fallback — never undefined)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_via_sam2: true }, FACTS, g, "r_sam2a");
    const det = Object.values(dump(g)).find((n) => n.class_type === "BboxDetectorSEGS")!;
    assert.equal(det.inputs.labels, "all", "the detector reads 'all' when the caller states no word (the card never sends this — labelsOf refuses empty first)");
  });

  it("a scoped RTDETR primary multiplies the proposal (the primary's box scopes combined)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_via_rtdetr: true, scope_bbox: [8, 8, 64, 64] }, FACTS, g, "r_rts");
    const row = dump(g);
    const mult = Object.values(row).find((n) => n.class_type === "MaskComposite" && (n.inputs as { operation?: string }).operation === "multiply");
    assert.ok(mult, "the RTDETR primary's box scopes mask_combined");
  });

  it("a non-string sam2 export payload refuses LOUD at the lane (never a coerced label)", () => {
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, exports: [["x", 7 as unknown as string]], export_kind: ["sam2"] }, FACTS, new GraphBuilder(), "r_sam2t"),
      /sam2 export 'x' needs labels/,
    );
  });

  it("the paint union folds into combined (GrowMask ×2 + MaskComposite)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, primary_class: "person", paint_mask: "/m/p.png",
      sam_dilation: 4, union_paint_into_combined: true,
      exports: [["all", ""]], export_kind: ["paint"],
    }, FACTS, g, "r6");
    const row = dump(g);
    assert.ok(classes(row).includes("MaskComposite"), "the union composites");
    assert.ok(classes(row).includes("GrowMask"), "dilation re-applies on the primary");
    assert.ok(Object.values(row).some((n) => n.class_type === "SaveImage" && String(n.inputs.filename_prefix).endsWith("mask_combined_union")));
  });

  it("a TEXT export with an empty payload detects unconditioned (the if (payload) arm)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, primary_class: "person",
      exports: [["plain", ""]], export_kind: ["text"],
    }, FACTS, g, "r5b");
    const dets = Object.values(dump(g)).filter((n) => n.class_type === "SAM3_Detect");
    assert.equal(dets.length, 2, "primary + the unconditioned export");
    assert.ok(!("conditioning" in dets[1]!.inputs), "no payload, no conditioning");
  });

  it("a painted primary with an unstated paint_mask rides the '' fallback", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_is_paint: true }, FACTS, g, "r5c");
    const load = Object.values(dump(g)).find((n) => n.class_type === "LoadImageMask")!;
    assert.equal(load.inputs.image, "");
  });

  it("the union refuses nothing when there is no paint to union (the && short-circuit arms)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, primary_class: "person", union_paint_into_combined: true,
    }, FACTS, g, "r5d");
    assert.ok(!classes(dump(g)).includes("MaskComposite"), "no paint export, no union");
  });

  it("two paint exports share the ONE masked node (the paintMasked memo)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, paint_mask: "/m/paint.png",
      exports: [["one", ""], ["two", ""]], export_kind: ["paint", "paint"],
    }, FACTS, g, "r5e");
    const loads = Object.values(dump(g)).filter((n) => n.class_type === "LoadImageMask");
    assert.equal(loads.length, 1, "the second paint export reuses the masked node");
  });

  it("a paint export with NO payload refuses loud (stroke 78: never a silent empty mask)", () => {
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, exports: [["ghost", ""]], export_kind: ["paint"] }, FACTS, new GraphBuilder(), "r5f"),
      /paint export 'ghost' needs a payload — the drawn PNG is the mask/,
    );
  });

  it("per-entry paint payloads render one LoadImageMask each (the ordered-draw law)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, primary_class: "person",
      exports: [["a", "/m/one.png"], ["b", "/m/one.png"], ["c", "/m/two.png"]],
      export_kind: ["paint", "paint", "paint"],
    }, FACTS, g, "r5g");
    const loads = Object.values(dump(g)).filter((n) => n.class_type === "LoadImageMask");
    assert.equal(loads.length, 2, "two distinct paths = two nodes (the shared path memoizes)");
  });

  it("a per-entry bbox rides the export's third arm (the bbox-canvas leaf's rectangle)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, primary_class: "person",
      exports: [["spot", "the dog", [12, 34, 120, 90]]], export_kind: ["text"],
    }, FACTS, g, "r5h");
    const detect = Object.values(dump(g)).filter((n) => n.class_type === "SAM3_Detect");
    const scoped = detect.find((d) => (d.inputs.bboxes as { x?: number } | undefined)?.x === 12);
    assert.ok(scoped, "the per-entry bbox reaches the detect");
    assert.deepEqual(scoped!.inputs.bboxes, { x: 12, y: 34, width: 120, height: 90 });
  });

  it("a malformed per-entry bbox refuses loud (never a silent skip)", () => {
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, exports: [["x", "dog", [1, 2]]], export_kind: ["text"] }, FACTS, new GraphBuilder(), "r5i"),
      /export bbox must be \[x, y, w, h\] pixels/,
    );
  });

  it("paint_masks chains the ordered union (one composite per hop, terminal combined_union)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, primary_class: "person", sam_dilation: 0,
      paint_masks: ["/m/a.png", "/m/b.png"],
      exports: [["a", "/m/a.png"], ["b", "/m/b.png"]], export_kind: ["paint", "paint"],
    }, FACTS, g, "r5j");
    const row = dump(g);
    const composites = Object.values(row).filter((n) => n.class_type === "MaskComposite");
    assert.equal(composites.length, 2, "two draws = two union hops");
    assert.ok(Object.values(row).some((n) => n.class_type === "SaveImage" && String(n.inputs.filename_prefix).endsWith("mask_combined_union")));
  });

  it("paint_masks without a primary refuses loud (an ordered draw needs a standalone source)", () => {
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, paint_masks: ["/m/a.png"], exports: [["a", "/m/a.png"]], export_kind: ["paint"] }, FACTS, new GraphBuilder(), "r5k"),
      /paint_masks stacks ONTO a mask — add a standalone source/,
    );
  });

  it("a malformed scope_bbox refuses loud (never silently dropped)", () => {
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, exports: [["x", ""]], export_kind: ["text"], scope_bbox: [1, 2, 3] }, FACTS, new GraphBuilder(), "r7"),
      /scope_bbox refused .* exactly \[x, y, w, h\] pixels \(got 3 values\)/,
    );
  });

  it("dilation grows (the non-zero arm)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_class: "p", sam_dilation: 6 }, FACTS, g, "r8");
    const grow = Object.values(dump(g)).find((n) => n.class_type === "GrowMask");
    assert.ok(grow, "dilation rides");
    assert.equal(grow!.inputs.expand, 6);
  });

  it("refine_iterations falls back to the 2 pin when unstated", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_class: "p" }, FACTS, g, "r9");
    const detect = Object.values(dump(g)).find((n) => n.class_type === "SAM3_Detect")!;
    assert.equal(detect.inputs.refine_iterations, 2);
  });

  // ── stroke 95: the per-entry tune (each export owns its knobs) ──

  it("PER-ENTRY TUNE: a text export's tune threads ITS OWN detect (threshold + refine) and ITS OWN save (dilation)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, primary_class: "person", sam_threshold: 0.7,
      exports: [["spot", "the dog", undefined, { threshold: 0.95, refine: 4, dilation: 12 }]],
      export_kind: ["text"],
    }, FACTS, g, "r_t1");
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
    instantiateAction(maskLane, {
      ...maskBase, primary_class: "person", sam_threshold: 0.71,
      exports: [["spot", "the dog", undefined, { threshold: 0.9 }]],
      export_kind: ["text"],
    }, FACTS, g, "r_t2");
    const dets = Object.values(dump(g)).filter((n) => n.class_type === "SAM3_Detect");
    const spot = dets[1]!;
    assert.equal(spot.inputs.threshold, 0.9, "the stated arm rides");
    assert.equal(spot.inputs.refine_iterations, 2, "the unstated refine falls back to the pin");
  });

  it("PER-ENTRY TUNE: a sam2 export's tune threads its detector (detection_threshold + threshold)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, primary_via_sam2: true, primary_sam2_labels: "person",
      exports: [["hands", "hand", undefined, { detection_threshold: 0.2, threshold: 0.9, dilation: 5 }]],
      export_kind: ["sam2"],
    }, FACTS, g, "r_t3");
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
      () => instantiateAction(maskLane, { ...maskBase, primary_class: "p", exports: [["x", "dog", undefined, 7]], export_kind: ["text"] }, FACTS, new GraphBuilder(), "r_t4"),
      /maskT1: an export tune must be an object/,
    );
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, primary_class: "p", exports: [["x", "dog", undefined, { threshold: "high" }]], export_kind: ["text"] }, FACTS, new GraphBuilder(), "r_t5"),
      /maskT1: an export tune's 'threshold' must be a finite number/,
    );
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, primary_class: "p", exports: [["x", "dog", undefined, { mystery: 1 }]], export_kind: ["text"] }, FACTS, new GraphBuilder(), "r_t6"),
      /maskT1: an export tune carries unknown key\(s\) mystery/,
    );
    // THE AUDIT'S G1: the finite check once covered only 4 of 9
    // keys — the 5 newer knobs flowed garbage to node inputs (an
    // engine 400, not a loud lane refusal). EVERY tune key validates.
    for (const key of ["box_expansion", "hint_threshold", "detection_dilation", "crop_factor", "drop_size"]) {
      assert.throws(
        () => instantiateAction(maskLane, { ...maskBase, primary_class: "p", exports: [["x", "dog", undefined, { [key]: "lots" }]], export_kind: ["text"] }, FACTS, new GraphBuilder(), `r_g1_${key}`),
        new RegExp(`maskT1: an export tune's '${key}' must be a finite number`),
        `${key} validates (G1 wall)`,
      );
    }
  });
});

describe("the mask lane (the stroke-78 arms — moved from the kit wall with the lane)", () => {
  it("a NaN-coercing bbox quad refuses loud (finite numbers only)", () => {
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, exports: [["x", "dog", [1, "wide", 3, 4]]], export_kind: ["text"] }, FACTS, new GraphBuilder(), "r8a"),
      /export bbox needs four finite numbers/,
    );
  });

  it("a non-array paint_masks refuses loud", () => {
    assert.throws(
      () => instantiateAction(maskLane, { ...maskBase, paint_masks: "nope" as never }, FACTS, new GraphBuilder(), "r8b"),
      /paint_masks must be an array of payload paths/,
    );
  });

  it("an empty paint_masks with no primary stays silent (nothing to union)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, paint_masks: [] }, FACTS, g, "r8c");
    assert.ok(!classes(dump(g)).includes("MaskComposite"), "an empty chain unions nothing");
  });

  it("an empty-path hop SKIPS (the '' continue arm) yet the terminal still saves", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, {
      ...maskBase, primary_class: "person", paint_masks: [""],
      exports: [["only", "/m/a.png"]], export_kind: ["paint"],
    }, FACTS, g, "r8d");
    const row = dump(g);
    assert.ok(!classes(row).includes("MaskComposite"), "the empty hop composites nothing");
    assert.ok(Object.values(row).some((n) => n.class_type === "SaveImage" && String(n.inputs.filename_prefix).endsWith("mask_combined_union")), "the terminal save still rides");
  });
// THE WEIGHTS ARE THE FAMILY'S CONSTANTS (the F1 mint's door change,
// with the behavior): the door reads NOTHING off a row — the three
// names are the family's own (MASK_WEIGHTS beside the build), so
// whatever a row carries, the loaders wire the constants and an
// empty name is unrepresentable. The old door refused a missing or
// empty pin from the row; the row-read died with the tool-lane
// stroke (no variant of this family swaps a weight).
  it("the facts door closes over the family constants — any row wires the same three weights (never a loader with a caller name)", () => {
    const g = new GraphBuilder();
    instantiateAction(maskLane, { ...maskBase, primary_via_rtdetr: true, export_boxes: true }, { ...FACTS, lane_inputs: { checkpoint: "", unet: "caller.pth", sam2: "" } } as ModelFacts, g, "r_pin");
    const row = dump(g);
    const ckpt = Object.values(row).find((n) => n.class_type === "CheckpointLoaderSimple")!;
    assert.equal(ckpt.inputs.ckpt_name, MASK_WEIGHTS.checkpoint, "the checkpoint constant rides (a row value cannot reach a loader)");
    const unet = Object.values(row).find((n) => n.class_type === "UNETLoader")!;
    assert.equal(unet.inputs.unet_name, MASK_WEIGHTS.unet, "the unet constant rides (never the caller string)");
    const sam = Object.values(row).find((n) => n.class_type === "SAMLoader");
    assert.equal(sam?.inputs.model_name ?? MASK_WEIGHTS.sam2, MASK_WEIGHTS.sam2, "the sam2 constant rides when the arm composes (an empty row name never reaches a loader)");
  });
});
