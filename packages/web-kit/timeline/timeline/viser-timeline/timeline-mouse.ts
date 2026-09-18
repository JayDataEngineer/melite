// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import { KEYFRAME_RADIUS, TRACK_LABEL_WIDTH } from "./constants";
import { FRAME_LABELS_HEIGHT, TRACK_HEIGHT } from "./TimelineConstants";
import type { TimelineMessage } from "./messages";
import type { TimelinePrompt } from "./types";
import { getZoomEnvelopeEndFrame } from "./timeline-scales";
import { AUTO_PAN_EDGE_PX } from "./timeline-auto-pan";
import type { TimelineAutoPan } from "./timeline-auto-pan";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state";
import type { TimelineGeometry } from "./timeline-geometry";

export interface TimelineMouseCallbacks {
 onFrameChange?: (frame: number) => void;
 onKeyframeAdd?: (trackId: string, frame: number) => string | void;
 onKeyframeMove?: (keyframeId: string, newFrame: number) => void;
 onKeyframeDelete?: (keyframeId: string) => void;
 onIntervalAdd?: (trackId: string, startFrame: number, endFrame: number) => string | void;
 onIntervalMove?: (intervalId: string, newStartFrame: number, newEndFrame: number) => void;
 onIntervalDelete?: (intervalId: string) => void;
 onPromptUpdate?: (promptId: string, newText: string) => void;
 onPromptResize?: (promptId: string, newStartFrame: number, newEndFrame: number) => void;
 onPromptMove?: (promptId: string, newStartFrame: number, newEndFrame: number) => void;
 onPromptDelete?: (promptId: string) => void;
 onPromptAdd?: (startFrame: number, endFrame: number, text: string) => string | void;
 onPromptSplit?: (promptId: string, splitFrame: number) => void;
 onPromptMerge?: (leftPromptId: string, rightPromptId: string) => void;
 getLatestState?: () => TimelineMessage | null;
}

export interface TimelineMouseArgs {
 timelineState: TimelineMessage | null;
 canvasRef: TimelineInteractionSnapshot["canvasRef"];
 containerRef: TimelineInteractionSnapshot["containerRef"];
 zoomLevel: number;
 panOffset: number;
 prompts: TimelinePrompt[];
 promptsByStart: TimelinePrompt[];
 promptsByEndDesc: TimelinePrompt[];
 interaction: TimelineInteractionSnapshot;
 autoPan: TimelineAutoPan;
 geometry: TimelineGeometry;
 callbacks: TimelineMouseCallbacks;
}

