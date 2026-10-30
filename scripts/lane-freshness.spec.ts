/**
 * lane-freshness.spec.ts — THE F1 WALL (HMR audit 009, 2026-10-24:
 * "no continuous edit→browser judge on lanes — a stale lib serves
 * silently"; the 2026-10-13 and 2026-10-26 outages were exactly
 * this class).
 *
 * The gate is ONE function (scripts/lib/lane-freshness.sh
 * check_lane_freshness) seated at TWO doors: this wall exercises it
 * against fixture trees, and the lane (e2e-studio-lane.sh) sources
 * it BEFORE any boot. Arms:
 *   A. FRESH PASS — a fixture tree whose stamps equal its src
 *      passes (the gate never refuses a true tree).
 *   B. STALE REFUSE — the same tree with one package's stamp
 *      drifted reds with the package NAMED and the cure voiced.
 *   C. THE WIRING — e2e-studio-lane.sh actually sources and calls
 *      the gate before its host boot; a lane that drops the gate
 *      is the silent class again.
 *   D. THE RECIPE — the gate's hash is the builder's own
 *      (build-plane writeSrcStamp): recomputed against a REAL
 *      package's seated stamp, byte-for-byte.
 */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const GATE = join(ROOT, 'scripts', 'lib', 'lane-freshness.sh')
const LANE = readFileSync(join(ROOT, 'scripts', 'e2e-studio-lane.sh'), 'utf8')

/** Run the gate against a tree; returns { exit, output }. */
function runGate(tree: string): { exit: number; output: string } {
  try {
    const out = execFileSync(
      '/bin/bash',
      ['-c', `source ${JSON.stringify(GATE)} && check_lane_freshness ${JSON.stringify(tree)}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    return { exit: 0, output: out }
  } catch (e) {
    const err = e as { status?: number, stdout?: string, stderr?: string }
    return { exit: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}` }
  }
}

/** A minimal package tree: packages/web/thing/{src,lib} with a true stamp. */
function mintTree(base: string): string {
  const pkg = join(base, 'packages', 'web', 'thing')
  mkdirSync(join(pkg, 'src'), { recursive: true })
  mkdirSync(join(pkg, 'lib'), { recursive: true })
  writeFileSync(join(pkg, 'src', 'index.ts'), 'export const x = 1\n')
  const stamp = execFileSync(
    '/bin/bash',
    ['-c', `cd ${JSON.stringify(pkg)} && find src \\( -name '*.ts' -o -name '*.tsx' \\) | LC_ALL=C sort | xargs sha256sum 2>/dev/null | sha256sum | cut -c1-16`],
    { encoding: 'utf8' },
  ).trim()
  writeFileSync(join(pkg, 'lib', '.src-stamp'), `${stamp}\n`)
  return pkg
}

describe('the F1 lane-freshness gate', () => {
  it('A: a true tree passes — the gate never refuses fresh stamps', () => {
    const base = join(ROOT, 'node_modules', '.tmp', `lane-fresh-a-${process.pid}`)
    rmSync(base, { recursive: true, force: true })
    try {
      mintTree(base)
      const r = runGate(base)
      expect(r.exit, `fresh tree passes; output: ${r.output}`).toBe(0)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })

  it('B: a drifted stamp reds with the package NAMED and the cure voiced', () => {
    const base = join(ROOT, 'node_modules', '.tmp', `lane-fresh-b-${process.pid}`)
    rmSync(base, { recursive: true, force: true })
    try {
      const pkg = mintTree(base)
      writeFileSync(join(pkg, 'lib', '.src-stamp'), 'deadbeefdeadbeef\n')
      const r = runGate(base)
      expect(r.exit, 'a stale plane refuses the lane').toBe(1)
      expect(r.output, 'the offender is named').toContain('packages/web/thing')
      expect(r.output, 'the cure is the rebuild').toContain('build-plane')
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })

  it('C: the lane script sources and calls the gate BEFORE any host boot', () => {
    // THE WIRING LAW: the gate call must precede the host boot
    // (a stale lane must never START, let alone receipt).
    const gateCall = LANE.indexOf('check_lane_freshness "$REPO_ROOT"')
    expect(gateCall, 'the lane calls the gate').toBeGreaterThan(-1)
    expect(LANE.slice(0, gateCall), 'the gate is sourced first').toContain('lane-freshness.sh')
    // THE LAUNCH VERB: the lane boots the host via setsid "$DSH_BIN"
    // (line ~340 of e2e-studio-lane.sh). A stale plane must never
    // reach it — the refusal precedes the host.
    const launch = LANE.indexOf('setsid "$DSH_BIN"')
    expect(launch, 'the lane has a launch verb to guard').toBeGreaterThan(-1)
    expect(gateCall, 'the gate fires before the host launch').toBeLessThan(launch)
  })

  it('D: the gate recipe equals the builder\'s own — recomputed against a real package', () => {
    // The builder (tools/build-plane.mjs writeSrcStamp) owns the
    // recipe; the gate must not drift from it. A real package's
    // seated stamp is the builder's output — recomputing through
    // the gate's expression must reproduce it byte-for-byte.
    // LC_ALL=C (2026-10-30): the sort order is hash input; a
    // locale-collated sort made the recompute host-dependent (the
    // stamp canonicality law, client-bundle-freshness).
    const pkg = join(ROOT, 'packages', 'web', 'card-base')
    const seated = readFileSync(join(pkg, 'lib', '.src-stamp'), 'utf8').trim()
    const recomputed = execFileSync(
      '/bin/bash',
      ['-c', `cd ${JSON.stringify(pkg)} && find src \\( -name '*.ts' -o -name '*.tsx' \\) | LC_ALL=C sort | xargs sha256sum 2>/dev/null | sha256sum | cut -c1-16`],
      { encoding: 'utf8' },
    ).trim()
    expect(recomputed, 'the gate hashes exactly what the builder hashes').toBe(seated)
  })
})
