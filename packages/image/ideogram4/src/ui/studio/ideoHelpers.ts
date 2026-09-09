// Pure helpers + shared data for the Ideogram 4 compositional-
// deconstruction editor. Carved from IdeogramCanvasEditor.tsx by
// scripts/ideo_split.py (Phase 6 restructure) — pure refactor.
//
// `__test` lives here and is re-exported by IdeogramCanvasEditor.tsx
// so the unit-test import path is unchanged.
import { Square, RectangleHorizontal, RectangleVertical } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────

export type ElementType = "obj" | "text" | "logo"
export type StyleType = "none" | "photo" | "art_style"

export interface IdeoElement {
  /** Local-only id (not serialized). Stable across renders for React keys. */
  id: string
  type: ElementType
  desc: string
  text?: string
  /** Typography descriptor for text/logo elements (e.g. "bold geometric
   *  sans-serif"). Optional — carried in the wire format's `font` key. */
  font?: string
  /** [ymin, xmin, ymax, xmax] on the 0–1000 ideogram grid. */
  bbox: [number, number, number, number]
  color_palette: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────

export const GRID_SIZE = 1000
export const MIN_BOX = 30 // 3% of grid — smallest box allowed
export const SNAP_UNITS = 25 // snap granularity (2.5% steps)
export const CANVAS_MAX_HEIGHT = 460 // px cap for inline canvas

/** Aspect-ratio presets. Width/height must be multiples of 16 (Ideogram requirement). */
export const ASPECT_PRESETS: { id: string; label: string; w: number; h: number; Icon: typeof Square }[] = [
  { id: "1:1",  label: "Square",    w: 1024, h: 1024, Icon: Square },
  { id: "3:2",  label: "Photo LS",  w: 1216, h: 832,  Icon: RectangleHorizontal },
  { id: "2:3",  label: "Photo PT",  w: 832,  h: 1216, Icon: RectangleVertical },
  { id: "16:9", label: "Wide",      w: 1280, h: 768,  Icon: RectangleHorizontal },
  { id: "9:16", label: "Story",     w: 768,  h: 1280, Icon: RectangleVertical },
  { id: "4:3",  label: "Landscape", w: 1024, h: 768,  Icon: RectangleHorizontal },
  { id: "3:4",  label: "Portrait",  w: 768,  h: 1024, Icon: RectangleVertical },
]

/** Curated starter palettes — surfaced in the palette editor for one-click fill. */
export const PALETTE_PRESETS: { name: string; colors: string[] }[] = [
  { name: "Sunset",    colors: ["#FF6B35", "#F7B801", "#7B2D26"] },
  { name: "Ocean",     colors: ["#023E8A", "#0077B6", "#48CAE4"] },
  { name: "Forest",    colors: ["#1B4332", "#40916C", "#95D5B2"] },
  { name: "Mono",      colors: ["#0A0A0A", "#525252", "#FAFAFA"] },
  { name: "Candy",     colors: ["#FF6B9D", "#FEC8D8", "#C8B6FF"] },
  { name: "Cyber",     colors: ["#FF00E5", "#00F0FF", "#FFE600"] },
  { name: "Earth",     colors: ["#5C3D2E", "#8B5E3C", "#D4A373"] },
  { name: "Cherry",    colors: ["#9B1B30", "#C73E1D", "#F4A261"] },
]

/** Quick style presets to seed the Style tab. */
export const STYLE_PRESETS: {
  name: string
  style_type: Exclude<StyleType, "none">
  aesthetics: string
  lighting: string
  medium: string
  style_value: string
  palette: string[]
}[] = [
  {
    name: "Cinematic photo",
    style_type: "photo",
    aesthetics: "cinematic, dramatic, shallow depth of field",
    lighting: "golden hour rim light, soft fill",
    medium: "35mm film, anamorphic",
    style_value: "shot on Kodak Portra 400, grainy, natural color",
    palette: ["#2B1810", "#C9A063", "#F2E8DC"],
  },
  {
    name: "Studio product",
    style_type: "photo",
    aesthetics: "clean, commercial, high-key",
    lighting: "softbox studio lighting, even illumination",
    medium: "digital photograph, 50mm",
    style_value: "professional product photography, crisp focus",
    palette: ["#FFFFFF", "#E5E5E5", "#1A1A1A"],
  },
  {
    name: "Oil painting",
    style_type: "art_style",
    aesthetics: "classical, painterly, rich textures",
    lighting: "chiaroscuro, warm directional light",
    medium: "oil on canvas",
    style_value: "Baroque oil painting, Rembrandt-inspired",
    palette: ["#3B2A1A", "#8B6B3D", "#D4B483"],
  },
  {
    name: "Anime cel",
    style_type: "art_style",
    aesthetics: "vibrant, clean linework, expressive",
    lighting: "flat shading with rim highlights",
    medium: "digital illustration",
    style_value: "modern anime cel shading, Studio Trigger style",
    palette: ["#FF4FA3", "#4FC3FF", "#FFD54F"],
  },
  {
    name: "Watercolor",
    style_type: "art_style",
    aesthetics: "soft, flowing, organic",
    lighting: "diffused natural light",
    medium: "watercolor on cold-press paper",
    style_value: "loose watercolor washes, pigment bleeds",
    palette: ["#A8DADC", "#F1FAEE", "#E63946"],
  },
]

/** Curated typography presets for text/logo elements. Each is a short
 *  descriptor injected into the element's `font` field — the model uses
 *  it to steer the rendered typography. Mirrors Ideogrammar's font-style
 *  picker (self-hosted font previews are a future enhancement). */
export const FONT_PRESETS: string[] = [
  "bold geometric sans-serif, all caps",
  "elegant high-contrast serif, uppercase",
  "heavy condensed sans-serif, italic",
  "thin minimalist sans-serif, lowercase",
  "brush script, hand-painted feel",
  "art deco serif, wide stance",
  "mono-spaced typewriter, regular weight",
  "stencil sans-serif, military style",
  "retro rounded sans-serif, 1960s feel",
  "graffiti bubble letters, outlined",
]

// ─── Helpers ──────────────────────────────────────────────────────────────

let _idSeq = 0
export function genId(prefix = "el"): string {
  _idSeq += 1
  return `${prefix}_${Date.now().toString(36)}_${_idSeq}`
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

export function clampBbox(bbox: [number, number, number, number]): [number, number, number, number] {
  let [ymin, xmin, ymax, xmax] = bbox
  if (xmin > xmax) [xmin, xmax] = [xmax, xmin]
  if (ymin > ymax) [ymin, ymax] = [ymax, ymin]
  return [
    clamp(Math.round(ymin), 0, GRID_SIZE),
    clamp(Math.round(xmin), 0, GRID_SIZE),
    clamp(Math.round(ymax), 0, GRID_SIZE),
    clamp(Math.round(xmax), 0, GRID_SIZE),
  ]
}

export function bboxToRect(bbox: [number, number, number, number]) {
  const [ymin, xmin, ymax, xmax] = bbox
  return { x: xmin, y: ymin, w: Math.max(0, xmax - xmin), h: Math.max(0, ymax - ymin) }
}

export function rectToBbox(x: number, y: number, w: number, h: number): [number, number, number, number] {
  return [y, x, y + h, x + w]
}

export function snap(v: number, enabled: boolean): number {
  if (!enabled) return v
  // `+ 0` normalizes -0 → 0 so callers don't have to worry about sign.
  return Math.round(v / SNAP_UNITS) * SNAP_UNITS + 0
}

export function normalizeHex(input: string): string | null {
  let s = input.trim()
  if (!s) return null
  if (!s.startsWith("#")) s = "#" + s
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    // expand #RGB → #RRGGBB
    s = "#" + s.slice(1).split("").map((c) => c + c).join("")
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(s)) return null
  return s.toUpperCase()
}

export function sanitizeHexList(input: string): string[] {
  // Accept comma- or space-separated colors.
  return input
    .split(/[,\s]+/)
    .map((s) => normalizeHex(s))
    .filter((s): s is string => !!s)
}

/** Loose shape of an element as it may arrive from JSON or PNG metadata.
 *  Note: the permissive index signature is intentional — input can carry
 *  legacy/alternative keys (description, palette, normalized x/y/w/h) that
 *  the parser knows how to map. */
export type RawElement = Record<string, unknown> & {
  type?: unknown
  desc?: unknown
  description?: unknown
  text?: unknown
  font?: unknown
  bbox?: unknown
  x?: unknown
  y?: unknown
  w?: unknown
  h?: unknown
  color_palette?: unknown
  palette?: unknown
}

export function isValidElementsArray(parsed: unknown): parsed is RawElement[] {
  if (!Array.isArray(parsed)) return false
  return parsed.every((el) => {
    if (!el || typeof el !== "object") return false
    const e = el as Record<string, unknown>
    if (e.type !== "obj" && e.type !== "text" && e.type !== "logo") return false
    if (typeof e.desc !== "string" && typeof e.description !== "string") return false
    if (e.bbox !== undefined && !Array.isArray(e.bbox)) return false
    return true
  })
}

/** Parse a JSON string into the internal IdeoElement shape, filling in defaults.
 *  Returns null if the input is not valid. */
export function parseElementsJSON(raw: string): IdeoElement[] | null {
  if (!raw || !raw.trim()) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isValidElementsArray(parsed)) return null
  return parsed.map((el, idx) => {
    const type: ElementType = el.type === "text" ? "text" : el.type === "logo" ? "logo" : "obj"
    const rawBbox = el.bbox
    let bbox: [number, number, number, number] = [
      200, 200, 500, 500,
    ]
    if (Array.isArray(rawBbox) && rawBbox.length === 4 && rawBbox.every((v) => typeof v === "number")) {
      bbox = clampBbox(rawBbox as [number, number, number, number])
    } else if (
      typeof el.x === "number" && typeof el.y === "number" &&
      typeof el.w === "number" && typeof el.h === "number"
    ) {
      bbox = clampBbox(rectToBbox(el.x * GRID_SIZE, el.y * GRID_SIZE, el.w * GRID_SIZE, el.h * GRID_SIZE))
    }
    const paletteSrc = (el.color_palette || el.palette || []) as unknown
    const color_palette = Array.isArray(paletteSrc)
      ? paletteSrc.map((c) => normalizeHex(String(c))).filter((c): c is string => !!c).slice(0, 5)
      : []
    const rawDesc = (el.desc ?? el.description ?? "") as unknown
    const rawText = (el.text ?? "") as unknown
    const rawFont = (el.font ?? "") as unknown
    const hasText = type === "text" || type === "logo"
    return {
      id: genId(`imp${idx}`),
      type,
      desc: typeof rawDesc === "string" ? rawDesc : String(rawDesc ?? ""),
      text: hasText ? (typeof rawText === "string" ? rawText : String(rawText ?? "")) : undefined,
      font: hasText && typeof rawFont === "string" && rawFont ? rawFont : undefined,
      bbox,
      color_palette,
    }
  })
}

