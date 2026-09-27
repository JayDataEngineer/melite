import { GraphBuilder, OutputHandle, stripAutofill } from './graph.ts'
import type { NodeInputs, NodeRef, PromptGraph, StripTable } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import { mintSeed } from './graph-helpers.ts'
import { impactDetector } from './impact.ts'

const personDetector = impactDetector('person')
const faceDetector = impactDetector('face')
const handDetector = impactDetector('hand')

/** The wired-tensor law (the lanes-image precedent, ported 1:1):
 *  a '$name' value names an upstream stage's wired output — the
 *  spell IS the tensor and rides node inputs verbatim. ROW-4
 *  refuses producer links in Load* file slots, so a spelled image
 *  NEVER builds a loader; file paths keep the disk handoff. */
type TensorRef = OutputHandle | string
const isSpell = (s: string): boolean => s.startsWith('$')

// ── the mask selection lane ─────────────────────────────────────────
// RT-DETR proposes, SAM3 refines; loaders are lazy (reachability —
// see the mask-studio card header, kept there).

type BboxDict = { x: number; y: number; width: number; height: number }

/** The per-export TUNE (stroke 95 — every knob a mask source owns
 *  rides its bag entry; the card threads each export's own tune as
 *  the trip's fourth arm). Absent arms ride the lane-flat values
 *  (the primary's tune). */
/** The one tune vocabulary (the audit's G1: vocab + finite-check
 *  share this list — a new key added to the type but not here is a
 *  compile-time refusal, never a silent unvalidated flow). */
/** The tune bag's SHAPE — the type is the owner. */
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

/** The mask_t1 block — the selection lane (detect → refine → save),
 *  moved verbatim from the mask-studio card; the input_image
 *  admission stays on the card. TWO selection families: the SAM3
 *  CLIP/RT-DETR leg (checkpoint + unet pins) and the SAM2
 *  impact-pack arm (sam2 + the pack's own specialized detectors —
 *  person on segm, face/hand on their bbox models — the detector
 *  proposes, SAM2 refines). */
export function maskT1(p: Record<string, unknown>, pins: { checkpoint: string; unet: string; sam2: string }, g: GraphBuilder, runId: string): void {
  const li = pins          // the ACTION CARD owns its pins (no model row — mask-studio is a tool, not weights)
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

  const save = (mask: OutputHandle, name: string, d?: number): void => {
    const m2i = g.node('MaskToImage', { mask: dilate(mask, d) })
    g.node('SaveImage', { images: m2i.out(0), filename_prefix: `${prefix}/${name}` })
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
  // (tighter crops, no center-point guess). The pin rides the
  // card's PINS row (segm/person_yolov8m-seg.pt — ABSENT until
  // 2026-10-09, downloaded + provision-declared that night).
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
      threshold: (tune?.detection_threshold ?? (p.detection_threshold as number | undefined) ?? 0.5),
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
      threshold: p.detection_threshold as number,
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
    g.node('SaveImage', { images: drawn.out(0), filename_prefix: `${prefix}/detect_boxes` })
  }
}

/** The seedvr2_t1 block — the submittable upscale arm (moved verbatim
 *  from the upscale-tools card; the input_image admission stays on
 *  the card). That lane does NOT strip pin autofills — no
 *  finalize pass. */
export function upscaleLane(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const seed = mintSeed(p)
  const li = model.lane_inputs
  // THE SPELLED ANCHOR (same law as maskT1's img memo above: a
  // wired input_image rides the upscaler's tensor slot verbatim —
  // the spells decl pools initials at phase-1 only, so a producer
  // LINK still needs this arm or ROW-4 refuses it at merge).
  const img: TensorRef = isSpell(p.input_image as string)
    ? (p.input_image as string)
    : g.node('LoadImage', { image: p.input_image }).out()
  const dit = g.node('SeedVR2LoadDiTModel', {
    model: li.unet as string,
    device: 'cuda:0',
  }).out()
  const vae = g.node('SeedVR2LoadVAEModel', {
    model: li.vae as string,
    device: 'cuda:0',
  }).out()
  const up = g.node('SeedVR2VideoUpscaler', {
    image: img,
    dit,
    vae,
    seed,
    resolution: p.resolution,
    max_resolution: p.max_resolution,
    batch_size: p.batch_size,
    uniform_batch_size: true,
  }).out()
  g.node('SaveImage', { images: up, filename_prefix: `${runId}/gen` })
}

