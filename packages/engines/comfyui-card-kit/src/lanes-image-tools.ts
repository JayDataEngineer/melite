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
// see packages/image/mask/src/lane.ts, kept there).

type BboxDict = { x: number; y: number; width: number; height: number }

/** The per-export TUNE (stroke 95 — every knob a mask source owns
 *  rides its bag entry; the card threads each export's own tune as
 *  the trip's fourth arm). Absent arms ride the lane-flat values
 *  (the primary's tune). */
/** The one tune vocabulary (the audit's G1: vocab + finite-check
 *  share this list — a new key added to the type but not here is a
 *  compile-time refusal, never a silent unvalidated flow). */
/** The tune bag's SHAPE — the type is the owner. */
// THE MASK LANE IS THE CARD'S DECLARED ACTION (the kit-arm
// retirement, 2026-09-30 — closed by the card-system stroke): the
// mask studio boards no family, so its lane lives in
// packages/image/mask/src/lane.ts as a declared action — the pins
// are its facts, the knobs its params, the tree its build, and its
// walls moved with it (packages/image/mask/tests/lane-laws.spec.ts).
// This module keeps what is still shared: the finalize strips below,
// the impact detector catalog's provisions, and the vocabularies the
// card's schema declares its knobs from.

// THE UPSCALE LANE IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30):
// the seedvr2_ema family composes its own upscale arm in its declared
// action (packages/models/seedvr2_ema/src/actions.ts, pinned to
// committed goldens in that family's tests/golden/ — the spelled
// anchor, the seed sentinel and the lane-weight refusals included).
// This arm is deleted; the family is the only home of the lane.
// THE INPUT-PREP LANE IS FAMILY-OWNED (the kit-arm retirement,
// 2026-09-30): the input family composes its own restage lane in its
// declared action (packages/models/input/src/actions.ts, pinned to
// committed goldens in that family's tests/golden/). This arm and
// its row shapes are deleted; the family is the only home of the
// lane. The CropRow/ScaleRow types go with it — the action declares
// the row shape it reads.

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
  'Mention whether the image depicts an extreme close-up, close-up, medium close-up, medium shot, cowboy shot, medium wide shot, wide shot, or extreme wide shot.',
  'ONLY describe the most important elements of the image.',
  'Specify the depth of field and whether the background is in focus or blurred.',
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
export function taggerSaveText(g: GraphBuilder, text: OutputHandle, prefix: string): NodeRef {
  return g.node('SaveText', { text, filename_prefix: prefix, format: 'txt' })
}

// THE TAGGER LANE IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30):
// the four tagger families compose their own arms in their declared
// actions (wd14, joytag, florence2, joycaption — packages/models/*/
// src/actions.ts), each pinned to a committed golden in its own
// tests/golden/. This dispatch and its four arm bodies are deleted;
// the families are the only home of the lane. taggerSaveText (the
// consensus SaveText tail every arm shares) and the caption
// vocabularies above stay — they are vocabulary and a graph helper,
// not a lane.
