import type { Context } from "@deepseek-ai/cordis";
import { type RunRecord } from "./runsTypes.ts";
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