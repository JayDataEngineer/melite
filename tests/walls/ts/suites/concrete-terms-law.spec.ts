import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

// concrete-terms-law — THE BANNED-TOKEN WALL (F4-1, the 2026-11-17
// types/docs/testing audit): the AGENTS MD BASE standards quote the
// 2026-08-26 ban ("Maintained tracked paths and text must not
// contain that token in any case variant" — the ten-letter token
// formed by `prove` followed by `nance`). Melite adopted the standard
// verbatim, so it is Melite law; until this wall no lexical gate
// existed, and the audit counted the token in 283 tracked files
// (~1175 spellings), including LIVE DURABLE-FIELD identifiers
// (bench.ts's row key, web-kit's exported filename) whose rename is
// an operator call (the field rides stored bench rows; a
// compatibility reader is the DSH-prescribed shape once it lands).
//
// THE INVARIANT: the token count over tracked text can only FALL.
// The seeded ceiling is the audit-day census; every removal steps the
// ceiling down in the same change (a conscious edit, never silent),
// and any new spelling — prose, identifier, filename, test fixture —
// reds with the holder named. Stored durable fields stay inside the
// ceiling until the operator rules their rename (the owed debt row
// lives in dev_docs/CONTRACTS.md §4); the exclusion set mirrors DSH's
// gate: vendored sources, frozen archives, and the ignored trees
// never carry the count.
const ROOT = resolve(import.meta.dirname, '..', '..', '..', '..')
const TOKEN = /prove(?:d|n)?nance/gi
const CEILING = 1175

/** Tracked files the gate sweeps (derived — never a hand list). */
function trackedFiles(): string[] {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  return out
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f !== '' && !f.startsWith('references/') && !f.startsWith('vendor/') && !f.startsWith('data/'))
}

/** The token census over one file's bytes (0 for non-files/binary). */
function countIn(file: string): number {
  try {
    return (readFileSync(join(ROOT, file), 'utf8').match(TOKEN) ?? []).length
  } catch {
    return 0
  }
}

describe('THE CONCRETE-TERMS WALL — the banned origin-label token (F4-1)', () => {
  it('the tracked-text token census sits at or below its adjudicated ceiling (fall-only)', () => {
    let total = 0
    const holders: Array<[string, number]> = []
    for (const file of trackedFiles()) {
      const n = countIn(file)
      if (n > 0) {
        total += n
        holders.push([file, n])
      }
    }
    holders.sort((a, b) => b[1] - a[1])
    const top = holders.slice(0, 5).map(([f, n]) => `${f}: ${n}`).join(', ')
    expect(
      total,
      `the banned-token census GREW past its ceiling (${total} > ${CEILING}) — name the concept exactly instead (top holders: ${top}); ` +
        'stored durable fields stay inside the ceiling until the operator rules their rename (CONTRACTS.md §4 debt)',
    ).toBeLessThanOrEqual(CEILING)
    expect(holders.length, 'the census still sees its holders (a silently emptied sweep judges nothing)').toBeGreaterThan(0)
  })
})
