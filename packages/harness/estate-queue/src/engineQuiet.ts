// engineQuiet.ts — THE QUIET LAW every teardown door rides (B4,
// 2026-11-27: the restart-under-a-press burn).
//
// THE BURN: the lifecycle guard read ONE lane's run sidecars — its
// own state roots — and never the engine's own queue. A film
// pressing from another lane was invisible to `comfy_manage
// restart`, and the reboot landed under its live windows: the next
// press died on a connection refusal and the film with it. The
// engine's queue is the machine-wide truth (every lane's press is a
// row in it); the gap between two windows of one film is seconds.
// So the law is QUIESCENCE, never one empty reading: a teardown
// waits for a queue that is empty AND stays empty for the ctx's
// quiet window before it tears; a prompt landing inside the window
// re-arms the clock. Unlocked by design — the wait holds no latch,
// so a same-lane press during the wait lands (and is itself the busy
// signal); the caller takes the lifecycle latch only after the
// verdict, across the vendor call.
//
// AN UNANSWERABLE QUEUE IS NOT A BUSY SIGNAL: engineQueueView
// answers null for a dead engine and for a malformed body alike.
// The vendor call that follows the verdict is the truth-teller for
// a dead engine (it fails loud); a "busy" refusal against a dead
// engine would be the lying-cure class. An unquiet verdict reports
// the last answerable reading.

import type { ManageCtx } from "./managePlane.ts";
import { engineQueueView } from "./manageProbe.ts";

/** The poll cadence under the quiet window — short enough that a
 *  press landing between two readings is caught inside the window. */
export const QUIET_POLL_MS = 1000;

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
export function abortReason(signal: AbortSignal): unknown {
  return signal.reason instanceof Error ? signal.reason : new DOMException("The operation was aborted", "AbortError");
}

/** Sleep on the seat's timer (the no-bare-setTimeout law: the
 *  ManageCtx.timeout seat IS the timer), racing the caller's abort.
 *  The abort listener is registered before the timer starts and is
 *  removed on either settle; the post-registration re-check closes
 *  the race between the aborted check and the listener landing.
 *  @param ctx - the manage context (timer seat + signal).
 *  @param ms - the delay in milliseconds.
 *  @returns a promise settling when the timer fires; rejects with
 *  the abort reason when the caller aborts first. */
export function seatSleep(ctx: ManageCtx, ms: number): Promise<void> {
  const signal = ctx.signal;
  if (signal?.aborted === true) return Promise.reject(abortReason(signal));
  return new Promise<void>((resolvePromise, rejectPromise) => {
    let cancel = (): void => {};
    const onAbort = (): void => {
      signal?.removeEventListener("abort", onAbort);
      cancel();
      rejectPromise(abortReason(signal as AbortSignal));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    cancel = ctx.timeout((): void => {
      signal?.removeEventListener("abort", onAbort);
      resolvePromise();
    }, ms);
    if (signal?.aborted === true) onAbort();
  });
}

/** Wait for a QUIET engine queue inside the caller's budget.
 *  @param ctx - the manage context (endpoint + timer seat + signal).
 *  @param budgetMs - the teardown door's rail budget in milliseconds.
 *  @param quiesceMs - the quiet window in milliseconds; 0 tears on
 *  the first empty reading.
 *  @returns the verdict: quiet, or the last reading that never
 *  went quiet inside the budget. */
export async function awaitEngineQuiet(ctx: ManageCtx, budgetMs: number, quiesceMs: number): Promise<QuietVerdict> {
  // misconfiguration fails loud at the earliest resolvable point: an
  // unpinned window would compare false forever and the door would
  // stall the whole rail — a named refusal instead of a silent wait
  if (!Number.isFinite(quiesceMs) || quiesceMs < 0) {
    throw new Error(
      "[manage] the teardown door's quiet window is unpinned on the manage context (engineQuiesceMs=" +
        String(quiesceMs) + ") — the manage provider resolves it from its config; the door refuses to guess",
    );
  }
  const deadline = Date.now() + Math.max(0, budgetMs);
  let emptySince: number | null = null;
  let last: { running: number; pending: number } = { running: 0, pending: 0 };
  let busyReads = 0;
  for (;;) {
    if (ctx.signal?.aborted === true) throw abortReason(ctx.signal);
    const reading = await engineQueueView(ctx);
    if (reading !== null) last = reading;
    const busy = reading !== null && (reading.running > 0 || reading.pending > 0);
    const now = Date.now();
    if (busy) {
      emptySince = null;
      busyReads += 1;
    } else {
      // the window starts at the FIRST empty reading and is held
      // across every later one; a zero window tears on that first read
      emptySince ??= now;
      if (now - emptySince >= quiesceMs) {
        return { quiet: true, running: last.running, pending: last.pending, busyReads };
      }
    }
    if (now >= deadline) {
      return { quiet: false, running: last.running, pending: last.pending, busyReads };
    }
    await seatSleep(ctx, Math.min(QUIET_POLL_MS, Math.max(1, deadline - now)));
  }
}
