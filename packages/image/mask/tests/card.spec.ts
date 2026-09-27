// card.spec.ts — the mask card wall, REWORKED (stroke 95: the
// operator's design — Inputs bar + Mods bar, NOTHING else on the
// card face; every knob a mask source owns rides its bag ENTRY;
// the leaf popups carry the embedded canvases).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { IMPACT_DETECTOR_PROVISIONS } from "@melite/comfyui-card-kit/impact";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
const DUMMY: ModelFacts = { id: "x", card: "x", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("mask")!;
  assert.ok(def, "the composition root serves the mask card");
});

type Row = Record<string, unknown>;
type Kind = NonNullable<CardDefinition["mods"]>[number];
const fieldNames = (k: Kind): string[] =>
  (((k as unknown as Row)["fields"] ?? []) as Array<Row>).map((f) => String(f["name"]));

describe("the mask card declaration (stroke 95 — the two-bars law)", () => {
  it("the flat schema carries the INPUT ONLY (the base card is the Inputs bar + the Mods bar — nothing else)", () => {
    const parsed = def.schema({ input_image: "/x.png" }) as Row;
    assert.deepEqual(Object.keys(parsed).sort(), ["input_image"],
      "the stroke-78 flat lane scalars (refine_iterations/sam_threshold/sam_dilation) are GONE — every knob is mod-owned");
  });

  it("declares the three source kinds with their CATEGORIES (standalone vs ordered)", () => {
    const mods = def.mods ?? [];
    assert.deepEqual(mods.map((k) => k.kind), ["sam3", "sam2", "draw"]);
    assert.deepEqual(mods.map((k) => k.category), ["standalone", "standalone", "ordered"],
      "sam2/sam3 are standalone (own output); draw is ordered (stacks onto the previous outputs)");
  });

  it("NO kind declares kindFields (the section-row pollution died — the popup owns every knob)", () => {
    for (const k of def.mods ?? []) {
      assert.equal((k as unknown as Row)["kindFields"], undefined,
        `kind '${String((k as unknown as Row)["kind"])}' carries no section-level scalars — every knob is an entry field`);
    }
  });

  it("admits the mod-owned bag names ONLY (no flat scalar names ride the door)", () => {
    assert.deepEqual([...def.admits ?? []], ["sam3", "sam2", "draw"]);
  });

  it("the leaf faces: the IMAGE PREVIEW canvas on BOTH detector kinds (the unified card, 2026-10-08: \"THE SAME [REDACTED 2026-11-05] CARD… THERE NEEDS TO BE AN IMAGE PREVIEW IN BOTH\"), paint on draw", () => {
    const mods = def.mods ?? [];
    assert.equal(mods.find((k) => k.kind === "sam3")!.leaf_face, "bbox-canvas");
    assert.equal(mods.find((k) => k.kind === "sam2")!.leaf_face, "bbox-canvas",
      "sam2's popup previews the image and scopes the search — the canvas never proposes a box (the detector's own)");
    assert.equal(mods.find((k) => k.kind === "draw")!.leaf_face, "paint-canvas");
  });

  it("THE UNIFIED CARD: sam2 and sam3 declare the SAME shape — the ONLY difference is the selector (dropdown vs freetext), 2026-10-08 \"THE ONLY DIFFERENCE BEING THAT SAM2 TAKES A DROPDOWN… THE SAM3 TAKES FREETEXT\"", () => {
    const mods = def.mods ?? [];
    const sam2 = mods.find((k) => k.kind === "sam2")!;
    const sam3 = mods.find((k) => k.kind === "sam3")!;
    const names2 = ((sam2 as unknown as Row)["fields"] as Array<Row>).map((f) => String(f["name"]));
    const names3 = ((sam3 as unknown as Row)["fields"] as Array<Row>).map((f) => String(f["name"]));
    // shared core: both carry name, a threshold pair, dilation, the region quad
    for (const shared of ["name", "sam_threshold", "sam_dilation", "bbox_x", "bbox_y", "bbox_w", "bbox_h"]) {
      assert.ok(names2.includes(shared) && names3.includes(shared), `both kinds carry ${shared}`);
    }
    // THE difference: sam2's selector is the labels dropdown; sam3's is the prompt freetext
    assert.ok(names2.includes("labels") && !names2.includes("prompt"), "sam2's selector is the class dropdown");
    assert.ok(names3.includes("prompt") && !names3.includes("labels"), "sam3's selector is freetext");
    // sam3's model-own lane knobs remain its own (the RT-DETR chain honors them; sam2's equivalents ARE the thresholds)
    for (const sam3Only of ["via_rtdetr", "refine_iterations", "max_instances", "export_boxes"]) {
      assert.ok(names3.includes(sam3Only) && !names2.includes(sam3Only), `${sam3Only} is the SAM3 lane's own knob`);
    }
  });

  it("the SECTION captions NAME the bbox filter on BOTH detector kinds (2026-10-08: \"SAM2 AND SAM3 DON'T HAVE BBOX FILTER\")", () => {
    const mods = def.mods ?? [];
    const sam2 = mods.find((k) => k.kind === "sam2")!;
    const sam3 = mods.find((k) => k.kind === "sam3")!;
    const draw = mods.find((k) => k.kind === "draw")!;
    assert.ok(sam2.section !== undefined && sam2.section.startsWith("Bbox filter — the class dropdown"),
      "sam2's caption names the dropdown filter (the chips + confidence ARE it)");
    assert.ok(sam3.section !== undefined && sam3.section.startsWith("Bbox filter — the freetext prompt"),
      "sam3's caption names its freetext filter — the TWIN text, only the selector word differs");
    assert.equal(draw.section, undefined,
      "draw carries no filter caption — the brush is not a detector");
  });

  it("the region quad fields are FACE-OWNED with the -1 unset default (the shared canvas is the face — both detector kinds)", () => {
    const mods = def.mods ?? [];
    for (const k of [mods[0]!, mods[1]!]) {
      const quad = (((k as unknown as Row)["fields"] ?? []) as Array<Row>).filter((f) => String(f["name"]).startsWith("bbox_"));
      assert.deepEqual(quad.map((f) => String(f["name"])), ["bbox_x", "bbox_y", "bbox_w", "bbox_h"], `${String((k as unknown as Row)["kind"])} carries the four region fields`);
      for (const f of quad) {
        assert.equal(f["faceOwned"], true, `${String(f["name"])} is face-owned — hidden under the canvas, shown only on the hostless degrade`);
        assert.equal(f["default"], -1, "unset = -1 (the selection runs unscoped)");
      }
    }
    {
      const k = mods.find((m) => m.kind === "draw")!;
      assert.ok(!(((k as unknown as Row)["fields"] ?? []) as Array<Row>).some((f) => f["name"] === "bbox_x"),
        "draw carries no bbox — the brush stacks, it never scopes");
    }
  });

  it("sam3's entry owns the full tune (refine/threshold/dilation + the RT-DETR arm)", () => {
    const sam3 = (def.mods ?? []).find((k) => k.kind === "sam3")!;
    assert.deepEqual(fieldNames(sam3), [
      "name", "prompt", "via_rtdetr", "refine_iterations", "sam_threshold", "sam_dilation",
      "detection_threshold", "max_instances", "export_boxes",
      "bbox_x", "bbox_y", "bbox_w", "bbox_h",
    ]);
  });

  it("sam2's entry owns its own arm (labels + detector threshold + figures + the shared tune)", () => {
    const sam2 = (def.mods ?? []).find((k) => k.kind === "sam2")!;
    const names = fieldNames(sam2);
    assert.ok(names.includes("labels"), "sam2 selects by the closed detector-classes chips (never a freeform word, never the retired parts vocabulary)");
    assert.ok(!names.includes("part"), "the parts vocabulary is gone — the detector proposes, SAM2 refines");
    assert.deepEqual(names, [
      "name", "labels", "figures", "detection_threshold",
      "detection_dilation", "crop_factor", "drop_size",
      "sam_threshold", "sam_dilation",
      "box_expansion", "hint_threshold",
      "bbox_x", "bbox_y", "bbox_w", "bbox_h",
    ]);
    assert.deepEqual([...sam2.requires ?? []], ["comfyui-impact-pack", "comfyui-impact-subpack"],
      "sam2 declares BOTH packs (the pack owns SAM/BBOX nodes; the subpack owns the detector provider)");
  });

  it("labels is the closed 3-word Impact select (chips, never freeform — the operator's 2026-10-09 order)", () => {
    const sam2 = (def.mods ?? []).find((k) => k.kind === "sam2")!;
    const labels = ((((sam2 as unknown as Row)["fields"] ?? []) as Array<Row>).find((f) => f["name"] === "labels") ?? {}) as Row;
    assert.equal(labels["label"], "Detection class", "the caption names the detector vocab, not YOLO");
    assert.equal(labels["type"], "select", "a detector-owned vocabulary is a select");
    assert.equal(labels["multi"], true, "a plural class filter picks a SET (chips)");
    assert.equal(labels["default"], "person", "the single-class default survives the trim");
    const options = (labels["options"] ?? []) as Array<Row>;
    const values = options.map((o) => String(o["value"]));
    assert.deepEqual(values, ["person", "face", "hand"], "ONLY the Impact Pack examples' detectors (yolo11m's 80 COCO died here)");
    assert.ok(!values.includes("dog") && !values.includes("car"), "a non-Impact word is not offered");
  });

  it("figures is the instance-number CHIPS row (the operator's 2026-10-09 verdict: select the number, never a freeform text box)", () => {
    const sam2 = (def.mods ?? []).find((k) => k.kind === "sam2")!;
    const figs = ((((sam2 as unknown as Row)["fields"] ?? []) as Array<Row>).find((f) => f["name"] === "figures") ?? {}) as Row;
    assert.equal(figs["type"], "select", "instance numbers are picked, not typed");
    assert.equal(figs["multi"], true, "a figure pick is a SET (figure one AND figure two)");
    assert.equal(figs["default"], "", "no figures picked by default");
    const values = ((figs["options"] ?? []) as Array<Row>).map((o) => String(o["value"]));
    assert.deepEqual(values, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      "the working range is chips 1-10 (the wire stays permissive past 10 for crowds)");
  });

  it("a comma-joined class set composes in declaration order (deduped, verbatim into the detector node)", () => {
    // single detector family (face+hand ride bbox) — a mixed set
    // refuses in the lane, so the order wall lives on one family.
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "hand,face,hand" }] }, DUMMY, g, "run_multi");
    const det = Object.values(g.toJSON()).find((n: Row) => n["class_type"] === "BboxDetectorSEGS") as { inputs: Record<string, unknown> };
    assert.equal(det.inputs.labels, "face,hand", "the wire is canonical — declaration order, no duplicates, no Set-order leak");
  });

  it("a mixed-family set refuses LOUD (one detector per entry — split across two sam2 entries)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person,face" }] }, DUMMY, new GraphBuilder(), "r_mix"),
      /maskT1: one detector per sam2 entry/,
    );
  });

  it("THE DETECTOR TRIO (the operator's 2026-10-09 demand — 'WHAT ABOUT CROP FACTOR'): detection_dilation/crop_factor/drop_size reach the DETECTOR wire — shipped defaults when unset, per-entry values when set", () => {
    // defaults: exactly what the lane always shipped (10 / 3 / 10 — the node's own)
    const g0 = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }] }, DUMMY, g0, "r_cf0");
    const det0 = Object.values(g0.toJSON()).find((n: Row) => n["class_type"] === "SegmDetectorSEGS") as { inputs: Row };
    assert.equal(det0.inputs["dilation"], 10, "unset detection dilation = the shipped 10");
    assert.equal(det0.inputs["crop_factor"], 3, "unset crop factor = the shipped 3");
    assert.equal(det0.inputs["drop_size"], 10, "unset drop size = the shipped 10");
    // per-entry values reach the wire verbatim
    const g1 = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "face", detection_dilation: -8, crop_factor: 4.5, drop_size: 25 }] }, DUMMY, g1, "r_cf1");
    const det1 = Object.values(g1.toJSON()).find((n: Row) => n["class_type"] === "BboxDetectorSEGS") as { inputs: Row };
    assert.equal(det1.inputs["dilation"], -8, "negative detection dilation threads (their bbox_dilation range)");
    assert.equal(det1.inputs["crop_factor"], 4.5, "crop factor threads the detector node");
    assert.equal(det1.inputs["drop_size"], 25, "drop size threads the detector node");
  });

  it("THE SIMPLE-NODE SUB-KNOBS (the operator's 2026-10-09 audit): box_expansion + hint_threshold reach the SAM wire — defaults when unset, per-entry values when set", () => {
    // defaults: the pack's own (0 / 0.7)
    const g0 = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }] }, DUMMY, g0, "r_sub0");
    const sam0 = Object.values(g0.toJSON()).find((n: Row) => n["class_type"] === "SAMDetectorCombined") as { inputs: Row };
    assert.equal(sam0.inputs["bbox_expansion"], 0, "unset box expansion = the pack default 0");
    assert.equal(sam0.inputs["mask_hint_threshold"], 0.7, "unset hint threshold = the pack default 0.7");
    // the primary's own values ride BOTH arms (combined + figures)
    const g1 = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", figures: "1", box_expansion: 24, hint_threshold: 0.55 }] }, DUMMY, g1, "r_sub1");
    const sams = Object.values(g1.toJSON()).filter((n: Row) => n["class_type"] === "SAMDetectorCombined") as Array<{ inputs: Row }>;
    assert.equal(sams.length, 2, "combined + figure arms");
    for (const s of sams) {
      assert.equal(s.inputs["bbox_expansion"], 24, "box expansion threads the SAM node (their sub_bbox_expansion)");
      assert.equal(s.inputs["mask_hint_threshold"], 0.55, "hint threshold threads the SAM node (their sam_mask_hint_threshold)");
    }
  });

  it("figures thread from the primary entry (the agent's figure-one/figure-two pick)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", figures: "1,2" }] }, DUMMY, g, "run_fig");
    const nodes = Object.values(g.toJSON()) as Row[];
    const picks = nodes.filter((n) => n["class_type"] === "ImpactSEGSPicker");
    assert.equal(picks.length, 2, "one picker per picked figure");
    assert.deepEqual(picks.map((p) => (p["inputs"] as Row)["picks"]).sort(), ["1", "2"], "the picks ride verbatim");
    const figSaves = nodes.filter((n) => n["class_type"] === "SaveImage"
      && String((n["inputs"] as Row)["filename_prefix"]).includes("mask_figure_"));
    assert.equal(figSaves.length, 2, "each figure saves its own mask_figure_<n>");
  });

  it("figures on a later entry refuse LOUD (the detection they pick from is the primary's)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }, { labels: "face", figures: "2" }] }, DUMMY, new GraphBuilder(), "r_fig"),
      /'figures' rides the primary sam2 entry/,
    );
  });

  it("a garbage figures string refuses LOUD (1-based numbers, never a silent no-pick)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", figures: "0,abc" }] }, DUMMY, new GraphBuilder(), "r_fig2"),
      /'figures' carries non-instance words/,
    );
  });

  it("a non-string figures value refuses LOUD", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", figures: 1 }] }, DUMMY, new GraphBuilder(), "r_fig_type"),
      /'figures' must be a comma-joined list/,
    );
  });

  it("a separators-only figures value is treated as no picks", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", figures: " , " }] }, DUMMY, g, "r_fig_empty");
    assert.equal(Object.values(g.toJSON()).some((n: Row) => n["class_type"] === "ImpactSEGSPicker"), false);
  });

  it("a non-Impact word refuses LOUD and names the offender (never a silent empty detection)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person,dog" }] }, DUMMY, new GraphBuilder(), "r_bad"),
      /sam2 entry 0: 'labels' carries non-detector words \["dog"\]/,
    );
  });

  it("draw is name + payload (the PNG is the contract — the embedded canvas paints it)", () => {
    const draw = (def.mods ?? []).find((k) => k.kind === "draw")!;
    assert.deepEqual(fieldNames(draw), ["name", "payload"]);
  });

  it("an unused fieldless modifier declaration has an empty entry surface", () => {
    const draw = (def.mods ?? []).find((k) => k.kind === "draw")! as unknown as Row;
    const fields = draw["fields"];
    try {
      draw["fields"] = undefined;
      const g = new GraphBuilder();
      def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "person" }] }, DUMMY, g, "r_fieldless_draw");
      assert.ok(Object.keys(g.toJSON()).length > 0);
    } finally {
      draw["fields"] = fields;
    }
  });

  it("the card declares its weights (declared, then auto provisioned — the operator's 2026-09-19 order; the SAM3 checkpoint joined 2026-10-08, the red-box hunt: the pin had no weight for weeks and the engine truncated the mask arm in silence; the segm/face/hand detectors joined 2026-10-09, the Impact trim: person/face/hand replace yolo11m's 80 COCO)", () => {
    const rows = def.provisions ?? [];
    assert.equal(rows.length, 6, "the card's six weight files");
    assert.deepEqual(rows.slice(3), IMPACT_DETECTOR_PROVISIONS, "the Impact rows are the card-kit catalog verbatim");
    const sam3 = rows.find((r) => r.name === "sam3.1_multiplex_fp16.safetensors")!;
    assert.ok(sam3, "the sam3 checkpoint rides (the red-box hunt's missing weight)");
    assert.equal(sam3.folder, "checkpoints", "CheckpointLoaderSimple reads models/checkpoints/");
    assert.match(sam3.sha256 ?? "", /^[0-9a-f]{64}$/, "a declared hash is a verified hash (minted by direct download)");
    assert.ok((sam3.size_bytes ?? 0) > 0 && sam3.url.startsWith("https://"), "the URL + size ride");
    const rtdetr = rows.find((r) => r.name === "rt_detr_v4-x-hgnet_fp32.safetensors")!;
    assert.deepEqual(rtdetr, {
      name: "rt_detr_v4-x-hgnet_fp32.safetensors",
      url: "https://huggingface.co/Comfy-Org/SDPose/resolve/main/diffusion_models/rt_detr_v4-x-hgnet_fp32.safetensors",
      folder: "diffusion_models",
      sha256: "1ba4a7794c2f8b176327c887ba38fbe0f977049cbef149960288aa923d0239f3",
      size_bytes: 247790660,
    });
    const sam2 = rows.find((r) => r.name === "sam2.1_hiera_large.pt")!;
    assert.ok(sam2, "the sam2 checkpoint rides");
    assert.equal(sam2.folder, "sams", "SAMLoader reads models/sams/");
    assert.match(sam2.sha256 ?? "", /^[0-9a-f]{64}$/, "a declared hash is a verified hash (minted by direct download)");
    assert.ok((sam2.size_bytes ?? 0) > 0 && sam2.url.startsWith("https://"), "the URL + size ride");
    const segm = rows.find((r) => r.name === "person_yolov8m-seg.pt")!;
    assert.ok(segm, "the person segm detector rides (the auto-bbox's missing weight, fetched 2026-10-09)");
    assert.equal(segm.folder, "ultralytics/segm", "the subpack provider reads models/ultralytics/segm/");
    assert.match(segm.sha256 ?? "", /^[0-9a-f]{64}$/, "a declared hash is a verified hash (minted by direct download)");
    const face = rows.find((r) => r.name === "face_yolov8m.pt")!;
    assert.ok(face, "the face detector rides (the pack's own test-workflow model)");
    assert.equal(face.folder, "ultralytics/bbox", "the subpack provider reads models/ultralytics/bbox/");
    assert.match(face.sha256 ?? "", /^[0-9a-f]{64}$/, "a declared hash is a verified hash (minted from disk)");
    const hand = rows.find((r) => r.name === "hand_yolov8s.pt")!;
    assert.ok(hand, "the hand detector rides");
    assert.equal(hand.folder, "ultralytics/bbox", "the subpack provider reads models/ultralytics/bbox/");
    assert.match(hand.sha256 ?? "", /^[0-9a-f]{64}$/, "a declared hash is a verified hash (minted from disk)");
    assert.ok(!rows.some((r) => r.name === "yolo11m.pt"), "yolo11m is unpinned (its 80 COCO generality is NOT this card)");
  });

  it("THE DECLARED HERO (the history/preview defect, 2026-10-09: the gallery led with engine completion order — usually the manifest photo, not the mask)", () => {
    assert.equal(def.primaryFile, "mask_combined", "mask_combined leads the stage gallery; the manifest/crops/figures follow");
  });

  it("THE FLOW CONTRACT (the mask→edit seat's upstream half): seg out, no silent producer", () => {
    // The mask card feeds image-edit's input_mask seat (kind seg)
    // from input_image — but declares NO flowOutputBindings: the
    // lane emits multiple/variable-order SaveImage nodes
    // (combined + exports + manifests), so no stable single
    // producer exists to bind. The merge refuses a multi-save
    // producer LOUD (ambiguous-producers voice) instead of
    // silently binding the wrong save — tensor wiring waits on a
    // future explicit producer mechanism, never a quiet guess.
    assert.deepEqual(def.flowKinds.inputs, { input_image: "image" });
    assert.deepEqual(def.flowKinds.outputs, { default: "seg" });
    assert.equal(def.flowOutputBindings, undefined, "no bindings — the producer is ambiguous by construction, never silently bound");
  });

  it("THE ARM WEIGHTS (the silent-truncation law, 2026-10-09): the run's touched provision rows — an unused arm names nothing", () => {
    const names = (merged: Record<string, unknown>): string[] => [...(def.armWeights!(merged))].sort();
    assert.deepEqual(names({}), [], "an empty run touches no weights");
    assert.deepEqual(names({ sam3: [{ prompt: "the cloak" }] }),
      ["rt_detr_v4-x-hgnet_fp32.safetensors", "sam3.1_multiplex_fp16.safetensors"], "the default box manifest names RT-DETR with SAM3");
    assert.deepEqual(names({ sam3: [{ prompt: "the cloak", export_boxes: false }] }),
      ["sam3.1_multiplex_fp16.safetensors"], "a text-only SAM3 run with the manifest off names only SAM3");
    assert.deepEqual(names({ sam3: [{ via_rtdetr: true, export_boxes: false }] }),
      ["rt_detr_v4-x-hgnet_fp32.safetensors", "sam3.1_multiplex_fp16.safetensors"], "via_rtdetr names RT-DETR even when the manifest draw is off");
    assert.deepEqual(names({ sam3: [null] }), ["sam3.1_multiplex_fp16.safetensors"], "a malformed entry is left for compose to refuse without naming RT-DETR");
    assert.deepEqual(names({ sam2: [{ labels: "person" }] }),
      ["person_yolov8m-seg.pt", "sam2.1_hiera_large.pt"], "a person-only run never names the face/hand detectors");
    assert.deepEqual(names({ sam2: [{ labels: "face" }, { labels: "hand" }] }),
      ["face_yolov8m.pt", "hand_yolov8s.pt", "sam2.1_hiera_large.pt"], "face/hand entries name their own bbox detectors, never the segm one");
    assert.deepEqual(names({ sam2: [{ labels: "person", figures: "1,2" }] }),
      ["person_yolov8m-seg.pt", "sam2.1_hiera_large.pt"], "figures add no weights (they pick from the primary's own SEGS)");
    assert.deepEqual(names({ sam2: [{ labels: 7 }] }),
      ["sam2.1_hiera_large.pt"], "a malformed label still names the SAM2 checkpoint and no detector");
  });
});

