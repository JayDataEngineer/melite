// Tier 3 — the image-edit card (the image_edit renderer port).
// The anchored edit lane: loaders → lora stack → text pair → per
// -slot LoadImage anchors → TextEncodeQwenImageEditPlus pair →
// EITHER VAEEncode (the anchor itself) → KSampler → VAEDecode →
// SaveImage, OR — with input_mask stated — the lanpaint arm
// (mask prep → LanPaint_ImageEncode → LanPaint_KSamplerAdvanced →
// LanPaint_ImageDecode → SaveImage), both under "<runId>/edit"
// (the lane-local prefix — NOT image-gen's /gen). Creation order IS node-id order.
//
// SURFACE (34 keys — core + Lanpaint/Loras/MaskMod absorption;
// model.defaults ride the service cascade, never the schema).
// Purge S-decls: the referee is deleted — the schema below IS the
// declaration (its knob set was verified 19/19 against the retired row).
// Defaults ride-the-model (the image-gen P2 precedent): a ABSENT
// default is a bare atom (no .default()), and compose reads the key
// with `?? ''` / `?? []` normalization — never a TS-pinned ''/0/[].
//
// WIRING (kit: imageEdit over render-kit.ts — loadTextPair,
// decodeSave, stackLoras): the lane merges ONE reference order —
// legacy image2/image3 (hidden aliases, old drafts/agents/flows)
// FIRST, then the reference_images stack — and maps it per lane:
// 2511 onto the STOCK node's native image2/image3 optionals (blank
// refs stay out of the inputs entirely, so plain and legacy-only
// graphs are byte-stable); 2.1 contiguously onto the encoder's
// images.image_2+ autogrow slots, in order (the node opens inputs
// as filled, up to 16; the form's add-cell IS that UX). NOTE the
// one renumber: pre-unification 2.1 drafts with a STACK mapped it
// at image_4+ (named slots reserved 2/3); the unified order maps
// contiguously from image_2, so stacked 2.1 graphs re-compose to
// new slot keys — legacy-only drafts are unaffected.
// use_stock_
// nodes rides inert both ways: this plane builds the stock graph and
// nothing else (the stock-only verdict below), so true asks for
// exactly what it gets and false's patches can never trigger (every
// patch trigger refuses). Everything else that would change the
// graph (the 2511 lane's over-2 references — the 2.1 arm maps the
// full order, double_reference's second
// encode, the lanpaint sampler + knobs, the outpaint pad chain, the
// mask prep/region flow) REFUSES field-named instead of silently
// plain-editing (the retired python MOD FIRING LAW, ported 1:1 —
// admission is the surface, firing is compose's call).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { imageEdit, refuseImageEditFiring, finalizeImageEdit } from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { SAMPLERS, SCHEDULERS } from '@melite/comfyui-card-kit/vocab'
import { samplingExtra } from '@melite/comfyui-card-kit/fields'
import { DECL as qwenImgEdit21Decl } from '@melite/models-qwen-img-edit-21'
import { DECL as qwenImgEdit2511Decl } from '@melite/models-qwen-img-edit-2511'

// THE STACK CAP (the max_images law — the card RIDES the models'
// DECLs, never a hardcoded count): the roomiest boarded lane's
// total image inputs minus the anchor. A boarded family WITHOUT
// max_images breaks card registration LOUD (fail-loud over the
// degenerate 1 — a missing cap is a DECL bug, and the degenerate
// floor would silently disagree with the lane's narrow end).
export const declCap = (d: { id: string; lane_inputs?: Record<string, unknown> }): number => {
  const v = d.lane_inputs?.max_images
  if (typeof v === 'number' && Number.isFinite(v) && v >= 1) return Math.floor(v)
  throw new Error(`image-edit card: boarded family '${d.id}' declares no lane_inputs.max_images (the max_images law — the node's own image-input count)`)
}
const EDIT_STACK_CAP = Math.max(declCap(qwenImgEdit2511Decl), declCap(qwenImgEdit21Decl)) - 1

