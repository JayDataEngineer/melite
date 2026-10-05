import type { TimelineMessage } from "./messages.js";
import type { CanvasSizeState, TimelinePrompt } from "./types.js";
import type { TimelineTheme } from "./styles.js";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.js";
export interface TimelineForegroundArgs {
    timelineState: TimelineMessage | null;
    interaction: TimelineInteractionSnapshot;
    canvasSize: CanvasSizeState;
    resizeRevision: number;
    backgroundRevision: number;
    zoomLevel: number;
    panOffset: number;
    prompts: TimelinePrompt[];
    promptRange: {
        startFrame: number;
        endFrame: number;
    } | null;
    theme: TimelineTheme;
    darkMode: boolean;
}
export declare function useTimelineForeground(args: TimelineForegroundArgs): void;
