// families/audio/qwen3-tts-voicedesign/mods/qvoice_save.ts — the
// 1.7B VoiceDesign family's SAVE boarding (a bare flavor:
// owner-only — voice design + .qvoice export renders through the
// qwen3-tts-voicedesign family; the 0.6B lanes scope it OUT of
// their form-specs. The voice-lock card's design half, moved into
// the TTS card's mods 2026-09-21).
import type { Context } from '@deepseek-ai/cordis'
// the Context merge (ctx.comfyui) lives in the service module —
// pulling the type seats the augmentation in this program
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerFlavor({
    pack: 'qvoice_save',
    families: ['qwen3-tts-voicedesign'],
  }))
}
