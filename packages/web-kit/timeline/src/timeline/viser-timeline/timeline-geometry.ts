// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import { KEYFRAME_HIT_RADIUS, KEYFRAME_RADIUS, TRACK_LABEL_WIDTH } from "./constants.ts";
import { FRAME_LABELS_HEIGHT, TRACK_HEIGHT } from "./TimelineConstants.ts";
import type { TimelineInterval, TimelineMessage } from "./messages.ts";
import type { TimelineKeyframe, TimelinePrompt } from "./types.ts";
import { getZoomEnvelopeEndFrame } from "./timeline-scales.ts";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.ts";

export interface TimelineGeometryArgs {
 timelineState: TimelineMessage | null;
 canvasRef: TimelineInteractionSnapshot["canvasRef"];
 zoomLevel: number;
 panOffset: number;
 prompts: TimelinePrompt[];
 promptsByStart: TimelinePrompt[];
 intervals: TimelineInterval[];
 keyframes: TimelineKeyframe[];
}

export function useTimelineGeometry(args: TimelineGeometryArgs) {
 const { timelineState, canvasRef, zoomLevel, panOffset, prompts, promptsByStart, intervals, keyframes } = args;
 // Calculate frame from mouse position
 const getFrameFromX = useCallback(
 (x: number): number => {
 if (!timelineState || !canvasRef.current) return 0;
 const canvas = canvasRef.current;
 const rect = canvas.getBoundingClientRect();
 const width = rect.width;
 const { start_frame } = timelineState;
 
 // Calculate visible frame range based on zoom and pan
 const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevel;
 const viewStartFrame = start_frame + panOffset;
 
 const pixelRange = (width - TRACK_LABEL_WIDTH - 2*KEYFRAME_RADIUS) / visibleFrames;
 const adjustedX = x - TRACK_LABEL_WIDTH - 2*KEYFRAME_RADIUS;
 const frame = Math.round(adjustedX / pixelRange + viewStartFrame);
 // Only clamp to start_frame (allow infinite scrolling to the right)
 return Math.max(start_frame, frame);
 },
 [timelineState, zoomLevel, panOffset],
 );
 // Helper: Get track index from Y position
 // Helper: Calculate track Y position by accumulating heights
 const getTrackY = useCallback((trackIndex: number): number => {
 if (!timelineState) return FRAME_LABELS_HEIGHT;
 
 let y = FRAME_LABELS_HEIGHT;
 
 // Add prompt track height (always shown)
 y += TRACK_HEIGHT;
 
 // Add heights of all tracks before this one
 for (let i = 0; i < trackIndex; i++) {
 y += TRACK_HEIGHT * (timelineState.tracks[i].height_scale || 1.0);
 }
 
 return y;
 }, [timelineState, zoomLevel, panOffset]);
 const getTrackFromY = useCallback((y: number): { type: 'header' | 'prompt' | 'track', trackIndex?: number } => {
 if (!timelineState) return { type: 'header' };
 
 if (y < FRAME_LABELS_HEIGHT) {
 return { type: 'header' };
 }
 
 let currentY = FRAME_LABELS_HEIGHT;
 
 // Check if in prompt track (always shown)
 if (y >= currentY && y < currentY + TRACK_HEIGHT) {
 return { type: 'prompt' };
 }
 currentY += TRACK_HEIGHT;
 
 // Check each track by accumulating heights
 for (let i = 0; i < timelineState.tracks.length; i++) {
 const trackHeight = TRACK_HEIGHT * (timelineState.tracks[i].height_scale || 1.0);
 if (y >= currentY && y < currentY + trackHeight) {
 return { type: 'track', trackIndex: i };
 }
 currentY += trackHeight;
 }
 
 return { type: 'header' };
 }, [timelineState, zoomLevel, panOffset]);
 // Helper: Find keyframe at position
 const findKeyframeAtPosition = useCallback((x: number, y: number): TimelineKeyframe | null => {
 if (!timelineState || !canvasRef.current) return null;
 
 const canvas = canvasRef.current;
 const rect = canvas.getBoundingClientRect();
 const width = rect.width;
 const { start_frame, keyframes } = timelineState;
 
 // Calculate visible frame range based on zoom and pan
 const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevel;
 const viewStartFrame = start_frame + panOffset;
 
 const pixelRange = (width - TRACK_LABEL_WIDTH - 2*KEYFRAME_RADIUS) / visibleFrames;
 const timelineStartX = TRACK_LABEL_WIDTH + 2*KEYFRAME_RADIUS;
 
 const trackInfo = getTrackFromY(y);
 if (trackInfo.type !== 'track' || trackInfo.trackIndex === undefined) return null;
 
 const track = timelineState.tracks[trackInfo.trackIndex];
 const trackY = getTrackY(trackInfo.trackIndex);
 const trackHeight = TRACK_HEIGHT * (track.height_scale || 1.0);
 const keyframeY = trackY + trackHeight / 2;
 
 // Check if click is near a keyframe
 for (const kf of keyframes) {
 // Skip locked keyframes - they cannot be moved or deleted
 if (kf.locked) continue;
 
 if (kf.track_id === track.uuid) {
 const kfX = timelineStartX + (kf.frame - viewStartFrame) * pixelRange;
 const distance = Math.sqrt(Math.pow(x - kfX, 2) + Math.pow(y - keyframeY, 2));
 if (distance <= KEYFRAME_HIT_RADIUS) {
 return kf;
 }
 }
 }
 
 return null;
 }, [timelineState, getTrackFromY, getTrackY]);
 const findIntervalAtPosition = useCallback((x: number, y: number): {interval: TimelineInterval, clickOffsetFrames: number} | null => {
 if (!timelineState || !canvasRef.current) return null;
 
 const canvas = canvasRef.current;
 const rect = canvas.getBoundingClientRect();
 const width = rect.width;
 const { start_frame } = timelineState;
 
 // Calculate visible frame range based on zoom and pan
 const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevel;
 const viewStartFrame = start_frame + panOffset;
 
 const pixelRange = (width - TRACK_LABEL_WIDTH - 2*KEYFRAME_RADIUS) / visibleFrames;
 const timelineStartX = TRACK_LABEL_WIDTH + 2*KEYFRAME_RADIUS;
 
 const trackInfo = getTrackFromY(y);
 if (trackInfo.type !== 'track' || trackInfo.trackIndex === undefined) return null;
 
 const track = timelineState.tracks[trackInfo.trackIndex];
 const trackY = getTrackY(trackInfo.trackIndex);
 const trackHeight = TRACK_HEIGHT * (track.height_scale || 1.0);
 
 // Check intervals for this track (check in reverse order so topmost/latest intervals are hit first)
 for (let i = intervals.length - 1; i >= 0; i--) {
 const interval = intervals[i];
 
 // Skip locked intervals - they cannot be moved or deleted
 if (interval.locked) continue;
 
 if (interval.track_id === track.uuid) {
 const intervalFrameWidth = interval.end_frame - interval.start_frame + 1;
 
 // Position based on start frame (aligned with keyframes)
 const frameStartX = timelineStartX + (interval.start_frame - viewStartFrame) * pixelRange;
 
 // For single-frame intervals (circles), use circular hit detection
 if (intervalFrameWidth === 1) {
 const centerY = trackY + trackHeight / 2;
 const distance = Math.sqrt(Math.pow(x - frameStartX, 2) + Math.pow(y - centerY, 2));
 
 if (distance <= KEYFRAME_RADIUS) {
 return { interval, clickOffsetFrames: 0 }; // Offset is 0 for circles
 }
 } else {
 // For multi-frame intervals, use rectangle hit detection
 // Calculate width same as prompts (inclusive)
 const intervalWidth = (interval.end_frame - interval.start_frame) * pixelRange + 2 * KEYFRAME_RADIUS;
 const startX = frameStartX - KEYFRAME_RADIUS;
 const endX = startX + intervalWidth;
 const intervalHeight = KEYFRAME_RADIUS * 2;
 const intervalY = trackY + (trackHeight - intervalHeight) / 2;
 
 // Check if click is within the interval rectangle
 if (x >= startX && x <= endX && y >= intervalY && y <= intervalY + intervalHeight) {
 const clickFrame = getFrameFromX(x);
 const clickOffsetFrames = clickFrame - interval.start_frame;
 return { interval, clickOffsetFrames };
 }
 }
 }
 }
 
 return null;
 }, [timelineState, intervals, getTrackFromY, getTrackY, getFrameFromX]);
 // Helper: Find prompt at position (for editing)
 const findPromptAtPosition = useCallback((x: number, y: number): TimelinePrompt | null => {
 if (!timelineState || !canvasRef.current) return null;
 
 const canvas = canvasRef.current;
 const rect = canvas.getBoundingClientRect();
 const width = rect.width;
 const { start_frame } = timelineState;
 
 // Calculate visible frame range based on zoom and pan
 const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevel;
 const viewStartFrame = start_frame + panOffset;
 
 const pixelRange = (width - TRACK_LABEL_WIDTH - 2*KEYFRAME_RADIUS) / visibleFrames;
 const timelineStartX = TRACK_LABEL_WIDTH + 2*KEYFRAME_RADIUS;
 
 // Check if we're in the prompts track
 if (prompts.length === 0) return null;
 if (y < FRAME_LABELS_HEIGHT || y >= FRAME_LABELS_HEIGHT + TRACK_HEIGHT) return null;
 
 // Check each prompt
 for (const prompt of prompts) {
 const startX = timelineStartX + (prompt.start_frame - viewStartFrame) * pixelRange;
 const endX = timelineStartX + (prompt.end_frame - viewStartFrame) * pixelRange;
 const promptY = FRAME_LABELS_HEIGHT + 1;
 const promptHeight = TRACK_HEIGHT - 2;
 
 if (x >= startX && x <= endX && y >= promptY && y <= promptY + promptHeight) {
 return prompt;
 }
 }
 
 return null;
 }, [timelineState, zoomLevel, panOffset]);
 // Helper: Find if mouse is near a prompt edge (for resizing)
 const findPromptEdge = useCallback((x: number, y: number): {prompt: TimelinePrompt, edge: 'left' | 'right'} | null => {
 if (!timelineState || !canvasRef.current) return null;
 
 const canvas = canvasRef.current;
 const rect = canvas.getBoundingClientRect();
 const width = rect.width;
 const { start_frame } = timelineState;
 
 // Calculate visible frame range based on zoom and pan
 const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevel;
 const viewStartFrame = start_frame + panOffset;
 
 const pixelRange = (width - TRACK_LABEL_WIDTH - 2*KEYFRAME_RADIUS) / visibleFrames;
 const timelineStartX = TRACK_LABEL_WIDTH + 2*KEYFRAME_RADIUS;
 const edgeThreshold = 10; // pixels from edge to trigger resize (match intersection hitbox)
 
 // Check if we're in the prompts track
 if (prompts.length === 0) return null;
 if (y < FRAME_LABELS_HEIGHT || y >= FRAME_LABELS_HEIGHT + TRACK_HEIGHT) return null;
 
 const promptY = FRAME_LABELS_HEIGHT + 2;
 const promptHeight = TRACK_HEIGHT - 4;
 
 // Check each prompt's edges
 const candidates: Array<{prompt: TimelinePrompt, edge: 'left' | 'right', edgeX: number, distance: number}> = [];
 
 for (const prompt of prompts) {
 const startX = timelineStartX + (prompt.start_frame - viewStartFrame) * pixelRange;
 const endX = timelineStartX + (prompt.end_frame - viewStartFrame) * pixelRange;
 
 if (y >= promptY && y <= promptY + promptHeight) {
 // Check left edge
 if (Math.abs(x - startX) <= edgeThreshold) {
 candidates.push({ 
 prompt, 
 edge: 'left', 
 edgeX: startX,
 distance: Math.abs(x - startX)
 });
 }
 // Check right edge
 if (Math.abs(x - endX) <= edgeThreshold) {
 candidates.push({ 
 prompt, 
 edge: 'right', 
 edgeX: endX,
 distance: Math.abs(x - endX)
 });
 }
 }
 }
 
 // If multiple edges at the same position (prompts touching), pick based on which side of the boundary
 if (candidates.length > 0) {
 // Sort by distance to mouse
 candidates.sort((a, b) => a.distance - b.distance);
 
 // If there are multiple candidates at the same position (or very close), disambiguate
 const closest = candidates[0];
 const samePosition = candidates.filter(c => Math.abs(c.edgeX - closest.edgeX) < 1);
 
 if (samePosition.length > 1) {
 // Multiple edges at same position - pick based on which side of boundary
 // If mouse is to the left of the boundary, prefer right edge (resizing left prompt)
 // If mouse is to the right of the boundary, prefer left edge (resizing right prompt)
 const boundaryX = closest.edgeX;
 
 if (x < boundaryX) {
 // Mouse is left of boundary - prefer right edge (end of the left prompt)
 const rightEdge = samePosition.find(c => c.edge === 'right');
 if (rightEdge) return { prompt: rightEdge.prompt, edge: rightEdge.edge };
 } else {
 // Mouse is right of boundary - prefer left edge (start of the right prompt)
 const leftEdge = samePosition.find(c => c.edge === 'left');
 if (leftEdge) return { prompt: leftEdge.prompt, edge: leftEdge.edge };
 }
 }
 
 // Return the closest one
 return { prompt: closest.prompt, edge: closest.edge };
 }
 
 return null;
 }, [timelineState, zoomLevel, panOffset]);
 // Helper: Find if mouse is near a prompt intersection (between two adjacent prompts)
 const findPromptIntersection = useCallback((x: number, y: number): {leftPrompt: TimelinePrompt, rightPrompt: TimelinePrompt, frame: number} | null => {
 if (!timelineState || !canvasRef.current) return null;
 
 const canvas = canvasRef.current;
 const rect = canvas.getBoundingClientRect();
 const width = rect.width;
 const { start_frame } = timelineState;
 
 if (promptsByStart.length < 2) return null;
 
 // Calculate visible frame range based on zoom and pan
 const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevel;
 const viewStartFrame = start_frame + panOffset;
 
 const pixelRange = (width - TRACK_LABEL_WIDTH - 2*KEYFRAME_RADIUS) / visibleFrames;
 const timelineStartX = TRACK_LABEL_WIDTH + 2*KEYFRAME_RADIUS;
 const intersectionThreshold = 10; // pixels from intersection point to trigger
 
 // Check if we're in the prompt track area
 const trackInfo = getTrackFromY(y);
 if (trackInfo.type !== 'prompt') return null;
 
 // Sort prompts by start frame
 // Find adjacent prompts that share a boundary
 for (let i = 0; i < promptsByStart.length - 1; i++) {
 const leftPrompt = promptsByStart[i];
 const rightPrompt = promptsByStart[i + 1];
 
 // Check if they are adjacent (share the same boundary frame)
 if (leftPrompt.end_frame === rightPrompt.start_frame) {
 const intersectionFrame = leftPrompt.end_frame;
 const intersectionX = timelineStartX + (intersectionFrame - viewStartFrame) * pixelRange;
 
 // Check if mouse is near this intersection
 if (Math.abs(x - intersectionX) <= intersectionThreshold) {
 return {
 leftPrompt: leftPrompt,
 rightPrompt: rightPrompt,
 frame: intersectionFrame
 };
 }
 }
 }
 
 return null;
 }, [timelineState, promptsByStart, zoomLevel, panOffset, getTrackFromY]);
 // Helper: Find if mouse is near an interval edge (for resizing)
 const findIntervalEdge = useCallback((x: number, y: number): {interval: TimelineInterval, edge: 'left' | 'right'} | null => {
 if (!timelineState || !canvasRef.current) return null;
 
 const canvas = canvasRef.current;
 const rect = canvas.getBoundingClientRect();
 const width = rect.width;
 const { start_frame } = timelineState;
 
 // Calculate visible frame range based on zoom and pan
 const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevel;
 const viewStartFrame = start_frame + panOffset;
 
 const pixelRange = (width - TRACK_LABEL_WIDTH - 2*KEYFRAME_RADIUS) / visibleFrames;
 const timelineStartX = TRACK_LABEL_WIDTH + 2*KEYFRAME_RADIUS;
 const edgeThreshold = 8; // pixels from edge to trigger resize
 
 const trackInfo = getTrackFromY(y);
 if (trackInfo.type !== 'track' || trackInfo.trackIndex === undefined) return null;
 
 const track = timelineState.tracks[trackInfo.trackIndex];
 const trackY = getTrackY(trackInfo.trackIndex);
 const trackHeight = TRACK_HEIGHT * (track.height_scale || 1.0);
 
 // Check intervals first
 for (let i = intervals.length - 1; i >= 0; i--) {
 const interval = intervals[i];
 
 // Skip locked intervals - they cannot be resized
 if (interval.locked) continue;
 
 if (interval.track_id === track.uuid) {
 const intervalFrameWidth = interval.end_frame - interval.start_frame + 1;
 
 // Position based on start frame (aligned with keyframes)
 const frameStartX = timelineStartX + (interval.start_frame - viewStartFrame) * pixelRange;
 
 // For single-frame intervals (circles), use circular hit detection
 if (intervalFrameWidth === 1) {
 const centerY = trackY + trackHeight / 2;
 const distance = Math.sqrt(Math.pow(x - frameStartX, 2) + Math.pow(y - centerY, 2));
 
 if (distance <= KEYFRAME_RADIUS + edgeThreshold) {
 // Determine which side based on x position relative to center
 if (x < frameStartX) {
 return { interval, edge: 'left' };
 } else {
 return { interval, edge: 'right' };
 }
 }
 } else {
 // For multi-frame intervals, check edges
 // Calculate width same as prompts (inclusive)
 const intervalWidth = (interval.end_frame - interval.start_frame) * pixelRange + 2 * KEYFRAME_RADIUS;
 const startX = frameStartX - KEYFRAME_RADIUS;
 const endX = startX + intervalWidth;
 
 const intervalHeight = KEYFRAME_RADIUS * 2;
 const intervalY = trackY + (trackHeight - intervalHeight) / 2;
 
 // Check if near edges
 if (y >= intervalY && y <= intervalY + intervalHeight) {
 if (Math.abs(x - startX) <= edgeThreshold && x >= startX - edgeThreshold && x <= startX + edgeThreshold) {
 return { interval, edge: 'left' };
 }
 if (Math.abs(x - endX) <= edgeThreshold && x >= endX - edgeThreshold && x <= endX + edgeThreshold) {
 return { interval, edge: 'right' };
 }
 }
 }
 }
 }
 
 // Check single keyframes (to convert to intervals)
 for (const kf of keyframes) {
 // Skip locked keyframes - they cannot be converted to intervals
 if (kf.locked) continue;
 
 if (kf.track_id === track.uuid) {
 const kfX = timelineStartX + (kf.frame - viewStartFrame) * pixelRange;
 const kfY = trackY + trackHeight / 2;
 const distance = Math.sqrt(Math.pow(x - kfX, 2) + Math.pow(y - kfY, 2));
 
 if (distance <= KEYFRAME_RADIUS + edgeThreshold) {
 // Treat single keyframe as interval with start=end=frame
 const fakeInterval: TimelineInterval = {
 uuid: kf.uuid,
 track_id: kf.track_id,
 start_frame: kf.frame,
 end_frame: kf.frame,
 value: kf.value,
 opacity: kf.opacity ?? 1,
 locked: kf.locked ?? false,
 };
 // Determine which side based on x position
 if (x < kfX) {
 return { interval: fakeInterval, edge: 'left' };
 } else {
 return { interval: fakeInterval, edge: 'right' };
 }
 }
 }
 }
 
 return null;
 }, [timelineState, intervals, keyframes, getTrackFromY, getTrackY, getFrameFromX]);
 return { getFrameFromX, getTrackY, getTrackFromY, findKeyframeAtPosition,
 findIntervalAtPosition, findPromptAtPosition, findPromptEdge, findPromptIntersection,
 findIntervalEdge };
}

export type TimelineGeometry = ReturnType<typeof useTimelineGeometry>;
