// Tier 3 — the ideogram4 card (the ideogram_t2i renderer port): the
// Comfy-Org official Ideogram v4 template chain — dual-guided
// (conditional + CFGOverride-trimmed unconditional) sampling.
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { ideogramLane, finalizeIdeogram } from '../kit.ts'

const schema = z.object({
  prompt: z.string().description('Prompt'),
  // ride-the-model keys (no schema default — the compose-door
  // cascade overlays model defaults): HINT-ONLY ranges via extra
  // (RANGE RULE 2026-09-08: whoever owns the default owns the floor).
  width: z.number().description('Width').extra('extra', { min: 256, max: 2048 }),
  height: z.number().description('Height').extra('extra', { min: 256, max: 2048 }),
  steps: z.number().description('Steps').extra('extra', { min: 1, max: 100 }),
  cfg: z.number().description(
    'How closely the diffusion follows the prompt. Higher = stricter.').extra(
      'extra', { min: 1, max: 20 }),
  mu: z.number().description(
    'Ideogram4 scheduler mean shift — the official Default preset is 0.5.').extra(
      'extra', { min: -10, max: 10 }),
  std: z.number().description(
    'Ideogram4 scheduler spread — the official Default preset is 1.75.').extra(
      'extra', { min: 0.1, max: 5 }),
  sampler: z.string().description(
    'Sampler — options resolve from the $samplers vocabulary at serve time'),
  seed: z.number().min(-1).step(1).default(-1).description('Seed'),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'ideogram4',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'generate',
    // stock-only: the whole chain is core/custom-script nodes.
    boarded: ['ideogram'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!p.prompt || !(p.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing or empty on the ideogram4 card (what the picture IS)")
      }
      ideogramLane(p, model, g, runId)
    },
    finalize: finalizeIdeogram,
  })
}
