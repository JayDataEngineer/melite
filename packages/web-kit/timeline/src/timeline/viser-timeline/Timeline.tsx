// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext, useMemo } from "react";
import type { TimelineMessage } from "./messages.ts";
import { ViewerContext } from "./viewerContext.ts";
import { FRAME_LABELS_HEIGHT, TRACK_HEIGHT } from "./TimelineConstants.ts";
import { DARK_THEME, LIGHT_THEME } from "./styles.ts";
import { useTimelineInteractionState } from "./timeline-interaction-state.ts";
import { useTimelineViewport } from "./timeline-viewport.ts";
import { useTimelineAutoPan } from "./timeline-auto-pan.ts";
import { useTimelineGeometry } from "./timeline-geometry.ts";
import { useTimelineMouseHandlers } from "./timeline-mouse.ts";
import { useTimelineBackground } from "./timeline-render-background.ts";
import { useTimelineForeground } from "./timeline-render-foreground.ts";
import { SCROLLBAR_TOTAL_HEIGHT, TimelineEditingOverlay, TimelineScrollbar } from "./timeline-overlays.tsx";

export { calculateTimelineCoordinates, DEFAULT_KEYFRAME_COLOR, getIntervalSegments,
 getZoomEnvelopeEndFrame, OUT_OF_RANGE_CONSTRAINT_COLOR, OUT_OF_RANGE_CONSTRAINT_OPACITY,
 PROMPT_TEXT_Y_OFFSET_PX } from "./timeline-scales.ts";
export { useTimelineInteractionState };
export type { TimelineEditingDraft, TimelineInteractionSnapshot, TimelineInteractionStateArgs } from "./timeline-interaction-state.ts";
export { useTimelineViewport };
export type { TimelineViewportArgs, ViserViewport } from "./timeline-viewport.ts";
export { useTimelineAutoPan };
export { AUTO_PAN_EDGE_PX, AUTO_PAN_MAX_PX_PER_SEC } from "./timeline-auto-pan.ts";
export type { AutoPanMode, TimelineAutoPan, TimelineAutoPanArgs } from "./timeline-auto-pan.ts";
export { useTimelineGeometry };
export type { TimelineGeometry, TimelineGeometryArgs } from "./timeline-geometry.ts";
export { useTimelineMouseHandlers };
export type { TimelineMouseArgs, TimelineMouseCallbacks } from "./timeline-mouse.ts";
export { useTimelineBackground };
export type { TimelineBackgroundArgs } from "./timeline-render-background.ts";
export { useTimelineForeground };
export type { TimelineForegroundArgs } from "./timeline-render-foreground.ts";
export { SCROLLBAR_TOTAL_HEIGHT, TimelineEditingOverlay, TimelineScrollbar };
export { SCROLLBAR_HEIGHT } from "./timeline-overlays.tsx";
export type { TimelineEditingOverlayProps, TimelineScrollbarProps } from "./timeline-overlays.tsx";

interface TimelineProps {
 timelineState: TimelineMessage | null;
 onFrameChange?: (frame: number) => void;
 onKeyframeAdd?: (trackId: string, frame: number) => string | void; // Returns the temp UUID
 onKeyframeMove?: (keyframeId: string, newFrame: number) => void;
 onKeyframeDelete?: (keyframeId: string) => void;
 onIntervalAdd?: (trackId: string, startFrame: number, endFrame: number) => string | void; // Returns the temp UUID
 onIntervalMove?: (intervalId: string, newStartFrame: number, newEndFrame: number) => void;
 onIntervalDelete?: (intervalId: string) => void;
 onPromptUpdate?: (promptId: string, newText: string) => void;
 onPromptResize?: (promptId: string, newStartFrame: number, newEndFrame: number) => void;
 onPromptMove?: (promptId: string, newStartFrame: number, newEndFrame: number) => void;
 onPromptDelete?: (promptId: string) => void;
 onPromptAdd?: (startFrame: number, endFrame: number, text: string) => string | void; // Returns the temp UUID
 onPromptSplit?: (promptId: string, splitFrame: number) => void;
 onPromptMerge?: (leftPromptId: string, rightPromptId: string) => void;
 getLatestState?: () => TimelineMessage | null; // Function to get latest state
}

