// Tier 3 — the motion card (the motion_t1 renderer port). Kimodo
// checkpoint lane + optional RaySomaxBake preview skin (melite-poser
// stopgap).
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { motionLane, finalizeMotion } from '../kit.ts'

const schema = z.object({
  prompt: z.string().description(
    "What the body DOES — verb-first, one continuous action per segment. Multi-segment belongs in motion_prompts."),
  motion_prompts: z.string().description(
    "Segment prompts joined with | — one motion per segment, auto-chained into one clip."),
  motion_constraints: z.string().description(
    "Pin joints (e.g. left_foot:ground) — JSON or key:value lines, applied per segment."),
  seed: z.number().min(-1).step(1).default(42).description(
    'Same seed + prompt = same motion take.'),
  duration_sec: z.number().min(1).max(30).default(5.0).description(
    'Length of the generated motion segment.'),
  diffusion_steps: z.number().min(10).max(200).default(25).description(
    'More steps = smoother arcs; 25 is the calibrated default.'),
  num_samples: z.number().min(1).max(4).default(1).description(
    'Takes per prompt (each becomes its own NPZ).'),
  num_transition_frames: z.number().min(0).max(60).default(10).description(
    'Blend frames when chaining onto a previous motion (motion_npz).'),
  // the diffusion guidance vocabulary is CLOSED (python compose
  // voice: separated | regular | nocfg) — schemastery names a bad
  // value loudly instead of wiring it to the GPU silently.
  cfg_type: z.union([z.const('separated'), z.const('regular'), z.const('nocfg')])
    .default('separated').description(
      'separated = independent text/action guidance (calibrated); nocfg = fastest.'),
  cfg_weight_a: z.number().min(0).max(15).default(2.5).description(
    'Text guidance weight (separated mode).'),
  cfg_weight_b: z.number().min(0).max(15).default(5.0).description(
    'Action guidance weight (separated mode).'),
  motion_npz: z.string().description(
    'Previous motion NPZ to continue — the new prompt takes over after num_transition_frames.'),
  preview_glb: z.string().role('path').description(
    'SOMAX-rigged character GLB — the motion is skinned onto it (somax bake preview).'),
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
