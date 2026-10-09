/**
 * commission-supervisor.spec.ts — repository script spec (DSH tier
 * 1 covers scripts/**.spec.ts): the transient-vs-quota law (§25's
 * design question, answered; receipt: attempt034 — the maker died
 * on turn two to a transient 429 with no retry).
 *
 * Stub dsh binaries (node one-liners — the supervisor invokes via
 * node, as the recipe does), backoff zeroed, hermetic and instant:
 *  - TRANSIENT death → relaunch (two attempt logs), then exit 0.
 *  - TRANSIENT capped out → exit 75, token names transient-capped.
 *  - QUOTA death (the dead-key receipt's words) → NO relaunch, one
 *    attempt log, exit 75, token names quota.
 *  - quota words WIN when a body carries both (wall, not moment).
 *  - any other death → passthrough exit code, no token, one log.
 *  - success on attempt 1 → exit 0, one log, no token.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const SCRIPT = join(ROOT, 'scripts', 'commission-supervisor.sh')

/** Tonight's verbatim transient body (attempt034 receipt). */
const TRANSIENT_ERR = 'dsh: RATE_LIMIT: OpenAI API error (429): {"code":"rate_limit_exceeded","message":"Rate limit exceeded. Please retry after a brief wait.","param":null,"type":"rate_limit_error"}'
/** The dead-key quota body (the KEY SOURCE receipt, runbook). */
const QUOTA_ERR = 'dsh: RATE_LIMIT: 429 Go usage limit exceeded (admin cap); reset 2026-09-24 09:00:00'

type Arm = 'transient' | 'transient2' | 'quota' | 'both' | 'boom' | 'ok' | 'flake' | 'flake2' | 'flake3' | 'flake4' | 'empty' | 'lockrefused'

/** The arm bodies (exit code + stderr text). */
function stubBody(arm: Arm): { code: number, err: string } {
  const bodies: Record<Arm, { code: number, err: string }> = {
    transient: { code: 1, err: TRANSIENT_ERR },
    transient2: { code: 1, err: TRANSIENT_ERR },
    quota: { code: 1, err: QUOTA_ERR },
    both: { code: 1, err: TRANSIENT_ERR + '\n' + QUOTA_ERR },
    boom: { code: 2, err: 'engine exploded' },
    ok: { code: 0, err: '' },
    // THE BOOT FLAKE (035 attempts 7/10/11): a CLEAN exit with NO
    // transcript — the phrasing varies, the absence is the law.
    flake: { code: 0, err: 'this session does not expose the required read or bash tools (any wording)' },
    flake2: { code: 0, err: 'completely different words entirely' },
    flake3: { code: 0, err: "I can't access the required read/bash tool" },
    flake4: { code: 0, err: "I'm unable to access the requested BRIEF12.md or the file/command tools" },
    // THE EMPTY RESPONSE (035 attempt-13): a provider moment —
    // retryable, no quota language.
    empty: { code: 1, err: 'dsh: PI_AI_ERROR: Provider returned an empty response' },
    // THE LOCK-EXPIRY ARM (2026-09-26): the estate queue's own loud
    // refusal after a turn-wait expiry — a turn problem, relaunchable.
    lockrefused: { code: 1, err: 'estate-queue: gateway.lock held by live pid 424242 (state root /repo)' },
  }
  return bodies[arm]!
}

/** A stub that dies (or succeeds) with the named arm's shape. */
function stubFor(arm: Arm): string {
  const b = stubBody(arm)
  const wt = arm === 'ok'
    ? 'require("node:fs").writeFileSync(__dirname + "/transcript.md", "final report\\n");\n'
    : ''
  return wt + 'process.stderr.write(' + JSON.stringify(b.err) + ');process.exit(' + String(b.code) + ');\n'
}

