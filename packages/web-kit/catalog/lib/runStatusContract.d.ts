import type { Violation } from "./wireTypes.ts";
/** One contract violation — {field, kind, message}, the SAME shape the server's error envelope declares (Violation).
 * Declared in ./wireTypes.ts (2026-08-11 directive) — never a hand-written mirror.
 * A change to the Violation type lands here at edit time. */
export type RunStatusViolation = Violation;
export interface RunStatusContractResult {
    valid: boolean;
    violations: RunStatusViolation[];
}
export declare const RUN_STATUSES: ReadonlySet<string>;
/** Thrown by pollFlowRun when the status channel lied — either a 500
 * body carrying the backend's `violations` signature, or a 200 body that
 * fails the contract core. The caller's catch flips the card to error
 * VISIBLY — never a silent fake "running" for the rest of the ceiling. */
export declare class RunStatusContractError extends Error {
    readonly violations: RunStatusViolation[];
    constructor(runId: string, violations: RunStatusViolation[]);
}
/** Validate a status payload against the ONE status-channel contract.
 * Accepts a parsed body of ANY response (200 or non-ok) — the caller
 * decides what a violation means on its branch. */
export declare function validateRunStatusContract(payload: unknown): RunStatusContractResult;
/** True when a non-ok body carries the backend's contract-violation
 * signature (flow_status 500s: {error, run_id, violations: [...]}). */
export declare function hasViolationsSignature(body: unknown): boolean;
//# sourceMappingURL=runStatusContract.d.ts.map