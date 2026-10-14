#!/usr/bin/env node
/**
 * Generate the keyless offline-install bundle for a release.
 *
 * npmjs's account meter has the 0.1.4-alpha set stalled at 49/98, and
 * GitHub Packages demands a token even for public installs — neither is
 * a shipping path. The release assets themselves are public HTTPS
 * downloads, so the bundle makes them the registry of record: an
 * overrides map pinning every in-set name to its release-asset URL.
 * Consumers generate a package.json with one command and `npm install`;
 * in-set deps resolve from the release (never hitting npmjs's missing
 * 49), everything external resolves from npmjs normally.
 *
 * Reads the release tarballs (authoritative inner names), writes:
 *   overrides.json   name -> asset URL for all 98
 *   install.mjs      consumer-side: scaffold a consumer dir + deps
 *   INSTALL.md       the two-command consumer runbook
 *
 * @example node tools/make-offline-install.mjs --from /tmp/dist-src --out /tmp/offline --tag v0.1.5-pre-alpha --repo JayDataEngineer/melite
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

function flagValue (argv, flag) {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

const from = flagValue(process.argv, '--from')
const out = flagValue(process.argv, '--out') ?? '/tmp/offline'
const tag = flagValue(process.argv, '--tag') ?? 'v0.1.5-pre-alpha'
const repo = flagValue(process.argv, '--repo') ?? 'JayDataEngineer/melite'
if (!from) {
  console.error('usage: make-offline-install.mjs --from <dir-with-release-tgzs> [--out dir] [--tag v] [--repo owner/name]')
  process.exit(2)
}
const base = `https://github.com/${repo}/releases/download/${tag}`

/** The user-facing surface: the plugin aggregates a consumer mounts.
 * (2026-10-27 excision: @melite-plugin/{3d,audio,video} deleted —
 * zero importers — so they never scaffold.) */
const ENTRY_PACKAGES = ['@melite-plugin/motion', '@melite-plugin/timeline', '@melite-plugin/dsh-gallery',
  '@melite-plugin/dsh-estate', '@melite-plugin/dsh-card-deck', '@melite-plugin/dsh-card-view']

const overrides = {}
const entries = {}
for (const file of readdirSync(from).filter((f) => f.endsWith('.tgz')).sort()) {
  let inner
  try {
    inner = JSON.parse(execFileSync('tar', ['-xOzf', join(from, file), 'package/package.json'], { maxBuffer: 4 << 20 }).toString())
  } catch {
    console.error(`  skip ${file} (unreadable inner manifest)`)
    continue
  }
  if (!inner.name?.startsWith('@melite')) continue
  const url = `${base}/${file}`
  overrides[inner.name] = url
  if (ENTRY_PACKAGES.includes(inner.name)) entries[inner.name] = url
}
const names = Object.keys(overrides)
if (names.length < 90) throw new Error(`only ${names.length} in-set tarballs resolved — expected the full 98`)

mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'overrides.json'), JSON.stringify(overrides, null, 2) + '\n')

const depsBlock = JSON.stringify(Object.fromEntries(ENTRY_PACKAGES.filter((n) => entries[n]).map((n) => [n, entries[n]])), null, 2)
const overridesBlock = JSON.stringify(overrides, null, 2)
writeFileSync(join(out, 'install.mjs',).replace(/\.mjs$/, '.mjs'), `#!/usr/bin/env node
/** Scaffold a melite ${tag} consumer directory from the release assets.
 *  Keyless: everything in-set installs from public release URLs.
 *  Usage: node install.mjs --to ./my-melite  &&  cd my-melite && npm install
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

function flagValue (argv, flag) {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}
const to = resolve(flagValue(process.argv, '--to') ?? './melite-${tag.replace(/^v/, '')}')
const deps = ${depsBlock}
const overrides = ${overridesBlock}
mkdirSync(to, { recursive: true })
writeFileSync(resolve(to, 'package.json'), JSON.stringify({
  name: 'melite-consumer',
  private: true,
  type: 'module',
  dependencies: deps,
  overrides,
}, null, 2) + '\\n')
console.log(\`scaffolded \${to} — now: cd \${to} && npm install\`)
`)
writeFileSync(join(out, 'INSTALL.md'), `# melite ${tag} — keyless install

No registry account, no token: the set installs from public release
assets. In-set packages are pinned by \`overrides\`; external
dependencies resolve from npmjs normally.

\`\`\`sh
node install.mjs --to ./my-melite
cd my-melite
npm install
\`\`\`

Entry packages mounted by default: ${ENTRY_PACKAGES.join(', ')}.
Add more by editing package.json — every in-set name is already in
overrides (${names.length} total), so any of them can be added as a
URL dependency or requested by the tree.
`)

console.log(`bundle written to ${out}: overrides.json (${names.length} names), install.mjs, INSTALL.md`)
for (const n of ENTRY_PACKAGES) {
  if (!entries[n]) console.warn(`  WARN: entry ${n} not found in the release tarballs`)
}
