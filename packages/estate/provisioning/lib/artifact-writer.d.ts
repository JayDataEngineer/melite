export type ArtifactInput = AsyncIterable<Uint8Array> | Iterable<Uint8Array> | ReadableStream<Uint8Array>;
export type ArtifactErrorCode = "invalid-path" | "invalid-digest" | "cancelled" | "hash-mismatch" | "size-mismatch" | "source-invalid" | "write-failed" | "landing-failed";
export declare class ProvisioningError extends Error {
    readonly code: ArtifactErrorCode;
    constructor(code: ArtifactErrorCode, message: string, cause?: unknown);
}
export interface VerifiedArtifactRequest {
    readonly root: string;
    readonly relativePath: string;
    readonly expectedSha256?: string;
    readonly operationId: string;
    readonly source: ArtifactInput;
    readonly sizeBytes?: number;
    /** THE VERIFY HEARTBEAT (the 100%-then-FAILED burn, 2026-10-20):
     *  hashing a multi-GB part takes tens of seconds with zero stream
     *  movement — the plane's stall clock must ride the verify flow
     *  too, or it murders every complete download. The writer calls
     *  this per hash chunk plus once at each verify-phase boundary
     *  (post-sync, pre-rename); the count is informational (never a
     *  ledger add — the stream already counted these bytes). Optional
     *  so older callers still satisfy the port. */
    readonly onVerifyBytes?: (bytes: number) => void;
}
export interface VerifiedArtifactResult {
    readonly path: string;
    readonly sha256: string;
    readonly sizeBytes: number;
    readonly integrity: "declared-sha256" | "operator-unverified";
}
export interface ArtifactInspectionRequest {
    readonly root: string;
    readonly relativePath: string;
    readonly expectedSha256?: string;
}
export interface ArtifactInspection {
    readonly present: boolean;
    readonly path?: string;
    readonly sha256?: string;
    readonly sizeBytes?: number;
}
export interface ArtifactWriterPort {
    write(request: VerifiedArtifactRequest, signal?: AbortSignal): Promise<VerifiedArtifactResult>;
    inspect?(request: ArtifactInspectionRequest, signal?: AbortSignal): Promise<ArtifactInspection>;
}
export declare function isValidSha256(value: string): boolean;
export declare function resolveConfinedPath(root: string, relativePath: string): string;
export declare function sha256File(path: string, signal?: AbortSignal, onProgress?: (bytes: number) => void): Promise<string>;
export declare const hashFile: typeof sha256File;
export declare class VerifiedArtifactWriter implements ArtifactWriterPort {
    readonly root: string;
    constructor(root: string);
    write(request: VerifiedArtifactRequest, signal?: AbortSignal): Promise<VerifiedArtifactResult>;
    inspect(request: ArtifactInspectionRequest, signal?: AbortSignal): Promise<ArtifactInspection>;
    /** The .part reaper (audit K-4, 2026-10-22): a crash mid-write
     *  orphans the `.part-<operationId>` sidecar past every in-process
     *  catch. The boot and periodic sweeps unlink the stale ones —
     *  a fresh part is a live download and survives; the writer's own
     *  mtime is the judge. Returns the unlinked count.
     *  @param options.olderThanMs — staleness bound, default
     *  {@link PART_STALE_MS}.
     *  @param options.signal — cancels the walk between directories. */
    reapStaleParts(options?: {
        olderThanMs?: number;
        signal?: AbortSignal;
    }): Promise<number>;
}
/** A part is stale when its mtime froze for this long: the writer
 *  appends chunks continuously, so only a dead process leaves one
 *  this old (downloads legitimately take hours). */
export declare const PART_STALE_MS: number;
export declare function writeVerifiedArtifact(request: VerifiedArtifactRequest, signal?: AbortSignal): Promise<VerifiedArtifactResult>;
export declare function newOperationId(): string;
//# sourceMappingURL=artifact-writer.d.ts.map