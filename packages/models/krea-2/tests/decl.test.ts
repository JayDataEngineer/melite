// @melite/models-krea-2 — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants (turbo/raw/realism), their quant cells, every HF
// artifact link with sha256 + size, the mods boarding (loras), the
// lane inputs (the weight files the engine loads), the defaults.
// These pins hold the carrier intact — registration itself is
// proven engine-side (the walls' 48-registry count, the
// flavor↔DECL.mods interlock, the absorption-parity golden).
//
// Run: node --experimental-strip-types --test tests/
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";
import { KREA_ROWS, inject, apply } from "../mods/loras.ts";

describe("the krea-2 model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-krea-2");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("carries its variants — turbo, raw, realism — with routes and resolver defaults", () => {
    const ids = DECL.variants.map((v) => v.id);
    assert.deepEqual(ids, ["turbo", "raw", "realism", "default"]);
    const raw = DECL.variants.find((v) => v.id === "raw")!;
    const rd = raw.resolver_defaults ?? {};
    assert.equal(raw.route, "krea-2-raw");
    assert.equal(rd["model"], "krea-2-raw");
    assert.equal(rd["steps"], 52);
  });

  it("carries its quant cells — every one with its HF link, sha256, size", () => {
    const cells = DECL.variants.flatMap((v) => v.cells);
    assert.equal(cells.length, 2, "turbo + raw, one int8 cell each");
    for (const c of cells) {
      assert.ok(c.artifact!.source_url.startsWith("https://huggingface.co/"), "no link, no cell");
      assert.match(c.artifact!.sha256!, /^[0-9a-f]{64}$/);
      assert.equal(c.artifact!.size_bytes, 13492686496);
      assert.equal(c.artifact!.dest_root, "COMFYUI_ROOT");
      assert.equal(c.artifact!.dest_sub, "diffusion_models");
    }
  });

  it("carries its mods boarding — loras — and the flavor data itself", () => {
    assert.deepEqual(DECL.mods, ["loras"]);
    assert.equal(inject.join(","), "comfyui");
    assert.equal(typeof apply, "function");
    assert.equal(KREA_ROWS.length, 12, "the Raw-variant training set");
    for (const r of KREA_ROWS) {
      assert.ok(r.source_url.startsWith("https://"), "no link, no row");
    }
  });

  it("carries its lane inputs — the weight files the engine loads", () => {
    assert.equal((DECL.lane_inputs ?? {}).unet, "krea2_turbo_int8_convrot.safetensors");
    assert.equal((DECL.lane_inputs ?? {}).text_encoder, "qwen3vl_4b_fp8_scaled.safetensors");
    assert.equal((DECL.lane_inputs ?? {}).vae, "qwen_image_vae.safetensors");
    assert.equal((DECL.lane_inputs ?? {}).latent_node, "EmptySD3LatentImage");
  });
});
