#!/usr/bin/env node
/**
 * infer-provision — profile provisioner for vanilla DSH installs.
 *
 * The bundle patch (cordis.patch.yml) covers the ROWS; this bin covers
 * the PROFILES: renders ready-to-boot profile dirs (inference / headless
 * / any name), installs the Inference Studio agent preset, and health-
 * checks the gateway. Self-locating — every path derives from this
 * file's own location (the provisioner package and its siblings), so a
 * family re-split or repo move changes nothing.
 *
 * Usage:
 *   infer-provision all                    # profiles + preset + check
 *   infer-provision profile <name>         # render one profile dir
 *   infer-provision preset                 # install the agent preset
 *   infer-provision check                  # gateway health
 * Flags:
 *   --dsh-home <dir>   default $DSH_HOME || ~/.dsh
 *   --gateway <url>    default $MELITE_GATEWAY || http://localhost:33081
 *
 * Rendered profiles mount the SAME rows the bundle patch mounts (the
 * profile's cordis.patch.yml user layer stays EMPTY by design — the
 * bundle owns the rows, so `dsh plugin add` and rendered profiles can
 * never drift apart). The template pins: our bundle + the dsh web base
 * for 'inference', the plain headless base for 'headless'.
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const HERE = dirname(fileURLToPath(import.meta.url))
const PROVISIONER = dirname(HERE) // bin/ -> the provisioner package itself

// ── args ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const cmd = argv[0] || 'all'
const flag = (name, dflt) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt
}
const DSH_HOME = flag('--dsh-home', process.env.DSH_HOME || join(process.env.HOME || '~', '.dsh'))
const GATEWAY = flag('--gateway', process.env.MELITE_GATEWAY || 'http://localhost:33081')
const PROFILE = argv[1] && !argv[1].startsWith('--') ? argv[1] : 'inference'

const log = (...a) => console.log(...a)
const die = (msg) => { console.error('infer-provision: ' + msg); process.exit(1) }

// ── profile rendering ───────────────────────────────────────────────────
const PROFILE_BASES = {
  // inference = the studio: web app base + our rows (the GUI experience)
  inference: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@infer/dsh-provisioner'],
  // headless = the agent server: one-shot task runner + our tool rows
  headless: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-headless', '@infer/dsh-provisioner'],
}

function renderProfile(name) {
  // In-box bundles (@deepseek-ai/*) resolve from the DSH INSTALL, never
  // from a registry - only OUR link goes in dependencies. Mirrors what
  // `dsh plugin` itself initializes (PROFILE_TEMPLATES + reconcile).
  const bundles = PROFILE_BASES[name] || PROFILE_BASES.headless
  const dst = join(DSH_HOME, 'profiles', name)
  mkdirSync(dst, { recursive: true })
  const link = 'link:' + PROVISIONER

  // pnpm does NOT materialize a link: dependency's OWN link: deps —
  // the bundle rows name five plugin PACKAGES, so each becomes a DIRECT
  // link: dep here, resolved from this provisioner's own manifest
  // (relative link:../ specs resolve against the provisioner dir).
  const provPkg = JSON.parse(readFileSync(join(PROVISIONER, 'package.json'), 'utf8'))
  const rowDeps = {}
  for (const [depName, spec] of Object.entries(provPkg.dependencies || {})) {
    if (String(spec).startsWith('link:')) rowDeps[depName] = 'link:' + resolve(PROVISIONER, String(spec).slice(5))
  }

  const pkgPath = join(dst, 'package.json')
  let pkg = { name: 'dsh-profile-' + name, private: true, dependencies: {} }
  if (existsSync(pkgPath)) {
    try { pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) } catch { /* re-render */ }
  }
  pkg.name = pkg.name || 'dsh-profile-' + name
  pkg.private = true
  pkg.dependencies = { ...rowDeps, ...(pkg.dependencies || {}), '@infer/dsh-provisioner': link }
  pkg.dsh = { profile: { bundles: [
    ...new Set([...((pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) || []), ...bundles]),
  ] } }
  writeFileSync(join(dst, 'package.json'), JSON.stringify(pkg, null, 2) + String.fromCharCode(10))
  // user layer stays EMPTY in web mounts — the bundle patch owns every
  // row (no drift). NON-web mounts (headless/SDK) get the five web-
  // surface rows mechanically DISABLED: no webServer service exists to
  // activate them. The bundle owns the rows; the renderer owns the
  // per-app mount shape.
  const webMount = bundles.includes('@deepseek-ai/dsh-web-app')
  const webRows = ['infer-card-view-host', 'infer-card-view-client',
                   'infer-card-deck', 'infer-media', 'infer-gallery-host']
  writeFileSync(join(dst, 'cordis.patch.yml'),
    webMount
      ? '# rendered by infer-provision - rows live in the bundle' + '\n' + '[]' + '\n'
      : '# rendered by infer-provision - rows live in the bundle.\n'
        + '# No webServer service in this mount: the five web-surface rows\n'
        + '# are disabled so activation cannot pend forever.\n'
        + webRows.map(id => '- id: ' + id + '\n  disabled: true\n').join(''))
  writeFileSync(join(dst, 'cordis.yml'), '# rendered by infer-provision' + '\n' + '[]' + '\n')
  const ws = join(dst, 'pnpm-workspace.yaml')
  if (!existsSync(ws)) writeFileSync(ws, 'packages:' + '\n' + '  - node_modules/*' + '\n')

  log('rendered profile :', dst)
  log('  bundles        :', bundles.join(', '))
  return dst
}

