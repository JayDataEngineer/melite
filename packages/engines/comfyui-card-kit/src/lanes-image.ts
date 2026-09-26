import { GraphBuilder, OutputHandle, stripAutofill } from './graph.ts'
import type { PromptGraph, StripTable } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import { loadTextPair, decodeSave, stackLoras, stackControlNets } from './blocks/render-kit.ts'
import { fireLoras, fireControlNets, refuseIPAdapterFiring } from './mods/guard.ts'
import { mintSeed } from './graph-helpers.ts'
import { IMPACT_DETECTORS } from './impact.ts'

// ── archetype I: the image-diffuse family ───────────────────────────
// Loader chain → lora stack → text pair → controlnet stack → latent
// → KSampler → decode → save. Pin defaults ride AUTOFILL; each
// lane's strip table is the engine's calibration,
// moved here verbatim.

/** Pin autofills the image_t2i lane strips post-walk for
 *  (moved verbatim from the image-gen card). */
export const IMAGE_GEN_STRIP: StripTable = {
  CLIPLoader: ['device'],
  KSampler: ['control_after_generate'],
}

export function finalizeImageGen(graph: PromptGraph): PromptGraph {
  return stripAutofill(graph, IMAGE_GEN_STRIP)
}

/** The image_t2i block — the shared text-to-image lane (moved
 *  verbatim from the image-gen card). */
export function imageT2I(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): OutputHandle {
  const li = model.lane_inputs
  // GATE S (the seed-sentinel contract, estate law): -1 is RANDOM —
  // the dice mints HERE in the lane (the skin lane's GATE S
  // precedent: mint at render so every node sharing the seed shares
  // the MINTED value); below -1 or a non-int refuses loud.
  const seed = mintSeed(p)
  let unet: OutputHandle = g.node('UNETLoader', { unet_name: li.unet, weight_dtype: 'default' }).out()
  if (li.sampling_shift) {
    unet = g.node('ModelSamplingAuraFlow', { model: unet, shift: li.sampling_shift }).out()
  }
  unet = stackLoras(g, unet, fireLoras(model, p))
  // THE IP-ADAPTER FIRING GATE (fate 'refused', the ray receipt):
  // no lane builds it in this plane — every stated entry refuses
  // LOUD here, before any node renders (ray's lane silently
  // skipped used entries; this plane never drops a reference
  // image quietly).
  refuseIPAdapterFiring(model, p)
  const { clip, vae } = loadTextPair(g, li)
  // THE 2.1 LANE (2026-09-21, the Comfy-Org Qwen-Image-2.1 release;
  // branch key = lane_inputs.text_encode_node — the latent_node
  // precedent, data never a family-id switch): ONE encoder node
  // emits positive AND negative (outputs [CONDITIONING,
  // CONDITIONING, LATENT] — the negative rides out index 1); the
  // resolution input sizes reference images only (t2i carries none
  // — 1024 is the official template's inert default).
  if (li.text_encode_node === 'TextEncodeQwenImage21') {
    const enc21 = g.node('TextEncodeQwenImage21', {
      clip, prompt: p.prompt, negative_prompt: p.negative_prompt ?? '', resolution: 1024,
    })
    const latent21 = g.node('EmptyLatentImage', { batch_size: 1, width: p.width, height: p.height })
    const sampled21 = g.node('KSampler', {
      seed,
      steps: p.steps,
      cfg: p.cfg,
      sampler_name: p.sampler,
      scheduler: p.scheduler,
      denoise: 1.0,
      latent_image: latent21.out(),
      model: unet,
      positive: enc21.out(0),
      negative: enc21.out(1),
    })
    return decodeSave(g, sampled21.out(), vae, `${runId}/gen`).out()
  }
  // THE CONTROLNET STACK (the z-image restoration): the fired picks
  // wrap the LoRA'd model — ModelPatchLoader → ZImageFunControlnet
  // per entry, array order = apply order. Empty picks = the bare
  // model (the plain path is byte-stable — no new nodes). THE SEAM
  // (the packs.ts lanpaint precedent): the node pair is z-image's —
  // a second controlnet family re-opens node selection inside
  // stackControlNets, never a silent node swap here.
  unet = stackControlNets(g, unet, vae, fireControlNets(model, p))
  const pos = g.node('CLIPTextEncode', { clip, text: p.prompt })
  const neg = g.node('CLIPTextEncode', { clip, text: p.negative_prompt ?? '' })
  const latent = g.node(String(li.latent_node), { batch_size: 1, width: p.width, height: p.height })
  const sampled = g.node('KSampler', {
    seed,
    steps: p.steps,
    cfg: p.cfg,
    sampler_name: p.sampler,
    scheduler: p.scheduler,
    denoise: 1.0,
    latent_image: latent.out(),
    model: unet,
    positive: pos.out(),
    negative: neg.out(),
  })
  return decodeSave(g, sampled.out(), vae, `${runId}/gen`).out()
}

