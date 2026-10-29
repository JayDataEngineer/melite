import { judgeDeliverableSize, laneBlank } from '@melite/contracts/laneRelations'
import { GraphBuilder, OutputHandle, stripAutofill } from './graph.ts'
import type { NodeRef, PromptGraph, StripTable } from './graph.ts'
import { type ModelFacts } from './facts.ts'
import { loadTextPair, decodeSave, stackLoras, stackControlNets, scaleDeliverable, type DeliverableSize } from './blocks/render-kit.ts'
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

// THE LANE SOLVER DEFAULTS, ONCE (the census's M8): five call sites
// wrote `p.sampler || 'euler'` / `p.scheduler || 'simple'` inline,
// so a cleared select (""), a missing key, and an explicit value all
// took different paths per call site — and the t2i path in the SAME
// file took none (it rides the schema+DECL cascade). The family
// default belongs to the family; this is the lane's own answer when
// the caller says nothing, named once.
const LANE_SAMPLER_DEFAULT = 'euler';
const LANE_SCHEDULER_DEFAULT = 'simple';

/** The lane's solver, honouring an EXPLICIT choice (a cleared select
 *  is not a choice: the lane's own default answers, exactly as the
 *  DECL cascade answers elsewhere). Exported for the family actions
 *  (the atom vocabulary: the same solver read, one vocabulary). */
export const laneSampler = (p: Record<string, unknown>): string =>
  typeof p['sampler'] === 'string' && p['sampler'] !== '' ? p['sampler'] as string : LANE_SAMPLER_DEFAULT;
export const laneScheduler = (p: Record<string, unknown>): string =>
  typeof p['scheduler'] === 'string' && p['scheduler'] !== '' ? p['scheduler'] as string : LANE_SCHEDULER_DEFAULT;

