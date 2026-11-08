import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TimelineScrollbar — the timeline's scrollbar + zoom chrome,
 * MELITE-AUTHORED. Re-homed out of the vendored
 * `viser-timeline/timeline-overlays.tsx` 2026-11-05 (F2, the nativity
 * audit): the section was never upstream code — it renders the estate's
 * DSH Button + card-base Tip, imports the kit's own CSS module, and
 * carries estate testids and copy. Housing it here returns the vendored
 * files to upstream-only content, so a later upstream pull diffs clean;
 * the zoom copy rides `timelineCopy.ts` (one owner — the dictionary
 * already held `zoomOutAria`/`zoomInAria` beside the overlays' literals).
 * The scrollbar body moved verbatim; only the imports and the zoom seats
 * (now `TimelineZoomCluster`) changed.
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { Tip } from "@melite/card-base/client";
import { SCROLLBAR_HEIGHT } from "./viser-timeline/timeline-overlays.js";
import { getZoomEnvelopeEndFrame } from "./viser-timeline/timeline-scales.js";
import { timelineCopy } from "../timelineCopy.js";
import css from "./timeline.module.css";
/** The three zoom seats — zoom out, fit-to-window, zoom in. The copy is
 *  the dictionary's (`zoomOutAria`/`zoomInAria` predate this file; the
 *  fit pair joins them), not this module's. */
export function TimelineZoomCluster(props) {
    const { zoomBy, resetZoom } = props;
    return (_jsxs(_Fragment, { children: [_jsx(Tip, { tip: timelineCopy.zoomOutAria, children: _jsx(Button, { variant: "ghost", size: "sm", "data-testid": "timeline-zoom-out", onClick: () => zoomBy(1 / 1.5), "aria-label": timelineCopy.zoomOutAria, className: css.miniBtn, style: { padding: 0 }, children: "\u2212" }) }), _jsx(Tip, { tip: timelineCopy.zoomFitTip, children: _jsx(Button, { variant: "ghost", size: "sm", "data-testid": "timeline-zoom-fit", onClick: resetZoom, "aria-label": timelineCopy.zoomFitTip, className: css.miniFitBtn, children: timelineCopy.zoomFitLabel }) }), _jsx(Tip, { tip: timelineCopy.zoomInAria, children: _jsx(Button, { variant: "ghost", size: "sm", "data-testid": "timeline-zoom-in", onClick: () => zoomBy(1.5), "aria-label": timelineCopy.zoomInAria, className: css.miniBtn, style: { padding: 0 }, children: "+" }) })] }));
}
export function TimelineScrollbar(props) {
    const { timelineState, zoomLevel, panOffset, darkMode, scrollbarTrackRef, onScrollbarTrackMouseDown, onScrollbarThumbMouseDown, zoomBy, resetZoom } = props;
    // ── Horizontal scrollbar geometry ─────────────────────────────────
    // The thumb covers the visible window as a fraction of the full frame
    // range; it shrinks as the user zooms in. Show only when there are
    // off-screen frames to reach (maxPan > 0.5 frame).
    const scrollEnvelopeEnd = getZoomEnvelopeEndFrame(timelineState);
    const scrollTotalFrames = Math.max(1, scrollEnvelopeEnd - timelineState.start_frame + 1);
    const scrollVisibleFrames = scrollTotalFrames / zoomLevel;
    const scrollMaxPan = Math.max(0, scrollTotalFrames - scrollVisibleFrames);
    // Always visible — the wheel-only pan is undiscoverable + buggy. At zoom 1
    // the thumb fills the track (nothing to scroll); it shrinks as you zoom in.
    // Cap at 97% even at zoom 1 so the thumb is always visually distinct from
    // the track (a solid bar reads as a divider, not a scrollbar).
    const showScrollbar = true;
    const rawThumbPct = Math.min(97, Math.max(8, (scrollVisibleFrames / scrollTotalFrames) * 100));
    const thumbWidthPct = rawThumbPct;
    const thumbLeftPct = scrollMaxPan > 0
        ? (panOffset / scrollMaxPan) * (100 - thumbWidthPct)
        : (100 - thumbWidthPct) / 2; // center when non-scrollable
    return (_jsx(_Fragment, { children: showScrollbar && (_jsxs("div", { style: {
                display: "flex",
                alignItems: "center",
                gap: 4,
                width: "100%",
                height: `${SCROLLBAR_HEIGHT + 4}px`,
                padding: "0 2px",
                backgroundColor: darkMode ? "rgba(13,21,32,0.6)" : "rgba(0,0,0,0.04)", // blue-1 tint (theme --blue-1 #0d1520)
                borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
            }, children: [_jsx("div", { ref: scrollbarTrackRef, "data-testid": "timeline-scrollbar-track", onMouseDown: onScrollbarTrackMouseDown, style: {
                        position: "relative",
                        flex: 1,
                        height: `${SCROLLBAR_HEIGHT}px`,
                        backgroundColor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
                        cursor: "pointer",
                        borderRadius: "4px",
                    }, children: _jsx("div", { "data-testid": "timeline-scrollbar-thumb", onMouseDown: onScrollbarThumbMouseDown, style: {
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            left: `${thumbLeftPct}%`,
                            width: `${thumbWidthPct}%`,
                            backgroundColor: darkMode
                                ? "rgba(176, 180, 186, 0.9)" // --slate-11 #b0b4ba @ 90%
                                : "rgba(100, 105, 120, 0.75)",
                            border: `1px solid ${darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`,
                            borderRadius: "4px",
                            cursor: "grab",
                            boxShadow: darkMode ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
                            transition: "background-color 0.15s",
                        }, onMouseEnter: (e) => {
                            e.currentTarget.style.backgroundColor = darkMode
                                ? "rgba(237, 238, 240, 0.95)" // --slate-12 #edeef0
                                : "rgba(80, 85, 100, 0.9)";
                        }, onMouseLeave: (e) => {
                            e.currentTarget.style.backgroundColor = darkMode
                                ? "rgba(176, 180, 186, 0.9)"
                                : "rgba(100, 105, 120, 0.75)";
                        } }) }), _jsx(TimelineZoomCluster, { zoomBy: zoomBy, resetZoom: resetZoom })] })) }));
}
//# sourceMappingURL=TimelineScrollbar.js.map