/** Pin autofills the image_edit lane strips post-walk for
 *  (moved verbatim from the image-edit card). */
export const IMAGE_EDIT_STRIP: StripTable = {
  CLIPLoader: ['device'],
  LoadImage: [],
  KSampler: ['control_after_generate'],
}

export function finalizeImageEdit(graph: PromptGraph): PromptGraph {
  return stripAutofill(graph, IMAGE_EDIT_STRIP)
}

/** THE IMAGE CAPACITY (the max_images law — the card and the lane
 *  RIDE the model's DECL, never a hardcoded count): total image
 *  inputs the lane opens, anchor included (2511's stock node: 3;
 *  2.1's encoder: 16). A lane that never declared max_images gets
 *  the NARROW end (3) — loud-safe by construction: over-refusal is
 *  field-named and names the missing DECL, while guessing roomy
 *  would silently drop refs past the node's own slots. */
export function editImageCap(model?: ModelFacts): number {
  const declared = (model?.lane_inputs as Record<string, unknown> | undefined)?.max_images
  if (typeof declared === 'number' && Number.isFinite(declared) && declared >= 1) return Math.floor(declared)
  return 3
}

/** THE REFERENCE ORDER (the unification: image inputs and
 *  reference images are ONE concept — the anchor plus references).
 *  Legacy named slots (image2/image3 — hidden aliases from the
 *  stock node's vocabulary, still stated by old drafts, agents, and
 *  flow edges) merge FIRST, then the reference_images stack, blanks
 *  dropped — array order IS apply order on every lane. Garbage
 *  refuses LOUD (the never-drop law covers direct lane callers
 *  bypassing the schema door): a non-string ref or a non-list stack
 *  is a caller bug, never a quiet skip. */
export function editRefs(p: Record<string, unknown>): string[] {
  const out: string[] = []
  const pushRef = (s: unknown, key: string): void => {
    if (s === undefined || s === null) return
    if (typeof s === 'string') {
      if (s.trim()) out.push(s)
      return
    }
    throw new Error(`'${key}' fires on the image-edit card (expected an image path string, got ${typeof s}) — the TS plane maps every stated image to a slot, never drops one quietly`)
  }
  pushRef(p.image2, 'image2')
  pushRef(p.image3, 'image3')
  const stack = p.reference_images
  if (stack === undefined || stack === null) return out
  if (!Array.isArray(stack)) {
    throw new Error(`'reference_images' fires on the image-edit card (expected a list of image paths, got ${typeof stack}) — the TS plane maps every stated image to a slot, never drops one quietly`)
  }
  for (const s of stack) pushRef(s, 'reference_images')
  return out
}

/** THE ONE LIST (the operator's merge, ordered three times, landed
 *  2026-10-10: input images and reference images are ONE concept —
 *  the node's own image_1..image_N autogrow slots, position 0 = the
 *  image being edited, the rest = references the prompt can cite.
 *  input_images IS the ordered list. The legacy spellings (image1
 *  the anchor, image2/image3 the numbered slots, reference_images
 *  the stack) merge into the SAME list — anchor first, numbered
 *  next, stack after — so old drafts recompose byte-stable. Stating
 *  input_images TOGETHER with any legacy image key refuses LOUD:
 *  two vocabularies for one list, and the order would be a guess. */
export function orderedInputImages(p: Record<string, unknown>): string[] {
  const canon = p.input_images
  if (canon !== undefined && canon !== null && (!Array.isArray(canon) || canon.some((s) => typeof s !== 'string'))) {
    throw new Error(`'input_images' fires on the image-edit card (expected a list of image path strings, got ${Array.isArray(canon) ? 'a list with non-strings' : typeof canon}) — the TS plane maps every stated image to a slot, never drops one quietly`)
  }
  const legacy = editRefs(p)
  if (Array.isArray(canon) && canon.length > 0) {
    const anchorStated = typeof p.image1 === 'string' && p.image1.trim() !== ''
    if (anchorStated || legacy.length > 0) {
      throw new Error(`'input_images' fires on the image-edit card (stated together with a legacy image key — image1/image2/image3/reference_images; one vocabulary per draft: input_images alone, or the legacy keys alone — never both, the order would be a guess)`)
    }
    return canon.filter((s) => s.trim() !== '')
  }
  const anchor = typeof p.image1 === 'string' ? p.image1.trim() : ''
  return (anchor ? [anchor] : []).concat(legacy)
}

