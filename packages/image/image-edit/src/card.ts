// Tier 3 — the image-edit card (the image_edit renderer port).
// The anchored edit lane: loaders → lora stack → text pair → per
// -slot LoadImage anchors → TextEncodeQwenImageEditPlus pair →
// EITHER VAEEncode (the anchor itself) → KSampler → VAEDecode →
// SaveImage, OR — with input_mask stated — the lanpaint arm
// (mask prep → LanPaint_ImageEncode → LanPaint_KSamplerAdvanced →
// LanPaint_ImageDecode → SaveImage), both under "<runId>/edit"
// (the lane-local prefix — NOT image-gen's /gen). Creation order IS node-id order.
//
// SURFACE (35 keys — core + Lanpaint/Loras/MaskMod absorption;
// model.defaults ride the service cascade, never the schema).
// Purge S-decls: the referee is deleted — the schema below IS the
// declaration (its knob set was verified 19/19 against the retired row).
// Defaults ride-the-model (the image-gen P2 precedent): a ABSENT
// default is a bare atom (no .default()), and compose reads the key
// with `?? ''` / `?? []` normalization — never a TS-pinned ''/0/[].
//
// WIRING (kit: imageEdit over render-kit.ts — loadTextPair,
// decodeSave, stackLoras): the lane reads ONE ordered list —
// input_images verbatim, else the legacy merge (image1 the anchor,
// then image2/image3, then the reference_images stack) — and
// maps it per lane:
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
import {
  finalizeImageEdit,
  imageEdit,
  impactArmNames,
  IMPACT_DETECTOR_PROVISIONS,
  orderedInputImages,
  refuseImageEditFiring,
} from '@melite/comfyui-card-kit'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'
import { SAMPLERS, SCHEDULERS } from '@melite/comfyui-card-kit/vocab'
import { samplingExtra } from '@melite/comfyui-card-kit/fields'
import { DECL as qwenImgEdit21Decl } from '@melite/models-qwen-img-edit-21'
import { DECL as qwenImgEdit2511Decl } from '@melite/models-qwen-img-edit-2511'
import { bag } from '@melite/contracts/extraKeys'

// THE STACK CAP (the max_images law — the card RIDES the models'
// DECLs, never a hardcoded count): the roomiest boarded lane's
// total image inputs, anchor included. A boarded family WITHOUT
// max_images breaks card registration LOUD (fail-loud over the
// degenerate 1 — a missing cap is a DECL bug, and the degenerate
// floor would silently disagree with the lane's narrow end).
export const declCap = (d: { id: string; lane_inputs?: Record<string, unknown> }): number => {
  const v = d.lane_inputs?.max_images
  if (typeof v === 'number' && Number.isFinite(v) && v >= 1) return Math.floor(v)
  throw new Error(`image-edit card: boarded family '${d.id}' declares no lane_inputs.max_images (the max_images law — the node's own image-input count)`)
}
const EDIT_LIST_CAP = Math.max(declCap(qwenImgEdit2511Decl), declCap(qwenImgEdit21Decl))

