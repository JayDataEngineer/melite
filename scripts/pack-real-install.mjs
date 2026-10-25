#!/usr/bin/env node
/**
 * pack-real-install.mjs — INSTALL MELITE AS REAL DSH EXTENSIONS.
 *
 * THE LAW (operator, 2026-10-13): a symlink is a DEV convenience. A
 * lane that must survive on its own carries real installs — packages
 * materialized in its own profile, with no path back into a working
 * tree that may move, change branch, or be deleted.
 *
 * WHAT THIS DOES. `dsh plugin --profile <n> add <spec>` is DSH's own
 * entrance (dsh-plugin-manager/operations.ts, runProfilePnpm — the
 * same call the Plugin Manager's Install view makes). It installs a
 * LOCAL CHECKOUT as `link:` — a symlink, i.e. the dev shape. This
 * script produces the other legal shape from the same mechanism:
 *
 *   1. every @melite package is PACKED to a tarball (`pnpm pack`
 *      rewrites `workspace:*` to the concrete version at pack time,
 *      so the closure installs without the monorepo);
 *   2. all tarballs go into ONE `pnpm add` in the profile directory,
 *      so each package resolves its siblings from that same set;
 *   3. `dsh.profile.bundles` is reconciled from the installed
 *      manifests — the DSH rule (a dependency whose manifest declares
 *      `dsh.bundle.patch` joins the layer stack), so bundle
 *      membership is the framework's answer, never a hand list.
 *
 * The result is a profile with no `link:` row and no path into this
 * tree: copy the profile directory to a machine with no repo, and it
 * still boots.
 *
 * Usage:
 *   node scripts/pack-real-install.mjs --profile <dir> [--out <dir>] [--dry-run]
 *
 * Not a lane tool: it installs INTO a profile directory. Which lanes
 * get the real install, and which keep the dev symlink, is the lane
 * topology's call (dev_docs/LANE_TOPOLOGY.md).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validatePackedTarball } from './lib/packed-payload.mjs'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const out = { profile: '', out: '', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--profile') out.profile = resolve(argv[++i])
    else if (a === '--out') out.out = resolve(argv[++i])
    else if (a === '--dry-run') out.dryRun = true
    else die(`unknown argument ${a}`)
  }
  if (!out.profile) die('--profile <dir> is required (the profile directory to install into)')
  if (!existsSync(join(out.profile, 'package.json'))) die(`no package.json in ${out.profile} — not a profile directory`)
  out.out = out.out || join(REPO, 'data/runtime/real-install-tarballs')
  return out
}
function die(msg) { console.error(`pack-real-install: ${msg}`); process.exit(1) }

/** Every workspace package whose name is ours (@melite*, @melite-plugin*). */
function discoverPackages() {
  const found = []
  const walk = (dir, depth) => {
    if (depth > 5) return
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === 'node_modules' || e.name === 'lib' || e.name.startsWith('.')) continue
      const p = join(dir, e.name)
      const manifest = join(p, 'package.json')
      if (existsSync(manifest)) {
        try {
          const m = JSON.parse(readFileSync(manifest, 'utf8'))
          if (typeof m.name === 'string' && (m.name.startsWith('@melite/') || m.name.startsWith('@melite-plugin/'))) {
            found.push({ dir: p, name: m.name, manifest: m })
          }
        } catch { /* an unreadable manifest is not a package */ }
      }
      walk(p, depth + 1)
    }
  }
  walk(join(REPO, 'packages'), 0)
  found.sort((a, b) => a.name.localeCompare(b.name))
  return found
}

const pnpm = process.env.PNPM ?? 'pnpm'
function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

const args = parseArgs(process.argv.slice(2))
const packages = discoverPackages()
if (packages.length === 0) die('no @melite packages found under packages/')

