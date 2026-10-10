import { Service } from "@deepseek-ai/cordis";
import { stat, statfs } from "node:fs/promises";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import {
  ProvisioningError,
  VerifiedArtifactWriter,
  newOperationId,
  type ArtifactWriterPort,
} from "./artifact-writer.ts";
import { ManagerProviderError } from "./manager-provider.ts";
import { providerOk, unknownProviderRefusal } from "./contracts.ts";

/** The part-reaper cadence: a stale part (the writer's own
 *  mtime bound, PART_STALE_MS) waits at most this long past
 *  service start for its sweep. */
const PART_REAP_INTERVAL_MS = 60 * 60 * 1000;
/** THE PLANE CEILING (audit I-S4): the models-provision plane mirrors
 *  the runs plane's bounds — at most MAX_CONCURRENT_ACQUIRES live
 *  fetch locks, and terminal acquire rows evicted oldest-first past
 *  MAX_SETTLED_ACQUIRES (the same 500 as MAX_SETTLED_RUNS, so the two
 *  planes read as one law). */
const MAX_CONCURRENT_ACQUIRES = 2;
const MAX_SETTLED_ACQUIRES = 500;
/** THE DISK ADMISSION RESERVE: a plan is admitted only when the store
 *  root keeps this much free AFTER the plan's declared bytes land. */
const DISK_FLOOR_BYTES = 1024 * 1024 * 1024;
import type { ArtifactFetcher } from "./ports.ts";
import {
  resourceKey,
  sameResourceRef,
  type ActivateOptions,
  type EnsureOptions,
  type ExternalProvisionRequest,
  type ModelProvisionPlanItem,
  type ProvisionItemResult,
  type ProvisionOperation,
  type ProvisionOutcome,
  type ProvisionPlan,
  type ProvisionPlanItem,
  type ProvisionResult,
  type ProvisionState,
  type ResourceRef,
  type ResourceStatus,
  type ResourceStatusItem,
  type WeightAcquireProgress,
} from "./contracts.ts";
import type {
  DeclarationPort,
  InspectorPort,
  LifecyclePort,
  ManagerInstallRequest,
  ManagerPort,
  OperationStorePort,
  ProvisioningConfig,
  ProvisioningServiceDefinition,
} from "./ports.ts";

interface ResourceRecord {
  state: ProvisionState;
  history: ProvisionState[];
  operation?: ProvisionOperation;
}

interface LockedOperation {
  readonly id: string;
  readonly controller: AbortController;
  readonly promise: Promise<ProvisionResult>;
}

class ItemRefusal extends Error {
  readonly outcome: "blocked" | "failed" | "cancelled";
  readonly code: string;

  constructor(outcome: "blocked" | "failed" | "cancelled", code: string, message: string) {
    super(message);
    this.name = "ItemRefusal";
    this.outcome = outcome;
    this.code = code;
  }
}

const TRANSITIONS: Readonly<Record<ProvisionState, readonly ProvisionState[]>> = {
  unknown: ["absent", "acquiring", "installed", "restart_required", "active", "failed", "blocked"],
  absent: ["acquiring", "verifying", "installed", "restart_required", "active", "failed", "blocked"],
  acquiring: ["verifying", "installed", "restart_required", "active", "failed", "blocked", "absent"],
  verifying: ["installed", "restart_required", "active", "failed", "blocked", "acquiring", "absent"],
  installed: ["acquiring", "verifying", "active", "restart_required", "failed", "blocked", "absent"],
  restart_required: ["acquiring", "verifying", "active", "failed", "blocked", "absent"],
  active: ["acquiring", "verifying", "absent", "restart_required", "failed", "blocked"],
  failed: ["acquiring", "verifying", "installed", "restart_required", "active", "failed", "blocked", "absent"],
  blocked: ["acquiring", "verifying", "installed", "restart_required", "active", "failed", "absent"],
};

function copyRef(ref: ResourceRef): ResourceRef {
  if (ref.kind === "extension") return { kind: "extension", id: ref.id };
  return {
    kind: "model",
    owner: ref.owner,
    id: ref.id,
    ...(ref.variant === undefined ? {} : { variant: ref.variant }),
    ...(ref.quant === undefined ? {} : { quant: ref.quant }),
  };
}

function copyItem(item: ResourceStatusItem): ResourceStatusItem {
  return {
    key: item.key,
    kind: item.kind,
    state: item.state,
    ...(item.path === undefined ? {} : { path: item.path }),
    ...(item.sha256 === undefined ? {} : { sha256: item.sha256 }),
    ...(item.integrity === undefined ? {} : { integrity: item.integrity }),
    ...(item.errorCode === undefined ? {} : { errorCode: item.errorCode }),
    ...(item.detail === undefined ? {} : { detail: item.detail }),
  };
}

function copyResultItem(item: ProvisionItemResult): ProvisionItemResult {
  return {
    ...copyItem(item),
    outcome: item.outcome,
  };
}

/** THE BUSY REFUSAL (audit I-S4): startWeightAcquire throws this when
 *  the plane already runs its concurrency cap of fetches. The door
 *  maps it to a 429 with retry_after_ms — a busy plane is a wait, not
 *  a failure. */
export class AcquireBusyError extends Error {
  readonly retryAfterMs = ACQUIRE_BUSY_RETRY_MS;
  constructor(message: string) {
    super(message);
    this.name = "AcquireBusyError";
  }
}

const ACQUIRE_BUSY_RETRY_MS = 5_000;

/** THE DISK SEAM'S DEFAULT (audit I-S4): the OS's own free-bytes read
 *  for the store root. The config seam exists for tests; production
 *  wiring rides this. */
async function statFsFree(path: string): Promise<number> {
  const stats = await statfs(path);
  return stats.bavail * stats.bsize;
}

/** THE RE-VERIFY'S PROBE (audit I-S6): existence of a recorded
 *  absolute path — a plain stat on a path THIS service recorded, so
 *  the writer's confinement probe does not apply. Any stat error
 *  reads as absent (the row must not serve present on a probe
 *  failure). */
async function fileExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function copyOperation(operation: ProvisionOperation): ProvisionOperation {
  return {
    operationId: operation.operationId,
    ref: copyRef(operation.ref),
    state: operation.state,
    items: operation.items.map(copyItem),
    ...(operation.outcome === undefined ? {} : { outcome: operation.outcome }),
    startedAt: operation.startedAt,
    ...(operation.finishedAt === undefined ? {} : { finishedAt: operation.finishedAt }),
    ...(operation.detail === undefined ? {} : { detail: operation.detail }),
  };
}

function copyPlanItem(item: ProvisionPlanItem): ProvisionPlanItem {
  if (item.kind === "model") {
    return {
      kind: "model",
      key: item.key,
      owner: item.owner,
      id: item.id,
      name: item.name,
      folder: item.folder,
      url: item.url,
      ...(item.sha256 === undefined ? {} : { sha256: item.sha256 }),
      ...(item.sizeBytes === undefined ? {} : { sizeBytes: item.sizeBytes }),
      required: item.required,
      provider: item.provider,
      ...(item.variant === undefined ? {} : { variant: item.variant }),
      ...(item.quant === undefined ? {} : { quant: item.quant }),
    };
  }
  return {
    kind: "extension",
    key: item.key,
    id: item.id,
    url: item.url,
    required: item.required,
    provider: item.provider,
    ...(item.ref === undefined ? {} : { ref: item.ref }),
    ...(item.version === undefined ? {} : { version: item.version }),
    ...(item.registry === undefined ? {} : { registry: item.registry }),
    ...(item.requirements === undefined ? {} : { requirements: [...item.requirements] }),
    ...(item.nodeTypes === undefined ? {} : { nodeTypes: [...item.nodeTypes] }),
  };
}

