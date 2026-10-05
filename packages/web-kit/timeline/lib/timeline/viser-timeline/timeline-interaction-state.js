// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { useEffect, useReducer, useRef, useState } from "react";
import { initialInteractionState, interactionReducer } from "./interactions.js";
export function useTimelineInteractionState(args) {
    const { timelineState, onPromptResize, onPromptMove } = args;
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const backgroundCanvasRef = useRef(null);
    const [editingPrompt, setEditingPrompt] = useState(null);
    const editingPromptDivRef = useRef(null);
    const [interaction, dispatchInteraction] = useReducer(interactionReducer, initialInteractionState);
    const { isDraggingCursor, draggedKeyframe, intervalDrag, draggedInterval, resizingInterval, resizingPrompt, draggingIntersection, } = interaction;
    const [draggedKeyframeFrame, setDraggedKeyframeFrame] = useState(null);
    const [draggedIntervalCurrentFrames, setDraggedIntervalCurrentFrames] = useState(null);
    const [resizingIntervalCurrentFrames, setResizingIntervalCurrentFrames] = useState(null);
    const [resizingPromptCurrentFrames, setResizingPromptCurrentFrames] = useState(null);
    const [hoverEdge, setHoverEdge] = useState(null);
    const [hoveredPromptForResize, setHoveredPromptForResize] = useState(null);
    const [hoveredIntervalForResize, setHoveredIntervalForResize] = useState(null);
    const [hoveredKeyframe, setHoveredKeyframe] = useState(null);
    const [hoveredSplitPreview, setHoveredSplitPreview] = useState(null); // Preview for Shift+hover split
    const [hoveredIntersection, setHoveredIntersection] = useState(null); // Hover on intersection between prompts
    const [hoveredPromptResize, setHoveredPromptResize] = useState(null); // Hover on last prompt right-edge resize handle
    const [draggingIntersectionCurrentFrame, setDraggingIntersectionCurrentFrame] = useState(null); // Current frame during intersection drag
    const [isHoveringHeader, setIsHoveringHeader] = useState(false);
    const [isHoveringLabelArea, setIsHoveringLabelArea] = useState(false);
    // Clear split preview immediately when Shift is released (no mouse move required).
    useEffect(() => {
        const onKeyUp = (e) => {
            if (e.key === "Shift") {
                setHoveredSplitPreview(null);
            }
        };
        const onBlur = () => setHoveredSplitPreview(null);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", onBlur);
        return () => {
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", onBlur);
        };
    }, []);
    const timelineStateRef = useRef(null);
    const resizingPromptRef = useRef(null);
    const resizingPromptCurrentFramesRef = useRef(null);
    const draggingIntersectionRef = useRef(null);
    const onPromptResizeRef = useRef(null);
    const onPromptMoveRef = useRef(null);
    useEffect(() => {
        timelineStateRef.current = timelineState;
    }, [timelineState]);
    useEffect(() => {
        resizingPromptRef.current = resizingPrompt;
    }, [resizingPrompt]);
    useEffect(() => {
        resizingPromptCurrentFramesRef.current = resizingPromptCurrentFrames;
    }, [resizingPromptCurrentFrames]);
    useEffect(() => {
        draggingIntersectionRef.current = draggingIntersection;
    }, [draggingIntersection]);
    useEffect(() => {
        onPromptResizeRef.current = onPromptResize ?? null;
    }, [onPromptResize]);
    useEffect(() => {
        onPromptMoveRef.current = onPromptMove ?? null;
    }, [onPromptMove]);
    return { containerRef, canvasRef, backgroundCanvasRef, editingPrompt, setEditingPrompt,
        editingPromptDivRef, interaction, dispatchInteraction, isDraggingCursor, draggedKeyframe,
        intervalDrag, draggedInterval, resizingInterval, resizingPrompt, draggingIntersection,
        draggedKeyframeFrame, setDraggedKeyframeFrame, draggedIntervalCurrentFrames,
        setDraggedIntervalCurrentFrames, resizingIntervalCurrentFrames,
        setResizingIntervalCurrentFrames, resizingPromptCurrentFrames,
        setResizingPromptCurrentFrames, hoverEdge, setHoverEdge, hoveredPromptForResize,
        setHoveredPromptForResize, hoveredIntervalForResize, setHoveredIntervalForResize,
        hoveredKeyframe, setHoveredKeyframe, hoveredSplitPreview, setHoveredSplitPreview,
        hoveredIntersection, setHoveredIntersection, hoveredPromptResize, setHoveredPromptResize,
        draggingIntersectionCurrentFrame, setDraggingIntersectionCurrentFrame, isHoveringHeader,
        setIsHoveringHeader, isHoveringLabelArea, setIsHoveringLabelArea, timelineStateRef,
        resizingPromptRef, resizingPromptCurrentFramesRef, draggingIntersectionRef,
        onPromptResizeRef, onPromptMoveRef };
}
//# sourceMappingURL=timeline-interaction-state.js.map
