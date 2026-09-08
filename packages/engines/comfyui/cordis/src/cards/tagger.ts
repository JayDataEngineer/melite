// Tier 3 — the tagger card (the wd14_t1 / joytag_t1 / florence2_t1 /
// joycaption_t1 renderer ports; the image prompt-inversion card).
// Decl + admission + family dispatch — the four arms live in
// src/kit.ts (TAGGER_ARMS); the lane is weightless, every wire value
// comes from params.
import type { Context } from '@deepseek-ai/cordis'
import { z } from '../atoms.ts'
import { taggerLane, finalizeTagger, TAGGER_CAPTION_TASKS, TAGGER_CAPTION_TYPES, TAGGER_CAPTION_LENGTHS, TAGGER_EXTRA_OPTIONS } from '../kit.ts'

declare module '../service.ts' {
  interface CardDefinition {
    /** Per-family extension packs — the py requires_by_family mirror.
     *  The compose door gates the active family's slice, never the
     *  flat union alone. */
    requiresByFamily?: Record<string, readonly string[]>
  }
}

const oneOf = (options: string[]) => z.union(options.map((o) => z.const(o)))

// the wire param surface (py TaggerCard — the union vocab; each arm
// wires its subset). Ride keys carry NO .default (py ABSENT: the
// compose-door cascade overlays model defaults, then explicit
// params): input_image is py-required (refused blank in compose);
// exclude_tags/add_tag/remove_tag/extra_option are py defaultless
// optionals, each backfilled by the families whose arms read it
// (wd14→exclude_tags, joytag→add_tag/remove_tag,
// joycaption→extra_option). Bare z.string() is the image-gen prompt
// precedent (optional at parse, refused loud at compose).
const schema = z.object({
  input_image: z.string(),
  checkpoint: z.string().default('wd-v1-4-moat-tagger-v2'),
  threshold: z.number().min(0).max(1).default(0.35),
  character_threshold: z.number().min(0).max(1).default(0.85),
  exclude_tags: z.string(),
  add_tag: z.string(),
  remove_tag: z.string(),
  caption_task: oneOf(TAGGER_CAPTION_TASKS).default('more_detailed_caption'),
  caption_type: oneOf(TAGGER_CAPTION_TYPES).default('Descriptive'),
  caption_length: oneOf(TAGGER_CAPTION_LENGTHS).default('long'),
  extra_option: oneOf(TAGGER_EXTRA_OPTIONS),
  replace_underscore: z.boolean().default(false),
  trailing_comma: z.boolean().default(false),
  // NO filename_prefix (py card: "the run routes outputs by run id
  // (compose stamps `<run>/tags`) — a user knob here was silently
  // overwritten, a dead promise"). Old drafts naming it still parse
  // (schemastery non-strict object + the door's explicit-params
  // overlay) and compose never reads it.
})

export const inject = ['comfyui']

export function apply(ctx: Context): void {
  ctx.comfyui.registerCard({
    id: 'tagger',
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'tagger',
    // the four boarded families (card.py's models tuple).
    boarded: ['wd14', 'joytag', 'florence2', 'joycaption'],
    // Per-family gates (py requires_by_family verbatim — each arm's
    // pack is checked only for its own family; a wd14 run never
    // demands the florence pack). The flat list carries the UNION
    // for flat consumers; the door gates the ACTIVE family's slice
    // (py gateway _find_card_requires precedent).
    requires: ['ComfyUI-WD14-Tagger', 'Comfyui_joytag', 'ComfyUI-Florence2', 'joycaption_comfyui'],
    requiresByFamily: {
      wd14: ['ComfyUI-WD14-Tagger'],
      joytag: ['Comfyui_joytag'],
      florence2: ['ComfyUI-Florence2'],
      joycaption: ['joycaption_comfyui'],
    },
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, model, g, runId) {
      const img = typeof p.input_image === 'string' ? p.input_image : ''
      if (!img.trim()) {
        throw new Error("required param 'input_image' missing or blank on the tagger card (the tagger inverts an image; nothing to tag is a refusal)")
      }
      taggerLane(p, model, g, runId)
    },
    finalize: finalizeTagger,
  })
}
