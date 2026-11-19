#!/usr/bin/env node
// commission-supervisor.mjs -- the transient-vs-quota law (§25's
// design question, answered; receipt: attempt034, 2026-09-24 — the
// maker died on turn TWO to "429 rate_limit_exceeded ... Please
// retry after a brief wait", a TRANSIENT gate, with the whole boot
// wasted and no transcript row).
//
// THE LAW the classifier owns: a rate-limit body that names QUOTA
// (usage limit | quota | RESOURCE_EXHAUSTED | GoUsageLimit | a
// reset window) is a WALL — stop per the STOP LAW, exit 75, token
// (never burn past it). A rate-limit body WITHOUT quota language
// (rate_limit_exceeded | overloaded | 429 alone) is a MOMENT — the
// message itself sanctions "retry after a brief wait", so the
// supervisor relaunches the commission with backoff, capped. Every
// other death passes through loud, no token, no relaunch (the
// queue-lane no-silent-absorbs law).
//
// The relaunch inherits its state the §28 way: the transcript IS
// the durable loop state (the maker re-reads brief + transcript);
// a death before the first transcript row just re-runs the brief.
//
// Usage: commission-supervisor.mjs <launch-prompt-file> [out-prefix]
//   <launch-prompt-file>  a file holding the COMPLETE converged
//                         launch prompt (the runbook's laws ride in
//                         the prompt, not the brief — never bare).
//   [out-prefix]          attempt logs land at <prefix>-attempt<k>.log
// Knobs (tests stub the binary + zero the backoff):
//   SUPERVISOR_DSH_BIN       (default: first dsh on PATH, run via node)
//   SUPERVISOR_PROFILE       REQUIRED — the DSH profile the maker
//                             boots (the estate maker lane is
//                             `estate`); no default lane exists
//   SUPERVISOR_DSH_PATCH     optional --patch overlay path, passed to
//                             the launcher before the prompt (machine-
//                             local provider rows compose with the
//                             repo-rendered estate rows — apply.sh's
//                             own call-time overlay shape; empty = off)
//   SUPERVISOR_STATE_ROOT    (default the repo root) — rides the
//                             minted estate overlay's stateRoot (J12)
//   SUPERVISOR_STATE_ROOTS   §23 cross-roots manifest (":"-joined,
//                             default <state root>/data/runs) — rides
//                             the minted estate overlay's stateRoots
//   SUPERVISOR_MAX_ATTEMPTS  (default 3)
//   SUPERVISOR_BACKOFF_S     (default 60)
//   SUPERVISOR_LOCK_WAIT_S   (default 1800) the pre-launch turn-wait
//                             on the queue lock (two makers, one
//                             queue: the second WAITS, never demotes)
//   SUPERVISOR_DONE_MARKER   exact transcript path (the legacy law)
//   SUPERVISOR_DONE_GLOB     transcript glob (the collision-law
//                             names): a file matching it whose mtime
//                             is NEWER than this supervisor's boot
//                             counts as the done marker — the maker
//                             mints transcript-<slug>-<HHMM>.md at
//                             FINISH time, so a caller-predicted
//                             exact path never matches (the 2026-09-26
//                             mismatchint: two successful commissions
//                             read as boot flakes and burned duplicate
//                             attempts)
// Exit: 0 commission exited 0; 75 rate-wall (token written); any
//   other code is the commission's own, passed through loud.
import { spawnSync } from 'node:child_process'
import { accessSync, closeSync, constants as fsConstants, openSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { delimiter, join, resolve } from 'node:path'
import { homedir } from 'node:os'

const SCRIPT_NAME = 'commission-supervisor'

const PROMPT_FILE = process.argv[2]
if (!PROMPT_FILE) {
  process.stderr.write('usage: commission-supervisor.mjs <launch-prompt-file> [out-prefix]\n')
  process.exit(1)
}
const OUT_PREFIX = process.argv[3] || '/tmp/commission'

/** ${VAR:-fallback}: empty string counts as unset, as in bash. */
function knob(name, fallback) {
  const v = process.env[name]
  return v === undefined || v === '' ? fallback : v
}

/** Numeric knob; an unset knob takes the default (a bad literal falls
 * back too — bash would error the comparison and skip the wait). */
function intKnob(name, fallback) {
  const v = Number.parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(v) ? v : fallback
}

/** `command -v <name>`: first PATH entry holding an executable file. */
function resolveOnPath(name) {
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    if (!dir) continue
    const p = join(dir, name)
    try {
      accessSync(p, fsConstants.X_OK)
      if (statSync(p).isFile()) return p
    } catch { /* not here */ }
  }
  return null
}

