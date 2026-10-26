// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { useEffect } from "react";
import { FRAME_LABELS_HEIGHT, TRACK_HEIGHT } from "./TimelineConstants.js";
import { drawHighlightFrameBox, drawInterval, drawLabelOverlay } from "./draw.js";
import { HIGHLIGHT_BORDER_COLOR, HIGHLIGHT_BORDER_WIDTH, HIGHLIGHT_COLOR, HIGHLIGHT_SHADOW_BLUR, HIGHLIGHT_SHADOW_COLOR, HIGHLIGHT_SHADOW_OFFSET_Y } from "./styles.js";
import { calculateTimelineCoordinates, DEFAULT_KEYFRAME_COLOR, getIntervalSegments } from "./timeline-scales.js";
export function useTimelineForeground(args) {
    const { timelineState, interaction, canvasSize, resizeRevision, backgroundRevision, zoomLevel, panOffset, prompts, promptRange, theme, darkMode } = args;
    const { canvasRef, backgroundCanvasRef, draggedKeyframeFrame, intervalDrag, draggedIntervalCurrentFrames, resizingIntervalCurrentFrames, resizingPromptCurrentFrames, resizingPrompt, hoveredPromptForResize, hoveredIntervalForResize, hoveredKeyframe, hoveredSplitPreview, hoveredIntersection, hoveredPromptResize, draggingIntersection, draggingIntersectionCurrentFrame } = interaction;
    // Draw only the cursor when current_frame changes
    useEffect(() => {
        if (!timelineState ||
            !canvasRef.current ||
            !backgroundCanvasRef.current ||
            canvasSize.width === 0 ||
            canvasSize.height === 0) {
            return;
        }
        const canvas = canvasRef.current;
        const bgCanvas = backgroundCanvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        const { current_frame } = timelineState;
        const dpr = canvasSize.dpr;
        const width = canvasSize.width;
        const height = canvasSize.height;
        // Calculate timeline coordinates (reuse across all drawing operations)
        const coords = calculateTimelineCoordinates(width, timelineState, zoomLevel, panOffset);
        // Ensure foreground canvas dimensions match
        if (canvas.width !== bgCanvas.width || canvas.height !== bgCanvas.height) {
            canvas.width = bgCanvas.width;
            canvas.height = bgCanvas.height;
        }
        // Copy background to main canvas
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bgCanvas, 0, 0);
        // Draw cursor on top - but first redraw keyframes/intervals
        ctx.save();
        ctx.scale(dpr, dpr);
        const currentFrameX = coords.timelineStartX + (current_frame - coords.viewStartFrame) * coords.pixelRange;
        const { tracks } = timelineState;
        // Draw vertical cursor line on top of everything - extend to include frame number row
        ctx.save();
        ctx.strokeStyle = theme.timeCursorColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(currentFrameX, 0); // Start from top (0) instead of FRAME_LABELS_HEIGHT
        ctx.lineTo(currentFrameX, height);
        ctx.stroke();
        ctx.restore();
        // Draw label overlay (background over label area and redraw labels/frame numbers)
        drawLabelOverlay(ctx, coords, tracks, prompts.length > 0, width, height, theme);
        // Extract coordinates for interactive element drawing
        const { timelineStartX, viewStartFrame, pixelRange } = coords;
        // Box dimensions - defined once and used for both blue and yellow boxes
        // Make box fill most of the frame number row (FRAME_LABELS_HEIGHT = 35)
        const BOX_WIDTH = 50;
        const BOX_HEIGHT = 30;
        const BOX_Y = 2; // Small margin from top
        const BOX_RADIUS = 4;
        // Draw cursor handle at top (blue box)
        ctx.save();
        ctx.shadowColor = HIGHLIGHT_SHADOW_COLOR;
        ctx.shadowBlur = HIGHLIGHT_SHADOW_BLUR;
        ctx.shadowOffsetY = HIGHLIGHT_SHADOW_OFFSET_Y;
        ctx.fillStyle = theme.timeCursorColor;
        ctx.strokeStyle = HIGHLIGHT_BORDER_COLOR;
        ctx.lineWidth = HIGHLIGHT_BORDER_WIDTH;
        // Draw handle as a rounded rectangle at the top
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(currentFrameX - BOX_WIDTH / 2, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
        }
        else {
            ctx.rect(currentFrameX - BOX_WIDTH / 2, BOX_Y, BOX_WIDTH, BOX_HEIGHT);
        }
        ctx.fill();
        ctx.stroke();
        // Draw frame number in blue handle
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 11px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 2;
        ctx.fillText(String(Math.round(current_frame)), currentFrameX, BOX_Y + BOX_HEIGHT / 2);
        ctx.shadowBlur = 0;
        ctx.restore();
        // Draw yellow frame number box when dragging a keyframe (on top of blue box)
        if (draggedKeyframeFrame !== null) {
            const dragFrameX = timelineStartX + (draggedKeyframeFrame - viewStartFrame) * pixelRange;
            drawHighlightFrameBox(ctx, dragFrameX, draggedKeyframeFrame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
        }
        // Draw yellow boxes for interval start and end frames when creating interval
        if (intervalDrag) {
            const startFrameX = timelineStartX + (intervalDrag.startFrame - viewStartFrame) * pixelRange;
            const endFrameX = timelineStartX + (intervalDrag.endFrame - viewStartFrame) * pixelRange;
            // Draw both yellow boxes
            [
                { frame: intervalDrag.startFrame, x: startFrameX },
                { frame: intervalDrag.endFrame, x: endFrameX }
            ].forEach(({ frame, x }) => {
                drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
            });
        }
        // Draw yellow boxes when hovering over prompt edge with Ctrl held
        if (hoveredPromptForResize) {
            const startFrameX = timelineStartX + (hoveredPromptForResize.startFrame - viewStartFrame) * pixelRange;
            const endFrameX = timelineStartX + (hoveredPromptForResize.endFrame - viewStartFrame) * pixelRange;
            // Draw both yellow boxes to show which prompt will be resized
            [
                { frame: hoveredPromptForResize.startFrame, x: startFrameX },
                { frame: hoveredPromptForResize.endFrame, x: endFrameX }
            ].forEach(({ frame, x }) => {
                drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
            });
        }
        // Draw yellow boxes for interval start and end frames when moving existing interval
        if (draggedIntervalCurrentFrames) {
            const startFrameX = timelineStartX + (draggedIntervalCurrentFrames.startFrame - viewStartFrame) * pixelRange;
            const endFrameX = timelineStartX + (draggedIntervalCurrentFrames.endFrame - viewStartFrame) * pixelRange;
            // Draw both yellow boxes
            [
                { frame: draggedIntervalCurrentFrames.startFrame, x: startFrameX },
                { frame: draggedIntervalCurrentFrames.endFrame, x: endFrameX }
            ].forEach(({ frame, x }) => {
                drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
            });
        }
        // Draw yellow boxes when resizing interval
        if (resizingIntervalCurrentFrames) {
            const startFrameX = timelineStartX + (resizingIntervalCurrentFrames.startFrame - viewStartFrame) * pixelRange;
            const endFrameX = timelineStartX + (resizingIntervalCurrentFrames.endFrame - viewStartFrame) * pixelRange;
            // Draw both yellow boxes
            [
                { frame: resizingIntervalCurrentFrames.startFrame, x: startFrameX },
                { frame: resizingIntervalCurrentFrames.endFrame, x: endFrameX }
            ].forEach(({ frame, x }) => {
                drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
            });
        }
        // Draw yellow boxes when resizing prompt
        if (resizingPromptCurrentFrames) {
            const startFrameX = timelineStartX + (resizingPromptCurrentFrames.startFrame - viewStartFrame) * pixelRange;
            const endFrameX = timelineStartX + (resizingPromptCurrentFrames.endFrame - viewStartFrame) * pixelRange;
            // Draw both yellow boxes
            [
                { frame: resizingPromptCurrentFrames.startFrame, x: startFrameX },
                { frame: resizingPromptCurrentFrames.endFrame, x: endFrameX }
            ].forEach(({ frame, x }) => {
                drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
            });
        }
        // Draw yellow boxes when hovering over interval edge with Ctrl held
        if (hoveredIntervalForResize) {
            const startFrameX = timelineStartX + (hoveredIntervalForResize.startFrame - viewStartFrame) * pixelRange;
            const endFrameX = timelineStartX + (hoveredIntervalForResize.endFrame - viewStartFrame) * pixelRange;
            // Draw both yellow boxes to show which interval will be resized
            [
                { frame: hoveredIntervalForResize.startFrame, x: startFrameX },
                { frame: hoveredIntervalForResize.endFrame, x: endFrameX }
            ].forEach(({ frame, x }) => {
                drawHighlightFrameBox(ctx, x, frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
            });
        }
        // Draw yellow box when hovering over keyframe with Ctrl held
        if (hoveredKeyframe) {
            const frameX = timelineStartX + (hoveredKeyframe.frame - viewStartFrame) * pixelRange;
            drawHighlightFrameBox(ctx, frameX, hoveredKeyframe.frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, BOX_RADIUS);
        }
        // Draw interval being created (Ctrl+drag)
        if (intervalDrag) {
            const actualStartFrame = Math.min(intervalDrag.startFrame, intervalDrag.endFrame);
            const actualEndFrame = Math.max(intervalDrag.startFrame, intervalDrag.endFrame);
            // Find the track to get its Y position and color
            const trackIndex = timelineState.tracks.findIndex(t => t.uuid === intervalDrag.trackId);
            if (trackIndex !== -1) {
                const track = timelineState.tracks[trackIndex];
                const trackColor = track.color || DEFAULT_KEYFRAME_COLOR;
                const trackHeight = TRACK_HEIGHT * (track.height_scale || 1.0);
                // Calculate trackY by accumulating heights of all previous tracks
                let trackY = FRAME_LABELS_HEIGHT;
                // Prompt track is always shown
                trackY += TRACK_HEIGHT;
                for (let i = 0; i < trackIndex; i++) {
                    trackY += TRACK_HEIGHT * (timelineState.tracks[i].height_scale || 1.0);
                }
                const intervalPreview = {
                    uuid: `drag-preview-${intervalDrag.startFrame}`,
                    track_id: intervalDrag.trackId,
                    start_frame: actualStartFrame,
                    end_frame: actualEndFrame,
                    value: null,
                    opacity: 1,
                    locked: false,
                };
                const segments = getIntervalSegments(intervalPreview, promptRange, trackColor);
                segments.forEach((segment) => {
                    const roundLeft = segment.startFrame === intervalPreview.start_frame;
                    const roundRight = segment.endFrame === intervalPreview.end_frame;
                    drawInterval(ctx, {
                        ...intervalPreview,
                        start_frame: segment.startFrame,
                        end_frame: segment.endFrame,
                        opacity: segment.opacity ?? intervalPreview.opacity,
                    }, coords, trackY, trackHeight, segment.color, theme, width, roundLeft, roundRight, true, false);
                });
                drawInterval(ctx, intervalPreview, coords, trackY, trackHeight, trackColor, theme, width, true, true, false, true);
            }
        }
        // Draw split preview (Shift+hover) - yellow box in time row only
        if (hoveredSplitPreview) {
            const splitX = timelineStartX + (hoveredSplitPreview.frame - viewStartFrame) * pixelRange;
            // Draw vertical yellow line in the prompt row to show where the split will occur.
            {
                const promptY = FRAME_LABELS_HEIGHT + 2;
                const promptHeight = TRACK_HEIGHT - 4;
                ctx.save();
                ctx.strokeStyle = HIGHLIGHT_COLOR;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(splitX, promptY);
                ctx.lineTo(splitX, promptY + promptHeight);
                ctx.stroke();
                ctx.restore();
            }
            // Draw frame number indicator box in the time row (same style as resize/intersection)
            const BOX_WIDTH = 50;
            const BOX_HEIGHT = 30;
            const BOX_Y = 2;
            drawHighlightFrameBox(ctx, splitX, hoveredSplitPreview.frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, 4);
        }
        // Remove intersection-drag preview in the prompt band (we only show yellow box in time row now)
        // (This section intentionally left empty - visual moved to time row)
        // Draw intersection hover indicator removed (no blue line+circle)
        // (Cursor will still change to indicate draggable)
        // Yellow box indicator for resizing last prompt (in time row)
        // IMPORTANT: when actively resizing, prefer the live resizing frames (not the hovered frame),
        // otherwise the box will "stick" at the previous end frame.
        const resizeHandleFrame = resizingPromptCurrentFrames
            ? (resizingPrompt?.edge === 'left'
                ? resizingPromptCurrentFrames.startFrame
                : resizingPromptCurrentFrames.endFrame)
            : (hoveredPromptResize?.frame ?? null);
        if (resizeHandleFrame !== null && resizeHandleFrame !== undefined) {
            const handleX = timelineStartX + (resizeHandleFrame - viewStartFrame) * pixelRange;
            const BOX_WIDTH = 50;
            const BOX_HEIGHT = 30;
            const BOX_Y = 2;
            drawHighlightFrameBox(ctx, handleX, resizeHandleFrame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, 4);
        }
        // Draw yellow frame indicators during intersection dragging (in frame number line)
        // We show:
        // - the moving intersection frame (acts like resizing the left prompt's right edge)
        // - the left prompt's start frame (to match the "two yellow boxes" visual during resizing)
        if (draggingIntersection && draggingIntersectionCurrentFrame !== null) {
            // Box dimensions - match all other yellow boxes
            const BOX_WIDTH = 50;
            const BOX_HEIGHT = 30;
            const BOX_Y = 2; // Small margin from top
            const intersectionX = timelineStartX + (draggingIntersectionCurrentFrame - viewStartFrame) * pixelRange;
            const leftStartX = timelineStartX + (draggingIntersection.leftOriginalStart - viewStartFrame) * pixelRange;
            // Match "resizing" behavior: show start + end (intersection) boxes.
            drawHighlightFrameBox(ctx, leftStartX, draggingIntersection.leftOriginalStart, BOX_Y, BOX_WIDTH, BOX_HEIGHT, 4);
            drawHighlightFrameBox(ctx, intersectionX, draggingIntersectionCurrentFrame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, 4);
        }
        // Draw yellow frame indicator when hovering over intersection (in frame number line)
        if (hoveredIntersection && !draggingIntersection) {
            // Box dimensions - match all other yellow boxes
            const BOX_WIDTH = 50;
            const BOX_HEIGHT = 30;
            const BOX_Y = 2; // Small margin from top
            const intersectionX = timelineStartX + (hoveredIntersection.frame - viewStartFrame) * pixelRange;
            drawHighlightFrameBox(ctx, intersectionX, hoveredIntersection.frame, BOX_Y, BOX_WIDTH, BOX_HEIGHT, 4);
        }
    }, [
        // Only re-render cursor when frame position actually changes
        timelineState?.enabled, // Trigger when timeline first appears
        timelineState?.current_frame,
        timelineState?.start_frame,
        timelineState?.end_frame,
        canvasSize.width,
        canvasSize.height,
        canvasSize.dpr,
        resizeRevision, // Force redraw on resize
        backgroundRevision, // Force redraw when background changes (keyframes added/moved/deleted)
        draggedKeyframeFrame, // Force redraw when dragging keyframe to show yellow box
        intervalDrag, // Force redraw when creating interval
        draggedIntervalCurrentFrames, // Force redraw when moving interval to show yellow boxes
        resizingIntervalCurrentFrames, // Force redraw when resizing interval to show yellow boxes
        resizingPromptCurrentFrames, // Force redraw when resizing prompt to show yellow boxes
        hoveredPromptForResize, // Force redraw when hovering over prompt edge with Ctrl to show yellow boxes
        hoveredIntervalForResize, // Force redraw when hovering over interval edge with Ctrl to show yellow boxes
        hoveredKeyframe, // Force redraw when hovering over keyframe with Ctrl to show yellow box
        hoveredSplitPreview, // Force redraw when hovering with Shift to show split preview
        hoveredIntersection, // Force redraw when hovering over intersection
        draggingIntersection, // Force redraw when dragging intersection
        draggingIntersectionCurrentFrame, // Force redraw with yellow box during intersection drag
        zoomLevel, // Force redraw on zoom change
        panOffset, // Force redraw on pan change
        darkMode, // Force redraw on theme change
    ]);
}
//# sourceMappingURL=timeline-render-foreground.js.map