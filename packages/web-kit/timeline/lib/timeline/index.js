/**
 * melite-timeline ui/timeline — the SHARED TIMELINE ELEMENT (§16
 * E-TENANTS). Public surface: "@melite-plugin/timeline/ui/timeline".
 *
 * The bar BOTH action cards render — motion's motion card (the
 * prompt/keyframe lanes) and video's video_timeline card (the NLE
 * calls/beats rows) — plus the vendored viser-timeline primitives
 * beneath it. Moved out of video 2026-08-21: a shared element
 * inside ONE consumer's plugin forced the motion card to import a
 * sibling's tenant. The document store lives beside it at
 * "@melite-plugin/timeline/ui/store".
 */
export * from "./MotionTimelineBar.js";
export * from "./FilmPlayer.js";
export * from "./TimelineScrubBar.js";
export * from "./viser-timeline/index.js";
// The melite-authored modules beside the vendored subtree (re-homed out
// of it 2026-11-05, F2 — the vendored dir carries upstream files only).
export { buildMotionTimelineState, makeTimelineId, MOTION_TIMELINE_TRACKS } from "./motionTimelineState.js";
export { TimelineScrollbar } from "./TimelineScrollbar.js";
export { PROMPT_COLORS } from "./viser-timeline/styles.js";
//# sourceMappingURL=index.js.map