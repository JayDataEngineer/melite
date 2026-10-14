// fields.ts — THE SHARED DECL FRAGMENTS (the operator's DRY law,
// stroke 31: "IMAGE EDIT DOES NOT HAVE SAMPLER AND SCHEDULER ON
// THE SAME ROW"). The sampling layout was hand-copied into every
// diffusion card's schema — five spellings of group/columns/width
// that drifted (image-gen gridded 2-up, image-edit/video-gen/
// ideogram4 stacked). The LAYOUT lives here now, spelled ONCE:
// group name, the 2-up grid, one-track spans, the params zone.
// Per-card ranges, defaults, and tooltips stay on the card's own
// zod chain + opts (the make-card RANGE RULE: whoever owns the
// default owns the floor — this module never sets one).
import type { ExtraBag, Zone } from '@melite/contracts/extraKeys'

/** The sampling group's canonical name — cards with card-specific
 *  sampling atoms (a diffusion card's own mu/std, the tts design entry's voice knobs)
 *  join the group through this, never a retyped string. */
export const SAMPLING_GROUP = 'sampling'

const SAMPLING_ORDERS = {
  steps: 0,
  cfg: 1,
  sampler: 2,
  scheduler: 3,
} as const

export type SamplingKind = keyof typeof SAMPLING_ORDERS

const SAMPLING_WTYPES: Partial<Record<SamplingKind, 'number' | 'select'>> = {
  steps: 'number',
  sampler: 'select',
  scheduler: 'select',
} as const

export interface SamplingExtraOpts {
  /** order override — a card that interleaves its own sampling
   *  atoms past the canonical steps/cfg/sampler/scheduler order.
   *  Default: the kind's canonical order above. */
  order?: number
  /** card-owned tooltip (the range rule: prose stays per-card). */
  tooltip?: string
  /** hint-only range passthrough (the range rule: HINT-ONLY ranges
   *  ride extra.min/max — the zod chain owns the floor). */
  min?: number
  max?: number
}

/** One sampling atom's `extra` bag — the layout truth (group,
 *  columns, width, zone) centralized; the card passes only what it
 *  owns (order/tooltip/hint range). Served DECL-identical to the
 *  hand-copied literals it replaces. */
export function samplingExtra(kind: SamplingKind, opts?: SamplingExtraOpts): {
  order: number
  group: 'sampling'
  columns: 2
  width: 1
  zone: 'params'
  wtype?: 'number' | 'select'
  tooltip?: string
  min?: number
  max?: number
} {
  return {
    order: opts?.order ?? SAMPLING_ORDERS[kind],
    group: SAMPLING_GROUP,
    columns: 2,
    width: 1,
    zone: 'params',
    // cfg carries NO wtype in any card's DECL (the number atom is
    // its native face) — the key stays absent, served-identical.
    ...(SAMPLING_WTYPES[kind] !== undefined ? { wtype: SAMPLING_WTYPES[kind] } : {}),
    ...(opts?.tooltip !== undefined ? { tooltip: opts.tooltip } : {}),
    ...(opts?.min !== undefined ? { min: opts.min } : {}),
    ...(opts?.max !== undefined ? { max: opts.max } : {}),
  }
}

// The card-ui audit's schema-plane helpers (2026-11-02): seed rows,
// the prompt pair, and the input-image slot were hand-copied across
// cards with drifted keys and labels. Same precedent as
// samplingExtra above — the KEY vocabulary lives here, spelled once
// (an unknown key fails tsc here, never silently at render); every
// VALUE stays card-owned and explicit at the call site, so an
// explained asymmetry (a scoped slot, a bare ordering key) reads as
// an explicit opt, not a second spelling. Served-identical: every
// arm emits exactly the keys its call sites carried.

/** Seed knob bag — eight cards carried the order/group/width/zone
 *  keys with drifted values. Callers pass their own values; absent
 *  opts stay absent (sfx/tts ride a bare `{order: null}`). */
export interface SeedExtraOpts {
  order: number | null
  group?: string
  width?: number
  zone?: Zone
  tooltip?: string
  families?: string[]
}
export function seedExtra(opts: SeedExtraOpts): ExtraBag {
  return {
    order: opts.order,
    ...(opts.group !== undefined ? { group: opts.group } : {}),
    ...(opts.width !== undefined ? { width: opts.width } : {}),
    ...(opts.zone !== undefined ? { zone: opts.zone } : {}),
    ...(opts.tooltip !== undefined ? { tooltip: opts.tooltip } : {}),
    ...(opts.families !== undefined ? { families: opts.families } : {}),
  }
}

/** Prompt-pair bags — image-edit + image-gen carried the prompt +
 *  negative-prompt rows byte-identical modulo quote style. One home;
 *  cards keep their zod chains. */
export function promptPairExtra(): { prompt: ExtraBag; negative_prompt: ExtraBag } {
  return {
    prompt: { order: 0, group: 'prompt', columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea' },
    negative_prompt: { order: 1, group: 'prompt', width: 1, zone: 'params', wtype: 'textarea' },
  }
}

/** Input-image slot bag — the unscoped image slot's canonical shape.
 *  Mask spelled the label 'Input' without required; tagger/upscale
 *  'Input image' + required:true, and every compose door refuses a
 *  blank input, so required:true is honest everywhere. Label +
 *  required + wtype are canonical (one slot, one spelling);
 *  order/width/tooltip stay per-card (mask's width-2 input rail is
 *  its two-bar law). Family-scoped slots (img-to-mesh's square-crop
 *  lane) are a different concept and keep their own declaration. */
export interface InputImageExtraOpts {
  order?: number
  width?: number
  tooltip?: string
}
export function inputImageExtra(opts?: InputImageExtraOpts): ExtraBag {
  return {
    order: opts?.order ?? 0,
    group: 'input',
    width: opts?.width ?? 1,
    ...(opts?.tooltip !== undefined ? { tooltip: opts.tooltip } : {}),
    required: true,
    wtype: 'image',
  }
}

