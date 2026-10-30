#!/usr/bin/env node
// run-walker-safe.mjs — THE WALKER-SAFE VERDICT (roadmap "full-pool
// coverage gate is unstable on this host", owed item 2, 2026-10-19).
//
// WHAT THIS OWNS. The publish walker rewrites workspace package
// lib/ trees while a vitest pool resolves their committed-lib
// imports; a suite that imports `@melite/models-krea-2` (whose
// exports point at lib/index.js) can hit the walker's mid-rewrite
// window and die with ERR_MODULE_NOT_FOUND naming an absolute
// packages/*/lib/ path that resolves clean minutes later.
//
// THE VERDICT IS NOT A BLIND RETRY (dsh-ci-test-reliability:
// retries that do not name the awaited state mask flakes). A
// re-run happens only when EVERY module path the failed run named
// EXISTS on disk at verdict time — the awaited state (the walker
// finished its rewrite). A genuinely missing module stays missing
// and the original failure propagates untouched. One re-run,
// never more, announced loudly.
//
// Negative control + parsing arms: tests/walls/ts/suites/
// run-walker-safe.spec.ts.
import { existsSync, lstatSync, readdirSync, rmSync, statfsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

/** Entry-point guard: the wall imports this module for its pure
 *  verdict; only a direct `node scripts/run-walker-safe.mjs …`
 *  invocation runs the wrapper. */
const isEntry = import.meta.url === pathToFileURL(process.argv[1] ?? '').href

/** Lines that carry a resolution failure worth judging. */
const RESOLVE_FAIL =
  /ERR_MODULE_NOT_FOUND|Cannot find (?:module|package)|Failed to resolve import/

/** Absolute lib-plane paths on one line (quoted or bare). */
const ABS_LIB_PATH = /\/[^\s'"]*\/lib\/[^\s'"]+/g

/** @returns every distinct absolute lib-plane path named by the text. */
export function walkerNamedPaths(text) {
  const paths = new Set()
  for (const line of text.split('\n')) {
    if (!RESOLVE_FAIL.test(line)) continue
    for (const p of line.match(ABS_LIB_PATH) ?? []) paths.add(p.replace(/[),.;]+$/, ''))
  }
  return [...paths]
}

/** THE BINARY SEAT (2026-10-29): a bare `vitest` argv[0] resolves
 *  through PATH and can land on a GLOBAL install that lacks
 *  @vitest/coverage-v8 — the run then collects ZERO coverage rows,
 *  prints an unhandled provider error, exits 1, and any summary the
 *  caller copies afterward is STALE (three such runs rode this
 *  wrapper on 2026-10-29 judging a nine-hour-old table; the lane
 *  commands below were already pinned, the caller's command was
 *  not). The wrapper owns verdict integrity, so a bare `vitest` is
 *  pinned to THIS repo's install — the same
 *  node node_modules/vitest/dist/cli.js spelling the lanes use —
 *  and a repo without that install REFUSES loud rather than run
 *  the global one.
 *  @param argv    the caller's command.
 *  @param exists  path probe (injected for the wall). */
export function pinVitestSeat(argv, exists = existsSync) {
  const REPO_VITEST = 'node_modules/vitest/dist/cli.js'
  if (argv[0] !== 'vitest') return { refused: false, pinned: false, argv }
  if (!exists(REPO_VITEST)) {
    return { refused: true, pinned: false, argv }
  }
  return { refused: false, pinned: true, argv: ['node', REPO_VITEST, ...argv.slice(1)] }
}

/** The verdict: re-run only when the run named at least one walker
 *  token and EVERY named token now exists (the walker finished).
 *  @param text    the failed run's combined output.
 *  @param exists  path probe (injected for the wall).
 *  @param root    workspace root the tokens must live under. */
export function walkerVerdict(text, exists = existsSync, root = process.cwd()) {
  const named = walkerNamedPaths(text)
  if (named.length === 0) return { retry: false, named }
  if (!named.every((p) => p.startsWith(root + '/'))) return { retry: false, named }
  if (!named.every(exists)) return { retry: false, named }
  return { retry: true, named }
}

/** Run argv, tee combined output to the parent's streams, and
 *  resolve { code, signal, spawnError, text }. */
function runTee(argv) {
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1))
    let text = ''
    let settled = false
    const done = (r) => { if (!settled) { settled = true; resolve(r) } }
    child.stdout.on('data', (d) => { text += d; process.stdout.write(d) })
    child.stderr.on('data', (d) => { text += d; process.stderr.write(d) })
    child.on('error', (e) => done({ code: 1, signal: null, spawnError: e, text }))
    child.on('close', (code, signal) => done({ code, signal, spawnError: null, text }))
  })
}

