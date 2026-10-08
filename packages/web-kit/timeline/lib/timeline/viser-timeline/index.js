// Barrel for the vendored viser timeline + the motion-card state builder.
//
// PROVENANCE (the viser-timeline dir, one home for the fact): these
// files are vendored from NVIDIA's viser repo (the timeline demo's
// React bar; per-file SPDX lines carry the copyright). Vendored, not
// dep'd, because the demo components are not on npm — the timeline
// ships as example source. Local deltas vs upstream: messages.ts
// carries the motion-card state bridge; constants ride constants.ts /
// TimelineConstants.ts as upstream split them; draw/interaction files
// keep upstream's structure so later upstream pulls diff clean.
export { Timeline } from "./Timeline.js";
export { buildMotionTimelineState, makeTimelineId, MOTION_TIMELINE_TRACKS } from "./motionTimelineState.js";
//# sourceMappingURL=index.js.map
