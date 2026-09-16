// Side panels for the Ideogram layout editor — element inspector,
// style description editor, JSON tab, and the AI transfer/refine
// panel, plus the small shared bits (MicroLabel, ColorPaletteInput).
//
// Carved from IdeogramCanvasEditor.tsx by scripts/ideo_split.py
// (Phase 6 restructure) — pure refactor.
import type { IdeoElement, StyleType } from './ideoHelpers'
import { FONT_PRESETS, GRID_SIZE, MIN_BOX, PALETTE_PRESETS, STYLE_PRESETS, clamp, clampBbox, extractIdeogramCaptionFromPNG, normalizeHex, parseElementsJSON, sanitizeHexList } from './ideoHelpers'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Pill, Tooltip, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import { useToastStore } from '@melite/card-base/toast'
import { Box, Type, Trash2, Copy, ChevronUp, ChevronDown, Plus, Palette as PaletteIcon, ClipboardCopy, Check, Image as ImageIcon, X } from '@melite/card-base/icons'
import { cx } from '@melite/card-base/chrome'
import { Textarea, Tip } from './controls'
import styles from './IdeoPanels.module.css'


// ─── Sub-components ───────────────────────────────────────────────────────

/** Small uppercase tracking label, matching the spec-sheet rows in WorkspaceLayout. */
export function MicroLabel({ children, tooltip }: { children: React.ReactNode; tooltip?: string }) {
  const content = (
    <span className={styles.microLabel}>
      {children}
    </span>
  )
  if (!tooltip) return content
  // S4f: the ⓘ hint rides the DSH Tooltip (label/side/delay preserve the
  // prior behavior: top placement, 700ms hover delay). The bubble max-width
  // is the DSH default (half-viewport cap).
  return (
    <div className={styles.microRow}>
      {content}
      <Tooltip label={tooltip} side="top" delayMs={700}>
        <span className={styles.infoHint}>ⓘ</span>
      </Tooltip>
    </div>
  )
}


