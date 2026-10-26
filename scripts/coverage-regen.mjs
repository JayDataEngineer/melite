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
//   2. FLOORS — each number floor is the K=1 MARGIN MINT over the
//      input faces: 100 · max(0, covered − 1) / total, MIN'd across
//      faces (flake item 6, seated 2026-10-26 — a floor pinned AT
//      the measured face is a zero-headroom landmine: losing ONE
//      covered path reds with no signal separating regression from
//      jitter). Raises ride the ratchet (floors only move up);
//      DROPS are capped at the old value per metric and every
//      dropping row is EMITTED for the ratchet spec's argued
//      tables — a drop without an entry still fails the spec's
//      monotonicity arm.
//   3. VACUOUS METRICS (flake item 5, seated 2026-10-26) — a metric
//      whose json row carries total 0 is judged pct 100 by istanbul
//      VACUOUSLY; its floor mints null (the honest zero-paths
//      spelling), and a null floor whose metric later carries paths
//      REFUSES the regen naming glob:metric. A whole-file vacuous
//      row mints null×4.
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

const ROW_RE = /^(\s*'\*\*\/[^']+': \{ statements: )([\d.]+|null)(, branches: )([\d.]+|null)(, functions: )([\d.]+|null)(, lines: )([\d.]+|null)( \},?[^\n]*)$/mg
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
    // PER-METRIC COUNTS (flake items 5+6, seated 2026-10-26): a
    // metric with total 0 on its file is VACUOUS (istanbul judges
    // pct 100) — its floor mints null, never a number; number
    // floors mint with the K=1 covered-path margin.
    row._counts = {}
    for (const k of METRICS) row._counts[k] = { covered: data[k].covered, total: data[k].total }
    face.set(file, row)
  }
  return face
}

/** The K=1 margin mint (flake item 6): 100 · max(0, covered − 1) /
 *  total, MIN over the faces that carry paths on this metric. A
 *  floor pinned at the measured face is a zero-headroom landmine —
 *  losing ONE covered path reds with no signal separating
 *  regression from jitter; the margin makes the loss of one path
 *  the floor's own green face.
 *  @param {Array<Record<string, number>>} rowsWithPaths
 *  @param {string} k
 *  @returns {number} */
function marginFloor(rowsWithPaths, k) {
  let min = null
  for (const row of rowsWithPaths) {
    const c = row._counts[k]
    const pct = c.total === 0 ? 100 : (100 * Math.max(0, c.covered - 1)) / c.total
    min = min === null ? pct : Math.min(min, pct)
  }
  return Math.round(min * 100) / 100
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
/** @type {Array<{glob: string, floor: Record<string, number|null>, min: Record<string, number>|null, vacuous: boolean, withPaths: Array<Record<string, number>>}>} */
const computed = []
for (const m of rows) {
  const glob = m[0].match(/'(\*\*\/[^']+)'/)[1]
  const floor = { statements: m[2] === 'null' ? null : Number(m[2]), branches: m[4] === 'null' ? null : Number(m[4]), functions: m[6] === 'null' ? null : Number(m[6]), lines: m[8] === 'null' ? null : Number(m[8]) }
  // every baseline row must match exactly one file per face (glob suffix)
  const suffix = glob.slice(3)
  let min = null
  let vacuous = false
  let matched = false
  /** the faces that carry paths on this file — the margin mint's
   *  inputs (vacuous faces have no counts to mint from). */
  const withPaths = []
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
    withPaths.push(row)
    // NULL FLOORS never fail (a zero-path metric has no threshold to
    // breach); number floors fail as before.
    const fails = METRICS.filter((k) => floor[k] !== null && row[k] < floor[k]).map((k) => glob + ':' + k)
    for (const f of fails) failSets.get(summaryPaths[i]).add(f)
    if (min === null) min = { statements: row.statements, branches: row.branches, functions: row.functions, lines: row.lines }
    else for (const k of METRICS) min[k] = Math.min(min[k], row[k])
  }
  if (!matched) {
    console.error('coverage-regen: baseline glob "' + glob + '" matches no summary file — the include set moved; refusing')
    process.exit(1)
  }
  // THE STALE-NULL REFUSAL (flake item 5's gate law): a null floor
  // spells "zero paths" — a metric that now carries paths in ANY
  // face is no longer vacuous, and its null is a lie that excludes
  // the metric from every threshold. Refuse, naming glob:metric.
  if (withPaths.length > 0) {
    const stale = METRICS.filter((k) => floor[k] === null && withPaths.some((row) => row._counts[k].total > 0))
    if (stale.length > 0) {
      console.error('coverage-regen: STALE NULL FLOOR — ' + glob + ' carries paths on ' + stale.join('/') + ' (null spells zero paths; re-seat the row at a number)')
      process.exit(1)
    }
  }
  computed.push({ glob, floor, min, vacuous, withPaths })
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

// EMIT: rewrite row floors — null for zero-path metrics (the honest
// vacuous spelling), the K=1 margin for number metrics — and collect
// the drop table (drops are capped at nothing here; the ratchet
// spec's entries own the capping review).
const drops = []
const out = baseline.replace(ROW_RE, (_whole, pre, st, m1, br, m2, fn, m3, ln, post) => {
  const glob = (_whole.match(/'(\*\*\/[^']+)'/) ?? [])[1]
  const c = computed.find((x) => x.glob === glob)
  if (c === undefined) return _whole
  if (c.min === null) {
    // WHOLE-FILE VACUITY (law 3, upgraded by item 5): the file
    // carries zero paths in every face — the honest row is null×4,
    // never a preserved numeric lie.
    return pre + 'null' + m1 + 'null' + m2 + 'null' + m3 + 'null' + post
  }
  const was = { statements: st === 'null' ? null : Number(st), branches: br === 'null' ? null : Number(br), functions: fn === 'null' ? null : Number(fn), lines: ln === 'null' ? null : Number(ln) }
  const now = {}
  for (const k of METRICS) {
    now[k] = c.withPaths.length > 0 && c.withPaths.some((row) => row._counts[k].total > 0)
      ? marginFloor(c.withPaths, k)
      : null
  }
  const dropped = METRICS.filter((k) => now[k] !== null && was[k] !== null && now[k] < was[k])
  if (dropped.length > 0) drops.push({ glob, was, now })
  const spell = (v) => (v === null ? 'null' : String(v))
  return pre + spell(now.statements) + m1 + spell(now.branches) + m2 + spell(now.functions) + m3 + spell(now.lines) + post
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
