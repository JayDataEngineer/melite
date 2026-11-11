#!/usr/bin/env node
/**
 * bump-release-version.mjs — set every Melite workspace package's
 * `version` to one release number.
 *
 * THE LAW (dev_docs/RELEASES.md step 2): a release is a proven commit, and
 * the packages a lane installs are named by their version. The version
 * inside the manifests is the number the packed artifact carries
 * (scripts/pack-real-install.mjs packs each package as
 * `<name>-<version>.tgz`), so the release record's number and the
 * manifests' number must be one number, set by one command.
 *
 * Internal dependencies ride the workspace protocol, so no dependency
 * row moves with the bump — `workspace:*` (native @melite/* rows),
 * `workspace:~` (vendored @melite-plugin/* rows), and `workspace:^`
 * all resolve against the workspace and move with it; pinned ranges
 * would not, and this script refuses to edit those silently. The one
 * exception is the ROOT SEAT: the root package.json pins every
 * @melite row at the literal release number (the DSH plugin-install
 * recognition shape — never the workspace protocol a consumer profile
 * cannot resolve), and root-seat-parity demands the bump move those
 * pins with the manifests, so this script moves them too.
 *
 * Usage:
 *   node scripts/bump-release-version.mjs --to <version> [--dry-run]
 *
 * Packages are the workspace packages whose name starts with
 * `@melite/`, `@melite-plugin/`, or `@infer-media/` — discovered by
 * `git ls-files` over every tracked package.json (the release set's
 * own census), so every depth seats (the ComfyUI action-card UIs
 * sit seven levels under packages/; a bounded readdir walk missed
 * them and mint24's version gate caught the split set). Vendored
 * packages keep their upstream versions.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OURS = ['@melite/', '@melite-plugin/', '@infer-media/']

function die(msg) { console.error(`bump-release-version: ${msg}`); process.exit(1) }

function parseArgs(argv) {
  const out = { to: '', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--to') out.to = argv[++i] ?? ''
    else if (a === '--dry-run') out.dryRun = true
    else die(`unknown argument ${a}`)
  }
  if (!out.to) die('--to <version> is required (the release number, e.g. 0.1.1)')
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(out.to)) die(`--to ${out.to} is not a semver version`)
  return out
}

function discoverPackages() {
  const found = []
  // (class B R11, 2026-10-31) argv form — the quoted-shell spelling
  // rides cmd.exe quote-stripping; git's own pathspec glob needs no
  // shell at all.
  const listing = execFileSync('git', ['ls-files', '*/package.json'], { cwd: REPO, encoding: 'utf8' })
  for (const rel of listing.split('\n')) {
    if (!rel || rel.includes('node_modules/')) continue
    const dir = dirname(join(REPO, rel))
    try {
      const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      if (typeof manifest.name === 'string' && OURS.some((scope) => manifest.name.startsWith(scope))) {
        found.push({ dir, name: manifest.name, manifest })
      }
    } catch { /* an unreadable manifest is not a package */ }
  }
  found.sort((a, b) => a.name.localeCompare(b.name))
  return found
}

const args = parseArgs(process.argv.slice(2))
const packages = discoverPackages()
if (packages.length === 0) die(`no Melite package found under ${join(REPO, 'packages')}`)

const pinned = []
for (const p of packages) {
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [dep, spec] of Object.entries(p.manifest[field] ?? {})) {
      if (!OURS.some((scope) => dep.startsWith(scope))) continue
      if (spec === 'workspace:*' || spec === 'workspace:~' || spec === 'workspace:^') continue
      pinned.push(`${p.name} ${field}.${dep}: ${spec}`)
    }
  }
}
if (pinned.length > 0) {
  die(`a sibling dependency carries a pinned version this command will not edit silently:\n  ${pinned.join('\n  ')}\nConvert the row to its tier's workspace spelling (workspace:* for @melite/* native carriers, workspace:~ for @melite-plugin/ vendored — the workspace-protocol law) or bump it by hand, then re-run.`)
}

const moved = []
const versionless = []
for (const p of packages) {
  // A PRIVATE package with NO version row is outside the release set:
  // the docs site (@melite/docs) ships no artifact and pack-real-install
  // never names it. Skips are NAMED on stdout, never silent — a future
  // versionless package would otherwise vanish from the release census.
  if (typeof p.manifest.version !== 'string' || p.manifest.version === '') {
    if (p.manifest.private !== true) {
      die(`${p.name}: no version row and not private — a public package must carry the release number`)
    }
    versionless.push(p.name)
    continue
  }
  if (p.manifest.version === args.to) continue
  moved.push(`${p.name}: ${p.manifest.version} -> ${args.to}`)
  if (args.dryRun) continue
  const path = join(p.dir, 'package.json')
  const text = readFileSync(path, 'utf8')
  const next = text.replace(`"version": ${JSON.stringify(p.manifest.version)}`, `"version": ${JSON.stringify(args.to)}`)
  if (next === text) die(`${p.name}: version row not found verbatim in ${path}`)
  writeFileSync(path, next)
}
console.log(`bump-release-version: ${String(moved.length)} package(s) moved to ${args.to} (of ${String(packages.length)} discovered)`)
if (versionless.length > 0) console.log(`  versionless private package(s), outside the release set: ${versionless.join(', ')}`)
for (const line of moved) console.log(`  ${line}`)

// THE ROOT SEAT PIN MOVE (root-seat-parity's law: "the seat pin tracks
// the package's own version (the release bump moves both)"). The root
// package.json pins every @melite row at the literal release number —
// the DSH plugin-install shape, deliberately never the workspace
// protocol — so the bump re-pins them or the wall reds on the first
// push after a release bump (the v0.2.3-rc.1 burn: 42 pins left at
// 0.2.2-alpha refused the push battery the gate chains never saw,
// because the chains ran pre-bump).
const rootPath = join(REPO, 'package.json')
const root = JSON.parse(readFileSync(rootPath, 'utf8'))
const seatMoved = []
for (const [dep, spec] of Object.entries(root.dependencies ?? {})) {
  if (!OURS.some((scope) => dep.startsWith(scope))) continue
  if (spec === args.to) continue
  if (/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(spec)) seatMoved.push(`${dep}: ${spec} -> ${args.to}`)
}
if (seatMoved.length > 0 && !args.dryRun) {
  const text = readFileSync(rootPath, 'utf8')
  let next = text
  for (const dep of seatMoved.map((l) => l.slice(0, l.indexOf(':')))) {
    const from = JSON.stringify(root.dependencies?.[dep] ?? '')
    next = next.replace(`"${dep}": ${from}`, `"${dep}": ${JSON.stringify(args.to)}`)
  }
  if (next === text) die(`the root seat pins (${seatMoved.length} rows) did not rewrite verbatim in ${rootPath}`)
  writeFileSync(rootPath, next)
}
if (seatMoved.length > 0) {
  console.log(`  root seat pins moved: ${String(seatMoved.length)}`)
  for (const line of seatMoved) console.log(`    ${line}`)
}
if (args.dryRun) console.log('bump-release-version: DRY RUN — nothing written')
else console.log(`bump-release-version: ${args.to} is in every manifest under ${join(REPO, 'packages')} and in the root seat pins`)
