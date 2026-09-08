// Tier 3 — the fit card (the fit_t1 renderer port): FitRow derives
// the runtime row (no baked row beside it — rung 6), FitProp seats
// the prop under the three meld fit laws, 8-view proof sheet.
// Decl + admission + one kit recipe call — the lane body lives in src/kit.ts.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { fitLane, finalizeFit } from '../kit.ts'
import { vocabulary } from '../../../comfyui/src/models/vocab.ts'

const schema = z.object({
  body_glb: z.string().role('path').description("Body GLB").extra('extra', { order: 0, group: "parts", required: true, wtype: 'file', }),
  prop_glb: z.string().role('path').description("Prop GLB").extra('extra', { order: 1, group: "parts", required: true, wtype: 'file', }),
  bone: z.string().description("Bone").default("mixamorig:Head").extra('extra', { order: 0, group: "placement" }),
  // the three meld fit laws — a closed vocabulary (the python row
  // refuses anything else with its field name)
  align: vocabulary(["socket", "fit", "grip"]).description("Law").default("socket").extra('extra', { order: 1, group: "placement", wtype: 'select' }),
  position: z.string().description("Offset").default("0,0,0").extra('extra', { order: 2, group: "placement" }),
  rotation: z.string().description("Rotation").default("0,0,0").extra('extra', { order: 3, group: "placement" }),
  fit_ratio: z.number().description("Fit ratio").min(0).max(10).step(0.01).default(0).extra('extra', { order: 0, group: "fit", wtype: 'number' }),
  fit_ref_bone: z.string().description("Measure to").extra('extra', { order: 1, group: "fit" }),
  fit_ref_bone2: z.string().description("Measure from").extra('extra', { order: 2, group: "fit" }),
  seat_ratio: z.number().description("Seat ratio").min(0).max(1).step(0.01).default(0.22).extra('extra', { order: 3, group: "fit", wtype: 'number' }),
  finger_bone: z.string().description("Finger bone").extra('extra', { order: 0, group: "grip" }),
  thumb_bone: z.string().description("Thumb bone").extra('extra', { order: 1, group: "grip" }),
  target_width: z.number().description("Target width").min(0).max(10).step(0.01).default(0).extra('extra', { order: 2, group: "grip", wtype: 'number' }),
  resolution: z.number().description("View resolution").min(256).max(2048).step(64).default(768).extra('extra', { order: 0, group: "turnaround" }),
  framing: z.number().description("Framing").min(1).max(3).step(0.05).default(1.2).extra('extra', { order: 1, group: "turnaround" }),
  focal_length: z.number().description("Focal length").min(10).max(400).step(1).default(50).extra('extra', { order: 2, group: "turnaround", wtype: 'slider' }),
  samples: z.number().description("Samples").min(1).max(4096).step(1).default(64).extra('extra', { order: 3, group: "turnaround", wtype: 'number' }),
  transparent: vocabulary(["true", "false"]).description("Background").default("true").extra('extra', { order: 4, group: "turnaround", wtype: 'select' }),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
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
  }))
}
