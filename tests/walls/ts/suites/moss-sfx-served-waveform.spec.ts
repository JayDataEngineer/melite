// moss-sfx-served-waveform.spec.ts — THE SERVED-WAVEFORM WALL (the
// 2026-11-12 roar burn, audit dev_docs/audits/moss-sfx-regression-
// 2026-11-12.md §2 no-judge finding + §4 C2). Every moss-sfx wall
// stopped at the serialized graph (moss-sfx-pipeline-truth ARM 5 is
// the deepest); the served FLAC had NO judge, so the Oct-29 roar
// (peak 0.9971, interior RMS ~0.28 machine-flat for its whole
// middle) shipped to the operator under an all-green estate.
//
// THE LAW: a served moss-sfx artifact is judged on its WAVEFORM, not
// its existence. The discriminator (tests/e2e/sfx-waveform.ts) fires
// only on the full burned signature — near-clip AND sustained-loud
// AND machine-flat interior — calibrated on measured runs:
//
//   BURNED run-0bf8fa826555 (Oct 29)  peak 0.9971  mean 0.281  CV 0.011
//   clean run-0c38171716aa (Nov 12)   peak 0.1243  mean 0.0104 CV 0.095
//   clean run-f1841b650095 (Nov 12)   peak 0.0179  mean 0.0025 CV 0.28
//
// ARMs here are offline (no GPU): they judge the decision function
// on the four measured fixtures plus the edge shapes a real session
// produces. The LIVE arm rides the real door in cards-gpu.e2e.ts
// (the ambience run decodes its own served FLAC through this same
// seam) — that arm is this wall's journey-depth anchor.
//
// Run: npx vitest run tests/walls/ts/suites/moss-sfx-served-waveform.spec.ts
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { pcmWaveformStats, roarViolation } from "../../../e2e/sfx-waveform.ts";

// The burned run's measured facts (run-0bf8fa826555-87610f8d,
// sfx_00001.flac — near-silent head/tail, constant clipped roar
// between). THE fixture: every arm that should red, reds on this.
const BURN: { peak: number; perSecRms: number[] } = {
  peak: 0.9971,
  perSecRms: [0.0015, 0.2834, 0.2769, 0.2795, 0.2845, 0.0019],
};

// The Nov-12 verification runs — clean generations at both a busy and
// a faint seed. These ACQUIT: no clean shape may ever red.
const CLEAN_BUSY: { peak: number; perSecRms: number[] } = {
  peak: 0.1243,
  perSecRms: [0.0079, 0.0121, 0.0107, 0.0096, 0.0113, 0.0067],
};
const CLEAN_FAINT: { peak: number; perSecRms: number[] } = {
  peak: 0.0179,
  perSecRms: [0.0026, 0.0015, 0.0024, 0.0026, 0.0034, 0.0034],
};

describe("THE SERVED-WAVEFORM WALL — the roar signature reds, every clean shape greens", () => {
  it("TRUTH — the burned run's own stats carry the roar signature", () => {
    const v = roarViolation(BURN);
    assert.ok(v !== null, "the Oct-29 burned fixture MUST red — the wall would have caught the operator's burn");
    assert.match(v!, /roar signature/);
  });

  it("ACQUIT 1 — the clean busy run passes (loud-ish, dynamic, unclipped)", () => {
    assert.equal(roarViolation(CLEAN_BUSY), null);
  });

  it("ACQUIT 2 — the clean faint run passes (the audit's 0.05 peak floor was refuted by this run)", () => {
    assert.equal(roarViolation(CLEAN_FAINT), null);
  });

  it("ACQUIT 3 — a loud dynamic sting passes: full-scale peaks but an evolving envelope", () => {
    // A drum-hit sting at the ceiling: peaks near clip, interior mean
    // above the floor, but seconds vary 38% — real content drifts.
    const sting = { peak: 0.981, perSecRms: [0.004, 0.19, 0.121, 0.184, 0.092, 0.003] };
    assert.equal(roarViolation(sting), null);
  });

  it("ACQUIT 4 — a long flat room tone at conversational level passes (quiet never reds)", () => {
    const tone = { peak: 0.31, perSecRms: Array.from({ length: 28 }, () => 0.041) };
    assert.equal(roarViolation(tone), null);
  });

  it("EDGE — a roar shorter than interior windows still reds via the full window", () => {
    const shortRoar = { peak: 0.998, perSecRms: [0.001, 0.27, 0.27, 0.27] };
    assert.ok(roarViolation(shortRoar) !== null);
  });

  it("PCM — the stats math itself: peak and per-second RMS from float PCM", () => {
    // 2 s at 8 kHz: first second a 0.5-square (RMS 0.5, peak 0.5),
    // second second digital zero.
    const sr = 8000;
    const pcm = new Float32Array(sr * 2);
    for (let i = 0; i < sr; i++) pcm[i] = i % 2 === 0 ? 0.5 : -0.5;
    const st = pcmWaveformStats(pcm, sr);
    assert.equal(st.peak, 0.5);
    assert.ok(Math.abs(st.perSecRms[0]! - 0.5) < 1e-6, "square wave RMS is its amplitude");
    assert.equal(st.perSecRms[1]!, 0);
  });

  it("PCM — a synthetic roar built as PCM reds end-to-end through the stats seam", () => {
    // White noise at amplitude 0.99 with hard clipping at 0.995 —
    // flat, loud, clipped: the burn's machine signature, synthesized.
    const sr = 8000;
    const pcm = new Float32Array(sr * 6);
    let seed = 12345;
    for (let i = 0; i < pcm.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      pcm[i] = Math.max(-0.995, Math.min(0.995, ((seed / 0x3fffffff) - 0.5) * 2.2));
    }
    // fade the edges like the burn's near-silent head/tail
    for (let i = 0; i < sr; i++) { pcm[i] *= i / sr; pcm[pcm.length - 1 - i]! *= i / sr; }
    const v = roarViolation(pcmWaveformStats(pcm, sr));
    assert.ok(v !== null, "synthesized clipped flat noise carries the roar signature");
  });
});
