// @melite/models-h3-image — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants, their quant cells, the mods boarding, the lane inputs,
// the defaults. These pins hold the PLUGIN SHAPE + identity + the
// H3-Image lane contract (the pair law, the conditioning branch
// key, the official template defaults); registration is proven
// engine-side (the walls' registry count, the boot gates).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the h3-image model plugin (the t2i lane of the MiniMax-H3-Image checkpoint)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-h3-image");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id names the MODEL and its line, never the operation (the pair law)", () => {
    assert.equal(DECL.id, "h3-image");
    assert.ok(!DECL.id.includes("edit"), "the t2i family never bakes an operation into the model id");
    assert.equal(DECL.genre, "image");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("carries the H3-Image lane contract: the conditioning branch key + the official template defaults", () => {
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).text_encode_node, "MiniMaxH3ImageConditioning");
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).clip_type, "minimax");
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).unet, "minimax_h3_image_pruned_int8_convrot.safetensors");
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).text_encoder, "qwen3vl_32b_minimax_h3_int8_convrot.safetensors");
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).vae, "minimax_h3_image_vae_fp16.safetensors");
    // the official template's sampler truth: 6 steps, cfg 1, euler/simple,
    // and the node's own t2i area law (2048x2048, CANVAS_MULTIPLE 32)
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).width, 2048);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).height, 2048);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).steps, 6);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).cfg, 1);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).sampler, "euler");
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).scheduler, "simple");
  });

  it("provisions the shared weights (the silent-failure cure): encoder tiers + vae carry url/sha/size", () => {
    const provs = DECL.provisions ?? [];
    assert.equal(provs.length, 3);
    for (const p of provs) {
      assert.ok(p.url.startsWith("https://huggingface.co/Comfy-Org/MiniMax-H3-Image/"));
      assert.match(p.sha256 ?? "", /^[0-9a-f]{64}$/);
      assert.ok((p.size_bytes ?? 0) > 0);
    }
    // THE ENCODER DEDUP (the pair story's free seat): the int8
    // encoder is content-identical to the h3 VIDEO family's seated
    // file — same digest, the video repo's spelling.
    const enc = provs.find((p) => p.name === "qwen3vl_32b_minimax_h3_int8_convrot.safetensors")!;
    assert.equal(enc.sha256, "bc2ced0fbea64757fa9acddccfc0b3f4819d1dcf1da6c124d690d368be283923");
  });

  it("quant cells carry downloadable artifacts (int8 default + w4a8 nvfp4 pairing + bf16 tier)", () => {
    const cells = DECL.variants.filter((v) => v.group === "Variant").flatMap((v) => v.cells);
    assert.equal(cells.length, 3);
    for (const c of cells) {
      assert.ok(c.artifact, `cell ${c.quant} carries its artifact`);
      assert.match(c.artifact!.sha256, /^[0-9a-f]{64}$/);
    }
    // the low-VRAM pairing: the w4a8 cell swaps the encoder tier
    // (the cell-lane cascade, never a second Variant token)
    const w4a8 = cells.find((c) => c.quant === "w4a8")!;
    assert.equal((w4a8.lane_inputs ?? {}).text_encoder, "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors");
  });
});

// THE VERBATIM CONTENT LAW: every declared provision row's digest,
// url and size are literals in the table below — a substituted sha,
// a wrong path inside the right repo, or a drifted size fails this
// block. A new row is a deliberate act and edits this table.
const PROVISION_PINS: ReadonlyArray<readonly [string, string, string, number, string]> = [
  ["qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
    "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
    "bc2ced0fbea64757fa9acddccfc0b3f4819d1dcf1da6c124d690d368be283923", 27141342152, "text_encoders"],
  ["qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
    "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
    "35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6", 15687142551, "text_encoders"],
  ["minimax_h3_image_vae_fp16.safetensors",
    "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/vae/minimax_h3_image_vae_fp16.safetensors",
    "d80e9c2e5cfc9844869961ff5a58c9a9e52182df6bfb30b26018dd7f348721af", 1168505312, "vae"],
];

describe("the h3-image provision pins (verbatim content law)", () => {
  it("every declared provision row is pinned — a substituted sha, url, or size fails here", () => {
    const provs = DECL.provisions ?? [];
    assert.equal(provs.length, PROVISION_PINS.length,
      "every declared provision is pinned — a new row edits this table");
    for (const [name, url, sha256, size_bytes, folder] of PROVISION_PINS) {
      const row = provs.find((p) => p.name === name)!;
      assert.equal(row.url, url, `${name}: the source url is pinned verbatim`);
      assert.equal(row.sha256, sha256, `${name}: the digest is pinned verbatim — a substituted sha fails here`);
      assert.equal(row.size_bytes, size_bytes, `${name}: the declared size is pinned verbatim`);
      assert.equal(row.folder, folder, `${name}: the destination folder is pinned verbatim`);
    }
  });
});

const CELL_ARTIFACT_PINS: ReadonlyArray<readonly [string, string, string, string, number, string, string]> = [
  ["base", "int8_convrot_pruned",
    "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/diffusion_models/minimax_h3_image_pruned_int8_convrot.safetensors",
    "83eb140f1ff95c068f8a6886e6d3f3d0d4ab2e07bb2fe6d2ef992a51146ee622", 20979314802, "COMFYUI_ROOT", "diffusion_models"],
  ["base", "w4a8",
    "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/diffusion_models/minimax_h3_image_pruned_w4a8.safetensors",
    "517cc19b85348386f4df7c806dce80d839d0899e7cdaa3e1dbb09de964381dbb", 12549794530, "COMFYUI_ROOT", "diffusion_models"],
  ["base", "bf16",
    "https://huggingface.co/Comfy-Org/MiniMax-H3-Image/resolve/main/diffusion_models/minimax_h3_image_pruned_bf16.safetensors",
    "a767f5325db019588b3491a93d80288d336c826a7aeb87bec67675e554367222", 40234657162, "COMFYUI_ROOT", "diffusion_models"],
];

describe("the h3-image cell artifact pins (verbatim content law)", () => {
  it("every declared cell artifact is pinned — a substituted sha, url, or size fails here", () => {
    const cells = DECL.variants.filter((v) => v.group === "Variant").flatMap((v) => v.cells.map((c) => [v.id, c] as const));
    assert.equal(cells.length, CELL_ARTIFACT_PINS.length,
      "every declared cell artifact is pinned — a new cell edits this table");
    for (const [variant, quant, source_url, sha256, size_bytes, dest_root, dest_sub] of CELL_ARTIFACT_PINS) {
      const cell = cells.find(([v, c]) => v === variant && c.quant === quant)![1];
      const art = cell.artifact!;
      assert.equal(art.source_url, source_url, `${variant}/${quant}: the source url is pinned verbatim`);
      assert.equal(art.sha256, sha256, `${variant}/${quant}: the digest is pinned verbatim — a substituted sha fails here`);
      assert.equal(art.size_bytes, size_bytes, `${variant}/${quant}: the declared size is pinned verbatim`);
      assert.equal(art.dest_root, dest_root, `${variant}/${quant}: the destination root is pinned verbatim`);
      assert.equal(art.dest_sub, dest_sub, `${variant}/${quant}: the destination sub-folder is pinned verbatim`);
    }
  });
});
