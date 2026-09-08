// Tier 3 — the voice-lock card (the voicelock_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { voicelockT1 } from '../kit.ts'

const schema = z.object({
  voice_name: z.string().description(
    "Name for the locked persona — becomes the .qvoice filename stem. Reused across every future TTS render."),
  style_instruction: z.string().description(
    "The voice description — becomes the VoiceDesign prompt (e.g. 'A warm female voice with a British accent')."),
  temperature: z.number().min(0).max(2).default(0.7).description('Temperature'),
  top_p: z.number().min(0).max(1).default(0.9).description('Top-P'),
  speed: z.number().min(0.5).max(2).default(1.0).description('Speed'),
  repetition_penalty: z.number().min(0.8).max(2).default(1.05).description(
    'Repetition Penalty'),
  seed: z.number().min(-1).step(1).default(-1).description('Seed'),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'voice-lock',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'voicelock',
    boarded: ['qwen3-tts-voicedesign'],
    // the voice studio node rides the authored Audiocore pack;
    // SaveAudio is core.
    requires: ['melite-audio-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!(p.voice_name as string)?.trim()) {
        throw new Error("required param 'voice_name' missing or empty on the voice-lock card (the persona's filename stem)")
      }
      if (!(p.style_instruction as string)?.trim()) {
        throw new Error("required param 'style_instruction' missing or empty on the voice-lock card (the VoiceDesign prompt)")
      }
      voicelockT1(p, model, g, runId)
    },
  })
}
