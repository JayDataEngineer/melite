// Tier 3 — the fit card (the fit_t1 renderer port): FitRow derives
// the runtime row (no baked row beside it — rung 6), FitProp seats
// the prop under the three meld fit laws, 8-view proof sheet.
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import { z } from '../atoms.ts'
import { fitLane, finalizeFit } from '../kit.ts'

const schema = z.object({
  body_glb: z.string(),
  prop_glb: z.string(),
  bone: z.string().default('mixamorig:Head'),
  // the three meld fit laws — a closed vocabulary (the python row
  // refuses anything else with its field name)
  align: z.union([z.const('socket'), z.const('fit'), z.const('grip')]).default('socket'),
  position: z.string().default('0,0,0'),
  rotation: z.string().default('0,0,0'),
  fit_ratio: z.number().default(0.0),
  fit_ref_bone: z.string(),
  fit_ref_bone2: z.string(),
  seat_ratio: z.number().default(0.22),
  finger_bone: z.string(),
  thumb_bone: z.string(),
  target_width: z.number().default(0.0),
  resolution: z.number().default(768),
  framing: z.number().default(1.2),
  focal_length: z.number().default(50),
  samples: z.number().default(64),
  transparent: z.union([z.boolean(), z.string()]).default(true),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'fit',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'fit',
    boarded: ['fit'],
    requires: ['melite-poser-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      const body = String(p.body_glb ?? '')
      const prop = String(p.prop_glb ?? '')
      const missing = [body.trim() ? null : 'body_glb', prop.trim() ? null : 'prop_glb'].filter((k) => k !== null)
      if (missing.length) {
        throw new Error(`required param(s) ${missing.join(', ')} missing on the fit lane`)
      }
      const bone = String(p.bone ?? '')
      if (!bone.trim()) {
        throw new Error('bone is required on the fit lane — which bone carries the prop')
      }
      fitLane(p, g, runId)
    },
    finalize: finalizeFit,
  })
}
