// constants — shared vocabulary for the mask-studio tenant.
//
// Pure move from component.tsx (the 2870-line monolith split): every value
// below is byte-identical in meaning to the original module-local
// declaration; `export` was added so the sibling modules can share them.
// No value, label, color, or threshold changed.
import {
  BoxSelect, Brush, Hand, PersonStanding, ScanFace, Sparkles, User,
} from "lucide-react"

/** The slot this editor sources. Mask Studio consumes one image — slot 0,
 * the input_image vocabulary key. Hard-coded: the family declares exactly
 * one image slot, and the wire/attach state below all reads index 0. */
export const INPUT_SLOT = "input_image"

export const MAX_CANVAS_EDGE = 1024

// ── Produced-mask metadata ────────────────────────────────────────────────
/** Detector mask defs — label + overlay tint. Keys match the family's
 * optional_outputs (config/.../mask_studio.yaml) + BrickResult.artifacts.
 * The mask strip + canvas overlay iterate this. */
export const DETECTOR_DEFS = [
  { key: "mask_combined", label: "Combined", color: "#e5e7eb" },
  { key: "mask_face", label: "Face", color: "#ef4444" },
  { key: "mask_hands", label: "Hands", color: "#22c55e" },
  { key: "mask_body", label: "Body", color: "#3b82f6" },
] as const
export const SAM3_COLOR = "#a78bfa" // violet — the open-vocabulary producer
export const PAINT_COLOR = "#d946ef"

/** Fixed overlay alphas (view-only — the exported PNG is always the
 * full-opacity binary mask; the panel's per-layer opacity knobs are GONE,
 * ). */
export const DETECTOR_ALPHA = 0.5
export const PAINT_ALPHA = 0.55

/** Prep-preview overlay alpha + tint. Cyan is deliberately NOT any
 * producer's color (white/red/green/blue/violet/magenta) — the effective
 * mask must read as its own layer, never as another producer's output. */
export const PREP_ALPHA = 0.38

/** Referentially-stable empty artifacts map (see the memo at the
 * `artifacts` derivation — a per-render `{}` literal loops the effects). */
export const EMPTY_ARTIFACTS: Record<string, string> = {}

// ── Canvas zoom / pan ───────────────────────────────────────────────────────
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 5;
export const WHEEL_ZOOM_FACTOR = 1.2;
export const WHEEL_NOTCH_MIN = 50;
export const WHEEL_PINCH_SENSITIVITY = 0.01;
export const VIEW_EASE = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";
export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

// ── Mask sources (2026-08-16 rework — the source-first rail) ──────────────
// The FOUR ways this card makes a mask, ONE radio — the user's own
// vocabulary, not the backend's: Person (YOLO+SAM segm, CPU) / Box (the
// YOLO-only bbox rectangles, CPU, no SAM — first-class since 2026-08-16:
// arming it writes output_mode=bbox, so a full-image box run no longer
// needs a marquee) / Text (SAM3 open-vocab, GPU) / Brush (hand-painted).
// The radio owns WHICH PRODUCER mask_combined resolves to (the brick's
// detect > sam3 > paint priority); un-picked producers can still RIDE
// ALONG — a non-empty sam3_prompt keeps emitting mask_sam3 beside a
// Person run, brush strokes keep emitting mask_paint — because the brick
// contract allows all three at once. Text/Brush write detect_mode="none"
// (detect OFF, exports cleared — the brick hard-errors on exports under
// "none"); Person/Box re-arm the LAST class (never "none").
export const SOURCES = [
  { key: "person", label: "Person", Icon: PersonStanding,
    tip: "YOLO + SAM — precise per-class masks (CPU)" },
  { key: "box", label: "Box", Icon: BoxSelect,
    tip: "YOLO rectangles only — fast, coarse (CPU, no SAM)" },
  { key: "text", label: "Text", Icon: Sparkles,
    tip: "SAM3 open-vocabulary — describe what to mask (GPU)" },
  { key: "brush", label: "Brush", Icon: Brush,
    tip: "Hand-paint the mask on the canvas" },
] as const
export type MaskSource = (typeof SOURCES)[number]["key"]


/** Detect classes — the YOLO model selector (mask_studio.yaml detectors
 * block). A brick-side + rail-side vocabulary only: "none" is NOT a class
 * here (it is what Text/Brush write to turn the detect producer off —
 * DetectorEntry requires a model, so the YAML block can't carry it). */
export const DETECT_CLASSES = [
  { key: "face", label: "face", Icon: ScanFace },
  { key: "hands", label: "hands", Icon: Hand },
  { key: "body", label: "body", Icon: User },
] as const
export type DetectClass = (typeof DETECT_CLASSES)[number]["key"]

export type ToolId = "move" | "brush" | "eraser" | "rect"

/** The selection marquee (canvas px). roi → normalized on the run buttons. */
export interface SelectionRect { x: number; y: number; w: number; h: number }

