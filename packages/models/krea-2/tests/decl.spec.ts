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
// Run: npx vitest run --project node
import { describe, it } from "vitest";
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
    // (Rule A, 2026-09-18) the Recipe axis carries the functional
    // lora presets — turbo_distill joins the PRE-EXISTING realism
    // row (the strength-less idiom: the flavor's default 0.7)
    assert.deepEqual(ids, ["turbo", "raw", "realism", "default", "turbo_distill"]);
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

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["qwen3vl_4b_fp8_scaled.safetensors", "54bd5144df0bbc25dd6ccadfcb826b521445a1b06ae5a42570bdd2974ca87094", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/text_encoders/qwen3vl_4b_fp8_scaled.safetensors", 5242467968],
  ["qwen_image_vae.safetensors", "a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f", "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors", 253806246],
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
