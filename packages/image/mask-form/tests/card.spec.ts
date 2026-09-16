// card.spec.ts — the mask-form card wall, RESHAPED (stroke 78: the
// mods-abstraction law — the simple form + sam3/sam2/draw kinds,
// standalone vs ordered categories, the bbox-canvas face).
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

describe("the mask-form card declaration (stroke 78 — the mods-abstraction law)", () => {
  it("declares the three source kinds with their CATEGORIES (standalone vs ordered)", () => {
    const mods = def.mods ?? [];
    assert.deepEqual(mods.map((k) => k.kind), ["sam3", "sam2", "draw"]);
    assert.deepEqual(mods.map((k) => k.category), ["standalone", "standalone", "ordered"],
      "sam2/sam3 are standalone (own output); draw is ordered (stacks onto the previous outputs)");
    assert.equal(mods[2]!.category, "ordered", "draw stacks — it modifies the mask call, never independent inference");
  });

  it("sam2 is the closed parts vocabulary; the bbox fields ride both standalone kinds (the -1 unset law)", () => {
    const mods = def.mods ?? [];
    const sam2 = mods.find((k) => k.kind === "sam2")!;
    const part = (sam2.fields ?? []).find((f) => f["name"] === "part") as { options: Array<{ value: string }> };
    assert.deepEqual(part.options.map((o) => o.value), ["face", "hands", "body"], "the parts vocabulary is a closed set");
    for (const k of [mods[0]!, mods[1]!]) {
      const names = (k.fields ?? []).map((f) => String(f["name"]));
      assert.deepEqual(names.filter((n) => n.startsWith("bbox_")), ["bbox_x", "bbox_y", "bbox_w", "bbox_h"], `${k.kind} carries the four bbox fields`);
      const bx = (k.fields ?? []).find((f) => f["name"] === "bbox_x") as { default?: number };
      assert.equal(bx.default, -1, "unset = -1 (the selection runs unscoped)");
    }
    const draw = mods.find((k) => k.kind === "draw")!;
    assert.ok(!(draw.fields ?? []).some((f) => f["name"] === "bbox_x"), "draw carries no bbox — it stacks, never selects");
  });

  it("the leaf faces: bbox-canvas on the standalone kinds, paint-canvas on draw (declared, never sniffed)", () => {
    const mods = def.mods ?? [];
    assert.equal(mods.find((k) => k.kind === "sam3")!.leaf_face, "bbox-canvas");
    assert.equal(mods.find((k) => k.kind === "sam2")!.leaf_face, "bbox-canvas");
    assert.equal(mods.find((k) => k.kind === "draw")!.leaf_face, "paint-canvas");
  });

  it("RT-DETR is sam3's own arm (its kindFields); the flat form carries only the lane scalars", () => {
    const sam3 = (def.mods ?? []).find((k) => k.kind === "sam3")!;
    assert.deepEqual((sam3.kindFields ?? []).map((f) => f["name"]), ["detection_threshold", "max_instances", "export_boxes"]);
    const parsed = def.schema({ input_image: "/x.png" });
    assert.deepEqual(Object.keys(parsed).sort(), ["input_image", "refine_iterations", "sam_dilation", "sam_threshold"],
      "the simple form: the input + the shared SAM knobs — everything else is mod-owned");
  });

  it("admits the mod-owned names past the flat schema (bags + the sam3 section scalars)", () => {
    assert.deepEqual([...def.admits ?? []], ["sam3", "sam2", "draw", "detection_threshold", "max_instances", "export_boxes"]);
  });
});

