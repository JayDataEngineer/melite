// Tier 3 — the tts card (the tts_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ttsT1 } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'

export const schema = z.object({
  text: z.string().description("Text").extra('extra', { order: null, placeholder: "The words to speak", tooltip: "The text to synthesize", required: true, wtype: 'textarea', }),
  // ported voice surface (purge S-decls: the py card is deleted —
  // 0.7, seed -1; style_instruction/qvoice/voice_pca are ABSENT/defaultless
  // (bare = optional at parse, ''-absent at compose via ?? '' below).
  // NO speed/top_p (py declares no such knobs — they ride the
  // AUDIACORE_TTS_AUTOFILL pin; old drafts naming them still parse via
  // the door's non-strict overlay but compose never reads them).
  voice: vocabulary(["ryan", "serena", "vivian", "aiden", "eric", "dylan", "sohee", "ono_anna", "uncle_fu"]).description("Voice").default("ryan").extra('extra', { order: null, tooltip: "Preset speaker persona (CustomVoice) or .qvoice embedding path", wtype: 'select' }),
  style_instruction: z.string().description("Style Instruction").extra('extra', { order: null, tooltip: "Emotion and delivery control (e.g. 'speak with warm confidence')", wtype: 'textarea' }),
  temperature: z.number().description("Temperature").min(0).max(2).step(0.05).default(0.7).extra('extra', { order: null }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: null }),
})

export const BOARDED: string[] = ['qwen3-tts']

/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
  label: 'TTS',
  description: 'Text-to-speech — Qwen3-TTS with CustomVoice personas and instruct-text emotion control',
}

export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'tts',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'tts',
    // both Qwen3-TTS families board here (CustomVoice + Base); the
    // VoiceDesign lane belongs to voice-lock.
    boarded: ['qwen3-tts'],
    tags: ['audio', 'tts', 'voice', 'generate'],
    // Load + TTS ride the authored Audiocore pack; SaveAudio is core.
    requires: ['melite-audio-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!(p.text as string)?.trim()) {
        throw new Error("required param 'text' missing or empty on the tts card (the words to speak)")
      }
      ttsT1(p, model, g, runId)
    },
  }))
}
