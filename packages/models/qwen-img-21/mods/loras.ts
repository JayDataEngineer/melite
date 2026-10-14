import type {} from '@melite/comfyui-card-kit/service-faces'
// families/image/qwen-img-21/mods/loras.ts — the loras flavor seed
// for the 2.1 lane (the 2511 shape): no first-party rows — the 2.1
// release ships no adapters; user-provided files ride the same bag
// the pack registers. Boarding gated ≡ DECL.mods = [...'loras'...]
// at boot — and this family does NOT declare it yet (absent ≡
// boards nothing, the z-image shape); the pack lands the day a
// first-party adapter exists.
import type { Context } from '@melite/comfyui-card-kit/card-definition'


export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['qwen-img-21'],
    rows: [],
  }))
}