describe("the mask-form compose gate (the bag is the recipe)", () => {
  it("a missing input_image refuses (the lane selects FROM an image)", () => {
    assert.throws(
      () => def.compose(def.schema({}), DUMMY, new GraphBuilder(), "r1"),
      /required param 'input_image' missing on the mask-form card/,
    );
  });

  it("an empty recipe refuses (no mask sources)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png" }), DUMMY, new GraphBuilder(), "r1"),
      /no mask sources on the mask-form card/,
    );
  });

  it("a draw WITHOUT a standalone source refuses LOUD (ordered stacks onto a mask — never alone)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", draw: [{ payload: "/m/p.png" }] }), DUMMY, new GraphBuilder(), "r1"),
      /a draw stacks ONTO a mask — add a standalone source first/,
    );
  });

  it("a non-array bag refuses LOUD (the wire is the storage — never a silent empty)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", sam3: "person" }), DUMMY, new GraphBuilder(), "r1"),
      /must be the mod bag \(an array\)/,
    );
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", sam3: ["person"] }), DUMMY, new GraphBuilder(), "r1"),
      /entry 0 on the mask-form card must be an object/,
    );
  });

  it("the sam3 happy lane (prompt primary + a second text export) builds the graph", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ prompt: "the red cloak" }, { prompt: "the dog" }] }), DUMMY, g, "run_1");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("SAM3_Detect"), "the SAM3 lane rides");
    assert.ok(json.includes("the red cloak") && json.includes("the dog"), "both selections ride the CLIP lane");
    assert.ok(json.includes("mask_combined"), "the first standalone source anchors mask_combined");
    assert.ok(json.includes("mask_sam3_2"), "the name-less second entry falls back to the indexed export name");
  });

  it("a sam3 primary without a prompt (and not RT-DETR) refuses LOUD", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ name: "x" }] }), DUMMY, new GraphBuilder(), "r1"),
      /sam3 entry 0 needs a 'prompt' \(or 'Via RT-DETR boxes'\)/,
    );
  });

  it("via_rtdetr rides the box lane (RTDETR_detect + the manifest)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ via_rtdetr: true }] }), DUMMY, g, "run_5");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("RTDETR_detect"), "the RT-DETR proposal lane rides");
    assert.ok(json.includes("DrawBBoxes"), "the manifest draws (export_boxes defaults true)");
  });

  it("sam3's committed scalars thread VERBATIM (RT-DETR inputs)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/in.png", detection_threshold: 0.6, max_instances: 4, sam3: [{ via_rtdetr: true }] }), DUMMY, g, "r1");
    const node = Object.values(g.toJSON()).find((n: { class_type?: string }) => n["class_type"] === "RTDETR_detect") as { inputs?: Record<string, unknown> };
    assert.ok(node, "the default manifest draws the box lane");
    assert.equal(node!["inputs"]!["threshold"], 0.6, "detection_threshold threads verbatim");
    assert.equal(node!["inputs"]!["max_detections"], 4, "max_instances threads verbatim");
  });

  it("export_boxes:false refuses the manifest DRAW (the proposal lane stays — it is via_rtdetr's source)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/in.png", export_boxes: false, sam3: [{ via_rtdetr: true }] }), DUMMY, g, "r1");
    const drawn = Object.values(g.toJSON()).find((n: { class_type?: string }) => n["class_type"] === "DrawBBoxes");
    assert.equal(drawn, undefined, "an explicit false refuses the manifest (RTDETR_detect itself stays — via_rtdetr's proposal lane)");
  });

  it("the sam2 parts lane: closed vocabulary through the CLIP text lane; off-vocabulary refuses LOUD", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", sam2: [{ part: "face" }, { part: "hands" }] }), DUMMY, g, "run_p");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("CLIPTextEncode"), "the parts ride the text lane");
    assert.ok(json.includes("face") && json.includes("hands"), "the class words ride verbatim");
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", sam2: [{ part: "torso" }] }), DUMMY, new GraphBuilder(), "r1"),
      /sam2 entry 0 needs a 'part' \(face \| hands \| body\)/,
    );
  });

  it("sam3-before-sam2 is the primary order (the first standalone source anchors combined)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", sam2: [{ part: "face" }], sam3: [{ prompt: "the cloak" }] }), DUMMY, g, "run_o");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("mask_combined"), "combined saves");
    assert.ok(json.includes("the cloak"), "sam3 (declared first) is the primary");
    assert.ok(json.includes("mask_sam2_1"), "the sam2 entry rides its own export");
  });

  it("a per-entry bbox rides the export's detect (the bbox-canvas leaf's rectangle)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "spot", bbox_x: 12, bbox_y: 34, bbox_w: 120, bbox_h: 90 }] }), DUMMY, g, "run_b");
    const detect = Object.values(g.toJSON()).filter((n) => (n as { class_type?: string })["class_type"] === "SAM3_Detect");
    const scoped = detect.find((n) => (((n as { inputs?: Record<string, unknown> }).inputs?.bboxes as { x?: number } | undefined)?.x === 12));
    assert.ok(scoped, "the per-entry bbox reaches the detect");
    assert.deepEqual(((scoped as unknown) as { inputs: { bboxes: unknown } }).inputs.bboxes, { x: 12, y: 34, width: 120, height: 90 });
  });

  it("a malformed bbox refuses LOUD (never a silent skip)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "x", bbox_x: "left" }] }), DUMMY, new GraphBuilder(), "r1"),
      /sam3 entry's bbox must be four numbers/,
    );
  });

  it("a bbox on the PRIMARY is honored by unset (the primary rides unscoped — the anchor law)", () => {
    // the primary's bbox fields are -1 (unset): the anchor rides the
    // prompt lane; per-entry bboxes are the exports' law
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ prompt: "anchor", bbox_x: -1, bbox_y: -1, bbox_w: -1, bbox_h: -1 }] }), DUMMY, g, "run_pb");
    assert.ok(Object.keys(g.toJSON()).length > 0, "unset bbox fields never refuse the anchor");
  });

  it("the draw stack: each payload exports AND unions onto combined in bag order (the ordered chain)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ prompt: "person" }], draw: [{ payload: "/m/one.png" }, { payload: "/m/two.png" }] }), DUMMY, g, "run_2");
    const row = g.toJSON();
    const json = JSON.stringify(row);
    assert.ok(json.includes("LoadImageMask"), "the paint payloads ride alpha");
    const composites = Object.values(row).filter((n: { class_type?: string }) => n["class_type"] === "MaskComposite");
    assert.equal(composites.length, 2, "two draws = two union hops (the ordered chain)");
    assert.ok(json.includes("mask_combined_union"), "the chain's terminal saves");
    assert.ok(json.includes("mask_draw_1") && json.includes("mask_draw_2"), "each draw keeps its own named export");
  });

  it("a draw without a payload refuses (never a silent empty mask)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ prompt: "person" }], draw: [{ name: "p" }] }), DUMMY, new GraphBuilder(), "r1"),
      /draw entry 0 needs a 'payload'/,
    );
  });
});

