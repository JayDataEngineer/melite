import type { TimelineMessage } from "./messages.ts";
import type { TimelinePrompt } from "./types.ts";
import type { TimelineAutoPan } from "./timeline-auto-pan.ts";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.ts";
import type { TimelineGeometry } from "./timeline-geometry.ts";
export interface TimelineMouseCallbacks {
    onFrameChange?: (frame: number) => void;
    onKeyframeAdd?: (trackId: string, frame: number) => string | void;
    onKeyframeMove?: (keyframeId: string, newFrame: number) => void;
    onKeyframeDelete?: (keyframeId: string) => void;
    onIntervalAdd?: (trackId: string, startFrame: number, endFrame: number) => string | void;
    onIntervalMove?: (intervalId: string, newStartFrame: number, newEndFrame: number) => void;
    onIntervalDelete?: (intervalId: string) => void;
    onPromptUpdate?: (promptId: string, newText: string) => void;
    onPromptResize?: (promptId: string, newStartFrame: number, newEndFrame: number) => void;
    onPromptMove?: (promptId: string, newStartFrame: number, newEndFrame: number) => void;
    onPromptDelete?: (promptId: string) => void;
    onPromptAdd?: (startFrame: number, endFrame: number, text: string) => string | void;
    onPromptSplit?: (promptId: string, splitFrame: number) => void;
    onPromptMerge?: (leftPromptId: string, rightPromptId: string) => void;
    getLatestState?: () => TimelineMessage | null;
}
export interface TimelineMouseArgs {
    timelineState: TimelineMessage | null;
    canvasRef: TimelineInteractionSnapshot["canvasRef"];
    containerRef: TimelineInteractionSnapshot["containerRef"];
    zoomLevel: number;
    panOffset: number;
    prompts: TimelinePrompt[];
    promptsByStart: TimelinePrompt[];
    promptsByEndDesc: TimelinePrompt[];
    interaction: TimelineInteractionSnapshot;
    autoPan: TimelineAutoPan;
    geometry: TimelineGeometry;
    callbacks: TimelineMouseCallbacks;
}
export declare function useTimelineMouseHandlers(args: TimelineMouseArgs): {
    handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    handleMouseUp: () => void;
    handleContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    handleDoubleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
};
//# sourceMappingURL=timeline-mouse.d.ts.map