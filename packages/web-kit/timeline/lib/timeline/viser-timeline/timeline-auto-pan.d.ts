import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.js";
import type { ViserViewport } from "./timeline-viewport.js";
export declare const AUTO_PAN_EDGE_PX = 60;
export declare const AUTO_PAN_MAX_PX_PER_SEC = 900;
export type AutoPanMode = "resizeRightEdge" | "intersection";
export interface TimelineAutoPanArgs {
    interaction: TimelineInteractionSnapshot;
    viewport: ViserViewport;
}
export declare function useTimelineAutoPan(args: TimelineAutoPanArgs): {
    stopAutoPan: () => void;
    startAutoPan: (mode: AutoPanMode) => void;
    getFrameFromXWithPan: (x: number, panOffsetOverride: number) => number;
    getPromptRightEdgeBounds: (ts: NonNullable<import("./messages.js").TimelineMessage | null>, rp: NonNullable<import("./interactions.js").ResizingPrompt | null>) => {
        minAllowedEnd: number;
        maxAllowedEnd: number;
    };
    applyResizingPromptAtFrame: (frame: number) => void;
    applyDraggingIntersectionAtFrame: (frame: number) => void;
    autoPanCanvasXRef: import("react").RefObject<number | null>;
};
export type TimelineAutoPan = ReturnType<typeof useTimelineAutoPan>;
//# sourceMappingURL=timeline-auto-pan.d.ts.map