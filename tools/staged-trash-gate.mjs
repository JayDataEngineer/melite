#!/usr/bin/env node
// THE STAGED-TRASH GATE (operator 2026-11-05: "HOW WAS THERE NO COMMIT
// HOOK TO DETECT TRASH THAT GOT SWEPT UP") — the pre-commit judge for
// TREE HYGIENE. The existing pre-commit jobs judged code law (arch,
// walls, newlines); NOTHING refused junk BYTES entering the index:
// the 550MB references/ sweep, 78 packed tarballs, caches — all rode
// `git add -A` past per-dir ignore rules that cannot untrack (or stop
// a force-add). This gate is that refusal.
//
// THREE LAWS (each refusal names the file + the law):
//   1. SIZE — no staged file over 5MB outside the sanctioned planes.
//      Sanctioned: packages/**/lib/** (the artifact plane the
//      freshness/stamp walls walk), tests/fixtures/**,
//      tests/integration/assets/**, pnpm-lock.yaml. Nothing legitimate
//      in this repo exceeds 5MB (the largest sanctioned byte is a
//      3.4MB source map).
//   2. IGNORED-PATH — a staged path that `git check-ignore` names is
//      a force-add past an ignore rule: refuse. Ignore rules are the
//      SSOT of never-track; this is their enforcement arm.
//   3. JUNK CLASS — packed archives and raw media (*.tgz, *.zip,
//      *.tar, *.gz, *.mp4, *.mov, *.avi, *.wav, *.mp3) are build
//      outputs or captures, never source: refuse outside
//      tests/fixtures/** (the fixture home).
import { execFileSync } from 'node:child_process'
import { statSync } from 'node:fs'

const SIZE_LIMIT = 5 * 1024 * 1024
const SANCTIONED_SIZE = [/^packages\/[^/]+\/[^/]+\/lib\//, /^packages\/[^/]+\/lib\//, /^tests\/fixtures\//, /^tests\/integration\/assets\//, /^pnpm-lock\.yaml$/]
const JUNK_EXT = /\.(?:tgz|zip|tar|gz|mp4|mov|avi|wav|mp3)$/i

/** The gate's judgment over a staged path list (exported for the wall). */
export function judgeStaged(paths, { sizeOf = (p) => { try { return statSync(p).size } catch { return 0 } }, ignored = (p) => false } = {}) {
  const refusals = []
  for (const p of paths) {
    if (p === '') continue
    if (ignored(p)) refusals.push(`${p}: IGNORED-PATH — force-added past an ignore rule (the rule is the SSOT of never-track; untrack, do not override)`)
    else if (JUNK_EXT.test(p) && !/^tests\/fixtures\//.test(p)) refusals.push(`${p}: JUNK-CLASS — packed/raw media never rides the source plane (build outputs are minted, captures live in fixtures)`)
    else if (sizeOf(p) > SIZE_LIMIT && !SANCTIONED_SIZE.some((r) => r.test(p))) refusals.push(`${p}: SIZE — ${Math.round(sizeOf(p) / 1048576)}MB over the 5MB limit and not a sanctioned plane (artifact lib/, fixtures, lockfile)`)
  }
  return refusals
}

function main() {
  const staged = execFileSync('git', ['diff', '--cached', '--name-only', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
  if (staged.length === 0) return
  let ignoredSet = new Set()
  try {
    const out = execFileSync('git', ['check-ignore', '--stdin', '-z'], { input: staged.join('\0'), encoding: 'utf8' })
    ignoredSet = new Set(out.split('\0').filter(Boolean))
  } catch {
    // check-ignore exits 1 when NOTHING is ignored — the clean case.
  }
  const refusals = judgeStaged(staged, { ignored: (p) => ignoredSet.has(p) })
  if (refusals.length > 0) {
    console.error('staged-trash-gate: REFUSED — trash never enters the index:')
    for (const r of refusals) console.error(`  ${r}`)
    process.exit(1)
  }
}

if (process.argv[1] && process.argv[1].endsWith('staged-trash-gate.mjs')) main()
