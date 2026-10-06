import type { TimelineMessage, TimelineInterval } from "./messages.js";
import type { TimelineTrack, TimelineKeyframe, TimelinePrompt } from "./types.js";
export declare const MOTION_TIMELINE_TRACKS: TimelineTrack[];
export interface MotionTimelineInput {
    fps: number;
    /** Total frames (T). Clamped to ≥ 1. */
    frameCount: number;
    currentFrame: number;
    prompts: TimelinePrompt[];
    keyframes: TimelineKeyframe[];
    intervals: TimelineInterval[];
}
export declare function buildMotionTimelineState(inp: MotionTimelineInput): TimelineMessage;
/** UUID for locally-added keyframes/prompts/intervals. */
export declare function makeTimelineId(): string;
//# sourceMappingURL=motionTimelineState.d.ts.map
