/**
 * THE FLOW MODE VOICE WALL (vocab audit 2026-11-01 W3, the
 * output-description census) — melite_flow's output `mode`
 * description names every `mode` value the tool returns.
 *
 * THE BURN (rank 2 MEDIUM): the output schema described `mode` as
 * "card | flow | adhoc" while the tool returns `mode: 'bench'` at
 * ten bench-pass sites (plus the empty-bench and remote-refused
 * paths) — the commonest success value, undocumented. An agent
 * switching on the documented set mishandles every bench run
 * (a silent mishandle, never a loud refusal — the schema is
 * type:'string', so no 422 fires).
 *
 * W-1 (2026-11-05, operator option 2): the ad-hoc hatch is DELETED
 * (F3-13 proved it never was bench-isolated — it landed through
 * loadBench overwrite:true, replacing stages + intent; the per-stage
 * {stage} press (W-8) is the hand-built replacement and rides the
 * bench pass, so 'adhoc' left the tool with runAdHoc). The census
 * pins the THREE-value set; a reintroduced mode:'adhoc' return reds
 * BY NAME.
 *
 * Arm 1 — THE CENSUS: the returned set derives from every
 *   `mode: '…'` literal in the tool's execute paths; the documented
 *   set is the output-schema `mode` property's description line.
 *   Undocumented values RED BY NAME (bench was the first red).
 *
 * Depth: the real tool source on both sides, never a hand list —
 * a new composition returning a fourth mode reds until the
 * description teaches it (docs follow code).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '../../../..')
const FLOW = readFileSync(join(ROOT, 'packages/harness/melite-tools/src/tools/melite-flow.ts'), 'utf8')

/** Every mode value the tool's execute paths return. */
function returnedOf(): string[] {
  const out = new Set<string>()
  for (const m of FLOW.matchAll(/mode:\s*'([^']+)'/g)) out.add(m[1]!)
  return [...out].sort()
}

/** The output-schema `mode` property's DOCUMENTED COMPOSITION LIST —
 *  the `a | b | c` enumeration after "attempted):", not bare prose
 *  (a substring check would pass on a sentence ABOUT the value
 *  while the enumeration omits it — the exact class this wall
 *  judges). */
function documentedOf(): string[] {
  const line = FLOW.split('\n').find((l) => l.includes('mode: { type:'))
  expect(line, "the output-schema mode property must exist (else this wall judges nothing)").toBeDefined()
  const m = /attempted\): ([a-z][a-z |]*)\./.exec(line!)
  expect(m, 'the mode description must carry the `a | b` composition enumeration (else the wall judges nothing)').not.toBeNull()
  return m![1]!.split('|').map((s) => s.trim()).filter((s) => s !== '').sort()
}

describe('THE FLOW MODE VOICE (the output description names every returned mode)', () => {
  it('arm 1 — every returned mode value is documented (an undocumented value reds BY NAME)', () => {
    const returned = returnedOf()
    expect(returned.length, 'the return sweep must find the execute-path modes').toBeGreaterThanOrEqual(3)
    // W-1: the ad-hoc mode is gone — 'adhoc' here reds BY NAME, and a
    // reintroduced runAdHoc return reds this census until the
    // description teaches it again (docs follow code).
    expect(returned, 'the tool serves the three compositions (W-1 deleted the ad-hoc mode)').toEqual(['bench', 'card', 'flow'])
    const doc = documentedOf()
    const undocumented = returned.filter((v) => !doc.includes(v))
    expect(undocumented, 'undocumented mode value (an agent switching on the documented set mishandles it): ' + JSON.stringify(undocumented)).toEqual([])
    expect(doc.length, 'the enumeration must name compositions').toBeGreaterThanOrEqual(3)
  })
})
