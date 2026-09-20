// families/image/qwen-img-edit-21/mods/loras.ts — the loras flavor
// seed for the 2.1 edit lane (the 2511 shape): no first-party rows —
// the 2.1 release ships no adapters; user-provided files ride the
// same bag the pack registers. Boarding gated ≡ DECL.mods =
// [...'loras'...] at boot — this family does NOT declare it yet
// (absent ≡ boards nothing, the z-image shape).
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@melite/comfyui-cordis/service'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'loras',
    families: ['qwen-img-edit-21'],
    rows: [],
  }))
}
