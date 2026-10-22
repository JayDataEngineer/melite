import { type ProvisionOperation, type SeatHeartbeat } from "./contracts.ts";
import type { OperationStorePort } from "./ports.ts";
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
    /** THE CLAIMER HEARTBEAT — a small JSON under <root>/seat/ where
     *  the row list never reads (it scans *.json at the root only).
     *  A missing or unreadable stamp answers null: the caller degrades
     *  to no-claimer, the wire-here default.
     *  @returns the last stamp another seat may read, null when none */
    readSeatHeartbeat(): Promise<SeatHeartbeat | null>;
    /** THE CLAIMER HEARTBEAT WRITE — the durable seat stamps itself
     *  every claim tick, atomically, 0600 like every store row.
     *  @param heartbeat the seat's boot id and the tick's epoch ms */
    writeSeatHeartbeat(heartbeat: SeatHeartbeat): Promise<void>;
    private prepareRoot;
    private enqueue;
}
export declare const MemoryOperationStore: typeof InMemoryOperationStore;
//# sourceMappingURL=operation-store.d.ts.map