function stage(arms: Arm[]): { dir: string, prompt: string, prefix: string } {
  const dir = mkdtempSync(join(tmpdir(), 'cs-spec-'))
  // sequence stub: each INVOCATION increments an on-disk counter and
  // plays arms[counter-1] — the supervisor itself carries no attempt
  // state to the child, so the stub must count its own calls.
  // fewer arms than attempts is a test bug (the map's 'ok' default
  // makes an under-provisioned sequence succeed, failing loudly).
  writeFileSync(join(dir, 'seq.js'),
    'const { readFileSync, writeFileSync } = require("node:fs");\n'
    + 'const arms = ' + JSON.stringify(arms) + ';\n'
    + 'const map = ' + JSON.stringify({
      transient: stubFor('transient'), transient2: stubFor('transient2'),
      quota: stubFor('quota'), both: stubFor('both'),
      boom: stubFor('boom'), ok: stubFor('ok'), flake: stubFor('flake'), flake2: stubFor('flake2'), flake3: stubFor('flake3'), flake4: stubFor('flake4'), empty: stubFor('empty'), lockrefused: stubFor('lockrefused'),
    }) + ';\n'
    + 'const k = Number(readFileSync(__dirname + "/seq-index", "utf8").trim() || "0") + 1;\n'
    + 'writeFileSync(__dirname + "/seq-index", String(k));\n'
    + 'eval(map[arms[k - 1]] ?? map.ok);\n')
  writeFileSync(join(dir, 'seq-index'), '0')
  const prompt = join(dir, 'prompt.txt')
  writeFileSync(prompt, 'make the bumper film\n')
  return { dir, prompt, prefix: join(dir, 'commission') }
}

function run(dir: string, prompt: string, prefix: string, extra: Record<string, string> = {}): number {
  try {
    execFileSync('bash', [SCRIPT, prompt, prefix], {
      env: {
        ...process.env,
        SUPERVISOR_DSH_BIN: join(dir, 'seq.js'),
        SUPERVISOR_BACKOFF_S: '0',
        SUPERVISOR_MAX_ATTEMPTS: '3',
        ...extra,
        SUPERVISOR_DONE_MARKER: join(dir, 'transcript.md'),
        // THE TURN-WAIT MUST NEVER SEE THE OPERATOR'S REAL QUEUE
        // (2026-09-26). `wait_for_queue_lock` polls
        // `${STATE_ROOT}/gateway.lock`; with STATE_ROOT left at its
        // default (this repo), every arm of this suite consulted the
        // LIVE studio lane's lock, waited out the 1800s default and
        // died at the 30s exec timeout — 17 walls red for a machine
        // fact, not a behaviour. Pin the state root to the test's own
        // tmp dir so the wait is exercised against THIS test's lock
        // (the lock arms below set their own wait bound explicitly) and
        // the suite is hermetic again.
        SUPERVISOR_STATE_ROOT: dir,
        SUPERVISOR_LOCK_WAIT_S: '0',
      },
      timeout: 30_000,
      stdio: 'pipe',
    })
    return 0
  } catch (e) {
    assert.ok(e !== null && typeof e === 'object' && 'status' in e, 'an exec failure, got ' + String(e))
    return (e as { status: number | null }).status ?? -1
  }
}

function runWithoutDoneMarker(dir: string, prompt: string, prefix: string): number {
  try {
    execFileSync('bash', [SCRIPT, prompt, prefix], {
      env: {
        ...process.env,
        SUPERVISOR_DSH_BIN: join(dir, 'seq.js'),
        SUPERVISOR_BACKOFF_S: '0',
        SUPERVISOR_MAX_ATTEMPTS: '3',
        SUPERVISOR_DONE_MARKER: '',
        // hermetic turn-wait, same reason as run() above
        SUPERVISOR_STATE_ROOT: dir,
        SUPERVISOR_LOCK_WAIT_S: '0',
      },
      timeout: 30_000,
      stdio: 'pipe',
    })
    return 0
  } catch (e) {
    assert.ok(e !== null && typeof e === 'object' && 'status' in e, 'an exec failure, got ' + String(e))
    return (e as { status: number | null }).status ?? -1
  }
}

function attemptLogs(prefix: string): string[] {
  return readdirSync(join(prefix, '..'))
    .filter((f) => f.startsWith(prefix.split('/').pop()! + '-attempt'))
    .sort()
}

