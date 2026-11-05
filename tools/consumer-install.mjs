#!/usr/bin/env node
/**
 * consumer-install — seat a Melite release into a DSH profile.
 *
 * The GitHub release is the package source: every Melite package of a
 * release ships as a prebuilt tarball asset, and this script wires a
 * dsh profile so all of them resolve from those public URLs. No npm
 * account, no token, no build step, no repository clone.
 *
 * Usage (from the network):
 *   curl -fsSL https://raw.githubusercontent.com/JayDataEngineer/melite/<tag>/tools/consumer-install.mjs \
 *     | node - --profile melite-test --tag <tag>
 *
 * Usage (from a checkout, or offline against a local release dir):
 *   node tools/consumer-install.mjs --tag <tag> [--from <release-dir>]
 *
 * Flags:
 *   --profile <name>     profile to create or re-render (default: melite-test)
 *   --tag <tag>          release tag to install (required)
 *   --repo <owner/name>  source repository (default: JayDataEngineer/melite)
 *   --dsh-home <dir>     DSH home (default: ~/.dsh)
 *   --from <dir>         offline mode: read release-manifest.json and the
 *                        tarballs from this local directory
 *   --no-install         scaffold the profile but skip the dependency install
 *   --force-render       back up a foreign profile package.json, then render
 *
 * After the install, boot the studio:
 *   dsh --profile melite-test --port 3088
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

const fail = (msg) => { console.error('consumer-install: ' + msg); process.exit(1) }
const argValue = (flag) => {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const profileName = argValue('--profile') ?? 'melite-test'
const tag = argValue('--tag')
const repo = argValue('--repo') ?? 'JayDataEngineer/melite'
const dshHome = resolve(argValue('--dsh-home') ?? join(homedir(), '.dsh'))
const fromDir = argValue('--from') ? resolve(argValue('--from')) : undefined
const noInstall = process.argv.includes('--no-install')
const forceRender = process.argv.includes('--force-render')
if (!tag) fail('--tag is required — pin the release you install (example: --tag v0.2.1-alpha.1)')

/** The profiles this installer can seat. Mirrors the in-repo renderer's
 *  mounts: the studio (cards, bench, web UI) and the estate job server.
 *  There is no headless row: HEADLESS IS DSH'S (`dsh headless`, its own
 *  shipped `headless` profile) — melite seats no parallel mount. In-box
 *  @deepseek-ai/* bundles resolve from the dsh installation itself;
 *  every other row must be a release package and becomes a direct
 *  dependency. */
const PROFILE_BASES = {
  'melite-test': ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@melite/harness-provisioner',
    '@melite/harness-tools', '@melite-plugin/dsh-estate', '@melite/card-base', '@melite/three-client',
    '@melite-plugin/dsh-card-view', '@melite-plugin/dsh-card-deck', '@melite-plugin/dsh-gallery',
    '@melite/video-h3-timeline', '@melite/motion-motion', '@melite/image-input-prep'],
  estate: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-sdk-app', '@melite/harness-provisioner',
    '@melite/harness-tools', '@melite-plugin/dsh-estate'],
}
if (!(profileName in PROFILE_BASES)) {
  fail(`unknown profile '${profileName}' — known: ${Object.keys(PROFILE_BASES).join(', ')}`)
}
const bundles = PROFILE_BASES[profileName]

/** Read the release manifest. Network mode fetches it from the release;
 *  --from reads a local minted set (offline installs, tests). */
const readManifest = async () => {
  if (fromDir) {
    const p = join(fromDir, 'release-manifest.json')
    if (!existsSync(p)) fail(`--from: no release-manifest.json under ${fromDir}`)
    return { manifest: JSON.parse(readFileSync(p, 'utf8')), manifestUrl: 'file:' + p }
  }
  const url = `https://github.com/${repo}/releases/download/${tag}/release-manifest.json`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) fail(`could not read ${url} (HTTP ${res.status}) — check the tag and that the release is public`)
  return { manifest: JSON.parse(await res.text()), manifestUrl: url }
}
const { manifest, manifestUrl } = await readManifest()
if ((manifest.manifest ?? 0) < 2) {
  fail(`release ${tag} carries a manifest without package names (version ${String(manifest.manifest)}) — install from a release minted with named manifest rows`)
}

/** name -> asset URL for every package of the release. */
const assetUrl = (row) => fromDir
  ? 'file:' + join(fromDir, row.file)
  : `https://github.com/${repo}/releases/download/${tag}/${row.file}`
const byName = new Map()
for (const row of manifest.packages) {
  if (!row.name || !row.file) fail(`manifest row without name/file: ${JSON.stringify(row)}`)
  if (byName.has(row.name)) fail(`manifest names ${row.name} twice`)
  byName.set(row.name, assetUrl(row))
}

// Every mounted non-in-box bundle must be a package of THIS release —
// a cold profile must never boot into a missing dependency.
const dependencies = {}
for (const b of bundles) {
  if (b.startsWith('@deepseek-ai/')) continue
  const url = byName.get(b)
  if (!url) fail(`profile ${profileName} mounts ${b}, but release ${tag} does not carry it`)
  dependencies[b] = url
}

/** The state root: where runs, drafts, and artifacts live for this
 *  profile. Per-profile, under the user's local share. */
