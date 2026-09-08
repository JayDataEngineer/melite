// mods/anny-verbs.ts — the anny card's SubActionMods (py
// melite_models anny verbs, 1:1 port): body estimate, preset
// save/load, dress, prop-seat. Knobs NEVER join the card surface
// (SubActionMod law); each mounts by verb id on the anny card's
// boarded families. Declared as a cordis plugin registering
// through ctx.comfyui.registerVerb (PORT LAW shape).
import type { Context } from '@deepseek-ai/cordis'

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  // NOTE: methods are called ON the service (never destructured —
  // a destructured method loses its receiver; cordis loads
  // function-shaped entries by construction, registry.ts:92).
  ctx.comfyui.registerVerb({
    id: 'hmr-estimate',
    label: 'Estimate body from photo',
    families: ['anny'],
    engines: [{ id: 'commercial', flow: 'anny-hmr-commercial' }],
    writes: ['body_glb'],
    requires: ['melite-kimodo-nodes'],
    fields: [
      { name: 'person_index', type: 'number', label: 'Person', tooltip: 'Which detected person to fit (0 = the most confident detection).', min: 0, step: 1, default: 0 },
    ],
  })

  ctx.comfyui.registerVerb({
    id: 'preset-save',
    label: 'Save character as preset',
    families: ['anny'],
    engines: [{ id: 'save', local: 'save-preset' }],
    writes: [],
    requires: [],
    fields: [
      { name: 'name', type: 'text', label: 'Preset name', tooltip: 'Label for the saved character row.', required: true },
    ],
  })

  ctx.comfyui.registerVerb({
    id: 'preset-load',
    label: 'Load character preset',
    families: ['anny'],
    engines: [{ id: 'instantiate', flow: 'anny-params' }],
    writes: ['body_glb'],
    requires: ['melite-kimodo-nodes'],
    fields: [
      { name: 'preset_id', type: 'text', label: 'Preset', tooltip: 'Estate archetype id or user row id (user-N).', required: true },
    ],
  })

  const seatFields = (opts: {
    propLabel: string; propTooltip: string; bone: string; align: string;
    fingerBone?: string; thumbBone?: string; targetWidth?: number;
    fitRatioTooltip: string; seatRatioTooltip: string; targetWidthTooltip: string;
  }) => [
    { name: 'prop', type: 'text', label: opts.propLabel, tooltip: opts.propTooltip, required: true },
    { name: 'model_name', type: 'text', label: 'Prop name', tooltip: "Unity lookup name — the chip fills the outfit filename stem; empty seats as 'prop'." },
    { name: 'bone', type: 'text', label: 'Bone', tooltip: 'Which bone carries the outfit (coat: Spine, hat: mixamorig:Head).', default: opts.bone },
    { name: 'align', type: 'select', label: 'Law', tooltip: 'socket: hang (coat); fit: measure + scale (hat); grip: hand-lock (weapon — the prop verb\'s default).', default: opts.align, options: ['socket', 'fit', 'grip'] },
    { name: 'position', type: 'text', label: 'Offset', tooltip: 'x,y,z meters added after the law (grip forbids non-zero).', default: '0,0,0' },
    { name: 'rotation', type: 'text', label: 'Rotation', tooltip: 'x,y,z Unity degrees applied pre-seat (grip forbids non-zero).', default: '0,0,0' },
    { name: 'fit_ratio', type: 'number', label: 'Fit ratio', tooltip: opts.fitRatioTooltip, min: 0, step: 0.01, default: 0 },
    { name: 'fit_ref_bone', type: 'text', label: 'Measure to', tooltip: 'fit law: the span\'s far bone (required when fit_ratio > 0).' },
    { name: 'fit_ref_bone2', type: 'text', label: 'Measure from', tooltip: 'fit law: the span\'s near bone (hat: mixamorig:Neck).' },
    { name: 'seat_ratio', type: 'number', label: 'Seat ratio', tooltip: opts.seatRatioTooltip, min: 0, max: 1, step: 0.01, default: 0.22 },
    { name: 'finger_bone', type: 'text', label: 'Finger bone', tooltip: 'grip law: the blade-axis finger (weapon: mixamorig:RightHandMiddle1).', ...(opts.fingerBone !== undefined ? { default: opts.fingerBone } : {}) },
    { name: 'thumb_bone', type: 'text', label: 'Thumb bone', tooltip: 'grip law: the clamp thumb (weapon: mixamorig:RightHandThumb1).', ...(opts.thumbBone !== undefined ? { default: opts.thumbBone } : {}) },
    { name: 'target_width', type: 'number', label: 'Target width', tooltip: opts.targetWidthTooltip, min: 0, step: 0.01, default: opts.targetWidth ?? 0 },
  ]

  ctx.comfyui.registerVerb({
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
      targetWidthTooltip: "grip law: scale-then-grip width in meters (sword: 0.25). fit forbids non-zero.",
    }),
  })

  ctx.comfyui.registerVerb({
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
  })
}
