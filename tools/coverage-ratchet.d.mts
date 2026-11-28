/** The declaration face of tools/coverage-ratchet.mjs — the .mjs is
 * JS-by-design repo tooling; this face declares the exported seams the
 * TS wall tier imports (tests/walls/ts/suites/coverage-ratchet-growth.spec.ts
 * arms the two pure verdicts and the floor reader). The judgment law
 * lives in the .mjs, never here. */

/** The floor metrics a baseline row carries, in vitest's report order. */
export const FLOOR_METRICS: readonly ["statements", "branches", "functions", "lines"]

/** One summary file's metric face (coverage-summary.json shape). */
export interface SummaryFace {
  pct: number
  covered: number
  total: number
}

/** A metric floor row of scripts/coverage-baseline.ts (null = the null
 * floor law: zero paths on that metric). */
export interface FloorRow {
  statements: number | null
  branches: number | null
  functions: number | null
  lines: number | null
}

/** A below-floor reading: the repo-relative file, the metric, the
 * summary's percentage, and CI's floor it sits under. */
export interface FloorBreach {
  file: string
  metric: (typeof FLOOR_METRICS)[number]
  pct: number
  floor: number
}

/** A growth row of the line ledger. */
export interface GrowthRow {
  file: string
  uncovered: number
  owned: number
}

/** The pure verdicts' shape: red rows die the push, drift rows are
 * named aloud and pass. */
export interface Verdict {
  red: string[]
  drift: string[]
}

/** The package root a tree file belongs to (packages/<genre>/<name>), or
 * null outside every package — judged strictly. */
export function packageRootOf(rel: string): string | null

/** The line ledger's pure verdict (injectable — the wall arms it). */
export function judgeGrowth(rows: GrowthRow[], changed: (root: string) => boolean): Verdict

/** CI's own floors read off the fresh summary (keys absolute or
 * relative; rows come back repo-relative). */
export function ciFloorRows(
  summary: Record<string, Partial<Record<(typeof FLOOR_METRICS)[number], SummaryFace>>>,
  floors: Record<string, FloorRow>,
): FloorBreach[]

/** The same delta law over the floor rows (injectable — the wall arms it). */
export function judgeFloors(rows: FloorBreach[], changed: (root: string) => boolean): Verdict
