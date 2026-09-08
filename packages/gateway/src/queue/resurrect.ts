// resurrect.ts — thin compat seam over queue.ts (the single P5 core).
//
// The resurrect wall (tests/walls/suites/test_gateway_queue_parity.py
// ancestry: test_gateway_resurrect_parity.py Phase A) imports
// { bootResurrect, bootSweep } from THIS path with the
// (roots, enqueue) shapes. All discipline lives in queue.ts — this
// file only adapts signatures, never reimplements (no second
// sweeper, no second rebuilder).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import {
  bootSweep as coreSweep,
  resurrectRuns,
} from "./queue.ts";
import type { QueueRoots, RebuiltRun } from "./queue.ts";

export type { QueueRoots, RebuiltRun };

/** Resurrect half: usable QUEUED records re-queue FIFO (same ids) +
 *  run.resurrected rows. Returns revived ids (spreadable, .length —
 *  the sweep's live shield). */
export function bootResurrect(
  roots: QueueRoots,
  enqueue: (run: RebuiltRun) => void,
): string[] {
  return resurrectRuns(roots.stateRoot, enqueue);
}

/** Sweep half: stale running/queued sidecars settle failed (+ boot
 *  notes), live ids exempt. Returns swept ids in sorted order. */
export function bootSweep(
  roots: QueueRoots,
  live: readonly string[],
): string[] {
  return coreSweep(roots.stateRoot, live);
}
