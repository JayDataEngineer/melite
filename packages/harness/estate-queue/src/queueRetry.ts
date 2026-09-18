// queueRetry.ts — the R3.3 stage-retry policy (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

// ── R3.3 retry policy (1727-1780, _note_stage_retry 1906-1911) ───

export interface RetryAsk {
  readonly attempt: number;
  readonly maxExtra: number;
  readonly stopSet: boolean;
}

export interface RetryNote {
  /** The stage-row stamp (retries_used + retry_last_error). */
  readonly stagePatch: { retries_used: number; retry_last_error: string };
  /** The durable row: ledger("run.stage_retry", ...). */
  readonly ledgerEvent: string;
  readonly ledgerData: {
    run_id: string;
    stage: string;
    attempt: number;
    error: string;
  };
  /** The live row: publish(run_id, stage/…/retry). Key order as py. */
  readonly busFrame: {
    type: string;
    stage: string;
    index: number;
    retry: number;
  };
}

/** Continue-or-raise (1753-1780): a failed attempt re-runs while
 *  attempts remain AND no stop landed; a deliberate STOP never
 *  retries (both the exception arm 1754 and the error-dict arm
 *  1775-1778 gate on the stop flag). */
export function shouldRetry(ask: RetryAsk): boolean {
  return ask.attempt < ask.maxExtra && !ask.stopSet;
}

/** One documented retry (1906-1911): sidecar row + events bus +
 *  ledger — never a silent re-run. */
export function noteStageRetry(
  runId: string,
  stageId: string,
  stageIndex: number,
  attempt: number,
  why: string,
): RetryNote {
  return {
    stagePatch: { retries_used: attempt, retry_last_error: why },
    ledgerEvent: "run.stage_retry",
    ledgerData: { run_id: runId, stage: stageId, attempt, error: why },
    busFrame: { type: "stage", stage: stageId, index: stageIndex, retry: attempt },
  };
}
