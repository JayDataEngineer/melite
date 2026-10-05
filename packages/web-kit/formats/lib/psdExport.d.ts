/**
 * Minimal layered PSD (Photoshop) writer — 8-bit RGB with per-layer alpha.
 *
 * Produces a single-group PSD where each provided layer becomes a PSD layer
 * (channels R, G, B, transparency mask), plus a flattened composite as the
 * merged "Image Data" section. Channel data is stored raw (uncompressed) for
 * simplicity and maximum reader compatibility. This is a best-effort base
 * implementation — it round-trips in Photoshop, Krita, and GIMP for typical
 * RGB layers but does not support 16-bit, adjustment layers, or smart objects.
 */
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';
export interface PsdLayerInput {
    name: string;
    /** RGBA PNG/JPEG dataUrl of the layer content. Null/empty = skip. */
    dataUrl: string | null;
    /** Opacity 0–1. */
    opacity: number;
    blendMode: BlendMode;
    visible: boolean;
}
/**
 * Build a layered PSD Blob. `width`/`height` define the canvas; every layer is
 * composited into that extent. The merged composite flattens visible layers.
 */
export declare function buildPsd(layers: PsdLayerInput[], width: number, height: number, mergedRgba?: Uint8ClampedArray): Promise<Blob>;
/** Trigger a browser download for a Blob. */
export declare function downloadBlob(blob: Blob, filename: string): void;
//# sourceMappingURL=psdExport.d.ts.map
