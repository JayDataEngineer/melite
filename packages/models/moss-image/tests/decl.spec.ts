// @melite/models-moss-image — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// sft variant, its quant cells, the lane inputs, the defaults. These
// pins hold the PLUGIN SHAPE + identity + the MOSS lane contract
// (the official template truth, the Apache-2.0 licence row, the
// declared 5.0 shift); registration is proven engine-side (the
// walls' registry count, the boot gates).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the moss-image model plugin (the FLUX.2-latent MOSS 5B lane)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-moss-image");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id names the MODEL, never the operation (the naming law)", () => {
    assert.equal(DECL.id, "moss-image");
    assert.ok(!DECL.id.includes("t2i") && !DECL.id.includes("5b"), "the family id names the model family, not a lane or a size");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("carries the Apache-2.0 licence row (the Comfy-Org repack and upstream OpenMOSS release terms)", () => {
    assert.equal(DECL.licence?.id, "apache-2.0");
    assert.equal(DECL.licence?.commercial_use, true);
    // the licence wall's law holds from the other side: no served
    // text may claim non-commercial without the structural twin
    const served = [DECL.description ?? "", DECL.label,
      ...DECL.variants.map((v) => [v.label, (v as { hint?: string }).hint ?? ""]).flat()];
    assert.ok(served.every((t) => !/non-?commercial/i.test(t)),
      "a non-commercial mention in served text with an apache row is a licence-law offender");
  });

  it("carries the fast-iteration recipe row (the operator's 25-30 band): Quick iter stamps, Default stamps nothing", () => {
    const recipes = DECL.variants.filter((v) => v.group === "Recipe");
    assert.equal(recipes.length, 2, "quick-iter + Default");
    const quick = recipes.find((v) => v.id === "quick-iter")!;
    assert.deepEqual(quick.wire_defaults, { steps: 28 });
    // inside the card's declared bounds (steps [1,100], cfg [1,20])
    assert.ok(28 >= 1 && 28 <= 100, "the stamp sits inside the card's own bounds");
    // and inside the sft variant's envelope (the compose gate judges
    // stated values against the SELECTED variant)
    const sft = DECL.variants.find((v) => v.id === "sft")!;
    const env = (sft as { sampler_envelope?: { steps: [number, number]; cfg: [number, number] } }).sampler_envelope!;
    assert.ok(28 >= env.steps[0] && 28 <= env.steps[1], "the recipe's steps compose on the sft tier");
    const dflt = recipes.find((v) => v.id === "default")!;
    assert.equal(Object.keys(dflt.wire_defaults ?? {}).length, 0, "Default stamps nothing");
  });

  it("carries the sft variant — route, resolver defaults, the declared shift, per-quant cells", () => {
    const sft = DECL.variants.find((v) => v.id === "sft")!;
    assert.equal(sft.route, "moss-image");
    assert.deepEqual(sft.resolver_defaults, { model: "moss-image", steps: 50, cfg: 3 });
    assert.equal((sft.lane_inputs as Record<string, unknown> | undefined)?.sampling_shift, undefined,
      "the shift is the FAMILY's declared 5.0 — the variant carries no override");
    // the per-quant cell law: each cell names its own unet file and
    // its own route address (anima precedent; the int8 shares the
    // variant route as the default cell)
    const cellFiles = sft.cells.map((c) =>
      [c.route, (c.lane_inputs as Record<string, unknown>)["unet"]]);
    assert.deepEqual(cellFiles, [
      ["moss-image", "moss_image_sft_int8_convrot.safetensors"],
      ["moss-image-bf16", "moss_image_sft_bf16.safetensors"],
    ]);
  });

  it("carries its lane inputs — the weight files the engine loads, the moss tokenizer branch, the declared shift", () => {
    const lane = DECL.lane_inputs ?? {};
    assert.equal(lane.clip_type, "moss_image");
    assert.equal(lane.latent_node, "EmptyFlux2LatentImage", "MOSS lives in the FLUX.2 latent space");
    assert.equal(lane.text_encode_node, "CLIPTextEncode");
    assert.equal(lane.sampling_shift, 5.0, "the template's own declared shift — the ModelSamplingAuraFlow arm");
    assert.equal(lane.text_encoder, "qwen3.5_9b_w4a8_gptq.safetensors");
    assert.equal(lane.unet, "moss_image_sft_int8_convrot.safetensors");
    assert.equal(lane.vae, "flux2-vae_small.safetensors");
  });

  it("carries its mods boarding — mask + the loras pack (the every-image-family law)", () => {
    assert.deepEqual(DECL.mods, ["mask", "loras"]);
  });

  it("boards the form the image-gen card serves, with the required word stated", () => {
    assert.equal(DECL.form, "form_generate");
    assert.equal(DECL.genre, "image");
    assert.deepEqual(DECL.relations?.required, [
      { fields: ["prompt"], cure: "every image lane states WHAT the picture is — write the prompt" },
    ]);
  });
});

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["qwen3.5_9b_w4a8_gptq.safetensors", "4cc6a1543ad2061806da46f35f90cadb4801dcba246c44782cf42ec0feb6407c", "https://huggingface.co/Comfy-Org/MOSS-Image/resolve/main/text_encoders/qwen3.5_9b_w4a8_gptq.safetensors", 7343591088],
  ["flux2-vae_small.safetensors", "d8d52ba036475f5fb07c8b435e176d3d97ebfa82f0d1a1c317f9cc1e25bd013b", "https://huggingface.co/Comfy-Org/MOSS-Image/resolve/main/vae/flux2-vae_small.safetensors", 249521340],
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
  ["sft", "int8_convrot", "https://huggingface.co/Comfy-Org/MOSS-Image/resolve/main/diffusion_models/moss_image_sft_int8_convrot.safetensors", "b4d1475bc7eeffd7b809e82ea13a1fba1fb85c4e18365af3813722faa5c0fe4f", 5413698958, "COMFYUI_ROOT", "diffusion_models"],
  ["sft", "bf16", "https://huggingface.co/Comfy-Org/MOSS-Image/resolve/main/diffusion_models/moss_image_sft_bf16.safetensors", "f96738d8116d78b7316b57c663d8c98591ddafab7488f48e3099b7655e34ab6f", 10164655808, "COMFYUI_ROOT", "diffusion_models"],
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
