/**
 * Shared settle budget for the dom lane's real-async waits (journey-closure E5 cure C4).
 *
 * The budget depends only on the run's execution environment:
 * - a scoped local vitest run returns the scoped budget, 30_000 ms;
 * - the coverage gate sets MELITE_COVERAGE_SHARED=1 (package.json test:coverage)
 *   and its loaded worker pool gets the loaded budget, the scoped budget doubled;
 * - MELITE_LOADED_WAIT_MS overrides the returned value outright for a targeted
 *   proof or a slower box; a non-integer or non-positive value fails loud here
 *   instead of degrading the budget silently.
 *
 * No timers, no randomness, no per-machine input: the same command produces the
 * same budget everywhere. availableParallelism() is deliberately not an input,
 * because machine-dependent budgets reintroduce the moving-failure class this
 * constant removes.
 *
 * Suites consume the budget as a multiple so one stretch factor moves the whole
 * lane: LOADED_WAIT() at sibling sites, LOADED_WAIT() * 2 where a site
 * deliberately needs longer. Keep multipliers exact over the base:
 * 30_000 * 2 / 3 === 20_000, and every multiplier stays exact under the loaded
 * budget as well.
 */

/** Scoped settle budget in milliseconds; the loaded pool doubles it. */
const SCOPED_WAIT_MS = 30_000

/** Settle-budget stretch applied while the loaded coverage gate runs. */
const LOADED_POOL_STRETCH = 2

/**
 * The settle budget for one real-async wait in the dom lane.
 *
 * @returns the budget in milliseconds: 30_000 for a scoped run, 60_000 under
 *   the coverage gate, or the MELITE_LOADED_WAIT_MS override.
 */
export function LOADED_WAIT(): number {
  const override = process.env.MELITE_LOADED_WAIT_MS
  if (override !== undefined) {
    const parsed = Number(override)
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error(
        `MELITE_LOADED_WAIT_MS must be a positive integer, received ${JSON.stringify(override)}`,
      )
    }
    return parsed
  }
  const loadedPool = process.env.MELITE_COVERAGE_SHARED === '1'
  return SCOPED_WAIT_MS * (loadedPool ? LOADED_POOL_STRETCH : 1)
}
