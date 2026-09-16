// BboxLeafModal.tsx — THE BBOX LEAF FACE (stroke 78, the mods-
// abstraction law): a SELF-CONTAINED selection editor for the
// bbox-canvas kinds (sam2/sam3) — an image preview the user drags
// a rectangle on. Ported from the same welded-stage model as
// PaintLeafModal (pointer → view math, fitted redraw, graceful
// degrade): no image = the blank fitted canvas still takes a
// rectangle (coordinates against the 1024 default, same law).
//
// THE RECTANGLE LAW: the drawn box saves in IMAGE-PIXEL
// coordinates (natural pixels, never view pixels — the view fits,
// the lane reads naturals). A drawn box can also be CLEARED
// (Save with no rectangle = the caller keeps the four inputs'
// values; the verb's null never overwrites — the four number
// inputs remain the source of truth when unset).
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { PAINT_STROKE_INK } from "../paintInk.ts";

export interface BboxLeafModalProps {
  /** The image the rectangle selects ON (the card's input_image).
   *  Empty = a blank 1024 canvas (the rectangle still works). */
  referenceUrl: string;
  /** The entry's current rectangle (null = a fresh draw). */
  bbox: { x: number; y: number; width: number; height: number } | null;
  /** SAVE: the rectangle in image pixels (rounded). */
  onSave: (bbox: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
  title?: string;
}

const FIT = 640;

const loadImage = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (url === "") { resolve(null); return; }
    const img = new Image();
    img.onload = () => { resolve(img); };
    img.onerror = () => { resolve(null); };
    img.src = url;
  });

export function BboxLeafModal(props: BboxLeafModalProps): ReactElement {
  const { referenceUrl, bbox, onSave, onCancel } = props;
  const viewRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef(false);
  const anchorRef = useRef<{ x: number; y: number } | null>(null);
  // the LIVE rectangle (view coords; null = none drawn this session)
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [viewSize, setViewSize] = useState<{ w: number; h: number } | null>(null);

  // ── the fitted size (the paint face's fit law) ──
  useEffect(() => {
    let alive = true;
    void (async () => {
      const img = await loadImage(referenceUrl);
      if (!alive) return;
      imgRef.current = img;
      const w = img?.naturalWidth ?? 1024;
      const h = img?.naturalHeight ?? 1024;
      const scale = Math.min(FIT / w, FIT / h, 1);
      setViewSize({ w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) });
      setReady(true);
    })();
    return () => { alive = false; };
  }, [referenceUrl]);

  const imgDims = useCallback((): { w: number; h: number } => {
    const img = imgRef.current;
    return { w: img?.naturalWidth ?? 1024, h: img?.naturalHeight ?? 1024 };
  }, []);

  // ── view → image scale (the rectangle law: naturals). Every call
  // site owns a live rect — and a rect only exists after an
  // interaction sized it (toView / the ready flip), so viewSize is
  // set wherever this runs. ──
  const viewToImage = useCallback((): { sx: number; sy: number } => {
    // UNREACHABLE-ARM (deleted the vs-null guard, stroke 78): the
    // seed effect runs only after the ready flip and the save only
    // from a click on an armed box — both own a fitted view, and
    // viewSize never resets to null mid-mount.
    const vs = viewSize as { w: number; h: number };
    const d = imgDims();
    return { sx: d.w / vs.w, sy: d.h / vs.h };
  }, [viewSize, imgDims]);

  // ── the seeded rectangle (the entry's current box, in view
  // coords, drawn once the view is ready). Fires ONCE per open —
  // never after a Clear (a cleared box stays cleared; re-seeding
  // would resurrect what the user just erased). ──
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !ready || !bbox) return;
    seededRef.current = true;
    const { sx, sy } = viewToImage();
    setRect({
      x: bbox.x / sx,
      y: bbox.y / sy,
      w: bbox.width / sx,
      h: bbox.height / sy,
    });
  }, [ready, bbox, viewToImage]);

  // ── the redraw (image under, rectangle over) ──
  const redraw = useCallback(() => {
    const view = viewRef.current;
    const vs = viewSize;
    if (!view || !vs) return;
    view.width = vs.w; view.height = vs.h;
    const ctx = view.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, vs.w, vs.h);
    const img = imgRef.current;
    if (img) ctx.drawImage(img, 0, 0, vs.w, vs.h);
    if (rect !== null) {
      ctx.strokeStyle = PAINT_STROKE_INK;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.setLineDash([]);
    }
  }, [viewSize, rect]);

  useEffect(() => { if (ready) redraw(); }, [ready, redraw]);

  // ── pointer → view coords (the paint face's guard shape — one
  // combined check; pre-fit events read null and drop) ──
  const toView = (e: React.PointerEvent): { x: number; y: number } | null => {
    const view = viewRef.current;
    const vs = viewSize;
    if (!view || !vs) return null;
    const rect = view.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (view.width / Math.max(1, rect.width)),
      y: (e.clientY - rect.top) * (view.height / Math.max(1, rect.height)),
    };
  };

  const onDown = (e: React.PointerEvent): void => {
    const p = toView(e);
    if (!p) return;
    drawingRef.current = true;
    anchorRef.current = p;
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: React.PointerEvent): void => {
    if (!drawingRef.current) return;
    // UNREACHABLE-ARM (deleted the p/a null guard, stroke 78): a
    // draw is active only after onDown seated BOTH the anchor and a
    // live view (toView non-null), and neither the view nor the
    // anchor can null again mid-draw — the paint face's own
    // onPointerMove carries the identical law (2026-09-16).
    const p = toView(e) as { x: number; y: number };
    const a = anchorRef.current as { x: number; y: number };
    setRect({
      x: Math.min(a.x, p.x),
      y: Math.min(a.y, p.y),
      w: Math.abs(p.x - a.x),
      h: Math.abs(p.y - a.y),
    });
  };

  const onUp = (): void => { drawingRef.current = false; };

  const save = (): void => {
    // UNREACHABLE-ARM (deleted the rect guard, stroke 78): Save is
    // disabled while no armed rectangle exists (rect null or under
    // 1px), so the click that lands here always owns a drawn box.
    const box = rect as { x: number; y: number; w: number; h: number };
    const { sx, sy } = viewToImage();
    onSave({
      x: Math.round(box.x * sx),
      y: Math.round(box.y * sy),
      width: Math.round(box.w * sx),
      height: Math.round(box.h * sy),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-bbox-leaf="backdrop"
      style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", zIndex: 1000 }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: "var(--dsh-bg, #1b1b1f)", borderRadius: 8, padding: 16, maxWidth: "92vw", maxHeight: "92vh", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontWeight: 600 }}>{props.title ?? "Draw the selection box"}</div>
        <canvas
          ref={viewRef}
          data-testid="bbox-leaf-view"
          data-bbox-canvas="view"
          style={{ maxWidth: "100%", cursor: "crosshair", touchAction: "none", borderRadius: 4, display: "block" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.7, fontSize: 12 }}>
            {rect !== null && rect.w >= 1 && rect.h >= 1
              ? `box ${Math.round(rect.w)}×${Math.round(rect.h)} (view px)`
              : "drag on the image to draw the box"}
          </span>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={() => { setRect(null); redraw(); }}>Clear</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={rect === null || rect.w < 1 || rect.h < 1}>Save box</Button>
        </div>
      </div>
    </div>
  );
}
