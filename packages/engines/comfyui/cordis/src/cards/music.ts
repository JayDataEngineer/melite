// Tier 3 — the music card (the music_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
// Instrumental = lyrics "" (MiniMax's own convention — baked, never
// an absent ref). Stock-only: the MiniMax nodes ride upstream core;
// no extension to declare (python card.py carries no requires).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { musicT1 } from '../kit.ts'

const schema = z.object({
  prompt: z.string().description(
    "Structured caption: Genre + Vocal Details + Arrangement. E.g. 'funk, playful female vocal, groovy bassline'"),
  lyrics: z.string().description(
    'Lyrics with structure tags: [verse], [chorus], [bridge]. Empty = instrumental.'),
  duration: z.number().min(5).max(360).default(30.0).description(
    'Target audio length in seconds (5-360).'),
  guidance_scale: z.number().min(0.1).max(10).default(1.7).description(
    'Classifier-free guidance (KSampler cfg). 1.7 = lane default.'),
  n_diffusion_steps: z.number().min(1).max(200).default(30).description(
    'Flow-matching denoising steps. 30 = lane default. Never 0.'),
  lm_cfg_scale: z.number().min(0).max(10).default(1.7).description(
    'Lyric-encoder guidance (MiniMaxMusic3TextEncode cfg_scale). 1.7 = lane default.'),
  seed: z.number().min(-1).step(1).default(-1).description('Seed'),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'music',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'music',
    boarded: ['music3'],
    // stock-only card: the MiniMax nodes ride upstream core
    // (comfy_extras.nodes_minimax_music); no requires to declare.
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!p.prompt) {
        throw new Error("required param 'prompt' missing or empty on the music card (the music caption — what the song IS)")
      }
      musicT1(p, model, g, runId)
    },
  })
}