// ── the refuse-arm sweep (coverage: every loud arm fires once) ──

describe("the mask-form compose gate (the refuse-arm sweep)", () => {
  it("a bbox with a null value reads UNSET (never a throw — null clears)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "x", bbox_x: 5, bbox_y: null }] }), DUMMY, g, "r_n");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("mask_sam3_2"), "the entry rides unscoped");
  });

  it("a non-string part on the sam2 PRIMARY refuses (the typeof arm)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", sam2: [{ part: 7 }] }), DUMMY, new GraphBuilder(), "r1"),
      /sam2 entry 0 needs a 'part' \(face \| hands \| body\) — got 7/,
    );
  });

  it("a non-string prompt on a LATER sam3 entry refuses (the typeof arm)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: 7 }] }), DUMMY, new GraphBuilder(), "r1"),
      /sam3 entry 1 needs a 'prompt' \(a string\) — got 7/,
    );
  });

  it("a bad part on a LATER sam2 entry refuses (the export typeof arm)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", sam2: [{ part: "face" }, { part: 7 }] }), DUMMY, new GraphBuilder(), "r1"),
      /sam2 entry 1 needs a 'part' \(face \| hands \| body\) — got 7/,
    );
  });
});

describe("the mask-form compose gate (the empty-name and unset-bbox arms)", () => {
  it("an all-negative bbox on an EXPORT entry reads unset (the -1 law on the export path)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "x", bbox_x: -1, bbox_y: -1, bbox_w: -1, bbox_h: -1 }] }), DUMMY, g, "r_neg");
    const detect = Object.values(g.toJSON()).filter((n) => (n as { class_type?: string })["class_type"] === "SAM3_Detect");
    assert.ok(detect.every((n) => !((n as { inputs?: Record<string, unknown> }).inputs?.bboxes as { x?: number } | undefined) || ((n as { inputs?: Record<string, unknown> }).inputs?.bboxes as { x?: number }).x !== -1), "no -1 bbox ever reaches the lane");
  });

  it("empty-string names fall back to the indexed export name (never a blank save)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", sam3: [{ prompt: "primary" }, { prompt: "x", name: "" }], draw: [{ payload: "/m/p.png", name: "" }] }), DUMMY, g, "r_empty");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("mask_sam3_2"), "the empty sam3 name falls back");
    assert.ok(json.includes("mask_draw_1"), "the empty draw name falls back");
  });
});

describe("the mask-form compose gate (the named-entry arms)", () => {
  it("a NAMED sam3 export and a NAMED draw ride their names verbatim", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({
      input_image: "/m/pic.png",
      sam3: [{ prompt: "primary" }, { prompt: "x", name: "spot" }],
      draw: [{ payload: "/m/p.png", name: "fixed" }],
    }), DUMMY, g, "r_named");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("mask_spot"), "the named sam3 export rides verbatim");
    assert.ok(json.includes("mask_fixed"), "the named draw rides verbatim");
  });
});
