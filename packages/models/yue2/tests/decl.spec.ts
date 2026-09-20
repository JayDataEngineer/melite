// @melite/models-yue2 — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants, their quant cells, the provisions, the lane inputs.
// These pins hold the PLUGIN SHAPE + identity; the full carrier
// (every HF link, sha256, lane weight, variant matrix) is the
// declaration itself, and registration is proven engine-side (the
// walls' registry count, the boot gates).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the yue2 model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-yue2");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "yue2");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("provisions exactly the template's checkpoint, sha-pinned (the effort law)", () => {
    assert.equal(DECL.provisions?.length, 1);
    const row = DECL.provisions![0]!;
    assert.equal(row.name, "yue2_3b_int8_convrot.safetensors");
    assert.equal(row.folder, "checkpoints");
    assert.equal(row.sha256, "96fe199377309001ed8cd26a944baeee8cc31a20ba7c36d1d3c0a7e1f4149db6");
    assert.equal(row.size_bytes, 3960938800);
  });

  it("the checkpoint lane is the ONE file row (model+clip+vae ride the checkpoint)", () => {
    const li = DECL.lane_inputs as Record<string, unknown>;
    assert.equal(li.checkpoint, "yue2_3b_int8_convrot.safetensors");
    assert.equal(li.latent_node, "EmptyYuE2LatentAudio");
    assert.equal(li.unet, "", "no unet row — the checkpoint carries the DiT");
    assert.equal(li.text_encoder, "", "no text_encoder row — the checkpoint carries the LLM");
    assert.equal(li.vae, "", "no vae row — the checkpoint carries the decoder");
  });
});