const stateRoot = join(homedir(), '.local', 'share', 'melite', profileName)
const dst = join(dshHome, 'profiles', profileName)
const pkgPath = join(dst, 'package.json')
const provenancePath = join(dst, 'render-provenance.json')

// Refuse to clobber a profile this renderer cannot prove it owns —
// a hand-composed or foreign profile is moved aside only on request.
const mine = () => {
  try {
    const p = JSON.parse(readFileSync(provenancePath, 'utf8'))
    return p !== null && typeof p === 'object' && p.renderer === 'consumer-install'
  } catch { return false }
}
if (existsSync(pkgPath) && !mine() && !forceRender) {
  fail(`${pkgPath} exists and was not rendered by consumer-install — move it aside, or pass --force-render to back it up as package.json.prerender.bak`)
}
if (existsSync(pkgPath) && !mine() && forceRender) {
  copyFileSync(pkgPath, pkgPath + '.prerender.bak')
}
mkdirSync(dst, { recursive: true })

// The overrides map is the heart of the keyless install: every release
// package resolves from its release asset, including the ones reached
// only through another package's dependency graph. External packages
// (anything the release does not carry) resolve from their registries
// as usual.
const overrides = {}
for (const [name, url] of byName) overrides[name] = url

const writeAtomic = (p, text) => {
  writeFileSync(p + '.tmp', text)
  try { execFileSync('mv', [p + '.tmp', p]) } finally { rmSync(p + '.tmp', { force: true }) }
}

const pkg = {
  name: 'dsh-profile-' + profileName,
  private: true,
  dependencies,
  dsh: { profile: { bundles: [...new Set(bundles)] } },
}
writeAtomic(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

const overrideYaml = Object.entries(overrides)
  .map(([name, url]) => `  ${JSON.stringify(name)}: ${JSON.stringify(url)}`)
  .join('\n')
writeAtomic(join(dst, 'pnpm-workspace.yaml'),
  `packages:\n  - node_modules/*\noverrides:\n${overrideYaml}\n`)

// The user layer stays empty; the bundle patches own the melite rows.
writeAtomic(join(dst, 'cordis.yml'), '# rendered by consumer-install\n[]\n')

// The profile layer: the estate seats are pinned by configuration, so a
// fresh profile never boots unpinned. Non-web mounts disable the web
// rows (no webServer service exists to activate them).
const webMount = bundles.includes('@deepseek-ai/dsh-web-app')
const webRows = ['melite-tools-doors', 'infer-card-view', 'ray-card-deck', 'infer-gallery']
const estateRow =
  '# The estate seats (runs, drafts, artifacts) are pinned here:\n'
  + '# stateRoot is where this profile keeps its runs and artifacts.\n'
  + '# agentRoute names the model the agent tools use; absent means the\n'
  + '# agent seat logs itself unseated (no silent default).\n'
  + '- id: melite-estate\n'
  + '  config:\n'
  + `    stateRoot: ${JSON.stringify(stateRoot)}\n`
  + '    acquireStallTimeoutMs: 10000\n'
  + (webMount ? '    durableDownloads: true\n' : '')
const patch = webMount
  ? '# rendered by consumer-install — package rows live in the bundles.\n'
    + '# This layer pins the estate seats for the web profile.\n'
    + estateRow
  : '# rendered by consumer-install — package rows live in the bundles.\n'
    + '# No webServer service in this mount: the web-surface rows are\n'
    + '# disabled so activation cannot pend forever.\n'
    + webRows.map((id) => `- id: ${id}\n  disabled: true\n`).join('')
    + estateRow
writeAtomic(join(dst, 'cordis.patch.yml'), patch)

writeAtomic(provenancePath, JSON.stringify({
  renderer: 'consumer-install',
  tag,
  repo,
  profile: profileName,
  manifest: manifestUrl,
  manifestSha256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),
  packages: byName.size,
  renderedAt: new Date().toISOString(),
}, null, 2) + '\n')

console.log(`rendered profile : ${dst}`)
console.log(`  release        : ${tag} (${byName.size} packages from ${fromDir ? 'local release dir' : repo})`)
console.log(`  bundles        : ${bundles.join(', ')}`)
console.log(`  state root     : ${stateRoot}`)

if (noInstall) { console.log('dependencies not installed (--no-install)'); process.exit(0) }

const pnpm = spawnSync('sh', ['-c', 'command -v pnpm || true'], { encoding: 'utf8' }).stdout.trim()
if (!pnpm) {
  console.error('consumer-install: pnpm not found on PATH — enable it first:')
  console.error('  corepack enable && corepack prepare pnpm@10.33.2 --activate')
  console.error(`then install manually: (cd ${dst} && pnpm install)`)
  process.exit(2)
}
console.log('installing dependencies (release assets; externals from their registries) …')
const r = spawnSync(pnpm, ['install'], { cwd: dst, stdio: 'inherit' })
if (r.status !== 0) {
  console.error(`consumer-install: dependency install failed — run it manually: (cd ${dst} && pnpm install)`)
  process.exit(r.status ?? 1)
}
console.log('\nMelite is seated. Boot the studio:')
console.log(`  dsh --profile ${profileName} --port 3088`)
