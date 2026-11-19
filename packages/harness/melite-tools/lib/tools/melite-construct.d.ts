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
/** The conversation bench seat for an execution: a `session-` agent id
 *  maps to its conversation bench, a bare uuid forwards under the
 *  `delegate:` prefix (the estate door re-seats it to the parent
 *  conversation), and an absent agent id takes the unattributed
 *  DEFAULT_BENCH.
 * @param exec the tool execution (its agent id is the session identity)
 * @returns the bench key the verbs address */
export declare function benchKeyOfExec(exec: {
    agent?: {
        id?: unknown;
    };
}): string;
/** The melite_construct author verb over the shared bench: the twelve
 *  CONSTRUCT_VERBS (read/load/patch/add_stage/remove_stage/archive/
 *  unarchive/clear/floor/rewire/undo/validate), addressed through
 *  benchKeyOfExec's conversation seat, every mutation CAS-guarded and
 *  answering with the derivations and compile verdict it produced.
 *  Never mints a run: the bench is ensured once per key and edited in
 *  place.
 * @param estate the tool's estate seat (the bench/runs/drafts doors)
 * @param opts delegated=true serves the compose-only copy law (the
 *  description names the run door the agent actually has)
 * @returns the tool definition a tools service registers */
export declare function meliteConstruct(estate: Estate, opts?: {
    delegated?: boolean;
}): ToolDefinition;
//# sourceMappingURL=melite-construct.d.ts.map