function copyPlan(plan: ProvisionPlan, ref: ResourceRef): ProvisionPlan {
  if (plan === undefined || plan === null || !Array.isArray(plan.items)) {
    throw new Error("declaration port returned an invalid provision plan");
  }
  if (!sameResourceRef(plan.ref, ref)) {
    throw new Error("declaration port returned a plan for a different resource");
  }
  for (const item of plan.items) {
    if (item.kind !== "model" && item.kind !== "extension") {
      throw new Error("declaration port returned an invalid plan item kind");
    }
    if (item.key.trim() === "" || item.provider.trim() === "" || typeof item.required !== "boolean") {
      throw new Error("declaration port returned an incomplete plan item");
    }
    if (item.kind === "model") {
      if (item.name.trim() === "" || item.folder.trim() === "" && item.folder !== "") {
        throw new Error("declaration port returned an invalid model destination");
      }
      if (item.url.trim() === "") {
        throw new Error("declaration port returned an invalid model source");
      }
      if (item.sha256 !== undefined && !/^[0-9a-f]{64}$/i.test(item.sha256)) {
        throw new ItemRefusal("blocked", "artifact/invalid-digest", "declaration port returned a malformed model digest");
      }
      if (item.sizeBytes !== undefined && (!Number.isSafeInteger(item.sizeBytes) || item.sizeBytes < 0)) {
        throw new Error("declaration port returned an invalid model size");
      }
    } else if (item.url !== undefined && item.url.trim() === "") {
      throw new Error("declaration port returned an invalid extension source");
    } else if (item.url === undefined && (item.registry ?? "").trim() === "" && item.provider !== "local") {
      throw new Error("declaration port returned an extension without a source");
    }
  }
  return {
    ref: copyRef(plan.ref),
    items: plan.items.map(copyPlanItem),
  };
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  return signal?.aborted === true || (error instanceof Error && error.name === "AbortError");
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function refusalFor(error: unknown, signal?: AbortSignal): ItemRefusal {
  if (isAbortError(error, signal)) {
    return new ItemRefusal("cancelled", "provisioning/cancelled", "operation cancelled");
  }
  if (error instanceof ItemRefusal) return error;
  if (error instanceof ManagerProviderError) {
    return new ItemRefusal("blocked", `manager/${error.code}`, error.message);
  }
  if (error instanceof ProvisioningError) {
    if (error.code === "invalid-digest" || error.code === "invalid-path") {
      return new ItemRefusal("blocked", error.code, error.message);
    }
    if (error.code === "size-mismatch") {
      return new ItemRefusal("failed", "artifact/size-mismatch", error.message);
    }
    return new ItemRefusal("failed", error.code, error.message);
  }
  return new ItemRefusal("failed", "provisioning/failed", errorText(error));
}

function aggregateState(items: readonly ProvisionItemResult[]): ProvisionState {
  if (items.length === 0) return "absent";
  if (items.some((item) => item.state === "blocked")) return "blocked";
  if (items.some((item) => item.state === "failed")) return "failed";
  if (items.every((item) => item.state === "active")) return "active";
  if (items.every((item) => item.state === "restart_required")) return "restart_required";
  if (items.some((item) => item.state === "restart_required")) {
    return "installed";
  }
  if (items.some((item) => item.state === "active")) return "active";
  return "absent";
}

function aggregateOutcome(items: readonly ProvisionItemResult[]): ProvisionOutcome {
  if (items.some((item) => item.outcome === "cancelled")) return "cancelled";
  const failed = items.filter((item) => item.outcome === "failed" || item.outcome === "blocked");
  const succeeded = items.filter((item) => item.outcome === "active" || item.outcome === "restart_required");
  if (failed.length === 0) {
    const allActive = items.every((item) => item.outcome === "active");
    return allActive ? "active" : "restart_required";
  }
  if (succeeded.length === 0) {
    return items.every((item) => item.outcome === "blocked") ? "blocked" : "failed";
  }
  return "partial";
}

function makeResult(
  ref: ResourceRef,
  operationId: string,
  outcome: ProvisionOutcome,
  operationState: ProvisionState,
  items: readonly ProvisionItemResult[],
  detail?: string,
): ProvisionResult {
  return {
    operationId,
    ref: copyRef(ref),
    state: outcome,
    outcome,
    operationState,
    items: items.map(copyResultItem),
    restartRequired: outcome === "restart_required" || items.some((item) => item.state === "restart_required"),
    ...(detail === undefined ? {} : { detail }),
  };
}

function relativeArtifactPath(folder: string, filename: string): string {
  if (filename.trim() === "" || filename.includes("/") || filename.includes("\\") || filename === "." || filename === "..") {
    throw new ItemRefusal("blocked", "artifact/invalid-filename", "model filename must be one path segment");
  }
  if (folder.startsWith("/") || folder.includes("\\") || folder.split("/").some((part) => part === "..")) {
    throw new ItemRefusal("blocked", "artifact/invalid-folder", "model folder must stay under the artifact root");
  }
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  return cleanFolder === "" ? filename : `${cleanFolder}/${filename}`;
}

function itemFailure(item: ProvisionPlanItem, refusal: ItemRefusal): ProvisionItemResult {
  return {
    key: item.key,
    kind: item.kind,
    state: refusal.outcome === "blocked" ? "blocked" : "failed",
    outcome: refusal.outcome,
    errorCode: refusal.code,
    detail: refusal.message,
  };
}

function itemResult(
  item: ProvisionPlanItem,
  state: ProvisionState,
  outcome: ProvisionOutcome,
  values: Omit<ResourceStatusItem, "key" | "kind" | "state"> = {},
): ProvisionItemResult {
  return {
    key: item.key,
    kind: item.kind,
    state,
    outcome,
    ...values,
  };
}

/** THE F9 TOTAL (the tracker's denominator): the DECL size_bytes
 *  sum across a plan's model rows — 0 when no row declares one.
 *  Real declared bytes, never a guess. */
function planTotal(plan: ProvisionPlan): number {
  let total = 0;
  for (const item of plan.items) {
    if (item.kind === "model" && typeof item.sizeBytes === "number") total += item.sizeBytes;
  }
  return total;
}

/** THE F9 COUNTED SOURCE (the tracker's numerator): wraps the
 *  fetcher's byte stream and counts every landed chunk — the bytes
 *  the tracker polls are the bytes the writer received. */
function countedSource(
  source: import("./artifact-writer.ts").ArtifactInput,
  onBytes: (count: number) => void,
): AsyncIterable<Uint8Array> {
  async function* generate(): AsyncGenerator<Uint8Array> {
    if (source instanceof ReadableStream) {
      const reader = (source as ReadableStream<Uint8Array>).getReader();
      try {
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          if (next.value !== undefined) {
            onBytes(next.value.byteLength);
            yield next.value;
          }
        }
      } finally {
        reader.releaseLock();
      }
      return;
    }
    const maybeAsync = source as AsyncIterable<Uint8Array>;
    if (typeof (maybeAsync as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function") {
      for await (const chunk of maybeAsync) {
        onBytes((chunk as Uint8Array).byteLength);
        yield chunk as Uint8Array;
      }
      return;
    }
    for (const chunk of source as Iterable<Uint8Array>) {
      onBytes((chunk as Uint8Array).byteLength);
      yield chunk as Uint8Array;
    }
  }
  return generate();
}

export class ProvisioningService extends Service implements ProvisioningServiceDefinition {
  private readonly declaration: DeclarationPort;
  private readonly writer: ArtifactWriterPort | undefined;
  private readonly writerRoot: string;
  private readonly fetcher: ArtifactFetcher | undefined;
  private readonly manager: ManagerPort | undefined;
  private readonly inspector: InspectorPort | undefined;
  private readonly lifecycle: LifecyclePort | undefined;
  private readonly operationStore: OperationStorePort | undefined;
  private readonly writeGuard: () => boolean;
  private readonly operationIdFactory: () => string;
  private readonly records = new Map<string, ResourceRecord>();
  private readonly locks = new Map<string, LockedOperation>();
  /** THE F9 BYTE LEDGER (one map, two readers): operationId ->
   *  live bytes/total. The direct arm counts the fetcher stream as
   *  it lands (real bytes, never an animation); total is the DECL
   *  size_bytes sum. The manage door (acquire_weight) and any
   *  future caller poll progressOf — one ledger, never two. */
  private readonly weightProgress = new Map<string, WeightAcquireProgress>();
  /** Mints that passed the cap check but have not registered their
   *  lock yet (the plan resolve awaits in between) — the cap counts
   *  them with the locks, or concurrent starts all read the same
   *  pre-mint size and overbook the plane (audit verify-batch31
   *  D1). */
  private pendingAcquires = 0;
  /** Mints between the synchronous reservation and the lock's
   *  registration, keyed by resource key. A same-key starter that
   *  arrives inside the window parks on the promise and joins the
   *  lock it registers — without this, both starters miss the
   *  registered-lock join and twin-mint one ref (verify R1). */
  private readonly pendingMints = new Map<string, Promise<string>>();
  private readonly weightProgressByRef = new Map<string, string>();
  private readonly diskFree: (path: string) => Promise<number>;

  constructor(ctx: Context, config: ProvisioningConfig) {
    super(ctx, "provisioning");
    if (config === undefined || config.declaration === undefined) {
      throw new Error("provisioning requires a DeclarationPort");
    }
    this.declaration = config.declaration;
    this.writer = config.artifactWriter ?? (config.storeRoot === undefined ? undefined : new VerifiedArtifactWriter(config.storeRoot));
    this.writerRoot = config.storeRoot ?? (config.artifactWriter as { root?: unknown } | undefined)?.root as string ?? "";
    this.fetcher = config.fetcher;
    this.manager = config.manager;
    this.inspector = config.inspector;
    this.lifecycle = config.lifecycle;
    this.operationStore = config.operationStore;
    this.diskFree = config.diskFree ?? statFsFree;
    this.writeGuard = config.writeGuard ?? ((): boolean => true);
    this.operationIdFactory = config.operationIdFactory ?? newOperationId;
    this.ctx.effect(() => async (): Promise<void> => {
      const operations = [...this.locks.values()];
      for (const operation of operations) operation.controller.abort();
      await Promise.allSettled(operations.map((operation) => operation.promise));
    }, "provisioning.lifecycle");
    // THE PART REAPER (audit K-4, 2026-10-22): a crash mid-download
    // orphans the writer's .part sidecar past every catch — the
    // boot sweep and the periodic sweep unlink the stale ones. A
    // failed sweep never takes the seat down; the next tick retries.
    if (this.writer instanceof VerifiedArtifactWriter) {
      const writer = this.writer;
      this.ctx.effect(() => {
        const sweep = (): void => {
          void writer.reapStaleParts().catch(() => undefined);
        };
        sweep();
        const ticker = setInterval(sweep, PART_REAP_INTERVAL_MS);
        return (): void => {
          clearInterval(ticker);
        };
      }, "provisioning.part-reaper");
    }
    // THE PROGRESS REHYDRATE (audit E3, 2026-10-22): the weight
    // ledger is in-memory, so a restart orphaned every in-flight
    // acquire — the tracker polled null while the store still held
    // the row. Stores that can enumerate seed the ledger at boot.
    const store = this.operationStore;
    if (store?.list !== undefined) {
      this.ctx.effect(() => {
        void store.list!().then((operations) => {
          for (const operation of operations) this.rehydrateProgress(operation);
        }).catch((error: unknown) => {
          // a poisoned row or an unreadable store degrades to an
          // empty ledger, named in the log — the boot never blocks
          this.ctx.logger.error(error instanceof Error ? error : new Error(String(error)));
        });
        return (): void => undefined;
      }, "provisioning.progress-rehydrate");
    }
  }

  /** THE REHYDRATE SEED (audit E3): one stored row joins the live
   *  ledger. A row still mid-flight belongs to a fetch that died
   *  with the old process — it rehydrates as failed with the
   *  restart named, never as a frozen acquiring bar; terminal rows
   *  stay out (operationOf answers them). */
  private rehydrateProgress(operation: ProvisionOperation): void {
    if (this.weightProgress.has(operation.operationId)) return;
    // a dead pre-restart row never touches a ref whose operation is
    // LIVE in this process — the pointer and the row belong to the
    // live fetch, not the remnant (verify R4)
    const live = this.locks.get(resourceKey(operation.ref));
    if (live !== undefined && live.id !== operation.operationId) return;
    const inFlight = operation.finishedAt === undefined &&
      (operation.state === "acquiring" || operation.state === "verifying");
    if (!inFlight) return;
    const detail = operation.detail === undefined
      ? "the seat restarted before this fetch landed — start it again"
      : `${operation.detail} — the seat restarted before the fetch landed`;
    this.weightProgress.set(operation.operationId, {
      operationId: operation.operationId,
      ref: copyRef(operation.ref),
      state: "failed",
      bytes: 0,
      total: 0,
      detail,
    });
    this.weightProgressByRef.set(resourceKey(operation.ref), operation.operationId);
  }

  stateOf(ref: ResourceRef): ProvisionState {
    return this.record(ref).state;
  }

  operationOf(ref: ResourceRef): ProvisionOperation | undefined {
    const operation = this.record(ref).operation;
    return operation === undefined ? undefined : copyOperation(operation);
  }

  /** THE TRUST RE-VERIFY (audit I-S6, 2026-10-22): an external
   *  operation's persisted row is served by status reads, and the
   *  row used to trust its own landing — a file deleted after the
   *  fetch kept serving "active". This re-stats every recorded model
   *  path (existence only: the operator-confirmed semantic is that
   *  the bytes' SHA-256 is unverified) and demotes a missing path to
   *  absent, naming the operation and the gone path. Declared rows
   *  are not this method's subject — inspect() owns them. */
  async verifyOperation(operation: ProvisionOperation): Promise<ProvisionOperation> {
    const items: ResourceStatusItem[] = [];
    let missing = false;
    for (const item of operation.items) {
      if (item.kind !== "model" || item.path === undefined || item.state !== "active" || await fileExists(item.path)) {
        items.push(item);
        continue;
      }
      missing = true;
      items.push({
        ...item,
        state: "absent",
        detail: "the recorded path is gone (" + item.path + ") — operation " +
          operation.operationId + " landed bytes that no longer exist; run the download again",
      });
    }
    if (!missing) return operation;
    return { ...operation, state: "absent", items };
  }

  transitionsOf(ref: ResourceRef): readonly ProvisionState[] {
    return [...this.record(ref).history];
  }

  isLocked(ref: ResourceRef): boolean {
    return this.locks.has(resourceKey(ref));
  }

  /** THE F9 PROGRESS READ (the tracker's poll): a copy of the live
   *  byte ledger for one operation id, null when unknown. Bytes are
   *  counted as the fetcher stream lands — real landed bytes, never
   *  an animation. */
  progressOf(operationId: string): WeightAcquireProgress | null {
    const entry = this.weightProgress.get(operationId);
    if (entry === undefined) return null;
    return { ...entry, ref: copyRef(entry.ref) };
  }

  /** THE F9 REF READ (the tracker's poll by model): the live entry
   *  for one ref, null when no acquisition has started for it. */
  progressOfRef(ref: ResourceRef): WeightAcquireProgress | null {
    const id = this.weightProgressByRef.get(resourceKey(ref));
    if (id === undefined) return null;
    return this.progressOf(id);
  }

  /** THE F9 START (one door's background arm): starts the fetch for
   *  one ref WITHOUT awaiting the landing and returns its operation
   *  id at once — the tracker polls progressOf. A second start while
   *  the first is locked returns the FIRST id (one fetch, never two;
   *  runLocked's join law). The fetch itself rides executeEnsure
   *  (the existing fetcher — no second fetcher). */
  async startWeightAcquire(ref: ResourceRef, options: EnsureOptions = {}): Promise<string> {
    const key = resourceKey(ref);
    const locked = this.locks.get(key);
    if (locked !== undefined) {
      await this.fillJoinProgress(locked.id, ref);
      return locked.id;
    }
    // THE PRE-LOCK WINDOW (verify R1): the join above cannot see a
    // mint whose plan resolve is still in flight — its lock only
    // registers after the await. A same-key starter parks on the
    // mint's promise and joins the lock it registers; two
    // concurrent same-key starts mint exactly one fetch.
    const inflight = this.pendingMints.get(key);
    if (inflight !== undefined) {
      const mintedId = await inflight;
      const joined = this.locks.get(key);
      if (joined !== undefined && joined.id === mintedId) {
        await this.fillJoinProgress(mintedId, ref);
        return mintedId;
      }
      // the minted operation settled terminal and released before
      // this joiner woke — fall through and mint fresh
    }
    // THE CONCURRENCY CAP (audit I-S4): the same-key join and the
    // pre-lock park above are never a second slot; a NEW ref past
    // the cap refuses busy. The blocking doors do not refuse —
    // their callers await the fetch inside their own deadline-
    // bounded request and join locks per-ref; the cap guards the
    // unawaited minter, where N callers would otherwise mint N
    // background fetches.
    if (this.locks.size + this.pendingAcquires >= MAX_CONCURRENT_ACQUIRES) {
      throw new AcquireBusyError(
        `the estate already runs ${String(this.locks.size + this.pendingAcquires)} weight acquisitions (cap ${String(MAX_CONCURRENT_ACQUIRES)}) — poll the live operation or wait for one to settle`);
    }
    // the slot is reserved SYNCHRONOUSLY, before the plan resolve's
    // await — concurrent starts must each see the prior reservation,
    // or N simultaneous starts all read the same pre-mint lock size
    // and overbook the plane (verify-batch31 D1). On the mint the
    // registered lock owns the slot; any refusal inside the mint
    // releases it in the finally.
    this.pendingAcquires += 1;
    let settleMint!: (id: string) => void;
    let refuseMint!: (error: unknown) => void;
    const mint = new Promise<string>((resolve, reject) => {
      settleMint = resolve;
      refuseMint = reject;
    });
    this.pendingMints.set(key, mint);
    let id = "";
    try {
      let total = 0;
      try {
        const plan = await this.plan(ref);
        total = planTotal(plan);
      } catch {
        total = 0;
      }
      id = this.operationIdFactory();
      this.weightProgress.set(id, {
        operationId: id,
        ref: copyRef(ref),
        state: "acquiring",
        bytes: 0,
        total,
      });
      this.weightProgressByRef.set(key, id);
      void this.runWithId(ref, id, async (operationId, operationSignal) =>
        await this.executeEnsure(ref, options, operationId, operationSignal),
      ).then((result) => {
        const current = this.weightProgress.get(id);
        if (current !== undefined) {
          const landed = current.total > 0 &&
              (result.state === "active" || result.state === "restart_required")
            ? current.total
            : current.bytes;
          this.weightProgress.set(id, {
            ...current,
            state: result.operationState,
            bytes: landed,
            ...(result.detail === undefined ? {} : { detail: result.detail }),
          });
        }
        this.evictSettledAcquires();
      }).catch((error: unknown) => {
        const current = this.weightProgress.get(id);
        if (current !== undefined) {
          this.weightProgress.set(id, {
            ...current,
            state: "failed",
            detail: error instanceof Error ? error.message : String(error),
          });
        }
        this.evictSettledAcquires();
      });
      // the lock is registered (synchronous, inside runWithId) —
      // parked same-key joiners may now join it
      settleMint(id);
    } catch (error) {
      // a refused mint answers its parked joiners with the same
      // refusal — no joiner is left stranded on a dead promise
      refuseMint(error);
      throw error;
    } finally {
      // the reservation releases in every exit: by the time the lock
      // is registered (synchronous, inside runWithId) it owns the
      // slot and counts in locks.size; a refused mint owns nothing
      this.pendingAcquires -= 1;
      if (this.pendingMints.get(key) === mint) this.pendingMints.delete(key);
    }
    return id;
  }

  /** THE JOIN FILL (verify R3): the joiner tops the ledger up only
   *  where the live entry lacks. The row is re-read AFTER the plan
   *  resolve — a concurrent executeEnsure seed may have counted
   *  bytes in between, and a join never resets them. */
  private async fillJoinProgress(operationId: string, ref: ResourceRef): Promise<void> {
    let total = 0;
    try {
      const plan = await this.plan(ref);
      total = planTotal(plan);
    } catch {
      total = 0;
    }
    const current = this.weightProgress.get(operationId);
    if (current !== undefined) {
      if (current.total === 0 && total > 0) {
        this.weightProgress.set(operationId, { ...current, total });
      }
      return;
    }
    this.weightProgress.set(operationId, {
      operationId,
      ref: copyRef(ref),
      state: "acquiring",
      bytes: 0,
      total,
    });
    this.weightProgressByRef.set(resourceKey(ref), operationId);
  }

  /** The background-start run: a preset id (the caller returns it
   *  synchronously) with no caller signal — the operation owns its
   *  own controller alone. */
  private async runWithId(
    ref: ResourceRef,
    presetId: string,
    body: (operationId: string, signal: AbortSignal) => Promise<ProvisionResult>,
    key = resourceKey(ref),
  ): Promise<ProvisionResult> {
    const existing = this.locks.get(key);
    if (existing !== undefined) return await this.joinLocked(ref, existing);
    const controller = new AbortController();
    const operationSignal = controller.signal;
    let promise!: Promise<ProvisionResult>;
    promise = Promise.resolve()
      .then(() => body(presetId, operationSignal))
      .catch((error: unknown) => this.completeUnstarted(ref, presetId, error, operationSignal))
      .finally(() => {
        this.locks.delete(key);
      });
    this.locks.set(key, { id: presetId, controller, promise });
    return await promise;
  }

  async plan(ref: ResourceRef): Promise<ProvisionPlan> {
    return copyPlan(await this.declaration.resolve(ref), ref);
  }

  async inspect(ref: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus> {
    const key = resourceKey(ref);
    const locked = this.locks.get(key);
    if (locked !== undefined) {
      const result = await this.joinLocked(ref, locked, signal);
      return this.statusFromResult(result);
    }
    let plan: ProvisionPlan;
    try {
      plan = await this.plan(ref);
    } catch (error: unknown) {
      const refusal = refusalFor(error, signal);
      this.move(ref, undefined, refusal.outcome === "blocked" ? "blocked" : "failed");
      return {
        ref: copyRef(ref),
        state: refusal.outcome === "blocked" ? "blocked" : "failed",
        items: [],
        detail: refusal.message,
      };
    }
    const items: ResourceStatusItem[] = [];
    for (const item of plan.items) {
      if (isAbortError(undefined, signal)) break;
      try {
        items.push(await this.inspectPlanItem(item, signal));
      } catch (error: unknown) {
        const refusal = refusalFor(error, signal);
        items.push(itemFailure(item, refusal));
      }
    }
    const state = aggregateState(items.map((item) => ({ ...item, outcome: stateOutcome(item.state) })));
    this.move(ref, undefined, state);
    const operationId = this.record(ref).operation?.operationId;
    return {
      ref: copyRef(ref),
      state,
      ...(operationId === undefined ? {} : { operationId }),
      items: items.map(copyItem),
    };
  }

  async ensure(
    ref: ResourceRef,
    options: EnsureOptions = {},
    signal?: AbortSignal,
  ): Promise<ProvisionResult> {
    return await this.runLocked(ref, signal, async (operationId, operationSignal) =>
      await this.executeEnsure(ref, options, operationId, operationSignal),
    );
  }

  async activate(
    ref: ResourceRef,
    options: ActivateOptions = {},
    signal?: AbortSignal,
  ): Promise<ProvisionResult> {
    return await this.runLocked(ref, signal, async (operationId, operationSignal) => {
      this.begin(ref, operationId);
      let plan: ProvisionPlan;
      try {
        plan = await this.plan(ref);
      } catch (error: unknown) {
        return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
      }
      if (plan.items.length === 0) {
        return this.complete(ref, operationId, this.failureResult(ref, operationId, new Error("resource has no provision plan items"), operationSignal));
      }
      if (ref.kind === "model") {
        const inspected: ProvisionItemResult[] = [];
        for (const item of plan.items) {
          try {
            inspected.push(await this.inspectPlanItem(item, operationSignal) as ProvisionItemResult);
          } catch (error: unknown) {
            const refusal = refusalFor(error, operationSignal);
            inspected.push(itemFailure(item, refusal));
          }
        }
        const result = makeResult(ref, operationId, aggregateOutcome(inspected), aggregateState(inspected), inspected);
        return this.complete(ref, operationId, result);
      }
      if (this.manager === undefined) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "manager/unavailable", "no ManagerPort is configured"));
      }
      const inspection = this.manager.inspect === undefined
        ? undefined
        : await this.manager.inspect(ref.id, operationSignal).catch((error: unknown) => {
            throw new ItemRefusal("failed", "manager/inspect-failed", errorText(error));
          });
      if (inspection !== undefined && inspection.installed) {
        this.move(ref, operationId, "installed");
        const activated = await this.activateExtension(ref, plan, operationId, operationSignal, options);
        return this.complete(ref, operationId, activated);
      }
      const ensured = await this.executeEnsure(ref, {}, operationId, operationSignal, true);
      if (ensured.state !== "restart_required" && ensured.state !== "active") return ensured;
      const activated = await this.activateExtension(ref, plan, operationId, operationSignal, options);
      return this.complete(ref, operationId, activated);
    });
  }

  async acquireExternal(
    request: ExternalProvisionRequest,
    options: { readonly operatorConfirmed: boolean; readonly force?: boolean } = { operatorConfirmed: false },
    signal?: AbortSignal,
  ): Promise<ProvisionResult> {
    // THE EXTERNAL IDENTITY LAW (verify R2): one record per URL. The
    // old generic shared ref locked per-URL but keyed the record,
    // ledger row, and ByRef pointer by the SHARED id — two
    // concurrent external URLs flapped one record's state. The id
    // carries the url, so lock, record, and pointer all name the
    // same per-URL identity.
    const externalId = "external:" + request.url;
    const ref: ResourceRef = request.kind === "model"
      ? { kind: "model", owner: "card", id: externalId }
      : { kind: "extension", id: externalId };
    return await this.runLocked(ref, signal, async (operationId, operationSignal) => {
      this.begin(ref, operationId);
      if (!this.writeGuard()) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/byo", "this endpoint is read-only for estate provisioning"));
      }
      if (options.operatorConfirmed !== true) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "external/not-confirmed", "external acquisition requires operator confirmation"));
      }
      if (request.kind === "model") {
        if (this.writer?.inspect === undefined) {
          return this.complete(ref, operationId, this.blockedResult(ref, operationId, "artifact/inspect-unavailable", "external model acquisition requires the configured model store inspector"));
        }
        if (this.manager?.installModel === undefined) {
          return this.complete(ref, operationId, this.blockedResult(ref, operationId, "manager/model-unavailable", "external model acquisition requires ComfyUI-Manager model installation"));
        }
        try {
          const filename = request.filename ?? "download.bin";
          // THE DEFAULT-FOLDER LAW (audit T-S5, 2026-10-22): an
          // omitted (or empty) relativePath means "checkpoints" —
          // the manage door's own default. "" meant store-root to
          // the verifier below but the Manager's own save-path map
          // sends "" to "default" — bytes landed one directory over
          // from where inspect probed.
          const folder = request.relativePath === undefined || request.relativePath === "" ? "checkpoints" : request.relativePath;
          const relativePath = relativeArtifactPath(folder, filename);
          const parts = relativePath.split("/");
          const landedName = parts[parts.length - 1] as string;
          const landedFolder = parts.slice(0, -1).join("/");
          this.move(ref, operationId, "verifying");
          const installed = await this.manager.installModel({
            id: relativePath,
            name: landedName,
            savePath: landedFolder,
            url: request.url,
            filename: landedName,
            // T-E2: same law as the declared arm — the declared size
            // scales the manager queue's drain budget.
            ...(request.sizeBytes === undefined ? {} : { sizeBytes: request.sizeBytes }),
          }, operationSignal);
          if (!installed.installed) {
            throw new ItemRefusal("failed", "manager/model-install-failed", installed.detail ?? "ComfyUI-Manager did not install the model");
          }
          const landed = await this.writer.inspect({
            root: this.writerRoot,
            relativePath,
            ...(request.sha256 === undefined ? {} : { expectedSha256: request.sha256 }),
          }, operationSignal);
          if (!landed.present) {
            throw new ItemRefusal(
              "failed",
              landed.sha256 === undefined ? "manager/model-not-landed" : "artifact/hash-mismatch",
              landed.sha256 === undefined
                ? "ComfyUI-Manager queue completed but the requested model path is absent"
                : "ComfyUI-Manager landed bytes that do not match the requested SHA-256",
            );
          }
          if (request.sizeBytes !== undefined && landed.sizeBytes !== request.sizeBytes) {
            throw new ItemRefusal(
              "failed",
              "artifact/size-mismatch",
              `ComfyUI-Manager landed a model with size ${String(landed.sizeBytes ?? "unknown")}, expected ${String(request.sizeBytes)}`,
            );
          }
          this.move(ref, operationId, "installed");
          const result = itemResult(
            { kind: "model", key: operationId, owner: "card", id: "external-model", name: relativePath, folder: "", url: request.url, sha256: request.sha256, required: true, provider: "external" },
            "active",
            "active",
            {
              path: landed.path,
              sha256: landed.sha256,
              integrity: request.sha256 === undefined ? "operator-unverified" : "declared-sha256",
            },
          );
          return this.complete(ref, operationId, makeResult(ref, operationId, "active", "active", [result]));
        } catch (error: unknown) {
          return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
        }
      }
      if (this.manager === undefined) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "manager/unavailable", "no ManagerPort is configured"));
      }
      try {
        const result = await this.manager.install({ id: ref.id, url: request.url, ...(request.ref === undefined ? {} : { ref: request.ref }) }, operationSignal);
        if (!result.installed) throw new ItemRefusal("failed", "manager/install-failed", result.detail ?? "manager did not install the extension");
        this.move(ref, operationId, "installed");
        const item = itemResult({ kind: "extension", key: operationId, id: ref.id, url: request.url, required: true, provider: "external" }, "restart_required", "restart_required", result.detail === undefined ? {} : { detail: result.detail });
        return this.complete(ref, operationId, makeResult(ref, operationId, "restart_required", "restart_required", [item]));
      } catch (error: unknown) {
        return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
      }
    });
  }

  async reconcile(ref?: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus[]> {
    if (ref !== undefined) return [await this.inspect(ref, signal)];
    if (this.declaration.list === undefined) return [];
    const refs = await this.declaration.list();
    const statuses: ResourceStatus[] = [];
    for (const item of refs) {
      if (isAbortError(undefined, signal)) break;
      try {
        statuses.push(await this.inspect(item, signal));
      } catch (error: unknown) {
        const refusal = refusalFor(error, signal);
        statuses.push({
          ref: copyRef(item),
          state: refusal.outcome === "blocked" ? "blocked" : "failed",
          items: [],
          detail: refusal.message,
        });
      }
    }
    return statuses;
  }

  private async executeEnsure(
    ref: ResourceRef,
    options: EnsureOptions,
    operationId: string,
    signal: AbortSignal,
    alreadyBegun = false,
  ): Promise<ProvisionResult> {
    if (!alreadyBegun) this.begin(ref, operationId);
    if (!this.writeGuard()) {
      return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/byo", "this endpoint is read-only for estate provisioning"));
    }
    let plan: ProvisionPlan;
    try {
      plan = await this.plan(ref);
    } catch (error: unknown) {
      return this.complete(ref, operationId, this.failureResult(ref, operationId, error, signal));
    }
    if (options.items !== undefined) {
      const requested = new Set(options.items);
      plan = {
        ...plan,
        items: plan.items.filter((item) => requested.has(item.kind === "model" ? item.name : item.id)),
      };
      if (plan.items.length === 0) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/item-not-found", "requested provision item is not declared"));
      }
    }
    if (plan.items.length === 0) {
      return this.complete(ref, operationId, this.failureResult(ref, operationId, new Error("resource has no provision plan items"), signal));
    }
    // THE DISK ADMISSION GATE (audit I-S4): the plan's declared bytes
    // are checked against the store root's free space BEFORE any
    // fetch, so a too-big plan refuses up front with the honest
    // need/have voice instead of failing mid-stream per item. A plan
    // without declared sizes or a seatless root skips the gate (the
    // writer's own landed checks still hold).
    const totalBytes = planTotal(plan);
    if (totalBytes > 0 && this.writerRoot !== "") {
      // a probe failure is no answer, never a refusal: the gate skips
      // and the writer's own landed checks still hold
      let freeBytes: number | undefined;
      try {
        freeBytes = await this.diskFree(this.writerRoot);
      } catch {
        freeBytes = undefined;
      }
      if (freeBytes !== undefined && freeBytes - totalBytes < DISK_FLOOR_BYTES) {
        return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/insufficient-disk",
          `the plan needs ${String(totalBytes)} bytes but the store root has ${String(freeBytes)} available (reserving ${String(DISK_FLOOR_BYTES)}) — free space or narrow the request`));
      }
    }
    // THE F9 LEDGER SEED (the tracker's denominator): the blocking
    // ensure path never passes through startWeightAcquire, so the
    // entry must exist here too — total is the DECL sum, bytes 0.
    // A background start already seeded it; that entry wins.
    if (!this.weightProgress.has(operationId)) {
      this.weightProgress.set(operationId, {
        operationId,
        ref: copyRef(ref),
        state: "acquiring",
        bytes: 0,
        total: planTotal(plan),
      });
      this.weightProgressByRef.set(resourceKey(ref), operationId);
    }
    const items: ProvisionItemResult[] = [];
    let cancelled = false;
    for (const item of plan.items) {
      if (signal.aborted) {
        cancelled = true;
        items.push(itemFailure(item, new ItemRefusal("cancelled", "provisioning/cancelled", "operation cancelled")));
        continue;
      }
      try {
        this.move(ref, operationId, item.kind === "model" ? "acquiring" : "acquiring");
        items.push(await this.acquirePlanItem(ref, item, operationId, signal));
      } catch (error: unknown) {
        const refusal = refusalFor(error, signal);
        if (refusal.outcome === "cancelled") cancelled = true;
        items.push(itemFailure(item, refusal));
      }
    }
    let outcome = aggregateOutcome(items);
    if (cancelled || signal.aborted) outcome = "cancelled";
    const operationState = outcome === "cancelled" ? "failed" : aggregateState(items);
    let result = makeResult(ref, operationId, outcome, operationState, items);
    if (options.activate === true || options.activateIfIdle === true) {
      if (ref.kind === "extension" && (outcome === "active" || outcome === "restart_required")) {
        result = await this.activateExtension(ref, plan, operationId, signal, {
          ...(options.force === undefined ? {} : { force: options.force }),
          ifIdle: options.activateIfIdle === true,
        });
      }
    }
    return this.complete(ref, operationId, result);
  }

  private async acquirePlanItem(
    ref: ResourceRef,
    item: ProvisionPlanItem,
    operationId: string,
    signal: AbortSignal,
  ): Promise<ProvisionItemResult> {
    if (item.kind === "model") return await this.acquireModel(ref, item, operationId, signal);
    // THE PROVIDER ARM (the contract's vocabulary): `local` verifies
    // in place. A token with no arm is REFUSED BY NAME — it used to
    // fall through to the Manager, so a "git" item on a lane with no
    // Manager refused "manager/unavailable" while a git provider sat
    // right there (the audit's C4).
    if (!providerOk(item.provider)) {
      throw new ItemRefusal("blocked", "extension/unknown-provider", unknownProviderRefusal(item.provider));
    }
    if (item.provider === "local") {
      if (this.inspector === undefined) {
        throw new ItemRefusal("blocked", "extension/inspect-unavailable", "local extension requires an engine inspector");
      }
      const inspection = await this.inspector.inspect(ref, signal);
      if (!inspection.active) {
        throw new ItemRefusal("blocked", "extension/not-active", inspection.detail ?? "local extension is not active on the engine");
      }
      return itemResult(item, "active", "active", inspection.detail === undefined ? {} : { detail: inspection.detail });
    }
    if (this.manager === undefined) {
      throw new ItemRefusal("blocked", "manager/unavailable", "no ManagerPort is configured");
    }
    const request: ManagerInstallRequest = {
      id: item.id,
      url: item.url,
      ...(item.ref === undefined ? {} : { ref: item.ref }),
      ...(item.version === undefined ? {} : { version: item.version }),
      ...(item.registry === undefined ? {} : { registry: item.registry }),
      ...(item.requirements === undefined ? {} : { requirements: item.requirements }),
      ...(item.nodeTypes === undefined ? {} : { nodeTypes: item.nodeTypes }),
    };
    if (this.manager.canInstall !== undefined) {
      const canInstall = await this.manager.canInstall(request, signal);
      if (!canInstall) throw new ItemRefusal("blocked", "manager/pin-mismatch", "manager cannot honor the declared extension pin");
    }
    const installed = await this.manager.install(request, signal);
    if (!installed.installed) {
      throw new ItemRefusal("failed", "manager/install-failed", installed.detail ?? "manager did not install the extension");
    }
    this.move(ref, operationId, "installed");
    return itemResult(item, "restart_required", "restart_required", installed.detail === undefined ? {} : { detail: installed.detail });
  }

  private async acquireModel(
    ref: ResourceRef,
    item: ModelProvisionPlanItem,
    operationId: string,
    signal: AbortSignal,
  ): Promise<ProvisionItemResult> {
    if (item.sha256 === undefined || item.sha256.trim() === "") {
      throw new ItemRefusal("blocked", "artifact/invalid-digest", "model acquisition requires a declared SHA-256 digest");
    }
    if (this.writer === undefined || this.writer.inspect === undefined) {
      throw new ItemRefusal("blocked", "artifact/inspect-unavailable", "model acquisition requires the configured model store inspector");
    }
    // THE PROVIDER ARM FOR MODELS (the contract's vocabulary): the
    // declaration stamps every model row with its intended source,
    // and this arm honours the token — a "direct" row used to be
    // silently countermanded to ComfyUI-Manager, which resolved the
    // row through its own catalog URL and refused anything the
    // catalog did not know. A token with no model arm is REFUSED BY
    // NAME (the extension arm's law), never routed to a default.
    if (!providerOk(item.provider)) {
      throw new ItemRefusal("blocked", "model/unknown-provider", unknownProviderRefusal(item.provider));
    }
    if (item.provider === "git" || item.provider === "external") {
      throw new ItemRefusal(
        "blocked",
        "model/provider-without-arm",
        `the model plan arm does not implement provider "${item.provider}" — git clones are an extension arm, external acquisition rides the operator-confirmed door`,
      );
    }
    const relativePath = relativeArtifactPath(item.folder, item.name);
    const existing = await this.writer.inspect({
      root: this.writerRoot,
      relativePath,
      expectedSha256: item.sha256,
    }, signal);
    if (existing.present) {
      if (item.sizeBytes !== undefined && existing.sizeBytes !== item.sizeBytes) {
        throw new ItemRefusal(
          "failed",
          "artifact/size-mismatch",
          `the declared model has size ${String(existing.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`,
        );
      }
      // THE F9 ALREADY-LANDED BYTES (real, not animation): a present
      // file contributes its declared size to the live count at once.
      if (item.sizeBytes !== undefined) this.bumpProgress(operationId, item.sizeBytes);
      return itemResult(item, "active", "active", {
        ...(existing.path === undefined ? {} : { path: existing.path }),
        ...(existing.sha256 === undefined ? {} : { sha256: existing.sha256 }),
        integrity: "declared-sha256",
      });
    }
    if (item.provider === "local") {
      throw new ItemRefusal(
        "blocked",
        "model/not-present",
        `local model ${item.name} is not present at ${relativePath} with the declared digest — the local arm verifies, it never installs`,
      );
    }
    if (item.provider === "direct") {
      if (this.fetcher === undefined) {
        throw new ItemRefusal("blocked", "artifact/fetch-unavailable", "direct model acquisition requires a configured artifact fetcher");
      }
      this.move(ref, operationId, "verifying");
      const response = await this.fetcher(item.url, signal);
      if (response.status !== 200 || response.body === null) {
        throw new ItemRefusal(
          "failed",
          "artifact/fetch-refused",
          `direct fetch of ${item.url} answered status ${String(response.status)}${response.body === null ? " with no body" : ""}`,
        );
      }
      try {
        // THE F9 COUNTED WRITE (the tracker's numerator): the ledger
        // entry must exist before the first chunk lands (a background
        // start seeded it with the plan total; a blocking ensure
        // seeded it in executeEnsure — this keeps whichever total is
        // already there and only fills a missing one).
        this.ensureProgress(operationId, ref, item.sizeBytes ?? 0);
        const landed = await this.writer.write({
          root: this.writerRoot,
          relativePath,
          expectedSha256: item.sha256,
          operationId,
          source: countedSource(response.body, (count) => this.bumpProgress(operationId, count)),
          sizeBytes: item.sizeBytes,
        }, signal);
        this.move(ref, operationId, "installed");
        return itemResult(item, "active", "active", {
          path: landed.path,
          sha256: landed.sha256,
          integrity: "declared-sha256",
        });
      } catch (error) {
        if (error instanceof ProvisioningError) {
          throw new ItemRefusal("failed", "artifact/" + error.code, error.message);
        }
        throw error;
      }
    }
    if (this.manager?.installModel === undefined) {
      throw new ItemRefusal("blocked", "manager/model-unavailable", "model acquisition requires ComfyUI-Manager model installation");
    }
    this.move(ref, operationId, "verifying");
    const installed = await this.manager.installModel({
      id: item.key,
      name: item.name,
      savePath: item.folder,
      url: item.url,
      filename: item.name,
      // T-E2 (2026-10-22): the declared size rides so the manager
      // queue's drain budget scales for multi-GB artifacts (the
      // provider's modelQueueTimeoutMs arm was armed but never fed).
      ...(item.sizeBytes === undefined ? {} : { sizeBytes: item.sizeBytes }),
    }, signal);
    if (!installed.installed) {
      throw new ItemRefusal("failed", "manager/model-install-failed", installed.detail ?? "ComfyUI-Manager did not install the model");
    }
    const landed = await this.writer.inspect({
      root: this.writerRoot,
      relativePath,
      expectedSha256: item.sha256,
    }, signal);
    if (!landed.present) {
      const code = landed.sha256 === undefined ? "manager/model-not-landed" : "artifact/hash-mismatch";
      throw new ItemRefusal("failed", code, landed.sha256 === undefined
        ? "ComfyUI-Manager queue completed but the declared model path is absent"
        : "ComfyUI-Manager landed bytes that do not match the declared SHA-256");
    }
    if (item.sizeBytes !== undefined && landed.sizeBytes !== item.sizeBytes) {
      throw new ItemRefusal(
        "failed",
        "artifact/size-mismatch",
        `ComfyUI-Manager landed a model with size ${String(landed.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`,
      );
    }
    // THE F9 MANAGER BYTES (real landed total, no mid-flight count):
    // the Manager owns its own queue bytes, so the ledger jumps from
    // the pre-install count to the declared size only on success.
    if (item.sizeBytes !== undefined) this.bumpProgress(operationId, item.sizeBytes);
    this.move(ref, operationId, "installed");
    return itemResult(item, "active", "active", {
      path: landed.path,
      sha256: landed.sha256,
      integrity: "declared-sha256",
    });
  }

  private async activateExtension(
    ref: ResourceRef,
    plan: ProvisionPlan,
    operationId: string,
    signal: AbortSignal,
    options: ActivateOptions,
  ): Promise<ProvisionResult> {
    if (this.lifecycle === undefined || this.inspector === undefined) {
      return this.blockedResult(ref, operationId, "activation/unavailable", "activation requires LifecyclePort and InspectorPort");
    }
    try {
      const activeRuns = await this.lifecycle.activeRuns(signal);
      if (activeRuns.length > 0 && options.force !== true) {
        return this.blockedResult(ref, operationId, "activation/active-run", `activation refused while ${String(activeRuns.length)} run(s) are active`);
      }
      await this.lifecycle.restart(signal);
      await this.lifecycle.waitUntilReady(signal);
      const inspection = await this.inspector.inspect(ref, signal);
      const expected = plan.items.flatMap((item) => item.kind === "extension" ? item.nodeTypes ?? [] : []);
      const observed = new Set(inspection.nodeTypes ?? []);
      if (!inspection.active || expected.some((node) => !observed.has(node))) {
        return this.failureResult(ref, operationId, new ItemRefusal("failed", "activation/not-visible", inspection.detail ?? "declared extension node types are not visible"), signal);
      }
      const items = plan.items.map((item) => item.kind === "extension"
        ? itemResult(item, "active", "active", inspection.detail === undefined ? {} : { detail: inspection.detail })
        : itemResult(item, "installed", "active"));
      return makeResult(ref, operationId, "active", "active", items);
    } catch (error: unknown) {
      return this.failureResult(ref, operationId, error, signal);
    }
  }

  private async inspectPlanItem(item: ProvisionPlanItem, signal?: AbortSignal): Promise<ProvisionItemResult> {
    if (item.kind === "model") {
      if (item.sha256 === undefined || item.sha256.trim() === "") {
        return itemResult(item, "blocked", "blocked", { errorCode: "artifact/invalid-digest" });
      }
      if (this.writer?.inspect === undefined) {
        if (this.inspector === undefined) return itemResult(item, "unknown", "blocked", { errorCode: "artifact/inspect-unavailable" });
        const inspection = await this.inspector.inspect(itemOwnerRef(item), signal);
        return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
      }
      const inspection = await this.writer.inspect({
        root: this.writerRoot,
        relativePath: relativeArtifactPath(item.folder, item.name),
        expectedSha256: item.sha256,
      }, signal);
      if (!inspection.present) return itemResult(item, "absent", "blocked", inspection.path === undefined ? {} : { path: inspection.path, sha256: inspection.sha256 });
      if (item.sizeBytes !== undefined && inspection.sizeBytes !== item.sizeBytes) {
        return itemResult(item, "failed", "failed", {
          errorCode: "artifact/size-mismatch",
          detail: `the declared model has size ${String(inspection.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`,
        });
      }
      return itemResult(item, "active", "active", {
        ...(inspection.path === undefined ? {} : { path: inspection.path }),
        ...(inspection.sha256 === undefined ? {} : { sha256: inspection.sha256 }),
        integrity: "declared-sha256",
      });
    }
    if (item.provider === "local") {
      if (this.inspector === undefined) return itemResult(item, "unknown", "blocked", { errorCode: "extension/inspect-unavailable" });
      const inspection = await this.inspector.inspect({ kind: "extension", id: item.id }, signal);
      return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
    }
    if (this.manager?.inspect !== undefined) {
      const inspection = await this.manager.inspect(item.id, signal);
      const state: ProvisionState = inspection.active ? "active" : inspection.installed ? "restart_required" : "absent";
      const outcome: ProvisionOutcome = inspection.active ? "active" : inspection.installed ? "restart_required" : "blocked";
      return itemResult(item, state, outcome, inspection.detail === undefined ? {} : { detail: inspection.detail });
    }
    if (this.inspector !== undefined) {
      const inspection = await this.inspector.inspect({ kind: "extension", id: item.id }, signal);
      return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
    }
    return itemResult(item, "unknown", "blocked", { errorCode: "extension/inspect-unavailable" });
  }

  private begin(ref: ResourceRef, operationId: string): void {
    const record = this.record(ref);
    record.operation = {
      operationId,
      ref: copyRef(ref),
      state: "unknown",
      items: [],
      startedAt: Date.now(),
    };
    this.move(ref, operationId, "acquiring");
  }

  private complete(ref: ResourceRef, operationId: string, result: ProvisionResult): ProvisionResult {
    const record = this.record(ref);
    const operation = record.operation;
    if (operation !== undefined && operation.operationId === operationId) {
      record.operation = {
        ...operation,
        state: result.operationState,
        items: result.items.map(copyItem),
        outcome: result.state,
        finishedAt: Date.now(),
        ...(result.detail === undefined ? {} : { detail: result.detail }),
      };
    }
    this.move(ref, operationId, result.operationState, result.items);
    this.persist(record);
    this.evictSettledAcquires();
    return result;
  }

  private failureResult(
    ref: ResourceRef,
    operationId: string,
    error: unknown,
    signal?: AbortSignal,
  ): ProvisionResult {
    const refusal = refusalFor(error, signal);
    const outcome: ProvisionOutcome = refusal.outcome === "cancelled" ? "cancelled" : refusal.outcome;
    const item: ProvisionItemResult = {
      key: resourceKey(ref),
      kind: ref.kind,
      state: outcome === "blocked" ? "blocked" : "failed",
      outcome,
      errorCode: refusal.code,
      detail: refusal.message,
    };
    return makeResult(ref, operationId, outcome, outcome === "blocked" ? "blocked" : "failed", [item], refusal.message);
  }

  private blockedResult(
    ref: ResourceRef,
    operationId: string,
    code: string,
    message: string,
  ): ProvisionResult {
    const item: ProvisionItemResult = {
      key: resourceKey(ref),
      kind: ref.kind,
      state: "blocked",
      outcome: "blocked",
      errorCode: code,
      detail: message,
    };
    return makeResult(ref, operationId, "blocked", "blocked", [item], message);
  }

  private statusFromResult(result: ProvisionResult): ResourceStatus {
    return {
      ref: copyRef(result.ref),
      state: result.operationState,
      operationId: result.operationId,
      items: result.items.map(copyItem),
      ...(result.detail === undefined ? {} : { detail: result.detail }),
    };
  }

  private record(ref: ResourceRef): ResourceRecord {
    const key = resourceKey(ref);
    const existing = this.records.get(key);
    if (existing !== undefined) return existing;
    const record: ResourceRecord = { state: "unknown", history: ["unknown"] };
    this.records.set(key, record);
    return record;
  }

  private move(
    ref: ResourceRef,
    operationId: string | undefined,
    next: ProvisionState,
    items?: readonly ProvisionItemResult[],
  ): void {
    const record = this.record(ref);
    const previous = record.state;
    if (previous !== next && !TRANSITIONS[previous].includes(next)) {
      throw new Error(`invalid provisioning transition ${previous} -> ${next}`);
    }
    if (previous === next && operationId === undefined) return;
    record.state = next;
    if (previous !== next) record.history.push(next);
    if (operationId !== undefined && record.operation?.operationId === operationId) {
      record.operation = {
        ...record.operation,
        state: next,
        items: items === undefined ? record.operation.items : items.map(copyItem),
      };
    }
    // THE F9 STATE MIRROR (the tracker's face): the progress entry
    // follows the record — acquiring while the stream lands, then
    // the terminal operationState. The poll reads state + bytes.
    if (operationId !== undefined) {
      const entry = this.weightProgress.get(operationId);
      if (entry !== undefined && entry.state !== next) {
        this.weightProgress.set(operationId, { ...entry, state: next });
      }
    }
    if (previous !== next) {
      this.persist(record);
    }
  }

  /** THE F9 BYTE ADD (the tracker's numerator write): adds landed
   *  bytes to one operation's live count. No entry, no write. */
  private bumpProgress(operationId: string, count: number): void {
    const entry = this.weightProgress.get(operationId);
    if (entry === undefined || count <= 0) return;
    this.weightProgress.set(operationId, { ...entry, bytes: entry.bytes + count });
  }

  /** THE F9 ENTRY FILL (the tracker's denominator keep): creates the
   *  live entry when the blocking path is the first writer, and never
   *  shrinks a background start's plan total. */
  private ensureProgress(operationId: string, ref: ResourceRef, total: number): void {
    const entry = this.weightProgress.get(operationId);
    if (entry === undefined) {
      this.weightProgress.set(operationId, {
        operationId,
        ref: copyRef(ref),
        state: "acquiring",
        bytes: 0,
        total,
      });
      this.weightProgressByRef.set(resourceKey(ref), operationId);
    } else if (entry.total === 0 && total > 0) {
      this.weightProgress.set(operationId, { ...entry, total });
    }
  }

  /** THE REGISTRY-GROWTH LAW (audit I-S4): terminal acquire rows are
   *  evicted oldest-first past MAX_SETTLED_ACQUIRES in BOTH maps —
   *  the ByRef pointer drops with its id, never dangles — and the
   *  stored operation is removed from the store so the dir stops
   *  growing (the runs plane's MAX_SETTLED_RUNS, mirrored). Live
   *  ("acquiring") rows are never candidates. */
  private evictSettledAcquires(): void {
    // a live fetch is ANY lock-held id, whatever its ledger state —
    // the direct arm reads "verifying" mid-flight and an extension
    // arm reads "installed" before its restart bookkeeping ends
    // (verify-batch31 D2: a state filter alone evicted live rows)
    const live = new Set([...this.locks.values()].map((lock) => lock.id));
    const terminal = [...this.weightProgress.values()].filter((entry) =>
      entry.state !== "acquiring" && !live.has(entry.operationId));
    let excess = terminal.length - MAX_SETTLED_ACQUIRES;
    for (const entry of terminal) {
      if (excess <= 0) break;
      this.weightProgress.delete(entry.operationId);
      for (const [refKey, id] of this.weightProgressByRef) {
        if (id === entry.operationId) this.weightProgressByRef.delete(refKey);
      }
      const store = this.operationStore;
      if (store?.remove !== undefined) {
        // the tombstone lands BEFORE the remove so a same-id save
        // still inside the chain is dropped, never resurrected
        this.storeRemoved.add(entry.operationId);
        this.enqueueStoreWrite(entry.operationId, () => store.remove!(entry.operationId), (failure: Error) => {
          this.ctx.logger.error(new Error(
            `acquire eviction failed to remove stored operation ${entry.operationId}: ${failure.message}`,
            { cause: failure },
          ));
        });
      }
      excess -= 1;
    }
  }

  /** THE STORE WRITE CHAIN (verify R5): the store writes are
   *  fire-and-forget, so an in-flight save could land after the
   *  same id's eviction remove and resurrect a settled row. Writes
   *  for one id chain on the previous write, and an evicted id is
   *  tombstoned — later saves for it are dropped. With no write in
   *  flight the perform() call keeps the caller's synchronous
   *  frame: a synchronous store throw still fails the operation
   *  loud (the tested contract), only an async rejection logs. */
  private readonly storeWrites = new Map<string, { readonly promise: Promise<void>; done: boolean }>();
  private readonly storeRemoved = new Set<string>();

  private enqueueStoreWrite(
    operationId: string,
    perform: () => Promise<void>,
    onFailed: (failure: Error) => void,
  ): void {
    const prior = this.storeWrites.get(operationId);
    const call = prior === undefined || prior.done ? perform() : prior.promise.then(perform);
    const next = call.catch(onFailed);
    const entry = { promise: next, done: false };
    this.storeWrites.set(operationId, entry);
    void next.then(() => {
      entry.done = true;
      if (this.storeWrites.get(operationId) !== entry) return;
      this.storeWrites.delete(operationId);
      // the tombstone only guards writes still in flight for this
      // id — with the chain idle it retires (ids never reuse)
      this.storeRemoved.delete(operationId);
    });
  }

  private persist(record: ResourceRecord): void {
    if (this.operationStore === undefined || record.operation === undefined) return;
    const operation = copyOperation(record.operation);
    const store = this.operationStore;
    this.enqueueStoreWrite(operation.operationId, () =>
      this.storeRemoved.has(operation.operationId) ? Promise.resolve() : store.save(operation),
    (failure: Error) => {
      // the in-memory state advances past a failed save — the log
      // row must name the operation and its state so the store's
      // divergence is findable (audit E3)
      this.ctx.logger.error(new Error(
        `persist failed for ${operation.operationId} (${operation.state}): ${failure.message}`,
        { cause: failure },
      ));
    });
  }

  private async runLocked(
    ref: ResourceRef,
    signal: AbortSignal | undefined,
    body: (operationId: string, signal: AbortSignal) => Promise<ProvisionResult>,
    key = resourceKey(ref),
  ): Promise<ProvisionResult> {
    const existing = this.locks.get(key);
    if (existing !== undefined) return await this.joinLocked(ref, existing, signal);
    const id = this.operationIdFactory();
    const controller = new AbortController();
    const operationSignal = signal === undefined
      ? controller.signal
      : AbortSignal.any([controller.signal, signal]);
    if (signal?.aborted === true) controller.abort(signal.reason);
    let promise!: Promise<ProvisionResult>;
    promise = Promise.resolve()
      .then(() => body(id, operationSignal))
      .catch((error: unknown) => this.completeUnstarted(ref, id, error, operationSignal))
      .finally(() => {
        this.locks.delete(key);
      });
    this.locks.set(key, { id, controller, promise });
    return await promise;
  }

  private async joinLocked(
    ref: ResourceRef,
    operation: LockedOperation,
    signal?: AbortSignal,
  ): Promise<ProvisionResult> {
    if (signal === undefined) return await operation.promise;
    if (signal.aborted) return this.cancelledJoinResult(ref, operation.id);
    return await new Promise<ProvisionResult>((resolvePromise, rejectPromise) => {
      let settled = false;
      const finish = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        fn();
      };
      const onAbort = (): void => finish(() => resolvePromise(this.cancelledJoinResult(ref, operation.id)));
      signal.addEventListener("abort", onAbort, { once: true });
      void operation.promise.then(
        (value) => finish(() => resolvePromise(value)),
        (error: unknown) => finish(() => rejectPromise(error)),
      );
    });
  }

  private cancelledJoinResult(ref: ResourceRef, operationId: string): ProvisionResult {
    return makeResult(ref, operationId, "cancelled", "failed", [], "operation cancelled while waiting for a shared operation");
  }

  private completeUnstarted(
    ref: ResourceRef,
    operationId: string,
    error: unknown,
    signal: AbortSignal,
  ): ProvisionResult {
    this.begin(ref, operationId);
    return this.complete(ref, operationId, this.failureResult(ref, operationId, error, signal));
  }
}

function stateOutcome(state: ProvisionState): ProvisionOutcome {
  if (state === "active") return "active";
  if (state === "restart_required") return "restart_required";
  if (state === "blocked") return "blocked";
  return "failed";
}

function itemOwnerRef(item: ModelProvisionPlanItem): ResourceRef {
  return {
    kind: "model",
    owner: item.owner,
    id: item.id,
    ...(item.variant === undefined ? {} : { variant: item.variant }),
    ...(item.quant === undefined ? {} : { quant: item.quant }),
  };
}

export const name = "provisioning";

export function apply(ctx: Context, config: ProvisioningConfig): void {
  new ProvisioningService(ctx, config);
}

export const provisioningProvider: Plugin = {
  name,
  apply,
};

export const provisioningContract = provisioningProvider;
export const provisioningPlugin = provisioningProvider;

declare module "@deepseek-ai/cordis" {
  interface Context {
    provisioning: ProvisioningService;
  }
}

export default provisioningProvider;
