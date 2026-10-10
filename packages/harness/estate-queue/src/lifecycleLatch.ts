// lifecycleLatch.ts — the lifecycle latch (MP-R1 cure, 2026-10-10).
//
// The guard half (guardLifecycle in manageOps.ts) refuses a teardown
// when runs are already live, but five of the six destructive doors
// await on the vendor call as their first act — a run born during
// that await tears mid-render (round-19 F1: sidecar says running
// while its engine reboots). The latch is the reservation half: a
// guarded door holds it across its destructive section and the run
// press (RunsRegistry.start) refuses while it names an action.

let held: string | null = null

/**
 * Hold the latch for one door; the door releases it in its own finally.
 * The release only clears its own hold — a stale release (a different
 * action took the latch since) leaves the live hold standing.
 * @param action the destructive action in flight (the door's own name)
 * @returns the door's release closure, idempotent for its own hold
 */
export function holdLifecycle(action: string): () => void {
  held = action
  return () => { if (held === action) held = null }
}

/**
 * The action whose teardown is in flight, or null — read by the run
 * press before its press reserve and record mint.
 * @returns the held action name, or null when no teardown is in flight
 */
export function lifecycleInFlight(): string | null { return held }
