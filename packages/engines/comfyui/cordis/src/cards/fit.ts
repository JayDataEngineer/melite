// Tier 3 — the fit card (the fit_t1 renderer port): FitRow derives
// the runtime row (no baked row beside it — rung 6), FitProp seats
// the prop under the three meld fit laws, 8-view proof sheet.
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { fitLane, finalizeFit } from '../kit.ts'

const schema = z.object({
  body_glb: z.string().role('path').description('Body GLB'),
  prop_glb: z.string().role('path').description('Prop GLB'),
  bone: z.string().default('mixamorig:Head').description('Bone'),
  // the three meld fit laws — a closed vocabulary (the python row
  // refuses anything else with its field name)
  align: z.union([z.const('socket'), z.const('fit'), z.const('grip')])
    .default('socket').description(
      'socket = snap origin to bone; fit = deform prop around bone volume; grip = hold near bone with manual offset'),
  position: z.string().default('0,0,0').description('Offset'),
  rotation: z.string().default('0,0,0').description('Rotation'),
  fit_ratio: z.number().min(0).max(10).default(0.0).description('Fit ratio'),
  fit_ref_bone: z.string().description('Measure to'),
  fit_ref_bone2: z.string().description('Measure from'),
  seat_ratio: z.number().min(0).max(1).default(0.22).description('Seat ratio'),
  finger_bone: z.string().description('Finger bone'),
  thumb_bone: z.string().description('Thumb bone'),
  target_width: z.number().min(0).max(10).default(0.0).description('Target width'),
  resolution: z.number().min(256).max(2048).default(768).description('View resolution'),
  framing: z.number().min(1.0).max(3.0).default(1.2).description('Framing'),
  focal_length: z.number().min(10).max(400).default(50).description('Focal length'),
  samples: z.number().min(1).max(4096).default(64).description('Samples'),
  transparent: z.union([z.boolean(), z.string()]).default(true).description('Background'),
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
