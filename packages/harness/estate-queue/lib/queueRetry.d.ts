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
    /** NO journal row (vocab audit 2026-11-01, rank 3 MEDIUM): an
     *  earlier revision of this note constructed ledgerEvent /
     *  ledgerData fields promising a durable run.stage_retry journal
     *  row that no seat ever emitted — zero production callers, and
     *  the ledger-tail census wall was blind to constructed-but-
     *  never-emitted literals. The promise is retired, not seated:
     *  there is no retry LOOP to audit (no production caller retries
     *  today), so a journal row would certify an audit trail for a
     *  path that does not run. The note is stage-row + bus frame
     *  only. */
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
/** One documented retry: sidecar row + events bus — never a
 *  silent re-run, never a journal row (see RetryNote). */
export declare function noteStageRetry(runId: string, stageId: string, stageIndex: number, attempt: number, why: string): RetryNote;
//# sourceMappingURL=queueRetry.d.ts.map
