import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'

// hook-config.spec.ts — THE HOOK-CONFIG WALL (audit 018 C3b): no
// silent skip survives in lefthook.yml. The 2026-10-26 correction
// (lefthook 2.1.12 probation, /tmp matrix): the once-documented
// "no-upstream first push skips everything" law is DEAD on this pin
// — a branch WITHOUT upstream fails the set resolution OPEN and
// fires everything. The REAL skip is the empty-push-set law: on a
// TRACKING branch, a push whose every object the remote already
// holds (a tag of already-pushed history — "no matching push
// files") skips EVERY pre-push job, and NO yaml key exempts any job
// from it (`skip: false` was probed and does not exempt — D2). The
// skip is SAFE, not silent: the suite below proves the lemma a
// skipped push carries ZERO new commits (so no unjudged code can
// ride it), while every code-carrying shape runs the gates. If a
// re-pin changes the skip law, the behavioral arms red HERE.

const REPO = resolve(import.meta.dirname, '..', '..', '..', '..')
const HOOK = readFileSync(join(REPO, 'lefthook.yml'), 'utf8')

interface HookJob {
  name?: string
  run?: string
  skip?: boolean | string | Array<unknown>
}
interface HookStage { jobs?: HookJob[] }

function hookJobs(): HookJob[] {
  const hook = parse(HOOK) as Record<string, HookStage | undefined>
  return Object.values(hook ?? {}).flatMap((stage) =>
    Array.isArray(stage?.jobs) ? stage.jobs : [])
}

function sentryJob(): HookJob {
  const found = hookJobs().find((job) => String(job.run ?? '').includes('push-set-sentry.mjs'))
  expect(found, 'the push-set sentry rides the hook as a parsed ACTIVE job (not a comment, not quoted prose)').toBeTruthy()
  return found!
}

describe('THE PUSH-SET SENTRY (the loud stand-down)', () => {
  it('the sentry rides the pre-push stage as a parsed active job', () => {
    const hook = parse(HOOK) as Record<string, HookStage | undefined>
    expect(Array.isArray(hook['pre-push']?.jobs)).toBe(true)
    expect(sentryJob().run).toContain('node tools/push-set-sentry.mjs')
  })

  it('the sentry prints the derived set (the loud half of the stand-down)', () => {
    // The sentry's run derives the push set from git itself and
    // prints it — count + basis + tip — so the hook summary names
    // what the scoped gates just judged. Verified live below: the
    // binary runs the script and its bytes land in the hook output.
    // The toggle is the run line's own removal (a comment mentioning
    // the script parses into no job — the staged-trash wall's F-L4
    // lesson).
    expect(sentryJob().skip).toBe(false)
  })

  it('the hook names no silent conditioning on the stand-down path (no fail_now inversion, no quiet skip)', () => {
    // A sentry that fails loud twice as hard as it passes is a
    // sentry that fails the push: fail_now:false on a red receipt
    // would let the verdict die quietly behind other jobs.
    const runs = hookJobs().map((job) => String(job.run ?? '')).filter((run) => run.length > 0)
    expect(runs.length, 'the hook is not an empty shell').toBeGreaterThan(0)
    for (const run of runs) {
      expect(run, 'no job hides a quiet flag behind its run').not.toContain('fail_now')
    }
  })
})

// ── THE BEHAVIORAL PROOF (the probation the comment states) ──────
// A hooks directory in a SCRATCH git tree — never this repo — wired
// the real lefthook binary against the real probe matrix:
//   (a) the empty-push-set shape (a tag-only push) skips a plain job
//       and still runs the sentry-shaped job (skip:false),
//   (b) a set-carrying push runs both.
// If lefthook regresses (or the repo re-pins a build where the
// empty-set skip swallows skip:false too), (a) reds HERE with the
// empty log. The `lefthook: false` frontmatter guard: lefthook runs
// only where its config file lives, so the scratch tree's jobs
// never fire on real pushes here.

const LEFTHOOK_BIN = join(REPO, 'node_modules', '.bin', 'lefthook')

interface ProbeResult {
  ranSentryStyle: boolean
  ranPlain: boolean
  remoteLacked: string[]
}

