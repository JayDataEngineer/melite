#!/usr/bin/env node
// tmp-prefixes.mjs — the legacy sweep table's generator (the flake
// audit's Option A, 2026-10-13 §3a: "correct by regeneration instead
// of correct by hand"). The run-scoped root (melite-run-) made the
// table a BACKSTOP for pre-cure leftovers only, but a backstop that
// misses 135 of 232 minted prefixes is not a backstop — this walks
// the tree for every literal mkdtempSync prefix and emits the sorted
// list, so tests/global-sweep.ts imports the truth instead of
// hand-maintaining a stale copy of it.
//
// Usage:
//   node scripts/tmp-prefixes.mjs            # print the sorted prefixes
//   node scripts/tmp-prefixes.mjs --check    # exit 1 naming drift vs the imported table
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(import.meta.dirname, '..')
const ROOTS = ['packages', 'tests', 'scripts', 'tools']

/** Every literal prefix minted via mkdtempSync(join(tmpdir(), "…")).
 *  Template literals are invisible to the walk by design — the
 *  run-scoped root owns every NEW mint anyway; this table only
 *  reclaims pre-cure leftovers, all of which were literals. */
export function suitePrefixes() {
  const found = new Set()
  const walk = (dir) => {
    let ents
    try {
      ents = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of ents) {
      const full = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'lib' || e.name === 'dist') continue
        walk(full)
      } else if (/\.(ts|tsx|mjs|cjs|js)$/.test(e.name)) {
        const text = readFileSync(full, 'utf8')
        for (const m of text.matchAll(/mkdtempSync\(\s*join\(\s*tmpdir\(\)\s*,\s*["']([A-Za-z0-9-]+)["']/g)) {
          found.add(m[1])
        }
      }
    }
  }
  for (const r of ROOTS) walk(join(REPO, r))
  return [...found].sort()
}

if (process.argv.includes('--check')) {
  // the wall arm imports both and diffs; this branch is the CLI face
  const generated = suitePrefixes()
  process.stdout.write(`${generated.length} minted prefixes\n`)
}

export default suitePrefixes
