// bundle-repro walls (§19 — the bundle reproducibility gate): the
// committed lib/ MUST rebuild byte-identical from a pristine HEAD
// worktree (never the live tree — the parallel-session law), modulo
// one trailing newline. The heavy arm is env-gated (BUNDLE_REPRO=1 —
// it shells git + pnpm + tsdown, minutes on a cold store); the pure
// comparison helpers are pinned always (no binaries, no network).
//
// RUN: BUNDLE_REPRO=1 pnpm exec vitest run test/bundle-repro.spec.ts
// (from packages/harness/melite-tools). The gate runs on the estate
// host where the toolchain + module store are hot — never default CI.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RUN = process.env.BUNDLE_REPRO === '1'

/** Byte-identity modulo ONE trailing newline (the gate's tolerance —
 *  editors and POSIX tools disagree on the last byte; tsdown does
 *  not emit it, so anything more is contamination). */
export function sameModuloNewline(a: string, b: string): boolean {
  if (a === b) return true
  const strip = (s: string): string => s.endsWith('\n') ? s.slice(0, -1) : s
  return strip(a) === strip(b)
}

/** Report every file that differs between the committed lib listing
 *  and a fresh build (empty = reproducible). Names the first
 *  differing line per file — the failure tells the operator WHAT
 *  baked in, never just "differs". */
export function bundleDiffReport(committed: Map<string, string>, fresh: Map<string, string>): string[] {
  const problems: string[] = []
  for (const name of [...committed.keys()].sort()) {
    if (!fresh.has(name)) {
      problems.push(name + ': committed but no build emits it (a vestige — delete it or document the hand-place)')
      continue
    }
    const a = committed.get(name)!
    const b = fresh.get(name)!
    if (sameModuloNewline(a, b)) continue
    const al = a.split('\n')
    const bl = b.split('\n')
    let line = 0
    while (line < al.length && line < bl.length && al[line] === bl[line]) line++
    const show = (l: string | undefined): string => l === undefined ? '<eof>' : JSON.stringify(l.slice(0, 120))
    problems.push(name + ': differs at line ' + String(line + 1) + ' (committed ' + show(al[line]) + ' vs fresh ' + show(bl[line]) + ')')
  }
  for (const name of [...fresh.keys()].sort()) {
    if (!committed.has(name)) problems.push(name + ': the build emits it but it is not committed (rebuild lib/ from clean HEAD)')
  }
  return problems
}

describe('bundle-repro comparison (always pinned, no binaries)', () => {
  test('identical texts pass; one trailing newline is tolerated', () => {
    assert.equal(sameModuloNewline('a\nb', 'a\nb'), true)
    assert.equal(sameModuloNewline('a\nb\n', 'a\nb'), true)
    assert.equal(sameModuloNewline('a\nb', 'a\nb\n'), true)
    assert.equal(sameModuloNewline('a\nb', 'a\nc'), false)
    assert.equal(sameModuloNewline('a\nb\n\n', 'a\nb'), false)
  })

  test('the report names the first differing line and both listing skews', () => {
    const committed = new Map([['ok.mjs', 'x\n'], ['stale.mjs', 'old\nline\n'], ['vestige.js', 'hand-placed\n']])
    const fresh = new Map([['ok.mjs', 'x'], ['stale.mjs', 'new\nline\n'], ['uncommitted.mjs', 'fresh\n']])
    const problems = bundleDiffReport(committed, fresh)
    assert.equal(problems.length, 3)
    assert.ok(problems.some((p) => p.startsWith('stale.mjs: differs at line 1')
      && p.includes(JSON.stringify('old')) && p.includes(JSON.stringify('new'))), JSON.stringify(problems))
    assert.ok(problems.some((p) => p.startsWith('vestige.js: committed but no build emits it')), JSON.stringify(problems))
    assert.ok(problems.some((p) => p.startsWith('uncommitted.mjs: the build emits it but it is not committed')), JSON.stringify(problems))
    assert.deepEqual(bundleDiffReport(new Map([['a', 'x']]), new Map([['a', 'x']])), [])
  })
})

describe.skipIf(!RUN)('bundle-repro build (BUNDLE_REPRO=1 — git + pnpm + tsdown)', () => {
  test('lib/ rebuilds byte-identical from pristine HEAD', () => {
    const specDir = dirname(fileURLToPath(import.meta.url))
    const repo = join(specDir, '..', '..', '..', '..')
    const pkg = join('packages', 'harness', 'melite-tools')
    const tmp = mkdtempSync(join(tmpdir(), 'bundle-repro-'))
    const wt = join(tmp, 'wt')
    const outDir = join(tmp, 'repro-lib')
    try {
      execFileSync('git', ['worktree', 'add', '--detach', wt, 'HEAD'], { cwd: repo, timeout: 120_000 })
      // the worktree's own toolchain (never the live tree's): a hot
      // store links in seconds; a cold one pays minutes once
      execFileSync('pnpm', ['install', '--offline', '--ignore-scripts', '--prefer-offline'], { cwd: wt, timeout: 280_000 })
      execFileSync('git', ['checkout', '--', 'pnpm-lock.yaml'], { cwd: wt, timeout: 30_000 })
      execFileSync('node', [join(wt, pkg, 'node_modules', '.bin', 'tsdown'),
        'src/index.ts', 'src/doors.ts', '--format', 'esm', '--dts', '--outDir', outDir],
        { cwd: join(wt, pkg), timeout: 280_000 })
      const readDir = (dir: string): Map<string, string> => new Map(
        readdirSync(dir).map((n) => [n, readFileSync(join(dir, n), 'utf8')]),
      )
      const problems = bundleDiffReport(readDir(join(repo, pkg, 'lib')), readDir(outDir))
      assert.deepEqual(problems, [], 'the committed bundle is not reproducible from HEAD:\n' + problems.join('\n'))
    } finally {
      try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: repo, timeout: 60_000 }) } catch { /* best-effort */ }
      rmSync(tmp, { recursive: true, force: true })
    }
  }, 295_000)
})
