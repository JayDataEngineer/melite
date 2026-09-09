// Tier 3 — the image-edit card (the image_edit renderer port).
// The anchored edit lane: loaders → lora stack → text pair → per
// -slot LoadImage anchors → TextEncodeQwenImageEditPlus pair →
// VAEEncode (the anchor itself) → KSampler → VAEDecode → SaveImage
// under "<runId>/edit" (the lane-local prefix — NOT image-gen's
// /gen). Creation order IS node-id order (pinned by
// tests/golden_cordis/image_qwen-img-edit_*).
//
// SURFACE (34 keys — card.py core + Lanpaint/Loras/MaskMod absorption;
// model.py defaults ride the service cascade, never the schema).
// Purge S-decls: the py referee is deleted — the schema below IS the
// declaration (its knob set was verified 19/19 against the retired row).
// Defaults ride-the-model (the image-gen P2 precedent): a py-ABSENT
// default is a bare atom (no .default()), and compose reads the key
// with `?? ''` / `?? []` normalization — never a TS-pinned ''/0/[].
//
// WIRING (kit: imageEdit over render-kit.ts — loadTextPair,
// decodeSave, stackLoras): image2/image3 ride the STOCK node's native optional
// slots (comfy_extras nodes_qwen TextEncodeQwenImageEditPlus takes
// image1/2/3) via conditional LoadImages — blank slots stay out of
// the inputs entirely, so plain graphs are byte-stable. use_stock_
// nodes rides inert both ways: this plane builds the stock graph and
// nothing else (the stock-only verdict below), so true asks for
// exactly what it gets and false's patches can never trigger (every
// patch trigger refuses). Everything else that would change the
// graph (reference_images slot mapping, double_reference's second
// encode, the lanpaint sampler + knobs, the outpaint pad chain, the
// mask prep/region flow) REFUSES field-named instead of silently
// plain-editing (the retired python MOD FIRING LAW, ported 1:1 —
// admission is the surface, firing is compose's call).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { imageEdit, refuseImageEditFiring, finalizeImageEdit } from '@melite/card-kit'
import { SAMPLERS, SCHEDULERS } from '@melite/card-kit/vocab'

const schema = z.object({
  // CARD-OWNED SURFACE ONLY (2026-09-08, the 1:1 port): the py
  // referee (frozen form_spec qwen-img-edit-2511) names exactly
  // these as the card's own — declaration order = the py field
  // order. EVERY mod-owned knob (image1 — the lanpaint brick's
  // anchor slot; lanpaint_*; outpaint_*; loras; mask/input_mask/
  // mask_*) lives in mods/{lanpaint,loras,mask}.ts registering
  // through ctx.comfyui.registerMod (the py _absorb_models
  // interlock). Schemastery passes unknown keys through, so
  // compose still reads p.image1/p.loras/... — validation of
  // required anchors stays in compose (the gate below), exactly
  // the py split: the mod declares the editor surface, compose
  // owns firing.
  image2: z.string().role('path').description("Image 2").extra('extra', { order: 0, group: "input", width: 1, zone: 'inputs', wtype: 'image' }),
  image3: z.string().role('path').description("Image 3").extra('extra', { order: 1, group: "input", width: 1, zone: 'inputs', wtype: 'image' }),
  reference_images: z.array(z.string()).description("Reference Images").default([]).extra('extra', { order: 2, group: "input", tooltip: "Multi-image picker (up to 3). Used by workflows that pass resolved image lists; complements the individual Image 2 / Image 3 slots above.", wtype: 'image_list' }),
  prompt: z.string().description("Prompt").extra('extra', { order: 0, group: "prompt", columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea', }),
  negative_prompt: z.string().description("Negative Prompt").extra('extra', { order: 1, group: "prompt", width: 1, zone: 'params', wtype: 'textarea' }),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', { order: 4, group: "resolution", width: 1, zone: 'params' }),
  steps: z.number().description("Steps").min(1).max(50).step(1).default(4).extra('extra', { order: 0, group: "sampling", width: 1, zone: 'params', wtype: 'number' }),
  cfg: z.number().description("Guidance Scale").min(0.1).max(10).step(0.1).default(1).extra('extra', { order: 1, group: "sampling", width: 1, tooltip: "Qwen-Image-Edit uses low CFG (flow-matching).", zone: 'params' }),
  sampler: SAMPLERS.description("Sampler").extra('extra', { order: 2, group: "sampling", width: 1, zone: 'params', wtype: 'select' }),
  scheduler: SCHEDULERS.description("Scheduler").extra('extra', { order: 3, group: "sampling", width: 1, zone: 'params', wtype: 'select' }),
  use_stock_nodes: z.boolean().description("Use Stock Nodes").default(false).extra('extra', { order: 1, group: "edit_tuning", width: 1, tooltip: "When true, build_img2img_edit emits the stock Qwen-Image-Edit node graph (no DiffSynth patches, no custom ControlNet wiring). Useful for reproducing upstream behavior exactly.", zone: 'params' }),
  double_reference: z.boolean().description("Double Reference").default(false).extra('extra', { order: 2, group: "edit_tuning", width: 1, tooltip: "Encode the input image twice (VAE + vision encoder) for stronger identity preservation. Disable for faster runs where identity drift is acceptable.", zone: 'params' }),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'image-edit',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'edit',
    // stock-only lane (the python_module verdict, image-gen's card-1
    // lesson): TextEncodeQwenImageEditPlus is comfy_extras.nodes_qwen
    // and ModelSamplingAuraFlow is comfy_extras.nodes_model_advanced
    // — both core; the qweneditutils/vnccs_utils rows in the
    // extension map over-claim core nodes. No requires to declare.
    boarded: ['qwen-img-edit-2511'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      if (!p.prompt || !(p.prompt as string).trim()) {
        throw new Error("required param 'prompt' missing or empty on the image-edit card (WHAT to change, not the whole image)")
      }
      if (!p.image1 || !(p.image1 as string).trim()) {
        throw new Error("required param 'image1' missing on the image-edit card (the edit is anchored on it)")
      }
      refuseImageEditFiring(p)
      imageEdit(p, model, g, runId)
    },
    finalize: finalizeImageEdit,
  }))
}