// THE T2I LANE IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30):
// krea-2, z-image, anima and qwen-img-21 compose their own t2i lanes
// in their declared actions (each pinned to committed goldens in that
// family's tests/golden/, with the 2.1 topology pinned in
// packages/models/qwen-img-21/tests/lane-laws.spec.ts and the
// IP-Adapter gate in packages/models/z-image/tests/ip-adapter-gate.spec.ts).
// This arm is deleted. What stays is admission and finalize, not lane:
// finalizeImageGen (the card's autofill strip), refuseIPAdapterFiring
// and the mods guard the families' actions still read.
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
 *  next, stack after — so old drafts recompose byte-stable. A
 *  stated input_images WINS over any legacy keys still riding an
 *  old draft: the legacy spellings fold away (the migration law —
 *  the operator's own history must run forward, never refuse). */
export function orderedInputImages(p: Record<string, unknown>): string[] {
  const canon = p.input_images
  if (canon !== undefined && canon !== null && (!Array.isArray(canon) || canon.some((s) => typeof s !== 'string'))) {
    throw new Error(`'input_images' fires on the image-edit card (expected a list of image path strings, got ${Array.isArray(canon) ? 'a list with non-strings' : typeof canon}) — the TS plane maps every stated image to a slot, never drops one quietly`)
  }
  const legacy = editRefs(p)
  if (Array.isArray(canon) && canon.length > 0) {
    // THE MIGRATION LAW (2026-10-10, the operator's own history):
    // a draft written before the merge still carries image1/
    // reference_images while the NEW face collects input_images.
    // The one list WINS — legacy keys fold away, never a refusal
    // (the old wall fired on the operator's own drafts; migration
    // is the law, not rejection). Both vocabularies never co-serve.
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
  // THE BLANK LAW IS THE CONTRACT'S (the design audit's Q4: this copy
  // had no object rule at all, so `input_mask: {}` read STATED here
  // and blank at the lane judge — the two arms of one state disagreeing
  // about whether a mask was sent).
  const blank = laneBlank;
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
  // THE REGION LAW (2026-11-12, the inline-inpaint retirement): NO lane
  // inpaints in place anymore — the retired sampler is gone
  // with its pack. auto+mask refuses field-named on EVERY lane, and
  // the voice teaches the fix: state mask_mode crop_stitch (the
  // region detailer — crop, edit, paste; pixels outside the region
  // never change). A wider canvas is NOT a masked edit: pad the
  // anchor and instruct the edit (the pad-and-instruct recipe in the
  // zooms skill) — no outpaint knobs exist on any door.
  fire('input_mask', maskStated && effectiveMode === 'auto',
    'no edit lane inpaints in place (inline inpainting is retired) — for a region state mask_mode crop_stitch (the region detailer)')
  // THE DELIVERABLE-SIZE LAW (the resize order, 2026-11-12): the
  // shared door below — one law, the firing gate and every build.
  refuseDeliverableSize(p)
  fire('mask', bagN > 1, 'one region per run — the region arms take a single source')
  fire('mask', !blank(p.mask) && !Array.isArray(p.mask), 'the mask bag is a list — state one entry ([{input_mask, ...}]) or use the flat input_mask')
  if (effectiveMode === 'crop_stitch') {
    // THE CROP_STITCH LAW: exactly one region source — the painted
    // mask or the automated detector, never both, never neither.
    fire('mask_detector', maskStated && detector !== 'off', 'one region per run — the Region Mask and a detector are both stated; clear one')
    fire('mask_mode', !maskStated && detector === 'off', 'crop_stitch needs a region — state input_mask or pick a detector')
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

/** THE DELIVERABLE-SIZE REFUSAL (the resize order, operator
 * 2026-11-12): the size law as its throwing door — the firing gate
 * AND each family's build() call it, so the engine path and the
 * compose path can never disagree about what a stated size means.
 * The law itself is the contracts floor's spelling
 * (judgeDeliverableSize — the bench write/run door, the form gate
 * and the compose mirror append the same judgment): this door
 * throws the first violation's voice. The edit lanes STILL run at
 * the source's own frame (the latent law holds); a stated size is
 * a DELIVERABLE resize (post-decode lanczos), not a latent
 * geometry. The match toggle owns the door: ON (default) + a
 * stated axis refuses field-named with the flip in the voice; OFF
 * with NEITHER axis is the composable identity (the flip-then-type
 * flow — the card stays runnable while the numbers are empty);
 * OFF with exactly ONE axis refuses (a half deliverable is
 * malformed, never a half-resize); OFF with BOTH demands integers
 * ≥ 16 (the blank-image and int laws, input-prep's precedent) and
 * the deliverable lands at that size.
 *
 * @param p the run params (width/height/match_input_resolution).
 */
export function refuseDeliverableSize(p: Record<string, unknown>): void {
  const violations = judgeDeliverableSize(p);
  if (violations.length === 0) return;
  throw new Error(violations[0]!.message);
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
/** THE STATED-REGION READ (the gen detailer serve, operator
 *  2026-11-07): ONE spelling of "the doc states a region", shared by
 *  the image-gen card's serve/refuse gate and the served t2i builds —
 *  the two seats can never disagree about whether a region was sent.
 *  The conditions ARE the E2-11 firing gate's (bag entry, flat mask,
 *  picked detector, flat prep/detail knob — the walk fills no rider
 *  defaults, so presence is authored intent; mask_mode 'auto' is the
 *  plain lane's own word and never states). The bag merges UNDER flat
 *  params (explicit flat keys win — the edit lanes' own merge twin).
 *  mask_mode 'full_frame' normalizes to 'auto' (the edit precedent). */
export interface StatedRegion {
  key: string;
  mode: string;
  merged: Record<string, unknown>;
  maskPath: string;
  detector: string;
}
export function statedRegion(doc: Record<string, unknown>): StatedRegion | null {
  const rawBag: unknown = doc['mask'];
  const bagLen = Array.isArray(rawBag) ? rawBag.length : 0;
  const bagFirst = bagLen === 1 ? (rawBag as unknown[])[0] : null;
  const bagObj = typeof bagFirst === 'object' && bagFirst !== null
    ? (bagFirst as Record<string, unknown>)
    : null;
  const merged: Record<string, unknown> = { ...doc };
  if (bagObj) {
    for (const [k, v] of Object.entries(bagObj)) {
      if (merged[k] === undefined) merged[k] = v;
    }
  }
  const flatMask = typeof merged['input_mask'] === 'string' && (merged['input_mask'] as string).trim() !== '';
  const detector = typeof merged['mask_detector'] === 'string' ? (merged['mask_detector'] as string) : 'off';
  const detectorStated = detector !== '' && detector !== 'off';
  const flatKnobs = ['mask_mode', 'mask_context_pad', 'mask_grow', 'mask_feather',
    'mask_threshold', 'mask_invert', 'mask_detail_size', 'mask_denoise'] as const;
  const flatStated = flatKnobs.find((k) => {
    const v = merged[k];
    if (k === 'mask_mode') return v === 'crop_stitch';
    return v !== undefined;
  });
  if (bagLen === 0 && !flatMask && !detectorStated && flatStated === undefined) return null;
  const rawMode = (merged['mask_mode'] ?? 'auto') as string;
  return {
    key: bagLen > 0 ? 'mask' : flatMask ? 'input_mask' : flatStated ?? 'mask_detector',
    mode: rawMode === 'full_frame' ? 'auto' : rawMode,
    merged,
    maskPath: typeof merged['input_mask'] === 'string' ? (merged['input_mask'] as string).trim() : '',
    detector,
  };
}

/** THE REGION SOURCE: the painted mask or the picked detector —
 *  crop_stitch details exactly one. Null = crop_stitch with no
 *  source (the edit fire table's 'crop_stitch needs a region'). */
export function regionSourceKind(r: StatedRegion): 'mask' | 'detector' | null {
  if (r.maskPath !== '') return 'mask';
  if (r.detector !== 'off') return 'detector';
  return null;
}

export function regionSegs(g: GraphBuilder, region: Record<string, unknown>, image: TensorRef, maskPath: string): OutputHandle {
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
/** The vetted deliverable size off a GATED doc (the resize order's
 * read half; refuseImageEditFiring owns the refusals — this helper
 * serves only the lawful state): match_input_resolution OFF and
 * BOTH axes stated integers. Every other shape returns undefined —
 * the compose stays byte-stable (no ImageScale). */
export function deliverableSizeOf(p: Record<string, unknown>): DeliverableSize | undefined {
  if (p.match_input_resolution !== false) return undefined
  const width = p.width
  const height = p.height
  if (typeof width !== 'number' || typeof height !== 'number') return undefined
  if (!Number.isInteger(width) || !Number.isInteger(height)) return undefined
  return { width, height }
}

export function detailerSave(
  g: GraphBuilder, p: Record<string, unknown>, region: Record<string, unknown>,
  io: { image: TensorRef, segs: OutputHandle, model: OutputHandle, clip: OutputHandle, vae: OutputHandle, positive: OutputHandle, negative: OutputHandle, seed: number },
  runId: string,
  size?: DeliverableSize,
): NodeRef {
  const detailed = g.node('DetailerForEach', {
    image: io.image, segs: io.segs, model: io.model, clip: io.clip, vae: io.vae,
    guide_size: (region.mask_detail_size ?? 512) as number, guide_size_for: true, max_size: 1024,
    seed: io.seed, steps: p.steps, cfg: p.cfg,
    sampler_name: laneSampler(p), scheduler: laneScheduler(p),
    positive: io.positive, negative: io.negative,
    denoise: (region.mask_denoise ?? 0.5) as number, feather: (region.mask_feather ?? 8) as number,
    noise_mask: true, force_inpaint: true, wildcard: '', cycle: 1,
  }).out()
  return g.node('SaveImage', { images: scaleDeliverable(g, detailed, size), filename_prefix: `${runId}/edit` })
}

/** THE GEN TWIN (the gen detailer serve, operator 2026-11-07): the
 *  SAME DetailerForEach arm over the SAME kit segs, saving under the
 *  gen prefix — the run-media prefix law names the stage kind (gen
 *  stages harvest under gen/, edit stages under edit/), so the arm
 *  cannot share detailerSave's edit-stamped tail. All other wiring
 *  (guide size, denoise, feather, sampler, inpaint flags) is the
 *  twin's verbatim — one arm, two seats. */
export function genDetailerSave(
  g: GraphBuilder, p: Record<string, unknown>, region: Record<string, unknown>,
  io: { image: TensorRef, segs: OutputHandle, model: OutputHandle, clip: OutputHandle, vae: OutputHandle, positive: OutputHandle, negative: OutputHandle, seed: number },
  runId: string,
): NodeRef {
  const detailed = g.node('DetailerForEach', {
    image: io.image, segs: io.segs, model: io.model, clip: io.clip, vae: io.vae,
    guide_size: (region.mask_detail_size ?? 512) as number, guide_size_for: true, max_size: 1024,
    seed: io.seed, steps: p.steps, cfg: p.cfg,
    sampler_name: laneSampler(p), scheduler: laneScheduler(p),
    positive: io.positive, negative: io.negative,
    denoise: (region.mask_denoise ?? 0.5) as number, feather: (region.mask_feather ?? 8) as number,
    noise_mask: true, force_inpaint: true, wildcard: '', cycle: 1,
  }).out()
  return g.node('SaveImage', { images: detailed, filename_prefix: `${runId}/gen` })
}

/** A tensor carrier: a node's output handle, or THE SPELL ARM's raw
 *  wire value — a '$name' string naming a FromStage-wired input.
 *  The merge (rewriteSpells) substitutes the upstream producer's
 *  [node, slot] link wherever the spell rides a node input; ROW-4
 *  refuses producer links in Load* file slots, so a spelled tensor
 *  NEVER builds a loader — the spell IS the tensor. */
export type TensorRef = OutputHandle | string

/** True when the value names a wired stage input (the $spell law):
 *  '$image1' means "the upstream stage's wired output", never a
 *  file on disk. */
export const isSpell = (s: string): boolean => s.startsWith('$')

// THE IMAGE-EDIT LANE IS FAMILY-OWNED (the kit-arm retirement,
// 2026-09-30): the qwen-img-edit-21 and qwen-img-edit-2511 families
// compose their own edit lanes in their declared actions
// (packages/models/qwen-img-edit-21/src/actions.ts and
// .../qwen-img-edit-2511/src/actions.ts, each pinned to committed
// goldens in that family's tests/golden/). This arm is deleted. What
// stays is admission, not lane: refuseImageEditFiring (the card's
// firing gate, which reads the cap off the row) and finalizeImageEdit
// (the autofill strip the card's finalize pass runs).
