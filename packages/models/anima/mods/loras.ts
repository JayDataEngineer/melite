import type {} from '@melite/comfyui-card-kit/service-faces'
// families/image/anima/mods/loras.ts — the loras flavor seed for
// the anima lane: no first-party rows — user-provided files ride
// the same bag the pack registers. Boarding gated ≡ DECL.mods =
// [...'loras'...] at boot (declared — the pack lands with it);
// rows land the day a first-party adapter exists.
import type { Context } from '@melite/comfyui-card-kit/card-definition'


export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['anima'],
    rows: [],
  }))
}