const DSH_BIN = knob('SUPERVISOR_DSH_BIN', '') || resolveOnPath('dsh') || 'dsh'
const PROFILE = knob('SUPERVISOR_PROFILE', '')
if (!PROFILE) {
  process.stderr.write(SCRIPT_NAME + ': SUPERVISOR_PROFILE is required — name the DSH profile the maker boots (the estate maker lane is estate)\n')
  process.exit(1)
}
const PATCH_ARGS = (() => {
  const p = knob('SUPERVISOR_DSH_PATCH', '')
  return p ? ['--patch', p] : []
})()
const STATE_ROOT = knob('SUPERVISOR_STATE_ROOT', resolve(import.meta.dirname, '..'))
const LOCK_WAIT_S = intKnob('SUPERVISOR_LOCK_WAIT_S', 1800)
// THE GLOB LAW'S CLOCK ZERO: any transcript minted from NOW on is
// THIS supervisor's — an older same-pattern file never satisfies it.
const BOOT_TS = Math.floor(Date.now() / 1000)
// §23 CROSS-ROOTS (the media-tab catch, 2026-09-24): the maker mints
// under STATE_ROOT/output while the user's 3088 GUI estate serves
// data/runs/output — two trees, ONE manifest. Without the manifest the
// maker's run doors (status/list/view) answer unknown-run for the
// user-lane's runs, and (the operator's catch) the GUI's media tab
// never lists the maker's films. Own root always leads; extras name
// the user's tree explicitly (roots are named, never inferred).
// J12: the roots ride the estate row's CONFIG — the supervisor mints
// a --patch overlay (the flag is repeatable, so an operator overlay
// set via SUPERVISOR_DSH_PATCH rides untouched before it).
const STATE_ROOTS = knob('SUPERVISOR_STATE_ROOTS', join(STATE_ROOT, 'data', 'runs'))
const MINTED_PATCH = OUT_PREFIX + '-estate.patch.yml'
{
  const mint =
    '# minted by commission-supervisor (J12): the estate row names\n' +
    '# the maker state root + the cross-roots manifest by config.\n' +
    '- id: melite-estate\n' +
    '  config:\n' +
    '    stateRoot: "' + STATE_ROOT + '"\n' +
    '    stateRoots: "' + STATE_ROOTS + '"\n'
  writeFileSync(MINTED_PATCH, mint)
}
// THE BRAIN RIDES THE MINT (the seating law, 2026-10-18: env seams are
// retired — the estate row's CONFIG owns seating). A --patch row
// REPLACES the row's config wholesale, so the rendered agentRoute dies
// here unless the mint re-carries it; the caller's MELITE_AGENT_ROUTE
// names the brain (the commission receipt reports the route, never
// leaves it implied).
{
  const agentRoute = knob('MELITE_AGENT_ROUTE', '')
  if (agentRoute) {
    writeFileSync(MINTED_PATCH, '    agentRoute: "' + agentRoute + '"\n', { flag: 'a' })
  }
}
// The critic rides the same law (the V6/J12 cure retired the env-read
// seam: a critic pinned only through the environment never seats, and
// the craft enumeration falls to its first image-capable default —
// keyless or not, MISSING_CREDENTIAL at the first critique).
{
  const criticRoute = knob('MELITE_CRITIC_ROUTE', '')
  if (criticRoute) {
    writeFileSync(MINTED_PATCH, '    criticRoute: "' + criticRoute + '"\n', { flag: 'a' })
  }
}
const MAX_ATTEMPTS = intKnob('SUPERVISOR_MAX_ATTEMPTS', 3)
const BACKOFF_S = intKnob('SUPERVISOR_BACKOFF_S', 60)
// bash: export PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$PATH"
const CHILD_ENV = { ...process.env }
CHILD_ENV.PATH = join(homedir(), '.local', 'share', 'mise', 'installs', 'node', '24.21.0', 'bin') + delimiter + (process.env.PATH || '')

