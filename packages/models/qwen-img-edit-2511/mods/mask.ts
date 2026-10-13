// families/image/qwen-img-edit-2511/mods/mask.ts — QWEN'S MASK
// BOARDING (attached: beside lanpaint, the mask feeds the inpaint
// flow — the old lanpaint_mask slot WAS this mask). Bare flavor:
// fields inherited from the mask pack contract.
import type { Context } from '@deepseek-ai/cordis'
// the Context merge (ctx.comfyui) lives in the service module —
// pulling the type seats the augmentation in this program
import { ComfyUIServiceFace } from '@melite/comfyui-card-kit/service-faces'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'mask',
    families: ['qwen-img-edit-2511'],
  }))
}
