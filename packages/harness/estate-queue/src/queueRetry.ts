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
export function shouldRetry(ask: RetryAsk): boolean {
  return ask.attempt < ask.maxExtra && !ask.stopSet;
}

/** One documented retry: sidecar row + events bus — never a
 *  silent re-run, never a journal row (see RetryNote). */
export function noteStageRetry(
  runId: string,
  stageId: string,
  stageIndex: number,
  attempt: number,
  why: string,
): RetryNote {
  return {
    stagePatch: { retries_used: attempt, retry_last_error: why },
    busFrame: { type: "stage", stage: stageId, index: stageIndex, retry: attempt },
  };
}
