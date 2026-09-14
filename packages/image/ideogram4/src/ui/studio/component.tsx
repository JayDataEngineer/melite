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
import { StudioShell, defineShellDeclaration } from "@melite/card-base/shell"
import { IdeogramCanvas } from './IdeogramCanvas'
import { useToastStore } from '@melite/card-base/toast'
import { ElementInspector, JsonPanel, MicroLabel, StylePanel } from './IdeoPanels'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { Textarea, Tip } from './controls'
import { Box, Type, Trash2, Copy, Grid3x3, Magnet, Maximize2, ChevronUp, ChevronDown, SunSparkle, Wand2, Code2, Layers, Palette as PaletteIcon, SquareSmall as Square, Upload } from '@melite/card-base/icons'
import { cx } from '@melite/card-base/chrome'
import styles from './component.module.css'
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
    <>
    <StudioShell
      className={styles.shellGap}
      params={
        <div className={styles.railCol}>
      {/* Background field — kept at the top because it's required */}
      <div className={styles.bgField}>
        <MicroLabel tooltip="Scene background. Required by Ideogram — sets the environment everything exists in.">
          Background
        </MicroLabel>
        <Textarea
          value={background}
          onChange={(e) => setValues((prev) => ({ ...prev, background: e.target.value }))}
          placeholder="A natural wood desk against a white wall."
          rows={2}
          className={styles.bgArea}
        />
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <Button
          variant="outline"
          size="sm"
          className={styles.toolBtn}
          onClick={() => addElement("obj")}
        >
          <Box className={cx(styles.i14, styles.toneCyan)} /> Object
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={styles.toolBtn}
          onClick={() => addElement("text")}
        >
          <Type className={cx(styles.i14, styles.toneViolet)} /> Text
        </Button>

        <div className={styles.divider} />

        {/* Aspect ratio picker */}
        <div className={styles.aspectWrap}>
          <Tooltip label="Aspect ratio (syncs width × height)">
            <Button variant="outline" size="sm" className={styles.toolBtn}>
              {(() => {
                const Icon = ASPECT_PRESETS.find((p) => p.id === aspectId)?.Icon ?? Square
                return <Icon className={styles.i14} />
              })()}
              {aspectId}
            </Button>
          </Tooltip>
          <div className={styles.aspectPop}>
            <div className={styles.aspectCard}>
              <div className={styles.aspectList}>
                {ASPECT_PRESETS.map((p) => (
                  <Button variant="ghost"
                    key={p.id}
                    type="button"
                    onClick={() => applyAspect(p.w, p.h)}
                    className={cx(
                      styles.aspectRow,
                      aspectId === p.id ? styles.aspectRowActive : undefined,
                    )}
                  >
                    <p.Icon className={cx(styles.i14, styles.toneMuted)} />
                    <span>{p.id}</span>
                    <span className={styles.aspectDims}>{p.w}×{p.h}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Grid + snap toggles */}
        <Tooltip label="Toggle 1000-grid overlay">
          <Button
            variant={showGrid ? "primary" : "outline"}
            size="sm"
            className={styles.btnSquare}
            onClick={() => setShowGrid((v) => !v)}
          >
            <Grid3x3 className={styles.i14} />
          </Button>
        </Tooltip>
        <Tooltip label={`Snap to ${SNAP_UNITS}-unit grid`}>
          <Button
            variant={snapEnabled ? "primary" : "outline"}
            size="sm"
            className={styles.btnSquare}
            onClick={() => setSnapEnabled((v) => !v)}
          >
            <Magnet className={styles.i14} />
          </Button>
        </Tooltip>

        <div className={styles.toolbarRight}>
          <input
            ref={pngInputRef}
            type="file"
            accept="image/png"
            className={styles.hiddenInput}
            onChange={handlePngPick}
          />
          <Tooltip label="Re-inflate layout from a generated PNG's metadata">
            <Button
              variant="outline"
              size="sm"
              className={styles.toolBtn}
              onClick={() => pngInputRef.current?.click()}
            >
              <Upload className={styles.i14} /> Load PNG
            </Button>
          </Tooltip>
          {elements.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className={cx(styles.toolBtn, styles.toneDanger)}
              onClick={clearAll}
            >
              <Trash2 className={styles.i14} /> Clear
            </Button>
          )}
          <Tooltip label="Fullscreen canvas">
            <Button
              variant="outline"
              size="sm"
              className={styles.btnSquare}
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className={styles.i14} />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Tabs: Elements / Style / JSON */}
      <div className={styles.tabsCard}>
        <div className={styles.tabsBar}>
          <TabButton active={tab === "elements"} onClick={() => setTab("elements")} icon={<Layers className={styles.i14} />}>
            Elements
            {elements.length > 0 && (
              <span className={cx(styles.countBadge, styles.mono)}>
                {elements.length}
              </span>
            )}
          </TabButton>
          <TabButton active={tab === "style"} onClick={() => setTab("style")} icon={<PaletteIcon className={styles.i14} />}>
            Style
          </TabButton>
          <TabButton active={tab === "json"} onClick={() => setTab("json")} icon={<Code2 className={styles.i14} />}>
            JSON
          </TabButton>
        </div>

        <div className={styles.tabsBody}>
          {tab === "elements" && (
            selectedIds.length > 1 ? (
              <div className={styles.multiSel}>
                <div className={styles.multiTitle}>
                  <Layers className={cx(styles.i16, styles.toneBrand)} />
                  {selectedIds.length} elements selected
                </div>
                <p className={styles.multiHint}>
                  Drag to move the group together. Use arrow keys to nudge. Ctrl/⌘-click toggles selection.
                </p>
                <div className={styles.multiBtns}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      commitElements((prev) => prev.filter((el) => !selectedIds.includes(el.id)))
                      setSelectedIds([])
                    }}
                  >
                    <Trash2 className={styles.i14} />
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
      preview={
        <>
      {/* Canvas */}
      <div className={cx(styles.canvasCard, "tn-seam")}>
        <IdeogramCanvas {...canvasProps} />

        {/* helper line — sits in the pb-7 gutter below the canvas */}
        <div className={styles.helperLine}>
          <SunSparkle className={cx(styles.i10, styles.toneBrand)} />
          <span>
            {elements.length === 0
              ? "Drag on the canvas to create a region, or use +Object / +Text"
              : `${elements.length} element${elements.length === 1 ? "" : "s"} · click to select · drag handles to resize · double-click text to edit`}
          </span>
        </div>
      </div>

      {/* Fullscreen canvas dialog */}
      <Modal
        open={fullscreen}
        onClose={() => setFullscreen(false)}
        title="Ideogram 4 Canvas"
        closeLabel="Close"
        description={`${width}×${height} · ${aspectId}`}
        contentClassName={styles.dialogScroll}
      >
          <div className={styles.dialogBody}>
            <div className={styles.dialogCanvas}>
              <IdeogramCanvas {...canvasProps} maxHeight={620} />
            </div>
            <div className={styles.dialogSide}>
              {selected ? (
                <div className={styles.dialogPanel}>
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
                <div className={styles.dialogPanel}>
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
      </Modal>
        </>
      }
    />
    </>
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
      variant="ghost"
      onClick={onClick}
      className={cx(
        styles.tabBtn,
        active ? styles.tabBtnActive : styles.tabBtnIdle,
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
      <div className={styles.emptyState}>
        <Wand2 className={cx(styles.i20, styles.emptyIcon)} />
        <div className={styles.emptyTitle}>No elements yet</div>
        <p className={styles.emptyHint}>
          Add an object, text, or logo element, or drag on the canvas to create a region.
        </p>
        <div className={styles.emptyBtns}>
          <Button variant="outline" size="sm" className={styles.toolBtn} onClick={onAddObject}>
            <Box className={cx(styles.i14, styles.toneCyan)} /> Object
          </Button>
          <Button variant="outline" size="sm" className={styles.toolBtn} onClick={onAddText}>
            <Type className={cx(styles.i14, styles.toneViolet)} /> Text
          </Button>
          <Button variant="outline" size="sm" className={styles.toolBtn} onClick={onAddLogo}>
            <Layers className={cx(styles.i14, styles.toneAmber)} /> Logo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.listStack}>
      <div className={styles.listHead}>
        <MicroLabel>Layout stack</MicroLabel>
        <span className={styles.listDir}>top → bottom</span>
      </div>
      <div className={cx(styles.listScroll, "scrollbar-thin")}>
        {/* Display from top (end of array) to bottom (start of array) */}
        {[...elements].reverse().map((el, revIdx) => {
          const realIdx = elements.length - 1 - revIdx
          const isSel = selectedIds.includes(el.id)
          const preview = el.type === "text" || el.type === "logo" ? `“${el.text || el.type}”` : el.desc || `Object ${realIdx + 1}`
          return (
            <div
              key={el.id}
              onClick={() => onSelect(el.id)}
              className={cx(
                styles.elRow,
                isSel ? styles.elRowSelected : styles.elRowIdle,
              )}
            >
              <span
                className={cx(
                  styles.elBadge,
                  el.type === "text"
                    ? styles.elBadgeText
                    : el.type === "logo"
                      ? styles.elBadgeLogo
                      : styles.elBadgeObj,
                )}
              >
                {el.type === "text" ? <Type className={styles.i12} /> : el.type === "logo" ? <Layers className={styles.i12} /> : <Box className={styles.i12} />}
              </span>
              <div className={styles.elMain}>
                <div className={styles.elPreview}>{preview}</div>
                <div className={cx(styles.elBbox, styles.mono)}>
                  bbox [{el.bbox.map((v) => Math.round(v)).join(", ")}]
                </div>
              </div>
              {el.color_palette.length > 0 && (
                <div className={styles.elSwatches}>
                  {el.color_palette.slice(0, 4).map((c, i) => (
                    <div key={i} style={{ background: c, width: 6 }} />
                  ))}
                </div>
              )}
              <div className={styles.elActions}>
                <Tip tip="Bring to front">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Bring to front"
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    onReorder(el.id, "front")
                  }}
                >
                  <ChevronUp className={styles.i12} />
                </Button>
                </Tip>
                <Tip tip="Send to back">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Send to back"
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    onReorder(el.id, "back")
                  }}
                >
                  <ChevronDown className={styles.i12} />
                </Button>
                </Tip>
                <Tip tip="Duplicate">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Duplicate"
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(el.id)
                  }}
                >
                  <Copy className={styles.i12} />
                </Button>
                </Tip>
                <Tip tip="Delete">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Delete"
                  className={cx(styles.iconBtn, styles.iconBtnDanger)}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(el.id)
                  }}
                >
                  <Trash2 className={styles.i12} />
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
  preview: { kind: "native" },
  params: { slots: [] },
})
