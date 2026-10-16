/**
 * e2e-engine-gate-census.spec.ts — THE ENGINE-GATE CENSUS (operator
 * order 2026-11-06: lifecycle/queuing/markers). Every e2e suite
 * that submits to the live ComfyUI gates on ONE home
 * (tests/e2e/engine-gate.ts — presence AND busy-defer); suites
 * that need no engine carry `// NO-ENGINE: <reason>`. Eleven
 * hand-carried engineAlive copies proved the drift class: a new
 * engine file with no gate queues real prompts onto the
 * operator's GPU mid-render and nothing reds.
 *
 * The law, per file:
 *   - imports engine-gate.ts AND references ENGINE_FREE in a
 *     skipIf (importing without gating is the exact laziness
 *     named — the wall refuses the unarmed import), XOR
 *   - carries the NO-ENGINE marker (engine-clean by design).
 * Both at once is confusion, neither is a live wire.
 */
import { globSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../../..')

const TREES = ['tests/e2e', 'packages/*/harness/tests', 'packages/*/*/tests']

function e2eFiles(): string[] {
  const found = new Set<string>()
  for (const tree of TREES) {
    for (const f of globSync(`${tree}/**/*.e2e.ts`, { cwd: ROOT })) {
      if (!f.includes('node_modules')) found.add(f)
    }
  }
  return [...found].sort()
}

function classify(source: string): 'gated' | 'marked' | 'both' | 'neither' {
  const gated = source.includes('engine-gate.ts') && /skipIf\([^)]*ENGINE_FREE/.test(source)
  const marked = source.includes('NO-ENGINE:')
  if (gated && marked) return 'both'
  if (gated) return 'gated'
  if (marked) return 'marked'
  return 'neither'
}

describe('THE ENGINE-GATE CENSUS — every engine e2e gates on the one home', () => {
  it('every *.e2e.ts is gated (ENGINE_FREE in a skipIf) or marked NO-ENGINE, never both, never neither', () => {
    const files = e2eFiles()
    // the floor below keeps the census honest (a parsed-empty walk
    // would silently pass every future engine file — the
    // masked-gate lesson; the count pins today's thirteen).
    expect(files.length, 'the e2e census walks the engine-touching trees').toBeGreaterThanOrEqual(13)
    const verdict = new Map(files.map((f) => [f, classify(readFileSync(resolve(ROOT, f), 'utf8'))]))
    const neither = files.filter((f) => verdict.get(f) === 'neither')
    const both = files.filter((f) => verdict.get(f) === 'both')
    const gated = files.filter((f) => verdict.get(f) === 'gated')
    const marked = files.filter((f) => verdict.get(f) === 'marked')
    expect(
      neither,
      `engine e2e without a gate or marker — import tests/e2e/engine-gate.ts and skipIf(!ENGINE_FREE), or carry // NO-ENGINE: <reason>: ${neither.join(', ')}`,
    ).toEqual([])
    expect(both, `engine e2e both gated and marked — pick one: ${both.join(', ')}`).toEqual([])
    // the census names the gated (a shrink below the floor forces
    // a look — a gate removed is a live wire re-exposed).
    expect(gated.length, 'gated engine suites').toBeGreaterThanOrEqual(8)
    expect(marked.length, 'marked engine-clean suites').toBeGreaterThanOrEqual(5)
  })

  it('the law FIRES (a gateless engine file reds, a marked file greens — synthetic sources, never the tree)', () => {
    const live =
      "import { it } from 'vitest'\nimport { ENGINE_FREE } from './engine-gate.ts'\n it.skipIf(!ENGINE_FREE)('x', () => {})\nfetch('http://127.0.0.1:8188/prompt')\n"
    const marked = '// NO-ENGINE: headless on purpose\nit(\'x\', () => {})\n'
    const bare = "import { it } from 'vitest'\nit('x', () => {})\n"
    expect(classify(live)).toBe('gated')
    expect(classify(marked)).toBe('marked')
    expect(classify(bare)).toBe('neither')
  })
})
