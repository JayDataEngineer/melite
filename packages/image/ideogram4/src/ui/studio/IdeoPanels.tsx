// Side panels for the Ideogram layout editor — element inspector,
// style description editor, JSON tab, and the AI transfer/refine
// panel, plus the small shared bits (MicroLabel, ColorPaletteInput).
//
// Carved from IdeogramCanvasEditor.tsx by scripts/ideo_split.py
// (Phase 6 restructure) — pure refactor.
import type { IdeoElement, StyleType } from './ideoHelpers'
import { FONT_PRESETS, GRID_SIZE, MIN_BOX, PALETTE_PRESETS, STYLE_PRESETS, clamp, clampBbox, extractIdeogramCaptionFromPNG, normalizeHex, parseElementsJSON, sanitizeHexList } from './ideoHelpers'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@melite/ui/button'
import { Input } from '@melite/ui/input'
import { Textarea } from '@melite/ui/textarea'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { useToastStore } from '@melite/ui'
import { copyText } from "@melite/ui"
import { Box, Type, Trash2, Copy, ChevronUp, ChevronDown, Plus, Palette as PaletteIcon, ClipboardCopy, Check, Image as ImageIcon, X } from 'lucide-react'
import { cn } from '@melite/ui'
import { Tip } from '@melite/ui/tip'


// ─── Sub-components ───────────────────────────────────────────────────────

