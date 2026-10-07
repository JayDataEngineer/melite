#!/usr/bin/env node
// publish-npm.mjs — publish the gated release bytes to the npm registry.
//
// Input: a directory produced by `release-artifacts.mjs mint --out DIR`
// (tarballs + release-manifest.json + order.txt). Every tarball's sha256
// is verified against the manifest before anything reaches the network:
// publication uploads exactly the bytes the mint gated. Order comes from
// order.txt — dependencies before consumers — so the registry never
// carries a consumer whose in-set dependency is missing.
//
// Already-published versions are skipped, making re-runs after a partial
// failure safe. Auth is npm's standard: NODE_AUTH_TOKEN in the
// environment (the release-publish workflow injects the secret).
//
//   node tools/publish-npm.mjs --from dist/npm [--dry-run] [--registry URL]
//
// --registry retargets every npm call (publish + view readback) —
// the fake-registry door (tools/local-npm-registry.mjs): prove the
// gated bytes publish + install against a local registry BEFORE the
// public GO, exactly the way production talks to npmjs.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1) }
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

const argv = process.argv.slice(2)
const from = argv[argv.indexOf('--from') + 1]
const dryRun = argv.includes('--dry-run')
const registryArg = argv[argv.indexOf('--registry') + 1]
const registry = typeof registryArg === 'string' && registryArg !== '--dry-run' && registryArg !== undefined
  ? ['--registry', registryArg]
  : []
if (!from || !existsSync(join(from, 'release-manifest.json'))) fail('usage: node tools/publish-npm.mjs --from DIR [--dry-run] [--registry URL]')

const manifest = JSON.parse(readFileSync(join(from, 'release-manifest.json'), 'utf8'))

// order.txt: the release's dependency-ordered publish plan. Releases
// minted before order.txt shipped (alpha.8 and earlier) carry only
// the tarballs + manifest — the order is then DERIVED here by the
// same walk the mint runs (dependencies before consumers, inner
// manifests read from the tarballs themselves). A set whose walk
// cannot cover every row refuses, exactly like the mint.
let order
if (existsSync(join(from, 'order.txt'))) {
  order = readFileSync(join(from, 'order.txt'), 'utf8').split('\n').filter(Boolean)
} else {
  const inner = new Map() // name -> { file, deps }
  for (const row of manifest.packages) {
    const pkg = JSON.parse(run('bash', ['-c', `tar -xzOf ${join(from, row.file)} package/package.json`]))
    inner.set(pkg.name, {
      file: row.file,
      deps: [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})],
    })
  }
  const ordered = []
  const seen = new Set()
  const visit = (name) => {
    if (seen.has(name)) return
    seen.add(name)
    const entry = inner.get(name)
    if (!entry) return
    for (const d of [...entry.deps].sort()) if (inner.has(d)) visit(d)
    ordered.push(entry.file)
  }
  for (const name of [...inner.keys()].sort()) visit(name)
  if (ordered.length !== inner.size) fail(`derived order covers ${ordered.length}/${inner.size} packages — refusing an incomplete order`)
  order = ordered
  console.log(`order.txt absent — derived ${order.length} rows by dependency walk (pre-order release shape)`)
}
for (const file of order) {
  const row = manifest.packages.find((p) => p.file === file)
  if (!row) fail(`${file} is not in the manifest — refusing to publish ungated bytes`)
  if (sha256(join(from, file)) !== row.sha256) fail(`${file} sha256 ≠ manifest — the bytes drifted since the mint`)
}
// order.txt completeness: a truncated artifact set would publish a
// subset and exit 0 — the order must cover EVERY manifest row
const missing = manifest.packages.filter((p) => !order.includes(p.file)).map((p) => p.file)
if (missing.length > 0) {
  fail(`order.txt omits ${missing.length} manifest rows (first: ${missing[0]}) — refusing to publish a subset`)
}

let published = 0
let skipped = 0
for (const file of order) {
  const inner = JSON.parse(run('bash', ['-c', `tar -xzOf ${join(from, file)} package/package.json`]))
  const spec = `${inner.name}@${inner.version}`
  let have = false
  // --prefer-online: a stale packument cache (e.g. a previous local
  // registry run) must never make the pre-check answer "published"
  // for a registry that no longer carries the version
  try { run('npm', ['view', spec, 'version', '--prefer-online', ...registry]); have = true } catch { /* not on the registry yet */ }
  if (have) { console.log(`skip ${spec} — already published`); skipped++; continue }
  if (dryRun) { console.log(`dry-run ${spec} (${file})`); continue }
  // prerelease versions never touch the latest channel — npm refuses
  // a bare prerelease publish, and the release channel is 'next'
  const channel = inner.version.includes('-') ? ['--tag', 'next'] : []
  run('npm', ['publish', join(from, file), '--access', 'public', ...channel, ...registry])
  run('npm', ['view', spec, 'version', ...registry]) // the readback: the registry answers for it
  console.log(`✓ ${spec}`)
  published++
}
console.log(`done: ${published} published, ${skipped} skipped, ${order.length} total`)
