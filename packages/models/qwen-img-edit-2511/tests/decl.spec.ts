// @melite/models-qwen-img-edit-2511 — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants, their quant cells, the mods boarding, the lane inputs,
// the defaults. These pins hold the PLUGIN SHAPE + identity; the
// full carrier (every HF link, sha256, lane weight, variant
// matrix) is the declaration itself, and registration is proven
// engine-side (the walls' registry count, the flavor↔DECL.mods
// interlock, the boot gates). Family-specific truth pins land here
// hand-written when a fact needs pinning — never generated guesses.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the qwen-img-edit-2511 model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen-img-edit-2511");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "qwen-img-edit-2511");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  // THE RECIPE↔WEIGHTS LAW (operator catch e, 2026-09-22): the
  // family defaults must sample THE UNET the lane pins. The live
  // evidence: run-bcb995c95f2c sampled the standard INT8 ConvRot
  // unet at 4 steps (the lightning recipe) and produced the
  // washed-out, broken edit the operator reported.
  it("defaults match the pinned unet's recipe (standard int8_convrot ⇒ 20 steps, cfg 2.5)", () => {
    assert.equal(DECL.lane_inputs!.unet, "qwen_image_edit_2511_int8_convrot.safetensors");
    assert.equal(DECL.defaults!.steps, 20, "standard weights need the full step count");
    assert.equal(DECL.defaults!.cfg, 2.5, "the standard recipe's guidance");
  });

  it("the lightning variant swaps BOTH the recipe and the unet — never one without the other", () => {
    const lightning = DECL.variants.find((v) => v.id === "lightning")!;
    assert.ok(lightning, "the lightning variant exists");
    assert.deepEqual(lightning.resolver_defaults, { steps: 4, cfg: 1 });
    assert.equal(
      lightning.lane_inputs?.unet,
      "qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui_4steps_v1.0.safetensors",
      "the 4-step recipe rides the DISTILLED checkpoint, its own lane_inputs swap",
    );
    assert.notEqual(lightning.lane_inputs!.unet, DECL.lane_inputs!.unet);
    // and its cell provisions into diffusion_models — the lane composes
    // UNETLoader, which reads diffusion_models (checkpoints was the
    // old, unloadable dest)
    assert.equal(lightning.cells[0]!.artifact!.dest_sub, "diffusion_models");
  });
});
