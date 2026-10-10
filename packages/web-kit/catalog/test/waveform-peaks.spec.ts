// waveform-peaks.spec.ts — the zoom-fidelity peak cache: the min/max
// fold, the LOD build + select, the width resample, and the browser
// decode funnel (AudioContext + fetch scripted).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  LOD_BUCKETS,
  computeMinMaxPeaks,
  computeWaveformLODs,
  decodeAudioPeaks,
  getPeaksForWidth,
  resampleForWidth,
  selectLOD,
} from "../src/waveform-peaks.ts";

const realFetch = globalThis.fetch;
const realAudio = (globalThis as Record<string, unknown>)["AudioContext"];
afterEach(() => {
  globalThis.fetch = realFetch;
  if (realAudio === undefined) delete (globalThis as Record<string, unknown>)["AudioContext"];
  else (globalThis as Record<string, unknown>)["AudioContext"] = realAudio;
});

const pcm = (vals: number[]): Float32Array => new Float32Array(vals);

describe("computeMinMaxPeaks", () => {
  it("returns [] for empty inputs", () => {
    assert.deepEqual(computeMinMaxPeaks(pcm([]), 10), []);
    assert.deepEqual(computeMinMaxPeaks(pcm([1]), 0), []);
    assert.deepEqual(computeMinMaxPeaks(pcm([1]), -3), []);
  });

  it("folds asymmetric min/max per bucket", () => {
    const peaks = computeMinMaxPeaks(pcm([0.5, -0.25, 0.1, -0.9]), 2);
    assert.equal(peaks.length, 2);
    assert.deepEqual(peaks[0], { min: -0.25, max: 0.5 });
    // Float32 storage: compare within one ulp of the float32 rounding.
    assert.ok(Math.abs(peaks[1].min - -0.9) < 1e-6);
    assert.ok(Math.abs(peaks[1].max - 0.1) < 1e-6);
  });

  it("emits zero buckets when the grid out-resolves the data", () => {
    const peaks = computeMinMaxPeaks(pcm([0.5]), 3);
    assert.equal(peaks.length, 3);
    assert.ok(peaks.every((p) => p.min <= 0 && p.max >= 0));
    // One sample lands in the LAST bucket (floor tail); the rest stay zero.
    assert.deepEqual(peaks[0], { min: 0, max: 0 });
    assert.deepEqual(peaks[2], { min: 0, max: 0.5 });
  });
});

describe("computeWaveformLODs + selectLOD + getPeaksForWidth", () => {
  it("builds all three LODs at the pinned widths", () => {
    const data = pcm(Array.from({ length: 4000 }, (_, i) => Math.sin(i / 10) / 2));
    const lod = computeWaveformLODs(data);
    assert.equal(lod.low.length, LOD_BUCKETS.low);
    assert.equal(lod.med.length, LOD_BUCKETS.med);
    assert.equal(lod.high.length, LOD_BUCKETS.high);
  });

  it("selects the nearest LOD by geometric-mean thresholds", () => {
    assert.equal(selectLOD(0), "low");
    assert.equal(selectLOD(-10), "low");
    assert.equal(selectLOD(100), "low");
    assert.equal(selectLOD(223), "low");
    assert.equal(selectLOD(224), "med");
    assert.equal(selectLOD(999), "med");
    assert.equal(selectLOD(1000), "high");
    assert.equal(selectLOD(4000), "high");
  });

  it("getPeaksForWidth delegates to the selected LOD", () => {
    const data = pcm(Array.from({ length: 4000 }, (_, i) => Math.cos(i / 7) / 3));
    const lod = computeWaveformLODs(data);
    assert.deepEqual(getPeaksForWidth(lod, 100), lod.low);
    assert.deepEqual(getPeaksForWidth(lod, 500), lod.med);
    assert.deepEqual(getPeaksForWidth(lod, 2000), lod.high);
  });
});

describe("resampleForWidth", () => {
  const peaks = [
    { min: -1, max: 1 },
    { min: -0.5, max: 0.5 },
    { min: -0.25, max: 0.75 },
    { min: 0, max: 0.25 },
  ];

  it("returns [] for non-positive widths and flat cache for empty peaks", () => {
    assert.deepEqual(resampleForWidth(peaks, 0), []);
    assert.deepEqual(resampleForWidth(peaks, -2), []);
    assert.deepEqual(resampleForWidth([], 3), [
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
    ]);
  });

  it("downsamples by contiguous aggregation", () => {
    const out = resampleForWidth(peaks, 2);
    assert.equal(out.length, 2);
    assert.deepEqual(out[0], { min: -1, max: 1 });
    assert.deepEqual(out[1], { min: -0.25, max: 0.75 });
  });

  it("upsamples by nearest-bucket replication", () => {
    const out = resampleForWidth(peaks.slice(0, 2), 4);
    assert.equal(out.length, 4);
    assert.deepEqual(out[0], { min: -1, max: 1 });
    assert.deepEqual(out[3], { min: -0.5, max: 0.5 });
  });
});

