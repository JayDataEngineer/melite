import type { Estate } from '../estate.ts';
import type { ToolDefinition } from '../types.ts';
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