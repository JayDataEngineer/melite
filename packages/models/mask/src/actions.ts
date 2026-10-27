// actions.ts — the mask family's declared select action (the atom
// vocabulary, the F1 mint, operator order 2026-10-12). The mask card
// is a tool card, but its lane is a real atom: this family owns the
// segment — the three weights are the action's FACTS, the knobs its
// params, the node tree its build — and the card binds it through
// declaredAction off the DECL (the interlock: drop the action here
// and the card's binding refuses at boarding, never at first run).
//
// This file is the lane's ONLY home (relocated verbatim from
// image/mask/src/lane.ts, the tool-lane stroke's home — the card kit's
// `maskT1` died before that): the card keeps everything else it always
// owned — the schema walk, the draw/export admission, the strip pass,
// the refusal voices. The build's error voices still say `maskT1:`
// (the name the specs pin; the lane's own historical voice).
import type { ComfyActionSpec } from '@melite/comfyui-card-kit'
import { GraphBuilder } from '@melite/comfyui-card-kit/graph'
import type { NodeInputs, NodeRef, OutputHandle } from '@melite/comfyui-card-kit/graph'
import { impactDetector } from '@melite/comfyui-card-kit/impact'

/** the wired-tensor law (the mask lane's own spell handling): a '$name'
 *  value names an upstream stage's output — the spell IS the tensor
 *  and rides node inputs verbatim; a file path keeps the disk
 *  handoff. */
/** the drawn region rectangle the lane's detect hint rides */
type BboxDict = { x: number; y: number; width: number; height: number }

type TensorRef = OutputHandle | string
const isSpell = (s: string): boolean => s.startsWith('$')

const personDetector = impactDetector('person')
const faceDetector = impactDetector('face')
const handDetector = impactDetector('hand')

/** The closed facts shape the lane reads: the three SAM weights the
 *  family owns (constants — no variant swaps them, no row declares
 *  them; the h3 LANE_FILES pattern). */
export interface MaskLaneFacts {
  checkpoint: string
  unet: string
  sam2: string
}

/** The gated params doc the lane reads (the card's schema walk
 *  validated types and bounds — a same-process typed boundary). */
export type MaskLaneParams = Record<string, unknown>

/** The family's three weight names — the lane's own constants (the
 *  LANE_FILES pattern, the h3 precedent: clip/vae_video/vae_audio
 *  never ride a row either). No variant of this family swaps a
 *  weight and no user picks one, so they live beside the build that
 *  wires them; the card's provisions declare the downloads, and
 *  image/mask/tests/card.spec.ts pins the agreement (a weight the
 *  lane loads that no provision downloads is a silent
 *  wrong-weights run — the same law the variant cells carry). */
export const MASK_WEIGHTS = {
  checkpoint: 'sam3.1_multiplex_fp16.safetensors',
  unet: 'rt_detr_v4-x-hgnet_fp32.safetensors',
  sam2: 'sam2.1_hiera_large.pt',
} as const

/** The family's facts door: the lane reads NOTHING off a row (the
 *  three weights are the family's constants above), so the door
 *  returns them closed — an empty loader name is unrepresentable,
 *  which is the old refusal law (a pin that is not a non-empty
 *  string refused here) held by construction. The registry still
 *  exercises this door at registration over the empty family row.
 *  @param _raw the resolved lane_inputs (empty on this family)
 *  @returns the three weights the lane wires into its loaders */
export function parseMaskLaneFacts(_raw: unknown): MaskLaneFacts {
  return { checkpoint: MASK_WEIGHTS.checkpoint, unet: MASK_WEIGHTS.unet, sam2: MASK_WEIGHTS.sam2 };
}

export interface EntryTuneShape {
  threshold?: number
  refine?: number
  dilation?: number
  detection_threshold?: number
  box_expansion?: number
  hint_threshold?: number
  detection_dilation?: number
  crop_factor?: number
  drop_size?: number
}

