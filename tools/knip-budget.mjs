#!/usr/bin/env node
// knip-budget.mjs — the A1 ratchet (re-audit 2026-10-16b). knip's
// default is exit-nonzero-on-any-issue, which this tree cannot meet
// yet (the measured backlog predates the gate). The budget pins
// today's measured counts; the gate fires only when a category
// GROWS. Shrinking a budget is a one-number edit made in the same
// commit that landed the cure — the numbers only ratchet down.
//
// Exit 0 = at or under budget. Exit 1 = a category grew (or knip
// produced no parsable report — a broken gate fails closed).
import { spawnSync } from 'node:child_process'

const BUDGET = {
  // measured 2026-10-17, post-A2 (unlisted was 122 at the audit)
  files: 71,
  dependencies: 60,
  devDependencies: 49,
  unlisted: 51,
  unresolved: 0,
  exports: 136,
  types: 82,
  // enumMembers / duplicates: "duplicates" excluded in knip.json
}

// knip exits nonzero whenever findings exist — that is its report
// mode, not a crash. Accept any exit except a spawn-level error;
// fail closed only on unparsable output.
const res = spawnSync(
  process.execPath,
  ['node_modules/knip/dist/cli.js', '--no-progress', '--reporter', 'json'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
)
if (res.error !== undefined) {
  console.error(`knip failed to spawn: ${res.error.message}`)
  process.exit(1)
}
if (res.stderr.trim() !== '') {
  console.error(`knip stderr:\n${res.stderr.trim()}`)
}

let issues
try {
  issues = JSON.parse(res.stdout).issues
  if (!Array.isArray(issues)) throw new Error('issues is not an array')
} catch (err) {
  console.error(`knip report unparsable (exit ${res.status}) — failing closed: ${err.message}`)
  process.exit(1)
}

// reporter shape: one entry per file, each carrying per-category
// arrays of named findings: files:[{name}], exports:[{name}], ...
const counts = {}
for (const entry of issues) {
  for (const type of Object.keys(BUDGET)) {
    const findings = entry[type]
    if (Array.isArray(findings)) counts[type] = (counts[type] ?? 0) + findings.length
  }
}

const grown = []
for (const [type, cap] of Object.entries(BUDGET)) {
  const have = counts[type] ?? 0
  const mark = have > cap ? '✗ GREW' : have < cap ? '↓ under' : '= at'
  console.log(`${mark}  ${type}: ${have}/${cap}`)
  if (have > cap) grown.push(`${type}: ${have} > ${cap}`)
}

if (grown.length > 0) {
  console.error('\nknip budget exceeded — shrink the backlog or move the budget IN THE SAME COMMIT as the cure:')
  for (const g of grown) console.error(`  ${g}`)
  process.exit(1)
}
console.log('\nknip budget: at or under every cap')