/** Serialize internal elements back to the wire JSON string. */
export function serializeElements(elements: IdeoElement[]): string {
  const out = elements.map((el) => {
    const obj: Record<string, unknown> = {
      type: el.type,
      bbox: el.bbox,
      desc: el.desc,
    }
    if (el.type === "text" || el.type === "logo") obj.text = el.text ?? ""
    if ((el.type === "text" || el.type === "logo") && el.font) obj.font = el.font
    if (el.color_palette.length > 0) obj.color_palette = el.color_palette
    return obj
  })
  return JSON.stringify(out)
}

/** Extract the Ideogram caption JSON from a PNG's tEXt/zTXt chunks.
 *  Looks for the `prompt` or `parameters` chunk and tries to JSON.parse it.
 *  Also checks ComfyUI's `prompt`/`workflow` chunks (parse the node graph).
 *  Returns null if no usable caption is found. */
export async function extractIdeogramCaptionFromPNG(file: File): Promise<IdeoElement[] | null> {
  const buf = new Uint8Array(await file.arrayBuffer())
  // PNG signature check
  if (buf.length < 8) return null
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!SIG.every((b, i) => buf[i] === b)) return null

  // Walk chunks; collect tEXt and zTXt payloads.
  const textChunks: Record<string, string> = {}
  let off = 8
  const decoder = new TextDecoder("utf-8")
  while (off + 8 <= buf.length) {
    const len = (buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3]
    const type = decoder.decode(buf.slice(off + 4, off + 8))
    const dataStart = off + 8
    const dataEnd = dataStart + len
    if (dataEnd > buf.length) break
    if (type === "tEXt") {
      const payload = decoder.decode(buf.slice(dataStart, dataEnd))
      const nul = payload.indexOf("\0")
      if (nul > 0) {
        const key = payload.slice(0, nul)
        const val = payload.slice(nul + 1)
        textChunks[key] = val
      }
    } else if (type === "zTXt") {
      // compressed text — only attempt if a decompression lib is available.
      // Skip the compression method byte + null-terminated keyword, then zlib data.
      try {
        // Browser CSP will let us use DecompressionStream; not all runtimes have it.
        const payload = decoder.decode(buf.slice(dataStart, dataEnd))
        const nul = payload.indexOf("\0", 1)
        if (nul > 0) {
          const key = payload.slice(0, nul)
          const compData = buf.slice(dataStart + nul + 2, dataEnd)
          if (typeof DecompressionStream !== "undefined") {
            const ds = new DecompressionStream("deflate")
            const stream = new Blob([compData]).stream().pipeThrough(ds)
            const decompressed = await new Response(stream).text()
            textChunks[key] = decompressed
          }
        }
      } catch (e) {
        // Best-effort: DecompressionStream can fail on a corrupted zTXt chunk.
        // Log so we know when embedded metadata is being silently dropped.
        console.warn('[IdeogramCanvasEditor] zTXt chunk decompression failed, skipping:', e)
      }
    } else if (type === "IEND") {
      break
    }
    off = dataEnd + 4 // skip CRC
  }

  // Try common keys. The Ideogram forge writes the caption as the prompt;
  // ComfyUI stores the workflow under `prompt` (node graph JSON) and
  // `parameters` (A1111-style prompt block).
  const candidates = [
    textChunks["prompt"],
    textChunks["parameters"],
    textChunks["Caption"],
    textChunks["caption"],
    textChunks["IdeogramCaption"],
    textChunks["Description"],
  ].filter((v): v is string => !!v)

  for (const c of candidates) {
    const trimmed = c.trim()
    // Try as direct JSON first.
    if (trimmed.startsWith("{")) {
      try {
        const obj = JSON.parse(trimmed)
        if (obj?.compositional_deconstruction?.elements) {
          const parsed = parseElementsJSON(JSON.stringify(obj.compositional_deconstruction.elements))
          if (parsed) return parsed
        }
      } catch {
        // not JSON; try as a1111-style block
      }
    }
    // A1111 style: prompt\nNegative prompt: ...\nSteps: ...
    // Pull out any embedded JSON-looking blob.
    const jsonMatch = trimmed.match(/\{[\s\S]*"compositional_deconstruction"[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const obj = JSON.parse(jsonMatch[0])
        if (obj?.compositional_deconstruction?.elements) {
          const parsed = parseElementsJSON(JSON.stringify(obj.compositional_deconstruction.elements))
          if (parsed) return parsed
        }
      } catch {
        // give up
      }
    }
  }
  return null
}

