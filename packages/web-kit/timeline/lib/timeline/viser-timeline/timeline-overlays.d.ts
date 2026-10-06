import type { TimelineTheme } from "./styles.ts";
import type { TimelineMessage } from "./messages.ts";
import type { TimelineEditingDraft, TimelineInteractionSnapshot } from "./timeline-interaction-state.ts";
import type { TimelineViewport } from "./timeline-viewport.ts";
export declare const SCROLLBAR_HEIGHT = 10;
export declare const SCROLLBAR_TOTAL_HEIGHT: number;
export interface TimelineEditingOverlayProps {
    editingPrompt: TimelineEditingDraft | null;
    timelineState: TimelineMessage | null;
    theme: TimelineTheme;
    darkMode: boolean;
    editingPromptDivRef: TimelineInteractionSnapshot["editingPromptDivRef"];
    onPromptUpdate?: (promptId: string, newText: string) => void;
    setEditingPrompt: TimelineInteractionSnapshot["setEditingPrompt"];
}
export declare function TimelineEditingOverlay(props: TimelineEditingOverlayProps): import("react").JSX.Element | null;
export interface TimelineScrollbarProps {
    timelineState: TimelineMessage;
    zoomLevel: number;
    panOffset: number;
    darkMode: boolean;
    scrollbarTrackRef: TimelineViewport["scrollbarTrackRef"];
    onScrollbarTrackMouseDown: TimelineViewport["onScrollbarTrackMouseDown"];
    onScrollbarThumbMouseDown: TimelineViewport["onScrollbarThumbMouseDown"];
    zoomBy: TimelineViewport["zoomBy"];
    resetZoom: TimelineViewport["resetZoom"];
}
export declare function TimelineScrollbar(props: TimelineScrollbarProps): import("react").JSX.Element;
//# sourceMappingURL=timeline-overlays.d.ts.map
