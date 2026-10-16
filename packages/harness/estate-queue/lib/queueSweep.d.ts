export interface SweepResult {
    readonly touched: boolean;
    readonly wasQueued: boolean;
    readonly doc: Record<string, unknown>;
}
/** Patch a stale sidecar (pure half of sweep_sidecar): every
 *  running/queued status — top-level AND per-stage (any depth) —
 *  becomes failed. Idempotent (an already-swept file has no active
 *  statuses left → touched false, no write). A run still QUEUED
 *  never executed: its sweep note + error say so (queuedWhy)
 *  instead of implying a crash mid-run. */
export declare function sweepSidecar(doc: Record<string, unknown>, why: string, queuedWhy?: string): SweepResult;
/** Boot-sweep notes (boot_sweep 2402-2409). */
export declare const BOOT_SWEEP_WHY: string;
export declare const BOOT_SWEEP_QUEUED_WHY: string;
/** Read-time sweep notes + response errors (sidecar_status
 *  2428-2451): the ledger state is ALWAYS "failed" (even for a
 *  queued zombie — the error TEXT carries the never-executed
 *  honesty), error "zombie swept at read time" mid-run. */
export declare const READ_SWEEP_WHY: string;
export declare const READ_SWEEP_QUEUED_WHY: string;
export declare const READ_SWEEP_RUNNING_ERROR: string;
/** Boot-time zombie sweep (boot_sweep 2378-2410, fs half): every
 *  sidecar still claiming running/queued belongs to a DEAD process
 *  — EXCEPT liveRunIds (boot_resurrect just re-queued those; their
 *  queued sidecar is resurrected work, not a zombie). Swept BEFORE
 *  traffic, so the ledger never shows phantom actives. Returns the
 *  swept run ids in sorted order. */
export declare function bootSweep(stateRoot: string, liveRunIds?: readonly string[], nowS?: number): Promise<string[]>;
//# sourceMappingURL=queueSweep.d.ts.map
