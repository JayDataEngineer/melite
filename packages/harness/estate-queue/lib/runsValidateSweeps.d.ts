import type { CardRegistryLike } from "./runsValidateShared.js";
export declare function batchRows(body: unknown, firstError: string, cards?: CardRegistryLike | null): Array<Record<string, unknown>>;
export declare function servedNodeClasses(cards?: CardRegistryLike | null): Set<string> | null;
export declare function validateWorkflow(params: unknown, cards?: CardRegistryLike | null): string[];
export declare function sweepWorkflows(body: unknown, cards?: CardRegistryLike | null): Array<Record<string, unknown>>;
//# sourceMappingURL=runsValidateSweeps.d.ts.map