/** Small uppercase tracking label, matching the spec-sheet rows in WorkspaceLayout. */
export function MicroLabel({ children, tooltip }: { children: React.ReactNode; tooltip?: string }) {
  const content = (
    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
      {children}
    </span>
  )
  if (!tooltip) return content
  // S4f: the ⓘ hint rides the DSH Tooltip (label/side/delay preserve the
  // radix behavior: top placement, 700ms hover delay). The bubble max-width
  // is the DSH default (half-viewport cap) — the old max-w-xs override
  // dies with the radix compound.
  return (
    <div className="flex items-center gap-1">
      {content}
      <Tooltip label={tooltip} side="top" delayMs={700}>
        <span className="cursor-help text-muted-foreground/50 hover:text-muted-foreground">ⓘ</span>
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
    next[i] = norm ?? v
    onChange(next)
  }
  const remove = (i: number) => onChange(safe.filter((_, idx) => idx !== i))
  const add = (c = "#CCCCCC") => {
    if (safe.length >= max) return
    onChange([...safe, normalizeHex(c) ?? c])
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {safe.map((c, i) => {
          const norm = normalizeHex(c)
          const isValid = !!norm
          return (
            <div key={i} className="group relative flex items-center">
              <div
                className={cn(
                  "relative rounded-md border border-border/70 overflow-hidden",
                  compact ? "h-7 w-7" : "h-8 w-8",
                )}
                style={{ background: norm ?? "transparent" }}
              >
                <Input
                  type="color"
                  value={norm ?? "#000000"}
                  onChange={(e) => update(i, e.target.value.toUpperCase())}
                  className="absolute inset-0 cursor-pointer opacity-0 h-auto"
                  aria-label={`Color ${i + 1}`}
                />
                {!isValid && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] text-destructive">
                    ?
                  </span>
                )}
              </div>
              <Button variant="ghost"
                type="button"
                onClick={() => remove(i)}
                className={cn(
                  "absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90",
                )}
                aria-label="Remove color"
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </div>
          )
        })}
        {safe.length < max && (
          <Button variant="ghost"
            type="button"
            onClick={() => add()}
            className={cn(
              "flex items-center justify-center rounded-md border border-dashed border-border/70 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors",
              compact ? "h-7 w-7" : "h-8 w-8",
            )}
            aria-label="Add color"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
        {/* Hex text — secondary editing path */}
        <Input
          value={safe.join(",")}
          onChange={(e) => onChange(sanitizeHexList(e.target.value))}
          placeholder="#RRGGBB,..."
          className={cn(
            "h-8 flex-1 min-w-[120px] font-mono text-xs bg-input/25 border-input/70",
          )}
        />
        {/* Preset palettes dropdown */}
        <div className="relative">
          <Tip tip="Preset palettes">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setPresetOpen((v) => !v)}
              aria-label="Preset palettes"
            >
              <PaletteIcon className="h-3.5 w-3.5" />
            </Button>
          </Tip>
          {presetOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setPresetOpen(false)} />
              <div className="absolute right-0 top-9 z-40 w-52 rounded-lg border border-border/80 bg-popover p-2 shadow-lg">
                <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Palettes
                </div>
                <div className="space-y-1">
                  {PALETTE_PRESETS.map((p) => (
                    <Button variant="ghost"
                      key={p.name}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent/60"
                      onClick={() => {
                        onChange(p.colors.slice(0, max))
                        setPresetOpen(false)
                      }}
                    >
                      <div className="flex h-4 overflow-hidden rounded-sm border border-border/60">
                        {p.colors.map((c, i) => (
                          <div key={i} style={{ background: c, width: 10 }} />
                        ))}
                      </div>
                      <span className="text-xs">{p.name}</span>
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
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
            element.type === "text"
              ? "border-violet-400/40 bg-violet-400/10 text-violet-300"
              : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
          )}
        >
          {element.type === "text" ? <Type className="h-2.5 w-2.5" /> : <Box className="h-2.5 w-2.5" />}
          {element.type}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {/* S4f: layer-action hints ride the DSH Tooltip (side="top" +
              delayMs={700} preserve the radix compound's behavior; the
              kit Button anchors stay — Button itself is a later stroke). */}
          <Tooltip label="Send to back" side="top" delayMs={700}>
            <Button variant="ghost" size="icon-sm" onClick={onSendToBack} disabled={false}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
          <Tooltip label="Bring to front" side="top" delayMs={700}>
            <Button variant="ghost" size="icon-sm" onClick={onBringToFront} disabled={false}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
          <Tooltip label="Duplicate (⌘D)" side="top" delayMs={700}>
            <Button variant="ghost" size="icon-sm" onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
          <Tooltip label="Delete (⌫)" side="top" delayMs={700}>
            <Button variant="ghost" size="icon-sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {(element.type === "text" || element.type === "logo") && (
        <div className="space-y-1.5">
          <MicroLabel tooltip="The literal text this element should render">Text content</MicroLabel>
          <Input
            value={element.text ?? ""}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="COFFEE TIME"
            className="h-9 bg-input/25 border-input/70"
          />
        </div>
      )}

      {(element.type === "text" || element.type === "logo") && (
        <div className="space-y-1.5">
          <MicroLabel tooltip="Typography descriptor injected into the prompt to steer font style">
            Font style
          </MicroLabel>
          <Input
            value={element.font ?? ""}
            onChange={(e) => onUpdate({ font: e.target.value || undefined })}
            placeholder="bold geometric sans-serif, all caps"
            className="h-9 bg-input/25 border-input/70"
          />
          <div className="flex flex-wrap gap-1">
            {FONT_PRESETS.slice(0, 6).map((preset) => (
              <Button variant="ghost"
                key={preset}
                type="button"
                onClick={() => onUpdate({ font: preset })}
                className="rounded border border-border/60 bg-muted/20 px-1.5 py-0.5 text-[9px] text-muted-foreground hover:border-foreground/40 hover:bg-muted/40 transition-colors"
              >
                {preset.split(",")[0]}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
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
          className="min-h-[60px] resize-y bg-input/25 border-input/70 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <MicroLabel tooltip="Bounding box on the 0–1000 ideogram grid [ymin, xmin, ymax, xmax]">
            Bounding box
          </MicroLabel>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {Math.round(ymax - ymin)} × {Math.round(xmax - xmin)}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {([
            ["ymin", ymin, 0],
            ["xmin", xmin, 1],
            ["ymax", ymax, 2],
            ["xmax", xmax, 3],
          ] as [string, number, number][]).map(([lbl, val, idx]) => (
            <div key={lbl} className="space-y-1">
              <span className="block text-center text-[9px] font-mono uppercase text-muted-foreground">{lbl}</span>
              <Input
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
                className="h-8 text-center text-xs tabular-nums bg-input/25 border-input/70"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
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
    <div className="space-y-3">
      {/* One-click style presets */}
      <div className="space-y-1.5">
        <MicroLabel tooltip="Click a preset to seed the style fields. Edit afterwards as needed.">
          Style presets
        </MicroLabel>
        <div className="flex flex-wrap gap-1">
          {STYLE_PRESETS.map((p, i) => (
            <Button variant="ghost"
              key={p.name}
              type="button"
              onClick={() => applyPreset(i)}
              className="group flex items-center gap-1.5 rounded-md border border-border/70 bg-input/20 px-2 py-1 text-xs hover:border-foreground/40 hover:bg-input/40"
            >
              <div className="flex h-3 overflow-hidden rounded-sm">
                {p.palette.map((c, ci) => (
                  <div key={ci} style={{ background: c, width: 6 }} />
                ))}
              </div>
              {p.name}
            </Button>
          ))}
        </div>
      </div>

      {/* high_level_description */}
      <div className="space-y-1.5">
        <MicroLabel tooltip="One-line overview of the whole image. Optional but recommended.">
          High-level description
        </MicroLabel>
        <Input
          value={String(values.high_level_description ?? "")}
          onChange={(e) => set("high_level_description", e.target.value)}
          placeholder="A cinematic shot of a workspace"
          className="h-9 bg-input/25 border-input/70"
        />
      </div>

      {/* style_type toggle */}
      <div className="space-y-1.5">
        <MicroLabel tooltip="Toggle the style_description block on/off and pick photo vs art_style.">
          Style mode
        </MicroLabel>
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-input/20 p-0.5 text-xs">
          {(["none", "photo", "art_style"] as StyleType[]).map((t) => (
            <Button variant="ghost"
              key={t}
              type="button"
              onClick={() => set("style_type", t)}
              className={cn(
                "rounded-md px-2 py-1.5 font-medium transition-all",
                styleType === t
                  ? "bg-brand text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "none" ? "None" : t === "photo" ? "Photo" : "Art Style"}
            </Button>
          ))}
        </div>
      </div>

      {styleType !== "none" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <MicroLabel>Aesthetics</MicroLabel>
              <Input
                value={String(values.aesthetics ?? "")}
                onChange={(e) => set("aesthetics", e.target.value)}
                placeholder="cinematic, vibrant…"
                className="h-9 bg-input/25 border-input/70"
              />
            </div>
            <div className="space-y-1.5">
              <MicroLabel>Lighting</MicroLabel>
              <Input
                value={String(values.lighting ?? "")}
                onChange={(e) => set("lighting", e.target.value)}
                placeholder="golden hour, neon…"
                className="h-9 bg-input/25 border-input/70"
              />
            </div>
            <div className="space-y-1.5">
              <MicroLabel>Medium</MicroLabel>
              <Input
                value={String(values.medium ?? "")}
                onChange={(e) => set("medium", e.target.value)}
                placeholder="35mm film, oil on canvas…"
                className="h-9 bg-input/25 border-input/70"
              />
            </div>
            <div className="space-y-1.5">
              <MicroLabel tooltip={styleType === "photo" ? "Photo treatment details" : "Art movement or named style"}>
                {styleType === "photo" ? "Photo detail" : "Art style"}
              </MicroLabel>
              <Input
                value={String(values.style_value ?? "")}
                onChange={(e) => set("style_value", e.target.value)}
                placeholder={styleType === "photo" ? "Kodak Portra 400, grainy" : "Impressionist, Baroque"}
                className="h-9 bg-input/25 border-input/70"
              />
            </div>
          </div>
          <div className="space-y-1.5">
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
    // copyText falls back to execCommand on plain-HTTP origins (Tailscale/
    // LAN), where navigator.clipboard is undefined (2026-08-18).
    const ok = await copyText(tab === "caption" ? caption : rawElements)
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
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <div className="inline-flex rounded-md border border-border/70 bg-input/20 p-0.5 text-[11px]">
          <Button variant="ghost"
            type="button"
            onClick={() => setTab("caption")}
            className={cn(
              "px-2 py-1 rounded-sm font-medium",
              tab === "caption" ? "bg-brand text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Full caption
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => setTab("elements")}
            className={cn(
              "px-2 py-1 rounded-sm font-medium",
              tab === "elements" ? "bg-brand text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Elements JSON
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
            Copy
          </Button>
          {tab === "elements" && (
            <Tip tip="Parse the textarea and apply to canvas">
              <span className="contents">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
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
        <pre className="max-h-[260px] overflow-auto rounded-md border border-border/60 bg-muted p-2.5 text-[11px] leading-snug text-emerald-200/90 scrollbar-thin">
          {caption || "// fill in fields to see the assembled caption"}
        </pre>
      ) : (
        <>
          <Textarea
            value={rawElements}
            onChange={(e) => setRawElements(e.target.value)}
            spellCheck={false}
            rows={10}
            placeholder='[{"type":"obj","desc":"...","bbox":[...]}]'
            className={cn(
              "min-h-[200px] resize-y font-mono text-[11px] leading-snug bg-muted text-emerald-200/90 border-border/60",
              parseError && "border-destructive/70",
            )}
          />
          <div className="flex items-center justify-between text-[10px]">
            <span className={cn(parseError ? "text-destructive" : "text-muted-foreground")}>
              {parseError ?? "Edit and click Apply to sync with canvas"}
            </span>
            <span className="text-muted-foreground/60">{elements.length} element{elements.length === 1 ? "" : "s"}</span>
          </div>
        </>
      )}

      {/* PNG metadata re-inflation dropzone — click OR drop a PNG. The hidden
          Input makes the whole zone clickable to open the OS file picker. */}
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
        className={cn(
          "flex items-center justify-center gap-2 rounded-md border border-dashed py-2 text-[11px] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
          dragOver
            ? "border-brand/70 bg-brand/10 text-brand"
            : "border-border/70 text-muted-foreground hover:border-foreground/40",
        )}
      >
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={handleFilePick}
        />
        <ImageIcon className="h-3.5 w-3.5" />
        {dragOver ? "Drop PNG to restore layout" : "Drop or click to load a generated PNG"}
      </div>
    </div>
  )
}
