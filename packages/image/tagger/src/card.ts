// Tier 3 — the tagger card (the wd14_t1 / joytag_t1 / florence2_t1 /
// joycaption_t1 renderer ports; the image prompt-inversion card).
// Decl + admission + family dispatch — the four arms live in
// src/kit.ts (TAGGER_ARMS); the lane is weightless, every wire value
// comes from params.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { taggerLane, finalizeTagger, TAGGER_CAPTION_TASKS, TAGGER_CAPTION_TYPES, TAGGER_CAPTION_LENGTHS, TAGGER_EXTRA_OPTIONS } from '@melite/comfyui-card-kit'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'

declare module '@melite/comfyui-cordis/service' {
  interface CardDefinition {
    /** Per-family extension packs — the requires_by_family declaration.
     *  The compose door gates the active family's slice, never the
     *  flat union alone. */
    requiresByFamily?: Record<string, readonly string[]>
  }
}

// the wire param surface (TaggerCard — the union vocab; each arm
// wires its subset). Ride keys carry NO .default (ABSENT: the
// compose-door cascade overlays model defaults, then explicit
// params): input_image is required (refused blank in compose);
// exclude_tags/add_tag/remove_tag/extra_option are defaultless
// optionals, each backfilled by the families whose arms read it
// (wd14→exclude_tags, joytag→add_tag/remove_tag,
// joycaption→extra_option). Bare z.string() is the image-gen prompt
// precedent (optional at parse, refused loud at compose).
// THE WEIGHTS LAW (2026-09-22 — the variant rail owns the
// checkpoint; the schema declares NO weights knob): Model/Variant/
// Quant is the ONE picker — the validate layer stamps the selected
// variant's resolver_defaults into the body (stampCardOverlay,
// absent-keys-only), the compose door overlays the family default,
// the lane reads p.checkpoint. The key rides `admits` below (the
// input-prep crop/media_type/scale precedent: admitted route stamps,
// never rendered). A card-level checkpoint knob — select or text —
// is a second picker around the card system and is forbidden here.
// JoyCaption's upstream takes any repo id or local path, so its
// family keeps ONE Standard variant on the family default; custom
// paths ride explicit params (API/bare bodies).
const schema = z.object({
  input_image: z.string().role('path').description("Input image").extra('extra', { order: 0, group: "input", width: 1, tooltip: "The image to invert. Absolute mount path or artifact ref.", required: true, wtype: 'image', }),
  threshold: z.number().description("Threshold").min(0).max(1).step(0.05).default(0.35).extra('extra', { order: 1, group: "tagger", width: 1, tooltip: "General-tag confidence floor." }),
  character_threshold: z.number().description("Character threshold").min(0).max(1).step(0.05).default(0.85).extra('extra', { order: 2, group: "tagger", width: 1, tooltip: "Character-tag confidence floor — keep high." }),
  exclude_tags: z.string().description("Exclude tags").extra('extra', { order: 3, group: "tagger", width: 1, tooltip: "Comma-separated tags to prune from the output." }),
  replace_underscore: z.boolean().description("Replace underscores").default(false).extra('extra', { order: 4, group: "tagger", width: 1, tooltip: "Emit \"silver hair\" instead of \"silver_hair\"." }),
  trailing_comma: z.boolean().description("Trailing comma").default(false).extra('extra', { order: 5, group: "tagger", width: 1, tooltip: "Terminate the tag list with a comma (prompt-paste shape)." }),
  add_tag: z.string().description("Add tag").extra('extra', { order: 6, group: "tagger", width: 1, tooltip: "JoyTag: tags force-prepended to the output (comma-separated). Ignored by WD14." }),
  remove_tag: z.string().description("Remove tag").extra('extra', { order: 7, group: "tagger", width: 1, tooltip: "JoyTag: tags pruned from the output (comma-separated). Ignored by WD14." }),
  caption_task: vocabulary(["region_caption", "dense_region_caption", "region_proposal", "caption", "detailed_caption", "more_detailed_caption", "caption_to_phrase_grounding", "referring_expression_segmentation", "ocr", "ocr_with_region", "docvqa", "prompt_gen_tags", "prompt_gen_mixed_caption", "prompt_gen_analyze", "prompt_gen_mixed_caption_plus"]).description("Caption task").default("more_detailed_caption").extra('extra', { order: 8, group: "tagger", width: 1, tooltip: "Florence-2: the vision task (live task vocabulary). Ignored by WD14/JoyTag.", wtype: 'select' }),
  caption_type: vocabulary(["Descriptive", "Descriptive (Casual)", "Straightforward", "Stable Diffusion Prompt", "MidJourney", "Danbooru tag list", "e621 tag list", "Rule34 tag list", "Booru-like tag list", "Art Critic", "Product Listing", "Social Media Post"]).description("Caption style").default("Descriptive").extra('extra', { order: 9, group: "tagger", width: 1, tooltip: "JoyCaption: the caption template (live vocabulary). Ignored by WD14/JoyTag/Florence-2.", wtype: 'select' }),
  caption_length: vocabulary(["any", "very short", "short", "medium-length", "long", "very long"]).description("Caption length").default("long").extra('extra', { order: 10, group: "tagger", width: 1, tooltip: "JoyCaption: target length (the node also takes word counts 20-260 — bare/API bodies only). Ignored by other families.", wtype: 'select' }),
  extra_option: vocabulary(["", "Include information about lighting.", "Include information about camera angle.", "Include information about whether there is a watermark or not.", "Include information about whether there are JPEG artifacts or not.", "Do NOT include anything sexual; keep it PG.", "Do NOT mention the image's resolution.", "You MUST include information about the subjective aesthetic quality of the image from low to very high.", "Include information on the image's composition style, such as leading lines, rule of thirds, or symmetry.", "Do NOT mention any text that is in the image.", "Specify the depth of field and whether the background is in focus or blurred.", "Do NOT use any ambiguous language.", "ONLY describe the most important elements of the image.", "Your response will be used by a text-to-image model, so avoid useless meta phrases."]).description("Extra instruction").extra('extra', { order: 11, group: "tagger", width: 1, tooltip: "JoyCaption: one appended instruction (the full 28-option list rides bare/API bodies). Ignored by other families.", wtype: 'select' }),
  // NO filename_prefix (card: "the run routes outputs by run id
  // (compose stamps `<run>/tags`) — a user knob here was silently
  // overwritten, a dead promise"). Old drafts naming it still parse
  // (schemastery non-strict object + the door's explicit-params
  // overlay) and compose never reads it.
})

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Tagger',
  description: 'Image prompt inversion — booru keyword tags (WD14, JoyTag) and natural-language captions (Florence-2, JoyCaption) for recreating images in NovelAI / Pony / FLUX / Ideogram. Tags persist as a tags.txt run artifact.',
  genre: 'image',
  icon: 'tag',
  principles: [
    'input_image is required — the tag is anchored on it (absolute mount path or a prior-run artifact ref)',
    'threshold is the general-tag confidence floor; character_threshold is the person-identity floor (higher — names are cheap to overclaim)',
    'exclude_tags prunes what you already know is wrong — comma-separated, matched case-insensitively by the node',
    'The lane outputs tags.txt (SaveText) — the queue trades in artifacts, not bare strings',
    'First run downloads the WD14 weights (.onnx + .csv) — light ONNX lane, ~4 GB VRAM',
    "JoyTag reads a pack-local checkpoint (no auto-download) and takes add/remove tag lists instead of WD14's character floor",
  ],
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'tagger',
    // stage-row id the compose emits (purge S-decls verdict: the
    // retired row carried "" — engine truth wins, recorded in
    // docs/design/python-purge-2026-09-08.md).
    skeleton: 'tagger',
    // the four boarded families.
    boarded: ['wd14', 'joytag', 'florence2', 'joycaption'],
    tags: ['image', 'tag', 'analyze'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: 'image', order: 19 },
    flowKinds: {
      inputs: { input_image: 'image' },
      outputs: { default: 'text' },
      requiresModel: false,
    },
    // Per-family gates (requires_by_family declaration — each arm's
    // pack is checked only for its own family; a wd14 run never
    // demands the florence pack). The flat list carries the UNION
    // for flat consumers; the door gates the ACTIVE family's slice
    // (gateway _find_card_requires precedent).
    requires: ['ComfyUI-WD14-Tagger', 'Comfyui_joytag', 'ComfyUI-Florence2', 'joycaption_comfyui'],
    requiresByFamily: {
      wd14: ['ComfyUI-WD14-Tagger'],
      joytag: ['Comfyui_joytag'],
      florence2: ['ComfyUI-Florence2'],
      joycaption: ['joycaption_comfyui'],
    },
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    // checkpoint rides admits (the service's admission-extras law):
    // the variant rail's route stamp, admitted but never rendered —
    // no form field, no second picker.
    admits: ['checkpoint'],
    compose(p, model, g, runId) {
      // THE SCHEMA GATE (the audio-trio admission precedent — the
      // card's own declaration validates the last hop into the
      // engine): schemastery walk enforces declared types + bounds
      // (threshold/character_threshold are 0–1 — a threshold=5 draft
      // refuses LOUD here, never composes), fills declared defaults.
      // The composer's reads below are reads of the GATED doc.
      const doc = schema(p) as Record<string, unknown>
      const img = typeof doc.input_image === 'string' ? doc.input_image : ''
      if (!img.trim()) {
        throw new Error("required param 'input_image' missing or blank on the tagger card (the tagger inverts an image; nothing to tag is a refusal)")
      }
      taggerLane(doc, model, g, runId)
    },
    finalize: finalizeTagger,
  }))
}
