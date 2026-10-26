export interface CatalogViolation {
    /** "catalog" = the whole catalog is not a valid assembly; otherwise the
    * offending entry id. */
    kind: string;
    message: string;
}
export interface CatalogContractResult {
    valid: boolean;
    violations: CatalogViolation[];
}
/** Thrown by loadCatalog on a contract violation. Distinct from a fetch
 * error so ensureCatalog does NOT auto-retry it (a violation is a backend
 * bug, not a network blip — retrying a lying catalog every 3s is theater). */
export declare class CatalogContractError extends Error {
    readonly violations: CatalogViolation[];
    constructor(violations: CatalogViolation[]);
}
export declare function validateCatalogContract(catalog: unknown): CatalogContractResult;
//# sourceMappingURL=catalogContract.d.ts.map