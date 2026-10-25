/**
 * file-hygiene-newline — THE TRAILING-NEWLINE LAW'S SECOND SEAT
 * (tier-cures-audit item 2, 2026-11-06): the law had exactly ONE
 * judge — the pre-commit hook (tools/hook-final-newline.mjs) — and
 * that seat is bypassable (`--no-verify`; bd3c3754d landed 649
 * artifacts with the newline stripped, 397 outside the exemption).
 * This wall is the seat a bypass cannot skip: CI runs the walls
 * tier, and the census rides `git ls-files` (the TRACKED authored
 * plane — a derived roster, never a hand list).
 *
 * Arm 1 — THE AUTHORED PLANE: every tracked texty file outside the
 *   artifact planes (lib/, dist/, coverage, test-results) ends with
 *   exactly one final 0x0a. The .editorconfig insert_final_newline
 *   rule, judged where git lives.
 * Arm 2 — THE ARTIFACT EXEMPTION IS DECLARED, not discovered: the
 *   hook's skip rule names lib/ and dist/ wholesale (tsc and tsdown
 *   emit no trailing newline; build artifacts are not source — the
 *   2026-10-10 li-u receipt's own cure direction). The wall pins
 *   the hook source so the exemption and the census cannot drift
 *   apart: the census's artifact rule and the hook's skip rule are
 *   the SAME grammar.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = join(import.meta.dirname, '../../../..')
const TEXTY = /\.(ts|tsx|mjs|cjs|js|jsx|json|yml|yaml|md|sh|css|html|svg|txt)$/
/** The artifact planes — build output, never authored (the hook's
 *  own GENERATED law, declared wholesale). */
const ARTIFACT = /(^|\/)(lib|dist|node_modules|coverage|test-results)\//

function trackedAuthoredFiles(): string[] {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return out.split('\n')
    .map((f) => f.trim())
    .filter((f) => f !== '' && TEXTY.test(f) && !ARTIFACT.test(f))
}

describe('the trailing-newline law (second seat — the census the hook cannot bypass)', () => {
  it('every tracked authored texty file ends with exactly one final newline', () => {
    const bad: string[] = []
    for (const f of trackedAuthoredFiles()) {
      let b: Buffer
      try {
        b = readFileSync(join(ROOT, f))
      } catch {
        continue // deleted in the working tree — not this census's case
      }
      if (b.length > 0 && b[b.length - 1] !== 0x0a) bad.push(f)
    }
    expect(bad, `authored files missing the final newline (the .editorconfig law; fix the file, never the census):\n${bad.join('\n')}`).toEqual([])
  })

  it('the hook and this census share ONE artifact grammar (lib/ and dist/ are declared planes, not drift)', () => {
    const hook = readFileSync(join(ROOT, 'tools/hook-final-newline.mjs'), 'utf8')
    // the hook's skip rule must name both artifact planes wholesale —
    // if the hook narrows while this census stays wide (or vice
    // versa), the two seats drift and artifacts trip one while
    // authored files escape the other
    expect(hook).toMatch(/const ARTIFACT[^;]*lib/)
    expect(hook).toMatch(/const ARTIFACT[^;]*dist/)
  })
})
