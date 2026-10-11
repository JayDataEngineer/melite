/**
 * maskPrep — mask preparation (ported from the retired python
 * implementation; the lockstep fixtures are gone — the deterministic
 * loops below are the authority now).
 *
 * Where it runs:
 *   • Mask Studio "Prep preview" (view-only — shows the EFFECTIVE mask
 *     the Inpaint card will consume; the studio itself writes RAW masks).
 *   • Canvas Inpaint Studio (live preview before commit).
 *
 * Numbers are IEEE-754 float64 on both sides; accumulation order is fixed
 * (kernel index ascending) so sequences match Python exactly.
 *
 * NO GPU, no ComfyUI calls — pure geometry, same as the Python module.
 */
export interface MaskPrep {
    /** >0 dilate, <0 erode (px, exact Euclidean disk, binarize at 0.5) */
    grow: number;
    /** gaussian falloff radius px (sigma = radius/2). 0 = off */
    feather: number;
    /** re-binarize at >= t AFTER feather. 0 (or negative) = disabled sentinel */
    threshold: number;
    /** 1 - m, applied LAST */
    invert: boolean;
}
export declare function isIdentityPrep(p: MaskPrep): boolean;
export interface OutpaintSpec {
    top: number;
    right: number;
    bottom: number;
    left: number;
    overlap: number;
}
/** Latent alignment: padded canvas dims round up to a multiple of this. */
export declare const DEFAULT_ALIGNMENT = 8;
/** Row-major float64 mask, 1.0 = regenerate. Shape: {h, w}. */
export interface MaskMat {
    w: number;
    h: number;
    data: Float64Array;
}
export declare function matFromNested(rows: number[][]): MaskMat;
export declare function matToNested(m: MaskMat): number[][];
export declare function cloneMat(m: MaskMat): MaskMat;
/** Half-width of the disk per row offset dy ∈ [-r, r]: floor(sqrt(r²-dy²)). */
export declare function diskRowHalfWidths(radius: number): number[];
/** Dilate/erode the ≥0.5 region by an exact disk. Eroding to empty
 *  THROWS (no silent fallback — mirror of the Python hard error). */
export declare function growMask(m: MaskMat, px: number): MaskMat;
/** sigma = radius/2, truncated at ±ceil(3σ), renormalized. */
export declare function gaussianKernel(radius: number): Float64Array;
/** Gaussian feather (columns then rows — same axis order as Python). */
export declare function featherMask(m: MaskMat, radius: number): MaskMat;
export declare function thresholdMask(m: MaskMat, t: number): MaskMat;
export declare function invertMask(m: MaskMat): MaskMat;
export declare function coverage(m: MaskMat): number;
export interface PrepReport {
    applied: string[];
}
/** FIXED chain: grow → feather → threshold → invert. */
export declare function applyPrep(m: MaskMat, prep: MaskPrep): {
    mask: MaskMat;
    report: PrepReport;
};
export declare function roundToMultiple(value: number, multiple?: number): number;
export interface OutpaintGeometry {
    newW: number;
    newH: number;
    offX: number;
    offY: number;
    mask: MaskMat;
    actualRight: number;
    actualBottom: number;
}
/** Derive padded-canvas geometry + regenerate mask (border ∪ overlap). */
export declare function deriveOutpaint(origW: number, origH: number, spec: OutpaintSpec, alignment?: number): OutpaintGeometry;
/** Overlap seam-kill on an ALREADY-padded canvas (client composite).
 *  Original rect = (left, top) .. (w-right, h-bottom). */
export declare function applyOutpaintOverlap(m: MaskMat, spec: OutpaintSpec): MaskMat;
/** Place wired 1:1 at (offX, offY) and union (max). */
export declare function unionMaskAt(canvasMask: MaskMat, wired: MaskMat, offX: number, offY: number): MaskMat;
/** Extract a mask from ImageData. channel: "alpha" (RGBA canvas carrier)
 *  or "red" (white-on-black studio carrier). Values → [0,1] float64. */
export declare function maskFromImageData(img: ImageData, channel?: "alpha" | "red"): MaskMat;
/** Composite a mask into ImageData as tinted RGBA (premultiplied by the
 *  caller's tint color) — the studio overlay renderer. */
export declare function tintMaskToImageData(m: MaskMat, img: ImageData, r: number, g: number, b: number, alpha?: number): void;
//# sourceMappingURL=maskPrep.d.ts.map