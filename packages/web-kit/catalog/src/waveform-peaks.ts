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
import type { MinMaxPeak, WaveformLODCache } from '@melite/contracts'

/** The three cached LODs, keyed by name. */
export type LODName = 'low' | 'med' | 'high'

export const LOD_BUCKETS: Record<LODName, number> = {
  low: 100,
  med: 500,
  high: 2000,
}

export const LOD_ORDER: LODName[] = ['low', 'med', 'high']

/** Compute min/max peaks for a single channel of PCM data.
 *  Exported for unit testing. */
export function computeMinMaxPeaks(data: Float32Array, numBuckets: number): MinMaxPeak[] {
  if (numBuckets <= 0 || data.length === 0) return []
  const out: MinMaxPeak[] = new Array(numBuckets)
  const blockSize = data.length / numBuckets // float — partial blocks at the tail
  for (let i = 0; i < numBuckets; i++) {
    const start = Math.floor(i * blockSize)
    const end = Math.min(data.length, Math.floor((i + 1) * blockSize))
    let min = 0
    let max = 0
    for (let j = start; j < end; j++) {
      const v = data[j]
      if (v < min) min = v
      if (v > max) max = v
    }
    out[i] = { min, max }
  }
  return out
}

/** Build all three LODs from raw PCM data. */
export function computeWaveformLODs(data: Float32Array): WaveformLODCache {
  return {
    low: computeMinMaxPeaks(data, LOD_BUCKETS.low),
    med: computeMinMaxPeaks(data, LOD_BUCKETS.med),
    high: computeMinMaxPeaks(data, LOD_BUCKETS.high),
  }
}

/** Pick the LOD whose bucket count best matches the available pixels.
 *  When pixelsAvailable is small, low; when huge, high. The threshold
 *  is the midpoint (geometric mean) between adjacent LODs. */
export function selectLOD(pixelsAvailable: number): LODName {
  if (pixelsAvailable <= 0) return 'low'
  // Geometric-mean thresholds:
  //   low ↔ med: sqrt(100 × 500) ≈ 224
  //   med ↔ high: sqrt(500 × 2000) ≈ 1000
  if (pixelsAvailable < Math.sqrt(LOD_BUCKETS.low * LOD_BUCKETS.med)) return 'low'
  if (pixelsAvailable < Math.sqrt(LOD_BUCKETS.med * LOD_BUCKETS.high)) return 'med'
  return 'high'
}

/** Resample a min/max peak array to a target output width by picking
 *  contiguous source buckets per output pixel (or aggregating when
 *  upscaling is needed). Returns a new array of length `targetWidth`. */
export function resampleForWidth(peaks: MinMaxPeak[], targetWidth: number): MinMaxPeak[] {
  if (targetWidth <= 0) return []
  // R-S5 (2026-10-22): fresh objects per slot — a single shared fill
  // reference aliased every bucket, so any consumer writing into the
  // returned array (in-place normalize/scale) corrupted all of them.
  if (peaks.length === 0) {
    return Array.from({ length: targetWidth }, () => ({ min: 0, max: 0 }))
  }
  // When the source has more buckets than the target, aggregate by
  // taking the min-of-mins / max-of-maxes across the source range.
  // When the source has fewer, we walk the source proportionally
  // (nearest-neighbor).
  const out: MinMaxPeak[] = new Array(targetWidth)
  if (peaks.length >= targetWidth) {
    const ratio = peaks.length / targetWidth
    for (let i = 0; i < targetWidth; i++) {
      const start = Math.floor(i * ratio)
      const end = Math.min(peaks.length, Math.floor((i + 1) * ratio))
      let min = 0
      let max = 0
      for (let j = start; j < end; j++) {
        if (peaks[j].min < min) min = peaks[j].min
        if (peaks[j].max > max) max = peaks[j].max
      }
      out[i] = { min, max }
    }
  } else {
    // Upsample: nearest-neighbor by source index. R-S5 (2026-10-22):
    // CLONED per slot — sharing the source objects across outputs
    // meant one consumer's in-place write corrupted every aliased
    // bucket AND the source array itself.
    for (let i = 0; i < targetWidth; i++) {
      const srcIdx = Math.min(peaks.length - 1, Math.floor((i * peaks.length) / targetWidth))
      const src = peaks[srcIdx]
      out[i] = { min: src.min, max: src.max }
    }
  }
  return out
}