describe('commission-supervisor.sh — the transient-vs-quota law (§25 answered)', () => {
  it('a TRANSIENT 429 relaunches: second attempt succeeds, exit 0, two attempt logs', () => {
    const { dir, prompt, prefix } = stage(['transient', 'ok'])
    assert.equal(run(dir, prompt, prefix), 0)
    const logs = attemptLogs(prefix)
    assert.equal(logs.length, 2, 'two attempts ran: ' + logs.join(','))
    assert.ok(!existsSync(prefix + '-resume.token.md'), 'no token on success')
  })

  it('TRANSIENT capped out (3 straight) exits 75 with a transient-capped token', () => {
    const { dir, prompt, prefix } = stage(['transient', 'transient2', 'transient'])
    assert.equal(run(dir, prompt, prefix), 75)
    assert.equal(attemptLogs(prefix).length, 3, 'the cap is 3')
    const body = readFileSync(prefix + '-resume.token.md', 'utf8')
    assert.ok(body.includes('transient-capped'), body)
    assert.ok(body.includes('attempts made: 3'), body)
  })

  it('a QUOTA death never relaunches: one attempt log, exit 75, quota token', () => {
    const { dir, prompt, prefix } = stage(['quota', 'ok'])
    assert.equal(run(dir, prompt, prefix), 75)
    assert.equal(attemptLogs(prefix).length, 1, 'the wall is never retried')
    const body = readFileSync(prefix + '-resume.token.md', 'utf8')
    assert.ok(body.includes('quota rate wall'), body)
  })

  it('quota words WIN over transient words when a body carries both (wall, not moment)', () => {
    const { dir, prompt, prefix } = stage(['both', 'ok'])
    assert.equal(run(dir, prompt, prefix), 75)
    assert.equal(attemptLogs(prefix).length, 1, 'a both-words body is a wall')
  })

  it('any other death passes through loud: own exit code, no token, no relaunch', () => {
    const { dir, prompt, prefix } = stage(['boom', 'ok'])
    assert.equal(run(dir, prompt, prefix), 2)
    assert.equal(attemptLogs(prefix).length, 1)
    assert.ok(!existsSync(prefix + '-resume.token.md'))
  })

  it('a BOOT FLAKE (exit 0, no transcript) relaunches: second attempt succeeds, two attempt logs', () => {
    const { dir, prompt, prefix } = stage(['flake', 'ok'])
    assert.equal(run(dir, prompt, prefix), 0)
    assert.deepEqual(attemptLogs(prefix), ['commission-attempt1.log', 'commission-attempt2.log'])
    assert.ok(!existsSync(prefix + '-resume.token.md'), 'no token for a flake recovery')
    assert.ok(existsSync(join(dir, 'transcript.md')), 'the recovered attempt wrote the transcript')
  })

  it('a PROVIDER EMPTY RESPONSE relaunches like a transient rate gate (035 attempt-13 receipt)', () => {
    const { dir, prompt, prefix } = stage(['empty', 'ok'])
    assert.equal(run(dir, prompt, prefix), 0)
    assert.deepEqual(attemptLogs(prefix), ['commission-attempt1.log', 'commission-attempt2.log'])
  })

  it('the flake gate is WORDING-AGNOSTIC (attempt-11 receipt: a clean exit with any words and no transcript relaunches)', () => {
    const { dir, prompt, prefix } = stage(['flake2', 'ok'])
    assert.equal(run(dir, prompt, prefix), 0)
    assert.deepEqual(attemptLogs(prefix), ['commission-attempt1.log', 'commission-attempt2.log'])
  })

  it('the no-marker classifier catches the required read/bash access wording', () => {
    const { dir, prompt, prefix } = stage(['flake3', 'ok'])
    assert.equal(runWithoutDoneMarker(dir, prompt, prefix), 0)
    assert.deepEqual(attemptLogs(prefix), ['commission-attempt1.log', 'commission-attempt2.log'])
  })

  it('the no-marker classifier catches unable-to-access requested-file wording', () => {
    const { dir, prompt, prefix } = stage(['flake4', 'ok'])
    assert.equal(runWithoutDoneMarker(dir, prompt, prefix), 0)
    assert.deepEqual(attemptLogs(prefix), ['commission-attempt1.log', 'commission-attempt2.log'])
  })

  it('a CLEAN exit with a healthy log never relaunches (the gate matches door-absence words only)', () => {
    const { dir, prompt, prefix } = stage(['ok'])
    assert.equal(run(dir, prompt, prefix), 0)
    assert.deepEqual(attemptLogs(prefix), ['commission-attempt1.log'])
  })

  it('success on attempt 1: exit 0, one log, no token', () => {
    const { dir, prompt, prefix } = stage(['ok'])
    assert.equal(run(dir, prompt, prefix), 0)
    assert.equal(attemptLogs(prefix).length, 1)
    assert.ok(!existsSync(prefix + '-resume.token.md'))
  })

  it('SUPERVISOR_DSH_PATCH rides the launch argv as --patch <path> before the prompt, and the empty knob launches bare (2026-10-12 wall)', () => {
    const { dir, prompt, prefix } = stage(['ok'])
    // the stub must tell us what the supervisor ACTUALLY launched with:
    // argv recorded, then the ok arm plays — transcript only on the
    // recorded shape, so a silent argv change fails the receipt assert.
    writeFileSync(join(dir, 'seq.js'),
      'require("node:fs").writeFileSync(__dirname + "/argv.txt", process.argv.join("\\n"));\n'
      + stubFor('ok'))
    const patch = join(dir, 'llm.patch.yml')
    writeFileSync(patch, '# provider rows\n')
    assert.equal(run(dir, prompt, prefix, { SUPERVISOR_DSH_PATCH: patch }), 0)
    const argv = readFileSync(join(dir, 'argv.txt'), 'utf8').split('\n')
    assert.ok(argv.includes('--patch'), '--patch flag in argv: ' + argv.join(' '))
    assert.ok(argv.includes(patch), 'patch path in argv: ' + argv.join(' '))
    assert.ok(argv.indexOf('--patch') < argv.indexOf(readFileSync(prompt, 'utf8').trim()), '--patch rides before the prompt')
    // and without the knob the ONLY --patch is the minted estate
    // overlay (J12): one flag, the estate row's own pin, still
    // before the prompt
    writeFileSync(join(dir, 'seq-index'), '0')
    writeFileSync(join(dir, 'argv.txt'), '')
    assert.equal(run(dir, prompt, prefix), 0)
    const bare = readFileSync(join(dir, 'argv.txt'), 'utf8').split('\n')
    const patches = bare.filter((a) => a === '--patch').length
    assert.equal(patches, 1, 'exactly one --patch without the knob (the minted estate overlay): ' + bare.join(' '))
    assert.ok(bare.includes(prefix + '-estate.patch.yml'),
      'the minted estate overlay rides the argv: ' + bare.join(' '))
    assert.ok(bare.indexOf('--patch') < bare.indexOf(readFileSync(prompt, 'utf8').trim()),
      'the minted overlay rides before the prompt')
  })
})