// ─── AI Panel (LLM structured generation) ──────────────────────────────────

/** Read a File as a data: URL (base64). Used for vision input to the LLM. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error ?? new Error("read failed"))
    reader.readAsDataURL(file)
  })
}

/**
 * Apply a caption object (from the LLM) to the editor's flat-values state +
 * elements array. This is the inverse of the caption-assemble useMemo in the
 * main editor — it unpacks the structured JSON back into the flat fields the
 * Style panel and Elements list read from.
 */
export function applyCaptionToEditor(
  caption: Record<string, unknown>,
  commitElements: (updater: (prev: IdeoElement[]) => IdeoElement[]) => void,
  setValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
): void {
  // ── Elements ──
  const cd = (caption.compositional_deconstruction ?? {}) as Record<string, unknown>
  const rawElements = cd.elements
  if (Array.isArray(rawElements)) {
    const parsed = parseElementsJSON(JSON.stringify(rawElements))
    if (parsed && parsed.length) {
      commitElements(() => parsed)
    }
  }

  // ── Flat style / description fields ──
  setValues((prev) => {
    const next: Record<string, unknown> = { ...prev }
    const hld = caption.high_level_description
    if (typeof hld === "string") next.high_level_description = hld

    const bg = cd.background
    if (typeof bg === "string") next.background = bg

    const sd = caption.style_description as Record<string, unknown> | undefined
    if (sd && typeof sd === "object") {
      if (typeof sd.aesthetics === "string") next.aesthetics = sd.aesthetics
      if (typeof sd.lighting === "string") next.lighting = sd.lighting
      if (typeof sd.medium === "string") next.medium = sd.medium
      if (typeof sd.photo === "string") {
        next.style_type = "photo"
        next.style_value = sd.photo
      } else if (typeof sd.art_style === "string") {
        next.style_type = "art_style"
        next.style_value = sd.art_style
      }
      const pal = sd.color_palette
      if (Array.isArray(pal)) {
        next.style_palette = pal
          .filter((c): c is string => typeof c === "string")
          .join(", ")
      }
    }
    return next
  })
}


