import { type ProvisionOperation } from "./contracts.js";
import type { OperationStorePort } from "./ports.js";
export type OperationStoreErrorCode = "invalid-request" | "invalid-record" | "io";
export declare class OperationStoreError extends Error {
    readonly code: OperationStoreErrorCode;
    constructor(code: OperationStoreErrorCode, message: string, cause?: unknown);
}
export declare function copyProvisionOperation(operation: ProvisionOperation): ProvisionOperation;
export declare class InMemoryOperationStore implements OperationStorePort {
    private readonly operations;
    load(operationId: string): Promise<ProvisionOperation | null>;
    save(operation: ProvisionOperation): Promise<void>;
    remove(operationId: string): Promise<void>;
    list(): Promise<ProvisionOperation[]>;
}
export declare class FileOperationStore implements OperationStorePort {
    readonly root: string;
    private readonly pending;
    constructor(root: string);
    load(operationId: string): Promise<ProvisionOperation | null>;
    save(operation: ProvisionOperation): Promise<void>;
    remove(operationId: string): Promise<void>;
    list(): Promise<ProvisionOperation[]>;
    private prepareRoot;
    private enqueue;
}
export declare const MemoryOperationStore: typeof InMemoryOperationStore;
//# sourceMappingURL=operation-store.d.ts.map
