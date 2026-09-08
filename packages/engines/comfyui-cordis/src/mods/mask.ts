// mods/mask.ts — the mask pack (1:1 port of the py MaskMod): the
// region-modality contract — a mask knob declares the lane's
// region semantics; crop+stitch is the default honoring. The
// Cordis contract shape: fields ARE a Schemastery object schema,
// wire types + UI meta on .extra('extra', {...}).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export const inject = ['comfyui']

const MaskFields = z.object({
  mask: z.any().description('Region Mask')
    .extra('extra', {
      wtype: 'mask', group: 'mask', zone: 'mods', order: -1,
      tooltip: 'Add the mask mod, then drop an RGBA PNG whose alpha channel marks the region.',
    }),
  input_mask: z.string().role('path').description('Region Mask')
    .extra('extra', {
      wtype: 'image', group: 'mask', zone: 'mods', order: 0,
      tooltip: 'RGBA PNG whose alpha channel marks the region. Standalone: region semantics for this lane. Alongside lanpaint: the inpaint region — present with image1, the builder switches to the lanpaint sampler.',
    }),
  mask_mode: z.union([z.const('auto'), z.const('crop_stitch'), z.const('full_frame')]).default('auto').description('Region Mode')
    .extra('extra', {
      wtype: 'select', group: 'mask', zone: 'mods', order: 1, width: 1,
      options: ['auto', 'crop_stitch', 'full_frame'],
      tooltip: 'How the mask is honored: auto (the lane\'s own region ControlNet if its weights are present, else crop+stitch), crop_stitch (crop to the mask + context, work the crop, composite back — pixels outside the mask never change), full_frame (legacy whole-image pass; unmasked regions may drift).',
    }),
  mask_context_pad: z.number().min(0).max(256).step(8).default(64).description('Context Padding')
    .extra('extra', { wtype: 'slider', group: 'mask', zone: 'mods', order: 2, width: 1, tooltip: 'Pixels of surrounding context kept in the crop (crop_stitch mode). More context = more coherence; 64 is the sweet spot.' }),
  mask_grow: z.number().min(-32).max(32).step(1).default(8).description('Grow / Shrink')
    .extra('extra', { wtype: 'slider', group: 'mask', zone: 'mods', order: 3, width: 1, tooltip: 'Expand (+) or shrink (−) the region by an exact pixel disk before the run. Applied host-side.' }),
  mask_feather: z.number().min(0).max(32).step(1).default(8).description('Feather')
    .extra('extra', { wtype: 'slider', group: 'mask', zone: 'mods', order: 4, width: 1, tooltip: 'Gaussian falloff the composite blends through — kills the pasted-on rectangle edge.' }),
  mask_threshold: z.number().min(0).max(1).step(0.05).default(0).description('Re-threshold')
    .extra('extra', { wtype: 'slider', group: 'mask', zone: 'mods', order: 5, width: 1, tooltip: 'Re-binarize the feathered mask at this level. 0 = keep the soft falloff.' }),
  mask_invert: z.boolean().default(false).description('Invert')
    .extra('extra', { wtype: 'boolean', group: 'mask', zone: 'mods', order: 6, width: 1, tooltip: 'Work OUTSIDE the painted region instead.' }),
})

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerMod({
    pack: 'mask',
    families: ['qwen-img-edit-2511'],
    fields: MaskFields as never,
  }))
}
