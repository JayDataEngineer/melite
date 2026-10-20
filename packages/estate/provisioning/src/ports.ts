import type {
  ActivateOptions,
  EnsureOptions,
  ExternalOptions,
  ProvisionOperation,
  ProvisionPlan,
  ProvisionResult,
  ProvisionState,
  ResourceRef,
  ResourceStatus,
} from "./contracts.ts";
import type {
  ArtifactInput,
  ArtifactInspection,
  ArtifactInspectionRequest,
  ArtifactWriterPort,
  VerifiedArtifactRequest,
  VerifiedArtifactResult,
} from "./artifact-writer.ts";

export interface ArtifactResponse {
  readonly status: number;
  readonly body: ArtifactInput | null;
}

export type ArtifactFetcher = (
  url: string,
  signal?: AbortSignal,
) => Promise<ArtifactResponse>;

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
  /** THE DRAIN HEARTBEAT (audit F4): fired by the queue drain once
   *  per status poll — the service re-voices the ledger's queue
   *  phase through it, so a multi-GB drain with frozen byte counts
   *  still reads as flight on the poll. */
  readonly onQueueStatus?: () => void;
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
  install(
    request: ManagerInstallRequest,
    signal?: AbortSignal,
  ): Promise<ManagerInstallResult>;
  installModel?(
    request: ManagerModelInstallRequest,
    signal?: AbortSignal,
  ): Promise<ManagerModelInstallResult>;
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
  /** Every stored row, for the service's boot rehydrate of the
   *  weight-acquire progress ledger (audit E3). Optional so older
   *  stores still satisfy the port; a store that cannot enumerate
   *  rehydrates nothing. */
  list?(): Promise<ProvisionOperation[]>;
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
  /** THE DISK ADMISSION SEAM (audit I-S4): free bytes for one path —
   *  the admission gate reads it once per plan; tests stub it. */
  readonly diskFree?: (path: string) => Promise<number>;
  /** THE ACQUIRE STALL BUDGET (ERRORS.md k2): how long a direct fetch
   *  may land no bytes before the stall watchdog fails it — the
   *  deployment-varying face of ACQUIRE_STALL_TIMEOUT_MS (a lossy
   *  link wants a wider window; the default is the tightest bound the
   *  stuck-acquire contract allows). Validated: a positive integer. */
  readonly acquireStallTimeoutMs?: number;
}

export type ProvisioningServiceDefinition = {
  inspect(ref: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus>;
  plan(ref: ResourceRef): Promise<ProvisionPlan>;
  ensure(
    ref: ResourceRef,
    options?: EnsureOptions,
    signal?: AbortSignal,
  ): Promise<ProvisionResult>;
  activate(
    ref: ResourceRef,
    options?: ActivateOptions,
    signal?: AbortSignal,
  ): Promise<ProvisionResult>;
  acquireExternal(
    request: import("./contracts.ts").ExternalProvisionRequest,
    options?: ExternalOptions,
    signal?: AbortSignal,
  ): Promise<ProvisionResult>;
  reconcile(ref?: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus[]>;
  stateOf(ref: ResourceRef): ProvisionState;
  operationOf(ref: ResourceRef): ProvisionOperation | undefined;
  /** THE TRUST RE-VERIFY (optional so older fakes satisfy the type):
   *  re-stats a served operation's recorded model paths before the
   *  status merge trusts the row (audit I-S6). */
  verifyOperation?(operation: import("./contracts.ts").ProvisionOperation, signal?: AbortSignal): Promise<import("./contracts.ts").ProvisionOperation>;
  isLocked(ref: ResourceRef): boolean;
  /** THE F9 PROGRESS SEAT (optional so older fakes still satisfy
   *  the type): the live byte count for one weight fetch. */
  progressOf?(operationId: string): import("./contracts.ts").WeightAcquireProgress | null;
  /** THE F9 START SEAT (optional, same reason): starts the fetch
   *  for one ref in the background and returns its operation id
   *  WITHOUT awaiting the landing — the tracker polls progressOf.
   *  A second start while the first is locked joins it (one fetch,
   *  never two). The fetch itself rides ensure (the existing
   *  fetcher — no second fetcher). */
  startWeightAcquire?(ref: ResourceRef, options?: EnsureOptions): Promise<string>;
  /** THE LIFECYCLE-GUARD SEAM (MP-F3, round 19, 2026-10-10): the
   *  sync names of the fetches this seat currently holds — every
   *  lock-held fetch plus every pre-lock mint (the P-R1 pendingMints
   *  window: reserved, no lock yet). The manage plane's
   *  guardLifecycle refuses a teardown while this is non-empty and
   *  names the entries, mirroring the sidecar voice. Optional so
   *  older fakes still satisfy the type: a seat without it reads as
   *  idle (the same posture as the missing progressOf and
   *  startWeightAcquire seats). */
  inflightAcquires?(): readonly string[];
  /** THE RESCUE EVICT SEAT (optional so older fakes satisfy the
   *  type): removes one SETTLED acquire row — the ledger entry, the
   *  by-ref pointer, the stored operation — so a wedged fetch's row
   *  is clearable and a later progressOf answers null (the manage
   *  plane's acquire_discard; ERRORS.md k2's "no delete"). The
   *  service refuses a still-locked id loud. */
  discardAcquire?(operationId: string): void;
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
