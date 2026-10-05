"use client";
import { createClientStore } from "./clientStore.js";
import { contractToast } from "./contractToast.js";
/** Re-poll the run — the toast's Retry action. Recovered → clear; still
 *  bad → re-report (a fresh toast). Lazy import: FlowProtocol pulls the
 *  whole protocol layer; the store only needs it on click. */
function repoll(runId) {
    import("./FlowProtocol.ts")
        .then(({ pollFlowRun }) => pollFlowRun(runId, undefined, { maxWaitMs: 30_000, intervalMs: 2_000 }))
        .then(() => useRunStatusContractStore.getState().clear())
        .catch(() => {
        // Still bad / gone / timed out — the card shows the truth; nothing
        // further to toast (the poll itself re-reported if it lied again).
    });
}
function toastVerdict(v) {
    const toast = contractToast;
    if (v.kind === "violation") {
        const first = v.violations[0]?.message ?? "the status response did not match the expected shape";
        toast("error", `Run ${v.runId}: ${v.violations.length} contract issue(s) — ${first}. ` +
            `Retry to re-check, or re-run the card.`, { label: "Retry", onClick: () => repoll(v.runId) });
    }
    else {
        toast("error", `Run ${v.runId}: status channel error — ${v.message}. Retry to re-check.`, { label: "Retry", onClick: () => repoll(v.runId) });
    }
}
export const useRunStatusContractStore = createClientStore((set) => ({
    verdict: null,
    reportViolation: (runId, violations) => {
        console.error("[runStatusContract] status channel violation:", runId, violations);
        const verdict = { kind: "violation", runId, violations };
        set({ verdict });
        toastVerdict(verdict);
    },
    reportError: (runId, message) => {
        console.error("[runStatusContract] status channel error:", runId, message);
        const verdict = { kind: "error", runId, message };
        set({ verdict });
        toastVerdict(verdict);
    },
    clear: () => set({ verdict: null }),
}));
//# sourceMappingURL=runStatusContractStore.js.map
