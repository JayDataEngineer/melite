import type { RunStatusViolation } from "./runStatusContract.js";
export type RunStatusVerdict = {
    kind: "violation";
    runId: string;
    violations: RunStatusViolation[];
} | {
    kind: "error";
    runId: string;
    message: string;
};
interface RunStatusContractStoreState {
    verdict: RunStatusVerdict | null;
    reportViolation: (runId: string, violations: RunStatusViolation[]) => void;
    reportError: (runId: string, message: string) => void;
    clear: () => void;
}
export declare const useRunStatusContractStore: import("./clientStore.js").BoundStore<RunStatusContractStoreState>;
export {};
//# sourceMappingURL=runStatusContractStore.d.ts.map
