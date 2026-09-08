// recipe — the recipe-bar derivation (phase A flat form + phase C agent
// recipe + the FILTER tier).
//
// Split from component.tsx (the 2870-line monolith split): the recipe
// derivation block + the filter-tier block, verbatim logic, as ONE pure
// function (the two blocks share locals in the original — one function
// keeps that shape). Pure derivation from args — the bar writes nothing;
// the same grammar the agent-facing recipe model normalizes toward.
import { BoxSelect, Brush, Expand, Focus } from "lucide-react"
import { CLASS_COLORS, DETECTOR_DEFS, DETECT_CLASSES, recipeFilterLabel, SAM3_COLOR, PAINT_COLOR } from "./constants"
import type { BoxEntry, DetectClass, FilterChip, RecipeEntry, RecipeOutput } from "./constants"

export interface RecipeOpts {
  params: Record<string, unknown>
  artifacts: Record<string, string>
  recipeOutputs: RecipeOutput[] | null
  recipeDetect: boolean
  detectMode: string
  outputMode: string
  sam3Prompt: string
  sam3Active: boolean
  textArmed: boolean
  hasPaint: boolean
  hasScope: boolean
  instanceLabel: string | null
  filterActive: boolean
  boxes: BoxEntry[] | null
  selectedInstances: Set<number>
  onPrimaryKeep: (keep: Set<number>) => void
  onClearSelection: () => void
  onSwitchInstance: (idx: number) => void
}

export interface Recipe {
  cards: RecipeEntry[]
  chips: FilterChip[]
}

/** One recipe derivation — one entry per ARMED selection, FILTER over
 * SELECTION. Combined leads and names its winner (the brick's detect >
 * sam3 > paint priority, narrated). */
