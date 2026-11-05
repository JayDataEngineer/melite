import { liveBenchRows, projectStages } from "@melite/contracts/benchStage";
export { liveBenchRows, projectStages };
/** The construct verb set — ONE home (the skills-vs-dsh-autodocs
 * audit's cure 1: the set was spelled four ways in this file, the
 * header comment already stale-missing clear + floor). The schema
 * enum, the mutation set, and the header list above all derive from
 * this order; the estate wire's BenchVerb is a DIFFERENT law (the
 * fiber's own mutation arms) and stays its own home. */
export declare const CONSTRUCT_VERBS: readonly ["read", "load", "patch", "add_stage", "remove_stage", "archive", "unarchive", "clear", "floor", "rewire", "undo", "validate"];
export type ConstructVerb = typeof CONSTRUCT_VERBS[number];
import type { Estate } from '../estate.js';
import type { ToolDefinition } from '../types.js';
/** The default bench — the unattributed seat (script runs,
 *  legacy callers). */
export declare const DEFAULT_BENCH = "main";
export declare function benchKeyOfExec(exec: {
    agent?: {
        id?: unknown;
    };
}): string;
export declare function meliteConstruct(estate: Estate, opts?: {
    delegated?: boolean;
}): ToolDefinition;
//# sourceMappingURL=melite-construct.d.ts.map
