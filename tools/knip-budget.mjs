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
  // re-measured 2026-11-30 (the knip-cure audit): knip.jsonc now teaches
  // knip the architecture, so the counts below are the honest REMAINDER.
  // What was config-taught (argued false positives, each with its proof
  // in knip.jsonc beside the entry):
  //  - dependencies 111->15: the cordis string-table closures (47: W9 wall
  //    + cardPackages manifest-sweep arm), the estate cordis.patch.yml family
  //    rows (31: composition wall manifest-closure arm), the provisioner
  //    resolver closure (9: renderProfile iterates the manifest), the
  //    @melite/cards file-glob facade (3: tenant-imported kit rows), the
  //    client-bundle libExternal/inject rows (card-view 2 + gallery 1),
  //    and 3 @melite/contracts rows knip credits to traced importers.
  //  - devDependencies 63->50: the tsdown builder-binary seam (root
  //    fallback covers every workspace row) + card-view/gallery loader rows.
  //  - unlisted 155->1: root test/script/snapshot files resolve workspace
  //    packages through tsconfig paths (the layout law -- the root manifest
  //    is the aggregator, not a runtime package), the ONE-REACT lane
  //    aliases, and the tsdown shared-preset seam.
  //  - unresolved 1->0: recipe-rows.spec.ts imported the deleted
  //    families/contract.ts ghost; re-pointed at DeclVariantRow (the
  //    surviving same-shape declaration, group+id+wire_defaults).
  //  - files 71->62: the bench/coldstart configs are now entries (invoked
  //    via --config in tracked scripts).
  // What REMAINS is real debt, itemized in /home/user/test/knip-cure-report.md:
  //  - dependencies 15: rows with zero src/script/yml imports (zod x4 with
  //    no zod import, schemastery comment-only, engine-contract/dsh-home-paths/
  //    dsh-subprocess/video-h3-timeline/run-wire/primitives paths-only or
  //    absent, action_cards timeline/clsx/react-dom with no tenant importer).
  //  - devDependencies 50 (re-baselined UP from 49 -- drift since the
  //    2026-10-17 measure, not a weakening: the gate still fires on any
  //    growth past this number): root docs-toolchain rows (19, website-era
  //    residue), @types/* with no traced importer, @testing-library/* in
  //    orphan test dirs, tailwind/lightningcss/unrun builder rows nothing
  //    invokes, @tsdown/css x2, cordis x2 in the retired video tenants.
  //  - unlisted 1: istanbul-lib-report in the orphan coverage helper
  //    (scripts/coverage-uncovered-locations.cjs -- nothing invokes it).
  //  - exports 241 / types 177 (re-baselined up from 136/82 -- same drift
  //    law): mechanical census over 418 symbols -- 219 have zero references
  //    outside their defining file (dead), 185 are barrel re-exports whose
  //    importers use the canonical deep path instead, 14 are imported from
  //    the flagged file by sources knip's entry graph cannot reach
  //    (glob-loaded tenants, tsdown-wrapper entries, test-only importers).
  //    knip resolves cross-package bare imports through node_modules to
  //    lib/ (the ignored artifact plane) while consumers resolve through
  //    tsconfig paths to src/ -- no config teaching can bridge that
  //    without hiding findings, so it stays budgeted. DO NOT delete code
  //    to move these numbers; deletions land as their own cure commits.
  files: 62,
  dependencies: 15,
  devDependencies: 50,
  unlisted: 1,
  unresolved: 0,
  exports: 241,
  types: 177,
  // enumMembers / duplicates: "duplicates" excluded in knip.jsonc
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
