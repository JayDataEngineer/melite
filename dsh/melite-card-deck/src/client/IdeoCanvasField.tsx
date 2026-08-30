/**
 * IdeoCanvasField — the ideogram_canvas FORM FIELD renderer for the deck.
 *
 * THE ADVANCED IDEOGRAM MODE, imported into the new card system. Ported
 * from git history:
 *   plugins/ideogram/cards/canvas/{component,IdeogramCanvas,IdeoPanels}.tsx
 *     (the spatial layout editor for Ideogram 4 compositional-deconstruction)
 *   web/editor/src/surfaces/generate/Slots.tsx IdeogramCanvasSlot
 *     (the caption ⇄ flat-values bridge, deleted with 44cd7e3b)
 *
 * Feature parity with the original surface:
 *   • drag-to-create / move / group-move / 8-handle resize on the 0–1000 grid
 *   • multi-select (ctrl/⌘-click), arrow nudge, ⌘D duplicate, ⌫ delete, Esc
 *   • live two-way sync with the raw elements JSON (canvas ⇄ JSON tab)
 *   • per-element inspector: text content, font presets, description, bbox, palette
 *   • style description editor + one-click style/palette/font presets
 *   • PNG metadata re-inflation (drop or pick a generated PNG)
 *   • aspect-ratio presets that sync the card's width/height fields
 *   • fullscreen canvas drilldown
 *
 * Deliberate adaptations (documented, not silent):
 *   • VALUE SEMANTICS — the field value IS params.prompt: the assembled
 *     caption JSON string (assembleCaption on every edit, flattenCaption on
 *     ingest). The family requires prompt non-empty; untouched fields stay
 *     "" so required-marking keeps working.
 *   • NO AI TAB — ideogramAI POSTs /v1/llm/ideogram-ai, which the deck host
 *     half stubs by design ("the assistant IS DSH"). The feature cannot run
 *     here; the JSON tab still exposes the caption for external tooling.
 *   • KEYBOARD SCOPE — shortcuts ride the card root (onKeyDown), not window:
 *     an embedded chat card must not hijack global Delete/arrows.
 *   • TOASTS → inline status line; lucide icons → inline SVGs; Tailwind →
 *     CSS module on --dsw-* tokens (deck law: no color literals).
 */
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import css from './ideoField.module.css'
import {
  ASPECT_PRESETS, CANVAS_MAX_HEIGHT, FONT_PRESETS, GRID_SIZE, MIN_BOX,
  PALETTE_PRESETS, SNAP_UNITS, STYLE_PRESETS,
  assembleCaption, bboxToRect, buildCaptionPreview, clamp, clampBbox,
  copyText, extractIdeogramCaptionFromPNG, flattenCaption, genId,
  normalizeHex, parseElementsJSON, sanitizeHexList, snap, serializeElements,
  type ElementType, type IdeoElement, type IdeogramCaption, type StyleType,
} from './ideoField.ts'

export interface IdeoCanvasFieldProps {
  /** The current field value — caption object or JSON string (may be empty). */
  value: unknown
  /** Write the assembled caption back to the form (this field). */
  onChange(next: unknown): void
  /** Sibling read access — width/height live in neighboring fields. */
  getValues(): Record<string, unknown>
  /** Sibling write — aspect presets propagate to the width/height fields. */
  setSibling(name: 'width' | 'height', v: number): void
}

type PointerMode =
  | { kind: 'idle' }
  | { kind: 'move'; startX: number; startY: number; subjects: { id: string; origBbox: [number, number, number, number] }[] }
  | { kind: 'resize'; id: string; handle: HandleId; startX: number; startY: number; origBbox: [number, number, number, number] }
  | { kind: 'draw'; startX: number; startY: number; curX: number; curY: number }

type HandleId = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
type Tab = 'elements' | 'style' | 'json'

