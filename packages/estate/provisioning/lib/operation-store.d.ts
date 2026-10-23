import { type ProvisionOperation, type SeatHeartbeat } from "./contracts.js";
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
    /** THE CLAIM COMPARE-AND-SWAP (the two-seat race, 2026-10-23): the
     *  write lands only while the stored row still sits at expectState —
     *  synchronous check-and-set, atomic within one JS turn.
     *  @param operation the row to write when the guard holds
     *  @param expectState the state the stored row must still wear
     *  @returns true when the write landed; false when the row moved
     *  or was never stored */
    saveIfState(operation: ProvisionOperation, expectState: ProvisionOperation["state"]): Promise<boolean>;
    remove(operationId: string): Promise<void>;
    list(): Promise<ProvisionOperation[]>;
}
export declare class FileOperationStore implements OperationStorePort {
    readonly root: string;
    private readonly pending;
    constructor(root: string);
    load(operationId: string): Promise<ProvisionOperation | null>;
    save(operation: ProvisionOperation): Promise<void>;
    /** THE CLAIM COMPARE-AND-SWAP (the two-seat race, 2026-10-23): the
     *  write lands only while the stored row still sits at expectState.
     *  THE ARBITER IS THE FILESYSTEM: a wx-create of the row's claim
     *  marker under <root>/claims/ — exactly one seat's marker can
     *  exist per row, so the OS refuses the loser's create no matter
     *  how many handles or processes contend (per-instance write
     *  queues cannot: two FileOperationStore handles on one root race
     *  as badly as two processes). The marker is terminal-safe: a row
     *  never returns to "requested" (re-admissions mint a fresh
     *  operation id), so the marker sits beside its row forever, one
     *  file per operation — the crash window (marker created, row
     *  never written) matches the pre-CAS window (row written as
     *  acquiring, fetch never launched) and adds no new stuck class.
     *  @param operation the row to write when the guard holds
     *  @param expectState the state the stored row must still wear
     *  @returns true when the write landed; false when another seat
     *  owns the marker, the stored row moved, or no row is stored */
    saveIfState(operation: ProvisionOperation, expectState: ProvisionOperation["state"]): Promise<boolean>;
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
