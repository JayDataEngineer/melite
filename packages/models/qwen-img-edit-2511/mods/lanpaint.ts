// families/image/qwen-img-edit-2511/mods/lanpaint.ts — QWEN'S
// LAN-INPAINT BOARDING (a bare flavor: no rows, no runtime door —
// the fields inherit wholesale from the lanpaint pack contract;
// the py Model.mods = (LanPaintMod,) direct-parent boarding). The
// flavor's whole declaration (image1 REQUIRED, input zone) rides
// the pack contract — see its seam note.
import type { Context } from '@deepseek-ai/cordis'
// the Context merge (ctx.comfyui) lives in the service module —
// pulling the type seats the augmentation in this program
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'lanpaint',
    families: ['qwen-img-edit-2511'],
  }))
}
