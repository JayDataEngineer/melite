// families/audio/qwen3-tts/mods/qvoice.ts — qwen3-tts'SS QVOICE BOARDING (a
// bare flavor: owner-only — CustomVoice embeddings render through
// the qwen3-tts family; qwen3-tts-base scopes them OUT of its
// form-spec (the owner-scoping law: formSpec('tts', 'qwen3-tts-base')
// drops the absorbed qvoice fields, the owner keeps them). Shapes
// live on the contract, one shape).
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'qvoice',
    families: ['qwen3-tts'],
  }))
}
