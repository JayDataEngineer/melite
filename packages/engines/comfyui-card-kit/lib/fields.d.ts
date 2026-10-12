/** The sampling group's canonical name — cards with card-specific
 *  sampling atoms (a diffusion card's own mu/std, the tts design entry's voice knobs)
 *  join the group through this, never a retyped string. */
export declare const SAMPLING_GROUP = "sampling";
declare const SAMPLING_ORDERS: {
    readonly steps: 0;
    readonly cfg: 1;
    readonly sampler: 2;
    readonly scheduler: 3;
};
export type SamplingKind = keyof typeof SAMPLING_ORDERS;
export interface SamplingExtraOpts {
    /** order override — a card that interleaves its own sampling
     *  atoms past the canonical steps/cfg/sampler/scheduler order.
     *  Default: the kind's canonical order above. */
    order?: number;
    /** card-owned tooltip (the range rule: prose stays per-card). */
    tooltip?: string;
    /** hint-only range passthrough (the range rule: HINT-ONLY ranges
     *  ride extra.min/max — the zod chain owns the floor). */
    min?: number;
    max?: number;
}
/** One sampling atom's `extra` bag — the layout truth (group,
 *  columns, width, zone) centralized; the card passes only what it
 *  owns (order/tooltip/hint range). Served DECL-identical to the
 *  hand-copied literals it replaces. */
export declare function samplingExtra(kind: SamplingKind, opts?: SamplingExtraOpts): {
    order: number;
    group: 'sampling';
    columns: 2;
    width: 1;
    zone: 'params';
    wtype?: 'number' | 'select';
    tooltip?: string;
    min?: number;
    max?: number;
};
export {};
//# sourceMappingURL=fields.d.ts.map