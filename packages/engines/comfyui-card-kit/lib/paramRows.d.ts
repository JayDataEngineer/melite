import type { ParamSpec } from "@melite/engine-contract/vocabulary";
/** The bounds a family may narrow on the shared diffusion surface. */
export interface DiffusionParamBounds {
    /** The KSampler steps envelope. Default: [1, 100]. */
    readonly steps?: readonly [number, number];
    /** The KSampler cfg envelope. Default: [1, 20]. */
    readonly cfg?: readonly [number, number];
    /** The width/height envelope; `null` declares the rows UNBOUNDED. Default: [256, 2048]. */
    readonly size?: readonly [number, number] | null;
}
/**
 * The nine-row diffusion param surface, in served order: the prompt
 * pair, the size pair, the managed seed, the sampler knobs.
 * @param bounds the family's narrowing; omitted keys take the defaults above
 * @returns the declared rows, fresh objects per call (a family may spread them into its own surface)
 */
export declare function diffusionParamRows(bounds?: DiffusionParamBounds): readonly ParamSpec[];
/** The narrowing the two image-edit families declare (steps [1,50], cfg [0.1,10], size unbounded). */
export declare const EDIT_DIFFUSION_BOUNDS: DiffusionParamBounds;
//# sourceMappingURL=paramRows.d.ts.map
