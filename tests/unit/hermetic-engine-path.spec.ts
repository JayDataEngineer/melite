/**
 * hermetic-engine-path.spec.ts — THE WINDOWS ANCHOR WALL (the
 * 2026-11-06 windows-portability triage class #1): the hermetic
 * engine's boot-double path must anchor on every OS. The hand
 * slice minted `/D:/…` on Windows and resolve() doubled the drive
 * into `D:\D:\…` — every downstream compose refused closed with
 * ENOENT while posix stayed green (~32 tests, one helper).
 *
 * Arms judge the derivation (exported pure), not just its
 * survivors: the doubled-drive shape can never ride again on ANY
 * lane, and the live anchor resolves to the real double.
 */
import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { hermeticDocPathFor } from '../helpers/hermetic-engine.ts'

describe('the hermetic anchor (windows class #1)', () => {
  it('the live anchor resolves to the real boot double', () => {
    expect(existsSync(hermeticDocPathFor(import.meta.url))).toBe(true)
  })

  it('the anchor never carries a doubled drive — the CI burn shape', () => {
    for (const url of [
      import.meta.url,
      // the exact windows shape that burned CI (file:///D:/…):
      // the old slice minted `/D:/…` here and resolve doubled it.
      'file:///D:/repo/tests/helpers/hermetic-engine.ts',
      'file:///C:/Users/runner/work/repo/tests/helpers/hermetic-engine.ts',
    ]) {
      const p = hermeticDocPathFor(url)
      expect(p).not.toMatch(/[A-Za-z]:[\\/].*[A-Za-z]:[\\/]/)
      expect(p.replace(/\\/g, '/')).toMatch(/tests\/walls\/fixtures\/object_info\.boot\.json$/)
    }
  })
})
