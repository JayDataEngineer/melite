import type { ActivateOptions, EnsureOptions, ExternalOptions, ProvisionOperation, ProvisionPlan, ProvisionResult, ProvisionState, ResourceRef, ResourceStatus } from "./contracts.js";
import type { ArtifactInput, ArtifactInspection, ArtifactInspectionRequest, ArtifactWriterPort, VerifiedArtifactRequest, VerifiedArtifactResult } from "./artifact-writer.js";
export interface ArtifactResponse {
    readonly status: number;
    readonly body: ArtifactInput | null;
}
export type ArtifactFetcher = (url: string, signal?: AbortSignal) => Promise<ArtifactResponse>;
export interface DeclarationPort {
    resolve(ref: ResourceRef): Promise<ProvisionPlan>;
    list?(): Promise<readonly ResourceRef[]>;
}
export interface ManagerInstallRequest {
    readonly id: string;
    readonly url?: string;
    readonly ref?: string;
    readonly version?: string;
    readonly registry?: string;
    readonly requirements?: readonly string[];
    readonly nodeTypes?: readonly string[];
}
export interface ManagerInstallResult {
    readonly installed: boolean;
    readonly detail?: string;
}
export interface ManagerModelInstallRequest {
    readonly id: string;
    readonly name: string;
    readonly savePath: string;
    readonly url: string;
    readonly filename: string;
    /** Optional Manager bookkeeping tags for rows the public catalog
     *  does not carry; must match the local model-list's base for the
     *  whitelist to admit the install. */
    readonly type?: string;
    readonly base?: string;
    /** Declared artifact size in bytes; scales the queue-drain budget
     *  (multi-GB model files outlast an extension-sized wait). */
    readonly sizeBytes?: number;
}
export interface ManagerModelInstallResult {
    readonly installed: boolean;
    readonly detail?: string;
}
export interface ManagerInspection {
    readonly installed: boolean;
    readonly active: boolean;
    readonly detail?: string;
}
export interface ManagerPort {
    canInstall?(request: ManagerInstallRequest, signal?: AbortSignal): Promise<boolean>;
    install(request: ManagerInstallRequest, signal?: AbortSignal): Promise<ManagerInstallResult>;
    installModel?(request: ManagerModelInstallRequest, signal?: AbortSignal): Promise<ManagerModelInstallResult>;
    inspect?(id: string, signal?: AbortSignal): Promise<ManagerInspection>;
}
export interface InspectorResult {
    readonly active: boolean;
    readonly nodeTypes?: readonly string[];
    readonly detail?: string;
}
export interface InspectorPort {
    inspect(ref: ResourceRef, signal?: AbortSignal): Promise<InspectorResult>;
}
export interface LifecyclePort {
    activeRuns(signal?: AbortSignal): Promise<readonly string[]>;
    restart(signal?: AbortSignal): Promise<void>;
    waitUntilReady(signal?: AbortSignal): Promise<void>;
}
export interface OperationStorePort {
    load(operationId: string): Promise<ProvisionOperation | null>;
    save(operation: ProvisionOperation): Promise<void>;
    remove?(operationId: string): Promise<void>;
}
export interface ProvisioningConfig {
    readonly declaration: DeclarationPort;
    readonly artifactWriter?: ArtifactWriterPort;
    readonly storeRoot?: string;
    /** the direct model arm's byte source — unwired lanes refuse
     *  direct acquisition loud instead of falling back to a manager */
    readonly fetcher?: ArtifactFetcher;
    readonly manager?: ManagerPort;
    readonly inspector?: InspectorPort;
    readonly lifecycle?: LifecyclePort;
    readonly operationStore?: OperationStorePort;
    readonly writeGuard?: () => boolean;
    readonly operationIdFactory?: () => string;
}
export type ProvisioningServiceDefinition = {
    inspect(ref: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus>;
    plan(ref: ResourceRef): Promise<ProvisionPlan>;
    ensure(ref: ResourceRef, options?: EnsureOptions, signal?: AbortSignal): Promise<ProvisionResult>;
    activate(ref: ResourceRef, options?: ActivateOptions, signal?: AbortSignal): Promise<ProvisionResult>;
    acquireExternal(request: import("./contracts.js").ExternalProvisionRequest, options?: ExternalOptions, signal?: AbortSignal): Promise<ProvisionResult>;
    reconcile(ref?: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus[]>;
    stateOf(ref: ResourceRef): ProvisionState;
    operationOf(ref: ResourceRef): ProvisionOperation | undefined;
    isLocked(ref: ResourceRef): boolean;
};
export type ProvisioningPorts = {
    readonly declaration: DeclarationPort;
    readonly artifactWriter?: ArtifactWriterPort;
    readonly manager?: ManagerPort;
    readonly inspector?: InspectorPort;
    readonly lifecycle?: LifecyclePort;
    readonly operationStore?: OperationStorePort;
    readonly writeGuard?: () => boolean;
};
export type ArtifactWritePort = ArtifactWriterPort;
export type VerifiedWritePort = ArtifactWriterPort;
export type VerifiedArtifactWriterPort = ArtifactWriterPort;
export type VerifiedArtifactInput = ArtifactInput;
export type VerifiedArtifactWriteRequest = VerifiedArtifactRequest;
export type VerifiedArtifactWriteResult = VerifiedArtifactResult;
export type VerifiedArtifactInspection = ArtifactInspection;
export type VerifiedArtifactInspectionRequest = ArtifactInspectionRequest;
//# sourceMappingURL=ports.d.ts.map
