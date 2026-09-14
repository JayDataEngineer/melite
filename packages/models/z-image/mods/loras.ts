// @melite/models-z-image/mods/loras.ts — Z-IMAGE'S LORAS FLAVOR
// (the py models/image/z-image/mods/loras/mod.yaml, 1:1): the seven
// Turbo style/utility adapters found on disk. FAMILY-OWNED DATA —
// the rows live with the family (never in the pack contract, never
// in the family DECL); the pack contract
// (engines/comfyui-cordis/src/mods/packs.ts) supplies the inherited
// fields. Registered as an effect on the cards boot's fiber:
// dispose retracts the flavor, the family's surface loses the
// mutation (revertible; the model declares the boarding via
// DECL.mods = ['loras'], boot-gated ≡ this file's families — the
// paper's satisfaction law).
//
// Every row carries its upstream source_url — no link, no row.
// Files land in COMFYUI loras/<filename>.
import type { Context } from '@deepseek-ai/cordis'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

export const inject = ['comfyui']

export const ZIMAGE_ROWS = [
  { id: 'zimage_3d_mmorpg', filename: 'z-image/z-image-3d-mmorpg.safetensors', source_url: 'https://huggingface.co/DK9/3D_MMORPG_style_z-image-turbo_lora/resolve/main/lostark_v1.safetensors', label: '3D MMORPG', category: 'style', default_strength: 0.8 },
  { id: 'zimage_classic_painting', filename: 'z-image/z-image-classic-painting.safetensors', source_url: 'https://huggingface.co/renderartist/Classic-Painting-Z-Image-Turbo-LoRA/resolve/main/Classic_Painting_Z_Image_Turbo_v1_renderartist_1750.safetensors', label: 'Classic Painting', category: 'style', default_strength: 0.8 },
  { id: 'zimage_coloring_book', filename: 'z-image/z-image-coloring-book.safetensors', source_url: 'https://huggingface.co/renderartist/Coloring-Book-Z-Image-Turbo-LoRA/resolve/main/Coloring_Book_Z_Image_Turbo_v1_renderartist_2000.safetensors', label: 'Coloring Book', category: 'style', default_strength: 0.8 },
  { id: 'zimage_dejpeg', filename: 'z-image/z-image-dejpeg.safetensors', source_url: 'https://huggingface.co/wcde/Z-Image-Turbo-DeJPEG-Lora/resolve/main/dejpeg_v3.safetensors', label: 'DeJPEG', category: 'restoration', default_strength: 1.0 },
  { id: 'zimage_pixel_art', filename: 'z-image/z-image-pixel-art.safetensors', source_url: 'https://huggingface.co/tarn59/pixel_art_style_lora_z_image_turbo/resolve/main/pixel_art_style_z_image_turbo.safetensors', label: 'Pixel Art', category: 'style', default_strength: 0.8 },
  { id: 'zimage_realism', filename: 'z-image/z-image-realism.safetensors', source_url: 'https://huggingface.co/suayptalha/Z-Image-Turbo-Realism-LoRA/resolve/main/pytorch_lora_weights.safetensors', label: 'Realism', category: 'photorealism', default_strength: 0.7 },
  { id: 'zimage_sunbleached', filename: 'z-image/z-image-sunbleached.safetensors', source_url: 'https://huggingface.co/Quorlen/z_image_turbo_Sunbleached_Protograph_Style_Lora/resolve/main/zimageturbo_Sunbleach_Photograph_Style_Lora_TAV2_000002750.safetensors', label: 'Sunbleached', category: 'style', default_strength: 0.8 },
]

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['z-image'],
    rows: ZIMAGE_ROWS,
  }))
}
