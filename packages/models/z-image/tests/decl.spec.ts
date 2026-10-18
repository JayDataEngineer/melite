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
    assert.deepEqual(DECL.mods, ["mask", "loras", "controlnet", "ip_adapter"]);
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

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["z_image_turbo_int8_convrot.safetensors", "be517ebd47c912a5626a588e1aeea43e6be4a43c0cdcd2b48a2a780d9f358635", "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/diffusion_models/z_image_turbo_int8_convrot.safetensors", 6201001296],
  ["qwen_3_4b.safetensors", "6c671498573ac2f7a5501502ccce8d2b08ea6ca2f661c458e708f36b36edfc5a", "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors", 8044982048],
  ["ae.safetensors", "afc8e28272cd15db3919bacdb6918ce9c1ed22e96cb12c4d5ed0fba823529e38", "https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors", 335304388],
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

// THE VERBATIM MOD-ROW LAW: every LoRA flavor row's filename and
// source_url are literals here — a renamed row or a moved file fails
// this block. A new row is a deliberate edit of this table.
const LORAS_MOD_PINS: ReadonlyArray<
  readonly [id: string, filename: string, source_url: string]
> = [
  ["zimage_3d_mmorpg", "z-image/z-image-3d-mmorpg.safetensors", "https://huggingface.co/DK9/3D_MMORPG_style_z-image-turbo_lora/resolve/main/lostark_v1.safetensors"],
  ["zimage_classic_painting", "z-image/z-image-classic-painting.safetensors", "https://huggingface.co/renderartist/Classic-Painting-Z-Image-Turbo-LoRA/resolve/main/Classic_Painting_Z_Image_Turbo_v1_renderartist_1750.safetensors"],
  ["zimage_coloring_book", "z-image/z-image-coloring-book.safetensors", "https://huggingface.co/renderartist/Coloring-Book-Z-Image-Turbo-LoRA/resolve/main/Coloring_Book_Z_Image_Turbo_v1_renderartist_2000.safetensors"],
  ["zimage_dejpeg", "z-image/z-image-dejpeg.safetensors", "https://huggingface.co/wcde/Z-Image-Turbo-DeJPEG-Lora/resolve/main/dejpeg_v3.safetensors"],
  ["zimage_pixel_art", "z-image/z-image-pixel-art.safetensors", "https://huggingface.co/tarn59/pixel_art_style_lora_z_image_turbo/resolve/main/pixel_art_style_z_image_turbo.safetensors"],
  ["zimage_realism", "z-image/z-image-realism.safetensors", "https://huggingface.co/suayptalha/Z-Image-Turbo-Realism-LoRA/resolve/main/pytorch_lora_weights.safetensors"],
  ["zimage_sunbleached", "z-image/z-image-sunbleached.safetensors", "https://huggingface.co/Quorlen/z_image_turbo_Sunbleached_Protograph_Style_Lora/resolve/main/zimageturbo_Sunbleach_Photograph_Style_Lora_TAV2_000002750.safetensors"],
];

describe("the LoRA flavor rows are pinned verbatim", () => {
  it("every row carries its pinned filename and source_url", () => {
    assert.deepEqual(ZIMAGE_ROWS.map((r) => [r.id, r.filename, r.source_url]), LORAS_MOD_PINS,
      "the pin table IS the flavor table — a row added, dropped, renamed or re-pointed fails here");
  });
});

// THE VERBATIM MOD-ROW LAW: every ControlNet flavor row's filename and
// source_url are literals here — seven types, one union file, and the
// table says so exactly.
const CONTROLNET_MOD_PINS: ReadonlyArray<
  readonly [id: string, filename: string, source_url: string]
> = [
  ["depth", "z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors", "https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union-2.1/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors"],
  ["pose", "z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors", "https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union-2.1/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors"],
  ["canny", "z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors", "https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union-2.1/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors"],
  ["mlsd", "z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors", "https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union-2.1/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors"],
  ["hed", "z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors", "https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union-2.1/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors"],
  ["scribble", "z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors", "https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union-2.1/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors"],
  ["gray", "z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors", "https://huggingface.co/alibaba-pai/Z-Image-Turbo-Fun-Controlnet-Union-2.1/resolve/main/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors"],
];

describe("the ControlNet flavor rows are pinned verbatim", () => {
  it("every type carries its pinned filename and source_url", () => {
    assert.deepEqual(ZIMAGE_CONTROLNET_ROWS.map((r) => [r.id, r.filename, r.source_url]), CONTROLNET_MOD_PINS,
      "the pin table IS the flavor table — a type added, dropped, renamed or re-pointed fails here");
  });
});

// THE IP-ADAPTER ROWS CARRY NO SOURCE (the ray receipt: the SD1.5
// files never stood on disk and cannot patch S3-DiT), so the pinned
// literal is the retired filename each row names as catalog note.
const IP_ADAPTER_MOD_PINS: ReadonlyArray<
  readonly [id: string, filename: string]
> = [
  ["style", "ip-adapter-light_v11.safetensors"],
  ["composition", "ip-adapter-plus_sd15.safetensors"],
  ["face", "ip-adapter-faceid-plusv2_sd15.safetensors"],
  ["generic", "ip-adapter_sd15.safetensors"],
];

describe("the IP-Adapter flavor rows are pinned verbatim", () => {
  it("every mode carries its pinned catalog filename and claims no source", () => {
    assert.deepEqual(ZIMAGE_IPADAPTER_ROWS.map((r) => [r.id, r.filename]), IP_ADAPTER_MOD_PINS,
      "the pin table IS the flavor table — a mode added, dropped or renamed fails here");
    for (const r of ZIMAGE_IPADAPTER_ROWS) {
      assert.equal((r as { source_url?: string }).source_url, undefined,
        `${r.id} claims NO source — no fetchable artifact exists, none is invented`);
    }
  });
});
