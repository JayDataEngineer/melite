#!/usr/bin/env node
// release-rehearsal.mjs — cold-consumer rehearsal as one command.
//
// Rebuilds a disposable container from a pinned image every run, installs
// the shipped dsh CLI + pinned pnpm, drives the official plugin verb over
// a release tarball set, and checks the install receipts mechanically.
// No registry process, no state between runs: the set resolves through
// the pnpm overrides map derived from release-manifest.json (the
// self-contained-closure law — every manifest row pins its tarball).
//
// The dist set itself is verified before any container starts: every
// tarball's sha256 and byte size against the manifest, every package's
// publishConfig, the strip law through the SAME tool the mint runs, and
// every packed overlay's plugin rows against the in-set name map (a
// row naming a package absent from the set is a fresh-boot killer).
//
// Usage:
//   node tools/release-rehearsal.mjs --dist /var/tmp/melite-scratch/dist-npm
//   node tools/release-rehearsal.mjs --tag v0.4.0-alpha.5   # downloads release assets
//   --keep        leave the container up for inspection
//
// Exit 0 iff every receipt passes.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

// host-side scratch root: /var/tmp/melite-scratch, never the box
// /tmp tmpfs (the strip pass extracts every packed tarball here)
const SCRATCH = '/var/tmp/melite-scratch'
import { join, resolve } from 'node:path'
import { stripLeakageComments } from './strip-artifact-comments.mjs'

const CONTAINER = 'melite-rehearsal'
const IMAGE = 'node:22-bookworm'
const DSH_VERSION = '0.2.0-rc.2'
const PNPM_VERSION = '10.33.2'
const PROFILE = 'rehearsal'
// the seed ORDER for the profile's bundle stack (mount order matters);
// drops and additions are caught by the derived-bundle-set receipt and
// the dump-config warning-absence receipt, not by this list itself.
const BUNDLES = [
  '@melite/harness-tools',
  '@melite/harness-provisioner',
  '@melite-plugin/dsh-estate',
  '@melite-plugin/dsh-card-deck',
  '@melite-plugin/dsh-card-view',
  '@melite-plugin/dsh-gallery',
  '@melite/motion-motion',
  '@melite/video-h3-timeline',
]
// profile-template members whose template rows pin the previous rc
// (the shipped rc.2 template still names rc.1 for these four); pinned
// at the runtime version so the peer check never disables them
const SKEW_PINNED = [
  'dsh-api-gateway',
  'dsh-storage-json',
  'dsh-storage-domain',
  'dsh-subprocess-local',
]

const WEB_PORT = '3217'
const STRIP_EXT = /\.(js|mjs|cjs|css|d\.ts)$/

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? null : args[i + 1]
}
const KEEP = args.includes('--keep')

const log = (m) => console.log(m)
const die = (m) => { console.error(`rehearsal: ${m}`); process.exit(1) }

const run = (cmd, opts = {}) => {
  const r = spawnSync(cmd[0], cmd.slice(1), { encoding: 'utf8', ...opts })
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}

const docker = (sub, opts) => run(['docker', ...sub], opts)
const inBox = (shell, opts = {}) =>
  docker(['exec', '-u', 'node', CONTAINER, 'bash', '-c', `set -o pipefail; ${shell}`], opts)