export const schema = z.object({  // CARD-OWNED SURFACE ONLY (2026-09-08, the 1:1 port): declaration
  // order = the field order. image1 IS THE PLAIN ANCHOR (2026-09-21,
  // the 2.1 rework: it rode the lanpaint mod and was therefore
  // 2511-hardcoded — the naming law makes the ANCHOR card-owned so
  // every edit lane admits it; 2511's lanpaint flavor keeps its
  // inpaint knobs mod-owned, the admission union serves both).
  // Remaining mod-owned knobs (lanpaint_*; outpaint_*; loras;
  // mask/
  // mask_*) live in mods/{lanpaint,loras,mask}.ts registering
  // through ctx.comfyui.registerMod (the _absorb_models
  // interlock). Schemastery passes unknown keys through, so
  // compose still reads p.image1/p.loras/... — validation of
  // required anchors stays in compose (the gate below), exactly
  // the split: the mod declares the editor surface, compose
  // owns firing. ONE EXCEPTION (the mask-seat gate key,
  // 2026-10-09): input_mask is ALSO declared below as a hidden
  // validation-only key — the flow contract gate reads the card's
  // own carrier only (packs register after cards, so absorbed
  // mod fields can never satisfy it), and the mask→edit flow
  // seat must name a carrier key. Hidden = unserved: no form
  // row (the mask pack owns the visible Region Mask row), no
  // tool param — the seat lives on flowKinds.inputs alone.
  // THE ONE LIST (the operator's merge, ordered three times, landed
  // 2026-10-10): input images and reference images are ONE concept —
  // the node's own image_1..image_N slots, position 0 = the image
  // being edited, the rest = references the prompt cites as
  // <image2>, <image3>… ONE visible face speaks it. The legacy
  // spellings (image1 the anchor, image2/image3 the numbered slots,
  // reference_images the stack) stay DECLARED hidden:true —
  // validation-only aliases merging into the SAME ordered list
  // (anchor first, numbered next, stack after) so old drafts, flow
  // edges, and spells keep validating and recompose byte-stable —
  // but no face offers them: never a form row, never a picker seat.
  input_images: z.array(z.string()).description("Input Images").default([]).extra('extra', bag({ order: -1, group: "input", width: 1, zone: 'inputs', wtype: 'image_list', max_stack: EDIT_LIST_CAP, serveDefault: true, tooltip: 'Ordered input images — the FIRST is the image being edited; the rest are references the prompt can cite as <image2>, <image3>… in order. Capacity follows the boarded model; more than it admits refuses loudly.' })),
  image1: z.string().role('path').description("Input Image").extra('extra', bag({ hidden: true })),
  image2: z.string().role('path').description("Image 2").extra('extra', bag({ hidden: true })),
  image3: z.string().role('path').description("Image 3").extra('extra', bag({ hidden: true })),
  reference_images: z.array(z.string()).description("Reference Images").extra('extra', bag({ hidden: true })),
  // THE MASK-SEAT GATE KEY (2026-10-09 — the gap the operator's
  // rework caught: the mask card's seg producer had no seat on
  // this card, so mask→edit could not wire). input_mask's VISIBLE
  // face stays mod-owned (the mask pack's Region Mask row); this
  // hidden carrier key exists ONLY so the flow contract gate (the
  // card's own carrier — packs compose after cards) admits the
  // input_mask: 'seg' seat below. Hidden = unserved: never a form
  // row, never a tool param — one concept, one visible name.
  input_mask: z.string().role('path').description("Region Mask").extra('extra', bag({ hidden: true })),
  prompt: z.string().description("Prompt").extra('extra', bag({ order: 0, group: "prompt", columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea', })),
  negative_prompt: z.string().description("Negative Prompt").extra('extra', bag({ order: 1, group: "prompt", width: 1, zone: 'params', wtype: 'textarea' })),
  // WIDTH/HEIGHT (the visible_when guard is DEAD — fix shape 2):
  // the 2.1 DECL's params surface serves these rows (the form hides
  // a field the boarded lane does not declare, from the declaration
  // itself); on 2511 the bench-write door refuses a stated size in
  // the field's voice — the same judgment the guard used to
  // describe, now authored where the lane is. The pair rides
  // together (the DECL's relation word): both or neither.
  width: z.number().description("Width").extra('extra', bag({ order: 0, group: 'resolution', columns: 3, width: 1, zone: 'params', wtype: 'number', tooltip: 'Target resolution — the 2.1 lane edits at target size (both axes together, never one alone).' })),
  height: z.number().description("Height").extra('extra', bag({ order: 1, group: 'resolution', columns: 3, width: 1, zone: 'params', wtype: 'number', tooltip: 'Target resolution — the 2.1 lane edits at target size (both axes together, never one alone).' })),
  seed: z.number().description("Seed").step(1).default(-1).extra('extra', bag({ order: 4, group: "sampling", width: 1, zone: 'params' })),
  // RIDE-THE-MODEL (operator catch e, 2026-09-22): steps/cfg carry
  // NO schema default — a default here is one lane's recipe served
  // as universal (4/1 is the LIGHTNING recipe; standard weights
  // sampled at 4 steps made the washed-out edits the operator
  // caught). The family DECL owns the default (2511 standard
  // 20/2.5, 2.1 25/1) through the service cascade, and the served
  // tool face advertises none.
  steps: z.number().description("Steps").min(1).max(50).step(1).extra('extra', samplingExtra('steps')),
  cfg: z.number().description("Guidance Scale").min(0.1).max(10).step(0.1).extra('extra', samplingExtra('cfg', { tooltip: "Qwen-Image-Edit uses low CFG (flow-matching); leave unset — the model's own recipe is the default." })),
  sampler: SAMPLERS.description("Sampler").extra('extra', samplingExtra('sampler')),
  scheduler: SCHEDULERS.description("Scheduler").extra('extra', samplingExtra('scheduler')),
  // THE EDIT-TUNING PAIR (the visible_when guard is DEAD — fix
  // shape 2): these rows are the 2511 DECL's params surface — the
  // form serves them only when the 2511 lane is boarded (the
  // declaration owns the field list), and the bench-write door
  // refuses them on the 2.1 family in the field's voice.
  use_stock_nodes: z.boolean().description("Use Stock Nodes").default(false).extra('extra', bag({ order: 1, group: "edit_tuning", width: 1, tooltip: "When true, build_img2img_edit emits the stock Qwen-Image-Edit node graph (no DiffSynth patches, no custom ControlNet wiring). Useful for reproducing upstream behavior exactly.", zone: 'params' })),
  double_reference: z.boolean().description("Double Reference").default(false).extra('extra', bag({ order: 2, group: "edit_tuning", width: 1, tooltip: "CURRENTLY UNBUILDABLE on this plane (agent-debt F-4, 2026-09-22): true fires a LOUD refusal — the TS plane builds the stock plain-edit graph only, never a silent plain-edit. Leave false. (When the double-encode lane exists: encode the input image twice — VAE + vision encoder — for stronger identity preservation.)", zone: 'params' })),
})

// THE BOARDING (2026-09-21, the naming law; order flipped 2026-09-22,
// operator catch e): the card names its LANES — the family ids name
// models+versions, never operations. 2.1 IS THE DEFAULT (first =
// the tool's defaultModel, the GUI enum's head, discovery's face):
// it is the LATEST lane and the one whose weights this box ships.
// 2511 is the BACKUP — the dedicated edit checkpoint
// (VAEEncode-of-source lane); its standard INT8 ConvRot weights
// ride provision, its Lightning variant needs its own FP8 file.
// 2.1's edit arm branches by lane_inputs.text_encode_node.
// BOTH IDS COME FROM THEIR DECLS (the card audit's M1): the 2511 DECL
// was imported and its id retyped as a literal, so a rename broke the card
// at runtime (not-boarded) with every wall green.
export const BOARDED: string[] = [qwenImgEdit21Decl.id, qwenImgEdit2511Decl.id]

/** The identity rung (label/description — the authored prose the
 *  emitted tool row carries; the ring's spelling, stated once). */
export const identity = {
  label: 'Edit Image',
  description: 'Instruction-driven image editing — the edit_image interface card boarding the qwen image edit LANES: qwen-img-edit-2511 (the dedicated edit checkpoint — lightning/standard cascade, lanpaint flavor) and qwen-img-edit-21 (the cached-reference edit lane of the same 2.1 weights as the t2i sibling family). The family names the model, the card names the operation. The surface scopes itself.',
  genre: 'image',
  icon: 'edit',
  principles: [
    'ONE ordered input list (the merge, 2026-10-10): input_images — the FIRST image is the one being edited, the rest are references the prompt cites as <image2>, <image3>…; image1/image2/image3/reference_images are hidden legacy aliases merging into the same list (anchor, numbered, then stack) so old drafts recompose byte-stable',
    'the list capacity rides each lane DECL\'s max_images (2.1: 16 total, 2511: 3 total — anchor included); a list past the lane cap refuses loudly, never drops quietly',
    'Qwen-Image-Edit uses low CFG (flow-matching) — the Guidance Scale slider tops out at 10.0',
    'Without a mask modifier, image editing is whole-image by default; a mask modifier opts into masked-region editing',
    'An input_mask alongside image1 in auto switches the 2511 lane to the LanPaint inpaint sampler (the masked region regenerates, the rest is preserved); the 2.1 lane refuses auto+mask field-named — state crop_stitch there',
    'Masked region (crop_stitch) runs the generic region detailer instead, on BOTH lanes (the operator\'s 2.1 rides its cache-wrapped model + encoder conditioning): region → SEGS → DetailerForEach crop/edit/paste — pixels outside the region never change; the region is the painted mask, or pick a detector (person/face/hand) and the Impact chain proposes it',
    'Region detail rides mask_detail_size (working size) + mask_denoise (rework strength); grow + context pad compose the region halo, feather blends the paste',
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
    // THE DECLARED DETECTORS (the crop_stitch law — "declared, then
    // auto provisioned"): the automated region source rides the
    // Impact Pack's OWN specialized detectors (the subpack provider
    // reads models/ultralytics/<segm|bbox/>): person/face/hand — the
    // same bytes the mask card declares (hashes minted by direct
    // download, the supply-chain law). The compose door checks them
    // ONLY when a crop_stitch run actually touches a detector (an
    // unused arm never blocks a run).
    provisions: [...IMPACT_DETECTOR_PROVISIONS],
    // THE ARM WEIGHTS (the silent-truncation law): a crop_stitch run
    // with a detector stated names that detector's row — auto mode
    // names nothing even when a detector is stated (the firing gate
    // refuses that combination field-named AFTER this read, so the
    // weight gate must not fire first and mask the real refusal).
    armWeights: (merged: Record<string, unknown>) => {
      // the bag merges UNDER flat params (explicit flat keys win) —
      // the same merge the firing gate reads, so a bag-stated
      // detector names its row too.
      const row: Record<string, unknown> = { ...merged }
      const bag = merged.mask
      if (Array.isArray(bag) && bag.length === 1 && typeof bag[0] === 'object' && bag[0] !== null) {
        for (const [k, v] of Object.entries(bag[0] as Record<string, unknown>)) {
          if (row[k] === undefined) row[k] = v
        }
      }
      if (((row.mask_mode ?? 'auto') as string) !== 'crop_stitch') return []
      const detector = ((row.mask_detector ?? 'off') as string)
      return impactArmNames([detector])
    },
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'image-edit', order: 2 },
    flowKinds: {
      // THE INPUT SIGNATURE (the merge, 2026-10-10): ONE seat for
      // the ONE concept — the ordered input list (first = the image
      // being edited, rest = references). Every legacy spelling
      // (image1, image2/image3, reference_images) leaves `inputs`
      // and rides legacyAliases: the lattice still derives kinds,
      // so old graphs wiring them keep validating, and compose
      // merges them into the same ordered list.
      inputs: {
        prompt: 'text',
        input_images: 'image_list',
        // THE MASK SEAT (2026-10-09 — the gap the operator's
        // rework caught): the mask card's seg producer feeds
        // input_mask — the mask→edit inpaint chain. The seat's
        // kind is seg (the mask card's product); the spelled mask
        // rides the lane's mask consumers as a tensor (the spell
        // arm), a path keeps LoadImageMask. The gate key rides the
        // hidden carrier input_mask above — the seat itself lives
        // here and nowhere else.
        input_mask: 'seg',
      },
      legacyAliases: {
        image1: 'image',
        image2: 'image',
        image3: 'image',
        reference_images: 'image_list',
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
      // THE ANCHOR GATE (the merge): ONE list, position 0 = the
      // image being edited. The gate reads the MERGED order —
      // input_images verbatim, else the legacy keys (image1 first,
      // image2/3, then reference_images) — and refuses a list with
      // no anchor. orderedInputImages refuses mixed vocabularies
      // loud; the lane re-pins the same laws for direct callers.
      if (orderedInputImages(doc).length === 0) {
        throw new Error("required param 'input_images' missing on the image-edit card (the first image is the one being edited — an ordered list; legacy drafts may state image1 alone instead)")
      }
      refuseImageEditFiring(doc, model)
      imageEdit(doc, model, g, runId)
    },
    finalize: finalizeImageEdit,
  }))
}
