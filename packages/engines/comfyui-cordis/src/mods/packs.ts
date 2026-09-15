// mods/packs.ts — THE MOD PACKS: the distinct category taxonomy
// (operator order 2026-09-08: "we had a distinct mods category —
// LORAS, CONTROLNETS, LAN-INPAINT, in that vein"). One file
// registers every PACK CONTRACT — the py Mod parents (melite_cards
// dsl.py: LorasMod, ControlNetMod, LanPaintMod, MaskMod, the
// qvoice pack): the CATEGORY's field schema, inherited by every
// boarding family. A flavor (the family's own mods/<pack>.ts under
// the family's packaged mods (packages/models/<id>/mods/ — the packagedFlavors table in cardDefs.ts)) boards
// the pack and carries ONLY data — rows, the runtime door, or a
// bare boarding. Fields live HERE and nowhere else (py
// subclassing: the flavor inherits, never re-declares).
//
// SEAM NOTE (image1): the lanpaint contract's image1 (REQUIRED,
// input zone) is the qwen flavor's whole-declaration override in
// py, inlined here because exactly one family boards lanpaint —
// byte-identical output. A second lanpaint family with a different
// image1 story re-opens the flavor-fields seam (recorded in
// docs/design/mods-as-mutations-2026-09-08.md).
//
// The Cordis contract shape: fields ARE a Schemastery object
// schema, wire types + UI meta on .extra('extra', {...}).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

export const inject = ['comfyui']

// ── LORAS (the py LorasMod): the LoRA stack ──
const LorasFields = z.object({
  loras: z.array(z.object({ name: z.string(), strength: z.number() }))
    .description('LoRAs')
    .extra('extra', { wtype: 'loras', group: 'loras_controlnet', zone: 'mods', default: null, order: 0 }),
})

// ── CONTROLNET (the py ControlNetMod + the z-image flavor's
// controlnets/mod.yaml, 1:1): the ControlNet stack. ONE entry per
// conditioning map: the catalog TYPE (the family's served rows —
// the union file for z-image), the map itself (caller-supplied —
// no preprocessor executes in this plane), the pipeline artifact
// name when a brick feeds it (artifact wins over image_b64 at run
// time, the retired precedence), strength, the full-schedule step
// range (the live ZImageFunControlnet node carries NO schedule
// inputs — a non-default range refuses LOUD at fire time, never a
// silent full-strength run), and the enabled toggle. The pack-level
// floor clamps weak entries UP (with a log line). Max stack rides
// the discovery table per pack (z-image: 5, the declaration). ──
const ControlNetEntryFields = z.object({
  type: z.string().description('Type')
    .extra('extra', { wtype: 'text', group: 'controlnet', zone: 'mods', order: 0, width: 1 }),
  image_b64: z.string().description('Conditioning')
    .extra('extra', {
      wtype: 'image', group: 'controlnet', zone: 'mods', order: 1, width: 2,
      tooltip: 'The conditioning map image (uploaded — the square stages it; a pipeline artifact name wins when set below).',
    }),
  artifact: z.string().default('').description('Artifact')
    .extra('extra', {
      wtype: 'text', group: 'controlnet', zone: 'mods', order: 2, width: 2,
      tooltip: 'Pipeline-wired conditioning source — the ctx artifact name (e.g. front_pose) produced by an upstream brick. Takes precedence over the Conditioning image at run time: when the artifact is present in ctx, the brick uploads THAT file as the conditioning image.',
    }),
  strength: z.number().min(0).max(2).step(0.05).default(0.7).description('Strength')
    .extra('extra', { wtype: 'slider', group: 'controlnet', zone: 'mods', order: 3, width: 1 }),
  start_percent: z.number().min(0).max(1).step(0.05).default(0).description('Start')
    .extra('extra', { wtype: 'slider', group: 'controlnet', zone: 'mods', order: 4, width: 1 }),
  end_percent: z.number().min(0).max(1).step(0.05).default(1).description('End')
    .extra('extra', { wtype: 'slider', group: 'controlnet', zone: 'mods', order: 5, width: 1 }),
  enabled: z.boolean().default(true).description('Enabled')
    .extra('extra', { wtype: 'boolean', group: 'controlnet', zone: 'mods', order: 6, width: 1 }),
})
const ControlNetFields = z.object({
  controlnets: z.array(ControlNetEntryFields)
    .description('ControlNet')
    .extra('extra', { wtype: 'controlnets', group: 'loras_controlnet', zone: 'mods', default: null, order: 1 }),
  controlnet_strength_floor: z.number().min(0).max(1).step(0.05).default(0).description('ControlNet Strength Floor')
    .extra('extra', {
      wtype: 'slider', group: 'loras_controlnet', zone: 'mods', order: 2, width: 1,
      tooltip: 'Minimum strength any ControlNet in the stack may apply at. Entries below this are clamped UP (with a log line). 0.0 = no floor. Raise this when stacking many weak ControlNets that cost VRAM without visual benefit.',
    }),
})

