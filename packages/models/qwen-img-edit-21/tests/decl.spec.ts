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
    // the edit samples the ENCODER'S OWN latent (its third output),
    // never a stated-size EmptyLatentImage and never
    // VAEEncode-of-source (the 2511 lane) — the row declares no
    // latent member; the ACTION owns that class.
    assert.equal((DECL.lane_inputs ?? {} as Record<string, unknown>).latent_node, undefined);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).steps, 25);
    assert.equal((DECL.defaults ?? {} as Record<string, unknown>).cfg, 1);
  });

  it("declares NO stated size — the latent law (2026-11-08): the encoder's own anchor-sized latent is the geometry", () => {
    // The empty-form burn's cure (2026-10-09, width/height default
    // 1024) is SUPERSEDED: the lane now samples the encoder's own
    // third output ("Empty latent on the first reference image's
    // size … any other size shifts the edit" — the node's own law),
    // so a stated target size has no seat and the DECL carries
    // neither the pair nor their bounds. A regression that
    // re-declares them re-opens the drift class the probe pinned:
    // the EmptyLatent baked the anchor's header size while the
    // encoder processed references at its resolution budget.
    const d = DECL.defaults ?? {} as Record<string, unknown>;
    assert.equal(d.width, undefined, "width has no default — the lane takes no stated size");
    assert.equal(d.height, undefined, "height has no default — the lane takes no stated size");
    assert.ok(!(DECL.params ?? []).includes("width"), "width is off the surface");
    assert.ok(!(DECL.params ?? []).includes("height"), "height is off the surface");
    assert.ok((DECL.params ?? []).includes("match_input_resolution"), "the match toggle stays admitted — the declared no-op, draft compatibility");
    // THE SOLVER SPAN (the latent law's sibling, 2026-11-08): no
    // stated-size domain exists on this lane, but steps keeps the
    // edit narrowing's [1,50] — the write door judges a live domain,
    // never an empty bounds map. A regression that re-adds a
    // width/height domain re-opens the drift class.
    assert.deepEqual(DECL.bounds, { steps: { min: 1, max: 50 } }, "bounds carries ONLY the solver span");
  });

  it("provisions the shared weights: encoder + vae from the one 2.1 repo, the lora from its author's", () => {
    const provs = DECL.provisions ?? [];
    // 2026-10-12 ghost-debt: 2 -> 3, the bf16 lane's TE joined the
    // table. 2026-11-08: 3 -> 4, the Consistency LoRA (the drift-lock
    // recipe's file) — its repo is the AUTHOR's, not Comfy-Org's.
    assert.equal(provs.length, 4);
    for (const p of provs.slice(0, 3)) {
      assert.ok(p.url.startsWith("https://huggingface.co/Comfy-Org/Qwen-Image-2.1/"));
      assert.match(p.sha256 ?? "", /^[0-9a-f]{64}$/);
    }
    const lora = provs[3]!;
    assert.ok(lora.url.startsWith("https://huggingface.co/ausboss/Qwen-Image-2.1-Consistency-LoRA/"));
    assert.equal(lora.folder, "loras/qwen-img-edit-21", "the lora lands in the lane's own loras subfolder");
  });

  it("boards the official background-removal one-click: the template's canned prompt VERBATIM, selection-only (the scoping law)", () => {
    // The official image_qwen_image_2_1_background_removal template
    // is THIS lane + one canned prompt — same weights, same graph
    // (verified against the Comfy-Org template this day: cfg 1,
    // euler/simple, 25 steps — already the family defaults). The
    // recipe stamps ONLY the prompt: one fact, one owner.
    const row = DECL.variants.find((v) => v.id === "remove-background");
    assert.ok(row, "the remove-background recipe row exists");
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
  ["qwen-image-2.1-consistency.safetensors", "4f44ada1be2189cc23b3d010f9603543403f48454e2f76842a3d30109b20bd63", "https://huggingface.co/ausboss/Qwen-Image-2.1-Consistency-LoRA/resolve/main/qwen-image-2.1-consistency.safetensors", 159436496],
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
  it("THE MATRIX WALL — same axes as the t2i family (Base/Turbo × int8_convrot/bf16); turbo runs 8 steps and every cell loads exactly what it downloads", () => {
    // THE VARIANT-AXIS LAW's clean arm on the edit lane: Variant
    // rows are Base/Turbo, never quant labels; each quant CELL
    // owns its tier's unet spelling (the cell-lane cascade); the
    // recipe↔weights law holds per cell.
    const variantRows = DECL.variants.filter((v) => v.group === "Variant");
    // (re-pin 2026-10-26, burn c — operator: "YOU DIDN'T MAKE TURBO
    // DEFAULT FOR THE IMAGE EDIT MODEL") the DEFAULT is the first
    // declared row — the turbo rides first; base is the deliberate
    // pick. The edit-default-turbo wall owns the order at the DECL,
    // the resolver, and the lane file.
    assert.deepEqual(variantRows.map((v) => v.id), ["turbo", "base"],
      "two axis tokens, Turbo first (the family default — the operator's burn-c order)");
    const turbo = variantRows.find((v) => v.id === "turbo")!;
    // THE REQUIRED DEFAULTS (operator contract 2026-11-07): the FULL
    // face rides the route — steps AND cfg declared, never a silent
    // ride on the family defaults (the turbo hazard the law names).
    assert.deepEqual(turbo.resolver_defaults, { steps: 8, cfg: 1 },
      "turbo: the full 8/1 pair rides the route, never the base defaults");
    const atomUnet = String((DECL.lane_inputs ?? {}).unet);
    for (const v of variantRows) {
      assert.deepEqual(v.cells.map((c) => c.quant), ["int8_convrot", "bf16"],
        `${v.id}: both download tiers under the axis token`);
      for (const c of v.cells) {
        const cellFile = c.artifact!.source_url.split("/").pop()!;
        const cellUnet = String((c.lane_inputs ?? {}).unet ?? atomUnet);
        assert.equal(cellFile, cellUnet,
          `${v.id}/${c.quant}: the cell downloads exactly the unet the lane loads (recipe↔weights per cell)`);
      }
    }
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