/** Scratch classes the gate's own eras are convicted of leaking:
 *  cold-boot drives (12G, twice: 2026-10-09 and /tmp/melite-cold-B4lrwp),
 *  run scratch, probe debris, mkdtemp trees. Everything else in /tmp
 *  belongs to someone else — sibling worktrees, foreign tools — and
 *  is NEVER touched. */
const PRUNABLE = [/^melite-cold-/, /^melite-run-/, /^ztg-scratch/, /^apko-/, /^tmp\./]
const DAY_MS = 24 * 60 * 60 * 1000
const MIN_FREE_BYTES = 8 * 1024 ** 3

/** The pre-flight verdict (pure; the wall injects entries and free
 *  space). A prunable-class entry older than a day is stale scratch;
 *  everything else passes untouched. The refusal is the budget
 *  check the caller applies AFTER pruning. */
export function tmpPreflight(entries, freeBytes, now = Date.now()) {
  const prune = entries
    .filter((e) => PRUNABLE.some((re) => re.test(e.name)))
    .filter((e) => now - e.mtimeMs > DAY_MS)
    .map((e) => `/tmp/${e.name}`)
  return { prune, freeBytes, refuse: freeBytes < MIN_FREE_BYTES }
}

/** The live pre-flight: stat /tmp, prune stale melite scratch,
 *  refuse loud below the budget. Removes only the exact names the
 *  pure verdict returned, never recursing into a judgment of its
 *  own. Entries are judged by lstat — the entry's OWN mtime, never
 *  a symlink target's (rmSync on a link removes only the link, so
 *  the judgment names what removal actually touches). Every
 *  filesystem seam is injectable; the wall arms the live paths
 *  through the same door main() uses. Degradations fail OPEN but
 *  LOUD: an unstat-able or unlistable /tmp logs its degrade and
 *  the budget check degrades with it — the sweep is best-effort,
 *  never a product break. */
export function runPreflight(deps = {}) {
  const {
    log = console.error,
    statfs = statfsSync,
    readDir = readdirSync,
    statEntry = lstatSync,
    remove = rmSync,
    now = Date.now,
  } = deps
  let freeBytes = null
  try {
    const s = statfs('/tmp')
    freeBytes = Number(s.bavail) * Number(s.bsize)
  } catch {
    log('[run-walker-safe] pre-flight degraded: /tmp could not be stat\'d — no sweep, no budget check this run (fail-open, named)')
    return { pruned: [], failed: [], freeBytes: null, refused: false, degraded: 'statfs' }
  }
  let names = null
  let listed = false
  try {
    names = readDir('/tmp')
    listed = true
  } catch {
    log('[run-walker-safe] pre-flight degraded: /tmp could not be listed — no sweep this run; the budget check still runs (fail-open, named)')
    names = []
  }
  const entries = []
  for (const name of names) {
    try {
      entries.push({ name, mtimeMs: statEntry(`/tmp/${name}`).mtimeMs })
    } catch { /* raced away — not ours to judge */ }
  }
  const verdict = tmpPreflight(entries, freeBytes, now())
  const pruned = []
  const failed = []
  for (const target of verdict.prune) {
    try {
      remove(target, { recursive: true, force: true })
      pruned.push(target)
    } catch {
      failed.push(target) /* in use — named, never silent */
    }
  }
  let after = freeBytes
  try {
    const s = statfs('/tmp')
    after = Number(s.bavail) * Number(s.bsize)
  } catch { /* keep the pre value */ }
  if (pruned.length > 0) {
    log(`[run-walker-safe] pre-flight pruned ${pruned.length} stale /tmp scratch item(s): ${pruned.join(', ')}`)
  }
  if (failed.length > 0) {
    log(`[run-walker-safe] pre-flight could not remove ${failed.length} item(s): ${failed.join(', ')} — left in place`)
  }
  if (after < MIN_FREE_BYTES) {
    log(`[run-walker-safe] REFUSING: /tmp holds ${(after / 1024 ** 3).toFixed(1)}G free — below the ${MIN_FREE_BYTES / 1024 ** 3}G budget. The tmpfs is shared (the DSH launcher mkdtemps in it); free stale scratch first. Host budget, not a product break.`)
    return { pruned, failed, freeBytes: after, refused: true, degraded: listed ? null : 'readdir' }
  }
  return { pruned, failed, freeBytes: after, refused: false, degraded: listed ? null : 'readdir' }
}

/** THE TYPECHECK LANE (flake-slowness-wave2 C2, 2026-11-06): the
 *  two full-estate tsc passes (typecheck-gate ~64s, models-lib-sync
 *  ~32s) rode the vitest critical path while 23 forks idled — ~65%
 *  of the gate's wall floor. The lane runs the two suites in a
 *  SEPARATE vitest process CONCURRENTLY with the main run, and the
 *  main run excludes them by path. The lane carries NO --coverage
 *  flag: two concurrent coverage runs share coverage/.tmp and the
 *  second deletes the first's tmp directory mid-merge (reproduced
 *  twice, 2026-11-06 — gate17/gate18 died exactly there). Coverage
 *  invocations stay SERIAL, always. */