// ── IP-ADAPTER (the py IpAdapterMod, the ray ip_adapters/mod.yaml,
// 1:1 field set): the reference-image stack. ONE entry per
// reference: the image itself, the MODE (the family's served rows
// — style/composition/face/generic on z-image), and the weight.
// FATE 'refused' (guard.ts PACK_FATE): no lane builds this pack in
// this plane — ray's apply_ipadapters lane silently degraded
// (except-break) on weights that never stood on disk (SD1.5 files,
// no Z-Image-compatible artifact exists upstream), so the firing
// gate refuses every stated entry LOUD instead of skipping it.
// The row filenames are catalog vocabulary (the retired
// declaration, byte-1:1) — never fetch targets. ──
const IPAdapterEntryFields = z.object({
  image: z.string().description('Reference Image')
    .extra('extra', {
      wtype: 'image', group: 'ip_adapter', zone: 'mods', order: 0, width: 2,
      tooltip: 'The reference image. The IP-Adapter lane is not executable in this plane — any stated entry refuses loud at run time.',
    }),
  kind: z.string().default('style').description('Mode')
    .extra('extra', { wtype: 'text', group: 'ip_adapter', zone: 'mods', order: 1, width: 1 }),
  weight: z.number().min(0).max(2).step(0.05).default(1).description('Weight')
    .extra('extra', { wtype: 'slider', group: 'ip_adapter', zone: 'mods', order: 2, width: 1 }),
})
const IPAdapterFields = z.object({
  ip_adapters: z.array(IPAdapterEntryFields)
    .description('IP-Adapter')
    .extra('extra', { wtype: 'ip_adapters', group: 'ip_adapter', zone: 'mods', default: null, order: 3 }),
})

// ── LAN-INPAINT (the py LanPaintMod + the qwen flavor's image1
// override, inlined — see the seam note above) ──
const LanpaintFields = z.object({
  image1: z.string().role('path').description('Image 1')
    .extra('extra', { wtype: 'image', group: 'input', zone: 'inputs', order: -1, width: 1, columns: 3, required: true }),
  lanpaint_enabled: z.boolean().default(false).description('Force LanPaint')
    .extra('extra', { wtype: 'boolean', group: 'lanpaint', visible_when: 'image1 != null', order: 1 }),
  lanpaint_num_steps: z.number().min(1).max(100).default(20).description('Num Steps')
    .extra('extra', { wtype: 'number', group: 'lanpaint', visible_when: 'lanpaint_enabled == true', order: 2, width: 1, step: 1 }),
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

// ── MASK (the py MaskMod): the region-modality contract ──
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

// ── QVOICE (the py qvoice pack): the voice-lock card's exported
// speaker embeddings — .qvoice file + PCA steering ──
const QvoiceFields = z.object({
  qvoice: z.string().role('path').description('Voice (.qvoice)')
    .extra('extra', {
      wtype: 'file', group: 'qvoice', zone: 'mods', order: 0,
      tooltip: 'Pre-computed speaker embedding (.qvoice/.voice — the voice-lock card exports these). Present = synthesize with THIS voice instead of the preset one.',
    }),
  voice_pca_strengths: z.string().description('PCA Steering')
    .extra('extra', {
      wtype: 'textarea', order: 1, group: 'qvoice', zone: 'mods',
      tooltip: 'JSON knobs over the embedding\'s principal components, e.g. {"pca_pc1.dir": 0.5} — subtle voice direction without re-designing the persona.',
    }),
})

export function apply(ctx: Context): void {
  // methods are called ON the service (never destructured — a
  // destructured method loses its receiver; registry.ts:92)
  ctx.effect(() => ctx.comfyui.registerPack({ pack: 'loras', fields: LorasFields as never }))
  ctx.effect(() => ctx.comfyui.registerPack({ pack: 'controlnet', fields: ControlNetFields as never }))
  ctx.effect(() => ctx.comfyui.registerPack({ pack: 'ip_adapter', fields: IPAdapterFields as never }))
  ctx.effect(() => ctx.comfyui.registerPack({ pack: 'lanpaint', fields: LanpaintFields as never }))
  ctx.effect(() => ctx.comfyui.registerPack({ pack: 'mask', fields: MaskFields as never }))
  ctx.effect(() => ctx.comfyui.registerPack({ pack: 'qvoice', fields: QvoiceFields as never }))
}
