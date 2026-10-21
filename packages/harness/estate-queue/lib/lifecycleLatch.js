// lifecycleLatch.ts — the lifecycle latch (MP-R1 cure, 2026-10-10).
//
// The guard half (guardLifecycle in manageOps.ts) refuses a teardown
// when runs are already live, but five of the six destructive doors
// await on the vendor call as their first act — a run born during
// that await tears mid-render (round-19 F1: sidecar says running
// while its engine reboots). The latch is the reservation half: a
// guarded door holds it across its destructive section and the run
// press (RunsRegistry.start) refuses while it names an action.
// Doors overlap (the manage dispatch is unserialized): one slot would
// let the first finisher's release clear the other's live hold. Each
// holder counts under its own action name; the read names the earliest
// holder (Map insertion order).
const holders = new Map();
/**
 * Hold the latch for one door; the door releases it in its own finally.
 * Holds nest under the same action name and across names; a release
 * only retires its own hold.
 * @param action the destructive action in flight (the door's own name)
 * @returns the door's release closure, idempotent for its own hold
 */
export function holdLifecycle(action) {
    holders.set(action, (holders.get(action) ?? 0) + 1);
    return () => {
        const left = (holders.get(action) ?? 1) - 1;
        if (left <= 0)
            holders.delete(action);
        else
            holders.set(action, left);
    };
}
/**
 * The earliest action whose teardown is in flight, or null — read by
 * the run press before its press reserve and record mint, and re-read
 * by the press after its last await (runsStart's enqueue gate).
 * @returns the held action name, or null when no teardown is in flight
 */
export function lifecycleInFlight() {
    const first = holders.keys().next();
    return first.done ? null : first.value;
}
//# sourceMappingURL=lifecycleLatch.js.map
