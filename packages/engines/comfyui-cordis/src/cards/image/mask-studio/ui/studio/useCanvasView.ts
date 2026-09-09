// useCanvasView — canvas zoom/pan, the composite redraw, view sizing, and
// the base-image load flow.
//
// Split from component.tsx (the 2870-line monolith split): the zoom-state
// block, loadImage/ensurePaintCanvas, redraw + schedule/flushRedraw +
// redrawRef, fitView + the resize/unmount/wheel/reset-zoom effects, the
// load effect, and the redraw effect — verbatim logic, dep arrays
// unchanged. Owns zoom/pan/viewSize/imageLoading state.
import { useCallback, useEffect, useRef, useState } from "react"
import type { RefObject } from "react"
import type { CardStage } from "@melite/contracts"
import {
  DETECTOR_ALPHA, DETECTOR_DEFS, INSTANCE_COLOR, MAX_CANVAS_EDGE,
  PAINT_ALPHA, PAINT_COLOR, PREP_ALPHA, SEL_STROKE,
  WHEEL_NOTCH_MIN, WHEEL_PINCH_SENSITIVITY, WHEEL_ZOOM_FACTOR,
  clampZoom,
} from "./constants"
import type { BoxEntry, ProducedMask, SelectionRect } from "./constants"
import { makeTinted } from "./canvas-ops"
import type { StudioRefs } from "./useStudioRefs"
import { useImageLoader } from "./useImageLoader"

export interface CanvasViewOpts {
  stage: CardStage
  inputImage: string
  artifacts: Record<string, string>
  masks: ProducedMask[]
  hasPaint: boolean
  boxes: BoxEntry[] | null
  selectedInstances: Set<number>
  setSelection: (s: SelectionRect | null) => void
  setHasPaint: (b: boolean) => void
  setPaintVersion: (f: (v: number) => number) => void
  onSave: (p: Record<string, unknown>) => void
  refs: StudioRefs
}

export interface CanvasView {
  zoom: number
  setZoom: React.Dispatch<React.SetStateAction<number>>
  pan: { x: number; y: number }
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  panDragging: { x: number; y: number } | null
  setPanDragging: (p: { x: number; y: number } | null) => void
  isZoomed: boolean
  resetZoom: () => void
  zoomToPoint: (target: number, sx: number, sy: number) => void
  clampPanFor: (x: number, y: number, z: number) => { x: number; y: number }
  viewSize: { w: number; h: number } | null
  imageLoading: boolean
  redraw: () => void
  scheduleRedraw: () => void
  flushRedraw: () => void
  redrawRef: RefObject<() => void>
  fitView: () => void
}

