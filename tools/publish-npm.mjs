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
//                           [--limit N] [--pace-ms N]
//
// Exit codes (the workflow re-arm contract): 0 the whole set is on the
// registry; 1 permanent failure (usage, manifest drift, auth, a
// non-transient publish error) — the caller must not re-arm; 3 the
// account rate-limit window held through the full backoff — the caller
// retries in place after its own backoff; 4 the batch limit published
// N packages and rows remain — a clean batch boundary, the caller
// hands off to the next walk. --limit 0 (default) covers the whole set.
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
// Flag values resolve only at a real index: `argv[argv.indexOf(f) + 1]`
// reads argv[0] ('--from') when the flag is absent (indexOf → -1) —
// that produced the mangled `npm publish ... --registry --from` which
// npm warns about and drops (runs of 2026-10-08).
const flagValue = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}
const from = flagValue('--from')
const dryRun = argv.includes('--dry-run')
const registryArg = flagValue('--registry')
const paceArg = flagValue('--pace-ms')
// --pace-ms N: sleep N ms between publish PUTs. npmjs rate-limits
// burst publishing at the account level; a steady gap keeps a large
// release under the limiter instead of tripping into backoff.
const paceMs = typeof paceArg === 'string' && /^\d+$/.test(paceArg) ? Number(paceArg) : 0
// --limit N: publish at most N packages this invocation (registry
// probes and skips are free). The batch boundary is how a many-package
// release rides under the account limiter: N per walk, exit 4, and
// the workflow's re-arm spaces the next batch out.
const limitArg = flagValue('--limit')
const limit = typeof limitArg === 'string' && /^\d+$/.test(limitArg) ? Number(limitArg) : 0
const noProbe = argv.includes('--no-probe')
const registry = typeof registryArg === 'string' && registryArg !== '--dry-run' && registryArg !== undefined
  ? ['--registry', registryArg]
  : []
if (!from || !existsSync(join(from, 'release-manifest.json'))) fail('usage: node tools/publish-npm.mjs --from DIR [--dry-run] [--registry URL] [--limit N]')

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
let batch = 0 // publish actions this invocation — the --limit budget
// SELF-TIMING (2026-10-18, the operator's "taking forever to
// publish"): every package line carries its own wall seconds and
// the done line the run total — the next stall names its package
// and phase in-log instead of reading as a hang.
const tPublish0 = Date.now()
const secs = (t) => ((Date.now() - t) / 1000).toFixed(1) + 's'
for (const file of order) {
  const tPkg = Date.now()
  const inner = JSON.parse(run('bash', ['-c', `tar -xzOf ${join(from, file)} package/package.json`]))
  const spec = `${inner.name}@${inner.version}`
  let have = false
  // --prefer-online: a stale packument cache (e.g. a previous local
  // registry run) must never make the pre-check answer "published"
  // for a registry that no longer carries the version. --no-probe
  // skips the view entirely: a run's rapid view burst counts against
  // the same account rate limit as publishes, and an already-up
  // version surfaces as 409/403 on the PUT (handled below).
  if (!noProbe) {
    try { run('npm', ['view', spec, 'version', '--prefer-online', ...registry]); have = true } catch { /* not on the registry yet */ }
  }
  if (have) { console.log(`skip ${spec} — already published (${secs(tPkg)})`); skipped++; continue }
  if (dryRun) { console.log(`dry-run ${spec} (${file})`); continue }
  // prerelease versions never touch the latest channel — npm refuses
  // a bare prerelease publish, and the release channel is 'next'
  const channel = inner.version.includes('-') ? ['--tag', 'next'] : []
  try {
    // npmjs rate-limits burst publishing (E429 on the second or third
    // package of a fresh scope) and can hold the limit window open
    // for a long stretch — back off and retry the SAME bytes; a rate
    // limit is transient, never a verdict on the package.
    let publishedOk = false
    for (let attempt = 0; !publishedOk && attempt < 7; attempt += 1) {
      try {
        run('npm', ['publish', join(from, file), '--access', 'public', ...channel, ...registry])
        publishedOk = true
      } catch (e) {
        // 429 is the account burst limit; E5xx and dropped sockets are
        // registry-side transients — the same sha256-gated bytes retry
        // through all of them.
        if (!/429|E5\d\d|ETIMEDOUT|ECONNRESET|socket hang up/.test(String(e.stderr ?? e.message))) throw e
        if (attempt === 6) break
        console.log(`… ${spec} rate-limited, backing off 60s×2^${attempt} (attempt ${attempt + 1}/7)`)
        await new Promise((r) => setTimeout(r, 60000 * Math.pow(2, attempt)))
      }
    }
    if (!publishedOk) {
      // The window held through the full backoff ladder: every row
      // behind this one is behind the same account wall. Defer the
      // rest of the pass instead of burning it row by row — the
      // caller's ladder retries the whole walk (exit 3).
      console.log(`… ${spec} still rate-limited after backoff — the account window is closed; deferring the rest of this pass`)
      break
    }
    if (paceMs > 0) await new Promise((r) => setTimeout(r, paceMs))
  } catch (e) {
    // npmjs answers a re-publish of OUR OWN staged version with 409
    // "Cannot publish over previously staged version" — and of an
    // already-propagated one with 403 "cannot publish over the
    // previously published versions" (a rate-limited client can see
    // an error for a publish the registry accepted). With the CDN
    // answering views lazily, the pre-check above can 404 a version
    // this very tool already landed. Both verdicts mean the bytes
    // are up — every retry sends the same sha256-gated tarball.
    // Anything else rethrows.
    const msg = String(e.stderr ?? e.message)
    if (!msg.includes('Cannot publish over previously staged version') && !msg.includes('cannot publish over the previously published versions')) throw e
    console.log(`✓ ${spec} (already on the registry, ${secs(tPkg)})`)
    // A re-stamp proves coverage, not a new submission — it must not
    // consume the batch budget: a slow promotion queue would otherwise
    // burn every pass re-stamping the same held rows and starve the
    // frontier. Only fresh PUTs count against --limit.
    published++
    continue
  }
  // the readback: the registry answers for it. npmjs's CDN answers a
  // fresh publish lazily (the local fake registry answers inline), so
  // one 404 readback is propagation, not a lost publish — the publish
  // command above already threw on any real failure. Retry through
  // the lag; a version that never appears is flagged, never fatal.
  let readback = false
  for (let i = 0; i < 10 && !readback; i++) {
    try { run('npm', ['view', spec, 'version', '--prefer-online', ...registry]); readback = true } catch { await new Promise((r) => setTimeout(r, 6000)) }
  }
  if (!readback) console.log(`⚠ ${spec} published but not yet readable — verify after the run (${secs(tPkg)})`)
  else console.log(`✓ ${spec} (${secs(tPkg)})`)
  published++
  batch += 1
  if (limit > 0 && batch >= limit) {
    console.log(`batch limit ${limit} reached after ${spec} — handing off, ${order.length - published - skipped} row(s) remain (exit 4)`)
    process.exit(4)
  }
}
console.log(`done: ${published} published, ${skipped} skipped, ${order.length} total (${secs(tPublish0)})`)
if (published + skipped < order.length) {
  console.error(`incomplete: ${order.length - published - skipped} row(s) not on the registry — the walk re-arms (exit 3)`)
  process.exit(3)
}
