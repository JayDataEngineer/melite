// tmp-sweep-ownership.spec.ts — the sweeper's fence is OWNERSHIP, not
// staleness. The flake audit (2026-10-15) found the old fence deleted
// a CONCURRENT run's root: a directory's mtime does not change when
// work happens in nested directories, so a run whose suites passed the
// one-minute mark had its whole tree swept out from under every spec in
// it. These walls drive the real global setup: a root whose owner pid
// is alive survives, one whose owner is gone is reclaimed, and the run
// marks its own root.
import { describe, expect, test, afterEach } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import setup from '../../../global-sweep.ts'

const minted: string[] = []

// setup() points TMPDIR at its own run root; the sweeper reads
// tmpdir() at call time, so a case that leaves TMPDIR pointing at a
// teardown-deleted root would sweep a directory that no longer exists.
let savedTmp: string | undefined
const enter = (): void => {
  savedTmp = process.env['TMPDIR']
}
const leave = (): void => {
  if (savedTmp === undefined) delete process.env['TMPDIR']
  else process.env['TMPDIR'] = savedTmp
  savedTmp = undefined
}

afterEach(() => {
  leave()
  for (const dir of minted) rmSync(dir, { recursive: true, force: true })
  minted.length = 0
})

/** A run root as a CRASHED run leaves it: minted, marked, owner gone. */
function abandonedRoot(pid: number): string {
  const root = mkdtempSync(join(tmpdir(), 'melite-run-'))
  minted.push(root)
  writeFileSync(join(root, '.melite-run-owner'), String(pid))
  return root
}

describe('the tmp sweeper fences ownership, not staleness', () => {
  test('a run marks its own root with its pid, and the teardown removes it', () => {
    enter()
    const before = process.env['TMPDIR']
    const teardown = setup()
    const root = process.env['TMPDIR']
    expect(root).toBeDefined()
    expect(root).not.toBe(before)
    expect(readFileSync(join(root as string, '.melite-run-owner'), 'utf8')).toBe(String(process.pid))
    teardown()
    expect(existsSync(root as string)).toBe(false)
    expect(before).toBe(savedTmp)
  })

  test("a CONCURRENT run's root survives the pre-sweep, however old it looks", () => {
    enter()
    // this pid IS alive, so the root belongs to a live run: the sweep
    // must leave it alone even when its top-level mtime is ancient —
    // which is exactly the state the old fence misread.
    const live = abandonedRoot(process.pid)
    const longAgo = new Date(Date.now() - 3_600_000)
    utimesSync(live, longAgo, longAgo)

    const teardown = setup()
    expect(existsSync(live), 'a live owner keeps its tree').toBe(true)
    teardown()
    // The teardown sweep is the one that sees the OUTER tmpdir (the
    // pre-sweep already runs inside this run's own root, by design).
    expect(existsSync(live), 'and the teardown sweep leaves it too').toBe(true)
  })

  test("a CRASHED run's root is reclaimed (its owner is gone)", () => {
    enter()
    // pid 2^22 is above every default pid_max on Linux and macOS, so
    // no live process owns it
    const dead = abandonedRoot(4_194_303)
    const teardown = setup()
    teardown()
    expect(existsSync(dead), 'a tree nobody owns is reclaimed').toBe(false)
  })

  test("an OWNER-LESS melite-run-* tree is a live suite's mint, never pid-reaped (the GESTURE B ENOENT burn)", () => {
    enter()
    // the burn's exact shape: a sibling suite mints melite-run-*
    // under the live run root with NO owner file — a concurrently
    // running sweep (this wall's own setup()/teardown()) must not
    // delete it out from under its atomic rename
    const mint = mkdtempSync(join(tmpdir(), 'melite-run-'))
    minted.push(mint)
    writeFileSync(join(mint, 'mid-write.tmp'), 'bytes')

    const teardown = setup()
    expect(existsSync(mint), 'a fresh owner-less mint survives the pre-sweep').toBe(true)
    teardown()
    expect(existsSync(mint), 'and the teardown sweep leaves it too (age-fenced, never pid-reaped)').toBe(true)
  })

  test("a legacy-prefix tree with a FRESH nested write is live, however stale its top mtime (the variant-switch burn)", () => {
    enter()
    // the variant-switch burn's exact shape: the suite's tree top
    // froze an hour ago while GESTURE B writes drafts/docs NOW —
    // the sweep's legacy-prefix branch must NOT reap it; a sibling
    // tree silent throughout IS a leftover and reaps
    const live = mkdtempSync(join(tmpdir(), 'variant-switch-'))
    const stale = mkdtempSync(join(tmpdir(), 'variant-switch-'))
    minted.push(live, stale)
    const old = new Date(Date.now() - 3_600_000)
    mkdirSync(join(live, 'storage', 'drafts', 'docs'), { recursive: true })
    writeFileSync(join(live, 'storage', 'drafts', 'docs', 'mid-write.tmp'), 'bytes')
    writeFileSync(join(stale, 'dust.tmp'), 'bytes')
    utimesSync(live, old, old)
    utimesSync(join(live, 'storage'), old, old)
    utimesSync(join(live, 'storage', 'drafts'), old, old)
    utimesSync(join(live, 'storage', 'drafts', 'docs'), old, old)
    utimesSync(stale, old, old)
    utimesSync(join(stale, 'dust.tmp'), old, old)

    const teardown = setup()
    // the pre-sweep reads INSIDE this run's own fresh root (by
    // design — the outer trees are the teardown sweep's seat)
    expect(existsSync(live), 'the live tree stands before the teardown sweep').toBe(true)
    expect(existsSync(stale), 'the stale tree stands before the teardown sweep').toBe(true)
    teardown()
    // the teardown sweep sees the OUTER tmpdir: the fresh-nested
    // tree lives, the silent tree reaps
    expect(existsSync(live), 'a legacy tree with a fresh nested write survives the sweep').toBe(true)
    expect(existsSync(stale), 'a legacy tree silent throughout still reaps').toBe(false)
  })
})
