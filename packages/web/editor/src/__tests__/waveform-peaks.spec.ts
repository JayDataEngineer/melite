/**
 * Unit tests for lib/waveform-peaks.ts — min/max peak extraction at three
 * levels of detail (LODs) for zoom-faithful waveform rendering.
 *
 * Pure DSP functions; `decodeAudioPeaks` (needs AudioContext + fetch) is
 * covered separately.
 *
 * Coverage:
 *   - LOD_BUCKETS / LOD_ORDER constants.
 *   - computeMinMaxPeaks: guards, single bucket, partial tail block,
 *     min/max per bucket, negative amplitudes, asymmetric peaks.
 *   - computeWaveformLODs: all three LOD arrays sized correctly.
 *   - selectLOD: boundary behaviour at geometric-mean thresholds.
 *   - resampleForWidth: empty input zeroed, downsample aggregation,
 *     upsample nearest-neighbor, targetWidth<=0 guard.
 *   - getPeaksForWidth: convenience wires selectLOD + resampleForWidth.
 *
 * Zero prior coverage. A regression in the bucket-aggregate min/max would
 * flatten transients; a regression in selectLOD would re-introduce the
 * fixed-200-bucket aliasing the module was written to fix.
 */
import { describe, it, expect } from "vitest"
import {
  LOD_BUCKETS, LOD_ORDER,
  computeMinMaxPeaks, computeWaveformLODs,
  selectLOD, resampleForWidth, getPeaksForWidth,
} from "@melite/catalog"

// ── Constants ───────────────────────────────────────────────────────────────
describe("waveform-peaks — constants", () => {
  it("LOD_BUCKETS has the three documented bucket counts", () => {
    expect(LOD_BUCKETS.low).toBe(100)
    expect(LOD_BUCKETS.med).toBe(500)
    expect(LOD_BUCKETS.high).toBe(2000)
  })
  it("LOD_ORDER lists the LODs from coarsest to finest", () => {
    expect([...LOD_ORDER]).toEqual(["low", "med", "high"])
  })
})

// ── computeMinMaxPeaks ──────────────────────────────────────────────────────
describe("waveform-peaks — computeMinMaxPeaks", () => {
  it("returns [] when numBuckets <= 0", () => {
    expect(computeMinMaxPeaks(new Float32Array([1, 2, 3]), 0)).toEqual([])
    expect(computeMinMaxPeaks(new Float32Array([1, 2, 3]), -1)).toEqual([])
  })
  it("returns [] when data is empty", () => {
    expect(computeMinMaxPeaks(new Float32Array([]), 10)).toEqual([])
  })
  it("produces exactly numBuckets buckets", () => {
    const out = computeMinMaxPeaks(new Float32Array([1, 2, 3, 4, 5, 6]), 3)
    expect(out).toHaveLength(3)
  })
  it("captures the min and max of each bucket (uniform-positive signal)", () => {
    // 6 samples, 3 buckets of 2 samples each. NOTE: min initializes to 0
    // and only descends, so for an all-positive bucket min stays 0
    // (silence baseline). Only max reflects the actual peak.
    const data = new Float32Array([0.1, 0.5, 0.2, 0.8, 0.3, 0.4])
    const out = computeMinMaxPeaks(data, 3)
    // Bucket 0: [0.1, 0.5] → min=0 (positive only), max=0.5
    expect(out[0].min).toBe(0)
    expect(out[0].max).toBeCloseTo(0.5, 5)
    // Bucket 1: [0.2, 0.8] → min=0, max=0.8
    expect(out[1].min).toBe(0)
    expect(out[1].max).toBeCloseTo(0.8, 5)
    // Bucket 2: [0.3, 0.4] → min=0, max=0.4
    expect(out[2].min).toBe(0)
    expect(out[2].max).toBeCloseTo(0.4, 5)
  })
  it("preserves negative amplitudes in the min field", () => {
    // Bipolar signal: -0.5 to 0.5
    const data = new Float32Array([-0.5, 0.5, -0.3, 0.3])
    const out = computeMinMaxPeaks(data, 2)
    // Float32 storage loses precision vs the literal -0.5; use toBeCloseTo.
    expect(out[0].min).toBeCloseTo(-0.5, 5)
    expect(out[0].max).toBeCloseTo(0.5, 5)
    expect(out[1].min).toBeCloseTo(-0.3, 5)
    expect(out[1].max).toBeCloseTo(0.3, 5)
  })
  it("a silent (all-zero) bucket reports {min:0, max:0}", () => {
    const out = computeMinMaxPeaks(new Float32Array([0, 0, 0, 0]), 2)
    expect(out[0]).toEqual({ min: 0, max: 0 })
    expect(out[1]).toEqual({ min: 0, max: 0 })
  })
  it("a single bucket returns the global min/max of the whole signal", () => {
    const data = new Float32Array([-0.7, 0.2, 0.9, -0.4])
    const out = computeMinMaxPeaks(data, 1)
    // Float32 precision: -0.7 → -0.699999988079071, 0.9 → 0.8999999761581421.
    expect(out[0].min).toBeCloseTo(-0.7, 5)
    expect(out[0].max).toBeCloseTo(0.9, 5)
  })
  it("handles a partial tail block (data.length not divisible by numBuckets)", () => {
    // 7 samples into 3 buckets: blockSize=7/3≈2.33 → ranges
    // [0,2), [2,5), [5,7). The tail bucket covers MORE samples than the
    // earlier ones.
    const data = new Float32Array([0.1, 0.1, 0.2, 0.2, 0.3, 0.3, 0.3])
    const out = computeMinMaxPeaks(data, 3)
    expect(out).toHaveLength(3)
    // Tail bucket sees all the 0.3s
    expect(out[2].max).toBeCloseTo(0.3, 5)
  })
  it("a pure sine wave: global extrema across all buckets ≈ ±1", () => {
    // The whole point of min/max peaks (vs just max-amplitude) is to
    // preserve the bipolar asymmetry of the waveform. Over a full sine
    // period sampled heavily, the global max ≈ 1 and global min ≈ -1.
    const N = 2000
    const data = new Float32Array(N)
    for (let i = 0; i < N; i++) data[i] = Math.sin((i / N) * Math.PI * 2)
    const out = computeMinMaxPeaks(data, 50)
    const globalMax = Math.max(...out.map((b) => b.max))
    const globalMin = Math.min(...out.map((b) => b.min))
    expect(globalMax).toBeGreaterThan(0.99)
    expect(globalMin).toBeLessThan(-0.99)
  })
})

