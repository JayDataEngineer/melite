// runStatusContract — the frontend half of the ONE status-channel contract.
//
// 2026-08-11 directive: "make declarative contracts in the Zustand and
// pydantic so it's impossible to fail this". The backend half is
// the estate-queue status door, validated AT THE
// WIRE (GET /v1/flows/status/{run_id} 500s with a `violations` array on
// a contract violation). This validator mirrors it at the poll:
//
//   * the contract CORE (run_id, run-level status from the backend's 7
//     value vocabulary, stages with id/name/index/status) is required and
//     strictly checked — a fake/partial payload can never masquerade as a
//     running run,
//   * stage statuses are NOT enum-constrained (volatile; serverStatusToCard
//     maps unknowns → pending by design),
//   * every auxiliary wire field (log_tail, params, ...) passes
//     through UNVALIDATED — the runner can evolve without breaking
//     the poll. (flow_doc is NOT auxiliary: no gateway ever emitted
//     it — the pipe-carry fiction, retired 2026-09-05.)
//
// The runner's run-level status vocabulary: pending / running /
// completed / failed / stopped / interrupted / unknown — exactly the
// "done"/"error" are STAGE values (see below). "done"/"error" are STAGE
// values; if the run level ever sent them, the contract flags it instead
// of silently coercing.
// Compile-time drift guard (2026-08-14): the array is constrained to the RunStatusWire["status"] union in ./wireTypes.ts.
// If that union grows another status, this `satisfies` fails until the list is updated — the runtime validator can never silently lag.
// (It already lagged once: "queued" shipped in the runner plus the wire types but not here, and every queued run flipped cards to error).
const _RUN_STATUS_VALUES = [
    "pending",
    "running",
    "completed",
    "failed",
    "stopped",
    "interrupted",
    "unknown",
    "queued",
];
export const RUN_STATUSES = new Set(_RUN_STATUS_VALUES);
/** Thrown by pollFlowRun when the status channel lied — either a 500
 * body carrying the backend's `violations` signature, or a 200 body that
 * fails the contract core. The caller's catch flips the card to error
 * VISIBLY — never a silent fake "running" for the rest of the ceiling. */
export class RunStatusContractError extends Error {
    violations;
    constructor(runId, violations) {
        super(`Run status contract violation for ${runId} (${violations.length}): ${violations[0]?.message ?? "unknown"}`);
        this.name = "RunStatusContractError";
        this.violations = violations;
    }
}
const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);
/** Validate a status payload against the ONE status-channel contract.
 * Accepts a parsed body of ANY response (200 or non-ok) — the caller
 * decides what a violation means on its branch. */
export function validateRunStatusContract(payload) {
    const violations = [];
    // ── Shape gate — an error body can never masquerade as a status ──────
    if (!isObj(payload)) {
        return {
            valid: false,
            violations: [{
                    field: "body",
                    kind: "shape",
                    message: "Status payload is not an object — this is an error body, not a contract.",
                }],
        };
    }
    // ── The contract core — required, strictly checked ───────────────────
    if (typeof payload.run_id !== "string" || !payload.run_id) {
        violations.push({
            field: "run_id",
            kind: "missing",
            message: "Status payload has no run_id — it cannot identify the run.",
        });
    }
    if (typeof payload.status !== "string" || !RUN_STATUSES.has(payload.status)) {
        violations.push({
            field: "status",
            kind: "invalid",
            message: `Run-level status ${JSON.stringify(payload.status)} is not in the backend vocabulary (${[...RUN_STATUSES].join(", ")}).`,
        });
    }
    if (!Array.isArray(payload.stages)) {
        violations.push({
            field: "stages",
            kind: "missing",
            message: "Status payload has no stages array — stage progress cannot be located.",
        });
    }
    else {
        payload.stages.forEach((stage, i) => {
            if (!isObj(stage)) {
                violations.push({
                    field: `stages.${i}`,
                    kind: "shape",
                    message: `Stage ${i} is not an object.`,
                });
                return;
            }
            // id/name/index/status — the four contract-core stage fields. Stage
            // STATUS itself is deliberately not enum-constrained (volatile;
            // serverStatusToCard maps unknowns → pending).
            const core = [
                ["id", stage.id],
                ["name", stage.name],
                ["index", stage.index],
                ["status", stage.status],
            ];
            for (const [field, value] of core) {
                if (field === "index" ? typeof value !== "number" : typeof value !== "string") {
                    violations.push({
                        field: `stages.${i}.${field}`,
                        kind: "missing",
                        message: `Stage ${i} has no ${field} — the stage cannot be rendered.`,
                    });
                }
            }
        });
    }
    return { valid: violations.length === 0, violations };
}
/** True when a non-ok body carries the backend's contract-violation
 * signature (flow_status 500s: {error, run_id, violations: [...]}). */
export function hasViolationsSignature(body) {
    return isObj(body) && Array.isArray(body.violations);
}
//# sourceMappingURL=runStatusContract.js.map
