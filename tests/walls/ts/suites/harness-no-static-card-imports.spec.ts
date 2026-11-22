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
    // node_modules is never source — and a symlinked one (the studio
    // trees' @melite aliases) may dangle; descending would throw and
    // the surrounding catch would skip the WHOLE CARD (the h3 depth
    // bug, found mid-conversion 2026-11-16: video/h3-timeline
    // silently escaped both arms for a stale catalog link)
    if (entry === 'node_modules') continue
    const full = join(dir, entry)
    let isDir: boolean
    try {
      isDir = statSync(full).isDirectory()
    } catch {
      // a broken symlink is an entry, not a verdict: skip the link,
      // never the card (DEPTH: one dead link must not disarm a census)
      continue
    }
    if (isDir) out.push(...walk(full))
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

/** THE CARD PLANE ARM (2026-11-16, image-gen L3 exemplar — "The
 *  Card can exist without a Family"): model families are plugins to
 *  the cards that board them. A static family import in a card's
 *  src dies at module scope when the family package is pruned —
 *  the whole card disappears with it (the L3 violation the
 *  optional-lane-law family arm proves dead). Cards reference
 *  families ONLY through guarded dynamic seats (image-gen
 *  src/family-seats.ts is the pattern).
 *
 *  THE NAMED DEBT: the lazy surgery landed estate-wide (the L3 wave
 *  `eda297f44`, then the h3 studio tree's contract imports moved home
 *  to @melite/contracts 2026-11-22 — the ledger's last row left).
 *  The ledger below is empty by design: a cured card MUST leave it
 *  (a stale row reds this wall), and a violation outside the ledger
 *  reds immediately — the debt cannot rot, and it cannot return. */
const GENRES = ['3d', 'audio', 'image', 'motion', 'video'] as const
const FAMILY_SCOPE = /^@melite\/models-/
const L3_DEBT_CARDS = [
  // video/h3-timeline LEFT THE LEDGER 2026-11-22: the studio tree's
  // contract imports (ui/studio — timelineContract + filmMix) were
  // pure contract utilities seated in the family package; they moved
  // home to @melite/contracts (timelineContract + filmMix subpaths,
  // the family package re-exports them for its own compose plane),
  // so the card holds ZERO static family imports. The empty ledger
  // is the honest end state: arm (2) below demands every dropped row
  // leave, and arm (1) keeps the estate at zero violations.
] as const

test('the card plane holds zero static family imports (every card seated; the L3 ledger is empty)', () => {
  const byCard = new Map<string, string[]>()
  for (const genre of GENRES) {
    const genreDir = join(import.meta.dirname, '..', '..', '..', '..', 'packages', genre)
    let cards: string[]
    try {
      cards = readdirSync(genreDir)
    } catch {
      continue
    }
    for (const card of cards) {
      const src = join(genreDir, card, 'src')
      let files: string[]
      try {
        files = walk(src)
      } catch {
        continue
      }
      for (const file of files) {
        for (const hit of staticPluginImports(file)) {
          if (FAMILY_SCOPE.test((hit.match(/['"](@melite\/[^'"]+)['"]/) ?? [])[1] ?? '')) {
            const key = `${genre}/${card}`
            byCard.set(key, [...(byCard.get(key) ?? []), hit])
          }
        }
      }
    }
  }
  // (1) zero violations OUTSIDE the named debt
  const outside = [...byCard.keys()].filter((c) => !(L3_DEBT_CARDS as readonly string[]).includes(c))
  expect(outside, 'a static family import outside the L3 debt ledger kills the card when the family package is pruned — cure it the family-seats.ts way').toEqual([])
  // (2) every debt row is still LIVE debt (a cured card must leave the ledger)
  const stale = (L3_DEBT_CARDS as readonly string[]).filter((c) => !byCard.has(c))
  expect(stale, 'these cards hold no static family imports anymore — drop them from the L3 debt ledger (plugin-family-isolation)').toEqual([])
})