export const schema = z.object({  // CARD-OWNED SURFACE ONLY (2026-09-08, the 1:1 port): declaration
  // order = the field order. image1 IS THE PLAIN ANCHOR (2026-09-21,
  // the 2.1 rework: it rode the lanpaint mod and was therefore
  // 2511-hardcoded — the naming law makes the ANCHOR card-owned so
  // every edit lane admits it; 2511's lanpaint flavor keeps its
  // inpaint knobs mod-owned, the admission union serves both).
  // Remaining mod-owned knobs (lanpaint_*; outpaint_*; loras;
  // mask/input_mask/
  // mask_*) live in mods/{lanpaint,loras,mask}.ts registering
  // through ctx.comfyui.registerMod (the _absorb_models
  // interlock). Schemastery passes unknown keys through, so
  // compose still reads p.image1/p.loras/... — validation of
  // required anchors stays in compose (the gate below), exactly
  // the split: the mod declares the editor surface, compose
  // owns firing.
  image1: z.string().role('path').description("Image 1").extra('extra', { order: -1, group: "input", width: 1, zone: 'inputs', wtype: 'image', tooltip: 'The edit anchor — the image to edit.' }),
  // THE LEGACY ALIASES (the unification: image inputs and reference
  // images are ONE concept — the anchor plus the reference stack
  // below. image2/image3 were the stock node's native slot names
  // showing as a second input row for the same thing; they no longer
  // render. They stay DECLARED with hidden:true — validation-only
  // gate keys, never a face (the walker's hidden arm) — so old
  // drafts, agents, and flow edges stating them still validate, and
  // compose merges them to the FRONT of the reference order).
  image2: z.string().role('path').description("Image 2").extra('extra', { hidden: true }),
  image3: z.string().role('path').description("Image 3").extra('extra', { hidden: true }),
  // reference_images is THE reference stack — ONE row, both lanes
  // (the unification: no visible_when, no second input concept).
  // The cap RIDES the boarded DECLs (EDIT_STACK_CAP above — the
  // roomiest lane's max_images minus the anchor); each lane refuses
  // past its own DECL cap LOUD at compose (the firing law, never a
  // silent drop).
  reference_images: z.array(z.string()).description("Reference Images").default([]).extra('extra', { order: 2, group: "input", max_stack: EDIT_STACK_CAP, tooltip: "Reference images — one square per entry, the add-cell opens the next until the roomiest lane's DECL cap. Each lane splices what its max_images allows (2511: 2 through the stock image2/image3, 2.1: 15 from the encoder's images.image_2) and refuses past that LOUD.", wtype: 'image_list' }),
  prompt: z.string().description("Prompt").extra('extra', { order: 0, group: "prompt", columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea', }),
  negative_prompt: z.string().description("Negative Prompt").extra('extra', { order: 1, group: "prompt", width: 1, zone: 'params', wtype: 'textarea' }),
  width: z.number().description("Width").extra('extra', { order: 0, group: 'resolution', columns: 3, width: 1, zone: 'params', wtype: 'number', visible_when: 'model=qwen-img-edit-21', tooltip: 'Target resolution — the Qwen Image 2.1 lane edits at target size (hidden on 2511, which edits at source resolution and refuses a stated value).' }),
  height: z.number().description("Height").extra('extra', { order: 1, group: 'resolution', columns: 3, width: 1, zone: 'params', wtype: 'number', visible_when: 'model=qwen-img-edit-21', tooltip: 'Target resolution — the Qwen Image 2.1 lane edits at target size (hidden on 2511, which edits at source resolution and refuses a stated value).' }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: 4, group: "sampling", width: 1, zone: 'params' }),
  steps: z.number().description("Steps").min(1).max(50).step(1).default(4).extra('extra', samplingExtra('steps')),
  cfg: z.number().description("Guidance Scale").min(0.1).max(10).step(0.1).default(1).extra('extra', samplingExtra('cfg', { tooltip: "Qwen-Image-Edit uses low CFG (flow-matching)." })),
  sampler: SAMPLERS.description("Sampler").extra('extra', samplingExtra('sampler')),
  scheduler: SCHEDULERS.description("Scheduler").extra('extra', samplingExtra('scheduler')),
  use_stock_nodes: z.boolean().description("Use Stock Nodes").default(false).extra('extra', { order: 1, group: "edit_tuning", width: 1, visible_when: 'model=qwen-img-edit-2511', tooltip: "When true, build_img2img_edit emits the stock Qwen-Image-Edit node graph (no DiffSynth patches, no custom ControlNet wiring). Useful for reproducing upstream behavior exactly.", zone: 'params' }),
  double_reference: z.boolean().description("Double Reference").default(false).extra('extra', { order: 2, group: "edit_tuning", width: 1, visible_when: 'model=qwen-img-edit-2511', tooltip: "Encode the input image twice (VAE + vision encoder) for stronger identity preservation. Disable for faster runs where identity drift is acceptable.", zone: 'params' }),
})

// THE BOARDING (2026-09-21, the naming law): the card names its
// LANES — the family ids name models+versions, never operations.
// 2511: the dedicated edit checkpoint (VAEEncode-of-source lane);
// 2.1: the unified base — its edit rides QwenImage21Cache over the
// SAME weights as t2i (branch by lane_inputs.text_encode_node).
export const BOARDED: string[] = ['qwen-img-edit-2511', qwenImgEdit21Decl.id]

/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
  label: 'Edit Image',
  description: 'Instruction-driven image editing — the edit_image interface card boarding the qwen image edit LANES: qwen-img-edit-2511 (the dedicated edit checkpoint — lightning/standard cascade, lanpaint flavor) and qwen-img-edit-21 (the cached-reference edit lane of the same 2.1 weights as the t2i sibling family). The family names the model, the card names the operation. The surface scopes itself.',
  genre: 'image',
  icon: 'edit',
  principles: [
    'image1 is required — the edit is anchored on it (slots image1..image3, input_image is the retired alias; image2/image3 are hidden legacy aliases merging to the reference front)',
    'references are ONE stack — Reference Images rides both lanes up to each lane DECL max_images (the roomiest boarded cap sizes the form face); there is no second input row for the same concept',
    'Qwen-Image-Edit uses low CFG (flow-matching) — the Guidance Scale slider tops out at 10.0',
    'An input_mask alongside image1 switches the builder to the LanPaint inpaint sampler (LanPaint_KSamplerAdvanced — the masked region regenerates, the rest is preserved)',
    'Region Mode stays auto — crop_stitch/full_frame need chains this plane does not build',
    'Mask prep (grow/feather/invert) rides in-graph ahead of the sampler; re-threshold has no node and refuses non-zero',
    'Iterate HERE, not in video — an edit costs seconds, a render minutes; name what changes, state the rest as unchanged',
    'Previous card outputs ride as artifact URLs (/v1/assets/runs/<run>/<file>); the compose resolves them to data/runs/output/<run>/<file> and stages into the comfy input dir (phase 1 validates on the mounts BEFORE registration)',
  ],
}

