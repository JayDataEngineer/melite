// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { useCallback, useEffect, useRef, useState } from "react";
import { KEYFRAME_RADIUS, TRACK_LABEL_WIDTH } from "./constants.js";
import { getZoomEnvelopeEndFrame } from "./timeline-scales.js";
export function useTimelineViewport(args) {
    const { timelineState, interaction } = args;
    const { canvasRef, containerRef, hoveredIntersection, setHoveredIntersection } = interaction;
    const [resizeRevision, setResizeRevision] = useState(0);
    const [canvasSize, setCanvasSize] = useState({
        width: 0,
        height: 0,
        dpr: 1,
    });
    // Zoom and pan state
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = fit to window, >1 = zoomed in
    const [panOffset, setPanOffset] = useState(0); // Offset in frames
    const didInitZoomRef = useRef(false);
    const lastInitZoomConfigRef = useRef(null);
    const didUserAdjustViewRef = useRef(false);
    const lastZoomDefaultsRef = useRef(null);
    const zoomLevelRef = useRef(zoomLevel);
    const panOffsetRef = useRef(panOffset);
    const scrollbarTrackRef = useRef(null);
    const scrollbarDragRef = useRef(null);
    useEffect(() => {
        zoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);
    useEffect(() => {
        panOffsetRef.current = panOffset;
    }, [panOffset]);
    // Native non-passive wheel listener: React's onWheel is passive (attached
    // at the root in React 17+), so e.preventDefault() inside the React handler
    // is a no-op and the PAGE scrolls instead of the timeline panning. This
    // capture listener prevents the default scroll so wheel-over-timeline =
    // pan/zoom, not page-jump. The React onWheel above still drives the actual
    // pan/zoom logic.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const preventScroll = (e) => { e.preventDefault(); };
        canvas.addEventListener("wheel", preventScroll, { passive: false });
        return () => canvas.removeEventListener("wheel", preventScroll);
    }, []);
    // Initialize zoom so we start by showing [start_frame, start_frame + default_num_frames_zoom].
    useEffect(() => {
        if (!timelineState)
            return;
        const { start_frame, end_frame, default_num_frames_zoom, max_frames_zoom } = timelineState;
        const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
        const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
        const configKey = `${start_frame}|${end_frame}|${default_num_frames_zoom ?? ""}|${max_frames_zoom ?? ""}`;
        const configUnchanged = lastInitZoomConfigRef.current === configKey;
        const zoomDefaultsKey = `${default_num_frames_zoom ?? ""}|${max_frames_zoom ?? ""}`;
        const zoomDefaultsChanged = lastZoomDefaultsRef.current !== null && lastZoomDefaultsRef.current !== zoomDefaultsKey;
        // Don't override the user's view once they've manually panned/zoomed.
        // But if the user hasn't interacted yet, allow updates (e.g., a later Python `set_defaults()`)
        // to re-initialize zoom.
        //
        // Exception: if the server explicitly changes the zoom defaults (e.g. loading a new motion/example),
        // we do want to re-initialize so the viewport adapts.
        if (didInitZoomRef.current && ((didUserAdjustViewRef.current && !zoomDefaultsChanged) || configUnchanged)) {
            return;
        }
        const initialVisible = Math.max(1, Math.min(default_num_frames_zoom ?? 300, max_frames_zoom ?? 1000, totalFrames));
        // Previously this was hard-clamped to 20, which prevents `default_num_frames_zoom`
        // from taking effect for large ranges. Allow zoom up to "1 visible frame" if desired.
        const maxZoomLevel = Math.max(20, totalFrames);
        const newZoomLevel = Math.max(1, Math.min(maxZoomLevel, totalFrames / initialVisible));
        setZoomLevel(newZoomLevel);
        setPanOffset(0);
        didInitZoomRef.current = true;
        lastInitZoomConfigRef.current = configKey;
        lastZoomDefaultsRef.current = zoomDefaultsKey;
    }, [
        timelineState?.start_frame,
        timelineState?.end_frame,
        timelineState?.default_num_frames_zoom,
        timelineState?.max_frames_zoom,
    ]);
    const scrollModeRef = useRef(null); // Lock scroll mode during gesture
    const scrollTimeoutRef = useRef(null); // Detect when scrolling ends
    const lastScrollTimeRef = useRef(0); // Track time of last scroll event
    const lastScrollDeltaRef = useRef(0); // Track delta of last scroll event for velocity
    const scrollVelocityRef = useRef(0); // Track scroll velocity to detect new gestures
    // Clear hover states when prompts change (e.g., when a prompt is deleted)
    useEffect(() => {
        if (!timelineState)
            return;
        // If we're hovering over an intersection, check if it still exists
        if (hoveredIntersection) {
            const leftPromptExists = timelineState.prompts?.some(p => p.uuid === hoveredIntersection.leftPromptId);
            const rightPromptExists = timelineState.prompts?.some(p => p.uuid === hoveredIntersection.rightPromptId);
            // If either prompt no longer exists, clear the hover state
            if (!leftPromptExists || !rightPromptExists) {
                setHoveredIntersection(null);
            }
        }
    }, [timelineState?.prompts, hoveredIntersection]);
    const handleWheel = useCallback((e) => {
        if (!timelineState)
            return;
        const { start_frame } = timelineState;
        const envelopeEndFrame = getZoomEnvelopeEndFrame(timelineState);
        const totalFrames = Math.max(1, envelopeEndFrame - start_frame + 1);
        // Calculate scroll velocity to detect new gestures
        const now = Date.now();
        const timeDelta = now - lastScrollTimeRef.current;
        const scrollDelta = Math.abs(e.deltaY);
        // Calculate velocity (pixels per ms)
        const currentVelocity = timeDelta > 0 ? scrollDelta / timeDelta : 0;
        const lastVelocity = scrollVelocityRef.current;
        // Detect new gesture: velocity increases significantly (user actively scrolling)
        // OR first scroll after a long pause
        const isNewGesture = timeDelta > 200 || (lastVelocity > 0 && currentVelocity > lastVelocity * 1.5);
        // Update tracking refs
        lastScrollTimeRef.current = now;
        lastScrollDeltaRef.current = scrollDelta;
        scrollVelocityRef.current = currentVelocity;
        // Determine scroll mode
        let scrollMode;
        const desiredMode = e.shiftKey ? 'zoom' : 'pan'; // Reversed: scroll = pan, shift+scroll = zoom
        if (scrollModeRef.current === null || isNewGesture) {
            // New scroll gesture - lock the mode based on current shift key state
            scrollMode = desiredMode;
            scrollModeRef.current = scrollMode;
        }
        else {
            // Ongoing scroll (momentum) - keep using locked mode, ignore shift key changes
            scrollMode = scrollModeRef.current;
        }
        // Clear any existing timeout and set a new one to detect when scrolling ends
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            scrollModeRef.current = null; // Unlock mode when scrolling stops
            scrollVelocityRef.current = 0; // Reset velocity
        }, 200); // 200ms after last scroll event
        if (scrollMode === 'pan') {
            // Pan left/right - allow at any zoom level for infinite scrolling
            e.preventDefault();
            didUserAdjustViewRef.current = true;
            // Use actual scroll speed (deltaY) and scale it to frame units
            const panSpeedScale = 0.1; // Adjust this to control sensitivity
            const panSpeed = e.deltaY * panSpeedScale;
            const newPanOffset = panOffset + panSpeed;
            // Allow infinite scrolling to the right, only limit scrolling left
            setPanOffset(Math.max(0, newPanOffset));
        }
        else {
            // Zoom in/out
            e.preventDefault();
            didUserAdjustViewRef.current = true;
            const zoomSpeed = 0.001;
            const zoomDelta = -e.deltaY * zoomSpeed;
            const maxZoomLevel = Math.max(20, totalFrames);
            const newZoomLevel = Math.max(1, Math.min(maxZoomLevel, zoomLevel * (1 + zoomDelta)));
            // Anchor zoom so the current frame (blue box) doesn't move when it's visible.
            // If the current frame isn't visible, fall back to cursor-centered zoom.
            const canvas = canvasRef.current;
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const visibleFrames = totalFrames / zoomLevel;
                const viewStartFrame = start_frame + panOffset;
                const pixelRange = (rect.width - TRACK_LABEL_WIDTH - 2 * KEYFRAME_RADIUS) / visibleFrames;
                const viewEndFrame = viewStartFrame + visibleFrames;
                let anchorFrame;
                let anchorRelativePosition;
                const currentFrame = timelineState.current_frame;
                if (currentFrame >= viewStartFrame && currentFrame <= viewEndFrame) {
                    anchorFrame = currentFrame;
                    anchorRelativePosition = (anchorFrame - viewStartFrame) / visibleFrames;
                }
                else {
                    const mouseX = e.clientX - rect.left;
                    const adjustedX = mouseX - TRACK_LABEL_WIDTH - 2 * KEYFRAME_RADIUS;
                    anchorFrame = adjustedX / pixelRange + viewStartFrame;
                    anchorRelativePosition = (anchorFrame - viewStartFrame) / visibleFrames;
                }
                // Calculate new pan offset to keep the mouse position fixed in frame space
                const newVisibleFrames = totalFrames / newZoomLevel;
                const newViewStartFrame = anchorFrame - anchorRelativePosition * newVisibleFrames;
                const newPanOffset = newViewStartFrame - start_frame;
                // Allow infinite scrolling to the right, only limit scrolling left
                setZoomLevel(newZoomLevel);
                setPanOffset(Math.max(0, newPanOffset));
            }
            else {
                setZoomLevel(newZoomLevel);
            }
        }
    }, [timelineState, zoomLevel, panOffset, canvasSize.width]);
    // Drag the scrollbar thumb → pan. Pixels→fraction of total range→frames.
    // Uses refs for zoom/pan so the drag math stays correct mid-gesture.
    const onScrollbarThumbMouseDown = useCallback((e) => {
        if (!timelineState)
            return;
        e.preventDefault();
        e.stopPropagation();
        const envelopeEnd = getZoomEnvelopeEndFrame(timelineState);
        const total = Math.max(1, envelopeEnd - timelineState.start_frame + 1);
        const visible = total / zoomLevelRef.current;
        const maxPan = Math.max(0, total - visible);
        scrollbarDragRef.current = { startX: e.clientX, startPan: panOffsetRef.current };
        const onMove = (ev) => {
            const drag = scrollbarDragRef.current;
            const track = scrollbarTrackRef.current;
            if (!drag || !track)
                return;
            const trackRect = track.getBoundingClientRect();
            if (trackRect.width <= 0)
                return;
            const deltaFraction = (ev.clientX - drag.startX) / trackRect.width;
            const deltaFrames = deltaFraction * total;
            const nextPan = Math.max(0, Math.min(maxPan, drag.startPan + deltaFrames));
            setPanOffset(nextPan);
        };
        const onUp = () => {
            scrollbarDragRef.current = null;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [timelineState]);
    // Click on the track (not the thumb) → center the visible window on the
    // clicked frame, i.e. jump the thumb so its middle matches the click X.
    const onScrollbarTrackMouseDown = useCallback((e) => {
        if (e.target !== e.currentTarget)
            return; // thumb handles its own mousedown
        if (!timelineState)
            return;
        const track = scrollbarTrackRef.current;
        if (!track)
            return;
        const envelopeEnd = getZoomEnvelopeEndFrame(timelineState);
        const total = Math.max(1, envelopeEnd - timelineState.start_frame + 1);
        const visible = total / zoomLevelRef.current;
        const maxPan = Math.max(0, total - visible);
        const trackRect = track.getBoundingClientRect();
        const clickFraction = trackRect.width > 0 ? (e.clientX - trackRect.left) / trackRect.width : 0;
        const targetCenterPan = clickFraction * total - visible / 2;
        setPanOffset(Math.max(0, Math.min(maxPan, targetCenterPan)));
    }, [timelineState]);
    // Zoom by a factor, keeping the CENTER of the visible window fixed so the
    // frame you're looking at stays on screen. This is the non-wheel zoom path
    // (the wheel-only zoom is undiscoverable + buggy per user feedback).
    const zoomBy = useCallback((factor) => {
        if (!timelineState)
            return;
        const envelopeEnd = getZoomEnvelopeEndFrame(timelineState);
        const total = Math.max(1, envelopeEnd - timelineState.start_frame + 1);
        const maxZoom = Math.max(20, total);
        const curZoom = zoomLevelRef.current;
        const newZoom = Math.max(1, Math.min(maxZoom, curZoom * factor));
        if (newZoom === curZoom)
            return;
        const visibleBefore = total / curZoom;
        const centerFrame = timelineState.start_frame + panOffsetRef.current + visibleBefore / 2;
        const visibleAfter = total / newZoom;
        const newPan = Math.max(0, centerFrame - timelineState.start_frame - visibleAfter / 2);
        setZoomLevel(newZoom);
        setPanOffset(newPan);
        didUserAdjustViewRef.current = true;
    }, [timelineState]);
    const resetZoom = useCallback(() => {
        setZoomLevel(1);
        setPanOffset(0);
        didUserAdjustViewRef.current = true;
    }, []);
    // Set up canvas size
    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) {
            return;
        }
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const resizeCanvas = () => {
            if (!container || !canvas)
                return;
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            // Only update if dimensions are non-zero
            if (rect.width === 0 || rect.height === 0)
                return;
            // Set actual canvas buffer size scaled by DPR for crisp rendering.
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            // Ensure CSS dimensions stay in logical pixels.
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            // Trigger redraw by updating state.
            setCanvasSize({ width: rect.width, height: rect.height, dpr });
            setResizeRevision(prev => prev + 1);
        };
        // Size immediately
        resizeCanvas();
        // Observe the CONTAINER for size changes (not the canvas)
        const resizeObserver = new ResizeObserver(resizeCanvas);
        resizeObserver.observe(container);
        // Also listen to window resize events for more reliable updates
        window.addEventListener('resize', resizeCanvas);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', resizeCanvas);
            // Clean up scroll timeout on unmount
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [timelineState?.enabled]); // Re-run when timeline becomes enabled
    return { resizeRevision, canvasSize, zoomLevel, setZoomLevel, panOffset, setPanOffset,
        zoomLevelRef, panOffsetRef, didUserAdjustViewRef, scrollbarTrackRef, handleWheel,
        onScrollbarThumbMouseDown, onScrollbarTrackMouseDown, zoomBy, resetZoom };
}
//# sourceMappingURL=timeline-viewport.js.map