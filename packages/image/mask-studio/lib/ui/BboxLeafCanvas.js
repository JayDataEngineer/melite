import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// BboxLeafCanvas.tsx — THE BBOX LEAF FACE, EMBEDDED (stroke 78's
// canvas, reworked stroke 95 — the operator's design: the mod
// popup CARRIES the visual preview): the selection canvas that
// renders INSIDE the mod leaf, never a nested modal behind a
// Draw-box button. Ported from the retired modal's welded-stage
// model (pointer → view math, fitted redraw, graceful degrade):
// no image = the blank fitted canvas still takes a rectangle
// (coordinates against the 1024 default, same law). The modal
// chrome died — every committed rectangle reports through
// `onChange` (the leaf's Add/Save/Cancel own the commit).
//
// THE RECTANGLE LAW: the drawn box reports in IMAGE-PIXEL
// coordinates (natural pixels, never view pixels — the view fits,
// the lane reads naturals). A drawn box can also be CLEARED
// (onChange(null) — the caller keeps its unset sentinel; the
// canvas is the face, the four fields are the storage).
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { PAINT_STROKE_INK } from "../paintInk.js";
const FIT = 640;
const loadImage = (url) => new Promise((resolve) => {
    if (url === "") {
        resolve(null);
        return;
    }
    const img = new Image();
    img.onload = () => { resolve(img); };
    img.onerror = () => { resolve(null); };
    img.src = url;
});
export function BboxLeafCanvas(props) {
    const { referenceUrl, value, onChange } = props;
    const viewRef = useRef(null);
    const imgRef = useRef(null);
    const drawingRef = useRef(false);
    const anchorRef = useRef(null);
    // the LIVE rectangle (view coords; null = none drawn this
    // session). The ref mirrors state for the COMMIT path: pointerup
    // is a continuous event — its handler may run before React
    // flushes the last pointermove's setState, so the commit reads
    // the ref (always current), never the closure's state.
    const [rect, setRect] = useState(null);
    const rectRef = useRef(null);
    const liveRect = (r) => {
        rectRef.current = r;
        setRect(r);
    };
    const [ready, setReady] = useState(false);
    const [viewSize, setViewSize] = useState(null);
    // ── the fitted size (the paint face's fit law) ──
    useEffect(() => {
        let alive = true;
        void (async () => {
            const img = await loadImage(referenceUrl);
            if (!alive)
                return;
            imgRef.current = img;
            const w = img?.naturalWidth ?? 1024;
            const h = img?.naturalHeight ?? 1024;
            const scale = Math.min(FIT / w, FIT / h, 1);
            setViewSize({ w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) });
            setReady(true);
        })();
        return () => { alive = false; };
    }, [referenceUrl]);
    const imgDims = useCallback(() => {
        const img = imgRef.current;
        return { w: img?.naturalWidth ?? 1024, h: img?.naturalHeight ?? 1024 };
    }, []);
    // ── view → image scale (the rectangle law: naturals). Every call
    // site owns a live rect — and a rect only exists after an
    // interaction sized it (toView / the ready flip), so viewSize is
    // set wherever this runs. ──
    const viewToImage = useCallback(() => {
        // UNREACHABLE-ARM (the modal's own law, ported verbatim): the
        // seed effect runs only after the ready flip and the commit
        // only fires from a pointer-up on an armed view — both own a
        // fitted view, and viewSize never resets to null mid-mount.
        const vs = viewSize;
        const d = imgDims();
        return { sx: d.w / vs.w, sy: d.h / vs.h };
    }, [viewSize, imgDims]);
    // ── the seeded rectangle (the entry's current box, in view
    // coords, drawn once the view is ready). Fires ONCE per value —
    // the canvas is the face, an external value change (a fresh
    // entry opened) re-seeds; a Clear stays cleared until the value
    // actually changes again. ──
    const seededForRef = useRef("");
    useEffect(() => {
        if (!ready || value === null)
            return;
        const key = JSON.stringify(value);
        if (seededForRef.current === key)
            return;
        seededForRef.current = key;
        const { sx, sy } = viewToImage();
        liveRect({
            x: value.x / sx,
            y: value.y / sy,
            w: value.width / sx,
            h: value.height / sy,
        });
    }, [ready, value, viewToImage]);
    // ── the redraw (image under, rectangle over) ──
    const redraw = useCallback(() => {
        const view = viewRef.current;
        const vs = viewSize;
        if (!view || !vs)
            return;
        view.width = vs.w;
        view.height = vs.h;
        const ctx = view.getContext("2d");
        if (!ctx)
            return;
        ctx.clearRect(0, 0, vs.w, vs.h);
        const img = imgRef.current;
        if (img)
            ctx.drawImage(img, 0, 0, vs.w, vs.h);
        if (rect !== null) {
            ctx.strokeStyle = PAINT_STROKE_INK;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            ctx.setLineDash([]);
        }
    }, [viewSize, rect]);
    useEffect(() => { if (ready)
        redraw(); }, [ready, redraw]);
    // ── pointer → view coords (the paint face's guard shape — one
    // combined check; pre-fit events read null and drop) ──
    const toView = (e) => {
        const view = viewRef.current;
        const vs = viewSize;
        if (!view || !vs)
            return null;
        const r = view.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (view.width / Math.max(1, r.width)),
            y: (e.clientY - r.top) * (view.height / Math.max(1, r.height)),
        };
    };
    const onDown = (e) => {
        const p = toView(e);
        if (!p)
            return;
        drawingRef.current = true;
        anchorRef.current = p;
        liveRect({ x: p.x, y: p.y, w: 0, h: 0 });
        e.target.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
        if (!drawingRef.current)
            return;
        // UNREACHABLE-ARM (the modal's own law, ported verbatim): a
        // draw is active only after onDown seated BOTH the anchor and
        // a live view (toView non-null), and neither the view nor the
        // anchor can null again mid-draw.
        const p = toView(e);
        const a = anchorRef.current;
        liveRect({
            x: Math.min(a.x, p.x),
            y: Math.min(a.y, p.y),
            w: Math.abs(p.x - a.x),
            h: Math.abs(p.y - a.y),
        });
    };
    const onUp = () => {
        if (!drawingRef.current)
            return;
        drawingRef.current = false;
        // THE COMMIT (the embedded law): a finished drag reports the
        // rectangle live — only an armed box (≥1px) commits; a bare
        // click (a 0×0 drag) keeps the previous box.
        const box = rectRef.current;
        if (box === null || box.w < 1 || box.h < 1)
            return;
        const { sx, sy } = viewToImage();
        onChange({
            x: Math.round(box.x * sx),
            y: Math.round(box.y * sy),
            width: Math.round(box.w * sx),
            height: Math.round(box.h * sy),
        });
    };
    const clear = () => {
        liveRect(null);
        redraw();
        onChange(null);
    };
    return (_jsxs("div", { "data-bbox-leaf-canvas": "embedded", style: { display: "flex", flexDirection: "column", gap: 8 }, children: [_jsx("canvas", { ref: viewRef, "data-testid": "bbox-leaf-view", "data-bbox-canvas": "view", style: { maxWidth: "100%", cursor: "crosshair", touchAction: "none", borderRadius: 4, display: "block" }, onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp }), _jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [_jsx("span", { style: { opacity: 0.7, fontSize: 12, flex: 1 }, children: rect !== null && rect.w >= 1 && rect.h >= 1
                            ? `box ${Math.round(rect.w)}×${Math.round(rect.h)} (view px)`
                            : "drag on the image to scope the selection" }), _jsx(Button, { variant: "ghost", onClick: clear, children: "Clear box" })] })] }));
}
//# sourceMappingURL=BboxLeafCanvas.js.map
