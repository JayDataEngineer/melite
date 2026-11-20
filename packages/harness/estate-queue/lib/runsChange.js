let runsChangeSeam = null;
/** Install the seam (the registry service does this with its
 *  Context; tests with their own). Pass null to detach. ONE seam at
 *  a time — module state, LAST install wins (the bench seam's
 *  measured law, drafts remote.ts installBenchChangeSeam: the estate
 *  is single-tenant here, and the failure mode is loud — onRunChange
 *  refuses rather than subscribing to nothing). */
export function setRunsChangeSeam(seam) {
    runsChangeSeam = seam;
}
/** Detach the seam ONLY if `seam` is still the installed one — the
 *  ownership stamp that keeps dispose honest: a fiber that installed
 *  EARLIER (a newer install displaced it) detaches nothing, so the
 *  live seam survives the older fiber's unwind.
 * @param seam - the seam instance the caller installed.
 */
export function clearRunsChangeSeam(seam) {
    if (runsChangeSeam === seam)
        runsChangeSeam = null;
}
/** Subscribe to run-row movement; returns the unsubscribe.
 *
 *  THE LISTENER FAULT LAW rides HERE, not in the bus: `ctx.emit`
 *  stops at the first throwing listener and rethrows out of the emit
 *  (measured 2026-10-12 on cordis 4.0.4), while this module's
 *  contract is that a subscriber's fault never breaks the write and
 *  never starves the listeners after it. Wrapping the handler is what
 *  makes the typed event lawful here. */
export function onRunChange(fn) {
    if (runsChangeSeam === null) {
        throw new Error("estate-queue: no runs change seam installed — RunsRuntimeService installs it in its constructor, tests call setRunsChangeSeam()");
    }
    return runsChangeSeam.on((runId) => {
        try {
            fn(runId);
        }
        catch (fault) {
            /* the listener-fault law: name the error, swallow the why —
             * a subscriber's fault never breaks the write and never
             * starves the listeners after it (measured 2026-10-12) */
            console.error("runs.changed listener fault:", fault);
        }
    });
}
/** Fire the row-moved event — the write spine calls this after every
 *  landed write that moves a run (the claim, the settle, the
 *  artifacts harvest, the stop press). A wake resolves the
 *  subscriber's park in a microtask, by which time the writer's
 *  synchronous mutation has landed — the re-read serves the moved
 *  row, never the pre-write one. */
export function notifyRunChanged(runId) {
    runsChangeSeam?.emit(runId);
}
/** Install the typed runs event seam on a Context (the registry
 *  service's constructor — the bench installer's law, drafts
 *  remote.ts installBenchChangeSeam): fiber-scoped through
 *  ctx.effect, so the seam detaches when the fiber is disposed.
 * @param ctx - the Context whose bus carries `runs.changed`.
 * @returns the effect disposer (the effect owns it; returned for
 *  direct callers that need an early detach). */
export function installRunsChangeSeam(ctx) {
    let detach = null;
    ctx.effect(() => {
        const mine = {
            emit: (runId) => { ctx.emit("runs.changed", runId); },
            on: (fn) => {
                const stop = ctx.on("runs.changed", fn);
                return () => { stop(); };
            },
        };
        setRunsChangeSeam(mine);
        // the ownership stamp: an older fiber's unwind clears only its own
        // install — a displaced seam detaches nothing (clearRunsChangeSeam)
        detach = () => { clearRunsChangeSeam(mine); };
        return detach;
    });
    return () => { detach?.(); };
}
//# sourceMappingURL=runsChange.js.map