import type { Context } from "@deepseek-ai/cordis";
type RunChangeListener = (runId: string) => void;
/** The event seam this pure-domain spine reaches the bus through
 *  (the bench seam's law, verbatim: the writers own no Context, the
 *  owning service installs the pair once). */
export interface RunsChangeSeam {
    emit: (runId: string) => void;
    on: (fn: RunChangeListener) => () => void;
}
declare module "@deepseek-ai/cordis" {
    interface Events {
        /**
         * A run row moved — a claim (queued→running), a settle
         * (terminal), an artifacts harvest, or a stop press (→stopping).
         * Emitted after the write landed.
         * @mode emit
         * @param runId - the run whose row moved.
         */
        "runs.changed": (runId: string) => void;
    }
}
/** Install the seam (the registry service does this with its
 *  Context; tests with their own). Pass null to detach. ONE seam at
 *  a time — module state, LAST install wins (the bench seam's
 *  measured law, drafts remote.ts installBenchChangeSeam: the estate
 *  is single-tenant here, and the failure mode is loud — onRunChange
 *  refuses rather than subscribing to nothing). */
export declare function setRunsChangeSeam(seam: RunsChangeSeam | null): void;
/** Detach the seam ONLY if `seam` is still the installed one — the
 *  ownership stamp that keeps dispose honest: a fiber that installed
 *  EARLIER (a newer install displaced it) detaches nothing, so the
 *  live seam survives the older fiber's unwind.
 * @param seam - the seam instance the caller installed.
 */
export declare function clearRunsChangeSeam(seam: RunsChangeSeam): void;
/** Subscribe to run-row movement; returns the unsubscribe.
 *
 *  THE LISTENER FAULT LAW rides HERE, not in the bus: `ctx.emit`
 *  stops at the first throwing listener and rethrows out of the emit
 *  (measured 2026-10-12 on cordis 4.0.4), while this module's
 *  contract is that a subscriber's fault never breaks the write and
 *  never starves the listeners after it. Wrapping the handler is what
 *  makes the typed event lawful here. */
export declare function onRunChange(fn: RunChangeListener): () => void;
/** Fire the row-moved event — the write spine calls this after every
 *  landed write that moves a run (the claim, the settle, the
 *  artifacts harvest, the stop press). A wake resolves the
 *  subscriber's park in a microtask, by which time the writer's
 *  synchronous mutation has landed — the re-read serves the moved
 *  row, never the pre-write one. */
export declare function notifyRunChanged(runId: string): void;
/** Install the typed runs event seam on a Context (the registry
 *  service's constructor — the bench installer's law, drafts
 *  remote.ts installBenchChangeSeam): fiber-scoped through
 *  ctx.effect, so the seam detaches when the fiber is disposed.
 * @param ctx - the Context whose bus carries `runs.changed`.
 * @returns the effect disposer (the effect owns it; returned for
 *  direct callers that need an early detach). */
export declare function installRunsChangeSeam(ctx: Context): () => void;
export {};
//# sourceMappingURL=runsChange.d.ts.map