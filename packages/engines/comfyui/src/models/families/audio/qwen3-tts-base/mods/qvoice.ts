// families/audio/qwen3-tts-base/mods/qvoice.ts — qwen3-tts-base'SS QVOICE BOARDING (a
// bare flavor: the same pack fields on both tts families — the
// same-pack merge law; shapes live on the contract, one shape).
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'qvoice',
    families: ['qwen3-tts-base'],
  }))
}
