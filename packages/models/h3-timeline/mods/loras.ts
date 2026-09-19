// @melite/models-h3-timeline/mods/loras.ts — THE H3 FAMILY'S LORAS
// FLAVOR (the mod plane, the operator's law 2026-09-12: "MOD SYSTEM
// IS CORE. NEVER HARDCODED. The LORAS should not be on cards, the
// MOD SYSTEM SHOULD"). THE CATALOG (operator, 2026-09-20: "LORAs
// should be more up to the users end — add multiple loras and let
// the user choose"): seven distill/accel adapters, USER-PICKED —
// the studio's Modifiers section serves these rows as options, the
// bag takes multiple entries, and NO row is a preset (no recipe
// stamps them; the default stack stays the plaguekind solo turbo).
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
import type { Context } from '@deepseek-ai/cordis'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

export const inject = ['comfyui']

export const H3_LORA_ROWS = [
  { id: 'h3_lightx2v_dareties', filename: 'h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors', source_url: 'https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors', label: 'LightX2V dareties v4', category: 'distill', default_strength: 0.4, steps: 4 },
  { id: 'h3_lightx2v_turbo', filename: 'h3/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors', source_url: 'https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/experimental/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors', label: 'LightX2V Turbo 4-8 step', category: 'distill', default_strength: 0.6, steps: 8, steps_min: 4, steps_max: 8 },
  { id: 'h3_turbo4_v1', filename: 'h3/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors', source_url: 'https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors', label: 'LightX2V Turbo 4-Step v1.0 (768p)', category: 'distill', default_strength: 1, steps: 4 },
  { id: 'h3_turbo8_v1', filename: 'h3/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors', source_url: 'https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors', label: 'LightX2V Turbo 8-Step v1.0', category: 'distill', default_strength: 1, steps: 8 },
  { id: 'h3_ref2v_turbo4', filename: 'h3/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors', source_url: 'https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors', label: 'LightX2V Ref Turbo 4-Step v0.1', category: 'distill', default_strength: 1, steps: 4 },
  { id: 'h3_acc8_fl2va', filename: 'h3/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors', source_url: 'https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors', label: 'Kijai FL2VA Acc 8-Step', category: 'distill', default_strength: 1, steps: 8 },
  { id: 'h3_acc8_ref2va', filename: 'h3/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors', source_url: 'https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors', label: 'Kijai Ref2VA Acc 8-Step', category: 'distill', default_strength: 1, steps: 8 },
  // ── THE ARENA ROWS (2026-09-20, the H3 Acceleration Arena's
  // 15k-vote leaderboard + the authors' own READMEs): larryvrh's
  // v4-600 EMA is the crowd's #1 (1112 Elo at 6 steps; his README:
  // "use 6–8 steps, strength 1.0 — where v4 looks its best");
  // Plaguekind's Parasyte is #2 (1103) — his OWN mutation of
  // dareties to "remove turbo behavior", README rec 1.5 str / 8
  // steps / 12-3 shift / er_sde beta57 (the strength contract
  // allows 0–2 — 1.5 is the designed point, not a typo). ──
  { id: 'h3_larryvrh_v4_ema', filename: 'h3/minimax_h3_turbo_v4_step600_ema.safetensors', source_url: 'https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora/resolve/main/minimax_h3_turbo_v4_step600_ema.safetensors', label: 'Larryvrh Turbo v4-600 EMA', category: 'distill', default_strength: 1, steps: 6, steps_min: 4, steps_max: 8 },
  { id: 'h3_pk_parasyte', filename: 'h3/H3-PK-Parasyte-Turbo.safetensors', source_url: 'https://huggingface.co/Plaguekind/H3-Lora/resolve/main/H3-PK-Parasyte-Turbo.safetensors', label: 'PK Parasyte Turbo', category: 'distill', default_strength: 1.5, steps: 8, steps_min: 6, steps_max: 8 },
  // ── THE REFINER (the second-pass instrument — see the refiner
  // design in the ledger): solo it is retired-tier (arena 935),
  // but 3 steps @ 0.7 over a non-accelerated draft "closes" the
  // generation without smearing (the TaoMate refiner recipe). ──
  { id: 'h3_taomate_3step', filename: 'h3/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors', source_url: 'https://huggingface.co/Kijai/MiniMax-H3_comfy/resolve/main/loras/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors', label: 'TaoMate 3-Step (refiner)', category: 'distill', default_strength: 0.7, steps: 3 },
] as const

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['h3-timeline'],
    rows: H3_LORA_ROWS,
  }))
}
