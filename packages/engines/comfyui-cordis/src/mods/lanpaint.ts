// mods/lanpaint.ts — the lanpaint pack (1:1 port of the estate
// py: models/image/qwen-img-edit-2511/mods/lanpaint.py + the
// generic LanPaintMod menu class). The Cordis contract shape: the
// fields ARE a Schemastery object schema, wire types + UI meta on
// .extra('extra', {...}). The qwen flavor's image1 override
// (REQUIRED, input zone — the estate flavor's whole declaration)
// rides inline here, the Schema.intersect composition expressed as
// one declared contract.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export const inject = ['comfyui']

const LanpaintFields = z.object({
  image1: z.string().role('path').description('Image 1')
    .extra('extra', { wtype: 'image', group: 'input', zone: 'inputs', order: -1, width: 1, columns: 3, required: true }),
  lanpaint_enabled: z.boolean().default(false).description('Force LanPaint')
    .extra('extra', { wtype: 'boolean', group: 'lanpaint', visible_when: 'image1 != null', order: 1, width: 1 }),
  lanpaint_num_steps: z.number().min(1).max(100).default(20).description('Num Steps')
    .extra('extra', { wtype: 'number', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 2, width: 1 }),
  lanpaint_step_size: z.number().min(0.1).max(2).default(1.0).description('Step Size')
    .extra('extra', { wtype: 'slider', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 3, width: 1, step: 0.1 }),
  lanpaint_lambda: z.number().min(0).max(2).default(0.5).description('Lambda')
    .extra('extra', { wtype: 'slider', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 4, width: 1, step: 0.05 }),
  lanpaint_beta: z.number().min(0).max(2).default(0.5).description('Beta')
    .extra('extra', { wtype: 'slider', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 5, width: 1, step: 0.05 }),
  lanpaint_friction: z.number().min(0).max(2).default(0.5).description('Friction')
    .extra('extra', { wtype: 'slider', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 6, width: 1, step: 0.05 }),
  lanpaint_prompt_mode: z.union([z.const('negative'), z.const('positive')]).default('negative').description('Prompt Mode')
    .extra('extra', { wtype: 'select', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 7, width: 1, options: ['negative', 'positive'] }),
  outpaint_top: z.number().min(0).max(512).default(0).description('Expand Top')
    .extra('extra', { wtype: 'slider', group: 'lanpaint', visible_when: 'image1 != null', order: 8, width: 1, step: 8 }),
  outpaint_right: z.number().min(0).max(512).default(0).description('Expand Right')
    .extra('extra', { wtype: 'slider', group: 'lanpaint', visible_when: 'image1 != null', order: 9, width: 1, step: 8 }),
  outpaint_bottom: z.number().min(0).max(512).default(0).description('Expand Bottom')
    .extra('extra', { wtype: 'slider', group: 'lanpaint', visible_when: 'image1 != null', order: 10, width: 1, step: 8 }),
  outpaint_left: z.number().min(0).max(512).default(0).description('Expand Left')
    .extra('extra', { wtype: 'slider', group: 'lanpaint', visible_when: 'image1 != null', order: 11, width: 1, step: 8 }),
  outpaint_overlap: z.number().min(0).max(64).default(16).description('Overlap')
    .extra('extra', { wtype: 'slider', group: 'lanpaint', visible_when: 'image1 != null', order: 8, width: 1, step: 1 }),
})

export function apply(ctx: Context): void {
  ctx.comfyui.registerMod({
    pack: 'lanpaint',
    families: ['qwen-img-edit-2511'],
    fields: LanpaintFields as never,
  })
}