// ── computeWaveformLODs ─────────────────────────────────────────────────────
describe("waveform-peaks — computeWaveformLODs", () => {
  it("returns three LOD arrays with the documented bucket counts", () => {
    // Short signal — bucket counts should still match (every bucket is
    // either a real aggregate or a zero-filled partial).
    const cache = computeWaveformLODs(new Float32Array([0.5, -0.5, 0.3, -0.3]))
    expect(cache.low).toHaveLength(LOD_BUCKETS.low)
    expect(cache.med).toHaveLength(LOD_BUCKETS.med)
    expect(cache.high).toHaveLength(LOD_BUCKETS.high)
  })
  it("the low LOD aggregates the signal across all 100 buckets", () => {
    // With 4 samples into 100 buckets, most buckets are empty (blockSize
    // 0.04 → floor() collapses many adjacent buckets to the same empty
    // range). The non-empty buckets collectively still cover the signal.
    const cache = computeWaveformLODs(new Float32Array([0.9, -0.8, 0.1, -0.2]))
    const globalMax = Math.max(...cache.low.map((b) => b.max))
    const globalMin = Math.min(...cache.low.map((b) => b.min))
    expect(globalMax).toBeCloseTo(0.9, 5)
    expect(globalMin).toBeCloseTo(-0.8, 5)
  })
})

// ── selectLOD ───────────────────────────────────────────────────────────────
describe("waveform-peaks — selectLOD", () => {
  // Thresholds: sqrt(100*500)≈223.6, sqrt(500*2000)=1000
  it("returns 'low' for pixelsAvailable <= 0", () => {
    expect(selectLOD(0)).toBe("low")
    expect(selectLOD(-100)).toBe("low")
  })
  it("returns 'low' for small pixel counts (< ~224)", () => {
    expect(selectLOD(1)).toBe("low")
    expect(selectLOD(100)).toBe("low")
    expect(selectLOD(223)).toBe("low")
  })
  it("returns 'med' for mid pixel counts (~224 to ~1000)", () => {
    expect(selectLOD(224)).toBe("med")
    expect(selectLOD(500)).toBe("med")
    expect(selectLOD(999)).toBe("med")
  })
  it("returns 'high' for large pixel counts (>= 1000)", () => {
    expect(selectLOD(1000)).toBe("high")
    expect(selectLOD(2000)).toBe("high")
    expect(selectLOD(10000)).toBe("high")
  })
})

