// StudioCanvas — the tool dock + canvas column (options bar, canvas
// wrapper, instance badges, prep panel, selection bar).
//
// Split from component.tsx (the 2870-line monolith split): the ToolDock
// JSX + the canvas-column JSX, verbatim. All values arrive as explicit
// props (no prop-shape changes upstream — this is a new internal seam);
// every data-* hook the tests gesture through is preserved.
import {
  Brush, Eraser, Eye, Link2, Move, ScanFace, Square, Trash2, X,
} from "lucide-react"
import { Input } from "@melite/ui"
import { NumberField } from "@melite/ui/NumberField"
import { Button } from "@melite/ui/button"
import { Tip } from "@melite/ui/tip"
import { cn } from "@melite/ui"
import { ViewportAnchor } from "@melite/ui"
// The 2D viewport PRIMITIVE (row 5 stroke 3): the wrapper/canvas/
// transform/triage live THERE; this module keeps the dock, the
// options bar, and the mask overlays (verbatim) that fill its slots.
import { PaintCanvas2D } from "../../../ui/PaintCanvas2D"
import { ZOOM_MAX, ZOOM_MIN } from "./constants"
import type { BoxEntry, SelectionRect, ToolId } from "./constants"
import { DockBtn } from "./DockBtn"
import { EmptyStateImport } from "./EmptyStateImport"
import { WiredWaiting } from "./WiredWaiting"

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
  <div className="flex w-9 shrink-0 flex-col items-center gap-0.5 rounded-md border border-border/50 bg-sidebar/40 py-1.5">
  <DockBtn active={tool === "move"} onClick={() => setTool("move")} title="Move / Pan (V)"><Move className="h-4 w-4" /></DockBtn>
  <DockBtn active={tool === "brush"} onClick={() => setTool("brush")} title="Paint mask (B)">
  <Brush className="h-4 w-4" />
  </DockBtn>
  <DockBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="Erase paint (E)">
  <Eraser className="h-4 w-4" />
  </DockBtn>
  <div className="my-0.5 h-px w-5 bg-border/40" />
  <DockBtn active={tool === "rect"} onClick={() => setTool("rect")} title="Select region (R) — drag a rectangle, then pick Segm or Bbox"><Square className="h-4 w-4" /></DockBtn>
  <div className="my-0.5 h-px w-5 bg-border/40" />
  <DockBtn active={prepPreviewOn} onClick={() => setPrepPreviewOn((v) => !v)} title="Prep preview (view-only) — how grow/feather will shape the effective mask at the Inpaint card">
  <Eye className="h-4 w-4" />
  </DockBtn>
  </div>

  {/* Canvas column: options bar + canvas */}
  <div ref={colRef} className="flex min-w-0 flex-1 flex-col">
  {/* ToolOptionsBar — context-sensitive (mirrors ToolOptionsBar) */}
  <div className="flex h-8 shrink-0 items-center gap-3 rounded-md border border-border/50 bg-sidebar/40 px-3">
  {showsSize ? (
  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
  <span className="uppercase tracking-wide">Size</span>
  <NumberField value={brushSize} onChange={setBrushSize}
  min={2} max={120} step={1} className="w-16"
  tooltip="Brush diameter (px)" />
  </div>
  ) : tool === "rect" ? (
  <span className="text-[10px] text-muted-foreground/60">
  Drag to select a region, then pick {selection ? "a different region" : "Segm or Bbox"} to detect inside it.
  </span>
  ) : null}
  <div className="flex-1" />
  {inputImage && (
  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
    <Button variant="ghost" type="button" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + 1))}
      className="rounded px-1 py-0.5 transition-colors hover:bg-muted/50"
      title="Zoom in (+)">+</Button>
    <span className="w-8 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
    <Button variant="ghost" type="button" onClick={() => { setZoom((z) => Math.max(ZOOM_MIN, z - 1)); if (zoom <= 2) setPan({ x: 0, y: 0 }) }}
      className="rounded px-1 py-0.5 transition-colors hover:bg-muted/50"
      title="Zoom out (−)">−</Button>
    {isZoomed && (
    <Button variant="ghost" type="button" onClick={resetZoom}
      className="rounded px-1 py-0.5 text-muted-foreground/60 transition-colors hover:bg-muted/50 hover:text-muted-foreground"
      title="Reset zoom (Esc)">Reset</Button>
    )}
  </div>
  )}
  {hasPaint && (
  <Tip tip="Clear paint layer">
  <Button variant="ghost" type="button" onClick={clearPaint}
  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400">
  <Trash2 className="h-3 w-3" /> Clear
  </Button>
  </Tip>
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
  <ViewportAnchor dock="top-right" className="z-10">
  <Tip tip={`Wired from ${wiredUpstreamTitle} — click to change`}>
  <Button variant="ghost"
  type="button"
  onClick={() => setWireOpen(true)}
  data-wired-badge
  className="flex items-center gap-1 rounded bg-background/80 px-2 py-1 text-[10px] font-medium text-brand backdrop-blur-sm hover:bg-background"
  >
  <Link2 className="h-3 w-3" /> {wiredUpstreamTitle}
  </Button>
  </Tip>
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
  <Tip
  key={b.index}
  tip={on
  ? `BBox${b.index + 1} (${b.class}) — tap to drop it from the mask`
  : `BBox${b.index + 1} (${b.class}) — tap to keep only this instance`}
  >
  <Button variant="ghost"
  type="button" data-instance-badge={b.index}
  style={{ left: b.bbox[0] * viewSize.w, top: b.bbox[1] * viewSize.h }}
  onClick={() => toggleInstance(b.index)}
  className={cn(
  "absolute z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded px-1 text-[10px] font-bold transition-colors",
  on ? "bg-amber-400 text-black" : "bg-black/60 text-amber-200/80 hover:bg-black/80",
  )}
  >
  {b.index + 1}
  </Button>
  </Tip>
  )
  })}
  </>)}
  {/* PREP PREVIEW panel (view-only — writes nothing). Sliders preview
  the Inpaint card's knobs; the cyan overlay is the effective mask. */}
  {prepPreviewOn && (
  <ViewportAnchor
  data-prep-preview
  dock="bottom-left"
  className="z-10 w-60 rounded-lg border border-[#22d3ee]/40 bg-background/92 p-2.5 shadow-lg backdrop-blur-sm"
  >
  <div className="mb-1.5 flex items-center justify-between">
  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#22d3ee]">
  <Eye className="h-3 w-3" /> Effective mask
  </span>
  {prepCoveragePct !== null && (
  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
  {prepCoveragePct < 0.1 ? prepCoveragePct.toFixed(2) : prepCoveragePct.toFixed(1)}%
  </span>
  )}
  </div>
  <label className="block">
  <span className="text-[10px] text-muted-foreground">Grow / Shrink</span>
  <Input
  type="range" min={-32} max={32} step={1} value={prepGrow}
  onChange={(e) => setPrepGrow(Number(e.target.value))}
  className="mt-0.5 w-full accent-[#22d3ee]"
  />
  <span className="font-mono text-[10px] tabular-nums text-[#22d3ee]">{prepGrow}px</span>
  </label>
  <label className="mt-1 block">
  <span className="text-[10px] text-muted-foreground">Feather</span>
  <Input
  type="range" min={0} max={32} step={1} value={prepFeather}
  onChange={(e) => setPrepFeather(Number(e.target.value))}
  className="mt-0.5 w-full accent-[#22d3ee]"
  />
  <span className="font-mono text-[10px] tabular-nums text-[#22d3ee]">{prepFeather}px</span>
  </label>
  <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground/80">
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
  className="z-10 flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/90 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
  >
  <span className="mr-1 text-[10px] tabular-nums text-muted-foreground">
  {Math.round(selection.w)}×{Math.round(selection.h)} px
  </span>
  {detectMode === "none" ? (
  /* Detect is OFF — Segm/Bbox would hard-error in the brick
  (exports under "none" are a contract violation). The
  marquee still scopes the SAM3 producer: type a prompt
  in the rail and Segment. */
  <span data-sam3-scope-hint className="text-[10px] text-muted-foreground/80">
  Detect off — the selection scopes a SAM3 prompt
  </span>
  ) : (
  <>
  <Tip tip="YOLO + SAM — precise object masks inside the selection">
  <Button variant="ghost"
  type="button" data-detect-segm
  onClick={() => runDetect("segm")}
  className="flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-brand/90"
  >
  <ScanFace className="h-3 w-3" /> Segm
  </Button>
  </Tip>
  <Tip tip="YOLO only — fast bounding boxes inside the selection">
  <Button variant="ghost"
  type="button" data-detect-bbox
  onClick={() => runDetect("bbox")}
  className="flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/90 transition-colors hover:bg-sidebar/60 hover:text-brand"
  >
  <Square className="h-3 w-3" /> Bbox
  </Button>
  </Tip>
  </>
  )}
  <Tip tip="Clear selection">
  <Button variant="ghost"
  type="button" onClick={clearSelection} data-clear-selection
  aria-label="Clear selection"
  className="ml-0.5 rounded p-1 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
  >
  <X className="h-3.5 w-3.5" />
  </Button>
  </Tip>
  </ViewportAnchor>
  )}
  </PaintCanvas2D>
  </div>
  </>
  )
}
