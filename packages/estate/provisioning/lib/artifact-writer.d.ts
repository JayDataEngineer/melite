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
export declare function sha256File(path: string, signal?: AbortSignal): Promise<string>;
export declare const hashFile: typeof sha256File;
export declare class VerifiedArtifactWriter implements ArtifactWriterPort {
    readonly root: string;
    constructor(root: string);
    write(request: VerifiedArtifactRequest, signal?: AbortSignal): Promise<VerifiedArtifactResult>;
    inspect(request: ArtifactInspectionRequest, signal?: AbortSignal): Promise<ArtifactInspection>;
}
export declare function writeVerifiedArtifact(request: VerifiedArtifactRequest, signal?: AbortSignal): Promise<VerifiedArtifactResult>;
export declare function newOperationId(): string;
//# sourceMappingURL=artifact-writer.d.ts.map
