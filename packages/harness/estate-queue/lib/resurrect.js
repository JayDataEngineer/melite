// resurrect.ts — thin compat seam over queue.ts (the single P5 core).
//
// STROKE 83: the hollow bootResurrect wrapper is RETIRED — the
// service's bootReconcile (runsRegistry.ts) replays _request.json
// through the start door, so revived rows carry REAL params. What
// stays here is the sweep ADAPTER (the QueueRoots signature) —
// all discipline lives in queue.ts, this file only adapts the
// signature, never reimplements (no second sweeper).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { bootSweep as coreSweep } from "./queue.js";
/** Sweep half: stale running/queued sidecars settle failed (+ boot
 *  notes), live ids exempt. Returns swept ids in sorted order. */
export async function bootSweep(roots, live) {
    return coreSweep(roots.stateRoot, live);
}
//# sourceMappingURL=resurrect.js.map
