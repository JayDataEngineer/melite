/**
 * Unit tests for lib/motion-envelope.ts — audio-reactive motion amplitude
 * envelope sampler.
 *
 * Pure: sampleMotionEnvelope (per-frame midpoint sampling, overlapping cues
 * sum, clamp [0,1], skip cues without peaks, skip out-of-range frames),
 * normalizeEnvelope (peak-normalize to 1.0, no-op for all-zero).
 *
 * Zero prior coverage. A sum-vs-max regression would make overlapping audio
 * cues produce LESS motion than a single cue; a missing clamp would let the
 * backend see out-of-range values.
 */
import { describe, it, expect } from "vitest"
import { sampleMotionEnvelope, normalizeEnvelope } from "@melite/formats"
import type { AudioCue } from "@melite/contracts"

function mkCue(start: number, duration: number, peaks: number[], volume = 1): AudioCue {
  return { start, duration, volume, waveformPeaks: peaks } as unknown as AudioCue
}

describe("motion-envelope — sampleMotionEnvelope guards", () => {
  it("returns [] when frames <= 0", () => {
    expect(sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 0, cues: [mkCue(0, 2, [1])],
    })).toEqual([])
  })
  it("returns [] when segmentDuration <= 0", () => {
    expect(sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 0, frames: 10, cues: [mkCue(0, 2, [1])],
    })).toEqual([])
  })
  it("returns [] when no cues have waveformPeaks", () => {
    expect(sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 10,
      cues: [mkCue(0, 2, [], 1)],
    })).toEqual([])
  })
  it("returns [] when cues don't overlap the segment time range", () => {
    expect(sampleMotionEnvelope({
      segmentStart: 10, segmentDuration: 2, frames: 10,
      cues: [mkCue(0, 2, [1])], // cue at [0,2] doesn't overlap [10,12]
    })).toEqual([])
  })
})

describe("motion-envelope — single-cue sampling", () => {
  it("produces an array of length `frames`", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 10, cues: [mkCue(0, 2, [0.5, 0.8])],
    })
    expect(env).toHaveLength(10)
  })
  it("every value is within [0, 1]", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 10,
      cues: [mkCue(0, 2, [0.5, 0.9, 1.0, 0.3])],
    })
    for (const v of env) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it("samples at the frame MIDPOINT (i + 0.5, not i)", () => {
    // 1 frame, segment [0, 2], cue [0, 2] with a single peak at 0.7.
    // frameTime = 0 + (0 + 0.5)/1 * 2 = 1.0 (midpoint of the segment)
    // relT = 1.0; idx = floor(1.0/2 * 1) = 0 → peaks[0] = 0.7
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1, cues: [mkCue(0, 2, [0.7])],
    })
    expect(env[0]).toBeCloseTo(0.7, 5)
  })
  it("scales the peak by cue.volume", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      cues: [mkCue(0, 2, [0.5], 2)], // volume 2 → 0.5 * 2 = 1.0
    })
    expect(env[0]).toBeCloseTo(1.0, 5)
  })
})

describe("motion-envelope — overlapping cues SUM (then clamp to [0,1])", () => {
  it("two overlapping cues contribute more than one alone (sum)", () => {
    const one = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      cues: [mkCue(0, 2, [0.3])],
    })
    const two = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      cues: [mkCue(0, 2, [0.3]), mkCue(0, 2, [0.3])],
    })
    expect(two[0]).toBeGreaterThan(one[0])
    expect(two[0]).toBeCloseTo(0.6, 5)
  })
  it("sum clamps to 1.0 (never overflows even with many loud cues)", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      cues: [mkCue(0, 2, [1.0]), mkCue(0, 2, [1.0]), mkCue(0, 2, [1.0])],
    })
    expect(env[0]).toBe(1) // 3 × 1.0 → clamped to 1
  })
  it("a cue outside its own time range contributes 0 to that frame", () => {
    // Segment [0,4], frame 0 midpoint at t=2. Cue [3,1] starts at t=3.
    // relT = 2 - 3 = -1 < 0 → skipped.
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 4, frames: 1,
      cues: [mkCue(3, 1, [0.9])], // doesn't cover t=2
    })
    expect(env[0]).toBe(0)
  })
})

