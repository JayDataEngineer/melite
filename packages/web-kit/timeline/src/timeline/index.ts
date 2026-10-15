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
 *
 * (coverage-gaps F4 RULING, 2026-11-06: the viser-timeline cluster
 * — and TimelineScrollbar, whose ONLY consumer is the cluster's own
 * Timeline — is VENDORED-INERT: zero product mounts (superseded by
 * MotionTimelineBar at the h3 studio header), kept deliberately as
 * the vendored upstream reference (provenance-walled at
 * test/vendored-provenance.spec.ts, exercised by its own draw/
 * interactions/primitives specs). The coverage baseline's sub-100
 * rows over this subtree are the vendored-inert intent, not
 * test-owing debt — the wave spends no tests on corpses.)
 */
export * from "./MotionTimelineBar.tsx";
export * from "./FilmPlayer.tsx";
export * from "./TimelineScrubBar.tsx";
export * from "./viser-timeline/index.ts";
// The melite-authored modules beside the vendored subtree (re-homed out
// of it 2026-11-05, F2 — the vendored dir carries upstream files only).
export { buildMotionTimelineState, makeTimelineId, MOTION_TIMELINE_TRACKS } from "./motionTimelineState.ts";
export { TimelineScrollbar } from "./TimelineScrollbar.tsx";
export type { TimelineScrollbarProps } from "./TimelineScrollbar.tsx";
export { PROMPT_COLORS } from "./viser-timeline/styles.ts";
export type { TimelineTheme } from "./viser-timeline/styles.ts";
