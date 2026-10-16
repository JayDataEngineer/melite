import type { TimelineInterval, TimelineMessage } from "./messages.js";
import type { TimelineKeyframe, TimelinePrompt } from "./types.js";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.js";
export interface TimelineGeometryArgs {
    timelineState: TimelineMessage | null;
    canvasRef: TimelineInteractionSnapshot["canvasRef"];
    zoomLevel: number;
    panOffset: number;
    prompts: TimelinePrompt[];
    promptsByStart: TimelinePrompt[];
    intervals: TimelineInterval[];
    keyframes: TimelineKeyframe[];
}
export declare function useTimelineGeometry(args: TimelineGeometryArgs): {
    getFrameFromX: (x: number) => number;
    getTrackY: (trackIndex: number) => number;
    getTrackFromY: (y: number) => {
        type: "header" | "prompt" | "track";
        trackIndex?: number;
    };
    findKeyframeAtPosition: (x: number, y: number) => TimelineKeyframe | null;
    findIntervalAtPosition: (x: number, y: number) => {
        interval: any;
        clickOffsetFrames: number;
    } | null;
    findPromptAtPosition: (x: number, y: number) => TimelinePrompt | null;
    findPromptEdge: (x: number, y: number) => {
        prompt: TimelinePrompt;
        edge: "left" | "right";
    } | null;
    findPromptIntersection: (x: number, y: number) => {
        leftPrompt: TimelinePrompt;
        rightPrompt: TimelinePrompt;
        frame: number;
    } | null;
    findIntervalEdge: (x: number, y: number) => {
        interval: any;
        edge: "left" | "right";
    } | null;
};
export type TimelineGeometry = ReturnType<typeof useTimelineGeometry>;
//# sourceMappingURL=timeline-geometry.d.ts.map