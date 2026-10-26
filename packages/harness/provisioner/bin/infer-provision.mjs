#!/usr/bin/env node
/**
 * infer-provision — profile provisioner for vanilla DSH installs.
 *
 * The bundle patch (cordis.patch.yml) covers the ROWS; this bin covers
 * the PROFILES: renders ready-to-boot profile dirs (melite-test /
 * headless / estate) and installs their link deps. Every render
 * stamps render-provenance.json (F5: who/what/when/flags) and holds
 * the profile's render lock across render+install (F6).
 * Self-locating — every path derives from this file's own location
 * (the provisioner package and its siblings), so a family re-split
 * or repo move changes nothing.
 *
 * Usage:
 *   infer-provision all                    # render + install every profile
 *   infer-provision profile <name>         # render one profile dir
 *   infer-provision preset                 # install the agent preset
 * Flags:
 *   --dsh-home <dir>            default $DSH_HOME || ~/.dsh
 *   --estate-agent-route <p/m>  estate agent brain, "provider/model"
 *   --estate-state-root <dir>   override the estate row's stateRoot
 *                                (walls render hermetic roots through
 *                                config — never an env redirect)
 *   --profile-rows <file>       operator rows (llm providers…), verbatim
 *
 * Rendered profiles mount the SAME melite rows the bundle patch mounts
 * (the bundle owns the rows, so `dsh plugin add` and rendered profiles
 * can never drift apart). The PROFILE layer (this dir's cordis.patch.yml)
 * owns what no bundle can know: the estate row's seat config — repoRoot
 * always (mechanical: this render's own repo root; the queue seats refuse
 * an unpinned boot loud by design) and agentRoute when the flag names a
 * brain — plus any operator rows spliced verbatim by --profile-rows
 * (llm provider rows ride the profile layer the same way the web
 * profile's own patch carries them; the file is never re-serialized).
 * The template pins: our bundle + the dsh web base for 'melite-test',
 * the plain headless base for 'headless'.
 */

import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
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
const PROFILE = argv[1] && !argv[1].startsWith('--') ? argv[1] : 'melite-test'
const ESTATE_AGENT_ROUTE = flag('--estate-agent-route', '')
const ESTATE_STATE_ROOT = flag('--estate-state-root', '')
const PROFILE_ROWS = flag('--profile-rows', '')
// F1 (the 2026-10-20 sweep's destructive-render finding, cured
// 2026-11-12): the renderer owns its files wholesale — but only
// files IT rendered. A package.json with no provenance stamp naming
// this renderer (a hand-composed profile, another tool's output)
// used to be regenerated silently: dependencies rewritten, the
// original gone. See the guard at the package.json write.
const FORCE_RENDER = argv.includes('--force-render')

const log = (...a) => console.log(...a)
const die = (msg) => { console.error('infer-provision: ' + msg); process.exit(1) }

// ── F6 guards: atomic writes, the render lock, the install ceiling ──
// ATOMIC WRITES: the renderer owns its files wholesale but wrote
// them direct — a crash mid-render left a half-written profile that
// boots strange. Temp + rename per file (J6's writeJsonAtomic idiom,
// local: this bin is self-contained, no workspace imports). The tmp
// name is FIXED per file (never pid-suffixed): a killed run's
// leftover is overwritten by the next render, never accumulated —
// and the render lock below serializes renders, so no two writers
// share a tmp.
function writeFileAtomic(path, content) {
  writeFileSync(path + '.tmp', content)
  renameSync(path + '.tmp', path)
}

// THE RENDER LOCK: two renders (two `all` runs, a render racing a
// re-render) interleaved package.json and the patch row by row —
// both callers rendered-then-installed with no mutual exclusion.
// One lock file per profile dir, exclusive-create: a live holder
// refuses loud, a stale one (dead pid) is taken with a warning.
const LOCK_NAME = '.render.lock'
function acquireLock(dst) {
  const lock = join(dst, LOCK_NAME)
  const take = () => writeFileSync(lock, String(process.pid) + '\n', { flag: 'wx' })
  try {
    take()
    return
  } catch (err) {
    if (err === null || typeof err !== 'object' || err.code !== 'EEXIST') throw err
  }
  const prev = readFileSync(lock, 'utf8').split('\n')[0]
  const pid = Number(prev)
  let alive = false
  if (Number.isInteger(pid) && pid > 0) {
    try { process.kill(pid, 0); alive = true } catch { /* dead */ }
  }
  if (alive) die(`profile dir ${dst} is already being rendered (lock ${lock}, holder pid ${pid}) — refusing a concurrent render`)
  log(`  stale render lock (holder pid ${prev.trim() || '<unparsed>'} dead) — taking it`)
  try { unlinkSync(lock) } catch { /* raced away */ }
  try {
    take()
  } catch {
    die(`profile dir ${dst} lost a lock race (${lock}) — re-run the render`)
  }
}
function releaseLock(dst) {
  try { unlinkSync(join(dst, LOCK_NAME)) } catch { /* never held / already gone */ }
}

