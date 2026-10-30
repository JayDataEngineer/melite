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
 * Internal dependencies ride `workspace:*`, so no dependency row moves
 * with the bump; `workspace:^` and pinned ranges would, and this script
 * refuses to edit those silently.
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
import { execSync } from 'node:child_process'
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
  const listing = execSync("git ls-files '*/package.json'", { cwd: REPO, encoding: 'utf8' })
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
      if (spec === 'workspace:*' || spec === 'workspace:^') continue
      pinned.push(`${p.name} ${field}.${dep}: ${spec}`)
    }
  }
}
if (pinned.length > 0) {
  die(`a sibling dependency carries a pinned version this command will not edit silently:\n  ${pinned.join('\n  ')}\nConvert the row to workspace:* or bump it by hand, then re-run.`)
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
if (args.dryRun) console.log('bump-release-version: DRY RUN — nothing written')
else console.log(`bump-release-version: ${args.to} is in every manifest under ${join(REPO, 'packages')}`)
