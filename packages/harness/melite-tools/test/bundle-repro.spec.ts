// bundle-repro walls (§19 — the bundle reproducibility gate): the
// committed lib/ MUST rebuild byte-identical from a pristine HEAD
// worktree (never the live tree — the parallel-session law), modulo
// one trailing newline. The heavy arm is env-gated (BUNDLE_REPRO=1 —
// it shells git + pnpm + the package's own tsc build, minutes on a
// cold store); the pure comparison helpers are pinned always (no
// binaries, no network).
//
// RUN: BUNDLE_REPRO=1 BUNDLE_REPRO_PNPM=<pnpm> pnpm exec vitest run
// packages/harness/melite-tools/test/bundle-repro.spec.ts (from the
// repo ROOT — the workspace config's include globs are root-relative,
// so a package-dir CWD finds no test files). The gate runs on the
// estate host where the toolchain + module store are hot — never
// default CI. The ship playbook wires it (cruft row 7): every ship
// now proves the committed lib/ rebuilds byte-identical from HEAD.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statfsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RUN = process.env.BUNDLE_REPRO === '1'

/** Resolve the pnpm entry once (BUNDLE_REPRO_PNPM, then
 *  npm_execpath, then PATH) — the same order runPnpm serves. */
const resolvePnpm = (): string => {
  const direct = process.env.BUNDLE_REPRO_PNPM
  if (direct !== undefined && direct !== '') return direct
  const ex = process.env.npm_execpath
  if (ex !== undefined && ex !== '') return ex
  try {
    execFileSync('pnpm', ['--version'], { timeout: 30_000, stdio: 'pipe' })
  } catch {
    throw new Error('bundle-repro: no pnpm resolvable — run under `pnpm run` (npm_execpath), put pnpm on PATH, or set BUNDLE_REPRO_PNPM to the pnpm entry file')
  }
  return 'pnpm'
}

/** The scratch root must sit on the pnpm STORE's filesystem: the
 *  offline install serves packages by hardlink when the devices
 *  match (reused 901/916 measured) but falls back to a copy path
 *  that needs per-package tarball index entries the store does not
 *  keep for every package (ERR_PNPM_NO_OFFLINE_TARBALL on a tmpfs
 *  scratch, reused 322/916 then red) — /tmp is tmpfs on this lane
 *  and the store is on the root volume, so tmpdir() is wrong here. */
const scratchRoot = (): string => {
  const storePath = execFileSync(resolvePnpm(), ['store', 'path'], { timeout: 60_000, encoding: 'utf8' }).trim()
  const storeDev = statfsSync(storePath)
  const tmpDev = statfsSync(tmpdir())
  return storeDev.type === tmpDev.type ? tmpdir() : dirname(storePath)
}

/** Byte-identity modulo ONE trailing newline (the gate's tolerance —
 *  editors and POSIX tools disagree on the last byte; the build does
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

describe.skipIf(!RUN)('bundle-repro build (BUNDLE_REPRO=1 — git + pnpm + tsc)', () => {
  test('lib/ rebuilds byte-identical from pristine HEAD', () => {
    const specDir = dirname(fileURLToPath(import.meta.url))
    const repo = join(specDir, '..', '..', '..', '..')
    const pkg = join('packages', 'harness', 'melite-tools')
    const tmp = mkdtempSync(join(scratchRoot(), 'bundle-repro-'))
    const wt = join(tmp, 'wt')
    // pnpm rides an explicit entry first (BUNDLE_REPRO_PNPM — a
    // file: *.cjs runs under node, anything else execs direct),
    // then the launcher's npm_execpath (`pnpm run`, not `pnpm`
    // exec` — exec does not propagate it), then the PATH; beyond
    // that the gate refuses NAMING the fix, never a bare ENOENT
    const pnpmEntry = resolvePnpm()
    const runPnpm = (args: string[], cwd: string): void => {
      const timeout = 280_000
      if (pnpmEntry.endsWith('.cjs') || pnpmEntry.endsWith('.mjs') || pnpmEntry.endsWith('.js')) {
        execFileSync(process.execPath, [pnpmEntry, ...args], { cwd, timeout })
      } else {
        execFileSync(pnpmEntry, args, { cwd, timeout })
      }
    }
    try {
      execFileSync('git', ['worktree', 'add', '--detach', wt, 'HEAD'], { cwd: repo, timeout: 120_000 })
      // the worktree's own toolchain (never the live tree's): a hot
      // store links in seconds; a cold one pays minutes once
      runPnpm(['install', '--offline', '--ignore-scripts', '--prefer-offline'], wt)
      execFileSync('git', ['checkout', '--', 'pnpm-lock.yaml'], { cwd: wt, timeout: 30_000 })
      // the package's OWN build (tsc -p tsconfig.build.json — the
      // committed lib/ is full tsc output, never a two-entry tsdown
      // bundle): emit into a same-depth sibling of lib/ so the
      // sourcemap ../src relatives stay byte-identical, then compare
      // the HEAD worktree's committed lib/ (never the live tree's)
      // against the fresh emit.
      const wtPkg = join(wt, pkg)
      const freshDir = join(wtPkg, '.repro-lib')
      execFileSync(join(wtPkg, 'node_modules', '.bin', 'tsc'),
        ['-p', 'tsconfig.build.json', '--outDir', freshDir],
        { cwd: wtPkg, timeout: 280_000 })
      const readDir = (dir: string, base: string = dir): Map<string, string> => new Map(
        readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const full = join(dir, entry.name)
          if (entry.isDirectory()) return [...readDir(full, base)]
          if (!entry.isFile()) return []
          return [[full.slice(base.length + 1), readFileSync(full, 'utf8')] as const]
        }),
      )
      const problems = bundleDiffReport(readDir(join(wtPkg, 'lib')), readDir(freshDir))
      assert.deepEqual(problems, [], 'the committed bundle is not reproducible from HEAD:\n' + problems.join('\n'))
    } finally {
      try { execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: repo, timeout: 60_000 }) } catch { /* best-effort */ }
      rmSync(tmp, { recursive: true, force: true })
    }
  }, 295_000)
})
