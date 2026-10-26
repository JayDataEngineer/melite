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

  it("the lightning variant swaps BOTH the recipe and the unet — never one without the other", () => {    const lightning = DECL.variants.find((v) => v.id === "lightning")!;
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

  // THE SOFT-RETIRE (the survivor arc, 2026-11-08): the 2.1 lane won
  // — every 2511 variant rides hidden from the dropdown. A variant
  // that drops the flag is re-offered silently; this arm reds on any
  // offered variant. The rows stay DECLARED (old drafts keep their
  // addresses; the estate-queue door refuses hidden addresses loud,
  // never a silent neighbor cell).
  it("every variant is soft-retired — hidden from the dropdown, still declared", () => {
    assert.deepEqual(
      DECL.variants.map((v) => v.id),
      ["lightning", "standard", "strong-identity", "upstream-solvers", "default"],
      "the five retired variants, no more, no fewer",
    );
    for (const v of DECL.variants) {
      assert.equal(
        (v as { hide_from_dropdown?: boolean }).hide_from_dropdown,
        true,
        `variant ${v.id} is re-offered — the soft-retire reds`,
      );
    }
  });
});

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["qwen_2.5_vl_7b_fp8_scaled.safetensors", "cb5636d852a0ea6a9075ab1bef496c0db7aef13c02350571e388aea959c5c0b4", "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors", 9384670680],
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

// THE VERBATIM CELL-ARTIFACT LAW: each declared cell artifact's source
// url, digest, size and destination are literals here — a substituted
// sha or a moved file fails this block.
const CELL_ARTIFACT_PINS: ReadonlyArray<
  readonly [variant: string, quant: string, source_url: string, sha256: string, size_bytes: number, dest_root: string, dest_sub: string]
> = [
  ["lightning", "lightning4", "https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning/resolve/main/qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui_4steps_v1.0.safetensors", "16d03fd9bab36b0a588e77db23825629df62ab99fc3e62f3a36887b201dcc36f", 20447469486, "COMFYUI_ROOT", "diffusion_models"],
  ["standard", "int8_convrot", "https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_int8_convrot.safetensors", "11b5af5ac601821d73930c84846c9a158e67177356daf927ce1c8d10f3963829", 20499083824, "COMFYUI_ROOT", "diffusion_models"],
];

describe("the declared cell artifacts are pinned verbatim", () => {
  it("every cell carries its pinned source_url, sha256 and destination", () => {
    const cells = DECL.variants.flatMap((v) => v.cells);
    assert.equal(cells.length, CELL_ARTIFACT_PINS.length,
      "every declared cell artifact is pinned — a new cell edits this table");
    for (const [variant, quant, source_url, sha256, size_bytes, dest_root, dest_sub] of CELL_ARTIFACT_PINS) {
      const cell = DECL.variants.find((v) => v.id === variant)!.cells.find((c) => c.quant === quant)!;
      const art = cell.artifact!;
      assert.equal(art.source_url, source_url, `${variant}/${quant}: the source url is pinned verbatim`);
      assert.equal(art.sha256, sha256, `${variant}/${quant}: the digest is pinned verbatim — a substituted sha fails here`);
      assert.equal(art.size_bytes, size_bytes, `${variant}/${quant}: the declared size is pinned verbatim`);
      assert.equal(art.dest_root, dest_root, `${variant}/${quant}: the destination root is pinned verbatim`);
      assert.equal(art.dest_sub, dest_sub, `${variant}/${quant}: the destination sub-folder is pinned verbatim`);
    }
  });
});
