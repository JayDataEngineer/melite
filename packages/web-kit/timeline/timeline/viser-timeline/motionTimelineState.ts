// Builds a viser `TimelineMessage` from the motion card's runtime state so
// the vendored Timeline.tsx renders the Kimodo demo's bar byte-for-byte:
// the 6 keyframe tracks (Full-Body / 2D Root / L.Hand / R.Hand / L.Foot /
// R.Foot) with the demo's exact colors + height_scale=0.5, the motion's frame
// range, and the prompt as a segments row. Scrubbing + constraint editing
// ride viser's own interaction model (no reimplementation).
//
// Track colors are copied verbatim from
// vendor/kimodo/kimodo/demo/ui.py `build_timeline_tracks()`.

import type { TimelineMessage, TimelineInterval } from "./messages";
import type { TimelineTrack, TimelineKeyframe, TimelinePrompt } from "./types";

// Stable UUIDs (one per lane) so keyframes/prompts bind without churn.
// The viser component only matches on uuid equality — these never change.
export const MOTION_TIMELINE_TRACKS: TimelineTrack[] = [
  { uuid: "fullbody",   name: "Full-Body",  track_type: "keyframe", color: [219, 148, 86],  height_scale: 0.5 },
  { uuid: "root2d",     name: "2D Root",    track_type: "keyframe", color: [150, 100, 200], height_scale: 0.5 },
  { uuid: "left-hand",  name: "Left Hand",  track_type: "keyframe", color: [100, 200, 150], height_scale: 0.5 },
  { uuid: "right-hand", name: "Right Hand", track_type: "keyframe", color: [200, 100, 150], height_scale: 0.5 },
  { uuid: "left-foot",  name: "Left Foot",  track_type: "keyframe", color: [219, 148, 86],  height_scale: 0.5 },
  { uuid: "right-foot", name: "Right Foot", track_type: "keyframe", color: [150, 100, 200], height_scale: 0.5 },
];

export interface MotionTimelineInput {
  fps: number;
  /** Total frames (T). Clamped to ≥ 1. */
  frameCount: number;
  currentFrame: number;
  prompts: TimelinePrompt[];
  keyframes: TimelineKeyframe[];
  intervals: TimelineInterval[];
}

export function buildMotionTimelineState(inp: MotionTimelineInput): TimelineMessage {
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
export function makeTimelineId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && "randomUUID" in c) return c.randomUUID();
  return "tl-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
