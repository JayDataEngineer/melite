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
      'snapshots/session/hello/hello.snapshot.ts',
      'snapshots/web/hello/hello.snapshot.ts',
      'tests/harness.ts',
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
})
