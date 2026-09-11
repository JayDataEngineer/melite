// motionEnvelope.spec.ts — the audio-reactive motion amplitude sampler.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { normalizeEnvelope, sampleMotionEnvelope } from "../src/motionEnvelope.ts";
import type { AudioCue } from "@melite/contracts";

const cue = (over: Partial<AudioCue> = {}): AudioCue => ({
  id: "c",
  track: "t",
  start: 0,
  duration: 4,
  label: "L",
  audioUrl: null,
  audioB64: null,
  volume: 1,
  waveformPeaks: [0.25, 0.5, 0.75, 1.0],
  sourceStepId: null,
  ...over,
});

describe("sampleMotionEnvelope gates", () => {
  it("returns [] when frames <= 0 or duration <= 0", () => {
    const cues = [cue()];
    assert.deepEqual(sampleMotionEnvelope({ segmentStart: 0, segmentDuration: 4, frames: 0, cues }), []);
    assert.deepEqual(sampleMotionEnvelope({ segmentStart: 0, segmentDuration: -1, frames: 4, cues }), []);
    assert.deepEqual(sampleMotionEnvelope({ segmentStart: 0, segmentDuration: 0, frames: 4, cues }), []);
  });

  it("returns [] when no cue has usable peaks", () => {
    assert.deepEqual(
      sampleMotionEnvelope({ segmentStart: 0, segmentDuration: 4, frames: 4, cues: [] }),
      [],
    );
    assert.deepEqual(
      sampleMotionEnvelope({
        segmentStart: 0, segmentDuration: 4, frames: 4,
        cues: [cue({ waveformPeaks: null }), cue({ waveformPeaks: [] })],
      }),
      [],
    );
  });

  it("returns [] when no cue overlaps the segment", () => {
    const cues = [
      cue({ start: 10, duration: 2, waveformPeaks: [1] }),
      cue({ start: -10, duration: 2, waveformPeaks: [1] }),
    ];
    assert.deepEqual(
      sampleMotionEnvelope({ segmentStart: 0, segmentDuration: 4, frames: 4, cues }),
      [],
    );
  });
});

describe("sampleMotionEnvelope sampling", () => {
  it("samples peaks at frame midpoints scaled by volume", () => {
    // 4 frames over [0,4): midpoints 0.5/1.5/2.5/3.5 → peaks idx 0/1/2/3.
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 4, frames: 4,
      cues: [cue({ volume: 0.5 })],
    });
    assert.deepEqual(env, [0.125, 0.25, 0.375, 0.5]);
  });

  it("clamps a frame exactly at the cue end to the last peak", () => {
    // 1 frame over [0,2): midpoint exactly 1.0; cue [0,1) with 2 peaks:
    // relT = 1.0 = duration → raw idx 2 → clamped to peak 1.
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 1,
      cues: [cue({ start: 0, duration: 1, waveformPeaks: [0.7, 0.9] })],
    });
    assert.deepEqual(env, [0.9]);
  });

  it("skips frames before/after a mid-segment cue (relT out of range)", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 8, frames: 4,
      cues: [cue({ start: 2, duration: 4, waveformPeaks: [1, 1] })],
    });
    // Midpoints 1/3/5/7: relT -1/1/3/5 → skip, hit, hit, skip.
    assert.deepEqual(env, [0, 1, 1, 0]);
  });

  it("sums overlapping cues and clamps the total above 1", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 4, frames: 1,
      cues: [cue({ waveformPeaks: [0.9] }), cue({ waveformPeaks: [0.9] })],
    });
    assert.deepEqual(env, [1]);
  });

  it("clamps negative sums to 0 and skips non-finite peaks", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 2,
      cues: [cue({ start: 0, duration: 2, waveformPeaks: [-0.5, -0.25] })],
    });
    assert.deepEqual(env, [0, 0]);
    const env2 = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 2,
      cues: [
        cue({
          start: 0, duration: 2,
          waveformPeaks: [Number.NaN, 0.5] as unknown as number[],
        }),
      ],
    });
    assert.deepEqual(env2, [0, 0.5]);
  });

  it("skips non-number peak entries", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 2, frames: 2,
      cues: [
        cue({
          start: 0, duration: 2,
          waveformPeaks: ["loud", 0.5] as unknown as number[],
        }),
      ],
    });
    assert.deepEqual(env, [0, 0.5]);
  });

  it("keeps in-range sums untouched", () => {
    const env = sampleMotionEnvelope({
      segmentStart: 0, segmentDuration: 4, frames: 2,
      cues: [cue({ waveformPeaks: [0.2, 0.4] })],
    });
    assert.deepEqual(env, [0.2, 0.4]);
  });
});

describe("normalizeEnvelope", () => {
  it("returns the same array when everything is zero", () => {
    const env = [0, 0, 0];
    assert.equal(normalizeEnvelope(env), env);
  });

  it("scales the peak to exactly 1", () => {
    assert.deepEqual(normalizeEnvelope([0.25, 0.5, 0.125]), [0.5, 1, 0.25]);
  });
});