describe("the mask compose gate (the bag is the recipe)", () => {
  it("a missing input_image refuses (the lane selects FROM an image)", () => {
    assert.throws(
      () => def.compose({ }, DUMMY, new GraphBuilder(), "r1"),
      /required param 'input_image' missing on the mask card/,
    );
  });

  it("an empty recipe refuses (no mask sources)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png" }, DUMMY, new GraphBuilder(), "r1"),
      /no mask sources on the mask card/,
    );
  });

  it("a draw WITHOUT a standalone source refuses LOUD (ordered stacks onto a mask — never alone)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", draw: [{ payload: "/m/p.png" }] }, DUMMY, new GraphBuilder(), "r1"),
      /a draw stacks ONTO a mask — add a standalone source first/,
    );
  });

  it("a non-array bag refuses LOUD (the wire is the storage — never a silent empty)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: "person" }, DUMMY, new GraphBuilder(), "r1"),
      /must be the mod bag \(an array\)/,
    );
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: ["person"] }, DUMMY, new GraphBuilder(), "r1"),
      /entry 0 on the mask card must be an object/,
    );
  });

  it("the sam3 happy lane (prompt primary + a second text export) builds the graph", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "the red cloak" }, { prompt: "the dog" }] }, DUMMY, g, "run_1");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("SAM3_Detect"), "the SAM3 lane rides");
    const loader = Object.values(g.toJSON()).find((n: Row) => n["class_type"] === "UNETLoader") as { inputs?: Record<string, unknown> };
    assert.equal(loader?.inputs?.["unet_name"], "rt_detr_v4-x-hgnet_fp32.safetensors", "the default box manifest loads the declared FP32 RT-DETR artifact");
    assert.ok(json.includes("the red cloak") && json.includes("the dog"), "both selections ride the CLIP lane");
    assert.ok(json.includes("mask_combined"), "the first standalone source anchors mask_combined");
    assert.ok(json.includes("mask_sam3_2"), "the name-less second entry falls back to the indexed export name");
  });

  it("a sam3 primary without a prompt (and not RT-DETR) refuses LOUD", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ name: "x" }] }, DUMMY, new GraphBuilder(), "r1"),
      /sam3 entry 0 needs a 'prompt' \(or 'Via RT-DETR boxes'\)/,
    );
  });

  it("the primary's OWN tune threads its detect (per-entry sam_threshold + refine)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "person", sam_threshold: 0.88, refine_iterations: 4 }] }, DUMMY, g, "run_t1");
    const detects = Object.values(g.toJSON()).filter((n: Row) => n["class_type"] === "SAM3_Detect") as Array<{ inputs?: Record<string, unknown> }>;
    assert.equal(detects.length, 1, "one selection, one detect");
    assert.equal(detects[0]!.inputs!["threshold"], 0.88, "the primary's per-entry threshold threads the lane's flat read");
    assert.equal(detects[0]!.inputs!["refine_iterations"], 4, "the primary's per-entry refine threads");
  });

  it("an unstated tune arrives as the DECLARED defaults (the walk fills the entry from its declaration)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "person" }] }, DUMMY, g, "run_t2");
    const detect = Object.values(g.toJSON()).find((n: Row) => n["class_type"] === "SAM3_Detect") as { inputs?: Record<string, unknown> };
    assert.equal(detect!["inputs"]!["threshold"], 0.5, "the declared default 0.5 (the node's own — 0.93 starved the text selection to an empty mask, proven live)");
    assert.equal(detect!["inputs"]!["refine_iterations"], 2, "the declared default 2 — never undefined");
  });

  it("PER-EXPORT TUNE: a second entry's threshold threads ITS OWN detect (never the primary's)", () => {
    const g = new GraphBuilder();
    def.compose({
      input_image: "/m/pic.png",
      sam3: [{ prompt: "primary", sam_threshold: 0.7 }, { prompt: "spot", sam_threshold: 0.95 }],
    }, DUMMY, g, "run_t3");
    const detects = Object.values(g.toJSON()).filter((n: Row) => n["class_type"] === "SAM3_Detect") as Array<{ inputs?: Record<string, unknown> }>;
    assert.equal(detects.length, 2, "primary + export");
    const thresholds = detects.map((n) => n.inputs!["threshold"]);
    assert.ok(thresholds.includes(0.7) && thresholds.includes(0.95),
      "each selection carries its own threshold (the trip's fourth arm)");
  });

  it("PER-EXPORT TUNE: an entry's dilation grows ITS OWN save (GrowMask expand)", () => {
    const g = new GraphBuilder();
    def.compose({
      input_image: "/m/pic.png",
      sam3: [{ prompt: "primary" }, { prompt: "wide", sam_dilation: 12 }],
    }, DUMMY, g, "run_t4");
    const grows = Object.values(g.toJSON()).filter((n: Row) => n["class_type"] === "GrowMask") as Array<{ inputs?: Record<string, unknown> }>;
    assert.ok(grows.some((n) => n.inputs!["expand"] === 12), "the export's own dilation reaches its save");
  });

  it("via_rtdetr rides the box lane (RTDETR_detect + the manifest)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ via_rtdetr: true }] }, DUMMY, g, "run_5");
    const row = g.toJSON();
    const json = JSON.stringify(row);
    assert.ok(json.includes("RTDETR_detect"), "the RT-DETR proposal lane rides");
    assert.ok(json.includes("DrawBBoxes"), "the manifest draws (export_boxes defaults true)");
    const loader = Object.values(row).find((n: Row) => n["class_type"] === "UNETLoader") as { inputs?: Record<string, unknown> };
    assert.equal(loader?.inputs?.["unet_name"], "rt_detr_v4-x-hgnet_fp32.safetensors");
  });

  it("the entry's committed RT-DETR scalars thread VERBATIM (per-entry detection knobs)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/in.png", sam3: [{ via_rtdetr: true, detection_threshold: 0.6, max_instances: 4 }] }, DUMMY, g, "r1");
    const node = Object.values(g.toJSON()).find((n: Row) => n["class_type"] === "RTDETR_detect") as { inputs?: Record<string, unknown> };
    assert.ok(node, "the default manifest draws the box lane");
    assert.equal(node!["inputs"]!["threshold"], 0.6, "the entry's detection_threshold threads verbatim");
    assert.equal(node!["inputs"]!["max_detections"], 4, "the entry's max_instances threads verbatim");
  });

  it("export_boxes:false on the ONLY entry refuses the manifest DRAW (the proposal lane stays — it is via_rtdetr's source)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/in.png", sam3: [{ via_rtdetr: true, export_boxes: false }] }, DUMMY, g, "r1");
    const row = g.toJSON();
    const drawn = Object.values(row).find((n: Row) => n["class_type"] === "DrawBBoxes");
    assert.equal(drawn, undefined, "an explicit false refuses the manifest (RTDETR_detect itself stays — via_rtdetr's proposal lane)");
    assert.ok(Object.values(row).some((n: Row) => n["class_type"] === "RTDETR_detect"), "the proposal lane fires for the primary's arm");
  });

  it("the sam2 detector + SAM2 arm: the Impact detector proposes the closed class set, SAM2 refines; empty labels refuse LOUD", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }, { labels: "face" }] }, DUMMY, g, "run_p");
    const row = g.toJSON();
    const json = JSON.stringify(row);
    assert.ok(json.includes("UltralyticsDetectorProvider"), "the detector provider rides (the subpack node)");
    assert.ok(json.includes("BboxDetectorSEGS"), "the face boxes become SEGS");
    assert.ok(json.includes("SegmDetectorSEGS"), "the person pixels become SEGS");
    assert.ok(json.includes("SAMLoader"), "the sam2 model loads (the pack node)");
    assert.ok(json.includes("SAMDetectorCombined"), "SAM2 refines the SEGS");
    assert.ok(!json.includes("CLIPTextEncode"), "the sam2 arm never touches the CLIP text lane (no sam3 entries — no manifest)");
    assert.ok(json.includes("person") && json.includes("face"), "the closed-vocabulary words ride");
    assert.ok(!json.includes("dog"), "a non-Impact word never rides (the vocabulary is the three detectors)");
    assert.ok(json.includes("mask_combined"), "the first standalone source anchors mask_combined");
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "" }] }, DUMMY, new GraphBuilder(), "r1"),
      /sam2 entry 0 needs 'labels' \(pick detector classes/,
    );
  });

  it("the sam2 entry's OWN detection_threshold threads its detector verbatim (the bbox lane pins on a non-person class)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "face", detection_threshold: 0.35 }] }, DUMMY, g, "run_yt");
    const det = Object.values(g.toJSON()).find((n: Row) => n["class_type"] === "BboxDetectorSEGS") as { inputs: Record<string, unknown> };
    assert.equal(det.inputs.threshold, 0.35, "the entry's own arm scalar rides");
  });

  it("THE SEGM AUTO-LANE (the gap audit's #2): a person-only selection rides SegmDetectorSEGS with the pinned segm model — class-pixel boxes, the pack's own detailer-pipe-test shape", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }] }, DUMMY, g, "run_segm");
    const json = g.toJSON();
    const segmDet = Object.values(json).find((n: Row) => n["class_type"] === "SegmDetectorSEGS") as { inputs: Record<string, unknown> } | undefined;
    assert.ok(segmDet, "the person-only selection routes SegmDetectorSEGS");
    assert.equal(segmDet!.inputs["segm_detector"] !== undefined || segmDet!.inputs["1"] !== undefined || segmDet!.inputs["2"] !== undefined, true,
      "the segm provider rides the detector input");
    const providers = Object.values(json).filter((n: Row) => n["class_type"] === "UltralyticsDetectorProvider") as Array<{ inputs: Record<string, unknown> }>;
    assert.ok(providers.some((n) => String(n.inputs["model_name"]).includes("person_yolov8m-seg")),
      "the SEGMENTATION model is wired (person_yolov8m-seg.pt)");
    assert.ok(!providers.some((n) => String(n.inputs["model_name"]).includes("face_yolov8m")),
      "the providers are lazy — a person-only compose never fires the face model (the hand wall below pins that lane)");
    assert.ok(!Object.values(json).some((n: Row) => n["class_type"] === "BboxDetectorSEGS"),
      "a person-only selection never rides the box detector");
  });

  it("THE FACE/HAND BBOX LANES (the Impact trim): a face-only selection rides BboxDetectorSEGS with the pinned face model — the pack's own detailer-pipe-test shape", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "face" }] }, DUMMY, g, "run_face");
    const json = g.toJSON();
    const faceDet = Object.values(json).find((n: Row) => n["class_type"] === "BboxDetectorSEGS") as { inputs: Record<string, unknown> } | undefined;
    assert.ok(faceDet, "the face-only selection routes BboxDetectorSEGS");
    const providers = Object.values(json).filter((n: Row) => n["class_type"] === "UltralyticsDetectorProvider") as Array<{ inputs: Record<string, unknown> }>;
    assert.ok(providers.some((n) => String(n.inputs["model_name"]).includes("face_yolov8m")),
      "the FACE model is wired (bbox/face_yolov8m.pt)");
    assert.ok(!Object.values(json).some((n: Row) => n["class_type"] === "SegmDetectorSEGS"),
      "a face-only selection never rides the segmentation detector");
    const g2 = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "hand" }] }, DUMMY, g2, "run_hand");
    const providers2 = Object.values(g2.toJSON()).filter((n: Row) => n["class_type"] === "UltralyticsDetectorProvider") as Array<{ inputs: Record<string, unknown> }>;
    assert.ok(providers2.some((n) => String(n.inputs["model_name"]).includes("hand_yolov8s")),
      "the HAND model is wired (bbox/hand_yolov8s.pt)");
  });

  it("THE 512-HINT STRIP (the red-box hunt's third bug): the runtime finalize kills the autofilled default-equal bboxes — a latent quarter-blind hazard, NOT the observed empty mask (that was the 0.93 threshold: 0.93 → 0.00% with and without the hint, 0.5 → 6.5%)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "the cloak" }] }, DUMMY, g, "run_q1");
    const unscoped = Object.values(g.toJSON()).find((n: Row) => n["class_type"] === "SAM3_Detect") as { inputs: Record<string, unknown> } | undefined;
    assert.ok(unscoped, "the detect rides");
    assert.ok(!("bboxes" in (unscoped!.inputs ?? {})), "no hint on an unscoped detect — the whole image is the search");
    // the drawn region quad threads as the hint at compose time...
    const g2 = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "the cloak", bbox_x: 0, bbox_y: 0, bbox_w: 512, bbox_h: 512 }] }, DUMMY, g2, "run_q2");
    const scoped = Object.values(g2.toJSON()).find((n: Row) => n["class_type"] === "SAM3_Detect") as { inputs: Record<string, unknown> } | undefined;
    assert.ok(scoped, "the scoped detect rides");
    assert.deepEqual(scoped!.inputs["bboxes"], { x: 0, y: 0, width: 512, height: 512 }, "the lane threads the drawn Region as the hint");
    // ...and the runtime finalize strips it whenever it equals the autofilled default verbatim.
    // HONEST EDGE (audit 2026-10-09): a region drawn EXACTLY (0,0,512,512) loses its hint at runtime — benign, because the scopeMask multiply still bounds the mask to the drawn box, independent of the hint.
    const fin = def.finalize!(g2.toJSON());
    const scopedFin = Object.values(fin).find((n: Row) => n["class_type"] === "SAM3_Detect") as { inputs: Record<string, unknown> } | undefined;
    assert.ok(!("bboxes" in (scopedFin!.inputs ?? {})), "the default-equal dict dies in finalize even when drawn — only non-default quads and links survive (see the finalizeMask unit wall)");
    const mult = Object.values(fin).find((n: Row) => n["class_type"] === "MaskComposite" && (n["inputs"] as { operation?: string })["operation"] === "multiply");
    assert.ok(mult, "the scope still bounds via the mask multiply — the stripped hint loses nothing");
  });

  it("THE PER-INSTANCE CROPS (the gap audit's #3/#4 export half): every detector entry saves one crop per detected instance", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }] }, DUMMY, g, "run_crop");
    const json = g.toJSON();
    const toList = Object.values(json).find((n: Row) => n["class_type"] === "SEGSToImageList");
    assert.ok(toList, "SEGSToImageList unwraps the per-instance crops");
    const save = Object.values(json).find((n: Row) => n["class_type"] === "SaveImage") as { inputs: Record<string, unknown> } | undefined;
    assert.ok(save, "the crops save");
    assert.ok(String(save!.inputs["filename_prefix"]).endsWith("/instance"), "the crop prefix rides the run dir (/instance)");
  });

  it("a LATER sam2 entry's yolo threshold threads ITS export's detector (per-export tune)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "face" }, { labels: "hand", detection_threshold: 0.2 }] }, DUMMY, g, "run_yt2");
    const dets = Object.values(g.toJSON()).filter((n: Row) => n["class_type"] === "BboxDetectorSEGS") as Array<{ inputs: Record<string, unknown> }>;
    assert.equal(dets.length, 2, "primary + export detectors");
    assert.ok(dets.some((n) => n.inputs.threshold === 0.2), "the export's own yolo threshold reaches its detector");
  });

  it("a quad on a sam2 entry is the DECLARED region scope now (the unified card's shared canvas) — a genuinely unknown key still refuses as drift", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", bbox_x: 10, bbox_y: 20, bbox_w: 100, bbox_h: 80 }] }, DUMMY, g, "run_s");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("MaskComposite"), "the region scope applies (the scope-mask multiply rides)");
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", zzz_bogus: 1 }] }, DUMMY, new GraphBuilder(), "run_s2"),
      /unknown key|drift/,
      "the entry-surface law holds — a genuinely unknown key refuses",
    );
  });

  it("sam3-before-sam2 is the primary order (the first standalone source anchors combined)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "face" }], sam3: [{ prompt: "the cloak" }] }, DUMMY, g, "run_o");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("mask_combined"), "combined saves");
    assert.ok(json.includes("the cloak"), "sam3 (declared first) is the primary");
    assert.ok(json.includes("mask_sam2_1"), "the sam2 entry rides its own export");
  });

  it("a per-entry bbox rides the export's detect (the embedded bbox canvas's rectangle)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "spot", bbox_x: 12, bbox_y: 34, bbox_w: 120, bbox_h: 90 }] }, DUMMY, g, "run_b");
    const detect = Object.values(g.toJSON()).filter((n) => (n as Row)["class_type"] === "SAM3_Detect");
    const scoped = detect.find((n) => (((n as { inputs?: Record<string, unknown> }).inputs?.bboxes as { x?: number } | undefined)?.x === 12));
    assert.ok(scoped, "the per-entry bbox reaches the detect");
    assert.deepEqual(((scoped as unknown) as { inputs: { bboxes: unknown } }).inputs.bboxes, { x: 12, y: 34, width: 120, height: 90 });
  });

  it("a malformed bbox refuses LOUD (never a silent skip)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "x", bbox_x: "left" }] }, DUMMY, new GraphBuilder(), "r1"),
      /sam3 entry's bbox must be four numbers/,
    );
  });

  it("a bbox on the PRIMARY scopes mask_combined (the rect scope); unset (-1) rides unscoped", () => {
    // the primary's drawn box locks the selection to the rectangle
    // (the embedded canvas's promise); -1 fields stay unset and the
    // anchor rides unscoped
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "anchor", bbox_x: 4, bbox_y: 6, bbox_w: 50, bbox_h: 40 }] }, DUMMY, g, "run_pb");
    const mult = Object.values(g.toJSON()).find((n: Row) => n["class_type"] === "MaskComposite" && ((n as { inputs?: Record<string, unknown> }).inputs?.operation === "multiply"));
    assert.ok(mult, "the primary's box scopes the anchor (no longer silently ignored)");
    const g2 = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "anchor", bbox_x: -1, bbox_y: -1, bbox_w: -1, bbox_h: -1 }] }, DUMMY, g2, "run_pb2");
    assert.ok(Object.keys(g2.toJSON()).length > 0, "unset bbox fields never refuse the anchor");
  });

  it("the draw stack: each payload exports AND unions onto combined in bag order (the ordered chain)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "person" }], draw: [{ payload: "/m/one.png" }, { payload: "/m/two.png" }] }, DUMMY, g, "run_2");
    const row = g.toJSON();
    const json = JSON.stringify(row);
    assert.ok(json.includes("LoadImageMask"), "the paint payloads ride alpha");
    const composites = Object.values(row).filter((n: Row) => n["class_type"] === "MaskComposite");
    assert.equal(composites.length, 2, "two draws = two union hops (the ordered chain)");
    assert.ok(json.includes("mask_combined_union"), "the chain's terminal saves");
    assert.ok(json.includes("mask_draw_1") && json.includes("mask_draw_2"), "each draw keeps its own named export");
  });

  it("a draw without a payload refuses (never a silent empty mask)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "person" }], draw: [{ name: "p" }] }, DUMMY, new GraphBuilder(), "r1"),
      /draw entry 0 needs a 'payload'/,
    );
  });
});