const TOKEN = OUT_PREFIX + '-resume.token.md'

function isFile(p) {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}

/** grep -qiE over the log file; an unreadable log matches nothing. */
function grepLog(re, log) {
  try {
    return re.test(readFileSync(log, 'utf8'))
  } catch {
    return false
  }
}

function quotaWall(log) {
  // A rate limit that names a PLAN/QUOTA window — the wall, never
  // retried here (the STOP LAW owns it). Order matters: quota words
  // are checked BEFORE the transient pattern; a body carrying both
  // is a wall (the dead-key receipt: "429 Go usage limit exceeded").
  return grepLog(/usage[ _-]?limit|quota|resource_exhausted|GoUsageLimit/i, log)
}

// bash glob '*'/'?' over the basename (the dirname is literal); an
// unmatched pattern yields no candidates, as bash's literal-pattern
// miss failed the -f test.
function expandGlob(pattern) {
  const sep = pattern.lastIndexOf('/')
  const dir = sep === -1 ? '.' : sep === 0 ? '/' : pattern.slice(0, sep)
  const base = pattern.slice(sep + 1)
  const re = new RegExp(
    '^'
    + base.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '.')
    + '$',
  )
  let names
  try {
    names = readdirSync(dir)
  } catch {
    return []
  }
  return names
    .filter((n) => (base.startsWith('.') || !n.startsWith('.')) && re.test(n))
    .map((n) => join(dir, n))
}

function markerPresent() {
  // the exact path (legacy) — a plain -f
  const exact = knob('SUPERVISOR_DONE_MARKER', '')
  if (exact && isFile(exact)) return true
  // the glob (collision-law names): any file matching the pattern
  // whose mtime is at or after BOOT_TS — the supervisor's own mint,
  // not a sibling session's older transcript in the shared namespace
  const glob = knob('SUPERVISOR_DONE_GLOB', '')
  if (glob) {
    for (const pattern of glob.split(/\s+/)) {
      if (!pattern) continue
      for (const f of expandGlob(pattern)) {
        let mt = 0
        try {
          mt = Math.floor(statSync(f).mtimeMs / 1000)
        } catch {
          continue
        }
        if (mt >= BOOT_TS) return true
      }
    }
  }
  return false
}

function bootFlake(log) {
  // THE STRUCTURAL LAW (035 attempts 7, 10, 11 — 2026-09-24): the
  // flake's WORDING varies ("not available on my callable tool
  // surface", "does not expose the required read or bash tools",
  // "don't have a file-reading or shell tool") — phrasing-greps
  // whiffed on attempt 11. The INVARIANT: a lawful commission
  // ALWAYS writes its transcript (the brief's own contract); a
  // flaked boot never mints runs and never writes it. Exit 0 with
  // the done-marker ABSENT = boot flake, relaunch. (The legacy
  // door-absence greps stay as a belt for marker-less callers.)
  if (knob('SUPERVISOR_DONE_MARKER', '') || knob('SUPERVISOR_DONE_GLOB', '')) {
    return !markerPresent()
  }
  return grepLog(
    /not available on my callable tool surface|cannot make an absent tool available|does not expose the required|can.t access the (required|requested)|cannot access the (required|requested)|unable to access the (required|requested)|file-reading or shell tool/i,
    log,
  )
}

function lockHolderAlive(lock) {
  // the maker lane's queue lock: STATE_ROOT/gateway.lock holds the
  // owning pid (queueLock.acquireLock). A live holder (kill -0
  // answers, EPERM included) means a sibling maker OWNS the queue —
  // the queue is the serializer, the lock is the turn signal.
  if (!isFile(lock)) return false
  let raw = ''
  try {
    raw = readFileSync(lock, 'utf8')
  } catch {
    return false
  }
  const pid = raw.replace(/\s+/g, '')
  if (!/^\d+$/.test(pid)) return false
  try {
    process.kill(Number(pid), 0)
    return true
  } catch (e) {
    return e?.code === 'EPERM'
  }
}

