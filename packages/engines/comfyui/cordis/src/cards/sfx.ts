// Tier 3 — the sfx card (the sfx_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { sfxT1 } from '../kit.ts'

const schema = z.object({
  prompt: z.string().description(
    "Describe the SOUND itself, not the scene (e.g. 'sharp metallic clang with long decay')"),
  guidance_scale: z.number().min(0).max(20).default(5.0).description(
    'Diffusion classifier-free guidance'),
  n_diffusion_steps: z.number().min(1).max(500).default(50).description(
    'More = higher quality, slower'),
  duration: z.number().min(0.5).max(300).default(10.0).description(
    'Output length in seconds'),
  seed: z.number().min(-1).step(1).default(-1).description('Seed'),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'sfx',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'sfx',
    boarded: ['moss-sfx'],
    // renders through the authored Audiocore pack; SaveAudio is core.
    requires: ['melite-audio-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!(p.prompt as string)?.trim()) {
        throw new Error("required param 'prompt' missing or empty on the sfx card (describe the SOUND, not the scene)")
      }
      sfxT1(p, model, g, runId)
    },
  })
}