// 1. pack every package into the tarball set
mkdirSync(args.out, { recursive: true })
for (const stale of readdirSync(args.out)) {
  if (stale.endsWith('.tgz')) rmSync(join(args.out, stale))
}
const tarballs = []
const packedName = new Map()
for (const p of packages) {
  if (args.dryRun) { tarballs.push(join(p.dir, `${p.name.replace(/[@/]/g, '-')}-${p.manifest.version}.tgz`)); continue }
  const out = run(pnpm, ['pack', '--pack-destination', args.out], p.dir)
  const line = out.trim().split('\n').filter((l) => l.endsWith('.tgz')).pop()
  if (!line) die(`${p.name}: pnpm pack produced no tarball`)
  const abs = resolve(p.dir, line)
  // THE F7 PAYLOAD GATE (HMR audit 009): judge the PACKED BYTES at
  // pack time — a manifest whose `files` dropped a client row or a
  // dsh.bundle.patch member dies HERE, not at the consumer's boot.
  try {
    validatePackedTarball(abs)
  } catch (err) {
    die(`${p.name}: ${String(err.message ?? err)}`)
  }
  tarballs.push(abs)
  packedName.set(p.name, abs)
}
console.log(`pack-real-install: ${String(tarballs.length)} tarball(s) in ${args.out}`)

// 2. resolve the closure as REAL packages. `pnpm add file:…` cannot
// do this: pnpm resolves a package's dependencies from the REGISTRY
// before it applies the new tarballs, so a sibling that was never
// published 404s. The supported mechanism is a per-package override —
// each @melite name mapped to its own tarball — then a plain
// `pnpm install`, which materializes real directories in the profile's
// node_modules. The `link:` rows are dropped: a symlink is the dev
// shape, and this install is the other one.
const profileManifestPath = join(args.profile, 'package.json')
const profile = JSON.parse(readFileSync(profileManifestPath, 'utf8'))
const before = { bundles: profile.dsh?.profile?.bundles ?? [], links: Object.entries(profile.dependencies ?? {}).filter(([, v]) => String(v).startsWith('link:')).length }
if (before.links > 0) console.log(`pack-real-install: the profile holds ${String(before.links)} link: row(s); this install replaces them with real packages`)

if (!args.dryRun) {
  const overrides = {}
  for (const [name, tarball] of packedName) overrides[name] = `file:${tarball}`
  profile.pnpm = profile.pnpm ?? {}
  profile.pnpm.overrides = { ...(profile.pnpm.overrides ?? {}), ...overrides }
  profile.dependencies = { ...profile.dependencies }
  for (const [dep, spec] of Object.entries(profile.dependencies)) {
    if (String(spec).startsWith('link:')) delete profile.dependencies[dep]
  }
  for (const name of Object.keys(overrides)) profile.dependencies[name] = '*'
  writeFileSync(profileManifestPath, `${JSON.stringify(profile, null, 2)}\n`)
  run(pnpm, ['install'], args.profile)
}

// 3. reconcile the bundle list from the INSTALLED manifests (the DSH rule)
const installedRoot = join(args.profile, 'node_modules')
const bundleNames = []
for (const p of packages) {
  const installed = join(installedRoot, p.name, 'package.json')
  if (!existsSync(installed)) continue
  const m = JSON.parse(readFileSync(installed, 'utf8'))
  if (m.dsh?.bundle?.patch) bundleNames.push(p.name)
}
if (!args.dryRun) {
  profile.dsh = profile.dsh ?? {}
  profile.dsh.profile = profile.dsh.profile ?? {}
  const merged = [...new Set([...before.bundles.filter((b) => b.startsWith('@deepseek-ai/')), ...bundleNames])]
  profile.dsh.profile.bundles = merged
  writeFileSync(profileManifestPath, `${JSON.stringify(profile, null, 2)}\n`)
}
const after = { bundles: bundleNames.length, links: 0 }
console.log(`pack-real-install: ${String(before.bundles.length)} bundle row(s) -> ${String(after.bundles)} @melite bundle(s) reconciled from the installed manifests`)
if (args.dryRun) console.log('pack-real-install: DRY RUN — nothing written')
else console.log(`pack-real-install: real install complete in ${args.profile} (no link: row, no path into ${REPO})`)
