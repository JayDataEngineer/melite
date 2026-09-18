/**
 * MotionTimelineBarLayout — shared geometry + formatting atoms for
 * the motion timeline bar (split from MotionTimelineBar.tsx, pure move).
 *
 * Pure values only (no hooks, no JSX): row heights, the pinned gutter
 * width, zoom bounds, rgb/clamp/fmtTimecode. The bar re-exports this
 * surface, so the public import path never moves.
 */
export const rgb = (c: [number, number, number]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Row heights (px): ruler, prompts, beats (Layer C), audio layers, keyframe lanes. */
export const RULER_H = 28
export const PROMPTS_H = 36
export const BEATS_H = 26
export const AUDIO_H = 26
export const LANE_H = 24
/** Label gutter width. (audit F5, 2026-09-02: 88 → 112 — the pinned
 * header row now carries the timecode positioning indicator beside the
 * zoom cluster, DaVinci-style; every gutter row shares the one const.) */
export const GUTTER_W = 112
/** Playhead accent — the DSH brand token. */
export const PLAYHEAD = "var(--dsw-alias-brand-primary)"
/** Unified background for the timeline bar and its sticky timecode chip. */
export const BAR_BG = "var(--dsw-alias-bg-layer-1)"
/** Zoom bounds: multiplier steps + the px-per-frame ceiling. */
export const ZOOM_STEP = 1.6

/** mm:ss:ff at the bar's axis fps — the DaVinci position readout
 * (2026-09-01 audit F5: the bar had NO position indicator; the only
 * readout lived under the player with a different fps divisor). */
export const fmtTimecode = (frame: number, fps: number): string => {
  const f = Math.max(0, Math.round(frame))
  const safeFps = Math.max(1, Math.round(fps))
  const ff = f % safeFps
  const totalSec = Math.floor(f / safeFps)
  const ss = totalSec % 60
  const mm = Math.floor(totalSec / 60)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(mm)}:${p(ss)}:${p(ff)}`
}

/** Pointer travel (px) before a gesture counts as a DRAG (audit F8: 2px
 * armed "moved" from jitter — a shaky click at high zoom rippled both
 * cuts a frame. 5px = click still selects, jitter stays a click). */
export const DRAG_ARM_PX = 5
export const MAX_PPF = 40
