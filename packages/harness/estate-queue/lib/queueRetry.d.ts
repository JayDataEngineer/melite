export interface RetryAsk {
    readonly attempt: number;
    readonly maxExtra: number;
    readonly stopSet: boolean;
}
export interface RetryNote {
    /** The stage-row stamp (retries_used + retry_last_error). */
    readonly stagePatch: {
        retries_used: number;
        retry_last_error: string;
    };
    /** The durable row: ledger("run.stage_retry", ...). */
    readonly ledgerEvent: string;
    readonly ledgerData: {
        run_id: string;
        stage: string;
        attempt: number;
        error: string;
    };
    /** The live row: publish(run_id, stage/…/retry). Key order . */
    readonly busFrame: {
        type: string;
        stage: string;
        index: number;
        retry: number;
    };
}
/** Continue-or-raise: a failed attempt re-runs while
 *  attempts remain AND no stop landed; a deliberate STOP never
 *  retries (both the exception arm 1754 and the error-dict arm
 *  1775-1778 gate on the stop flag). */
export declare function shouldRetry(ask: RetryAsk): boolean;
/** One documented retry: sidecar row + events bus +
 *  ledger — never a silent re-run. */
export declare function noteStageRetry(runId: string, stageId: string, stageIndex: number, attempt: number, why: string): RetryNote;
//# sourceMappingURL=queueRetry.d.ts.map
