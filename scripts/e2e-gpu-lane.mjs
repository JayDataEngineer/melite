#!/usr/bin/env node
// e2e-gpu-lane.mjs — THE GPU BROWSER-WALL SEAT (the both-angles tier,
// dev_docs/plans/gpu-playwright-tier-2026-10-12.md).
//
// Operator order (2026-10-12): playwright tests that actually USE
// the GPU — (a) the automotive (the LLM run doors, /melite-runs on)
// and (b) the human path (every card, configuration changes, Run
// press). This script owns the lane recipe: the studio-lane recipe
// verbatim (throwaway depth-anchored home, tracked seed, keyless
// settings law, workspace pre-state, stateRoot patch) PLUS the GPU
// prerequisite the keyless wall does not carry:
//   - ENGINE GATE: the estate's engine row (comfyui host) must
//     answer /system_stats with a cuda device — the run the specs
//     press must do REAL inference, never a mocked door.
// The specs own their own benches (mint + seed through the estate's
// doors — the tour's history law); the launcher seeds nothing.
//
// Skip laws (never a fake red — unless E2E_GPU_REQUIRE=1, the
// studio seat's own REQUIRED-prerequisite law): port busy, no dsh,
// engine down, no cuda device.
//
// FLAGS (the operator no-env law, 2026-11-16 — the promote-prod
// shape): --dsh-bin BIN boots the lane through that dsh binary
// (default: dsh on PATH); every other argument passes through to
// playwright verbatim. The tier's own gates (E2E_GPU_PORT,
// E2E_GPU_ENGINE, E2E_GPU_REQUIRE, E2E_GPU_KEEP) stay env — they
// are the specs'/CI's test-lane switches (audit step (c)), not
// this launcher's knobs.
import { spawn, spawnSync } from 'node:child_process'
import { accessSync, closeSync, constants, cpSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import { delimiter, isAbsolute, join, normalize } from 'node:path'
import { homedir } from 'node:os'
import { randomUUID } from 'node:crypto'

const TAG = '[e2e-gpu-lane]'

// ── the skip laws (never a fake red — unless REQUIRED) ───────────
// E2E_GPU_PORT lets a co-running seat (the studio lane owns 3907, a
// live operator lane 3088) take another port; the GPU tier's own
// default is 3917.
const PORT = process.env.E2E_GPU_PORT || '3917'
const HOME_DIR = 'data/runtime/e2e-gpu-home'
const RUNS_ROOT = '/tmp/e2e-gpu-runs'
const COOKIES = '/tmp/e2e-gpu-cookies.txt'
const LOG = '/tmp/e2e-gpu-lane.log'
const ENGINE_URL = process.env.E2E_GPU_ENGINE || 'http://127.0.0.1:8188'
const REPO_ROOT = join(import.meta.dirname, '..')
process.chdir(REPO_ROOT)
// deployment env (.env is gitignored; .env.example documents every knob)
if (existsSync('.env')) {
  loadEnvFile('.env') // env-file loaded
}
const CARD_VIEW_FILTER = process.env.CARD_VIEW_FILTER || '@melite-plugin/dsh-card-view'
// ── flags (the no-env law): --dsh-bin BIN; the rest passes to playwright ──
let DSH_BIN = 'dsh'
const LANE_ARGS = []
{
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dsh-bin') {
      const v = argv[i + 1]
      if (v === undefined) {
        process.stderr.write('--dsh-bin needs the dsh binary (a path or a PATH name)\n')
        process.exit(1)
      }
      DSH_BIN = v
      i++
    } else {
      LANE_ARGS.push(argv[i])
    }
  }
}

// THE TRACKED SEED IS THE SEAT'S ONLY SEED (the moss-404 law, the
// studio seat's own): a live dev profile's patch watcher can
// un-serve rows MID-RUN; a wall seat boots the committed seed-only
// profile. The GPU lane reuses the SAME tracked seed (same bundles,
// same depth anchoring) — the GPU tier differs in prerequisites and
// bench seed, never in the host recipe.
const TRACKED_SEED = 'packages/web/melite-card-view/e2e/profile-seed'
let SEED_DIR = TRACKED_SEED

