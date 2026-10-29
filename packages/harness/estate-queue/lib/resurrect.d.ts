import type { QueueRoots } from "./queue.js";
export type { QueueRoots };
/** Sweep half: stale running/queued sidecars settle failed (+ boot
 *  notes), live ids exempt. Returns swept ids in sorted order. */
export declare function bootSweep(roots: QueueRoots, live: readonly string[]): Promise<string[]>;
//# sourceMappingURL=resurrect.d.ts.map