const TYPECHECK_LANE_FILES = [
  'tests/walls/ts/suites/typecheck-gate.spec.ts',
  'tests/walls/ts/suites/models-lib-sync.spec.ts',
]
const TYPECHECK_LANE = ['node', 'node_modules/vitest/dist/cli.js',
  'run', '--config', 'vitest.config.ts', '--project', 'typecheck-lane']

/** THE WALLS POOL (flake-slowness-wave2 C5, 2026-11-07): the rest of
 *  the walls tier rides its own vitest project (isolate:false,
 *  maxWorkers:4) as a THIRD concurrent lane, mirroring the
 *  typecheck-lane split. Same coverage law as the lane: no
 *  --coverage here — coverage invocations stay serial, always. */
const WALLS_POOL = ['node', 'node_modules/vitest/dist/cli.js',
  'run', '--config', 'vitest.config.ts', '--project', 'walls']

/** One lane's final exit after its own walker verdict (the retry
 *  semantics are per-lane: contention in the main run says nothing
 *  about the lane's lib plane, and vice versa). */
async function runLane(argv) {
  const first = await runTee(argv)
  if (first.spawnError !== null) {
    console.error(`run-walker-safe: ${first.spawnError.message}`)
    return 1
  }
  if (first.code === 0) return 0
  const verdict = walkerVerdict(first.text)
  if (!verdict.retry) {
    // An honest failure (or a signal death) propagates untouched —
    // the caller names the lane.
    if (first.signal !== null) return { signal: first.signal }
    return first.code ?? 1
  }
  console.error(`\n[run-walker-safe] walker contention named: ${verdict.named.join(', ')} — every path now resolves; one final pass follows\n`)
  const second = await runTee(argv)
  if (second.spawnError !== null) return 1
  if (second.code === 0) return 0
  if (second.signal !== null) return { signal: second.signal }
  return second.code ?? 1
}

async function main() {
  let argv = process.argv.slice(2)
  if (argv.length === 0) {
    console.error('run-walker-safe: expected the command to wrap, e.g. node scripts/run-walker-safe.mjs vitest run --coverage')
    process.exit(2)
  }
  const seat = pinVitestSeat(argv)
  if (seat.refused) {
    console.error("run-walker-safe: REFUSING: bare 'vitest' would resolve through PATH (a global install lacks @vitest/coverage-v8 — zero coverage rows, exit 1, stale summaries) and this repo carries no node_modules/vitest/dist/cli.js to pin instead")
    process.exit(2)
  }
  if (seat.pinned) {
    argv = seat.argv
    console.error('[run-walker-safe] pinned bare vitest to the repo install (node node_modules/vitest/dist/cli.js) — a PATH lookup can seat a coverage-less global\n')
  }
  const pre = runPreflight()
  if (pre.refused) process.exit(3)

  // A vitest run whose own paths do not name the typecheck lane
  // splits: main (excluding the two suites and the walls tier) +
  // the lane + the walls pool, all concurrent.
  const argvText = argv.join(' ')
  const isLaneItself = TYPECHECK_LANE_FILES.some((f) => argvText.includes(f))
  // vitest may be named at argv[0] (bare or .bin path) or at argv[1]
  // (the pinned repo spelling) — the whole line is the witness.
  const isVitestRun = /vitest/.test(argvText) && argvText.includes('run')
  if (isVitestRun && !isLaneItself) {
    const mainArgv = [...argv]
    mainArgv.push('--project', '!typecheck-lane')
    mainArgv.push('--project', '!walls')
    console.error('[run-walker-safe] gate splits three ways: main excludes the typecheck lane + the walls pool; the lane and the pool run concurrently (no coverage on either — coverage stays serial)\n')
    const [mainR, laneR, wallsR] = await Promise.all([
      runLane(mainArgv), runLane(TYPECHECK_LANE), runLane(WALLS_POOL),
    ])
    for (const r of [mainR, laneR, wallsR]) {
      if (r !== null && typeof r === 'object' && r.signal !== undefined) {
        process.kill(process.pid, r.signal)
      }
    }
    const code = mainR === 0 && laneR === 0 && wallsR === 0
      ? 0
      : (mainR !== 0 ? mainR : (laneR !== 0 ? laneR : wallsR))
    process.exit(typeof code === 'number' ? code : 1)
  }

  const code = await runLane(argv)
  if (code !== null && typeof code === 'object' && code.signal !== undefined) {
    process.kill(process.pid, code.signal)
  }
  process.exit(typeof code === 'number' ? code : 1)
}

if (isEntry) await main()
