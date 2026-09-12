// StudioCanvas — the tool dock + canvas column (options bar, canvas
// wrapper, instance badges, prep panel, selection bar).
//
// Split from component.tsx (the 2870-line monolith split): the ToolDock
// JSX + the canvas-column JSX, verbatim. All values arrive as explicit
// props (no prop-shape changes upstream — this is a new internal seam);
// every data-* hook the tests gesture through is preserved.
import { Button, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import {
  Brush, Eraser, Eye, Link2, Move, ScanFace, Square, Trash2Alt, X,
} from "@melite/card-base/icons"
import { NumberField } from "./NumberField"
import { ViewportAnchor } from "./viewport"
// The 2D viewport PRIMITIVE (row 5 stroke 3): the wrapper/canvas/
// transform/triage live THERE; this module keeps the dock, the
// options bar, and the mask overlays (verbatim) that fill its slots.
import { PaintCanvas2D } from "../PaintCanvas2D"
import { ZOOM_MAX, ZOOM_MIN } from "./constants"
import type { BoxEntry, SelectionRect, ToolId } from "./constants"
import { DockBtn } from "./DockBtn"
import { EmptyStateImport } from "./EmptyStateImport"
import { WiredWaiting } from "./WiredWaiting"
import styles from "./mask.module.css"

export interface StudioCanvasProps {
  tool: ToolId
  setTool: (t: ToolId) => void
  prepPreviewOn: boolean
  setPrepPreviewOn: (f: (v: boolean) => boolean) => void
  showsSize: boolean
  brushSize: number
  setBrushSize: (n: number) => void
  selection: SelectionRect | null
  inputImage: string
  zoom: number
  setZoom: React.Dispatch<React.SetStateAction<number>>
  pan: { x: number; y: number }
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
  isZoomed: boolean
  resetZoom: () => void
  hasPaint: boolean
  clearPaint: () => void
  colRef: React.RefObject<HTMLDivElement | null>
  canvasContainerRef: React.RefObject<HTMLDivElement | null>
  viewCanvasRef: React.RefObject<HTMLCanvasElement | null>
  wiredPending: boolean
  onCanvasDrop: (e: React.DragEvent) => void
  onCanvasDragOver: (e: React.DragEvent) => void
  onCanvasDragLeave: (e: React.DragEvent) => void
  viewSize: { w: number; h: number } | null
  dropHighlight: boolean
  imageLoading: boolean
  wiredUpstreamTitle: string
  onUnwire: () => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  panDragging: { x: number; y: number } | null
  isWired: boolean
  canWire: boolean
  setWireOpen: (b: boolean) => void
  boxes: BoxEntry[] | null
  detectMode: string
  recipeDetect: boolean
  selectedInstances: Set<number>
  toggleInstance: (idx: number) => void
  importImageFile: (file: File) => void
  attachImage: (url: string) => void
  detecting: boolean
  prepGrow: number
  setPrepGrow: (n: number) => void
  prepFeather: number
  setPrepFeather: (n: number) => void
  prepCoveragePct: number | null
  prepSourceLabel: string
  runDetect: (mode: "segm" | "bbox") => void
  clearSelection: () => void
}

export function StudioCanvas({
  tool, setTool, prepPreviewOn, setPrepPreviewOn,
  showsSize, brushSize, setBrushSize, selection,
  inputImage, zoom, setZoom, pan, setPan, isZoomed, resetZoom,
  hasPaint, clearPaint,
  colRef, canvasContainerRef, viewCanvasRef,
  wiredPending, onCanvasDrop, onCanvasDragOver, onCanvasDragLeave,
  viewSize, dropHighlight, imageLoading,
  wiredUpstreamTitle, onUnwire,
  onPointerDown, onPointerMove, onPointerUp, panDragging,
  isWired, canWire, setWireOpen,
  boxes, detectMode, recipeDetect, selectedInstances, toggleInstance,
  importImageFile, attachImage,
  detecting,
  prepGrow, setPrepGrow, prepFeather, setPrepFeather,
  prepCoveragePct, prepSourceLabel,
  runDetect, clearSelection,
}: StudioCanvasProps) {
  return (
  <>
  {/* ToolDock — vertical palette (mirrors surfaces/canvas/ToolDock) */}
  <div className={styles.toolDock}>
  <DockBtn active={tool === "move"} onClick={() => setTool("move")} title="Move / Pan (V)"><Move className={styles.sz16} /></DockBtn>
  <DockBtn active={tool === "brush"} onClick={() => setTool("brush")} title="Paint mask (B)">
  <Brush className={styles.sz16} />
  </DockBtn>
  <DockBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="Erase paint (E)">
  <Eraser className={styles.sz16} />
  </DockBtn>
  <div className={styles.dockDivider} />
  <DockBtn active={tool === "rect"} onClick={() => setTool("rect")} title="Select region (R) — drag a rectangle, then pick Segm or Bbox"><Square className={styles.sz16} /></DockBtn>
  <div className={styles.dockDivider} />
  <DockBtn active={prepPreviewOn} onClick={() => setPrepPreviewOn((v) => !v)} title="Prep preview (view-only) — how grow/feather will shape the effective mask at the Inpaint card">
  <Eye className={styles.sz16} />
  </DockBtn>
  </div>

  {/* Canvas column: options bar + canvas */}
  <div ref={colRef} className={styles.canvasCol}>
  {/* ToolOptionsBar — context-sensitive (mirrors ToolOptionsBar) */}
  <div className={styles.optionsBar}>
  {showsSize ? (
  <div className={styles.sizeLabel}>
  <span className={styles.capsLabel}>Size</span>
  <NumberField value={brushSize} onChange={setBrushSize}
  min={2} max={120} step={1} className={styles.brushSizeField}
  tooltip="Brush diameter (px)" />
  </div>
  ) : tool === "rect" ? (
  <span className={styles.rectHint}>
  Drag to select a region, then pick {selection ? "a different region" : "Segm or Bbox"} to detect inside it.
  </span>
  ) : null}
  <div className={styles.spacer} />
  {inputImage && (
  <div className={styles.zoomRow}>
    <Button variant="ghost" type="button" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + 1))}
      className={styles.zoomBtn}
      title="Zoom in (+)">+</Button>
    <span className={styles.zoomPct}>{Math.round(zoom * 100)}%</span>
    <Button variant="ghost" type="button" onClick={() => { setZoom((z) => Math.max(ZOOM_MIN, z - 1)); if (zoom <= 2) setPan({ x: 0, y: 0 }) }}
      className={styles.zoomBtn}
      title="Zoom out (−)">−</Button>
    {isZoomed && (
    <Button variant="ghost" type="button" onClick={resetZoom}
      className={styles.zoomReset}
      title="Reset zoom (Esc)">Reset</Button>
    )}
  </div>
  )}
  {hasPaint && (
  <Tooltip label="Clear paint layer" side="top">
  <Button variant="ghost" type="button" onClick={clearPaint}
  className={styles.clearBtn}>
  <Trash2Alt className={styles.sz12} /> Clear
  </Button>
  </Tooltip>
  )}
  </div>

  {/* Canvas — one of three states (2026-08-10 input-sourcing parity,
  * semantics VERBATIM on the PaintCanvas2D primitive): wired +
  * pending → WaitingState (blocked, with note + unwire); image
  * present → the paint canvas (attached file/asset OR a resolved
  * wire — both render the same way); neither → EmptyStateImport
  * (upload / drop / asset / wire). The wrapper stays the drop
  * target in all three so OS-file AND asset-tray drops light up
  * the ring + land in attachImage. The waiting state suppresses
  * drops (no point attaching over a live wire the user would have
  * to unwire first — the Unwire button is the explicit path). */}
  <PaintCanvas2D
  containerRef={canvasContainerRef}
  viewCanvasRef={viewCanvasRef}
  hasImage={Boolean(inputImage)}
  viewSize={viewSize}
  imageLoading={imageLoading}
  dropHighlight={dropHighlight}
  onDrop={wiredPending ? undefined : onCanvasDrop}
  onDragOver={wiredPending ? undefined : onCanvasDragOver}
  onDragLeave={wiredPending ? undefined : onCanvasDragLeave}
  zoom={zoom}
  pan={pan}
  isZoomed={isZoomed}
  panDragging={panDragging}
  panMode={tool === "move"}
  onPointerDown={onPointerDown}
  onPointerMove={onPointerMove}
  onPointerUp={onPointerUp}
  waiting={wiredPending ? (
  <WiredWaiting
  upstreamTitle={wiredUpstreamTitle}
  onUnwire={onUnwire}
  />
  ) : undefined}
  empty={
  <EmptyStateImport
  onPick={importImageFile}
  onDropAsset={attachImage}
  onWire={canWire ? () => setWireOpen(true) : undefined}
  />
  }
  /* DECLARED overlay (§2.5, stroke 6): the detecting pill is a
   * status row on the viewport seam — the renderer owns the dock,
   * the ghosting, and the chrome; no hand-rolled absolute DOM. */
  overlays={detecting ? [
  { id: "detect", kind: "status", dock: "tl", group: "run", label: "Detecting…", busy: true },
  ] : []}
  >
  {inputImage && !wiredPending && (<>
  {/* Wired badge — the live-reference indicator (mirrors
  SlotSquare's badge). Click opens the wire picker so the
  user can switch outputs or unwire without dropping to
  the layer panel. */}
  {isWired && canWire && (
  <ViewportAnchor dock="top-right">
  <Tooltip label={`Wired from ${wiredUpstreamTitle} — click to change`} side="top">
  <Button variant="ghost"
  type="button"
  onClick={() => setWireOpen(true)}
  data-wired-badge
  className={styles.wiredBadge}
  >
  <Link2 className={styles.sz12} /> {wiredUpstreamTitle}
  </Button>
  </Tooltip>
  </ViewportAnchor>
  )}
  {/* INSTANCE BADGES (phase B): one tappable chip per detected box,
   *  pinned to its top-left corner. Selected = filled amber; the tap
   *  writes instance_filter and re-runs — "the user can see the
   *  bboxes and just select one". Rendered only while the detect
   *  producer is armed (the manifest describes ITS run). */}
  {viewSize && boxes && (detectMode !== "none" || recipeDetect) && boxes.map((b) => {
  const on = selectedInstances.has(b.index)
  return (
  <Tooltip
  key={b.index}
  label={on
  ? `BBox${b.index + 1} (${b.class}) — tap to drop it from the mask`
  : `BBox${b.index + 1} (${b.class}) — tap to keep only this instance`}
  side="top"
  >
  <Button variant="ghost"
  type="button" data-instance-badge={b.index}
  style={{ left: b.bbox[0] * viewSize.w, top: b.bbox[1] * viewSize.h }}
  onClick={() => toggleInstance(b.index)}
  className={clsx(
  styles.instanceBadge,
  on ? styles.instanceOn : styles.instanceOff,
  )}
  >
  {b.index + 1}
  </Button>
  </Tooltip>
  )
  })}
  </>)}
  {/* PREP PREVIEW panel (view-only — writes nothing). Sliders preview
  the Inpaint card's knobs; the cyan overlay is the effective mask. */}
  {prepPreviewOn && (
  <ViewportAnchor
  data-prep-preview
  dock="bottom-left"
  className={styles.prepPanel}
  >
  <div className={styles.prepHead}>
  <span className={styles.prepTitle}>
  <Eye className={styles.sz12} /> Effective mask
  </span>
  {prepCoveragePct !== null && (
  <span className={styles.prepPct}>
  {prepCoveragePct < 0.1 ? prepCoveragePct.toFixed(2) : prepCoveragePct.toFixed(1)}%
  </span>
  )}
  </div>
  <label className={styles.prepLabel}>
  <span className={styles.prepCaption}>Grow / Shrink</span>
  <input
  type="range" min={-32} max={32} step={1} value={prepGrow}
  onChange={(e) => setPrepGrow(Number(e.target.value))}
  className={styles.prepRange}
  />
  <span className={styles.prepVal}>{prepGrow}px</span>
  </label>
  <label className={styles.prepLabelStack}>
  <span className={styles.prepCaption}>Feather</span>
  <input
  type="range" min={0} max={32} step={1} value={prepFeather}
  onChange={(e) => setPrepFeather(Number(e.target.value))}
  className={styles.prepRange}
  />
  <span className={styles.prepVal}>{prepFeather}px</span>
  </label>
  <p className={styles.prepNote}>
  Source: {prepSourceLabel || "…"}. View-only — the Inpaint card applies
  grow/feather at run time; this studio writes raw masks.
  </p>
  </ViewportAnchor>
  )}
  {/* The SELECTION ACTION BAR (2026-08-10 rework): presented the
  moment a marquee commits — Segm / Bbox run YOLO scoped to
  the rectangle (writes output_mode + roi + runs the card).
  The bar is the ONE detect gesture: no hunt for the card's
  Run button. */}
  {selection && (
  <ViewportAnchor
  data-selection-bar
  dock="bottom-center"
  className={styles.selBar}
  >
  <span className={styles.selSize}>
  {Math.round(selection.w)}×{Math.round(selection.h)} px
  </span>
  {detectMode === "none" ? (
  /* Detect is OFF — Segm/Bbox would hard-error in the brick
  (exports under "none" are a contract violation). The
  marquee still scopes the SAM3 producer: type a prompt
  in the rail and Segment. */
  <span data-sam3-scope-hint className={styles.scopeHint}>
  Detect off — the selection scopes a SAM3 prompt
  </span>
  ) : (
  <>
  <Tooltip label="YOLO + SAM — precise object masks inside the selection" side="top">
  <Button variant="ghost"
  type="button" data-detect-segm
  onClick={() => runDetect("segm")}
  className={styles.segmBtn}
  >
  <ScanFace className={styles.sz12} /> Segm
  </Button>
  </Tooltip>
  <Tooltip label="YOLO only — fast bounding boxes inside the selection" side="top">
  <Button variant="ghost"
  type="button" data-detect-bbox
  onClick={() => runDetect("bbox")}
  className={styles.bboxBtn}
  >
  <Square className={styles.sz12} /> Bbox
  </Button>
  </Tooltip>
  </>
  )}
  <Tooltip label="Clear selection" side="top">
  <Button variant="ghost"
  type="button" onClick={clearSelection} data-clear-selection
  aria-label="Clear selection"
  className={styles.selClear}
  >
  <X className={styles.sz14} />
  </Button>
  </Tooltip>
  </ViewportAnchor>
  )}
  </PaintCanvas2D>
  </div>
  </>
  )
}
