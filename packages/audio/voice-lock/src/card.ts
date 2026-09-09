// Tier 3 — the voice-lock card (the voicelock_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { voicelockT1 } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

export const schema = z.object({
  voice_name: z.string().description("Voice Name").extra('extra', { order: 0, group: "voice", width: 1, tooltip: "Name for the locked persona — becomes the .qvoice filename stem. Reused across every future TTS render.", required: true }),
  style_instruction: z.string().description("Style Instruction").extra('extra', { order: 1, group: "voice", columns: 1, tooltip: "The voice description — becomes the VoiceDesign prompt (e.g. 'A warm female voice with a British accent').", required: true, wtype: 'textarea', }),
  temperature: z.number().description("Temperature").min(0).max(2).step(0.05).default(0.7).extra('extra', { order: 0, group: "sampling", width: 1 }),
  top_p: z.number().description("Top-P").min(0).max(1).step(0.01).default(0.9).extra('extra', { order: 1, group: "sampling", width: 1 }),
  speed: z.number().description("Speed").min(0.5).max(2).step(0.1).default(1).extra('extra', { order: 2, group: "sampling", width: 1 }),
  repetition_penalty: z.number().description("Repetition Penalty").min(0.8).max(2).step(0.01).default(1.05).extra('extra', { order: 3, group: "sampling", width: 1 }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: 0, group: "seed", width: 1 }),
})

export const BOARDED: string[] = ['qwen3-tts-voicedesign']

/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
  label: 'Voice Lock',
  description: 'Lock a voice persona — design, export, and reuse .qvoice embeddings for consistent character voices',
}

export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
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
  }))
}
