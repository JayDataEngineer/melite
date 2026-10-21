// @melite/models-fibo2-edit — the edit action's branch pins.
//
// The lane's branches driven END TO END through the real build: the
// plain arm (encoder-emitted latent), the crop_stitch arm, the spell
// arm, the bag merge, and every field-named refusal. The graph
// GOLDENS are deferred (recorded the day the engine hop re-records
// tests/walls/fixtures/object_info.boot.json): the golden driver's
// wiring gate judges every composed class against the RECORDED boot
// fixture, which predates TextEncodeFibo2 — a golden recorded now
// would refuse at the estate's own judge, not pass. The structural
// asserts below hold the shape meanwhile; the walls file
// (tests/walls/ts/suites/fibo2-edit-facts.spec.ts) rides the same
// compose on its own path.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts, ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL, edit, parseEditFacts } from "../src/index.ts";
import type { EditFacts } from "../src/index.ts";

const FACTS: EditFacts = parseEditFacts(DECL.lane_inputs as LaneInputsFacts);
assert.equal(FACTS.text_encode_node, "TextEncodeFibo2");
assert.equal(FACTS.max_images, 16);

// The registry row face the model feed hands compose (the same
// minimal shape anima's fixture rides).
const MODEL: ModelFacts = {
  id: DECL.id,
  card: "image-edit",
  mods: DECL.mods as string[],
  defaults: {},
  lane_inputs: DECL.lane_inputs as LaneInputsFacts,
  variants: [],
  variant_groups: [],
  outputs: [],
};

const PARAMS = {
  input_images: ["anchor.png", "reference.png"],
  prompt: "make it night",
  negative_prompt: "",
  seed: 7,
  steps: 30,
  cfg: 5,
  sampler: "euler",
  scheduler: "simple",
};

type Graph = Record<string, { class_type: string; inputs: Record<string, unknown> }>;

function compose(p: Record<string, unknown>): Graph {
  const g = new GraphBuilder({});
  instantiateAction(
    // the card binds this same declared action object
    edit, p, MODEL, g, "probe",
  );
  return g.toJSON() as Graph;
}

