/**
 * Hold the latch for one door; the door releases it in its own finally.
 * Holds nest under the same action name and across names; a release
 * only retires its own hold.
 * @param action the destructive action in flight (the door's own name)
 * @returns the door's release closure, idempotent for its own hold
 */
export declare function holdLifecycle(action: string): () => void;
/**
 * The earliest action whose teardown is in flight, or null — read by
 * the run press before its press reserve and record mint, and re-read
 * by the press after its last await (runsStart's enqueue gate).
 * @returns the held action name, or null when no teardown is in flight
 */
export declare function lifecycleInFlight(): string | null;
//# sourceMappingURL=lifecycleLatch.d.ts.map
