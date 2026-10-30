// @melite/models-h3/mods/loras.ts — THE H3 FAMILY'S LORAS
// FLAVOR (the mod plane, the operator's law 2026-09-12: "MOD SYSTEM
// IS CORE. NEVER HARDCODED. The LORAS should not be on cards, the
// MOD SYSTEM SHOULD"). THE CATALOG (operator, 2026-09-20: "LORAs
// should be more up to the users end — add multiple loras and let
// the user choose"): eleven distill/accel adapters, USER-PICKED —
// the studio's Modifiers section serves these rows as options, the
// bag takes multiple entries. THE DEFAULT (operator 2026-10-11, "the
// one from bytedance" → 2026-11-07, "the card's default lora → the
// 8-step light tricks" → 2026-11-12, the merge takes the default
// seat): the h3_lightx2v_turbo row — the LightX2V turbo 4-to-8-step
// × dareties v4 step600 merge (strength 0.6, designed 4–8 steps) —
// is the one stamp: the absent-bag compose default resolves it and
// the card's ghost chip shows it. NO catalog row is labelled "Larry
// + LightX2V" (F34b: that prose claimed a merge row the catalog
// never held); every other row (the DMAD 4-step, the two standalone
// LightX2V turbos, the Larryvrh EMA included) stays pick-only.
// STRENGTH EVIDENCE: the three Comfy-Org lightx2v turbos load at
// 1.0 in Comfy-Org's own t2v/i2v/r2v templates (LoraLoaderModelOnly
// strength 1); the two Kijai Acc rows follow the estate's
// designed-at-full-strength convention (krea-2 turbo, z-image
// dejpeg). STEPS MARRIAGE: each row carries its designed step
// count — the service resolves a bag row's unstated steps from
// here and the windows honor it (a stacked pair runs at the higher
// count). FAMILY-OWNED DATA: the rows live with the family; the
// pack contract (engines/comfyui-cordis/src/mods/packs.ts) supplies
// the inherited fields; DECL.mods = ['loras'] boards the pack
// (boot-gated ≡ this file, the satisfaction law). Registered as an
// effect on the boot fiber: dispose retracts the flavor.
//
// Every row carries its upstream source_url — no link, no row (the
// provisions rows in src/index.ts are the provenance; the sha256s
// live there, one truth). Files land in COMFYUI loras/h3/<filename>.
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'

export const inject = ['comfyui']

/** One catalog row's shape — the married columns are OPTIONAL by
 * law (a row without shift_video declares no shift opinion; the
 * schema's declared default owns), and the compose-side marriage
 * reads both knobs through one dynamic key, so the table's row
 * type names them. */
export interface H3LoraRow {
  readonly id: string
  readonly filename: string
  readonly source_url: string
  readonly label: string
  readonly category: string
  readonly default_strength: number
  readonly steps: number
  readonly steps_min?: number
  readonly steps_max?: number
  readonly shift_video?: number
}

