import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'
import { judgeStaged } from '../../../../tools/staged-trash-gate.mjs'

// THE STAGED-TRASH GATE (operator 2026-11-05) — the wall for the
// tree-hygiene hook. The disease: `git add -A` swept a 550MB
// references/ tree, 78 packed tarballs, and caches into git because
// per-dir ignore rules cannot untrack (or stop a force-add), and no
// pre-commit job judged the staged plane's BYTES. This wall proves
// the gate fires on every law it states (LAW 4: each refusal class
// gets its own arm, driven through the gate's real judgment).

const ROOT = resolve(import.meta.dirname, '..', '..', '..', '..')

describe('THE STAGED-TRASH GATE (the tree-hygiene wall)', () => {
  it('SIZE: a staged file over 5MB outside sanctioned planes refuses', () => {
    const big = (p: string) => 6 * 1024 * 1024
    const r = judgeStaged(['packages/video/h3-timeline/src/huge.bin'], { sizeOf: big })
    expect(r.length).toBe(1)
    expect(r[0]).toContain('huge.bin: SIZE')
  })

  it('SIZE: sanctioned planes ride — the artifact lib/, fixtures, lockfile', () => {
    const big = (p: string) => 6 * 1024 * 1024
    const r = judgeStaged(
      ['packages/web/three-client/lib/client.js.map', 'tests/fixtures/anny_estimator_body.glb', 'tests/integration/assets/rigged_char_canonical.glb', 'pnpm-lock.yaml'],
      { sizeOf: big },
    )
    expect(r).toEqual([])
  })

  it('JUNK-CLASS: packed archives and raw media refuse outside fixtures', () => {
    const r = judgeStaged(['dist/npm/some-package-0.1.5.tgz', 'capture.mp4', 'data/voice.wav'])
    expect(r.length).toBe(3)
    expect(r[0]).toContain('JUNK-CLASS')
    expect(r[2]).toContain('voice.wav: JUNK-CLASS')
  })

  it('JUNK-CLASS: fixtures are the sanctioned media home', () => {
    expect(judgeStaged(['tests/fixtures/demo_clip.mp4'])).toEqual([])
  })

  it('IGNORED-PATH: a force-add past an ignore rule refuses (the add -A disease)', () => {
    const r = judgeStaged(['references/cordis-paper.txt', 'dist/npm/x.tgz'], { ignored: (p) => p.startsWith('references/') })
    expect(r.length).toBe(2)
    expect(r[0]).toContain('references/cordis-paper.txt: IGNORED-PATH')
    expect(r[1]).toContain('JUNK-CLASS') // the tgz still refuses on its own law
  })

  it('CLEAN: ordinary source rides untouched', () => {
    expect(judgeStaged(['packages/web/card-base/src/form.tsx', 'tests/walls/ts/suites/staged-trash-gate.spec.ts', 'lefthook.yml'])).toEqual([])
  })

  it('WIRING: the hook carries the trash job as a parsed run directive (the hook fires with the fleet)', () => {
    // The F-L4 lesson (2026-09-28, restumbled here 2026-11-05): a
    // bare includes() is blinded by COMMENT mentions — the first
    // toggle proof swapped the run: line and this arm stayed green
    // off the job's explanatory comment. The raw-text regex had the
    // same hole one layer down: a COMMENTED-OUT `# run: ...` line
    // matches it too. The arm parses the hook and judges ACTIVE job
    // entries' run values — a commented-out job parses into nothing,
    // and the toggle proof is the job entry's own removal.
    const hook = parse(readFileSync(join(ROOT, 'lefthook.yml'), 'utf8')) as Record<
      string,
      { jobs?: Array<{ run?: string }> } | undefined
    >
    const runs: string[] = Object.values(hook ?? {})
      .flatMap((stage) => (Array.isArray(stage?.jobs) ? stage.jobs : []))
      .map((job) => String(job?.run ?? ''))
      .filter((run) => run.length > 0)
    expect(runs.length).toBeGreaterThan(0) // the hook is not an empty shell
    expect(runs.some((run) => run.includes('node tools/staged-trash-gate.mjs'))).toBe(true)
  })

  // THE DOOR ARMS (2026-11-15): the arms above judge the PURE function,
  // and the seat's main() had never been judged — it read the INDEX on
  // every call (so at pre-push, where the index equals HEAD, it judged
  // nothing: the gate that cannot fire, this file's own named defect
  // class) and it refused correct UNTRACKS (an ignore rule naming a
  // deleted path is the reason it left, never a force-add). These two
  // arms ride main() through a child process in a throwaway repo and
  // pin both halves: the hook's file argument is the judged set, and a
  // deletion carries no bytes in.
  const runGate = (cwd: string, args: string[]) => {
    const res = spawnSync(process.execPath, [join(ROOT, 'tools/staged-trash-gate.mjs'), ...args], { cwd, encoding: 'utf8' })
    return { status: res.status ?? -1, out: `${res.stdout ?? ''}${res.stderr ?? ''}` }
  }
  const scratchRepo = () => {
    const dir = mkdtempSync(join(tmpdir(), 'trash-gate-'))
    const git = (args: string[]) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' })
    git(['init', '-q'])
    git(['config', 'user.email', 'wall@example.com'])
    git(['config', 'user.name', 'wall'])
    writeFileSync(join(dir, '.gitignore'), 'ignored/\n')
    writeFileSync(join(dir, 'keep.txt'), 'keep\n')
    git(['add', '.gitignore', 'keep.txt'])
    git(['commit', '-q', '-m', 'seed'])
    return dir
  }

  it('DOOR: a pushed ignored path refuses even though the index is clean (the hook argument is the judged set)', () => {
    const dir = scratchRepo()
    mkdirSync(join(dir, 'ignored'), { recursive: true })
    writeFileSync(join(dir, 'ignored', 'capture.bin'), 'bytes\n')
    const { status, out } = runGate(dir, ['ignored/capture.bin'])
    expect(status, out).toBe(1)
    expect(out).toContain('IGNORED-PATH')
    rmSync(dir, { recursive: true, force: true })
  })

  it('DOOR: a deletion of an ignored path rides (an untrack carries no bytes in)', () => {
    const dir = scratchRepo()
    // the path MATCHES the ignore rule (that is why it is being
    // untracked) yet is absent on disk — the hook may still hand it
    // over from the range; the gate judges what will exist
    const { status, out } = runGate(dir, ['ignored/capture.bin'])
    expect(status, out).toBe(0)
    rmSync(dir, { recursive: true, force: true })
  })
})
