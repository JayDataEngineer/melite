// mods/loras.ts — the loras pack (1:1 port of the estate py
// declarations: models/image/krea-2/mods/loras.py and
// models/image/qwen-img-edit-2511/mods/loras.py — the py died the
// stroke this truth landed, NO-ESTATE-PYTHON LAW).
//
// The Cordis contract shape (the dual-declaration pattern): the
// fields ARE a Schemastery object schema — the same z.object style
// the cards declare, UI meta (group/zone/wire type) riding
// .extra('extra', {...}) on each node. ONE meta path walks card
// and mod surfaces; same-pack flavor merging is Schema.intersect
// semantics (constraints merge per key — validated equal at
// registration).
//
// krea-2's flavor carries the 12 catalog rows (no link, no row;
// style + turbo ride the official Comfy-Org/Krea-2 mirror,
// realism and filterbypass3 the community originals). qwen's
// flavor is the RUNTIME CATALOG door: no own rows, the union of
// every family's rows serves (family rows always win).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export const inject = ['comfyui']

// the shared pack contract (the py LorasMod menu class)
const LorasFields = z.object({
  loras: z.array(z.object({ name: z.string(), strength: z.number() }))
    .description('LoRAs')
    .extra('extra', { wtype: 'loras', group: 'loras_controlnet', zone: 'mods', default: null, order: 0 }),
})

const ORG = 'https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras'

const KREA_ROWS = [
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
  ctx.effect(() => ctx.comfyui.registerMod({
    pack: 'loras',
    families: ['krea-2'],
    fields: LorasFields as never,
    rows: KREA_ROWS,
  }))
  // qwen's flavor: the RUNTIME CATALOG door — no own rows; the
  // union serves (modRows implements the union law).
  ctx.effect(() => ctx.comfyui.registerMod({
    pack: 'loras',
    families: ['qwen-img-edit-2511'],
    fields: LorasFields as never,
    rows: [],
    runtimeCatalog: true,
  }))
}
