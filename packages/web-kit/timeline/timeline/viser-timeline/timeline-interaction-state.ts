// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useReducer, useRef, useState } from "react";
import type { TimelineMessage } from "./messages.ts";
import { initialInteractionState, interactionReducer } from "./interactions.ts";

export interface TimelineInteractionStateArgs {
 timelineState: TimelineMessage | null;
 onPromptResize?: (promptId: string, newStartFrame: number, newEndFrame: number) => void;
 onPromptMove?: (promptId: string, newStartFrame: number, newEndFrame: number) => void;
}

export function useTimelineInteractionState(args: TimelineInteractionStateArgs) {
 const { timelineState, onPromptResize, onPromptMove } = args;
 const containerRef = useRef<HTMLDivElement>(null);
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
 const [editingPrompt, setEditingPrompt] = useState<{uuid: string, text: string, x: number, y: number, width: number, height: number} | null>(null);
 const editingPromptDivRef = useRef<HTMLDivElement | null>(null);
 const [interaction, dispatchInteraction] = useReducer(
 interactionReducer,
 initialInteractionState,
 );
 const {
 isDraggingCursor,
 draggedKeyframe,
 intervalDrag,
 draggedInterval,
 resizingInterval,
 resizingPrompt,
 draggingIntersection,
 } = interaction;
 const [draggedKeyframeFrame, setDraggedKeyframeFrame] = useState<number | null>(null);
 const [draggedIntervalCurrentFrames, setDraggedIntervalCurrentFrames] = useState<{startFrame: number, endFrame: number} | null>(null);
 const [resizingIntervalCurrentFrames, setResizingIntervalCurrentFrames] = useState<{startFrame: number, endFrame: number} | null>(null);
 const [resizingPromptCurrentFrames, setResizingPromptCurrentFrames] = useState<{startFrame: number, endFrame: number} | null>(null);
 const [hoverEdge, setHoverEdge] = useState<'left' | 'right' | null>(null);
 const [hoveredPromptForResize, setHoveredPromptForResize] = useState<{uuid: string, edge: 'left' | 'right', startFrame: number, endFrame: number} | null>(null);
 const [hoveredIntervalForResize, setHoveredIntervalForResize] = useState<{uuid: string, edge: 'left' | 'right', startFrame: number, endFrame: number} | null>(null);
 const [hoveredKeyframe, setHoveredKeyframe] = useState<{uuid: string, frame: number} | null>(null);
 const [hoveredSplitPreview, setHoveredSplitPreview] = useState<{promptId: string, frame: number} | null>(null); // Preview for Shift+hover split
 const [hoveredIntersection, setHoveredIntersection] = useState<{leftPromptId: string, rightPromptId: string, frame: number} | null>(null); // Hover on intersection between prompts
 const [hoveredPromptResize, setHoveredPromptResize] = useState<{promptId: string, frame: number} | null>(null); // Hover on last prompt right-edge resize handle
 const [draggingIntersectionCurrentFrame, setDraggingIntersectionCurrentFrame] = useState<number | null>(null); // Current frame during intersection drag
 const [isHoveringHeader, setIsHoveringHeader] = useState(false);
 const [isHoveringLabelArea, setIsHoveringLabelArea] = useState(false);
 // Clear split preview immediately when Shift is released (no mouse move required).
 useEffect(() => {
 const onKeyUp = (e: KeyboardEvent) => {
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
 const timelineStateRef = useRef<typeof timelineState | null>(null);
 const resizingPromptRef = useRef<typeof resizingPrompt | null>(null);
 const resizingPromptCurrentFramesRef = useRef<typeof resizingPromptCurrentFrames | null>(null);
 const draggingIntersectionRef = useRef<typeof draggingIntersection | null>(null);
 const onPromptResizeRef = useRef<typeof onPromptResize | null>(null);
 const onPromptMoveRef = useRef<typeof onPromptMove | null>(null);
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

export type TimelineEditingDraft = NonNullable<ReturnType<typeof useTimelineInteractionState>["editingPrompt"]>;
export type TimelineInteractionSnapshot = ReturnType<typeof useTimelineInteractionState>;

