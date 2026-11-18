// @melite/models-seed-vc — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants, their quant cells, the provisions, the lane surface.
// These pins hold the PLUGIN SHAPE + identity; the full carrier
// (every HF link, sha256, lane weight, variant matrix) is the
// declaration itself, and registration is proven engine-side (the
// walls' registry count, the boot gates).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family, convert } from "../src/index.ts";

describe("the seed-vc model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-seed-vc");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "seed-vc");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("declares the WHOLE upstream weight set digest-pinned (T-S3 — no digest-less row)", () => {
    const rows = DECL.provisions ?? [];
    // 4 under TTS/Seed-VC (both DiT lanes + campplus + rmvpe), 2 per
    // bigvgan dir, 11 whisper-small files.
    assert.equal(rows.length, 19);
    for (const row of rows) {
      assert.match(row.sha256, /^[0-9a-f]{64}$/, row.name + " carries a sha256");
      assert.match(row.url, /^https:\/\/huggingface\.co\//, row.name + " names its HF source");
      assert.equal(row.folder.split("/")[0], "TTS", row.name + " lands under the TTS tree the node reads");
    }
    const seedVc = rows.filter((r) => r.folder === "TTS/Seed-VC").map((r) => r.name);
    assert.ok(seedVc.includes("DiT_seed_v2_uvit_whisper_base_f0_44k_bigvgan_pruned_ft_ema.pth"), "the 44k f0 DiT lane");
    assert.ok(seedVc.includes("DiT_seed_v2_uvit_whisper_small_wavenet_bigvgan_pruned.pth"), "the 22k speech DiT lane");
  });

  it("declares the lane split honestly — singing is a RECIPE stamp (plane canon L1), never a second route", () => {
    const variant = DECL.variants.find((v) => v.group === "Variant");
    const singing = DECL.variants.find((v) => v.id === "singing");
    const fallback = DECL.variants.find((v) => v.id === "default");
    assert.ok(variant, "one Variant row serves the single native body");
    assert.equal(variant?.route, "seed-vc");
    assert.equal(singing?.group, "Recipe", "wire_defaults lives on the Recipe plane only");
    assert.equal(singing?.wire_defaults?.["f0_condition"], true, "the singing recipe stamps the f0 lane on");
    assert.ok((fallback?.wire_defaults?.["f0_condition"] ?? false) !== true, "the default recipe never stamps f0_condition");
  });

  it("carries NO lane_inputs — the node self-loads every weight (a weights swap the graph cannot misspell)", () => {
    assert.equal(DECL.lane_inputs, undefined);
  });

  it("offers the convert action with the card's whole knob surface", () => {
    const names = convert.params.map((p) => p.name);
    assert.deepEqual(names, [
      "source_audio", "ref_audio", "steps", "speed",
      "inference_cfg_rate", "f0_condition", "auto_f0_adjust",
      "pitch_shift", "unload_model",
    ]);
    assert.deepEqual(convert.outputs, [{ name: "audio", kind: "AUDIO" }]);
    assert.equal(typeof DECL.actions?.[0]?.build, "function", "the DECL carries the action");
  });
});
