// mp4Probe.ts — RE-EXPORT SEAT (2026-10-28): the walker moved to
// @melite/contracts/media-probe (the zero-dep leaf — the estate's
// run door needs the probe and harness-tools cannot be its home:
// this package depends on estate-queue). One spelling of the
// walker; this file keeps melite-view's import surface stable.
export { probeMedia, probeMp4, codecNameOf } from '@melite/contracts/media-probe'
export type { ProbeResult, ProbedStream } from '@melite/contracts/media-probe'
