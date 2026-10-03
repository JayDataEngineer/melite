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
    // the edit samples at target resolution, never VAEEncode-of-source
    // (the 2511 lane) — the ACTION owns that class (EmptyLatentImage
    // at target resolution, its own facts door), so the row declares
    // no latent member.
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).latent_node, undefined);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).steps, 25);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).cfg, 1);
  });

  it("declares the target resolution — THE EMPTY-FORM BURN (2026-10-09): width/height default 1024, the owner is the DECL, never a lane hardcode", () => {
    // The operator's catch: the image-edit card showed EMPTY Width and
    // Height while image-gen showed 1024 — because this DECL stated no
    // resolution and the LANE silently hardcoded `?? 1024`
    // (lanes-image.ts) where the cascade could never see it. The
    // RANGE RULE: whoever owns the default owns the floor — the model
    // owns target resolution. Lose this row and the form starves
    // again; the stampCardOverlay wall (cards-registry) refuses with it.
    const d = DECL.defaults ?? {} as Record<string, unknown>;
    assert.equal(d.width, 1024, "width defaults to 1024 (the lane's own truth, declared where the cascade reads it)");
    assert.equal(d.height, 1024, "height defaults to 1024");
  });

  it("provisions the shared weights: encoder + vae from the one 2.1 repo", () => {
    const provs = DECL.provisions ?? [];
    // 2026-10-12 ghost-debt: 2 -> 3, the bf16 lane's TE joined the
    // table (the int8 default + the bf16 tier both downloadable)
    assert.equal(provs.length, 3);
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
  ["int8", "int8_convrot", "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_int8_convrot.safetensors", "cb74113cb03faecd79611b01fd7fd642f0aa60d6f0b95086abee214d75eaa57d", 7256783064, "COMFYUI_ROOT", "diffusion_models"],
  ["bf16", "bf16", "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_bf16.safetensors", "89f4158d066cc33906a199fca85634f766892dd78f49b6698dabf187ac86c4bc", 14230280616, "COMFYUI_ROOT", "diffusion_models"],
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
