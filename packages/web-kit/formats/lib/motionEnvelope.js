/**
 * Sample a per-frame motion-amplitude envelope from overlapping audio
 * cues. Returns a `number[]` of length `frames`, each value in [0, 1].
 * Returns an empty array if `frames <= 0` or no cues have peaks.
 */
export function sampleMotionEnvelope(args) {
    const { segmentStart, segmentDuration, frames, cues } = args;
    if (frames <= 0 || segmentDuration <= 0)
        return [];
    // Pre-filter cues that have peaks AND overlap the segment's time range.
    const usable = cues.filter((c) => {
        if (!c.waveformPeaks || c.waveformPeaks.length === 0)
            return false;
        const cueEnd = c.start + c.duration;
        return cueEnd > segmentStart && c.start < segmentStart + segmentDuration;
    });
    if (usable.length === 0)
        return [];
    const envelope = new Array(frames);
    for (let i = 0; i < frames; i++) {
        // Sample at the frame midpoint to avoid edge bias.
        const frameTime = segmentStart + ((i + 0.5) / frames) * segmentDuration;
        let sum = 0;
        for (const cue of usable) {
            const relT = frameTime - cue.start;
            if (relT < 0 || relT > cue.duration)
                continue;
            const peaks = cue.waveformPeaks;
            // Map relative time → peak index. Clamp to valid range.
            let idx = Math.floor((relT / cue.duration) * peaks.length);
            /* v8 ignore next -- relT is in [0, duration] here (negatives and
               overshoots `continue` above), so idx >= 0 always; the upper clamp
               below is the live one (2026-09-12) */
            if (idx < 0)
                idx = 0;
            if (idx >= peaks.length)
                idx = peaks.length - 1;
            const amp = peaks[idx];
            if (typeof amp === 'number' && isFinite(amp)) {
                sum += amp * cue.volume;
            }
        }
        // Clamp to [0, 1] — overlapping cues sum but must not overflow.
        envelope[i] = sum > 1 ? 1 : sum < 0 ? 0 : sum;
    }
    return envelope;
}
/**
 * Normalize an envelope so its peak is exactly 1.0 (if it has any
 * non-zero values). Useful when the raw peaks aren't normalized to
 * full-scale. Returns the input unchanged if all values are 0.
 */
export function normalizeEnvelope(env) {
    const peak = env.reduce((m, v) => (v > m ? v : m), 0);
    if (peak <= 0)
        return env;
    return env.map((v) => v / peak);
}
//# sourceMappingURL=motionEnvelope.js.map