function skipOrFail(msg) {
  if (process.env.E2E_GPU_REQUIRE) {
    process.stderr.write(TAG + ' REQUIRED prerequisite missing: ' + msg + ' (E2E_GPU_REQUIRE=1 refuses the skip)\n')
    process.exit(1)
  }
  process.stdout.write(TAG + ' ' + msg + '; SKIP (exit 0)\n')
  process.exit(0)
}

/** `command -v`: PATH search, or an executable check for a path argument. */
function resolveCommand(name) {
  const candidates = name.includes('/')
    ? [name]
    : (process.env.PATH || '').split(delimiter).filter((d) => d !== '').map((d) => join(d, name))
  for (const p of candidates) {
    try {
      accessSync(p, constants.X_OK)
      return p
    } catch { /* not here */ }
  }
  return null
}

/**
 * curl -s -m <ms>: resolve true on any HTTP response, false on
 * connection error or timeout (curl's non-zero exit).
 */
function httpRespond(urlStr, timeoutMs) {
  return new Promise((resolve) => {
    let url
    try {
      url = new URL(urlStr)
    } catch {
      resolve(false)
      return
    }
    let settled = false
    const done = (v) => {
      if (!settled) {
        settled = true
        resolve(v)
      }
    }
    const req = http.get(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search },
      (res) => {
        res.resume()
        done(true)
      },
    )
    req.on('timeout', () => req.destroy())
    req.on('error', () => done(false))
    const timer = setTimeout(() => req.destroy(), timeoutMs)
    req.on('close', () => {
      clearTimeout(timer)
      done(false)
    })
  })
}

/** curl -s -m <ms> collecting the body ("" when the wire is dead). */
function httpBody(urlStr, timeoutMs) {
  return new Promise((resolve) => {
    let url
    try {
      url = new URL(urlStr)
    } catch {
      resolve('')
      return
    }
    let settled = false
    const done = (v) => {
      if (!settled) {
        settled = true
        resolve(v)
      }
    }
    const req = http.get(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (d) => {
          body += d
        })
        res.on('end', () => done(body))
        res.on('error', () => done(''))
      },
    )
    req.on('timeout', () => req.destroy())
    req.on('error', () => done(''))
    const timer = setTimeout(() => req.destroy(), timeoutMs)
    req.on('close', () => {
      clearTimeout(timer)
      done('')
    })
  })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** tail -n of a log, byte-faithful (trailing newline preserved). */
function tailN(log, n) {
  let content = ''
  try {
    content = readFileSync(log, 'utf8')
  } catch {
    return ''
  }
  const endsNL = content.endsWith('\n')
  const lines = endsNL ? content.slice(0, -1).split('\n') : content.split('\n')
  if (lines.length === 1 && lines[0] === '') return ''
  return lines.slice(-n).join('\n') + (endsNL ? '\n' : '')
}

/** grep -q over a log; unreadable log matches nothing. */
function grepQ(log, re) {
  try {
    return re.test(readFileSync(log, 'utf8'))
  } catch {
    return false
  }
}

/** grep -o <tokenRe> | tail -1 | sed 's/.*token=//' over the log. */
function lastTokenFromLog(log, re) {
  let content = ''
  try {
    content = readFileSync(log, 'utf8')
  } catch {
    return ''
  }
  const matches = content.match(re)
  if (!matches || matches.length === 0) return ''
  const last = matches[matches.length - 1]
  const at = last.lastIndexOf('token=')
  return at === -1 ? '' : last.slice(at + 6)
}

/** grep -n over a log: "LINENO:line" for each hit, grep-printed. */
function grepN(log, re) {
  let content = ''
  try {
    content = readFileSync(log, 'utf8')
  } catch {
    return ''
  }
  const lines = content.split('\n')
  if (lines.length && lines[lines.length - 1] === '') lines.pop()
  const out = []
  lines.forEach((line, i) => {
    if (re.test(line)) out.push(String(i + 1) + ':' + line + '\n')
  })
  return out.join('')
}

