// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect } from "react";
import { DRAW_BUFFER, TRACK_LABEL_WIDTH } from "./constants.ts";
import { FRAME_LABELS_HEIGHT, TRACK_HEIGHT } from "./TimelineConstants.ts";
import { drawEndFrameLine, drawFrameLabels, drawInterval, drawKeyframe, drawLabelOverlay } from "./draw.ts";
import { DEFAULT_PROMPT_COLOR, PROMPT_TEXT_SHADOW } from "./styles.ts";
import type { TimelineTheme } from "./styles.ts";
import { calculateTimelineCoordinates, DEFAULT_KEYFRAME_COLOR, getIntervalSegments, OUT_OF_RANGE_CONSTRAINT_COLOR, OUT_OF_RANGE_CONSTRAINT_OPACITY, PROMPT_TEXT_Y_OFFSET_PX } from "./timeline-scales.ts";
import type { TimelineInterval, TimelineMessage } from "./messages.ts";
import type { CanvasSizeState, TimelineKeyframe, TimelinePrompt, TimelineTrack } from "./types.ts";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.ts";

export interface TimelineBackgroundArgs {
 timelineState: TimelineMessage | null;
 interaction: TimelineInteractionSnapshot;
 canvasSize: CanvasSizeState;
 resizeRevision: number;
 zoomLevel: number;
 panOffset: number;
 prompts: TimelinePrompt[];
 promptRange: { startFrame: number; endFrame: number } | null;
 tracks: TimelineTrack[];
 keyframes: TimelineKeyframe[];
 intervals: TimelineInterval[];
 theme: TimelineTheme;
 darkMode: boolean;
}