export const H3_LORA_ROWS: readonly H3LoraRow[] = [
  // ── THE MARRIED SHIFT COLUMN (SOTA limb 2, H3_TIMELINE_RESERACH
  // 2026-10-20): a distill's sigma-shift grid is part of its
  // training contract — the 8-step LightX2V variants and every
  // ref2v tune run shift_video 12.0, the 4-step fl2v tunes 6.0.
  // The column rides the SAME marriage law as steps (stated on the
  // entry first, else this default, max across the bag); a row with
  // NO column declares no shift opinion and the schema's declared
  // default 8 (native) owns. larryvrh v4 stays column-less BY
  // DESIGN: his README and the research table put him at
  // native/default. shift_audio is 3.0 across every source — the
  // schema's own declared default already speaks it (no column). ──
  { id: 'h3_lightx2v_dareties', filename: 'h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors', source_url: 'https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors', label: 'LightX2V dareties v4', category: 'distill', default_strength: 0.8, steps: 4, steps_min: 4, steps_max: 4, shift_video: 6 },
  { id: 'h3_lightx2v_turbo', filename: 'h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors', source_url: 'https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/experimental/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors', label: 'LightX2V Turbo 4-8 step', category: 'distill', default_strength: 0.6, steps: 8, steps_min: 4, steps_max: 8, shift_video: 12 },
  { id: 'h3_turbo4_v1', filename: 'h3/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors', source_url: 'https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors', label: 'LightX2V Turbo 4-Step v1.0 (768p)', category: 'distill', default_strength: 1, steps: 4, steps_min: 4, steps_max: 4, shift_video: 6 },
  { id: 'h3_turbo8_v1', filename: 'h3/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors', source_url: 'https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors', label: 'LightX2V Turbo 8-Step v1.0', category: 'distill', default_strength: 1, steps: 8, steps_min: 8, steps_max: 8, shift_video: 12 },
  { id: 'h3_ref2v_turbo4', filename: 'h3/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors', source_url: 'https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors', label: 'LightX2V Ref Turbo 4-Step v0.1', category: 'distill', default_strength: 1, steps: 4, steps_min: 4, steps_max: 4, shift_video: 12 },
  { id: 'h3_acc8_fl2va', filename: 'h3/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors', source_url: 'https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors', label: 'Kijai FL2VA Acc 8-Step', category: 'distill', default_strength: 1, steps: 8, steps_min: 8, steps_max: 8, shift_video: 12 },
  { id: 'h3_acc8_ref2va', filename: 'h3/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors', source_url: 'https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors', label: 'Kijai Ref2VA Acc 8-Step', category: 'distill', default_strength: 1, steps: 8, steps_min: 8, steps_max: 8, shift_video: 12 },
  // ── THE ARENA ROWS (2026-09-20, the H3 Acceleration Arena's
  // 15k-vote leaderboard + the authors' own READMEs): larryvrh's
  // v4-600 EMA is the crowd's #1 (1112 Elo at 6 steps; his README:
  // "use 6–8 steps, strength 1.0 — where v4 looks its best");
  // Plaguekind's Parasyte is #2 (1103) — his OWN mutation of
  // dareties to "remove turbo behavior", README rec 1.5 str / 8
  // steps / 12-3 shift / er_sde beta57 (the strength contract
  // allows 0–2 — 1.5 is the designed point, not a typo). ──
  { id: 'h3_larryvrh_v4_ema', filename: 'h3/minimax_h3_turbo_v4_step600_ema.safetensors', source_url: 'https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora/resolve/main/minimax_h3_turbo_v4_step600_ema.safetensors', label: 'Larryvrh Turbo v4-600 EMA', category: 'distill', default_strength: 1, steps: 6, steps_min: 4, steps_max: 8 },
  { id: 'h3_pk_parasyte', filename: 'h3/H3-PK-Parasyte-Turbo.safetensors', source_url: 'https://huggingface.co/Plaguekind/H3-Lora/resolve/main/H3-PK-Parasyte-Turbo.safetensors', label: 'PK Parasyte Turbo', category: 'distill', default_strength: 1.5, steps: 8, steps_min: 6, steps_max: 8, shift_video: 12 },
  // ── THE PAPER ROW (2026-10-18, audit 009/W2): DMAD — Distribution
  // Matching as Adversarial Distillation (Yu et al., ByteDance +
  // Texas A&M, arXiv:2610.02188). Rank-128 over the attn/ff modules
  // of all 50 transformer blocks + 2 token refiners; turns the
  // 50-step teacher into a 4-step generator at 1344x768 with native
  // stereo audio. The paper's EMA checkpoint (`lora_critic`,
  // iteration 800 of the main run) in ComfyUI's key layout, 2.0 GB;
  // the higher-bench `full_critic` twin stays unboarded until the
  // velocity arena rules (one row, one paper). LICENCE: the MiniMax
  // H3 community licence — the base weights' own class; the V1
  // region exclusion precedent applies. STRENGTH 1: distillation
  // adapters are designed at full strength (the lightx2v convention
  // above). The paper's no-CFG + shift 12/2 spelling matches what
  // the composed arms already pin (no cfg knob exists on this
  // card). The adaln guard rides the arena's first stacked load: a
  // dense LoRA silently drops 51 adaln_proj keys on a pruned base —
  // watch the load log (roadmap, H3 velocity rows). ──
  { id: 'h3_dmad_4step', filename: 'h3/dmad_minimax_h3_4step_lora_critic_comfyui.safetensors', source_url: 'https://huggingface.co/ZhengmingYu/DMAD/resolve/main/minimax_h3/dmad_minimax_h3_4step_lora_critic_comfyui.safetensors', label: 'DMAD 4-Step (ByteDance/TAMU)', category: 'distill', default_strength: 1, steps: 4, steps_min: 4, steps_max: 4, shift_video: 12 },
  // ── THE REFINER (the second-pass instrument — see the refiner
  // design in the ledger): solo it is retired-tier (arena 935),
  // but 3 steps @ 0.7 over a non-accelerated draft "closes" the
  // generation without smearing (the TaoMate refiner recipe). ──
  { id: 'h3_taomate_3step', filename: 'h3/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors', source_url: 'https://huggingface.co/Kijai/MiniMax-H3_comfy/resolve/main/loras/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors', label: 'TaoMate 3-Step (refiner)', category: 'distill', default_strength: 0.35, steps: 3, steps_min: 3, steps_max: 6, shift_video: 6 },
] as const

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['h3'],
    rows: H3_LORA_ROWS,
  }))
}