describe("the fibo2-edit edit action — the lane's branches", () => {
  it("the plain arm: one encoder node, per-slot images, the sampler on the encoder's third output", () => {
    const graph = compose({ ...PARAMS });
    const byClass = (cls: string) => Object.entries(graph).filter(([, n]) => n.class_type === cls);
    assert.equal(byClass("TextEncodeFibo2").length, 1);
    assert.equal(byClass("LoadImage").length, 2, "anchor + one reference load");
    assert.equal(byClass("KSampler").length, 1);
    assert.ok(!Object.values(graph).some((n) => n.class_type === "EmptyLatentImage"), "the latent law: the encoder emits the latent, nothing mints one");
    const [, enc] = byClass("TextEncodeFibo2")[0]!;
    assert.equal(enc.inputs.width, 0, "trained-size geometry: width stays at the node's 0");
    assert.equal(enc.inputs.height, 0, "trained-size geometry: height stays at the node's 0");
    assert.equal(enc.inputs.batch_size, 1, "no batch face: the seat stays pinned");
    const imageKeys = Object.keys(enc.inputs).filter((k) => k.startsWith("images.image_"));
    assert.deepEqual(imageKeys, ["images.image_1", "images.image_2"], "the autogrow slots map contiguously, anchor first");
    const clip = byClass("CLIPLoader")[0]![1];
    assert.equal(clip.inputs.type, "fibo2", "the CLIPLoader combo value rides lane_inputs.clip_type");
    const [, sampler] = byClass("KSampler")[0]!;
    assert.equal(sampler.inputs.denoise, 1.0);
    assert.equal(sampler.inputs.steps, 30);
    assert.equal(sampler.inputs.cfg, 5);
    const encId = byClass("TextEncodeFibo2")[0]![0];
    assert.deepEqual(sampler.inputs.latent_image, [encId, 2], "KSampler samples the ENCODER'S OWN emitted latent");
    assert.deepEqual(sampler.inputs.positive, [encId, 0]);
    assert.deepEqual(sampler.inputs.negative, [encId, 1]);
    const save = Object.values(graph).find((n) => n.class_type === "SaveImage")!;
    assert.equal(save.inputs.filename_prefix, "probe/edit", "the run-media prefix law: edit stages save under <run>/edit");
  });

  it("an absent negative_prompt composes the empty string — the trained null caption's seat", () => {
    const { negative_prompt: _drop, ...noNeg } = PARAMS;
    const graph = compose(noNeg);
    const [, enc] = Object.entries(graph).find(([, n]) => n.class_type === "TextEncodeFibo2")!;
    assert.equal(enc.inputs.negative_prompt, "", "the empty negative rides — CFG works text-only");
  });

  it("the spell arm: a $name anchor and ref wire the stage tensors, no LoadImage exists", () => {
    const graph = compose({
      ...PARAMS,
      input_images: ["$image1", "$image2"],
    });
    assert.ok(!Object.values(graph).some((n) => n.class_type === "LoadImage"), "the wired-tensor law: a spell names a wired input, never a file");
    const [, enc] = Object.entries(graph).find(([, n]) => n.class_type === "TextEncodeFibo2")!;
    assert.equal(enc.inputs["images.image_1"], "$image1");
    assert.equal(enc.inputs["images.image_2"], "$image2");
  });

  it("the crop_stitch arm: mask → SEGS → DetailerForEach, no KSampler, no decode", () => {
    const graph = compose({
      ...PARAMS,
      input_images: ["anchor.png"],
      input_mask: "region.png",
      mask_mode: "crop_stitch",
    });
    const classes = Object.values(graph).map((n) => n.class_type);
    for (const cls of ["LoadImageMask", "GrowMask", "MaskToSEGS", "DetailerForEach", "SaveImage"]) {
      assert.ok(classes.includes(cls), `the stitch tail carries ${cls}`);
    }
    assert.ok(!classes.includes("KSampler"), "the detailer encodes and sizes each crop itself");
    assert.ok(!classes.includes("VAEDecode"), "DetailerForEach returns IMAGE — a decode under it is a wiring bug");
    const save = Object.values(graph).find((n) => n.class_type === "SaveImage")!;
    assert.equal(save.inputs.filename_prefix, "probe/edit");
  });

  it("full_frame mask_mode rides the plain arm (the auto spelling)", () => {
    const graph = compose({
      ...PARAMS,
      input_images: ["anchor.png"],
      input_mask: "region.png",
      mask_mode: "full_frame",
    });
    const classes = Object.values(graph).map((n) => n.class_type);
    assert.ok(classes.includes("KSampler"), "full_frame normalizes to auto — the plain arm");
    assert.ok(!classes.includes("DetailerForEach"));
  });

  it("the mask bag merges UNDER flat params — the flat key wins, the bag fills the gaps", () => {
    // the bag carries the mask (flat absent) → the merge adopts it
    const stitched = compose({
      ...PARAMS,
      input_images: ["anchor.png"],
      mask: [{ input_mask: "bag-region.png", mask_mode: "crop_stitch" }],
    });
    const maskLoad = Object.entries(stitched).find(([, n]) => n.class_type === "LoadImageMask");
    assert.ok(maskLoad, "the bag-provided mask loads");
    assert.equal(maskLoad![1].inputs.image, "bag-region.png");
    // the flat key stated AND a bag key present → the flat key wins
    const flatWins = compose({
      ...PARAMS,
      input_images: ["anchor.png"],
      input_mask: "flat-region.png",
      mask_mode: "crop_stitch",
      mask: [{ input_mask: "bag-region.png" }],
    });
    const flatLoad = Object.entries(flatWins).find(([, n]) => n.class_type === "LoadImageMask");
    assert.equal(flatLoad![1].inputs.image, "flat-region.png", "explicit flat keys win over the bag");
  });

  it("REFUSALS: stated width/height, an empty list, and an over-cap list refuse field-named", () => {
    assert.throws(
      () => compose({ ...PARAMS, width: 1024 }),
      /no edit lane takes a stated size/,
      "the never-lie guard names the latent law",
    );
    assert.throws(
      () => compose({ ...PARAMS, input_images: [] }),
      /'input_images' missing on the image-edit card/,
      "the anchor gate covers direct callers too",
    );
    assert.throws(
      () => compose({ ...PARAMS, input_images: Array.from({ length: 17 }, (_, i) => `img_${i}.png`) }),
      /this lane takes 16 input images total/,
      "the node's own 16-slot capacity is the ONE ceiling",
    );
  });

  it("loras fire on the stack: a stated pick rides LoraLoaderModelOnly over the unet (the boarding gate open)", () => {
    const graph = compose({
      ...PARAMS,
      loras: [{ name: "user-file.safetensors", strength: 0.8 }],
    });
    const loras = Object.values(graph).filter((n) => n.class_type === "LoraLoaderModelOnly");
    assert.equal(loras.length, 1);
    assert.equal(loras[0]!.inputs.lora_name, "user-file.safetensors");
    assert.equal(loras[0]!.inputs.strength_model, 0.8);
    const [, sampler] = Object.entries(graph).find(([, n]) => n.class_type === "KSampler")!;
    const loraId = Object.entries(graph).find(([, n]) => n.class_type === "LoraLoaderModelOnly")![0];
    assert.deepEqual(sampler.inputs.model, [loraId, 0], "the sampler rides the STACKED model");
  });
});
