#!/usr/bin/env node
// coverage-regen.mjs — THE BASELINE REGENERATION SEAT (2026-10-23,
// the 135-threshold-error regen). The three prior regenerations
// (2026-10-22 poisoned-era, 2026-11-06 head-reds sweep, 2026-11-07
// full-gate triple) each hand-rolled the same computation over
// scripts/coverage-baseline.ts; this script seats it as mechanism so
// a regen never edits row values by hand again (the baseline header's
// own law: "GENERATED, then reviewed").
//
// THE LAW THIS SEATS (from the precedents, verbatim in spirit):
//   1. STABILITY — the below-floor FAIL-SET must be IDENTICAL across
//      every input summary (the 2026-10-22 law: "runs 3, 4 and 7
//      deliver a STABLE 16-file set"; the 2026-11-06 law: "the
//      identical 79-metric failing set with zero face drift"). A
//      tree whose failures move between runs is not measurable —
//      the script refuses, naming the drift.
//   2. FLOORS — each row's new value is the MIN over the input faces
//      (the 2026-11-07 law: "each raised floor is the MIN of the
//      three runs' faces"). Raises ride the ratchet (floors only
//      move up); DROPS are capped at the old value per metric and
//      every dropping row is EMITTED for the ratchet spec's argued
//      tables — a drop without an entry still fails the spec's
//      monotonicity arm.
//   3. VACUOUS ROWS — a file whose json row carries 0/0 totals is
//      never a fail (istanbul judges pct 100 at total 0); its floor
//      passes through untouched.
//
// Usage:
//   node scripts/coverage-regen.mjs --summaries a.json b.json c.json \
//     [--baseline scripts/coverage-baseline.ts] [--drops out.mjs]
//
// Exit 0 = the fail-set was stable (the baseline text is rewritten in
// place with only row numbers changed; the drop table is written);
// exit 1 = a loud refusal naming the unstable faces.

import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}
const summariesFlag = flag('--summaries')
const baselinePath = flag('--baseline') ?? 'scripts/coverage-baseline.ts'
const dropsPath = flag('--drops')
if (summariesFlag === undefined) {
  console.error('coverage-regen: --summaries <a.json,b.json,...> is required')
  process.exit(2)
}
const summaryPaths = summariesFlag.split(',')
if (summaryPaths.length < 2) {
  console.error('coverage-regen: at least two summary faces are required to judge stability')
  process.exit(2)
}

const ROW_RE = /^(\s*'\*\*\/[^']+': \{ statements: )([\d.]+)(, branches: )([\d.]+)(, functions: )([\d.]+)(, lines: )([\d.]+)( \},?[^\n]*)$/mg
const METRICS = ['statements', 'branches', 'functions', 'lines']

/** @param {string} path
 *  @returns {Map<string, Record<string, number>>} file -> per-metric pct faces */
function faceOf(path) {
  const summary = JSON.parse(readFileSync(path, 'utf8'))
  const face = new Map()
  for (const [file, data] of Object.entries(summary)) {
    if (file === 'total') continue
    const row = { statements: data.statements.pct, branches: data.branches.pct, functions: data.functions.pct, lines: data.lines.pct }
    row._vacuous = data.statements.total === 0 && data.branches.total === 0 && data.functions.total === 0 && data.lines.total === 0
    face.set(file, row)
  }
  return face
}

const faces = summaryPaths.map(faceOf)
const baseline = readFileSync(baselinePath, 'utf8')

// Walk every row, compute the fail-sets per face, then judge stability.
const rows = [...baseline.matchAll(ROW_RE)]
if (rows.length === 0) {
  console.error('coverage-regen: no baseline rows matched — the row shape changed; fix the regex, never the law')
  process.exit(1)
}
const seenGlobs = new Set(rows.map((m) => m[0].match(/'(\*\*\/[^']+)'/)[1]))
if (seenGlobs.size !== rows.length) {
  const dupes = rows.map((m) => m[0].match(/'(\*\*\/[^']+)'/)[1])
    .filter((g, i, all) => all.indexOf(g) !== i)
  console.error('coverage-regen: DUPLICATE baseline rows (a row is judged twice): ' + dupes.join(', '))
  process.exit(1)
}

/** @type {Map<string, Set<string>>} face-name -> fail keys */
const failSets = new Map(faces.map((_, i) => [summaryPaths[i], new Set()]))
/** @type {Array<{glob: string, floor: Record<string, number>, min: Record<string, number>|null, vacuous: boolean}>} */
const computed = []
for (const m of rows) {
  const glob = m[0].match(/'(\*\*\/[^']+)'/)[1]
  const floor = { statements: Number(m[2]), branches: Number(m[4]), functions: Number(m[6]), lines: Number(m[8]) }
  // every baseline row must match exactly one file per face (glob suffix)
  const suffix = glob.slice(3)
  let min = null
  let vacuous = false
  let matched = false
  for (let i = 0; i < faces.length; i++) {
    const hits = [...faces[i].keys()].filter((f) => f.endsWith(suffix))
    if (hits.length === 0) continue
    matched = true
    if (hits.length > 1) {
      console.error('coverage-regen: baseline glob "' + glob + '" matches ' + hits.length + ' files in ' + summaryPaths[i] + ' — ambiguous, refusing')
      process.exit(1)
    }
    const row = faces[i].get(hits[0])
    if (row._vacuous) { vacuous = true; continue }
    const fails = METRICS.filter((k) => row[k] < floor[k]).map((k) => glob + ':' + k)
    for (const f of fails) failSets.get(summaryPaths[i]).add(f)
    if (min === null) min = { statements: row.statements, branches: row.branches, functions: row.functions, lines: row.lines }
    else for (const k of METRICS) min[k] = Math.min(min[k], row[k])
  }
  if (!matched) {
    console.error('coverage-regen: baseline glob "' + glob + '" matches no summary file — the include set moved; refusing')
    process.exit(1)
  }
  computed.push({ glob, floor, min, vacuous })
}