describe("motion-envelope — normalizeEnvelope", () => {
  it("normalizes the peak to exactly 1.0", () => {
    const out = normalizeEnvelope([0.1, 0.5, 0.3])
    expect(out).toEqual([0.2, 1.0, 0.6])
  })
  it("returns the input unchanged when all values are 0 (no division by zero)", () => {
    expect(normalizeEnvelope([0, 0, 0])).toEqual([0, 0, 0])
  })
  it("handles an already-peak-normalized envelope (peak=1 → identity)", () => {
    expect(normalizeEnvelope([0, 0.5, 1.0])).toEqual([0, 0.5, 1.0])
  })
  it("returns [] unchanged", () => {
    expect(normalizeEnvelope([])).toEqual([])
  })
  it("does NOT mutate the input array", () => {
    const input = [0.2, 0.8]
    const out = normalizeEnvelope(input)
    expect(input).toEqual([0.2, 0.8]) // unchanged
    expect(out).not.toBe(input) // new reference
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Peak index mapping + clamping
// ════════════════════════════════════════════════════════════════════════════
describe("motion-envelope — peak index mapping", () => {
  it("maps frame midpoints to the correct peak index", () => {
    // 2 frames, segment [0, 2], cue [0, 2] with peaks [0.1, 0.9].
    // Frame 0 midpoint: 0 + (0+0.5)/2 * 2 = 0.5 → relT=0.5 → idx=floor(0.5/2*2)=0 → 0.1
    // Frame 1 midpoint: 0 + (1+0.5)/2 * 2 = 1.5 → relT=1.5 → idx=floor(1.5/2*2)=1 → 0.9
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 2,
      cues: [mkCue(0, 2, [0.1, 0.9])],
    })
    expect(env[0]).toBeCloseTo(0.1, 5)
    expect(env[1]).toBeCloseTo(0.9, 5)
  })
  it("clamps idx to peaks.length - 1 when frameTime is at the cue boundary", () => {
    // 1 frame, segment [0, 2], cue [0, 2] with peaks [0.5].
    // frameTime = 1.0 → relT = 1.0 → idx = floor(1.0/2 * 1) = 0. OK.
    // But if frameTime = 2.0 (edge), relT = 2.0 → idx = floor(2.0/2 * 1) = 1.
    // peaks.length = 1 → idx >= length → clamped to 0.
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 4, frames: 1,
      cues: [mkCue(0, 2, [0.7])],
    })
    // frameTime = 0 + 0.5/1 * 4 = 2.0 → relT = 2.0 → idx = floor(2.0/2 * 1) = 1
    // → clamped to 0 → peaks[0] = 0.7.
    expect(env[0]).toBeCloseTo(0.7, 5)
  })
  it("skips non-finite peaks (NaN, Infinity)", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      // idx = floor(1.0/2 * 4) = 2 → peaks[2] = 0.5 (the only finite one).
      cues: [mkCue(0, 2, [NaN, Infinity, 0.5, -Infinity])],
    })
    expect(env[0]).toBeCloseTo(0.5, 5)
  })
  it("skips non-number peaks (string, null)", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      // idx = floor(1.0/2 * 3) = 1 → peaks[1] = 0.3 (the only number).
      cues: [mkCue(0, 2, ["bad" as unknown as number, 0.3, null as unknown as number])],
    })
    expect(env[0]).toBeCloseTo(0.3, 5)
  })
  it("clamps negative sums to 0", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      cues: [mkCue(0, 2, [-0.5], -2)], // -0.5 * -2 = 1.0 (positive)
    })
    expect(env[0]).toBe(1) // -0.5 * -2 = 1.0
    // Now test a genuine negative:
    const env2 = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      cues: [mkCue(0, 2, [0.5], -1)], // 0.5 * -1 = -0.5 → clamped to 0
    })
    expect(env2[0]).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Multi-cue + offset scenarios
