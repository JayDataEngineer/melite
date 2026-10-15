import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
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

  it('WIRING: the pre-commit carries the trash job (the hook fires with the fleet)', () => {
    // The F-L4 lesson (2026-09-28, restumbled here 2026-11-05): a
    // bare includes() is blinded by COMMENT mentions — the first
    // toggle proof swapped the run: line and this arm stayed green
    // off the job's explanatory comment. The arm judges the RUN
    // DIRECTIVE itself.
    const hook = readFileSync(join(ROOT, 'lefthook.yml'), 'utf8')
    expect(hook).toMatch(/run:\s*node tools\/staged-trash-gate\.mjs/)
  })
})