// PROVENANCE (provisioner audit F5): a rendered profile dir is an
// artifact with no memory — when a boot misbehaves nothing says
// which provisioner, which tree, which flags laid it. Every render
// writes render-provenance.json beside the profile files:
// machine-readable, DSH-loader-inert (a data file, never a config
// plane — the loader reads package.json/cordis.* only), the
// fossil-vs-fresh question answered without archaeology.
function provenanceDoc(name, provPkg, bundles, profileRowsSha) {
  const root = resolve(PROVISIONER, '../../..')
  let commit = null
  let dirty = null
  try {
    const sha = execSync('git rev-parse HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    commit = /^[0-9a-f]{40}$/.test(sha) ? sha : null
    if (commit !== null) {
      dirty = execSync('git status --porcelain', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() !== ''
    }
  } catch { /* not a git checkout — the stamp says so honestly (nulls) */ }
  return {
    renderedAt: new Date().toISOString(),
    renderer: 'infer-provision',
    provisioner: { name: provPkg.name, version: provPkg.version },
    source: { root, commit, dirty },
    profile: name,
    bundles: [...bundles],
    flags: {
      estateAgentRoute: ESTATE_AGENT_ROUTE || null,
      estateStateRoot: ESTATE_STATE_ROOT || null,
      profileRows: PROFILE_ROWS ? { path: PROFILE_ROWS, sha256: profileRowsSha } : null,
    },
  }
}

// agentRoute wears the estate row's own shape (packages/web/melite-estate
// src/index.ts): "provider/model" — the same regex the seat applies. A
// malformed route dies HERE, at the earliest resolvable point, never as a
// silently-unseated engine three boots later.
if (ESTATE_AGENT_ROUTE && !/^([^/\s]+)\/(.+)$/.test(ESTATE_AGENT_ROUTE)) {
  die('--estate-agent-route wants provider/model (e.g. opencode-go/muse-spark-1.3-contributor), got "' + ESTATE_AGENT_ROUTE + '"')
}

// ── profile rendering ───────────────────────────────────────────────────
const PROFILE_BASES = {
  // melite-test = THE studio/test lane, ONE name (single-setup law
  // 2026-10-18: the retired `inference` base carried this EXACT list —
  // two names for one mount, and the README + runbook pointed at
  // different ones. `inference` is gone; this base is the only web
  // mount): web app base + the SELF-REGISTERING
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
  // three-client rides the WEB base for the SAME law (the :3088 boot
  // refusal, 2026-10-18): card-base, card-view, and gallery
  // externalize @melite/three-client/client, and three-client's own
  // patch is the ONLY row that materializes it ("bundling
  // @melite/three-client in a profile applies this patch" — the
  // package's own contract). Without the bundle, four plugins die
  // at boot with `missed the module table` and the deck pends on
  // remote.manage behind them.
  // dsh-estate rides the web base too (the :3088 browser census,
  // 2026-10-18): its ONE row mounts the estate's real composition
  // as child plugins — drafts (bench/subscribe), models (the
  // /v1/model-catalog discovery door), media, queue, runs, manage.
  // Without it the studio lane BOOTS CLEAN but serves a husk: the
  // bench spotlight stream and the catalog toast 500 in the browser
  // console while the boot log stays silent — the same
  // seed-has-it-base-does-not drift as three-client.
  // the two card STUDIOS ride the web base (the H3 bar autopsy,
  // 2026-10-10): @melite/video-h3-timeline and @melite/motion-motion
  // own their rows in their OWN bundle patches, and this bundle's
  // patch carries no twin ("NO row here — the profile bundles it",
  // cordis.patch.yml) — so while no base mounted them they were
  // deps with no door: installed by the manifest mirror above, rows
  // mounted by nothing, client entries in no browser graph. The H3
  // card then rendered the generic form — NO timeline bar — with
  // every wall green (the e2e seed mounts both; the live base did
  // not). @melite/3d-img-to-mesh needs no bundle row: this bundle's
  // own card-studio-img-to-mesh row mounts it, and a bundle would be
  // the twin-row crash law.
  'melite-test': ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@melite/harness-provisioner',
    '@melite/harness-tools', '@melite-plugin/dsh-estate', '@melite/card-base', '@melite/three-client',
    '@melite-plugin/dsh-card-view', '@melite-plugin/dsh-card-deck', '@melite-plugin/dsh-gallery',
    '@melite/video-h3-timeline', '@melite/motion-motion', '@melite/image-input-prep'],
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
  // Unknown names REFUSE (provisioner audit F7, cured 2026-10-21): the
  // old `|| PROFILE_BASES.headless` fallback turned a typo into a
  // bootable-looking directory with the wrong rows and exit 0.
  if (!(name in PROFILE_BASES)) {
    console.error(`infer-provision: unknown profile '${name}' — known: ${Object.keys(PROFILE_BASES).join(', ')}`)
    process.exit(1)
  }
  const bundles = PROFILE_BASES[name]
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
    // F1 refuse-or-backup: without a stamp naming THIS renderer the
    // render dies loud; --force-render backs the file up and proceeds.
    // A file with our own stamp re-renders freely — the no-drift law
    // (the renderer owns its output wholesale) is unchanged.
    if (!FORCE_RENDER) {
      let mine = false
      try {
        const prov = JSON.parse(readFileSync(join(dst, 'render-provenance.json'), 'utf8'))
        mine = prov !== null && typeof prov === 'object' && prov.renderer === 'infer-provision'
      } catch { /* no stamp, or unparseable: not provably ours */ }
      if (!mine) {
        die('refusing to overwrite ' + pkgPath + ' — no render-provenance.json names this renderer '
          + '(a hand-composed or foreign file). Move it aside, or pass --force-render to back it up '
          + 'as package.json.prerender.bak and re-render')
      }
    } else {
      copyFileSync(pkgPath, pkgPath + '.prerender.bak')
    }
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
  writeFileAtomic(join(dst, 'package.json'), JSON.stringify(pkg, null, 2) + String.fromCharCode(10))
  // The cordis.yml USER layer stays EMPTY — the bundle patch owns every
  // melite row (no drift). NON-web mounts (headless/SDK) get the
  // web-surface rows mechanically DISABLED in the profile patch (by the
  // packages' SELF-REGISTRATION ids, 2026-09-17): no webServer service
  // exists to activate them. The bundle owns the rows; the renderer
  // owns the per-app mount shape and the seat pins below.
  const webMount = bundles.includes('@deepseek-ai/dsh-web-app')
  // melite-tools-doors is web-profiles-only by its own contract (the
  // ✦ doors need webServer+llm — absent in sdk/headless mounts); the
  // renderer disables it with the other web rows in non-web mounts.
  const webRows = ['melite-tools-doors',
                   'infer-card-view', 'ray-card-deck', 'infer-gallery']
  // ESTATE SEAT PIN (the seating law, 2026-10-18): every env seam that
  // decided seating is retired — the estate row's CONFIG owns it. Every
  // profile mounting dsh-estate carries repoRoot here: mechanical (this
  // render's own repo root), so the runs/drafts seats never boot
  // unpinned (they refuse loud by design). agentRoute names the agent
  // brain (provider/model); absent, the estate logs the engine unseated
  // — the honest state, never a silent default. acquireStallTimeoutMs
  // is the deliberate stall budget (audit F7 close-out, 2026-11-11):
  // the lane rides a pinned 10s, never the library default by accident.
  // durableDownloads: true rides WEB mounts only (the 2026-10-22
  // downloads-stream audit): the lane is the long-lived process that
  // owns fetch lifetimes — its durable claim ticker claims requested
  // rows and stamps the claimer heartbeat, so a headless press's
  // wanted download survives its own session dying. A non-web mount
  // (headless task, estate job server) is short-lived: a claimer in
  // it would orphan every fetch it died mid-flight, so its presses
  // take their own wire, exactly as before.
  const estateRow = bundles.includes('@melite-plugin/dsh-estate')
    ? '# ESTATE SEAT PIN — the estate row config owns every seat:\n'
      + '# repoRoot pins the runs/drafts seats (unpinned boots refuse loud);\n'
      + '# stateRoot overrides it (J12: walls render hermetic roots by\n'
      + '# config — stateRoot wins over repoRoot in the queue seat).\n'
      + '# agentRoute names the agent brain (absent = unseated, logged loud).\n'
      + '# acquireStallTimeoutMs: the deliberate stall budget (audit F7).\n'
      + (webMount
        ? '# durableDownloads: the lane claims requested rows (the lifetime\n'
          + '# finding) — long-lived web mounts only, never a task process.\n'
        : '')
      + '- id: melite-estate\n'
      + '  config:\n'
      + '    repoRoot: ' + JSON.stringify(resolve(PROVISIONER, '../../..')) + '\n'
      + '    acquireStallTimeoutMs: 10000\n'
      + (webMount ? '    durableDownloads: true\n' : '')
      + (ESTATE_STATE_ROOT
        ? '    stateRoot: ' + JSON.stringify(ESTATE_STATE_ROOT) + '\n'
        : '')
      + (ESTATE_AGENT_ROUTE
        ? '    agentRoute: ' + JSON.stringify(ESTATE_AGENT_ROUTE) + '\n'
        : '')
    : ''
  // OPERATOR ROWS (--profile-rows <file>): verbatim text splice, never
  // re-serialized (the web profile's preset-row law). Llm provider rows
  // ride the profile layer because the bundle patch owns MELITE rows
  // only — the same home the web profile's own patch gives its
  // providers. Rows apply by id; a row here never inserts a melite
  // bundle row (the no-drift law holds — the ids belong to the
  // operator's adapter mounts).
  let operatorRows = ''
  let profileRowsSha = null
  if (PROFILE_ROWS) {
    if (!existsSync(PROFILE_ROWS)) die('--profile-rows: no such file: ' + PROFILE_ROWS)
    const text = readFileSync(PROFILE_ROWS, 'utf8')
    profileRowsSha = createHash('sha256').update(text, 'utf8').digest('hex')
    const firstRow = text.split('\n').find((l) => l.trim() !== '' && !l.trim().startsWith('#'))
    if (firstRow === undefined || !firstRow.startsWith('- ')) {
      die('--profile-rows: ' + PROFILE_ROWS + ' is not a YAML row list (the first non-comment line must start with "- ")')
    }
    operatorRows = '# operator rows (verbatim splice: ' + PROFILE_ROWS + ')\n'
      + text + (text.endsWith('\n') ? '' : '\n')
  }
  writeFileAtomic(join(dst, 'cordis.patch.yml'),
    webMount
      ? '# rendered by infer-provision - melite rows live in the bundle;\n'
        + '# the rows below are the profile layer (seat pin + operator rows).\n'
        + (estateRow + operatorRows || '[]\n')
      : '# rendered by infer-provision - melite rows live in the bundle.\n'
        + '# No webServer service in this mount: the four web-surface rows\n'
        + '# are disabled so activation cannot pend forever.\n'
        + webRows.map(id => '- id: ' + id + '\n  disabled: true\n').join('')
        + estateRow + operatorRows
        // DELEGATED-OPERATOR MOUNTS (estate | headless): this mount
        // RUNS jobs — the tools row selects the HEADLESS interface
        // (the melite_flow + run_status run doors). Pinned in the
        // render (not ambient env) because the interface is profile
        // state: browser mounts compose, the job server executes.
        // The 'headless' agent server rides the same pin — its base
        // list promises melite_flow ("a headless task that composes
        // media reaches the same runs/queue/drafts seats"), and the
        // faceless-maker commission (2026-10-21) proved the
        // compose-only mount: benches composed and validated, every
        // execution refused at the absent verb. Every other mount
        // keeps the browser default.
        + (name === 'estate' || name === 'headless'
          ? '# HEADLESS interface: the delegated operator runs jobs here.\n'
            + '- id: melite-tools\n  config:\n    headless: true\n'
          : ''))
  writeFileAtomic(join(dst, 'cordis.yml'), '# rendered by infer-provision' + '\n' + '[]' + '\n')
  const ws = join(dst, 'pnpm-workspace.yaml')
  if (!existsSync(ws)) writeFileAtomic(ws, 'packages:' + '\n' + '  - node_modules/*' + '\n')
  // F5 — the provenance stamp (see provenanceDoc): fossil-vs-fresh,
  // answered in one read.
  writeFileAtomic(join(dst, 'render-provenance.json'),
    JSON.stringify(provenanceDoc(name, provPkg, bundles, profileRowsSha), null, 2) + '\n')

  log('rendered profile :', dst)
  log('  bundles        :', bundles.join(', '))
  return dst
}

// INSTALL GUARDS (F6): the install ran with no timeout (a hung
// registry stalled forever), no catch (a failed install threw a raw
// stack with no manual-command hint), and both callers ignored the
// `false` return (missing-pnpm printed a warning, then the boot
// lines printed as if everything were installed). Now: a 10-minute
// ceiling (link-only installs take seconds; a cold-registry fetch
// takes minutes; a hang dies loud, never stalls CI forever) and
// every failure logged loud with the manual command. The boolean is
// HONORED by both callers through renderInstall below.
const INSTALL_TIMEOUT_MS = 600_000
function installDeps(profileDir) {
  const pm = execSync('command -v pnpm || true').toString().trim()
    || join(process.env.HOME || '', '.local/share/pnpm/pnpm')
  if (!existsSync(pm)) {
    console.error('infer-provision: pnpm not found — deps NOT installed for ' + profileDir
      + '; run manually: (cd ' + profileDir + ' && pnpm install)')
    return false
  }
  log('  installing deps with', pm, '…')
  try {
    execSync('"' + pm + '" install', { cwd: profileDir, stdio: 'inherit', timeout: INSTALL_TIMEOUT_MS })
  } catch (err) {
    const e = (err !== null && typeof err === 'object') ? err : {}
    const why = e.code === 'ETIMEDOUT'
      ? 'timed out after ' + String(INSTALL_TIMEOUT_MS / 1000) + 's'
      : 'failed (status ' + String(e.status ?? e.signal ?? e.code ?? 'unknown') + ') — output above'
    console.error('infer-provision: pnpm install ' + why + ' in ' + profileDir
      + '; fix the failure and re-run, or install manually: (cd ' + profileDir + ' && pnpm install)')
    return false
  }
  return true
}

// RENDER+INSTALL, LOCKED (F6): the one door both commands use — the
// lock covers the render AND the install (an install reading
// package.json mid-render is the same race). The install's boolean
// is honored HERE, and the die sits AFTER the finally on purpose:
// process.exit skips finally blocks, so a die inside the try would
// leak the lock forever.
function renderInstall(name) {
  const dst = join(DSH_HOME, 'profiles', name)
  mkdirSync(dst, { recursive: true })
  acquireLock(dst)
  let dir = dst
  let ok = false
  try {
    dir = renderProfile(name)
    ok = installDeps(dir)
  } finally {
    releaseLock(dst)
  }
  if (!ok) die(`profile '${name}' rendered but deps NOT installed — boot would fail at bundle resolution; run manually: (cd ${dir} && pnpm install)`)
  return dir
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
    for (const name of ['melite-test', 'headless', 'estate']) {
      renderInstall(name)
    }
    log('boot with:')
    log('  LANES BOOT ONLY THROUGH THE PROVISION (the lane law, li-bu):')
    log('  ~/Documents/programs/active/dsh-provision/apply.sh launch --lane <name>')
    log('  (this command installs the profiles; the sibling provisioner owns the')
    log('   launch — binary pin, version floor, home, and unit. The shapes below')
    log('   are what the door runs UNDER THE HOOD, never a hand-run shortcut:)')
    log('  dsh --profile melite-test            # the studio GUI + TEST lane (one process, no :33081)')
    log('  dsh --profile headless "<task>"      # one-shot agent with card tools')
    log('  dsh --profile estate                 # the SDK job server (estate row)')
    break
  }
  case 'profile': {
    renderInstall(PROFILE)
    log('boot with: dsh --profile ' + PROFILE + (PROFILE === 'melite-test' ? '' : ' "<task>"'))
    break
  }
  // the `preset` arm died with installPreset (undefined since the
  // inference-studio retirement, ledger row 34) and 0.1.7 no longer
  // reads ~/.dsh/.agent-presets — refuse LOUD instead of a
  // ReferenceError
  default: die('unknown command ' + JSON.stringify(cmd) + ' — use all | profile <name>')
}