interface CropRow { x: number; y: number; width: number; height: number }
interface ScaleRow { width: number; height: number; method?: string }

/** The input_prep block — the staged-source transform lane (moved
 *  verbatim from the input-prep card; the source admission stays on
 *  the card). No model ever loads (weightless lane). */
export function inputPrepLane(p: Record<string, unknown>, g: GraphBuilder, runId: string): void {
  const prefix = `${runId}/input_prep`     // the arm's "%s/input_prep" % run_id

  if (p.media_type === 'audio') {
    const loaded = g.node('LoadAudio', { audio: p.source as string })
    g.node('SaveAudio', { audio: loaded.out(), filename_prefix: prefix })
    return
  }

  let img: OutputHandle = g.node('LoadImage', { image: p.source as string }).out(0)
  const crop = p.crop as CropRow | undefined
  if (crop) {
    for (const k of ['x', 'y', 'width', 'height'] as const) {
      if (typeof crop[k] !== 'number') {
        throw new Error(`crop row refused on the input-prep card: '${k}' must be a number (got ${JSON.stringify(crop[k])})`)
      }
    }
    img = g.node('ImageCrop', { image: img, x: crop.x, y: crop.y, width: crop.width, height: crop.height }).out(0)
  }
  const scale = p.scale as ScaleRow | undefined
  if (scale) {
    if (typeof scale.width !== 'number' || typeof scale.height !== 'number') {
      throw new Error(`scale row refused on the input-prep card: 'width'/'height' must be numbers (got ${JSON.stringify(scale)})`)
    }
    const method = typeof scale.method === 'string' ? scale.method : 'lanczos'
    img = g.node('ImageScale', { image: img, upscale_method: method, width: scale.width, height: scale.height, crop: 'disabled' }).out(0)
  }
  g.node('SaveImage', { images: img, filename_prefix: prefix })
}

// ── archetype IV: the tagger family ─────────────────────────────────
// Four arms, one card: each arm's node creation order mirrors its
// construction. The lane is weightless — every wire value
// comes from params. The closed caption vocabs live here because the
// card schemas reference them (leaf keys/defaults stay
// card-declared, wall-verified).

/** THE 512-HINT STRIP (the red-box hunt's third bug, 2026-10-08):
 *  SAM3_Detect's node definition declares a bboxes DEFAULT of
 *  {0,0,512,512} (a widget seed for the UI), and the GraphBuilder
 *  autofills it onto every detect that passes no hint — a latent
 *  quarter-blind hazard on any image larger than 512px (audit
 *  2026-10-09: the observed empty mask was the 0.93 threshold, NOT
 *  this hint — 0.93 → 0.00% with and without it, 0.5 → 6.5%; the
 *  strip is correct hardening all the same). The engine's node
 *  default is Layer B truth — never edited — so the strip lives
 *  HERE: delete bboxes ONLY when it still equals the autofilled
 *  default verbatim. Non-default quads and link handles (RT-DETR's
 *  own boxes) survive untouched. KNOWN EDGE: a region drawn
 *  EXACTLY (0,0,512,512) loses its hint at runtime — benign,
 *  because the scopeMask multiply still bounds the mask to the
 *  drawn box, independent of the hint. */
export function finalizeMask(graph: PromptGraph): PromptGraph {
  for (const node of Object.values(graph)) {
    if (node.class_type !== 'SAM3_Detect') continue
    const b = node.inputs['bboxes']
    if (b !== null && typeof b === 'object' && !Array.isArray(b)) {
      const d = b as Record<string, unknown>
      if (d['x'] === 0 && d['y'] === 0 && d['width'] === 512 && d['height'] === 512) {
        delete node.inputs['bboxes']
      }
    }
  }
  return graph
}

