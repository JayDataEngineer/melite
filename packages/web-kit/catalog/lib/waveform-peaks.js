export const LOD_BUCKETS = {
    low: 100,
    med: 500,
    high: 2000,
};
export const LOD_ORDER = ['low', 'med', 'high'];
/** Compute min/max peaks for a single channel of PCM data.
 *  Exported for unit testing. */
export function computeMinMaxPeaks(data, numBuckets) {
    if (numBuckets <= 0 || data.length === 0)
        return [];
    const out = new Array(numBuckets);
    const blockSize = data.length / numBuckets; // float — partial blocks at the tail
    for (let i = 0; i < numBuckets; i++) {
        const start = Math.floor(i * blockSize);
        const end = Math.min(data.length, Math.floor((i + 1) * blockSize));
        let min = 0;
        let max = 0;
        for (let j = start; j < end; j++) {
            const v = data[j];
            if (v < min)
                min = v;
            if (v > max)
                max = v;
        }
        out[i] = { min, max };
    }
    return out;
}
/** Build all three LODs from raw PCM data. */
export function computeWaveformLODs(data) {
    return {
        low: computeMinMaxPeaks(data, LOD_BUCKETS.low),
        med: computeMinMaxPeaks(data, LOD_BUCKETS.med),
        high: computeMinMaxPeaks(data, LOD_BUCKETS.high),
    };
}
/** Pick the LOD whose bucket count best matches the available pixels.
 *  When pixelsAvailable is small, low; when huge, high. The threshold
 *  is the midpoint (geometric mean) between adjacent LODs. */
export function selectLOD(pixelsAvailable) {
    if (pixelsAvailable <= 0)
        return 'low';
    // Geometric-mean thresholds:
    //   low ↔ med: sqrt(100 × 500) ≈ 224
    //   med ↔ high: sqrt(500 × 2000) ≈ 1000
    if (pixelsAvailable < Math.sqrt(LOD_BUCKETS.low * LOD_BUCKETS.med))
        return 'low';
    if (pixelsAvailable < Math.sqrt(LOD_BUCKETS.med * LOD_BUCKETS.high))
        return 'med';
    return 'high';
}
/** Resample a min/max peak array to a target output width by picking
 *  contiguous source buckets per output pixel (or aggregating when
 *  upscaling is needed). Returns a new array of length `targetWidth`. */
export function resampleForWidth(peaks, targetWidth) {
    if (targetWidth <= 0)
        return [];
    if (peaks.length === 0)
        return new Array(targetWidth).fill({ min: 0, max: 0 });
    // When the source has more buckets than the target, aggregate by
    // taking the min-of-mins / max-of-maxes across the source range.
    // When the source has fewer, we walk the source proportionally
    // (nearest-neighbor).
    const out = new Array(targetWidth);
    if (peaks.length >= targetWidth) {
        const ratio = peaks.length / targetWidth;
        for (let i = 0; i < targetWidth; i++) {
            const start = Math.floor(i * ratio);
            const end = Math.min(peaks.length, Math.floor((i + 1) * ratio));
            let min = 0;
            let max = 0;
            for (let j = start; j < end; j++) {
                if (peaks[j].min < min)
                    min = peaks[j].min;
                if (peaks[j].max > max)
                    max = peaks[j].max;
            }
            out[i] = { min, max };
        }
    }
    else {
        // Upsample: nearest-neighbor by source index.
        for (let i = 0; i < targetWidth; i++) {
            const srcIdx = Math.min(peaks.length - 1, Math.floor((i * peaks.length) / targetWidth));
            out[i] = peaks[srcIdx];
        }
    }
    return out;
}
/** Convenience: pick the right LOD + resample to exactly `width` pixels. */
export function getPeaksForWidth(cache, width) {
    const lod = selectLOD(width);
    return resampleForWidth(cache[lod], width);
}
/** Decode an audio URL into legacy + LOD waveform peaks.
 *
 *  Returns null on any failure (fetch error, decode error, etc.).
 *  The caller should treat null as "use the sine-wave placeholder". */
export async function decodeAudioPeaks(url) {
    let ctx = null;
    try {
        ctx = new AudioContext();
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const audio = await ctx.decodeAudioData(buf);
        const raw = audio.getChannelData(0);
        // Legacy 80-bucket max-amplitude (matches the original
        // decodeWaveform output that `waveformPeaks: number[]` expects).
        const samplesPerPeak = Math.max(1, Math.floor(raw.length / 80));
        const legacyPeaks = [];
        for (let i = 0; i < 80; i++) {
            let max = 0;
            for (let j = 0; j < samplesPerPeak; j++) {
                const val = Math.abs(raw[i * samplesPerPeak + j] || 0);
                if (val > max)
                    max = val;
            }
            legacyPeaks.push(max);
        }
        // LOD min/max cache for zoom-faithful rendering.
        const lod = computeWaveformLODs(raw);
        return { duration: audio.duration, legacyPeaks, lod };
    }
    catch {
        // Non-critical — caller falls back to the sine-wave placeholder.
        return null;
    }
    finally {
        if (ctx)
            ctx.close();
    }
}
//# sourceMappingURL=waveform-peaks.js.map