/** The firing gate (the MOD FIRING LAW, ported 1:1
 *  moved verbatim from the image-edit card): lane-promise values ride
 *  inert; anything that would change the graph refuses field-named
 *  INSTEAD of silently plain-editing.
 *
 *  THE SECOND SEAT (the max_images law): the gate reads
 *  the CAP off the model (lane_inputs.max_images — the DECL's own
 *  node truth, never a hardcoded count, never a family-id switch).
 *  Refs past cap - 1 refuse LOUD on every lane (2511: 2, 2.1: 15);
 *  the lane re-pins the same ceiling for direct callers. An absent
 *  model refuses (the old law — direct lane callers pin it). */
export function refuseImageEditFiring(p: Record<string, unknown>, model?: ModelFacts): void {
  const blank = (v: unknown): boolean =>
    v === undefined || v === null ||
    (typeof v === 'string' && !v.trim()) ||
    (v instanceof Array && v.length === 0)
  const fire = (key: string, cond: boolean, why: string): void => {
    if (cond) {
      throw new Error(`'${key}' fires on the image-edit card (${why}) — the TS plane builds the stock plain-edit graph only; refusing instead of silently plain-editing`)
    }
  }
  const list = orderedInputImages(p)
  // THE ABSENT-MODEL LAW (verbatim pre-unification behavior): with
  // no model pinned the gate cannot know the lane's cap, so ANY
  // stated reference refuses — direct lane callers pin the model.
  fire('input_images', model === undefined && list.length > 1, 'no model pinned — direct lane callers pin the model (the gate reads the lane cap off lane_inputs.max_images)')
  const cap = editImageCap(model)
  fire('input_images', list.length > cap, `this lane takes ${cap} input images total (the first is the one being edited, ${cap - 1} references — max_images ${cap}); drop ${list.length - cap}`)
  fire('double_reference', p.double_reference === true, 'the second encode needs nodes this plane does not build')
  // THE LANPAINT LAW (revived 2026-09-15 — the arm above builds it):
  // a stated region switches to the lanpaint sampler; forcing it
  // with no region stated refuses (nothing to regenerate). The
  // retired knobs (beta/friction — upstream fixed them 1/15) refuse
  // off-default LOUD: the fields stay declared for form-spec
  // but wire to no input, and this plane never drops a stated knob
  // quietly.
  const bagN = Array.isArray(p.mask) ? (p.mask as unknown[]).length : 0
  const bagEntry = bagN === 1 && typeof (p.mask as Array<unknown>)[0] === 'object' && (p.mask as Array<unknown>)[0] !== null
    ? (p.mask as Array<Record<string, unknown>>)[0]!
    : {}
  // the bag merges UNDER flat params (explicit flat keys win) — the
  // gate and the builder read the same merged region row.
  const region: Record<string, unknown> = { ...p }
  for (const [k, v] of Object.entries(bagEntry)) {
    if (region[k] === undefined) region[k] = v
  }
  const bagMask = (region.input_mask ?? '') as string
  // a single-entry bag's region counts (the arm merges it); an empty
  // bag states nothing — the force flag must not pass on an empty bag
  // and then silently plain-edit.
  const maskStated = !blank(p.input_mask) || !blank(bagMask)
  const mode = (region.mask_mode ?? 'auto') as string
  const effectiveMode = mode === 'full_frame' ? 'auto' : mode
  const detector = (region.mask_detector ?? 'off') as string
  const detectorThreshold = (region.mask_detector_threshold ?? 0.5) as number
  const detailSize = (region.mask_detail_size ?? 512) as number
  const denoise = (region.mask_denoise ?? 0.5) as number
  fire('mask_mode', effectiveMode !== 'auto' && effectiveMode !== 'crop_stitch', `unknown region mode '${mode}' — choose auto or crop_stitch`)
  fire('mask_detector', detector !== 'off' && detector !== 'person' && detector !== 'face' && detector !== 'hand', `unknown region detector '${detector}' — pick off/person/face/hand`)
  // THE LANE-SCOPED REGION LAW (revoked + re-scoped 2026-09-22, the
  // operator's call: "2511 is the legacy model… 2.1 is the new Qwen
  // edit model"): the REGION DETAILER (crop_stitch) rides BOTH
  // lanes — it is lane-agnostic machinery (whatever model/clip/vae/
  // conditioning the lane built). What stays 2511-only is the
  // LANPAINT inline-inpaint arm (its sampler is that family's
  // flavor). auto+mask on 2.1 still refuses field-named — but the
  // voice now teaches the fix: state crop_stitch.
  const lanpaintLane = model?.lane_inputs?.text_encode_node !== 'TextEncodeQwenImage21'
  fire('input_mask', maskStated && effectiveMode === 'auto' && !lanpaintLane,
    'the lanpaint arm rides the 2511 lane only — for a region on this lane state mask_mode crop_stitch (the region detailer), or switch the model lane')
  // width/height are the plain 2.1 edit's TARGET-resolution knobs;
  // the detailer path builds no EmptyLatentImage (DetailerForEach
  // sizes each crop itself) — a stated value would wire to nothing.
  fire('width', effectiveMode === 'crop_stitch' && !lanpaintLane && (p.width !== undefined || p.height !== undefined),
    "the region detailer reworks the source's own pixels at the crop's own size — width/height ride the plain 2.1 edit's target resolution only; clear them")
  fire('lanpaint_enabled', p.lanpaint_enabled === true && !maskStated, 'force LanPaint with no region stated — state input_mask (the region to regenerate)')
  fire('lanpaint_beta', ((p.lanpaint_beta ?? 0.5) as number) !== 0.5, 'retired upstream — scraed/LanPaint fixes Beta 1.0, the pack knob wires to no input; back it to 0.5 or order a pack change')
  fire('lanpaint_friction', ((p.lanpaint_friction ?? 0.5) as number) !== 0.5, 'retired upstream — scraed/LanPaint fixes Friction 15, the pack knob wires to no input; back it to 0.5 or order a pack change')
  fire('outpaint_top', ((p.outpaint_top ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_right', ((p.outpaint_right ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_bottom', ((p.outpaint_bottom ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_left', ((p.outpaint_left ?? 0) as number) !== 0, 'canvas expansion needs the outpaint pad chain this plane does not build')
  fire('outpaint_overlap', ((p.outpaint_overlap ?? 16) as number) !== 16, 'outpaint knob off its lane promise with no outpaint chain to carry it')
  fire('mask', bagN > 1, 'one region per run — the region arms take a single source')
  fire('mask', !blank(p.mask) && !Array.isArray(p.mask), 'the mask bag is a list — state one entry ([{input_mask, ...}]) or use the flat input_mask')
  if (effectiveMode === 'crop_stitch') {
    // THE CROP_STITCH LAW: exactly one region source — the painted
    // mask or the automated detector, never both, never neither.
    fire('mask_detector', maskStated && detector !== 'off', 'one region per run — the Region Mask and a detector are both stated; clear one')
    fire('mask_mode', !maskStated && detector === 'off', 'crop_stitch needs a region — state input_mask or pick a detector')
    fire('lanpaint_enabled', p.lanpaint_enabled === true, 'pick one sampler — crop_stitch details the region itself; the LanPaint force flag belongs to auto')
    fire('mask_threshold', ((region.mask_threshold ?? 0) as number) !== 0, 'no core node re-binarizes — the soft feathered falloff rides as-is')
  } else {
    fire('mask_detector', detector !== 'off', 'detectors ride crop_stitch only — set mask_mode crop_stitch or back the detector to off')
    fire('mask_detector_threshold', detectorThreshold !== 0.5, 'the detector threshold rides crop_stitch only — set mask_mode crop_stitch or back it to 0.5')
    fire('mask_detail_size', detailSize !== 512, 'the detail size rides crop_stitch only — set mask_mode crop_stitch or back it to 512')
    fire('mask_denoise', denoise !== 0.5, 'the region denoise rides crop_stitch only — set mask_mode crop_stitch or back it to 0.5')
    fire('mask_context_pad', ((region.mask_context_pad ?? 64) as number) !== 64, 'context padding rides crop_stitch only — set mask_mode crop_stitch or back it to 64')
    fire('mask_threshold', ((region.mask_threshold ?? 0) as number) !== 0, 'no core node re-binarizes — the soft feathered falloff rides as-is')
  }
}

/** THE REGION SEGS (the generic region detailer's source): the
 * detector proposes (person = segmentation silhouette, face/hand =
 * boxes) or the painted mask converts via MaskToSEGS(combined) —
 * one region per run. grow + context_pad compose as ONE px
 * expansion (the region's working halo). Lane-agnostic.
 *
 * THE LIVE-ENGINE PINS (proven against :8188's own
 * UltralyticsDetectorProvider model list, 2026-09-22): hand is the
 * s-variant this engine ships — the n-variant pin was a stale copy
 * that would refuse at execute time. */
function regionSegs(g: GraphBuilder, region: Record<string, unknown>, image: TensorRef, maskPath: string): OutputHandle {
  const detector = (region.mask_detector ?? 'off') as string
  const expand = ((region.mask_grow ?? 8) as number) + ((region.mask_context_pad ?? 64) as number)
  if (detector !== 'off') {
    // person rides the segm facts, face its bbox facts, everything
    // else (hand, unknown words) the hand bbox facts — the pre-stroke
    // ternary's exact graph, pack facts for pins (same law as the
    // sam2 lane's word→facts map above).
    const facts = detector === 'person' ? IMPACT_DETECTORS.person
      : detector === 'face' ? IMPACT_DETECTORS.face : IMPACT_DETECTORS.hand
    const found = g.node(facts.providerNode, { model_name: facts.graphPath }).out(facts.providerOutput)
    const regionArgs = {
      image, threshold: (region.mask_detector_threshold ?? 0.5) as number,
      dilation: expand, crop_factor: 3.0, drop_size: 10, labels: 'all',
    }
    return g.node(facts.detectorNode, {
      [facts.detectorInput]: found,
      ...regionArgs,
    }).out()
  }
  // THE SPELL ARM (the naming law's merge half, 2026-10-09): a
  // spelled region mask ('$mask' naming a wired stage input — e.g.
  // the mask card's seg producer) NEVER builds a loader (ROW-4
  // refuses producer links in Load* file slots): the producer's
  // output is already a mask-shaped tensor upstream, so the spell
  // rides the mask consumers (GrowMask/InvertMask/MaskToSEGS take
  // tensors); a path keeps the LoadImageMask disk handoff.
  let m: TensorRef = isSpell(maskPath)
    ? maskPath
    : g.node('LoadImageMask', { image: maskPath, channel: 'alpha' }).out()
  if (expand !== 0) m = g.node('GrowMask', { mask: m, expand, tapered_corners: true }).out()
  if ((region.mask_invert ?? false) === true) m = g.node('InvertMask', { mask: m }).out()
  return g.node('MaskToSEGS', {
    mask: m, combined: true, crop_factor: 3.0, bbox_fill: false, drop_size: 10, contour_fill: false,
  }).out()
}

/** THE REGION DETAILER TAIL: DetailerForEach (crop → edit → paste)
 * reworks each region at mask_detail_size/mask_denoise and saves
 * DIRECTLY — the node returns IMAGE, never a latent (a VAEDecode
 * under it is a wiring bug, not a path). Pixels outside the region
 * never change (the paste touches the seg mask only).
 * Lane-agnostic: the model/clip/vae/conditioning are whatever the
 * active lane built. */
function detailerSave(
  g: GraphBuilder, p: Record<string, unknown>, region: Record<string, unknown>,
  io: { image: TensorRef, segs: OutputHandle, model: OutputHandle, clip: OutputHandle, vae: OutputHandle, positive: OutputHandle, negative: OutputHandle, seed: number },
  runId: string,
): void {
  const detailed = g.node('DetailerForEach', {
    image: io.image, segs: io.segs, model: io.model, clip: io.clip, vae: io.vae,
    guide_size: (region.mask_detail_size ?? 512) as number, guide_size_for: true, max_size: 1024,
    seed: io.seed, steps: p.steps, cfg: p.cfg,
    sampler_name: p.sampler || 'euler', scheduler: p.scheduler || 'simple',
    positive: io.positive, negative: io.negative,
    denoise: (region.mask_denoise ?? 0.5) as number, feather: (region.mask_feather ?? 8) as number,
    noise_mask: true, force_inpaint: true, wildcard: '', cycle: 1,
  }).out()
  g.node('SaveImage', { images: detailed, filename_prefix: `${runId}/edit` })
}

/** A tensor carrier: a node's output handle, or THE SPELL ARM's raw
 *  wire value — a '$name' string naming a FromStage-wired input.
 *  The merge (rewriteSpells) substitutes the upstream producer's
 *  [node, slot] link wherever the spell rides a node input; ROW-4
 *  refuses producer links in Load* file slots, so a spelled tensor
 *  NEVER builds a loader — the spell IS the tensor. */
type TensorRef = OutputHandle | string

/** True when the value names a wired stage input (the $spell law):
 *  '$image1' means "the upstream stage's wired output", never a
 *  file on disk. */
const isSpell = (s: string): boolean => s.startsWith('$')

/** The image_edit block — the anchored instruction-edit lane (moved
 *  verbatim from the image-edit card). */
export function imageEdit(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const li = model.lane_inputs
  let unet: OutputHandle = g.node('UNETLoader', { unet_name: li.unet, weight_dtype: 'default' }).out()
  unet = stackLoras(g, unet, fireLoras(model, p))
  const { clip, vae } = loadTextPair(g, li)
  // THE SPELL ARM (the wired-anchor law, 2026-10-09 — the operator's
  // live refusal: 'stage edit node LoadImage.0: workflow carries
  // $image1 — neither a FromStage-wired input name nor a request
  // initial'): a $name spell names a WIRED STAGE INPUT, never a
  // file. The old arm ALWAYS built LoadImage(image1) — so a wired
  // edit stage died at the merge (ROW-4: a producer link cannot
  // land in a file slot) and an UNWIRED spell died at rewriteSpells
  // (the operator's exact text). Now the spelled anchor rides the
  // tensor slots verbatim and the merge lands the producer link
  // there; files/URLs/estate paths keep the LoadImage handoff (the
  // per-stage disk path owns those).
  // THE ONE LIST (the merge): orderedInputImages refuses mixed
  // vocabularies loud; the anchor is position 0, the references are
  // the rest. THE SHARED CEILING (the max_images law — ONE check,
  // both arms) counts the WHOLE list (anchor included) against the
  // DECL cap before any image loads — never drops quiet, never
  // orphans LoadImages. The gate pins the same ceiling at the
  // compose door; this re-pin covers direct lane callers.
  const list = orderedInputImages(p)
  if (list.length === 0) {
    throw new Error(`required param 'input_images' missing on the image-edit card (the first image is the one being edited — the list cannot be empty; legacy drafts may state image1 alone instead)`)
  }
  const cap = editImageCap(model)
  if (list.length > cap) {
    throw new Error(`'input_images' fires on the image-edit card (this lane takes ${cap} input images total — the first is the one being edited, ${cap - 1} references — but the list counts ${list.length}; drop ${list.length - cap}) — the TS plane maps every stated image to a slot, never drops one quietly`)
  }
  // THE SPELL ARM rides the anchor verbatim (the wired-tensor law
  // below); files/URLs/estate paths keep the LoadImage handoff.
  const anchor = list[0]
  const refs = list.slice(1)
  const image: TensorRef = isSpell(anchor)
    ? anchor
    : g.node('LoadImage', { image: anchor, upload: 'image' }).out(0)
  // Each stated ref loads ahead of the encodes (creation order IS
  // node-id order); blank refs contribute no input at all (stable).
  // A spelled ref ($name) rides verbatim — same wired-tensor law as
  // the anchor (THE SPELL ARM); a file keeps its LoadImage.
  const loaded: TensorRef[] = refs.map((s) =>
    isSpell(s) ? s : g.node('LoadImage', { image: s, upload: 'image' }).out(0))
  // THE REGION ROW (one merge, BOTH lanes — the gate's own merge
  // twin): the bag merges UNDER flat params (explicit flat keys
  // win). One region per run; every region arm below reads this row.
  const bag = Array.isArray(p.mask) ? (p.mask as Array<Record<string, unknown>>) : []
  const merged: Record<string, unknown> = { ...p }
  const bagObj = bag.length === 1 && typeof bag[0] === 'object' && bag[0] !== null ? bag[0] : null
  if (bagObj) {
    for (const [k, v] of Object.entries(bagObj)) {
      if (merged[k] === undefined) merged[k] = v
    }
  }
  const maskPath = ((merged.input_mask ?? '') as string).trim()
  const mode = (merged.mask_mode ?? 'auto') as string
  const cropStitch = (mode === 'full_frame' ? 'auto' : mode) === 'crop_stitch'
  // ── THE 2.1 EDIT LANE (2026-09-21, the Comfy-Org release; branch
  // key = lane_inputs.text_encode_node, the latent_node precedent)
  // ── the 2.1 base has NO separate edit weights: the edit rides
  // QwenImage21Cache (the reference-prefix KV cache wrapped around
  // the SAME unet) + TextEncodeQwenImage21 conditioned on the anchor
  // images through its own image_N autogrow slots, sampled on an
  // EmptyLatentImage at the TARGET resolution (the official
  // image_qwen_image_2_1_image_edit template graph — NOT the 2511
  // VAEEncode-of-source lane). vae rides the encoder's optional
  // input (reference latents splice); one encoder node emits pos+neg.
  if (li.text_encode_node === 'TextEncodeQwenImage21') {
    // (the 2.1 edit arm — the target-resolution knobs are ITS; see
    // the block comment above)
    const cached = g.node('QwenImage21Cache', { model: unet, device: 'auto', dtype: 'default' }).out()
    // THE AUTOGROW KEYS (the live v0.37 law, proven on the engine:
    // execute(clip, prompt, negative_prompt, vae, resolution, images)
    // — the slots ride DOTTED 'images.image_N' node-input keys, the
    // executor's dynamic-path split nests them into the images dict;
    // a bare 'image_1' reaches execute() as a kwarg and dies)
    const images21: Record<string, TensorRef> = { 'images.image_1': image }
    // THE ORDER RIDES CONTIGUOUSLY (the unification): refs map onto
    // images.image_2+ in order — no gaps, no second concept (the
    // shared ceiling above already enforced the DECL cap).
    loaded.forEach((ref, i) => {
      images21[`images.image_${2 + i}`] = ref
    })
    const enc21 = g.node('TextEncodeQwenImage21', {
      clip, vae, prompt: p.prompt, negative_prompt: p.negative_prompt ?? '', resolution: 1024,
      ...images21,
    })
    // ── THE REGION DETAILER ON 2.1 (the operator's lane, 2026-09-22:
    // "2511 is the legacy model… 2.1 is the new Qwen edit model") ──
    // the SAME generic arm as the 2511 tail, riding THIS lane's own
    // model and conditioning: the cache-wrapped unet + the encoder's
    // pos/neg (the reference vision tokens live in the conditioning —
    // each crop edits against the anchor, the plain arm's contract).
    // No EmptyLatentImage on this path: DetailerForEach encodes and
    // sizes each crop itself (width/height would wire to nothing —
    // the gate refuses them field-named).
    if (cropStitch) {
      const segs = regionSegs(g, merged, image, maskPath)
      detailerSave(g, p, merged, {
        image, segs, model: cached, clip, vae,
        positive: enc21.out(0), negative: enc21.out(1), seed,
      }, runId)
      return
    }
    const latent21 = g.node('EmptyLatentImage', {
      batch_size: 1,
      width: ((p.width as number | undefined) ?? 1024),
      height: ((p.height as number | undefined) ?? 1024),
    })
    const sampled21 = g.node('KSampler', {
      seed,
      steps: p.steps,
      cfg: p.cfg,
      sampler_name: p.sampler || 'euler',
      scheduler: p.scheduler || 'simple',
      denoise: 1.0,
      latent_image: latent21.out(),
      model: cached,
      positive: enc21.out(0),
      negative: enc21.out(1),
    })
    decodeSave(g, sampled21.out(), vae, `${runId}/edit`)
    return
  }
  // THE NEVER-LIE GUARD (the firing law): width/height are the 2.1
  // lane's target-resolution knobs — stated on the 2511 lane they
  // would wire to nothing (the 2511 edit rides the source's own
  // resolution through VAEEncode), and a stated knob that does
  // nothing is a lying stack. Refuse field-named.
  if (p.width !== undefined || p.height !== undefined) {
    throw new Error("'width'/'height' fire on the image-edit card only on the Qwen Image 2.1 lane (target-resolution edit) — the 2511 lane edits at the source's own resolution; clear them or switch the model lane")
  }
  // THE 2511 MAPPING (the unification's narrow end): refs ride the
  // stock node's native image2/image3 optionals (the shared ceiling
  // above already enforced the DECL cap — this arm only ever sees
  // what fits). THE NODE-SHAPE ASSERT (not a second cap — a lying-
  // DECL guard): this arm builds the stock TextEncodeQwenImageEditPlus
  // graph, whose reference slots are image2/image3 and nothing else.
  // A lane routing here with max_images past the node's own 3 would
  // silently drop refs — refuse LOUD instead. Conditional spreads
  // keep blank refs out of the inputs entirely (byte-stable plain
  // graphs).
  if (cap > 3) {
    throw new Error(`'input_images' fires on the image-edit card (this lane routes to the stock TextEncodeQwenImageEditPlus node — 3 image slots and nothing else — but declares max_images ${cap}; fix the DECL) — the TS plane maps every stated image to a slot, never drops one quietly`)
  }
  const ref2 = loaded[0] ?? null
  const ref3 = loaded[1] ?? null
  const pos = g.node('TextEncodeQwenImageEditPlus', {
    clip, image1: image, vae, prompt: p.prompt,
    ...(ref2 ? { image2: ref2 } : {}),
    ...(ref3 ? { image3: ref3 } : {}),
  })
  const neg = g.node('TextEncodeQwenImageEditPlus', {
    clip, image1: image, vae, prompt: p.negative_prompt ?? '',
    ...(ref2 ? { image2: ref2 } : {}),
    ...(ref3 ? { image3: ref3 } : {}),
  })
  // FIXED 1.0 (template-pinned lane graph — not a knob, not the
  // wire, never li.sampling_shift; see the doc's 2026-09-06
  // audit note on ImageEditDoc).
  const shifted = g.node('ModelSamplingAuraFlow', { model: unet, shift: 1.0 }).out()
  // ── THE LANPAINT ARM (revived 2026-09-15, operator order "bring
  // them back") ──
  // input_mask stated (+ image1) switches the builder to the
  // lanpaint sampler — the LanPaintMod SLOT LAW. Upstream's node
  // API moved since the pack was written (scraed/LanPaint, engine
  // commit 32cf848): step_size/lambda/beta/friction retired as live
  // inputs — LanPaint_KSamplerAdvanced keeps NumSteps + Lambda +
  // StepSize and FIXES Beta 1.0 / Friction 15 (hidden DEFAULT; old
  // prompts passing them are accepted and ignored — the extension's
  // own comment). The mapping, every drift named:
  //   steps <- lanpaint_num_steps (20 = their z-image example's 20)
  //   LanPaint_NumSteps <- 5 (upstream default; no pack knob exists)
  //   LanPaint_Lambda <- lanpaint_lambda (PACK 0.5 vs upstream 5.0:
  //     a lighter known-region pull than their example — raise the
  //     slider to taste, ceiling 2)
  //   LanPaint_StepSize <- lanpaint_step_size (pack 1.0 vs upstream
  //     0.2; 0.2 is reachable, floor 0.1)
  //   Beta/Friction <- 1 / 15 explicit (their example-canonical
  //     fixed values; the pack knobs stay declared for form-spec
  //     and refuse off-default LOUD — never a silent drop)
  //   PromptMode: negative -> "Image First", positive ->
  //     "Prompt First" (their README: image context vs prompt
  //     emphasis at the cost of image quality)
  //   Inpainting_mode: the image literal. add_noise enable,
  //     noise_seed = the minted seed, start 0 / end 10000,
  //     leftover-noise disable (their example wiring).
  // Mask prep in-graph (the host-side chain, node form):
  // LoadImageMask alpha -> GrowMask -> FeatherMask -> InvertMask.
  // No core node re-binarizes — non-zero mask_threshold still
  // refuses. Polarity: LanPaint 1 = regenerate; mask-studio white
  // region = regenerate. Consistent.
  // The region row (merged above, before the 2.1 branch) owns the
  // mask path; auto owns the inline inpaint — crop_stitch falls
  // through to the region detailer below (the gate refuses every
  // other combination).
  if (maskPath && !cropStitch) {
    // THE SPELL ARM (same law as the region chain): a spelled mask
    // rides GrowMask/FeatherMask's tensor inputs verbatim; a path
    // keeps LoadImageMask.
    let m: TensorRef = isSpell(maskPath)
      ? maskPath
      : g.node('LoadImageMask', { image: maskPath, channel: 'alpha' }).out()
    const grow = (merged.mask_grow ?? 8) as number
    if (grow !== 0) m = g.node('GrowMask', { mask: m, expand: grow, tapered_corners: true }).out()
    const feather = (merged.mask_feather ?? 8) as number
    if (feather > 0) {
      m = g.node('FeatherMask', { mask: m, left: feather, top: feather, right: feather, bottom: feather }).out()
    }
    if ((merged.mask_invert ?? false) === true) m = g.node('InvertMask', { mask: m }).out()
    const lpLatent = g.node('LanPaint_ImageEncode', { image, vae, mask: m }).out()
    const promptMode = ((p.lanpaint_prompt_mode ?? 'negative') as string) === 'positive'
      ? 'Prompt First'
      : 'Image First'
    const lpSampled = g.node('LanPaint_KSamplerAdvanced', {
      model: shifted, add_noise: 'enable', noise_seed: seed,
      steps: (p.lanpaint_num_steps ?? 20) as number, cfg: p.cfg,
      sampler_name: p.sampler || 'euler', scheduler: p.scheduler || 'simple',
      positive: pos.out(), negative: neg.out(), latent_image: lpLatent,
      start_at_step: 0, end_at_step: 10000, return_with_leftover_noise: 'disable',
      LanPaint_NumSteps: 5,
      LanPaint_Lambda: (p.lanpaint_lambda ?? 0.5) as number,
      LanPaint_StepSize: (p.lanpaint_step_size ?? 1.0) as number,
      LanPaint_Beta: 1, LanPaint_Friction: 15,
      LanPaint_EarlyStop: 1, LanPaint_InnerThreshold: 0, LanPaint_InnerPatience: 1, LanPaint_MinStepFrac: 1.0,
      LanPaint_PromptMode: promptMode, LanPaint_Info: 'LanPaint KSampler Adv.',
      Inpainting_mode: '🖼️ Image Inpainting',
    })
    const lpDecoded = g.node('LanPaint_ImageDecode', {
      samples: lpSampled.out(), vae, image, mask: m, blend_overlap: 9,
    })
    g.node('SaveImage', { images: lpDecoded.out(), filename_prefix: `${runId}/edit` })
    return
  }
  // ── THE CROP_STITCH ARM (the generic region detailer, shared with
  // the 2.1 branch above): region source → SEGS → DetailerForEach
  // (crop → Qwen edit → paste) on THIS lane's shifted model and
  // EditPlus conditioning. The helpers own the wiring; pixels
  // outside the region never change. ──
  if (cropStitch) {
    const segs = regionSegs(g, merged, image, maskPath)
    detailerSave(g, p, merged, {
      image, segs, model: shifted, clip, vae,
      positive: pos.out(), negative: neg.out(), seed,
    }, runId)
    return
  }
  const encoded = g.node('VAEEncode', { pixels: image, vae }).out()
  const sampled = g.node('KSampler', {
    seed,
    steps: p.steps,
    cfg: p.cfg,
    // the road's _step_doc coercions (doc.sampler or "euler"):
    // an unstated/empty row rides the lane default, never "".
    sampler_name: p.sampler || 'euler',
    scheduler: p.scheduler || 'simple',
    denoise: 1.0,
    latent_image: encoded,
    model: shifted,
    positive: pos.out(),
    negative: neg.out(),
  })
  decodeSave(g, sampled.out(), vae, `${runId}/edit`)
}