// ─── Caption bridge (the deleted Slots.tsx adapter, restored 2026-08-26) ──
// The advanced mode mounts inside the CARD system again (flow ParamFields)
// via slot.tsx; the bridge is what makes the field value contract work: the
// draft's prompt param IS the assembled caption JSON string.

/** Partial caption shape the bridge unpacks (wire format of _build_caption). */
export interface IdeogramCaption {
  high_level_description?: string
  style_description?: {
    aesthetics?: string
    lighting?: string
    medium?: string
    photo?: string
    art_style?: string
    color_palette?: string[]
  }
  compositional_deconstruction: {
    background: string
    elements: Array<Record<string, unknown>>
  }
}

/** Parse the field value (object or JSON string) into a partial caption. */
function parseCaptionValue(raw: unknown): Partial<IdeogramCaption> {
  if (!raw) return {}
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as Partial<IdeogramCaption> } catch { return {} }
  }
  if (typeof raw === "object") return raw as Partial<IdeogramCaption>
  return {}
}

/** Flatten caption object → editor's flat values record. */
export function flattenCaption(
  rawCaption: unknown,
  width: number,
  height: number,
): Record<string, unknown> {
  const c = parseCaptionValue(rawCaption)
  const sd = c.style_description ?? {}
  let styleType: StyleType = "none"
  let styleValue = ""
  if (typeof sd.photo === "string") {
    styleType = "photo"
    styleValue = sd.photo
  } else if (typeof sd.art_style === "string") {
    styleType = "art_style"
    styleValue = sd.art_style
  }
  const cd = c.compositional_deconstruction ?? { background: "", elements: [] }
  return {
    high_level_description: c.high_level_description ?? "",
    style_type: styleType,
    aesthetics: sd.aesthetics ?? "",
    lighting: sd.lighting ?? "",
    medium: sd.medium ?? "",
    style_value: styleValue,
    style_palette: Array.isArray(sd.color_palette) ? sd.color_palette.join(", ") : "",
    background: cd.background ?? "",
    elements: JSON.stringify(cd.elements ?? []),
    width,
    height,
  }
}

