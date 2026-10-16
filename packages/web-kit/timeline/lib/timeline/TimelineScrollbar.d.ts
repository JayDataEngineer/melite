import type { TimelineMessage } from "./viser-timeline/messages.ts";
import type { ViserViewport } from "./viser-timeline/timeline-viewport.ts";
/** The three zoom seats — zoom out, fit-to-window, zoom in. The copy is
 *  the dictionary's (`zoomOutAria`/`zoomInAria` predate this file; the
 *  fit pair joins them), not this module's. */
export declare function TimelineZoomCluster(props: Pick<ViserViewport, "zoomBy" | "resetZoom">): import("react").JSX.Element;
export interface TimelineScrollbarProps {
    timelineState: TimelineMessage;
    zoomLevel: number;
    panOffset: number;
    darkMode: boolean;
    scrollbarTrackRef: ViserViewport["scrollbarTrackRef"];
    onScrollbarTrackMouseDown: ViserViewport["onScrollbarTrackMouseDown"];
    onScrollbarThumbMouseDown: ViserViewport["onScrollbarThumbMouseDown"];
    zoomBy: ViserViewport["zoomBy"];
    resetZoom: ViserViewport["resetZoom"];
}
export declare function TimelineScrollbar(props: TimelineScrollbarProps): import("react").JSX.Element;
//# sourceMappingURL=TimelineScrollbar.d.ts.map