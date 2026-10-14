// @melite/models-h3 — the model-plugin data pins.
//
// THE ONE-MODEL LAW (roadmap §8, the operator's catch: "HOW IS
// MINIMAX H3 AND H3 TIMELINE TWO DIFFERENT MODELS?"): ONE family
// owns the whole H3 surface — the multi-window timeline films, the
// single-shot FL2VA/Ref2VA lanes, and the keyframe lane.
//
// THE SURVIVOR-ID CORRECTION (operator, 2026-09-22: "every folder
// in models IS the upstream model — anima isn't anima-generate"):
// the fold's first cut kept `h3-timeline` as the family id — a
// LANE flavor in the MODEL seat, against this spec's own first
// assertion. The family id is the checkpoint: `h3`. The old family
// address `h3-timeline` survives as the timeline lane's variant
// route (drafts, skills, tool enums resolve migration-free); the
// single-shot lane's route moves to the explicit `h3-fl2va`
// (the pre-correction route `h3` now names the family itself —
// the one deliberate behavior shift, ledgered).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the h3 model plugin (the ONE H3 family — timeline + single-shot + keyframe)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-h3");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("MODEL names the checkpoint — the family id carries NO lane flavor (anima isn't anima-generate)", () => {
    assert.equal(DECL.id, "h3", "the checkpoint id — never a usecase/lane suffix");
    assert.equal(DECL.label, "MiniMax H3");
    assert.ok(!DECL.label.includes("Timeline"), "the multi-window lane is a VARIANT, never a second model");
  });

  it("ONE VARIANT — the timeline lane (operator 2026-11-02: 1 model, 1 variant, 1 quant, 3 recipes)", () => {
    const variantRows = DECL.variants.filter((v) => v.group !== "Recipe");
    assert.equal(variantRows.length, 1, "exactly one non-recipe variant row");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
    const byId = new Map(DECL.variants.map((v) => [v.id, v]));
    // the timeline lane — its route IS the pre-correction family
    // address (the one surviving address)
    assert.equal(byId.get("timeline")?.route, "h3-timeline");
    // the folded single-shot/keyframe routes retired with the recipe
    // rework — none survives as a variant row
    for (const gone of ["fl2va", "fl2va-turbo", "ref2va", "ref2va-turbo", "keyframe", "timeline-ref2va"]) {
      assert.equal(byId.has(gone), false, `the folded variant '${gone}' retired (one lane, three recipes)`);
    }
  });

  it("the ONE variant carries NO resolver_defaults — the carrier schema's own floors are the lane's geometry", () => {
    // The folded lanes' resolver_defaults (single-shot 1344×768/124f,
    // keyframe 768×448/56f) retired with their rows (2026-11-02):
    // geometry lives on ONE seat — the carrier schema's defaults —
    // and the recipes stamp only what differs (draft's 768×448).
    const byId = new Map(DECL.variants.map((v) => [v.id, v]));
    const timeline = byId.get("timeline");
    assert.ok(timeline, "the timeline variant serves");
    assert.equal(timeline?.resolver_defaults, undefined, "no second geometry seat on the surviving variant");
  });

  it("the provisions union — the single-shot weights ride the ONE family", () => {
    const names = new Set((DECL.provisions ?? []).map((p) => p.name));
    assert.ok(names.has("minimax_h3_fl2va_pruned_int8_convrot.safetensors"), "the single-shot FL2VA UNET rides");
    assert.ok(names.has("minimax_h3_ref2va_pruned_int8_convrot.safetensors"), "the single-shot Ref2VA UNET rides");
    assert.ok(names.has("minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors"), "the timeline hybrid UNET stays");
  });

  it("the loras mod stays family-level — the bag serves every lane", () => {
    const packs = (DECL.mods ?? []).map((m) => (typeof m === "string" ? m : m.pack));
    assert.deepEqual(packs, ["loras"], "the distill adapters ride all variants (the turbo lanes ARE single-shot lanes)");
  });

  it("THE RECIPE TRIO (operator 2026-11-02: draft / standard / final, all riding the ByteDance 4-step lora; default = standard)", () => {
    const recipes = DECL.variants.filter((v) => v.group === "Recipe");
    assert.equal(recipes.length, 3, "exactly three recipe rows — 1 model, 1 variant, 1 quant, 3 recipes");
    assert.equal(recipes[0]?.id, "standard", "first-declared law: the birth stamp takes the first composing recipe row (the standard IS the default)");
    const wire = recipes[0]?.wire_defaults as Record<string, unknown>;
    // SELECTION ONLY: the id — strength 1 and the married 4-step
    // count ride from the flavor catalog row at compose.
    assert.deepEqual(wire?.["loras"], [{ id: "h3_dmad_4step" }], "the ByteDance DMAD 4-step bag row");
    // DRY (one value, one owner): standard stamps NO geometry — the
    // carrier schema's own 1344×768 floor IS the calibrated point.
    assert.ok(!("width" in (wire ?? {})), "standard stamps no width — the carrier floor 1344 owns it");
    assert.ok(!("height" in (wire ?? {})), "standard stamps no height — the carrier floor 768 owns it");
    assert.ok(!("steps" in (wire ?? {})), "steps UNSTATED — the lora row owns its married 4 (no hard pin)");
    assert.ok(!("strength" in ((wire?.["loras"] as Array<Record<string, unknown>>)?.[0] ?? {})), "strength UNSTATED — the flavor's own default_strength 1 rides");
    // the group default names the first row
    const group = (DECL.variant_groups ?? []).find((g) => g.id === "Recipe");
    assert.equal(group?.default, "standard", "the Recipe group default is the standard (the operator's directive)");

    // DRAFT: the low-res iteration tier (operator: low resolution is
    // good for the draft recipe) — the same bag, draft geometry.
    const draft = recipes.find((r) => r.id === "draft")!;
    assert.ok(draft, "the draft row serves");
    assert.deepEqual((draft.wire_defaults as Record<string, unknown>)?.["loras"], [{ id: "h3_dmad_4step" }], "draft rides the same ByteDance bag");
    assert.equal((draft.wire_defaults as Record<string, unknown>)?.["width"], 768, "draft geometry: low-res");
    assert.equal((draft.wire_defaults as Record<string, unknown>)?.["height"], 448, "draft geometry: low-res");
    assert.ok(!("steps" in (draft.wire_defaults ?? {})), "draft steps UNSTATED — the marriage law");

    // FINAL CUT: the finishing tier — the rail switches, geometry
    // stays the carrier floor, sr_resolution keeps its own 1080.
    const final = recipes.find((r) => r.id === "final")!;
    assert.ok(final, "the final row serves");
    const fw = final.wire_defaults as Record<string, unknown>;
    assert.deepEqual(fw?.["loras"], [{ id: "h3_dmad_4step" }], "final rides the same ByteDance bag");
    assert.equal(fw?.["second_pass_enabled"], true, "the second-pass master switch rides");
    assert.equal(fw?.["sr_switch"], true, "the SeedVR2 super-res switch rides");
    assert.ok(!("sr_resolution" in fw), "sr_resolution UNSTATED — the knob's own 1080 floor owns it");
    assert.ok(!("width" in fw) && !("height" in fw), "final stamps no geometry — the carrier floor owns it");
  });

  it("the default bag's file is a LANE INPUT — a run without it refuses through the gate with the fetch hint", () => {
    const li = (DECL.lane_inputs ?? {}) as Record<string, string>;
    assert.equal(
      li["loras"],
      "dmad_minimax_h3_4step_lora_critic_comfyui.safetensors",
      "the ByteDance default lora is the family's declared loras lane file",
    );
    const prov = (DECL.provisions ?? []).find((p) => p.name === li["loras"]);
    assert.ok(prov, "the lane file has a provision row — the gate's fetch hint resolves");
    assert.equal(prov?.folder, "loras/h3", "the provision folder is the gate's last-probed leg");
  });
});

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors", "64f57f77ed85df04f7c0989ab84a5c3c110fb43a40dbc9badfe8ab2d5baafbca", "https://huggingface.co/smhfacct/Minimax-H3-fl2va-ref2va-hybrid-models/resolve/main/minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors", 20970379632],
  ["minimax_h3_hybrid_fl2va_ref2va_b25-49-int8.safetensors", "a629cfea8d89a071b140c6e1935dc9a23e72de6badc18975a2bb9e6d1423d76d", "https://huggingface.co/smhfacct/Minimax-H3-fl2va-ref2va-hybrid-models/resolve/main/minimax_h3_hybrid_fl2va_ref2va_b25-49-int8.safetensors", 20970379632],
  ["minimax_h3_fl2va_pruned_int8_convrot.safetensors", "e889202c41dafb67b10d67b97f0d8541508036a6090af23425a5c2615d03c47a", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors", 20970379616],
  ["minimax_h3_ref2va_pruned_int8_convrot.safetensors", "9255f52b6677845ad238f20dfaafa94727053694127ab7f255c048f0f9365779", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors", 20970379616],
  ["qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors", "35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors", 15687142551],
  ["minimax_h3_video_vae_fp16.safetensors", "7c1f131492e7eddacaac9069a61b81bdd39de5cc96561e677c5eab1cdce5e522", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_fp16.safetensors", 5207808496],
  ["minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors", "ffc5386a1b97aa1bc112b56378f37ef3c1cc69d55d5282281e8c6c728811e710", "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors", 867067150],
  ["minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors", "e14c9e78834f5fac9195cb022baf2bc83372140da5142a8c999a1f568cb4915d", "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/experimental/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors", 2116726792],
  ["minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors", "c396a9a06f58399e9df9754b18299818d84a2ddd371724ba48fe4a41221437dc", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors", 1956192992],
  ["minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors", "2339acdf19bfe123f46b971ea35d367a84adb85de43627e1eceafa5a5b2b111e", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors", 1956193000],
  ["minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors", "5b9ab5ade15d0775676d01a907268a69a1468dc6033b3b0d3ded5502f3ebb84c", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors", 1956193000],
  ["MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors", "e97b813a6f857b9dab310f31ec30a8334f63a3e7dcb5d07c0c91933d3447a897", "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors", 1725921392],
  ["MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors", "6f18e1c2eccb14b37322607730f26b16bf1169b56cd098ea006cffaec43d1e39", "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors", 1725921392],
  ["minimax_h3_turbo_v4_step600_ema.safetensors", "5f3a626cd72c93a8b9318d6760c510bc5092d2ab13aaba1f932c5bab07a416d3", "https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora/resolve/main/minimax_h3_turbo_v4_step600_ema.safetensors", 779849816],
  ["H3-PK-Parasyte-Turbo.safetensors", "dbf74bfb490b9322bd455edff95ce222b3553bb3472e4743134755db1edfe044", "https://huggingface.co/Plaguekind/H3-Lora/resolve/main/H3-PK-Parasyte-Turbo.safetensors", 2115774558],
  ["dmad_minimax_h3_4step_lora_critic_comfyui.safetensors", "a4f54d9eb4eed9102be1adea8376e8e933cc2805f4017b95c14586290395b3a7", "https://huggingface.co/ZhengmingYu/DMAD/resolve/main/minimax_h3/dmad_minimax_h3_4step_lora_critic_comfyui.safetensors", 1956195960],
  ["minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors", "de9663d974a884b477556748239c6f28239f7ca1825be270f98f023ff5dab6a7", "https://huggingface.co/Kijai/MiniMax-H3_comfy/resolve/main/loras/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors", 181697688],
  ["h3_silu_temb_grid.safetensors", "30eb3c2cc7fb6b470d9717ff840d359313ac27cd64b705e32da1baa10f72d6a8", "https://huggingface.co/deAPI-ai/minimax-h3-33b-int8/resolve/main/loras/h3_silu_temb_grid.safetensors", 5510600],
  ["minimax_h3_latent_upscaler_3d_bf16.safetensors", "4f57821f5837f32f7142b67d815606dbd7550f194e5c769f7d6c3f83b146a5e6", "https://huggingface.co/LBH-123-AI/Minimax_h3_latent_Upscaler/resolve/main/minimax_h3_latent_upscaler_3d_conv_v1/minimax_h3_latent_upscaler_3d_conv_v1_bf16.safetensors", 690592992],
  ["film_net_fp16.safetensors", "f226e51375dc839d4b40e5c3d63da560dd1ea1c962364ec78f5adf2d05db05c0", "https://huggingface.co/Comfy-Org/frame_interpolation/resolve/main/frame_interpolation/film_net_fp16.safetensors", 68882302],
  ["qwen3vl_32b_minimax_h3_int8_convrot.safetensors", "bc2ced0fbea64757fa9acddccfc0b3f4819d1dcf1da6c124d690d368be283923", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors", 27141342152],
  ["minimax_h3_video_vae_int8_convrot.safetensors", "52a2c8c73583c86e4f41cdcce3a6ad0ea562987bc0bf3d60a0cef5f5c8e60c0e", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_int8_convrot.safetensors", 2811065184],
  ["minimax_h3_audio_vae_fp32.safetensors", "8e505d95dd1561d47abd43d4238fd40d9bb1ae9e147ed0a4cba778d76ae4db48", "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_audio_vae_fp32.safetensors", 605254808],
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
