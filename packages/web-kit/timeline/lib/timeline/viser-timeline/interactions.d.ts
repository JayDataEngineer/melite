export type DraggedKeyframe = {
    uuid: string;
    trackId: string;
    initialFrame?: number;
};
export type IntervalDrag = {
    trackId: string;
    startFrame: number;
    endFrame: number;
};
export type DraggedInterval = {
    uuid: string;
    trackId: string;
    originalStartFrame: number;
    originalEndFrame: number;
    clickOffsetFrames: number;
};
export type ResizingInterval = {
    uuid: string;
    trackId: string;
    edge: "left" | "right";
    originalStartFrame: number;
    originalEndFrame: number;
    isKeyframe?: boolean;
    convertedIntervalId?: string;
};
export type ResizingPrompt = {
    uuid: string;
    edge: "left" | "right";
    originalStartFrame: number;
    originalEndFrame: number;
};
export type DraggingIntersection = {
    leftPromptId: string;
    rightPromptId: string;
    originalFrame: number;
    leftOriginalStart: number;
    rightChain: Array<{
        uuid: string;
        originalStart: number;
        originalEnd: number;
    }>;
    rightChainMinStart: number;
    rightChainMaxEnd: number;
};
export type InteractionState = {
    isDraggingCursor: boolean;
    draggedKeyframe: DraggedKeyframe | null;
    intervalDrag: IntervalDrag | null;
    draggedInterval: DraggedInterval | null;
    resizingInterval: ResizingInterval | null;
    resizingPrompt: ResizingPrompt | null;
    draggingIntersection: DraggingIntersection | null;
};
export declare const initialInteractionState: InteractionState;
export type InteractionAction = {
    type: "startCursorDrag";
} | {
    type: "startKeyframeDrag";
    payload: DraggedKeyframe;
} | {
    type: "startIntervalDrag";
    payload: IntervalDrag;
} | {
    type: "updateIntervalDrag";
    payload: IntervalDrag;
} | {
    type: "startIntervalMove";
    payload: DraggedInterval;
} | {
    type: "startIntervalResize";
    payload: ResizingInterval;
} | {
    type: "updateIntervalResize";
    payload: ResizingInterval;
} | {
    type: "startPromptResize";
    payload: ResizingPrompt;
} | {
    type: "updatePromptResize";
    payload: ResizingPrompt;
} | {
    type: "startIntersectionDrag";
    payload: DraggingIntersection;
} | {
    type: "stopAll";
};
export declare function interactionReducer(state: InteractionState, action: InteractionAction): InteractionState;
