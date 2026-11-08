import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { useContext, useMemo } from "react";
import { ViewerContext } from "./viewerContext.js";
import { FRAME_LABELS_HEIGHT, TRACK_HEIGHT } from "./TimelineConstants.js";
import { DARK_THEME, LIGHT_THEME } from "./styles.js";
import { useTimelineInteractionState } from "./timeline-interaction-state.js";
import { useTimelineViewport } from "./timeline-viewport.js";
import { useTimelineAutoPan } from "./timeline-auto-pan.js";
import { useTimelineGeometry } from "./timeline-geometry.js";
import { useTimelineMouseHandlers } from "./timeline-mouse.js";
import { useTimelineBackground } from "./timeline-render-background.js";
import { useTimelineForeground } from "./timeline-render-foreground.js";
import { SCROLLBAR_TOTAL_HEIGHT, TimelineEditingOverlay } from "./timeline-overlays.js";
// melite chrome (re-homed 2026-11-05, F2 — the vendored bar composes it):
import { TimelineScrollbar } from "../TimelineScrollbar.js";
export { calculateTimelineCoordinates, DEFAULT_KEYFRAME_COLOR, getIntervalSegments, getZoomEnvelopeEndFrame, OUT_OF_RANGE_CONSTRAINT_COLOR, OUT_OF_RANGE_CONSTRAINT_OPACITY, PROMPT_TEXT_Y_OFFSET_PX } from "./timeline-scales.js";
export { useTimelineInteractionState };
export { useTimelineViewport };
export { useTimelineAutoPan };
export { AUTO_PAN_EDGE_PX, AUTO_PAN_MAX_PX_PER_SEC } from "./timeline-auto-pan.js";
export { useTimelineGeometry };
export { useTimelineMouseHandlers };
export { useTimelineBackground };
export { useTimelineForeground };
export { SCROLLBAR_TOTAL_HEIGHT, TimelineEditingOverlay };
export { SCROLLBAR_HEIGHT } from "./timeline-overlays.js";
// Drawing helpers live in timeline/draw.ts
export function Timeline({ timelineState, onFrameChange, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onIntervalAdd, onIntervalMove, onIntervalDelete, onPromptUpdate, onPromptResize, onPromptMove, onPromptDelete, onPromptAdd, onPromptSplit, onPromptMerge, getLatestState }) {
    const viewer = useContext(ViewerContext);
    const darkMode = viewer?.useGui((state) => state.theme.dark_mode) ?? true;
    const theme = darkMode ? DARK_THEME : LIGHT_THEME;
    const prompts = useMemo(() => timelineState?.prompts ?? [], [timelineState?.prompts]);
    const promptsByStart = useMemo(() => [...prompts].sort((a, b) => a.start_frame - b.start_frame), [prompts]);
    const promptsByEndDesc = useMemo(() => [...prompts].sort((a, b) => b.end_frame - a.end_frame), [prompts]);
    const promptRange = useMemo(() => {
        if (prompts.length === 0) {
            return null;
        }
        let minStart = prompts[0].start_frame;
        let maxEnd = prompts[0].end_frame;
        for (const prompt of prompts) {
            minStart = Math.min(minStart, prompt.start_frame);
            maxEnd = Math.max(maxEnd, prompt.end_frame);
        }
        return { startFrame: minStart, endFrame: maxEnd };
    }, [prompts]);
    const tracks = useMemo(() => timelineState?.tracks ?? [], [timelineState?.tracks]);
    const keyframes = useMemo(() => timelineState?.keyframes ?? [], [timelineState?.keyframes]);
    const intervals = useMemo(() => timelineState?.intervals ?? [], [timelineState?.intervals]);
    const interaction = useTimelineInteractionState({ timelineState, onPromptResize, onPromptMove });
    const { containerRef, canvasRef, editingPrompt, setEditingPrompt, editingPromptDivRef, isDraggingCursor, draggedKeyframe, draggedInterval, resizingPrompt, resizingPromptCurrentFrames, hoverEdge, hoveredIntersection, draggingIntersection, isHoveringHeader, isHoveringLabelArea } = interaction;
    const viewport = useTimelineViewport({ timelineState, interaction });
    const { zoomLevel, panOffset, canvasSize, resizeRevision, handleWheel, onScrollbarThumbMouseDown, onScrollbarTrackMouseDown, zoomBy, resetZoom, scrollbarTrackRef } = viewport;
    const autoPan = useTimelineAutoPan({ interaction, viewport });
    const geometry = useTimelineGeometry({ timelineState, canvasRef, zoomLevel, panOffset,
        prompts, promptsByStart, intervals, keyframes });
    const { handleMouseDown, handleMouseMove, handleMouseUp, handleContextMenu, handleDoubleClick } = useTimelineMouseHandlers({ timelineState, canvasRef, containerRef,
        zoomLevel, panOffset, prompts, promptsByStart, promptsByEndDesc, interaction, autoPan,
        geometry, callbacks: { onFrameChange, onKeyframeAdd, onKeyframeMove, onKeyframeDelete,
            onIntervalAdd, onIntervalMove, onIntervalDelete, onPromptUpdate, onPromptResize, onPromptMove,
            onPromptDelete, onPromptAdd, onPromptSplit, onPromptMerge, getLatestState } });
    const { backgroundRevision } = useTimelineBackground({ timelineState, interaction, canvasSize,
        resizeRevision, zoomLevel, panOffset, prompts, promptRange, tracks, keyframes, intervals,
        theme, darkMode });
    useTimelineForeground({ timelineState, interaction, canvasSize, resizeRevision,
        backgroundRevision, zoomLevel, panOffset, prompts, promptRange, theme, darkMode });
    if (!timelineState || !timelineState.enabled) {
        return null;
    }
    // Calculate height based on number of tracks and their individual height scales
    let tracksHeight = 0;
    // Prompts row is always shown
    tracksHeight += TRACK_HEIGHT;
    for (const track of timelineState.tracks) {
        tracksHeight += TRACK_HEIGHT * (track.height_scale || 1.0);
    }
    const containerHeight = FRAME_LABELS_HEIGHT + tracksHeight + SCROLLBAR_TOTAL_HEIGHT;
    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", width: "100%" }, children: [_jsxs("div", { ref: containerRef, style: {
                    // Inline (was viser's position:fixed bottom bar) so the timeline
                    // flows inside the motion card. The canvas fills this container via
                    // its ResizeObserver; rendering + interaction code is unchanged.
                    position: "relative",
                    width: "100%",
                    height: `${containerHeight}px`,
                    margin: 0,
                    padding: 0,
                    borderTop: `2px solid ${darkMode ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.1)"}`,
                    boxShadow: darkMode ? "0 -2px 8px 0 rgba(0,0,0,0.15)" : "0 -2px 8px 0 rgba(0,0,0,0.08)",
                    backgroundColor: theme.backgroundColor,
                }, children: [_jsx("canvas", { ref: canvasRef, onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, onMouseLeave: handleMouseUp, onContextMenu: handleContextMenu, onDoubleClick: handleDoubleClick, onWheel: handleWheel, style: {
                            width: "100%",
                            height: `calc(100% - ${SCROLLBAR_TOTAL_HEIGHT}px)`,
                            cursor: timelineState.constraints_enabled
                                ? (resizingPrompt || resizingPromptCurrentFrames
                                    ? "ew-resize"
                                    : isHoveringLabelArea
                                        ? "default"
                                        : (hoveredIntersection || draggingIntersection)
                                            ? "ew-resize"
                                            : hoverEdge
                                                ? "ew-resize"
                                                : (isDraggingCursor || draggedKeyframe || draggedInterval)
                                                    ? "grabbing"
                                                    : "pointer")
                                : (isHoveringHeader || isDraggingCursor ? (isDraggingCursor ? "grabbing" : "pointer") : "default"),
                            display: "block",
                        } }), timelineState.constraints_enabled === false && (_jsx("div", { style: {
                            position: "absolute",
                            top: `${FRAME_LABELS_HEIGHT}px`,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(13, 21, 32, 0.6)", // blue-1 tint (theme --blue-1 #0d1520)
                            pointerEvents: "none",
                            zIndex: 6,
                        } })), _jsx(TimelineEditingOverlay, { editingPrompt: editingPrompt, timelineState: timelineState, theme: theme, darkMode: darkMode, editingPromptDivRef: editingPromptDivRef, onPromptUpdate: onPromptUpdate, setEditingPrompt: setEditingPrompt })] }), _jsx(TimelineScrollbar, { timelineState: timelineState, zoomLevel: zoomLevel, panOffset: panOffset, darkMode: darkMode, scrollbarTrackRef: scrollbarTrackRef, onScrollbarTrackMouseDown: onScrollbarTrackMouseDown, onScrollbarThumbMouseDown: onScrollbarThumbMouseDown, zoomBy: zoomBy, resetZoom: resetZoom })] }));
}
//# sourceMappingURL=Timeline.js.map