function numOr(v: unknown, d: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

// ─── Inline glyphs (the deck carries no icon dependency) ─────────────────

function Glyph({ d, size = 13 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Proportional rectangle glyph for an aspect row. */
function AspectGlyph({ w, h }: { w: number; h: number }) {
  const r = w / h
  const bw = r >= 1 ? 14 : Math.max(4, Math.round(14 * r))
  const bh = r >= 1 ? Math.max(4, Math.round(14 / r)) : 14
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <rect x={(16 - bw) / 2} y={(16 - bh) / 2} width={bw} height={bh} rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  )
}
const G_BOX = "M3 3h10v10H3z"
const G_TYPE = "M3 4h10 M8 4v9"
const G_LAYERS = "M8 2l6 3-6 3-6-3z M2 9l6 3 6-3"
const G_GRID = "M3 3h10v10H3z M3 8h10 M8 3v10"
const G_MAGNET = "M5 2v6a3 3 0 0 0 6 0V2 M5 2h2v4H5z M9 2h2v4H9z"
const G_MAX = "M2 6V2h4 M10 2h4v4 M14 10v4h-4 M6 14H2v-4"
const G_UPLOAD = "M8 11V3 M4.5 6L8 2.5 11.5 6 M3 13h10"
const G_TRASH = "M3 5h10 M6 5V3h4v2 M5 5l1 9h4l1-9"
const G_COPY = "M6 6h7v7H6z M10 6V3H3v7h3"
const G_UP = "M4 10l4-4 4 4"
const G_DOWN = "M4 6l4 4 4-4"
const G_PLUS = "M8 3v10 M3 8h10"
const G_X = "M4 4l8 8 M12 4l-8 8"
const G_CHECK = "M3 9l3.5 3.5L13 5"
const G_CLIP = "M6 3h4v2H6zM4 5h8v8H4z M6 8h4"
const G_PAL = "M8 2a6 6 0 1 0 0 12c1.5 0 1-2 2-2.5S13 12 13.5 10C14.5 6 12 2 8 2z M5.5 6.5h.01 M8 5h.01 M10.5 6.5h.01"
const G_CODE = "M6 4L2.5 8 6 12 M10 4l3.5 4L10 12"
const G_IMG = "M2 3h12v10H2z M2 10l3.5-3 3 2.5L11 7l3 3"

// ─── Component ───────────────────────────────────────────────────────────

export function IdeoCanvasField({ value, onChange, getValues, setSibling }: IdeoCanvasFieldProps) {
  // ── Dimensions — seeded from sibling fields, kept in step (1 s poll; the
  // deck mutates its values ref without re-rendering this field).
  const [dims, setDims] = useState(() => ({ w: numOr(getValues().width, 1024), h: numOr(getValues().height, 1024) }))
  useEffect(() => {
    const t = window.setInterval(() => {
      const w = numOr(getValues().width, 1024)
      const h = numOr(getValues().height, 1024)
      setDims((d) => (d.w === w && d.h === h ? d : { w, h }))
    }, 1000)
    return () => window.clearInterval(t)
  }, [getValues])

  // ── Flat editor state (style/background/elements-json) — owned here;
  // every user edit reassembles the caption and emits it via onChange.
  const [flat, setFlat] = useState<Record<string, unknown>>(() =>
    flattenCaption(value, numOr(getValues().width, 1024), numOr(getValues().height, 1024)))
  const flatRef = useRef(flat)
  useEffect(() => { flatRef.current = flat }, [flat])

  const emitFlat = useCallback((next: Record<string, unknown>) => {
    setFlat(next)
    flatRef.current = next
    onChange(assembleCaption(next))
  }, [onChange])

  // ── Elements — source-of-truth array + ref mirror for synchronous commits.
  const [elements, setElementsInternal] = useState<IdeoElement[]>(() => {
    const initial = parseElementsJSON(String(flat.elements ?? "[]"))
    return initial ?? []
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const elementsInitRef = useRef(true)
  const elementsRef = useRef(elements)
  useEffect(() => { elementsRef.current = elements }, [elements])

  const commitElements = useCallback((updater: (prev: IdeoElement[]) => IdeoElement[]) => {
    const next = updater(elementsRef.current)
    elementsRef.current = next
    setElementsInternal(next)
    emitFlat({ ...flatRef.current, elements: serializeElements(next) })
  }, [emitFlat])

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIds(id ? [id] : [])
  }, [])
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  // ── View state ──
  const [tab, setTab] = useState<Tab>('elements')
  const [showGrid, setShowGrid] = useState(true)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const fullscreenRef = useRef(fullscreen)
  useEffect(() => { fullscreenRef.current = fullscreen }, [fullscreen])

  // ── Inline status (replaces the toast store) ──
  const [status, setStatus] = useState<{ msg: string; kind: 'info' | 'error' } | null>(null)
  const statusTimer = useRef<number>(undefined)
  const say = useCallback((msg: string, kind: "info" | "error" = "info") => {
    setStatus({ msg, kind })
    window.clearTimeout(statusTimer.current)
    statusTimer.current = window.setTimeout(() => setStatus(null), 4000)
  }, [])
  useEffect(() => () => window.clearTimeout(statusTimer.current), [])

  // ── Element ops ──
  const addElement = useCallback((type: ElementType) => {
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
  }, [commitElements, setSelectedId])

  const deleteIds = useCallback((ids: string[]) => {
    commitElements((prev) => prev.filter((el) => !ids.includes(el.id)))
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
  }, [commitElements])

  const makeCopy = useCallback((src: IdeoElement): IdeoElement => {
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
    return copy
  }, [])

  const duplicateIds = useCallback((ids: string[], focusFirst: boolean) => {
    let firstNewId: string | null = null
    commitElements((prev) => {
      const copies: IdeoElement[] = []
      for (const src of prev) {
        if (!ids.includes(src.id)) continue
        const copy = makeCopy(src)
        if (firstNewId === null) firstNewId = copy.id
        copies.push(copy)
      }
      return [...prev, ...copies]
    })
    if (focusFirst && firstNewId !== null) setSelectedId(firstNewId)
  }, [commitElements, makeCopy, setSelectedId])

  const reorder = useCallback((id: string, dir: "front" | "back") => {
    commitElements((prev) => {
      const idx = prev.findIndex((e) => e.id === id)
      if (idx === -1) return prev
      const next = prev.filter((_, i) => i !== idx)
      if (dir === "front") return [...next, prev[idx]]
      return [prev[idx], ...next]
    })
  }, [commitElements])

  const clearAll = useCallback(() => {
    if (elements.length === 0) return
    const msg = `Clear all ${elements.length} elements?`
    if (!window.confirm(msg)) return
    commitElements(() => [])
    setSelectedId(null)
  }, [elements.length, commitElements, setSelectedId])

  const handleImportElements = useCallback((next: IdeoElement[], source: string) => {
    commitElements(() => next)
    setSelectedId(null)
    const n = next.length
    say(`Loaded ${n} element${n === 1 ? "" : "s"} from ${source}`)
  }, [commitElements, setSelectedId, say])

  // ── PNG re-inflation ──
  const pngInputRef = useRef<HTMLInputElement | null>(null)
  const readPng = useCallback(async (file: File): Promise<boolean> => {
    if (!file.type.includes("png")) {
      say("Only PNG files can be re-inflated", "error")
      return false
    }
    try {
      const parsed = await extractIdeogramCaptionFromPNG(file)
      if (!parsed || parsed.length === 0) {
        say("No Ideogram caption found in PNG metadata")
        return false
      }
      handleImportElements(parsed, `PNG metadata (${file.name})`)
      return true
    } catch (err) {
      say(err instanceof Error ? err.message : "Failed to read PNG", "error")
      return false
    }
  }, [handleImportElements, say])
  const handlePngPick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) await readPng(file)
  }, [readPng])

  // ── Derived ──
  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId],
  )
  const background = String(flat.background ?? "")
  const ratio = dims.w / dims.h
  const aspectId = useMemo(() => {
    const match = ASPECT_PRESETS.find((p) => p.w === dims.w && p.h === dims.h)
    if (match) return match.id
    const sorted = [...ASPECT_PRESETS].sort(
      (a, b) => Math.abs(a.w / a.h - ratio) - Math.abs(b.w / b.h - ratio),
    )
    return sorted[0].id
  }, [dims.w, dims.h, ratio])
  const applyAspect = useCallback((w: number, h: number) => {
    setDims({ w, h })
    setSibling("width", w)
    setSibling("height", h)
  }, [setSibling])

  const captionPreview = useMemo(
    () => buildCaptionPreview(assembleCaption(flat)),
    [flat],
  )

  // ── Keyboard (scoped to this card — see header note) ──
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement | null
    const isTyping = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
    if (isTyping) return
    if (e.key === "Escape") {
      if (fullscreenRef.current) { setFullscreen(false); return }
      if (selectedIds.length > 0) setSelectedIds([])
      return
    }
    if (selectedIds.length === 0) return
    const step = e.shiftKey ? 50 : 10
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault()
      deleteIds(selectedIds)
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      e.preventDefault()
      duplicateIds(selectedIds, false)
      return
    }
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
  }, [selectedIds, deleteIds, duplicateIds, commitElements])

  useEffect(() => {
    if (selectedId !== null) setTab("elements")
  }, [selectedId])

  const inspectorFor = (el: IdeoElement) => (
    <ElementInspector
      element={el}
      onUpdate={(patch) => commitElements((prev) => prev.map((x) => (x.id === el.id ? { ...x, ...patch } : x)))}
      onDuplicate={() => duplicateIds([el.id], true)}
      onDelete={() => deleteIds([el.id])}
      onBringToFront={() => reorder(el.id, "front")}
      onSendToBack={() => reorder(el.id, "back")}
    />
  )

  const listFor = () => (
    <ElementList
      elements={elements}
      selectedIds={selectedIds}
      onSelect={setSelectedId}
      onReorder={reorder}
      onDelete={(id) => deleteIds([id])}
      onDuplicate={(id) => duplicateIds([id], true)}
      onAddObject={() => addElement("obj")}
      onAddText={() => addElement("text")}
      onAddLogo={() => addElement("logo")}
    />
  )

  const canvasNode = (maxHeight: number) => (
    <IdeoCanvas
      elements={elements}
      selectedIds={selectedIds}
      onSelect={setSelectedId}
      onToggleSelect={toggleSelected}
      onCommit={commitElements}
      showGrid={showGrid}
      snapEnabled={snapEnabled}
      background={background}
      width={dims.w}
      height={dims.h}
      maxHeight={maxHeight}
      onImportElements={handleImportElements}
      say={say}
    />
  )

  return (
    <div className={css.root} onKeyDown={onKeyDown}>
      {/* Background — required by Ideogram, kept first like the original */}
      <div className={css.stack}>
        <span className={css.microLabel} title="Scene background. Required by Ideogram — sets the environment everything exists in.">Background</span>
        <textarea
          className={css.textarea2}
          rows={2}
          value={background}
          placeholder="A natural wood desk against a white wall."
          onChange={(e) => emitFlat({ ...flatRef.current, background: e.target.value })}
        />
      </div>

      {/* Toolbar */}
      <div className={css.toolbar}>
        <button type="button" className={css.toolBtn} onClick={() => addElement("obj")}><Glyph d={G_BOX} /> Object</button>
        <button type="button" className={css.toolBtn} onClick={() => addElement("text")}><Glyph d={G_TYPE} /> Text</button>
        <span className={css.divider} />
        <AspectPicker aspectId={aspectId} onApply={applyAspect} />
        <span className={css.divider} />
        <button
          type="button"
          className={css.toolBtn}
          data-on={showGrid || undefined}
          title="Toggle 1000-grid overlay"
          onClick={() => setShowGrid((v) => !v)}
        ><Glyph d={G_GRID} /></button>
        <button
          type="button"
          className={css.toolBtn}
          data-on={snapEnabled || undefined}
          title={`Snap to ${SNAP_UNITS}-unit grid`}
          onClick={() => setSnapEnabled((v) => !v)}
        ><Glyph d={G_MAGNET} /></button>
        <span className={css.spacer} />
        <input ref={pngInputRef} type="file" accept="image/png" style={{ display: "none" }} onChange={handlePngPick} />
        <button type="button" className={css.toolBtn} title="Re-inflate layout from a generated PNG metadata" onClick={() => pngInputRef.current?.click()}>
          <Glyph d={G_UPLOAD} /> Load PNG
        </button>
        {elements.length > 0 && (
          <button type="button" className={css.toolBtn} data-danger title="Remove every element" onClick={clearAll}>
            <Glyph d={G_TRASH} /> Clear
          </button>
        )}
        <button type="button" className={css.toolBtn} title="Fullscreen canvas" onClick={() => setFullscreen(true)}>
          <Glyph d={G_MAX} />
        </button>
      </div>
      {status !== null && <div className={css.status} data-kind={status.kind}>{status.msg}</div>}

      {/* Canvas */}
      <div className={css.canvasShell}>
        {canvasNode(CANVAS_MAX_HEIGHT)}
        <div className={css.helperLine}>
          {elements.length === 0
            ? "Drag on the canvas to create a region, or use +Object / +Text"
            : `${elements.length} element${elements.length === 1 ? "" : "s"} · click to select · drag handles to resize · double-click text to edit`}
        </div>
      </div>

      {/* Tabs: Elements / Style / JSON */}
      <div className={css.panelBox}>
        <div className={css.tabRail}>
          <TabBtn active={tab === "elements"} onClick={() => setTab("elements")} icon={<Glyph d={G_LAYERS} />}>
            Elements
            {elements.length > 0 && <span className={css.tabCount}>{elements.length}</span>}
          </TabBtn>
          <TabBtn active={tab === "style"} onClick={() => setTab("style")} icon={<Glyph d={G_PAL} />}>Style</TabBtn>
          <TabBtn active={tab === "json"} onClick={() => setTab("json")} icon={<Glyph d={G_CODE} />}>JSON</TabBtn>
        </div>
        <div className={css.tabBody}>
          {tab === "elements" && (
            selectedIds.length > 1 ? (
              <MultiSelectPanel count={selectedIds.length} onDeleteAll={() => deleteIds(selectedIds)} onDeselect={() => setSelectedIds([])} />
            ) : selected ? (
              inspectorFor(selected)
            ) : (
              listFor()
            )
          )}
          {tab === "style" && (
            <StylePanel
              values={flat}
              setValues={(updater) => emitFlat(updater(flatRef.current))}
            />
          )}
          {tab === "json" && (
            <JsonPanel
              caption={captionPreview}
              elements={elements}
              onImportElements={handleImportElements}
              say={say}
            />
          )}
        </div>
      </div>

      {/* Fullscreen drilldown (portal — escapes any transformed ancestor) */}
      {fullscreen && createPortal(
        <div className={css.fullscreen} role="dialog" aria-label="Ideogram canvas fullscreen">
          <div className={css.fsHead}>
            <h3 className={css.fsTitle}><Glyph d={G_IMG} size={15} /> Ideogram 4 Canvas</h3>
            <span className={css.fsDims}>{dims.w}&times;{dims.h} &middot; {aspectId}</span>
            <button type="button" className={css.iconBtn} title="Close (Esc)" onClick={() => setFullscreen(false)}><Glyph d={G_X} size={15} /></button>
          </div>
          <div className={css.fsBody}>
            <div className={`${css.canvasShell} ${css.fsCanvasPane}`}>{canvasNode(720)}</div>
            <div className={css.fsSidePane}>
              <div className={css.fsCard}>
                {selected ? inspectorFor(selected) : listFor()}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

// ─── Interactive canvas (port of IdeogramCanvas.tsx) ─────────────────────

interface CanvasProps {
  elements: IdeoElement[]
  selectedIds: string[]
  onSelect: (id: string | null) => void
  onToggleSelect?: (id: string) => void
  onCommit: (updater: (prev: IdeoElement[]) => IdeoElement[]) => void
  showGrid: boolean
  snapEnabled: boolean
  background: string
  width: number
  height: number
  maxHeight?: number
  onImportElements?: (next: IdeoElement[], source: string) => void
  say(msg: string, kind?: 'info' | 'error'): void
}

function IdeoCanvas({
  elements, selectedIds, onSelect, onToggleSelect, onCommit,
  showGrid, snapEnabled, background, width, height,
  maxHeight = CANVAS_MAX_HEIGHT, onImportElements, say,
}: CanvasProps) {
  const primaryId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mode, setMode] = useState<PointerMode>({ kind: 'idle' })
  const [pngDragOver, setPngDragOver] = useState(false)

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

  /** Client pointer coords → ideogram 0–1000 space via the bounding rect. */
  const toLocal = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return {
      x: clamp(((clientX - r.left) / r.width) * GRID_SIZE, 0, GRID_SIZE),
      y: clamp(((clientY - r.top) / r.height) * GRID_SIZE, 0, GRID_SIZE),
    }
  }, [])

  // ── PNG drop: re-inflate a layout by dropping a generated PNG. Only drags
  // carrying Files are claimed; everything else bubbles.
  const canDropPng = !!onImportElements
  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!canDropPng) return
      if (!e.dataTransfer.types.includes("Files")) return
      e.preventDefault()
      e.dataTransfer.dropEffect = "copy"
      if (!pngDragOver) setPngDragOver(true)
    },
    [canDropPng, pngDragOver],
  )
  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (e.currentTarget === e.target) setPngDragOver(false)
    },
    [],
  )
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      if (!canDropPng) return
      const file = e.dataTransfer.files?.[0]
      setPngDragOver(false)
      if (!file) return
      e.preventDefault()
      if (!file.type.includes("png")) {
        say("Only PNG files can be re-inflated", "error")
        return
      }
      try {
        const parsed = await extractIdeogramCaptionFromPNG(file)
        if (!parsed || parsed.length === 0) {
          say("No Ideogram caption found in PNG metadata")
          return
        }
        if (onImportElements) onImportElements(parsed, `PNG metadata (${file.name})`)
      } catch (err) {
        say(err instanceof Error ? err.message : "Failed to read PNG", "error")
      }
    },
    [canDropPng, onImportElements, say],
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

  const capturePointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try {
      containerRef.current?.setPointerCapture(e.pointerId)
    } catch {
      // Browser API: setPointerCapture throws when the pointer is already
      // released or not capture-eligible — the same silent-catch exemption
      // as play()/fullscreen in the original surface.
    }
  }, [])

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      const onBackground =
        target === containerRef.current ||
        target.dataset.canvasBg === "1" ||
        target.dataset.grid === "1"
      if (!onBackground) return
      const { x, y } = toLocal(e.clientX, e.clientY)
      onSelect(null)
      capturePointer(e)
      setMode({ kind: "draw", startX: x, startY: y, curX: x, curY: y })
    },
    [toLocal, onSelect, capturePointer],
  )

  const handleBoxPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, el: IdeoElement) => {
      if (e.button !== 0) return
      e.stopPropagation()
      if ((e.ctrlKey || e.metaKey) && onToggleSelect) {
        onToggleSelect(el.id)
        return
      }
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
      capturePointer(e)
      setMode({ kind: "move", startX: x, startY: y, subjects })
    },
    [toLocal, onSelect, onToggleSelect, selectedIds, elements, capturePointer],
  )

  const handleHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, el: IdeoElement, handle: HandleId) => {
      if (e.button !== 0) return
      e.stopPropagation()
      const { x, y } = toLocal(e.clientX, e.clientY)
      capturePointer(e)
      setMode({
        kind: "resize",
        id: el.id,
        handle,
        startX: x,
        startY: y,
        origBbox: el.bbox,
      })
    },
    [toLocal, capturePointer],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (mode.kind === 'idle') return
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
        onCommit((prev) =>
          prev.map((el) => {
            const subj = mode.subjects.find((s) => s.id === el.id)
            if (!subj) return el
            const [oymin, oxmin, oymax, oxmax] = subj.origBbox
            const ow = oxmax - oxmin
            const oh = oymax - oymin
            const nxmin = clamp(oxmin + dx, 0, GRID_SIZE - ow)
            const nymin = clamp(oymin + dy, 0, GRID_SIZE - oh)
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
    [mode, toLocal, snapEnabled, patchBbox, onCommit],
  )

  const finishInteraction = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      try {
        containerRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        // Browser API — see capturePointer note above. Silent catch.
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

  // ── Canvas render ──
  const cssMaxWidth = Math.round(maxHeight * (width / height))
  const drawMode = mode.kind === "draw"

  const HANDLE_DEFS: { id: HandleId; pos: React.CSSProperties; cursor: string }[] = [
    { id: "nw", pos: { left: "0%", top: "0%" }, cursor: "nwse-resize" },
    { id: "n", pos: { left: "50%", top: "0%" }, cursor: "ns-resize" },
    { id: "ne", pos: { left: "100%", top: "0%" }, cursor: "nesw-resize" },
    { id: "e", pos: { left: "100%", top: "50%" }, cursor: "ew-resize" },
    { id: "se", pos: { left: "100%", top: "100%" }, cursor: "nwse-resize" },
    { id: "s", pos: { left: "50%", top: "100%" }, cursor: "ns-resize" },
    { id: "sw", pos: { left: "0%", top: "100%" }, cursor: "nesw-resize" },
    { id: "w", pos: { left: "0%", top: "50%" }, cursor: "ew-resize" },
  ]

  return (
    <div className={css.canvasOuter}>
      <div
        ref={containerRef}
        className={css.canvas}
        data-draw={drawMode || undefined}
        data-png-over={pngDragOver || undefined}
        tabIndex={-1}
        style={{ aspectRatio: `${width} / ${height}`, maxWidth: `min(100%, ${cssMaxWidth}px)` }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishInteraction}
        onPointerCancel={finishInteraction}
        onKeyDown={undefined}
        onDragOver={canDropPng ? handleDragOver : undefined}
        onDragLeave={canDropPng ? handleDragLeave : undefined}
        onDrop={canDropPng ? handleDrop : undefined}
      >
        {pngDragOver && (
          <div className={css.pngOverlay}><Glyph d={G_IMG} size={26} /> Drop PNG to restore layout</div>
        )}
        <div data-canvas-bg="1" className={css.canvasBgLayer} />
        {background !== "" && (
          <div className={css.canvasHint}><span>{background}</span></div>
        )}
        {showGrid && (
          <>
            <div data-grid="1" className={css.gridMinor} />
            <div data-grid="1" className={css.gridMajor} />
          </>
        )}
        {elements.map((el) => {
          const { x, y, w, h } = bboxToRect(el.bbox)
          const isSel = selectedIds.includes(el.id)
          const isText = el.type === "text"
          const isLogo = el.type === "logo"
          const label = isText || isLogo ? `“${el.text || el.type}”` : el.desc !== "" ? el.desc : "object"
          return (
            <div
              key={el.id}
              className={css.box}
              data-type={el.type}
              style={{ left: `${x / 10}%`, top: `${y / 10}%`, width: `${w / 10}%`, height: `${h / 10}%` }}
            >
              {isSel && <div className={css.halo} />}
              <div
                onPointerDown={(e) => handleBoxPointerDown(e, el)}
                onDoubleClick={isText || isLogo ? () => { setEditingTextId(el.id); setInlineText(el.text ?? "") } : undefined}
                className={css.boxBody}
                title={label}
                style={{ cursor: mode.kind === "move" && mode.subjects.some((s) => s.id === el.id) ? "grabbing" : "grab" }}
              />
              <div className={css.boxTag}>{isText ? "TXT" : isLogo ? "LOGO" : "OBJ"}</div>
              {w > 60 && h > 80 && <div className={css.boxLabel}>{label}</div>}
              {el.color_palette.length > 0 && (
                <div className={css.paletteStrip}>
                  {el.color_palette.map((c, i) => (
                    <div key={i} style={{ background: c, flex: 1 }} />
                  ))}
                </div>
              )}
              {isSel && el.id === primaryId && editingTextId === null && HANDLE_DEFS.map((hdef) => (
                <div
                  key={hdef.id}
                  onPointerDown={(e) => handleHandlePointerDown(e, el, hdef.id)}
                  className={css.handle}
                  style={{ ...hdef.pos, transform: "translate(-50%, -50%)", cursor: hdef.cursor }}
                />
              ))}
              {editingTextId === el.id && (isText || isLogo) && (
                <textarea
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
                  className={css.inlineEditor}
                />
              )}
            </div>
          )
        })}
        {mode.kind === "draw" && (
          <div
            className={css.drawPreview}
            style={{
              left: `${Math.min(mode.startX, mode.curX) / 10}%`,
              top: `${Math.min(mode.startY, mode.curY) / 10}%`,
              width: `${Math.abs(mode.curX - mode.startX) / 10}%`,
              height: `${Math.abs(mode.curY - mode.startY) / 10}%`,
            }}
          />
        )}
      </div>
      {(mode.kind === "draw" || mode.kind === "move" || mode.kind === "resize") && (
        <div className={css.coordReadout}>
          {mode.kind === "draw" && (
            <>
              draw {Math.round(Math.min(mode.startX, mode.curX))},
              {Math.round(Math.min(mode.startY, mode.curY))} → {Math.round(Math.max(mode.startX, mode.curX))},
              {Math.round(Math.max(mode.startY, mode.curY))}
            </>
          )}
          {mode.kind === "move" && (() => {
            const sid = mode.subjects[0]?.id
            const el = sid !== undefined ? elements.find((e) => e.id === sid) : undefined
            if (!el) return null
            const n = mode.subjects.length
            return `${n > 1 ? `${n} els · ` : ""}bbox = [${el.bbox.map((v) => Math.round(v)).join(", ")}]`
          })()}
          {mode.kind === "resize" && (() => {
            const el = elements.find((e) => e.id === mode.id)
            if (!el) return null
            return `${mode.handle} → [${el.bbox.map((v) => Math.round(v)).join(", ")}]`
          })()}
        </div>
      )}
    </div>
  )
}

// ─── Panels (port of IdeoPanels.tsx + the component-local bits) ──────────

function TabBtn({ active, onClick, icon, children }: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className={css.tabBtn} data-active={active || undefined}>
      {icon}
      {children}
    </button>
  )
}

/** Aspect-ratio dropdown — presets sync the card width/height fields. */
function AspectPicker({ aspectId, onApply }: { aspectId: string; onApply(w: number, h: number): void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={css.aspectWrap}>
      <button type="button" className={css.toolBtn} title="Aspect ratio (syncs width × height)" onClick={() => setOpen((v) => !v)}>
        <AspectGlyph w={1024} h={1024} />
        {aspectId}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 29 }} onClick={() => setOpen(false)} />
          <div className={css.aspectMenu}>
            {ASPECT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={css.aspectRow}
                data-active={p.id === aspectId || undefined}
                onClick={() => { onApply(p.w, p.h); setOpen(false) }}
              >
                <AspectGlyph w={p.w} h={p.h} />
                <span>{p.id}</span>
                <span className={css.aspectDims}>{p.w}&times;{p.h}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MultiSelectPanel({ count, onDeleteAll, onDeselect }: {
  count: number
  onDeleteAll(): void
  onDeselect(): void
}) {
  return (
    <div className={css.rowGap}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 550 }}>
        <Glyph d={G_LAYERS} /> {count} elements selected
      </div>
      <p style={{ margin: 0, fontSize: 10.5, opacity: 0.65 }}>Drag to move the group together. Use arrow keys to nudge. Ctrl/&#8984;-click toggles selection.</p>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className={css.miniBtn} onClick={onDeleteAll}><Glyph d={G_TRASH} /> Delete all</button>
        <button type="button" className={css.miniBtn} onClick={onDeselect}>Deselect</button>
      </div>
    </div>
  )
}

