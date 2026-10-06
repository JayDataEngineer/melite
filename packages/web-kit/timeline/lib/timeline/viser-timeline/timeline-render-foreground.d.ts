import type { TimelineMessage } from "./messages.ts";
import type { CanvasSizeState, TimelinePrompt } from "./types.ts";
import type { TimelineTheme } from "./styles.ts";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.ts";
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
//# sourceMappingURL=timeline-render-foreground.d.ts.map
