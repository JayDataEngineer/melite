#!/usr/bin/env node
// hook-client-bundle-bytes.mjs — THE SERVED-BUNDLE BYTE GATE (the
// 2026-11-09 stale-embed lesson, roadmap OPEN row "THE LANDING
// HOOK'S BYTE BLIND SPOT"): the freshness wall judges mtimes, and a
// land that rebuilds an embed bundle WITHOUT its new src bytes
// passes every gate while the lane serves the stale face (the v2v
// appearance burn: 4aaa672cb styled V2vLeafFace in h3-timeline's src
// while the served copy rode melite-card-view's lib/client.js, whose
// own src never moved — mtime green, bytes stale; caught one land
// late at 86c07ba43). The battery's lib-sync drift arm is blind to
// the same class (build-plane STASHES bundles across the lib wipe,
// never rebuilds them — a stale bundle produces zero drift).
//
// THE LAW: every seated lib/client.js is byte-identical to a fresh
// tsdown emit of its inputs (its own src + its reverse-embed
// closure). The tool judges only bundles whose inputs MOVED in the
// push set (sub-second pass otherwise); the walls-tier byte arm
// judges all of them, every run.
//
// AFFECTED SET (derived, never a list):
//   - a changed file under a bundle package's own src/ dirties it;
//   - a changed file under any package a bundle's src imports by
//     workspace name (@melite/<name>) dirties every bundle importing
//     that name (the v2v class: h3-timeline bytes inside
//     card-view's bundle);
//   - a change to the shared client preset
//     (packages/web/shared/tsdown.client.ts, web-platform.ts) or a
//     bundle's own tsdown.config.* dirties every / its bundle.
// VERDICT per affected bundle: tsdown -d <mkdtemp> (NEVER in place —
// a hook must not mutate the worktree), byte-compare client.js with
// the index bytes (`git show :path`). Mismatch, missing seated
// bytes, missing builder, or a failed emit all refuse LOUD naming
// the package and the rebuild command. A failed emit IS the
// refusal (the input-prep class: a bundle that cannot rebuild can
// never carry new bytes — its fossil serves forever).
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Workspace package name of a repo-relative path's owner (packages/<scope>/<pkg> or packages/<pkg>), via its manifest. */
export function ownerPackageName(repoRel, { readPkg = (d) => JSON.parse(readFileSync(join(REPO, d, 'package.json'), 'utf8')) } = {}) {
  const parts = repoRel.split('/')
  if (parts[0] !== 'packages' || parts.length < 3) return null
  // A genre dir may itself be a package (packages/<name>/package.json) — try the deep dir first, fall back shallow.
  for (const dir of [parts.slice(0, 3).join('/'), parts.slice(0, 2).join('/')]) {
    try {
      const name = readPkg(dir).name
      if (typeof name === 'string') return name
    } catch { /* not a package dir — try shallower */ }
  }
  return null
}

/** Bundle roster: package dirs seating a tracked tsdown config AND a seated lib/client.js. Derived, zero maintained literals. */
export function bundlePackages({ tracked = null } = {}) {
  const configs = (tracked ?? execFileSync('git', ['ls-files', '**/tsdown.config.*'], { cwd: REPO, encoding: 'utf8' }).split('\n')).filter((f) => f.trim() !== '')
  const out = []
  for (const f of configs) {
    const dir = dirname(f)
    try {
      execFileSync('git', ['cat-file', '-e', `:${dir}/lib/client.js`], { cwd: REPO, stdio: 'ignore' })
      out.push(dir)
    } catch { /* config without a seated bundle: not this gate's roster */ }
  }
  return out.sort()
}

/** Workspace-name imports of one bundle package's src (the reverse-embed closure's edges). @melite/<name> only — relative imports escaping the package violate the boundary law and are arch-lint's to refuse, never this gate's to bless. */
export function bundleImports(pkgDir) {
  const found = new Set()
  const walk = (dir) => {
    let entries
    try {
      entries = readdirSync(dir)
    } catch { return }
    for (const e of entries) {
      const p = join(dir, e)
      try {
        if (statSync(p).isDirectory()) { walk(p); continue }
      } catch { continue }
      if (!/\.(ts|tsx|mts|cts)$/.test(e)) continue
      let text
      try { text = readFileSync(p, 'utf8') } catch { continue }
      for (const m of text.matchAll(/from\s+['"](@melite\/[^'"]+)['"]/g)) {
        // Leaf imports (`@melite/estate-drafts/trail`) ride the package root's closure: the owner package is the first two segments.
        found.add(m[1].split('/').slice(0, 2).join('/'))
      }
    }
  }
  walk(join(REPO, pkgDir, 'src'))
  return found
}

/** The affected bundles for a changed-file list (exported for the wall — synthetic fixtures, never the tree). */
export function affectedBundles(changedFiles, { bundles, nameOf, importsOf, sharedPreset = ['packages/web/shared/tsdown.client.ts', 'packages/web/shared/web-platform.ts'] } = {}) {
  const affected = new Set()
  const changedNames = new Set()
  for (const f of changedFiles) {
    if (f === '') continue
    if (sharedPreset.includes(f)) return [...bundles].sort()
    const dir = f.startsWith('packages/') ? f.split('/').slice(0, 3).join('/') : null
    if (dir !== null && bundles.includes(dir) && (f.endsWith('tsdown.config.ts') || f.includes('/src/'))) {
      affected.add(dir)
    }
    const n = nameOf(f)
    if (n !== null) changedNames.add(n)
  }
  for (const b of bundles) {
    if (affected.has(b)) continue
    const imps = importsOf(b)
    for (const n of changedNames) {
      if (imps.has(n)) { affected.add(b); break }
    }
  }
  return [...affected].sort()
}

