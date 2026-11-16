/**
 * HARNESS NO STATIC CARD IMPORTS (2026-11-16 — the plugin law, S4
 * cure, core-without-card audit: "The Core can exist without a
 * Card"). The operator's law: cards and model families are
 * PLUGINS — the harness plane (every @melite package under
 * packages/harness) must load when any card or family package is
 * absent. A STATIC import of a card/family package in the harness
 * plane kills the module graph the moment the plugin is missing:
 * the run door died exactly this way (melite-flow.ts statically
 * importing @melite/models-h3 and the h3-timeline card — one
 * pruned package and EVERY base tool is gone).
 *
 * THE LAW: harness src may reference card/family packages ONLY
 * through guarded lazy seats (see melite-tools
 * src/tools/h3-lane-seats.ts) or type-only imports (erased at
 * build). Every static value import, side-effect import, or
 * re-export of an @melite/<genre> card scope (3d, audio, image,
 * motion, video) or the models scope (families) reds this wall.
 *
 * DEPTH: a derived roster, never a hand list — the walk enumerates
 * packages/harness/<pkg>/src itself, so a new harness package joins
 * the census the moment it exists. The built lib/ plane is owned
 * by the freshness build gates (lib regenerates from this src);
 * this wall judges the source of truth.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const HARNESS = join(import.meta.dirname, '..', '..', '..', '..', 'packages', 'harness')
const CARD_SCOPE = /^@melite\/(3d|audio|image|motion|video|models)-/

const walk = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry.endsWith('.ts')) out.push(full)
  }
  return out
}

const staticPluginImports = (file: string): string[] => {
  const lines = readFileSync(file, 'utf8').split('\n')
  const hits: string[] = []
  lines.forEach((line, i) => {
    const text = line.trim()
    // type-only imports are erased at build — no runtime coupling
    if (text.startsWith('import type ') || text.startsWith('export type ')) return
    const m = text.match(/^(?:import|export)\s+(?:type\s+)?[^;]*?(?:from\s*)?['"](@melite\/[^'"]+)['"]/)
    if (m !== null && CARD_SCOPE.test(m[1] ?? '')) hits.push(`${file}:${i + 1}: ${text}`)
  })
  return hits
}

test('the harness plane holds zero static card/family imports', () => {
  const violations: string[] = []
  for (const pkg of readdirSync(HARNESS)) {
    const src = join(HARNESS, pkg, 'src')
    let files: string[]
    try {
      files = walk(src)
    } catch {
      continue
    }
    for (const file of files) violations.push(...staticPluginImports(file))
  }
  expect(violations, 'a static card/family import kills the whole tools plane when the plugin is absent — use a guarded lazy seat (h3-lane-seats.ts is the pattern)').toEqual([])
})