// Drawing helpers live in timeline/draw.ts
export function Timeline({ 
 timelineState, 
 onFrameChange,
 onKeyframeAdd,
 onKeyframeMove,
 onKeyframeDelete,
 onIntervalAdd,
 onIntervalMove,
 onIntervalDelete,
 onPromptUpdate,
 onPromptResize,
 onPromptMove,
 onPromptDelete,
 onPromptAdd,
 onPromptSplit,
 onPromptMerge,
 getLatestState
}: TimelineProps) {
 const viewer = useContext(ViewerContext);
 const darkMode = viewer?.useGui((state) => state.theme.dark_mode) ?? true;
 const theme = darkMode ? DARK_THEME : LIGHT_THEME;
 const prompts = useMemo(
 () => timelineState?.prompts ?? [],
 [timelineState?.prompts],
 );
 const promptsByStart = useMemo(
 () => [...prompts].sort((a, b) => a.start_frame - b.start_frame),
 [prompts],
 );
 const promptsByEndDesc = useMemo(
 () => [...prompts].sort((a, b) => b.end_frame - a.end_frame),
 [prompts],
 );
 const promptRange = useMemo(() => {
 if (prompts.length === 0) {
 return null;
 }
 let minStart = prompts[0]!.start_frame;
 let maxEnd = prompts[0]!.end_frame;
 for (const prompt of prompts) {
 minStart = Math.min(minStart, prompt.start_frame);
 maxEnd = Math.max(maxEnd, prompt.end_frame);
 }
 return { startFrame: minStart, endFrame: maxEnd };
 }, [prompts]);
 const tracks = useMemo(
 () => timelineState?.tracks ?? [],
 [timelineState?.tracks],
 );
 const keyframes = useMemo(
 () => timelineState?.keyframes ?? [],
 [timelineState?.keyframes],
 );
 const intervals = useMemo(
 () => timelineState?.intervals ?? [],
 [timelineState?.intervals],
 );
 const interaction = useTimelineInteractionState({ timelineState, onPromptResize, onPromptMove });
 const { containerRef, canvasRef, editingPrompt, setEditingPrompt, editingPromptDivRef,
 isDraggingCursor, draggedKeyframe, draggedInterval, resizingPrompt, resizingPromptCurrentFrames,
 hoverEdge, hoveredIntersection, draggingIntersection, isHoveringHeader,
 isHoveringLabelArea } = interaction;
 const viewport = useTimelineViewport({ timelineState, interaction });
 const { zoomLevel, panOffset, canvasSize, resizeRevision, handleWheel,
 onScrollbarThumbMouseDown, onScrollbarTrackMouseDown, zoomBy, resetZoom,
 scrollbarTrackRef } = viewport;
 const autoPan = useTimelineAutoPan({ interaction, viewport });
 const geometry = useTimelineGeometry({ timelineState, canvasRef, zoomLevel, panOffset,
 prompts, promptsByStart, intervals, keyframes });
 const { handleMouseDown, handleMouseMove, handleMouseUp, handleContextMenu,
 handleDoubleClick } = useTimelineMouseHandlers({ timelineState, canvasRef, containerRef,
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

 return (
 <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
 <div
 ref={containerRef}
 style={{
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
 }}
 >
 <canvas
 ref={canvasRef}
 onMouseDown={handleMouseDown}
 onMouseMove={handleMouseMove}
 onMouseUp={handleMouseUp}
 onMouseLeave={handleMouseUp}
 onContextMenu={handleContextMenu}
 onDoubleClick={handleDoubleClick}
 onWheel={handleWheel}
 style={{
 width: "100%",
 height: `calc(100% - ${SCROLLBAR_TOTAL_HEIGHT}px)`,
 cursor: timelineState.constraints_enabled
 ? (
 resizingPrompt || resizingPromptCurrentFrames
 ? "ew-resize"
 : isHoveringLabelArea
 ? "default"
 : (hoveredIntersection || draggingIntersection)
 ? "ew-resize"
 : hoverEdge
 ? "ew-resize"
 : (isDraggingCursor || draggedKeyframe || draggedInterval)
 ? "grabbing"
 : "pointer"
 )
 : (isHoveringHeader || isDraggingCursor ? (isDraggingCursor ? "grabbing" : "pointer") : "default"),
 display: "block",
 }}
 />
 
 {/* Gray overlay when constraints are disabled */}
 {timelineState.constraints_enabled === false && (
 <div
 style={{
 position: "absolute",
 top: `${FRAME_LABELS_HEIGHT}px`,
 left: 0,
 right: 0,
 bottom: 0,
 backgroundColor: "rgba(13, 21, 32, 0.6)", // blue-1 tint (theme --blue-1 #0d1520)
 pointerEvents: "none",
 zIndex: 6,
 }}
 />
 )}
 
 <TimelineEditingOverlay editingPrompt={editingPrompt} timelineState={timelineState} theme={theme}
 darkMode={darkMode} editingPromptDivRef={editingPromptDivRef} onPromptUpdate={onPromptUpdate}
 setEditingPrompt={setEditingPrompt} />
 </div>
 <TimelineScrollbar timelineState={timelineState} zoomLevel={zoomLevel} panOffset={panOffset}
 darkMode={darkMode} scrollbarTrackRef={scrollbarTrackRef}
 onScrollbarTrackMouseDown={onScrollbarTrackMouseDown}
 onScrollbarThumbMouseDown={onScrollbarThumbMouseDown} zoomBy={zoomBy} resetZoom={resetZoom} />
 </div>
 );
}
