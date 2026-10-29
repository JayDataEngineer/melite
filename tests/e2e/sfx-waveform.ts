// sfx-waveform.ts — the served-waveform sanity seam (the 2026-11-12
// roar burn, audit dev_docs/audits/moss-sfx-regression-2026-11-12.md
// §4 C2). The moss-sfx lane had NO judge on the served artifact:
// every wall stopped at the serialized graph, so a numerically broken
// generation (the Oct-29 roar: peak 0.9971, interior RMS flat at
// ~0.28 for its whole middle) shipped to the operator green.
//
// The discriminator is CALIBRATED ON MEASURED RUNS, not guessed
// bounds (the audit's proposed peak-floor of 0.05 was refuted by the
// Nov-12 verification runs: clean seed 777777 peaks at 0.0179):
//
//   BURNED roar (Oct 29)   peak 0.9971  interior mean 0.281  CV 0.011
//   clean seed 424242      peak 0.1243  interior mean 0.0104 CV 0.095
//   clean seed 777777      peak 0.0179  interior mean 0.0025 CV 0.28
//
// A roar is ALL THREE at once: near-clipped (≥0.95), sustained-loud
// (interior mean RMS ≥0.10), and machine-flat (interior coefficient
// of variation ≤0.05 — real sustained audio drifts >5% across
// seconds; the roar's middle held to 1.1%). Quiet-but-structured
// output never reds: it fails the clip arm first. Loud dynamic stings
// never red: they fail the flatness arm.
//
// The torch.compile miscompile theory was ACQUITTED by the Nov-12
// verification (five clean runs including a full cold-cache rebuild,
// bit-consistent stats) — this wall exists because the one observed
// roar never reproduced, so the protection is the judged artifact.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/** Waveform facts the discriminator decides on. */
export interface WaveformStats {
  peak: number
  /** Mean RMS per whole second of audio, len ≈ duration. */
  perSecRms: number[]
}

/** Peak amplitude + per-second RMS of float PCM. */
export function pcmWaveformStats(pcm: Float32Array, sampleRate: number): WaveformStats {
  let peak = 0
  for (let i = 0; i < pcm.length; i++) {
    const a = Math.abs(pcm[i]!)
    if (a > peak) peak = a
  }
  const perSecRms: number[] = []
  for (let s = 0; s * sampleRate < pcm.length; s++) {
    const start = s * sampleRate
    const end = Math.min(start + sampleRate, pcm.length)
    let acc = 0
    for (let i = start; i < end; i++) acc += pcm[i]! * pcm[i]!
    perSecRms.push(Math.sqrt(acc / Math.max(1, end - start)))
  }
  return { peak, perSecRms }
}

/** Decode an audio file to mono float32 PCM via ffmpeg (48 kHz). */
export function decodeToPcm(path: string): { pcm: Float32Array; sampleRate: number } {
  const out = execFileSync(
    'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path,
      '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1'],
    { maxBuffer: 64 * 1024 * 1024 },
  )
  return { pcm: new Float32Array(out.buffer, out.byteOffset, out.length >> 2), sampleRate: 48000 }
}

/** Stats of an on-disk audio artifact, decoded through ffmpeg. */
export function audioFileStats(path: string): WaveformStats {
  const { pcm, sampleRate } = decodeToPcm(path)
  return pcmWaveformStats(pcm, sampleRate)
}

/** The interior seconds (attacks and releases live at the edges). */
function interior(perSecRms: number[]): number[] {
  return perSecRms.length >= 4 ? perSecRms.slice(1, -1) : perSecRms
}

/**
 * The roar decision: a violation description when the stats carry the
 * burned signature, null when the waveform is sane.
 *
 * @param s the waveform facts of a served sfx artifact.
 * @returns the roar description, or null when the audio is sane.
 */
export function roarViolation(s: WaveformStats): string | null {
  const inner = interior(s.perSecRms)
  if (inner.length === 0) return null
  const mean = inner.reduce((a, b) => a + b, 0) / inner.length
  if (mean <= 0) return null
  const cv = Math.sqrt(inner.reduce((a, b) => a + (b - mean) ** 2, 0) / inner.length) / mean
  const nearClip = s.peak >= 0.95
  const sustainedLoud = mean >= 0.10
  const machineFlat = cv <= 0.05
  if (nearClip && sustainedLoud && machineFlat) {
    return `served waveform is the roar signature: peak ${s.peak.toFixed(4)} (clipped), `
      + `interior RMS ${mean.toFixed(4)} sustained, flatness CV ${cv.toFixed(4)} — `
      + `numerically broken generation, not audio`
  }
  return null
}

/** FLAC magic: "fLaC" (0x66 0x4c 0x61 0x43). */
export function isFlac(path: string): boolean {
  const b = readFileSync(path)
  return b.length > 4 && b[0] === 0x66 && b[1] === 0x4c && b[2] === 0x61 && b[3] === 0x43
}
