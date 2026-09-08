// Tier 3 — the skin card (the skin_t1 renderer port): SkinPack
// deterministic detail maps + the kind sidecar, SkinApply bytes
// surgery, 8-view proof sheet.
// Decl + admission + one kit recipe call — the lane body (including
// the card-owned skin spec port) lives in src/kit.ts.
//
// The SIDECAR is derived, never wire: kind/map_size/seed are the
// card knobs (the Model's card_knobs rows).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { skinLane, finalizeSkin } from '../kit.ts'

const schema = z.object({
  body_glb: z.string(),
  kind: z.string().default('keeper'),
  // the Select sends wire strings ("512") — coerced at the closed
  // vocabulary in compose, never silently rescaled
  map_size: z.union([z.number(), z.string()]).default(512),
  seed: z.number().default(20260906),
  resolution: z.number().default(768),
  framing: z.number().default(1.2),
  focal_length: z.number().default(50),
  samples: z.number().default(64),
  transparent: z.union([z.boolean(), z.string()]).default(true),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'skin',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'skin',
    boarded: ['skin'],
    requires: ['melite-poser-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      const body = String(p.body_glb ?? '')
      if (!body.trim()) {
        throw new Error("required param 'body_glb' missing or empty on the skin lane")
      }
      skinLane(p, g, runId)
    },
    finalize: finalizeSkin,
  })
}