// STABILITY: identical fail-sets across faces (compared by content —
// a Set of Sets would dedupe by reference and never agree).
const serialized = [...failSets.values()].map((set) => [...set].sort().join('\n'))
const stable = failSets.size > 0 && serialized.every((s) => s === serialized[0])
if (!stable) {
  const ref = [...failSets.values()][0]
  for (const [name, set] of failSets) {
    const onlyHere = [...set].filter((k) => !ref.has(k))
    const onlyRef = [...ref].filter((k) => !set.has(k))
    if (onlyHere.length > 0 || onlyRef.length > 0) {
      console.error('coverage-regen: UNSTABLE TREE — ' + name + ' disagrees:')
      for (const k of onlyHere) console.error('  only ' + name + ': ' + k)
      for (const k of onlyRef) console.error('  only other: ' + k)
    }
  }
  console.error('coverage-regen: the fail-set moved between runs — land the tree, then re-measure; floors seat on stability, never on hope')
  process.exit(1)
}
const failCount = [...failSets.values()][0].size
console.error('coverage-regen: fail-set stable across ' + faces.length + ' faces — ' + failCount + ' metric failures')

// EMIT: rewrite row numbers (MIN of faces, raises uncapped, drops
// capped at nothing — the ratchet spec's entries own the capping
// review) and collect the drop table.
const drops = []
const out = baseline.replace(ROW_RE, (_whole, pre, st, m1, br, m2, fn, m3, ln, post) => {
  const glob = (_whole.match(/'(\*\*\/[^']+)'/) ?? [])[1]
  const c = computed.find((x) => x.glob === glob)
  if (c === undefined || c.min === null) return _whole // vacuous or unmatched: pass through
  const was = { statements: Number(st), branches: Number(br), functions: Number(fn), lines: Number(ln) }
  const now = {}
  for (const k of METRICS) now[k] = Math.round(c.min[k] * 100) / 100
  const dropped = METRICS.filter((k) => now[k] < was[k])
  if (dropped.length > 0) drops.push({ glob, was, now })
  return pre + String(now.statements) + m1 + String(now.branches) + m2 + String(now.functions) + m3 + String(now.lines) + post
})
writeFileSync(baselinePath, out)

if (dropsPath !== undefined) {
  const lines = []
  for (const d of drops) {
    lines.push("  '" + d.glob + "': { statements: " + d.was.statements + ", branches: " + d.was.branches + ', functions: ' + d.was.functions + ', lines: ' + d.was.lines + ' }, // -> ' + d.now.statements + '/' + d.now.branches + '/' + d.now.functions + '/' + d.now.lines)
  }
  writeFileSync(dropsPath, '// coverage-regen drop table (' + drops.length + ' rows below their seated floors)\n' + lines.join('\n') + '\n')
}
console.error('coverage-regen: ' + computed.length + ' rows re-seated; ' + drops.length + ' rows DROPPED (argue each in the ratchet spec)' + (dropsPath !== undefined ? '; drop table at ' + dropsPath : ''))

// MISSING ROWS (the ratchet's first arm: every gated file has exactly
// one row). A gated file absent from the table is judged by nothing —
// the regen seats it at its MIN face, inserted in sorted position.
const GATED_RE = /\/packages\/[^/]+\/[^/]+\/src\/.*\.(ts|tsx)$/u
const knownGlobs = new Set(computed.map((c) => c.glob))
let finalText = readFileSync(baselinePath, 'utf8')
const added = []
for (const file of faces[0].keys()) {
  if (!GATED_RE.test(file)) continue
  const glob = '**' + file.slice(file.indexOf('/packages/'))
  if (knownGlobs.has(glob)) continue
  let min = null
  for (const face of faces) {
    const row = face.get(file)
    if (row === undefined || row._vacuous) { min = null; break }
    if (min === null) min = { statements: row.statements, branches: row.branches, functions: row.functions, lines: row.lines }
    else for (const k of METRICS) min[k] = Math.min(min[k], row[k])
  }
  if (min === null) continue // absent or vacuous in any face — not seatable here
  for (const k of METRICS) min[k] = Math.round(min[k] * 100) / 100
  const rowText = "  '" + glob + "': { statements: " + min.statements + ', branches: ' + min.branches + ', functions: ' + min.functions + ', lines: ' + min.lines + ' },'
  const lines = finalText.split('\n')
  let at = lines.length - 1
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^  '\*\*\/([^']+)':/)
    if (m !== null && m[1] > glob.slice(3)) { at = i; break }
  }
  lines.splice(at, 0, rowText)
  finalText = lines.join('\n')
  added.push(glob + ' @ ' + min.statements + '/' + min.branches + '/' + min.functions + '/' + min.lines)
}
if (added.length > 0) {
  writeFileSync(baselinePath, finalText)
  for (const a of added) console.error('coverage-regen: ROW ADDED (was judged by nothing): ' + a)
}