// ════════════════════════════════════════════════════════════════════════════
describe("motion-envelope — multi-cue scenarios", () => {
  it("two cues with different volumes scale independently", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      cues: [
        mkCue(0, 2, [0.4], 1.5),  // 0.4 * 1.5 = 0.6
        mkCue(0, 2, [0.2], 0.5),  // 0.2 * 0.5 = 0.1
      ],
    })
    expect(env[0]).toBeCloseTo(0.7, 5) // 0.6 + 0.1
  })
  it("a cue starting before the segment contributes during its overlap", () => {
    // Segment [2, 4], cue [0, 4] with peaks [0.1, 0.2, 0.3, 0.4].
    // Frame 0 midpoint: 2 + 0.5/1 * 2 = 3.0 → relT = 3.0 → idx = floor(3/4*4) = 3 → 0.4.
    const env = sampleMotionEnvelope({
      segmentStart: 2, segmentDuration: 2, frames: 1,
      cues: [mkCue(0, 4, [0.1, 0.2, 0.3, 0.4])],
    })
    expect(env[0]).toBeCloseTo(0.4, 5)
  })
  it("a cue entirely before the segment doesn't contribute (pre-filtered)", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 10, segmentDuration: 2, frames: 1,
      cues: [mkCue(0, 2, [0.9])], // cue [0,2], segment [10,12] → no overlap
    })
    expect(env).toEqual([])
  })
  it("a cue ending exactly at segmentStart does NOT overlap (strict >)", () => {
    // cueEnd = 5, segmentStart = 5 → 5 > 5 is false → filtered out.
    const env = sampleMotionEnvelope({
      segmentStart: 5, segmentDuration: 2, frames: 1,
      cues: [mkCue(3, 2, [0.9])], // cue [3,5], segment [5,7]
    })
    expect(env).toEqual([])
  })
  it("a cue starting exactly at segmentEnd does NOT overlap (strict <)", () => {
    // cueStart = 7, segmentEnd = 7 → 7 < 7 is false → filtered out.
    const env = sampleMotionEnvelope({
      segmentStart: 5, segmentDuration: 2, frames: 1,
      cues: [mkCue(7, 2, [0.9])], // cue [7,9], segment [5,7]
    })
    expect(env).toEqual([])
  })
  it("multiple frames track the peaks pattern over time", () => {
    // 4 frames, segment [0, 4], cue [0, 4] with 4 peaks.
    // Each frame's midpoint should select a different peak.
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 4, frames: 4,
      cues: [mkCue(0, 4, [0.1, 0.4, 0.6, 0.9])],
    })
    expect(env).toHaveLength(4)
    // Each frame should be increasing.
    expect(env[0]).toBeLessThan(env[1])
    expect(env[1]).toBeLessThan(env[2])
    expect(env[2]).toBeLessThan(env[3])
  })
  it("cue with volume 0 contributes nothing", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      cues: [mkCue(0, 2, [0.9], 0)], // volume 0 → 0.9 * 0 = 0
    })
    expect(env[0]).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// normalizeEnvelope — additional edge cases
// ════════════════════════════════════════════════════════════════════════════
describe("motion-envelope — normalizeEnvelope edge cases", () => {
  it("handles a single-element array", () => {
    expect(normalizeEnvelope([0.5])).toEqual([1])
    expect(normalizeEnvelope([0])).toEqual([0])
  })
  it("normalizes negative values correctly (peak is the max positive)", () => {
    // Peak = 0.8 (the most positive). All values divided by 0.8.
    const out = normalizeEnvelope([-0.4, 0.8, -0.2])
    expect(out[0]).toBeCloseTo(-0.5, 5)
    expect(out[1]).toBeCloseTo(1.0, 5)
    expect(out[2]).toBeCloseTo(-0.25, 5)
  })
  it("returns all-zero input unchanged (no negative values in output)", () => {
    expect(normalizeEnvelope([0, 0, 0])).toEqual([0, 0, 0])
  })
  it("handles an array where the peak is at the start", () => {
    expect(normalizeEnvelope([1.0, 0.5, 0.25])).toEqual([1, 0.5, 0.25])
  })
  it("handles very small non-zero values", () => {
    const out = normalizeEnvelope([0.0001, 0.0002])
    expect(out[0]).toBeCloseTo(0.5, 3)
    expect(out[1]).toBeCloseTo(1.0, 3)
  })
})
