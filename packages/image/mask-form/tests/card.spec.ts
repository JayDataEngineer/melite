// card.spec.ts — the mask-form card wall, REWORKED (stroke 95: the
// operator's design — Inputs bar + Mods bar, NOTHING else on the
// card face; every knob a mask source owns rides its bag ENTRY;
// the leaf popups carry the embedded canvases).
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
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
  def = (await loadCardDefs()).get("mask-form")!;
  assert.ok(def, "the composition root serves the mask-form card");
});

type Row = Record<string, unknown>;
type Kind = NonNullable<CardDefinition["mods"]>[number];
const fieldNames = (k: Kind): string[] =>
  (((k as unknown as Row)["fields"] ?? []) as Array<Row>).map((f) => String(f["name"]));

describe("the mask-form card declaration (stroke 95 — the two-bars law)", () => {
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

  it("the leaf faces: bbox-canvas on the standalone kinds, paint-canvas on draw (declared, never sniffed)", () => {
    const mods = def.mods ?? [];
    assert.equal(mods.find((k) => k.kind === "sam3")!.leaf_face, "bbox-canvas");
    assert.equal(mods.find((k) => k.kind === "sam2")!.leaf_face, "bbox-canvas");
    assert.equal(mods.find((k) => k.kind === "draw")!.leaf_face, "paint-canvas");
  });

  it("the bbox quad fields are FACE-OWNED with the -1 unset default (the canvas is the face)", () => {
    const mods = def.mods ?? [];
    for (const k of [mods[0]!, mods[1]!]) {
      const quad = (((k as unknown as Row)["fields"] ?? []) as Array<Row>).filter((f) => String(f["name"]).startsWith("bbox_"));
      assert.deepEqual(quad.map((f) => String(f["name"])), ["bbox_x", "bbox_y", "bbox_w", "bbox_h"], `${String((k as unknown as Row)["kind"])} carries the four bbox fields`);
      for (const f of quad) {
        assert.equal(f["faceOwned"], true, `${String(f["name"])} is face-owned — hidden under the canvas, shown only on the hostless degrade`);
        assert.equal(f["default"], -1, "unset = -1 (the selection runs unscoped)");
      }
    }
    const draw = mods.find((k) => k.kind === "draw")!;
    assert.ok(!(((draw as unknown as Row)["fields"] ?? []) as Array<Row>).some((f) => f["name"] === "bbox_x"), "draw carries no bbox — it stacks, never selects");
  });

  it("sam3's entry owns the full tune (refine/threshold/dilation + the RT-DETR arm)", () => {
    const sam3 = (def.mods ?? []).find((k) => k.kind === "sam3")!;
    assert.deepEqual(fieldNames(sam3), [
      "name", "prompt", "via_rtdetr", "refine_iterations", "sam_threshold", "sam_dilation",
      "detection_threshold", "max_instances", "export_boxes",
      "bbox_x", "bbox_y", "bbox_w", "bbox_h",
    ]);
  });

  it("sam2's entry owns its own arm (labels + YOLO threshold + the shared tune)", () => {
    const sam2 = (def.mods ?? []).find((k) => k.kind === "sam2")!;
    const names = fieldNames(sam2);
    assert.ok(names.includes("labels"), "sam2 selects by the YOLO labels word (never the retired parts vocabulary)");
    assert.ok(!names.includes("part"), "the parts vocabulary is gone — the detector proposes, SAM2 refines");
    assert.deepEqual(names, [
      "name", "labels", "yolo_threshold", "sam_threshold", "sam_dilation",
      "bbox_x", "bbox_y", "bbox_w", "bbox_h",
    ]);
    assert.deepEqual([...sam2.requires ?? []], ["comfyui-impact-pack", "comfyui-impact-subpack"],
      "sam2 declares BOTH packs (the pack owns SAM/BBOX nodes; the subpack owns the YOLO provider)");
  });

  it("draw is name + payload (the PNG is the contract — the embedded canvas paints it)", () => {
    const draw = (def.mods ?? []).find((k) => k.kind === "draw")!;
    assert.deepEqual(fieldNames(draw), ["name", "payload"]);
  });

  it("sam2 declares its weights (declared, then auto provisioned — the operator's 2026-09-19 order)", () => {
    const rows = def.provisions ?? [];
    assert.equal(rows.length, 2, "the SAM2 arm's two weight files");
    const sam2 = rows.find((r) => r.name === "sam2.1_hiera_large.pt")!;
    assert.ok(sam2, "the sam2 checkpoint rides");
    assert.equal(sam2.folder, "sams", "SAMLoader reads models/sams/");
    assert.match(sam2.sha256 ?? "", /^[0-9a-f]{64}$/, "a declared hash is a verified hash (minted by direct download)");
    assert.ok((sam2.size_bytes ?? 0) > 0 && sam2.url.startsWith("https://"), "the URL + size ride");
    const yolo = rows.find((r) => r.name === "yolo11m.pt")!;
    assert.ok(yolo, "the YOLO detector rides");
    assert.equal(yolo.folder, "ultralytics/bbox", "the subpack provider reads models/ultralytics/bbox/");
    assert.match(yolo.sha256 ?? "", /^[0-9a-f]{64}$/, "a declared hash is a verified hash (minted by direct download)");
  });
});

