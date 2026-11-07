import type { ExtraBag, Zone } from '@melite/contracts/extraKeys';
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
/** Seed knob bag — eight cards carried the order/group/width/zone
 *  keys with drifted values. Callers pass their own values; absent
 *  opts stay absent (sfx/tts ride a bare `{order: null}`). */
export interface SeedExtraOpts {
    order: number | null;
    group?: string;
    width?: number;
    zone?: Zone;
    tooltip?: string;
    families?: string[];
}
export declare function seedExtra(opts: SeedExtraOpts): ExtraBag;
/** Prompt-pair bags — image-edit + image-gen carried the prompt +
 *  negative-prompt rows byte-identical modulo quote style. One home;
 *  cards keep their zod chains. */
export declare function promptPairExtra(): {
    prompt: ExtraBag;
    negative_prompt: ExtraBag;
};
/** Input-image slot bag — the unscoped image slot's canonical shape.
 *  Mask spelled the label 'Input' without required; tagger/upscale
 *  'Input image' + required:true, and every compose door refuses a
 *  blank input, so required:true is honest everywhere. Label +
 *  required + wtype are canonical (one slot, one spelling);
 *  order/width/tooltip stay per-card (mask's width-2 input rail is
 *  its two-bar law). Family-scoped slots (img-to-mesh's square-crop
 *  lane) are a different concept and keep their own declaration. */
export interface InputImageExtraOpts {
    order?: number;
    width?: number;
    tooltip?: string;
}
export declare function inputImageExtra(opts?: InputImageExtraOpts): ExtraBag;
export {};
//# sourceMappingURL=fields.d.ts.map