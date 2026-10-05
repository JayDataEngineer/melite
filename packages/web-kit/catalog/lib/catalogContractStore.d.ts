import type { CatalogViolation } from "./catalogContract.js";
export type CatalogContractState = "idle" | "loaded" | "violation" | "error";
export interface CatalogContractRecord {
    state: CatalogContractState;
    violations: CatalogViolation[];
    /** Fetch-failure message (state === "error"). */
    error: string | null;
}
interface CatalogContractStoreState {
    record: CatalogContractRecord;
    /** The catalog funnel reported a contract-clean load. */
    reportOk: () => void;
    /** The catalog funnel refused to ingest a malformed catalog. */
    reportViolation: (violations: CatalogViolation[]) => void;
    /** The catalog funnel's fetch itself failed. */
    reportError: (message: string) => void;
    /** Reset to idle (teardown / tests). */
    clear: () => void;
}
export declare const useCatalogContractStore: import("./clientStore.js").BoundStore<CatalogContractStoreState>;
export {};
//# sourceMappingURL=catalogContractStore.d.ts.map
