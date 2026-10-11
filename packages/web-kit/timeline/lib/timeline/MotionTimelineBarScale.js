/**
 * MotionTimelineBarScale — the bar's ABSOLUTE scale model (split from
 * MotionTimelineBar.tsx, pure move): measure-once pin, zoom,
 * playhead-anchored scroll, frame<->px. Bodies below are the bar's.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAX_PPF, clamp } from "./MotionTimelineBarLayout.js";
/** Ruler ticks over the content (bar line 790): seconds coverage of
 *  the frames plus the trailing lead-out room. */
export function buildTicks(contentW, effPpf, totalFrames, fps) {
    const viewSec = totalFrames / Math.max(1, fps);
    const fullSec = contentW / Math.max(1, effPpf) / Math.max(1, fps);
    const stepSec = viewSec <= 4 ? 0.5 : Math.max(1, Math.ceil(viewSec / 16));
    const ticks = [];
    for (let s = 0; s <= fullSec + 1e-6; s += stepSec)
        ticks.push(Math.round(s * 10) / 10);
    return { ticks, stepSec };
}
/** The bar's zoom/scroll state + converters (bar line 400). */
export function useTimelineScale(opts) {
    const { scrollRef, frameIdx, totalFrames, fps, initialSeconds } = opts;
    // ── Zoom / horizontal scroll — ABSOLUTE ────────────────────────────────
    // 2026-08-16 (user: "the zoom is NOT absolute. It is always the size of
    // the largest card in the timeline"). The scale used to be FIT
    // (boxW / T1), so the ENVELOPE — the largest card's extent — dictated
    // px-per-frame: extend the tail and every card shrank under your
    // cursor; delete one and everything grew. The ppf is now ABSOLUTE:
    // pinned once the box is measured (fit at mount — a fresh doc still
    // fills the width), multiplied by the zoom buttons, and INVARIANT to
    // the document from then on. An envelope that outgrows the viewport
    // SCROLLS; it never rescales. Fit (the % button / zoom-out floor)
    // re-pins to the CURRENT fit — a deliberate act, never a side effect
    // of editing.
    const [boxW, setBoxW] = useState(0);
    const [ppf, setPpf] = useState(null); // null = not pinned yet
    // The readout's DENOMINATOR — the ppf at the last Fit (pinned with it).
    // Ratio against the LIVE fit would drift again the moment the envelope
    // changed (160% → 322% with nobody touching the dial); ratio against the
    // pinned base keeps the dialed number stable while the geometry stays
    // absolute underneath.
    const [basePpf, setBasePpf] = useState(null);
    // SCALE FREEZE DURING A GESTURE (kept: a zoom change mid-gesture would
    // still jar; with absolute ppf it is a no-op unless the user zooms
    // mid-drag, which the freeze then smooths).
    const [dragScale, setDragScale] = useState(null);
    // Playhead-anchored zoom: remember (frame, viewport offset) before the
    // width change; the layout effect restores scrollLeft so that frame stays
    // at the same on-screen x.
    const anchorRef = useRef(null);
    const measure = () => {
        const el = scrollRef.current;
        if (el && el.getBoundingClientRect().width > 0) {
            setBoxW(el.getBoundingClientRect().width);
        }
    };
    useEffect(() => {
        measure();
        // ResizeObserver, not just window.resize: the container's width changes
        // for reasons a window listener never sees (sidebar toggle, card expand,
        // modal mount). A stale boxW floored contentW at a dead size — zoom
        // clicks visibly did nothing until they blew past it. jsdom has no RO.
        let ro = null;
        if (typeof ResizeObserver !== "undefined" && scrollRef.current) {
            ro = new ResizeObserver(() => measure());
            ro.observe(scrollRef.current);
        }
        window.addEventListener("resize", measure);
        return () => {
            ro?.disconnect();
            window.removeEventListener("resize", measure);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Frames 0..T-1 map to 0..T1*effPpf px of content width.
    const T1 = Math.max(0, Math.floor(totalFrames) - 1);
    const fitPpf = boxW > 0 && T1 > 0 ? boxW / T1 : 10;
    // Pin once measured. Container resizes do NOT re-pin —
    // the scale is absolute; only Fit re-pins, deliberately.
    // initialSeconds (2026-09-02): the mount pin shows N SECONDS across
    // the viewport instead of fitting the envelope — an absolute NLE
    // default (DaVinci-style), in BOTH directions: a long doc opens at
    // a readable 10s zoom instead of postage stamps, and a SHORT doc
    // stops blowing up to fill the width (operator: "it starts out too
    // zoomed in" — a fresh 4s doc at fit scale = giant clips). The pin
    // floors at 1px/frame (an absurdly narrow bar can't go sub-pixel).
    useEffect(() => {
        if (boxW > 0 && T1 > 0 && ppf == null) {
            let mount = Math.max(1, fitPpf);
            if (initialSeconds != null && initialSeconds > 0 && fps > 0) {
                mount = Math.max(1, boxW / (initialSeconds * fps));
            }
            setPpf(mount);
            setBasePpf(mount);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [boxW, T1]);
    const effPpf = dragScale ?? ppf ?? Math.max(1, fitPpf);
    // TRAILING ROOM (2026-08-30, user: "the timeline bar doesn't let me go
    // past the end"): the content width used to END exactly at the last
    // frame — no scroll room past the end, so the pull-the-tail extend
    // gesture hit a visual wall (keepTailVisible clamps at scrollWidth)
    // and double-click-to-add had no empty space to land in. Every NLE
    // gives the sequence lead-out room: content = frames + trailing gap
    // (≥35% of the viewport, ≥240px). The empty area is scrollable,
    // droppable (onPromptAdd), and the tail drag grows into it while
    // onExtend round-trips the bigger envelope.
    const LEAD_OUT = Math.max(240, boxW * 0.35);
    const contentW = Math.max(boxW, T1 * effPpf + LEAD_OUT);
    const frameToPx = (f) => f * effPpf;
    const zoom = (factor) => {
        const el = scrollRef.current;
        if (el)
            anchorRef.current = { frame: frameIdx, off: frameToPx(frameIdx) - el.scrollLeft };
        const cur = ppf ?? Math.max(1, fitPpf);
        const next = cur * factor;
        // At/below the CURRENT fit floors to fit (re-pinned AND re-based there
        // — an honest 100%, never a phantom); the absolute ceiling keeps short
        // motions from exploding the content width.
        if (next <= fitPpf * 1.0001) {
            setPpf(Math.max(1, fitPpf));
            setBasePpf(Math.max(1, fitPpf));
        }
        else {
            setPpf(Math.min(MAX_PPF, next));
        }
    };
    useLayoutEffect(() => {
        const el = scrollRef.current;
        const a = anchorRef.current;
        if (el && a)
            el.scrollLeft = Math.max(0, a.frame * effPpf - a.off);
        anchorRef.current = null;
    }, [effPpf]);
    // Client x → frame: content coordinates (scrollLeft included — the ruler
    // and lanes live INSIDE the scrolled strip).
    const frameAt = (clientX) => {
        const el = scrollRef.current;
        if (!el)
            return null;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 && boxW <= 0)
            return null;
        const x = clientX - r.left + el.scrollLeft;
        return Math.round(x / effPpf); // UNclamped: callers clamp (the tail
        // extend legitimately reads frames PAST T1).
    };
    const xToFrame = (clientX) => {
        const f = frameAt(clientX);
        return f == null ? null : clamp(f, 0, T1);
    };
    // Keep the card's right end INSIDE the viewport while its tail is pulled
    // (2026-08-14, user: "during this drag expand I should always let me see
    // the right side end of the prompt card"). Zoomed in, the growing content
    // pushes the end past the right edge — pan so it sits 24px inside. No-op
    // at fit (content always == viewport, max scroll = 0).
    const keepTailVisible = (endFrame) => {
        const el = scrollRef.current;
        if (!el)
            return;
        const r = el.getBoundingClientRect();
        if (r.width <= 0)
            return;
        const rightPx = endFrame * effPpf;
        if (rightPx > el.scrollLeft + r.width - 24) {
            const max = Math.max(0, el.scrollWidth - r.width);
            el.scrollLeft = Math.min(max, rightPx - r.width + 24);
        }
    };
    return {
        boxW,
        ppf,
        setPpf,
        basePpf,
        setBasePpf,
        dragScale,
        setDragScale,
        anchorRef,
        T1,
        fitPpf,
        effPpf,
        contentW,
        frameToPx,
        frameAt,
        xToFrame,
        zoom,
        keepTailVisible,
    };
}
//# sourceMappingURL=MotionTimelineBarScale.js.map