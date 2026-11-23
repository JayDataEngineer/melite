/**
 * E3.6 — Audio-reactive motion amplitude envelope sampler.
 *
 * Given a segment's timing + frame count and a set of audio cues, this
 * samples the cues' waveform peaks at the segment's frame rate to
 * produce a per-frame amplitude envelope. The envelope is emitted in the
 * diffusers payload as `motion_amplitude_envelope: number[]` so the
 * backend can modulate motion intensity per-frame (audio-reactive
 * motion) instead of applying a single scalar `motion_amplitude`.
 *
 * Algorithm:
 *   For each video frame i in [0, frames):
 *     frameTime = segStart + (i + 0.5) / frames * segDuration
 *       (sample at the frame's midpoint, not its edge — avoids a
 *       one-frame bias at the segment boundary)
 *     For each cue that overlaps frameTime:
 *       relT = frameTime - cue.start     (seconds into the cue)
 *       idx = floor(relT / cue.duration * peaks.length)
 *       contribution = peaks[clamp(idx)] * cue.volume
 *     envelope[i] = sum of contributions (clamped to [0, 1])
 *
 * The envelope is normalized to [0, 1] where 0 = silence and 1 = peak
 * loudness. The backend maps this to its amplitude range (e.g. via the
 * same 0.7 + 0.3*scale formula used for the scalar).
 *
 * Overlapping cues SUM (not max) — two simultaneous audio sources should
 * produce more motion than one. The sum is clamped to [0, 1] so the
 * backend never sees out-of-range values.
 *
 * Cues without waveformPeaks are skipped (not treated as silence — we
 * simply have no data for them, so we don't dampen the envelope).
 */
import type { AudioCue } from "@melite/contracts";
export interface EnvelopeSampleArgs {
    /** Segment start time on the timeline (seconds). */
    segmentStart: number;
    /** Segment duration (seconds). */
    segmentDuration: number;
    /** Number of video frames in the segment. */
    frames: number;
    /** Audio cues to sample (those overlapping the segment). */
    cues: AudioCue[];
}
/**
 * Sample a per-frame motion-amplitude envelope from overlapping audio
 * cues. Returns a `number[]` of length `frames`, each value in [0, 1].
 * Returns an empty array if `frames <= 0` or no cues have peaks.
 */
export declare function sampleMotionEnvelope(args: EnvelopeSampleArgs): number[];
/**
 * Normalize an envelope so its peak is exactly 1.0 (if it has any
 * non-zero values). Useful when the raw peaks aren't normalized to
 * full-scale. Returns the input unchanged if all values are 0.
 */
export declare function normalizeEnvelope(env: number[]): number[];
//# sourceMappingURL=motionEnvelope.d.ts.map