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
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

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

function mint (opts) {
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
    console.log(`packing workspace @ ${commit.slice(0, 8)} …`)
    execFileSync(pnpmBin(), ['-r', 'pack', '--pack-destination', dest], { stdio: 'inherit' })
    const files = run('bash', ['-c', `ls ${dest}/*.tgz`]).split('\n').filter(Boolean)
    if (files.length === 0) fail('pnpm packed zero tarballs — refusing an empty artifact set')
    // THE ENTRY GATE (2026-10-16, the consumer-side receipt): a
    // files allowlist that omits the package's own exports entry
    // ships an importable-dead tarball — npm pack drops what the
    // manifest does not list. Every tarball's manifest is read from
    // INSIDE the tar and each literal exports target must be present
    // in the listing. Refuse the whole mint on any miss.
    for (const f of files) {
      const listing = run('tar', ['-tzf', f]).split('\n').filter(Boolean)
      const inner = JSON.parse(run('bash', ['-c',
        `tar -xzOf ${f} package/package.json`]))
      if (!inner.exports) continue
      for (const [key, value] of Object.entries(inner.exports)) {
        if (key === 'package.json') continue
        const targets = typeof value === 'string' ? [value]
          : typeof value === 'object' && value !== null ? Object.values(value).filter((t) => typeof t === 'string') : []
        for (const t of targets) {
          const norm = t.replace(/^\.\//, '')
          if (norm === 'package.json' || norm.includes('*')) continue
          if (!listing.includes(`package/${norm}`)) {
            fail(`entry gate: ${f.split('/').pop()} exports "${t}" but the tarball does not contain it — fix package.json files`)
          }
        }
      }
    }
    console.log(`entry gate: ${files.length} tarballs carry every exports target`)
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

const [verb, ...rest] = process.argv.slice(2)
const opts = {}
for (let i = 0; i < rest.length; i += 2) if (rest[i] === '--tag') opts.tag = rest[i + 1]
if (verb === 'mint') mint(opts)
else if (verb === 'verify') verify(opts)
else fail('usage: node tools/release-artifacts.mjs <mint|verify> [--tag vX.Y.Z]')
