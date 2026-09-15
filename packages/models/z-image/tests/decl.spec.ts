// @melite/models-z-image — the model-plugin data pins.
// (Carrier law: see melite-models-krea-2/tests — a model plugin
// carries its whole truth; registration is proven engine-side.)
//
// Run: npx vitest run --project node
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";
import { ZIMAGE_ROWS, inject, apply } from "../mods/loras.ts";
import { ZIMAGE_CONTROLNET_ROWS } from "../mods/controlnet.ts";
import { ZIMAGE_IPADAPTER_ROWS } from "../mods/ip_adapter.ts";

describe("the z-image model plugin", () => {
  it("is a plugin boarding its loras + controlnet + ip_adapter packs (rows live in the flavor files)", () => {
    assert.equal(family.name, "family-z-image");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
    assert.deepEqual(DECL.mods, ["loras", "controlnet", "ip_adapter"]);
    assert.equal(inject.join(","), "comfyui");
    assert.equal(typeof apply, "function");
    assert.equal(ZIMAGE_ROWS.length, 7, "the seven Turbo adapters on disk");
    for (const r of ZIMAGE_ROWS) {
      assert.ok(r.source_url.startsWith("https://huggingface.co/"), "no link, no row");
      assert.ok(r.source_url.includes("/resolve/main/"), "upstream downloads use the resolve path");
      assert.ok(r.filename.startsWith("z-image/"), "rows land in the family's LoRA directory");
    }
    assert.deepEqual(ZIMAGE_ROWS.map((r) => r.id), [
      "zimage_3d_mmorpg",
      "zimage_classic_painting",
      "zimage_coloring_book",
      "zimage_dejpeg",
      "zimage_pixel_art",
      "zimage_realism",
      "zimage_sunbleached",
    ]);
  });

  it("carries its defaults and lane inputs", () => {
    assert.equal((DECL.defaults ?? {}).sampler, "res_multistep");
    assert.equal((DECL.lane_inputs ?? {}).unet, "z_image_turbo_int8_convrot.safetensors");
    assert.equal(DECL.genre, "image");
  });

  it("boards the seven union ControlNet types (the retired controlnets/mod.yaml, 1:1)", () => {
    assert.deepEqual(ZIMAGE_CONTROLNET_ROWS.map((r) => r.id), [
      "depth",
      "pose",
      "canny",
      "mlsd",
      "hed",
      "scribble",
      "gray",
    ]);
    const strengths: Record<string, number> = {
      depth: 1.0, pose: 0.8, canny: 0.7, mlsd: 0.7, hed: 0.7, scribble: 0.7, gray: 0.6,
    };
    const preprocessors: Record<string, string> = {
      depth: "depth_anything", pose: "dwpose", canny: "canny", mlsd: "mlsd",
      hed: "hed", scribble: "pidinet", gray: "none",
    };
    for (const r of ZIMAGE_CONTROLNET_ROWS) {
      assert.ok(r.source_url.startsWith("https://huggingface.co/"), "no link, no row");
      assert.ok(r.source_url.includes("/resolve/main/"), "upstream downloads use the resolve path");
      assert.equal(r.filename, "z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors", "every type rides the one union file");
      assert.equal(r.default_strength, strengths[r.id], `${r.id} keeps its declared default strength`);
      assert.equal(r.preprocessor, preprocessors[r.id], `${r.id} keeps its upstream-map note`);
      assert.ok((r.tooltip ?? "").length > 0, `${r.id} serves its tooltip`);
    }
  });

  it("boards the four IP-Adapter modes as VOCABULARY ONLY (the ray receipt — fate refused)", () => {
    // the retired ip_adapters/mod.yaml, 1:1: ids, labels, weights,
    // filenames. NO source_url pins: none exists (installed:null,
    // source:null in every retired served spec — the SD1.5 files
    // never stood on disk and cannot patch S3-DiT). The firing
    // gate (card-kit guard.ts) refuses every stated entry LOUD.
    assert.deepEqual(ZIMAGE_IPADAPTER_ROWS.map((r) => r.id), [
      "style", "composition", "face", "generic",
    ]);
    const weights: Record<string, number> = { style: 1.0, composition: 1.0, face: 0.85, generic: 1.0 };
    for (const r of ZIMAGE_IPADAPTER_ROWS) {
      assert.equal(r.default_weight, weights[r.id], `${r.id} keeps its declared default weight`);
      assert.equal((r as { source_url?: string }).source_url, undefined, `${r.id} claims NO source — no fetchable artifact exists, none is invented`);
      assert.ok((r.tooltip ?? "").length > 0, `${r.id} serves its tooltip`);
      assert.ok(r.filename.endsWith(".safetensors"), `${r.id} keeps the retired filename as a catalog note`);
    }
  });
});
