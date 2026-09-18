import { GraphBuilder, OutputHandle, stripAutofill } from './graph.ts'
import type { NodeInputs, NodeRef, PromptGraph, StripTable } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import { mintSeed } from './graph-helpers.ts'

// ── the mask selection lane ─────────────────────────────────────────
// RT-DETR proposes, SAM3 refines; loaders are lazy (reachability —
// see the mask-studio card header, kept there).

type BboxDict = { x: number; y: number; width: number; height: number }

/** The mask_t1 block — the selection lane (detect → refine → save),
 *  moved verbatim from the mask-studio card; the input_image
 *  admission stays on the card. */
export function maskT1(p: Record<string, unknown>, pins: { checkpoint: string; unet: string }, g: GraphBuilder, runId: string): void {
  const li = pins          // the ACTION CARD owns its pins (no model row — mask-studio is a tool, not weights)
  const prefix = `${runId}/mask`        // the arm's "%s/mask" % run_id
  const samThreshold = p.sam_threshold as number
  // undeclared legacy renderer keys ride the door's explicit-params
  // overlay (see schema header) — schema-required paint_mask renders
  // ''-absent at compose (image-gen precedent), refine_iterations
  // falls back to its old schema pin 2 when no explicit names it.
  const refineIterations = ((p.refine_iterations ?? 2) as number)
  const dilation = p.sam_dilation as number
  const exportBoxes = p.export_boxes as boolean
  const viaRtdetr = p.primary_via_rtdetr as boolean

  // the lazy loader trio (see the header note — created on first use)
  let imgH: OutputHandle | null = null
  let ckpt: NodeRef | null = null
  let rtdetrModel: OutputHandle | null = null
  const img = (): OutputHandle => (imgH ??= g.node('LoadImage', { image: p.input_image as string }).out(0))
  const ckptNode = (): NodeRef => (ckpt ??= g.node('CheckpointLoaderSimple', { ckpt_name: li.checkpoint as string }))
  const rtdetrLoader = (): OutputHandle =>
    (rtdetrModel ??= g.node('UNETLoader', { unet_name: li.unet as string, weight_dtype: 'default' }).out(0))

  const clipCond = (text: string): OutputHandle =>
    g.node('CLIPTextEncode', { text, clip: ckptNode().out(1) }).out(0)

  // the pin's declared default for SAM3_Detect.bboxes (socketless,
  // forceInput): comfy-script autofills it whenever the caller passes
  // no bboxes, and it is not stripped — the served shape
  // carries it on every bboxes-less SAM3_Detect.
  const DEFAULT_BBOXES: BboxDict = { x: 0, y: 0, width: 512, height: 512 }

  const detect = (conditioning?: OutputHandle, bboxes?: OutputHandle | BboxDict): OutputHandle => {
    const inputs: NodeInputs = {
      model: ckptNode().out(0),
      image: img(),
      threshold: samThreshold,
      refine_iterations: refineIterations,
      individual_masks: false,
    }
    if (conditioning) inputs.conditioning = conditioning
    inputs.bboxes = bboxes ?? DEFAULT_BBOXES
    return g.node('SAM3_Detect', inputs).out(0)     // (masks, bboxes) → masks
  }

  const dilate = (mask: OutputHandle): OutputHandle =>
    dilation ? g.node('GrowMask', { mask, expand: dilation, tapered_corners: true }).out(0) : mask

  const save = (mask: OutputHandle, name: string): void => {
    const m2i = g.node('MaskToImage', { mask: dilate(mask) })
    g.node('SaveImage', { images: m2i.out(0), filename_prefix: `${prefix}/${name}` })
  }

  let primaryMask: OutputHandle | null = null

  // ── the RT-DETR proposal lane (primary body + box manifest) ──
  let rtdetrBoxes: OutputHandle | null = null
  if (exportBoxes || viaRtdetr) {
    const cap = (p.max_instances as number) || 100
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
  if (viaRtdetr && rtdetrBoxes) {
    primaryMask = detect(undefined, rtdetrBoxes)
    save(primaryMask, 'mask_combined')
  } else if (primaryClass) {
    primaryMask = detect(clipCond(primaryClass))
    save(primaryMask, 'mask_combined')
  } else if (primaryPrompt) {
    primaryMask = detect(clipCond(primaryPrompt))
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
  // the third arm (optional) = the per-entry bbox [x, y, w, h]
  const exports = (p.exports as Array<[string, string, unknown?]>) ?? []
  const kinds = (p.export_kind as string[]) ?? []
  const scopeBbox = p.scope_bbox as [number, number, number, number] | undefined
  if (scopeBbox && scopeBbox.length !== 4) {
    throw new Error(`scope_bbox refused on the mask-studio card: needs exactly [x, y, w, h] pixels (got ${scopeBbox.length} values)`)
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
    if (payload) {
      // the text lane rides EVEN under scope (boxes to segment within
      // + the vocabulary) — a scope never silently drops the prompt
      conditioning = clipCond(payload)
    }
    const bboxes = entryBbox(trip[2]) ?? (scopeBbox
      ? { x: scopeBbox[0], y: scopeBbox[1], width: scopeBbox[2], height: scopeBbox[3] }
      : undefined)
    const sel = detect(conditioning, bboxes)
    save(sel, `mask_${name}`)
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
  const img = g.node('LoadImage', { image: p.input_image }).out()
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

/** Pin autofills the lane strips post-walk (moved
 *  verbatim from the tagger card). */
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

/** The SaveText tail (every arm's consensus — moved verbatim from
 *  the tagger card). */
function taggerSaveText(g: GraphBuilder, text: OutputHandle, prefix: string): void {
  g.node('SaveText', { text, filename_prefix: prefix, format: 'txt' })
}

/** wd14_t1 — the WD14 booru interrogator (the canary arm; moved
 *  verbatim from the tagger card). */
function wd14Arm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  const src = g.node('LoadImage', { image: img })
  const tags = g.node('WD14Tagger|pysssss', {
    image: src.out(),
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
  const src = g.node('LoadImage', { image: img })
  const tags = g.node('CXH_JoyTag', {
    image: src.out(),
    THRESHOLD: p.threshold,
    addTag: p.add_tag,
    removeTag: p.remove_tag,
  })
  taggerSaveText(g, tags.out(0), prefix)
}

/** florence2_t1 — the Florence-2 captioner (moved verbatim from the
 *  tagger card). */
function florence2Arm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  const src = g.node('LoadImage', { image: img })
  const fl2 = g.node('DownloadAndLoadFlorence2Model', {
    model: p.checkpoint,
    precision: 'fp16',
  })
  const run = g.node('Florence2Run', {
    image: src.out(),
    florence2_model: fl2.out(),
    text_input: '',
    task: p.caption_task,
    fill_mask: true,
  })
  taggerSaveText(g, run.out(2), prefix)
}

/** joycaption_t1 — the JoyCaption VLM (moved verbatim from the
 *  tagger card). */
function joycaptionArm(p: Record<string, unknown>, g: GraphBuilder, img: string, prefix: string): void {
  const src = g.node('LoadImage', { image: img })
  const predictor = g.node('JJC_DownloadAndLoadJoyCaptionModel', {
    model: p.checkpoint,
    memory_mode: 'Default',
    keep_loaded: false,
  })
  const caption = g.node('JJC_JoyCaption', {
    model: predictor.out(),
    image: src.out(),
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
