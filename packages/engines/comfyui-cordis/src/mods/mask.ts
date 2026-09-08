// mods/mask.ts — the mask pack (py mods/mask.py, 1:1 port): the
// region-modality fields — a mask knob declares the lane's region
// semantics; crop+stitch is the default honoring. Declared as a
// cordis plugin registering through ctx.comfyui.registerMod.
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerMod({
    pack: 'mask',
    families: ['qwen-img-edit-2511'],
    fields: [
      {
        name: 'mask',
        type: 'mask',
        label: 'Region Mask',
        group: 'mask',
        zone: 'mods',
        tooltip: 'Add the mask mod, then drop an RGBA PNG whose alpha channel marks the region.',
        order: -1,
      },
      {
        name: 'input_mask',
        type: 'image',
        label: 'Region Mask',
        group: 'mask',
        zone: 'mods',
        tooltip:
          'RGBA PNG whose alpha channel marks the region. Standalone: region semantics for this lane. Alongside lanpaint: the inpaint region — present with image1, the builder switches to the lanpaint sampler.',
        order: 0,
      },
      {
        name: 'mask_mode',
        type: 'select',
        label: 'Region Mode',
        group: 'mask',
        zone: 'mods',
        tooltip:
          'How the mask is honored: auto (the lane\'s own region ControlNet if its weights are present, else crop+stitch), crop_stitch (crop to the mask + context, work the crop, composite back — pixels outside the mask never change), full_frame (legacy whole-image pass; unmasked regions may drift).',
        order: 1,
        width: 1,
        default: 'auto',
        options: ['auto', 'crop_stitch', 'full_frame'],
      },
      {
        name: 'mask_context_pad',
        type: 'slider',
        label: 'Context Padding',
        group: 'mask',
        zone: 'mods',
        tooltip: 'Pixels of surrounding context kept in the crop (crop_stitch mode). More context = more coherence; 64 is the sweet spot.',
        order: 2,
        width: 1,
        min: 0,
        max: 256,
        step: 8,
        default: 64,
      },
      {
        name: 'mask_grow',
        type: 'slider',
        label: 'Grow / Shrink',
        group: 'mask',
        zone: 'mods',
        tooltip: 'Expand (+) or shrink (−) the region by an exact pixel disk before the run. Applied host-side.',
        order: 3,
        width: 1,
        min: -32,
        max: 32,
        step: 1,
        default: 8,
      },
      {
        name: 'mask_feather',
        type: 'slider',
        label: 'Feather',
        group: 'mask',
        zone: 'mods',
        tooltip: 'Gaussian falloff the composite blends through — kills the pasted-on rectangle edge.',
        order: 4,
        width: 1,
        min: 0,
        max: 32,
        step: 1,
        default: 8,
      },
      {
        name: 'mask_threshold',
        type: 'slider',
        label: 'Re-threshold',
        group: 'mask',
        zone: 'mods',
        tooltip: 'Re-binarize the feathered mask at this level. 0 = keep the soft falloff.',
        order: 5,
        width: 1,
        min: 0,
        max: 1,
        step: 0.05,
        default: 0,
      },
      {
        name: 'mask_invert',
        type: 'boolean',
        label: 'Invert',
        group: 'mask',
        zone: 'mods',
        tooltip: 'Work OUTSIDE the painted region instead.',
        order: 6,
        width: 1,
        default: false,
      },
    ],
  })
}
