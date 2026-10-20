import type { ParamSpec } from "@melite/engine-contract/vocabulary";
/** The bounds a family may narrow on the shared diffusion surface. */
export interface DiffusionParamBounds {
    /** The KSampler steps envelope. Default: [1, 100]. */
    readonly steps?: readonly [number, number];
    /** The KSampler cfg envelope. Default: [1, 20]. */
    readonly cfg?: readonly [number, number];
    /** The width/height envelope; `null` declares the rows UNBOUNDED; `false` RETIRES the rows from
     *  the surface entirely (the latent law, 2026-11-08 — the edit lanes edit at the source's own
     *  frame, so a stated size wires to nothing). Default: [256, 2048]. */
    readonly size?: readonly [number, number] | null | false;
}
/**
 * The diffusion param surface, in served order: the prompt pair, the
 * size pair (unless retired), the managed seed, the sampler knobs —
 * nine rows, or seven under `size: false`.
 * @param bounds the family's narrowing; omitted keys take the defaults above
 * @returns the declared rows, fresh objects per call (a family may spread them into its own surface)
 */
export declare function diffusionParamRows(bounds?: DiffusionParamBounds): readonly ParamSpec[];
/** The narrowing the two image-edit families declare (steps [1,50],
 *  cfg [0.1,10]; the size pair RETIRED — the latent law, 2026-11-08:
 *  both edit lanes edit at the source's own frame, so no declared
 *  size row may ride the surface). */
export declare const EDIT_DIFFUSION_BOUNDS: DiffusionParamBounds;
//# sourceMappingURL=paramRows.d.ts.map