describe("THE ALIAS FENCE (audit R-S5)", () => {
  it("an empty-source resample returns independent buckets — writing one corrupts nothing", () => {
    const out = resampleForWidth([], 3);
    assert.deepEqual(out, [
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
    ]);
    out[0]!.min = -9;
    assert.deepEqual(out[1], { min: 0, max: 0 });
    assert.deepEqual(out[2], { min: 0, max: 0 });
  });

  it("an upsampled resample clones per slot — a consumer's in-place write touches neither the siblings nor the source", () => {
    const src = [
      { min: -0.5, max: 0.5 },
      { min: -1, max: 1 },
    ];
    const out = resampleForWidth(src, 4);
    // nearest-neighbor: slot 0 and 1 from src[0], 2 and 3 from src[1]
    out[0]!.max = 42;
    assert.equal(out[1]!.max, 0.5, "the sibling alias of src[0] is untouched");
    assert.equal(src[0]!.max, 0.5, "the SOURCE array is untouched");
    assert.deepEqual(out[3], { min: -1, max: 1 });
  });

});

describe("decodeAudioPeaks", () => {
  const stubAudio = (data: Float32Array, opts: { close?: boolean; fail?: boolean } = {}): void => {
    let closed = false;
    (globalThis as Record<string, unknown>)["AudioContext"] = class {
      async decodeAudioData(_buf: ArrayBuffer): Promise<{
        duration: number;
        getChannelData: (i: number) => Float32Array;
      }> {
        if (opts.fail) throw new Error("decode fail");
        return { duration: 2.5, getChannelData: () => data };
      }
      close(): void {
        closed = true;
      }
      static wasClosed(): boolean {
        return closed;
      }
    };
  };

  it("THE LOGGED NULL-FOLD (audit R-S5): a failed decode leaves a log line", async () => {
    const errors: unknown[] = [];
    const realErr = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      stubAudio(pcm([1, 2, 3]), { fail: true });
      const out = await decodeAudioPeaks("data:audio/wav;bad");
      assert.equal(out, null);
      const logged = errors.some((a) => String((a as unknown[])[0] ?? "").includes("decodeAudioPeaks failed"));
      assert.ok(logged, "the null-fold leaves a log line now");
    } finally {
      console.error = realErr;
    }
  });

  it("decodes legacy peaks + the LOD cache and closes the context", async () => {
    const data = pcm(Array.from({ length: 8000 }, (_, i) => (i % 2 === 0 ? 0.5 : -0.5)));
    stubAudio(data);
    globalThis.fetch = (async () =>
      new Response(data.buffer as ArrayBuffer)) as typeof fetch;
    const out = await decodeAudioPeaks("https://x/cue.wav");
    assert.ok(out !== null);
    assert.equal(out.duration, 2.5);
    assert.equal(out.legacyPeaks.length, 80);
    assert.ok(out.legacyPeaks.every((p) => p === 0.5));
    assert.equal(out.lod.low.length, LOD_BUCKETS.low);
    const Ctor = (globalThis as Record<string, unknown>)["AudioContext"] as {
      wasClosed: () => boolean;
    };
    assert.equal(Ctor.wasClosed(), true);
  });

  it("covers short buffers (the || 0 arm) and still closes", async () => {
    const data = pcm([0.25, -0.1]);
    stubAudio(data);
    globalThis.fetch = (async () =>
      new Response(data.buffer as ArrayBuffer)) as typeof fetch;
    const out = await decodeAudioPeaks("https://x/short.wav");
    assert.ok(out !== null);
    assert.equal(out.legacyPeaks.length, 80);
    assert.equal(out.legacyPeaks[0], 0.25);
    assert.equal(out.legacyPeaks[2], 0);
  });

  it("returns null when the fetch, the decode, or the context fails", async () => {
    stubAudio(pcm([0.1]));
    globalThis.fetch = (async () => {
      throw new Error("net down");
    }) as typeof fetch;
    assert.equal(await decodeAudioPeaks("https://x/a.wav"), null);
    globalThis.fetch = (async () => new Response(new ArrayBuffer(8))) as typeof fetch;
    stubAudio(pcm([0.1]), { fail: true });
    assert.equal(await decodeAudioPeaks("https://x/b.wav"), null);
    (globalThis as Record<string, unknown>)["AudioContext"] = class {
      constructor() {
        throw new Error("no webaudio");
      }
    };
    assert.equal(await decodeAudioPeaks("https://x/c.wav"), null);
  });
});
