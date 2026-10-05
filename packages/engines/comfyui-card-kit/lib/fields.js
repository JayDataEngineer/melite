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
export const SAMPLING_GROUP = 'sampling';
const SAMPLING_ORDERS = {
    steps: 0,
    cfg: 1,
    sampler: 2,
    scheduler: 3,
};
const SAMPLING_WTYPES = {
    steps: 'number',
    sampler: 'select',
    scheduler: 'select',
};
/** One sampling atom's `extra` bag — the layout truth (group,
 *  columns, width, zone) centralized; the card passes only what it
 *  owns (order/tooltip/hint range). Served DECL-identical to the
 *  hand-copied literals it replaces. */
export function samplingExtra(kind, opts) {
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
    };
}
//# sourceMappingURL=fields.js.map
