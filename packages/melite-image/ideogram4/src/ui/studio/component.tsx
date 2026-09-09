/** IdeogramCanvasEditor — visual canvas + JSON editor for Ideogram 4's
 *  compositional-deconstruction prompt format.
 *
 *  Replaces the plain-text fields for `ideogram4_generate` with a full
 *  spatial layout editor:
 *
 *    • Drag-to-create and resize bounding boxes on a 0–1000 ideogram grid
 *    • Live two-way sync with the raw `elements` JSON (canvas ⇄ textarea)
 *    • Per-element inspector: description, text content, palette, bbox
 *    • Style description editor (aesthetics, lighting, medium, palette)
 *    • PNG metadata re-inflation (drag a generated PNG back to restore the layout)
 *    • Aspect-ratio aware, with presets that sync width × height
 *    • Keyboard shortcuts: ⌫ delete, ⌘D duplicate, arrows nudge, Esc deselect
 *    • Fullscreen canvas mode for tight layouts
 *
 *  No canvas library is pulled in. The viewport is an HTML overlay layer
 *  styled with `aspect-ratio: W / H` and `%` offsets, so bboxes are stored
 *  and rendered directly in Ideogram's native 0–1000 coordinate space — no
 *  per-frame normalization math, no SVG stretching on non-square aspects,
 *  crisp text at any size. Pointer events are converted back to ideogram
 *  units via the container's getBoundingClientRect().
 *
 *  Wire format (matches media/ideogram4.py `_build_caption`):
 *    elements: [{type:"obj"|"text", desc, text?, bbox:[ymin,xmin,ymax,xmax],
 *                color_palette:["#RRGGBB", ...]}]
 */
//
// Decomposed into ideoHelpers.ts + IdeogramCanvas.tsx + IdeoPanels.tsx
// by scripts/ideo_split.py (Phase 6 restructure) — pure refactor.
import type { ElementType, IdeoElement, StyleType } from './ideoHelpers'
import { ASPECT_PRESETS, GRID_SIZE, SNAP_UNITS, clamp, clampBbox, extractIdeogramCaptionFromPNG, genId, parseElementsJSON, sanitizeHexList, serializeElements } from './ideoHelpers'
import { StudioShell, defineShellDeclaration } from "@melite/ui"
import { IdeogramCanvas } from './IdeogramCanvas'
import { ElementInspector, JsonPanel, MicroLabel, StylePanel } from './IdeoPanels'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@melite/ui/button'
import { Tip } from '@melite/ui/tip'
import { Textarea } from '@melite/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@melite/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@melite/ui/dialog'
import { Input, useToastStore } from '@melite/ui'
import { Box, Type, Trash2, Copy, Grid3x3, Magnet, Maximize2, ChevronUp, ChevronDown, Sparkles, Wand2, Code2, Layers, Palette as PaletteIcon, Square, Upload } from 'lucide-react'
import { cn } from '@melite/ui'
export { __test } from './ideoHelpers'


// ─── Main ─────────────────────────────────────────────────────────────────

export interface IdeogramCanvasEditorProps {
  values: Record<string, unknown>
  setValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
}


type Tab = "elements" | "style" | "json"