// ── the refuse-arm sweep (coverage: every loud arm fires once) ──

describe("the mask compose gate (the refuse-arm sweep)", () => {
  it("a bbox with a null value reads UNSET (never a throw — null clears)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "x", bbox_x: 5, bbox_y: null }] }, DUMMY, g, "r_n");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("mask_sam3_2"), "the entry rides unscoped");
  });

  it("empty labels on the sam2 PRIMARY refuse (the labelsOf arm)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: 7 }] }, DUMMY, new GraphBuilder(), "r1"),
      /sam2 entry 0 needs 'labels' \(pick detector classes.*got 7/,
    );
  });

  it("a non-string prompt on a LATER sam3 entry refuses (the typeof arm)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: 7 }] }, DUMMY, new GraphBuilder(), "r1"),
      /sam3 entry 1 needs a 'prompt' \(a string.*got 7/,
    );
  });

  it("empty labels on a LATER sam2 entry refuse (the export labelsOf arm)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }, { labels: 7 }] }, DUMMY, new GraphBuilder(), "r1"),
      /sam2 entry 1 needs 'labels' \(pick detector classes.*got 7/,
    );
  });
});

describe("the mask compose gate (the empty-name and unset-bbox arms)", () => {
  it("an all-negative bbox on an EXPORT entry reads unset (the -1 law on the export path)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "x", bbox_x: -1, bbox_y: -1, bbox_w: -1, bbox_h: -1 }] }, DUMMY, g, "r_neg");
    const detect = Object.values(g.toJSON()).filter((n) => (n as Row)["class_type"] === "SAM3_Detect");
    assert.ok(detect.every((n) => !((n as { inputs?: Record<string, unknown> }).inputs?.bboxes as { x?: number } | undefined) || ((n as { inputs?: Record<string, unknown> }).inputs?.bboxes as { x?: number }).x !== -1), "no -1 bbox ever reaches the lane");
  });

  it("empty-string names fall back to the indexed export name (never a blank save)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "x", name: "" }], draw: [{ payload: "/m/p.png", name: "" }] }, DUMMY, g, "r_empty");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("mask_sam3_2"), "the empty sam3 name falls back");
    assert.ok(json.includes("mask_draw_1"), "the empty draw name falls back");
  });
});

