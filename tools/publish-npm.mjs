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
//   node tools/publish-npm.mjs --from dist/npm [--dry-run]
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
if (!from || !existsSync(join(from, 'order.txt'))) fail('usage: node tools/publish-npm.mjs --from DIR [--dry-run]')

const manifest = JSON.parse(readFileSync(join(from, 'release-manifest.json'), 'utf8'))
const order = readFileSync(join(from, 'order.txt'), 'utf8').split('\n').filter(Boolean)
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
  try { run('npm', ['view', spec, 'version']); have = true } catch { /* not on the registry yet */ }
  if (have) { console.log(`skip ${spec} — already published`); skipped++; continue }
  if (dryRun) { console.log(`dry-run ${spec} (${file})`); continue }
  run('npm', ['publish', join(from, file), '--access', 'public'])
  run('npm', ['view', spec, 'version']) // the readback: the registry answers for it
  console.log(`✓ ${spec}`)
  published++
}
console.log(`done: ${published} published, ${skipped} skipped, ${order.length} total`)
