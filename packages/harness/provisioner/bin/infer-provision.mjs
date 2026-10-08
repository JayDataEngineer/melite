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
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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
  // card-base rides the WEB bases (the ONE-ROW LAW, 2026-10-13):
  // its bundle patch mounts the null host row that materializes
  // @melite/card-base/client for the browser graph — every card
  // client externalizes it, and without the row the loader's
  // require misses the module table at web boot.
  inference: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@melite/harness-provisioner',
    '@melite/harness-tools', '@melite/card-base', '@melite-plugin/dsh-card-view', '@melite-plugin/dsh-card-deck',
    '@melite-plugin/dsh-gallery'],
  // headless = the agent server: one-shot task runner + the tools
  // plane (harness-tools self-registers its melite-tools row; the
  // renderer disables the web-plane doors row in this mount).
  // dsh-estate rides here too: a headless task that composes media
  // reaches the same runs/queue/drafts seats through melite_flow —
  // without the bundle the tool answers ABSENCE (the estate-drive
  // finding, 2026-10-13; the state-root pin still applies — an
  // unpinned queue seat refuses loud by design).
  headless: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-headless', '@melite/harness-provisioner',
    '@melite/harness-tools', '@melite-plugin/dsh-estate'],
  // estate = the job server: the SDK JSON-RPC base (estate-drive
  // spawns this profile; the estate row serves the runs lanes
  // in-process — no second app, no HTTP). dsh-estate bundles the
  // runs/queue/drafts seats — without it melite_flow answers
  // ABSENCE ("no seat of that family is mounted on this lane"),
  // the 2026-10-13 estate-drive finding. The renderer pins the
  // tools row's HEADLESS interface by its self-registration id.
  estate: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-sdk-app', '@melite/harness-provisioner',
    '@melite/harness-tools', '@melite-plugin/dsh-estate'],
  // melite-test = THE TEST LANE, RE-COMPOSED (REBUILD-20, gateway
  // kill 2026-09-10): the historical TEST bake (:3088, the
  // melite-test profile mounting the estate API as a SECOND
  // process on :33081) died with the gateway. Its replacement is
  // the SAME row set as the studio — web app base + the estate
  // rows in ONE process. Custom bakes serve from this name; the
  // :33081 wire never existed here.
  'melite-test': ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@melite/harness-provisioner',
    '@melite/harness-tools', '@melite/card-base', '@melite-plugin/dsh-card-view', '@melite-plugin/dsh-card-deck',
    '@melite-plugin/dsh-gallery'],
}

/** Maps every workspace package's name to its directory by reading
 *  this repository's pnpm-workspace.yaml globs (the manifest's
 *  workspace:* specs are names; pnpm resolves them only inside an
 *  install — the profile dir is its own install, so the renderer
 *  resolves them itself). @returns Map<name, absolute dir> */
