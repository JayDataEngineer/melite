// families/image/qwen-img-edit-21/mods/mask.ts — QWEN 2.1'S MASK
// BOARDING (attached 2026-09-22, the operator's lane call: "2511 is
// the legacy model… 2.1 is the new Qwen edit model"): bare flavor —
// fields inherited from the mask pack contract. On this lane the
// region rides crop_stitch (the generic region detailer); auto+mask
// still refuses field-named (the lanpaint sampler is 2511's flavor —
// the gate's voice teaches crop_stitch).
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@melite/comfyui-cordis/service'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'mask',
    families: ['qwen-img-edit-21'],
  }))
}
