// families/image/qwen-img-21/mods/mask.ts — QWEN 2.1 T2I'S MASK
// BOARDING (MASK-C, the image-gen region gap): bare flavor —
// fields inherited from the mask pack contract. The gen lane builds
// NO region arm (compose untouched): this boarding serves the
// region vocabulary on the gen card for the checkpoint that answers
// it (the same weights the mask-boarded edit lane details with),
// while a stated mask on a gen run refuses LOUD at admission —
// the refused-fate honesty, never a silent plain run.
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@melite/comfyui-cordis/service'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'mask',
    families: ['qwen-img-21'],
  }))
}
