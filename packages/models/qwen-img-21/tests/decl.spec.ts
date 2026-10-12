// @melite/models-qwen-img-21 — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants, their quant cells, the mods boarding, the lane inputs,
// the defaults. These pins hold the PLUGIN SHAPE + identity + the
// 2.1 lane contract (the naming law, the encoder branch key, the
// sibling-pair topology); registration is proven engine-side (the
// walls' registry count, the boot gates).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the qwen-img-21 model plugin (the t2i lane of the 2.1 base)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen-img-21");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id names MODEL+VERSION, never the operation (the naming law, operator 2026-09-21)", () => {
    assert.equal(DECL.id, "qwen-img-21");
    assert.ok(!DECL.id.includes("edit"), "the t2i family never bakes an operation into the model id");
    assert.ok(!DECL.id.includes("2511"), "the 2.1 family is never confused with the 2511 generation");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("carries the 2.1 lane contract: the encoder branch key + the official template defaults", () => {
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).text_encode_node, "TextEncodeQwenImage21");
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).clip_type, "qwen_image");
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).unet, "qwen_image_2.1_int8_convrot.safetensors");
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).vae, "qwen_image_2.1_vae_bf16.safetensors");
    // the official t2i template's sampler truth: 25 steps, cfg 1, euler/simple
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).width, 1024);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).height, 1024);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).steps, 25);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).cfg, 1);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).sampler, "euler");
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).scheduler, "simple");
  });

  it("provisions the shared weights (the silent-failure cure): encoder + vae carry url/sha/size", () => {
    const provs = DECL.provisions ?? [];
    // 2026-10-12 ghost-debt: 2 -> 3, the bf16 lane's TE joined the
    // table (the int8 default + the bf16 tier both downloadable)
    assert.equal(provs.length, 3);
    for (const p of provs) {
      assert.ok(p.url.startsWith("https://huggingface.co/Comfy-Org/Qwen-Image-2.1/"));
      assert.match(p.sha256 ?? "", /^[0-9a-f]{64}$/);
      assert.ok((p.size_bytes ?? 0) > 0);
    }
  });

  it("quant cells carry downloadable artifacts (int8 default + bf16 tier + the turbo lane)", () => {
    const cells = DECL.variants.filter((v) => v.group === "Variant").flatMap((v) => v.cells);
    assert.equal(cells.length, 4);
    for (const c of cells) {
      assert.ok(c.artifact, `cell ${c.quant} carries its artifact`);
      assert.match(c.artifact!.sha256, /^[0-9a-f]{64}$/);
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
  ["qwen3vl_8b_bf16.safetensors", "68bdc82bc1b66851162ae656225e7e2068166b603db19bd5d5a3b90eb12669a9", "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/text_encoders/qwen3vl_8b_bf16.safetensors", 17534334616],
  ["qwen3vl_8b_int8_convrot.safetensors", "8bfd0f6e12abf2d2d697ecc888e5e90b0d6741d6708f05799f53afa560452e8f", "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/text_encoders/qwen3vl_8b_int8_convrot.safetensors", 9350798360],
  ["qwen_image_2.1_vae_bf16.safetensors", "bb21f7473051e1ac368515dd3f2e15cd44d7a11748ee8823e1ddca3e4876b7c9", "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/vae/qwen_image_2.1_vae_bf16.safetensors", 675509688],
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
  ["base", "int8_convrot", "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_int8_convrot.safetensors", "cb74113cb03faecd79611b01fd7fd642f0aa60d6f0b95086abee214d75eaa57d", 7256783064, "COMFYUI_ROOT", "diffusion_models"],
  ["base", "bf16", "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_bf16.safetensors", "89f4158d066cc33906a199fca85634f766892dd78f49b6698dabf187ac86c4bc", 14230280616, "COMFYUI_ROOT", "diffusion_models"],
  ["turbo", "int8_convrot", "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_turbo_int8_convrot.safetensors", "8144a0182964aa8403ad6dbc011db837304167d235161b9aabaa8532e967314c", 7256787829, "COMFYUI_ROOT", "diffusion_models"],
  ["turbo", "bf16", "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_turbo_bf16.safetensors", "8b74237a7f505773e2c66726fa696444b4c704585c93a347cff9044937f7914a", 14230280616, "COMFYUI_ROOT", "diffusion_models"],
];

describe("the declared cell artifacts are pinned verbatim", () => {
  it("THE MATRIX WALL — the axes are tokens (Base/Turbo × int8_convrot/bf16); the turbo axis runs 8 steps and every cell loads exactly what it downloads", () => {
    // THE VARIANT-AXIS LAW's clean arm on the real family: the
    // Variant rows are Base/Turbo (upstream's own names), never
    // quant labels; each quant CELL owns its tier's unet spelling
    // (the cell-lane cascade), and the recipe↔weights law holds
    // per cell: the artifact filename IS the effective unet.
    const variantRows = DECL.variants.filter((v) => v.group === "Variant");
    assert.deepEqual(variantRows.map((v) => v.id), ["base", "turbo"],
      "two axis tokens, Base first (the family default — the matrix law)");
    const turbo = variantRows.find((v) => v.id === "turbo")!;
    assert.deepEqual(turbo.resolver_defaults, { steps: 8 },
      "turbo: the 8-step marriage rides the route, never the base defaults");
    assert.equal(variantRows.find((v) => v.id === "base")!.resolver_defaults, undefined,
      "base: no route stamps — the family defaults (25 steps) rule");
    // the atom's own unet is the int8 tier (the official template
    // pick); a cell that loads a DIFFERENT file must spell it.
    const atomUnet = String((DECL.lane_inputs ?? {}).unet);
    for (const v of variantRows) {
      assert.deepEqual(v.cells.map((c) => c.quant), ["int8_convrot", "bf16"],
        `${v.id}: both download tiers under the axis token`);
      for (const c of v.cells) {
        const cellFile = c.artifact!.source_url.split("/").pop()!;
        const cellUnet = String((c.lane_inputs ?? {}).unet ?? atomUnet);
        assert.equal(cellFile, cellUnet,
          `${v.id}/${c.quant}: the cell downloads exactly the unet the lane loads (recipe↔weights per cell)`);
        if (c.quant === "bf16") {
          assert.match(cellUnet, /_bf16\.safetensors$/, `${v.id}/bf16: the tier spells its own unet`);
        }
      }
    }
    // the bf16 encoder swap rides the BASE bf16 cell (the tier
    // truth), never the axis token
    const baseBf16 = variantRows.find((v) => v.id === "base")!.cells.find((c) => c.quant === "bf16")!;
    assert.equal(String((baseBf16.lane_inputs ?? {}).text_encoder), "qwen3vl_8b_bf16.safetensors",
      "base/bf16: the bf16 encoder rides the cell");
  });

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
