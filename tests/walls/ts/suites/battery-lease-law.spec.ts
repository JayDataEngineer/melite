import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  TIER_INPUTS, carryDecision, expandGlobs, globMatch, hashTree, loadLeases, rmTree, tierGlobs,
} from '../../../../tools/battery-leases.mjs'

/**
 * THE TIER-LEASE LAW (operator order 2026-11-17: "FIX THE PIPELINE
 * NOW"). The battery's tiers carry prior greens when the inputs they
 * judge are unchanged. A lease that carries a tier whose inputs
 * CHANGED is a silent gate bypass — the exact class the operator
 * burned on. This wall owns both directions plus the disjointness
 * that makes the carry sound: the three expensive tiers judge
 * disjoint spec trees, so a cure in one plane must never ride (or
 * needlessly re-fire) another's green.
 */
describe('battery-leases: hash sensitivity — the carry key must move with the judged surface', () => {
  function fabricate(): string {
    const root = mkdtempSync(join(tmpdir(), 'battery-lease-'))
    mkdirSync(join(root, 'tests/e2e'), { recursive: true })
    mkdirSync(join(root, 'packages/web/melite-card-view/e2e'), { recursive: true })
    writeFileSync(join(root, 'tests/e2e/row.spec.ts'), 'row one\n')
    writeFileSync(join(root, 'packages/web/melite-card-view/e2e/leaf.spec.ts'), 'leaf one\n')
    writeFileSync(join(root, 'unjudged.txt'), 'not in any glob\n')
    return root
  }
  const E2E = ['tests/e2e/**']

  it('a judged file edit moves the hash', () => {
    const root = fabricate()
    try {
      const before = hashTree(root, E2E)
      writeFileSync(join(root, 'tests/e2e/row.spec.ts'), 'row one EDITED\n')
      expect(hashTree(root, E2E)).not.toBe(before)
    } finally { rmTree(root) }
  })

  it('a judged file rename moves the hash (the file set is keyed, not just contents)', () => {
    const root = fabricate()
    try {
      const before = hashTree(root, E2E)
      writeFileSync(join(root, 'tests/e2e/renamed.spec.ts'), 'row one\n')
      writeFileSync(join(root, 'tests/e2e/row.spec.ts'), '')
      expect(hashTree(root, E2E)).not.toBe(before)
    } finally { rmTree(root) }
  })

  it('an unjudged file change does NOT move the hash (the carry is sound: unrelated edits fire nothing)', () => {
    const root = fabricate()
    try {
      const before = hashTree(root, E2E)
      writeFileSync(join(root, 'unjudged.txt'), 'changed but nobody judges it\n')
      writeFileSync(join(root, 'packages/web/melite-card-view/e2e/leaf.spec.ts'), 'leaf one EDITED\n')
      expect(hashTree(root, E2E)).toBe(before)
    } finally { rmTree(root) }
  })
})

describe('battery-leases: the carry/fire decision table — only a green lease on the SAME hash carries', () => {
  it('green lease + same hash → carry', () => {
    expect(carryDecision({ status: 'green', hash: 'abc' }, 'abc')).toBe('carry')
  })
  it('green lease + different hash → fire (the burn class: inputs outgrew the green)', () => {
    expect(carryDecision({ status: 'green', hash: 'abc' }, 'def')).toBe('fire')
  })
  it('red lease → fire even on the same hash (a flake may never ride its own stale green)', () => {
    expect(carryDecision({ status: 'red', hash: 'abc' }, 'abc')).toBe('fire')
  })
  it('missing or malformed lease → fire (the store is a cache, never a source of truth)', () => {
    expect(carryDecision(null, 'abc')).toBe('fire')
    expect(carryDecision(undefined, 'abc')).toBe('fire')
    expect(carryDecision('green' as unknown as null, 'abc')).toBe('fire')
    expect(carryDecision({ hash: 'abc' }, 'abc')).toBe('fire')
  })
})

describe('battery-leases: the store fails open — corrupt JSON fires every tier', () => {
  it('loadLeases on garbage answers {}', () => {
    const p = join(tmpdir(), `battery-lease-corrupt-${Date.now()}.json`)
    writeFileSync(p, '{not json')
    try {
      expect(loadLeases(p)).toEqual({})
    } finally { rmTree(p) }
  })
})

describe('battery-leases: the tier table — conservative inputs, self-keyed, disjoint spec trees', () => {
  it('every declared tier has a non-empty input set', () => {
    for (const [id, globs] of Object.entries(TIER_INPUTS)) {
      expect(globs.length, `tier ${id} judges nothing — a leased tier with no inputs would carry forever`).toBeGreaterThan(0)
    }
  })

  it('the self-input law: the battery scripts + the lockfile key EVERY tier (a battery rework invalidates every lease)', () => {
    const SELF = ['tools/hook-full-battery.mjs', 'tools/battery-leases.mjs', 'pnpm-lock.yaml']
    for (const id of Object.keys(TIER_INPUTS)) {
      for (const s of SELF) {
        expect(tierGlobs(id), `tier ${id} must self-key ${s}`).toContain(s)
      }
    }
  })

  it('THE DISJOINTNESS (the 24h burn class): the e2e tier judges no browser spec and the browser tier judges no e2e row — a cure in one plane never rides the other green', () => {
    const e2eFiles = expandGlobs(process.cwd(), tierGlobs('e2e'))
    const browserFiles = expandGlobs(process.cwd(), tierGlobs('browser'))
    expect(e2eFiles.some((f) => f.startsWith('packages/web/melite-card-view/e2e/')),
      'the e2e tier hashes browser specs — a browser cure would re-fire the GPU tier').toBe(false)
    expect(browserFiles.some((f) => f.startsWith('tests/e2e/')),
      'the browser tier hashes GPU rows — a GPU cure would re-fire the browser tier').toBe(false)
  })

  it('the big tiers hash real trees on this repo (a glob that matches nothing hashes nothing — that carries forever)', () => {
    for (const id of ['tsc', 'walls', 'e2e', 'browser', 'coverage', 'knip']) {
      const files = expandGlobs(process.cwd(), tierGlobs(id))
      expect(files.length, `tier ${id} matched zero files — its glob table drifted from the tree`).toBeGreaterThan(10)
    }
  })
})

describe('battery-leases: globMatch — `**` spans directories, `*` stays in one segment', () => {
  it('matches nested trees and single segments exactly', () => {
    expect(globMatch('tests/e2e/**', 'tests/e2e/deep/nested/row.ts')).toBe(true)
    expect(globMatch('packages/**/package.json', 'packages/web/a/package.json')).toBe(true)
    expect(globMatch('packages/**/package.json', 'packages/a/package.json')).toBe(true)
    expect(globMatch('vitest*.ts', 'vitest.e2e.config.ts')).toBe(true)
    expect(globMatch('*.py', 'a/b.py')).toBe(false)
    expect(globMatch('tests/e2e/**', 'tests/walls/x.ts')).toBe(false)
  })
})
