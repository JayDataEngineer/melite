// run-walker-safe.spec.ts — THE WALKER-SAFE VERDICT'S OWN WALL
// (2026-10-19, roadmap owed item 2). The wrapper's decision is a
// pure function so every arm — including the negative controls a
// blind retry would fail — proves here, fast, without spawning a
// vitest pool.
//
// ARMS, after dsh-ci-test-reliability ("prove the intended
// regression"): the retry names the awaited state (every named
// lib-plane path exists again), fires only for resolution
// failures under the workspace root, never for ordinary
// assertion failures, never for a module that is still missing
// (a real product break stays red), and never for foreign
// absolute paths outside the tree.
import { describe, expect, it } from 'vitest'
import { tmpPreflight, walkerNamedPaths, walkerVerdict } from '../../../../scripts/run-walker-safe.mjs'

const ROOT = '/repo'
const exists = (p: string) => p === '/repo/packages/models/krea-2/lib/index.js' ||
  p === '/repo/packages/image/image-gen/lib/index.js'

describe('walkerVerdict (run-walker-safe.mjs)', () => {
  it('fires when the failed run named a lib path that exists again (the walker finished)', () => {
    const text = [
      'FAIL  packages/image/image-gen/tests/composition.spec.ts',
      "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/repo/packages/models/krea-2/lib/index.js' imported from /repo/packages/image/image-gen/tests/composition.spec.ts",
    ].join('\n')
    const v = walkerVerdict(text, exists, ROOT)
    expect(v.retry).toBe(true)
    expect(v.named).toEqual(['/repo/packages/models/krea-2/lib/index.js'])
  })

  it('parses the vitest resolver voice (quoted specifier, bare importer) the same way', () => {
    const text = "Error: Failed to resolve import \"@melite/models-krea-2\" from \"/repo/packages/image/image-gen/tests/composition.spec.ts\". Does the file exist? hint: /repo/packages/models/krea-2/lib/index.js"
    const v = walkerVerdict(text, exists, ROOT)
    expect(v.retry).toBe(true)
    expect(v.named).toEqual(['/repo/packages/models/krea-2/lib/index.js'])
  })

  it('stays red when the named module is STILL missing (a real break never retries)', () => {
    const text = "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/repo/packages/gone/lib/index.js'"
    const v = walkerVerdict(text, exists, ROOT)
    expect(v.retry).toBe(false)
    expect(v.named).toEqual(['/repo/packages/gone/lib/index.js'])
  })

  it('stays red when only SOME named paths recovered (the walker is still mid-rewrite)', () => {
    const text = [
      "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/repo/packages/models/krea-2/lib/index.js'",
      "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/repo/packages/gone/lib/index.js'",
    ].join('\n')
    const v = walkerVerdict(text, exists, ROOT)
    expect(v.retry).toBe(false)
  })

  it('never fires for ordinary assertion failures', () => {
    const text = [
      'FAIL  packages/estate/drafts/tests/store.spec.ts > openDraftsDomain',
      'AssertionError: expected undefined to be defined',
    ].join('\n')
    expect(walkerVerdict(text, exists, ROOT).retry).toBe(false)
  })

  it('never fires for absolute lib paths outside the workspace root', () => {
    const text = "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/opt/other/lib/index.js'"
    expect(walkerVerdict(text, exists, ROOT).retry).toBe(false)
  })

  it('names every distinct path on a line, trailing punctuation stripped', () => {
    const line = "Cannot find module '/repo/packages/image/image-gen/lib/index.js', '/repo/packages/models/krea-2/lib/index.js'."
    expect(walkerNamedPaths(line)).toEqual([
      '/repo/packages/image/image-gen/lib/index.js',
      '/repo/packages/models/krea-2/lib/index.js',
    ])
  })
})

describe('tmpPreflight (run-walker-safe.mjs — the /tmp budget row)', () => {
  const NOW = 1_800_000_000_000
  const DAY = 24 * 60 * 60 * 1000
  const EIGHT_G = 8 * 1024 ** 3
  const entry = (name: string, ageDays: number) => ({ name, mtimeMs: NOW - ageDays * DAY })

  it('prunes the convicted scratch classes only when they are stale', () => {
    const v = tmpPreflight([
      entry('melite-cold-B4lrwp', 12),
      entry('melite-run-abc123', 2),
      entry('ztg-scratch', 3),
      entry('tmp.PxbUZLyRmE', 5),
      entry('apko-6a610a16', 9),
      entry('melite-cold-FRESH', 0.2),
      entry('tmp.live-mkdtemp', 0.01),
    ], 30 * 1024 ** 3, NOW)
    expect(v.prune).toEqual([
      '/tmp/melite-cold-B4lrwp',
      '/tmp/melite-run-abc123',
      '/tmp/ztg-scratch',
      '/tmp/tmp.PxbUZLyRmE',
      '/tmp/apko-6a610a16',
    ])
    expect(v.refuse).toBe(false)
  })

  it('never names sibling worktrees, foreign tools, or dsh repos', () => {
    const v = tmpPreflight([
      entry('wt-5c8a4d3', 30),
      entry('opencode', 30),
      entry('claimrepo', 30),
      entry('dsh-qrepo-ntgd9upo', 30),
      entry('restore', 30),
      entry('node_modules', 30),
    ], 30 * 1024 ** 3, NOW)
    expect(v.prune).toEqual([])
  })

  it('refuses below the 8G budget even with nothing left to prune', () => {
    const v = tmpPreflight([], 7.5 * 1024 ** 3, NOW)
    expect(v.prune).toEqual([])
    expect(v.refuse).toBe(true)
  })

  it('holds the budget at exactly 8G (the floor is inclusive)', () => {
    const v = tmpPreflight([entry('melite-cold-old', 4)], EIGHT_G, NOW)
    expect(v.prune).toEqual(['/tmp/melite-cold-old'])
    expect(v.refuse).toBe(false)
  })
})
