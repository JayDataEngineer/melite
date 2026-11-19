/**
 * testing-tiers.spec.ts — repository script spec (DSH tier 1 covers
 * scripts/**.spec.ts): permanent test for the testing-tier contract
 * regression. Every tier the testing policy names must exist with its
 * runner, or the suite silently stops proving what it claims.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()

describe('testing tiers exist (contract regression)', () => {
  it('every vitest tier config exists', () => {
    for (const f of [
      'vitest.config.ts',
      'vitest.e2e.config.ts',
      'vitest.expected.config.ts',
      'vitest.bench.config.ts',
      'vitest.snapshot.config.ts',
      'vitest.web.config.ts',
    ]) {
      assert.ok(existsSync(join(ROOT, f)), `missing tier config ${f}`)
    }
  })

  it('every tier owns at least one driver', () => {
    for (const f of [
      'tests/e2e/estate-smoke.e2e.ts',
      'tests/expected/smoke.expected.e2e.ts',
      'benchmarks/session-open.bench.ts',
      'tests/snapshots/session/hello/hello.snapshot.ts',
      'tests/snapshots/web/hello/hello.snapshot.ts',
      'tests/helpers/harness.ts',
      'tests/helpers/launch.ts',
    ]) {
      assert.ok(existsSync(join(ROOT, f)), `missing tier driver ${f}`)
    }
  })

  it('no spec imports another spec (shared fixtures live in harness.ts)', async () => {
    const { readFileSync, readdirSync } = await import('node:fs')
    const drivers = [
      'tests/e2e/estate-smoke.e2e.ts',
      'tests/expected/smoke.expected.e2e.ts',
    ]
    for (const d of drivers) {
      const text = readFileSync(join(ROOT, d), 'utf8')
      assert.ok(!/from '.*\.e2e\.ts'/.test(text), `${d} must not import another e2e spec`)
    }
    void readdirSync
  })

  it('THE LAYOUT LAW: no root test/ directory, and tests/ root carries ONLY the README (operator 2026-11-19: the test/tests split + "random files fucking loose")', async () => {
    const { execFileSync } = await import('node:child_process')
    // (a) the dual-folder burn: a tracked test/ directory must never
    // return — the split was half-done once and 7 drive scripts
    // survived it
    const dual = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter((f) => f.startsWith('test/'))
    assert.deepStrictEqual(dual, [], `a root test/ directory returned: ${dual.join(', ')} — one folder, tests/, is the law`)
    // (b) the loose-files burn: files directly under tests/ must be
    // the README alone — every test file lives in its tier dir
    // (py/, drives/, e2e/, helpers/, …)
    const loose = execFileSync('git', ['ls-files', 'tests/*'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter((f) => f !== '' && !f.includes('/'))
      .filter((f) => f !== 'tests/README.md')
    assert.deepStrictEqual(loose, [], `loose files at tests/ root: ${loose.join(', ')} — tier dirs only, the README alone at root`)
  })
})
