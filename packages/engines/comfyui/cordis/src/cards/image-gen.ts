// Tier 3 — the image-gen card (the image_t2i renderer port).
// Decl (contract-derived: id/skeleton/boarded/schema) + admission +
// one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import { z } from '../atoms.ts'
import { imageT2I, finalizeImageGen } from '../kit.ts'

const schema = z.object({
  prompt: z.string(),
  negative_prompt: z.string(),
  width: z.number().default(1024),
  height: z.number().default(1024),
  steps: z.number().default(8),
  cfg: z.number().default(4.5),
  sampler: z.string(),
  scheduler: z.string(),
  seed: z.number().default(-1),
  loras: z.array(z.object({ name: z.string(), strength: z.number() })),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'image-gen',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'generate',
    // stock-only card (Cordis card 1 verdict): every node is core
    // — no requires to declare.
    boarded: ['krea-2', 'z-image', 'anima'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!p.prompt || !(p.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing or empty on the image-gen card (what the picture IS)")
      }
      imageT2I(p, model, g, runId)
    },
    finalize: finalizeImageGen,
  })
}
