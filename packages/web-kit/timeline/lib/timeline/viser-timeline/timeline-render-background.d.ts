import type { TimelineTheme } from "./styles.ts";
import type { TimelineInterval, TimelineMessage } from "./messages.ts";
import type { CanvasSizeState, TimelineKeyframe, TimelinePrompt, TimelineTrack } from "./types.ts";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.ts";
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