export function useCanvasView({
  stage, inputImage, artifacts, masks, hasPaint, boxes, selectedInstances,
  setSelection, setHasPaint, setPaintVersion, onSave, refs,
}: CanvasViewOpts): CanvasView {
  const {
  viewCanvasRef, canvasContainerRef, paintCanvasRef, imgCacheRef,
  tintCacheRef, rectDragRef, selectionRef, imgSizeRef, paintRestoredForRef,
  selectionClearedForRef, paintTintRef, rafRef, prepOverlayRef,
  colRef, availRef,
  } = refs
  const params = stage.params

  // ── Canvas zoom / pan state ──────────────────────────────────────────────
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panDragging, setPanDragging] = useState<{ x: number; y: number } | null>(null)
  const isZoomed = zoom > 1
  // Ref mirrors — stable native wheel listener without re-binding on every tick.
  const zoomRef = useRef(zoom); zoomRef.current = zoom
  const panRef = useRef(pan); panRef.current = pan

  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])

  /** Clamp pan so the zoomed canvas can never be scrolled past its edges. */
  const clampPanFor = useCallback((x: number, y: number, z: number) => {
  const el = canvasContainerRef.current
  const cvs = viewCanvasRef.current
  if (!el || !cvs) return { x, y }
  const cRect = el.getBoundingClientRect()
  // The canvas CSS size is viewSize; scaled by z it's the on-screen size.
  const scaledW = cvs.offsetWidth * z
  const scaledH = cvs.offsetHeight * z
  const maxX = Math.max(0, (scaledW - cRect.width) / 2)
  const maxY = Math.max(0, (scaledH - cRect.height) / 2)
  return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) }
  }, [])

  /** Zoom keeping the screen-space point under (sx, sy) pinned. */
  const zoomToPoint = useCallback((target: number, sx: number, sy: number) => {
  const el = canvasContainerRef.current
  if (!el) { setZoom(target); return }
  const rect = el.getBoundingClientRect()
  const offX = sx - rect.left - rect.width / 2
  const offY = sy - rect.top - rect.height / 2
  const z0 = zoomRef.current, p0 = panRef.current
  const q = { x: (offX - p0.x) / z0, y: (offY - p0.y) / z0 }
  setZoom(target)
  setPan(clampPanFor(offX - q.x * target, offY - q.y * target, target))
  }, [clampPanFor])

  const { loadImage, ensurePaintCanvas } = useImageLoader({ imgCacheRef, paintCanvasRef })

  const [viewSize, setViewSize] = useState<{ w: number; h: number } | null>(null)
  const [imageLoading, setImageLoading] = useState(Boolean(inputImage))

  // ── Composite the view: base → each produced mask tinted → rect preview ─
  // No layer state anymore (2026-08-10): the base is always full-opacity,
  // produced masks overlay at FIXED alpha, paint overlays live. The view is
  // the export readout — exactly what the run produced.
  const redraw = useCallback(() => {
  const view = viewCanvasRef.current
  if (!view) return
  const ctx = view.getContext("2d")!
  const { w, h } = imgSizeRef.current
  if (!w || !h) return
  if (view.width !== w || view.height !== h) { view.width = w; view.height = h }
  ctx.clearRect(0, 0, w, h)
  const cache = imgCacheRef.current
  const base = inputImage ? cache.get(inputImage) : null
  if (!base || !base.complete || base.naturalWidth === 0) {
  ctx.fillStyle = "#0e0e1a"; ctx.fillRect(0, 0, w, h); return
  }
  ctx.drawImage(base, 0, 0, w, h)
  const tint = tintCacheRef.current
  for (const m of masks) {
  const mask = cache.get(m.url)
  if (!mask || !mask.complete || mask.naturalWidth === 0) continue
  const ck = `${m.url}::${m.color}::${w}x${h}`
  let tinted = tint.get(ck)
  if (!tinted) { tinted = makeTinted(mask, m.color, w, h); tint.set(ck, tinted) }
  ctx.globalAlpha = DETECTOR_ALPHA
  ctx.drawImage(tinted, 0, 0)
  ctx.globalAlpha = 1
  }
  // paint layer (live; tinted into a PERSISTENT offscreen each redraw —
  // the paint canvas mutates during strokes so the tint can't be cached
  // by content, but reusing the canvas element kills the per-move
  // allocation that made the brush lag). makeTinted stays for the
  // produced-mask overlays (URL-keyed cache above) + MaskThumb.
  if (paintCanvasRef.current && hasPaint) {
  if (!paintTintRef.current) paintTintRef.current = document.createElement("canvas")
  const pt = paintTintRef.current
  if (pt.width !== w || pt.height !== h) { pt.width = w; pt.height = h }
  const ptx = pt.getContext("2d")!
  ptx.clearRect(0, 0, w, h)
  ptx.drawImage(paintCanvasRef.current, 0, 0, w, h)
  ptx.globalCompositeOperation = "source-in"
  ptx.fillStyle = PAINT_COLOR
  ptx.fillRect(0, 0, w, h)
  ptx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = PAINT_ALPHA
  ctx.drawImage(pt, 0, 0)
  ctx.globalAlpha = 1
  }
  // PREP PREVIEW overlay (view-only): the effective mask the Inpaint
  // card will consume — grow/feather applied by the parity twin. Cyan
  // over the raw magenta/produced tints so effective vs raw reads at a
  // glance. Ref-gated: populated only while the preview panel is on
  // (and refreshed debounced when its knobs or the source change).
  if (prepOverlayRef.current) {
  ctx.globalAlpha = PREP_ALPHA
  ctx.drawImage(prepOverlayRef.current, 0, 0, w, h)
  ctx.globalAlpha = 1
  }
  // INSTANCE OVERLAYS (phase B): the manifest's boxes on the image —
  // amber outlines, selected filled faint + solid, unselected dashed +
  // dim (a candidate you dropped reads as dropped). The numbers live on
  // the tappable badges (DOM), not in pixels.
  if (boxes && boxes.length > 0) {
  for (const b of boxes) {
  const [nx, ny, nw, nh] = b.bbox
  const bx = nx * w, by = ny * h, bw2 = nw * w, bh2 = nh * h
  const on = selectedInstances.has(b.index)
  ctx.strokeStyle = INSTANCE_COLOR
  if (on) {
  ctx.globalAlpha = 0.10
  ctx.fillStyle = INSTANCE_COLOR
  ctx.fillRect(bx, by, bw2, bh2)
  ctx.globalAlpha = 0.95
  ctx.setLineDash([])
  ctx.strokeRect(bx, by, bw2, bh2)
  } else {
  ctx.globalAlpha = 0.35
  ctx.setLineDash([4, 3])
  ctx.strokeRect(bx, by, bw2, bh2)
  ctx.setLineDash([])
  }
  ctx.globalAlpha = 1
  }
  }
  // selection marquee (2026-08-10 rework — on top of everything). The
  // rect tool is a SELECTION, not paint authoring: a solid stroke while
  // dragging, a dashed outline after commit (persists until the next
  // drag or Clear). Styled with the selection blue — never the paint
  // magenta, so a marquee can't be mistaken for a painted stroke.
  const drag = rectDragRef.current
  if (drag) {
  const rx = Math.min(drag.sx, drag.cx), ry = Math.min(drag.sy, drag.cy)
  const rw = Math.abs(drag.cx - drag.sx), rh = Math.abs(drag.cy - drag.sy)
  if (rw > 0 && rh > 0) {
  ctx.fillStyle = SEL_STROKE; ctx.globalAlpha = 0.18
  ctx.fillRect(rx, ry, rw, rh); ctx.globalAlpha = 1
  ctx.lineWidth = 1.5; ctx.strokeStyle = SEL_STROKE
  ctx.strokeRect(rx, ry, rw, rh)
  }
  } else {
  const s = selectionRef.current
  if (s) {
  ctx.fillStyle = SEL_STROKE; ctx.globalAlpha = 0.12
  ctx.fillRect(s.x, s.y, s.w, s.h); ctx.globalAlpha = 1
  ctx.lineWidth = 1.5; ctx.strokeStyle = SEL_STROKE
  ctx.setLineDash([6, 4])
  ctx.strokeRect(s.x, s.y, s.w, s.h)
  ctx.setLineDash([])
  }
  }
  }, [masks, hasPaint, inputImage, boxes, selectedInstances])

  /** Coalesced redraw — at most ONE paint per display frame. Pointer-move
  * events can outpace the refresh rate (120Hz pointers on a 60Hz panel),
  * and calling redraw() synchronously on every event meant 120 full-canvas
  * composites/sec. scheduleRedraw collapses the burst: the first move in
  * a frame schedules a rAF; subsequent moves in the SAME frame no-op (the
  * scheduled rAF will read the latest paint-canvas state anyway). The
  * stroke stays responsive — the paint canvas is stroked synchronously in
  * paintSegment; only the (heavier) composite is deferred to the frame. */
  const scheduleRedraw = useCallback(() => {
  if (rafRef.current != null) return
  rafRef.current = requestAnimationFrame(() => {
  rafRef.current = null
  redraw()
  })
  }, [redraw])

  /** Synchronous redraw + cancel any pending coalesced one. Used at stroke
  * END (commit) so the persisted paint_mask matches the on-screen pixels. */
  const flushRedraw = useCallback(() => {
  if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  redraw()
  }, [redraw])

  /** Latest `redraw`, stable by reference. The load effect below must NOT
  * depend on `redraw` directly — `redraw` changes identity whenever
  * `layers` does (e.g. a rename), which re-ran the whole load flow
  * (imageLoading flicker + paint restore) on every layer tweak. Calling
  * through the ref keeps the effect keyed to REAL input changes only. */
  const redrawRef = useRef(redraw)
  redrawRef.current = redraw

  // ── Canvas view sizing — the wrapper hugs the image (aspect-preserving
  // fit, never upscaled) instead of letterboxing it in a fixed dark
  // canvas ("a lot of black space" complaint, 2026-08-10). The column is
  // measured so a huge image shrinks to fit; a small one stays native.
  const fitView = useCallback(() => {
  const { w: iw, h: ih } = imgSizeRef.current
  const { w: aw, h: ah } = availRef.current
  if (!iw || !ih || !aw || !ah) return
  const s = Math.min(1, aw / iw, ah / ih)
  const dw = Math.max(1, Math.round(iw * s))
  const dh = Math.max(1, Math.round(ih * s))
  setViewSize((v) => (v && v.w === dw && v.h === dh ? v : { w: dw, h: dh }))
  }, [])
  useEffect(() => {
  const el = colRef.current; if (!el) return
  const measure = () => {
  const r = el.getBoundingClientRect()
  // Options bar (~38px, incl. padding) + wrapper top margin (mt-1.5)
  // eat into the column; the remaining height is the canvas area.
  // −46 not −44: 2px slack so the ring border never collides.
  availRef.current = { w: Math.max(0, r.width), h: Math.max(0, r.height - 46) }
  fitView()
  }
  measure()
  const ro = new ResizeObserver(measure)
  ro.observe(el)
  return () => ro.disconnect()
  }, [fitView])

  // Cancel any pending rAF on unmount — the callback closes over `redraw`
  // which captures stale refs/layers after teardown.
  useEffect(() => () => {
  if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
  }, [])

  // ── Ctrl+wheel zoom (native, non-passive — React's passive onWheel
  // cannot preventDefault the browser's page-zoom on Ctrl+wheel).
  // Plain wheel pans when zoomed.
  useEffect(() => {
  const el = canvasContainerRef.current
  if (!el) return
  const onWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
  e.preventDefault()
  const cur = zoomRef.current
  const raw = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY
  let factor = Math.abs(raw) >= WHEEL_NOTCH_MIN
    ? (raw < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR)
    : Math.exp(-raw * WHEEL_PINCH_SENSITIVITY)
  factor = Math.max(0.5, Math.min(2, factor))
  const next = clampZoom(cur * factor)
  if (next !== cur) zoomToPoint(next, e.clientX, e.clientY)
  return
  }
  if (zoomRef.current <= 1) return
  e.preventDefault()
  const p = panRef.current
  setPan(clampPanFor(p.x - e.deltaX, p.y - e.deltaY, zoomRef.current))
  }
  el.addEventListener("wheel", onWheel, { passive: false })
  return () => el.removeEventListener("wheel", onWheel)
  }, [zoomToPoint, clampPanFor])

  // Reset zoom when the input image changes.
  useEffect(() => { resetZoom() }, [inputImage, resetZoom])

  // ── Load the base image → size canvases → restore paint → redraw ───────
  // Deps are input-ONLY (no `redraw` — see redrawRef above): the effect
  // must not re-run on layer ops like a rename, which used to restart the
  // whole flow and re-trigger the paint restore (2026-08-10).
  useEffect(() => {
  let cancelled = false
  // Image swap → the committed marquee + its roi param are stale (they
  // describe the OLD image's coordinates). Drop both so a run on the
  // new image is never scoped by a ghost rectangle (2026-08-10 rework).
  if (inputImage && selectionClearedForRef.current !== inputImage) {
  selectionClearedForRef.current = inputImage
  selectionRef.current = null
  setSelection(null)
  if (stage.params.roi) onSave({ ...stage.params, roi: "" })
  }
  if (!inputImage) {
  imgSizeRef.current = { w: 800, h: 560 }
  ensurePaintCanvas(800, 560)
  setViewSize(null)
  setImageLoading(false); redrawRef.current(); return
  }
  setImageLoading(true)
  void loadImage(inputImage).then(async (img) => {
  if (cancelled) return
  if (!img) { setImageLoading(false); return }
  let w = img.naturalWidth, h = img.naturalHeight
  const maxEdge = Math.max(w, h)
  if (maxEdge > MAX_CANVAS_EDGE) { const s = MAX_CANVAS_EDGE / maxEdge; w = Math.round(w * s); h = Math.round(h * s) }
  imgSizeRef.current = { w, h }
  ensurePaintCanvas(w, h)
  // Re-measure the column NOW: the mount-time measure may have run
  // while the modal was mid-open-animation (a scale transform inflates
  // getBoundingClientRect, and ResizeObserver does NOT fire for
  // transform-only changes), leaving availRef stale — the fit would
  // letterbox/overhang against a ghost size (2026-08-10).
  const colEl = colRef.current
  if (colEl) {
  const r = colEl.getBoundingClientRect()
  availRef.current = { w: Math.max(0, r.width), h: Math.max(0, r.height - 46) }
  }
  fitView()
  const pm = params.paint_mask
  if (pm && paintRestoredForRef.current !== inputImage) {
  paintRestoredForRef.current = inputImage
  const pimg = await loadImage(pm as string)
  if (!cancelled && pimg && paintCanvasRef.current) {
  const cx = paintCanvasRef.current.getContext("2d")!
  cx.clearRect(0, 0, w, h); cx.drawImage(pimg, 0, 0, w, h)
  // paint_mask is serialized white-on-BLACK (visible when opened
  // in an image viewer). The black is OPAQUE — if it survived into
  // the paint canvas, the tint pass (source-in over every opaque
  // pixel) would color the WHOLE canvas magenta. Knock it out by
  // folding the red channel into alpha: white strokes keep full
  // opacity, black → transparent, anti-aliased edges stay soft.
  const px = cx.getImageData(0, 0, w, h)
  const [REDACTED 2026-11-05] = px.data
  for (let i = 0; i < [REDACTED 2026-11-05].length; i += 4) { [REDACTED 2026-11-05][i + 3] = [REDACTED 2026-11-05][i] }
  cx.putImageData(px, 0, 0)
  setHasPaint(true); setPaintVersion((v) => v + 1)
  }
  }
  setImageLoading(false); redrawRef.current()
  })
  for (const d of DETECTOR_DEFS) { const u = artifacts[d.key]; if (u) void loadImage(u) }
  const sam3Url = artifacts.mask_sam3
  if (sam3Url) void loadImage(sam3Url)
  return () => { cancelled = true }
  }, [inputImage, artifacts, loadImage, ensurePaintCanvas, fitView])

  useEffect(() => { redraw() }, [redraw])

  return {
  zoom, setZoom, pan, setPan, panDragging, setPanDragging, isZoomed,
  resetZoom, zoomToPoint, clampPanFor, viewSize, imageLoading,
  redraw, scheduleRedraw, flushRedraw, redrawRef, fitView,
  }
}
