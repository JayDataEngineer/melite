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
 * Packages are the workspace packages under packages/ whose name
 * starts with `@melite/`, `@melite-plugin/`, or `@infer-media/`.
 * Vendored packages keep their upstream versions.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
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
  const walk = (dir, depth) => {
    if (depth > 5) return
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === 'node_modules' || e.name === 'lib' || e.name.startsWith('.')) continue
      const p = join(dir, e.name)
      try {
        const manifest = JSON.parse(readFileSync(join(p, 'package.json'), 'utf8'))
        if (typeof manifest.name === 'string' && OURS.some((scope) => manifest.name.startsWith(scope))) {
          found.push({ dir: p, name: manifest.name, manifest })
          continue
        }
      } catch { /* an unreadable manifest is not a package */ }
      walk(p, depth + 1)
    }
  }
  walk(join(REPO, 'packages'), 0)
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
for (const p of packages) {
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
for (const line of moved) console.log(`  ${line}`)
if (args.dryRun) console.log('bump-release-version: DRY RUN — nothing written')
else console.log(`bump-release-version: ${args.to} is in every manifest under ${join(REPO, 'packages')}`)
