/**
 * THE BENCH-BATCH OWNERSHIP WALL (vocab audit 2026-11-01 W4 —
 * the add_stages seam) — the `add_stages` bench door has a named
 * owner (a tool verb or a documented GUI-only wire client); a seat
 * with no caller is retired.
 *
 * THE SEAM: the seat answers `add_stages` (estate.ts router +
 * bench.addStages) and the batch door is exercised by the bench
 * batch-add spec — but NO tool verb presses it (grep
 * benchVerb(.*add_stages over the tool plane: only the singular
 * add_stage). The batch door's one wire-direct owner is the GUI
 * restore path (cards-resource.ts restoreRunToBench →
 * bench/add-stages: the N-stage restore lands as ONE write). The
 * attribution lives on the BenchVerb doc in estate.ts.
 *
 * Arm 1 — GRAMMAR AGREEMENT: the router regex arms, the BenchVerb
 *   union members, and both seat dispatches (router switch +
 *   benchVerb switch) name the same verb set — a door the grammar
 *   admits but no seat answers (or vice versa) reds.
 * Arm 2 — THE SEAT EXISTS: addStagesBench lives in the drafts
 *   bench seat (the door's mechanics).
 * Arm 3 — THE CALLER SET IS NON-EMPTY: tool-verb presses
 *   (benchVerb('add_stages') literals in the tool plane) plus
 *   wire-direct presses (bench/add-stages in NON-TEST web sources)
 *   — empty reds, naming the orphan. Tonight the set is the GUI
 *   restore alone (tool presses: zero by law, wire presses: the
 *   restore path).
 * Arm 4 — THE ATTRIBUTION DOC NAMES THE OWNER: the BenchVerb doc
 *   pins the GUI restore as the wire-direct owner — a caller set
 *   that moved without updating the doc reds here.
 *
 * Depth: the real router text, the real union, the real call
 * sites, never a hand list.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '../../../..')
const ESTATE = readFileSync(join(ROOT, 'packages/harness/melite-tools/src/estate.ts'), 'utf8')
const BENCH = readFileSync(join(ROOT, 'packages/estate/drafts/src/bench.ts'), 'utf8')

function walkTs(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'lib' || e.name === 'dist') continue
    const full = join(dir, e.name)
    if (e.isDirectory()) { walkTs(full, out); continue }
    if (/\.(ts|tsx)$/.test(e.name)) out.push(full)
  }
  return out
}

const isTestFile = (f: string): boolean =>
  f.endsWith('.spec.ts') || f.endsWith('.spec.tsx') || f.includes('/tests/') || f.includes('/test/') || f.includes('/e2e/')

describe('THE BENCH-BATCH OWNERSHIP (add_stages has a named owner or is retired)', () => {
  it('arm 1 — the router, the union, and both dispatches name the same verbs', () => {
    const router = /\/\(\s*patch\|([^)]+)\)\$/.exec(ESTATE)
    expect(router, 'the bench router regex must parse').not.toBeNull()
    const routerVerbs = ['patch', ...router![1]!.split('|').map((s) => s.trim())].sort()
    const union = /export type BenchVerb = ((?:'[^']+'(?: \| )?)+)/.exec(ESTATE)
    expect(union, 'the BenchVerb union must parse').not.toBeNull()
    const unionVerbs = [...union![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!).sort()
    expect(routerVerbs, 'router arms vs BenchVerb union').toEqual(unionVerbs)
    for (const v of unionVerbs) {
      expect(ESTATE.includes(`case '${v}'`), `the router/benchVerb dispatch must answer '${v}'`).toBe(true)
    }
    expect(unionVerbs.includes('add_stages'), 'add_stages rides the grammar').toBe(true)
  })

  it('arm 2 — the batch seat exists (addStagesBench in the drafts bench seat)', () => {
    expect(BENCH.includes('export async function addStagesBench'), 'the batch seat must exist').toBe(true)
  })

  it('arm 3 — the caller set is non-empty (a seat with no caller is retired)', () => {
    // tool-verb presses: benchVerb('add_stages', …) literals in the tool plane —
    // CODE only (the BenchVerb ownership doc names the spelling in
    // prose; prose is not a press — same comment-line filter as below)
    const toolFiles = walkTs(join(ROOT, 'packages/harness/melite-tools/src'))
    const toolPresses: string[] = []
    const codeOf = (text: string): string => text.split('\n').filter((l) => {
      const t = l.trim()
      return t !== '' && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    }).join('\n')
    for (const f of toolFiles) {
      const text = readFileSync(f, 'utf8')
      if (/benchVerb\([^)]*['"]add_stages['"]/.test(codeOf(text))) toolPresses.push(f.slice(ROOT.length + 1))
    }
    // wire-direct presses: bench/add-stages in NON-TEST web sources —
    // CODE presses only (a comment mentioning the door is not
    // ownership; comment lines are dropped before the match, so a
    // silenced caller reds even while its archaeology survives)
    const wirePresses: string[] = []
    for (const f of walkTs(join(ROOT, 'packages/web'))) {
      if (isTestFile(f)) continue
      const code = codeOf(readFileSync(f, 'utf8'))
      if (code.includes('bench/add-stages') || code.includes("bench['add-stages']")) {
        wirePresses.push(f.slice(ROOT.length + 1))
      }
    }
    const callers = [...toolPresses, ...wirePresses].sort()
    expect(callers.length, 'add_stages has NO caller — the seat is orphaned and must be retired (or the census is blind)').toBeGreaterThan(0)
    // tonight the GUI restore owns the door alone — the law, not a freeze:
    // a tool verb may press it one day, but the restore must not silently stop
    expect(
      wirePresses.some((f) => f.endsWith('cards-resource.ts')),
      'the GUI restore (cards-resource.ts restoreRunToBench) must press bench/add-stages — the documented wire-direct owner went silent: ' + JSON.stringify(callers),
    ).toBe(true)
  })

  it('arm 4 — the BenchVerb doc pins the GUI restore as the wire-direct owner', () => {
    expect(ESTATE.includes('restoreRunToBench'), 'the BenchVerb ownership doc must name the restore owner').toBe(true)
    expect(ESTATE.includes('cards-resource.ts'), 'the BenchVerb ownership doc must name the owner file').toBe(true)
  })
})
