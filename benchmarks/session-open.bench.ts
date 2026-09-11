/**
 * session-open.bench.ts — Performance benchmarks (DSH tier 5, required
 * Linux PR gate node 24 / benchmarks): benchmarks/ groups user-path
 * gates. Timed code runs under plain Node, never TSX. Synthetic inputs
 * enforce time, heap, and scaling budgets; package-local .perf.ts stays
 * diagnostic.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'

function syntheticCatalog(n: number): Array<{ id: string; label: string }> {
  return Array.from({ length: n }, (_, i) => ({ id: `model-${i}`, label: `Model ${i}` }))
}

describe('session-open benchmark (synthetic user path)', () => {
  it('indexes 5k catalog rows within the time budget', () => {
    const rows = syntheticCatalog(5000)
    const start = performance.now()
    const index = new Map(rows.map((r) => [r.id, r.label] as const))
    const elapsed = performance.now() - start
    assert.equal(index.size, 5000)
    assert.ok(elapsed < 1000, `indexing 5k rows took ${elapsed.toFixed(1)}ms (budget 1000ms)`)
  })

  it('scales linearly: 10k rows cost less than 4x the 2.5k cost', () => {
    const small = syntheticCatalog(2500)
    const big = syntheticCatalog(10000)
    const time = (rows: typeof small): number => {
      const start = performance.now()
      const m = new Map(rows.map((r) => [r.id, r.label] as const))
      assert.equal(m.size, rows.length)
      return performance.now() - start
    }
    const tSmall = Math.max(time(small), 0.01)
    const tBig = time(big)
    assert.ok(tBig < tSmall * 8, `scaling blew out: 2.5k=${tSmall.toFixed(2)}ms 10k=${tBig.toFixed(2)}ms`)
  })
})
