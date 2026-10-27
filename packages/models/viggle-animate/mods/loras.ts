// @melite/models-viggle-animate/mods/loras.ts — THE VIGGLE-ANIMATE
// FAMILY'S LORAS FLAVOR (the mod plane, the operator's law
// 2026-09-12: "MOD SYSTEM IS CORE. NEVER HARDCODED."). Two rows:
//
// - THE DMD ACCELERATOR (viggle_animate_dmd_lora_r64): the upstream
//   sampling baseline REQUIRES it — the Viggle checkpoint rides the
//   DMD2 distill through this adapter at strength 1.0 with the
//   four-point ManualSigmas schedule (three Euler updates). It is
//   the default bag row (the DECL's standard recipe stamps it, the
//   absent-bag compose default resolves it) and the lane gate
//   refuses a run without the file, with the fetch hint — the web
//   popup's install button and the agent seat both key on that one
//   refusal.
// - THE CHARACTER-SWAP ADAPTER (h3_character_swap_v1.5, akatz): the
//   identity-drift cure — arm it when the swapped subject loses
//   likeness over long drives. Pick-only, never a default.
//
// STEPS MARRIAGE: the DMD row owns its designed step count 3 (three
// Euler updates = four sigma points, the upstream "4 steps"); a
// stated steps on the entry never loses (the marriage law: the doc
// wins). LICENCE: both adapters inherit the MiniMax H3 Community
// License through their base weights (drbaph's repo frontmatter
// names license_name minimax-h3-community-license; the akatz repo
// ships the same class) — worldwide use excluding EU/UK/KR/US.
//
// FAMILY-OWNED DATA: the rows live with the family; the pack
// contract (engines/comfyui-cordis/src/mods/packs.ts) supplies the
// inherited fields; DECL.mods boards the pack (boot-gated ≡ this
// file, the satisfaction law). Registered as an effect on the boot
// fiber: dispose retracts the flavor.
import type { Context } from '@melite/comfyui-card-kit/card-definition'
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'

export const inject = ['comfyui']

/** One catalog row's shape — the married steps column is OPTIONAL
 *  by law (a row without it declares no step opinion; the schema's
 *  declared default owns). */
export interface ViggleLoraRow {
  readonly id: string
  readonly filename: string
  readonly source_url: string
  readonly label: string
  readonly category: string
  readonly default_strength: number
  readonly steps?: number
  readonly steps_min?: number
  readonly steps_max?: number
}

export const VIGGLE_LORA_ROWS: readonly ViggleLoraRow[] = [
  {
    id: 'viggle_dmd_r64',
    filename: 'h3/viggle_animate_dmd_lora_r64.safetensors',
    source_url: 'https://huggingface.co/drbaph/Viggle-Animate-ComfyUI/resolve/main/loras/viggle_animate_dmd_lora_r64.safetensors',
    label: 'Viggle DMD Accelerator (r64)',
    category: 'distill',
    default_strength: 1,
    steps: 3,
    steps_min: 2,
    steps_max: 4,
  },
  {
    id: 'viggle_char_swap_v15',
    filename: 'h3/h3_character_swap_v1.5.safetensors',
    source_url: 'https://huggingface.co/akatz-ai/MiniMax-H3-Character-Swap-LoRA/resolve/main/h3_character_swap_v1.5.safetensors',
    label: 'Character Swap v1.5 (akatz)',
    category: 'identity',
    default_strength: 1,
  },
] as const

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['viggle-animate'],
    rows: VIGGLE_LORA_ROWS,
  }))
}
