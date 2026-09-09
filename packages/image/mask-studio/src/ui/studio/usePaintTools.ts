// usePaintTools — brush/eraser/rect pointer handling, paint + selection
// commits, and the one-gesture run writers (runDetect / runSam3).
//
// Split from component.tsx (the 2870-line monolith split): the pointer →
// canvas block through clearPaint, verbatim logic. Owns tool + brushSize
// state; the canvas view bundle (zoom/pan/redraw fns) arrives via args.
import { useCallback, useState } from "react"
import type { CardStage } from "@melite/contracts"
import type { SelectionRect, ToolId } from "./constants"
import type { StudioRefs } from "./useStudioRefs"

export interface PaintView {
  isZoomed: boolean
  pan: { x: number; y: number }
  zoom: number
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  panDragging: { x: number; y: number } | null
  setPanDragging: (p: { x: number; y: number } | null) => void
  clampPanFor: (x: number, y: number, z: number) => { x: number; y: number }
  zoomToPoint: (target: number, sx: number, sy: number) => void
  resetZoom: () => void
  scheduleRedraw: () => void
  flushRedraw: () => void
}

export interface PaintToolsOpts {
  stage: CardStage
  artifacts: Record<string, string>
  inputImage: string
  hasPaint: boolean
  setHasPaint: (b: boolean) => void
  setPaintVersion: (f: (v: number) => number) => void
  setSelection: (s: SelectionRect | null) => void
  view: PaintView
  onSave: (p: Record<string, unknown>) => void
  onRun?: () => void
  refs: StudioRefs
}

export interface PaintTools {
  tool: ToolId
  setTool: (t: ToolId) => void
  brushSize: number
  setBrushSize: (n: number) => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  commitPaint: () => void
  commitSelection: () => void
  runDetect: (mode: "segm" | "bbox") => void
  runSam3: (prompt: string) => void
  clearSelection: () => void
  clearPaint: () => void
}