export const TAGGER_STRIP: StripTable = {
  LoadImage: ['upload'],
  DownloadAndLoadFlorence2Model: ['convert_to_safetensors'],
  Florence2Run: ['do_sample', 'keep_model_loaded', 'max_new_tokens', 'num_beams', 'output_mask_select', 'seed'],
}

export function finalizeTagger(graph: PromptGraph): PromptGraph {
  return stripAutofill(graph, TAGGER_STRIP)
}

// ── the closed caption vocabs (—
// moved from the tagger card so all four arms share one spelling) ──
export const TAGGER_CAPTION_TASKS = [
  'caption', 'caption_to_phrase_grounding', 'dense_region_caption',
  'detailed_caption', 'docvqa', 'more_detailed_caption', 'ocr',
  'ocr_with_region', 'prompt_gen_analyze', 'prompt_gen_mixed_caption',
  'prompt_gen_mixed_caption_plus', 'prompt_gen_tags',
  'referring_expression_segmentation', 'region_caption', 'region_proposal',
]
export const TAGGER_CAPTION_TYPES = [
  'Art Critic', 'Booru-like tag list', 'Danbooru tag list',
  'Descriptive', 'Descriptive (Casual)', 'MidJourney',
  'Product Listing', 'Rule34 tag list', 'Social Media Post',
  'Stable Diffusion Prompt', 'Straightforward', 'e621 tag list',
]
// the named six + word counts 20-260 by tens (the node's combo set).
export const TAGGER_CAPTION_LENGTHS = [
  'any', 'very short', 'short', 'medium-length', 'long', 'very long',
  ...Array.from({ length: 25 }, (_, i) => String(20 + i * 10)),
]
export const TAGGER_EXTRA_OPTIONS = [
  '',
  'Do NOT include anything sexual; keep it PG.',
  'Do NOT include information about people/characters that cannot be changed (like ethnicity, gender, etc), but do still include changeable attributes (like hair style).',
  'Do NOT mention any text that is in the image.',
  'Do NOT mention the image\'s resolution.',
  'Do NOT use any ambiguous language.',
  'Do NOT use polite euphemisms—lean into blunt, casual phrasing.',
  'Do not mention the mood/feeling/etc of the image.',
  'Explicitly specify the vantage height (eye-level, low-angle worm’s-eye, bird’s-eye, drone, rooftop, etc.).',
  'Identify the image orientation (portrait, landscape, or square) and aspect ratio if obvious.',
  'If applicable, mention the likely use of artificial or natural lighting sources.',
  'If it is a photo you MUST include information about what camera was likely used and details such as aperture, shutter speed, ISO, etc.',
  'If it is a work of art, do not include the artist\'s name or the title of the work.',
  'If there is a person/character in the image you must refer to them as {name}.',
  'If there is a watermark, you must mention it.',
  'Include information about camera angle.',
  'Include information about lighting.',
  'Include information about the ages of any people/characters when applicable.',
  'Include information about whether there are JPEG artifacts or not.',
  'Include information about whether there is a watermark or not.',
  'Include information on the image\'s composition style, such as leading lines, rule of thirds, or symmetry.',
  'Include whether the image is sfw, suggestive, or nsfw.',
  'Mention whether the image depicts an extreme close-up, close-up, medium shot, cowboy shot, medium wide shot, wide shot, or extreme wide shot.',
  'ONLY describe the most important elements of the image.',
  'Specify the depth of field and whether the background is in focus or blurred.',
  'Use vulgar slang and profanity, such as (but not limited to) "[REDACTED 2026-11-05]," "[REDACTED 2026-11-05]," "[REDACTED 2026-11-05]," etc.',
  'You MUST include information about the subjective aesthetic quality of the image from low to very high.',
  'Your response will be used by a text-to-image model, so avoid useless meta phrases like “This image shows…”, "You are looking at...", etc.',
]

// ── NO tagger checkpoint vocabs live here (the weights law,
// 2026-09-22): the closed sets are the families' own variant rows
// (wd14/florence2 DECLs — resolver_defaults stamp the pick), the
// schema declares no weights knob. A vocabulary() here would be a
// second picker around the variant rail — do not re-add one.

/** The SaveText tail (every arm's consensus — moved verbatim from
 *  the tagger card). */