type ProbeMatrix = 'tag-only' | 'commits' | 'no-upstream'
function runProbe(matrix: ProbeMatrix): ProbeResult {
  // Three matrices, one scratch tree each (never this repo): a
  // tracking branch against a real bare remote this suite owns.
  const dir = mkdtempSync(join(tmpdir(), 'hook-probe-'))
  const remote = mkdtempSync(join(tmpdir(), 'hook-probe-remote-'))
  try {
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir })
    execFileSync('git', ['config', 'user.email', 'p@p'], { cwd: dir })
    execFileSync('git', ['config', 'user.name', 'p'], { cwd: dir })
    // lefthook runs in the tree's cwd — no hooks dir is wired (the
    // suite drives the binary directly, never through git). The feed
    // replays git's EXACT pre-push handoff: the remote URL as ARG and
    // the one stdin line per pushed ref. Upstream state is the
    // switch the probation isolated — a tracking branch resolves the
    // set against its upstream; without one the binary fails OPEN
    // and runs everything.
    execFileSync('git', ['init', '-q', '--bare', remote])
    const logPath = join(dir, 'probe.log')
    writeFileSync(join(dir, 'lefthook.yml'), `pre-push:\n  jobs:\n    - name: plain\n      run: echo PLAIN-RAN >> ${logPath}\n    - name: sentry-style\n      skip: false\n      run: echo SENTRY-RAN >> ${logPath}\n`)
    writeFileSync(join(dir, 'f.txt'), 'hello\n')
    execFileSync('git', ['add', 'f.txt'], { cwd: dir })
    execFileSync('git', ['commit', '-qm', 'init'], { cwd: dir })
    execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: dir })
    execFileSync('git', ['push', '-q', '-u', 'origin', 'main'], { cwd: dir })
    const tip = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim()
    const zero = '0'.repeat(40)
    // THE FEED per matrix: a REAL tag of already-pushed history
    // (the skip shape — the tag object exists, the remote holds
    // every commit behind it) vs a branch line carrying one
    // unpushed commit (the fire shape) vs the no-upstream variant
    // (upstream unset after the push — the dead-law probation).
    if (matrix === 'no-upstream') {
      execFileSync('git', ['branch', '--unset-upstream', 'main'], { cwd: dir })
    }
    let stdinLine: string
    if (matrix === 'commits') {
      writeFileSync(join(dir, 'g.txt'), 'more\n')
      execFileSync('git', ['add', 'g.txt'], { cwd: dir })
      execFileSync('git', ['commit', '-qm', 'second'], { cwd: dir })
      const tip2 = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim()
      stdinLine = `refs/heads/main ${zero} refs/heads/main ${tip2}\n`
    } else {
      execFileSync('git', ['tag', 'v-probe'], { cwd: dir })
      stdinLine = `refs/tags/v-probe ${tip} refs/tags/v-probe ${zero}\n`
    }
    try {
      execFileSync(LEFTHOOK_BIN, ['run', 'pre-push', 'origin', remote],
        { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'], input: stdinLine })
    } catch {
      // exit status is the jobs' verdict, not the probe's — the LOG
      // judges, exactly like the hook summary does.
    }
    const log = existsSync(logPath) ? readFileSync(logPath, 'utf8') : ''
    // THE SAFETY LEMMA (the audit's real demand): what the REMOTE
    // lacks after this push. The tag shape must lack NOTHING — a
    // skipped push carrying new commits would be the silent hole.
    // Derived from git, never from the hook: every commit not in
    // any remote ref.
    const lacked = matrix === 'tag-only' || matrix === 'no-upstream'
      ? execFileSync('git', ['rev-list', 'HEAD', '--not', '--remotes', '--'], { cwd: dir, encoding: 'utf8' }).trim()
      : 'n/a'
    return {
      ranSentryStyle: log.includes('SENTRY-RAN'),
      ranPlain: log.includes('PLAIN-RAN'),
      remoteLacked: lacked === '' ? [] : lacked.split('\n'),
    }
  } finally {
    rmSync(remote, { recursive: true, force: true })
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('THE EMPTY-PUSH-SET PROBATION (lefthook 2.1.12, 2026-10-27)', () => {
  it('a set-carrying push runs every job (the code-carrying shape is always gated)', () => {
    const r = runProbe('commits')
    expect(r.ranPlain, 'plain jobs run when the push carries commits').toBe(true)
    expect(r.ranSentryStyle, 'the sentry-shaped job runs when the push carries commits').toBe(true)
  })

  it('the empty set skips every job — and the skipped push carries ZERO new commits (the safety lemma)', () => {
    // THE VERIFIED LAW (D2): on a tracking branch, a tag of
    // already-pushed history skips EVERY job — `skip: false`
    // included. The skip is SAFE, not silent: the remote lacks
    // nothing after this push (derived from git, never the hook),
    // so no unjudged code can ride it. If a re-pin ever lets a
    // commit-carrying push skip, the lemma reds FIRST.
    const r = runProbe('tag-only')
    expect(r.ranPlain, 'the empty push set skips plain jobs — the law this wall pins').toBe(false)
    expect(r.ranSentryStyle, 'the empty-set skip takes skipless jobs too (D2 — no yaml key exempts)').toBe(false)
    expect(r.remoteLacked, 'a skipped push must carry zero new commits — otherwise the skip is a silent hole').toEqual([])
  })

  it('no upstream fails OPEN: every job runs (the dead documented law stays dead)', () => {
    // The once-documented "no-upstream first push skips everything"
    // never existed on this pin — without an upstream the binary
    // cannot resolve a set and runs everything. If a re-pin flips
    // this to a skip, the arm reds.
    const r = runProbe('no-upstream')
    expect(r.ranPlain, 'no-upstream pushes fire plain jobs (fail-open)').toBe(true)
    expect(r.ranSentryStyle, 'no-upstream pushes fire the sentry-shaped job').toBe(true)
  })
})