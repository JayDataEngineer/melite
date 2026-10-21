/**
 * abortable.ts — the abortable wait the run watchers share: one timer,
 * one once-abort listener, and the listener is detached on whichever
 * arm lands first. DSH's own shape (reference
 * packages/client/connection/src/client/connection.ts:23,
 * `sleep(ms, signal)`), which the round-18 audits found re-implemented
 * three times with one arm leaking a listener per poll
 * (dev_docs/audits/round18-auditor-runs-registry-2026-10-10.md F2).
 */
/** Wait `ms`, or until `signal` aborts.
 *  @param ms — the wait in milliseconds.
 *  @param signal — the caller's abort signal; absent, the wait is a plain sleep.
 *  @returns `"slept"` when the timer landed, `"abort"` when the signal fired
 *  first (including a signal already aborted at the call). */
export declare function abortableSleep(ms: number, signal?: AbortSignal): Promise<'slept' | 'abort'>;
//# sourceMappingURL=abortable.d.ts.map