function taggerSaveText(g: GraphBuilder, text: OutputHandle, prefix: string): void {
  g.node('SaveText', { text, filename_prefix: prefix, format: 'txt' })
}

/** wd14_t1 — the WD14 booru interrogator (the canary arm; moved
 *  verbatim from the tagger card). */
function wd14Arm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  // THE SPELLED ANCHOR (same law — every arm bypasses the loader
  // for a wired image; the tagger dispatch admits the spell).
  const src: TensorRef = isSpell(img) ? img : g.node('LoadImage', { image: img }).out()
  const tags = g.node('WD14Tagger|pysssss', {
    image: src,
    model: p.checkpoint,
    threshold: p.threshold,
    character_threshold: p.character_threshold,
    replace_underscore: p.replace_underscore,
    trailing_comma: p.trailing_comma,
    exclude_tags: p.exclude_tags,
  })
  taggerSaveText(g, tags.out(0), prefix)
}

/** joytag_t1 — the JoyTag booru tagger (moved verbatim from the
 *  tagger card). */
function joytagArm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  const src: TensorRef = isSpell(img) ? img : g.node('LoadImage', { image: img }).out()
  const tags = g.node('CXH_JoyTag', {
    image: src,
    THRESHOLD: p.threshold,
    addTag: p.add_tag,
    removeTag: p.remove_tag,
  })
  taggerSaveText(g, tags.out(0), prefix)
}

/** florence2_t1 — the Florence-2 captioner (moved verbatim from the
 *  tagger card). The weights arrive on the SHARED `checkpoint` key —
 *  stamped by the variant rail (resolver_defaults) or the family
 *  default, admitted by the card, never a schema knob. */
function florence2Arm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  const src: TensorRef = isSpell(img) ? img : g.node('LoadImage', { image: img }).out()
  const fl2 = g.node('DownloadAndLoadFlorence2Model', {
    model: p.checkpoint,
    precision: 'fp16',
  })
  const run = g.node('Florence2Run', {
    image: src,
    florence2_model: fl2.out(),
    text_input: '',
    task: p.caption_task,
    fill_mask: true,
  })
  taggerSaveText(g, run.out(2), prefix)
}

/** joycaption_t1 — the JoyCaption VLM (moved verbatim from the
 *  tagger card). Same shared `checkpoint` key — the family default
 *  stamps beta-one; custom repo ids / local paths ride explicit
 *  params (API/bare bodies), upstream takes free text. */
function joycaptionArm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  const src: TensorRef = isSpell(img) ? img : g.node('LoadImage', { image: img }).out()
  const predictor = g.node('JJC_DownloadAndLoadJoyCaptionModel', {
    model: p.checkpoint,
    memory_mode: 'Default',
    keep_loaded: false,
  })
  const caption = g.node('JJC_JoyCaption', {
    model: predictor.out(),
    image: src,
    caption_type: p.caption_type,
    caption_length: p.caption_length,
    extra_option1: p.extra_option,
    extra_option2: '',
    extra_option3: '',
    extra_option4: '',
    extra_option5: '',
    person_name: '',
    max_new_tokens: 512,
    temperature: 0.6,
    top_p: 0.9,
    top_k: 0,
  })
  taggerSaveText(g, caption.out(1), prefix)
}

// family → arm (the _ARMS board dict — the model id IS the
// family; dispatch is data, never a switch statement per lane).
export const TAGGER_ARMS: Record<string, (p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string) => void> = {
  wd14: wd14Arm,
  joytag: joytagArm,
  florence2: florence2Arm,
  joycaption: joycaptionArm,
}

/** The tagger dispatch — arm lookup + run-scoped prefix (the card
 *  keeps the input_image admission + family requires; moved from the
 *  tagger card's compose tail). */
export function taggerLane(p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void {
  const img = typeof p.input_image === 'string' ? p.input_image : ''
  const arm = TAGGER_ARMS[model.id]
  if (!arm) {
    throw new Error(`tagger model '${model.id}' has no arm (known families: ${Object.keys(TAGGER_ARMS).sort().join(', ')})`)
  }
  // compose stamps the prefix — <run>/tags (never a user knob).
  arm(p, g, img, `${runId}/tags`)
}
