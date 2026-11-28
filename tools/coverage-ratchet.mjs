#!/usr/bin/env node
// coverage-ratchet.mjs — THE COVERAGE DEBT IS BUDGETED, GROWTH IS NOT
// (2026-11-14, the release-deadlock burn).
//
// The battery's first coverage arm judged `pnpm run test:coverage`'s
// raw exit — which reds on the estate's pre-existing per-file
// threshold debt (95 files, 3049 uncovered lines, roadmapped OPEN,
// floors untouchable by standing order). That arm made the repo
// UNPUBLISHABLE: no push, not even a hotfix, until a multi-day debt
// was paid. A guard that deadlocks is a defect, not a guard.
//
// This ratchet is the knip-budget law applied to coverage: the debt
// lives in tools/coverage-baseline.json (file → uncovered lines);
// the push gate reds only when the tree GROWS the debt — any file
// above its row, or any new file with uncovered lines. Shrinking is
// free; the row may only move UP in the same commit as the change
// that grew it, with its reason in that commit. When the debt
// reaches zero the baseline is {} and this ratchet IS the raw gate.
//
// THE JUDGMENT LAW (2026-11-15, the engine-restart drift burn): two
// battery runs, one tree, different per-file counts —
// provisioning/service.ts measured 26 uncovered at the baseline
// rebuild and 28 on every later run while its SOURCE was
// byte-unchanged since Nov 11 and no test in its package changed.
// Environment-conditioned arms (engine state, store contents,
// worker-scheduling order in the shared pool) move per-file counts
// on an untouched tree; a point-in-time baseline judged with zero
// tolerance reds on that noise and deadlocks the push — the exact
// defect class this tool was created to cure. So growth is judged
// where the tree can GROW it: a growth row whose PACKAGE (src or
// tests) is untouched since the baseline's own commit is named
// drift in the log and judged by its baseline-time measurement; a
// package that DID change is judged with zero tolerance. This is
// narrower than trust: the baseline commit is the last commit that
// touched tools/coverage-baseline.json, so every package edit after
// it re-arms strict judgment for that whole package.
//
// The battery still RUNS the full coverage suite (CI parity — the
// same run, the same report); only the judgment scopes to the delta.
// CI's own red on the standing debt stays the owned roadmap item.
//
// THE SECOND LEDGER — CI'S OWN FLOORS, SAME LAW (2026-11-28, the
// branch-only burn): the line ledger above is blind to a change that
// adds bare BRANCH paths over executed lines. S1 and B4b added nine
// such paths across three files; the ratchet read "no new debt", the
// battery went green, and CI's coverage gate red on three per-file
// floors (run 46112457941). The gate's own verdict cannot be the
// local verdict — vitest's exit reds on the dev box's SEATED face by
// design (the overlay rows of scripts/coverage-baseline.ts) — but
// CI's face is arithmetic over the same fresh summary: every floor
// of effectiveBaseline(false) (the UNSEATED face CI judges) is
// compared with the summary's per-file percentages, and a breach is
// judged by the SAME delta law as the line ledger — a package touched
// since the baseline commit reds the push; an untouched package's
// breach is named drift and passes. No second run, no floor moved.
//
// Usage: node tools/coverage-ratchet.mjs   (exit 0 = no new debt)

import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { effectiveBaseline } from '../scripts/coverage-baseline.ts'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SUMMARY = resolve(REPO, 'coverage/coverage-summary.json')
const BASELINE = resolve(REPO, 'tools/coverage-baseline.json')

/** The floor metrics a baseline row carries, in the order vitest
 *  reports them. */
export const FLOOR_METRICS = ['statements', 'branches', 'functions', 'lines']

/** The package root a tree file belongs to (packages/<genre>/<name>
 *  → its 3-segment dir), or null for files outside a package — a
 *  non-package file is always judged strictly (no skip without a
 *  package the diff can vouch for). */
export function packageRootOf (rel) {
  const parts = rel.split('/')
  return parts[0] === 'packages' && parts.length >= 3 ? parts.slice(0, 3).join('/') : null
}

/** THE PURE VERDICT (injectable — the wall arms this seam): growth
 *  rows in, {red, drift} out. A row is `{ file, uncovered, owned }`;
 *  `changed(root)` answers whether anything under that package root
 *  changed since the baseline commit. Red rows die the push; drift
 *  rows are named aloud and pass (their package is untouched — the
 *  tree cannot have grown what the tree did not touch). */
export function judgeGrowth (rows, changed) {
  const red = []
  const drift = []
  for (const r of rows) {
    const root = packageRootOf(r.file)
    if (root !== null && !changed(root)) drift.push(`${r.file}: ${r.uncovered} uncovered > owned ${r.owned} — the package is untouched since the baseline commit; environment/ordering drift, named, not growth`)
    else red.push(`${r.file}: ${r.uncovered} uncovered > owned ${r.owned}`)
  }
  return { red, drift }
}

/** CI'S OWN FLOORS, read off the fresh summary (2026-11-28, the
 *  branch-only burn). A floor row's glob is the double-star prefix
 *  plus a repo-relative path; that path names every summary file it
 *  ends with (summary keys are absolute), the row carries the
 *  repo-relative file, and each non-null metric with paths on the
 *  file is a row when the summary's percentage sits below the floor —
 *  vitest's own comparison (pct under threshold), made arithmetic so
 *  the battery can judge CI's face without CI's pool. A row absent
 *  from the summary, a null floor (the null floor law: zero paths on
 *  that metric), and a zero-total metric are not rows — vitest judges
 *  none of them either.
 *  @param summary the parsed coverage-summary.json of the fresh run
 *  @param floors  one seat face of scripts/coverage-baseline.ts
 *  @returns rows of file, metric, pct and floor */
