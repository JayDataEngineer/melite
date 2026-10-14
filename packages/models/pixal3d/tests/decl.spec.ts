// @melite/models-pixal3d — the model-plugin data pins.
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

describe("the pixal3d model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-pixal3d");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "pixal3d");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });
});

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["pixal3d_int8_convrot.safetensors", "4621eac3b715484f79303c7152af641fe0b2b14f4d0e3d394fd6922d00f955ec", "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/diffusion_models/pixal3d_int8_convrot.safetensors", 5584555824],
  ["dino_v3_L_naf_fp32.safetensors", "4ad2ec4e0879a5b5b04cd97325cc37da954a7b6edca5170b86510f17f2b2290f", "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/clip_vision/dino_v3_L_naf_fp32.safetensors", 1215214176],
  ["trellis_2_shape_vae_bf16.safetensors", "de0cb4949a76c59ee5c091a995a69bcc8c51d5aeda939f0c641a50d2a72341f4", "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/vae/trellis_2_shape_vae_bf16.safetensors", 1095844024],
  ["trellis_2_texture_vae_bf16.safetensors", "714e5ebf094a610e12a8e3b5175c18a62f37f6ea4218acb6073644456b73ab0e", "https://huggingface.co/Comfy-Org/Pixal3D/resolve/main/vae/trellis_2_texture_vae_bf16.safetensors", 948461364],
  ["moge_2_vitl_normal_fp16.safetensors", "cb1a692d03235671e959e81360d7b4d9f44aefadb1f852d6ca6aa17799d5e31f", "https://huggingface.co/Comfy-Org/MoGe/resolve/main/geometry_estimation/moge_2_vitl_normal_fp16.safetensors", 661859924],
];

describe("the declared provisions are pinned verbatim", () => {
  it("every row carries its pinned sha256, url and size_bytes", () => {
    const rows = DECL.provisions ?? [];
    assert.deepEqual(rows.map((r) => r.name), PROVISION_PINS.map((p) => p[0]),
      "the pin table IS the declared table — a row added, dropped or renamed is a deliberate edit");
    for (const [name, sha256, url, size_bytes] of PROVISION_PINS) {
      const row = rows.find((r) => r.name === name)!;
      assert.equal(row.sha256, sha256, `${name}: the digest is pinned verbatim — a substituted sha fails here`);
      assert.equal(row.url, url, `${name}: the url is pinned verbatim — a wrong path inside the right repo fails here`);
      assert.equal(row.size_bytes, size_bytes, `${name}: the declared size is pinned verbatim`);
    }
  });
});