describe("the mask-form compose gate (the bag is the recipe)", () => {
  it("a missing input_image refuses (the lane selects FROM an image)", () => {
    assert.throws(
      () => def.compose({ }, DUMMY, new GraphBuilder(), "r1"),
      /required param 'input_image' missing on the mask-form card/,
    );
  });

  it("an empty recipe refuses (no mask sources)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png" }, DUMMY, new GraphBuilder(), "r1"),
      /no mask sources on the mask-form card/,
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
      /entry 0 on the mask-form card must be an object/,
    );
  });

  it("the sam3 happy lane (prompt primary + a second text export) builds the graph", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "the red cloak" }, { prompt: "the dog" }] }, DUMMY, g, "run_1");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("SAM3_Detect"), "the SAM3 lane rides");
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
    assert.equal(detect!["inputs"]!["threshold"], 0.93, "the declared default 0.93 — never undefined");
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
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("RTDETR_detect"), "the RT-DETR proposal lane rides");
    assert.ok(json.includes("DrawBBoxes"), "the manifest draws (export_boxes defaults true)");
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

  it("the sam2 YOLO + SAM2 arm: the detector proposes the labels word, SAM2 refines; empty labels refuse LOUD", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }, { labels: "face", export_boxes: false }] }, DUMMY, g, "run_p");
    const row = g.toJSON();
    const json = JSON.stringify(row);
    assert.ok(json.includes("UltralyticsDetectorProvider"), "the YOLO provider rides (the subpack node)");
    assert.ok(json.includes("BboxDetectorSEGS"), "the YOLO boxes become SEGS");
    assert.ok(json.includes("SAMLoader"), "the sam2 model loads (the pack node)");
    assert.ok(json.includes("SAMDetectorCombined"), "SAM2 refines the SEGS");
    assert.ok(!json.includes("CLIPTextEncode"), "the sam2 arm never touches the CLIP text lane (no sam3 entries — no manifest)");
    assert.ok(json.includes("person") && json.includes("face"), "the labels words ride verbatim");
    assert.ok(json.includes("mask_combined"), "the first standalone source anchors mask_combined");
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "" }] }, DUMMY, new GraphBuilder(), "r1"),
      /sam2 entry 0 needs 'labels' \(a YOLO class word/,
    );
  });

  it("the sam2 entry's OWN yolo_threshold threads its detector verbatim", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", yolo_threshold: 0.35 }] }, DUMMY, g, "run_yt");
    const det = Object.values(g.toJSON()).find((n: Row) => n["class_type"] === "BboxDetectorSEGS") as { inputs: Record<string, unknown> };
    assert.equal(det.inputs.threshold, 0.35, "the entry's own arm scalar rides");
  });

  it("a LATER sam2 entry's yolo threshold threads ITS export's detector (per-export tune)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }, { labels: "face", yolo_threshold: 0.2 }] }, DUMMY, g, "run_yt2");
    const dets = Object.values(g.toJSON()).filter((n: Row) => n["class_type"] === "BboxDetectorSEGS") as Array<{ inputs: Record<string, unknown> }>;
    assert.equal(dets.length, 2, "primary + export detectors");
    assert.ok(dets.some((n) => n.inputs.threshold === 0.2), "the export's own yolo threshold reaches its detector");
  });

  it("the sam2 primary with a drawn box scopes mask_combined (the rect scope — core nodes only)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", bbox_x: 10, bbox_y: 20, bbox_w: 100, bbox_h: 80 }] }, DUMMY, g, "run_s");
    const row = g.toJSON();
    const scopes = Object.values(row).filter((n: Row) => n["class_type"] === "MaskComposite");
    const mult = scopes.find((n) => ((n as { inputs?: Record<string, unknown> }).inputs?.operation === "multiply"));
    assert.ok(mult, "the drawn box scopes the sam2 selection (multiply over the rect)");
    assert.ok(Object.values(row).some((n: Row) => n["class_type"] === "GetImageSizeAndCount"), "the rect sizes to the image");
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

describe("the mask-form compose gate (the refuse-arm sweep)", () => {
  it("a bbox with a null value reads UNSET (never a throw — null clears)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "x", bbox_x: 5, bbox_y: null }] }, DUMMY, g, "r_n");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("mask_sam3_2"), "the entry rides unscoped");
  });

  it("empty labels on the sam2 PRIMARY refuse (the typeof arm)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: 7 }] }, DUMMY, new GraphBuilder(), "r1"),
      /sam2 entry 0 needs 'labels' \(a YOLO class word.*got 7/,
    );
  });

  it("a non-string prompt on a LATER sam3 entry refuses (the typeof arm)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: 7 }] }, DUMMY, new GraphBuilder(), "r1"),
      /sam3 entry 1 needs a 'prompt' \(a string.*got 7/,
    );
  });

  it("empty labels on a LATER sam2 entry refuse (the export typeof arm)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person" }, { labels: 7 }] }, DUMMY, new GraphBuilder(), "r1"),
      /sam2 entry 1 needs 'labels' \(a YOLO class word.*got 7/,
    );
  });
});

describe("the mask-form compose gate (the empty-name and unset-bbox arms)", () => {
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

describe("the mask-form compose gate (the named-entry arms)", () => {
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
describe("the mask-form compose gate (the per-entry scalars cannot go around the declaration)", () => {
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

  it("an out-of-bounds yolo_threshold refuses loud (0.05–0.95 declared on sam2's entry)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", sam2: [{ labels: "person", yolo_threshold: 99 }] }, DUMMY, new GraphBuilder(), "r_yt"),
      /yolo_threshold/,
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
