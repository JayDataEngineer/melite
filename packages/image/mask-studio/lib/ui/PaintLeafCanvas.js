import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// PaintLeafCanvas.tsx — THE PAINT LEAF FACE, EMBEDDED (dev_docs/design/
// paint-leaf-canvas.md, stroke 76; the stroke-95 embed rework — the
// operator's design: the mod popup CARRIES the visual preview): the
// brush canvas that renders INSIDE the mod leaf, never a nested
// modal behind a Paint button. Ported from the retired modal's
// core (pointer → canvas math, view + paint overlay, redraw); the
// modal chrome (backdrop, Save/Cancel) died — the leaf's own
// Add/Save/Cancel own the commit, and every committed stroke
// reports through `onChange` live (the payload field IS the
// contract — the same field the three-source square writes).
//
// The alpha law (the studio's payload law): strokes render onto a
// TRANSPARENT overlay canvas; the saved PNG's alpha channel IS the
// stroke shape — the LoadImageMask lane reads alpha.
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives";
import { PAINT_STROKE_INK } from "../paintInk.js";
const FIT = 640;
/** Load an image element from a URL (null while loading/failed —
 *  the canvas degrades to the blank 1024 fit, never a crash). */
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
export function PaintLeafCanvas(props) {
    const { referenceUrl, value, onChange } = props;
    const viewRef = useRef(null);
    // the TRANSPARENT stroke layer (alpha = the strokes)
    const paintRef = useRef(null);
    const imgRef = useRef(null);
    const drawingRef = useRef(false);
    const lastPtRef = useRef(null);
    const [brushSize, setBrushSize] = useState(28);
    const [hasStrokes, setHasStrokes] = useState(false);
    // the strokes REF MIRROR (the commit gate): pointerup is a
    // continuous event — its closure may hold stale state, and a
    // stroke that never landed (no 2d context, a guarded draw) must
    // NEVER commit a blank payload over the field's value.
    const hasStrokesRef = useRef(false);
    const [ready, setReady] = useState(false);
    const [viewSize, setViewSize] = useState(null);
    // ── the fitted size + the stroke-layer seed (the paint-over law:
    //  the existing payload's strokes ride ON TOP when present) ──
    useEffect(() => {
        let alive = true;
        void (async () => {
            const img = await loadImage(referenceUrl);
            const pay = value !== "" ? await loadImage(value) : null;
            if (!alive)
                return;
            imgRef.current = img;
            const w = img?.naturalWidth ?? pay?.naturalWidth ?? 1024;
            const h = img?.naturalHeight ?? pay?.naturalHeight ?? 1024;
            const scale = Math.min(FIT / w, FIT / h, 1);
            setViewSize({ w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) });
            setReady(true);
            // seed the paint layer with the existing payload (paint-over)
            if (pay && paintRef.current) {
                const c = paintRef.current;
                c.width = w;
                c.height = h;
                const ctx = c.getContext("2d");
                if (ctx) {
                    ctx.drawImage(pay, 0, 0);
                    hasStrokesRef.current = true;
                    setHasStrokes(true);
                }
            }
        })();
        return () => { alive = false; };
    }, [referenceUrl, value]);
    // ── the view redraw (reference under, strokes over) ──
    const redraw = useCallback(() => {
        const view = viewRef.current;
        const paint = paintRef.current;
        const vs = viewSize;
        if (!view || !paint || !vs)
            return;
        const img = imgRef.current;
        const w = img?.naturalWidth ?? paint.width;
        const h = img?.naturalHeight ?? paint.height;
        if (w === 0 || h === 0)
            return;
        view.width = vs.w;
        view.height = vs.h;
        const ctx = view.getContext("2d");
        if (!ctx)
            return;
        ctx.clearRect(0, 0, vs.w, vs.h);
        if (img)
            ctx.drawImage(img, 0, 0, vs.w, vs.h);
        // strokes scale with the view (the overlay is image-sized)
        ctx.drawImage(paint, 0, 0, vs.w, vs.h);
    }, [viewSize]);
    useEffect(() => { if (ready)
        redraw(); }, [ready, redraw]);
    // ── pointer → image coords (the studio's toCanvasPoint arm) ──
    const toPoint = (e) => {
        const view = viewRef.current;
        const paint = paintRef.current;
        const vs = viewSize;
        if (!view || !paint || !vs)
            return null;
        const rect = view.getBoundingClientRect();
        const sx = vs.w / Math.max(1, rect.width);
        const sy = vs.h / Math.max(1, rect.height);
        const img = imgRef.current;
        const w = img?.naturalWidth ?? paint.width;
        const h = img?.naturalHeight ?? paint.height;
        return {
            x: ((e.clientX - rect.left) * sx) * (w / vs.w),
            y: ((e.clientY - rect.top) * sy) * (h / vs.h),
        };
    };
    const strokeTo = (a, b) => {
        // UNREACHABLE-ARM (the modal's own law, ported verbatim): both
        // callers seat paint on the same tick — onPointerDown only
        // calls after toPoint() (which itself returns null when paint
        // is null), onPointerMove only while a draw started by such a
        // down is active — and the paint canvas never unmounts
        // mid-mount, so paintRef.current is non-null here.
        const paint = paintRef.current;
        const img = imgRef.current;
        const w = img?.naturalWidth ?? paint.width;
        const h = img?.naturalHeight ?? paint.height;
        if (paint.width !== w || paint.height !== h) {
            // preserve prior strokes across a late size adopt
            const prior = paint.width > 0 ? paint.toDataURL() : "";
            paint.width = w;
            paint.height = h;
            if (prior !== "") {
                const restore = new Image();
                restore.onload = () => {
                    const ctx = paint.getContext("2d");
                    ctx?.drawImage(restore, 0, 0);
                };
                restore.src = prior;
            }
        }
        const ctx = paint.getContext("2d");
        if (!ctx)
            return;
        // the brush scales with the image so a stroke reads the same at
        // any source resolution (the studio's brush law)
        const scale = Math.max(w, h) / 1024;
        ctx.strokeStyle = PAINT_STROKE_INK;
        ctx.lineWidth = brushSize * Math.max(scale, 0.25);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        hasStrokesRef.current = true;
        setHasStrokes(true);
        redraw();
    };
    const onPointerDown = (e) => {
        if (e.button !== 0)
            return;
        const p = toPoint(e);
        if (!p)
            return;
        drawingRef.current = true;
        lastPtRef.current = p;
        e.target.setPointerCapture?.(e.pointerId);
        strokeTo(p, { x: p.x + 0.01, y: p.y + 0.01 });
    };
    const onPointerMove = (e) => {
        if (!drawingRef.current)
            return;
        // UNREACHABLE-ARM (the modal's own law, ported verbatim):
        // drawing is set only by onPointerDown after toPoint() seated
        // p AND last together, and neither the canvas refs nor
        // viewSize can null again before the matching pointer-up — so
        // p and last are non-null on every move of an active draw.
        const p = toPoint(e);
        const last = lastPtRef.current;
        strokeTo(last, p);
        lastPtRef.current = p;
    };
    const onPointerUp = () => {
        if (!drawingRef.current)
            return;
        drawingRef.current = false;
        lastPtRef.current = null;
        // THE COMMIT (the embedded law): a finished stroke reports
        // live — the payload field the leaf saves IS this canvas. A
        // draw whose stroke never landed (the degrade guards) commits
        // NOTHING — an empty gesture never wipes the payload.
        if (!hasStrokesRef.current)
            return;
        onChange(paintRef.current.toDataURL("image/png"));
    };
    const clearPaint = () => {
        // UNREACHABLE-ARM (the modal's own law, ported verbatim):
        // Clear only fires from the mounted canvas's toolbar button
        // and the paint layer renders unconditionally beside it, so
        // the ref is seated on every reachable call.
        const paint = paintRef.current;
        const ctx = paint.getContext("2d");
        if (ctx)
            ctx.clearRect(0, 0, paint.width, paint.height);
        hasStrokesRef.current = false;
        setHasStrokes(false);
        redraw();
        onChange("");
    };
    return (_jsxs("div", { "data-paint-leaf-canvas": "embedded", style: { display: "flex", flexDirection: "column", gap: 8 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 6 }, children: ["Brush", _jsx(Input, { type: "range", "aria-label": "Brush size", min: 4, max: 128, step: 2, value: String(brushSize), onChange: (e) => { setBrushSize(Number(e.target.value)); } }), _jsx("span", { style: { width: 28, textAlign: "right" }, children: brushSize })] }), _jsx("span", { style: { opacity: 0.7, fontSize: 12, flex: 1 }, children: hasStrokes ? "strokes paint the mask (alpha = the mask)" : "drag on the image to paint the mask" }), _jsx(Button, { variant: "ghost", onClick: clearPaint, children: "Clear" })] }), _jsx("canvas", { ref: viewRef, "data-testid": "paint-leaf-view", style: {
                    display: viewSize === null ? "none" : "block",
                    maxWidth: "100%",
                    border: "1px solid var(--dsw-alias-border-l2)",
                    borderRadius: 4, cursor: "crosshair", touchAction: "none",
                    // the transparency preview is a token mix (the color law;
                    // the STROKE ink stays bitmap-white — canvas data the
                    // lane reads, per the wall's exemption note).
                    backgroundColor: "var(--dsw-alias-bg-base)",
                    background: "repeating-conic-gradient(color-mix(in srgb, var(--dsw-alias-label-secondary) 30%, transparent) 0% 25%, transparent 0% 50%) 50% / 24px 24px",
                }, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp, onPointerLeave: onPointerUp }), _jsx("canvas", { ref: paintRef, style: { display: "none" }, "data-testid": "paint-leaf-layer" })] }));
}
//# sourceMappingURL=PaintLeafCanvas.js.map
