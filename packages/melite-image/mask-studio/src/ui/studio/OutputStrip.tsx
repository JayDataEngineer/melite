// OutputStrip — the RECIPE bar. Pure move from component.tsx (props shape
// unchanged); the shared recipe/filter types + CHIP_TONE live in
// constants.ts, the thumbnail in MaskThumb.tsx.
import { Button } from "@melite/ui/button"
import { Tip } from "@melite/ui/tip"
import { cn } from "@melite/ui"
import { CHIP_TONE } from "./constants"
import type { FilterChip, RecipeEntry } from "./constants"
import { MaskThumb } from "./MaskThumb"

// ── Output strip — the RECIPE bar (2026-08-16 phase A) ────────────────────
// "We have 'outputs' at the bottom. It's static, when it could be
// dynamic… cards could come out that say 'BBox1, Person' next to
// 'Hands'." OVERTURNS the fixed-slot half of spec §8.12: the bar no
// longer renders one dim slot per EMITTABLE output — it renders one
// subcard per ARMED recipe, labeled with the run's two-level hierarchy
// (the owner's own vocabulary):
//   FILTER    where: Full | Scope (per-instance "BBox1.." arrives with
//             the backend phase — the SEGS manifest + instance filter)
//   SELECTION how:   Body / Face / Hands (sam2) | SAM3 (text) | Paint
// The emittable-output CONTRACT still lives where it belongs — the
// schema's optional_outputs + the form view. This bar is the RUN'S
// RECIPE made visible; the label grammar is the same filter→selection
// hierarchy the agent-facing model normalizes toward, so a human
// reading the bar is reading what the agent wrote (and refining it).
// Armed = param-armed OR artifact-present — the same OR rule runDetect
// exports by (the export_* flags lag the artifacts by one run; an
// artifact landing IS proof the recipe ran).
export function OutputStrip({
  entries, hasPaint, paintVersion, imgCache, paintCanvas, running, filters,
}: {
  entries: RecipeEntry[]
  hasPaint: boolean
  paintVersion: number
  imgCache: Map<string, HTMLImageElement>
  paintCanvas: HTMLCanvasElement | null
  running: boolean
  /** THE FILTER TIER (level a): one chip per filter — BBox chips switch. */
  filters: FilterChip[]
}) {
  return (
  <div data-output-strip className="shrink-0 rounded-md border border-border/50 bg-sidebar/30 px-2 py-1.5">
  <div className="flex items-baseline gap-1 pb-1">
  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Outputs</span>
  <span className="text-[9px] text-muted-foreground/50">
  {entries.length === 0
  ? "— nothing armed yet"
  : running ? "— filling as the run lands…" : "— exported automatically"}
  </span>
  </div>
  {/* FILTER TIER — level a) of the owner's hierarchy ("Filter: bbox,
   * none, etc"), ALWAYS rendered: the switch ability is visible even
   * before a run (dim "BBox —" until instances land). Live chips switch
   * the recipe with one tap — no canvas-badge hunt. */}
  <div data-filter-tier className="flex flex-wrap items-center gap-1 pb-1.5">
  {filters.map((f) =>
  f.onTap ? (
  <Tip key={f.key} tip={f.tip ?? f.label}>
  <Button variant="ghost"
  type="button" data-filter-chip={f.key}
  onClick={f.onTap}
  className={cn(
  "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[9px] font-medium transition-colors",
  f.dim && "opacity-40",
  f.active ? CHIP_TONE[f.tone].on : CHIP_TONE[f.tone].off,
  f.onTap && !f.active && "hover:bg-sidebar/60",
  )}
  >
  {f.icon && <f.icon className="h-2.5 w-2.5 shrink-0" />}
  {f.label}
  </Button>
  </Tip>
  ) : (
  <span
  key={f.key} data-filter-chip={f.key}
  title={f.tip}
  className={cn(
  "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[9px] font-medium",
  f.active ? CHIP_TONE[f.tone].on : CHIP_TONE[f.tone].off,
  f.dim && "opacity-40",
  )}
  >
  {f.icon && <f.icon className="h-2.5 w-2.5 shrink-0" />}
  {f.label}
  </span>
  ),
  )}
  </div>
  {entries.length === 0 ? (
  <p className="pb-1 text-[9px] leading-relaxed text-muted-foreground/60">
  Nothing armed — pick a source in the rail and its recipe card appears
  here, filling when the run lands.
  </p>
  ) : (
  <div className="flex gap-1.5 overflow-x-auto pb-0.5">
  {entries.map((e) => {
  const filled = e.live ? hasPaint : !!e.url
  return (
  <div
  key={e.key}
  data-mask-row={e.key}
  data-filled={filled ? "true" : "false"}
  data-filter={e.filter}
  data-selection={e.selection}
  title={`${e.filter} · ${e.selection}${e.detail ? ` ${e.detail}` : ""}`}
  className={cn(
  "flex w-[92px] shrink-0 flex-col items-center gap-0.5 rounded border px-1.5 py-1.5 transition-colors",
  filled
  ? "border-border/60 bg-sidebar/40"
  : cn("border-dashed border-border/40 bg-sidebar/20 opacity-60", running && "animate-pulse"),
  )}
  >
  <span className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground/60">
  {e.filter}
  </span>
  <MaskThumb
  url={e.url}
  color={e.color}
  imgCache={imgCache}
  paintCanvas={e.live ? paintCanvas : null}
  paintVersion={e.live ? paintVersion : 0}
  />
  <span className="flex max-w-full items-center gap-0.5 text-[10px] text-foreground/80">
  <span className="truncate">{e.selection}</span>
  {e.detail && (
  <span className="shrink-0 truncate text-[9px] text-muted-foreground/60">{e.detail}</span>
  )}
  {!filled && !e.detail && (
  <span className="text-[9px] text-muted-foreground/60">(empty)</span>
  )}
  </span>
  </div>
  )
  })}
  </div>
  )}
  </div>
  )
}
