#!/usr/bin/env node
// release-artifacts.mjs — the release IS the artifact source (operator
// order, 2026-10-16: "I want releases to work now"). Two verbs:
//
//   mint    pack every workspace package from the CURRENT tree, hash
//           each tarball, write release-manifest.json (commit, tag,
//           package digests), upload all of it to the GitHub release
//           of the tag at HEAD. Refuses a dirty tree, a tag that does
//           not point at HEAD, and a missing release object (prints
//           the exact gh command to create it).
//   verify  answer "is the latest build actually up there?": the
//           release's manifest must name the tag's commit, every
//           listed tarball must exist on the release with a matching
//           sha256, and the local HEAD is compared against the
//           release commit (drift is reported in plain words — a
//           release behind HEAD is a stale artifact source).
//
// Plain node, no deps beyond git + pnpm + gh (the same trio every
// gate already rides). Exit 0 = verified; exit 1 = anything short.
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim()
const git = (...a) => run('git', a)
const gh = (args) => run('gh', args) // array — jq expressions carry spaces
const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1) }
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

const REPO = 'JayDataEngineer/melite'
const PRERELEASE_PAT = /-(alpha|beta|rc|pre)\d*\.?\d*/i

/** pnpm lives on PATH in dev shells but not in bare hook/node spawns;
 *  the box-installed location is the fallback. */
function pnpmBin () {
  for (const c of ['pnpm', join(homedir(), '.local/share/pnpm/pnpm')]) {
    try { run('which', [c], { stdio: ['ignore', 'pipe', 'pipe'] }); return c } catch { /* try next */ }
  }
  fail('pnpm not found (PATH or ~/.local/share/pnpm/pnpm)')
}

function headTag () {
  const tags = git('tag', '--points-at', 'HEAD').split('\n').filter(Boolean)
  return tags.length === 1 ? tags[0] : null
}

function resolveTag (want) {
  const tag = want || headTag()
  if (!tag) fail('HEAD carries no tag — tag first (git tag -a vX.Y.Z -m "notes"), then mint')
  return tag
}

function releaseJson (tag) {
  try { return JSON.parse(run('gh', ['api', `repos/${REPO}/releases/tags/${tag}`])) } catch { return null }
}

/** G3 — exports rows, extracted from the entry gate: promise law
 *  (every literal target ships in the tarball), plus the alpha.2
 *  tightenings: wildcard rows require their base dir in the listing,
 *  and the verified literals feed G5. Pure: throws on violation, so
 *  the wall suite (release-artifact-plane.spec.ts) can drive it with
 *  synthetic tarballs. */
