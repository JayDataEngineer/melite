// @melite/melite-models-krea-2/mods/loras.ts — KREA-2'S LORAS FLAVOR
// (the py models/image/krea-2/mods/loras.py, 1:1): the Raw-variant
// training set, applied on Turbo. FAMILY-OWNED DATA — the rows
// live with the family (never in the pack contract, never in the
// family DECL); the pack contract (engines/comfyui src/mods/
// packs.ts) supplies the inherited fields. Registered as an effect
// on the cards boot's fiber: dispose retracts the flavor, the
// family's surface loses the mutation (revertible; the model
// declares the boarding via DECL.mods = ['loras'], boot-gated ≡
// this file's families — the paper's satisfaction law).
//
// Every row carries its upstream source_url — no link, no row.
// Style loras + the Turbo step-reducer ride the official
// Comfy-Org/Krea-2 mirror (same repo the family's checkpoints
// pull from); realism and filterbypass3 are the community
// originals. Files land in COMFYUI loras/<filename>.
import type { Context } from '@deepseek-ai/cordis'
// the ctx.comfyui augmentation rides the service module:
import type { ComfyUIService } from '@melite/comfyui/service'

export const inject = ['comfyui']

const ORG = 'https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras'

export const KREA_ROWS = [
  { id: 'krea2_realism_lora', filename: 'krea-2/krea2_realism_lora.safetensors', source_url: 'https://huggingface.co/gokaygokay/Krea-2-Realism-LoRA/resolve/main/krea2_realism_lora.safetensors', label: 'Realism', category: 'photorealism', default_strength: 0.7 },
  { id: 'krea2_turbo_lora_rank_64_bf16', filename: 'krea-2/krea2_turbo_lora_rank_64_bf16.safetensors', source_url: `${ORG}/krea2_turbo_lora_rank_64_bf16.safetensors`, label: 'Turbo Rank-64 (BF16)', category: 'quality', default_strength: 1.0 },
  { id: 'krea2_darkbrush', filename: 'krea-2/krea2_darkbrush.safetensors', source_url: `${ORG}/krea2_darkbrush.safetensors`, label: 'Dark Brush', category: 'style', default_strength: 0.8 },
  { id: 'krea2_dotmatrix', filename: 'krea-2/krea2_dotmatrix.safetensors', source_url: `${ORG}/krea2_dotmatrix.safetensors`, label: 'Dot Matrix', category: 'style', default_strength: 0.8 },
  { id: 'krea2_kidsdrawing', filename: 'krea-2/krea2_kidsdrawing.safetensors', source_url: `${ORG}/krea2_kidsdrawing.safetensors`, label: 'Kids Drawing', category: 'style', default_strength: 0.8 },
  { id: 'krea2_neondrip', filename: 'krea-2/krea2_neondrip.safetensors', source_url: `${ORG}/krea2_neondrip.safetensors`, label: 'Neon Drip', category: 'style', default_strength: 0.8 },
  { id: 'krea2_rainywindow', filename: 'krea-2/krea2_rainywindow.safetensors', source_url: `${ORG}/krea2_rainywindow.safetensors`, label: 'Rainy Window', category: 'style', default_strength: 0.8 },
  { id: 'krea2_retroanime', filename: 'krea-2/krea2_retroanime.safetensors', source_url: `${ORG}/krea2_retroanime.safetensors`, label: 'Retro Anime', category: 'style', default_strength: 0.8 },
  { id: 'krea2_softwatercolor', filename: 'krea-2/krea2_softwatercolor.safetensors', source_url: `${ORG}/krea2_softwatercolor.safetensors`, label: 'Soft Watercolor', category: 'style', default_strength: 0.8 },
  { id: 'krea2_sunsetblur', filename: 'krea-2/krea2_sunsetblur.safetensors', source_url: `${ORG}/krea2_sunsetblur.safetensors`, label: 'Sunset Blur', category: 'style', default_strength: 0.8 },
  { id: 'krea2_vintagetarot', filename: 'krea-2/krea2_vintagetarot.safetensors', source_url: `${ORG}/krea2_vintagetarot.safetensors`, label: 'Vintage Tarot', category: 'style', default_strength: 0.8 },
  { id: 'krea2filterbypass3', filename: 'krea-2/krea2filterbypass3.safetensors', source_url: 'https://huggingface.co/uzumix/krea2filterbypass3.safetensors/resolve/main/krea2filterbypass3.safetensors', label: 'Filter Bypass 3', category: 'style', default_strength: 0.8 },
]

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['krea-2'],
    rows: KREA_ROWS,
  }))
}