/** Assemble editor's flat values → caption object for the wire. */
export function assembleCaption(v: Record<string, unknown>): IdeogramCaption {
  const styleType = String(v.style_type ?? "none") as StyleType
  const out: IdeogramCaption = {} as IdeogramCaption
  const hld = String(v.high_level_description ?? "").trim()
  if (hld) out.high_level_description = hld
  if (styleType !== "none") {
    const sd: NonNullable<IdeogramCaption["style_description"]> = {}
    const a = String(v.aesthetics ?? "").trim()
    const l = String(v.lighting ?? "").trim()
    const m = String(v.medium ?? "").trim()
    const sv = String(v.style_value ?? "").trim()
    if (a) sd.aesthetics = a
    if (l) sd.lighting = l
    if (m) sd.medium = m
    if (styleType === "photo" && sv) sd.photo = sv
    if (styleType === "art_style" && sv) sd.art_style = sv
    const palette = sanitizeHexList(String(v.style_palette ?? ""))
    if (palette.length) sd.color_palette = palette
    if (Object.keys(sd).length) out.style_description = sd
  }
  const bg = String(v.background ?? "").trim()
  let elements: Array<Record<string, unknown>> = []
  try {
    const parsed: unknown = JSON.parse(String(v.elements ?? "[]"))
    if (Array.isArray(parsed)) elements = parsed as Array<Record<string, unknown>>
  } catch { /* empty elements on parse error */ }
  out.compositional_deconstruction = {
    background: bg || "(describe the scene background)",
    elements,
  }
  return out
}

// ─── Internal exports (for unit tests) ────────────────────────────────────
// These helpers are pure functions over Ideogram 4's wire format and are the
// most important behavior to lock down. Marked as internal — not part of the
// public component API.
export const __test = {
  GRID_SIZE,
  SNAP_UNITS,
  MIN_BOX,
  clampBbox,
  bboxToRect,
  rectToBbox,
  snap,
  normalizeHex,
  sanitizeHexList,
  isValidElementsArray,
  parseElementsJSON,
  serializeElements,
  flattenCaption,
  assembleCaption,
}