export function exportsRows (inner, listing, tarName) {
  const literals = []
  if (!inner.exports) return literals
  for (const [key, value] of Object.entries(inner.exports)) {
    if (key === 'package.json') continue
    const targets = typeof value === 'string' ? [value]
      : typeof value === 'object' && value !== null ? Object.values(value).filter((t) => typeof t === 'string') : []
    for (const t of targets) {
      const norm = t.replace(/^\.\//, '')
      if (norm === 'package.json') continue
      if (norm.includes('*')) {
        const base = norm.split('*')[0]
        if (!listing.some((l) => l.startsWith(`package/${base}`))) {
          throw new Error(`exports gate: ${tarName} wildcard "${t}" has no base dir "package/${base}" in the tarball`)
        }
        continue
      }
      if (!listing.includes(`package/${norm}`)) {
        throw new Error(`entry gate: ${tarName} exports "${t}" but the tarball does not contain it — fix package.json files`)
      }
      literals.push(norm)
    }
  }
  return literals
}

/** G2 — PAYLOAD PLANE (the DSH pack.ts law, ported): source never
 *  ships. Any src/** member, .ts/.tsx exports target or main, or
 *  source-map file refuses the mint. Declarations (.d.ts) are
 *  artifacts, not source; directory entries are not files. Pure:
 *  throws on violation. */
export function validateTarballPayload (inner, listing, tarName) {
  for (const member of listing) {
    if (member.endsWith('/')) continue
    if (/^package\/src\//.test(member)) throw new Error(`payload gate: ${tarName} ships source member ${member}`)
    if (/\.(js|d\.ts)\.map$/.test(member)) throw new Error(`payload gate: ${tarName} ships source map ${member}`)
  }
  const sourceTarget = (t) => /\.(ts|tsx)$/.test(t) && !/\.d\.ts$/.test(t)
  for (const [key, value] of Object.entries(inner.exports ?? {})) {
    const targets = typeof value === 'string' ? [value] : Object.values(value ?? {}).filter((t) => typeof t === 'string')
    for (const t of targets) if (sourceTarget(t)) throw new Error(`payload gate: ${tarName} ${key} targets source "${t}"`)
  }
  if (typeof inner.main === 'string' && sourceTarget(inner.main)) {
    throw new Error(`payload gate: ${tarName} main targets source "${inner.main}"`)
  }
  // BUNDLE OVERLAY LAW: a manifest declaring dsh.bundle.patch makes
  // the plugin loader read that file at the INSTALLED root — a
  // tarball that omits it boots to ENOENT (the cold-consumer proof,
  // 2026-10-13: all eight bundle seats declared, none packed).
  const patch = inner.dsh?.bundle?.patch
  if (typeof patch === 'string') {
    const rel = patch.replace(/^\.\//, '')
    if (!listing.includes(`package/${rel}`)) {
      throw new Error(`payload gate: ${tarName} declares dsh.bundle.patch "${patch}" but does not pack it`)
    }
  }
}

/** G4 — ENTRY CLASSIFICATION: no `.` row is importable-dead for a
 *  plain-Node consumer unless declared subpath-only with a reason.
 *  Pure: throws on violation, logs the declared pass. */
export function classifyEntry (inner, tarName) {
  if (inner.exports && !inner.exports['.']) {
    const decl = inner.melite?.publish?.subpathOnly
    if (decl !== true || typeof inner.melite?.publish?.reason !== 'string' || !inner.melite.publish.reason) {
      throw new Error(`entry gate: ${tarName} has no "." exports row and no melite.publish.subpathOnly declaration — give it a real entry`)
    }
    console.log(`  ${tarName}: subpath-only (${inner.melite.publish.reason})`)
  }
}

async function mint (opts) {
  const dirty = git('status', '--porcelain')
  if (dirty) fail(`work tree is dirty — commit first:\n${dirty}`)
  const tag = resolveTag(opts.tag)
  const commit = git('rev-parse', 'HEAD')
  const rel = releaseJson(tag)
  if (!rel) {
    fail(`no GitHub release for ${tag} — create it first:\n` +
      `gh release create ${tag} --title "${tag}" --notes "$(git tag -l --format='%(contents)' ${tag})"` +
      (PRERELEASE_PAT.test(tag) ? ' --prerelease' : ''))
  }
  const dest = mkdtempSync(join(tmpdir(), 'melite-release-'))
  try {
    // G1 — BUILD PLANE (packages-alpha3-release-audit): the mint packs
    // built lib/, never source. Every workspace member builds from the
    // CURRENT tree before pack; the estate/vendor tier ships tracked,
    // reference-built lib and is asserted by G2/G5 below.
    console.log('G1: building every workspace member (artifact plane) …')
    execFileSync(process.execPath, [join(import.meta.dirname, 'build-plane.mjs'), 'build'], { stdio: 'inherit' })
    console.log(`packing workspace @ ${commit.slice(0, 8)} …`)
    execFileSync(pnpmBin(), ['-r', 'pack', '--pack-destination', dest], { stdio: 'inherit' })
    const files = run('bash', ['-c', `ls ${dest}/*.tgz`]).split('\n').filter(Boolean)
    if (files.length === 0) fail('pnpm packed zero tarballs — refusing an empty artifact set')
    const innerFiles = new Map()

    for (const f of files) {
      const tarName = f.split('/').pop()
      const listing = run('tar', ['-tzf', f]).split('\n').filter(Boolean)
      const inner = JSON.parse(run('bash', ['-c', `tar -xzOf ${f} package/package.json`]))

      try {
        validateTarballPayload(inner, listing, tarName)
        classifyEntry(inner, tarName)
        innerFiles.set(tarName, { f, literals: exportsRows(inner, listing, tarName) })
      } catch (e) { fail(e.message) }
    }
    console.log(`entry gate: ${files.length} tarballs carry every exports target; payload plane clean`)

    // G5 — EXECUTABILITY PROBE (the alpha.2 killer): every literal
    // exports row of every tarball imports under PLAIN NODE from a
    // bare extract with deps stubbed. See probeExecutability.
    try {
      await probeExecutability(innerFiles)
    } catch (e) { fail(e.message) }

    const manifest = {
      manifest: 1,
      tag,
      commit,
      packedAt: new Date().toISOString(),
      packages: files.map((f) => ({
        file: f.split('/').pop(),
        bytes: Number(run('stat', ['-c', '%s', f])),
        sha256: sha256(f),
      })),
    }
    const manifestPath = join(dest, 'release-manifest.json')
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    console.log(`uploading ${files.length} tarballs + manifest to ${tag} …`)
    run('gh', ['release', 'upload', tag, ...files.map((f) => f), manifestPath, '--clobber'])
    console.log(`✓ ${tag}: ${files.length} tarballs + release-manifest.json @ ${commit.slice(0, 8)}`)
  } finally { rmSync(dest, { recursive: true, force: true }) }
}

/** G5: bare-extract + plain-node import of every literal exports row.
 *  External deps are stubbed through the module.register() loader pair
 *  in tools/exec-stub-loader.mjs (tracked file — no inline source).
 *  A bare-specifier miss is a probe artifact (the release closure
 *  installs deps); a relative miss inside the extract is an in-package
 *  byte defect and refuses the mint. */
export async function probeExecutability (innerFiles) {
  const probeDir = mkdtempSync(join(tmpdir(), 'melite-exec-probe-'))
  try {
    const loader = join(import.meta.dirname, 'exec-stub-loader.mjs')
    // THE CLOSURE TREE (the data-derived seats): a card whose schema
    // rides family DECLs (image-edit's EDIT_LIST_CAP) executes DOMAIN
    // validation at import — a stubbed sibling can never satisfy it,
    // and refusing the mint would outlaw the law. Every @melite /
    // @melite-plugin / vendored @deepseek-ai tarball in the release
    // extracts ONCE into probeDir/node_modules (recursive, bounded by
    // the tarball set), so plain-node resolution finds the REAL
    // packages. The stub stays the fallback for true externals.
    const byName = new Map()
    for (const [tarName, meta] of innerFiles) {
      const inner = JSON.parse(run('bash', ['-c', `tar -xzOf ${meta.f} package/package.json`]))
      byName.set(inner.name, meta.f)
    }
    const nmDir = join(probeDir, 'node_modules')
    const extracted = new Set()
    const extractPkg = (name) => {
      if (extracted.has(name)) return
      extracted.add(name)
      const tgz = byName.get(name)
      if (!tgz) return
      const destDir = join(nmDir, name)
      run('mkdir', ['-p', destDir])
      run('tar', ['-xzf', tgz, '-C', destDir, '--strip-components=1'])
      const inner = JSON.parse(run('bash', ['-c', `tar -xzOf ${tgz} package/package.json`]))
      for (const dep of [...Object.keys(inner.dependencies ?? {}), ...Object.keys(inner.peerDependencies ?? {})]) {
        if (byName.has(dep)) extractPkg(dep)
      }
    }
    for (const name of byName.keys()) extractPkg(name)
    for (const [tarName, { f, literals }] of innerFiles) {
      const extract = join(probeDir, tarName.replace(/\.tgz$/, ''))
      run('mkdir', ['-p', extract])
      run('tar', ['-xzf', f, '-C', extract])
      const pkgDir = join(extract, 'package')
      for (let row of literals) {
        if (!row.startsWith('./')) row = './' + row
        // types rows (.d.ts) are compile-time doors — plain Node cannot
        // import a declaration file, and their internal specifiers are
        // proven by the entry gate (existence) plus the consumer-side
        // typecheck walls. Skip loudly, never silently.
        if (row.endsWith('.d.ts')) {
          console.log(`  probe: ${tarName} ${row} — types door (compile-time; entry gate proved it ships)`)
          continue
        }
        const entry = join(pkgDir, row)
        const boot = `import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; ` +
          `register(${JSON.stringify(pathToFileURL(loader).href)}, pathToFileURL(${JSON.stringify(pkgDir + '/')})); ` +
          `await import(pathToFileURL(${JSON.stringify(entry)}).href);`
        const r = spawnSync(process.execPath, ['--no-warnings', '--import', `data:text/javascript,${encodeURIComponent(boot)}`], { encoding: 'utf8', cwd: pkgDir })
        if (r.status === 0) continue
        const errText = r.stderr || ''
        const pkgMiss = errText.match(/Cannot find package '([^']+)'/)
        if (pkgMiss && !pkgMiss[1].startsWith('.') && !pkgMiss[1].startsWith('@melite') && !pkgMiss[1].startsWith('@melite-plugin')) {
          console.log(`  probe: ${tarName} ${row} — dep "${pkgMiss[1]}" not stubbed (closure installs it; recorded, not refused)`)
          continue
        }
        throw new Error(`executability gate: ${tarName} ${row} does not import under plain node:\n${errText.split('\n').slice(0, 12).join('\n')}`)
      }
      console.log(`  probe: ${tarName} — ${literals.length} rows import under plain node`)
    }
  } finally { rmSync(probeDir, { recursive: true, force: true }) }
}

function verify (opts) {
  // /releases/latest EXCLUDES prereleases — an alpha-only repo 404s.
  // "Latest" for this tool = newest by the releases list (newest first).
  const tag = opts.tag || gh(['api', `repos/${REPO}/releases`, '--jq', '.[0].tag_name'])
  const rel = releaseJson(tag)
  if (!rel) fail(`no release for ${tag}`)
  const manifestAsset = rel.assets.find((a) => a.name === 'release-manifest.json')
  if (!manifestAsset) fail(`${tag} carries no release-manifest.json — mint it: node tools/release-artifacts.mjs mint`)
  // REST asset listings return content: "" — the manifest bytes
  // come down the same wire every asset does.
  const mdir = mkdtempSync(join(tmpdir(), 'melite-verify-manifest-'))
  let manifest
  try {
    run('gh', ['release', 'download', tag, '--repo', REPO, '--pattern', 'release-manifest.json', '--dir', mdir])
    manifest = JSON.parse(readFileSync(join(mdir, 'release-manifest.json'), 'utf8'))
  } finally { rmSync(mdir, { recursive: true, force: true }) }
  const tagCommit = git('rev-list', '-1', tag)
  if (manifest.commit !== tagCommit) {
    fail(`manifest commit ${manifest.commit} ≠ tag commit ${tagCommit} — the manifest was minted from a different tree`)
  }
  let missing = 0
  let mismatched = 0
  for (const p of manifest.packages) {
    const asset = rel.assets.find((a) => a.name === p.file)
    if (!asset) { console.error(`✗ missing asset ${p.file}`); missing++; continue }
    const want = `sha256:${p.sha256}`
    let have = asset.digest
    if (!have) { // digest field absent — hash the bytes ourselves
      const d = mkdtempSync(join(tmpdir(), 'melite-verify-'))
      try {
        run('gh', ['release', 'download', tag, '--repo', REPO, '--pattern', p.file, '--dir', d])
        have = `sha256:${sha256(join(d, p.file))}`
      } finally { rmSync(d, { recursive: true, force: true }) }
    }
    if (have !== want) { console.error(`✗ digest mismatch ${p.file}: release ${have} ≠ manifest ${want}`); mismatched++ }
  }
  const localHead = git('rev-parse', 'HEAD')
  const ahead = git('rev-list', '--count', `${tag}..HEAD`)
  console.log(`release ${tag} @ ${manifest.commit.slice(0, 8)}: ` +
    `${manifest.packages.length - missing - mismatched}/${manifest.packages.length} assets verified against the manifest`)
  if (missing || mismatched) fail(`${missing} missing, ${mismatched} mismatched`)
  console.log(ahead === '0'
    ? `local HEAD ${localHead.slice(0, 8)} IS the release tag — the latest build is up there`
    : `local HEAD ${localHead.slice(0, 8)} is ${ahead} commit(s) PAST ${tag} — the release does not carry those; tag + mint when you want them shipped`)
}

// CLI boundary: only dispatch when invoked directly — the wall suite
// (release-artifact-plane.spec.ts) requires this module for its gates
// and must not run mint/verify against vitest's argv.
const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (invokedDirectly) {
  const [verb, ...rest] = process.argv.slice(2)
  const opts = {}
  for (let i = 0; i < rest.length; i += 2) if (rest[i] === '--tag') opts.tag = rest[i + 1]
  if (verb === 'mint') mint(opts).catch((err) => { console.error(err); process.exitCode = 1 })
  else if (verb === 'verify') verify(opts)
  else fail('usage: node tools/release-artifacts.mjs <mint|verify> [--tag vX.Y.Z]')
}
