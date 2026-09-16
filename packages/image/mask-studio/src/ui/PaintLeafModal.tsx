// PaintLeafModal.tsx — THE PAINT LEAF FACE (docs/design/paint-
// leaf-canvas.md, stroke 76): a SELF-CONTAINED brush editor for the
// `mask_paint` kind's payload field. Ported from the retired
// studio's usePaintTools BRUSH ARM (pointer → canvas math, view +
// paint overlay, redraw) — the welded stage model, detect buttons,
// and run plane do NOT come along. The payload PNG is the contract
// either way: SAVE writes a data URL into the same field the
// three-source square (upload/drop/pick) writes.
//
// The alpha law (the studio's payload law): strokes render onto a
// TRANSPARENT overlay canvas; the saved PNG's alpha channel IS the
// stroke shape — the LoadImageMask lane reads alpha.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives";
import { PAINT_STROKE_INK } from "../paintInk.ts";

export interface PaintLeafModalProps {
  /** The reference image (an http/data/artifact URL — the card's
   *  input_image, or the existing payload when painting over it).
   *  Empty = a blank 1024 canvas (the brush still works). */
  referenceUrl: string;
  /** The existing payload (painted strokes ride ON TOP when both
   *  are present — the studio's paint-over-payload law). */
  payloadUrl?: string;
  /** SAVE: the payload PNG as a data URL (alpha = strokes). */
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  title?: string;
}

const FIT = 640;

/** Load an image element from a URL (null while loading/failed —
 *  the modal degrades to the blank canvas, never a crash). */
const loadImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (url === "") { resolve(null); return; }
    const img = new Image();
    img.onload = () => { resolve(img); };
    img.onerror = () => { resolve(null); };
    img.src = url;
  });

