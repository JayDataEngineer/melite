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
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const SCRIPT = join(ROOT, 'scripts', 'commission-supervisor.sh')

/** Tonight's verbatim transient body (attempt034 receipt). */
const TRANSIENT_ERR = 'dsh: RATE_LIMIT: OpenAI API error (429): {"code":"rate_limit_exceeded","message":"Rate limit exceeded. Please retry after a brief wait.","param":null,"type":"rate_limit_error"}'
/** The dead-key quota body (the KEY SOURCE receipt, runbook). */
const QUOTA_ERR = 'dsh: RATE_LIMIT: 429 Go usage limit exceeded (admin cap); reset 2026-09-24 09:00:00'

type Arm = 'transient' | 'transient2' | 'quota' | 'both' | 'boom' | 'ok'

/** A stub that dies (or succeeds) with the named arm's shape. */
function stubFor(arm: Arm): string {
  const bodies: Record<Arm, { code: number, err: string }> = {
    transient: { code: 1, err: TRANSIENT_ERR },
    transient2: { code: 1, err: TRANSIENT_ERR },
    quota: { code: 1, err: QUOTA_ERR },
    both: { code: 1, err: TRANSIENT_ERR + '\n' + QUOTA_ERR },
    boom: { code: 2, err: 'engine exploded' },
    ok: { code: 0, err: '' },
  }
  const b = bodies[arm]!
  return 'process.stderr.write(' + JSON.stringify(b.err) + ');process.exit(' + String(b.code) + ');\n'
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
      boom: stubFor('boom'), ok: stubFor('ok'),
    }) + ';\n'
    + 'const k = Number(readFileSync(__dirname + "/seq-index", "utf8").trim() || "0") + 1;\n'
    + 'writeFileSync(__dirname + "/seq-index", String(k));\n'
    + 'eval(map[arms[k - 1]] ?? map.ok);\n')
  writeFileSync(join(dir, 'seq-index'), '0')
  const prompt = join(dir, 'prompt.txt')
  writeFileSync(prompt, 'make the bumper film\n')
  return { dir, prompt, prefix: join(dir, 'commission') }
}

function run(dir: string, prompt: string, prefix: string): number {
  try {
    execFileSync('bash', [SCRIPT, prompt, prefix], {
      env: {
        ...process.env,
        SUPERVISOR_DSH_BIN: join(dir, 'seq.js'),
        SUPERVISOR_BACKOFF_S: '0',
        SUPERVISOR_MAX_ATTEMPTS: '3',
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

  it('success on attempt 1: exit 0, one log, no token', () => {
    const { dir, prompt, prefix } = stage(['ok'])
    assert.equal(run(dir, prompt, prefix), 0)
    assert.equal(attemptLogs(prefix).length, 1)
    assert.ok(!existsSync(prefix + '-resume.token.md'))
  })
})