export function usePaintTools({
  stage, artifacts, inputImage, hasPaint, setHasPaint, setPaintVersion,
  setSelection, view, onSave, onRun, refs,
}: PaintToolsOpts): PaintTools {
  const {
  viewCanvasRef, paintCanvasRef, drawingRef, lastPtRef, rectDragRef,
  selectionRef, imgSizeRef, didPanDragRef,
  } = refs
  const {
  isZoomed, pan, zoom, setPan, panDragging, setPanDragging,
  clampPanFor, zoomToPoint, resetZoom, scheduleRedraw, flushRedraw,
  } = view

  const [tool, setTool] = useState<ToolId>("move")
  const [brushSize, setBrushSize] = useState(28)

  // ── Pointer → canvas-internal coords (accounts for CSS scaling) ─────────
  const toCanvasPoint = (e: React.PointerEvent) => {
  const view = viewCanvasRef.current!
  const rect = view.getBoundingClientRect()
  return {
  x: (e.clientX - rect.left) * (view.width / rect.width),
  y: (e.clientY - rect.top) * (view.height / rect.height),
  }
  }

  const paintSegment = (from: { x: number; y: number } | null, to: { x: number; y: number }) => {
  const pc = paintCanvasRef.current; if (!pc) return
  const cx = pc.getContext("2d")!
  cx.lineCap = "round"; cx.lineJoin = "round"
  cx.lineWidth = brushSize
  cx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over"
  cx.strokeStyle = "#ffffff"
  cx.beginPath()
  if (from) cx.moveTo(from.x, from.y); else cx.moveTo(to.x, to.y)
  cx.lineTo(to.x, to.y); cx.stroke()
  cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over"
  if (!hasPaint) setHasPaint(true)
  // Coalesced — the paint canvas already holds this segment synchronously;
  // the (heavier) composite is deferred to the next frame. This is the
  // paintbrush hot path: 120Hz pointer events collapse to ≤60Hz redraws.
  scheduleRedraw()
  }

  const onPointerDown = (e: React.PointerEvent) => {
  if (!inputImage) return
  // Move tool: drag-pan when zoomed
  if (tool === "move") {
    if (!isZoomed) return
    didPanDragRef.current = false
    setPanDragging({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    e.preventDefault()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    return
  }
  e.preventDefault()
  ;(e.target as Element).setPointerCapture(e.pointerId)
  const pt = toCanvasPoint(e)
  if (tool === "rect") {
  // A new drag REPLACES the committed selection (standard marquee).
  selectionRef.current = null; setSelection(null)
  rectDragRef.current = { sx: pt.x, sy: pt.y, cx: pt.x, cy: pt.y }
  scheduleRedraw(); return
  }
  drawingRef.current = true; lastPtRef.current = pt; paintSegment(null, pt)
  }
  const onPointerMove = (e: React.PointerEvent) => {
  // Pan drag
  if (panDragging) {
    didPanDragRef.current = true
    setPan(clampPanFor(e.clientX - panDragging.x, e.clientY - panDragging.y, zoom))
    return
  }
  if (rectDragRef.current) {
  const pt = toCanvasPoint(e); rectDragRef.current.cx = pt.x; rectDragRef.current.cy = pt.y; scheduleRedraw(); return
  }
  if (!drawingRef.current) return
  const pt = toCanvasPoint(e); paintSegment(lastPtRef.current, pt); lastPtRef.current = pt
  }
  const onPointerUp = (e: React.PointerEvent) => {
  if (panDragging) {
    const wasDrag = didPanDragRef.current
    setPanDragging(null)
    try { ;(e.target as Element).releasePointerCapture(e.pointerId) } catch { /* noop */ }
    if (!wasDrag) {
      if (isZoomed) resetZoom()
      else zoomToPoint(2, e.clientX, e.clientY)
    }
    return
  }
  if (rectDragRef.current) {
  const pt = toCanvasPoint(e); rectDragRef.current.cx = pt.x; rectDragRef.current.cy = pt.y
  try { ;(e.target as Element).releasePointerCapture(e.pointerId) } catch { /* noop */ }
  commitSelection(); return
  }
  if (!drawingRef.current) return
  drawingRef.current = false
  try { ;(e.target as Element).releasePointerCapture(e.pointerId) } catch { /* noop */ }
  commitPaint()
  }

  /** Serialize the paint canvas → white-on-black RGB → params.paint_mask.
  * flushRedraw first so the on-screen composite matches the persisted
  * payload (no pending coalesced redraw from the last move segment). */
  const commitPaint = useCallback(() => {
  flushRedraw()
  const pc = paintCanvasRef.current; if (!pc) return
  const out = document.createElement("canvas"); out.width = pc.width; out.height = pc.height
  const cx = out.getContext("2d")!
  cx.fillStyle = "#000000"; cx.fillRect(0, 0, out.width, out.height)
  cx.drawImage(pc, 0, 0)
  setPaintVersion((v) => v + 1)
  onSave({ ...stage.params, paint_mask: out.toDataURL("image/png"), export_paint: true })
  }, [flushRedraw, onSave, stage.params])

  /** Commit the rect drag → persistent selection marquee (clamped into
  * the canvas). NO param write — params move only when the user picks
  * Segm or Bbox (one gesture writes output_mode + roi + runs). A
  * degenerate drag (click without a drag) clears the selection. */
  const commitSelection = () => {
  const r = rectDragRef.current; rectDragRef.current = null
  if (!r) { flushRedraw(); return }
  const { w: cw, h: ch } = imgSizeRef.current
  const x = Math.min(r.sx, r.cx), y = Math.min(r.sy, r.cy)
  let w = Math.abs(r.cx - r.sx), h = Math.abs(r.cy - r.sy)
  if (w < 2 || h < 2) { selectionRef.current = null; setSelection(null); flushRedraw(); return }
  // Clamp into bounds — the pointer can release outside the canvas.
  const x0 = Math.max(0, Math.min(x, cw - 2))
  const y0 = Math.max(0, Math.min(y, ch - 2))
  w = Math.min(w, cw - x0); h = Math.min(h, ch - y0)
  const rect: SelectionRect = { x: x0, y: y0, w, h }
  selectionRef.current = rect
  setSelection(rect)
  flushRedraw()
  }

  /** The selection's Segm/Bbox action: write output_mode + normalized roi
  * to the card, then RUN — detection is one gesture ("they are presented
  * buttons… for the yolo model to detect"). roi = "" with no selection →
  * full-image detect (the brick's _parse_roi treats "" as None).
  * Export is AUTO — no checkboxes: every mask the card can produce is
  * exported. "Available" = the artifact already came back in a run (a
  * detector layer exists) OR it is the currently armed detect mode (the
  * first run has no artifact yet — without the mode clause the very
  * first detection would export nothing and the artifact would never
  * appear, a chicken-and-egg the old checkbox UI papered over). */
  const runDetect = (mode: "segm" | "bbox") => {
  const sel = selectionRef.current
  const { w: cw, h: ch } = imgSizeRef.current
  const roi = sel && cw > 0 && ch > 0
  ? [
  Number((sel.x / cw).toFixed(4)),
  Number((sel.y / ch).toFixed(4)),
  Number((sel.w / cw).toFixed(4)),
  Number((sel.h / ch).toFixed(4)),
  ]
  : ""
  const p = stage.params
  const autoExports = {
  export_face: Boolean(artifacts.mask_face) || p.detect_mode === "face",
  export_hands: Boolean(artifacts.mask_hands) || p.detect_mode === "hands",
  export_body: Boolean(artifacts.mask_body) || p.detect_mode === "body",
  export_paint: hasPaint,
  // Phase B: every detect run carries the instance manifest — the
  // badges + the agent both read it.
  export_boxes: true,
  }
  onSave({ ...p, output_mode: mode, roi, ...autoExports })
  onRun?.()
  }

  /** The SAM3 gesture (2026-08-10): persist the prompt + the marquee's
  * normalized roi (scoping), then RUN — one gesture, same as Segm/Bbox.
  * Export is AUTO — the prompt alone activates mask_sam3 (emit_when). */
  const runSam3 = (prompt: string) => {
  const trimmed = prompt.trim()
  if (!trimmed) return
  const sel = selectionRef.current
  const { w: cw, h: ch } = imgSizeRef.current
  const roi = sel && cw > 0 && ch > 0
  ? [
  Number((sel.x / cw).toFixed(4)),
  Number((sel.y / ch).toFixed(4)),
  Number((sel.w / cw).toFixed(4)),
  Number((sel.h / ch).toFixed(4)),
  ]
  : ""
  onSave({ ...stage.params, sam3_prompt: trimmed, roi })
  onRun?.()
  }

  /** Clear the marquee + the stale roi param — a later full-image run must
  * never be scoped by a ghost selection. */
  const clearSelection = () => {
  selectionRef.current = null
  setSelection(null)
  onSave({ ...stage.params, roi: "" })
  flushRedraw()
  }

  const clearPaint = () => {
  const pc = paintCanvasRef.current; if (!pc) return
  pc.getContext("2d")!.clearRect(0, 0, pc.width, pc.height)
  setHasPaint(false); setPaintVersion((v) => v + 1)
  onSave({ ...stage.params, paint_mask: "", export_paint: false })
  flushRedraw()
  }

  return {
  tool, setTool, brushSize, setBrushSize,
  onPointerDown, onPointerMove, onPointerUp,
  commitPaint, commitSelection, runDetect, runSam3,
  clearSelection, clearPaint,
  }
}