export function PaintLeafModal(props: PaintLeafModalProps): ReactElement {
  const { referenceUrl, payloadUrl, onSave, onCancel } = props;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  // the TRANSPARENT stroke layer (alpha = the strokes)
  const paintRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const [brushSize, setBrushSize] = useState(28);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [ready, setReady] = useState(false);
  const [viewSize, setViewSize] = useState<{ w: number; h: number } | null>(null);

  // ── the fitted size (the studio's fit law, ported) ──
  useEffect(() => {
    let alive = true;
    void (async () => {
      const img = await loadImage(referenceUrl);
      const pay = payloadUrl ? await loadImage(payloadUrl) : null;
      if (!alive) return;
      imgRef.current = img;
      const w = img?.naturalWidth ?? pay?.naturalWidth ?? 1024;
      const h = img?.naturalHeight ?? pay?.naturalHeight ?? 1024;
      const scale = Math.min(FIT / w, FIT / h, 1);
      setViewSize({ w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) });
      setReady(true);
      // seed the paint layer with the existing payload (paint-over)
      if (pay && paintRef.current) {
        const c = paintRef.current;
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (ctx) { ctx.drawImage(pay, 0, 0); setHasStrokes(true); }
      }
    })();
    return () => { alive = false; };
  }, [referenceUrl, payloadUrl]);

  // ── the view redraw (reference under, strokes over) ──
  const redraw = useCallback(() => {
    const view = viewRef.current;
    const paint = paintRef.current;
    const vs = viewSize;
    if (!view || !paint || !vs) return;
    const img = imgRef.current;
    const w = img?.naturalWidth ?? paint.width;
    const h = img?.naturalHeight ?? paint.height;
    if (w === 0 || h === 0) return;
    view.width = vs.w; view.height = vs.h;
    const ctx = view.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, vs.w, vs.h);
    if (img) ctx.drawImage(img, 0, 0, vs.w, vs.h);
    // strokes scale with the view (the overlay is image-sized)
    ctx.drawImage(paint, 0, 0, vs.w, vs.h);
  }, [viewSize]);

  useEffect(() => { if (ready) redraw(); }, [ready, redraw]);

  // ── pointer → image coords (the studio's toCanvasPoint arm) ──
  const toPoint = (e: React.PointerEvent): { x: number; y: number } | null => {
    const view = viewRef.current;
    const paint = paintRef.current;
    const vs = viewSize;
    if (!view || !paint || !vs) return null;
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

  const strokeTo = (a: { x: number; y: number }, b: { x: number; y: number }): void => {
    // UNREACHABLE-ARM (deleted the `if (!paint) return` guard,
    // 2026-09-16): both callers seat paint on the same tick —
    // onPointerDown only calls after toPoint() (which itself returns
    // null when paint is null), onPointerMove only while a draw
    // started by such a down is active — and the paint canvas never
    // unmounts mid-mount, so paintRef.current is non-null here.
    const paint = paintRef.current as HTMLCanvasElement;
    const img = imgRef.current;
    const w = img?.naturalWidth ?? paint.width;
    const h = img?.naturalHeight ?? paint.height;
    if (paint.width !== w || paint.height !== h) {
      // preserve prior strokes across a late size adopt
      const prior = paint.width > 0 ? paint.toDataURL() : "";
      paint.width = w; paint.height = h;
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
    if (!ctx) return;
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
    setHasStrokes(true);
    redraw();
  };

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) return;
    const p = toPoint(e);
    if (!p) return;
    drawingRef.current = true;
    lastPtRef.current = p;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    strokeTo(p, { x: p.x + 0.01, y: p.y + 0.01 });
  };
  const onPointerMove = (e: React.PointerEvent): void => {
    if (!drawingRef.current) return;
    // UNREACHABLE-ARM (deleted the `if (!p || !last) return` guard,
    // 2026-09-16): drawing is set only by onPointerDown after
    // toPoint() seated p AND last together, and neither the canvas
    // refs nor viewSize can null again before the matching pointer-up
    // (viewSize never resets to null; refs never detach mid-mount) —
    // so p and last are non-null on every move of an active draw.
    const p = toPoint(e) as { x: number; y: number };
    const last = lastPtRef.current as { x: number; y: number };
    strokeTo(last, p);
    lastPtRef.current = p;
  };
  const onPointerUp = (): void => {
    drawingRef.current = false;
    lastPtRef.current = null;
  };

  const clearPaint = (): void => {
    // UNREACHABLE-ARM (deleted the `if (!paint) return` guard,
    // 2026-09-16): Clear only fires from the mounted dialog's button
    // and the paint canvas renders unconditionally beside it, so the
    // ref is seated on every reachable call.
    const paint = paintRef.current as HTMLCanvasElement;
    const ctx = paint.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, paint.width, paint.height);
    setHasStrokes(false);
    redraw();
  };

  const save = (): void => {
    // UNREACHABLE-ARM (deleted the `if (!paint || !hasStrokes)
    // return` guard, 2026-09-16): save has exactly one caller — the
    // Save button, which carries `disabled={!hasStrokes}` (a disabled
    // button never dispatches click: probed in happy-dom, and
    // activation behavior is suppressed in browsers too) — so
    // !hasStrokes is unreachable here; and the paint canvas renders
    // unconditionally beside the button, so paint is non-null.
    onSave((paintRef.current as HTMLCanvasElement).toDataURL("image/png"));
  };

  return (
    <div
      ref={wrapRef}
      role="dialog"
      aria-label={props.title ?? "Paint payload"}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        // THE COLOR LAW (the timeline wall guards this file): the
        // scrim is a token mix, never a literal — the shell's tokens
        // ARE the values.
        background: "color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent)",
      }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: "var(--dsw-alias-bg-layer-1)", color: "var(--dsw-alias-label-primary)", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12, maxHeight: "92vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <strong>{props.title ?? "Paint payload"}</strong>
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
            Brush
            <Input
              type="range"
              min={4}
              max={128}
              step={2}
              value={String(brushSize)}
              onChange={(e: { target: { value: string } }) => { setBrushSize(Number(e.target.value)); }}
            />
            <span style={{ width: 28, textAlign: "right" }}>{brushSize}</span>
          </label>
        </div>
        <canvas
          ref={viewRef}
          data-testid="paint-leaf-view"
          style={{
            display: viewSize === null ? "none" : "block",
            maxWidth: "84vw", maxHeight: "70vh",
            border: "1px solid var(--dsw-alias-border-l2)",
            borderRadius: 4, cursor: "crosshair", touchAction: "none",
            // the transparency preview is a token mix (the law holds
            // for chrome; the STROKE ink stays bitmap-white — canvas
            // data the lane reads, per the wall's exemption note).
            backgroundColor: "var(--dsw-alias-bg-base)",
            background: "repeating-conic-gradient(color-mix(in srgb, var(--dsw-alias-label-secondary) 30%, transparent) 0% 25%, transparent 0% 50%) 50% / 24px 24px",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        <canvas ref={paintRef} style={{ display: "none" }} data-testid="paint-leaf-layer" />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={clearPaint}>Clear</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!hasStrokes} onClick={save}>Save payload</Button>
        </div>
      </div>
    </div>
  );
}