export function registerCard(ctx: Context, comfy: ComfyUIService): void {
  ctx.effect(() => comfy.registerCard({
    id: 'image-edit',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'edit',
    // stock-only lane (the python_module verdict, image-gen's card-1
    // lesson): TextEncodeQwenImageEditPlus is comfy_extras.nodes_qwen
    // and ModelSamplingAuraFlow is comfy_extras.nodes_model_advanced
    // — both core; the qweneditutils/vnccs_utils rows in the
    // extension map over-claim core nodes. No requires to declare.
    boarded: [...BOARDED],
    tags: ['image', 'edit'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'image-edit', order: 2 },
    flowKinds: {
      // THE INPUT SIGNATURE (the unification: the anchor plus the
      // legacy named edges). image2/image3 stay declared as flow
      // edges for old graphs wiring them — they seat NO rail square
      // (hidden legacy aliases, never a face) and compose merges
      // them to the reference front. reference_images is NOT a slot:
      // the old system declared it (workflows pass resolved image lists
      // through it) but NEVER rendered it — no input_slots entry, no
      // slot component anywhere in the old tree, and the params flow
      // excluded every non-params zone field. It renders as the
      // progressive stack and rides the params — still no flow edge
      // (the flow graph carries the list inside the stage params,
      // resolved at run).
      inputs: {
        prompt: 'text',
        image1: 'image',
        image2: 'image',
        image3: 'image',
      },
      outputs: { default: 'image' },
      requiresModel: false,
    },
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the audio-trio admission precedent — the
      // card's own declaration validates the last hop into the
      // engine): schemastery walk enforces declared types + bounds (a
      // steps=999 draft refuses LOUD here, never composes), fills
      // defaults, and passes the mod-plane surface (image1, lanpaint_*,
      // mask bags, loras) through verbatim — nothing drops. The
      // composer's reads below are reads of the GATED doc.
      const doc = schema(p) as Record<string, unknown>
      if (!doc.prompt || !(doc.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing or empty on the image-edit card (WHAT to change, not the whole image)")
      }
      if (!doc.image1 || !(doc.image1 as string).trim()) {
        throw new Error("required param 'image1' missing on the image-edit card (the edit is anchored on it)")
      }
      refuseImageEditFiring(doc, model)
      imageEdit(doc, model, g, runId)
    },
    finalize: finalizeImageEdit,
  }))
}
