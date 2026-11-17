// card-without-family-journey.spec.ts — THE L2 COMPOSITE WALL (the
// plugin law's journey half, the card-without-family audit's (b)
// seam): child processes drive the whole operator journey with a
// family package PRUNED — a Node resolve hook makes the package
// unresolvable EXACTLY as a pruned install is (ERR_MODULE_NOT_FOUND
// at import), and the driver boots the REAL estate (real
// loadFamilies, real census composition, real card defs, real
// compose door) on the BUILT plane the bench executes.
//
// THE JOURNEY (each hop a firing arm, at the hop the burn is felt):
//   load-serve   — the boot arms with the survivors; the dead family
//                  retires ALONE, NAMED in the boot log (the voice
//                  is captured and judged — never swallowed).
//   form-open    — the music card's def serves and the tool face
//                  builds (the knob falls back to the BOARDED
//                  literal — the card never dies for a family).
//   add_stage    — the compose admission accepts the music stage
//                  (boarding a lawfully-absent family is not drift).
//   run-refusal  — composing a music3-family model REFUSES LOUD
//                  naming 'music3' (the seat's own voice).
//
// THE FLAVOR-BEARING ARM (krea-2): a family whose package carries
// mods/* flavor rows in composeModPlane's table — the flavor rows
// retire alone too (cardDefs.ts's packaged-flavor loop), and the
// card plane still serves. This is the arm the total-outage smoke
// caught: the flavor table was all-or-nothing one layer under the
// family table the audit named.
//
// The negative arms: a TOTAL family-plane outage still refuses the
// boot (zero families is an estate defect, not plugin absence), and
// a typo'd boarding still refuses at validation (lawful absence is
// not a hole — only ids a real dead package backed).
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { validateRegistryAgainstCards } from '../../../../packages/engines/comfyui-cordis/src/models/validate.ts'

const WALL_DIR = import.meta.dirname
const ROOT = join(WALL_DIR, '..', '..', '..', '..')

/** Run the journey driver under a prune hook (the specifier env
 *  names the pruned family; music3 drives all four hops).
 *  spawnSync, never execFile: the driver's NON-ZERO exit is a
 *  verdict (the outage arm refuses by design), not a spawn failure. */
const drive = (hook: string, prune?: string): Array<{ hop: string, ok: boolean, detail: string }> => {
  const run = spawnSync(
    process.execPath,
    ['--import', join(WALL_DIR, hook), join(WALL_DIR, 'l2-journey-driver.mjs')],
    { cwd: ROOT, encoding: 'utf8', timeout: 120_000, env: { ...process.env, ...(prune === undefined ? {} : { MELITE_L2_PRUNE: prune }) } },
  )
  expect(run.error, `the driver spawn failed: ${String(run.error)}`).toBeUndefined()
  const lines = (run.stdout ?? '').split('\n').filter((l) => l.trim().startsWith('{"hop"'))
  expect(lines.length, `the driver printed no verdicts (stderr: ${run.stderr?.slice(0, 400)})`).toBeGreaterThan(0)
  return lines.map((l) => JSON.parse(l) as { hop: string, ok: boolean, detail: string })
}

describe("THE CARD-WITHOUT-FAMILY JOURNEY (L2 composite — the plugin law at the operator's hops)", () => {
  it("a pruned family package: the estate serves, the card serves, the stage lands, the run refuses LOUD naming the family", () => {
    const verdicts = drive('prune-music3-hook.mjs')
    const byHop = new Map(verdicts.map((v) => [v.hop, v]))
    for (const hop of ['load-serve', 'form-open', 'add_stage', 'run-refusal']) {
      const v = byHop.get(hop)
      expect(v, `the driver never reported hop '${hop}'`).toBeDefined()
      expect(v!.ok, `${hop}: ${v!.detail}`).toBe(true)
    }
    const boot = byHop.get('load-serve')!
    expect(boot.detail, 'the boot log must carry the retired-alone voice naming the family').toContain("'music3' retired alone")
    const refusal = byHop.get('run-refusal')!
    expect(refusal.detail, 'the refusal must carry the family\'s own name').toContain('music3')
  }, 180_000)

  it('a FLAVOR-BEARING pruned family (krea-2): the boot isolates it AND the mod plane retires its flavor rows alone — the card plane still serves', () => {
    const verdicts = drive('prune-krea2-hook.mjs', 'krea-2')
    const byHop = new Map(verdicts.map((v) => [v.hop, v]))
    // the flavor-bearing journey owns the first two hops (the compose
    // hops are the music3 journey's own — krea-2's seat refusal rides
    // the same door the four-hop arm already judges)
    for (const hop of ['load-serve', 'form-open']) {
      const v = byHop.get(hop)
      expect(v, `the driver never reported hop '${hop}'`).toBeDefined()
      expect(v!.ok, `${hop}: ${v!.detail}`).toBe(true)
    }
    expect(byHop.get('load-serve')!.detail, 'the krea-2 absence must be named at boot too').toContain("'krea-2' retired alone")
  }, 180_000)

  it('a TOTAL family-plane outage still refuses the boot (zero families is an estate defect, not plugin absence)', () => {
    const verdicts = drive('prune-all-families-hook.mjs')
    const boot = verdicts.find((v) => v.hop === 'load-serve')
    expect(boot, 'the driver never reported the boot hop').toBeDefined()
    expect(boot!.ok, 'a zero-family boot must REJECT, not arm').toBe(false)
    expect(boot!.detail, 'the outage voice names the law: absences are single families, never the estate').toContain('total family outage')
  }, 180_000)

  it("lawful absence is not a hole: a boarded id in the DEAD roster passes validation, a typo'd id still refuses", () => {
    // the pure half the boot feeds (validateBootContracts threads the
    // dead roster into exactly this call) — pinned at the seam, so
    // the composite arms above ride a judge that cannot silently
    // widen: only ids a real dead package backed pass.
    const boardings = new Map<string, readonly string[]>([['music', ['music3']]])
    const dead = new Set(['music3'])
    // the dead-roster pass: boarding a lawfully-absent family serves
    expect(() =>
      validateRegistryAgainstCards([], new Map(), [], boardings, undefined, undefined, undefined, dead),
    ).not.toThrow()
    // the same boarding with NO dead roster refuses (nothing backs it)
    expect(() =>
      validateRegistryAgainstCards([], new Map(), [], boardings),
    ).toThrow(/boards 'music3' — no such model registered/)
    // and a typo'd id refuses EVEN WITH the dead roster present
    const typo = new Map<string, readonly string[]>([['music', ['musicX']]])
    expect(() =>
      validateRegistryAgainstCards([], new Map(), [], typo, undefined, undefined, undefined, dead),
    ).toThrow(/boards 'musicX' — no such model registered/)
  })
})
