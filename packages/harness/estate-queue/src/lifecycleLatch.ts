// lifecycleLatch.ts — the lifecycle latch (MP-R1 cure, 2026-10-10).
//
// The guard half (guardLifecycle in manageOps.ts) refuses a teardown
// when runs are already live, but five of the six destructive doors
// await on the vendor call as their first act — a run born during
// that await tears mid-render (round-19 F1: sidecar says running
// while its engine reboots). The latch is the reservation half: a
// guarded door holds it across its destructive section and the run
// press (RunsRegistry.start) refuses while it names an action.
//
// Doors overlap (the manage dispatch is unserialized): one slot would
// let the first finisher's release clear the other's live hold. Each
// holder counts under its own action name; the read names the earliest
// holder (Map insertion order).
//
// OWNERSHIP (the 2026-11-20 cordis-waterfall audit's F3): the state
// is INSTANCE state on the latch the queue seat owns
// (QueueService.lifecycleLatch), never a module global — the exact
// hazard melite-tools retired in its own V4 cure. Two hosts, two
// tests, two anything each get their own latch; nothing outside the
// holder Map's owner can reach it.

/** The reservation half of the lifecycle guard. One instance per
 *  queue seat; the manage doors hold, the run press reads. */
export class LifecycleLatch {
  #holders = new Map<string, number>()

  /**
   * Hold the latch for one door; the door releases it in its own
   * finally. Holds nest under the same action name and across
   * names; a release only retires its own hold.
   * @param action the destructive action in flight (the door's own name)
   * @returns the door's release closure, idempotent for its own hold
   */
  hold(action: string): () => void {
    this.#holders.set(action, (this.#holders.get(action) ?? 0) + 1)
    let released = false
    return () => {
      if (released) return
      released = true
      const left = (this.#holders.get(action) ?? 1) - 1
      if (left <= 0) this.#holders.delete(action)
      else this.#holders.set(action, left)
    }
  }

  /**
   * The earliest action whose teardown is in flight, or null — read
   * by the run press before its press reserve and record mint, and
   * re-read by the press after its last await (runsStart's enqueue
   * gate).
   * @returns the held action name, or null when no teardown is in flight
   */
  inFlight(): string | null {
    const first = this.#holders.keys().next()
    return first.done ? null : first.value
  }
}
