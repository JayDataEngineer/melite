// Tier 3 — the anny card (the anny_t1 renderer port): composite
// character → 8-view turnaround sheet; optional SAM hair/clothing
// sprite ingest.
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { annyLane, finalizeAnny } from '../kit.ts'

const schema = z.object({
  body_glb: z.string(),
  source_image: z.string(),
  resolution: z.number().default(768),
  framing: z.number().default(1.2),
  focal_length: z.number().default(50),
  samples: z.number().default(64),
  // bool or the Select's "true"/"false" wire string (the loose anny
  // law coerces in compose — python step-doc: str(x) != "false")
  transparent: z.union([z.boolean(), z.string()]).default(true),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'anny',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'anny',
    boarded: ['anny'],
    requires: ['melite-poser-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, _runId) {
      const body = String(p.body_glb ?? '')
      if (!body.trim()) {
        throw new Error("required param 'body_glb' missing or empty on the anny card (the lane assembles FROM a real body GLB — the resolved mount path, never a mannequin)")
      }
      annyLane(p, g)
    },
    finalize: finalizeAnny,
  })
}