describe("the mask compose gate (the named-entry arms)", () => {
  it("a NAMED sam3 export and a NAMED draw ride their names verbatim", () => {
    const g = new GraphBuilder();
    def.compose({
      input_image: "/m/pic.png",
      sam3: [{ prompt: "primary" }, { prompt: "x", name: "spot" }],
      draw: [{ payload: "/m/p.png", name: "fixed" }],
    }, DUMMY, g, "r_named");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("mask_spot"), "the named sam3 export rides verbatim");
    assert.ok(json.includes("mask_fixed"), "the named draw rides verbatim");
  });
});

// THE OVERLAY LAW (2026-09-19: the schema gates EVERY hop — nothing
// goes around the declaration). Stroke 95: the bounds are the
// ENTRY's own declared field rows — the popup's knobs cannot go
// around the declaration any more than the flat form ever could.
describe("the mask compose gate (the per-entry scalars cannot go around the declaration)", () => {
  it("an out-of-bounds refine_iterations refuses loud (0–8 declared on the entry)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "person", refine_iterations: 99 }] }, DUMMY, new GraphBuilder(), "r_ri"),
      /refine_iterations/,
    );
  });

  it("a wrong-typed sam_threshold refuses loud (declared a number)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "person", sam_threshold: "high" }] }, DUMMY, new GraphBuilder(), "r_st"),
      /sam3 entry 0: 'sam_threshold' must be a number/,
    );
  });

  it("an out-of-bounds detection_threshold refuses loud (0.05–0.95 declared)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ via_rtdetr: true, detection_threshold: 99 }] }, DUMMY, new GraphBuilder(), "r_dt"),
      /detection_threshold/,
    );
  });

  it("a negative max_instances refuses loud (0–100 declared)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ via_rtdetr: true, max_instances: -1 }] }, DUMMY, new GraphBuilder(), "r_mi"),
      /max_instances/,
    );
  });

  it("a wrong-typed export_boxes refuses loud (declared a boolean — never coerced)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "person", export_boxes: "yes" }] }, DUMMY, new GraphBuilder(), "r_eb"),
      /sam3 entry 0: 'export_boxes' must be a boolean/,
    );
  });

  it("an out-of-bounds detection_threshold refuses loud (0.05–0.95 declared on sam2's entry)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", detection_threshold: 99 }] }, DUMMY, new GraphBuilder(), "r_yt"),
      /detection_threshold/,
    );
  });

  it("a wrong-typed via_rtdetr refuses loud (declared a boolean)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ via_rtdetr: "yes", prompt: "person" }] }, DUMMY, new GraphBuilder(), "r_vr"),
      /sam3 entry 0: 'via_rtdetr' must be a boolean/,
    );
  });

  it("via_rtdetr on a LATER entry refuses loud (the primary's arm — its boxes would silently vanish)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { via_rtdetr: true }] }, DUMMY, new GraphBuilder(), "r_vr2"),
      /sam3 entry 1: 'via_rtdetr' is the primary's arm/,
    );
  });

  it("a wrong-typed name refuses loud on every kind (never a silent indexed fallback)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "person", name: 7 }] }, DUMMY, new GraphBuilder(), "r_n1"),
      /sam3 entry 0: 'name' must be a string/,
    );
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "person" }], draw: [{ payload: "/m/p.png", name: 7 }] }, DUMMY, new GraphBuilder(), "r_n2"),
      /draw entry 0: 'name' must be a string/,
    );
  });

  it("bounded entry scalars ride the RT-DETR lane verbatim (the graph carries them)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ via_rtdetr: true, detection_threshold: 0.5, max_instances: 10 }] }, DUMMY, g, "r_rt_ok");
    const rtdetr = Object.values(g.toJSON()).find((n) => (n as Row)["class_type"] === "RTDETR_detect") as { inputs?: Record<string, unknown> } | undefined;
    assert.ok(rtdetr, "the RT-DETR proposal lane renders for a via_rtdetr primary");
    assert.equal(rtdetr!.inputs!["threshold"], 0.5);
    assert.equal(rtdetr!.inputs!["max_detections"], 10);
  });

  it("a sam2 export's out-of-bounds sam_threshold refuses loud (the per-entry tune is gated too)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }, { labels: "face", sam_threshold: 2 }] }, DUMMY, new GraphBuilder(), "r_ex"),
      /sam2 entry 1.*sam_threshold/,
    );
  });
});