function workspacePackages() {
  const root = resolve(PROVISIONER, '../../..')
  const wsFile = join(root, 'pnpm-workspace.yaml')
  const out = new Map()
  if (!existsSync(wsFile)) return out
  const globs = [...readFileSync(wsFile, 'utf8').matchAll(/^\s*-\s*['"]?([^'"\s#]+)/gm)]
    .map((m) => m[1]).filter((g) => !g.startsWith('!'))
  const seg = (g) => g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '(?:.*/)?').replace(/\*/g, '[^/]*')
  const prefixes = [...new Set(globs.map((g) => g.split('*')[0]))]
    .filter((p, i, a) => !a.some((q) => q !== p && p.startsWith(q)))
  for (const g of globs) {
    const re = new RegExp('^' + seg(g) + '$')
    for (const prefix of prefixes) {
      const base = join(root, prefix)
      if (!existsSync(base)) continue
      const walk = (dir, depth) => {
        let entries = []
        try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
        for (const e of entries) {
          if (!e.isDirectory() || e.name === 'node_modules') continue
          const full = join(dir, e.name)
          const rel = full.slice(root.length + 1)
          if (re.test(rel)) {
            const pj = join(full, 'package.json')
            if (existsSync(pj)) {
              try { out.set(JSON.parse(readFileSync(pj, 'utf8')).name, full) } catch { /* not a package */ }
            }
          }
          if (depth < 8) walk(full, depth + 1)
        }
      }
      walk(base, 0)
    }
  }
  return out
}

function renderProfile(name) {  // In-box bundles (@deepseek-ai/*) resolve from the DSH INSTALL, never
  // from a registry - only OUR link goes in dependencies. Mirrors what
  // `dsh plugin` itself initializes (PROFILE_TEMPLATES + reconcile).
  const bundles = PROFILE_BASES[name] || PROFILE_BASES.headless
  const dst = join(DSH_HOME, 'profiles', name)
  mkdirSync(dst, { recursive: true })
  const link = 'link:' + PROVISIONER

  // pnpm does NOT materialize a link: dependency's OWN link:/workspace
  // deps — every plugin package the bundle rows name must become a
  // DIRECT link: dep here. The provisioner's manifest declares them
  // as workspace:* specs; a link:-only scan dropped them, so the
  // headless/estate profiles mounted @melite/harness-tools as a
  // bundle row with NO installed package — the tool lane could not
  // load (ledger li-headless-profile-deps). workspace specs resolve
  // by scanning this repository's own pnpm workspace globs
  // (self-locating; a family re-split moves nothing).
  const provPkg = JSON.parse(readFileSync(join(PROVISIONER, 'package.json'), 'utf8'))
  const rowDeps = {}
  const byName = workspacePackages()
  for (const [depName, spec] of Object.entries(provPkg.dependencies || {})) {
    const s = String(spec)
    if (s.startsWith('link:')) {
      rowDeps[depName] = 'link:' + resolve(PROVISIONER, s.slice(5))
    } else if (byName.has(depName)) {
      rowDeps[depName] = 'link:' + byName.get(depName)
    }
    // Registry specs (e.g. the lane-brain adapter @deepseek-ai/dsh-llm-pi-ai)
    // are deliberately NOT pinned here: the profile package.json is
    // link:-only by contract (the render wall proves the trailing
    // `pnpm install` stays offline-safe). A registry dep rides through
    // its OWNING package's own manifest — the provisioner declares it,
    // the provisioner is linked, its install resolves it in the repo
    // workspace.
  }
  // BUNDLE-COVERAGE (the :3088 boot refusal, 2026-10-18): every
  // non-in-box bundle the profile base mounts ALSO becomes a direct
  // link: dep — the F5 comment's own intent above ("every plugin
  // package the bundle rows name must become a DIRECT link: dep"),
  // which the mirror-the-manifest loop never implemented for bundles
  // outside the provisioner's own manifest (@melite/card-base rode
  // the inference/melite-test bases with no installed package, and
  // `dsh --profile melite-test` refused to boot). In-box
  // @deepseek-ai/* bundles resolve from the DSH install, never here;
  // any other unresolvable bundle fails the RENDER loud, never a
  // boot three steps later.
  const bundleDeps = {}
  for (const b of bundles) {
    if (b.startsWith('@deepseek-ai/')) continue
    if (!byName.has(b)) die(`profile base mounts ${b} but no workspace package carries that name — refusing an unresolvable bundle`)
    bundleDeps[b] = 'link:' + byName.get(b)
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
  // on every render; bundleDeps cover every mounted non-in-box bundle
  // (the coverage cure above); user-added registry deps belong in the
  // bundle, not here.
  pkg.dependencies = { ...bundleDeps, ...rowDeps, '@melite/harness-provisioner': link }
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
    log('  LANES BOOT ONLY THROUGH THE PROVISION (the lane law, li-bu):')
    log('  ~/Documents/programs/active/dsh-provision/apply.sh launch --lane <name>')
    log('  (this command installs the profiles; the sibling provisioner owns the')
    log('   launch — binary pin, version floor, home, and unit. The shapes below')
    log('   are what the door runs UNDER THE HOOD, never a hand-run shortcut:)')
    log('  dsh --profile inference              # the studio GUI')
    log('  dsh --profile headless "<task>"      # one-shot agent with card tools')
    log('  dsh --profile estate                 # the SDK job server (estate row)')
    log('  dsh --profile melite-test            # the TEST lane (one process, no :33081)')
    break
  }
  case 'profile': {
    installDeps(renderProfile(PROFILE))
    log('boot with: dsh --profile ' + PROFILE + (PROFILE === 'inference' ? '' : ' "<task>"'))
    break
  }
  // the `preset` arm died with installPreset (undefined since the
  // inference-studio retirement, ledger row 34) and 0.1.7 no longer
  // reads ~/.dsh/.agent-presets — refuse LOUD instead of a
  // ReferenceError
  default: die('unknown command ' + JSON.stringify(cmd) + ' — use all | profile <name>')
}
