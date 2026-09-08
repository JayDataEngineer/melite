// Tier 3 — the motion card (the motion_t1 renderer port). Kimodo
// checkpoint lane + optional RaySomaxBake preview skin (melite-poser
// stopgap).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { motionLane, finalizeMotion } from '../kit.ts'

const schema = z.object({
  prompt: z.string(),
  motion_prompts: z.string(),
  motion_constraints: z.string(),
  seed: z.number().min(-1).default(42),
  duration_sec: z.number().default(5.0),
  diffusion_steps: z.number().default(25),
  num_samples: z.number().default(1),
  num_transition_frames: z.number().default(10),
  // the diffusion guidance vocabulary is CLOSED (python compose
  // voice: separated | regular | nocfg) — schemastery names a bad
  // value loudly instead of wiring it to the GPU silently.
  cfg_type: z.union([z.const('separated'), z.const('regular'), z.const('nocfg')]).default('separated'),
  cfg_weight_a: z.number().default(2.5),
  cfg_weight_b: z.number().default(5.0),
  motion_npz: z.string(),
  preview_glb: z.string(),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'motion',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'motion',
    boarded: ['kimodo'],
    requires: ['melite-kimodo-nodes', 'melite-poser-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g) {
      if (!p.prompt || !(p.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing on the motion card — the motion lane generates FROM a text prompt")
      }
      motionLane(p, model, g)
    },
    finalize: finalizeMotion,
  })
}
