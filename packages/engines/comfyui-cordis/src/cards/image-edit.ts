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
import { imageEdit, refuseImageEditFiring, finalizeImageEdit } from '../kit.ts'

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
  image2: z.string().role('path').description('Image 2').extra('extra', { group: 'input', zone: 'inputs' }),
  image3: z.string().role('path').description('Image 3').extra('extra', { group: 'input', zone: 'inputs' }),
  reference_images: z.array(z.string()).default([]).description(
    'Multi-image picker (up to 3). Used by workflows needing image sets.').extra(
      'extra', { serveDefault: true, group: 'input', zone: 'inputs' }),
  prompt: z.string().description('Prompt').extra('extra', { required: true, group: 'prompt', zone: 'params' }),
  negative_prompt: z.string().description('Negative Prompt').extra('extra', { group: 'prompt', zone: 'params' }),
  seed: z.number().min(-1).step(1).default(-1).description('Seed').extra('extra', { group: 'resolution', zone: 'params' }),
  steps: z.number().min(1).max(50).default(4).description('Steps').extra('extra', { group: 'sampling', zone: 'params' }),
  cfg: z.number().min(0.1).max(10).default(1.0).description(
    'Qwen-Image-Edit uses low CFG (flow-matching).').extra('extra', { group: 'sampling', zone: 'params' }),
  sampler: z.string().description(
    'Sampler — options resolve from the $samplers vocabulary at serve time').extra('extra', { group: 'sampling', zone: 'params' }),
  scheduler: z.string().description(
    'Scheduler — options resolve from the $schedulers vocabulary at serve time').extra('extra', { group: 'sampling', zone: 'params' }),
  use_stock_nodes: z.boolean().default(false).description(
    'When true, build_img2img_edit emits the stock graph unmodified.').extra('extra', { group: 'edit_tuning', zone: 'params' }),
  double_reference: z.boolean().default(false).description(
    'Encode the input image twice (VAE + vision encoder) — stronger identity retention.').extra('extra', { group: 'edit_tuning', zone: 'params' }),
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
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
  })
}
