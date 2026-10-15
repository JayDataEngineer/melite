import type { TimelineMessage } from "./messages.ts";
export interface TimelineInteractionStateArgs {
    timelineState: TimelineMessage | null;
    onPromptResize?: (promptId: string, newStartFrame: number, newEndFrame: number) => void;
    onPromptMove?: (promptId: string, newStartFrame: number, newEndFrame: number) => void;
}
export declare function useTimelineInteractionState(args: TimelineInteractionStateArgs): {
    containerRef: import("react").RefObject<HTMLDivElement | null>;
    canvasRef: import("react").RefObject<HTMLCanvasElement | null>;
    backgroundCanvasRef: import("react").RefObject<HTMLCanvasElement | null>;
    editingPrompt: {
        uuid: string;
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
    setEditingPrompt: import("react").Dispatch<import("react").SetStateAction<{
        uuid: string;
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>>;
    editingPromptDivRef: import("react").RefObject<HTMLDivElement | null>;
    interaction: import("./interactions.ts").InteractionState;
    dispatchInteraction: import("react").ActionDispatch<[action: import("./interactions.ts").InteractionAction]>;
    isDraggingCursor: boolean;
    draggedKeyframe: import("./interactions.ts").DraggedKeyframe | null;
    intervalDrag: import("./interactions.ts").IntervalDrag | null;
    draggedInterval: import("./interactions.ts").DraggedInterval | null;
    resizingInterval: import("./interactions.ts").ResizingInterval | null;
    resizingPrompt: import("./interactions.ts").ResizingPrompt | null;
    draggingIntersection: import("./interactions.ts").DraggingIntersection | null;
    draggedKeyframeFrame: number | null;
    setDraggedKeyframeFrame: import("react").Dispatch<import("react").SetStateAction<number | null>>;
    draggedIntervalCurrentFrames: {
        startFrame: number;
        endFrame: number;
    } | null;
    setDraggedIntervalCurrentFrames: import("react").Dispatch<import("react").SetStateAction<{
        startFrame: number;
        endFrame: number;
    } | null>>;
    resizingIntervalCurrentFrames: {
        startFrame: number;
        endFrame: number;
    } | null;
    setResizingIntervalCurrentFrames: import("react").Dispatch<import("react").SetStateAction<{
        startFrame: number;
        endFrame: number;
    } | null>>;
    resizingPromptCurrentFrames: {
        startFrame: number;
        endFrame: number;
    } | null;
    setResizingPromptCurrentFrames: import("react").Dispatch<import("react").SetStateAction<{
        startFrame: number;
        endFrame: number;
    } | null>>;
    hoverEdge: "left" | "right" | null;
    setHoverEdge: import("react").Dispatch<import("react").SetStateAction<"left" | "right" | null>>;
    hoveredPromptForResize: {
        uuid: string;
        edge: "left" | "right";
        startFrame: number;
        endFrame: number;
    } | null;
    setHoveredPromptForResize: import("react").Dispatch<import("react").SetStateAction<{
        uuid: string;
        edge: "left" | "right";
        startFrame: number;
        endFrame: number;
    } | null>>;
    hoveredIntervalForResize: {
        uuid: string;
        edge: "left" | "right";
        startFrame: number;
        endFrame: number;
    } | null;
    setHoveredIntervalForResize: import("react").Dispatch<import("react").SetStateAction<{
        uuid: string;
        edge: "left" | "right";
        startFrame: number;
        endFrame: number;
    } | null>>;
    hoveredKeyframe: {
        uuid: string;
        frame: number;
    } | null;
    setHoveredKeyframe: import("react").Dispatch<import("react").SetStateAction<{
        uuid: string;
        frame: number;
    } | null>>;
    hoveredSplitPreview: {
        promptId: string;
        frame: number;
    } | null;
    setHoveredSplitPreview: import("react").Dispatch<import("react").SetStateAction<{
        promptId: string;
        frame: number;
    } | null>>;
    hoveredIntersection: {
        leftPromptId: string;
        rightPromptId: string;
        frame: number;
    } | null;
    setHoveredIntersection: import("react").Dispatch<import("react").SetStateAction<{
        leftPromptId: string;
        rightPromptId: string;
        frame: number;
    } | null>>;
    hoveredPromptResize: {
        promptId: string;
        frame: number;
    } | null;
    setHoveredPromptResize: import("react").Dispatch<import("react").SetStateAction<{
        promptId: string;
        frame: number;
    } | null>>;
    draggingIntersectionCurrentFrame: number | null;
    setDraggingIntersectionCurrentFrame: import("react").Dispatch<import("react").SetStateAction<number | null>>;
    isHoveringHeader: boolean;
    setIsHoveringHeader: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    isHoveringLabelArea: boolean;
    setIsHoveringLabelArea: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    timelineStateRef: import("react").RefObject<TimelineMessage | null>;
    resizingPromptRef: import("react").RefObject<import("./interactions.ts").ResizingPrompt | null>;
    resizingPromptCurrentFramesRef: import("react").RefObject<{
        startFrame: number;
        endFrame: number;
    } | null>;
    draggingIntersectionRef: import("react").RefObject<import("./interactions.ts").DraggingIntersection | null>;
    onPromptResizeRef: import("react").RefObject<((promptId: string, newStartFrame: number, newEndFrame: number) => void) | null | undefined>;
    onPromptMoveRef: import("react").RefObject<((promptId: string, newStartFrame: number, newEndFrame: number) => void) | null | undefined>;
};
export type TimelineEditingDraft = NonNullable<ReturnType<typeof useTimelineInteractionState>["editingPrompt"]>;
export type TimelineInteractionSnapshot = ReturnType<typeof useTimelineInteractionState>;
//# sourceMappingURL=timeline-interaction-state.d.ts.map