// ── the skip laws (never a fake red — unless REQUIRED) ───────────
if (await httpRespond('http://127.0.0.1:' + PORT + '/', 2000)) {
  skipOrFail('port ' + PORT + ' busy — another host owns the lane')
}
if (!resolveCommand(DSH_BIN)) {
  skipOrFail('no dsh binary on PATH (use --dsh-bin BIN)')
}

// LANE LAW (li-bu class): the binary must be the provisioned
// runtime — >=0.2.0-rc.1, the repo's own pin.
const versionOut = spawnSync(DSH_BIN, ['--version'], { encoding: 'utf8' })
const dshVersion = (typeof versionOut.stdout === 'string' ? versionOut.stdout : '').split('\n')[0] ?? ''
{
  const m = /(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?/.exec(dshVersion)
  if (!m) {
    process.stderr.write("e2e-gpu-lane: cannot read a version from '$DSH_BIN' — boot only through the provision (dsh-provision apply.sh launch)\n")
    process.exit(1)
  }
  const rc = m[4] === undefined ? null : m[4]
  const cur = [Number(m[1]), Number(m[2]), Number(m[3]), rc]
  const floor = [0, 2, 0, 1]
  const rank = (t) => [t[0], t[1], t[2], t[3] === null ? 10 ** 6 : t[3]]
  const a = rank(cur)
  const b = rank(floor)
  const cmp = a[0] !== b[0] ? Math.sign(a[0] - b[0])
    : a[1] !== b[1] ? Math.sign(a[1] - b[1])
      : a[2] !== b[2] ? Math.sign(a[2] - b[2])
        : Math.sign(a[3] - b[3])
  if (cmp < 0) {
    // python's '.'.join(m.groups()) carried the rc NUMBER as the 4th
    // component ("0.1.5.2"); a rc-less version joins three components
    // (the heredoc crashed there — the refusal is this port's cure).
    const shown = rc === null ? [m[1], m[2], m[3]].join('.') : [m[1], m[2], m[3], rc].join('.')
    process.stderr.write("e2e-gpu-lane: $DSH_BIN is " + shown + ', below the 0.2.0-rc.1 floor — boot only through the provision (dsh-provision apply.sh launch)\n')
    process.exit(1)
  }
}
if (!isDirSync(TRACKED_SEED)) {
  SEED_DIR = TRACKED_SEED
  skipOrFail('no profile seed (' + TRACKED_SEED + ')')
}

// ── THE ENGINE GATE (the GPU tier's own prerequisite) ─────────────
// The estate's engine row composes against the comfyui host default
// (127.0.0.1:8188 — E2E_GPU_ENGINE overrides the GATE's probe; the
// lane's own engine wiring rides the estate row's config, same
// default). A run the specs press must do REAL inference: the gate
// refuses (or skips, locally) when the engine is down or holds no
// cuda device. The engine's weights tree is the OPERATOR's real
// tree (/home/user/tools/comfyui on this machine — 37 GB) — the
// lane never provisions or mutates it.
const ENGINE_STATS = await httpBody(ENGINE_URL + '/system_stats', 5000)
if (ENGINE_STATS === '') {
  skipOrFail('engine at ' + ENGINE_URL + ' unreachable (the GPU tier needs a live engine)')
}
{
  let d = null
  try {
    d = JSON.parse(ENGINE_STATS)
  } catch {
    d = null
  }
  const devices = Array.isArray(d?.devices) ? d.devices : []
  if (!devices.some((dev) => dev?.type === 'cuda')) {
    skipOrFail('engine at ' + ENGINE_URL + ' holds no cuda device (the GPU tier needs real inference — check nvidia-smi)')
  }
}

// ── teardown: host kill (process group) + home removal, ALWAYS ───
let HOST_PGID = ''
async function cleanup() {
  if (HOST_PGID !== '') {
    try {
      process.kill(-Number(HOST_PGID), 'SIGTERM')
    } catch { /* already gone */ }
    for (let i = 0; i < 20; i++) {
      if (!(await httpRespond('http://127.0.0.1:' + PORT + '/', 1000))) break
      await sleep(1000)
    }
  }
  // E2E_GPU_KEEP=1 — the debug door: keep the throwaway home, runs
  // root and cookies for post-mortem (a hung-run hunt reads the run
  // records the teardown would wipe). The KEEP flag never touches
  // the kill: the host dies either way.
  if (process.env.E2E_GPU_KEEP === '1') {
    process.stdout.write(TAG + ' E2E_GPU_KEEP=1 — keeping ' + HOME_DIR + ' and ' + RUNS_ROOT + ' for post-mortem\n')
    return
  }
  rmSync(HOME_DIR, { recursive: true, force: true })
  rmSync(RUNS_ROOT, { recursive: true, force: true })
  rmSync(COOKIES, { recursive: true, force: true })
}

let laneExit = 0
try {
  laneExit = await runLane()
} finally {
  await cleanup()
}
// the .sh's last line: exit $PLAYWRIGHT_EXIT — the tier's verdict is
// the script's verdict, never swallowed (finally cleans, then exits).
process.exitCode = laneExit

/** The post-trap lane recipe; returns the script's exit code. */
async function runLane() {
  // ── the throwaway home (the studio recipe verbatim) ───────────────
  rmSync(HOME_DIR, { recursive: true, force: true })
  rmSync(RUNS_ROOT, { recursive: true, force: true })
  mkdirSync(join(HOME_DIR, 'profiles'), { recursive: true })
  mkdirSync(join(HOME_DIR, 'storages'), { recursive: true })
  cpSync(SEED_DIR, join(HOME_DIR, 'profiles', 'e2e-gpu'), { recursive: true, preserveTimestamps: true, verbatimSymlinks: true })
  if (!isDirSync(join(HOME_DIR, 'profiles', 'e2e-gpu', 'node_modules'))) {
    process.stdout.write(TAG + " materializing the tracked seed's deps (rewrite + pnpm install)\n")
    const homeCopy = join(HOME_DIR, 'profiles', 'e2e-gpu')
    const seedAt = join(REPO_ROOT, TRACKED_SEED)
    const deadLinks = rewriteSeedLinks(homeCopy, seedAt)
    if (deadLinks === null) return 1
    const installLog = '/tmp/e2e-gpu-seed-install.log'
    const pnpmEnv = {
      ...process.env,
      PATH: join(homedir(), '.local', 'share', 'mise', 'installs', 'node', '24.21.0', 'bin') + delimiter + join(homedir(), '.local', 'bin') + delimiter + (process.env.PATH || ''),
    }
    const fd = openSync(installLog, 'w')
    const r = spawnSync('pnpm', ['install', '--no-frozen-lockfile'], {
      cwd: homeCopy,
      env: pnpmEnv,
      stdio: ['ignore', fd, fd],
    })
    closeSync(fd)
    if (r.status !== 0) {
      process.stdout.write(TAG + ' seed pnpm install failed:\n')
      process.stdout.write(tailN(installLog, 8))
      return 1
    }
  }
  // settings.yaml — the KEYLESS law verbatim (D6 row-name wall): the
  // GPU door-tier lane carries no LLM subject. (The LIVE automotive
  // spec — a keyed lane — is a later round's own seat, gated on
  // DEEPSEEK_API_KEY, never this file.)
  const userSettings = join(homedir(), '.dsh', 'settings.yaml')
  if (isFileSync(userSettings)) {
    const keyed = keyedSettingsRows(userSettings)
    if (keyed === null) return 1
    if (keyed.length > 0) {
      process.stderr.write(
        'e2e-gpu-lane: refusing to copy settings.yaml into the KEYLESS lane — '
        + 'provider table row(s): ' + keyed.join(', ') + '\n'
        + '(strip the row or pin a keyless settings file; deploy-path audit D6)\n',
      )
      return 1
    }
    cpSync(userSettings, join(HOME_DIR, 'settings.yaml'))
  }

  // ── THE WORKSPACE PRE-STATE (seeded BEFORE boot) ──────────────────
  writeWorkspacePreState()

  // ── THE RUNS ROOT PIN (J12 law: the estate row's config) ──────────
  const ESTATE_PATCH = join(HOME_DIR, 'estate-state.patch.yml')
  writeFileSync(
    ESTATE_PATCH,
    '# minted by e2e-gpu-lane (J12): the estate row\'s config names the\n'
    + '# lane\'s runs root — never an env seam. GPU runs land on the\n'
    + '# THROWAWAY root, never the operator\'s tree.\n'
    + '- id: melite-estate\n'
    + '  config:\n'
    + '    stateRoot: "' + RUNS_ROOT + '"\n',
  )
  {
    const fd = openSync(LOG, 'w')
    closeSync(fd)
  }
  // setsid: the detached child becomes its own process-group leader,
  // so the group kill in cleanup() targets exactly the host tree.
  const host = spawn(
    DSH_BIN,
    ['--profile', 'e2e-gpu', '--patch', ESTATE_PATCH, '--host', '127.0.0.1', '--port', PORT, '--no-open'],
    {
      env: { ...process.env, DSH_HOME: HOME_DIR },
      stdio: ['ignore', openSync(LOG, 'a'), openSync(LOG, 'a')],
      detached: true,
    },
  )
  let hostSpawnError = null
  host.on('error', (e) => {
    hostSpawnError = e
  })
  HOST_PGID = host.pid === undefined ? '' : String(host.pid)
  const hostAlive = () => {
    if (hostSpawnError !== null || host.pid === undefined) return false
    try {
      process.kill(host.pid, 0)
      return true
    } catch {
      return false
    }
  }

  // ── wait for the token ────────────────────────────────────────────
  let TOKEN = ''
  const tokenRe = new RegExp('dsh web: http://127\\.0\\.0\\.1:' + PORT + '/\\?token=[A-Za-z0-9_-]*', 'g')
  for (let i = 0; i < 120; i++) {
    TOKEN = lastTokenFromLog(LOG, tokenRe)
    if (TOKEN !== '') break
    if (!hostAlive()) {
      process.stdout.write(TAG + ' host died at boot:\n')
      process.stdout.write(tailN(LOG, 5))
      return 1
    }
    await sleep(1000)
  }
  if (TOKEN === '') {
    process.stdout.write(TAG + ' no token after 120s:\n')
    process.stdout.write(tailN(LOG, 5))
    return 1
  }
  process.env.E2E_STUDIO_URL = 'http://127.0.0.1:' + PORT + '/?token=' + TOKEN
  process.stdout.write(TAG + ' host up: ' + process.env.E2E_STUDIO_URL + '\n')

  // ── seed the bench over the host's own /api wire ──────────────────
  // THE SPEC OWNS ITS BENCH (the tour's history law): every spec mints
  // its OWN conversation and seeds ITS bench through the estate's own
  // doors (seedBenchImageGen in the spec — bench/ensure + add-stage,
  // idempotent, CAS'd). The launcher seeds NOTHING: a pre-seeded
  // 'main' bench would make the specs pass or fail on lane history,
  // exactly the host-history wall the studio tour rejects.

  // ── the wall ──────────────────────────────────────────────────────
  // E2E_GPU=1 is the GPU tier's own gate (the specs skip without it —
  // the default studio run ignores e2e/gpu/ entirely, the keyless
  // law); E2E_RUNS_ROOT names the throwaway root (the ghost-wall
  // contract, verbatim).
  const pwEnv = {
    ...process.env,
    PATH: join(homedir(), '.local', 'share', 'mise', 'installs', 'node', '24.21.0', 'bin') + delimiter + join(homedir(), '.local', 'bin') + delimiter + (process.env.PATH || ''),
    E2E_RUNS_ROOT: RUNS_ROOT,
    E2E_GPU: '1',
  }
  const pw = spawnSync(
    'pnpm',
    ['--filter', CARD_VIEW_FILTER, 'exec', 'playwright', 'test', '-c', 'playwright.gpu.config.ts', ...LANE_ARGS],
    { env: pwEnv, stdio: 'inherit' },
  )
  const PLAYWRIGHT_EXIT = pw.status ?? 1

  // ── the host's own word (the studio seat's post-verdicts) ─────────
  if (grepQ(LOG, /Cannot find module/)) {
    process.stderr.write(TAG + ' host log carries a module-resolution failure:\n')
    process.stderr.write(grepN(LOG, /Cannot find module/))
    return 1
  }
  if (grepQ(LOG, /did not activate/)) {
    process.stderr.write(TAG + ' host boot carried activation failures (never benign):\n')
    process.stderr.write(grepN(LOG, /did not activate|failed to import/))
    return 1
  }
  for (const SIG of ['client bundle not found', 'startup failed']) {
    const sigRe = new RegExp(SIG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    if (grepQ(LOG, sigRe)) {
      process.stderr.write(TAG + " host log carries '" + SIG + "' (a serve-class boot death):\n")
      process.stderr.write(grepN(LOG, sigRe))
      return 1
    }
  }
  return PLAYWRIGHT_EXIT
}

function isDirSync(p) {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

function isFileSync(p) {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

/**
 * The PYSEED arm: rewrite relative link: deps in the copied seed's
 * package.json to absolute targets; returns null when it exited
 * non-zero (dead links), else the (empty) ok list.
 */
function rewriteSeedLinks(homeCopy, seedAt) {
  const pkg = join(homeCopy, 'package.json')
  const doc = JSON.parse(readFileSync(pkg, 'utf8')) // a corrupt seed fails loud, as the heredoc's traceback did
  const deps = {}
  for (const [name, ref] of Object.entries(doc.dependencies ?? {})) {
    if (typeof ref === 'string' && ref.startsWith('link:') && !isAbsolute(ref.slice(5))) {
      deps[name] = 'link:' + normalize(join(seedAt, ref.slice(5)))
    } else {
      deps[name] = ref
    }
  }
  doc.dependencies = deps
  writeFileSync(pkg, JSON.stringify(doc, null, 2))
  const dead = Object.entries(deps)
    .filter(([, r]) => typeof r === 'string' && r.startsWith('link:') && !existsSync(r.slice(5)))
    .map(([n]) => n)
  if (dead.length > 0) {
    // python list repr shape, byte-faithful: ['a', 'b']
    process.stderr.write(TAG + ' seed rewrite left dead links [' + dead.map((n) => `'${n}'`).join(', ') + ']\n')
    return null
  }
  return dead
}

/**
 * The keyless gate's scanner: top-level profile row names whose
 * blocks carry a `  providers:` table (the D6 regex, verbatim).
 */
function keyedSettingsRows(path) {
  let content = ''
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    return null
  }
  const re = /^([A-Za-z0-9_-]+):\n(?:  .*\n)*?  providers:/gm
  const keyed = []
  for (const m of content.matchAll(re)) {
    if (!keyed.includes(m[1])) keyed.push(m[1])
  }
  return keyed
}

/** The workspace pre-state row (a fresh workspace id, the repo root). */
function writeWorkspacePreState() {
  const row = randomUUID()
  const ts = '2026-09-21T00:00:00.000Z'
  const ws = {
    unit: { name: 'workspace', version: 2 },
    global: { initialized: true, workspaceIds: [row], archivedSessionIds: [] },
    tables: {
      workspaces: {
        [row]: {
          path: '__REPO_ROOT__',
          title: 'inference.cpp',
          sessionIds: [],
          createdAt: ts,
          updatedAt: ts,
        },
      },
    },
  }
  const out = join('data', 'runtime', 'e2e-gpu-home', 'storages', 'workspace.json')
  const body = JSON.stringify(ws).replaceAll('__REPO_ROOT__', process.cwd().replaceAll('\\', '/'))
  writeFileSync(out, body)
}

/** Minimal .env loader: KEY=VALUE (and `export KEY=VALUE`) lines. */
function loadEnvFile(path) {
  let content = ''
  try {
    content = readFileSync(path, 'utf8')
  } catch {
    return
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue
    const body = line.startsWith('export ') ? line.slice(7).trim() : line
    const eq = body.indexOf('=')
    if (eq <= 0) continue
    const key = body.slice(0, eq).trim()
    let value = body.slice(eq + 1).trim()
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}