const receipts = []
const check = (name, ok, detail) => {
  receipts.push({ name, ok, detail })
  log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

// --- 1. resolve the release set --------------------------------------------
let distDir = flag('--dist')
const tag = flag('--tag')
if (!distDir && !tag) die('pass --dist DIR or --tag vX.Y.Z')
if (!distDir) {
  distDir = join(SCRATCH, `rehearsal-${tag}`)
  rmSync(distDir, { recursive: true, force: true })
  mkdirSync(distDir, { recursive: true })
  log(`[1/6] downloading release assets for ${tag}`)
  const r = run(['gh', 'release', 'download', tag, '--repo', 'JayDataEngineer/melite',
    '--dir', distDir, '--clobber'])
  if (r.code !== 0) die(`gh release download failed: ${r.out.slice(0, 400)}`)
} else {
  distDir = resolve(distDir)
}
const manifestPath = join(distDir, 'release-manifest.json')
if (!existsSync(manifestPath)) die(`no release-manifest.json in ${distDir}`)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
if (tag && manifest.tag !== tag) {
  die(`manifest tag ${manifest.tag} != requested ${tag} — the set is not what was asked for`)
}
if (!manifest.commit) die('manifest carries no commit — the set is not attributable')
log(`[1/6] dist set: ${distDir}`)
log(`      tag ${manifest.tag} @ ${String(manifest.commit).slice(0, 12)} (${manifest.packages?.length ?? '?'} packages, packed ${manifest.packedAt})`)

// --- 2. dist verification + the offline map ---------------------------------
log('[2/6] verifying the dist set, then deriving the offline map')
const pkgs = manifest.packages
if (!Array.isArray(pkgs) || pkgs.length === 0) die('manifest has no packages')
const overrides = {}
const versions = {}
const inners = {}
for (const row of pkgs) {
  const { file } = row
  const tarPath = join(distDir, file ?? '')
  if (!file || !existsSync(tarPath)) die(`tarball missing from set: ${file}`)
  // byte-level identity: the manifest is the authority (publish-npm's law)
  const bytes = readFileSync(tarPath)
  if (row.bytes !== undefined && row.bytes !== bytes.length) {
    die(`${file}: ${bytes.length} bytes on disk, manifest says ${row.bytes}`)
  }
  if (row.sha256) {
    const have = createHash('sha256').update(bytes).digest('hex')
    if (have !== row.sha256) die(`${file}: sha256 mismatch (manifest ${row.sha256}, disk ${have})`)
  }
  const inner = JSON.parse(
    run(['bash', '-c', `tar -xzOf "${tarPath}" package/package.json`]).out)
  if (!inner.name || !inner.version) die(`${file} carries no name/version`)
  overrides[inner.name] = `file:/assets/${file}`
  versions[inner.name] = inner.version
  inners[inner.name] = inner
}
const rootPkg = versions['@melite/harness-tools']
if (!rootPkg) die('manifest has no @melite/harness-tools row')

// publishConfig: every seat, not one — and `private` must not survive
const notPublic = Object.values(inners).filter((p) =>
  p.publishConfig?.access !== 'public' || p.private === true).map((p) => p.name)
check('publishConfig access public, private dropped — every seat', notPublic.length === 0,
  notPublic.join(', ') || `${Object.keys(inners).length} seats`)

// strip law through the mint's own tool: extract every packable source
// file and demand the stripper finds nothing left to strip
const stripScratch = join(SCRATCH, 'rehearsal-strip')
rmSync(stripScratch, { recursive: true, force: true })
mkdirSync(stripScratch, { recursive: true })
let stripHits = 0
const stripOffenders = []
for (const row of pkgs) {
  const tarPath = join(distDir, row.file)
  const listing = run(['bash', '-c', `tar -tzf "${tarPath}"`]).out.split('\n')
    .map((l) => l.trim()).filter(Boolean)
  const wanted = listing.filter((m) => m.startsWith('package/') && STRIP_EXT.test(m))
  if (wanted.length === 0) continue
  const outDir = join(stripScratch, row.file)
  mkdirSync(outDir, { recursive: true })
  run(['bash', '-c', `tar -xzf "${tarPath}" -C "${outDir}" ${wanted.map((w) => `'${w}'`).join(' ')}`])
  for (const m of wanted) {
    const raw = readFileSync(join(outDir, m), 'utf8')
    if (stripLeakageComments(raw) !== raw) {
      stripHits++
      stripOffenders.push(`${row.file}!${m}`)
    }
  }
}
rmSync(stripScratch, { recursive: true, force: true })
check('strip law holds in the packed bytes (the mint tool itself)', stripHits === 0,
  stripHits === 0 ? `${Object.keys(inners).length} seats scanned` : stripOffenders.slice(0, 4).join(' '))

// overlay law (G6): every packed overlay's plugin row names its own
// package, or an in-set package's declared exports subpath (the doors
// seam mounts @melite/harness-tools/doors). Anything else cannot
// resolve for a cold consumer — the infer-estate twin's class.
const packedMap = new Map(Object.entries(inners).map(([name, inner]) => [name,
  new Set(['', ...Object.keys(inner.exports ?? {}).map((k) => k.replace(/^\.\//, ''))])]))
const overlayOffenders = []
const bundleSeats = []
for (const [name, inner] of Object.entries(inners)) {
  if (!inner.dsh?.bundle?.patch) continue
  bundleSeats.push(name)
  const file = pkgs.find((p) => overrides[name].endsWith(p.file)).file
  const overlay = run(['bash', '-c', `tar -xzOf "${join(distDir, file)}" package/cordis.patch.yml`]).out
  const rows = [...overlay.matchAll(/^\s*-\s*id:\s*(\S+)[\s\S]*?^\s*name:\s*['\"]?([^'\"\s]+)/gm)]
  for (const m of rows) {
    const parts = m[2].split('/')
    const take = m[2].startsWith('@') ? 2 : 1
    const head = parts.slice(0, take).join('/')
    const tail = parts.slice(take).join('/')
    if (!packedMap.get(head)?.has(tail)) overlayOffenders.push(`${name}: row ${m[1]} -> ${m[2]}`)
  }
}
check('every overlay row names an in-set package', overlayOffenders.length === 0,
  overlayOffenders.length === 0 ? `${bundleSeats.length} bundle overlays scanned` : overlayOffenders.slice(0, 4).join(' '))
log(`      bundle seats in this set: ${bundleSeats.length}`)

// --- 3. fresh container from the pinned image ------------------------------
log(`[3/6] rebuilding container ${CONTAINER} from ${IMAGE}`)
docker(['rm', '-f', CONTAINER])
const up = docker(['run', '-d', '--name', CONTAINER, '-v', `${distDir}:/assets:ro`,
  '-w', '/home/node', IMAGE, 'sleep', 'infinity'])
if (up.code !== 0) die(`docker run failed: ${up.out.slice(0, 400)}`)

// --- 4. toolchain: shipped dsh CLI + pinned pnpm ---------------------------
log('[4/6] installing toolchain (no repo on the box)')
let r = inBox('npm config set prefix ~/.local-npm && npm install -g @deepseek-ai/dsh@' + DSH_VERSION +
  ' >/tmp/i.log 2>&1; tail -2 /tmp/i.log', { timeout: 600000 })
if (r.code !== 0) die(`dsh install failed: ${r.out.slice(0, 400)}`)
r = inBox('corepack enable --install-directory ~/.local-npm/bin >/dev/null 2>&1; ' +
  'corepack prepare pnpm@' + PNPM_VERSION + ' --activate 2>&1 | tail -1')
if (r.code !== 0) die(`corepack pnpm failed: ${r.out.slice(0, 400)}`)
log(`  dsh@${DSH_VERSION} + pnpm@${PNPM_VERSION} ready`)

// --- 5. the official consumer sequence -------------------------------------
log('[5/6] official install: dsh plugin add → offline map → dsh plugin install')
const PATH = 'export PATH=$HOME/.local-npm/bin:$PATH'
r = inBox(`${PATH}; dsh plugin --profile ${PROFILE} add @melite/harness-tools@${rootPkg} 2>&1 | tail -3`)
// Pre-publish the registry lookup fails (404 / auth-header noise / a
// name that EXISTS with older versions — pnpm's no-matching-version
// hint quotes "the full list of all N published versions"); the verb
// still initializes the profile. Post-GO the same command succeeds.
// Both shapes are accepted; every other exit dies.
if (r.code !== 0 &&
    !/404|not published|ENEEDAUTH|E404|authorization|not in the npm registry|NO_MATCHING_VERSION|published versions/i.test(r.out)) {
  die(`dsh plugin add failed unexpectedly: ${r.out.slice(0, 400)}`)
}

const profileDir = `/home/node/.dsh/profiles/${PROFILE}`
const dependencies = Object.fromEntries(
  Object.entries(versions).filter(([name]) =>
    name.startsWith('@melite/') || name.startsWith('@melite-plugin/')))
// the base bundle + the profile-template members that skew are pinned
// to the CLI's own version: an unversioned or template-pinned row
// resolves the registry's stale tag (rc.1 against the rc.2 runtime)
// and the peer-skew wall disables the member — storage-domain took
// storageDomain down, api-gateway took the web app's connection down,
// and the boot died with entries pending on services that never came
dependencies['@deepseek-ai/dsh-base'] = DSH_VERSION
// the web app plugin is the webServer provider every real web profile
// carries — without it `dsh web` activates nothing to serve and the
// melite web plugins sit pending forever
dependencies['@deepseek-ai/dsh-web-app'] = DSH_VERSION
for (const m of SKEW_PINNED) dependencies['@deepseek-ai/' + m] = DSH_VERSION
const seed = {
  name: `dsh-profile-${PROFILE}`,
  private: true,
  dependencies,
  dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', ...BUNDLES] } },
}
const seedPath = join(SCRATCH, 'rehearsal-seed.json')
writeFileSync(seedPath, JSON.stringify(seed, null, 2))
r = docker(['cp', seedPath, `${CONTAINER}:${profileDir}/package.json`])
if (r.code !== 0) die(`seeding profile failed: ${r.out.slice(0, 400)}`)
// the shipped dsh profile template's own workspace law (dsh-app-boot's
// PROFILE_PNPM_WORKSPACE): hoisted linking is the shape bundle
// reconciliation and web boot were proved on
const workspacePath = join(SCRATCH, 'rehearsal-workspace.yaml')
writeFileSync(workspacePath, [
  'packages:', '  - .', '',
  'nodeLinker: hoisted', 'autoInstallPeers: false', '',
  '# every manifest row pins its tarball (self-contained-closure law)',
  'overrides:', ...Object.entries(overrides).map(([name, path]) =>
    `  ${JSON.stringify(name)}: ${path}`),
  ...SKEW_PINNED.map((m) => `  '@deepseek-ai/${m}': ${DSH_VERSION}`), '',
].join('\n'))
r = docker(['cp', workspacePath, `${CONTAINER}:${profileDir}/pnpm-workspace.yaml`])
if (r.code !== 0) die(`seeding workspace failed: ${r.out.slice(0, 400)}`)

const t0 = Date.now()
r = inBox(`${PATH}; cd ${profileDir} && dsh plugin --profile ${PROFILE} install 2>&1 | tail -4`,
  { timeout: 900000 })
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
if (r.code !== 0) die(`dsh plugin install failed (${elapsed}s): ${r.out.slice(0, 600)}`)
log(`  install EXIT 0 in ${elapsed}s`)

// --- 6. receipts ------------------------------------------------------------
log('[6/6] receipts')
const NM = `${profileDir}/node_modules`
const count = (glob) =>
  inBox(`ls ${NM}/${glob} 2>/dev/null | wc -l`).out.trim()

const meliteSeats = count('@melite')
const pluginSeats = count('@melite-plugin')
const names = Object.keys(versions)
const pluginRows = names.filter((n) => n.startsWith('@melite-plugin/')).length
const libRowSet = names.filter((n) => n.startsWith('@melite/') && !n.startsWith('@melite-plugin/')).length
check('seats materialize as real directories',
  Number(meliteSeats) === libRowSet && Number(pluginSeats) === pluginRows,
  `@melite ${meliteSeats}/${libRowSet}, @melite-plugin ${pluginSeats}/${pluginRows}`)

const linkRows = inBox(`grep -c "link:" ${profileDir}/pnpm-lock.yaml || true`).out.trim()
check('zero link: rows (no dev shape)', linkRows === '0', `${linkRows} rows`)

const gitDirs = inBox(`find ${NM} -maxdepth 3 -name .git 2>/dev/null | wc -l`).out.trim()
check('zero git clones', gitDirs === '0', `${gitDirs} .git dirs`)

const overlayOk = bundleSeats.every((b) =>
  existsInBox(`${NM}/${b}/cordis.patch.yml`))
check('bundle overlays ship at installed roots (set derived from the dist)', overlayOk,
  bundleSeats.filter((b) => !existsInBox(`${NM}/${b}/cordis.patch.yml`)).join(', ') ||
  `all ${bundleSeats.length} present`)

const dump = inBox(`${PATH}; dsh --profile ${PROFILE} --dump-config 2>&1`)
// the warning-absence law: dsh skips unresolved declared bundles with a
// warning, so a plain inclusion check passes on a gutted stack. The dump
// must carry no skip/failure markers at all, and every seat whose host
// half contributes plugins or services must appear by name.
// CLIENT-CARRIAGE SEATS are the exception: card-base and three-client
// mount the browser graph's one compiled instance (the one-row law) and
// their host halves register nothing node-side by design — the dump can
// never carry them. Their positive receipt is the client subpath
// resolving from the installed profile, the loader's own require.
const CLIENT_ONLY = ['@melite/card-base', '@melite/three-client']
const dumpSeats = bundleSeats.filter((b) => !CLIENT_ONLY.includes(b))
const dumpWarn = dump.out.match(/cannot resolve profile bundle|failed to import|skipped (bundle|plugin)/gi) || []
const layersOk = dump.code === 0 && dumpSeats.every((b) => dump.out.includes(b)) &&
  dumpWarn.length === 0
check('dump-config carries every host-contributing layer, zero skips', layersOk,
  (layersOk ? `all ${dumpSeats.length} layers` :
    `${dumpWarn.length} skip markers; missing: ${dumpSeats.filter((b) => !dump.out.includes(b)).join(', ')}`))
if (dump.code === 0) {
  writeFileSync(join(SCRATCH, 'rehearsal-dump-config.txt'), dump.out)
}
const clientMiss = CLIENT_ONLY.filter((b) =>
  inBox(`${PATH}; cd ${profileDir} && node -e "require.resolve('${b}/client')" >/dev/null 2>&1`).code !== 0)
check('client-carriage seats resolve their client subpath (the one-row law)',
  clientMiss.length === 0,
  clientMiss.length === 0 ? `${CLIENT_ONLY.length} resolve` : `unresolved: ${clientMiss.join(', ')}`)

// web boot: bring it up, poll, tear down
// with dsh-web-app layered, `dsh --profile X` boots the browser UI
// directly — a `web` app-arg is rejected ("Expected 0 arguments").
// --no-open: the container is headless; the default browser-open
// attempt is what silently killed the boot process
const boot = inBox(`${PATH}; nohup dsh --profile ${PROFILE} --no-open --port ${WEB_PORT} >/tmp/web.log 2>&1 & echo started`)
// the web receipt is the browser-trust fence's own contract: the boot
// prints the token holder's URL (the server is up and serving), the
// token URL answers 303 (token accepted, session cookie issued — the
// exact hop a browser makes), and bare / answers 401 to a stranger
// (the fence fencing). Following past the 303 requires a real browser
// handshake by design; a cold-consumer receipt stops at the door.
let webOk = false
let webDetail = 'no served URL within 60s'
if (boot.code === 0) {
  for (let i = 0; i < 30; i++) {
    await new Promise((res) => setTimeout(res, 2000))
    const url = inBox(`grep -o 'http://[^ ]*' /tmp/web.log | tail -1`).out.trim()
    if (!url) continue
    const token = inBox(`curl -s -o /dev/null -w '%{http_code}' '${url}' || true`).out.trim()
    const stranger = inBox(`curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:${WEB_PORT}/' || true`).out.trim()
    if (token === '303' && stranger === '401') {
      webOk = true
      webDetail = `serving :${WEB_PORT} — token 303, stranger 401`
      break
    }
    webDetail = `token ${token}, stranger ${stranger}`
  }
  const log = inBox(`cat /tmp/web.log`).out
  const badBoot = /did not activate|startup failed|disabling profile plugin row/.test(log)
  if (badBoot) { webOk = false; webDetail = 'activation failures in the boot log' }
  inBox(`pkill -f "dsh --profile" 2>/dev/null; true`)
}
check('dsh web boots clean on the stack', webOk, webDetail)

function existsInBox(p) {
  return inBox(`test -e ${p}`).code === 0
}

// --- verdict ----------------------------------------------------------------
const failed = receipts.filter((x) => !x.ok)
log('')
log(`rehearsal: ${receipts.length - failed.length}/${receipts.length} receipts pass${KEEP ? ' (container kept)' : ''}`)
if (!KEEP) docker(['rm', '-f', CONTAINER])
process.exit(failed.length === 0 ? 0 : 1)
