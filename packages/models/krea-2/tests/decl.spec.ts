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
    // the DECL's own id IS the wire address (the registry looks the
    // family up by it); a typo here would strand the family with
    // every spec still green (audit 2026-10-13, mutation-proven)
    assert.equal(DECL.id, "krea-2");
    assert.equal(family.name, "family-krea-2");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("carries its variants — turbo, raw, kroma, kroma-base, realism — with routes and resolver defaults", () => {
    const ids = DECL.variants.map((v) => v.id);
    // (Rule A, 2026-09-18) the Recipe axis carries the functional
    // lora presets — turbo-distill joins the PRE-EXISTING realism
    // row (the strength-less idiom: the flavor's default 0.7)
    assert.deepEqual(ids, ["turbo", "raw", "kroma", "kroma-base", "realism", "default", "turbo-distill"]);
    const raw = DECL.variants.find((v) => v.id === "raw")!;
    const rd = raw.resolver_defaults ?? {};
    assert.equal(raw.route, "krea-2-raw");
    assert.equal(rd["model"], "krea-2-raw");
    assert.equal(rd["steps"], 52);
  });

  it("carries the kroma lanes — the Chroma-OPD fine-tune, distinct routes per lane, each lane its own sampling truth", () => {
    // (operator drop, 2026-11-07; sampling re-pinned to upstream
    // 2026-11-12, the lane-truth audit: the v0.3.1-turbo-opd distill
    // samples 8-12 steps / CFG 1.0-1.5 / shift 1.15; the v0.3-base
    // checkpoint is the RAW-weights full fine-tune, sampled as the
    // Krea 2 raw checkpoint — no shift, 30-60 steps, CFG 2-6.)
    // The required-defaults law: every Variant row declares its own
    // steps+cfg in resolver_defaults.
    const kroma = DECL.variants.find((v) => v.id === "kroma")!;
    assert.equal(kroma.label, "Kroma Turbo",
      "the label names the distill — 'Kroma' alone read as the same model twice beside Kroma Base");
    assert.equal(kroma.route, "kroma");
    assert.deepEqual(kroma.resolver_defaults, { model: "kroma", steps: 8, cfg: 1 });
    assert.deepEqual(kroma.sampler_envelope, { steps: [4, 12], cfg: [1, 2] },
      "the turbo envelope covers upstream's own 8-12-step marriage — an 11-step run is not a refusal");
    assert.equal((kroma.lane_inputs as Record<string, unknown>)["sampling_shift"], 1.15,
      "the distilled lane rides the live ModelSamplingAuraFlow arm, never the family's inert 0");
    const kromaBase = DECL.variants.find((v) => v.id === "kroma-base")!;
    assert.equal(kromaBase.route, "kroma-base");
    assert.deepEqual(kromaBase.resolver_defaults, { model: "kroma-base", steps: 52, cfg: 3.5 },
      "the raw-weights base rides the RAW schedule (52/3.5), not a turbo-flavored mid envelope");
    assert.deepEqual(kromaBase.sampler_envelope, { steps: [30, 60], cfg: [2, 6] },
      "the base envelope mirrors the raw lane's — upstream: sample it as you would the Krea 2 raw checkpoint");
    assert.equal(kromaBase.lane_inputs, undefined,
      "the base weights are the RAW weights' fine-tune: NO lane override at all — the turbo lane's shift 1.15 here was bleed-through drift, and the raw spelling is the family's inert 0");
    // the per-quant cell law: each cell names its own unet file and
    // its own route address (anima precedent)
    const cellFiles = kroma.cells.map((c) =>
      [c.route, (c.lane_inputs as Record<string, unknown>)["unet"]]);
    assert.deepEqual(cellFiles, [
      ["kroma-int8", "kroma-v0.3.1-turbo-opd-int8-convrot.safetensors"],
      ["kroma-bf16", "kroma-v0.3.1-turbo-opd.safetensors"],
    ]);
    assert.deepEqual(
      [kromaBase.cells[0].route, (kromaBase.cells[0].lane_inputs as Record<string, unknown>)["unet"]],
      ["kroma-base", "kroma-v0.3-base-dtype-mapped.safetensors"]);
  });

  it("carries its quant cells — every one with its HF link, sha256, size", () => {
    const cells = DECL.variants.flatMap((v) => v.cells);
    // 2 -> 5 (2026-11-07, the kroma lanes): the two Kroma turbo quants
    // + the base tier's dtype-mapped cell join turbo + raw.
    assert.equal(cells.length, 5, "turbo + raw, one int8 cell each; kroma, two quants; kroma-base, one");
    for (const c of cells) {
      assert.ok(c.artifact!.source_url.startsWith("https://huggingface.co/"), "no link, no cell");
      assert.match(c.artifact!.sha256!, /^[0-9a-f]{64}$/);
      assert.equal(c.artifact!.dest_root, "COMFYUI_ROOT");
      assert.equal(c.artifact!.dest_sub, "diffusion_models");
    }
  });

  it("carries its mods boarding — loras — and the flavor data itself", () => {
    assert.deepEqual(DECL.mods, ["mask", "loras"]);
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

// THE VERBATIM CELL-ARTIFACT LAW: each declared cell artifact's source
// url, digest, size and destination are literals here — a substituted
// sha or a moved file fails this block.
const CELL_ARTIFACT_PINS: ReadonlyArray<
  readonly [variant: string, quant: string, source_url: string, sha256: string, size_bytes: number, dest_root: string, dest_sub: string]
> = [
  ["turbo", "int8_convrot", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_turbo_int8_convrot.safetensors", "8e4eeda70dd5037ab1ba2bef6b417f9f901e26093117cf397f741fc1fdaaf3f1", 13492686496, "COMFYUI_ROOT", "diffusion_models"],
  ["raw", "int8_convrot", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/diffusion_models/krea2_raw_int8_convrot.safetensors", "5585a4a38c4bcfb6fde2d480a4aa6edf7f665721ebde56d30662c35a45f5fa5c", 13492686496, "COMFYUI_ROOT", "diffusion_models"],
  // 2026-11-07, the kroma lanes: the pins below are the HF-API lfs
  // oids (sha256) + byte sizes, verbatim.
  ["kroma", "int8_convrot", "https://huggingface.co/silveroxides/Kroma-Quant/resolve/main/kroma-v0.3.1-turbo-opd-int8-convrot.safetensors", "36afdaeeea578ea577ae151fb2f9b58836b2a0538acf1cede74244cdbb5cfdd4", 14135109816, "COMFYUI_ROOT", "diffusion_models"],
  ["kroma", "bf16", "https://huggingface.co/lodestones/Kroma/resolve/main/kroma-v0.3.1-turbo-opd.safetensors", "3cfb5bc847c804ea8e8f894677f7e16ebe4c9ff0f978896cc5e7eb1e64fc7d82", 26283332880, "COMFYUI_ROOT", "diffusion_models"],
  ["kroma-base", "bf16", "https://huggingface.co/silveroxides/Kroma-Quant/resolve/main/kroma-v0.3-base-dtype-mapped.safetensors", "83a275d770d7b730b341aab35a1001ff22f12aa6e80310843299751b42f6f81b", 26284337464, "COMFYUI_ROOT", "diffusion_models"],
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

// THE VERBATIM MOD-ROW LAW: every LoRA flavor row's filename and
// source_url are literals here — a renamed row or a moved file fails
// this block. A new row is a deliberate edit of this table.
const LORAS_MOD_PINS: ReadonlyArray<
  readonly [id: string, filename: string, source_url: string]
> = [
  ["krea2_realism_lora", "krea-2/krea2_realism_lora.safetensors", "https://huggingface.co/gokaygokay/Krea-2-Realism-LoRA/resolve/main/krea2_realism_lora.safetensors"],
  ["krea2_turbo_lora_rank_64_bf16", "krea-2/krea2_turbo_lora_rank_64_bf16.safetensors", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_turbo_lora_rank_64_bf16.safetensors"],
  ["krea2_darkbrush", "krea-2/krea2_darkbrush.safetensors", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_darkbrush.safetensors"],
  ["krea2_dotmatrix", "krea-2/krea2_dotmatrix.safetensors", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_dotmatrix.safetensors"],
  ["krea2_kidsdrawing", "krea-2/krea2_kidsdrawing.safetensors", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_kidsdrawing.safetensors"],
  ["krea2_neondrip", "krea-2/krea2_neondrip.safetensors", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_neondrip.safetensors"],
  ["krea2_rainywindow", "krea-2/krea2_rainywindow.safetensors", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_rainywindow.safetensors"],
  ["krea2_retroanime", "krea-2/krea2_retroanime.safetensors", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_retroanime.safetensors"],
  ["krea2_softwatercolor", "krea-2/krea2_softwatercolor.safetensors", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_softwatercolor.safetensors"],
  ["krea2_sunsetblur", "krea-2/krea2_sunsetblur.safetensors", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_sunsetblur.safetensors"],
  ["krea2_vintagetarot", "krea-2/krea2_vintagetarot.safetensors", "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_vintagetarot.safetensors"],
  ["krea2filterbypass3", "krea-2/krea2filterbypass3.safetensors", "https://huggingface.co/uzumix/krea2filterbypass3.safetensors/resolve/main/krea2filterbypass3.safetensors"],
];

describe("the LoRA flavor rows are pinned verbatim", () => {
  it("every row carries its pinned filename and source_url", () => {
    assert.deepEqual(KREA_ROWS.map((r) => [r.id, r.filename, r.source_url]), LORAS_MOD_PINS,
      "the pin table IS the flavor table — a row added, dropped, renamed or re-pointed fails here");
  });
});
