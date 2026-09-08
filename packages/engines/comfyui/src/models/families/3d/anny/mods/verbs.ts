// families/3d/anny/mods/verbs.ts — ANNY'S SUB-ACTION MODS (the py
// models/3d/anny/mods/verbs.py, 1:1): body estimate, preset
// save/load, dress, prop-seat. FAMILY-OWNED — the verb definitions
// live with the family; each mounts by verb id on the anny card's
// boarded families. Knobs NEVER join the card surface
// (SubActionMod law — verbs own their knobs; they ride the verb's
// own invocation doc). The Cordis contract shape: every verb's
// KNOBS are a Schemastery object schema (the tool-contract
// pattern), wire types on .extra('extra', {wtype}).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  // NOTE: methods are called ON the service (never destructured —
  // a destructured method loses its receiver; cordis loads
  // function-shaped entries by construction, registry.ts:92).
  ctx.effect(() => ctx.comfyui.registerVerb({
    id: 'hmr-estimate',
    label: 'Estimate body from photo',
    families: ['anny'],
    engines: [{ id: 'commercial', flow: 'anny-hmr-commercial' }],
    writes: ['body_glb'],
    requires: ['melite-kimodo-nodes'],
    fields: z.object({
      person_index: z.number().min(0).step(1).default(0).description('Person')
        .extra('extra', { wtype: 'number', tooltip: 'Which detected person to fit (0 = the most confident detection).' }),
    }) as never,
  }))

  ctx.effect(() => ctx.comfyui.registerVerb({
    id: 'preset-save',
    label: 'Save character as preset',
    families: ['anny'],
    engines: [{ id: 'save', local: 'save-preset' }],
    writes: [],
    requires: [],
    fields: z.object({
      name: z.string().description('Preset name')
        .extra('extra', { wtype: 'text', required: true, tooltip: 'Label for the saved character row.' }),
    }) as never,
  }))

  ctx.effect(() => ctx.comfyui.registerVerb({
    id: 'preset-load',
    label: 'Load character preset',
    families: ['anny'],
    engines: [{ id: 'instantiate', flow: 'anny-params' }],
    writes: ['body_glb'],
    requires: ['melite-kimodo-nodes'],
    fields: z.object({
      preset_id: z.string().description('Preset')
        .extra('extra', { wtype: 'text', required: true, tooltip: 'Estate archetype id or user row id (user-N).' }),
    }) as never,
  }))
  const seatFields = (o: {
    propLabel: string; propTooltip: string; bone: string
    align: 'socket' | 'fit' | 'grip'
    fingerBone?: string; thumbBone?: string; targetWidth?: number
    fitRatioTooltip: string; seatRatioTooltip: string; targetWidthTooltip: string
  }) => z.object({
    prop: z.string().description(o.propLabel)
      .extra('extra', { wtype: 'text', required: true, tooltip: o.propTooltip }),
    model_name: z.string().description('Prop name')
      .extra('extra', { wtype: 'text', tooltip: "Unity lookup name — the chip fills the outfit filename stem; empty seats as 'prop'." }),
    bone: z.string().default(o.bone).description('Bone')
      .extra('extra', { wtype: 'text', tooltip: 'Which bone carries the outfit (coat: Spine, hat: mixamorig:Head).' }),
    align: z.union([z.const('socket'), z.const('fit'), z.const('grip')]).default(o.align).description('Law')
      .extra('extra', { wtype: 'select', options: ['socket', 'fit', 'grip'], tooltip: 'socket: hang (coat); fit: measure + scale (hat); grip: hand-lock (weapon — the prop verb\'s default).' }),
    position: z.string().default('0,0,0').description('Offset')
      .extra('extra', { wtype: 'text', tooltip: 'x,y,z meters added after the law (grip forbids non-zero).' }),
    rotation: z.string().default('0,0,0').description('Rotation')
      .extra('extra', { wtype: 'text', tooltip: 'x,y,z Unity degrees applied pre-seat (grip forbids non-zero).' }),
    fit_ratio: z.number().min(0).step(0.01).default(0).description('Fit ratio')
      .extra('extra', { wtype: 'number', tooltip: o.fitRatioTooltip }),
    fit_ref_bone: z.string().description('Measure to')
      .extra('extra', { wtype: 'text', tooltip: 'fit law: the span\'s far bone (required when fit_ratio > 0).' }),
    fit_ref_bone2: z.string().description('Measure from')
      .extra('extra', { wtype: 'text', tooltip: 'fit law: the span\'s near bone (hat: mixamorig:Neck).' }),
    seat_ratio: z.number().min(0).max(1).step(0.01).default(0.22).description('Seat ratio')
      .extra('extra', { wtype: 'number', tooltip: o.seatRatioTooltip }),
    finger_bone: z.string().description('Finger bone')
      .extra('extra', { wtype: 'text', tooltip: 'grip law: the blade-axis finger (weapon: mixamorig:RightHandMiddle1).', ...(o.fingerBone !== undefined ? { default: o.fingerBone } : {}) }),
    thumb_bone: z.string().description('Thumb bone')
      .extra('extra', { wtype: 'text', tooltip: 'grip law: the clamp thumb (weapon: mixamorig:RightHandThumb1).', ...(o.thumbBone !== undefined ? { default: o.thumbBone } : {}) }),
    target_width: z.number().min(0).step(0.01).default(o.targetWidth ?? 0).description('Target width')
      .extra('extra', { wtype: 'number', tooltip: o.targetWidthTooltip }),
  }) as never

  ctx.effect(() => ctx.comfyui.registerVerb({
    id: 'dress',
    label: 'Dress with outfit',
    families: ['anny'],
    engines: [{ id: 'seat', flow: 'fit-seat' }],
    writes: ['body_glb'],
    requires: ['melite-poser-nodes'],
    fields: seatFields({
      propLabel: 'Outfit GLB',
      propTooltip: 'The outfit/prop mesh (.glb estate path or run artifact ref).',
      bone: 'mixamorig:Spine',
      align: 'socket',
      fitRatioTooltip: 'fit law: prop width as a fraction of the bone span (hat: 1).',
      seatRatioTooltip: 'How far down the span the prop seats (hat: 0.22). Grip ignores this.',
      targetWidthTooltip: 'grip law: scale-then-grip width in meters (sword: 0.25). fit forbids non-zero.',
    }),
  }))

  ctx.effect(() => ctx.comfyui.registerVerb({
    id: 'prop',
    label: 'Seat prop in hand',
    families: ['anny'],
    engines: [{ id: 'seat', flow: 'fit-seat' }],
    writes: ['body_glb'],
    requires: ['melite-poser-nodes'],
    fields: seatFields({
      propLabel: 'Prop GLB',
      propTooltip: 'The weapon/prop mesh (.glb estate path or run artifact ref).',
      bone: 'mixamorig:RightHand',
      align: 'grip',
      fingerBone: 'mixamorig:RightHandMiddle1',
      thumbBone: 'mixamorig:RightHandThumb1',
      targetWidth: 0.25,
      fitRatioTooltip: 'fit law only (grip + socket leave 0).',
      seatRatioTooltip: 'socket/fit seating depth. Grip ignores this.',
      targetWidthTooltip: 'grip law: scale-then-grip width in meters (sword: 0.25).',
    }),
  }))
}