/** Convenience: pick the right LOD + resample to exactly `width` pixels. */
export function getPeaksForWidth(cache: WaveformLODCache, width: number): MinMaxPeak[] {
  const lod = selectLOD(width)
  return resampleForWidth(cache[lod], width)
}

/* ──────────────────────────────────────────────────────────────────────
 * Phase 2A — shared audio decode + peak extraction.
 *
 * `decodeAudioPeaks` fetches an audio URL, decodes it via WebAudio, and
 * returns both the duration and:
 *   - a legacy 80-bucket max-amplitude array (for the `waveformPeaks`
 *     field on AudioCue, which stores a flat number[] — used by the
 *     motion-envelope path and any consumer that hasn't migrated to
 *     min/max LODs)
 *   - a three-LOD min/max cache (for zoom-faithful rendering via
 *     `getPeaksForWidth` above)
 *
 * Factored out of VideoEditor.tsx (where it lived as `decodeWaveform`)
 * so that DirectorAudioTimeline and any future NLE surface can share
 * the same decode path without re-implementing it. The caller is
 * responsible for persisting the result (e.g. into the timeline store's
 * `updateAudioCue`).
 * ────────────────────────────────────────────────────────────────── */

export interface DecodedAudioPeaks {
  /** Duration in seconds (from decodeAudioData). */
  duration: number
  /** Legacy 80-bucket max-amplitude peaks in [0, 1]. */
  legacyPeaks: number[]
  /** Three-LOD min/max peak cache for zoom-faithful rendering. */
  lod: WaveformLODCache
}

/** Decode an audio URL into legacy + LOD waveform peaks.
 *
 *  Returns null on any failure (fetch error, decode error, etc.).
 *  The caller should treat null as "use the sine-wave placeholder". */
export async function decodeAudioPeaks(url: string): Promise<DecodedAudioPeaks | null> {
  let ctx: AudioContext | null = null
  try {
    ctx = new AudioContext()
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    const audio = await ctx.decodeAudioData(buf)
    const raw = audio.getChannelData(0)

    // Legacy 80-bucket max-amplitude (matches the original
    // decodeWaveform output that `waveformPeaks: number[]` expects).
    const samplesPerPeak = Math.max(1, Math.floor(raw.length / 80))
    const legacyPeaks: number[] = []
    for (let i = 0; i < 80; i++) {
      let max = 0
      for (let j = 0; j < samplesPerPeak; j++) {
        const val = Math.abs(raw[i * samplesPerPeak + j] || 0)
        if (val > max) max = val
      }
      legacyPeaks.push(max)
    }

    // LOD min/max cache for zoom-faithful rendering.
    const lod = computeWaveformLODs(raw)

    return { duration: audio.duration, legacyPeaks, lod }
  } catch (e) {
    // Non-critical — caller falls back to the sine-wave placeholder.
    // R-S5 (2026-10-22): the failure is LOGGED for direct callers
    // (the timeline caller logs itself; the no-swallow policy holds),
    // and the placeholder verdict says WHY.
    console.error("[waveform-peaks] decodeAudioPeaks failed — falling back to the placeholder:", e)
    return null
  } finally {
    if (ctx) {
      // R-S5: a rejecting close() was an unhandled rejection — observed.
      Promise.resolve(ctx.close()).catch((e: unknown) => {
        console.error("[waveform-peaks] AudioContext close failed:", e)
      })
    }
  }
}
