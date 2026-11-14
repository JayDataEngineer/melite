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
// The battery still RUNS the full coverage suite (CI parity — the
// same run, the same report); only the judgment scopes to the delta.
// CI's own red on the standing debt stays the owned roadmap item.
//
// Usage: node tools/coverage-ratchet.mjs   (exit 0 = no new debt)

import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SUMMARY = resolve(REPO, 'coverage/coverage-summary.json')
const BASELINE = resolve(REPO, 'tools/coverage-baseline.json')

function die (rows) {
  console.error(`coverage-ratchet: NEW DEBT — ${rows.length} file(s) grew the owned baseline:`)
  for (const r of rows) console.error(`  ${r}`)
  console.error('  cure: cover the lines, or move the row up in tools/coverage-baseline.json')
  console.error('  in the SAME commit as the change that grew it, with its reason.')
  process.exit(1)
}

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

const grew = []
for (const [file, v] of Object.entries(summary)) {
  if (file === 'total' || !v.lines) continue
  const uncovered = v.lines.total - v.lines.covered
  if (uncovered <= 0) continue
  const owned = baseline[rel(file)] ?? 0
  if (uncovered > owned) {
    grew.push(`${rel(file)}: ${uncovered} uncovered > owned ${owned}`)
  }
}

if (grew.length > 0) die(grew)

const total = Object.values(baseline).reduce((a, b) => a + b, 0)
console.log(`coverage-ratchet: no new debt (owned baseline: ${Object.keys(baseline).length} files, ${total} uncovered lines — shrink-only)`)
