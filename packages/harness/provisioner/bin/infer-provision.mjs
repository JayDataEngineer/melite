#!/usr/bin/env node
/**
 * infer-provision — profile provisioner for vanilla DSH installs.
 *
 * The bundle patch (cordis.patch.yml) covers the ROWS; this bin covers
 * the PROFILES: renders ready-to-boot profile dirs (inference /
 * headless / estate / melite-test) and installs their link deps.
 * Self-locating — every path derives from this file's own location
 * (the provisioner package and its siblings), so a family re-split
 * or repo move changes nothing.
 *
 * Usage:
 *   infer-provision all                    # render + install every profile
 *   infer-provision profile <name>         # render one profile dir
 *   infer-provision preset                 # install the agent preset
 * Flags:
 *   --dsh-home <dir>   default $DSH_HOME || ~/.dsh
 *
 * Rendered profiles mount the SAME rows the bundle patch mounts (the
 * profile's cordis.patch.yml user layer stays EMPTY by design — the
 * bundle owns the rows, so `dsh plugin add` and rendered profiles can
 * never drift apart). The template pins: our bundle + the dsh web base
 * for 'inference', the plain headless base for 'headless'.
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const PROFILE = argv[1] && !argv[1].startsWith('--') ? argv[1] : 'inference'

const log = (...a) => console.log(...a)
const die = (msg) => { console.error('infer-provision: ' + msg); process.exit(1) }

// ── profile rendering ───────────────────────────────────────────────────
const PROFILE_BASES = {
  // inference = the studio: web app base + the SELF-REGISTERING
  // direct bundles (channel law 2026-09-09: every web plugin owns
  // its existence row in ITS OWN package — the provisioner stopped
  // inserting twin rows 2026-09-17; a row in BOTH files killed
  // every FRESH boot of profiles mounting both patches).
  // anny LEFT the web bases (stroke 89): its studio died — the form
  // card rides the engine-plane SSOT only, never a browser bundle.
  inference: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@melite/harness-provisioner',
    '@melite/harness-tools', '@melite-plugin/dsh-card-view', '@melite-plugin/dsh-card-deck',
    '@melite-plugin/dsh-gallery'],
  // headless = the agent server: one-shot task runner + the tools
  // plane (harness-tools self-registers its melite-tools row; the
  // renderer disables the web-plane doors row in this mount).
  headless: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-headless', '@melite/harness-provisioner',
    '@melite/harness-tools'],
  // estate = the job server: the SDK JSON-RPC base (estate-drive
  // spawns this profile; the estate row serves the runs lanes
  // in-process — no second app, no HTTP). The renderer pins the
  // tools row's HEADLESS interface by its self-registration id.
  estate: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-sdk-app', '@melite/harness-provisioner',
    '@melite/harness-tools'],
  // melite-test = THE TEST LANE, RE-COMPOSED (REBUILD-20, gateway
  // kill 2026-09-10): the historical TEST bake (:3088, the
  // melite-test profile mounting the estate API as a SECOND
  // process on :33081) died with the gateway. Its replacement is
  // the SAME row set as the studio — web app base + the estate
  // rows in ONE process. Custom bakes serve from this name; the
  // :33081 wire never existed here.
  'melite-test': ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@melite/harness-provisioner',
    '@melite/harness-tools', '@melite-plugin/dsh-card-view', '@melite-plugin/dsh-card-deck',
    '@melite-plugin/dsh-gallery'],
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
  // Ledger row 34 follow-up (2026-09-10): dependencies are REGENERATED,
  // never merged — the renderer owns this file wholesale (same law as
  // the rows: "the bundle owns every row, no drift"). The old merge kept
  // fossil link: rows from pre-reorg renders (plugins/harness/dsh/…),
  // and pnpm warned "installing a dependency from a non-existent
  // directory" on every install while the profile silently carried
  // dead links. rowDeps are re-derived from THIS provisioner's manifest
  // on every render; user-added registry deps belong in the bundle, not
  // here.
  pkg.dependencies = { ...rowDeps, '@melite/harness-provisioner': link }
  // SUPERSEDE RETIRED (2026-09-17): the provisioner no longer owns
  // twin rows for the self-registering packages (channel law
  // 2026-09-09 — the packages' own cordis.patch.yml files insert
  // their rows; the twins double-mounted the tool plane and killed
  // every FRESH boot: "tool melite_discover is already
  // registered"). Direct bundles are THE mount now; nothing is
  // dropped when the provisioner joins.
  // THE BUNDLES LIST IS REGENERATED, never merged (stroke 89,
  // 2026-09-17 — the same no-drift law as the dependencies above):
  // the old union kept RETIRED bundles mounted forever (anny's
  // studio row crash-booted every fresh compose with "cannot
  // resolve profile bundle @melite/3d-anny" after the package left
  // the bases). The bases OWN this list wholesale; a retired
  // package leaves the profile the day it leaves PROFILE_BASES.
  pkg.dsh = { profile: { bundles: [...new Set(bundles)] } }
  writeFileSync(join(dst, 'package.json'), JSON.stringify(pkg, null, 2) + String.fromCharCode(10))
  // user layer stays EMPTY in web mounts — the bundle patch owns every
  // row (no drift). NON-web mounts (headless/SDK) get the web-surface
  // rows mechanically DISABLED (by the packages' SELF-REGISTRATION
  // ids, 2026-09-17): no webServer service exists to activate them.
  // The bundle owns the rows; the renderer owns the per-app mount
  // shape.
  const webMount = bundles.includes('@deepseek-ai/dsh-web-app')
  // melite-tools-doors is web-profiles-only by its own contract (the
  // ✦ doors need webServer+llm — absent in sdk/headless mounts); the
  // renderer disables it with the other web rows in non-web mounts.
  const webRows = ['melite-tools-doors',
                   'infer-card-view', 'ray-card-deck', 'infer-gallery']
  writeFileSync(join(dst, 'cordis.patch.yml'),
    webMount
      ? '# rendered by infer-provision - rows live in the bundle' + '\n' + '[]' + '\n'
      : '# rendered by infer-provision - rows live in the bundle.\n'
        + '# No webServer service in this mount: the four web-surface rows\n'
        + '# are disabled so activation cannot pend forever.\n'
        + webRows.map(id => '- id: ' + id + '\n  disabled: true\n').join('')
        // ESTATE JOB SERVER (name === 'estate'): this mount IS the
        // delegated operator — the tools row selects the HEADLESS
        // interface (the melite_flow + run_status run doors). Pinned
        // in the render (not ambient env) because the interface is
        // profile state: browser mounts compose, the job server
        // executes. Every other mount keeps the browser default.
        + (name === 'estate'
          ? '# HEADLESS interface: the delegated operator runs jobs here.\n'
            + '- id: melite-tools\n  config:\n    headless: true\n'
          : ''))
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

// ── main ────────────────────────────────────────────────────────────────
switch (cmd) {
  case 'all': {
    // Ledger row 34 (2026-09-10): the installPreset() arm died with the
    // inference-studio retirement (2026-09-09) — its source tree no
    // longer exists, so `all` hard-failed at "preset source missing".
    // Presets are operator-managed now (~/.dsh/.agent-presets); this
    // command renders + installs every profile (the gateway health
    // check died with the gateway — there is no second process to
    // probe anymore).
    for (const name of ['inference', 'headless', 'estate', 'melite-test']) {
      installDeps(renderProfile(name))
    }
    log('boot with:')
    log('  dsh web --profile inference          # the studio GUI')
    log('  dsh --profile headless "<task>"      # one-shot agent with card tools')
    log('  dsh --profile estate                 # the SDK job server (estate row)')
    log('  dsh web --profile melite-test        # the TEST lane (one process, no :33081)')
    break
  }
  case 'profile': {
    installDeps(renderProfile(PROFILE))
    log('boot with: dsh --profile ' + PROFILE + (PROFILE === 'inference' ? ' (or: dsh web --profile inference)' : ' "<task>"'))
    break
  }
  case 'preset': installPreset(); break
  default: die('unknown command ' + JSON.stringify(cmd) + ' — use all | profile <name> | preset')
}
