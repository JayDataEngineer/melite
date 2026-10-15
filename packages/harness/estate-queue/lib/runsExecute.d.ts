import type { Context } from "@deepseek-ai/cordis";
import { type RunRecord } from "./runsTypes.js";
/** THE LIVE ROW LAW (2026-10-11, the operator's "stuck on a bugged
 *  out webhook … I SHOULD BE ABLE TO SEE STEPS"): the executor's
 *  report fold mutates the stage rows in MEMORY only — and the UI's
 *  run tail is push-only (the poll retired 2026-10-12), so a fold
 *  that never notifies leaves the tile frozen on its opening read
 *  forever; "merged submit (1 stages, 10 nodes)" was the last frame
 *  the stream ever carried while the engine rendered to completion.
 *  The fold notifies the runs change seam (the stop press's own
 *  pattern — runsRegistry's stopping stamp), throttled: the row
 *  moves in memory, every subscriber re-reads it per notify, and no
 *  mid-run persist rides it (claim + settle own the disk).
 *  THE WATCHDOG: an engine that folds nothing (a refused progress
 *  socket, lost events) must never own the tile either — past the
 *  silence window the stamp moves to the waiting voice itself, so a
 *  silent engine reads as "waiting on engine (Ns)" and counts up
 *  instead of lying with the submit stamp. stop() clears the tick;
 *  a post-settle stamp is a bug this module refuses. */
export declare const LIVENESS_NOTIFY_MS = 300;
export declare const LIVENESS_WATCHDOG_MS = 5000;
export interface RunLiveness {
    /** The report fold's tail: silence resets + a throttled notify. */
    report(): void;
    /** Clears the watchdog tick — the finally of every execute path. */
    stop(): void;
}
export declare function startRunLiveness(run: RunRecord): RunLiveness;
/** THE DECLARED HERO (the mask hero defect, 2026-10-09): the
 *  stage gallery leads with engine completion order — a card that
 *  saves secondary same-kind artifacts (the mask card's manifest
 *  photo beside mask_combined) declares its product stem on the
 *  DECL (primaryFile) and the match moves first. The name may carry
 *  a HARVEST PREFIX (the live seam-proof's catch, 2026-10-09: a
 *  subfoldered save prefix makes fetchOutputs save
 *  `SaveImage.1_mask_combined_00001_.png` — the stem is a bounded
 *  TOKEN, never a basename prefix). Token rule: start-or-underscore
 *  before the stem; after it — end, "." + extension, or "_" + DIGITS
 *  (the engine counter; a longer stem-sharing name like
 *  mask_combined_union is a different product, never the hero). No
 *  match (or no stem) = engine order, never a reorder into nothing.
 *  Pure (the film-mux walls pin the precedent: presentation order is
 *  the harness's only job). */
export declare function declaredPrimaryFirst(names: string[], stem: string | undefined): string[];
export type SettleFn = (run: RunRecord) => void | Promise<void>;
/** One run through the merged path (door-verbatim: stages ->
 *  running + merged:true, splice rows, ONE executeFlow submit,
 *  per-stage harvest + result_outputs, the stop-gated terminal
 *  mapping, the settle persist). */
export declare function runOne(run: RunRecord, ctx: Context, settle: SettleFn): Promise<void>;
export declare function runEngine(run: RunRecord): string;
//# sourceMappingURL=runsExecute.d.ts.map