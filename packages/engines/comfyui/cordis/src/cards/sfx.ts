// Tier 3 — the sfx card (the sfx_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import { z } from '../atoms.ts'
import { sfxT1 } from '../kit.ts'

const schema = z.object({
  prompt: z.string(),
  guidance_scale: z.number().default(5.0),
  n_diffusion_steps: z.number().default(50),
  duration: z.number().default(10.0),
  seed: z.number().default(-1),
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