/** THE TUNE VOCABULARY IS DERIVED FROM ITS OWN TYPE (the census's
 *  L1): the runtime list and the compile-time type were written side
 *  by side, so adding a key to one and not the other was silent — the
 *  gate accepted a key the type did not carry (or refused one it
 *  did). The keys are the type's own members now; the assertion
 *  below fails if the two ever part company. */
export const TUNE_KEYS: readonly (keyof EntryTuneShape)[] = [
  'threshold', 'refine', 'dilation', 'detection_threshold', 'box_expansion',
  'hint_threshold', 'detection_dilation', 'crop_factor', 'drop_size',
]
export type EntryTune = EntryTuneShape

/** THE MASK SELECTION ACTION (the family's one declared lane): the
 *  input_image admission stays on the card; this is the lane alone.
 *  TWO selection families: the SAM3 CLIP/RT-DETR leg (checkpoint +
 *  unet weights) and the SAM2 impact-pack arm (sam2 + the pack's own
 *  specialized detectors — person on segm, face/hand on their bbox
 *  models — the detector proposes, SAM2 refines). */
export const select: ComfyActionSpec<MaskLaneParams, MaskLaneFacts> = {
  id: "select",
  inputs: [],
  outputs: [{ name: "default", kind: "MASK" }],
  params: [],
  facts: parseMaskLaneFacts,
  build({ p, facts, g, runId }) {
    const li: MaskLaneFacts = { checkpoint: facts.checkpoint, unet: facts.unet, sam2: facts.sam2 }  // the family's weight constants (MASK_WEIGHTS above)
    const prefix = `${runId}/mask`        // the arm's "%s/mask" % run_id
    const samThreshold = p.sam_threshold as number
    // undeclared legacy renderer keys ride the door's explicit-params
    // overlay (see schema header) — schema-required paint_mask renders
    // ''-absent at compose (image-gen precedent), refine_iterations
    // falls back to its old schema pin 2 when no explicit names it.
    const refineIterations = ((p.refine_iterations ?? 2) as number)
    const dilation = p.sam_dilation as number
    // THE SIMPLE-NODE SUB-KNOBS (the operator's 2026-10-09 audit of
    // ImpactSimpleDetectorSEGS: sub_bbox_expansion +
    // sam_mask_hint_threshold were hard-pinned and unexposed): the
    // lane-flat seat is the PRIMARY sam2's fold; absent (a sam3
    // primary, pre-fold benches) = the pack's own defaults.
    const bboxExpansion = (p.box_expansion as number | undefined) ?? 0
    const hintThreshold = (p.hint_threshold as number | undefined) ?? 0.7
    // THE DETECTOR TRIO (the operator's 2026-10-09 demand — the last
    // three hard-pinned knobs): node-faithful defaults (10 / 3 / 10 —
    // what the lane always shipped), now per-entry overridable.
    const detectionDilation = (p.detection_dilation as number | undefined) ?? 10
    const cropFactor = (p.crop_factor as number | undefined) ?? 3.0
    const dropSize = (p.drop_size as number | undefined) ?? 10
    // THE DETECTOR THRESHOLD FOLD (audit 015 C5 — one fold for every
    // detector seat): the effective detector threshold derives ONCE —
    // per-entry tune → lane-flat param → the pack's 0.5 default. The
    // SAM2 impact detectors AND the RT-DETR proposal seat read THIS
    // derivation (the seats reference it, never re-stamp the fold):
    // a second spelling let one graph carry two effective thresholds
    // — SAM2 folded 0.5 while an unstated RT-DETR seat rode the raw
    // cast to undefined (tests/threshold-fold-parity.spec.ts).
    const detectorThreshold = (tune?: EntryTune): number =>
      tune?.detection_threshold ?? (p.detection_threshold as number | undefined) ?? 0.5
    const exportBoxes = p.export_boxes as boolean
    const viaRtdetr = p.primary_via_rtdetr as boolean

    // the lazy loader trio (see the header note — created on first use)
    // THE SPELLED ANCHOR (the mask-as-consumer half of the gap
    // audit: a producer-wired input_image rides every tensor slot
    // verbatim, never a LoadImage — ROW-4 refuses producer links in
    // file slots, so the loader builds for paths only).
    let imgH: TensorRef | null = null
    let ckpt: NodeRef | null = null
    let rtdetrModel: OutputHandle | null = null
    const img = (): TensorRef => (imgH ??= isSpell(p.input_image as string)
      ? (p.input_image as string)
      : g.node('LoadImage', { image: p.input_image as string }).out(0))
    const ckptNode = (): NodeRef => (ckpt ??= g.node('CheckpointLoaderSimple', { ckpt_name: li.checkpoint as string }))
    const rtdetrLoader = (): OutputHandle =>
      (rtdetrModel ??= g.node('UNETLoader', { unet_name: li.unet as string, weight_dtype: 'default' }).out(0))

    const clipCond = (text: string): OutputHandle =>
      g.node('CLIPTextEncode', { text, clip: ckptNode().out(1) }).out(0)

    const detect = (conditioning?: OutputHandle, bboxes?: OutputHandle | BboxDict, tune?: EntryTune): OutputHandle => {
      const inputs: NodeInputs = {
        model: ckptNode().out(0),
        image: img(),
        threshold: tune?.threshold ?? samThreshold,
        refine_iterations: tune?.refine ?? refineIterations,
        individual_masks: false,
      }
      if (conditioning) inputs.conditioning = conditioning
      // NO DEFAULT HINT (the red-box hunt's third bug, 2026-10-08):
      // the old DEFAULT_BBOXES autofilled {0,0,512,512} on every
      // unscoped detection — a top-left QUARTER "hint" on any image
      // larger than 512, silently blinding the selection everywhere
      // else (an empty mask on a 1024px input, proven live).
      // Unscoped = bboxes rides ABSENT = search the WHOLE image; the
      // drawn Region scope (and RT-DETR's own boxes) still thread as
      // the explicit hint when they exist.
      if (bboxes !== undefined) inputs.bboxes = bboxes
      return g.node('SAM3_Detect', inputs).out(0)     // (masks, bboxes) → masks
    }

    const dilate = (mask: OutputHandle, d?: number): OutputHandle =>
      (d ?? dilation) ? g.node('GrowMask', { mask, expand: d ?? dilation, tapered_corners: true }).out(0) : mask

    // the lane's declared output is the mask it saved last (the card's
    // output binding reads that SaveImage); the handle rides the same
    // node, so nothing is created, moved or renumbered by declaring it
    let saved: OutputHandle | null = null
    const save = (mask: OutputHandle, name: string, d?: number): void => {
      const m2i = g.node('MaskToImage', { mask: dilate(mask, d) })
      saved = g.node('SaveImage', { images: m2i.out(0), filename_prefix: `${prefix}/${name}` }).out(0)
    }

    // THE RECT SCOPE (the drawn box — the bbox-canvas leaf's
    // [x, y, w, h] pixels): a zeros W×H mask plus a ones w×h box at
    // (x, y) (MaskComposite add), multiplied over the selection. CORE
    // nodes only (SolidMask + MaskComposite + GetImageSizeAndCount —
    // all live on every engine; the scope never depends on the
    // impact arm that made the mask).
    const rectMask = (scope: BboxDict): OutputHandle => {
      const size = g.node('GetImageSizeAndCount', { image: img() })
      const zeros = g.node('SolidMask', { value: 0, width: size.out(1), height: size.out(2) }).out(0)
      const ones = g.node('SolidMask', { value: 1, width: scope.width, height: scope.height }).out(0)
      return g.node('MaskComposite', { destination: zeros, source: ones, x: scope.x, y: scope.y, operation: 'add' }).out(0)
    }
    const scopeMask = (mask: OutputHandle, scope: BboxDict): OutputHandle =>
      g.node('MaskComposite', { destination: mask, source: rectMask(scope), x: 0, y: 0, operation: 'multiply' }).out(0)

    // THE SAM2 IMPACT-PACK ARM (the operator's SAM2: the detector
    // proposes + SAM2 refines; the mask card declares the packs +
    // weights, the compose door refuses without them — never a
    // silent CLIP leg). UltralyticsDetectorProvider (subpack, the
    // card's PINNED detector model: segm/person for person,
    // bbox/face + bbox/hand for face/hand) → SegmDetectorSEGS or
    // BboxDetectorSEGS (image + the detector boxes + the card's
    // labels) → SEGS → SAMDetectorCombined (PINNED sam2 model,
    // center-1 — the pack's own best-practice default) → MASK. The
    // drawn box scopes after (the rect scope above).
    let samH: OutputHandle | null = null
    let segmH: OutputHandle | null = null
    let faceH: OutputHandle | null = null
    let handH: OutputHandle | null = null
    const samLoader = (): OutputHandle =>
      (samH ??= g.node('SAMLoader', { model_name: li.sam2 as string, device_mode: 'AUTO' }).out(0))
    // THE SEGM PROVIDER (the Impact Pack gap audit, 2026-10-08): the
    // pack's own detailer-pipe-test wires SegmDetectorSEGS — a
    // segmentation detector whose boxes come from CLASS-PIXEL masks
    // (tighter crops, no center-point guess). The detector model
    // comes from the card kit's detector catalog
    // (segm/person_yolov8m-seg.pt — ABSENT until 2026-10-09,
    // downloaded + provision-declared that night).
    const segmProvider = (): OutputHandle =>
      // SLOT 1 (proven live 2026-10-09: slot 0 is BBOX_DETECTOR —
      // wiring it into SegmDetectorSEGS.segm_detector 400s the run
      // with return_type_mismatch; the provider's own output list
      // is ["BBOX_DETECTOR", "SEGM_DETECTOR"]).
      (segmH ??= g.node(personDetector.providerNode, { model_name: personDetector.graphPath }).out(personDetector.providerOutput))
    const faceProvider = (): OutputHandle =>
      (faceH ??= g.node(faceDetector.providerNode, { model_name: faceDetector.graphPath }).out(faceDetector.providerOutput))
    const handProvider = (): OutputHandle =>
      (handH ??= g.node(handDetector.providerNode, { model_name: handDetector.graphPath }).out(handDetector.providerOutput))
    // ONE DETECTOR FAMILY PER ENTRY (the operator's 2026-10-09 order:
    // "ONLY the ones shown in the Impact Pack examples" — person,
    // face, hand, each on the pack's OWN specialized detector, exactly
    // as detailer-pipe-test.json wires them). A mixed set (person +
    // face) cannot share one detector call — split it across two sam2
    // entries, each with its own export. Refuses LOUD, never a
    // half-detected entry.
    const sam2detect = (labels: string, scope?: BboxDict, tune?: EntryTune): { mask: OutputHandle, segs: OutputHandle } => {
      if (labels === '') {
        throw new Error('maskT1: a sam2 selection needs labels (a detector class word — the card refuses empty)')
      }
      const words = labels.split(',').map((w) => w.trim()).filter((w) => w !== '')
      const fams = new Set(words.map((w) => w === 'person' ? 'segm' : 'bbox'))
      if (fams.size > 1) {
        throw new Error(`maskT1: one detector per sam2 entry — '${labels}' mixes detector families (person rides segm, face/hand ride bbox). Split it across two sam2 entries.`)
      }
      const segmLane = words[0] === 'person'
      // (ImpactSimpleDetectorSEGS was AUDITED and REJECTED for this
      // lane: it carries NO labels input — the class filter, the
      // operator's core demand, cannot ride it. The pack's own
      // labels-filtering test workflow (detailer-pipe-test.json)
      // wires BboxDetectorSEGS + SAMDetectorCombined exactly as
      // this lane does.)
      // THE WORD→FACTS MAP (the stroke's pin law, verbatim shape):
      // person rides the segm facts, face its bbox facts, EVERYTHING
      // else (hand, the 'all' wildcard, unstated words) the hand bbox
      // facts with labels verbatim — the pre-stroke ternary's exact
      // graph, only the pin source moved (caller strings → pack facts).
      const detector = segmLane ? personDetector
        : words[0] === 'face' ? faceDetector : handDetector
      const provider = segmLane ? segmProvider()
        : words[0] === 'face' ? faceProvider() : handProvider()
      const segs = g.node(detector.detectorNode, {
        [detector.detectorInput]: provider,
        image: img(),
        threshold: detectorThreshold(tune),
        dilation: tune?.detection_dilation ?? detectionDilation,
        crop_factor: tune?.crop_factor ?? cropFactor,
        drop_size: tune?.drop_size ?? dropSize,
        labels,
      }).out(0)
      // THE PER-INSTANCE CROPS (the gap audit's #3/#4 export half):
      // SEGSToImageList unwraps one crop per detected instance —
      // PreviewImage saves each — the per-instance readback the
      // pack's own examples ride (SEGSToImageList in
      // detailer-pipe-test + 5-prompt-per-tile). Automatic: the
      // crops ARE the manifest's granular sibling.
      g.node('SaveImage', {
        images: g.node('SEGSToImageList', { segs }).out(0),
        filename_prefix: `${runId}/instance`,
      })
      const refined = g.node('SAMDetectorCombined', {
        sam_model: samLoader(),
        segs,
        image: img(),
        detection_hint: 'center-1',
        dilation: tune?.dilation ?? dilation,
        threshold: tune?.threshold ?? samThreshold,
        bbox_expansion: tune?.box_expansion ?? bboxExpansion,
        mask_hint_threshold: tune?.hint_threshold ?? hintThreshold,
        mask_hint_use_negative: 'False',
      }).out(0)
      const mask = scope ? scopeMask(refined, scope) : refined
      return { mask, segs }
    }

    let primaryMask: OutputHandle | null = null
    let primarySegs: OutputHandle | null = null

    // THE PRIMARY SCOPE (the first standalone entry's drawn box —
    // the card threads it as scope_bbox; absent = unscoped). Every
    // SELECTION primary honors it; the paint primary never does (the
    // strokes ARE the mask — a scope would cut them).
    const scopeQuad = p.scope_bbox as [number, number, number, number] | undefined
    const primaryScope: BboxDict | undefined = scopeQuad && scopeQuad.length === 4
      ? { x: scopeQuad[0]!, y: scopeQuad[1]!, width: scopeQuad[2]!, height: scopeQuad[3]! }
      : undefined

    // ── the RT-DETR proposal lane (primary body + box manifest) ──
    let rtdetrBoxes: OutputHandle | null = null
    if (exportBoxes || viaRtdetr) {
      // THE CARD'S OWN LAW (the census's M10): max_instances 0 means
      // NO CAP ("0 = no cap" on the card's schema) and `|| 100` both
      // capped it and coerced every falsy value — so a default-omitted
      // request silently dropped detections past 100.
      const stated = p.max_instances as number | undefined
      const cap = stated === undefined || stated === 0 ? 0 : stated
      rtdetrBoxes = g.node('RTDETR_detect', {
        model: rtdetrLoader(),
        image: img(),
        threshold: detectorThreshold(),   // the SAME fold as the SAM2 detectors (audit 015 C5)
        class_name: 'person',
        max_detections: cap,
      }).out(0)
    }
    const primaryClass = p.primary_class as string | undefined
    const primaryPrompt = p.primary_prompt as string | undefined
    const viaSam2 = p.primary_via_sam2 as boolean
    const primarySam2Labels = p.primary_sam2_labels as string | undefined
    if (viaRtdetr && rtdetrBoxes) {
      primaryMask = detect(undefined, rtdetrBoxes)
      if (primaryScope) primaryMask = scopeMask(primaryMask, primaryScope)
      save(primaryMask, 'mask_combined')
    } else if (viaSam2) {
      const det = sam2detect(primarySam2Labels ?? 'all', primaryScope)
      primaryMask = det.mask
      primarySegs = det.segs
      save(primaryMask, 'mask_combined')
      // THE FIGURE MASKS (the operator's 2026-10-09 order: "how is it
      // going to select figure one or figure two"): the pack's own
      // ImpactSEGSPicker takes the primary detection's SEGS + a
      // 1-based pick ("2" = the second detected instance) and each
      // figure saves its own refined mask (mask_figure_<n>) — the
      // agent selects a figure by composing with figures: [2], no
      // manual box anywhere. The per-instance image crops
      // (run/instance) are the visual index into the same numbering.
      const figs = p.sam2_figures as number[] | undefined
      if (figs !== undefined) {
        if (!Array.isArray(figs) || figs.some((n) => !Number.isInteger(n) || (n as number) < 1)) {
          throw new Error(`maskT1: sam2_figures must be 1-based instance numbers — got ${JSON.stringify(figs).slice(0, 60)}`)
        }
        for (const n of [...new Set(figs)]) {
          const picked = g.node('ImpactSEGSPicker', { picks: String(n), segs: primarySegs }).out(0)
          // THE FIGURES RIDE THE SAME TWO-STEP (the operator's
          // 2026-10-09 audit: "their masking is a two step process —
          // YOLO/Segm, THEN extract the mask off the filtered area"):
          // the picker NARROWS the SEGS to figure <n>, then
          // SAMDetectorCombined refines THAT subset exactly as the
          // combined arm does — per-figure SAM masks for EVERY class
          // (person's YOLO segm OR face/hand's bare bbox crops alike;
          // SegsToCombinedMask alone would have rendered step-one
          // masks — rectangles on the bbox classes). Same loader
          // node, same pack-test scalars, the primary's own
          // dilation/threshold.
          const figMask = g.node('SAMDetectorCombined', {
            sam_model: samLoader(),
            segs: picked,
            image: img(),
            detection_hint: 'center-1',
            dilation,
            threshold: samThreshold,
            bbox_expansion: bboxExpansion,
            mask_hint_threshold: hintThreshold,
            mask_hint_use_negative: 'False',
          }).out(0)
          save(primaryScope ? scopeMask(figMask, primaryScope) : figMask, `mask_figure_${n}`)
        }
      }
    } else if (primaryClass) {
      // the drawn Region threads as the detect HINT too (the wall
      // caught it: exports threaded theirs, the primary did not —
      // the hint narrows the search, the multiply guarantees bounds)
      primaryMask = detect(clipCond(primaryClass), primaryScope)
      if (primaryScope) primaryMask = scopeMask(primaryMask, primaryScope)
      save(primaryMask, 'mask_combined')
    } else if (primaryPrompt) {
      primaryMask = detect(clipCond(primaryPrompt), primaryScope)
      if (primaryScope) primaryMask = scopeMask(primaryMask, primaryScope)
      save(primaryMask, 'mask_combined')
    } else if (p.primary_is_paint as boolean) {
      // NOTE: the engine primary `painted` and the exports' `paint_masked`
      // are DISTINCT locals — a paint primary plus a paint export renders
      // TWO LoadImageMask nodes (byte-identical inputs, two nodes). The
      // probe pins this.
      const painted = g.node('LoadImageMask', { image: ((p.paint_mask ?? '') as string), channel: 'alpha' }).out(0)
      primaryMask = painted
      save(painted, 'mask_combined')
    }

    // ── per-name exports ──
    // the third arm (optional) = the per-entry bbox [x, y, w, h];
    // the fourth arm (optional) = the per-entry TUNE (stroke 95 —
    // every knob a mask source owns rides its bag entry): threshold
    // / refine / dilation / detection_threshold overrides for THIS
    // export's selection. Malformed refuses LOUD (a drifted bag is
    // drift, never a skip); absent arms ride the lane-flat values
    // (the primary's tune — the card threads it flat).
    const exports = (p.exports as Array<[string, string, unknown?, unknown?]>) ?? []
    const kinds = (p.export_kind as string[]) ?? []
    const entryTune = (raw: unknown): EntryTune | undefined => {
      if (raw === undefined || raw === null) return undefined
      if (typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error(`maskT1: an export tune must be an object (threshold/refine/dilation/detection_threshold) — got ${JSON.stringify(raw).slice(0, 60)}`)
      }
      const t = raw as Record<string, unknown>
      // ONE list drives both gates (the audit's G1: the finite check
      // once covered only 4 of 9 keys — the 5 newer knobs flowed
      // unvalidated to node inputs, an engine 400 instead of a loud
      // lane refusal). Every value in a tune is a finite number.
      // the key set is the type's own members (TUNE_KEYS is derived),
      // so the membership test narrows the runtime string
      const known = new Set<string>(TUNE_KEYS as readonly string[])
      const unknown = Object.keys(t).filter((k) => !known.has(k))
      if (unknown.length > 0) {
        throw new Error(`maskT1: an export tune carries unknown key(s) ${unknown.join(', ')} — the vocabulary is ${TUNE_KEYS.join('/')}`)
      }
      for (const key of Object.keys(t)) {
        const v = t[key]
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          throw new Error(`maskT1: an export tune's '${key}' must be a finite number — got ${JSON.stringify(v).slice(0, 40)}`)
        }
      }
      return t as EntryTune
    }
    // SCOPE VALIDATION (the lane's own gate — the card threads the
    // primary entry's box here; a malformed quad refuses LOUD, never
    // a silently unscoped primary).
    if (scopeQuad && scopeQuad.length !== 4) {
      throw new Error(`scope_bbox refused on the mask-studio card: needs exactly [x, y, w, h] pixels (got ${scopeQuad.length} values)`)
    }
    // PER-ENTRY PAINT PAYLOADS (the ordered-draw law, stroke 78): each
    // draw owns its PNG — cached by path (two draws on one payload
    // render ONE LoadImageMask; two payloads render two).
    const paintByPath = new Map<string, OutputHandle>()
    const loadPaint = (path: string): OutputHandle => {
      let m = paintByPath.get(path)
      if (m === undefined) {
        m = g.node('LoadImageMask', { image: path, channel: 'alpha' }).out(0)
        paintByPath.set(path, m)
      }
      return m
    }
    // THE PER-ENTRY BBOX (stroke 78): the export's THIRD arm —
    // [x, y, w, h] pixels, the bbox-canvas leaf's drawn rectangle.
    // Malformed refuses LOUD (a drifted bag is drift, never a skip);
    // absent falls to the scope, then the renderer default.
    const entryBbox = (raw: unknown): { x: number; y: number; width: number; height: number } | undefined => {
      if (raw === undefined || raw === null) return undefined
      if (!Array.isArray(raw) || raw.length !== 4) {
        throw new Error(`maskT1: an export bbox must be [x, y, w, h] pixels — got ${JSON.stringify(raw).slice(0, 60)}`)
      }
      const quad = raw.map(Number)
      if (quad.some((v) => !Number.isFinite(v))) {
        throw new Error(`maskT1: an export bbox needs four finite numbers — got ${JSON.stringify(raw).slice(0, 60)}`)
      }
      return { x: quad[0]!, y: quad[1]!, width: quad[2]!, height: quad[3]! }
    }
    const n = Math.min(exports.length, kinds.length)   // zip: the shorter arm wins
    for (let i = 0; i < n; i++) {
      const trip = exports[i]
      const name = trip[0]
      const payload = trip[1]
      const kind = kinds[i]
      if (kind === 'paint') {
        // per-entry first (the draw's own PNG), the lane-global paint
        // second (the studio flat-mode contract stays)
        const path = typeof payload === 'string' && payload !== '' ? payload : ((p.paint_mask ?? '') as string)
        if (path === '') {
          throw new Error(`maskT1: paint export '${name}' needs a payload — the drawn PNG is the mask`)
        }
        save(loadPaint(path), `mask_${name}`)
        continue
      }
      let conditioning: OutputHandle | undefined
      if (kind !== 'sam2' && payload) {
        // the text lane rides EVEN under scope (boxes to segment within
        // + the vocabulary) — a scope never silently drops the prompt.
        // sam2 exports skip it (their payload is the detector labels
        // word — the detector proposes, SAM2 refines, never CLIP).
        conditioning = clipCond(payload)
      }
      // THE PER-ENTRY BOX (stroke 78): the export's OWN third arm —
      // the card-wide scope_bbox is the PRIMARY's box and never leaks
      // into an export (an export without its own box runs unscoped).
      const bboxes = entryBbox(trip[2])
      // THE PER-ENTRY TUNE (stroke 95): the export's OWN fourth arm.
      const tune = entryTune(trip[3])
      if (kind === 'sam2') {
        if (typeof payload !== 'string' || payload === '') {
          throw new Error(`maskT1: sam2 export '${name}' needs labels (a detector class word — the card refuses empty)`)
        }
        const sel = sam2detect(payload, bboxes ? { x: bboxes.x, y: bboxes.y, width: bboxes.width, height: bboxes.height } : undefined, tune)
        save(sel.mask, `mask_${name}`, tune?.dilation)
        continue
      }
      const sel = detect(conditioning, bboxes, tune)
      save(sel, `mask_${name}`, tune?.dilation)
    }

    // THE ORDERED UNION CHAIN (stroke 78 — the ordered-draw law): a
    // draw STACKS — each payload unions onto the running mask (the
    // previous outputs), in array order, one composite per hop; the
    // terminal mask saves as combined_union. Replaces nothing — the
    // single-payload boolean arm below keeps the flat-mode contract.
    const paintChain = p.paint_masks as string[] | undefined
    if (paintChain !== undefined) {
      if (!Array.isArray(paintChain) || paintChain.some((e) => typeof e !== 'string')) {
        throw new Error('maskT1: paint_masks must be an array of payload paths (the ordered draw stack)')
      }
      if (primaryMask === null && paintChain.length > 0) {
        throw new Error('maskT1: paint_masks stacks ONTO a mask — add a standalone source (sam2/sam3) first')
      }
      if (paintChain.length > 0 && primaryMask !== null) {
        let acc: OutputHandle = dilate(primaryMask)
        for (const path of paintChain) {
          if (path === '') continue
          acc = g.node('MaskComposite', {
            destination: acc,
            source: loadPaint(path),
            x: 0,
            y: 0,
            operation: 'add',
          }).out(0)
        }
        save(acc, 'mask_combined_union')
      }
    }

    // paint unions into combined (flat-mode export_paint contract —
    // the global payload's mask, ONE hop)
    if ((p.union_paint_into_combined as boolean) && primaryMask) {
      const globalPath = ((p.paint_mask ?? '') as string)
      if (globalPath !== '') {
        const combined = g.node('MaskComposite', {
          destination: dilate(primaryMask),   // a SECOND GrowMask on the primary under union
          source: loadPaint(globalPath),
          x: 0,
          y: 0,
          operation: 'add',
        }).out(0)
        save(combined, 'mask_combined_union')
      }
    }

    // ── the box manifest (drawn) — the instance readback ──
    if (exportBoxes && rtdetrBoxes) {
      const drawn = g.node('DrawBBoxes', { bboxes: rtdetrBoxes, image: img() })
      return g.node('SaveImage', { images: drawn.out(0), filename_prefix: `${prefix}/detect_boxes` }).out(0)
    }
    // no primary and no export is refused upstream (the admission law),
    // so a composed lane always has a mask handle to declare
    return saved ?? primaryMask ?? (img() as OutputHandle)
  }
};
