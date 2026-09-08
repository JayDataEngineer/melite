// Interactive canvas for the Ideogram layout editor — drag-to-create
// and resize bounding boxes on the 0–1000 ideogram grid.
//
// Carved from IdeogramCanvasEditor.tsx by scripts/ideo_split.py
// (Phase 6 restructure) — pure refactor.
import type { IdeoElement } from './ideoHelpers'
import { CANVAS_MAX_HEIGHT, GRID_SIZE, MIN_BOX, bboxToRect, clamp, clampBbox, extractIdeogramCaptionFromPNG, genId, snap } from './ideoHelpers'
import { useCallback, useRef, useState } from 'react'
import { Textarea, useToastStore } from '@melite/ui'
import { Box, Type, Image as ImageIcon } from 'lucide-react'
import { cn } from '@melite/ui'
import { Tip } from '@melite/ui/tip'


type PointerMode =
  | { kind: "idle" }
  | { kind: "move"; startX: number; startY: number; subjects: { id: string; origBbox: [number, number, number, number] }[] }
  | { kind: "resize"; id: string; handle: HandleId; startX: number; startY: number; origBbox: [number, number, number, number] }
  | { kind: "draw"; startX: number; startY: number; curX: number; curY: number }


type HandleId = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"


// ─── Canvas ───────────────────────────────────────────────────────────────

interface CanvasProps {
  elements: IdeoElement[]
  /** Full selection set — halos drawn on all of these. */
  selectedIds: string[]
  /** Callback for plain click (replaces selection with [id], or clears). */
  onSelect: (id: string | null) => void
  /** Callback for ctrl/⌘-click (toggles id in the selection set). */
  onToggleSelect?: (id: string) => void
  onCommit: (updater: (prev: IdeoElement[]) => IdeoElement[]) => void
  showGrid: boolean
  snapEnabled: boolean
  background: string
  width: number
  height: number
  /** Pixel cap for the canvas's rendered height. Defaults to CANVAS_MAX_HEIGHT. */
  maxHeight?: number
  className?: string
  /** Optional PNG re-inflation handler — when present, the canvas accepts
   *  PNG drops (drag-and-drop) so users can restore a layout directly onto
   *  the canvas without switching to the JSON tab. */
  onImportElements?: (next: IdeoElement[], source: string) => void
}


