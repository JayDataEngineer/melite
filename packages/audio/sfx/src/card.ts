// Tier 3 — the sfx card (the sfx_t1 renderer port).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { sfxT1 } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

const schema = z.object({
  prompt: z.string().description("Sound Description").extra('extra', { order: null, tooltip: "Describe the SOUND itself, not the scene (e.g. 'sharp metallic clang with long decay')", required: true, wtype: 'textarea', }),
  guidance_scale: z.number().description("CFG").min(0).max(20).step(0.1).default(5).extra('extra', { order: null, tooltip: "Diffusion classifier-free guidance" }),
  n_diffusion_steps: z.number().description("Diffusion Steps").min(1).max(500).step(1).default(50).extra('extra', { order: null, tooltip: "More = higher quality, slower", wtype: 'slider' }),
  duration: z.number().description("Duration (s)").min(0.5).max(300).step(0.5).default(10).extra('extra', { order: null, tooltip: "Output length in seconds" }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: null }),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'sfx',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'sfx',
    boarded: ['moss-sfx'],
    tags: ['audio', 'sfx', 'generate'],
    // renders through the authored Audiocore pack; SaveAudio is core.
    requires: ['melite-audio-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!(p.prompt as string)?.trim()) {
        throw new Error("required param 'prompt' missing or empty on the sfx card (describe the SOUND, not the scene)")
      }
      sfxT1(p, model, g, runId)
    },
  }))
}
