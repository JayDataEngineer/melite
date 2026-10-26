// Barrel for the vendored viser timeline.
//
// PROVENANCE (the viser-timeline dir, one home for the fact): these
// files are vendored from NVIDIA's viser repo (the timeline demo's
// React bar; per-file SPDX lines carry the copyright). Vendored, not
// dep'd, because the demo components are not on npm — the timeline
// ships as example source. Local deltas vs upstream: messages.ts
// carries the motion-card state bridge; constants ride constants.ts /
// TimelineConstants.ts as upstream split them; draw/interaction files
// keep upstream's structure so later upstream pulls diff clean.
// (2026-11-05, F2: the melite-authored modules that used to sit inside
// this dir — the motion-card state builder and the scrollbar + zoom
// chrome — re-homed to `../` so this subtree carries upstream files
// only; they ride the kit barrel beside this one.)
export { Timeline } from "./Timeline.js";
//# sourceMappingURL=index.js.map
