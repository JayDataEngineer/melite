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
export * from "./MotionTimelineBar.tsx";
export * from "./FilmPlayer.tsx";
export * from "./TimelineScrubBar.tsx";
export * from "./viser-timeline/index.ts";
export { PROMPT_COLORS } from "./viser-timeline/styles.ts";
export type { TimelineTheme } from "./viser-timeline/styles.ts";
//# sourceMappingURL=index.d.ts.map