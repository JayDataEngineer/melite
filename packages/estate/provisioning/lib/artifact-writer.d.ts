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
    /** THE RANGE RESUME OFFSET (audit download-stack-audit-2026-10-20
     *  F7): the byte offset the incoming stream continues from — the
     *  writer adopts the previous attempt's part (newest viable
     *  `.part-*` sibling of the destination) by renaming it to this
     *  operation's part and appending. Zero/absent writes a fresh part
     *  (the 200-fallback's clean restart). The adopted prefix rides the
     *  final full-file sha256 and the size check like every other byte:
     *  a corrupt prefix fails the hash, the part is deleted, and the
     *  next retry starts clean. */
    readonly resumeFrom?: number;
}
export interface VerifiedArtifactResult {
    readonly path: string;
    readonly sha256: string;
    readonly sizeBytes: number;
    readonly integrity: "declared-sha256" | "operator-unverified";
    /** The bytes adopted from a previous attempt's part (absent on a
     *  clean start) — the direct arm seeds its ledger with this so a
     *  resumed flight's poll reads the true offset, never 0%. */
    readonly resumedFrom?: number;
}
export interface ArtifactInspectionRequest {
    readonly root: string;
    readonly relativePath: string;
    readonly expectedSha256?: string;
    /** The DECL's declared size: a present file matching it is judged
     *  by stat alone (verifiedBy 'size', no hash) — the cheap-first
     *  verdict that keeps the scan inside the status budget. */
    readonly expectedSizeBytes?: number;
}
export interface ArtifactInspection {
    readonly present: boolean;
    readonly path?: string;
    readonly sha256?: string;
    readonly sizeBytes?: number;
    /** THE CHEAP-FIRST WORD: the verdict came from the stat match,
     *  never a digest — the scan row carries integrity 'size-checked'
     *  and no sha256 (the service maps this word). */
    readonly verifiedBy?: "size";
}
export interface ArtifactWriterPort {
    write(request: VerifiedArtifactRequest, signal?: AbortSignal): Promise<VerifiedArtifactResult>;
    inspect?(request: ArtifactInspectionRequest, signal?: AbortSignal): Promise<ArtifactInspection>;
    /** THE RANGE RESUME MEASURE (audit download-stack-audit-2026-10-20
     *  F7): the previous attempt's kept part for one destination, if a
     *  viable one exists — the direct arm reads this BEFORE the fetch
     *  so the request can carry `Range: bytes=N-`. Optional so older
     *  fakes satisfy the port; a writer without it never resumes. */
    adoptablePart?(request: {
        readonly root: string;
        readonly relativePath: string;
        readonly sizeBytes?: number;
    }): Promise<AdoptablePart | null>;
}
/** A previous attempt's part the writer may resume from. */
export interface AdoptablePart {
    readonly path: string;
    readonly sizeBytes: number;
}
export declare function isValidSha256(value: string): boolean;
export declare function resolveConfinedPath(root: string, relativePath: string): string;
export declare function sha256File(path: string, signal?: AbortSignal, onProgress?: (bytes: number) => void): Promise<string>;
export declare const hashFile: typeof sha256File;
export declare class VerifiedArtifactWriter implements ArtifactWriterPort {
    readonly root: string;
    private readonly verifiedMemo;
    /** Memo bound: a scan walks hundreds of files; the memo never
     *  grows past the estate's working set (oldest triple evicted). */
    private static readonly MEMO_BOUND;
    constructor(root: string);
    write(request: VerifiedArtifactRequest, signal?: AbortSignal): Promise<VerifiedArtifactResult>;
    inspect(request: ArtifactInspectionRequest, signal?: AbortSignal): Promise<ArtifactInspection>;
    /** THE RANGE RESUME MEASURE (audit download-stack-audit-2026-10-20
     *  F7): the previous attempt's kept part for one destination, or
     *  null — read BEFORE the fetch so the direct arm can ask
     *  `Range: bytes=N-`. A pure read: nothing is renamed here; the
     *  adoption happens inside write(), which re-runs the same scan
     *  under the caller's lock. */
    adoptablePart(request: {
        readonly root: string;
        readonly relativePath: string;
        readonly sizeBytes?: number;
    }): Promise<AdoptablePart | null>;
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
