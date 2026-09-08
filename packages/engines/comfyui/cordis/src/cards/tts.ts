// Tier 3 — the tts card (the tts_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ttsT1 } from '../kit.ts'

const schema = z.object({
  text: z.string(),
  // py card.py truth (card-decls.json): voice rides 'ryan', temperature
  // 0.7, seed -1; style_instruction/qvoice/voice_pca are ABSENT/defaultless
  // (bare = optional at parse, ''-absent at compose via ?? '' below).
  // NO speed/top_p (py declares no such knobs — they ride the
  // AUDIACORE_TTS_AUTOFILL pin; old drafts naming them still parse via
  // the door's non-strict overlay but compose never reads them).
  voice: z.string().default('ryan'),
  style_instruction: z.string(),
  qvoice: z.string(),
  voice_pca_strengths: z.string(),
  temperature: z.number().default(0.7),
  seed: z.number().default(-1),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'tts',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'tts',
    // both Qwen3-TTS families board here (CustomVoice + Base); the
    // VoiceDesign lane belongs to voice-lock.
    boarded: ['qwen3-tts', 'qwen3-tts-base'],
    // Load + TTS ride the authored Audiocore pack; SaveAudio is core.
    requires: ['melite-audio-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!(p.text as string)?.trim()) {
        throw new Error("required param 'text' missing or empty on the tts card (the words to speak)")
      }
      ttsT1(p, model, g, runId)
    },
  })
}
