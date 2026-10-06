import type { TimelineCoordinates } from "./types.ts";
import type { TimelineMessage } from "./messages.ts";
export declare const DEFAULT_KEYFRAME_COLOR: [number, number, number];
export declare const OUT_OF_RANGE_CONSTRAINT_COLOR: [number, number, number];
export declare const OUT_OF_RANGE_CONSTRAINT_OPACITY = 0.1;
export declare function getIntervalSegments(interval: {
    start_frame: number;
    end_frame: number;
    opacity?: number;
}, promptRange: {
    startFrame: number;
    endFrame: number;
} | null, trackColor: [number, number, number]): Array<{
    startFrame: number;
    endFrame: number;
    color: [number, number, number];
    opacity?: number;
}>;
export declare const PROMPT_TEXT_Y_OFFSET_PX = 1;
/**
 * Determine the "zoom envelope" end frame used for coordinate scaling.
 *
 * `end_frame` is often used to set an initial viewport, but `max_frames_zoom`
 * defines how far users should be able to zoom out (number of visible frames).
 */
export declare function getZoomEnvelopeEndFrame(timelineState: TimelineMessage): number;
/**
 * Calculate common coordinate values used throughout timeline rendering
 */
export declare function calculateTimelineCoordinates(width: number, timelineState: TimelineMessage, zoomLevel: number, panOffset: number): TimelineCoordinates;
//# sourceMappingURL=timeline-scales.d.ts.map
