// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef } from "react";
import { KEYFRAME_RADIUS, TRACK_LABEL_WIDTH } from "./constants.ts";
import { getZoomEnvelopeEndFrame } from "./timeline-scales.ts";
import type { TimelineInteractionSnapshot } from "./timeline-interaction-state.ts";
import type { ViserViewport } from "./timeline-viewport.ts";

 // Auto-pan (aka "autoscroll") while resizing the RIGHT edge of a prompt, so the user can keep dragging.
 export const AUTO_PAN_EDGE_PX = 60;
 export const AUTO_PAN_MAX_PX_PER_SEC = 900;
export  type AutoPanMode = "resizeRightEdge" | "intersection";

export interface TimelineAutoPanArgs {
 interaction: TimelineInteractionSnapshot;
 viewport: ViserViewport;
}

export function useTimelineAutoPan(args: TimelineAutoPanArgs) {
 const { interaction, viewport } = args;
 const { canvasRef, timelineStateRef, resizingPrompt, resizingPromptCurrentFrames,
 resizingPromptRef, resizingPromptCurrentFramesRef, draggingIntersection,
 draggingIntersectionRef, setResizingPromptCurrentFrames,
 setDraggingIntersectionCurrentFrame, onPromptResizeRef, onPromptMoveRef } = interaction;
 const { zoomLevelRef, panOffsetRef, setPanOffset, didUserAdjustViewRef } = viewport;
 const autoPanModeRef = useRef<AutoPanMode | null>(null);
 const autoPanRafRef = useRef<number | null>(null);
 const autoPanLastTsRef = useRef<number | null>(null);
 const autoPanCanvasXRef = useRef<number | null>(null);
 const stopAutoPan = useCallback(() => {
 if (autoPanRafRef.current !== null) {
 cancelAnimationFrame(autoPanRafRef.current);
 autoPanRafRef.current = null;
 }
 autoPanLastTsRef.current = null;
 autoPanModeRef.current = null;
 }, []);
 const getFrameFromXWithPan = useCallback((x: number, panOffsetOverride: number): number => {
 const ts = timelineStateRef.current;
 const canvas = canvasRef.current;
 if (!ts || !canvas) return 0;

 const rect = canvas.getBoundingClientRect();
 const width = rect.width;
 const { start_frame } = ts;

 const envelopeEndFrame = getZoomEnvelopeEndFrame(ts);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevelRef.current;
 const viewStartFrame = start_frame + panOffsetOverride;

 const pixelRange = (width - TRACK_LABEL_WIDTH - 2 * KEYFRAME_RADIUS) / visibleFrames;
 const adjustedX = x - TRACK_LABEL_WIDTH - 2 * KEYFRAME_RADIUS;
 const frame = Math.round(adjustedX / pixelRange + viewStartFrame);
 return Math.max(start_frame, frame);
 }, []);
 const getPromptRightEdgeBounds = useCallback((
 ts: NonNullable<typeof timelineStateRef.current>,
 rp: NonNullable<typeof resizingPromptRef.current>,
 ) => {
 const PROMPT_MIN_FRAMES = ts.min_prompt_duration || 1;
 const PROMPT_MAX_FRAMES = ts.max_prompt_duration || Infinity;
 const fixedStart = rp.originalStartFrame;
 const fixedEnd = rp.originalEndFrame;

 const { prompts } = ts;
 let rightNeighborStart = Infinity;
 for (const p of prompts) {
 if (p.uuid === rp.uuid) continue;
 if (p.start_frame >= fixedEnd) {
 rightNeighborStart = Math.min(rightNeighborStart, p.start_frame);
 }
 }

 const minAllowedEnd = fixedStart + PROMPT_MIN_FRAMES;
 const maxEndFromMax = Number.isFinite(PROMPT_MAX_FRAMES) ? (fixedStart + PROMPT_MAX_FRAMES) : Infinity;
 const maxAllowedEnd = Math.min(maxEndFromMax, rightNeighborStart);
 return { minAllowedEnd, maxAllowedEnd };
 }, []);
 const applyResizingPromptAtFrame = useCallback((frame: number) => {
 const rp = resizingPromptRef.current;
 const ts = timelineStateRef.current;
 if (!rp || !ts) return;

 const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
 const PROMPT_MIN_FRAMES = ts.min_prompt_duration || 1;
 const PROMPT_MAX_FRAMES = ts.max_prompt_duration || Infinity;

 const fixedStart = rp.originalStartFrame;
 const fixedEnd = rp.originalEndFrame;

 const { start_frame, prompts } = ts;

 let leftNeighborEnd = start_frame;
 let rightNeighborStart = Infinity;
 for (const p of prompts) {
 if (p.uuid === rp.uuid) continue;
 if (p.end_frame <= fixedStart) {
 leftNeighborEnd = Math.max(leftNeighborEnd, p.end_frame);
 }
 if (p.start_frame >= fixedEnd) {
 rightNeighborStart = Math.min(rightNeighborStart, p.start_frame);
 }
 }

 let validStartFrame = fixedStart;
 let validEndFrame = fixedEnd;

 if (rp.edge === "left") {
 const maxStartFromMin = fixedEnd - PROMPT_MIN_FRAMES;
 const minStartFromMax = Number.isFinite(PROMPT_MAX_FRAMES) ? (fixedEnd - PROMPT_MAX_FRAMES) : -Infinity;
 const minAllowedStart = Math.max(leftNeighborEnd, minStartFromMax);
 const maxAllowedStart = maxStartFromMin;

 if (maxAllowedStart < minAllowedStart) {
 validStartFrame = minAllowedStart;
 } else {
 validStartFrame = clamp(frame, minAllowedStart, maxAllowedStart);
 }
 } else {
 const minEndFromMin = fixedStart + PROMPT_MIN_FRAMES;
 const maxEndFromMax = Number.isFinite(PROMPT_MAX_FRAMES) ? (fixedStart + PROMPT_MAX_FRAMES) : Infinity;
 const minAllowedEnd = minEndFromMin;
 const maxAllowedEnd = Math.min(maxEndFromMax, rightNeighborStart);

 if (maxAllowedEnd < minAllowedEnd) {
 validEndFrame = maxAllowedEnd;
 } else {
 validEndFrame = clamp(frame, minAllowedEnd, maxAllowedEnd);
 }
 }

 setResizingPromptCurrentFrames({ startFrame: validStartFrame, endFrame: validEndFrame });
 const cb = onPromptResizeRef.current;
 if (cb) {
 cb(rp.uuid, validStartFrame, validEndFrame);
 }
 }, []);
 const applyDraggingIntersectionAtFrame = useCallback((frame: number) => {
 const di = draggingIntersectionRef.current;
 const ts = timelineStateRef.current;
 if (!di || !ts) return;

 const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
 const PROMPT_MIN_FRAMES = ts.min_prompt_duration || 1;
 const PROMPT_MAX_FRAMES = ts.max_prompt_duration || Infinity;

 const minFrameFromLeft = di.leftOriginalStart + PROMPT_MIN_FRAMES;
 const maxFrameFromLeft = di.leftOriginalStart + PROMPT_MAX_FRAMES;

 const timelineStartFrame = ts.start_frame;
 const deltaMin = timelineStartFrame - di.rightChainMinStart;
 const minFrameFromChain = di.originalFrame + deltaMin;

 const minFrame = Math.max(minFrameFromLeft, minFrameFromChain);
 const maxFrame = maxFrameFromLeft;

 const constrainedFrame = clamp(frame, minFrame, maxFrame);
 const delta = constrainedFrame - di.originalFrame;

 setDraggingIntersectionCurrentFrame(constrainedFrame);

 onPromptResizeRef.current?.(di.leftPromptId, di.leftOriginalStart, constrainedFrame);
 const move = onPromptMoveRef.current;
 if (move) {
 for (const p of di.rightChain) {
 move(p.uuid, p.originalStart + delta, p.originalEnd + delta);
 }
 }
 }, []);
 const tickAutoPan = useCallback((tsNow: number) => {
 const mode = autoPanModeRef.current;
 const rp = resizingPromptRef.current;
 const di = draggingIntersectionRef.current;
 const ts = timelineStateRef.current;
 const canvas = canvasRef.current;
 const cursorX = autoPanCanvasXRef.current;

 const isResizeRightActive = !!rp && rp.edge === "right";
 const isIntersectionActive = !!di;
 const modeActive =
 (mode === "resizeRightEdge" && isResizeRightActive) ||
 (mode === "intersection" && isIntersectionActive);

 if (!modeActive || !ts || !canvas || cursorX === null) {
 stopAutoPan();
 return;
 }

 const rect = canvas.getBoundingClientRect();
 const width = rect.width;
 const timelineStartX = TRACK_LABEL_WIDTH + 2 * KEYFRAME_RADIUS;
 const leftThreshold = timelineStartX + AUTO_PAN_EDGE_PX;
 const rightThreshold = width - AUTO_PAN_EDGE_PX;

 // Positive => pan right, Negative => pan left.
 const rightOver = cursorX - rightThreshold;
 const leftOver = leftThreshold - cursorX;
 const intensityRight = Math.max(0, Math.min(2, rightOver / AUTO_PAN_EDGE_PX)); // allow a bit of extra speed if beyond edge
 const intensityLeft = Math.max(0, Math.min(2, leftOver / AUTO_PAN_EDGE_PX));
 const signedIntensity = intensityRight > 0 ? intensityRight : (intensityLeft > 0 ? -intensityLeft : 0);

 if (signedIntensity === 0) {
 stopAutoPan();
 return;
 }

 const last = autoPanLastTsRef.current ?? tsNow;
 const dtMs = Math.max(0, tsNow - last);
 autoPanLastTsRef.current = tsNow;

 const { start_frame } = ts;
 const envelopeEndFrame = getZoomEnvelopeEndFrame(ts);
 const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
 const visibleFrames = totalFrames / zoomLevelRef.current;
 const pixelRange = (width - TRACK_LABEL_WIDTH - 2 * KEYFRAME_RADIUS) / visibleFrames; // px per frame
 const framesPerPx = pixelRange > 0 ? 1 / pixelRange : 0;

 // If the dragged value is already clamped by constraints, don't keep panning in the blocked direction.
 if (mode === "resizeRightEdge" && rp) {
 const { minAllowedEnd, maxAllowedEnd } = getPromptRightEdgeBounds(ts, rp);
 const currentEnd = resizingPromptCurrentFramesRef.current?.endFrame ?? rp.originalEndFrame;

 if (!Number.isFinite(minAllowedEnd) || !Number.isFinite(maxAllowedEnd) || maxAllowedEnd <= minAllowedEnd) {
 stopAutoPan();
 return;
 }
 if (signedIntensity > 0 && currentEnd >= maxAllowedEnd) {
 stopAutoPan();
 return;
 }
 if (signedIntensity < 0 && currentEnd <= minAllowedEnd) {
 stopAutoPan();
 return;
 }
 }

 if (mode === "intersection" && di) {
 const PROMPT_MIN_FRAMES = ts.min_prompt_duration || 1;
 const PROMPT_MAX_FRAMES = ts.max_prompt_duration || Infinity;

 const minFrameFromLeft = di.leftOriginalStart + PROMPT_MIN_FRAMES;
 const maxFrameFromLeft = di.leftOriginalStart + PROMPT_MAX_FRAMES;
 const timelineStartFrame = ts.start_frame;
 const deltaMin = timelineStartFrame - di.rightChainMinStart;
 const minFrameFromChain = di.originalFrame + deltaMin;
 const minFrame = Math.max(minFrameFromLeft, minFrameFromChain);
 const maxFrame = maxFrameFromLeft;

 const currentFrame = getFrameFromXWithPan(cursorX, panOffsetRef.current);
 const constrainedFrame = Math.max(minFrame, Math.min(maxFrame, currentFrame));
 if (signedIntensity > 0 && constrainedFrame >= maxFrame) {
 stopAutoPan();
 return;
 }
 if (signedIntensity < 0 && constrainedFrame <= minFrame) {
 stopAutoPan();
 return;
 }
 }

 const deltaPx = (AUTO_PAN_MAX_PX_PER_SEC * Math.abs(signedIntensity)) * (dtMs / 1000);
 const deltaFrames = deltaPx * framesPerPx * (signedIntensity > 0 ? 1 : -1);

 if (deltaFrames !== 0) {
 const prevPan = panOffsetRef.current;
 const nextPan = Math.max(0, prevPan + deltaFrames);
 if (nextPan === prevPan) {
 stopAutoPan();
 return;
 }

 didUserAdjustViewRef.current = true;
 panOffsetRef.current = nextPan;
 setPanOffset(nextPan);

 const frame = getFrameFromXWithPan(cursorX, nextPan);
 if (mode === "resizeRightEdge") {
 applyResizingPromptAtFrame(frame);
 } else if (mode === "intersection") {
 applyDraggingIntersectionAtFrame(frame);
 }
 }

 autoPanRafRef.current = requestAnimationFrame(tickAutoPan);
 }, [applyDraggingIntersectionAtFrame, applyResizingPromptAtFrame, getFrameFromXWithPan, getPromptRightEdgeBounds, stopAutoPan]);
 const startAutoPan = useCallback((mode: AutoPanMode) => {
 autoPanModeRef.current = mode;
 // Reset timestamp so switching modes or re-entering edge doesn't cause a big dt jump.
 autoPanLastTsRef.current = null;
 if (autoPanRafRef.current !== null) return;
 autoPanRafRef.current = requestAnimationFrame(tickAutoPan);
 }, [tickAutoPan]);
 // Ensure we never leave a RAF loop running after resize ends / component unmounts.
 useEffect(() => {
 const hasResizeRight = !!resizingPrompt && resizingPrompt.edge === "right";
 const hasIntersection = !!draggingIntersection;
 if (!hasResizeRight && !hasIntersection) {
 stopAutoPan();
 }
 return () => stopAutoPan();
 }, [resizingPrompt, draggingIntersection, stopAutoPan]);
 return { stopAutoPan, startAutoPan, getFrameFromXWithPan, getPromptRightEdgeBounds,
 applyResizingPromptAtFrame, applyDraggingIntersectionAtFrame, autoPanCanvasXRef };
}

export type TimelineAutoPan = ReturnType<typeof useTimelineAutoPan>;
