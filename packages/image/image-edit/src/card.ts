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
  use_stock_nodes: z.boolean().description("Use Stock Nodes").default(false).extra('extra', { order: 1, group: "edit_tuning", width: 1, visible_when: 'model=qwen-img-edit-2511', tooltip: "When true, build_img2img_edit emits the stock Qwen-Image-Edit node graph (no DiffSynth patches, no custom ControlNet wiring). Useful for reproducing upstream behavior exactly.", zone: 'params' }),
  double_reference: z.boolean().description("Double Reference").default(false).extra('extra', { order: 2, group: "edit_tuning", width: 1, visible_when: 'model=qwen-img-edit-2511', tooltip: "CURRENTLY UNBUILDABLE on this plane (agent-debt F-4, 2026-09-22): true fires a LOUD refusal — the TS plane builds the stock plain-edit graph only, never a silent plain-edit. Leave false. (When the double-encode lane exists: encode the input image twice — VAE + vision encoder — for stronger identity preservation.)", zone: 'params' }),
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
export const BOARDED: string[] = [qwenImgEdit21Decl.id, 'qwen-img-edit-2511']

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
    'An input_mask alongside image1 in auto switches the 2511 lane to the LanPaint inpaint sampler (the masked region regenerates, the rest is preserved); the 2.1 lane refuses auto+mask field-named — state crop_stitch there',
    'Region Mode crop_stitch runs the generic region detailer instead, on BOTH lanes (the operator\'s 2.1 rides its cache-wrapped model + encoder conditioning): region → SEGS → DetailerForEach crop/edit/paste — pixels outside the region never change; the region is the painted mask, or pick a detector (person/face/hand) and the Impact chain proposes it',
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
    provisions: [
      {
        name: 'person_yolov8m-seg.pt',
        url: 'https://huggingface.co/Bingsu/adetailer/resolve/main/person_yolov8m-seg.pt',
        folder: 'ultralytics/segm',
        sha256: 'c8ab26f517173b1fe8342d336a09f443eb61cb08dcbfc78d53fff4c2547ae81e',
        size_bytes: 54827683,
      },
      {
        name: 'face_yolov8m.pt',
        url: 'https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt',
        folder: 'ultralytics/bbox',
        sha256: '717923c19b3fbbf5250b728f1fa6b2cb72a33aed1d236ea9caf0e21ad943e5f',
        size_bytes: 52026019,
      },
      {
        // THE LIVE-ENGINE PIN (proven against :8188's provider list,
        // 2026-09-22): this engine ships the s-variant; the n-variant
        // was a stale copy that would refuse at execute time.
        // sha256/size minted from the on-disk file.
        name: 'hand_yolov8s.pt',
        url: 'https://huggingface.co/Bingsu/adetailer/resolve/main/hand_yolov8s.pt',
        folder: 'ultralytics/bbox',
        sha256: '70b540063fbc385736d8258970744a4afbc4cbf7932134bae3b24cdadeadec06',
        size_bytes: 22507643,
      },
    ],
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
      if (detector === 'person') return ['person_yolov8m-seg.pt']
      if (detector === 'face') return ['face_yolov8m.pt']
      if (detector === 'hand') return ['hand_yolov8s.pt']
      return []
    },
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
