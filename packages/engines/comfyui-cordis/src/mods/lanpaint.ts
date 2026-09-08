// mods/lanpaint.ts — the lanpaint pack (py mods/lanpaint.py, 1:1
// port): the vendored LanPaint sampler's knobs, forced mode, and
// the outpaint frame. Declared as a cordis plugin registering
// through ctx.comfyui.registerMod (PORT LAW shape).
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerMod({
    pack: 'lanpaint',
    families: ['qwen-img-edit-2511'],
    fields: [
      { name: 'image1', type: 'image', label: 'Image 1', group: 'input', zone: 'inputs', order: -1, width: 1, columns: 3, required: true },
      { name: 'lanpaint_enabled', type: 'boolean', label: 'Force LanPaint', group: 'lanpaint', visible_when: 'image1 != null', order: 1, width: 1, default: false },
      { name: 'lanpaint_num_steps', type: 'number', label: 'Num Steps', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 2, width: 1, min: 1, max: 100, step: 1, default: 20 },
      { name: 'lanpaint_step_size', type: 'slider', label: 'Step Size', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 3, width: 1, min: 0.1, max: 2, step: 0.1, default: 1.0 },
      { name: 'lanpaint_lambda', type: 'slider', label: 'Lambda', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 4, width: 1, min: 0, max: 2, step: 0.05, default: 0.5 },
      { name: 'lanpaint_beta', type: 'slider', label: 'Beta', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 5, width: 1, min: 0, max: 2, step: 0.05, default: 0.5 },
      { name: 'lanpaint_friction', type: 'slider', label: 'Friction', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 6, width: 1, min: 0, max: 2, step: 0.05, default: 0.5 },
      { name: 'lanpaint_prompt_mode', type: 'select', label: 'Prompt Mode', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 7, width: 1, default: 'negative', options: ['negative', 'positive'] },
      { name: 'outpaint_top', type: 'slider', label: 'Expand Top', group: 'lanpaint', visible_when: 'image1 != null', order: 8, width: 1, min: 0, max: 512, step: 8, default: 0 },
      { name: 'outpaint_right', type: 'slider', label: 'Expand Right', group: 'lanpaint', visible_when: 'image1 != null', order: 9, width: 1, min: 0, max: 512, step: 8, default: 0 },
      { name: 'outpaint_bottom', type: 'slider', label: 'Expand Bottom', group: 'lanpaint', visible_when: 'image1 != null', order: 10, width: 1, min: 0, max: 512, step: 8, default: 0 },
      { name: 'outpaint_left', type: 'slider', label: 'Expand Left', group: 'lanpaint', visible_when: 'image1 != null', order: 11, width: 1, min: 0, max: 512, step: 8, default: 0 },
      { name: 'outpaint_overlap', type: 'slider', label: 'Overlap', group: 'lanpaint', visible_when: 'image1 != null', order: 8, width: 1, min: 0, max: 64, step: 1, default: 16 },
    ],
  })
}
