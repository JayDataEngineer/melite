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