/** Synchronous sleep (the supervisor is a sequential driver). */
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function waitForQueueLock() {
  // TWO MAKERS, ONE QUEUE (the operator's law, 2026-09-26: "two
  // makers shouldn't be a problem with the queue system" — and with
  // the turn-wait they are not): a second supervisor over the same
  // state root does NOT race its maker into a seatless boot (the
  // demotion chain: QueueService throws on the live-pid lock →
  // RunsRuntimeService's hard inject on "queue" is unsatisfied →
  // the runs seat never mounts → every runs-family call answers
  // the chat-lane voice — receipts: transcripts 0014/0015/0025,
  // 2026-09-26). It WAITS its turn at the lock, then launches into
  // a fully-seated lane. Bound: LOCK_WAIT_S; on expiry it launches
  // anyway and the maker's own loud refusal (never a silent demote)
  // rides the transient gate's relaunch.
  const lock = join(STATE_ROOT, 'gateway.lock')
  let waited = 0
  while (LOCK_WAIT_S > 0 && lockHolderAlive(lock)) {
    if (waited === 0) {
      process.stderr.write(SCRIPT_NAME + ': queue lock held by a live sibling maker — waiting our turn (bound ' + LOCK_WAIT_S + 's)\n')
    } else if (waited % 30 === 0) {
      process.stderr.write(SCRIPT_NAME + ': still waiting on the queue lock (' + waited + 's / ' + LOCK_WAIT_S + 's)\n')
    }
    sleep(5000)
    waited += 5
    if (waited >= LOCK_WAIT_S) {
      process.stderr.write(SCRIPT_NAME + ': lock wait expired after ' + waited + 's — launching; the maker\'s own boot gate refuses loud if the sibling still holds it\n')
      return
    }
  }
}

function transientGate(log) {
  // A rate limit with no quota language — the moment. The message
  // itself sanctions the retry ("Please retry after a brief wait").
  // THE EMPTY-RESPONSE ARM (035 attempt-13, 2026-09-24):
  // PI_AI_ERROR: Provider returned an empty response — a provider
  // moment, no quota language, retryable.
  // THE LOCK-EXPIRY ARM (2026-09-26): the estate queue's own loud
  // refusal ("estate-queue: gateway.lock held by live pid" /
  // "[gateway] REFUSING TO START") is a TURN problem, not a
  // commission death — relaunch under the same bounded policy.
  return grepLog(/rate[ _-]?limit|overloaded|429|provider returned an empty response|gateway\.lock held by live pid|REFUSING TO START/i, log)
}

/** tail -20 of the log, byte-faithful (trailing newline preserved). */
function tail20(log) {
  let content = ''
  try {
    content = readFileSync(log, 'utf8')
  } catch {
    return ''
  }
  const endsNL = content.endsWith('\n')
  const lines = endsNL ? content.slice(0, -1).split('\n') : content.split('\n')
  if (lines.length === 1 && lines[0] === '') return ''
  return lines.slice(-20).join('\n') + (endsNL ? '\n' : '')
}

function writeToken(kind, log) {
  // kind reset-token brief attempts last-words resume — §25's shape.
  const body =
    '# resume token -- ' + kind + ' rate wall (do NOT edit by hand)\n'
    + '\n'
    + '- brief prompt: ' + PROMPT_FILE + '\n'
    + '- last attempt log: ' + log + '\n'
    + '- attempts made: ' + ATTEMPT + '\n'
    + '\n'
    + '## last maker words (the attempt log tail)\n'
    + tail20(log)
    + '\n'
    + '## resume\n'
    + 'Re-invoke the supervisor with the same prompt file once the window\n'
    + 'passes; the maker re-reads brief + transcript (§28 — the transcript\n'
    + 'IS the durable loop state) and continues instead of restarting.\n'
  writeFileSync(TOKEN, body)
  process.stderr.write(SCRIPT_NAME + ': ' + kind + ' rate wall after ' + ATTEMPT + ' attempt(s) -- token at ' + TOKEN + '\n')
}

