// coverage-arms.spec.ts — ADD-ONLY arms raising the measured per-file
// coverage of src/actions.ts back above its seated floors (statements
// 96.15, lines 96). Never touches src/ or existing arms.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { t2i } from "../src/actions.ts";

const laneInputs = DECL.lane_inputs;
assert.ok(laneInputs, "the qwen-img-21 DECL declares lane_inputs");
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "image-gen",
  defaults: {},
  lane_inputs: laneInputs,
  variants: [],
  variant_groups: [],
  outputs: [],
};

const PARAMS = {
  prompt: "a quiet hallway",
  negative_prompt: "blur",
  width: 1280,
  height: 768,
  seed: 7,
  steps: 25,
  cfg: 1,
  sampler: "euler",
  scheduler: "simple",
};

type Node = { class_type?: string; inputs?: Record<string, unknown> };
const nodesOf = (g: GraphBuilder): Node[] =>
  Object.values(g.toJSON() as Record<string, Node>);

describe("qwen-img-21 coverage arms (the two honest paths the gate names)", () => {
  it("THE SPELL ARM (121:13 cond): a $name reference rides the encoder verbatim — no LoadImage for the wired tensor", () => {
    const g = new GraphBuilder({});
    instantiateAction(
      t2i,
      { ...PARAMS, reference_images: ["$image1", "input/b.png"] },
      FACTS,
      g,
      "probe-spell",
    );
    const nodes = nodesOf(g);
    const enc = nodes.find((n) => n.class_type === "TextEncodeQwenImage21");
    assert.ok(enc, "the t2i lane rides the same encoder class");
    const inputs = enc!.inputs ?? {};
    // The spelled slot rides verbatim (the wired-tensor law: a $name
    // names a wired stage input, never a file on disk).
    assert.equal(
      inputs["images.image_1"],
      "$image1",
      "the spelled ref rides the dotted images.image_1 key verbatim",
    );
    // The file slot still mints its own LoadImage anchor.
    const loads = nodes
      .filter((n) => n.class_type === "LoadImage")
      .map((n) => n.inputs?.image);
    assert.deepEqual(
      loads,
      ["input/b.png"],
      "only the file ref mints a LoadImage — the spell builds no loader",
    );
    // The vae splice still rides (refs are non-empty).
    assert.ok("vae" in inputs, "the encoder carries the vae splice when refs ride");
  });

  it("THE PHOTO ARM (144-150 block): input_image + input_mask composes LoadImage→DetailerForEach and NO generation node exists", () => {
    const g = new GraphBuilder({});
    instantiateAction(
      t2i,
      {
        ...PARAMS,
        mask: [{ input_image: "/v1/assets/photo.png", input_mask: "/v1/assets/region.png" }],
        mask_mode: "crop_stitch",
      },
      FACTS,
      g,
      "probe-photo",
    );
    const nodes = nodesOf(g);
    const classes = nodes.map((n) => String(n.class_type));
    const load = nodes.find((n) => n.class_type === "LoadImage");
    assert.ok(load, "the stated base photograph loads (the pair's image half)");
    assert.strictEqual(
      load!.inputs?.image,
      "/v1/assets/photo.png",
      "the base seat rides input_image",
    );
    const detailer = nodes.find((n) => n.class_type === "DetailerForEach");
    assert.ok(detailer, "the pair mints the region detailer");
    // The detailer's IMAGE input is the loaded photograph itself —
    // the base to inpaint on, Impact Pack's law.
    assert.match(
      String((detailer!.inputs as Record<string, unknown>).image),
      /^LoadImage/,
      "DetailerForEach's image input is the LoadImage output (the photo is the base)",
    );
    assert.ok(
      nodes.some((n) => n.class_type === "MaskToSEGS"),
      "the painted mask converts through MaskToSEGS",
    );
    // THE BURN'S OPPOSITE: no latent, no sampler — nothing generates.
    assert.ok(
      !classes.includes("KSampler"),
      "no KSampler node exists in the photo arm (a stated photo inpaints, never generates)",
    );
    assert.ok(
      !classes.some((c) => c.includes("Latent")),
      "no latent node exists in the photo arm",
    );
    const saved = nodes.find((n) => n.class_type === "SaveImage");
    assert.strictEqual(
      saved?.inputs?.filename_prefix,
      "probe-photo/gen",
      "the detailed photo saves under the gen prefix",
    );
  });
});