describe('commission-supervisor — the done-marker glob (the mismatchint fix, 2026-09-26)', () => {
  function runGlob(dir: string, prompt: string, prefix: string, env: Record<string, string>): { code: number, stderr: string } {
    const r = spawnSync('bash', [SCRIPT, prompt, prefix], {
      env: { ...process.env, SUPERVISOR_DSH_BIN: join(dir, 'seq.js'), SUPERVISOR_BACKOFF_S: '0', SUPERVISOR_MAX_ATTEMPTS: '3', SUPERVISOR_STATE_ROOT: dir, SUPERVISOR_LOCK_WAIT_S: '0', ...env },
      timeout: 30_000, encoding: 'utf8',
    })
    return { code: r.status ?? -1, stderr: (r.stderr ?? '') + (r.stdout ?? '') }
  }

  it('a collision-law transcript name (globe-matched, minted fresh) satisfies the done marker — no duplicate attempt', () => {
    const { dir, prompt, prefix } = stage([])
    // the stub mints a FINISH-TIME name the caller could not predict
    // (escape-free source: String.fromCharCode(10) — no backslash
    // layers between python-heredoc, TS string, and the stub file)
    const NL = 'String.fromCharCode(10)'
    writeFileSync(join(dir, 'seq.js'),
      'require("node:fs").writeFileSync(__dirname + "/transcript-tide-20300101-0405.md", "final report" + ' + NL + ');'
      + 'process.exit(0);' + NL + ';')
const r = runGlob(dir, prompt, prefix, { SUPERVISOR_DONE_GLOB: join(dir, 'transcript-tide-*.md'), SUPERVISOR_DONE_MARKER: '' })
    assert.equal(r.code, 0, 'stderr: ' + r.stderr.slice(0, 200))
    assert.deepEqual(attemptLogs(prefix), ['commission-attempt1.log'], 'the glob law saw the fresh mint — one attempt only')
  })

  it('a PRE-EXISTING same-pattern transcript (older than boot) never satisfies the glob — a flaked boot still relaunches', () => {
    const { dir, prompt, prefix } = stage(['flake'])
    // an old transcript from a sibling session, mtime forced old
    const old = join(dir, 'transcript-tide-20200101-0000.md')
    writeFileSync(old, 'stale sibling transcript\\n')
    utimesSync(old, new Date(Date.now() - 86_400_000), new Date(Date.now() - 86_400_000))
    const r = runGlob(dir, prompt, prefix, { SUPERVISOR_DONE_GLOB: join(dir, 'transcript-tide-*.md'), SUPERVISOR_DONE_MARKER: '' })
    assert.equal(r.code, 0)
    // the flake stub never mints; the cap is 3 under this env
    assert.deepEqual(attemptLogs(prefix),
      ['commission-attempt1.log', 'commission-attempt2.log', 'commission-attempt3.log'],
      'the stale file did not count — the flake path ran its full cap')
  })

  it('the exact marker still wins when both knobs are set (the legacy law unchanged)', () => {
    const { dir, prompt, prefix } = stage(['ok'])
    const r = runGlob(dir, prompt, prefix, { SUPERVISOR_DONE_MARKER: join(dir, 'transcript.md'), SUPERVISOR_DONE_GLOB: join(dir, 'nomatch-*.md') })
    assert.equal(r.code, 0)
    assert.equal(attemptLogs(prefix).length, 1)
  })
})