export function useTimelineMouseHandlers(args: TimelineMouseArgs) {
 const { timelineState, canvasRef, containerRef, zoomLevel, panOffset, prompts,
 promptsByStart, promptsByEndDesc, interaction, autoPan, geometry, callbacks } = args;
 const { dispatchInteraction, isDraggingCursor, draggedKeyframe, intervalDrag,
 draggedInterval, resizingInterval, resizingPrompt, draggingIntersection, editingPrompt,
 editingPromptDivRef, setEditingPrompt, setDraggedKeyframeFrame,
 setDraggedIntervalCurrentFrames, setResizingIntervalCurrentFrames,
 setResizingPromptCurrentFrames, setHoverEdge, setHoveredPromptForResize,
 setHoveredIntervalForResize, setHoveredKeyframe, setHoveredSplitPreview,
 setHoveredIntersection, setHoveredPromptResize, setDraggingIntersectionCurrentFrame,
 setIsHoveringHeader, setIsHoveringLabelArea } = interaction;
 const { autoPanCanvasXRef, startAutoPan, stopAutoPan, applyResizingPromptAtFrame,
 applyDraggingIntersectionAtFrame } = autoPan;
 const { getFrameFromX, getTrackFromY, findKeyframeAtPosition, findIntervalAtPosition,
 findIntervalEdge, findPromptEdge, findPromptAtPosition, findPromptIntersection } = geometry;
 const { onFrameChange, onKeyframeAdd, onKeyframeMove, onKeyframeDelete, onIntervalAdd,
 onIntervalMove, onIntervalDelete, onPromptUpdate, onPromptResize, onPromptMove,
 onPromptDelete, onPromptAdd, onPromptSplit, onPromptMerge, getLatestState } = callbacks;
 // Handle mouse events
 const handleMouseDown = useCallback(
 (e: React.MouseEvent<HTMLCanvasElement>) => {
 if (!timelineState || !canvasRef.current) return;
 const canvas = canvasRef.current;
 const rect = canvas.getBoundingClientRect();
 const x = e.clientX - rect.left;
 const y = e.clientY - rect.top;
 
 const trackInfo = getTrackFromY(y);
 
 // Header area: drag the time cursor (always allowed)
 if (trackInfo.type === 'header') {
 const frame = getFrameFromX(x);
 dispatchInteraction({ type: "startCursorDrag" });
 onFrameChange?.(frame);
 return;
 }
 
 // If constraints are disabled, don't allow any other interactions
 if (timelineState.constraints_enabled === false) {
 return;
 }
 
 // Prompt area: check for resize, drag, delete, or create
 if (trackInfo.type === 'prompt') {
 const isShiftClick = e.shiftKey;
 const clickedPrompt = findPromptAtPosition(x, y);
 const intersection = findPromptIntersection(x, y);

 // If we're currently editing a prompt and the user clicks empty prompt-space,
 // interpret it as "exit editing" (do not create/append a new prompt).
 if (editingPrompt && !clickedPrompt) {
 // Trigger the existing onBlur handler so edits are committed if needed.
 editingPromptDivRef.current?.blur();
 e.preventDefault();
 return;
 }
 
 // Splittext: Check for intersection interactions first
 if (intersection) {
 // Right-click on intersection: merge prompts
 if (e.button === 2) {
 console.log(`[Timeline] Merging prompts at intersection frame ${intersection.frame}`);
 onPromptMerge?.(intersection.leftPrompt.uuid, intersection.rightPrompt.uuid);
 e.preventDefault();
 return;
 }
 
 // Left-click on intersection: start dragging intersection
 if (e.button === 0) {
 console.log(`[Timeline] Starting intersection drag at frame ${intersection.frame}, left: ${intersection.leftPrompt.uuid}, right: ${intersection.rightPrompt.uuid}`);
 // Snapshot the right-hand chain of prompts so we can shift them all together during drag.
 // This avoids accumulating drift from async state updates and prevents gaps.
 const rightIdx = promptsByStart.findIndex(p => p.uuid === intersection.rightPrompt.uuid);
 const rightChain = rightIdx >= 0
 ? promptsByStart.slice(rightIdx).map(p => ({ uuid: p.uuid, originalStart: p.start_frame, originalEnd: p.end_frame }))
 : [{ uuid: intersection.rightPrompt.uuid, originalStart: intersection.rightPrompt.start_frame, originalEnd: intersection.rightPrompt.end_frame }];
 const rightChainMinStart = rightChain.reduce((acc, p) => Math.min(acc, p.originalStart), Infinity);
 const rightChainMaxEnd = rightChain.reduce((acc, p) => Math.max(acc, p.originalEnd), -Infinity);

 dispatchInteraction({
 type: "startIntersectionDrag",
 payload: {
 leftPromptId: intersection.leftPrompt.uuid,
 rightPromptId: intersection.rightPrompt.uuid,
 originalFrame: intersection.frame,
 leftOriginalStart: intersection.leftPrompt.start_frame,
 rightChain,
 rightChainMinStart,
 rightChainMaxEnd,
 },
 });
 return;
 }
 }
 
 // Splittext: Shift+click on prompt splits it
 if (clickedPrompt && isShiftClick && e.button === 0 && !intersection) {
 const splitFrame = getFrameFromX(x);
 // Only split if click is within the prompt bounds (not on edges)
 if (splitFrame > clickedPrompt.start_frame && splitFrame < clickedPrompt.end_frame) {
 console.log(`[Timeline] Splitting prompt ${clickedPrompt.uuid} at frame ${splitFrame}`);
 onPromptSplit?.(clickedPrompt.uuid, splitFrame);
 return;
 }
 }
 
 // Right-click: delete prompt
 if (clickedPrompt && e.button === 2 && !intersection) {
 // Prevent deleting the last remaining prompt.
 if (timelineState.prompts && timelineState.prompts.length <= 1) {
 console.log(`[Timeline] Cannot delete the last remaining prompt in splittext mode`);
 e.preventDefault();
 return;
 }
 onPromptDelete?.(clickedPrompt.uuid);
 e.preventDefault();
 return;
 }
 
 // Left-click handling
 if (e.button === 0) {
 // Check for prompt resize edge.
 // Splittext: the resize handle is always active (no Ctrl/Cmd), but only for the last prompt's right edge.
 let promptEdge: {prompt: TimelinePrompt, edge: 'left' | 'right'} | null = null;
 const edge = findPromptEdge(x, y);
 if (edge) {
 const lastPrompt = promptsByEndDesc[0];
 if (edge.prompt.uuid === lastPrompt.uuid && edge.edge === 'right') {
 promptEdge = edge;
 }
 }
 
 if (promptEdge) {
 // Start resizing prompt
 const { prompt, edge } = promptEdge;
 dispatchInteraction({
 type: "startPromptResize",
 payload: {
 uuid: prompt.uuid,
 edge: edge,
 originalStartFrame: prompt.start_frame,
 originalEndFrame: prompt.end_frame,
 },
 });
 setResizingPromptCurrentFrames({
 startFrame: prompt.start_frame,
 endFrame: prompt.end_frame,
 });
 return;
 }

 // Splittext: clicking empty space AFTER the last prompt appends a new default prompt.
 // (We keep prompts contiguous by starting at lastPrompt.end_frame.)
 //
 // IMPORTANT: This must run *after* the prompt-edge resize check above; otherwise clicking a few pixels
 // to the right of the last prompt (still inside the resize hitbox / ew-resize cursor) would incorrectly
 // append a new prompt instead of starting a resize.
 if (!isShiftClick && !intersection && !clickedPrompt) {
 const clickFrame = getFrameFromX(x);
 if (prompts.length > 0) {
 const lastPrompt = promptsByEndDesc[0];
 if (clickFrame >= lastPrompt.end_frame) {
 const defaultText = timelineState.default_text ?? "";
 const defaultDuration = timelineState.default_duration ?? 30;
 const minDur = timelineState.min_prompt_duration ?? 1;
 const maxDur = timelineState.max_prompt_duration ?? Infinity;

 const dur = Math.max(minDur, Math.min(maxDur, defaultDuration));
 const startFrame = lastPrompt.end_frame;
 const endFrame = startFrame + dur;
 onPromptAdd?.(startFrame, endFrame, defaultText);
 e.preventDefault();
 return;
 }
 }
 }
 }
 }
 
 // Track area: check for interval and keyframe interaction
 if (trackInfo.type === 'track' && trackInfo.trackIndex !== undefined) {
 const clickedInterval = findIntervalAtPosition(x, y);
 const clickedKeyframe = findKeyframeAtPosition(x, y);
 const isCtrlClick = e.ctrlKey || e.metaKey; // Ctrl on Windows/Linux, Cmd on Mac
 const intervalEdge = isCtrlClick ? findIntervalEdge(x, y) : null;
 
 // Priority 1: Resize mode (Ctrl+click on edge)
 if (intervalEdge && isCtrlClick && e.button === 0) {
 const { interval, edge } = intervalEdge;
 
 // Check if this is a keyframe (needs conversion) or an existing interval
 const isKeyframe = !timelineState.intervals?.some(i => i.uuid === interval.uuid);
 
 dispatchInteraction({
 type: "startIntervalResize",
 payload: {
 uuid: interval.uuid,
 trackId: interval.track_id,
 edge: edge,
 originalStartFrame: interval.start_frame,
 originalEndFrame: interval.end_frame,
 isKeyframe: isKeyframe, // Track if we need to convert keyframe to interval
 },
 });
 setResizingIntervalCurrentFrames({
 startFrame: interval.start_frame,
 endFrame: interval.end_frame,
 });
 return;
 }
 
 // Priority 2: Check keyframes FIRST (they're smaller and drawn on top), then intervals
 if (clickedKeyframe && !isCtrlClick) {
 // Start dragging existing keyframe (only if not Ctrl+click)
 if (e.button === 0) { // Left click
 dispatchInteraction({
 type: "startKeyframeDrag",
 payload: { uuid: clickedKeyframe.uuid, trackId: clickedKeyframe.track_id },
 });
 setDraggedKeyframeFrame(clickedKeyframe.frame); // Show yellow box immediately
 } else if (e.button === 2) { // Right click - delete keyframe
 onKeyframeDelete?.(clickedKeyframe.uuid);
 e.preventDefault();
 }
 } else if (clickedInterval && !isCtrlClick) {
 // Clicked on an interval (only if no keyframe was clicked)
 if (e.button === 0) { // Left click - start dragging interval
 const { interval, clickOffsetFrames } = clickedInterval;
 dispatchInteraction({
 type: "startIntervalMove",
 payload: {
 uuid: interval.uuid,
 trackId: interval.track_id,
 originalStartFrame: interval.start_frame,
 originalEndFrame: interval.end_frame,
 clickOffsetFrames: clickOffsetFrames,
 },
 });
 // Show yellow boxes immediately when clicking on interval
 setDraggedIntervalCurrentFrames({
 startFrame: interval.start_frame,
 endFrame: interval.end_frame
 });
 } else if (e.button === 2) { // Right click - delete interval
 onIntervalDelete?.(clickedInterval.interval.uuid);
 e.preventDefault();
 }
 } else if (e.button === 0) {
 const frame = getFrameFromX(x);
 const track = timelineState.tracks[trackInfo.trackIndex];
 
 if (isCtrlClick) {
 // Ctrl+click: Start creating an interval (centered on the clicked frame)
 console.log(`[Timeline] Starting interval at frame ${frame} on track ${track.name}`);
 dispatchInteraction({
 type: "startIntervalDrag",
 payload: { trackId: track.uuid, startFrame: frame, endFrame: frame },
 });
 } else {
 // Normal click: Add single keyframe
 const tempUuid = onKeyframeAdd?.(track.uuid, frame);
 
 // Immediately start dragging the newly created keyframe
 // Poll for the keyframe to exist in state before starting drag
 if (tempUuid && getLatestState) {
 console.log(`[Timeline] Starting drag for new keyframe ${tempUuid.slice(0, 8)} at frame ${frame}`);
 
 // Poll for keyframe existence using getLatestState (max 10 attempts)
 let attempts = 0;
 const pollInterval = setInterval(() => {
 attempts++;
 const latestState = getLatestState();
 const found = latestState?.keyframes.some(kf => kf.uuid === tempUuid);
 
 console.log(`[Timeline] Poll attempt ${attempts}, found: ${found}, keyframes: ${latestState?.keyframes.length}`);
 
 if (found || attempts >= 10) {
 clearInterval(pollInterval);
 if (found) {
 // Store the initial frame so we can find the real keyframe later
 dispatchInteraction({
 type: "startKeyframeDrag",
 payload: { uuid: tempUuid, trackId: track.uuid, initialFrame: frame },
 });
 setDraggedKeyframeFrame(frame);
 }
 }
 }, 5);
 }
 }
 }
 }
 },
 [timelineState, promptsByStart, promptsByEndDesc, editingPrompt, getFrameFromX, getTrackFromY, findKeyframeAtPosition, findIntervalAtPosition, findIntervalEdge, findPromptEdge, findPromptAtPosition, findPromptIntersection, onFrameChange, onKeyframeAdd, onKeyframeDelete, onIntervalDelete, getLatestState],
 );
 const handleMouseMove = useCallback(
 (e: React.MouseEvent<HTMLCanvasElement>) => {
 if (!timelineState || !canvasRef.current) return;
 const canvas = canvasRef.current;
 const rect = canvas.getBoundingClientRect();
 const x = e.clientX - rect.left;
 const y = e.clientY - rect.top;
 const isCtrlKey = e.ctrlKey || e.metaKey;
 const isShiftKey = e.shiftKey;
 
 // Track if hovering over header (frame numbers area)
 const trackInfo = getTrackFromY(y);
 setIsHoveringHeader(trackInfo.type === 'header');
 setIsHoveringLabelArea(x < TRACK_LABEL_WIDTH);
 
 // If constraints are disabled, only allow cursor dragging
 if (timelineState.constraints_enabled === false) {
 // Clear all hover states
 setHoverEdge(null);
 setHoveredPromptForResize(null);
 setHoveredIntervalForResize(null);
 setHoveredKeyframe(null);
 setHoveredSplitPreview(null);
 setHoveredPromptResize(null);
 
 // Still allow dragging time cursor
 if (isDraggingCursor) {
 const frame = getFrameFromX(x);
 onFrameChange?.(frame);
 }
 return;
 }
 
 // Check for split preview when Shift is held
 if (isShiftKey && trackInfo.type === 'prompt') {
 const clickedPrompt = findPromptAtPosition(x, y);
 if (clickedPrompt) {
 const splitFrame = getFrameFromX(x);
 // Only show preview if within prompt bounds (not on edges)
 if (splitFrame > clickedPrompt.start_frame && splitFrame < clickedPrompt.end_frame) {
 setHoveredSplitPreview({
 promptId: clickedPrompt.uuid,
 frame: splitFrame
 });
 } else {
 setHoveredSplitPreview(null);
 }
 } else {
 setHoveredSplitPreview(null);
 }
 } else {
 setHoveredSplitPreview(null);
 }
 
 // Check for intersection hover
 if (trackInfo.type === 'prompt' && !isShiftKey) {
 const intersection = findPromptIntersection(x, y);
 if (intersection) {
 setHoveredIntersection({
 leftPromptId: intersection.leftPrompt.uuid,
 rightPromptId: intersection.rightPrompt.uuid,
 frame: intersection.frame
 });
 } else {
 setHoveredIntersection(null);
 }
 } else {
 setHoveredIntersection(null);
 }
 
 // Handle intersection dragging
 if (draggingIntersection) {
 // Track pointer position so the RAF loop can continue dragging even if the mouse stops moving.
 autoPanCanvasXRef.current = x;

 const timelineStartX = TRACK_LABEL_WIDTH + 2 * KEYFRAME_RADIUS;
 const leftThreshold = timelineStartX + AUTO_PAN_EDGE_PX;
 const rightThreshold = rect.width - AUTO_PAN_EDGE_PX;
 if (x <= leftThreshold || x >= rightThreshold) {
 startAutoPan("intersection");
 } else {
 stopAutoPan();
 }

 const currentFrame = getFrameFromX(x);
 applyDraggingIntersectionAtFrame(currentFrame);
 return;
 }
 
 // Update hover state for cursor change
 if (!isDraggingCursor && !draggedInterval && !draggedKeyframe && !intervalDrag && !resizingInterval && !resizingPrompt) {
 // Splittext: show the last prompt's RIGHT resize handle without any modifier keys.
 if (trackInfo.type === 'prompt' && !isShiftKey) {
 const edge = findPromptEdge(x, y);
 if (edge) {
 const lastPrompt = promptsByEndDesc[0];
 if (edge.prompt.uuid === lastPrompt.uuid && edge.edge === 'right') {
 setHoverEdge('right');
 setHoveredPromptResize({ promptId: lastPrompt.uuid, frame: lastPrompt.end_frame });
 setHoveredPromptForResize(null);
 setHoveredIntervalForResize(null);
 setHoveredKeyframe(null);
 // Don't let Ctrl-only hover logic override this.
 return;
 }
 }
 setHoveredPromptResize(null);
 } else {
 setHoveredPromptResize(null);
 }

 // Check for interval edges (requires Ctrl/Cmd)
 if (isCtrlKey) {
 const intervalEdge = findIntervalEdge(x, y);
 if (intervalEdge) {
 setHoverEdge(intervalEdge.edge);
 setHoveredIntervalForResize({
 uuid: intervalEdge.interval.uuid,
 edge: intervalEdge.edge,
 startFrame: intervalEdge.interval.start_frame,
 endFrame: intervalEdge.interval.end_frame
 });
 setHoveredPromptForResize(null);
 setHoveredKeyframe(null);
 } else {
 // Check for keyframe hover
 const keyframe = findKeyframeAtPosition(x, y);
 if (keyframe) {
 setHoverEdge(null);
 setHoveredKeyframe({
 uuid: keyframe.uuid,
 frame: keyframe.frame
 });
 setHoveredPromptForResize(null);
 setHoveredIntervalForResize(null);
 } else {
 setHoverEdge(null);
 setHoveredPromptForResize(null);
 setHoveredIntervalForResize(null);
 setHoveredKeyframe(null);
 }
 }
 } else {
 setHoverEdge(null);
 setHoveredPromptForResize(null);
 setHoveredIntervalForResize(null);
 setHoveredKeyframe(null);
 }
 } else {
 setHoverEdge(null);
 setHoveredPromptForResize(null);
 setHoveredIntervalForResize(null);
 setHoveredKeyframe(null);
 }
 
 // Dragging time cursor
 if (isDraggingCursor) {
 const frame = getFrameFromX(x);
 onFrameChange?.(frame);
 return;
 }
 
 // Resizing prompt
 if (resizingPrompt) {
 // Track pointer position so the RAF loop can continue resizing even if the mouse stops moving.
 autoPanCanvasXRef.current = x;

 // If resizing the RIGHT edge and the cursor approaches the right edge of the viewport, auto-pan right.
 if (resizingPrompt.edge === "right") {
 const timelineStartX = TRACK_LABEL_WIDTH + 2 * KEYFRAME_RADIUS;
 const leftThreshold = timelineStartX + AUTO_PAN_EDGE_PX;
 const rightThreshold = rect.width - AUTO_PAN_EDGE_PX;
 if (x <= leftThreshold || x >= rightThreshold) {
 startAutoPan("resizeRightEdge");
 } else {
 stopAutoPan();
 }
 } else {
 stopAutoPan();
 }

 const frame = getFrameFromX(x);
 applyResizingPromptAtFrame(frame);
 return;
 }
 
 // Resizing interval
 if (resizingInterval) {
 const frame = getFrameFromX(x);
 let newStartFrame = resizingInterval.originalStartFrame;
 let newEndFrame = resizingInterval.originalEndFrame;
 
 // Allow dragging past the opposite edge to flip the interval
 if (resizingInterval.edge === 'left') {
 newStartFrame = frame;
 } else {
 newEndFrame = frame;
 }
 
 // Ensure proper ordering for display and storage
 const actualStartFrame = Math.min(newStartFrame, newEndFrame);
 const actualEndFrame = Math.max(newStartFrame, newEndFrame);
 
 // Clamp to timeline bounds
 const timelineStartFrame = timelineState.start_frame;
 const timelineEndFrame = timelineState.end_frame;
 const clampedStartFrame = Math.max(timelineStartFrame, actualStartFrame);
 const clampedEndFrame = Math.min(timelineEndFrame, actualEndFrame);
 
 // Update yellow boxes with clamped ordered frames
 setResizingIntervalCurrentFrames({ startFrame: clampedStartFrame, endFrame: clampedEndFrame });
 
 // Handle keyframe to interval conversion
 if (resizingInterval.isKeyframe && clampedStartFrame !== clampedEndFrame) {
 // First time converting - delete keyframe and create interval
 if (!resizingInterval.convertedIntervalId) {
 console.log('[Timeline] Converting keyframe to interval');
 
 // Delete the keyframe
 if (onKeyframeDelete) {
 onKeyframeDelete(resizingInterval.uuid);
 }
 
 // Create the interval
 if (onIntervalAdd) {
 const newIntervalId = onIntervalAdd(resizingInterval.trackId, clampedStartFrame, clampedEndFrame);
 
 // Update state to track the new interval ID
 dispatchInteraction({
 type: "updateIntervalResize",
 payload: {
 ...resizingInterval,
 convertedIntervalId: newIntervalId || resizingInterval.uuid,
 isKeyframe: false, // No longer a keyframe
 },
 });
 }
 } else {
 // Already converted, just move the interval
 if (onIntervalMove) {
 onIntervalMove(resizingInterval.convertedIntervalId, clampedStartFrame, clampedEndFrame);
 }
 }
 } else if (!resizingInterval.isKeyframe) {
 // Already an interval, just resize it
 if (onIntervalMove) {
 const intervalId = resizingInterval.convertedIntervalId || resizingInterval.uuid;
 onIntervalMove(intervalId, clampedStartFrame, clampedEndFrame);
 }
 }
 
 return;
 }
 
 // Dragging existing interval (moving it)
 if (draggedInterval) {
 const currentFrame = getFrameFromX(x);
 const newStartFrame = currentFrame - draggedInterval.clickOffsetFrames;
 const intervalDuration = draggedInterval.originalEndFrame - draggedInterval.originalStartFrame;
 const newEndFrame = newStartFrame + intervalDuration;
 
 // Clamp interval to timeline bounds
 const timelineStartFrame = timelineState.start_frame;
 const timelineEndFrame = timelineState.end_frame;
 let clampedStartFrame = newStartFrame;
 let clampedEndFrame = newEndFrame;
 
 // If interval would go before timeline start, clamp to start
 if (clampedStartFrame < timelineStartFrame) {
 clampedStartFrame = timelineStartFrame;
 clampedEndFrame = timelineStartFrame + intervalDuration;
 }
 
 // If interval would go after timeline end, clamp to end
 if (clampedEndFrame > timelineEndFrame) {
 clampedEndFrame = timelineEndFrame;
 clampedStartFrame = timelineEndFrame - intervalDuration;
 }
 
 // Update current frames for yellow box display
 setDraggedIntervalCurrentFrames({ startFrame: clampedStartFrame, endFrame: clampedEndFrame });
 
 if (onIntervalMove) {
 onIntervalMove(draggedInterval.uuid, clampedStartFrame, clampedEndFrame);
 }
 return;
 }
 
 // Creating new interval (Ctrl+drag)
 if (intervalDrag) {
 const frame = getFrameFromX(x);
 dispatchInteraction({
 type: "updateIntervalDrag",
 payload: { ...intervalDrag, endFrame: frame },
 });
 return;
 }
 
 // Dragging keyframe
 if (draggedKeyframe) {
 const frame = getFrameFromX(x);
 setDraggedKeyframeFrame(frame);
 
 // If dragging a temp keyframe that got replaced by server, find the real one
 let keyframeId = draggedKeyframe.uuid;
 if (keyframeId.startsWith('temp-') && timelineState && draggedKeyframe.initialFrame !== undefined) {
 // Find the keyframe on the same track at the EXACT initial frame where we created it
 // IMPORTANT: Exclude locked keyframes - we only want to find the newly created unlocked one
 const realKeyframe = timelineState.keyframes.find(kf => 
 kf.track_id === draggedKeyframe.trackId && 
 kf.frame === draggedKeyframe.initialFrame && // Exact match on initial frame
 !kf.locked // Don't pick up locked keyframes
 );
 if (realKeyframe && realKeyframe.uuid !== keyframeId) {
 console.log(`[Timeline] Switching from temp ${keyframeId.slice(0, 8)} to real ${realKeyframe.uuid.slice(0, 8)}`);
 keyframeId = realKeyframe.uuid;
 dispatchInteraction({
 type: "startKeyframeDrag",
 payload: {
 uuid: realKeyframe.uuid,
 trackId: draggedKeyframe.trackId,
 initialFrame: draggedKeyframe.initialFrame,
 },
 });
 }
 }
 
 // Always call the move handler to update position
 if (onKeyframeMove) {
 onKeyframeMove(keyframeId, frame);
 }
 }
 },
 [isDraggingCursor, draggedInterval, intervalDrag, draggedKeyframe, resizingInterval, resizingPrompt, draggingIntersection, promptsByEndDesc, timelineState, getFrameFromX, findIntervalEdge, findPromptEdge, findPromptAtPosition, findPromptIntersection, getTrackFromY, onFrameChange, onIntervalMove, onKeyframeMove, onKeyframeDelete, onIntervalAdd, onPromptResize, onPromptMove],
 );
 const handleMouseUp = useCallback(() => {
 stopAutoPan();
 // Create interval constraint if we were creating one with Ctrl+drag
 if (intervalDrag && onIntervalAdd) {
 const startFrame = Math.min(intervalDrag.startFrame, intervalDrag.endFrame);
 const endFrame = Math.max(intervalDrag.startFrame, intervalDrag.endFrame);
 
 console.log(`[Timeline] Creating interval from ${startFrame} to ${endFrame}`);
 
 // Call the interval add callback
 onIntervalAdd(intervalDrag.trackId, startFrame, endFrame);
 }
 
 // If we were dragging an intersection, we've already been sending resize updates
 // No need to send a final update here since it was happening continuously
 
 // Reset all drag states
 dispatchInteraction({ type: "stopAll" });
 setDraggedKeyframeFrame(null);
 setDraggedIntervalCurrentFrames(null);
 setResizingIntervalCurrentFrames(null);
 setResizingPromptCurrentFrames(null);
 setHoveredPromptResize(null);
 setHoverEdge(null);
 setDraggingIntersectionCurrentFrame(null); // Clear intersection frame indicator
 }, [intervalDrag, onIntervalAdd, stopAutoPan]);
 const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
 e.preventDefault(); // Prevent default context menu
 }, []);
 const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
 if (!timelineState || !canvasRef.current || !containerRef.current) return;
 
 // If constraints are disabled, don't allow editing
 if (timelineState.constraints_enabled === false) {
 return;
 }
 
 const canvas = canvasRef.current;
 const rect = canvas.getBoundingClientRect();
 const x = e.clientX - rect.left;
 const y = e.clientY - rect.top;
 
 // Check if double-clicked on a prompt
 const prompt = findPromptAtPosition(x, y);
 if (prompt) {
 // Calculate prompt position for overlay
 const { start_frame } = timelineState;
 const width = rect.width;
 
 // Calculate visible frame range based on zoom and pan
 const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevel;
 const viewStartFrame = start_frame + panOffset;
 
 const pixelRange = (width - TRACK_LABEL_WIDTH - 2*KEYFRAME_RADIUS) / visibleFrames;
 const timelineStartX = TRACK_LABEL_WIDTH + 2*KEYFRAME_RADIUS;
 
 const startX = timelineStartX + (prompt.start_frame - viewStartFrame) * pixelRange;
 const endX = timelineStartX + (prompt.end_frame - viewStartFrame) * pixelRange;
 const promptWidth = endX - startX;
 // Match the rendered prompt box geometry (see draw loop).
 const promptY = FRAME_LABELS_HEIGHT + 2;
 const promptHeight = TRACK_HEIGHT - 4;
 
 setEditingPrompt({
 uuid: prompt.uuid,
 text: prompt.text,
 x: startX,
 y: promptY,
 width: promptWidth,
 height: promptHeight
 });
 }
 }, [timelineState, findPromptAtPosition, zoomLevel, panOffset]);
 return { handleMouseDown, handleMouseMove, handleMouseUp, handleContextMenu,
 handleDoubleClick };
}

