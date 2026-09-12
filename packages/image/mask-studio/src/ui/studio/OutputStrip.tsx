// OutputStrip — the RECIPE bar. Pure move from component.tsx (props shape
// unchanged); the shared recipe/filter types + CHIP_TONE live in
// constants.ts, the thumbnail in MaskThumb.tsx.
import { Button, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives"
import { clsx } from "clsx"
import { CHIP_TONE } from "./constants"
import type { FilterChip, RecipeEntry } from "./constants"
import { MaskThumb } from "./MaskThumb"
import styles from "./mask.module.css"

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
  <div data-output-strip className={styles.strip}>
  <div className={styles.stripHead}>
  <span className={styles.stripTitle}>Outputs</span>
  <span className={styles.stripSub}>
  {entries.length === 0
  ? "— nothing armed yet"
  : running ? "— filling as the run lands…" : "— exported automatically"}
  </span>
  </div>
  {/* FILTER TIER — level a) of the owner's hierarchy ("Filter: bbox,
   * none, etc"), ALWAYS rendered: the switch ability is visible even
   * before a run (dim "BBox —" until instances land). Live chips switch
   * the recipe with one tap — no canvas-badge hunt. */}
  <div data-filter-tier className={styles.filterTier}>
  {filters.map((f) =>
  f.onTap ? (
  <Tooltip key={f.key} label={f.tip ?? f.label} side="top">
  <Button variant="ghost"
  type="button" data-filter-chip={f.key}
  onClick={f.onTap}
  className={clsx(
  styles.filterChip,
  f.dim && styles.chipDim,
  f.active ? CHIP_TONE[f.tone].on : CHIP_TONE[f.tone].off,
  !f.active && styles.chipHover,
  )}
  >
  {f.icon && <f.icon className={styles.sz10} />}
  {f.label}
  </Button>
  </Tooltip>
  ) : (
  <span
  key={f.key} data-filter-chip={f.key}
  title={f.tip}
  className={clsx(
  styles.filterChip,
  f.active ? CHIP_TONE[f.tone].on : CHIP_TONE[f.tone].off,
  f.dim && styles.chipDim,
  )}
  >
  {f.icon && <f.icon className={styles.sz10} />}
  {f.label}
  </span>
  ),
  )}
  </div>
  {entries.length === 0 ? (
  <p className={styles.stripEmpty}>
  Nothing armed — pick a source in the rail and its recipe card appears
  here, filling when the run lands.
  </p>
  ) : (
  <div className={styles.recipeRow}>
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
  className={clsx(
  styles.recipeCard,
  filled
  ? styles.recipeFilled
  : clsx(styles.recipeEmptyCard, running && styles.pulse),
  )}
  >
  <span className={styles.recipeFilter}>
  {e.filter}
  </span>
  <MaskThumb
  url={e.url}
  color={e.color}
  imgCache={imgCache}
  paintCanvas={e.live ? paintCanvas : null}
  paintVersion={e.live ? paintVersion : 0}
  />
  <span className={clsx(styles.recipeSel, styles.truncate)}>
  <span className={styles.truncate}>{e.selection}</span>
  {e.detail && (
  <span className={styles.recipeDetail}>{e.detail}</span>
  )}
  {!filled && !e.detail && (
  <span className={styles.recipeEmptyNote}>(empty)</span>
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
