// families/image/qwen-img-edit-2511/mods/loras.ts — QWEN'S LORAS
// FLAVOR: the RUNTIME CATALOG door (the py qwen loras.py). No own
// rows — the union of every family's declared rows serves (family
// rows always win; modRows implements the union law). Fields
// inherited from the loras pack contract; boarding gated ≡
// DECL.mods = [... 'loras' ...] at boot.
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['qwen-img-edit-2511'],
    rows: [],
    runtimeCatalog: true,
  }))
}