/** Editable color palette row. Supports add/remove/swatch-picker + hex text. */
export function ColorPaletteInput({
  colors,
  onChange,
  max = 5,
  compact = false,
}: {
  colors: string[]
  onChange: (next: string[]) => void
  max?: number
  compact?: boolean
}) {
  const [presetOpen, setPresetOpen] = useState(false)
  const safe = colors.slice(0, max)

  const update = (i: number, v: string) => {
    const norm = normalizeHex(v)
    const next = [...safe]
    // Sole caller is the <input type="color"> swatch, which always yields a
    // valid #rrggbb (browsers + happy-dom sanitize anything else), so norm
    // is non-null here (deleted the ?? v fallback, 2026-09-16).
    next[i] = norm!
    onChange(next)
  }
  const remove = (i: number) => onChange(safe.filter((_, idx) => idx !== i))
  const add = (c = "#CCCCCC") => {
    // Sole caller is the add button, rendered only when safe.length < max,
    // and it passes no arg (so c is the always-valid literal default) —
    // both guards deleted as unreachable (2026-09-16).
    onChange([...safe, normalizeHex(c)!])
  }

  return (
    <div className={styles.field}>
      <div className={styles.swatchRow}>
        {safe.map((c, i) => {
          const norm = normalizeHex(c)
          const isValid = !!norm
          return (
            <div key={i} className={styles.swatchWrap}>
              <div
                className={cx(
                  styles.swatch,
                  compact ? styles.swatchCompact : styles.swatchFull,
                )}
                style={{ background: norm ?? "transparent" }}
              >
                <input
                  type="color"
                  value={norm ?? "#000000"}
                  onChange={(e) => update(i, e.target.value.toUpperCase())}
                  className={styles.swatchInput}
                  aria-label={`Color ${i + 1}`}
                />
                {!isValid && (
                  <span className={styles.invalidMark}>
                    ?
                  </span>
                )}
              </div>
              <Button variant="ghost"
                type="button"
                onClick={() => remove(i)}
                className={styles.removeBtn}
                aria-label="Remove color"
              >
                <X className={styles.i10} />
              </Button>
            </div>
          )
        })}
        {safe.length < max && (
          <Button variant="ghost"
            type="button"
            onClick={() => add()}
            className={cx(
              styles.addBtn,
              compact ? styles.swatchCompact : styles.swatchFull,
            )}
            aria-label="Add color"
          >
            <Plus className={styles.i14} />
          </Button>
        )}
        {/* Hex text — secondary editing path */}
        <Input
          value={safe.join(",")}
          onChange={(e) => onChange(sanitizeHexList(e.target.value))}
          placeholder="#RRGGBB,..."
          className={styles.hexInput}
        />
        {/* Preset palettes dropdown */}
        <div className={styles.presetWrap}>
          <Tip tip="Preset palettes">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPresetOpen((v) => !v)}
              aria-label="Preset palettes"
            >
              <PaletteIcon className={styles.i14} />
            </Button>
          </Tip>
          {presetOpen && (
            <>
              <div className={styles.scrim} onClick={() => setPresetOpen(false)} />
              <div className={styles.presetPop}>
                <div className={styles.presetTitle}>
                  Palettes
                </div>
                <div className={styles.presetList}>
                  {PALETTE_PRESETS.map((p) => (
                    <Button variant="ghost"
                      key={p.name}
                      type="button"
                      className={styles.presetRow}
                      onClick={() => {
                        onChange(p.colors.slice(0, max))
                        setPresetOpen(false)
                      }}
                    >
                      <div className={styles.presetSwatches}>
                        {p.colors.map((c, i) => (
                          <div key={i} style={{ background: c, width: 10 }} className={styles.presetSwatch} />
                        ))}
                      </div>
                      <span>{p.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}



// ─── Inspector / Style / JSON panels ──────────────────────────────────────

export function ElementInspector({
  element,
  onUpdate,
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
}: {
  element: IdeoElement
  onUpdate: (patch: Partial<IdeoElement>) => void
  onDuplicate: () => void
  onDelete: () => void
  onBringToFront: () => void
  onSendToBack: () => void
}) {
  const [ymin, xmin, ymax, xmax] = element.bbox
  const setBbox = (next: [number, number, number, number]) =>
    onUpdate({ bbox: clampBbox(next) })

  return (
    <div className={styles.stack}>
      <div className={styles.typeRow}>
        <span
          className={cx(
            styles.typeBadge,
            element.type === "text"
              ? styles.typeText
              : styles.typeObj,
          )}
        >
          {element.type === "text" ? <Type className={styles.i10} /> : <Box className={styles.i10} />}
          {element.type}
        </span>
        <div className={styles.iconActions}>
          {/* S4f: layer-action hints ride the DSH Tooltip (side="top" +
              delayMs={700} preserve the prior's behavior; the
              DSH Button anchors ride the DSH Button atom now). */}
          <Tooltip label="Send to back" side="top" delayMs={700}>
            <Button variant="ghost" size="sm" onClick={onSendToBack} disabled={false}>
              <ChevronDown className={styles.i14} />
            </Button>
          </Tooltip>
          <Tooltip label="Bring to front" side="top" delayMs={700}>
            <Button variant="ghost" size="sm" onClick={onBringToFront} disabled={false}>
              <ChevronUp className={styles.i14} />
            </Button>
          </Tooltip>
          <Tooltip label="Duplicate (⌘D)" side="top" delayMs={700}>
            <Button variant="ghost" size="sm" onClick={onDuplicate}>
              <Copy className={styles.i14} />
            </Button>
          </Tooltip>
          <Tooltip label="Delete (⌫)" side="top" delayMs={700}>
            <Button variant="ghost" size="sm" onClick={onDelete} className={styles.toneDanger}>
              <Trash2 className={styles.i14} />
            </Button>
          </Tooltip>
        </div>
      </div>

      {(element.type === "text" || element.type === "logo") && (
        <div className={styles.field}>
          <MicroLabel tooltip="The literal text this element should render">Text content</MicroLabel>
          <Input
            // text/logo elements always carry a string (same four-producer
            // proof as the caption memo) — deleted the ?? "" (2026-09-16).
            value={element.text!}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="COFFEE TIME"
            
          />
        </div>
      )}

      {(element.type === "text" || element.type === "logo") && (
        <div className={styles.field}>
          <MicroLabel tooltip="Typography descriptor injected into the prompt to steer font style">
            Font style
          </MicroLabel>
          <Input
            value={element.font ?? ""}
            onChange={(e) => onUpdate({ font: e.target.value || undefined })}
            placeholder="bold geometric sans-serif, all caps"
            
          />
          <div className={styles.presetChipRow}>
            {FONT_PRESETS.slice(0, 6).map((preset) => (
              <Button variant="ghost"
                key={preset}
                type="button"
                onClick={() => onUpdate({ font: preset })}
                className={styles.miniChip}
              >
                {preset.split(",")[0]}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.field}>
        <MicroLabel tooltip="Short visual description of what should appear in this region">
          {element.type === "text" || element.type === "logo" ? "Typography description" : "Object description"}
        </MicroLabel>
        <Textarea
          value={element.desc}
          onChange={(e) => onUpdate({ desc: e.target.value })}
          placeholder={
            element.type === "text"
              ? "bold sans-serif typography, all caps, dark navy"
              : "a ceramic coffee mug, steam rising"
          }
          rows={2}
        />
      </div>

      <div className={styles.field}>
        <div className={styles.bboxHead}>
          <MicroLabel tooltip="Bounding box on the 0–1000 ideogram grid [ymin, xmin, ymax, xmax]">
            Bounding box
          </MicroLabel>
          <span className={styles.bboxVal}>
            {Math.round(ymax - ymin)} × {Math.round(xmax - xmin)}
          </span>
        </div>
        <div className={styles.bboxGrid}>
          {([
            ["ymin", ymin, 0],
            ["xmin", xmin, 1],
            ["ymax", ymax, 2],
            ["xmax", xmax, 3],
          ] as [string, number, number][]).map(([lbl, val, idx]) => (
            <div key={lbl} className={styles.bboxCell}>
              <span className={styles.bboxLbl}>{lbl}</span>
              <input
                type="number"
                value={Math.round(val)}
                min={0}
                max={GRID_SIZE}
                onChange={(e) => {
                  const n = clamp(Number(e.target.value || 0), 0, GRID_SIZE)
                  const next = [...element.bbox] as [number, number, number, number]
                  next[idx] = n
                  // Re-clamp so that min < max
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
                className={styles.bboxInput}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <MicroLabel tooltip="Per-element color palette (up to 5 hex colors). Optional.">
          Color palette
        </MicroLabel>
        <ColorPaletteInput
          colors={element.color_palette}
          onChange={(next) => onUpdate({ color_palette: next })}
        />
      </div>
    </div>
  )
}


export function StylePanel({
  values,
  setValues,
}: {
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
    <div className={styles.stack}>
      {/* One-click style presets */}
      <div className={styles.field}>
        <MicroLabel tooltip="Click a preset to seed the style fields. Edit afterwards as needed.">
          Style presets
        </MicroLabel>
        <div className={styles.presetChipRow}>
          {STYLE_PRESETS.map((p, i) => (
            <Button variant="ghost"
              key={p.name}
              type="button"
              onClick={() => applyPreset(i)}
              className={styles.presetChip}
            >
              <div className={styles.chipSwatches}>
                {p.palette.map((c, ci) => (
                  <div key={ci} style={{ background: c }} className={styles.chipSwatch} />
                ))}
              </div>
              {p.name}
            </Button>
          ))}
        </div>
      </div>

      {/* high_level_description */}
      <div className={styles.field}>
        <MicroLabel tooltip="One-line overview of the whole image. Optional but recommended.">
          High-level description
        </MicroLabel>
        <Input
          value={String(values.high_level_description ?? "")}
          onChange={(e) => set("high_level_description", e.target.value)}
          placeholder="A cinematic shot of a workspace"
          
        />
      </div>

      {/* style_type toggle */}
      <div className={styles.field}>
        <MicroLabel tooltip="Toggle the style_description block on/off and pick photo vs art_style.">
          Style mode
        </MicroLabel>
        <div className={styles.modeGrid}>
          {(["none", "photo", "art_style"] as StyleType[]).map((t) => (
            <Pill
              key={t}
              active={styleType === t}
              type="button"
              onClick={() => set("style_type", t)}
            >
              {t === "none" ? "None" : t === "photo" ? "Photo" : "Art Style"}
            </Pill>
          ))}
        </div>
      </div>

      {styleType !== "none" && (
        <>
          <div className={styles.twoCol}>
            <div className={styles.field}>
              <MicroLabel>Aesthetics</MicroLabel>
              <Input
                value={String(values.aesthetics ?? "")}
                onChange={(e) => set("aesthetics", e.target.value)}
                placeholder="cinematic, vibrant…"
                
              />
            </div>
            <div className={styles.field}>
              <MicroLabel>Lighting</MicroLabel>
              <Input
                value={String(values.lighting ?? "")}
                onChange={(e) => set("lighting", e.target.value)}
                placeholder="golden hour, neon…"
                
              />
            </div>
            <div className={styles.field}>
              <MicroLabel>Medium</MicroLabel>
              <Input
                value={String(values.medium ?? "")}
                onChange={(e) => set("medium", e.target.value)}
                placeholder="35mm film, oil on canvas…"
                
              />
            </div>
            <div className={styles.field}>
              <MicroLabel tooltip={styleType === "photo" ? "Photo treatment details" : "Art movement or named style"}>
                {styleType === "photo" ? "Photo detail" : "Art style"}
              </MicroLabel>
              <Input
                value={String(values.style_value ?? "")}
                onChange={(e) => set("style_value", e.target.value)}
                placeholder={styleType === "photo" ? "Kodak Portra 400, grainy" : "Impressionist, Baroque"}
                
              />
            </div>
          </div>
          <div className={styles.field}>
            <MicroLabel tooltip="Global style color palette (up to 8 hex colors). Optional.">
              Style palette
            </MicroLabel>
            <ColorPaletteInput
              colors={palette}
              onChange={(next) => set("style_palette", next.join(","))}
              max={8}
            />
          </div>
        </>
      )}
    </div>
  )
}


export function JsonPanel({
  caption,
  elements,
  onImportElements,
}: {
  caption: string
  elements: IdeoElement[]
  onImportElements: (next: IdeoElement[], source: string) => void
}) {
  const toast = useToastStore((s) => s.addToast)
  const [tab, setTab] = useState<"caption" | "elements">("caption")
  const [copied, setCopied] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [rawElements, setRawElements] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)

  // Keep the raw elements textarea synced with internal state when not editing.
  useEffect(() => {
    setRawElements(JSON.stringify(elements, null, 2))
    setParseError(null)
  }, [elements])

  // Debounced parse: when user types in the textarea, try to re-import.
  useEffect(() => {
    if (!rawElements.trim()) {
      setParseError(null)
      return
    }
    // Skip the round-trip if it matches our last serialization.
    if (JSON.stringify(elements) === JSON.stringify(parseElementsJSON(rawElements) || [])) return
    const t = setTimeout(() => {
      const parsed = parseElementsJSON(rawElements)
      if (parsed === null) {
        setParseError("Invalid JSON — must be an array of {type, desc, bbox}")
      } else {
        setParseError(null)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [rawElements, elements])

  const handleCopy = async () => {
    // writeClipboard falls back to execCommand on plain-HTTP origins (Tailscale/
    // LAN), where navigator.clipboard is undefined (2026-08-18).
    const ok = await writeClipboard(tab === "caption" ? caption : rawElements)
    if (!ok) {
      toast("error", "Clipboard unavailable")
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
    toast("success", "Copied to clipboard")
  }

  const handleApplyElements = () => {
    const parsed = parseElementsJSON(rawElements)
    if (parsed === null) {
      toast("error", "Cannot apply — JSON is invalid")
      return
    }
    onImportElements(parsed, "manual JSON")
    toast("success", `Imported ${parsed.length} element${parsed.length === 1 ? "" : "s"}`)
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Shared PNG reader — used by both the drop handler and the hidden file
  // input's onChange. Returns the parsed elements or null.
  const readPng = useCallback(
    async (file: File) => {
      if (!file.type.includes("png")) {
        toast("error", "Only PNG files can be re-inflated")
        return null
      }
      try {
        const parsed = await extractIdeogramCaptionFromPNG(file)
        if (!parsed) {
          toast("info", "No Ideogram caption found in PNG metadata")
          return null
        }
        onImportElements(parsed, `PNG metadata (${file.name})`)
        toast("success", `Restored ${parsed.length} element${parsed.length === 1 ? "" : "s"} from PNG`)
        return parsed
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "Failed to read PNG")
        return null
      }
    },
    [onImportElements, toast],
  )

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await readPng(file)
  }

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-picking the same file
    if (!file) return
    await readPng(file)
  }

  return (
    <div className={styles.jsonStack}>
      <div className={styles.jsonBar}>
        <div className={styles.tabGroup}>
          <Pill
            active={tab === "caption"}
            type="button"
            onClick={() => setTab("caption")}
          >
            Full caption
          </Pill>
          <Pill
            active={tab === "elements"}
            type="button"
            onClick={() => setTab("elements")}
          >
            Elements JSON
          </Pill>
        </div>
        <div className={styles.tabActions}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            {copied ? <Check className={styles.i14ok} /> : <ClipboardCopy className={styles.i14} />}
            Copy
          </Button>
          {tab === "elements" && (
            <Tip tip="Parse the textarea and apply to canvas">
              <span className={styles.contents}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyElements}
                  disabled={!!parseError}
                >
                  Apply
                </Button>
              </span>
            </Tip>
          )}
        </div>
      </div>

      {tab === "caption" ? (
        // UNREACHABLE-ARM (deleted the `|| "// fill in fields…"`
        // fallback, 2026-09-16): the sole call site seats the
        // editor's caption memo, which is a JSON.stringify emission
        // — always a non-empty string — so the fallback never fired.
        <pre className={styles.captionPre}>
          {caption}
        </pre>
      ) : (
        <>
          <Textarea
            value={rawElements}
            onChange={(e) => setRawElements(e.target.value)}
            spellCheck={false}
            rows={10}
            placeholder='[{"type":"obj","desc":"...","bbox":[...]}]'
            className={cx(styles.jsonArea, parseError ? styles.jsonAreaError : undefined)}
          />
          <div className={styles.hintRow}>
            <span className={parseError ? styles.hintError : undefined}>
              {parseError ?? "Edit and click Apply to sync with canvas"}
            </span>
            <span className={styles.hintDim}>{elements.length} element{elements.length === 1 ? "" : "s"}</span>
          </div>
        </>
      )}

      {/* PNG metadata re-inflation dropzone — click OR drop a PNG. The hidden
          file input makes the whole zone clickable to open the OS file picker. */}
      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        className={cx(styles.dropzone, dragOver ? styles.dropzoneActive : undefined)}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          className={styles.hiddenInput}
          onChange={handleFilePick}
        />
        <ImageIcon className={styles.i14} />
        {dragOver ? "Drop PNG to restore layout" : "Drop or click to load a generated PNG"}
      </div>
    </div>
  )
}
