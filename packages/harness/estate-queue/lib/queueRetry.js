// queueRetry.ts — the R3.3 stage-retry policy (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
/** Continue-or-raise: a failed attempt re-runs while
 *  attempts remain AND no stop landed; a deliberate STOP never
 *  retries (both the exception arm 1754 and the error-dict arm
 *  1775-1778 gate on the stop flag). */
export function shouldRetry(ask) {
    return ask.attempt < ask.maxExtra && !ask.stopSet;
}
/** One documented retry: sidecar row + events bus +
 *  ledger — never a silent re-run. */
export function noteStageRetry(runId, stageId, stageIndex, attempt, why) {
    return {
        stagePatch: { retries_used: attempt, retry_last_error: why },
        ledgerEvent: "run.stage_retry",
        ledgerData: { run_id: runId, stage: stageId, attempt, error: why },
        busFrame: { type: "stage", stage: stageId, index: stageIndex, retry: attempt },
    };
}
//# sourceMappingURL=queueRetry.js.map