let ATTEMPT = 0
// THE LANE-KEY PLANE (the wall's own law, 2026-10-13: a lane's boot env
// must provide every apiKeyEnv name its rows name — the wall reads the
// RUNNING process's environ, so a lane launched from a thin shell bounces
// every commit made while it lives). Source the refs file into the lane's
// env without printing a value: only names ride the log.
const CREDENTIALS_REF_PY = [
  'import sys, yaml',
  'doc = yaml.safe_load(open(sys.argv[1]))',
  'val = (doc.get("refs") or {}).get(sys.argv[2])',
  'if isinstance(val, str) and val:',
  '    sys.stdout.write(val)',
  '',
].join('\n')
const CREDENTIALS_PATH = join(homedir(), '.dsh', '.credentials.yaml')
for (const key of [
  'OPENCODE_API_KEY',
  'OPENROUTER_API_KEY',
  'QWEN_VLLM_API_KEY',
  'XIAOMI_TOKEN_PLAN_SGP_API_KEY',
  'ZAI_API_KEY',
]) {
  if (CHILD_ENV[key] || !isFile(CREDENTIALS_PATH)) continue
  const r = spawnSync('python3', ['-', CREDENTIALS_PATH, key], {
    input: CREDENTIALS_REF_PY,
    encoding: 'utf8',
    env: CHILD_ENV,
  })
  const val = (r.status === 0 && typeof r.stdout === 'string' ? r.stdout : '').replace(/\n+$/, '')
  if (val) CHILD_ENV[key] = val
}

// $(cat file): command substitution strips ALL trailing newlines.
function readPrompt(path) {
  try {
    return readFileSync(path, 'utf8').replace(/\n+$/, '')
  } catch (e) {
    const reason = e?.code === 'ENOENT' ? 'No such file or directory'
      : e?.code === 'EACCES' ? 'Permission denied'
        : String(e?.message ?? e)
    process.stderr.write('cat: ' + path + ': ' + reason + '\n')
    return ''
  }
}

while (true) {
  ATTEMPT += 1
  const LOG = OUT_PREFIX + '-attempt' + ATTEMPT + '.log'
  // THE TURN-WAIT: never launch a maker into a lock its sibling owns
  waitForQueueLock()
  const fd = openSync(LOG, 'w')
  const r = spawnSync('node', [DSH_BIN, '--profile', PROFILE, ...PATCH_ARGS, '--patch', MINTED_PATCH, readPrompt(PROMPT_FILE)], {
    env: CHILD_ENV,
    stdio: ['ignore', fd, fd],
  })
  closeSync(fd)
  // a missing node binary dies 127 in bash ("command not found"); any
  // other spawn failure carries no shell code — 1 stands in.
  const CODE = r.error?.code === 'ENOENT' ? 127 : (r.status ?? 1)

  if (CODE === 0) {
    // THE BOOT-FLAKE GATE (035 attempts 7+10, 2026-09-24): a maker
    // that booted WITHOUT its file doors exits 0 with a blocked
    // report ("not available on my callable tool surface") — a
    // clean exit masking an infra moment, not a commission verdict.
    // Same class as a transient rate gate: relaunch, capped.
    if (bootFlake(LOG)) {
      if (ATTEMPT >= MAX_ATTEMPTS) {
        process.stderr.write(SCRIPT_NAME + ': boot flake capped at ' + ATTEMPT + ' attempt(s) -- passing the last log through\n')
        process.exit(0)
      }
      process.stderr.write(SCRIPT_NAME + ': boot flake (attempt ' + ATTEMPT + ') -- relaunching in ' + BACKOFF_S + 's\n')
      sleep(BACKOFF_S * 1000)
      continue
    }
    process.exit(0)
  }

  if (quotaWall(LOG)) {
    writeToken('quota', LOG)
    process.exit(75)
  }

  if (transientGate(LOG)) {
    if (ATTEMPT >= MAX_ATTEMPTS) {
      writeToken('transient-capped', LOG)
      process.exit(75)
    }
    process.stderr.write(SCRIPT_NAME + ': transient rate gate (attempt ' + ATTEMPT + ', exit ' + CODE + ') -- relaunching in ' + BACKOFF_S + 's\n')
    sleep(BACKOFF_S * 1000)
    continue
  }

  // Any other death: the commission's own code, loud, no token.
  process.exit(CODE)
}
