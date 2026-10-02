// runsChange.ts — the runs change-event seam (1.8, the hand-roll
// audit's last poll, 2026-10-12): the run view's push source.
//
// The registry's writers live in pure modules (queueCore's claim and
// settle, runsExecute's harvest, the registry's stop door) that own
// no Context, so they notify through this module seam — the seat law
// the bench holds (estate/drafts src/bench.ts): RunsRuntimeService
// installs the pair on its Context and every writer keeps calling
// notifyRunChanged. The stream remote (runs/subscribe) rides these
// to PUSH fresh rows; the browser's resource provider consumes the
// stream (the same-origin mux the bench tail rides).
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
     * @param runId - the run whose row moved.
     */
    "runs.changed": (runId: string) => void;
  }
}

let runsChangeSeam: RunsChangeSeam | null = null;

/** Install the seam (the registry service does this with its
 *  Context; tests with their own). Pass null to detach. ONE seam at
 *  a time — module state, LAST install wins (the bench seam's
 *  measured law, drafts remote.ts installBenchChangeSeam: the estate
 *  is single-tenant here, and the failure mode is loud — onRunChange
 *  refuses rather than subscribing to nothing). */
export function setRunsChangeSeam(seam: RunsChangeSeam | null): void {
  runsChangeSeam = seam;
}

/** Subscribe to run-row movement; returns the unsubscribe.
 *
 *  THE LISTENER FAULT LAW rides HERE, not in the bus: `ctx.emit`
 *  stops at the first throwing listener and rethrows out of the emit
 *  (measured 2026-10-12 on cordis 4.0.4), while this module's
 *  contract is that a subscriber's fault never breaks the write and
 *  never starves the listeners after it. Wrapping the handler is what
 *  makes the typed event lawful here. */
export function onRunChange(fn: RunChangeListener): () => void {
  if (runsChangeSeam === null) {
    throw new Error(
      "estate-queue: no runs change seam installed — RunsRuntimeService installs it in its constructor, tests call setRunsChangeSeam()",
    );
  }
  return runsChangeSeam.on((runId: string): void => {
    try {
      fn(runId);
    } catch {
      /* a listener's fault never breaks the write */
    }
  });
}

/** Fire the row-moved event — the write spine calls this after every
 *  landed write that moves a run (the claim, the settle, the
 *  artifacts harvest, the stop press). A wake resolves the
 *  subscriber's park in a microtask, by which time the writer's
 *  synchronous mutation has landed — the re-read serves the moved
 *  row, never the pre-write one. */
export function notifyRunChanged(runId: string): void {
  runsChangeSeam?.emit(runId);
}

/** Install the typed runs event seam on a Context (the registry
 *  service's constructor — the bench installer's law, drafts
 *  remote.ts installBenchChangeSeam): fiber-scoped through
 *  ctx.effect, so the seam detaches when the fiber is disposed.
 * @param ctx - the Context whose bus carries `runs.changed`.
 * @returns the effect disposer (the effect owns it; returned for
 *  direct callers that need an early detach). */
export function installRunsChangeSeam(ctx: Context): () => void {
  let detach: (() => void) | null = null;
  ctx.effect(() => {
    setRunsChangeSeam({
      emit: (runId: string): void => { ctx.emit("runs.changed", runId); },
      on: (fn: (runId: string) => void): (() => void) => {
        const stop = ctx.on("runs.changed", fn);
        return () => { stop(); };
      },
    });
    detach = () => { setRunsChangeSeam(null); };
    return detach;
  });
  return () => { detach?.(); };
}
