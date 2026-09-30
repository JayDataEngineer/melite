// @melite/comfyui-card-kit — THE 2.1 CAP LAW (the Comfy-Org
// Qwen-Image-2.1 release, operator 2026-09-21). The lane walls moved
// with their lanes (the kit-arm retirement, 2026-09-30): the 2.1 t2i
// topology is pinned in
// packages/models/qwen-img-21/tests/lane-laws.spec.ts and the 2.1 edit
// laws in packages/models/qwen-img-edit-21/tests/lane-laws.spec.ts,
// because both lanes are now the families' own declared actions.
//
// WHAT STAYS HERE IS ADMISSION, NOT LANE: editImageCap and the
// ordered-inputs reader are the cap law the card's firing gate reads
// off the row — a reader, not a composer.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { editImageCap, editRefs, orderedInputImages, refuseImageEditFiring } from "../src/kit.ts";
import { GraphBuilder } from "../src/graph.ts";

const FACTS_21 = {
  id: "qwen-img-21", card: "image-gen", defaults: {}, card_knobs: [], variants: [],
  variant_groups: [], outputs: [], mods: [],
  lane_inputs: {
    unet: "qwen_image_2.1_int8_convrot.safetensors",
    vae: "qwen_image_2.1_vae_bf16.safetensors",
    text_encoder: "qwen3vl_8b_int8_convrot.safetensors",
    clip_type: "qwen_image",
    latent_node: "EmptyLatentImage",
    text_encode_node: "TextEncodeQwenImage21",
    // THE DECLARED CAP (the max_images law): the lane rides this,
    // never a hardcoded 16.
    max_images: 16,
  },
} as never;

const FACTS_2511 = {
  id: "qwen-img-edit-2511", card: "image-edit", defaults: {}, card_knobs: [], variants: [],
  variant_groups: [], outputs: [], mods: [],
  lane_inputs: {
    unet: "qwen_image_edit_2511_int8_convrot.safetensors",
    vae: "qwen_image_vae.safetensors",
    text_encoder: "qwen_2.5_vl_7b_fp8_scaled.safetensors",
    clip_type: "qwen_image",
    latent_node: "EmptySD3LatentImage",
    // THE DECLARED CAP (the max_images law): the stock node takes
    // image1/2/3 — 3 total. The lane rides this, never a hardcoded 2.
    max_images: 3,
  },
} as never;

const PARAMS_T2I = {
  prompt: "a quiet hallway", negative_prompt: "blur", width: 1280, height: 768,
  seed: 7, steps: 25, cfg: 1, sampler: "euler", scheduler: "simple",
};

const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;


describe("editImageCap (the max_images law — the lane rides the DECL, never a hardcoded count)", () => {
  it("a declared cap wins on every lane", () => {
    assert.equal(editImageCap(FACTS_21), 16, "2.1 declares 16");
    assert.equal(editImageCap(FACTS_2511), 3, "2511 declares 3");
  });
  it("lanes that never declared capacity ride the narrow end (loud-safe: over-refusal names the lane, never a silent drop)", () => {
    const noCap21 = { lane_inputs: { text_encode_node: "TextEncodeQwenImage21" } };
    const noCapStock = { lane_inputs: { text_encode_node: "SomethingElse" } };
    assert.equal(editImageCap(noCap21 as never), 3, "an undeclared lane gets the narrow end even when 2.1-shaped");
    assert.equal(editImageCap(noCapStock as never), 3, "an undeclared stock-shaped lane opens 3");
    assert.equal(editImageCap(undefined), 3, "an absent model falls back to the narrow end");
    assert.equal(editImageCap({} as never), 3, "malformed facts (no lane_inputs) fall back instead of crashing");
  });
  it("garbage caps fall back instead of breaking the ceiling", () => {
    for (const bad of ["16", 0, -4, NaN, null]) {
      assert.equal(editImageCap({ lane_inputs: { max_images: bad } } as never), 3, `max_images ${String(bad)} falls back`);
    }
    assert.equal(editImageCap({ lane_inputs: { max_images: 16.9 } } as never), 16, "a fractional cap floors");
  });

  it("garbage refs refuse LOUD (the never-drop law covers direct lane callers)", () => {
    assert.throws(() => editRefs({ image2: 42 }), /'image2' fires .*expected an image path string/,
      "a non-string named slot refuses instead of dropping");
    assert.throws(() => editRefs({ reference_images: "s1.png" as never }), /'reference_images' fires .*expected a list/,
      "a non-list stack refuses instead of ignoring");
    assert.throws(() => editRefs({ reference_images: ["s1.png", 7] as never }), /'reference_images' fires .*expected an image path string/,
      "a non-string stack entry refuses instead of dropping");
    assert.deepEqual(editRefs({ image2: "", image3: "  ", reference_images: [] }), [], "blanks still drop quietly");
  });

  it("the gate holds the absent-model law (any stated REFERENCE refuses with no model pinned — the anchor alone is lane-agnostic)", () => {
    assert.throws(() => refuseImageEditFiring({ input_images: ["/m/in.png", "/m/a.png"] }),
      /'input_images' fires .*no model pinned/, "anchor + one ref with no model refuses");
    assert.throws(() => refuseImageEditFiring({ image1: "/m/in.png", image2: "/m/garment.png" }),
      /'input_images' fires .*no model pinned/, "anchor + one legacy named ref with no model refuses");
    refuseImageEditFiring({ input_images: ["/m/in.png"] });
    refuseImageEditFiring({ image1: "/m/in.png" });
    refuseImageEditFiring({ mask: [{ input_mask: "m.png" }] });
  });
});

// ── THE LANPAINT NEVER-LIE GAP (roadmap §10, the second wave;
// re-scoped 2026-09-22) ── the lanpaint INLINE-INPAINT arm rides the
// 2511 lane only; auto+mask on 2.1 refuses field-named (the voice
// teaches crop_stitch). The REGION DETAILER (crop_stitch) itself now
// rides BOTH lanes — the operator's call: 2.1 is the edit model.