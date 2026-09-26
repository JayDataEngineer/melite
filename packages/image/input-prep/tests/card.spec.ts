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
  def = (await loadCardDefs()).get("input-prep")!;
  assert.ok(def, "the composition root serves the input-prep card");
});

describe("the input-prep compose gate", () => {
  it("a missing source refuses (staged source is the lane's whole input)", () => {
    assert.throws(
      () => def.compose(def.schema({}), DUMMY, new GraphBuilder(), "r1"),
      /required param 'source' missing on the input-prep card/,
    );
    assert.throws(
      () => def.compose(def.schema({ source: "  " }), DUMMY, new GraphBuilder(), "r1"),
      /required param 'source' missing on the input-prep card/,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed source refuses loud (declared a string path)", () => {
    assert.throws(
      () => def.compose({ source: 42 }, DUMMY, new GraphBuilder(), "r_type"),
      /source/,
    );
  });

  it("THE SCHEMA GATE: the admits overlay rides the gated doc inert (a crop row still crops)", () => {
    const g = new GraphBuilder();
    def.compose(
      { source: "upload.png", crop: { x: 0, y: 0, width: 64, height: 64 } },
      DUMMY, g, "run_crop",
    );
    const graph = g.toJSON();
    assert.ok(Object.values(graph).some((n) => n.class_type === "ImageCrop"), "the crop row survives the gate");
  });

  it("the transform controls are declared and normalize into the image lane", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({
      source: "upload.png",
      crop_x: 4,
      crop_y: 6,
      crop_width: 64,
      crop_height: 48,
      scale_width: 32,
      scale_height: 24,
      scale_method: "nearest-exact",
    }), DUMMY, g, "run_transform");
    const graph = g.toJSON();
    assert.ok(Object.values(graph).some((node) => node.class_type === "ImageCrop"));
    const scale = Object.values(graph).find((node) => node.class_type === "ImageScale");
    assert.equal(scale?.inputs.width, 32);
    assert.equal(scale?.inputs.height, 24);
    assert.equal(scale?.inputs.upscale_method, "nearest-exact");
  });

  it("partial crop and scale declarations refuse instead of silently defaulting", () => {
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", crop_x: 4 }), DUMMY, new GraphBuilder(), "bad_crop"),
      /crop needs all four/,
    );
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", scale_width: 32 }), DUMMY, new GraphBuilder(), "bad_scale"),
      /scale needs positive/,
    );
  });

  it("a complete crop with a non-positive dimension refuses", () => {
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", crop_x: 0, crop_y: 0, crop_width: 0, crop_height: 10 }), DUMMY, new GraphBuilder(), "bad_crop_size"),
      /crop needs non-negative x\/y and positive width\/height/,
    );
  });

  it("legacy crop and scale rows remain usable while non-object overlays fall back", () => {
    const legacy = new GraphBuilder();
    def.compose({
      source: "upload.png",
      crop: { x: 1, y: 2, width: 30, height: 20 },
      scale: { width: 10, height: 12, method: "nearest-exact" },
    }, DUMMY, legacy, "legacy_transform");
    const legacyGraph = legacy.toJSON();
    assert.ok(Object.values(legacyGraph).some((node) => node.class_type === "ImageCrop"));
    const legacyScale = Object.values(legacyGraph).find((node) => node.class_type === "ImageScale");
    assert.equal(legacyScale?.inputs.width, 10);
    assert.equal(legacyScale?.inputs.height, 12);
    assert.equal(legacyScale?.inputs.upscale_method, "nearest-exact");

    for (const scale of [null, []]) {
      const g = new GraphBuilder();
      def.compose({ source: "upload.png", scale }, DUMMY, g, `non_object_${Array.isArray(scale) ? "array" : "null"}`);
      assert.equal(Object.values(g.toJSON()).some((node) => node.class_type === "ImageScale"), false);
    }
  });

  it("flow output bindings select exactly the declared media channel", () => {
    const image = def.flowOutputBindings?.[0];
    const audio = def.flowOutputBindings?.[1];
    assert.equal(image?.when?.({ media_type: "image" }), true);
    assert.equal(image?.when?.({ media_type: "audio" }), false);
    assert.equal(audio?.when?.({ media_type: "image" }), false);
    assert.equal(audio?.when?.({ media_type: "audio" }), true);
  });

  it("audio selects the audio output producer instead of an image save", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ source: "speech.wav", media_type: "audio" }), DUMMY, g, "run_audio");
    const graph = g.toJSON();
    assert.ok(Object.values(graph).some((node) => node.class_type === "SaveAudio"));
    assert.ok(!Object.values(graph).some((node) => node.class_type === "SaveImage"));
    assert.deepEqual(def.flowKinds.outputs, { image: "image", audio: "audio" });
  });

  it("the happy lane stages the source for the chain", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ source: "upload.png" }), DUMMY, g, "run_1");
    const graph = g.toJSON();
    // the staged-source restage lane: load + save with the run prefix
    const save = Object.values(graph).find((n) => n.class_type === "SaveImage");
    assert.ok(save, "the restage saves");
    assert.match(String(save!.inputs.filename_prefix), /run_1/);
  });
});