/** Marquee styling — distinct from the paint magenta so a selection never
 * reads as paint authoring. Dashed on commit (persistent), solid while
 * dragging. */
export const SEL_STROKE = "#38bdf8"

/** Instance overlay color (phase B, 2026-08-16) — amber, deliberately
 *  distinct from the marquee sky and every producer tint: the boxes are
 *  CANDIDATES, not masks. */
export const INSTANCE_COLOR = "#f59e0b"

/** One agent-authored ``outputs`` entry (phase C, 2026-08-16) — the
 *  recipe grammar the backend's mask_recipe.py validates (one
 *  {filter?, selection} per emittable mask). READ-ONLY here: the bar
 *  renders what the agent wrote; any editor gesture flattens it back to
 *  the flat params (the wrapper onSave). The ONE surgical exception is
 *  the instance badges — they refine the recipe's own primary entry. */
export interface RecipeOutput {
  filter?: { kind?: string; roi?: number[]; keep?: unknown }
  selection: { kind?: string; class?: string; mode?: string; prompt?: string }
}

/** A recipe entry's FILTER line — the same grammar the flat bar uses
 *  (instanceLabel / scopeFilter / "Canvas"), derived from the entry. */
export function recipeFilterLabel(e: RecipeOutput): string {
  const f = e.filter
  if (!f || f.kind === undefined || f.kind === "full") return "Full"
  if (f.kind === "scope") return "Scope"
  if (f.kind === "canvas") return "Canvas"
  if (f.kind === "instance") {
  const keep = f.keep
  const idx = keep === "largest"
  ? [0]
  : Array.isArray(keep)
  ? keep.map(Number)
  : typeof keep === "string"
  ? keep.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n))
  : keep !== undefined ? [Number(keep)] : []
  return idx.length ? `BBox ${idx.map((i) => i + 1).join(",")}` : "BBox ?"
  }
  return "Full"
}

/** One detect_boxes manifest entry — the run's per-instance report (one
 *  entry per detected component, index by area desc). bbox is
 *  normalized [x, y, w, h], the same coordinates the roi marquee uses. */
export interface BoxEntry {
  index: number
  class: string
  bbox: [number, number, number, number]
  area: number
}

/** One produced mask — display order is combined first, then per-class
 * detectors, then sam3 (see producedMasks in canvas-ops). */
export interface ProducedMask {
  key: string
  label: string
  color: string
  url: string
}

/** Output-card accents — the same colors the canvas overlays tint with,
 *  so a card reads as its mask's tint. */
export const CLASS_COLORS: Record<DetectClass, string> = {
  face: "#ef4444", hands: "#22c55e", body: "#3b82f6",
}

/** One recipe card's display shape (derived in the editor from params +
 *  artifacts — pure presentation, writes nothing). */
export interface RecipeEntry {
  /** artifact key — the data-mask-row + BrickResult.artifacts vocabulary */
  key: string
  /** FILTER line — where the selection runs (Full / Scope / Canvas) */
  filter: string
  /** SELECTION line — the producer's name */
  selection: string
  /** second-line note: geometry (rect/traced), prompt snippet, the
   *  Combined winner arrow, or the live tag */
  detail?: string
  color: string
  /** artifact URL; null = live (the paint canvas) */
  url: string | null
  /** true for the live paint card (fills from strokes, not a run) */
  live?: boolean
}

/** One FILTER-tier chip (the bar's first level): a filter KIND
 *  (Full / Scope / Canvas) or a switchable INSTANCE (BBox n). Chips with
 *  onTap are live switches — that is the "ability to switch". */
export interface FilterChip {
  key: string
  label: string
  /** chip tone: instance amber / scope sky / canvas fuchsia / full brand */
  tone: "full" | "scope" | "instance" | "canvas"
  active: boolean
  /** absent = a state label, not a switch */
  onTap?: () => void
  /** placeholder chip (no manifest yet) */
  dim?: boolean
  tip?: string
  /** the BADGE — every chip carries an icon so the tier reads as a row
   * of affordances, never bare text ("NO BBOX BADGE OR ICON", 2026-08-16) */
  icon?: typeof BoxSelect
}

export const CHIP_TONE: Record<FilterChip["tone"], { on: string; off: string }> = {
  full: { on: "border-brand/60 bg-brand/15 text-brand", off: "border-border/40 text-muted-foreground/70" },
  scope: { on: "border-sky-400/60 bg-sky-400/10 text-sky-300", off: "border-border/40 text-muted-foreground/70" },
  instance: { on: "border-amber-400/70 bg-amber-400/20 text-amber-300", off: "border-border/40 text-amber-200/50" },
  canvas: { on: "border-fuchsia-400/60 bg-fuchsia-400/10 text-fuchsia-300", off: "border-border/40 text-muted-foreground/70" },
}
