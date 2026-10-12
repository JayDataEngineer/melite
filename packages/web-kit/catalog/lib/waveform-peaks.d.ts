/**
 * E3.14 — Waveform zoom fidelity.
 *
 * The original waveform rendering computed a single fixed-resolution
 * peak array (200 buckets) per cue. When the user zoomed in, those 200
 * buckets got stretched across hundreds of pixels — bars became wide
 * and the waveform lost detail. When zoomed out, they were crammed
 * into a few pixels and aliased.
 *
 * This module computes min/max peaks at THREE levels of detail (LODs)
 * in a single pass over the raw PCM data:
 *
 *   - low:  100 buckets  (zoomed-out overview)
 *   - med:  500 buckets  (default editing zoom)
 *   - high: 2000 buckets (zoomed-in fine detail)
 *
 * `selectLOD(pixelsAvailable)` picks the LOD whose bucket count most
 * closely matches the on-screen pixel width of the cue. The render
 * path then resamples that LOD's peaks to the exact pixel width with
 * `resampleForWidth` so the bar count matches the layout 1:1.
 *
 * Min/max peaks (rather than just max) preserve the waveform's
 * asymmetry — proper audio editors show both the top and bottom of
 * each bucket so transients are visible.
 */
import type { MinMaxPeak, WaveformLODCache } from '@melite/contracts';
/** The three cached LODs, keyed by name. */
export type LODName = 'low' | 'med' | 'high';
export declare const LOD_BUCKETS: Record<LODName, number>;
export declare const LOD_ORDER: LODName[];
/** Compute min/max peaks for a single channel of PCM data.
 *  Exported for unit testing. */
export declare function computeMinMaxPeaks(data: Float32Array, numBuckets: number): MinMaxPeak[];
/** Build all three LODs from raw PCM data. */
export declare function computeWaveformLODs(data: Float32Array): WaveformLODCache;
/** Pick the LOD whose bucket count best matches the available pixels.
 *  When pixelsAvailable is small, low; when huge, high. The threshold
 *  is the midpoint (geometric mean) between adjacent LODs. */
export declare function selectLOD(pixelsAvailable: number): LODName;
/** Resample a min/max peak array to a target output width by picking
 *  contiguous source buckets per output pixel (or aggregating when
 *  upscaling is needed). Returns a new array of length `targetWidth`. */
export declare function resampleForWidth(peaks: MinMaxPeak[], targetWidth: number): MinMaxPeak[];
/** Convenience: pick the right LOD + resample to exactly `width` pixels. */
export declare function getPeaksForWidth(cache: WaveformLODCache, width: number): MinMaxPeak[];
export interface DecodedAudioPeaks {
    /** Duration in seconds (from decodeAudioData). */
    duration: number;
    /** Legacy 80-bucket max-amplitude peaks in [0, 1]. */
    legacyPeaks: number[];
    /** Three-LOD min/max peak cache for zoom-faithful rendering. */
    lod: WaveformLODCache;
}
/** Decode an audio URL into legacy + LOD waveform peaks.
 *
 *  Returns null on any failure (fetch error, decode error, etc.).
 *  The caller should treat null as "use the sine-wave placeholder". */
export declare function decodeAudioPeaks(url: string): Promise<DecodedAudioPeaks | null>;
//# sourceMappingURL=waveform-peaks.d.ts.map