export function deriveRecipe({
  params, artifacts, recipeOutputs, recipeDetect, detectMode, outputMode,
  sam3Prompt, sam3Active, textArmed, hasPaint, hasScope, instanceLabel,
  filterActive, boxes, selectedInstances,
  onPrimaryKeep, onClearSelection, onSwitchInstance,
}: RecipeOpts): Recipe {
  // ── The recipe derivation (2026-08-16 phase A) — one entry per ARMED
  // selection, FILTER over SELECTION. Combined leads and names its winner
  // (the brick's detect > sam3 > paint priority, narrated). Pure
  // derivation from params + artifacts — the bar writes nothing; the
  // same grammar the agent-facing recipe model normalizes toward.
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
  const scopeFilter = hasScope ? "Scope" : "Full"
  const geometryDetail = outputMode === "bbox" ? "rect" : "traced"
  // Artifact-present ORs (the run's truth — same rule as the detect
  // classes): a landed mask_sam3 / mask_paint proves that recipe ran even
  // if the param that armed it is gone (an agent write, a revive).
  const sam3Armed = sam3Active || textArmed || Boolean(artifacts.mask_sam3)
  const paintArmed = hasPaint || Boolean(params.export_paint) || Boolean(artifacts.mask_paint)
  const armedClasses = DETECT_CLASSES.filter(
  ({ key }) =>
  Boolean(params[`export_${key}`]) ||
  detectMode === key ||
  Boolean(artifacts[`mask_${key}`]),
  )
  const combinedWinner =
  detectMode !== "none"
  ? cap(DETECT_CLASSES.find((c) => c.key === detectMode)?.label ?? "body")
  : sam3Active
  ? "SAM3"
  : "Paint"
  const trimmedPrompt = sam3Prompt.trim()
  const promptDetail = trimmedPrompt
  ? trimmedPrompt.length > 14 ? `"${trimmedPrompt.slice(0, 13)}…"` : `"${trimmedPrompt}"`
  : undefined
  const recipeCards: RecipeEntry[] = []
  if (recipeOutputs) {
  // PHASE C — the agent's recipe, VERBATIM: one card per authored entry
  // (the first detect entry is the primary — its card IS Combined). The
  // bar renders what the brick will run; a user gesture re-flattens.
  let firstDetect = true
  for (const e of recipeOutputs) {
  const filter = recipeFilterLabel(e)
  const sk = e.selection?.kind
  if (sk === "detect") {
  const cls = (
  DETECT_CLASSES.find((c) => c.key === e.selection?.class)?.key ?? "body"
  ) as DetectClass
  const mode =
  e.selection?.mode === "bbox" || e.selection?.mode === "segm"
  ? e.selection.mode
  : outputMode
  if (firstDetect) {
  firstDetect = false
  recipeCards.push({
  key: "mask_combined",
  filter,
  selection: "Combined",
  detail: `← ${cap(cls)}`,
  color: DETECTOR_DEFS[0].color,
  url: artifacts.mask_combined ?? null,
  })
  continue
  }
  recipeCards.push({
  key: `mask_${cls}`,
  filter,
  selection: cap(cls),
  detail: mode === "bbox" ? "rect" : "traced",
  color: CLASS_COLORS[cls],
  url: artifacts[`mask_${cls}`] ?? null,
  })
  } else if (sk === "sam3") {
  const rp = (e.selection?.prompt ?? "").trim()
  recipeCards.push({
  key: "mask_sam3",
  filter,
  selection: "SAM3",
  detail: rp
  ? rp.length > 14 ? `"${rp.slice(0, 13)}…"` : `"${rp}"`
  : undefined,
  color: SAM3_COLOR,
  url: artifacts.mask_sam3 ?? null,
  })
  } else if (sk === "paint") {
  recipeCards.push({
  key: "mask_paint",
  filter,
  selection: "Paint",
  detail: "live",
  color: PAINT_COLOR,
  url: null,
  live: true,
  })
  }
  }
  } else {
  // The FLAT form (the editor's authoring path) — phase A behavior.
  if (armedClasses.length > 0 || sam3Armed || paintArmed) {
  recipeCards.push({
  key: "mask_combined",
  filter: instanceLabel ?? scopeFilter,
  selection: "Combined",
  detail: `← ${combinedWinner}`,
  color: DETECTOR_DEFS[0].color, // the combined white
  url: artifacts.mask_combined ?? null,
  })
  }
  for (const { key, label } of armedClasses) {
  recipeCards.push({
  key: `mask_${key}`,
  filter: instanceLabel ?? scopeFilter,
  selection: cap(label),
  detail: geometryDetail,
  color: CLASS_COLORS[key],
  url: artifacts[`mask_${key}`] ?? null,
  })
  }
  if (sam3Armed) {
  recipeCards.push({
  key: "mask_sam3",
  filter: scopeFilter,
  selection: "SAM3",
  detail: promptDetail,
  color: SAM3_COLOR,
  url: artifacts.mask_sam3 ?? null,
  })
  }
  if (paintArmed) {
  recipeCards.push({
  key: "mask_paint",
  filter: "Canvas",
  selection: "Paint",
  detail: "live",
  color: PAINT_COLOR,
  url: null,
  live: true,
  })
  }
  }

  // ── The FILTER TIER (level a) — one chip per filter, BBox chips SWITCH ──
  // "a) Filter (bbox, none, etc)" — the bar's first level, ALWAYS
  // rendered (a dim "BBox —" until instances land: the switch ability is
  // visible before the first run, never discovered by accident). BBox
  // chips are one-tap switches on the primary's keep; Full clears the
  // instance filter; Scope clears the marquee (flat form only — a
  // recipe's scope belongs to the agent).
  const primaryFiltered =
  filterActive || Boolean(recipeOutputs?.some((e) => e.filter?.kind === "instance"))
  const scopeOn = recipeOutputs
  ? recipeOutputs.some((e) => e.filter?.kind === "scope")
  : hasScope
  const paintOn = recipeOutputs
  ? recipeOutputs.some((e) => e.selection?.kind === "paint")
  : paintArmed
  const detectArmed = detectMode !== "none" || recipeDetect
  const filterChips: FilterChip[] = [
  {
  key: "full",
  label: "Full",
  tone: "full",
  icon: Expand,
  active: !scopeOn && !primaryFiltered,
  tip: "Whole image, every instance",
  onTap: primaryFiltered ? () => onPrimaryKeep(new Set()) : undefined,
  },
  ]
  if (scopeOn) {
  filterChips.push({
  key: "scope",
  label: "Scope",
  tone: "scope",
  icon: Focus,
  active: true,
  tip: "The marquee rectangle — click to clear",
  // Recipe scopes are agent-authored; the chip narrates, never edits.
  onTap: recipeOutputs ? undefined : onClearSelection,
  })
  }
  if (paintOn) {
  filterChips.push({
  key: "canvas",
  label: "Canvas",
  tone: "canvas",
  icon: Brush,
  active: true,
  tip: "The brush IS the geometry",
  })
  }
  if (detectArmed) {
  if (boxes && boxes.length > 0) {
  for (const b of boxes) {
  filterChips.push({
  key: `bbox-${b.index}`,
  label: `BBox ${b.index + 1}`,
  tone: "instance",
  icon: BoxSelect,
  active: selectedInstances.has(b.index),
  tip: `Switch the Combined mask to instance ${b.index + 1} (${b.class})`,
  onTap: () => onSwitchInstance(b.index),
  })
  }
  } else {
  filterChips.push({
  key: "bbox-none",
  label: "BBox —",
  tone: "instance",
  icon: BoxSelect,
  active: false,
  dim: true,
  tip: "Run Detect — every found instance lands here as a switchable BBox card",
  })
  }
  }

  return { cards: recipeCards, chips: filterChips }
}
