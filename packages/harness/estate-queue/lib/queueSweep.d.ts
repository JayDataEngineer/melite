export interface SweepResult {
    readonly touched: boolean;
    readonly wasQueued: boolean;
    /** The D-8 hold: the queued face was NOT resettled — the row
     *  stays queued for the next boot's replay (only a caller that
     *  passes maxHolds > 0 can hold; the default resettles). */
    readonly held: boolean;
    readonly doc: Record<string, unknown>;
}
/** Patch a stale sidecar (pure half of sweep_sidecar): every
 *  running/queued status — top-level AND per-stage (any depth) —
 *  becomes failed. Idempotent (an already-swept file has no active
 *  statuses left → touched false, no write). A run still QUEUED
 *  never executed: its sweep note + error say so (queuedWhy)
 *  instead of implying a crash mid-run.
 *
 *  THE D-8 HOLD (defect board 2026-11-18): with maxHolds > 0, a
 *  still-QUEUED top-level face is HELD instead of failed — the
 *  press never executed, so it stays queued for the next boot's
 *  replay (a sweep note + a sweep_holds counter are the only keys
 *  touched; identity rides verbatim). Bounded: once the counter
 *  passes maxHolds the row settles failed with the exhausted-holds
 *  voice — a row no boot can replay must not haunt as queued
 *  forever (the same haunt law settleReplayRefusal carries). */
export declare function sweepSidecar(doc: Record<string, unknown>, why: string, queuedWhy?: string, maxHolds?: number): SweepResult;
/** Boot-sweep notes (boot_sweep 2402-2409). */
export declare const BOOT_SWEEP_WHY: string;
export declare const BOOT_SWEEP_QUEUED_WHY: string;
/** THE D-8 GRACE (defect board 2026-11-18: "the sweep should
 *  re-queue (or hold as queued) rather than fail: the user's press
 *  was valid and nothing about the engine changed"): a still-QUEUED
 *  sidecar at boot holds as queued for this many boots — the next
 *  boot's reconcile replays it if its request ever answers the
 *  durable gate. Three grace boots, then the row settles failed
 *  loud (a row no boot can replay must not haunt as queued
 *  forever — the haunt law settleReplayRefusal already carries). */
export declare const BOOT_SWEEP_MAX_HOLDS: number;
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
 *  queued sidecar is resurrected work, not a zombie). A RUNNING
 *  claim retires failed; a still-QUEUED claim NEVER executed, so it
 *  HOLDS as queued for the next boot's replay (D-8, bounded by
 *  BOOT_SWEEP_MAX_HOLDS — past the bound it settles failed loud).
 *  Swept BEFORE traffic, so the ledger never shows phantom actives.
 *  Returns the RETIRED run ids in sorted order (held rows are not
 *  retired and never ride it). */
export declare function bootSweep(stateRoot: string, liveRunIds?: readonly string[], nowS?: number): Promise<string[]>;
//# sourceMappingURL=queueSweep.d.ts.map