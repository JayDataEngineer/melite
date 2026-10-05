/**
 * MotionTimelineBarLayout — shared geometry + formatting atoms for
 * the motion timeline bar (split from MotionTimelineBar.tsx, pure move).
 *
 * Pure values only (no hooks, no JSX): row heights, the pinned gutter
 * width, zoom bounds, rgb/clamp/fmtTimecode. The bar re-exports this
 * surface, so the public import path never moves.
 */
export declare const rgb: (c: [number, number, number]) => string;
export declare const clamp: (v: number, lo: number, hi: number) => number;
/** Row heights (px): ruler, prompts, beats (Layer C), audio layers, keyframe lanes. */
export declare const RULER_H = 28;
export declare const PROMPTS_H = 36;
export declare const BEATS_H = 26;
export declare const AUDIO_H = 26;
/** (2026-09-22, the D-M-E card law) the CARD lane height — audio clips
 * rendered as small call cards (the operator: "smaller versions of how
 * cards look"); opt-in per tenant, blocks stay 26. */
export declare const AUDIO_CARDS_H = 44;
export declare const LANE_H = 24;
/** Label gutter width. (audit F5, 2026-09-02: 88 → 112 — the pinned
 * header row now carries the timecode positioning indicator beside the
 * zoom cluster, DaVinci-style; every gutter row shares the one const.) */
export declare const GUTTER_W = 112;
/** Playhead accent — the DSH brand token. */
export declare const PLAYHEAD = "var(--dsw-alias-brand-primary)";
/** Unified background for the timeline bar and its sticky timecode chip. */
export declare const BAR_BG = "var(--dsw-alias-bg-layer-1)";
/** Zoom bounds: multiplier steps + the px-per-frame ceiling. */
export declare const ZOOM_STEP = 1.6;
/** mm:ss:ff at the bar's axis fps — the DaVinci position readout
 * (2026-09-01 audit F5: the bar had NO position indicator; the only
 * readout lived under the player with a different fps divisor). */
export declare const fmtTimecode: (frame: number, fps: number) => string;
/** Pointer travel (px) before a gesture counts as a DRAG (audit F8: 2px
 * armed "moved" from jitter — a shaky click at high zoom rippled both
 * cuts a frame. 5px = click still selects, jitter stays a click). */
export declare const DRAG_ARM_PX = 5;
export declare const MAX_PPF = 40;
