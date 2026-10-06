import type { TimelineMessage } from "./messages.js";
import type { CanvasSizeState } from "./types.js";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.js";
export interface TimelineViewportArgs {
    timelineState: TimelineMessage | null;
    interaction: TimelineInteractionSnapshot;
}
export declare function useTimelineViewport(args: TimelineViewportArgs): {
    resizeRevision: number;
    canvasSize: CanvasSizeState;
    zoomLevel: number;
    setZoomLevel: import("react").Dispatch<import("react").SetStateAction<number>>;
    panOffset: number;
    setPanOffset: import("react").Dispatch<import("react").SetStateAction<number>>;
    zoomLevelRef: import("react").RefObject<number>;
    panOffsetRef: import("react").RefObject<number>;
    didUserAdjustViewRef: import("react").RefObject<boolean>;
    scrollbarTrackRef: import("react").RefObject<HTMLDivElement | null>;
    handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
    onScrollbarThumbMouseDown: (e: React.MouseEvent) => void;
    onScrollbarTrackMouseDown: (e: React.MouseEvent) => void;
    zoomBy: (factor: number) => void;
    resetZoom: () => void;
};
export type TimelineViewport = ReturnType<typeof useTimelineViewport>;
//# sourceMappingURL=timeline-viewport.d.ts.map
