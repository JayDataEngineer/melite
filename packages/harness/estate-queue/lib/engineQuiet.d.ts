import type { ManageCtx } from "./managePlane.js";
/** The poll cadence under the quiet window — short enough that a
 *  press landing between two readings is caught inside the window. */
export declare const QUIET_POLL_MS = 1000;
export interface QuietVerdict {
    /** True only when the queue read empty and STAYED empty for the
     *  whole quiet window inside the budget. */
    readonly quiet: boolean;
    /** The last answerable reading's running rows. */
    readonly running: number;
    /** The last answerable reading's pending rows. */
    readonly pending: number;
    /** Readings that saw a busy queue (zero when the first reading
     *  was already empty). */
    readonly busyReads: number;
}
/** The caller's abort reason — an Error rides as itself. */
export declare function abortReason(signal: AbortSignal): unknown;
/** Sleep on the seat's timer (the no-bare-setTimeout law: the
 *  ManageCtx.timeout seat IS the timer), racing the caller's abort.
 *  The abort listener is registered before the timer starts and is
 *  removed on either settle; the post-registration re-check closes
 *  the race between the aborted check and the listener landing.
 *  @param ctx - the manage context (timer seat + signal).
 *  @param ms - the delay in milliseconds.
 *  @returns a promise settling when the timer fires; rejects with
 *  the abort reason when the caller aborts first. */
export declare function seatSleep(ctx: ManageCtx, ms: number): Promise<void>;
/** Wait for a QUIET engine queue inside the caller's budget.
 *  @param ctx - the manage context (endpoint + timer seat + signal).
 *  @param budgetMs - the teardown door's rail budget in milliseconds.
 *  @param quiesceMs - the quiet window in milliseconds; 0 tears on
 *  the first empty reading.
 *  @returns the verdict: quiet, or the last reading that never
 *  went quiet inside the budget. */
export declare function awaitEngineQuiet(ctx: ManageCtx, budgetMs: number, quiesceMs: number): Promise<QuietVerdict>;
//# sourceMappingURL=engineQuiet.d.ts.map