export function useTimelineBackground(args: TimelineBackgroundArgs) {
 const { timelineState, interaction, canvasSize, resizeRevision, zoomLevel, panOffset,
 prompts, promptRange, tracks, keyframes, intervals, theme, darkMode } = args;
 const { canvasRef, backgroundCanvasRef } = interaction;
 // Draw the static background (prompts, tracks, keyframes) only when they change
 useEffect(() => {
 if (
 !timelineState ||
 !canvasRef.current ||
 canvasSize.width === 0 ||
 canvasSize.height === 0
 ) {
 backgroundCanvasRef.current = null; // Clear background if no timeline
 return;
 }

 // Create or reuse background canvas
 if (!backgroundCanvasRef.current) {
 backgroundCanvasRef.current = document.createElement('canvas');
 }
 
 const bgCanvas = backgroundCanvasRef.current;
 const canvas = canvasRef.current;
 const ctx = canvas.getContext("2d");
 const bgCtx = bgCanvas.getContext("2d");
 if (!ctx || !bgCtx) return;

 const { prompts, tracks, keyframes } = timelineState;
 const dpr = canvasSize.dpr;

 // Always reset background canvas dimensions to ensure clean redraw on resize
 // Setting width/height automatically clears the canvas
 bgCanvas.width = canvas.width;
 bgCanvas.height = canvas.height;

 // Draw static elements to background canvas
 bgCtx.setTransform(1, 0, 0, 1, 0, 0);
 bgCtx.save();
 bgCtx.scale(dpr, dpr);

 const width = canvasSize.width;
 const height = canvasSize.height;
 
 // Calculate timeline coordinates (reuse across all drawing operations)
 const coords = calculateTimelineCoordinates(width, timelineState, zoomLevel, panOffset);

 // Clear canvas
 bgCtx.fillStyle = theme.backgroundColor;
 bgCtx.fillRect(0, 0, width, height);

 // Track layout
 let currentTrackY = FRAME_LABELS_HEIGHT;
 const trackOrder: Array<{type: 'prompt', index: number, data: {name: string}} | {type: 'track', index: number, data: TimelineTrack}> = [];
 
 // Add prompts track if there are prompts
 if (prompts.length > 0) {
 trackOrder.push({type: 'prompt', index: 0, data: {name: 'Prompts'}});
 }
 
 // Add other tracks
 tracks.forEach((track, index) => {
 trackOrder.push({type: 'track', index, data: track});
 });

 // Draw vertical line at the last frame
 drawEndFrameLine(bgCtx, coords, zoomLevel, width, height, theme);

 // Draw frame ticks FIRST (so they appear behind prompts/keyframes)
 drawFrameLabels(bgCtx, coords, width, height, true, theme);


 // Draw shadow at the bottom of the frame labels header (spanning entire width including labels)
 bgCtx.save();
 const shadowGradient = bgCtx.createLinearGradient(0, FRAME_LABELS_HEIGHT, 0, FRAME_LABELS_HEIGHT + 8);
 shadowGradient.addColorStop(0, theme.headerShadowColor);
 shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
 bgCtx.fillStyle = shadowGradient;
 bgCtx.fillRect(0, FRAME_LABELS_HEIGHT, width, 8);
 bgCtx.restore();

 // Draw prompts track (always shown)
 const trackY = currentTrackY;
 
 // Draw track separator (only in timeline area, not in label area)
 bgCtx.strokeStyle = theme.trackSeparatorColor;
 bgCtx.lineWidth = 1;
 bgCtx.beginPath();
 bgCtx.moveTo(TRACK_LABEL_WIDTH, trackY);
 bgCtx.lineTo(width, trackY);
 bgCtx.stroke();

 // Last prompt (by start_frame) uses inclusive end in demo convention; others exclusive.
 const lastPromptStartFrame = prompts.length > 0
 ? Math.max(...prompts.map((p: TimelinePrompt) => p.start_frame))
 : -1;

 // Draw prompts if any exist
 prompts.forEach((prompt: TimelinePrompt) => {
 const color = prompt.color || DEFAULT_PROMPT_COLOR;
 const startX = coords.timelineStartX + (prompt.start_frame - coords.viewStartFrame) * coords.pixelRange;
 const endX = coords.timelineStartX + (prompt.end_frame - coords.viewStartFrame) * coords.pixelRange;
 const promptWidth = endX - startX;

 // Skip only if way off screen (beyond buffer)
 // Allow drawing to the left of timelineStartX for shadows to extend into label area
 if (endX < 0 - DRAW_BUFFER || startX > width + DRAW_BUFFER) {
 return;
 }

 const promptHeight = TRACK_HEIGHT - 4; // 2px top + 1px bottom margin
 const promptY = trackY + 2;
 const borderRadius = 5;

 // Draw prompt box with rounded corners and gradient
 bgCtx.save();
 bgCtx.beginPath();
 
 // Use roundRect if available, otherwise fallback to regular rect
 if (bgCtx.roundRect) {
 bgCtx.roundRect(startX, promptY, promptWidth, promptHeight, borderRadius);
 } else {
 // Fallback for browsers that don't support roundRect
 bgCtx.rect(startX, promptY, promptWidth, promptHeight);
 }
 bgCtx.clip();

 // Gradient fill
 const gradient = bgCtx.createLinearGradient(0, promptY, 0, promptY + promptHeight);
 gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`);
 gradient.addColorStop(1, `rgba(${color[0] * 0.8}, ${color[1] * 0.8}, ${color[2] * 0.8}, 0.9)`);
 bgCtx.fillStyle = gradient;
 bgCtx.fill();

 // Border
 bgCtx.strokeStyle = theme.promptBorderColor;
 bgCtx.lineWidth = 3.0;
 bgCtx.stroke();

 // Subtle inner highlight
 bgCtx.beginPath();
 if (bgCtx.roundRect) {
 bgCtx.roundRect(startX + 1, promptY + 1, promptWidth - 2, promptHeight - 2, borderRadius - 1);
 } else {
 bgCtx.rect(startX + 1, promptY + 1, promptWidth - 2, promptHeight - 2);
 }
 bgCtx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
 bgCtx.lineWidth = 1;
 bgCtx.stroke();

 bgCtx.restore();

 // Draw seconds label near the left edge of the prompt.
 // UI-only: convert frames -> seconds using timelineState.fps.
 // Match demo convention: last prompt (by start_frame) is [start, end] inclusive,
 // so its duration is (end - start + 1) / fps; other prompts use (end - start) / fps.
 const fps = timelineState.fps ?? 30;
 const isLastPrompt = prompt.start_frame === lastPromptStartFrame;
 const frameCount = isLastPrompt
 ? prompt.end_frame - prompt.start_frame + 1
 : prompt.end_frame - prompt.start_frame;
 const durationSeconds = frameCount / Math.max(1e-9, fps);
 const secondsText = `${Math.max(0, durationSeconds).toFixed(1)} s`;

 // Only draw if there's enough room for the pill + some text space.
 bgCtx.save();
 bgCtx.font = "11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
 const pillPadX = 6;
 const pillW = bgCtx.measureText(secondsText).width + pillPadX * 2;
 const pillH = 16;
 // Clamp to the visible left edge of the *timeline area* (the label overlay covers
 // [0, TRACK_LABEL_WIDTH]). We intentionally do NOT clamp to coords.timelineStartX,
 // because that includes extra padding (2*KEYFRAME_RADIUS) to center keyframe circles.
 // Using coords.timelineStartX here makes the first prompt's seconds pill appear offset
 // relative to the track label separator.
 const visibleStartX = Math.max(startX, TRACK_LABEL_WIDTH);
 const visibleWidth = Math.max(0, endX - visibleStartX);
 const pillX = visibleStartX + 6;
 const pillY = promptY + (promptHeight - pillH) / 2;
 const canDrawPill = visibleWidth > pillW + 24;
 // Used later to keep centered prompt text from overlapping the pill.
 const pillRightX = pillX + pillW + 8;
 if (canDrawPill) {
 // Background pill.
 bgCtx.fillStyle = "rgba(0, 0, 0, 0.28)";
 bgCtx.beginPath();
 if (bgCtx.roundRect) {
 bgCtx.roundRect(pillX, pillY, pillW, pillH, 8);
 } else {
 bgCtx.rect(pillX, pillY, pillW, pillH);
 }
 bgCtx.fill();

 // Text.
 bgCtx.fillStyle = theme.promptTextColor;
 bgCtx.textAlign = "left";
 bgCtx.textBaseline = "middle";
 bgCtx.shadowColor = PROMPT_TEXT_SHADOW;
 bgCtx.shadowBlur = 2;
 bgCtx.shadowOffsetX = 0;
 bgCtx.shadowOffsetY = 1;
 bgCtx.fillText(secondsText, pillX + pillPadX, pillY + pillH / 2);
 }
 bgCtx.restore();

 // Draw prompt text with shadow
 bgCtx.fillStyle = theme.promptTextColor;
 bgCtx.font = "12px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
 bgCtx.textAlign = "center";
 bgCtx.textBaseline = "middle";
 
 // Clip text if needed
 const textY = promptY + promptHeight / 2 + PROMPT_TEXT_Y_OFFSET_PX;
 // When the prompt is partially offscreen, center/truncate based on the visible portion.
 // Left edge is clamped to the timeline area (label overlay covers [0, TRACK_LABEL_WIDTH]).
 const visiblePromptStartX = Math.max(startX, TRACK_LABEL_WIDTH);
 const visiblePromptEndX = Math.min(endX, width);
 const visiblePromptWidth = Math.max(0, visiblePromptEndX - visiblePromptStartX);
 // Compute centered text width, but ensure it never overlaps the seconds pill.
 const textCenterX = visiblePromptStartX + visiblePromptWidth / 2;
 let textLeftLimitX = visiblePromptStartX + 10;
 const textRightLimitX = visiblePromptEndX - 10;
 if (canDrawPill) {
 textLeftLimitX = Math.max(textLeftLimitX, pillRightX);
 }
 const maxTextWidth = Math.max(
 0,
 2 * Math.min(textCenterX - textLeftLimitX, textRightLimitX - textCenterX),
 );
 let displayText = prompt.text || "(Empty)";
 
 if (bgCtx.measureText(displayText).width > maxTextWidth) {
 while (
 bgCtx.measureText(displayText + "...").width > maxTextWidth &&
 displayText.length > 0
 ) {
 displayText = displayText.slice(0, -1);
 }
 displayText += "...";
 }

 if (visiblePromptWidth > 30 && maxTextWidth > 0) {
 // Text shadow for better readability
 bgCtx.shadowColor = PROMPT_TEXT_SHADOW;
 bgCtx.shadowBlur = 3;
 bgCtx.shadowOffsetX = 0;
 bgCtx.shadowOffsetY = 1;
 // Center around the visible portion (do not account for the seconds pill).
 bgCtx.fillText(displayText, textCenterX, textY);
 // Reset shadow completely
 bgCtx.shadowColor = 'transparent';
 bgCtx.shadowBlur = 0;
 bgCtx.shadowOffsetX = 0;
 bgCtx.shadowOffsetY = 0;
 }
 });
 
 currentTrackY += TRACK_HEIGHT;

 // Draw keyframe tracks
 tracks.forEach((track: TimelineTrack) => {
 const trackY = currentTrackY;
 const trackColor = track.color || DEFAULT_KEYFRAME_COLOR;
 const trackHeight = TRACK_HEIGHT * (track.height_scale || 1.0);
 
 // Draw track separator (only in timeline area, not in label area)
 bgCtx.strokeStyle = theme.trackSeparatorColor;
 bgCtx.lineWidth = 1;
 bgCtx.beginPath();
 bgCtx.moveTo(TRACK_LABEL_WIDTH, trackY);
 bgCtx.lineTo(width, trackY);
 bgCtx.stroke();
 
 // Draw intervals for this track (behind keyframes)
 const trackIntervals = intervals.filter((interval) => interval.track_id === track.uuid);
 trackIntervals.forEach((interval) => {
 const segments = getIntervalSegments(interval, promptRange, trackColor);
 segments.forEach((segment) => {
 const roundLeft = segment.startFrame === interval.start_frame;
 const roundRight = segment.endFrame === interval.end_frame;
 drawInterval(
 bgCtx,
 {
 ...interval,
 start_frame: segment.startFrame,
 end_frame: segment.endFrame,
 opacity: segment.opacity ?? interval.opacity,
 },
 coords,
 trackY,
 trackHeight,
 segment.color,
 theme,
 width,
 roundLeft,
 roundRight,
 true,
 false,
 );
 });
 drawInterval(
 bgCtx,
 interval,
 coords,
 trackY,
 trackHeight,
 trackColor,
 theme,
 width,
 true,
 true,
 false,
 true,
 );
 });
 
 // Draw keyframes for this track (on top of intervals)
 const trackKeyframes = keyframes.filter((kf: TimelineKeyframe) => kf.track_id === track.uuid);
 trackKeyframes.forEach((keyframe: TimelineKeyframe) => {
 const isOutOfRange =
 promptRange !== null &&
 (keyframe.frame < promptRange.startFrame ||
 keyframe.frame > promptRange.endFrame);
 const keyframeColor = isOutOfRange ? OUT_OF_RANGE_CONSTRAINT_COLOR : trackColor;
 const baseOpacity = keyframe.opacity ?? 1.0;
 const keyframeOpacity = isOutOfRange
 ? Math.min(baseOpacity, OUT_OF_RANGE_CONSTRAINT_OPACITY)
 : baseOpacity;
 drawKeyframe(
 bgCtx,
 { ...keyframe, opacity: keyframeOpacity },
 coords,
 trackY,
 trackHeight,
 keyframeColor,
 theme,
 width,
 );
 });
 
 currentTrackY += trackHeight;
 });
 
 // Draw label overlay (background over label area and redraw labels/frame numbers)
 drawLabelOverlay(bgCtx, coords, tracks, prompts.length > 0, width, height, theme);

 // Top separator line 
 bgCtx.strokeStyle = theme.topBorderColor;
 bgCtx.lineWidth = 1;
 bgCtx.beginPath();
 bgCtx.moveTo(0, 0);
 bgCtx.lineTo(width, 0);
 bgCtx.stroke();
 bgCtx.restore();
 }, [
 // Only re-render background when these specific values change
 timelineState?.enabled,
 prompts,
 promptRange,
 tracks,
 keyframes,
 intervals,
 timelineState?.start_frame,
 timelineState?.end_frame,
 promptRange,
 canvasSize.width,
 canvasSize.height,
 canvasSize.dpr,
 resizeRevision, // Force redraw on resize
 zoomLevel, // Redraw on zoom change
 panOffset, // Redraw on pan change
 timelineState?.fps, // Redraw seconds labels when fps changes
 darkMode, // Redraw on theme change
 ]);
 // Track when background was last updated (use state so changes trigger re-renders)
 const [backgroundRevision, setBackgroundRevision] = React.useState(0);
 React.useEffect(() => {
 setBackgroundRevision(prev => prev + 1);
 }, [
 prompts,
 tracks,
 keyframes,
 intervals,
 ]);
 return { backgroundRevision };
}