function installDeps(profileDir) {
  const pm = execSync('command -v pnpm || true').toString().trim()
    || join(process.env.HOME || '', '.local/share/pnpm/pnpm')
  if (!existsSync(pm)) {
    log('  WARNING: pnpm not found — run manually: (cd ' + profileDir + ' && pnpm install)')
    return false
  }
  log('  installing deps with', pm, '…')
  execSync('"' + pm + '" install', { cwd: profileDir, stdio: 'inherit' })
  return true
}

// ── agent preset ────────────────────────────────────────────────────────
function installPreset() {
  const src = join(PROVISIONER, '../inference-studio')
  if (!existsSync(join(src, 'preset.yml'))) die('preset source missing at ' + src)
  const dst = join(DSH_HOME, '.agent-presets/inference-studio')
  mkdirSync(dst, { recursive: true })
  copyFileSync(join(src, 'preset.yml'), join(dst, 'preset.yml'))
  copyFileSync(join(src, 'agent.cordis.yml'), join(dst, 'agent.cordis.yml'))
  log('preset installed  :', dst)
}

// ── gateway health ──────────────────────────────────────────────────────
async function check() {
  const url = GATEWAY.replace(/\/$/, '') + '/v1/model-catalog'
  let body
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    body = await res.json()
  } catch (e) {
    log('gateway           : DOWN (' + url + ') — ' + e.message)
    log('  start it, or pass --gateway http://host:port')
    return false
  }
  const lanes = Object.keys(body.lanes || body.families || {}).length
  const models = body.model_count ?? Object.keys(body.models || {}).length
  log('gateway           : UP  ' + url)
  log('  lanes/models    : ' + lanes + ' / ' + models)
  return true
}

// ── main ────────────────────────────────────────────────────────────────
switch (cmd) {
  case 'all': {
    for (const name of ['inference', 'headless']) installDeps(renderProfile(name))
    installPreset()
    await check()
    log('boot with:')
    log('  dsh web --profile inference          # the studio GUI')
    log('  dsh --profile headless "<task>"      # one-shot agent with card tools')
    break
  }
  case 'profile': {
    installDeps(renderProfile(PROFILE))
    log('boot with: dsh --profile ' + PROFILE + (PROFILE === 'inference' ? ' (or: dsh web --profile inference)' : ' "<task>"'))
    break
  }
  case 'preset': installPreset(); break
  case 'check': { const ok = await check(); process.exit(ok ? 0 : 1) } break
  default: die('unknown command ' + JSON.stringify(cmd) + ' — use all | profile <name> | preset | check')
}
