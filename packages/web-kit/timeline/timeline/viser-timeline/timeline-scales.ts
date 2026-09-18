// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { KEYFRAME_RADIUS, TRACK_LABEL_WIDTH } from "./constants";
import type { TimelineCoordinates } from "./types";
import type { TimelineMessage } from "./messages";

export const DEFAULT_KEYFRAME_COLOR: [number, number, number] = [219, 148, 86];
export const OUT_OF_RANGE_CONSTRAINT_COLOR: [number, number, number] = [140, 140, 140];
export const OUT_OF_RANGE_CONSTRAINT_OPACITY = 0.1;

export function getIntervalSegments(
 interval: { start_frame: number; end_frame: number; opacity?: number },
 promptRange: { startFrame: number; endFrame: number } | null,
 trackColor: [number, number, number],
): Array<{ startFrame: number; endFrame: number; color: [number, number, number]; opacity?: number }> {
 const baseOpacity = interval.opacity ?? 1.0;
 const outOfRangeOpacity = Math.min(baseOpacity, OUT_OF_RANGE_CONSTRAINT_OPACITY);
 if (!promptRange) {
 return [
 {
 startFrame: interval.start_frame,
 endFrame: interval.end_frame,
 color: trackColor,
 opacity: baseOpacity,
 },
 ];
 }

 const { startFrame, endFrame } = promptRange;
 if (interval.end_frame < startFrame || interval.start_frame > endFrame) {
 return [
 {
 startFrame: interval.start_frame,
 endFrame: interval.end_frame,
 color: OUT_OF_RANGE_CONSTRAINT_COLOR,
 opacity: outOfRangeOpacity,
 },
 ];
 }

 const segments: Array<{ startFrame: number; endFrame: number; color: [number, number, number]; opacity?: number }> = [];
 const inRangeStart = Math.max(interval.start_frame, startFrame);
 const inRangeEnd = Math.min(interval.end_frame, endFrame);

 if (interval.start_frame < inRangeStart) {
 segments.push({
 startFrame: interval.start_frame,
 endFrame: inRangeStart - 1,
 color: OUT_OF_RANGE_CONSTRAINT_COLOR,
 opacity: outOfRangeOpacity,
 });
 }

 if (inRangeStart <= inRangeEnd) {
 segments.push({
 startFrame: inRangeStart,
 endFrame: inRangeEnd,
 color: trackColor,
 opacity: baseOpacity,
 });
 }

 if (interval.end_frame > inRangeEnd) {
 segments.push({
 startFrame: inRangeEnd + 1,
 endFrame: interval.end_frame,
 color: OUT_OF_RANGE_CONSTRAINT_COLOR,
 opacity: outOfRangeOpacity,
 });
 }

 return segments;
}

// Small baseline tweak so canvas-rendered prompt text matches the edit overlay
// across browsers (native font metrics differ slightly from canvas metrics).
export const PROMPT_TEXT_Y_OFFSET_PX = 1;

// ============================================================================
// Helper Types and Functions
// ============================================================================

/**
 * Determine the "zoom envelope" end frame used for coordinate scaling.
 *
 * `end_frame` is often used to set an initial viewport, but `max_frames_zoom`
 * defines how far users should be able to zoom out (number of visible frames).
 */
export function getZoomEnvelopeEndFrame(timelineState: TimelineMessage): number {
 const { start_frame, end_frame, max_frames_zoom } = timelineState;
 const maxFramesZoom = Math.max(0, Math.floor(max_frames_zoom ?? 0));
 const envelopeEndByZoom = start_frame + Math.max(0, maxFramesZoom - 1);
 return Math.max(end_frame, envelopeEndByZoom);
}

/**
 * Calculate common coordinate values used throughout timeline rendering
 */
export function calculateTimelineCoordinates(
 width: number,
 timelineState: TimelineMessage,
 zoomLevel: number,
 panOffset: number
): TimelineCoordinates {
 const { start_frame } = timelineState;
 const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevel;
 const viewStartFrame = start_frame + panOffset;
 const viewEndFrame = viewStartFrame + visibleFrames;
 
 // Calculate how much space is available for drawing frames (only subtract left padding)
 // Right padding will be enforced by clamping the pan offset
 const pixelRange = (width - TRACK_LABEL_WIDTH - 2*KEYFRAME_RADIUS) / visibleFrames;
 const timelineStartX = TRACK_LABEL_WIDTH + 2*KEYFRAME_RADIUS;
 
 const minFramePixels = 60;
 const frameDelta = Math.max(Math.floor(minFramePixels / pixelRange), 1);
 const framesBeforeTimeline = Math.ceil(timelineStartX / pixelRange);
 const firstVisibleFrame = Math.max(0, viewStartFrame - framesBeforeTimeline);
 
 return {
 pixelRange,
 timelineStartX,
 viewStartFrame,
 viewEndFrame,
 visibleFrames,
 minFramePixels,
 frameDelta,
 framesBeforeTimeline,
 firstVisibleFrame,
 endFrame: envelopeEndFrame,
 };
}

