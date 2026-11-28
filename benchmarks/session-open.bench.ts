/**
 * session-open.bench.ts — Performance benchmarks (DSH tier 5, required
 * Linux PR gate node 24 / benchmarks): benchmarks/ groups user-path
 * gates. Timed code runs under plain Node, never TSX. Synthetic inputs
 * enforce time, heap, and scaling budgets; package-local .perf.ts stays
 * diagnostic.
 *
 * THE SCALING JUDGE (2026-11-28, the push battery's flake): the old
 * arm timed ONE sub-millisecond Map build per size (0.58 ms vs 6.18 ms
 * under the battery's load — a GC pause or a scheduler preemption is
 * the whole measurement) and red a healthy tree. Timing arms that must
 * not flake take the MEDIAN of warmed samples, never one cold read;
 * the linear guard itself (under 8x for 4x the rows) is one pure
 * function, judged on synthetic numbers by its own firing arm.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'

function syntheticCatalog(n: number): Array<{ id: string; label: string }> {
  return Array.from({ length: n }, (_, i) => ({ id: `model-${i}`, label: `Model ${i}` }))
}

/** The scaling guard, one home: 4x the rows may cost at most `factor`
 *  the small run's time (linear scaling is 4x; 8x leaves headroom for
 *  noise without admitting a quadratic). */
export function scalesLinearly(tSmall: number, tBig: number, factor = 8): boolean {
  return tBig < Math.max(tSmall, 0.01) * factor
}

/** Median of `samples` timed runs after `warm` untimed runs — the
 *  median shrugs off a single slow read (GC, preemption); the warm-up
 *  lets the JIT settle before the first timed read. */
function medianTime(rows: Array<{ id: string; label: string }>, warm: number, samples: number): number {
  const once = (): number => {
    const start = performance.now()
    const m = new Map(rows.map((r) => [r.id, r.label] as const))
    assert.equal(m.size, rows.length)
    return performance.now() - start
  }
  for (let i = 0; i < warm; i += 1) once()
  const times: number[] = []
  for (let i = 0; i < samples; i += 1) times.push(once())
  times.sort((a, b) => a - b)
  return times[Math.floor(times.length / 2)] ?? 0
}

describe('session-open benchmark (synthetic user path)', () => {
  it('indexes 5k catalog rows within the time budget', () => {
    const rows = syntheticCatalog(5000)
    // the warmed median, not one cold read (the same law as the scaling arm)
    const elapsed = medianTime(rows, 2, 5)
    assert.ok(elapsed < 1000, `indexing 5k rows took ${elapsed.toFixed(1)}ms (budget 1000ms)`)
  })

  it('scales linearly: 10k rows cost under 8x the warmed median of the 2.5k cost (4x the rows; 8x leaves headroom, admits no quadratic)', () => {
    const small = syntheticCatalog(2500)
    const big = syntheticCatalog(10000)
    const tSmall = medianTime(small, 3, 9)
    const tBig = medianTime(big, 3, 9)
    assert.ok(scalesLinearly(tSmall, tBig), `scaling blew out: 2.5k=${tSmall.toFixed(2)}ms 10k=${tBig.toFixed(2)}ms`)
  })

  it('the scaling judge FIRES (synthetic numbers, never the clock): linear passes, 8x and beyond refuse, a zero small-run keeps the floor', () => {
    assert.equal(scalesLinearly(1, 4), true, 'exactly linear (4x the rows) passes')
    assert.equal(scalesLinearly(1, 7.99), true, 'under 8x passes')
    assert.equal(scalesLinearly(1, 8), false, '8x refuses')
    assert.equal(scalesLinearly(1, 40), false, 'a quadratic (16x the cost for 4x the rows) refuses')
    assert.equal(scalesLinearly(0, 0.5), false, 'a zero small-read keeps the 0.01 floor (a 0.5 ms big-read is 50x it)')
    assert.equal(scalesLinearly(0, 0.005), true, 'a zero small-read against a 0.005 ms big-read passes on the floor')
  })
})
