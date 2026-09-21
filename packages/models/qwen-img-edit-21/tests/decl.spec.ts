// @melite/models-qwen-img-edit-21 — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law). These
// pins hold the PLUGIN SHAPE + identity + the 2.1 EDIT lane
// contract (the naming law, the cached-reference branch key, the
// sibling-pair topology); registration is proven engine-side (the
// walls' registry count, the boot gates).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the qwen-img-edit-21 model plugin (the cached-reference edit lane of the 2.1 base)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen-img-edit-21");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — version-explicit, never confusable with 2511 (the naming law)", () => {
    assert.equal(DECL.id, "qwen-img-edit-21");
    assert.ok(!DECL.id.includes("2511"), "the 2.1 edit family is never confused with the 2511 generation");
    assert.equal(DECL.form, "form_edit");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("carries the 2.1 EDIT lane contract: the same base weights + the encoder branch key (NO separate edit checkpoint exists)", () => {
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).text_encode_node, "TextEncodeQwenImage21");
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).unet, "qwen_image_2.1_int8_convrot.safetensors", "the edit rides the SAME base unet as t2i — the cache wraps it in-graph");
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).latent_node, "EmptyLatentImage", "the edit samples at target resolution, never VAEEncode-of-source (the 2511 lane)");
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).steps, 25);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).cfg, 1);
  });

  it("provisions the shared weights: encoder + vae from the one 2.1 repo", () => {
    const provs = DECL.provisions ?? [];
    assert.equal(provs.length, 2);
    for (const p of provs) {
      assert.ok(p.url.startsWith("https://huggingface.co/Comfy-Org/Qwen-Image-2.1/"));
      assert.match(p.sha256 ?? "", /^[0-9a-f]{64}$/);
    }
  });

  it("boards the official background-removal one-click: the template's canned prompt VERBATIM, selection-only (the scoping law)", () => {
    // The official image_qwen_image_2_1_background_removal template
    // is THIS lane + one canned prompt — same weights, same graph
    // (verified against the Comfy-Org template this day: cfg 1,
    // euler/simple, 25 steps — already the family defaults). The
    // recipe stamps ONLY the prompt: one fact, one owner.
    const row = DECL.variants.find((v) => v.id === "remove_background");
    assert.ok(row, "the remove_background recipe row exists");
    assert.equal(row.group, "Recipe");
    assert.deepEqual(row.wire_defaults, { prompt: "Remove the background, and output a PNG image" },
      "the stamp is the official template's prompt widget verbatim — nothing else (defaults own solver/cfg/steps)");
  });
});