/** Editable color palette row — swatch picker + hex text + presets. */
export function ColorPaletteInput({ colors, onChange, max = 5 }: {
  colors: string[]
  onChange: (next: string[]) => void
  max?: number
}) {
  const [presetOpen, setPresetOpen] = useState(false)
  const safe = colors.slice(0, max)

  const update = (i: number, v: string) => {
    const norm = normalizeHex(v)
    const next = [...safe]
    next[i] = norm ?? v
    onChange(next)
  }
  const remove = (i: number) => onChange(safe.filter((_, idx) => idx !== i))
  const add = () => {
    if (safe.length >= max) return
    onChange([...safe, "#CCCCCC"])
  }

  return (
    <div className={css.rowGap}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        {safe.map((c, i) => {
          const norm = normalizeHex(c)
          return (
            <div key={i} className="swatchWrap" style={{ position: "relative" }}>
              <div
                className={css.swatch}
                style={{ background: norm ?? "transparent" }}
              >
                <input
                  type="color"
                  value={norm ?? "#000000"}
                  onChange={(e) => update(i, e.target.value.toUpperCase())}
                  aria-label={`Color ${i + 1}`}
                />
                {norm === null && (
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--dsw-alias-state-error-primary)", pointerEvents: "none" }}>?</span>
                )}
              </div>
              <button type="button" className={css.swatchRemove} aria-label="Remove color" onClick={() => remove(i)}>
                <Glyph d={G_X} size={8} />
              </button>
            </div>
          )
        })}
        {safe.length < max && (
          <button type="button" className={css.swatch} aria-label="Add color" style={{ background: "transparent", borderStyle: "dashed", cursor: "pointer" }} onClick={add}>
            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Glyph d={G_PLUS} size={11} /></span>
          </button>
        )}
        <input
          className={`${css.input} ${css.monoInput}`}
          style={{ flex: 1, minWidth: 110 }}
          value={safe.join(",")}
          onChange={(e) => onChange(sanitizeHexList(e.target.value))}
          placeholder="#RRGGBB,..."
        />
        <span className={css.palWrap}>
          <button type="button" className={css.miniBtn} title="Preset palettes" aria-label="Preset palettes" onClick={() => setPresetOpen((v) => !v)}>
            <Glyph d={G_PAL} size={13} />
          </button>
          {presetOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={() => setPresetOpen(false)} />
              <div className={css.palMenu}>
                <div className={css.microLabel} style={{ marginBottom: 5 }}>Palettes</div>
                <div className={css.stack}>
                  {PALETTE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      className={css.palRow}
                      onClick={() => { onChange(p.colors.slice(0, max)); setPresetOpen(false) }}
                    >
                      <span className={css.listPalette} style={{ border: 0 }}>
                        {p.colors.map((c, i) => (<span key={i} style={{ background: c, width: 10, display: "block", height: "100%" }} />))}
                      </span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </span>
      </div>
    </div>
  )
}

/** Per-element inspector — text/font/desc/bbox/palette. */
function ElementInspector({ element, onUpdate, onDuplicate, onDelete, onBringToFront, onSendToBack }: {
  element: IdeoElement
  onUpdate: (patch: Partial<IdeoElement>) => void
  onDuplicate(): void
  onDelete(): void
  onBringToFront(): void
  onSendToBack(): void
}) {
  const [ymin, xmin, ymax, xmax] = element.bbox
  const setBbox = (next: [number, number, number, number]) => onUpdate({ bbox: clampBbox(next) })
  const hasText = element.type === "text" || element.type === "logo"

  return (
    <div className={css.rowGap}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className={css.listType}><Glyph d={hasText ? G_TYPE : G_BOX} size={11} /></span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", opacity: .75 }}>{element.type}</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 2 }}>
          <button type="button" className={css.iconBtn} title="Send to back" onClick={onSendToBack}><Glyph d={G_DOWN} /></button>
          <button type="button" className={css.iconBtn} title="Bring to front" onClick={onBringToFront}><Glyph d={G_UP} /></button>
          <button type="button" className={css.iconBtn} title="Duplicate (Ctrl/&#8984;D)" onClick={onDuplicate}><Glyph d={G_COPY} /></button>
          <button type="button" className={css.iconBtn} data-danger title="Delete (Del)" onClick={onDelete}><Glyph d={G_TRASH} /></button>
        </span>
      </div>

      {hasText && (
        <div className={css.stack}>
          <span className={css.microLabel} title="The literal text this element should render">Text content</span>
          <input className={css.input} value={element.text ?? ""} placeholder="COFFEE TIME" onChange={(e) => onUpdate({ text: e.target.value })} />
        </div>
      )}

      {hasText && (
        <div className={css.stack}>
          <span className={css.microLabel} title="Typography descriptor injected into the prompt to steer font style">Font style</span>
          <input className={css.input} value={element.font ?? ""} placeholder="bold geometric sans-serif, all caps" onChange={(e) => onUpdate({ font: e.target.value === "" ? undefined : e.target.value })} />
          <div className={css.chipRow}>
            {FONT_PRESETS.slice(0, 6).map((preset) => (
              <button key={preset} type="button" className={css.chip} title={preset} onClick={() => onUpdate({ font: preset })}>
                {preset.split(",")[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={css.stack}>
        <span className={css.microLabel} title="Short visual description of what should appear in this region">
          {hasText ? "Typography description" : "Object description"}
        </span>
        <textarea
          className={css.textarea2}
          value={element.desc}
          rows={2}
          placeholder={element.type === "text"
            ? "bold sans-serif typography, all caps, dark navy"
            : "a ceramic coffee mug, steam rising"}
          onChange={(e) => onUpdate({ desc: e.target.value })}
        />
      </div>

      <div className={css.stack}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className={css.microLabel} title="Bounding box on the 0–1000 ideogram grid [ymin, xmin, ymax, xmax]">Bounding box</span>
          <span style={{ fontSize: 9.5, fontFamily: "ui-monospace, monospace", opacity: .6 }}>{Math.round(ymax - ymin)} &times; {Math.round(xmax - xmin)}</span>
        </div>
        <div className={css.grid4}>
          {([
            ["ymin", ymin, 0],
            ["xmin", xmin, 1],
            ["ymax", ymax, 2],
            ["xmax", xmax, 3],
          ] as [string, number, number][]).map(([lbl, val, idx]) => (
            <div key={lbl} className={css.stack}>
              <span style={{ textAlign: "center", fontSize: 9, fontFamily: "ui-monospace, monospace", textTransform: "uppercase", opacity: .55 }}>{lbl}</span>
              <input
                type="number"
                min={0}
                max={GRID_SIZE}
                value={Math.round(val)}
                className={`${css.input} ${css.monoInput}`}
                style={{ textAlign: "center" }}
                onChange={(e) => {
                  const n = clamp(Number(e.target.value === "" ? 0 : e.target.value), 0, GRID_SIZE)
                  const next = [...element.bbox] as [number, number, number, number]
                  next[idx] = n
                  // Re-clamp so min stays below max by at least MIN_BOX.
                  let [a, b, c, d] = next
                  if (idx === 0 || idx === 2) {
                    if (idx === 0 && n > c) c = n + MIN_BOX
                    if (idx === 2 && n < a) a = n - MIN_BOX
                  } else {
                    if (idx === 1 && n > d) d = n + MIN_BOX
                    if (idx === 3 && n < b) b = n - MIN_BOX
                  }
                  setBbox([a, b, c, d])
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={css.stack}>
        <span className={css.microLabel} title="Per-element color palette (up to 5 hex colors). Optional.">Color palette</span>
        <ColorPaletteInput colors={element.color_palette} onChange={(next) => onUpdate({ color_palette: next })} />
      </div>
    </div>
  )
}

/** Layout stack list — top-first, hover actions. */
function ElementList({ elements, selectedIds, onSelect, onReorder, onDelete, onDuplicate, onAddObject, onAddText, onAddLogo }: {
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
      <div className={css.emptyList}>
        <div style={{ opacity: .5, marginBottom: 6 }}><Glyph d={G_LAYERS} size={18} /></div>
        <div style={{ fontWeight: 600 }}>No elements yet</div>
        <p style={{ margin: "4px auto 0", maxWidth: "34ch", fontSize: 10.5, opacity: .7 }}>Add an object, text, or logo element, or drag on the canvas to create a region.</p>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "center", gap: 5 }}>
          <button type="button" className={css.miniBtn} onClick={onAddObject}><Glyph d={G_BOX} /> Object</button>
          <button type="button" className={css.miniBtn} onClick={onAddText}><Glyph d={G_TYPE} /> Text</button>
          <button type="button" className={css.miniBtn} onClick={onAddLogo}><Glyph d={G_LAYERS} /> Logo</button>
        </div>
      </div>
    )
  }

  return (
    <div className={css.stack}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 3px 3px" }}>
        <span className={css.microLabel}>Layout stack</span>
        <span style={{ fontSize: 9.5, opacity: .5 }}>top → bottom</span>
      </div>
      <div className={css.listScroll}>
        {[...elements].reverse().map((el) => {
          const realIdx = elements.length - 1 - elements.indexOf(el)
          const isSel = selectedIds.includes(el.id)
          const hasText = el.type === "text" || el.type === "logo"
          const preview = hasText ? `“${el.text || el.type}”` : el.desc !== "" ? el.desc : `Object ${realIdx + 1}`
          return (
            <div
              key={el.id}
              onClick={() => onSelect(el.id)}
              className={css.listRow}
              data-type={el.type}
              data-sel={isSel || undefined}
            >
              <span className={css.listType}><Glyph d={el.type === "text" ? G_TYPE : el.type === "logo" ? G_LAYERS : G_BOX} size={11} /></span>
              <div className={css.listMain}>
                <div className={css.listDesc}>{preview}</div>
                <div className={css.listBbox}>bbox [{el.bbox.map((v) => Math.round(v)).join(", ")}]</div>
              </div>
              {el.color_palette.length > 0 && (
                <span className={css.listPalette}>
                  {el.color_palette.slice(0, 4).map((c, i) => (<span key={i} style={{ background: c, width: 6, display: "block", height: "100%" }} />))}
                </span>
              )}
              <span className={css.listActs}>
                <button type="button" className={css.iconBtn} aria-label="Bring to front" title="Bring to front" onClick={(e) => { e.stopPropagation(); onReorder(el.id, "front") }}><Glyph d={G_UP} size={11} /></button>
                <button type="button" className={css.iconBtn} aria-label="Send to back" title="Send to back" onClick={(e) => { e.stopPropagation(); onReorder(el.id, "back") }}><Glyph d={G_DOWN} size={11} /></button>
                <button type="button" className={css.iconBtn} aria-label="Duplicate" title="Duplicate" onClick={(e) => { e.stopPropagation(); onDuplicate(el.id) }}><Glyph d={G_COPY} size={11} /></button>
                <button type="button" className={css.iconBtn} aria-label="Delete" title="Delete" data-danger onClick={(e) => { e.stopPropagation(); onDelete(el.id) }}><Glyph d={G_TRASH} size={11} /></button>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Style description editor — presets + flat style fields. */
function StylePanel({ values, setValues }: {
  values: Record<string, unknown>
  setValues: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void
}) {
  const styleType = (values.style_type as StyleType) || "none"
  const set = <K extends string>(k: K, v: unknown) =>
    setValues((prev) => ({ ...prev, [k]: v }))

  const palette = useMemo(
    () => sanitizeHexList(String(values.style_palette ?? "")),
    [values.style_palette],
  )

  const applyPreset = (idx: number) => {
    const p = STYLE_PRESETS[idx]
    setValues((prev) => ({
      ...prev,
      style_type: p.style_type,
      aesthetics: p.aesthetics,
      lighting: p.lighting,
      medium: p.medium,
      style_value: p.style_value,
      style_palette: p.palette.join(","),
    }))
  }

  return (
    <div className={css.rowGap}>
      <div className={css.stack}>
        <span className={css.microLabel} title="Click a preset to seed the style fields. Edit afterwards as needed.">Style presets</span>
        <div className={css.chipRow}>
          {STYLE_PRESETS.map((p, i) => (
            <button key={p.name} type="button" className={css.miniBtn} onClick={() => applyPreset(i)}>
              <span className={css.listPalette} style={{ border: 0, height: 10 }}>
                {p.palette.map((c, ci) => (<span key={ci} style={{ background: c, width: 6, display: "block", height: "100%" }} />))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className={css.stack}>
        <span className={css.microLabel} title="One-line overview of the whole image. Optional but recommended.">High-level description</span>
        <input className={css.input} value={String(values.high_level_description ?? "")} placeholder="A cinematic shot of a workspace" onChange={(e) => set("high_level_description", e.target.value)} />
      </div>

      <div className={css.stack}>
        <span className={css.microLabel} title="Toggle the style_description block on/off and pick photo vs art_style.">Style mode</span>
        <div className={css.segGroup}>
          {(["none", "photo", "art_style"] as StyleType[]).map((t) => (
            <button key={t} type="button" className={css.segBtn} data-active={styleType === t || undefined} onClick={() => set("style_type", t)}>
              {t === "none" ? "None" : t === "photo" ? "Photo" : "Art Style"}
            </button>
          ))}
        </div>
      </div>

      {styleType !== "none" && (
        <>
          <div className={css.grid2}>
            <div className={css.stack}>
              <span className={css.microLabel}>Aesthetics</span>
              <input className={css.input} value={String(values.aesthetics ?? "")} placeholder="cinematic, vibrant…" onChange={(e) => set("aesthetics", e.target.value)} />
            </div>
            <div className={css.stack}>
              <span className={css.microLabel}>Lighting</span>
              <input className={css.input} value={String(values.lighting ?? "")} placeholder="golden hour, neon…" onChange={(e) => set("lighting", e.target.value)} />
            </div>
            <div className={css.stack}>
              <span className={css.microLabel}>Medium</span>
              <input className={css.input} value={String(values.medium ?? "")} placeholder="35mm film, oil on canvas…" onChange={(e) => set("medium", e.target.value)} />
            </div>
            <div className={css.stack}>
              <span className={css.microLabel} title={styleType === "photo" ? "Photo treatment details" : "Art movement or named style"}>
                {styleType === "photo" ? "Photo detail" : "Art style"}
              </span>
              <input className={css.input} value={String(values.style_value ?? "")} placeholder={styleType === "photo" ? "Kodak Portra 400, grainy" : "Impressionist, Baroque"} onChange={(e) => set("style_value", e.target.value)} />
            </div>
          </div>
          <div className={css.stack}>
            <span className={css.microLabel} title="Global style color palette (up to 8 hex colors). Optional.">Style palette</span>
            <ColorPaletteInput colors={palette} onChange={(next) => set("style_palette", next.join(","))} max={8} />
          </div>
        </>
      )}
    </div>
  )
}

/** JSON tab — full caption preview (read-only + copy) and a live two-way
 *  elements-JSON editor with debounced validation. */
function JsonPanel({ caption, elements, onImportElements, say }: {
  caption: string
  elements: IdeoElement[]
  onImportElements: (next: IdeoElement[], source: string) => void
  say(msg: string, kind?: 'info' | 'error'): void
}) {
  const [subTab, setSubTab] = useState<"caption" | "elements">("caption")
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [rawElements, setRawElements] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)

  // Keep the raw textarea synced when NOT being edited.
  useEffect(() => {
    setRawElements(JSON.stringify(elements, null, 2))
    setParseError(null)
  }, [elements])

  // Debounced validation while typing.
  useEffect(() => {
    if (rawElements.trim() === "") {
      setParseError(null)
      return
    }
    const parsed = parseElementsJSON(rawElements)
    if (parsed !== null && JSON.stringify(parsed.map(({ id: _id, ...r }) => r)) === JSON.stringify(elements.map(({ id: _id2, ...r }) => r))) {
      setParseError(null)
      return
    }
    const t = window.setTimeout(() => {
      const p = parseElementsJSON(rawElements)
      if (p === null) setParseError("Invalid JSON — must be an array of {type, desc, bbox}")
      else setParseError(null)
    }, 200)
    return () => window.clearTimeout(t)
  }, [rawElements, elements])

  const handleCopy = async () => {
    const ok = await copyText(subTab === "caption" ? caption : rawElements)
    if (!ok) {
      say("Clipboard unavailable", "error")
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const handleApplyElements = () => {
    const parsed = parseElementsJSON(rawElements)
    if (parsed === null) {
      say("Cannot apply — JSON is invalid", "error")
      return
    }
    onImportElements(parsed, "manual JSON")
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const readPng = useCallback(async (file: File): Promise<void> => {
    if (!file.type.includes("png")) {
      say("Only PNG files can be re-inflated", "error")
      return
    }
    try {
      const parsed = await extractIdeogramCaptionFromPNG(file)
      if (!parsed || parsed.length === 0) {
        say("No Ideogram caption found in PNG metadata")
        return
      }
      onImportElements(parsed, `PNG metadata (${file.name})`)
    } catch (err) {
      say(err instanceof Error ? err.message : "Failed to read PNG", "error")
    }
  }, [onImportElements, say])

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await readPng(file)
  }

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) await readPng(file)
  }

  return (
    <div className={css.stack}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div className={css.jsonSeg}>
          <button type="button" className={css.segBtn} data-active={subTab === "caption" || undefined} onClick={() => setSubTab("caption")} style={{ padding: "3px 9px" }}>Full caption</button>
          <button type="button" className={css.segBtn} data-active={subTab === "elements" || undefined} onClick={() => setSubTab("elements")} style={{ padding: "3px 9px" }}>Elements JSON</button>
        </div>
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
          <button type="button" className={css.miniBtn} onClick={handleCopy}>
            {copied ? <Glyph d={G_CHECK} /> : <Glyph d={G_CLIP} />} Copy
          </button>
          {subTab === "elements" && (
            <button type="button" className={css.miniBtn} title="Parse the textarea and apply to canvas" onClick={handleApplyElements} disabled={parseError !== null}>Apply</button>
          )}
        </span>
      </div>

      {subTab === "caption" ? (
        <pre className={css.jsonPre}>{caption}</pre>
      ) : (
        <>
          <textarea
            className={`${css.textarea2} ${css.monoInput}`}
            value={rawElements}
            onChange={(e) => setRawElements(e.target.value)}
            spellCheck={false}
            rows={10}
            placeholder='[{"type":"obj","desc":"...","bbox":[...]}]'
            style={{ minHeight: 160, fontSize: 10, lineHeight: 1.45, borderColor: parseError ? "var(--dsw-alias-state-error-primary)" : undefined }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 9.5 }}>
            <span className={parseError ? css.jsonErr : undefined} style={parseError ? undefined : { opacity: .6 }}>
              {parseError ?? "Edit and click Apply to sync with canvas"}
            </span>
            <span style={{ opacity: .5 }}>{elements.length} element{elements.length === 1 ? "" : "s"}</span>
          </div>
        </>
      )}

      {/* PNG re-inflation dropzone — click or drop */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        className={css.dropZone}
        data-over={dragOver || undefined}
      >
        <input ref={fileInputRef} type="file" accept="image/png" style={{ display: "none" }} onChange={handleFilePick} />
        <Glyph d={G_IMG} size={13} />
        {dragOver ? "Drop PNG to restore layout" : "Drop or click to load a generated PNG"}
      </div>
    </div>
  )
}