export function IdeogramCanvasEditor({ values, setValues }: IdeogramCanvasEditorProps) {
  const toast = useToastStore((s) => s.addToast)

  // ── Source-of-truth state for the elements array ─────────────────────
  const [elements, setElementsInternal] = useState<IdeoElement[]>(() => {
    const initial = parseElementsJSON(String(values.elements ?? "[]"))
    return initial ?? []
  })
  // ── Multi-select: selectedIds is the source of truth; selectedId is a
  //    derived single-id for backward compatibility (inspector, keyboard).
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIds(id ? [id] : [])
  }, [])
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])
  const [tab, setTab] = useState<Tab>("elements")
  const [showGrid, setShowGrid] = useState(true)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  // Ref mirror of `elements` so commitElements can read the latest value
  // synchronously without nesting setState calls (which StrictMode would
  // double-invoke). Kept in sync via the effect below.
  const elementsRef = useRef<IdeoElement[]>(elements)
  useEffect(() => {
    elementsRef.current = elements
  }, [elements])

  // Track the last JSON we wrote back to values.elements so we can ignore
  // echoes from the parent (avoids an infinite re-parse loop).
  const lastWrittenRef = useRef<string>(String(values.elements ?? "[]"))
  // Track the last external JSON we ingested, to detect real external changes.
  const lastIngestedRef = useRef<string>(String(values.elements ?? "[]"))

  // ── Ingest external changes to values.elements (e.g. presets, PNG drop) ──
  useEffect(() => {
    const incoming = String(values.elements ?? "[]")
    if (incoming === lastWrittenRef.current) return // we just wrote it
    if (incoming === lastIngestedRef.current) return // already ingested
    lastIngestedRef.current = incoming
    const parsed = parseElementsJSON(incoming)
    if (parsed !== null) {
      setElementsInternal(parsed)
    }
  }, [values.elements])

  // ── Persist elements → values.elements ────────────────────────────────
  const writeBack = useCallback(
    (next: IdeoElement[]) => {
      const json = serializeElements(next)
      lastWrittenRef.current = json
      lastIngestedRef.current = json
      setValues((prev) => ({ ...prev, elements: json }))
    },
    [setValues],
  )

  const commitElements = useCallback(
    (updater: (prev: IdeoElement[]) => IdeoElement[]) => {
      // Read latest from the ref so we don't have to nest setState (which
      // StrictMode would double-invoke, re-running writeBack twice).
      const next = updater(elementsRef.current)
      elementsRef.current = next
      setElementsInternal(next)
      writeBack(next)
    },
    [writeBack],
  )

  const updateElement = useCallback(
    (id: string, patch: Partial<IdeoElement>) => {
      commitElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)))
    },
    [commitElements],
  )

  const addElement = useCallback(
    (type: ElementType) => {
      // place at center with a sensible default size
      const hasText = type === "text" || type === "logo"
      const w = hasText ? 500 : 350
      const h = type === "text" ? 120 : type === "logo" ? 200 : 300
      const xmin = Math.round((GRID_SIZE - w) / 2)
      const ymin = Math.round((GRID_SIZE - h) / 2)
      const newEl: IdeoElement = {
        id: genId(type),
        type,
        desc: "",
        text: hasText ? "" : undefined,
        bbox: clampBbox([ymin, xmin, ymin + h, xmin + w]),
        color_palette: [],
      }
      commitElements((prev) => [...prev, newEl])
      setSelectedId(newEl.id)
      setTab("elements")
    },
    [commitElements],
  )

  const deleteElement = useCallback(
    (id: string) => {
      commitElements((prev) => prev.filter((el) => el.id !== id))
      setSelectedIds((prev) => prev.filter((x) => x !== id))
    },
    [commitElements],
  )

  const duplicateElement = useCallback(
    (id: string) => {
      commitElements((prev) => {
        const src = prev.find((e) => e.id === id)
        if (!src) return prev
        const copy: IdeoElement = {
          ...src,
          id: genId(src.type),
          bbox: clampBbox([
            Math.min(src.bbox[0] + 40, GRID_SIZE - 50),
            Math.min(src.bbox[1] + 40, GRID_SIZE - 50),
            0,
            0,
          ]),
          color_palette: [...src.color_palette],
        }
        // recompute ymax/xmax
        copy.bbox[2] = Math.min(GRID_SIZE, copy.bbox[0] + (src.bbox[2] - src.bbox[0]))
        copy.bbox[3] = Math.min(GRID_SIZE, copy.bbox[1] + (src.bbox[3] - src.bbox[1]))
        copy.bbox = clampBbox(copy.bbox)
        setSelectedId(copy.id)
        return [...prev, copy]
      })
    },
    [commitElements],
  )

  const reorder = useCallback(
    (id: string, dir: "front" | "back") => {
      commitElements((prev) => {
        const idx = prev.findIndex((e) => e.id === id)
        if (idx === -1) return prev
        const next = prev.filter((_, i) => i !== idx)
        if (dir === "front") return [...next, prev[idx]]
        return [prev[idx], ...next]
      })
    },
    [commitElements],
  )

  const clearAll = useCallback(() => {
    if (elements.length === 0) return
    if (!confirm(`Clear all ${elements.length} elements?`)) return
    commitElements(() => [])
    setSelectedId(null)
  }, [elements.length, commitElements])

  // Shared import handler — used by both the canvas drop-zone and the JSON
  // tab's "Apply" / drop-zone. Replaces the current layout wholesale and
  // clears the selection so the new elements are obvious.
  const handleImportElements = useCallback(
    (next: IdeoElement[], source: string) => {
      commitElements(() => next)
      setSelectedId(null)
      toast("info", `Loaded ${next.length} element${next.length === 1 ? "" : "s"} from ${source}`)
    },
    [commitElements],
  )

  // Click-to-load PNG: the hidden Input type="file" in the toolbar triggers
  // this. Re-inflates the layout the same way a drop on the canvas does.
  const pngInputRef = useRef<HTMLInputElement | null>(null)
  const handlePngPick = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      // Reset so the same file can be picked again later
      e.target.value = ""
      if (!file) return
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
        handleImportElements(parsed, `PNG metadata (${file.name})`)
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Failed to read PNG")
      }
    },
    [handleImportElements],
  )

  // ── Derived view of the selected element ──────────────────────────────
  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId],
  )

  // ── Width/height from values (synced from the spec-sheet) ─────────────
  const width = Number(values.width ?? 1024) || 1024
  const height = Number(values.height ?? 1024) || 1024
  const aspectId = useMemo(() => {
    const match = ASPECT_PRESETS.find((p) => p.w === width && p.h === height)
    if (match) return match.id
    // approximate
    const r = width / height
    const sorted = [...ASPECT_PRESETS].sort(
      (a, b) => Math.abs(a.w / a.h - r) - Math.abs(b.w / b.h - r),
    )
    return sorted[0].id
  }, [width, height])

  const applyAspect = useCallback(
    (w: number, h: number) => {
      setValues((prev) => ({ ...prev, width: w, height: h }))
    },
    [setValues],
  )

  // ── Style fields are stored directly in values, not in local state ────
  const setStyle = useCallback(
    (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => {
      setValues(updater)
    },
    [setValues],
  )

  // ── Assemble the final caption for the JSON panel preview ─────────────
  const caption = useMemo(() => {
    const styleType = String(values.style_type ?? "none") as StyleType
    const captionObj: Record<string, unknown> = {}
    const hld = String(values.high_level_description ?? "").trim()
    if (hld) captionObj.high_level_description = hld
    if (styleType !== "none") {
      const sd: Record<string, unknown> = {}
      const a = String(values.aesthetics ?? "").trim()
      const l = String(values.lighting ?? "").trim()
      const m = String(values.medium ?? "").trim()
      const sv = String(values.style_value ?? "").trim()
      if (a) sd.aesthetics = a
      if (l) sd.lighting = l
      if (m) sd.medium = m
      if (styleType === "photo" && sv) sd.photo = sv
      if (styleType === "art_style" && sv) sd.art_style = sv
      const palette = sanitizeHexList(String(values.style_palette ?? ""))
      if (palette.length) sd.color_palette = palette
      if (Object.keys(sd).length) captionObj.style_description = sd
    }
    const bg = String(values.background ?? "").trim()
    captionObj.compositional_deconstruction = {
      background: bg || "(describe the scene background)",
      elements: elements.map((el) => {
        const o: Record<string, unknown> = { type: el.type, bbox: el.bbox, desc: el.desc || "(describe)" }
        if (el.type === "text" || el.type === "logo") o.text = el.text ?? ""
        if ((el.type === "text" || el.type === "logo") && el.font) o.font = el.font
        if (el.color_palette.length) o.color_palette = el.color_palette
        return o
      }),
    }
    return JSON.stringify(captionObj, null, 2)
  }, [values, elements])

  // ── Keyboard shortcuts (multi-select aware) ───────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't interfere with typing in inputs/textareas
      const t = e.target as HTMLElement | null
      const isTyping = t && (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable
      )
      if (isTyping && e.key !== "Escape") return

      if (selectedIds.length === 0) {
        if (e.key === "Escape") setSelectedIds([])
        return
      }
      const step = e.shiftKey ? 50 : 10

      if (e.key === "Escape") {
        setSelectedIds([])
        return
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault()
        commitElements((prev) => prev.filter((el) => !selectedIds.includes(el.id)))
        setSelectedIds([])
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault()
        const ids = [...selectedIds]
        commitElements((prev) => {
          const copies: IdeoElement[] = []
          for (const src of prev) {
            if (!ids.includes(src.id)) continue
            const copy: IdeoElement = {
              ...src,
              id: genId(src.type),
              bbox: clampBbox([
                Math.min(src.bbox[0] + 40, GRID_SIZE - 50),
                Math.min(src.bbox[1] + 40, GRID_SIZE - 50),
                0,
                0,
              ]),
              color_palette: [...src.color_palette],
            }
            copy.bbox[2] = Math.min(GRID_SIZE, copy.bbox[0] + (src.bbox[2] - src.bbox[0]))
            copy.bbox[3] = Math.min(GRID_SIZE, copy.bbox[1] + (src.bbox[3] - src.bbox[1]))
            copy.bbox = clampBbox(copy.bbox)
            copies.push(copy)
          }
          return [...prev, ...copies]
        })
        return
      }
      // Arrow-key nudge: apply the same delta to every selected element.
      let dy = 0
      let dx = 0
      switch (e.key) {
        case "ArrowUp": dy = -step; break
        case "ArrowDown": dy = step; break
        case "ArrowLeft": dx = -step; break
        case "ArrowRight": dx = step; break
        default: return
      }
      e.preventDefault()
      const ids = [...selectedIds]
      commitElements((prev) =>
        prev.map((el) => {
          if (!ids.includes(el.id)) return el
          const [ymin, xmin, ymax, xmax] = el.bbox
          const ow = xmax - xmin
          const oh = ymax - ymin
          const nxmin = clamp(xmin + dx, 0, GRID_SIZE - ow)
          const nymin = clamp(ymin + dy, 0, GRID_SIZE - oh)
          return { ...el, bbox: [nymin, nxmin, nymin + oh, nxmin + ow] as [number, number, number, number] }
        }),
      )
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedIds, commitElements])

  // ── When user selects an element via canvas, flip to inspector tab ────
  useEffect(() => {
    if (selectedId) setTab("elements")
  }, [selectedId])

  // Auto-switch background text + canvas state
  const background = String(values.background ?? "")

  // ── Render ────────────────────────────────────────────────────────────
  const canvasProps = {
    elements,
    selectedIds,
    onSelect: setSelectedId,
    onToggleSelect: toggleSelected,
    onCommit: commitElements,
    showGrid,
    snapEnabled,
    background,
    width,
    height,
    onImportElements: handleImportElements,
  }

  return (
    <StudioShell
      className="gap-3"
      rail={
        <div className="flex flex-col gap-3">
      {/* Background field — kept at the top because it's required */}
      <div className="space-y-1.5">
        <MicroLabel tooltip="Scene background. Required by Ideogram — sets the environment everything exists in.">
          Background
        </MicroLabel>
        <Textarea
          value={background}
          onChange={(e) => setValues((prev) => ({ ...prev, background: e.target.value }))}
          placeholder="A natural wood desk against a white wall."
          rows={2}
          className="min-h-[60px] resize-y bg-input/25 border-input/70 text-sm"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => addElement("obj")}
        >
          <Box className="h-3.5 w-3.5 text-cyan-400" /> Object
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => addElement("text")}
        >
          <Type className="h-3.5 w-3.5 text-violet-400" /> Text
        </Button>

        <div className="mx-1 h-5 w-px bg-border/70" />

        {/* Aspect ratio picker */}
        <div className="relative group">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  {(() => {
                    const Icon = ASPECT_PRESETS.find((p) => p.id === aspectId)?.Icon ?? Square
                    return <Icon className="h-3.5 w-3.5" />
                  })()}
                  {aspectId}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Aspect ratio (syncs width × height)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="absolute left-0 top-9 z-30 hidden group-hover:block group-focus-within:block">
            <div className="w-44 rounded-md border border-border/80 bg-popover p-1.5 shadow-lg">
              <div className="grid grid-cols-1 gap-0.5">
                {ASPECT_PRESETS.map((p) => (
                  <Button variant="ghost"
                    key={p.id}
                    type="button"
                    onClick={() => applyAspect(p.w, p.h)}
                    className={cn(
                      "flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent/60",
                      aspectId === p.id && "bg-accent/40",
                    )}
                  >
                    <p.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{p.id}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{p.w}×{p.h}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-1 h-5 w-px bg-border/70" />

        {/* Grid + snap toggles */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showGrid ? "secondary" : "outline"}
                size="icon-sm"
                className="h-8 w-8"
                onClick={() => setShowGrid((v) => !v)}
              >
                <Grid3x3 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Toggle 1000-grid overlay</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={snapEnabled ? "secondary" : "outline"}
                size="icon-sm"
                className="h-8 w-8"
                onClick={() => setSnapEnabled((v) => !v)}
              >
                <Magnet className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">Snap to {SNAP_UNITS}-unit grid</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="ml-auto flex items-center gap-1.5">
          <Input
            ref={pngInputRef}
            type="file"
            accept="image/png"
            className="hidden"
            onChange={handlePngPick}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => pngInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" /> Load PNG
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                Re-inflate layout from a generated PNG's metadata
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {elements.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={clearAll}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8"
                  onClick={() => setFullscreen(true)}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Fullscreen canvas</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Tabs: Elements / Style / JSON */}
      <div className="rounded-xl border border-border/70 bg-card/40">
        <div className="flex items-center gap-1 border-b border-border/70 px-2 pt-1.5">
          <TabButton active={tab === "elements"} onClick={() => setTab("elements")} icon={<Layers className="h-3.5 w-3.5" />}>
            Elements
            {elements.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] font-mono tabular-nums">
                {elements.length}
              </span>
            )}
          </TabButton>
          <TabButton active={tab === "style"} onClick={() => setTab("style")} icon={<PaletteIcon className="h-3.5 w-3.5" />}>
            Style
          </TabButton>
          <TabButton active={tab === "json"} onClick={() => setTab("json")} icon={<Code2 className="h-3.5 w-3.5" />}>
            JSON
          </TabButton>
        </div>

        <div className="p-3">
          {tab === "elements" && (
            selectedIds.length > 1 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Layers className="h-4 w-4 text-brand" />
                  {selectedIds.length} elements selected
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Drag to move the group together. Use arrow keys to nudge. Ctrl/⌘-click toggles selection.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      commitElements((prev) => prev.filter((el) => !selectedIds.includes(el.id)))
                      setSelectedIds([])
                    }}
                    className="gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete all
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedIds([])}
                  >
                    Deselect
                  </Button>
                </div>
              </div>
            ) : selected ? (
              <ElementInspector
                element={selected}
                onUpdate={(patch) => updateElement(selected.id, patch)}
                onDuplicate={() => duplicateElement(selected.id)}
                onDelete={() => deleteElement(selected.id)}
                onBringToFront={() => reorder(selected.id, "front")}
                onSendToBack={() => reorder(selected.id, "back")}
              />
            ) : (
              <ElementList
                elements={elements}
                selectedIds={selectedIds}
                onSelect={setSelectedId}
                onReorder={reorder}
                onDelete={deleteElement}
                onDuplicate={duplicateElement}
                onAddObject={() => addElement("obj")}
                onAddText={() => addElement("text")}
                onAddLogo={() => addElement("logo")}
              />
            )
          )}

          {tab === "style" && <StylePanel values={values} setValues={setStyle} />}


          {tab === "json" && (
            <JsonPanel
              caption={caption}
              elements={elements}
              onImportElements={handleImportElements}
            />
          )}
        </div>
      </div>

        </div>
      }
      center={
        <>
      {/* Canvas */}
      <div className="relative rounded-xl border border-border/70 bg-card/40 p-3 pb-7 tn-seam">
        <IdeogramCanvas {...canvasProps} />

        {/* helper line — sits in the pb-7 gutter below the canvas */}
        <div className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
          <Sparkles className="h-2.5 w-2.5 text-brand" />
          <span>
            {elements.length === 0
              ? "Drag on the canvas to create a region, or use +Object / +Text"
              : `${elements.length} element${elements.length === 1 ? "" : "s"} · click to select · drag handles to resize · double-click text to edit`}
          </span>
        </div>
      </div>

      {/* Fullscreen canvas dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[min(1100px,calc(100vw-2rem))] p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              Ideogram 4 Canvas
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                {width}×{height} · {aspectId}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="flex-1 rounded-lg border border-border/70 bg-card/40 p-3 pb-7">
              <IdeogramCanvas {...canvasProps} maxHeight={620} />
            </div>
            <div className="w-full lg:w-80 shrink-0">
              {selected ? (
                <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                  <ElementInspector
                    element={selected}
                    onUpdate={(patch) => updateElement(selected.id, patch)}
                    onDuplicate={() => duplicateElement(selected.id)}
                    onDelete={() => deleteElement(selected.id)}
                    onBringToFront={() => reorder(selected.id, "front")}
                    onSendToBack={() => reorder(selected.id, "back")}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-border/70 bg-card/40 p-3">
                  <ElementList
                    elements={elements}
                    selectedIds={selectedIds}
                    onSelect={setSelectedId}
                    onReorder={reorder}
                    onDelete={deleteElement}
                    onDuplicate={duplicateElement}
                    onAddObject={() => addElement("obj")}
                    onAddText={() => addElement("text")}
                    onAddLogo={() => addElement("logo")}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </>
      }
    />
  )
}


// ─── Tab button + element list primitives ────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-t-md border-b-2 px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-brand text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </Button>
  )
}


function ElementList({
  elements,
  selectedIds,
  onSelect,
  onReorder,
  onDelete,
  onDuplicate,
  onAddObject,
  onAddText,
  onAddLogo,
}: {
  elements: IdeoElement[]
  selectedIds: string[]
  onSelect: (id: string) => void
  onReorder: (id: string, dir: "front" | "back") => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onAddObject: () => void
  onAddText: () => void
  onAddLogo: () => void
}) {
  if (elements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center">
        <Wand2 className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
        <div className="text-sm font-medium">No elements yet</div>
        <p className="mx-auto mt-1 max-w-[28ch] text-[11px] text-muted-foreground">
          Add an object, text, or logo element, or drag on the canvas to create a region.
        </p>
        <div className="mt-3 flex justify-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onAddObject}>
            <Box className="h-3.5 w-3.5 text-cyan-400" /> Object
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onAddText}>
            <Type className="h-3.5 w-3.5 text-violet-400" /> Text
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onAddLogo}>
            <Layers className="h-3.5 w-3.5 text-amber-400" /> Logo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pb-1">
        <MicroLabel>Layout stack</MicroLabel>
        <span className="text-[10px] text-muted-foreground/60">top → bottom</span>
      </div>
      <div className="max-h-[280px] space-y-1 overflow-y-auto scrollbar-thin">
        {/* Display from top (end of array) to bottom (start of array) */}
        {[...elements].reverse().map((el, revIdx) => {
          const realIdx = elements.length - 1 - revIdx
          const isSel = selectedIds.includes(el.id)
          const preview = el.type === "text" || el.type === "logo" ? `“${el.text || el.type}”` : el.desc || `Object ${realIdx + 1}`
          return (
            <div
              key={el.id}
              onClick={() => onSelect(el.id)}
              className={cn(
                "group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
                isSel
                  ? "border-brand/70 bg-brand/10"
                  : "border-border/60 bg-input/15 hover:bg-input/30",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold",
                  el.type === "text"
                    ? "bg-violet-400/15 text-violet-300"
                    : el.type === "logo"
                      ? "bg-amber-400/15 text-amber-300"
                      : "bg-cyan-400/15 text-cyan-300",
                )}
              >
                {el.type === "text" ? <Type className="h-3 w-3" /> : el.type === "logo" ? <Layers className="h-3 w-3" /> : <Box className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate">{preview}</div>
                <div className="font-mono text-[9px] tabular-nums text-muted-foreground">
                  bbox [{el.bbox.map((v) => Math.round(v)).join(", ")}]
                </div>
              </div>
              {el.color_palette.length > 0 && (
                <div className="flex h-3 overflow-hidden rounded-sm border border-border/60">
                  {el.color_palette.slice(0, 4).map((c, i) => (
                    <div key={i} style={{ background: c, width: 6 }} />
                  ))}
                </div>
              )}
              <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                <Tip tip="Bring to front">
                <Button
                  type="button"
                  aria-label="Bring to front"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onReorder(el.id, "front")
                  }}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                </Tip>
                <Tip tip="Send to back">
                <Button
                  type="button"
                  aria-label="Send to back"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onReorder(el.id, "back")
                  }}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
                </Tip>
                <Tip tip="Duplicate">
                <Button
                  type="button"
                  aria-label="Duplicate"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(el.id)
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                </Tip>
                <Tip tip="Delete">
                <Button
                  type="button"
                  aria-label="Delete"
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(el.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                </Tip>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** THE SHELL RIDE, as data (row 5 stroke 4) — declared for the wall
 *  while the full StudioShell ride lands in later strokes: the HTML
 *  overlay canvas is the viewport (kind "native"), the element tabs
 *  are the rail surface (no file slots today). */
export const shellDeclaration = defineShellDeclaration({
  center: { kind: "native" },
  rail: { slots: [] },
})
