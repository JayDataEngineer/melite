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
import { existsSync, readdirSync, rmSync, statSync, statfsSync } from 'node:fs'
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
 *  own. */
function runPreflight({ log = console.error } = {}) {
  let freeBytes = Number.MAX_SAFE_INTEGER
  try {
    const s = statfsSync('/tmp')
    freeBytes = Number(s.bavail) * Number(s.bsize)
  } catch {
    return { pruned: [], freeBytes, refused: false }
  }
  const entries = []
  for (const name of readdirSync('/tmp')) {
    try {
      entries.push({ name, mtimeMs: statSync(`/tmp/${name}`).mtimeMs })
    } catch { /* raced away — not ours to judge */ }
  }
  const verdict = tmpPreflight(entries, freeBytes)
  for (const target of verdict.prune) {
    try { rmSync(target, { recursive: true, force: true }) } catch { /* in use — leave it */ }
  }
  let after = freeBytes
  try {
    const s = statfsSync('/tmp')
    after = Number(s.bavail) * Number(s.bsize)
  } catch { /* keep the pre value */ }
  if (verdict.prune.length > 0) {
    log(`[run-walker-safe] pre-flight pruned ${verdict.prune.length} stale /tmp scratch item(s): ${verdict.prune.join(', ')}`)
  }
  if (after < MIN_FREE_BYTES) {
    log(`[run-walker-safe] REFUSING: /tmp holds ${(after / 1024 ** 3).toFixed(1)}G free — below the ${MIN_FREE_BYTES / 1024 ** 3}G budget. The tmpfs is shared (the DSH launcher mkdtemps in it); free stale scratch first. Host budget, not a product break.`)
    return { pruned: verdict.prune, freeBytes: after, refused: true }
  }
  return { pruned: verdict.prune, freeBytes: after, refused: false }
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0) {
    console.error('run-walker-safe: expected the command to wrap, e.g. node scripts/run-walker-safe.mjs vitest run --coverage')
    process.exit(2)
  }
  const pre = runPreflight()
  if (pre.refused) process.exit(3)
  const first = await runTee(argv)
  if (first.spawnError !== null) {
    console.error(`run-walker-safe: ${first.spawnError.message}`)
    process.exit(1)
  }
  if (first.code === 0) process.exit(0)

  const verdict = walkerVerdict(first.text)
  if (!verdict.retry) {
    // An honest failure (or a signal death) propagates untouched.
    if (first.signal !== null) process.kill(process.pid, first.signal)
    process.exit(first.code ?? 1)
  }

  console.error(`\n[run-walker-safe] walker contention named: ${verdict.named.join(', ')} — every path now resolves; one final pass follows\n`)
  const second = await runTee(argv)
  if (second.spawnError !== null) process.exit(1)
  if (second.code === 0) process.exit(0)
  if (second.signal !== null) process.kill(process.pid, second.signal)
  process.exit(second.code ?? 1)
}

if (isEntry) await main()
