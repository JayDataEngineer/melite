// faceStamp.ts — F-7: the served tool faces carry the tree version.
//
// A session once served a stale h3_timeline face from a
// process-cached module (params excised from disk) with no way to
// tell stale from live. Every cardToolsArm row now carries
// `face_stamp`: the serving process's `git rev-parse --short HEAD`
// plus `+dirty` when the tree has uncommitted changes — an agent
// compares the served stamp against the disk HEAD and a mismatch is
// visible without hunting. Non-git installs stamp `unknown` (the
// value SAYS unknown — never a silent fallback, never a guess).
// Resolved once per process (the tree does not change under a
// running serve; a redeploy is a new process with a new stamp).

import { execFileSync } from 'node:child_process'
import { resolveRepoRoot } from '@melite/comfyui-cordis'

/** The git runner seam (walls inject fakes; live runs git). */
export type GitRun = (args: string[], cwd: string) => string

const liveRun: GitRun = (args, cwd) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    timeout: 15_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }) as string

/** Pure: short hash + dirty flag -> the stamp. */
export function formatStamp(hash: string, dirty: boolean): string {
  const h = hash.trim()
  if (h === '') return 'unknown'
  return dirty ? `${h}+dirty` : h
}

/** Read the stamp through an injectable runner — any git failure
 *  (not a checkout, git absent, status unreadable) stamps `unknown`. */
export function readStamp(run: GitRun, root: string): string {
  try {
    const hash = run(['rev-parse', '--short', 'HEAD'], root)
    const dirty = run(['status', '--porcelain'], root).trim() !== ''
    return formatStamp(hash, dirty)
  } catch {
    return 'unknown'
  }
}

let cached: string | null = null

/** The serving process's stamp (resolved once, then the value). */
export function faceStamp(
  root: string = resolveRepoRoot(),
  run: GitRun = liveRun,
): string {
  if (cached === null) cached = readStamp(run, root)
  return cached
}
