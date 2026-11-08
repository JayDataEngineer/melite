// Builds a viser `TimelineMessage` from the motion card's runtime state for
// the motion card's bar. Melite-authored (no upstream SPDX) — re-homed out of
// the vendored `viser-timeline/` dir 2026-11-05 (F2, nativity audit): the
// vendored subtree carries upstream files only, so later upstream pulls diff
// clean against it.
// the 6 keyframe tracks (Full-Body / 2D Root / L.Hand / R.Hand / L.Foot /
// R.Foot) with the demo's exact colors + height_scale=0.5, the motion's frame
// range, and the prompt as a segments row. Scrubbing + constraint editing
// ride viser's own interaction model (no reimplementation).
//
// Track colors are copied verbatim from
// vendor/kimodo/kimodo/demo/ui.py `build_timeline_tracks()`.
// Stable UUIDs (one per lane) so keyframes/prompts bind without churn.
// The viser component only matches on uuid equality — these never change.
export const MOTION_TIMELINE_TRACKS = [
    { uuid: "fullbody", name: "Full-Body", track_type: "keyframe", color: [219, 148, 86], height_scale: 0.5 },
    { uuid: "root2d", name: "2D Root", track_type: "keyframe", color: [150, 100, 200], height_scale: 0.5 },
    { uuid: "left-hand", name: "Left Hand", track_type: "keyframe", color: [100, 200, 150], height_scale: 0.5 },
    { uuid: "right-hand", name: "Right Hand", track_type: "keyframe", color: [200, 100, 150], height_scale: 0.5 },
    { uuid: "left-foot", name: "Left Foot", track_type: "keyframe", color: [219, 148, 86], height_scale: 0.5 },
    { uuid: "right-foot", name: "Right Foot", track_type: "keyframe", color: [150, 100, 200], height_scale: 0.5 },
];
export function buildMotionTimelineState(inp) {
    const T = Math.max(1, Math.floor(inp.frameCount));
    return {
        type: "TimelineMessage",
        enabled: true,
        fps: inp.fps,
        start_frame: 0,
        end_frame: T - 1,
        current_frame: Math.max(0, Math.min(T - 1, Math.round(inp.currentFrame))),
        prompts: inp.prompts,
        tracks: MOTION_TIMELINE_TRACKS,
        keyframes: inp.keyframes,
        intervals: inp.intervals,
        mode: "keyframe",
        constraints_enabled: true,
        default_text: "",
        default_duration: 30,
        min_prompt_duration: 1,
        max_prompt_duration: null,
        // Cap the initial visible window at 96 frames so each frame gets ~7px
        // in a typical editor layout AND the horizontal scrollbar is functional
        // (at zoom=1 all frames fit → nothing to scroll → dragging the thumb is
        // a no-op, which the user perceived as "scrollbar does nothing"). Motions
        // shorter than 96 frames still fit entirely. max_frames_zoom stays T so
        // the user can zoom all the way down to 1-frame detail.
        default_num_frames_zoom: Math.min(T, 96),
        max_frames_zoom: T,
    };
}
/** UUID for locally-added keyframes/prompts/intervals. */
export function makeTimelineId() {
    const c = typeof crypto !== "undefined" ? crypto : undefined;
    if (c && "randomUUID" in c)
        return c.randomUUID();
    return "tl-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
//# sourceMappingURL=motionTimelineState.js.map