// ── resampleForWidth ────────────────────────────────────────────────────────
describe("waveform-peaks — resampleForWidth", () => {
  it("returns [] when targetWidth <= 0", () => {
    const peaks = [{ min: -0.5, max: 0.5 }]
    expect(resampleForWidth(peaks, 0)).toEqual([])
    expect(resampleForWidth(peaks, -1)).toEqual([])
  })
  it("returns targetWidth zero-peaks when input is empty", () => {
    const out = resampleForWidth([], 5)
    expect(out).toHaveLength(5)
    for (const p of out) expect(p).toEqual({ min: 0, max: 0 })
  })
  it("DOWNSAMPLE aggregates via min-of-mins / max-of-maxes", () => {
    // 4 source buckets → 2 output pixels. Each output pixel aggregates 2.
    const peaks = [
      { min: -0.1, max: 0.2 },
      { min: -0.5, max: 0.3 },
      { min: -0.2, max: 0.9 },
      { min: -0.4, max: 0.1 },
    ]
    const out = resampleForWidth(peaks, 2)
    expect(out).toHaveLength(2)
    // Pixel 0 aggregates peaks[0..1]: min=-0.5, max=0.3
    expect(out[0]).toEqual({ min: -0.5, max: 0.3 })
    // Pixel 1 aggregates peaks[2..3]: min=-0.4, max=0.9
    expect(out[1]).toEqual({ min: -0.4, max: 0.9 })
  })
  it("UPSAMPLE via nearest-neighbor (source has fewer buckets)", () => {
    // 1 source bucket → 3 output pixels (all equal the source bucket)
    const src = [{ min: -0.7, max: 0.8 }]
    const out = resampleForWidth(src, 3)
    expect(out).toHaveLength(3)
    for (const p of out) expect(p).toEqual({ min: -0.7, max: 0.8 })
  })
  it("returns the input unchanged when source.length === targetWidth", () => {
    const peaks = [
      { min: -0.1, max: 0.1 },
      { min: -0.2, max: 0.2 },
    ]
    const out = resampleForWidth(peaks, 2)
    expect(out).toEqual(peaks)
  })
  it("downsample aggregation never exceeds source bounds", () => {
    // 6 buckets → 3 output pixels. Each output pixel aggregates 2.
    const peaks = [
      { min: -0.3, max: 0.5 },
      { min: -0.1, max: 0.2 },
      { min: -0.7, max: 0.1 },
      { min: -0.2, max: 0.4 },
      { min: -0.5, max: 0.6 },
      { min: -0.1, max: 0.3 },
    ]
    const out = resampleForWidth(peaks, 3)
    const globalMin = Math.min(...peaks.map((p) => p.min))
    const globalMax = Math.max(...peaks.map((p) => p.max))
    for (const p of out) {
      expect(p.min).toBeGreaterThanOrEqual(globalMin)
      expect(p.max).toBeLessThanOrEqual(globalMax)
    }
  })
})

// ── getPeaksForWidth ────────────────────────────────────────────────────────
describe("waveform-peaks — getPeaksForWidth (convenience)", () => {
  it("returns an array of exactly `width` peaks", () => {
    const cache = computeWaveformLODs(new Float32Array([0.5, -0.5, 0.3, -0.3, 0.1, -0.1]))
    // Three different widths exercise three LODs.
    expect(getPeaksForWidth(cache, 50)).toHaveLength(50)   // low LOD
    expect(getPeaksForWidth(cache, 600)).toHaveLength(600) // med LOD
    expect(getPeaksForWidth(cache, 1500)).toHaveLength(1500) // high LOD
  })
  it("selects the LOD appropriate to the width (low LOD for narrow widths)", () => {
    // Build a cache with distinct values per LOD so we can tell them apart.
    const cache = {
      low: Array.from({ length: LOD_BUCKETS.low }, () => ({ min: -0.1, max: 0.1 })),
      med: Array.from({ length: LOD_BUCKETS.med }, () => ({ min: -0.2, max: 0.2 })),
      high: Array.from({ length: LOD_BUCKETS.high }, () => ({ min: -0.3, max: 0.3 })),
    }
    // width=50 → low LOD → all peaks are -0.1/0.1
    const narrow = getPeaksForWidth(cache, 50)
    expect(narrow[0]).toEqual({ min: -0.1, max: 0.1 })
    // width=5000 → high LOD → all peaks are -0.3/0.3
    const wide = getPeaksForWidth(cache, 5000)
    expect(wide[0]).toEqual({ min: -0.3, max: 0.3 })
  })
})
