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
/** The default bench — the unattributed seat (headless runs,
 *  legacy callers). */
export declare const DEFAULT_BENCH = "main";
export declare function benchKeyOfExec(exec: {
    agent?: {
        id?: unknown;
    };
}): string;
/** Project bench stage rows onto the flow_inline wire contract
 *  (the doors forbid provenance/runStatus/result/title as extras —
 *  they strip; `card` RIDES (STAGE_KEYS admit it) because the
 *  kinds pass derives input kinds from the card's own flowKinds —
 *  stripping it manufactured phantom "wired but untyped" refusals
 *  on correctly-wired card stages; engine defaults comfyui). */
export declare function projectStages(stages: unknown): Record<string, unknown>[];
export declare function meliteConstruct(estate: Estate, opts?: {
    headless?: boolean;
}): ToolDefinition;
//# sourceMappingURL=melite-construct.d.ts.map
