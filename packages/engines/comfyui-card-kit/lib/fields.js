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
export function seedExtra(opts) {
    return {
        order: opts.order,
        ...(opts.group !== undefined ? { group: opts.group } : {}),
        ...(opts.width !== undefined ? { width: opts.width } : {}),
        ...(opts.zone !== undefined ? { zone: opts.zone } : {}),
        ...(opts.tooltip !== undefined ? { tooltip: opts.tooltip } : {}),
        ...(opts.families !== undefined ? { families: opts.families } : {}),
    };
}
/** Prompt-pair bags — image-edit + image-gen carried the prompt +
 *  negative-prompt rows byte-identical modulo quote style. One home;
 *  cards keep their zod chains. */
export function promptPairExtra() {
    return {
        prompt: { order: 0, group: 'prompt', columns: 2, width: 1, required: true, zone: 'params', wtype: 'textarea' },
        negative_prompt: { order: 1, group: 'prompt', width: 1, zone: 'params', wtype: 'textarea' },
    };
}
export function inputImageExtra(opts) {
    return {
        order: opts?.order ?? 0,
        group: 'input',
        width: opts?.width ?? 1,
        ...(opts?.tooltip !== undefined ? { tooltip: opts.tooltip } : {}),
        required: true,
        wtype: 'image',
    };
}
//# sourceMappingURL=fields.js.map
