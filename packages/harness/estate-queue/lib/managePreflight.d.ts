import type { ManageCtx } from "./managePlane.js";
/** One axis verdict: green, or a miss naming the door that closes
 * it. There is no third state — an axis that could not be checked
 * is a miss carrying why (the never-degraded-green law). */
export interface PreflightRow {
    readonly axis: "engine" | "manager" | "packs" | "store" | "wiring";
    readonly state: "green" | "miss";
    readonly detail: string;
    /** The manage verb (or config door) that closes a miss. */
    readonly door?: string;
}
/** THE PREFLIGHT CORE (audit 019 C3): engine reachable, Manager
 * present, every REQUIRED declared pack landed, the estate's store
 * root on disk, the extra-model wiring visible to the engine — one
 * row per axis. An engine miss cascades: the downstream axes answer
 * misses naming the engine axis, never green over an engine they
 * could not reach (and never duplicate refusals of their own).
 * @param mctx the manage context (endpoint + repoRoot + signal).
 * @returns every axis row, in axis order, misses included. */
export declare function runPreflight(mctx: ManageCtx): Promise<PreflightRow[]>;
/** The one-line voice of a row (the render and the boot note share
 * it — one spelling of the verdict text).
 * @param r the axis row.
 * @returns "<axis>: green|miss — <detail>" (+ " · door: <door>"). */
export declare function preflightLine(r: PreflightRow): string;
//# sourceMappingURL=managePreflight.d.ts.map