/** Byte equality of a fresh emit against seated bytes (exported for the wall's firing arm). */
export function bytesEqual(a, b) {
  if (a.length !== b.length) return false
  return a.equals(b)
}

/** Fresh-emit one bundle to a temp dir; returns { bytes } or { error }. */
function emitBundle(pkgDir) {
  const bin = join(REPO, pkgDir, 'node_modules', '.bin', process.platform === 'win32' ? 'tsdown.cmd' : 'tsdown')
  if (!existsSync(bin)) {
    return { error: `${pkgDir}: no tsdown builder (run pnpm install — the builder-declaration wall owns the declaration, this gate owns the binary)` }
  }
  const tmp = mkdtempSync(join(tmpdir(), 'bundle-bytes-'))
  try {
    // THE PRODUCTION-EMIT LAW: the shared preset defines
    // process.env.NODE_ENV into the bundle (defaulting unset to
    // 'production' — zustand's dev branches fork the bytes). The
    // lane ships production emits; a gate running under vitest
    // (NODE_ENV=test) or any other ambient value would compare
    // against a foreign emit and false-red on healthy trees. Strip
    // the ambient value so the preset's own default seats production.
    const { NODE_ENV: _stripped, ...childEnv } = process.env
    const r = spawnSync(bin, ['-d', tmp, '--silent'], { cwd: join(REPO, pkgDir), encoding: 'utf8', env: childEnv })
    if (r.status !== 0) {
      const lines = String(r.stdout + '\n' + r.stderr).split('\n')
      // The cause (the purity refusal, the missing entry) prints ABOVE the bundler's stack — carry both.
      const cause = lines.filter((l) => /ERROR|purity|cannot|failed/i.test(l)).slice(0, 3)
      const tail = [...cause, ...lines.slice(-6)].join('\n')
      return { error: `${pkgDir}: fresh emit FAILED — the bundle is unreproducible and can never carry new bytes:\n${tail}` }
    }
    const fresh = join(tmp, 'client.js')
    if (!existsSync(fresh)) {
      return { error: `${pkgDir}: emit produced no client.js — the config no longer builds the served bundle` }
    }
    return { bytes: readFileSync(fresh) }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

function seatedBytes(pkgDir) {
  try {
    return execFileSync('git', ['show', `:${pkgDir}/lib/client.js`], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 })
  } catch {
    return null
  }
}

function main(argv) {
  const files = argv.filter((p) => p !== '' && !p.startsWith('-'))
  if (files.length === 0) {
    console.log('bundle-bytes: no push files — nothing to judge (the push-set sentry certifies the empty set)')
    return 0
  }
  const inPackages = files.filter((f) => f.startsWith('packages/'))
  if (inPackages.length === 0) {
    console.log('bundle-bytes: no package inputs moved — pass (sub-second)')
    return 0
  }
  const bundles = bundlePackages()
  if (bundles.length === 0) {
    console.error('bundle-bytes FAIL: the bundle roster collapsed — the tsdown.config walk broke')
    return 1
  }
  const nameCache = new Map()
  const nameOf = (f) => {
    if (!nameCache.has(f)) nameCache.set(f, ownerPackageName(f))
    return nameCache.get(f)
  }
  const importCache = new Map()
  const importsOf = (b) => {
    if (!importCache.has(b)) importCache.set(b, bundleImports(b))
    return importCache.get(b)
  }
  const affected = affectedBundles(inPackages, { bundles, nameOf, importsOf })
  if (affected.length === 0) {
    console.log('bundle-bytes: no bundle inputs moved — pass (sub-second)')
    return 0
  }
  const refusals = []
  for (const b of affected) {
    const seated = seatedBytes(b)
    if (seated === null) {
      refusals.push(`${b}/lib/client.js: NO SEATED BYTES — build it and stage it (cd ${b} && ./node_modules/.bin/tsdown)`)
      continue
    }
    const emit = emitBundle(b)
    if (emit.error !== undefined) {
      refusals.push(emit.error)
      continue
    }
    if (!bytesEqual(emit.bytes, seated)) {
      refusals.push(`${b}/lib/client.js: STALE BYTES — a fresh tsdown emit of its inputs differs from the seated bundle (inputs moved without a rebuild; the lane serves the stale face): REBUILD IT (cd ${b} && ./node_modules/.bin/tsdown — tsdown BEFORE tsc), then stage the diff`)
    }
  }
  if (refusals.length > 0) {
    console.error('bundle-bytes FAIL — the served face predates its inputs:\n' + refusals.join('\n'))
    return 1
  }
  console.log(`bundle-bytes: ${affected.length} affected bundle(s) byte-identical to a fresh emit — pass`)
  return 0
}

// Importable by the walls (the firing arms ride these functions) — main() runs only under direct execution, never on import.
import { resolve } from 'node:path'
const invokedAs = process.argv[1] !== undefined ? resolve(process.argv[1]) : null
if (invokedAs !== null && invokedAs === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)))
}
