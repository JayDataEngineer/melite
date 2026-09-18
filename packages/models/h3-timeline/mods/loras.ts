// @melite/models-h3-timeline/mods/loras.ts — THE H3 FAMILY'S LORAS
// FLAVOR (the mod plane, the operator's law 2026-09-12: "MOD SYSTEM
// IS CORE. NEVER HARDCODED. The LORAS should not be on cards, the
// MOD SYSTEM SHOULD"). The two distill adapters the frozen goldens
// stack via LTX_lora_loader.stack_data (LORA_STACK_GOLD — the
// dareties v4 distill at 0.4 + the turbo 4-to-8-step at 0.6; the
// goldens' own rows carry str 0.4/0.6 and v/a/t 1). FAMILY-OWNED
// DATA: the rows live with the family; the pack contract
// (engines/comfyui-cordis/src/mods/packs.ts) supplies the inherited
// fields; DECL.mods = ['loras'] boards the pack (boot-gated ≡ this
// file, the satisfaction law). Registered as an effect on the boot
// fiber: dispose retracts the flavor.
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
] as const

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['h3-timeline'],
    rows: H3_LORA_ROWS,
  }))
}