describe('commission-supervisor — the queue-lock turn-wait (two makers, one queue)', () => {
  function runLock(dir: string, prompt: string, prefix: string, env: Record<string, string>): { code: number, stderr: string } {
    const r = spawnSync('bash', [SCRIPT, prompt, prefix], {
      env: { ...process.env, SUPERVISOR_DSH_BIN: join(dir, 'seq.js'), SUPERVISOR_BACKOFF_S: '0', SUPERVISOR_MAX_ATTEMPTS: '3', SUPERVISOR_DONE_MARKER: join(dir, 'transcript.md'), SUPERVISOR_LOCK_WAIT_S: '0', ...env },
      timeout: 30_000, encoding: 'utf8',
    })
    return { code: r.status ?? -1, stderr: (r.stderr ?? '') + (r.stdout ?? '') }
  }

  it('a live sibling holding gateway.lock makes the supervisor WAIT ITS TURN, then launch (one seated attempt)', () => {
    const { dir, prompt, prefix } = stage(['ok'])
    // THIS test process is alive — the supervisor must see it hold
    writeFileSync(join(dir, 'gateway.lock'), String(process.pid))
    const t0 = Date.now()
    const r = runLock(dir, prompt, prefix, { SUPERVISOR_STATE_ROOT: dir, SUPERVISOR_LOCK_WAIT_S: '7' })
    const took = Date.now() - t0
    assert.equal(r.code, 0)
    assert.equal(attemptLogs(prefix).length, 1, 'the launch happened after the wait')
    assert.ok(took >= 5_000, 'the wait actually waited (5s cadence), took ' + took + 'ms')
    assert.match(r.stderr, /waiting our turn/, 'the turn is announced on stderr')
  }, 20_000)

  it('a DEAD pid in the lock is not a holder — the launch is immediate (the steal is the queue\'s own law)', () => {
    const { dir, prompt, prefix } = stage(['ok'])
    writeFileSync(join(dir, 'gateway.lock'), '4000000')
    const t0 = Date.now()
    const r = runLock(dir, prompt, prefix, { SUPERVISOR_STATE_ROOT: dir, SUPERVISOR_LOCK_WAIT_S: '7' })
    const took = Date.now() - t0
    assert.equal(r.code, 0)
    assert.equal(attemptLogs(prefix).length, 1)
    assert.ok(took < 5_000, 'no turn-wait for a dead holder, took ' + took + 'ms')
    assert.doesNotMatch(r.stderr, /waiting our turn/)
  })

  it('a lock refusal at expiry rides the transient gate (relaunch, capped) — never a silent demotion', () => {
    const { dir, prompt, prefix } = stage(['lockrefused', 'ok'])
    const r = runLock(dir, prompt, prefix, { SUPERVISOR_STATE_ROOT: dir, SUPERVISOR_LOCK_WAIT_S: '0' })
    assert.equal(r.code, 0)
    assert.deepEqual(attemptLogs(prefix), ['commission-attempt1.log', 'commission-attempt2.log'])
  })
})