export function IdeogramCanvas({
  elements,
  selectedIds,
  onSelect,
  onToggleSelect,
  onCommit,
  showGrid,
  snapEnabled,
  background,
  width,
  height,
  maxHeight = CANVAS_MAX_HEIGHT,
  className,
  onImportElements,
}: CanvasProps) {
  /** Last-selected id — used for resize handles + cursor styling. */
  const primaryId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<PointerMode>({ kind: "idle" })
  const [pngDragOver, setPngDragOver] = useState(false)
  const toast = useToastStore((s) => s.addToast)

  // ── Inline text editing (double-click a text/logo element) ──
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [inlineText, setInlineText] = useState("")
  const commitInlineText = useCallback(() => {
    const id = editingTextId
    if (!id) return
    const val = inlineText
    onCommit((prev) =>
      prev.map((el) => (el.id === id ? { ...el, text: val } : el)),
    )
    setEditingTextId(null)
  }, [editingTextId, inlineText, onCommit])

  /** Convert client pointer coords → ideogram 0–1000 space using the
   *  container's bounding rect. Cheap and correct for any aspect ratio. */
  const toLocal = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return {
      x: clamp(((clientX - r.left) / r.width) * GRID_SIZE, 0, GRID_SIZE),
      y: clamp(((clientY - r.top) / r.height) * GRID_SIZE, 0, GRID_SIZE),
    }
  }, [])

  // ── PNG drop: re-inflate a layout by dropping a generated PNG on the canvas.
  //    We only accept the drop if the dragged payload includes a PNG file;
  //    otherwise we let the event bubble (so non-PNG drags don't get eaten).
  const canDropPng = !!onImportElements
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!canDropPng) return
      // A drag only counts if it carries files (not text/elements from elsewhere)
      if (!e.dataTransfer.types.includes("Files")) return
      e.preventDefault() // REQUIRED — otherwise the drop event never fires
      e.dataTransfer.dropEffect = "copy"
      if (!pngDragOver) setPngDragOver(true)
    },
    [canDropPng, pngDragOver],
  )
  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // Only clear when leaving the container itself (not a child element)
      if (e.currentTarget === e.target) setPngDragOver(false)
    },
    [],
  )
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      if (!canDropPng) return
      const file = e.dataTransfer.files?.[0]
      // Always clear the overlay + prevent the browser from opening the file
      setPngDragOver(false)
      if (!file) return
      e.preventDefault()
      if (!file.type.includes("png")) {
        toast("error", "Only PNG files can be re-inflated")
        return
      }
      try {
        const parsed = await extractIdeogramCaptionFromPNG(file)
        if (!parsed) {
          toast("info", "No Ideogram caption found in PNG metadata")
          return
        }
        onImportElements(parsed, `PNG metadata (${file.name})`)
        toast("success", `Restored ${parsed.length} element${parsed.length === 1 ? "" : "s"} from PNG`)
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Failed to read PNG")
      }
    },
    [canDropPng, onImportElements],
  )

  const patchBbox = useCallback(
    (id: string, next: [number, number, number, number]) => {
      onCommit((prev) =>
        prev.map((el) => (el.id === id ? { ...el, bbox: clampBbox(next) } : el)),
      )
    },
    [onCommit],
  )

  // Pointer handlers ────────────────────────────────────────────────────

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      // Only start a draw if click landed on the container itself or the
      // background layer (not on a box / handle / label).
      const target = e.target as HTMLElement
      const onBackground =
        target === containerRef.current ||
        target.dataset.canvasBg === "1" ||
        target.dataset.grid === "1"
      if (!onBackground) return
      const { x, y } = toLocal(e.clientX, e.clientY)
      onSelect(null)
      try {
        containerRef.current?.setPointerCapture(e.pointerId)
      } catch {
        // Browser API: setPointerCapture can throw if the pointer was
        // already released or the element isn't pointer-capture-eligible.
        // Same policy exemption as play()/fullscreen — silent catch is correct.
      }
      setMode({ kind: "draw", startX: x, startY: y, curX: x, curY: y })
    },
    [toLocal, onSelect],
  )

  const handleBoxPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, el: IdeoElement) => {
      if (e.button !== 0) return
      e.stopPropagation()

      // Ctrl/⌘-click toggles membership in the selection set without dragging.
      if ((e.ctrlKey || e.metaKey) && onToggleSelect) {
        onToggleSelect(el.id)
        return
      }

      // If the clicked element is already part of a multi-selection,
      // drag the whole group. Otherwise, single-select + drag.
      const groupDrag = selectedIds.includes(el.id) && selectedIds.length > 1
      if (!groupDrag) {
        onSelect(el.id)
      }

      const dragIds = groupDrag ? selectedIds : [el.id]
      const subjects = dragIds
        .map((id) => {
          const found = elements.find((x) => x.id === id)
          return found ? { id, origBbox: found.bbox } : null
        })
        .filter((s): s is { id: string; origBbox: [number, number, number, number] } => !!s)

      const { x, y } = toLocal(e.clientX, e.clientY)
      try {
        containerRef.current?.setPointerCapture(e.pointerId)
      } catch {
        // Browser API: setPointerCapture can throw if the pointer was
        // already released or the element isn't pointer-capture-eligible.
        // Same policy exemption as play()/fullscreen — silent catch is correct.
      }
      setMode({ kind: "move", startX: x, startY: y, subjects })
    },
    [toLocal, onSelect, onToggleSelect, selectedIds, elements],
  )

  const handleHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, el: IdeoElement, handle: HandleId) => {
      if (e.button !== 0) return
      e.stopPropagation()
      const { x, y } = toLocal(e.clientX, e.clientY)
      try {
        containerRef.current?.setPointerCapture(e.pointerId)
      } catch {
        // Browser API: setPointerCapture can throw if the pointer was
        // already released or the element isn't pointer-capture-eligible.
        // Same policy exemption as play()/fullscreen — silent catch is correct.
      }
      setMode({
        kind: "resize",
        id: el.id,
        handle,
        startX: x,
        startY: y,
        origBbox: el.bbox,
      })
    },
    [toLocal],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (mode.kind === "idle") return
      const { x, y } = toLocal(e.clientX, e.clientY)

      if (mode.kind === "draw") {
        setMode({ ...mode, curX: x, curY: y })
        return
      }

      if (mode.kind === "move") {
        let dx = x - mode.startX
        let dy = y - mode.startY
        if (snapEnabled) {
          dx = snap(dx, true)
          dy = snap(dy, true)
        }
        // Apply the same delta to every subject in the group drag.
        const finalDx = dx
        const finalDy = dy
        onCommit((prev) =>
          prev.map((el) => {
            const subj = mode.subjects.find((s) => s.id === el.id)
            if (!subj) return el
            const [oymin, oxmin, oymax, oxmax] = subj.origBbox
            const ow = oxmax - oxmin
            const oh = oymax - oymin
            const nxmin = clamp(oxmin + finalDx, 0, GRID_SIZE - ow)
            const nymin = clamp(oymin + finalDy, 0, GRID_SIZE - oh)
            return { ...el, bbox: [nymin, nxmin, nymin + oh, nxmin + ow] as [number, number, number, number] }
          }),
        )
        return
      }

      if (mode.kind === "resize") {
        const [oymin, oxmin, oymax, oxmax] = mode.origBbox
        let nxmin = oxmin
        let nymin = oymin
        let nxmax = oxmax
        let nymax = oymax
        let nx = x
        let ny = y
        if (snapEnabled) {
          nx = snap(nx, true)
          ny = snap(ny, true)
        }
        const h = mode.handle
        if (h.includes("w")) nxmin = clamp(nx, 0, nxmax - MIN_BOX)
        if (h.includes("e")) nxmax = clamp(nx, nxmin + MIN_BOX, GRID_SIZE)
        if (h.includes("n")) nymin = clamp(ny, 0, nymax - MIN_BOX)
        if (h.includes("s")) nymax = clamp(ny, nymin + MIN_BOX, GRID_SIZE)
        patchBbox(mode.id, [nymin, nxmin, nymax, nxmax])
      }
    },
    [mode, toLocal, snapEnabled, patchBbox],
  )

  const finishInteraction = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        containerRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        // Browser API: see setPointerCapture note above. Silent catch.
      }
      if (mode.kind === "draw") {
        const { startX, startY, curX, curY } = mode
        const xmin = Math.min(startX, curX)
        const xmax = Math.max(startX, curX)
        const ymin = Math.min(startY, curY)
        const ymax = Math.max(startY, curY)
        if (xmax - xmin >= MIN_BOX && ymax - ymin >= MIN_BOX) {
          const newEl: IdeoElement = {
            id: genId("el"),
            type: "obj",
            desc: "",
            bbox: clampBbox([ymin, xmin, ymax, xmax]),
            color_palette: [],
          }
          onCommit((prev) => [...prev, newEl])
          onSelect(newEl.id)
        }
      }
      setMode({ kind: "idle" })
    },
    [mode, onCommit, onSelect],
  )

  // ── Render ─────────────────────────────────────────────────────────────

  // Visual viewport sizing: cap height at maxHeight, shrink width
  // proportionally for tall aspect ratios.
  const ratio = width / height
  const cssMaxWidth = Math.round(maxHeight * ratio)
  const drawMode = mode.kind === "draw"

  const HANDLE_DEFS: { id: HandleId; pos: React.CSSProperties; cursor: string }[] = [
    { id: "nw", pos: { left: "0%",   top: "0%"   }, cursor: "nwse-resize" },
    { id: "n",  pos: { left: "50%",  top: "0%"   }, cursor: "ns-resize" },
    { id: "ne", pos: { left: "100%", top: "0%"   }, cursor: "nesw-resize" },
    { id: "e",  pos: { left: "100%", top: "50%"  }, cursor: "ew-resize" },
    { id: "se", pos: { left: "100%", top: "100%" }, cursor: "nwse-resize" },
    { id: "s",  pos: { left: "50%",  top: "100%" }, cursor: "ns-resize" },
    { id: "sw", pos: { left: "0%",   top: "100%" }, cursor: "nesw-resize" },
    { id: "w",  pos: { left: "0%",   top: "50%"  }, cursor: "ew-resize" },
  ]

  return (
    <div className={cn("w-full flex flex-col items-center", className)}>
      <div
        className="relative w-full"
        style={{ maxWidth: `min(100%, ${cssMaxWidth}px)` }}
      >
        <div
          ref={containerRef}
          className={cn(
            "relative w-full touch-none select-none overflow-hidden rounded-lg border border-border/70",
            "shadow-[inset_0_0_0_1px_oklch(0_0_0/0.04)]",
            drawMode ? "cursor-crosshair" : "cursor-default",
            pngDragOver && "ring-2 ring-brand/70 ring-offset-2 ring-offset-card",
          )}
          style={{
            aspectRatio: `${width} / ${height}`,
            background:
              "var(--canvas-bg, oklch(0.20 0.012 264 / 1))",
          }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishInteraction}
          onPointerCancel={finishInteraction}
          onDragOver={canDropPng ? handleDragOver : undefined}
          onDragLeave={canDropPng ? handleDragLeave : undefined}
          onDrop={canDropPng ? handleDrop : undefined}
        >
          {/* PNG drop overlay — shown while dragging a PNG over the canvas */}
          {pngDragOver && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-brand/15 backdrop-blur-[1px]">
              <ImageIcon className="h-7 w-7 text-brand" />
              <span className="text-xs font-semibold text-brand">
                Drop PNG to restore layout
              </span>
            </div>
          )}

          {/* Background layer (catches empty-canvas clicks) */}
          <div data-canvas-bg="1" className="absolute inset-0" />

          {/* Background text — centered hint of what the scene contains */}
          {background && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
              <span
                className="line-clamp-4 text-base font-semibold text-muted-foreground/25 sm:text-lg"
                style={{ wordBreak: "break-word" }}
              >
                {background}
              </span>
            </div>
          )}

          {/* Grid overlay — minor (2.5%) + major (10%) using CSS gradients */}
          {showGrid && (
            <>
              <div
                data-grid="1"
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, oklch(0.7 0.02 264 / 0.07) 1px, transparent 1px)," +
                    "linear-gradient(to bottom, oklch(0.7 0.02 264 / 0.07) 1px, transparent 1px)",
                  backgroundSize: "2.5% 2.5%",
                }}
              />
              <div
                data-grid="1"
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, oklch(0.7 0.02 264 / 0.18) 1px, transparent 1px)," +
                    "linear-gradient(to bottom, oklch(0.7 0.02 264 / 0.18) 1px, transparent 1px)",
                  backgroundSize: "10% 10%",
                }}
              />
            </>
          )}

          {/* Elements (later array index = drawn on top) */}
          {elements.map((el) => {
            const { x, y, w, h } = bboxToRect(el.bbox)
            const isSel = selectedIds.includes(el.id)
            const isText = el.type === "text"
            const isLogo = el.type === "logo"
            const accentVar = isText
              ? "var(--ideo-text, oklch(0.78 0.13 245))"
              : isLogo
                ? "var(--ideo-logo, oklch(0.78 0.14 75))"
                : "var(--ideo-obj, oklch(0.78 0.16 196))"
            const accentCls = isText
              ? "border-violet-400/70 bg-violet-400/10"
              : isLogo
                ? "border-amber-400/70 bg-amber-400/10"
                : "border-cyan-400/70 bg-cyan-400/10"
            const tagCls = isText
              ? "bg-violet-400/90 text-violet-950"
              : isLogo
                ? "bg-amber-400/90 text-amber-950"
                : "bg-cyan-400/90 text-cyan-950"
            const label = isText || isLogo ? `“${el.text || el.type}”` : el.desc || "object"

            return (
              <div
                key={el.id}
                className="absolute"
                style={{
                  left: `${x / 10}%`,
                  top: `${y / 10}%`,
                  width: `${w / 10}%`,
                  height: `${h / 10}%`,
                }}
              >
                {/* Selection halo (slightly larger than the box) */}
                {isSel && (
                  <div
                    className="pointer-events-none absolute -inset-1 rounded-sm border-2"
                    style={{ borderColor: accentVar, opacity: 0.4 }}
                  />
                )}

                {/* Main outline — receives pointer events for move */}
                <div
                  onPointerDown={(e) => handleBoxPointerDown(e, el)}
                  onDoubleClick={
                    (isText || isLogo)
                      ? () => {
                          setEditingTextId(el.id)
                          setInlineText(el.text ?? "")
                        }
                      : undefined
                  }
                  className={cn(
                    "absolute inset-0 rounded-sm border-2 transition-colors",
                    accentCls,
                    isSel ? "shadow-[0_0_0_1px_oklch(1_0_0/0.04)]" : "",
                  )}
                  style={{ cursor: mode.kind === "move" && mode.subjects.some((s) => s.id === el.id) ? "grabbing" : "grab" }}
                />

                {/* Type tag (top-left) */}
                <div
                  className={cn(
                    "pointer-events-none absolute left-1 top-1 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                    tagCls,
                  )}
                >
                  {isText ? <Type className="h-2.5 w-2.5" /> : <Box className="h-2.5 w-2.5" />}
                  {isText ? "TXT" : "OBJ"}
                </div>

                {/* Description label — only when the box is tall enough that the
                    label (at top-7 ≈ 28px) won't overflow the box bottom. On a
                    460px-tall canvas, 80 grid-units ≈ 37px, just clearing the tag. */}
                {w > 60 && h > 80 && (
                  <Tip tip={label}>
                    <div
                      className="pointer-events-none absolute left-1.5 top-7 max-w-[calc(100%-0.75rem)] truncate text-xs font-medium text-foreground/85"
                    >
                      {label}
                    </div>
                  </Tip>
                )}

                {/* Color palette strip (bottom) */}
                {el.color_palette.length > 0 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-2 overflow-hidden">
                    {el.color_palette.map((c, i) => (
                      <div
                        key={i}
                        style={{ background: c, flex: 1 }}
                        className="opacity-95"
                      />
                    ))}
                  </div>
                )}

                {/* Resize handles (rendered on the primary selection only) */}
                {isSel &&
                  el.id === primaryId &&
                  !editingTextId &&
                  HANDLE_DEFS.map((hdef) => (
                    <div
                      key={hdef.id}
                      onPointerDown={(e) => handleHandlePointerDown(e, el, hdef.id)}
                      className="absolute h-3 w-3 rounded-sm border-2 bg-background"
                      style={{
                        ...hdef.pos,
                        transform: "translate(-50%, -50%)",
                        borderColor: accentVar,
                        cursor: hdef.cursor,
                      }}
                    />
                  ))}

                {/* Inline text editor (double-click text/logo to edit) */}
                {editingTextId === el.id && (isText || isLogo) && (
                  <Textarea
                    autoFocus
                    value={inlineText}
                    onChange={(e) => setInlineText(e.target.value)}
                    onBlur={commitInlineText}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        e.stopPropagation()
                        commitInlineText()
                      } else if (e.key === "Escape") {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditingTextId(null)
                      }
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    placeholder={isLogo ? "Logo text…" : "Text…"}
                    className="absolute inset-0 z-20 h-auto resize-none rounded-sm border-2 border-brand bg-background/95 p-1.5 text-xs font-medium text-foreground outline-none ring-2 ring-brand/30 placeholder:text-muted-foreground/50"
                  />
                )}
              </div>
            )
          })}

          {/* Drag-create preview */}
          {mode.kind === "draw" && (
            <div
              className="pointer-events-none absolute border-2 border-dashed"
              style={{
                left: `${Math.min(mode.startX, mode.curX) / 10}%`,
                top: `${Math.min(mode.startY, mode.curY) / 10}%`,
                width: `${Math.abs(mode.curX - mode.startX) / 10}%`,
                height: `${Math.abs(mode.curY - mode.startY) / 10}%`,
                borderColor: "var(--ideo-obj, oklch(0.78 0.16 196))",
                background: "oklch(0.78 0.16 196 / 0.12)",
              }}
            />
          )}
        </div>

        {/* Coordinate readout while interacting */}
        {(mode.kind === "draw" || mode.kind === "move" || mode.kind === "resize") && (
          <div className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground backdrop-blur">
            {mode.kind === "draw" && (
              <>
                draw {Math.round(Math.min(mode.startX, mode.curX))},
                {Math.round(Math.min(mode.startY, mode.curY))} → {Math.round(Math.max(mode.startX, mode.curX))},
                {Math.round(Math.max(mode.startY, mode.curY))}
              </>
            )}
            {mode.kind === "move" &&
              (() => {
                const sid = mode.subjects[0]?.id
                const el = sid ? elements.find((e) => e.id === sid) : undefined
                return el
                  ? `${mode.subjects.length > 1 ? `${mode.subjects.length} els · ` : ""}bbox = [${el.bbox.map((v) => Math.round(v)).join(", ")}]`
                  : null
              })()}
            {mode.kind === "resize" &&
              (() => {
                const el = elements.find((e) => e.id === mode.id)
                return el
                  ? `${mode.handle} → [${el.bbox.map((v) => Math.round(v)).join(", ")}]`
                  : null
              })()}
          </div>
        )}
      </div>
    </div>
  )
}
