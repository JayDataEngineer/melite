// Tier 3 — the ideogram4 card (the ideogram_t2i renderer port): the
// Comfy-Org official Ideogram v4 template chain — dual-guided
// (conditional + CFGOverride-trimmed unconditional) sampling.
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import { z } from '../atoms.ts'
import { ideogramLane, finalizeIdeogram } from '../kit.ts'

const schema = z.object({
  prompt: z.string(),
  width: z.number(),
  height: z.number(),
  steps: z.number(),
  cfg: z.number(),
  mu: z.number(),
  std: z.number(),
  sampler: z.string(),
  seed: z.number().default(-1),
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
