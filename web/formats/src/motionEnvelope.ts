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
import type { AudioCue } from "@melite/contracts"

export interface EnvelopeSampleArgs {
  /** Segment start time on the timeline (seconds). */
  segmentStart: number
  /** Segment duration (seconds). */
  segmentDuration: number
  /** Number of video frames in the segment. */
  frames: number
  /** Audio cues to sample (those overlapping the segment). */
  cues: AudioCue[]
}

/**
 * Sample a per-frame motion-amplitude envelope from overlapping audio
 * cues. Returns a `number[]` of length `frames`, each value in [0, 1].
 * Returns an empty array if `frames <= 0` or no cues have peaks.
 */
export function sampleMotionEnvelope(args: EnvelopeSampleArgs): number[] {
  const { segmentStart, segmentDuration, frames, cues } = args
  if (frames <= 0 || segmentDuration <= 0) return []

  // Pre-filter cues that have peaks AND overlap the segment's time range.
  const usable = cues.filter((c) => {
    if (!c.waveformPeaks || c.waveformPeaks.length === 0) return false
    const cueEnd = c.start + c.duration
    return cueEnd > segmentStart && c.start < segmentStart + segmentDuration
  })
  if (usable.length === 0) return []

  const envelope: number[] = new Array(frames)
  for (let i = 0; i < frames; i++) {
    // Sample at the frame midpoint to avoid edge bias.
    const frameTime = segmentStart + ((i + 0.5) / frames) * segmentDuration
    let sum = 0
    for (const cue of usable) {
      const relT = frameTime - cue.start
      if (relT < 0 || relT > cue.duration) continue
      const peaks = cue.waveformPeaks!
      // Map relative time → peak index. Clamp to valid range.
      let idx = Math.floor((relT / cue.duration) * peaks.length)
      if (idx < 0) idx = 0
      if (idx >= peaks.length) idx = peaks.length - 1
      const amp = peaks[idx]
      if (typeof amp === 'number' && isFinite(amp)) {
        sum += amp * cue.volume
      }
    }
    // Clamp to [0, 1] — overlapping cues sum but must not overflow.
    envelope[i] = sum > 1 ? 1 : sum < 0 ? 0 : sum
  }
  return envelope
}

/**
 * Normalize an envelope so its peak is exactly 1.0 (if it has any
 * non-zero values). Useful when the raw peaks aren't normalized to
 * full-scale. Returns the input unchanged if all values are 0.
 */
export function normalizeEnvelope(env: number[]): number[] {
  const peak = env.reduce((m, v) => (v > m ? v : m), 0)
  if (peak <= 0) return env
  return env.map((v) => v / peak)
}
