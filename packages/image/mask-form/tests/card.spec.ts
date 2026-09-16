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

describe("the mask-form card declaration (stroke 64)", () => {
  it("declares the four mask-source kinds (the card IS the catalog; parts is the closed vocabulary)", () => {
    const mods = def.mods ?? [];
    assert.deepEqual(mods.map((k) => k.kind), ["mask_detect", "mask_subject", "mask_parts", "mask_paint"]);
    const parts = mods.find((k) => k.kind === "mask_parts")!;
    const f = (parts.fields ?? [])[0]! as { options: Array<{ value: string }> };
    assert.deepEqual(f.options.map((o) => o.value), ["face", "hands", "body"], "the parts vocabulary is a closed set");
    const detect = mods[0]!;
    assert.equal(detect.param_key, "mask_detect");
    assert.deepEqual((detect.kindFields ?? []).map((f) => f["name"]), ["sam_threshold", "sam_dilation", "detection_threshold", "max_instances"], "PARITY (CONTRACT D): the studio's detect-lane scalars ride the section");
    assert.deepEqual((detect.fields ?? []).map((f) => f["name"]), ["primary_class", "via_rtdetr"]);
    assert.equal(detect.max_stack, 8);
  });

  it("declares the paint leaf face ONLY on mask_paint (paint-leaf-canvas.md — the verb is declared, never sniffed)", () => {
    const mods = def.mods ?? [];
    const paint = mods.find((k) => k.kind === "mask_paint")!;
    assert.equal(paint.leaf_face, "paint-canvas");
    for (const k of mods.filter((k) => k.kind !== "mask_paint")) {
      assert.equal(k.leaf_face, undefined, `${k.kind} carries no leaf face`);
    }
  });

  it("admits the mod-owned names past the flat schema (bags + section scalars)", () => {
    assert.deepEqual([...def.admits ?? []], ["mask_detect", "mask_subject", "mask_parts", "mask_paint", "sam_threshold", "sam_dilation", "detection_threshold", "max_instances"]);
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

  it("the parts lane: closed vocabulary through the CLIP text lane; off-vocabulary refuses LOUD", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", mask_parts: [{ part: "face" }, { part: "hands" }] }), DUMMY, g, "run_p");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("CLIPTextEncode"), "the parts ride the text lane");
    assert.ok(json.includes("face") && json.includes("hands"), "the class words ride verbatim");
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", mask_parts: [{ part: "torso" }] }), DUMMY, new GraphBuilder(), "r1"),
      /mask_parts entry 0 needs a 'part' of face \| hands \| body/,
    );
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", mask_parts: [{}] }), DUMMY, new GraphBuilder(), "r1"),
      /mask_parts entry 0 needs a 'part'/,
    );
  });

  it("a non-array bag refuses LOUD (the wire is the storage — never a silent empty)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", mask_detect: "person" }), DUMMY, new GraphBuilder(), "r1"),
      /must be the mod bag \(an array\)/,
    );
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", mask_detect: ["person"] }), DUMMY, new GraphBuilder(), "r1"),
      /entry 0 on the mask-form card must be an object/,
    );
  });

  it("the happy detect lane (primary + a second class export) builds the graph", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", mask_detect: [{ primary_class: "person" }, { primary_class: "dog" }], sam_threshold: 0.9 }), DUMMY, g, "run_1");
    const json = JSON.stringify(g.toJSON());
    assert.ok(Object.keys(g.toJSON()).length > 0, "the mask lane builds its graph");
    assert.ok(json.includes("SAM3_Detect"), "the SAM3 lane rides");
  });

  it("subject + paint entries refuse without their source field (never a silent skip)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", mask_subject: [{ name: "s" }] }), DUMMY, new GraphBuilder(), "r1"),
      /mask_subject entry 0 needs a 'prompt'/,
    );
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", mask_paint: [{ name: "p" }] }), DUMMY, new GraphBuilder(), "r1"),
      /mask_paint entry 0 needs a 'payload'/,
    );
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", mask_detect: [{ via_rtdetr: true }] }), DUMMY, new GraphBuilder(), "r1"),
      /mask_detect entry 0 needs a 'primary_class'/,
    );
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/pic.png", mask_detect: [{ primary_class: "person" }, {}] }), DUMMY, new GraphBuilder(), "r1"),
      /mask_detect entry 1 needs a 'primary_class'/,
    );
  });

  it("the paint lane renders LoadImageMask and the union arm (payload unions into the primary)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", mask_detect: [{ primary_class: "person" }], mask_paint: [{ payload: "/m/paint.png" }] }), DUMMY, g, "run_2");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("LoadImageMask"), "the paint payload rides alpha");
    assert.ok(json.includes("MaskComposite"), "the first paint unions into combined when a primary exists");
  });

  it("paint WITHOUT a detect primary skips the union arm (no primary to union into)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", mask_paint: [{ payload: "/m/paint.png" }] }), DUMMY, g, "run_3");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("LoadImageMask"), "the paint payload rides alpha");
    assert.ok(!json.includes("MaskComposite"), "no primary — no union");
  });

  it("via_rtdetr rides the box lane (RTDETR_detect + the box manifest arm)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", mask_detect: [{ primary_class: "person", via_rtdetr: true }], output_mode: "bbox" }), DUMMY, g, "run_5");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("RTDETR_detect"), "the RT-DETR proposal lane rides");
    assert.ok(json.includes("DrawBBoxes"), "output_mode bbox draws the box manifest");
  });

  it("name-less subject and paint entries fall back to indexed export names (never a blank save)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", mask_subject: [{ prompt: "the red hat" }], mask_paint: [{ payload: "/m/paint.png", name: 7 }, { payload: "/m/p2.png", name: "" }, { payload: "/m/p3.png", name: "fixed" }] }), DUMMY, g, "run_6");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("mask_subject_1"), "the subject falls back to subject_1");
    assert.ok(json.includes("mask_paint_1"), "a non-string name falls back to paint_1");
    assert.ok(json.includes("mask_paint_2"), "an empty name falls back to paint_2");
    assert.ok(json.includes("mask_fixed"), "a real name rides verbatim");
  });

  it("PARITY (CONTRACT D): the manifest decouples from output_mode and the detect-lane scalars thread to the kit", () => {
    // segm + export_boxes default TRUE → the RT-DETR manifest arm draws
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/in.png", mask_detect: [{ primary_class: "person" }] }), DUMMY, g, "r1");
    let rtdetr = Object.values(g.toJSON()).find((n: { class_type?: string }) => n["class_type"] === "RTDETR_detect");
    assert.ok(rtdetr, "segm + default draws the manifest (the studio's law)");
    // segm + export_boxes:false → the manifest arm stays OFF
    const g2 = new GraphBuilder();
    def.compose(def.schema({ input_image: "/in.png", export_boxes: false, mask_detect: [{ primary_class: "person" }] }), DUMMY, g2, "r1");
    rtdetr = Object.values(g2.toJSON()).find((n: { class_type?: string }) => n["class_type"] === "RTDETR_detect");
    assert.equal(rtdetr, undefined, "an explicit false refuses the manifest in segm mode");
    // bbox always forces the manifest (the manifest-only mode)
    const g3 = new GraphBuilder();
    def.compose(def.schema({ input_image: "/in.png", output_mode: "bbox", export_boxes: false, mask_detect: [{ primary_class: "person" }] }), DUMMY, g3, "r1");
    rtdetr = Object.values(g3.toJSON()).find((n: { class_type?: string }) => n["class_type"] === "RTDETR_detect");
    assert.ok(rtdetr, "bbox is the manifest-only mode — export_boxes cannot turn it off");
    // the section's committed scalars thread VERBATIM (RT-DETR inputs)
    const g4 = new GraphBuilder();
    def.compose(def.schema({ input_image: "/in.png", detection_threshold: 0.6, max_instances: 4, mask_detect: [{ primary_class: "person" }] }), DUMMY, g4, "r1");
    const node = Object.values(g4.toJSON()).find((n: { class_type?: string }) => n["class_type"] === "RTDETR_detect") as { inputs?: Record<string, unknown> };
    assert.ok(node, "the default manifest draws the box lane");
    assert.equal(node!["inputs"]!["threshold"], 0.6, "detection_threshold threads verbatim");
    assert.equal(node!["inputs"]!["max_detections"], 4, "max_instances threads verbatim");
  });

  it("the subject lane renders a CLIP text conditioning (the SAM3 CLIP leg)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", mask_subject: [{ name: "hat", prompt: "the red hat" }] }), DUMMY, g, "run_4");
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes("CLIPTextEncode"), "the text selection rides");
    assert.ok(json.includes("the red hat"), "the prompt rides verbatim");
  });
});
