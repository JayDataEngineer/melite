// Tier 3 — the music card (the music_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
// Instrumental = lyrics "" (MiniMax's own convention — baked, never
// an absent ref). Stock-only: the MiniMax nodes ride upstream core;
// no extension to declare (python card.py carries no requires).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { musicT1 } from '../kit.ts'

const schema = z.object({
  prompt: z.string(),
  lyrics: z.string(),
  duration: z.number().default(30.0),
  guidance_scale: z.number().default(1.7),
  n_diffusion_steps: z.number().default(30),
  lm_cfg_scale: z.number().default(1.7),
  seed: z.number().default(-1),
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
