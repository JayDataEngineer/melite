import type { TimelineTheme } from "./styles.js";
import type { TimelineInterval, TimelineMessage } from "./messages.js";
import type { CanvasSizeState, TimelineKeyframe, TimelinePrompt, TimelineTrack } from "./types.js";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.js";
export interface TimelineBackgroundArgs {
    timelineState: TimelineMessage | null;
    interaction: TimelineInteractionSnapshot;
    canvasSize: CanvasSizeState;
    resizeRevision: number;
    zoomLevel: number;
    panOffset: number;
    prompts: TimelinePrompt[];
    promptRange: {
        startFrame: number;
        endFrame: number;
    } | null;
    tracks: TimelineTrack[];
    keyframes: TimelineKeyframe[];
    intervals: TimelineInterval[];
    theme: TimelineTheme;
    darkMode: boolean;
}
export declare function useTimelineBackground(args: TimelineBackgroundArgs): {
    backgroundRevision: number;
};
//# sourceMappingURL=timeline-render-background.d.ts.map