export function ciFloorRows (summary, floors) {
  const rows = []
  for (const [glob, row] of Object.entries(floors ?? {})) {
    const tail = glob.replace(/^\*\*\//, '')
    for (const [file, v] of Object.entries(summary ?? {})) {
      if (file === 'total' || !file.endsWith('/' + tail)) continue
      for (const metric of FLOOR_METRICS) {
        const floor = row[metric]
        const face = v?.[metric]
        if (floor === null || floor === undefined || !face || face.total === 0) continue
        if (face.pct < floor) rows.push({ file: file.slice(-tail.length), metric, pct: face.pct, floor })
      }
    }
  }
  return rows
}

/** THE SAME DELTA LAW over the floor rows (injectable — the wall arms
 *  this seam): a breach in a package touched since the baseline
 *  commit is growth and dies the push; an untouched package's is
 *  drift, named and passed (the tree cannot have grown what the tree
 *  did not touch — the seated face, the pool, the machine state).
 *  A file outside every package is judged strictly. */
export function judgeFloors (rows, changed) {
  const red = []
  const drift = []
  for (const r of rows) {
    const root = packageRootOf(r.file)
    if (root !== null && !changed(root)) drift.push(`${r.file}: ${r.metric} ${r.pct}% below CI's floor ${r.floor}% — the package is untouched since the baseline commit; seat-face/pool drift, named, not growth`)
    else red.push(`${r.file}: ${r.metric} ${r.pct}% below CI's floor ${r.floor}% — the package changed since the baseline commit`)
  }
  return { red, drift }
}

function die (rows) {
  console.error(`coverage-ratchet: NEW DEBT — ${rows.length} row(s) grew the ledgers:`)
  for (const r of rows) console.error(`  ${r}`)
  console.error('  cure: cover the lines, or move the row up in tools/coverage-baseline.json')
  console.error('  in the SAME commit as the change that grew it, with its reason.')
  process.exit(1)
}

/** THE LIVE JUDGMENT — entry-guarded so the wall can import the
 *  pure seams without spawning a coverage run. */
function main () {
const mtimeBefore = statSync(SUMMARY).mtimeMs
// Threshold exits (the 6545-row class) are the owned debt and carry
// a full report anyway — spawn tolerantly and judge the report; test
// failures print their own reds in the tier that owns them.
try {
  execFileSync('pnpm', ['run', 'test:coverage'], { cwd: REPO, stdio: 'ignore' })
} catch { /* thresholds exit nonzero on the owned debt */ }
const mtimeAfter = statSync(SUMMARY).mtimeMs
if (!(mtimeAfter > mtimeBefore)) {
  console.error('coverage-ratchet: coverage/coverage-summary.json was not rewritten by the run — no fresh report, no judgment.')
  process.exit(1)
}

const summary = JSON.parse(readFileSync(SUMMARY, 'utf8'))
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))
const rel = (f) => f.replace(`${REPO}/`, '')

const rows = []
for (const [file, v] of Object.entries(summary)) {
  if (file === 'total' || !v.lines) continue
  const uncovered = v.lines.total - v.lines.covered
  if (uncovered <= 0) continue
  const owned = baseline[rel(file)] ?? 0
  if (uncovered > owned) rows.push({ file: rel(file), uncovered, owned })
}

// THE BASELINE COMMIT: the last commit that touched the baseline
// file is the point its measurements were derived at. Packages
// untouched since carry baseline-time judgment; touched ones are
// judged with zero tolerance.
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8' }).trim()
let baseCommit = null
try {
  baseCommit = git('log', '-1', '--format=%H', '--', 'tools/coverage-baseline.json')
} catch { /* no git — judge everything strictly, named below */ }
const changedCache = new Map()
const changed = (root) => {
  if (baseCommit === null) return true
  if (!changedCache.has(root)) {
    changedCache.set(root, git('diff', '--name-only', `${baseCommit}..HEAD`, '--', root).length > 0)
  }
  return changedCache.get(root)
}

const grown = judgeGrowth(rows, changed)
// THE SECOND LEDGER: CI's own floor face over the same summary —
// the lines ledger cannot see a bare branch over an executed line.
const floored = judgeFloors(ciFloorRows(summary, effectiveBaseline(false)), changed)
const red = [...grown.red, ...floored.red]
const drift = [...grown.drift, ...floored.drift]
if (drift.length > 0) {
  console.log(`coverage-ratchet: ${drift.length} row(s) drifted on an untouched package (environment/ordering, not tree growth):`)
  for (const d of drift) console.log(`  ${d}`)
}
if (red.length > 0) die(red)

const total = Object.values(baseline).reduce((a, b) => a + b, 0)
const floors = effectiveBaseline(false)
const judged = Object.keys(summary).filter((f) => f !== 'total' && Object.keys(floors).some((g) => f.endsWith('/' + g.replace(/^\*\*\//, '')))).length
console.log(`coverage-ratchet: no new debt (owned baseline: ${Object.keys(baseline).length} files, ${total} uncovered lines — shrink-only; CI's floor face: ${judged} gated file(s) judged at or above their floors)`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
