// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
export const initialInteractionState = {
    isDraggingCursor: false,
    draggedKeyframe: null,
    intervalDrag: null,
    draggedInterval: null,
    resizingInterval: null,
    resizingPrompt: null,
    draggingIntersection: null,
};
export function interactionReducer(state, action) {
    switch (action.type) {
        case "startCursorDrag":
            return { ...initialInteractionState, isDraggingCursor: true };
        case "startKeyframeDrag":
            return { ...initialInteractionState, draggedKeyframe: action.payload };
        case "startIntervalDrag":
            return { ...initialInteractionState, intervalDrag: action.payload };
        case "updateIntervalDrag":
            return { ...state, intervalDrag: action.payload };
        case "startIntervalMove":
            return { ...initialInteractionState, draggedInterval: action.payload };
        case "startIntervalResize":
            return { ...initialInteractionState, resizingInterval: action.payload };
        case "updateIntervalResize":
            return { ...state, resizingInterval: action.payload };
        case "startPromptResize":
            return { ...initialInteractionState, resizingPrompt: action.payload };
        case "updatePromptResize":
            return { ...state, resizingPrompt: action.payload };
        case "startIntersectionDrag":
            return { ...initialInteractionState, draggingIntersection: action.payload };
        case "stopAll":
            return initialInteractionState;
        default:
            return state;
    }
}
//# sourceMappingURL=interactions.js.map