describe('commission-supervisor — the cross-roots estate overlay (J12)', () => {
  it('mints the melite-estate patch naming the user lane tree (the media-tab catch)', () => {
    const { dir, prompt, prefix } = stage([])
    // a plain ok stub: the minted overlay on disk is the wall's
    // target (J12 retired the env export — the roots ride config).
    writeFileSync(join(dir, 'seq.js'),
      'require("node:fs").writeFileSync(__dirname + "/transcript.md", "ok\\n");\n'
      + 'process.exit(0);\n')
    const code = run(dir, prompt, prefix)
    assert.equal(code, 0, 'the stub arm exits clean')
    const overlay = readFileSync(prefix + '-estate.patch.yml', 'utf8')
    // the row pins the maker's own state root (the spec's own dir)
    assert.ok(overlay.includes('stateRoot: "' + dir + '"'),
      'the overlay names the state root, got: ' + overlay)
    // default: the user lane's tree under the state root's data/runs
    assert.ok(overlay.includes('stateRoots: "' + join(dir, 'data/runs') + '"'),
      'the overlay names the user lane tree, got: ' + overlay)
  })
  it('honors SUPERVISOR_STATE_ROOTS as the override', () => {
    const { dir, prompt, prefix } = stage([])
    writeFileSync(join(dir, 'seq.js'),
      'require("node:fs").writeFileSync(__dirname + "/transcript.md", "ok\\n");\n'
      + 'process.exit(0);\n')
    try {
      execFileSync('bash', [SCRIPT, prompt, prefix], {
        env: {
          ...process.env,
          SUPERVISOR_DSH_BIN: join(dir, 'seq.js'),
          SUPERVISOR_STATE_ROOTS: '/custom/shared:tree',
          SUPERVISOR_DONE_MARKER: join(dir, 'transcript.md'),
          // this arm inlines execFileSync instead of going through
          // run(), so it needs the same hermetic turn-wait pin — the
          // wait polls `${STATE_ROOT}/gateway.lock`, and an unpinned
          // STATE_ROOT meant this wall measured the operator's live
          // lane instead of the roots override it exists to prove
          SUPERVISOR_STATE_ROOT: dir,
          SUPERVISOR_LOCK_WAIT_S: '0',
        },
        timeout: 30_000,
        stdio: 'pipe',
      })
    } catch { /* the exit code is not this wall's target */ }
    const overlay = readFileSync(join(prefix + '-estate.patch.yml'), 'utf8')
    assert.ok(overlay.includes('stateRoots: "/custom/shared:tree"'),
      'the override rides the overlay verbatim, got: ' + overlay)
  })
})
